const {
  escapeHtml,
  isEmployee,
  isSupervisor,
  renderFlash,
  renderPage,
  requireLogin,
} = require("../helpers");

function registerDashboardRoutes(app, { pool }) {
  app.get("/dashboard", requireLogin, (req, res) => {
    const user = req.session.user;
    let eyebrow = "Member Portal";
    let title = "Plan Your Visit";
    let intro = "Purchase admission tickets and browse museum information from one place.";
    let profileCards = `
      <div class="detail-item"><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
      <div class="detail-item"><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
    `;
    let sections = `
      <section class="dashboard-section">
        <h2>Visit Planning</h2>
        <div class="button-row dashboard-actions">
          <a class="button" href="/purchase-ticket">Purchase Tickets</a>
          <a class="button button-secondary" href="/queries">Browse Museum Queries</a>
        </div>
      </section>
    `;

    if (isEmployee(user)) {
      eyebrow = "Employee Portal";
      title = "Daily Operations";
      intro = "Record admissions, manage memberships, and process retail or cafe sales.";
      sections = `
        <section class="dashboard-section">
          <h2>Admissions Desk</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-ticket">Manage Ticket Orders</a>
            <a class="button" href="/add-ticket-line">Manage Ticket Line Items</a>
            <a class="button button-secondary" href="/add-membership">Manage Memberships</a>
          </div>
        </section>
        <section class="dashboard-section">
          <h2>Retail and Cafe</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-sale">Create Gift Shop Sale</a>
            <a class="button" href="/add-sale-line">Add Items to Gift Shop Sale</a>
            <a class="button" href="/add-food-sale">Create Cafe Sale</a>
            <a class="button" href="/add-food-sale-line">Add Food to Cafe Sale</a>
            <a class="button button-secondary" href="/queries">Operational Queries</a>
          </div>
        </section>
      `;
    }

    if (isSupervisor(user)) {
      eyebrow = "Supervisor Portal";
      title = "Collections and Reporting";
      intro = "Oversee collection records, exhibitions, inventory, and reporting.";
      sections = `
        <section class="dashboard-section">
          <h2>Collections Management</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-artist">Manage Artists</a>
            <a class="button" href="/add-artwork">Manage Artworks</a>
            <a class="button" href="/add-exhibition">Manage Exhibitions</a>
            <a class="button" href="/add-exhibition-artwork">Assign Artwork to Exhibitions</a>
          </div>
        </section>
        <section class="dashboard-section">
          <h2>Business Operations</h2>
          <div class="button-row dashboard-actions">
            <a class="button" href="/add-membership">Manage Memberships</a>
            <a class="button" href="/add-item">Manage Gift Shop Inventory</a>
            <a class="button" href="/add-food">Manage Cafe Menu</a>
            <a class="button button-secondary" href="/queries">Museum Queries</a>
            <a class="button button-secondary" href="/reports">Museum Reports</a>
          </div>
        </section>
      `;
    }

    res.send(renderPage({
      title: "Dashboard",
      user,
      content: `
      <section class="card narrow dashboard-card">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${title}</h1>
        <p class="dashboard-intro">${intro}</p>
        <dl class="details dashboard-details">
          ${profileCards}
        </dl>
        ${renderFlash(req)}
        ${sections}
        <form method="post" action="/logout" class="dashboard-footer">
          <button class="button" type="submit">Log Out</button>
        </form>
      </section>
    `,
    }));
  });
  
}

module.exports = { registerDashboardRoutes };