const {
  asyncHandler,
  escapeHtml,
  getExhibitionAsset,
  getGiftShopAsset,
  getRoleAsset,
  isEmployee,
  isSupervisor,
  renderFlash,
  renderPage,
  requireLogin,
  isAdmissions,
  isCafe,
  isGiftShop,
  isCurator,
} = require("../helpers");

function renderActionCards(cards) {
  return `
    <div class="feature-grid">
      ${cards.map((card) => `
        <article class="feature-card">
          <div class="feature-card__media"><img src="${card.imagePath}" alt="${card.alt}"></div>
          <div class="feature-card__body">
            <p class="eyebrow">${card.eyebrow}</p>
            <h2>${card.title}</h2>
            <p>${card.description}</p>
            <a class="feature-card__link" href="${card.href}">${card.linkLabel}</a>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderProfile(user) {
  return `
    <dl class="dashboard-details">
      <div class="detail-item"><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
      <div class="detail-item"><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
      <div class="detail-item"><dt>Role</dt><dd>${escapeHtml(user.role)}</dd></div>
    </dl>
  `;
}

function registerDashboardRoutes(app, { pool }) {
  app.get("/dashboard", requireLogin, asyncHandler(async (req, res) => {
    const user = req.session.user;

    if (!isEmployee(user) && !isSupervisor(user) && !isCurator(user)) {
      return res.send(renderPage({
        title: "Member Overview",
        user,
        currentPath: req.path,
        hero: {
          eyebrow: "Member Portal",
          title: `Welcome, ${escapeHtml(user.name.split(" ")[0])}`,
          description: "Plan your museum visit with tickets, guided tours, events, and collection browsing in one clear place.",
          imagePath: getRoleAsset("user").imagePath,
          alt: getRoleAsset("user").alt,
          actions: [
            { href: "/purchase-ticket", label: "Buy Tickets" },
            { href: "/queries", label: "Explore Art", secondary: true },
          ],
        },
        featureCards: [
          { eyebrow: "Visit", title: "Admission Tickets", description: "Purchase admission and review recent ticket activity.", href: "/purchase-ticket", linkLabel: "Open Tickets", imagePath: "/images/summer-showcase.jpg", alt: "Museum admissions area." },
          { eyebrow: "Tours", title: "Guided Tours", description: "Browse guided tours with clearer availability and exhibition context.", href: "/tour-register", linkLabel: "Browse Tours", imagePath: "/images/spring-collection.jpg", alt: "Museum tour visitors." },
          { eyebrow: "Events", title: "Museum Programs", description: "Register for upcoming events with obvious member and ticket requirements.", href: "/event-register", linkLabel: "View Events", imagePath: "/images/spring-exhibition-opening-gala.jpg", alt: "Museum event." },
          { eyebrow: "Art", title: "Collection Search", description: "Explore artworks, exhibitions, and collection information in a more gallery-like search page.", href: "/queries", linkLabel: "Search Collection", imagePath: "/images/the-farnese-hours.jpg", alt: "Illuminated manuscript artwork." },
        ],
        content: `
          <section class="card dashboard-card">
            <p class="eyebrow">Member Account</p>
            <h2>Visit overview</h2>
            <p class="dashboard-intro">A first-time visitor should be able to tell what to do next without reading a wall of text.</p>
            ${renderProfile(user)}
            ${renderFlash(req)}
          </section>
        `,
      }));
    }

    if (isAdmissions(user)) {
      return res.send(renderPage({
        title: "Admissions Overview",
        user,
        currentPath: req.path,
        hero: {
          eyebrow: "Admissions Desk",
          title: `Welcome, ${escapeHtml(user.name.split(" ")[0])}`,
          description: "Front desk ticketing, memberships, and visitor support now live behind clearer top-level navigation.",
          imagePath: getRoleAsset("admissions").imagePath,
          alt: getRoleAsset("admissions").alt,
          actions: [
            { href: "/sell-ticket", label: "Sell Tickets" },
            { href: "/add-membership", label: "Manage Memberships", secondary: true },
          ],
        },
        content: `
          <section class="card dashboard-card">
            <p class="eyebrow">Front Desk</p>
            <h2>Admissions overview</h2>
            <p class="dashboard-intro">Use the header tabs to move between ticket sales, membership records, and sales reporting.</p>
            ${renderProfile(user)}
            ${renderFlash(req)}
          </section>
          ${renderActionCards([
            { eyebrow: "Tickets", title: "Walk-Up Ticket Sales", description: "Process admissions with visible controls and less form confusion.", href: "/sell-ticket", linkLabel: "Open Register", imagePath: "/images/summer-showcase.jpg", alt: "Museum admissions view." },
            { eyebrow: "Membership", title: "Visitor Memberships", description: "Create or update memberships from a more direct admissions workspace.", href: "/add-membership", linkLabel: "Open Memberships", imagePath: "/images/spring-collection.jpg", alt: "Museum member services area." },
            { eyebrow: "Reporting", title: "Today's Sales", description: "Review daily ticket counts and revenue without leaving the admissions context.", href: "/ticket-sales", linkLabel: "Open Sales Summary", imagePath: "/images/spring-exhibition-opening-gala.jpg", alt: "Museum visitor traffic." },
          ])}
        `,
      }));
    }

    if (isGiftShop(user)) {
      return res.send(renderPage({
        title: "Gift Shop Overview",
        user,
        currentPath: req.path,
        hero: {
          eyebrow: "Gift Shop",
          title: `Welcome, ${escapeHtml(user.name.split(" ")[0])}`,
          description: "Retail work should feel like a shop floor, with product-led entry points and visible sales actions.",
          imagePath: getRoleAsset("giftshop").imagePath,
          alt: getRoleAsset("giftshop").alt,
          actions: [
            { href: "/gift-order", label: "New Shop Order" },
            { href: "/add-item", label: "Inventory", secondary: true },
          ],
        },
        content: `
          <section class="card dashboard-card">
            <p class="eyebrow">Retail Workspace</p>
            <h2>Gift shop overview</h2>
            <p class="dashboard-intro">The header tabs now separate current orders, sales history, and inventory instead of forcing one dashboard full of buttons.</p>
            ${renderProfile(user)}
            ${renderFlash(req)}
          </section>
          ${renderActionCards([
            { eyebrow: "Orders", title: "New Customer Order", description: "Build a gift shop order using product cards, stock badges, and a clearer cart.", href: "/gift-order", linkLabel: "Open Shop Floor", imagePath: getGiftShopAsset("Museum Tote Bag", "Merchandise").imagePath, alt: "Gift shop product display." },
            { eyebrow: "Sales", title: "Sales Register", description: "Manage gift shop sales and line items with visible edit and delete actions.", href: "/add-sale", linkLabel: "Manage Sales", imagePath: "/images/the-birth-of-the-last-muse.jpg", alt: "Museum store merchandise." },
            { eyebrow: "Inventory", title: "Product Inventory", description: "Keep stock levels visible and easy to manage.", href: "/add-item", linkLabel: "Open Inventory", imagePath: "/images/giftshop-placeholder.svg", alt: "Gift shop placeholder display." },
          ])}
        `,
      }));
    }

    if (isCafe(user)) {
      return res.send(renderPage({
        title: "Cafe Overview",
        user,
        currentPath: req.path,
        hero: {
          eyebrow: "Museum Cafe",
          title: `Welcome, ${escapeHtml(user.name.split(" ")[0])}`,
          description: "The cafe workspace now foregrounds menu browsing, checkout flow, and inventory rather than generic operations buttons.",
          imagePath: getRoleAsset("cafe").imagePath,
          alt: getRoleAsset("cafe").alt,
          actions: [
            { href: "/order", label: "New Cafe Order" },
            { href: "/add-food", label: "Inventory", secondary: true },
          ],
        },
        content: `
          <section class="card dashboard-card">
            <p class="eyebrow">Cafe Service</p>
            <h2>Cafe overview</h2>
            <p class="dashboard-intro">Use the top tabs for menu orders, order history, and stock management.</p>
            ${renderProfile(user)}
            ${renderFlash(req)}
          </section>
          ${renderActionCards([
            { eyebrow: "Menu", title: "New Cafe Order", description: "Take orders with menu cards, quantity controls, and clearer checkout steps.", href: "/order", linkLabel: "Open Menu", imagePath: "/images/cafe-placeholder.svg", alt: "Cafe ordering area." },
            { eyebrow: "Orders", title: "Order Register", description: "Manage recorded cafe sales and active order lines.", href: "/add-food-sale", linkLabel: "Manage Orders", imagePath: "/images/cafe-placeholder.svg", alt: "Cafe service workflow." },
            { eyebrow: "Inventory", title: "Cafe Inventory", description: "Track food and drink stock with visible status signals.", href: "/add-food", linkLabel: "Open Inventory", imagePath: "/images/cafe-placeholder.svg", alt: "Cafe stock display." },
          ])}
        `,
      }));
    }

    if (isCurator(user)) {
      return res.send(renderPage({
        title: "Curatorial Overview",
        user,
        currentPath: req.path,
        hero: {
          eyebrow: "Curatorial",
          title: `Welcome, ${escapeHtml(user.name.split(" ")[0])}`,
          description: "Collections work now starts from an art-led overview instead of a block of undifferentiated management buttons.",
          imagePath: getRoleAsset("curator").imagePath,
          alt: getRoleAsset("curator").alt,
          actions: [
            { href: "/queries", label: "Search Collection" },
            { href: "/add-artwork", label: "Manage Artwork", secondary: true },
          ],
        },
        content: `
          <section class="card dashboard-card">
            <p class="eyebrow">Collection Care</p>
            <h2>Curatorial overview</h2>
            <p class="dashboard-intro">The main curatorial routes are now framed around art, exhibitions, and collection records.</p>
            ${renderProfile(user)}
            ${renderFlash(req)}
          </section>
          ${renderActionCards([
            { eyebrow: "Search", title: "Collection Search", description: "Find artworks, exhibition status, and inventory with stronger visual structure.", href: "/queries", linkLabel: "Open Search", imagePath: "/images/the-farnese-hours.jpg", alt: "Collection artwork." },
            { eyebrow: "Artwork", title: "Artwork Records", description: "Maintain artworks and artist links while preserving visible action controls.", href: "/add-artwork", linkLabel: "Manage Artwork", imagePath: "/images/allegory.jpg", alt: "Artwork record view." },
            { eyebrow: "Exhibitions", title: "Exhibition Planning", description: "Work with exhibitions, assignments, and collection display records.", href: "/add-exhibition", linkLabel: "Manage Exhibitions", imagePath: "/images/spring-collection.jpg", alt: "Exhibition planning image." },
          ])}
        `,
      }));
    }

    const [notifications] = await pool.query(
      `SELECT * FROM manager_notifications WHERE is_read = FALSE ORDER BY created_at DESC`
    );
    let triggerViolations = [];
    try {
      const [rows] = await pool.query(
        `SELECT violation_id, route_path, user_email, message, created_at
         FROM trigger_violation_log
         WHERE is_resolved = FALSE
         ORDER BY created_at DESC
         LIMIT 10`
      );
      triggerViolations = rows;
    } catch (error) {
      if (!error || error.code !== "ER_NO_SUCH_TABLE") {
        throw error;
      }
    }

    const urgentCount = notifications.length + triggerViolations.length;
    const notificationsHtml = notifications.length > 0
      ? `
        <section class="card dashboard-card">
          <div class="section-header">
            <div>
              <p class="eyebrow">Supervisor Alerts</p>
              <h2>Unread notifications</h2>
            </div>
            <span class="status-badge status-badge--danger">${notifications.length} open</span>
          </div>
          <ul class="notification-list">
            ${notifications.map((n) => `
              <li class="notification-item">
                <span class="notification-message">${escapeHtml(n.message)}</span>
                <span class="notification-time">${new Date(n.created_at).toLocaleString()}</span>
                <form method="post" action="/notifications/${n.notification_id}/read" class="inline-form">
                  <button class="button button-secondary button-small" type="submit">Dismiss</button>
                </form>
              </li>
            `).join("")}
          </ul>
          <form method="post" action="/notifications/clear">
            <button class="button button-secondary" type="submit">Clear All</button>
          </form>
        </section>`
      : `
        <section class="card dashboard-card">
          <p class="eyebrow">Supervisor Alerts</p>
          <h2>Unread notifications</h2>
          <div class="empty-state"><p>No new notifications.</p></div>
        </section>`;

    const triggerViolationsHtml = triggerViolations.length > 0
      ? `
        <section class="card dashboard-card">
          <div class="section-header">
            <div>
              <p class="eyebrow">Business Rules</p>
              <h2>Trigger violations</h2>
            </div>
            <span class="status-badge status-badge--danger">${triggerViolations.length} unresolved</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Route</th>
                <th>User</th>
                <th>Message</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${triggerViolations.map((violation) => `
                <tr>
                  <td>${new Date(violation.created_at).toLocaleString()}</td>
                  <td>${escapeHtml(violation.route_path || "N/A")}</td>
                  <td>${escapeHtml(violation.user_email || "N/A")}</td>
                  <td>${escapeHtml(violation.message)}</td>
                  <td>
                    <form method="post" action="/trigger-violations/${violation.violation_id}/resolve" class="inline-form">
                      <button class="button button-secondary button-small" type="submit">Resolve</button>
                    </form>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </section>`
      : `
        <section class="card dashboard-card">
          <p class="eyebrow">Business Rules</p>
          <h2>Trigger violations</h2>
          <div class="empty-state"><p>No unresolved trigger violations.</p></div>
        </section>`;

    return res.send(renderPage({
      title: "Supervisor Overview",
      user,
      currentPath: req.path,
      hero: {
        eyebrow: "Supervisor Portal",
        title: `Welcome, ${escapeHtml(user.name.split(" ")[0])}`,
        description: "Supervisor alerts now sit at the top of the page and the rest of the workspace is organized by major operational areas.",
        imagePath: getRoleAsset("supervisor").imagePath,
        alt: getRoleAsset("supervisor").alt,
        actions: [
          { href: "/reports", label: "Open Reports" },
          { href: "/queries", label: "Search Collection", secondary: true },
        ],
      },
      alertContent: urgentCount > 0 ? {
        type: "error",
        title: `Immediate attention required: ${urgentCount} unresolved item${urgentCount === 1 ? "" : "s"}`,
        message: "Notifications and trigger violations are surfaced before all other operational tools so they cannot be ignored.",
      } : null,
      content: `
        <section class="card dashboard-card">
          <p class="eyebrow">Operational Overview</p>
          <h2>Supervisor workspace</h2>
          <p class="dashboard-intro">The navigation now separates oversight, reporting, tours, events, and collection operations.</p>
          ${renderProfile(user)}
          ${renderFlash(req)}
        </section>
        ${notificationsHtml}
        ${triggerViolationsHtml}
        ${renderActionCards([
          { eyebrow: "Reports", title: "Management Reports", description: "Review ticketing, revenue, memberships, and operations through tabbed reporting views.", href: "/reports", linkLabel: "Open Reports", imagePath: "/images/spring-exhibition-opening-gala.jpg", alt: "Operations report context." },
          { eyebrow: "Tours", title: "Guided Tour Scheduling", description: "Schedule tours, review roster details, and manage guide assignments.", href: "/tours", linkLabel: "Manage Tours", imagePath: "/images/spring-collection.jpg", alt: "Guided tour planning." },
          { eyebrow: "Events", title: "Museum Events", description: "Maintain events and registrations with clearer visibility into member access and capacity.", href: "/add-event", linkLabel: "Manage Events", imagePath: "/images/spring-exhibition-opening-gala.jpg", alt: "Museum event management." },
          { eyebrow: "Collection", title: "Collection and Inventory", description: "Search the collection and review retail, cafe, and collection records from one operations view.", href: "/queries", linkLabel: "Open Collection Search", imagePath: getExhibitionAsset("Spring Collection 2026").imagePath, alt: "Collection search image." },
        ])}
      `,
    }));
  }));

  app.post("/notifications/:id/read", requireLogin, asyncHandler(async (req, res) => {
    await pool.query(
      `UPDATE manager_notifications SET is_read = TRUE WHERE notification_id = ?`,
      [req.params.id]
    );
    res.redirect("/dashboard");
  }));

  app.post("/notifications/clear", requireLogin, asyncHandler(async (req, res) => {
    await pool.query(`UPDATE manager_notifications SET is_read = TRUE`);
    res.redirect("/dashboard");
  }));

  app.post("/trigger-violations/:id/resolve", requireLogin, asyncHandler(async (req, res) => {
    if (!isSupervisor(req.session.user)) {
      return res.redirect("/dashboard");
    }

    await pool.query(
      `UPDATE trigger_violation_log SET is_resolved = TRUE WHERE violation_id = ?`,
      [req.params.id],
    );
    res.redirect("/dashboard");
  }));
}

module.exports = { registerDashboardRoutes };
