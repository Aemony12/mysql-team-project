const {
  asyncHandler,
  escapeHtml,
  formatDisplayDate,
  getExhibitionAsset,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
  allowRoles,
  logTriggerViolation,
} = require("../helpers");

function renderSummaryCard(label, value, tone = "neutral") {
  return `
    <article class="summary-card">
      <p class="eyebrow">${label}</p>
      <strong class="status-badge status-badge--${tone}">${value}</strong>
    </article>
  `;
}

function renderExhibitionCards(exhibitions) {
  return `
    <div class="feature-grid">
      ${exhibitions.map((exhibition) => {
        const asset = getExhibitionAsset(exhibition.Exhibition_Name);
        return `
          <article class="feature-card">
            <div class="feature-card__media"><img src="${asset.imagePath}" alt="${asset.alt}"></div>
            <div class="feature-card__body">
              <p class="eyebrow">Exhibition</p>
              <h2>${escapeHtml(exhibition.Exhibition_Name)}</h2>
              <p>Pair your admission with this exhibition while planning your museum visit.</p>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function registerPurchaseTicketRoutes(app, { pool }) {
  app.get("/purchase-ticket", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const [exhibitions] = await pool.query(
      "SELECT Exhibition_ID, Exhibition_Name FROM Exhibition ORDER BY Exhibition_Name",
    );
    let membershipId = req.session.user.membershipId ?? null;
    const discount = 0.2;
    let membershipInfo = null;

    if (membershipId !== null) {
      const [[row]] = await pool.query(
        "SELECT Membership_ID, Status, Date_Joined, Date_Exited FROM Membership WHERE Membership_ID = ?",
        [membershipId],
      );
      membershipInfo = row || null;
      if (!membershipInfo || membershipInfo.Status !== "Active") {
        membershipId = null;
      }
    }

    const [recentTickets] = membershipId
      ? await pool.query(
          `SELECT Ticket_ID, Purchase_Date, Visit_Date, Payment_method
           FROM Ticket
           WHERE Membership_ID = ?
           ORDER BY Purchase_Date DESC, Ticket_ID DESC
           LIMIT 5`,
          [membershipId],
        )
      : [[]];

    const today = new Date().toISOString().split("T")[0];
    const membershipStatus = membershipInfo?.Status || "No Active Membership";
    const membershipTone = membershipStatus === "Active" ? "success" : membershipStatus === "Expired" ? "warning" : "danger";
    const expiryDate = membershipInfo?.Date_Exited ? formatDisplayDate(membershipInfo.Date_Exited) : "N/A";
    const joinedDate = membershipInfo?.Date_Joined ? formatDisplayDate(membershipInfo.Date_Joined) : "N/A";

    const ticketRows = recentTickets.map((ticket) => `
      <tr>
        <td>#${ticket.Ticket_ID}</td>
        <td>${formatDisplayDate(ticket.Purchase_Date)}</td>
        <td>${formatDisplayDate(ticket.Visit_Date)}</td>
        <td>${escapeHtml(ticket.Payment_method || "N/A")}</td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Plan Your Visit",
      user: req.session.user,
      currentPath: req.path,
      hero: {
        eyebrow: "Plan Your Visit",
        title: "Admission tickets and member access",
        description: "Buy museum admission, connect a current exhibition to your visit, and review membership status without sorting through technical forms.",
        imagePath: "/images/summer-showcase.jpg",
        alt: "Museum visitors walking through an exhibition.",
        actions: [
          { href: "#ticket-form", label: "Buy Tickets" },
          { href: "/tour-register", label: "Browse Tours", secondary: true },
        ],
      },
      alertContent: membershipId
        ? { type: "success", title: "Member discount ready", message: "Your active membership applies a 20% discount automatically." }
        : { type: "warning", title: "Membership attention", message: "Your membership is not active. Renew to unlock member pricing for admission." },
      content: `
        <section class="card">
          <div class="section-header">
            <div>
              <p class="eyebrow">Membership</p>
              <h2>Visit planning summary</h2>
            </div>
          </div>
          <div class="summary-grid">
            ${renderSummaryCard("Status", escapeHtml(membershipStatus), membershipTone)}
            ${renderSummaryCard("Member Since", escapeHtml(joinedDate), "neutral")}
            ${renderSummaryCard("Valid Through", escapeHtml(expiryDate), membershipId ? "success" : "warning")}
          </div>
          ${membershipInfo && (membershipInfo.Status === "Expired" || membershipInfo.Status === "Active") ? `
            <form method="post" action="/member-renew-membership">
              <button class="button" type="submit">${membershipInfo.Status === "Expired" ? "Renew Membership" : "Renew Early"}</button>
            </form>
          ` : ""}
        </section>
        <section class="card" id="ticket-form">
          <div class="content-rail">
            <div>
              <p class="eyebrow">Admission</p>
              <h2>Choose your ticket</h2>
              <p class="section-lead">A single form handles admission, quantity, payment, and optional exhibition pairing.</p>
              ${renderFlash(req)}
              <form method="post" action="/purchase-ticket" class="form-grid">
                <label>Visit Date
                  <input type="date" name="visit_date" required min="${today}">
                </label>
                <label>Ticket Type
                  <select name="ticket_type" required>
                    <option value="">Select a ticket type</option>
                    <option value="General Admission">General Admission ($20.00 -> $16.00)</option>
                    <option value="Senior">Senior 65+ ($15.00 -> $12.00)</option>
                    <option value="Child">Child under 12 ($10.00 -> $8.00)</option>
                  </select>
                </label>
                <label>Quantity
                  <input type="number" name="quantity" min="1" value="1" required>
                </label>
                <label>Payment Method
                  <select name="payment_method" required>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                </label>
                <label>Exhibition
                  <select name="exhibition_id">
                    <option value="">General Admission</option>
                    ${exhibitions.map((exhibition) => `<option value="${exhibition.Exhibition_ID}">${escapeHtml(exhibition.Exhibition_Name)}</option>`).join("")}
                  </select>
                </label>
                <button class="button" type="submit">Complete Purchase</button>
              </form>
            </div>
            <aside class="content-rail__side">
              <section class="card">
                <p class="eyebrow">Member Pricing</p>
                <h2>What this unlocks</h2>
                <p class="section-lead">Active members receive 20% off museum admission and can continue into tours and event registration from the top navigation.</p>
              </section>
              <section class="card">
                <p class="eyebrow">Recent Purchases</p>
                <h2>Latest admission activity</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Purchased</th>
                      <th>Visit Date</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${ticketRows || '<tr><td colspan="4">No ticket purchases found for this member.</td></tr>'}
                  </tbody>
                </table>
              </section>
            </aside>
          </div>
        </section>
        <section class="card">
          <p class="eyebrow">Featured Exhibitions</p>
          <h2>Pair your admission with current museum experiences</h2>
          ${renderExhibitionCards(exhibitions)}
        </section>
      `,
    }));
  }));

  app.post("/purchase-ticket", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const {
      visit_date: visitDate,
      ticket_type: ticketType,
      quantity,
      payment_method: paymentMethod,
      exhibition_id: exhibitionId,
    } = req.body;

    if (!visitDate || !ticketType || !quantity || !paymentMethod) {
      setFlash(req, "All purchase fields are required.");
      return res.redirect("/purchase-ticket");
    }

    const qty = Number.parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      setFlash(req, "Quantity must be at least 1.");
      return res.redirect("/purchase-ticket");
    }

    const discount = 0.2;
    let basePrice;
    switch (ticketType) {
      case "General Admission": basePrice = 20.0; break;
      case "Senior": basePrice = 15.0; break;
      case "Child": basePrice = 10.0; break;
      default:
        setFlash(req, "Invalid ticket type selected.");
        return res.redirect("/purchase-ticket");
    }

    const finalPrice = basePrice * (1 - discount);

    const membershipId = req.session.user.membershipId ?? null;
    if (membershipId === null) {
      setFlash(req, "No membership found for your account. Please contact staff.");
      return res.redirect("/purchase-ticket");
    }
    const [memberRows] = await pool.query(
      "SELECT Membership_ID, Status FROM Membership WHERE Membership_ID = ?",
      [membershipId],
    );
    if (memberRows.length === 0) {
      setFlash(req, "Your membership record could not be found. Please contact staff.");
      return res.redirect("/purchase-ticket");
    }
    if (memberRows[0].Status !== "Active") {
      setFlash(req, `Your membership is ${memberRows[0].Status}. Please visit the admissions desk to renew before purchasing tickets.`);
      return res.redirect("/purchase-ticket");
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [ticketResult] = await connection.query(
        `INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Payment_method, Membership_ID)
         VALUES ('Online', CURRENT_DATE, ?, ?, ?)`,
        [visitDate, paymentMethod, membershipId],
      );

      await connection.query(
        `INSERT INTO ticket_line (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket, Exhibition_ID)
         VALUES (?, ?, ?, ?, ?)`,
        [ticketResult.insertId, ticketType, qty, finalPrice, exhibitionId || null],
      );

      await connection.commit();
      setFlash(req, `Ticket purchase completed. Confirmation #${ticketResult.insertId}. Total: $${(finalPrice * qty).toFixed(2)}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.redirect("/purchase-ticket");
  }));

  app.post("/member-renew-membership", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const membershipId = req.session.user.membershipId;

    if (!membershipId) {
      setFlash(req, "No membership linked to your account. Please visit the admissions desk.");
      return res.redirect("/purchase-ticket");
    }

    const [[member]] = await pool.query(
      "SELECT Membership_ID, Status FROM Membership WHERE Membership_ID = ?",
      [membershipId]
    );

    if (!member) {
      setFlash(req, "Membership record not found. Please contact staff.");
      return res.redirect("/purchase-ticket");
    }

    if (member.Status === "Cancelled") {
      setFlash(req, "Your membership was cancelled. Please visit the admissions desk to create a new one.");
      return res.redirect("/purchase-ticket");
    }

    await pool.query(
      `UPDATE Membership
       SET Date_Exited = DATE_ADD(GREATEST(COALESCE(Date_Exited, CURDATE()), CURDATE()), INTERVAL 1 YEAR),
           Status      = 'Active',
           Updated_By  = ?
       WHERE Membership_ID = ?`,
      [req.session.user.email, membershipId]
    );

    setFlash(req, "Membership renewed for 1 year. Your member discount is active again.");
    res.redirect("/purchase-ticket");
  }));

  app.get("/sell-ticket", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {
    const tickets = [
      { Ticket_Type_ID: 1, Name: "General Admission", Price: 20 },
      { Ticket_Type_ID: 2, Name: "Senior", Price: 15 },
      { Ticket_Type_ID: 3, Name: "Child", Price: 10 },
    ];
    const cart = req.session.ticketCart || [];
    const membershipId = req.session.membershipId || null;
    let discount = membershipId ? 0.2 : 0;

    const [exhibitions] = await pool.query(
      "SELECT Exhibition_ID, Exhibition_Name FROM Exhibition ORDER BY Exhibition_Name"
    );

    const [members] = await pool.query(
      "SELECT Membership_ID, First_Name, Last_Name, Status FROM Membership ORDER BY Last_Name, First_Name"
    );
    const today = new Date().toISOString().split("T")[0];

    res.send(renderPage({
      title: "Sell Tickets",
      user: req.session.user,
      currentPath: req.path,
      content: `
        <section class="card dashboard-card">
          <p class="eyebrow">Admissions Register</p>
          <h1>Sell Tickets</h1>
          <p class="dashboard-note">Use the admissions tabbed navigation for memberships and sales history. This page focuses only on the active ticket sale.</p>
          ${renderFlash(req)}
          <form method="post" action="/sell-ticket/add" class="form-grid">
            <label>Membership (optional)
              <select name="membership_id">
                <option value="">No membership / guest purchase</option>
                ${members.map((m) => `
                  <option value="${m.Membership_ID}" ${req.session.membershipId == m.Membership_ID ? "selected" : ""}>
                    ID: ${m.Membership_ID} - ${escapeHtml(m.First_Name)} ${escapeHtml(m.Last_Name)} (${escapeHtml(m.Status)})
                  </option>
                `).join("")}
              </select>
            </label>
            <label>Visit Date
              <input type="date" name="visit_date" required min="${today}">
            </label>
            <label>Purchase Type
              <select name="purchase_type" required>
                <option value="In-Person" ${req.session.purchaseType === "In-Person" ? "selected" : ""}>In-Person</option>
                <option value="Walk-up" ${req.session.purchaseType === "Walk-up" ? "selected" : ""}>Walk-up</option>
                <option value="Online" ${req.session.purchaseType === "Online" ? "selected" : ""}>Online</option>
              </select>
            </label>
            <label>Ticket Type
              <select name="ticket_type_id" required>
                ${tickets.map((t) => `
                  <option value="${t.Ticket_Type_ID}">
                    ${t.Name} ($${t.Price})
                  </option>
                `).join("")}
              </select>
            </label>
            <label>Quantity
              <input type="number" name="quantity" min="1" required>
            </label>
            <label>Exhibition
              <select name="exhibition_id">
                <option value="">General Admission</option>
                ${exhibitions.map((ex) => `
                  <option value="${ex.Exhibition_ID}">
                    ${escapeHtml(ex.Exhibition_Name)}
                  </option>
                `).join("")}
              </select>
            </label>
            <label>Visitor Email (optional)
              <input type="email" name="email">
            </label>
            <label>Visitor Phone (optional)
              <input type="text" name="phone">
            </label>
            <button class="button" type="submit">Add Ticket</button>
          </form>
        </section>
        <section class="card dashboard-card">
          <div class="section-header">
            <div>
              <p class="eyebrow">Current Order</p>
              <h2>Active sale</h2>
            </div>
            <span class="status-badge status-badge--${discount > 0 ? "success" : "neutral"}">${discount > 0 ? "20% member discount" : "Guest pricing"}</span>
          </div>
          ${cart.length === 0 ? "<div class=\"empty-state\"><p>No tickets added yet.</p></div>" : `
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${cart.map((item) => {
                  const finalPrice = item.price * (1 - discount);
                  return `
                    <tr>
                      <td>${item.name}</td>
                      <td>${item.qty}</td>
                      <td>$${(finalPrice * item.qty).toFixed(2)}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
            <div class="button-row">
              <form method="post" action="/sell-ticket/checkout">
                <button class="button">Process Sale</button>
              </form>
              <form method="post" action="/sell-ticket/clear" onsubmit="return confirm('Clear the cart and start over?');">
                <button class="button button-secondary" type="submit">Cancel Order</button>
              </form>
            </div>
          `}
        </section>
      `,
    }));
  }));

  app.get("/ticket-sales", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {
    const [[todayTotals]] = await pool.query(`
      SELECT COUNT(DISTINCT t.Ticket_ID) AS total_sales,
             COALESCE(SUM(tl.Quantity * tl.Price_per_ticket), 0) AS total_revenue
      FROM Ticket t
      JOIN ticket_line tl ON t.Ticket_ID = tl.Ticket_ID
      WHERE t.Purchase_Date = CURDATE()
    `);

    res.send(renderPage({
      title: "Ticket Sales",
      user: req.session.user,
      currentPath: req.path,
      content: `
        <section class="card dashboard-card">
          <p class="eyebrow">Admissions Reporting</p>
          <h1>Today's Ticket Sales</h1>
          <div class="summary-grid">
            ${renderSummaryCard("Tickets Sold", String(todayTotals.total_sales), "success")}
            ${renderSummaryCard("Revenue", `$${Number(todayTotals.total_revenue).toFixed(2)}`, "neutral")}
          </div>
        </section>
      `
    }));
  }));

  app.post("/sell-ticket/add", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {
    const { ticket_type_id, quantity, visit_date, membership_id, email, phone, purchase_type } = req.body;
    const qty = Number.parseInt(quantity, 10);

    if (!visit_date || !purchase_type || !ticket_type_id || !Number.isInteger(qty) || qty < 1) {
      setFlash(req, "Visit date, purchase type, ticket type, and a valid quantity are required.");
      return res.redirect("/sell-ticket");
    }

    req.session.visitDate = visit_date;
    req.session.purchaseType = purchase_type;
    let validMembership = null;
    if (membership_id) {
      const [rows] = await pool.query(
        "SELECT Membership_ID, Status FROM Membership WHERE Membership_ID = ?",
        [membership_id]
      );

      if (rows.length > 0) {
        if (rows[0].Status === "Active") {
          validMembership = membership_id;
        } else {
          setFlash(req, `Membership ${membership_id} is ${rows[0].Status}. Guest pricing will be used unless the membership is renewed.`);
        }
      } else {
        setFlash(req, "Membership not found. Guest pricing will be used.");
      }
    }
    req.session.membershipId = validMembership;
    req.session.visitorEmail = email || null;
    req.session.visitorPhone = phone || null;
    let ticket;
    if (ticket_type_id == 1) ticket = { Name: "General Admission", Price: 20 };
    else if (ticket_type_id == 2) ticket = { Name: "Senior", Price: 15 };
    else if (ticket_type_id == 3) ticket = { Name: "Child", Price: 10 };
    else {
      setFlash(req, "Invalid ticket type selected.");
      return res.redirect("/sell-ticket");
    }

    if (!req.session.ticketCart) {
      req.session.ticketCart = [];
    }

    const exhibitionId = req.body.exhibition_id || null;

    const existing = req.session.ticketCart.find((t) => t.id == ticket_type_id && t.exhibitionId == exhibitionId);
    if (existing) {
      existing.qty += qty;
    } else {
      req.session.ticketCart.push({
        id: ticket_type_id,
        name: ticket.Name,
        price: ticket.Price,
        qty,
        exhibitionId: exhibitionId,
      });
    }

    res.redirect("/sell-ticket");
  }));

  app.post("/sell-ticket/checkout", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {
    const cart = req.session.ticketCart || [];
    const visit_date = req.session.visitDate;
    const purchase_type = req.session.purchaseType || "In-Person";
    let membershipId = req.session.membershipId || null;
    const email = req.session.visitorEmail || null;
    const phone = req.session.visitorPhone || null;
    let discount = 0;

    if (membershipId) {
      const [rows] = await pool.query(
        "SELECT Membership_ID, Status FROM Membership WHERE Membership_ID = ?",
        [membershipId]
      );
      if (rows.length > 0 && rows[0].Status === "Active") {
        discount = 0.2;
      } else {
        setFlash(req, rows.length > 0
          ? `Membership ${membershipId} is ${rows[0].Status}. The sale cannot use member pricing.`
          : "Membership not found. The sale cannot use member pricing.");
        req.session.membershipId = null;
        return res.redirect("/sell-ticket");
      }
    }

    if (!visit_date) {
      setFlash(req, "Visit date is required.");
      return res.redirect("/sell-ticket");
    }

    if (cart.length === 0) {
      setFlash(req, "No tickets in order.");
      return res.redirect("/sell-ticket");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        "INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Membership_ID, Email, Phone_number, Payment_method) VALUES (?, CURRENT_DATE, ?, ?, ?, ?, 'Cash')",
        [purchase_type, visit_date, membershipId, email, phone]
      );

      const saleId = result.insertId;

      for (const item of cart) {
        const finalPrice = item.price * (1 - discount);
        await connection.query(
          `INSERT INTO ticket_line
           (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket, Exhibition_ID)
           VALUES (?, ?, ?, ?, ?)`,
          [saleId, item.name, item.qty, finalPrice, item.exhibitionId || null]
        );
      }

      await connection.commit();
      setFlash(req, "Ticket sale completed.");
    } catch (error) {
      await connection.rollback();
      if (error.sqlState === "45000") {
        await logTriggerViolation(pool, req, error.sqlMessage);
      }
      throw error;
    } finally {
      connection.release();
    }

    req.session.ticketCart = [];
    req.session.visitorEmail = null;
    req.session.visitorPhone = null;
    req.session.membershipId = null;
    req.session.visitDate = null;

    res.redirect("/dashboard");
  }));

  app.post("/sell-ticket/clear", requireLogin, allowRoles(["admissions", "employee", "supervisor"]), asyncHandler(async (req, res) => {
    req.session.ticketCart = [];
    req.session.visitorEmail = null;
    req.session.visitorPhone = null;
    req.session.membershipId = null;
    req.session.visitDate = null;
    setFlash(req, "Cart cleared. Ready for a new order.");
    res.redirect("/sell-ticket");
  }));
}

module.exports = { registerPurchaseTicketRoutes };
