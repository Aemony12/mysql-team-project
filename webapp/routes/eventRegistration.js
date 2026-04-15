const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  getExhibitionAsset,
  getPageNumber,
  paginateRows,
  renderFlash,
  renderPager,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles,
  logTriggerViolation
} = require("../helpers");

function renderEventBrowseCards(events, membershipActive, hasTicket) {
  if (!events.length) {
    return '<div class="empty-state"><p>No upcoming events available.</p></div>';
  }

  return `
    <div class="feature-grid">
      ${events.map((ev) => {
        const asset = getExhibitionAsset(ev.event_Name);
        const spotsLeft = ev.Max_capacity - ev.Registered_Count;
        const isFull = spotsLeft <= 0;
        const isRegistered = ev.Already_Registered > 0;
        let status = '<span class="status-badge status-badge--success">Open</span>';
        if (isRegistered) status = '<span class="status-badge status-badge--success">Registered</span>';
        else if (isFull) status = '<span class="status-badge status-badge--danger">Sold Out</span>';
        else if (!membershipActive) status = '<span class="status-badge status-badge--warning">Membership Inactive</span>';
        else if (!hasTicket) status = '<span class="status-badge status-badge--warning">Ticket Required</span>';

        const action = isRegistered
          ? '<p class="section-lead">You are already registered for this event.</p>'
          : isFull
          ? '<p class="section-lead">This event has reached capacity.</p>'
          : !membershipActive
          ? '<p class="section-lead">Renew membership before registering.</p>'
          : !hasTicket
          ? '<a class="button button-secondary" href="/purchase-ticket">Buy Ticket First</a>'
          : `
            <form method="post" action="/event-register">
              <input type="hidden" name="event_id" value="${ev.event_ID}">
              <button class="button" type="submit">Register</button>
            </form>
          `;

        return `
          <article class="feature-card">
            <div class="feature-card__media"><img src="${asset.imagePath}" alt="${asset.alt}"></div>
            <div class="feature-card__body">
              <p class="eyebrow">${ev.member_only ? "Members Only" : "Museum Program"}</p>
              <h2>${escapeHtml(ev.event_Name)}</h2>
              <p>${formatDisplayDate(ev.start_Date)}${ev.start_Date !== ev.end_Date ? ` to ${formatDisplayDate(ev.end_Date)}` : ""}</p>
              <div class="collection-card__meta">
                ${status}
                <span class="status-badge status-badge--neutral">${spotsLeft > 0 ? `${spotsLeft} left` : "0 left"}</span>
              </div>
              <p>Coordinator: ${escapeHtml(ev.Coordinator_Name || "TBD")}</p>
              ${action}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function registerEventRegistrationRoutes(app, { pool }) {
  app.get("/add-event-registration", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const registrationPage = getPageNumber(req.query.registration_page);
    const [events] = await pool.query(
      "SELECT event_ID, event_Name FROM Event ORDER BY start_Date DESC"
    );
    const [members] = await pool.query(
      "SELECT Membership_ID, First_Name, Last_Name FROM Membership WHERE Status = 'Active' ORDER BY Last_Name, First_Name"
    );
    const [tickets] = await pool.query(
      "SELECT Ticket_ID FROM Ticket ORDER BY Ticket_ID DESC"
    );
    const [registrations] = await pool.query(`
      SELECT er.Event_Registration_ID, er.Registration_Date,
             ev.event_Name, m.First_Name, m.Last_Name, er.Ticket_ID
      FROM event_registration er
      JOIN Event ev ON er.Event_ID = ev.event_ID
      JOIN Membership m ON er.Membership_ID = m.Membership_ID
      ORDER BY er.Registration_Date DESC
    `);

    let editReg = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM event_registration WHERE Event_Registration_ID = ?",
        [req.query.edit_id]
      );
      editReg = rows[0] || null;
    }

    const registrationPagination = paginateRows(registrations, registrationPage);
    const regRows = registrationPagination.items.map((reg) => `
      <tr>
        <td>${reg.Event_Registration_ID}</td>
        <td>${escapeHtml(reg.event_Name)}</td>
        <td>${escapeHtml(reg.First_Name)} ${escapeHtml(reg.Last_Name)}</td>
        <td>#${reg.Ticket_ID}</td>
        <td>${formatDisplayDate(reg.Registration_Date)}</td>
        <td class="actions">
          <form method="get" action="/add-event-registration" class="inline-form">
            <input type="hidden" name="edit_id" value="${reg.Event_Registration_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-event-registration" class="inline-form" onsubmit="return confirm('Delete this registration?');">
            <input type="hidden" name="registration_id" value="${reg.Event_Registration_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Event Registrations",
      user: req.session.user,
      currentPath: req.path,
      content: `
        <section class="card narrow">
          <h1>${editReg ? "Edit Registration" : "Add Event Registration"}</h1>
          ${renderFlash(req)}
          <form method="post" action="/add-event-registration" class="form-grid">
            ${editReg ? `<input type="hidden" name="registration_id" value="${editReg.Event_Registration_ID}">` : ""}
            <label>Event
              <select name="event_id" required>
                <option value="">Select Event</option>
                ${events.map((ev) => `
                  <option value="${ev.event_ID}" ${editReg && editReg.Event_ID === ev.event_ID ? "selected" : ""}>
                    ${escapeHtml(ev.event_Name)}
                  </option>
                `).join("")}
              </select>
            </label>
            <label>Member
              <select name="membership_id" required>
                <option value="">Select Member</option>
                ${members.map((m) => `
                  <option value="${m.Membership_ID}" ${editReg && editReg.Membership_ID === m.Membership_ID ? "selected" : ""}>
                    ${escapeHtml(m.First_Name)} ${escapeHtml(m.Last_Name)}
                  </option>
                `).join("")}
              </select>
            </label>
            <label>Ticket
              <select name="ticket_id" required>
                <option value="">Select Ticket</option>
                ${tickets.map((t) => `
                  <option value="${t.Ticket_ID}" ${editReg && editReg.Ticket_ID === t.Ticket_ID ? "selected" : ""}>
                    Ticket #${t.Ticket_ID}
                  </option>
                `).join("")}
              </select>
            </label>
            <label>Registration Date
              <input type="date" name="registration_date" value="${editReg ? formatDateInput(editReg.Registration_Date) : ""}" required>
            </label>
            <button class="button" type="submit">${editReg ? "Update Registration" : "Add Registration"}</button>
          </form>
        </section>
        <section class="card narrow">
          <div id="registration-list"></div>
          <h2>Current Registrations</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Event</th>
                <th>Member</th>
                <th>Ticket</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${regRows || '<tr><td colspan="6">No registrations found.</td></tr>'}
            </tbody>
          </table>
          ${renderPager(req, "registration_page", registrationPagination, "registration-list")}
        </section>
      `,
    }));
  }));

  app.post("/add-event-registration", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.registration_id || null;
    const {
      event_id: eventId,
      membership_id: membershipId,
      ticket_id: ticketId,
      registration_date: registrationDate,
    } = req.body;

    if (!eventId || !membershipId || !ticketId || !registrationDate) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-event-registration");
    }

    if (id) {
      await pool.query(
        `UPDATE event_registration
         SET Event_ID = ?, Membership_ID = ?, Ticket_ID = ?, Registration_Date = ?
         WHERE Event_Registration_ID = ?`,
        [eventId, membershipId, ticketId, registrationDate, id]
      );
      setFlash(req, "Registration updated successfully.");
    } else {
      try {
        await pool.query(
          `INSERT INTO event_registration (Event_ID, Membership_ID, Ticket_ID, Registration_Date)
           VALUES (?, ?, ?, ?)`,
          [eventId, membershipId, ticketId, registrationDate]
        );
        setFlash(req, "Registration added successfully.");
      } catch (err) {
        if (err.sqlState === "45000") {
          await logTriggerViolation(pool, req, err.sqlMessage);
          setFlash(req, err.sqlMessage);
        } else {
          throw err;
        }
      }
    }

    res.redirect("/add-event-registration");
  }));

  app.post("/delete-event-registration", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.registration_id;

    if (!idToDelete) {
      setFlash(req, "Error: No registration ID provided.");
      return res.redirect("/add-event-registration");
    }

    await pool.query(
      "DELETE FROM event_registration WHERE Event_Registration_ID = ?",
      [idToDelete]
    );
    setFlash(req, "Registration deleted successfully.");
    res.redirect("/add-event-registration");
  }));

  app.get("/event-register", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const membershipId = req.session.user.membershipId;

    if (!membershipId) {
      setFlash(req, "No membership found for your account.");
      return res.redirect("/dashboard");
    }

    const [[memberInfo]] = await pool.query(
      "SELECT Status FROM Membership WHERE Membership_ID = ?",
      [membershipId]
    );
    const membershipActive = memberInfo?.Status === "Active";

    const [upcomingEvents] = await pool.query(`
      SELECT
        ev.event_ID,
        ev.event_Name,
        ev.start_Date,
        ev.end_Date,
        ev.member_only,
        ev.Max_capacity,
        CONCAT(e.First_Name, ' ', e.Last_Name) AS Coordinator_Name,
        COUNT(er.Event_Registration_ID) AS Registered_Count,
        (SELECT COUNT(*) FROM event_registration er2
         WHERE er2.Event_ID = ev.event_ID AND er2.Membership_ID = ?) AS Already_Registered
      FROM Event ev
      LEFT JOIN Employee e ON ev.coordinator_ID = e.Employee_ID
      LEFT JOIN event_registration er ON er.Event_ID = ev.event_ID
      WHERE ev.end_Date >= CURDATE()
      GROUP BY ev.event_ID, ev.event_Name, ev.start_Date, ev.end_Date,
               ev.member_only, ev.Max_capacity, e.First_Name, e.Last_Name
      ORDER BY ev.start_Date ASC
    `, [membershipId]);

    const [myRegistrations] = await pool.query(`
      SELECT er.Event_Registration_ID, er.Registration_Date,
             ev.event_Name, ev.start_Date, ev.end_Date
      FROM event_registration er
      JOIN Event ev ON er.Event_ID = ev.event_ID
      WHERE er.Membership_ID = ?
      ORDER BY ev.start_Date DESC
    `, [membershipId]);

    const [[ticketCheck]] = await pool.query(
      `SELECT Ticket_ID FROM Ticket WHERE Membership_ID = ? ORDER BY Ticket_ID DESC LIMIT 1`,
      [membershipId]
    );
    const hasTicket = !!ticketCheck;

    const myRows = myRegistrations.map((r) => `
      <tr>
        <td>${escapeHtml(r.event_Name)}</td>
        <td>${formatDisplayDate(r.start_Date)}</td>
        <td>${formatDisplayDate(r.end_Date)}</td>
        <td>${formatDisplayDate(r.Registration_Date)}</td>
        <td>
          <form method="post" action="/event-cancel" class="inline-form"
                onsubmit="return confirm('Cancel your registration for this event?');">
            <input type="hidden" name="registration_id" value="${r.Event_Registration_ID}">
            <button class="link-button danger" type="submit">Cancel</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Museum Events",
      user: req.session.user,
      currentPath: req.path,
      hero: {
        eyebrow: "Member Events",
        title: "Programs, lectures, and special museum moments",
        description: "Upcoming events now appear as browseable cards with clearer availability, member access, and ticket requirements.",
        imagePath: "/images/spring-exhibition-opening-gala.jpg",
        alt: "Museum event scene.",
        actions: [
          { href: "#upcoming-events", label: "Browse Events" },
          { href: "/purchase-ticket", label: "Buy Admission", secondary: true },
        ],
      },
      alertContent: !membershipActive
        ? { type: "warning", title: "Membership inactive", message: `Your membership is ${memberInfo?.Status ?? "inactive"}. Renew before registering for events.` }
        : !hasTicket
        ? { type: "info", title: "Admission ticket required", message: "You need an admission ticket on file before you can register for museum events." }
        : null,
      content: `
        <section class="card" id="upcoming-events">
          <p class="eyebrow">Upcoming Events</p>
          <h2>Choose an event</h2>
          <p class="section-lead">Availability, access, and next steps are visible on each card instead of hidden in a wide table.</p>
          ${renderFlash(req)}
          ${renderEventBrowseCards(upcomingEvents, membershipActive, hasTicket)}
        </section>
        <section class="card">
          <p class="eyebrow">My Registrations</p>
          <h2>Registered programs</h2>
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Start</th>
                <th>End</th>
                <th>Registered On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${myRows || '<tr><td colspan="5">You have no event registrations.</td></tr>'}
            </tbody>
          </table>
        </section>
      `,
    }));
  }));

  app.post("/event-register", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const { event_id: eventId } = req.body;
    const membershipId = req.session.user.membershipId;

    if (!eventId || !membershipId) {
      setFlash(req, "Invalid request.");
      return res.redirect("/event-register");
    }

    const [[memberStatus]] = await pool.query(
      "SELECT Status FROM Membership WHERE Membership_ID = ?",
      [membershipId]
    );
    if (!memberStatus || memberStatus.Status !== "Active") {
      const status = memberStatus?.Status ?? "unknown";
      setFlash(req, `Your membership is ${status}. Please visit the admissions desk to renew before registering for events.`);
      return res.redirect("/event-register");
    }

    const [[latestTicket]] = await pool.query(
      `SELECT Ticket_ID FROM Ticket WHERE Membership_ID = ? ORDER BY Ticket_ID DESC LIMIT 1`,
      [membershipId]
    );

    if (!latestTicket) {
      setFlash(req, "You need an admission ticket to register for events.");
      return res.redirect("/event-register");
    }

    try {
      await pool.query(
        `INSERT INTO event_registration (Event_ID, Membership_ID, Ticket_ID, Registration_Date)
         VALUES (?, ?, ?, CURDATE())`,
        [eventId, membershipId, latestTicket.Ticket_ID]
      );
      setFlash(req, "You are registered for the event!");
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        setFlash(req, "You are already registered for this event.");
      } else if (err.sqlState === "45000") {
        await logTriggerViolation(pool, req, err.sqlMessage);
        setFlash(req, err.sqlMessage);
      } else {
        throw err;
      }
    }

    res.redirect("/event-register");
  }));

  app.post("/event-cancel", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const { registration_id: regId } = req.body;
    const membershipId = req.session.user.membershipId;

    if (!regId) {
      setFlash(req, "No registration ID provided.");
      return res.redirect("/event-register");
    }

    await pool.query(
      "DELETE FROM event_registration WHERE Event_Registration_ID = ? AND Membership_ID = ?",
      [regId, membershipId]
    );
    setFlash(req, "Your event registration has been cancelled.");
    res.redirect("/event-register");
  }));
}

module.exports = { registerEventRegistrationRoutes };
