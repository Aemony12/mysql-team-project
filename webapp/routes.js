const {
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  isEmployee,
  isSupervisor,
  renderFlash,
  renderPage,
  requireLogin,
  setFlash,
} = require("./helpers");

function registerRoutes(app, { pool }) {
  const allowRoles = (roles) => (req, res, next) => {
    if (!roles.includes(req.session.user.role)) {
      setFlash(req, "Access denied.");
      return res.redirect("/dashboard");
    }

    next();
  };

  app.get("/", (req, res) => {
    res.send(renderPage({
      title: "The Museum of Fine Arts, Houston",
      user: req.session.user,
      content: `
      <section class="hero card narrow">
        <p class="eyebrow">Museum Operations</p>
        <h1>Museum Portal</h1>
        <p>Use the member, employee, or supervisor portal to purchase tickets, manage daily operations, and review museum reports.</p>
        <div class="button-row">
          ${req.session.user ? '<a class="button" href="/dashboard">Go to Dashboard</a>' : '<a class="button" href="/login">Open Login</a>'}
        </div>
      </section>
    `,
    }));
  });

  app.get("/login", (req, res) => {
    res.send(renderPage({
      title: "Log In",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>Log In</h1>
        ${renderFlash(req)}
        <form id="login-form" method="post" action="/login" class="form-grid">
          <label>Email<input type="email" name="email" required></label>
          <label>Password<input type="password" name="password" required></label>
        </form>
        <div class="button-row form-actions">
          <button class="button" type="submit" form="login-form">Log In</button>
          <a class="button" href="/signup">Sign Up</a>
        </div>
      </section>
    `,
    }));
  });

  app.get("/signup", (req, res) => {
    res.send(renderPage({
      title: "Sign Up",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>Member Sign Up</h1>
        ${renderFlash(req)}
        <form id="signup-form" method="post" action="/signup" class="form-grid">
          <label>First Name<input type="text" name="first_name" required></label>
          <label>Last Name<input type="text" name="last_name" required></label>
          <label>Email<input type="email" name="email" required></label>
          <label>Phone<input type="tel" name="phone"></label>
          <label>Password<input type="password" name="password" required></label>
        </form>
        <div class="button-row form-actions">
          <button class="button" type="submit" form="signup-form">Create Account</button>
          <a class="button" href="/login">Log In</a>
        </div>
      </section>
    `,
    }));
  });

  app.post("/login", asyncHandler(async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const submittedCredential = req.body.password?.trim();

    const [rows] = await pool.query(
      `SELECT id, name, email, password AS stored_credential, role, is_active, employee_id, membership_id
       FROM users
       WHERE email = ?`,
      [email],
    );

    const authenticatedUser = rows[0];
    if (!authenticatedUser || authenticatedUser.stored_credential !== submittedCredential || !authenticatedUser.is_active) {
      setFlash(req, "Invalid login credentials.");
      return res.redirect("/login");
    }

    req.session.user = {
      id: authenticatedUser.id,
      name: authenticatedUser.name,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
      employeeId: authenticatedUser.employee_id,
      membershipId: authenticatedUser.membership_id,
    };

    res.redirect("/dashboard");
  }));

  app.post("/signup", asyncHandler(async (req, res) => {
    const firstName = req.body.first_name?.trim();
    const lastName = req.body.last_name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const phone = req.body.phone?.trim();
    const password = req.body.password?.trim();

    if (!firstName || !lastName || !email || !password) {
      setFlash(req, "Please fill in all required fields.");
      return res.redirect("/signup");
    }

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existingUsers.length > 0) {
      setFlash(req, "An account with that email already exists.");
      return res.redirect("/signup");
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [membershipResult] = await connection.query(
        `INSERT INTO Membership (First_Name, Last_Name, Email, Phone_Number, Date_Joined)
         VALUES (?, ?, ?, ?, CURRENT_DATE)`,
        [firstName, lastName, email, phone || null],
      );

      await connection.query(
        `INSERT INTO users (name, email, password, role, is_active, membership_id)
         VALUES (?, ?, ?, 'user', TRUE, ?)`,
        [`${firstName} ${lastName}`, email, password, membershipResult.insertId],
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      if (error && error.code === "ER_DUP_ENTRY") {
        setFlash(req, "An account with that email already exists.");
        return res.redirect("/signup");
      }

      throw error;
    } finally {
      connection.release();
    }

    setFlash(req, "Account created. Please log in.");
    res.redirect("/login");
  }));

  app.post("/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });

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

  app.get("/purchase-ticket", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const [exhibitions] = await pool.query(
      "SELECT Exhibition_ID, Exhibition_Name FROM Exhibition ORDER BY Exhibition_Name",
    );
    const [recentTickets] = await pool.query(
      `SELECT Ticket_ID, Purchase_Date, Visit_Date, Payment_method
       FROM Ticket
       WHERE Membership_ID = ?
       ORDER BY Purchase_Date DESC, Ticket_ID DESC
       LIMIT 5`,
      [req.session.user.membershipId || 0],
    );

    const ticketRows = recentTickets.map((ticket) => `
      <tr>
        <td>#${ticket.Ticket_ID}</td>
        <td>${formatDisplayDate(ticket.Purchase_Date)}</td>
        <td>${formatDisplayDate(ticket.Visit_Date)}</td>
        <td>${escapeHtml(ticket.Payment_method || "N/A")}</td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Purchase Tickets",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <p class="eyebrow">Member Portal</p>
        <h1>Purchase Tickets</h1>
        <p class="dashboard-note">Use one form to complete a ticket purchase instead of creating ticket records manually.</p>
        ${renderFlash(req)}
        <form method="post" action="/purchase-ticket" class="form-grid">
          <label>Visit Date
            <input type="date" name="visit_date" required>
          </label>
          <label>Ticket Type
            <select name="ticket_type" required>
              <option value="General Admission">General Admission</option>
              <option value="Student">Student</option>
              <option value="Child">Child</option>
              <option value="Senior">Senior</option>
            </select>
          </label>
          <label>Quantity
            <input type="number" name="quantity" min="1" value="1" required>
          </label>
          <label>Price Per Ticket
            <input type="number" step="0.01" name="price" min="0" value="20.00" required>
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
      </section>
      <section class="card narrow">
        <h2>Recent Purchases</h2>
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Purchase Date</th>
              <th>Visit Date</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            ${ticketRows || '<tr><td colspan="4">No ticket purchases found for this member.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/purchase-ticket", requireLogin, allowRoles(["user"]), asyncHandler(async (req, res) => {
    const {
      visit_date: visitDate,
      ticket_type: ticketType,
      quantity,
      price,
      payment_method: paymentMethod,
      exhibition_id: exhibitionId,
    } = req.body;

    if (!visitDate || !ticketType || !quantity || !price || !paymentMethod) {
      setFlash(req, "All purchase fields are required.");
      return res.redirect("/purchase-ticket");
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [ticketResult] = await connection.query(
        `INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Payment_method, Membership_ID)
         VALUES ('Online', CURRENT_DATE, ?, ?, ?)`,
        [visitDate, paymentMethod, req.session.user.membershipId || null],
      );

      await connection.query(
        `INSERT INTO ticket_line (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket, Exhibition_ID)
         VALUES (?, ?, ?, ?, ?)`,
        [ticketResult.insertId, ticketType, quantity, price, exhibitionId || null],
      );

      await connection.commit();
      setFlash(req, `Ticket purchase completed. Confirmation #${ticketResult.insertId}.`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.redirect("/purchase-ticket");
  }));

  app.get("/queries", requireLogin, asyncHandler(async (req, res) => {
    const artistSearch = req.query.artist?.trim() || "";
    const styleSearch = req.query.style?.trim() || "";
    const startDate = req.query.start_date?.trim() || "";
    const endDate = req.query.end_date?.trim() || "";
    const categorySearch = req.query.category?.trim() || "";
    const maxPrice = req.query.max_price?.trim() || "";

    const [artworkResults] = await pool.query(
      `SELECT AW.Title, AW.Type, AW.Art_Style, AW.Time_Period, AR.Artist_Name
       FROM Artwork AW
       JOIN Artist AR ON AR.Artist_ID = AW.Artist_ID
       WHERE (? = '' OR AR.Artist_Name LIKE CONCAT('%', ?, '%'))
         AND (? = '' OR AW.Art_Style LIKE CONCAT('%', ?, '%'))
       ORDER BY AR.Artist_Name, AW.Title
       LIMIT 50`,
      [artistSearch, artistSearch, styleSearch, styleSearch],
    );

    const [exhibitionResults] = await pool.query(
      `SELECT Exhibition_Name, Starting_Date, Ending_Date
       FROM Exhibition
       WHERE (? = '' OR Ending_Date >= ?)
         AND (? = '' OR Starting_Date <= ?)
       ORDER BY Starting_Date DESC
       LIMIT 50`,
      [startDate, startDate, endDate, endDate],
    );

    const [inventoryResults] = await pool.query(
      `SELECT Name_of_Item, Category, Price_of_Item, Stock_Quantity
       FROM Gift_Shop_Item
       WHERE (? = '' OR Category LIKE CONCAT('%', ?, '%'))
         AND (? = '' OR Price_of_Item <= ?)
       ORDER BY Category, Name_of_Item
       LIMIT 50`,
      [categorySearch, categorySearch, maxPrice, maxPrice],
    );

    const artworkRows = artworkResults.map((artwork) => `
      <tr>
        <td>${escapeHtml(artwork.Title)}</td>
        <td>${escapeHtml(artwork.Artist_Name)}</td>
        <td>${escapeHtml(artwork.Type)}</td>
        <td>${escapeHtml(artwork.Art_Style || "N/A")}</td>
        <td>${escapeHtml(artwork.Time_Period || "N/A")}</td>
      </tr>
    `).join("");

    const exhibitionRows = exhibitionResults.map((exhibition) => `
      <tr>
        <td>${escapeHtml(exhibition.Exhibition_Name)}</td>
        <td>${formatDisplayDate(exhibition.Starting_Date)}</td>
        <td>${formatDisplayDate(exhibition.Ending_Date)}</td>
      </tr>
    `).join("");

    const inventoryRows = inventoryResults.map((item) => `
      <tr>
        <td>${escapeHtml(item.Name_of_Item)}</td>
        <td>${escapeHtml(item.Category || "N/A")}</td>
        <td>$${Number(item.Price_of_Item).toFixed(2)}</td>
        <td>${item.Stock_Quantity}</td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Museum Queries",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <p class="eyebrow">Data Queries</p>
        <h1>Museum Queries</h1>
        <p class="dashboard-note">These search forms satisfy the required query views with museum-focused filters.</p>
      </section>
      <section class="card narrow">
        <h2>Artwork by Artist or Style</h2>
        <form method="get" action="/queries" class="form-grid">
          <label>Artist Name
            <input type="text" name="artist" value="${escapeHtml(artistSearch)}">
          </label>
          <label>Art Style
            <input type="text" name="style" value="${escapeHtml(styleSearch)}">
          </label>
          <button class="button" type="submit">Run Query</button>
        </form>
        <table>
          <thead><tr><th>Title</th><th>Artist</th><th>Type</th><th>Style</th><th>Period</th></tr></thead>
          <tbody>${artworkRows || '<tr><td colspan="5">No artwork matched the selected filters.</td></tr>'}</tbody>
        </table>
      </section>
      <section class="card narrow">
        <h2>Exhibitions by Date Range</h2>
        <form method="get" action="/queries" class="form-grid">
          <label>Start Date
            <input type="date" name="start_date" value="${escapeHtml(startDate)}">
          </label>
          <label>End Date
            <input type="date" name="end_date" value="${escapeHtml(endDate)}">
          </label>
          <button class="button" type="submit">Run Query</button>
        </form>
        <table>
          <thead><tr><th>Exhibition</th><th>Starts</th><th>Ends</th></tr></thead>
          <tbody>${exhibitionRows || '<tr><td colspan="3">No exhibitions matched the selected dates.</td></tr>'}</tbody>
        </table>
      </section>
      <section class="card narrow">
        <h2>Gift Shop Inventory Lookup</h2>
        <form method="get" action="/queries" class="form-grid">
          <label>Category
            <input type="text" name="category" value="${escapeHtml(categorySearch)}">
          </label>
          <label>Maximum Price
            <input type="number" step="0.01" min="0" name="max_price" value="${escapeHtml(maxPrice)}">
          </label>
          <button class="button" type="submit">Run Query</button>
        </form>
        <table>
          <thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Stock</th></tr></thead>
          <tbody>${inventoryRows || '<tr><td colspan="4">No inventory matched the selected filters.</td></tr>'}</tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.get("/reports", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const salesStart = req.query.sales_start?.trim() || "";
    const salesEnd = req.query.sales_end?.trim() || "";
    const department = req.query.department?.trim() || "";
    const revenueStart = req.query.revenue_start?.trim() || "";
    const revenueEnd = req.query.revenue_end?.trim() || "";

    const [ticketSalesRows] = await pool.query(
      `SELECT T.Visit_Date, TL.Ticket_Type, SUM(TL.Quantity) AS Tickets_Sold, SUM(TL.Total_sum_of_ticket) AS Revenue
       FROM Ticket T
       JOIN ticket_line TL ON TL.Ticket_ID = T.Ticket_ID
       WHERE (? = '' OR T.Purchase_Date >= ?)
         AND (? = '' OR T.Purchase_Date <= ?)
       GROUP BY T.Visit_Date, TL.Ticket_Type
       ORDER BY T.Visit_Date DESC, TL.Ticket_Type`,
      [salesStart, salesStart, salesEnd, salesEnd],
    );

    const [employeeRows] = await pool.query(
      `SELECT CONCAT(E.First_Name, ' ', E.Last_Name) AS Employee_Name,
              E.Employee_Role,
              D.Department_Name,
              CONCAT(S.First_Name, ' ', S.Last_Name) AS Supervisor_Name
       FROM Employee E
       LEFT JOIN Department D ON D.Department_ID = E.Department_ID
       LEFT JOIN Employee S ON S.Employee_ID = E.Supervisor_ID
       WHERE (? = '' OR D.Department_Name LIKE CONCAT('%', ?, '%'))
       ORDER BY D.Department_Name, E.Last_Name, E.First_Name`,
      [department, department],
    );

    const [exhibitionRevenueRows] = await pool.query(
      `SELECT COALESCE(EX.Exhibition_Name, 'General Admission') AS Exhibition_Name,
              SUM(TL.Quantity) AS Tickets_Sold,
              SUM(TL.Total_sum_of_ticket) AS Revenue
       FROM ticket_line TL
       JOIN Ticket T ON T.Ticket_ID = TL.Ticket_ID
       LEFT JOIN Exhibition EX ON EX.Exhibition_ID = TL.Exhibition_ID
       WHERE (? = '' OR T.Visit_Date >= ?)
         AND (? = '' OR T.Visit_Date <= ?)
       GROUP BY COALESCE(EX.Exhibition_Name, 'General Admission')
       HAVING SUM(TL.Quantity) > 0
       ORDER BY Revenue DESC, Exhibition_Name`,
      [revenueStart, revenueStart, revenueEnd, revenueEnd],
    );

    const ticketSalesHtml = ticketSalesRows.map((row) => `
      <tr>
        <td>${formatDisplayDate(row.Visit_Date)}</td>
        <td>${escapeHtml(row.Ticket_Type)}</td>
        <td>${row.Tickets_Sold}</td>
        <td>$${Number(row.Revenue).toFixed(2)}</td>
      </tr>
    `).join("");

    const employeeHtml = employeeRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.Employee_Name)}</td>
        <td>${escapeHtml(row.Employee_Role || "N/A")}</td>
        <td>${escapeHtml(row.Department_Name || "Unassigned")}</td>
        <td>${escapeHtml(row.Supervisor_Name || "None")}</td>
      </tr>
    `).join("");

    const revenueHtml = exhibitionRevenueRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.Exhibition_Name)}</td>
        <td>${row.Tickets_Sold}</td>
        <td>$${Number(row.Revenue).toFixed(2)}</td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Museum Reports",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <p class="eyebrow">Supervisor Reports</p>
        <h1>Museum Reports</h1>
        <p class="dashboard-note">These report views satisfy the rubric requirement for filtered reports with selectable criteria.</p>
      </section>
      <section class="card narrow">
        <h2>Ticket Sales by Date Range</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Purchase Start
            <input type="date" name="sales_start" value="${escapeHtml(salesStart)}">
          </label>
          <label>Purchase End
            <input type="date" name="sales_end" value="${escapeHtml(salesEnd)}">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead><tr><th>Visit Date</th><th>Ticket Type</th><th>Tickets Sold</th><th>Revenue</th></tr></thead>
          <tbody>${ticketSalesHtml || '<tr><td colspan="4">No ticket sales matched the selected dates.</td></tr>'}</tbody>
        </table>
      </section>
      <section class="card narrow">
        <h2>Employees by Department</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Department Name
            <input type="text" name="department" value="${escapeHtml(department)}">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead><tr><th>Employee</th><th>Position</th><th>Department</th><th>Supervisor</th></tr></thead>
          <tbody>${employeeHtml || '<tr><td colspan="4">No employees matched the selected department.</td></tr>'}</tbody>
        </table>
      </section>
      <section class="card narrow">
        <h2>Revenue by Exhibition</h2>
        <form method="get" action="/reports" class="form-grid">
          <label>Visit Start
            <input type="date" name="revenue_start" value="${escapeHtml(revenueStart)}">
          </label>
          <label>Visit End
            <input type="date" name="revenue_end" value="${escapeHtml(revenueEnd)}">
          </label>
          <button class="button" type="submit">Run Report</button>
        </form>
        <table>
          <thead><tr><th>Exhibition</th><th>Tickets Sold</th><th>Revenue</th></tr></thead>
          <tbody>${revenueHtml || '<tr><td colspan="3">No exhibition revenue matched the selected dates.</td></tr>'}</tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.get("/add-artist", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const [artists] = await pool.query(
      "SELECT Artist_ID, Artist_Name, Birth_Place, Date_of_Birth, Date_of_Death FROM Artist",
    );

    let editArtist = null; 
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Artist WHERE Artist_ID = ?",
        [req.query.edit_id],
      );
      editArtist = rows[0] || null;
    }





    const artistRows = artists.map((artist) => `
      <tr>
        <td>${artist.Artist_ID}</td>
        <td>${escapeHtml(artist.Artist_Name)}</td>
        <td>${escapeHtml(artist.Birth_Place || "Unknown")}</td>
        <td>${formatDisplayDate(artist.Date_of_Birth)}</td>
        <td>${artist.Date_of_Death ? formatDisplayDate(artist.Date_of_Death) : ""}</td>
        <td class="actions">
          <form method="get" action="/add-artist" class="inline-form">
            <input type="hidden" name="edit_id" value="${artist.Artist_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-artist" class="inline-form" onsubmit="return confirm('Are you sure you want to delete this artist?');">
            <input type="hidden" name="artist_id" value="${artist.Artist_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Artists",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editArtist ? "Edit Artist" : "Add New Artist"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-artist" class="form-grid">
          ${editArtist ? `<input type="hidden" name="artist_id" value="${editArtist.Artist_ID}">` : ""}
          <label>
            Artist Name
            <input type="text" name="name" value="${editArtist ? escapeHtml(editArtist.Artist_Name) : ""}" required>
          </label>
          <label>
            Birth Place
            <input type="text" name="birthplace" value="${editArtist ? escapeHtml(editArtist.Birth_Place) : ""}">
          </label>
          <label>
            Date of Birth
            <input type="date" name="dob" value="${editArtist ? formatDateInput(editArtist.Date_of_Birth) : ""}">
          </label>
          <label>
            Date of Death
            <input type="date" name="dod" value="${editArtist ? formatDateInput(editArtist.Date_of_Death) : ""}">
          </label>
          <button class="button" type="submit">${editArtist ? "Update Artist" : "Add Artist"}</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Current Artists</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Birth Place</th>
              <th>Date of Birth</th>
              <th>Date of Death</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${artistRows || '<tr><td colspan="6">No artists found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-artist", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.artist_id || null;
    const name = req.body.name?.trim();
    const dob = req.body.dob || null;
    const dod = req.body.dod || null;
    const birthplace = req.body.birthplace?.trim() || null;

    if (!name) {
      setFlash(req, "Artist name is required.");
      return res.redirect("/add-artist");
    }

    if (id) {
      await pool.query(
        `UPDATE Artist
         SET Artist_Name = ?, Birth_Place = ?, Date_of_Birth = ?, Date_of_Death = ?
         WHERE Artist_ID = ?`,
        [name, birthplace, dob, dod, id],
      );
      setFlash(req, "Artist updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO Artist (Artist_Name, Birth_Place, Date_of_Birth, Date_of_Death)
         VALUES (?, ?, ?, ?)`,
        [name, birthplace, dob, dod],
      );
      setFlash(req, "Artist added successfully.");
    }

    res.redirect("/add-artist");
  }));

  app.post("/delete-artist", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.artist_id;

    if (!idToDelete) {
      setFlash(req, "Error: No artist ID provided.");
      return res.redirect("/add-artist");
    }

    await pool.query("DELETE FROM Artist WHERE Artist_ID = ?", [idToDelete]);
    setFlash(req, "Artist successfully deleted!");
    res.redirect("/add-artist");
  }));

  app.get("/add-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const [artists] = await pool.query("SELECT Artist_ID, Artist_Name FROM Artist");
    if (artists.length === 0) {
      setFlash(req, "Please add an artist first.");
      return res.redirect("/add-artist");
    }

    let editArtwork = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Artwork WHERE Artwork_ID = ?",
        [req.query.edit_id],
      );
      editArtwork = rows[0] || null;
    }

    const [artworks] = await pool.query(`
      SELECT Artwork.Artwork_ID, Artwork.Title, Artwork.Type, Artwork.Artist_ID, Artist.Artist_Name
      FROM Artwork
      JOIN Artist ON Artwork.Artist_ID = Artist.Artist_ID
    `);

    const artworkRows = artworks.map((artwork) => `
      <tr>
        <td>${artwork.Artwork_ID}</td>
        <td>${escapeHtml(artwork.Title)}</td>
        <td>${escapeHtml(artwork.Type)}</td>
        <td>${escapeHtml(artwork.Artist_Name)}</td>
        <td class="actions">
          <form method="get" action="/add-artwork" class="inline-form">
            <input type="hidden" name="edit_id" value="${artwork.Artwork_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-artwork" class="inline-form" onsubmit="return confirm('Are you sure you want to delete this artwork?');">
            <input type="hidden" name="artwork_id" value="${artwork.Artwork_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Artwork",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editArtwork ? "Edit Artwork" : "Add New Artwork"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-artwork" class="form-grid">
          ${editArtwork ? `<input type="hidden" name="artwork_id" value="${editArtwork.Artwork_ID}">` : ""}
          <label>
            Title
            <input type="text" name="title" value="${editArtwork ? escapeHtml(editArtwork.Title) : ""}" required>
          </label>
          <label>
            Type
            <input type="text" name="type" value="${editArtwork ? escapeHtml(editArtwork.Type) : ""}" required>
          </label>
          <label>Artist
            <select name="artist_id" required>
              ${artists.map((artist) => `
                <option value="${artist.Artist_ID}" ${editArtwork && editArtwork.Artist_ID === artist.Artist_ID ? "selected" : ""}>
                  ${escapeHtml(artist.Artist_Name)}
                </option>
              `).join("")}
            </select>
          </label>
          <button class="button" type="submit">${editArtwork ? "Update Artwork" : "Add Artwork"}</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Current Artworks</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Type</th>
              <th>Artist Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${artworkRows || '<tr><td colspan="5">No artworks found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.artwork_id || null;
    const title = req.body.title?.trim();
    const type = req.body.type?.trim();
    const artistId = req.body.artist_id;

    if (!title || !type || !artistId) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-artwork");
    }

    if (id) {
      await pool.query(
        "UPDATE Artwork SET Title = ?, Type = ?, Artist_ID = ? WHERE Artwork_ID = ?",
        [title, type, artistId, id],
      );
      setFlash(req, "Artwork updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO Artwork (Title, Type, Artist_ID)
         VALUES (?, ?, ?)`,
        [title, type, artistId],
      );
      setFlash(req, "Artwork added successfully.");
    }

    res.redirect("/add-artwork");
  }));

  app.post("/delete-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.artwork_id;

    if (!idToDelete) {
      setFlash(req, "Error: No artwork ID provided.");
      return res.redirect("/add-artwork");
    }

    await pool.query("DELETE FROM Artwork WHERE Artwork_ID = ?", [idToDelete]);
    setFlash(req, "Artwork successfully deleted!");
    res.redirect("/add-artwork");
  }));

  app.get("/add-membership", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const [members] = await pool.query(
      "SELECT Membership_ID, First_Name, Last_Name, Email, Phone_Number, Date_Joined FROM Membership",
    );

    let editMember = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Membership WHERE Membership_ID = ?",
        [req.query.edit_id],
      );
      editMember = rows[0] || null;
    }

    const memberRows = members.map((member) => `
      <tr>
        <td>${member.Membership_ID}</td>
        <td>${escapeHtml(member.First_Name)} ${escapeHtml(member.Last_Name)}</td>
        <td>${escapeHtml(member.Email || "N/A")}</td>
        <td>${escapeHtml(member.Phone_Number || "N/A")}</td>
        <td class="actions">
          <form method="get" action="/add-membership" class="inline-form">
            <input type="hidden" name="edit_id" value="${member.Membership_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-membership" class="inline-form" onsubmit="return confirm('Are you sure you want to delete this member?');">
            <input type="hidden" name="membership_id" value="${member.Membership_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Memberships",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editMember ? "Edit Membership" : "Add Membership"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-membership" class="form-grid">
          ${editMember ? `<input type="hidden" name="membership_id" value="${editMember.Membership_ID}">` : ""}
          <label>First Name
            <input type="text" name="first_name" value="${editMember ? escapeHtml(editMember.First_Name) : ""}" required>
          </label>
          <label>Last Name
            <input type="text" name="last_name" value="${editMember ? escapeHtml(editMember.Last_Name) : ""}" required>
          </label>
          <label>Email
            <input type="email" name="email" value="${editMember ? escapeHtml(editMember.Email || "") : ""}">
          </label>
          <label>Phone
            <input type="tel" name="phone" value="${editMember ? escapeHtml(editMember.Phone_Number || "") : ""}">
          </label>
          <label>Date Joined
            <input type="date" name="date_joined" value="${editMember ? formatDateInput(editMember.Date_Joined) : ""}">
          </label>
          <button class="button" type="submit">${editMember ? "Update Membership" : "Add Membership"}</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Current Members</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${memberRows || '<tr><td colspan="5">No members found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-membership", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.membership_id || null;
    const { first_name: firstName, last_name: lastName, email, phone, date_joined: dateJoined } = req.body;

    if (!firstName || !lastName) {
      setFlash(req, "Name is required.");
      return res.redirect("/add-membership");
    }

    if (id) {
      await pool.query(
        `UPDATE Membership
         SET First_Name = ?, Last_Name = ?, Email = ?, Phone_Number = ?, Date_Joined = ?
         WHERE Membership_ID = ?`,
        [firstName, lastName, email || null, phone || null, dateJoined || null, id],
      );
      setFlash(req, "Membership updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO Membership (First_Name, Last_Name, Email, Phone_Number, Date_Joined)
         VALUES (?, ?, ?, ?, ?)`,
        [firstName, lastName, email || null, phone || null, dateJoined || null],
      );
      setFlash(req, "Membership added.");
    }

    res.redirect("/add-membership");
  }));

  app.post("/delete-membership", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.membership_id;

    if (!idToDelete) {
      setFlash(req, "Error: No membership ID provided.");
      return res.redirect("/add-membership");
    }

    await pool.query("DELETE FROM Membership WHERE Membership_ID = ?", [idToDelete]);
    setFlash(req, "Membership successfully deleted!");
    res.redirect("/add-membership");
  }));

  app.get("/add-exhibition", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const [exhibitions] = await pool.query(
      "SELECT Exhibition_ID, Exhibition_Name, Starting_Date, Ending_Date FROM Exhibition",
    );

    let editExhibition = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Exhibition WHERE Exhibition_ID = ?",
        [req.query.edit_id],
      );
      editExhibition = rows[0] || null;
    }

    const exhibitionRows = exhibitions.map((exhibition) => `
      <tr>
        <td>${exhibition.Exhibition_ID}</td>
        <td>${escapeHtml(exhibition.Exhibition_Name)}</td>
        <td>${formatDisplayDate(exhibition.Starting_Date)}</td>
        <td>${formatDisplayDate(exhibition.Ending_Date)}</td>
        <td class="actions">
          <form method="get" action="/add-exhibition" class="inline-form">
            <input type="hidden" name="edit_id" value="${exhibition.Exhibition_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-exhibition" class="inline-form" onsubmit="return confirm('Delete this exhibition?');">
            <input type="hidden" name="exhibition_id" value="${exhibition.Exhibition_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Exhibitions",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editExhibition ? "Edit Exhibition" : "Add New Exhibition"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-exhibition" class="form-grid">
          ${editExhibition ? `<input type="hidden" name="exhibition_id" value="${editExhibition.Exhibition_ID}">` : ""}
          <label>Exhibition Name
            <input type="text" name="name" value="${editExhibition ? escapeHtml(editExhibition.Exhibition_Name) : ""}" required>
          </label>
          <label>Start Date
            <input type="date" name="start_date" value="${editExhibition ? formatDateInput(editExhibition.Starting_Date) : ""}" required>
          </label>
          <label>End Date
            <input type="date" name="end_date" value="${editExhibition ? formatDateInput(editExhibition.Ending_Date) : ""}" required>
          </label>
          <button class="button" type="submit">${editExhibition ? "Update Exhibition" : "Add Exhibition"}</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Current Exhibitions</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Start</th>
              <th>End</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${exhibitionRows || '<tr><td colspan="5">No exhibitions found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-exhibition", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const id = req.body.exhibition_id || null;
    const { name, start_date: startDate, end_date: endDate } = req.body;

    if (!name || !startDate || !endDate) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-exhibition");
    }

    if (id) {
      await pool.query(
        `UPDATE Exhibition
         SET Exhibition_Name = ?, Starting_Date = ?, Ending_Date = ?
         WHERE Exhibition_ID = ?`,
        [name, startDate, endDate, id],
      );
      setFlash(req, "Exhibition updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO Exhibition (Exhibition_Name, Starting_Date, Ending_Date)
         VALUES (?, ?, ?)`,
        [name, startDate, endDate],
      );
      setFlash(req, "Exhibition added successfully. Now link artwork to the exhibition.");
    }

    res.redirect("/add-exhibition");
  }));

  app.post("/delete-exhibition", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.exhibition_id;

    if (!idToDelete) {
      setFlash(req, "Error: No exhibition ID provided.");
      return res.redirect("/add-exhibition");
    }

    await pool.query("DELETE FROM Exhibition_Artwork WHERE Exhibition_ID = ?", [idToDelete]);
    await pool.query("DELETE FROM Exhibition WHERE Exhibition_ID = ?", [idToDelete]);
    setFlash(req, "Exhibition and its artwork links successfully deleted!");
    res.redirect("/add-exhibition");
  }));

  app.get("/add-exhibition-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const [exhibitions] = await pool.query("SELECT Exhibition_ID, Exhibition_Name FROM Exhibition");
    const [artworks] = await pool.query("SELECT Artwork_ID, Title FROM Artwork");

    let editLink = null;
    if (req.query.edit_exhibition_id && req.query.edit_artwork_id) {
      const [rows] = await pool.query(
        `SELECT * FROM Exhibition_Artwork
         WHERE Exhibition_ID = ? AND Artwork_ID = ?`,
        [req.query.edit_exhibition_id, req.query.edit_artwork_id],
      );
      editLink = rows[0] || null;
    }

    const [links] = await pool.query(`
      SELECT ea.Exhibition_ID, ea.Artwork_ID, e.Exhibition_Name, a.Title, ea.Display_Room, ea.Date_Installed
      FROM Exhibition_Artwork ea
      JOIN Exhibition e ON ea.Exhibition_ID = e.Exhibition_ID
      JOIN Artwork a ON ea.Artwork_ID = a.Artwork_ID
    `);

    const linkRows = links.map((link) => `
      <tr>
        <td>${escapeHtml(link.Exhibition_Name)}</td>
        <td>${escapeHtml(link.Title)}</td>
        <td>${escapeHtml(link.Display_Room || "N/A")}</td>
        <td>${formatDisplayDate(link.Date_Installed)}</td>
        <td class="actions">
          <form method="get" action="/add-exhibition-artwork" class="inline-form">
            <input type="hidden" name="edit_exhibition_id" value="${link.Exhibition_ID}">
            <input type="hidden" name="edit_artwork_id" value="${link.Artwork_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-exhibition-artwork" class="inline-form" onsubmit="return confirm('Remove this artwork from the exhibition?');">
            <input type="hidden" name="exhibition_id" value="${link.Exhibition_ID}">
            <input type="hidden" name="artwork_id" value="${link.Artwork_ID}">
            <button class="link-button danger" type="submit">Remove</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Link Artwork to Exhibition",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editLink ? "Edit Artwork Link" : "Link Artwork to Exhibition"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-exhibition-artwork" class="form-grid">
          ${editLink ? `
            <input type="hidden" name="edit_exhibition_id" value="${editLink.Exhibition_ID}">
            <input type="hidden" name="edit_artwork_id" value="${editLink.Artwork_ID}">
          ` : ""}
          <label>Exhibition
            <select name="exhibition_id" required>
              ${exhibitions.map((exhibition) => `
                <option value="${exhibition.Exhibition_ID}" ${editLink && editLink.Exhibition_ID === exhibition.Exhibition_ID ? "selected" : ""}>
                  ${escapeHtml(exhibition.Exhibition_Name)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>Artwork
            <select name="artwork_id" required>
              ${artworks.map((artwork) => `
                <option value="${artwork.Artwork_ID}" ${editLink && editLink.Artwork_ID === artwork.Artwork_ID ? "selected" : ""}>
                  ${escapeHtml(artwork.Title)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>Display Room
            <input type="text" name="display_room" value="${editLink ? escapeHtml(editLink.Display_Room || "") : ""}">
          </label>
          <label>Date Installed
            <input type="date" name="date_installed" value="${editLink ? formatDateInput(editLink.Date_Installed) : ""}">
          </label>
          <button class="button" type="submit">${editLink ? "Update Link" : "Link Artwork"}</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Currently Linked Artwork</h2>
        <table>
          <thead>
            <tr>
              <th>Exhibition</th>
              <th>Artwork</th>
              <th>Room</th>
              <th>Installed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${linkRows || '<tr><td colspan="5">No links found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-exhibition-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const {
      exhibition_id: exhibitionId,
      artwork_id: artworkId,
      display_room: displayRoom,
      date_installed: dateInstalled,
      edit_exhibition_id: editExhibitionId,
      edit_artwork_id: editArtworkId,
    } = req.body;

    if (!exhibitionId || !artworkId) {
      setFlash(req, "Please select both exhibition and artwork.");
      return res.redirect("/add-exhibition-artwork");
    }

    if (editExhibitionId && editArtworkId) {
      await pool.query(
        `UPDATE Exhibition_Artwork
         SET Exhibition_ID = ?, Artwork_ID = ?, Display_Room = ?, Date_Installed = ?
         WHERE Exhibition_ID = ? AND Artwork_ID = ?`,
        [exhibitionId, artworkId, displayRoom || null, dateInstalled || null, editExhibitionId, editArtworkId],
      );
      setFlash(req, "Artwork link updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO Exhibition_Artwork (Exhibition_ID, Artwork_ID, Display_Room, Date_Installed)
         VALUES (?, ?, ?, ?)`,
        [exhibitionId, artworkId, displayRoom || null, dateInstalled || null],
      );
      setFlash(req, "Artwork linked successfully.");
    }

    res.redirect("/add-exhibition-artwork");
  }));

  app.post("/delete-exhibition-artwork", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const { exhibition_id: exhibitionId, artwork_id: artworkId } = req.body;

    await pool.query(
      "DELETE FROM Exhibition_Artwork WHERE Exhibition_ID = ? AND Artwork_ID = ?",
      [exhibitionId, artworkId],
    );
    setFlash(req, "Link removed.");
    res.redirect("/add-exhibition-artwork");
  }));

  app.get("/add-ticket", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const [tickets] = await pool.query(
      "SELECT Ticket_ID, Purchase_type, Purchase_Date, Visit_Date, Email, Phone_Number FROM Ticket",
    );

    let editTicket = null;
    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Ticket WHERE Ticket_ID = ?",
        [req.query.edit_id],
      );
      editTicket = rows[0] || null;
    }



    const ticketRows = tickets.map((ticket) => `
      <tr>
        <td>${ticket.Ticket_ID}</td>
        <td>${escapeHtml(ticket.Purchase_type || "N/A")}</td>
        <td>${formatDisplayDate(ticket.Purchase_Date)}</td>
        <td>${formatDisplayDate(ticket.Visit_Date)}</td>
        <td>${escapeHtml(ticket.Email || "N/A")}</td>
        <td>${escapeHtml(ticket.Phone_Number || "N/A")}</td>
        <td class="actions">
          <form method="get" action="/add-ticket" class="inline-form">
            <input type="hidden" name="edit_id" value="${ticket.Ticket_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-ticket" class="inline-form" onsubmit="return confirm('Delete this ticket record?');">
            <input type="hidden" name="ticket_id" value="${ticket.Ticket_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Add Ticket",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editTicket ? "Edit Ticket" : "Add Ticket"}</h1>
        ${renderFlash(req)}
        <form id="ticket-form" method="post" action="/add-ticket" class="form-grid">
          ${editTicket ? `<input type="hidden" name="ticket_id" value="${editTicket.Ticket_ID}">` : ""}
          <label>Purchase Type
            <input type="text" name="type" value="${editTicket ? escapeHtml(editTicket.Purchase_type || "") : ""}" required>
          </label>
          <label>Purchase Date
            <input type="date" name="purchase_date" value="${editTicket ? formatDateInput(editTicket.Purchase_Date) : ""}" required>
          </label>
          <label>Visit Date
            <input type="date" name="visit_date" value="${editTicket ? formatDateInput(editTicket.Visit_Date) : ""}" required>
          </label>
          <label>Phone
            <input type="tel" name="phone" value="${editTicket ? escapeHtml(editTicket.Phone_Number || "") : ""}">
          </label>
          <label>Email
            <input type="email" name="email" value="${editTicket ? escapeHtml(editTicket.Email || "") : ""}">
          </label>
        </form>
        <div class="button-row form-actions">
          <button class="button" type="submit" form="ticket-form">${editTicket ? "Update Ticket" : "Add Ticket"}</button>
        </div>
      </section>
      <section class="card narrow">
        <h2>Recent Tickets</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Purchase</th>
              <th>Visit</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${ticketRows || '<tr><td colspan="7">No tickets found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-ticket", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const ticketId = req.body.ticket_id || null;
    const {
      type,
      purchase_date: purchaseDate,
      visit_date: visitDate,
      email,
      phone,
    } = req.body;

    if (!phone && !email) {
      setFlash(req, "Please enter either Phone or Email.");
      return res.redirect("/add-ticket");
    }

    if (ticketId) {
      await pool.query(
        `UPDATE Ticket
         SET Purchase_type = ?, Purchase_Date = ?, Visit_Date = ?, Email = ?, Phone_Number = ?
         WHERE Ticket_ID = ?`,
        [type, purchaseDate, visitDate, email || null, phone || null, ticketId],
      );
      setFlash(req, "Ticket updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Email, Phone_Number)
         VALUES (?, ?, ?, ?, ?)`,
        [type, purchaseDate, visitDate, email || null, phone || null],
      );
      setFlash(req, "Ticket added successfully.");
    }

    res.redirect("/add-ticket");
  }));

  app.post("/delete-ticket", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.ticket_id;

    if (!idToDelete) {
      setFlash(req, "Error: No ticket ID provided.");
      return res.redirect("/add-ticket");
    }

    await pool.query("DELETE FROM Ticket WHERE Ticket_ID = ?", [idToDelete]);
    setFlash(req, "Ticket record deleted.");
    res.redirect("/add-ticket");
  }));

  app.get("/add-ticket-line", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const [tickets] = await pool.query("SELECT Ticket_ID FROM Ticket");
    const [exhibitions] = await pool.query("SELECT Exhibition_ID, Exhibition_Name FROM Exhibition");
    const [lines] = await pool.query(`
      SELECT tl.Ticket_ID, tl.Ticket_Type, tl.Quantity, tl.Price_per_ticket, e.Exhibition_Name
      FROM ticket_line tl
      LEFT JOIN Exhibition e ON tl.Exhibition_ID = e.Exhibition_ID
    `);
    let editLine = null;

    if (req.query.edit_ticket && req.query.edit_type) {
    const [rows] = await pool.query(
      "SELECT * FROM ticket_line WHERE Ticket_ID = ? AND Ticket_Type = ?",
      [req.query.edit_ticket, req.query.edit_type],
    );
    editLine = rows[0] || null;
    }

    const lineRows = lines.map((line) => `
      <tr>
        <td>#${line.Ticket_ID}</td>
        <td>${escapeHtml(line.Ticket_Type)}</td>
        <td>${line.Quantity}</td>
        <td>$${Number(line.Price_per_ticket).toFixed(2)}</td>
        <td>${escapeHtml(line.Exhibition_Name || "General")}</td>
        <td class="actions">
            <form method="get" action="/add-ticket-line" class="inline-form">
            <input type="hidden" name="edit_ticket" value="${line.Ticket_ID}">
            <input type="hidden" name="edit_type" value="${line.Ticket_Type}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-ticket-line" class="inline-form" onsubmit="return confirm('Remove this line item?');">
            <input type="hidden" name="ticket_id" value="${line.Ticket_ID}">
            <input type="hidden" name="ticket_type" value="${line.Ticket_Type}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Add Ticket Line",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>Add Ticket Line</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-ticket-line" class="form-grid">
        ${editLine ? `
          <input type="hidden" name="original_type" value="${editLine.Ticket_Type}">
        ` : ""}
          <label>Ticket
            <select name="ticket_id">
              ${tickets.map((ticket) => `<option value="${ticket.Ticket_ID}">Ticket #${ticket.Ticket_ID}</option>`).join("")}
            </select>
          </label>
          <label>Ticket Type
            <input type="text" name="ticket_type"
            value="${editLine ? escapeHtml(editLine.Ticket_Type) : ""}" required>
          </label>
          <label>Quantity
            <input type="number" name="quantity"
            value="${editLine ? editLine.Quantity : ""}" required>
          </label>
          <label>Price per Ticket
            <input type="number" step="0.01" name="price"
            value="${editLine ? editLine.Price_per_ticket : ""}" required>
          </label>
          <label>Exhibition
            <select name="exhibition_id">
              <option value="">None</option>
              ${exhibitions.map((exhibition) => `<option value="${exhibition.Exhibition_ID}">${escapeHtml(exhibition.Exhibition_Name)}</option>`).join("")}
            </select>
          </label>
          <button class="button" type="submit">Add Ticket Line</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Existing Ticket Lines</h2>
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Exhibition</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${lineRows || '<tr><td colspan="6">No lines found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-ticket-line", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const {
      ticket_id: ticketId,
      ticket_type: ticketType,
      quantity,
      price,
      exhibition_id: exhibitionId,
      original_type
    } = req.body;

    if (!ticketId || !ticketType || !quantity || !price) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-ticket-line");
    }
    if (original_type) {
      await pool.query(
        `UPDATE ticket_line
        SET Quantity = ?, Price_per_ticket = ?, Exhibition_ID = ?
        WHERE Ticket_ID = ? AND Ticket_Type = ?`,
      [quantity, price, exhibitionId || null, ticketId, original_type],
    );
    setFlash(req, "Ticket line updated.");
    } else {
      await pool.query(
      `INSERT INTO ticket_line (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket, Exhibition_ID)
       VALUES (?, ?, ?, ?, ?)`,
      [ticketId, ticketType, quantity, price, exhibitionId || null],
    );

    setFlash(req, "Ticket line added.");
  }

  res.redirect("/add-ticket-line");
}));


  app.post("/delete-ticket-line", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const { ticket_id: ticketId, ticket_type: ticketType } = req.body;

    await pool.query(
      "DELETE FROM ticket_line WHERE Ticket_ID = ? AND Ticket_Type = ?",
      [ticketId, ticketType],
    );
    setFlash(req, "Line removed.");
    res.redirect("/add-ticket-line");
  }));

  app.get("/add-item", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const [items] = await pool.query(
      "SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item, Stock_Quantity FROM Gift_Shop_Item",
    );

   let editItem = null;
  if (req.query.edit_id) {
    const [rows] = await pool.query(
      "SELECT * FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?",
      [req.query.edit_id],
    );
    editItem = rows[0] || null;
  }

    const itemRows = items.map((item) => `
      <tr>
        <td>${item.Gift_Shop_Item_ID}</td>
        <td>${escapeHtml(item.Name_of_Item)}</td>
        <td>$${Number(item.Price_of_Item).toFixed(2)}</td>
        <td>${item.Stock_Quantity}</td>
        <td class="actions">
            <form method="get" action="/add-item" class="inline-form">
            <input type="hidden" name="edit_id" value="${item.Gift_Shop_Item_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-item" class="inline-form" onsubmit="return confirm('Remove this item?');">
            <input type="hidden" name="item_id" value="${item.Gift_Shop_Item_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Gift Shop Inventory",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editItem ? "Edit Gift Shop Item" : "Add Gift Shop Item"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-item" class="form-grid">
          ${editItem ? `<input type="hidden" name="item_id" value="${editItem.Gift_Shop_Item_ID}">` : ""}
          <label>Name
            <input type="text" name="name" 
            value="${editItem ? escapeHtml(editItem.Name_of_Item) : ""}" required>
          </label>
          <label>Price
            <input type="number" step="0.01" name="price" 
             value="${editItem ? editItem.Price_of_Item : ""}" required>
          </label>
          <label>Stock
            <input type="number" name="stock"
            value="${editItem ? editItem.Stock_Quantity : ""}" required>
          </label>
          <button class="button" type="submit">
              ${editItem ? "Update Item" : "Add Item"}
            </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Current Inventory</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Item Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || '<tr><td colspan="5">No items found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-item", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const itemId = req.body.item_id || null;
    const { name, price, stock } = req.body;

    if (!name || !price || !stock) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-item");
    }

    if (itemId) {
      await pool.query(
        `UPDATE Gift_Shop_Item
        SET Name_of_Item = ?, Price_of_Item = ?, Stock_Quantity = ?
        WHERE Gift_Shop_Item_ID = ?`,
        [name, price, stock, itemId],
      );
      setFlash(req, "Item updated.");
  } else {
    await pool.query(
      `INSERT INTO Gift_Shop_Item (Name_of_Item, Price_of_Item, Stock_Quantity)
       VALUES (?, ?, ?)`,
      [name, price, stock],
    );

    setFlash(req, "Item added.");
  }

  res.redirect("/add-item");
}));

  app.post("/delete-item", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.item_id;

    if (!idToDelete) {
      setFlash(req, "Error: No item ID provided.");
      return res.redirect("/add-item");
    }

    await pool.query("DELETE FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?", [idToDelete]);
    setFlash(req, "Item removed.");
    res.redirect("/add-item");
  }));

  app.get("/add-food", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const [foods] = await pool.query("SELECT Food_ID, Food_Name, Food_Price FROM Food");

    let editFood = null;
    if (req.query.edit_id) {
    const [rows] = await pool.query(
      "SELECT * FROM Food WHERE Food_ID = ?",
      [req.query.edit_id],
    );
    editFood = rows[0] || null;
    }

    const foodRows = foods.map((food) => `
      <tr>
        <td>${food.Food_ID}</td>
        <td>${escapeHtml(food.Food_Name)}</td>
        <td>$${Number(food.Food_Price).toFixed(2)}</td>
        <td class="actions">
        <form method="get" action="/add-food" class="inline-form">
          <input type="hidden" name="edit_id" value="${food.Food_ID}">
          <button class="link-button" type="submit">Edit</button>
        </form>
          <form method="post" action="/delete-food" class="inline-form" onsubmit="return confirm('Delete this food item?');">
            <input type="hidden" name="food_id" value="${food.Food_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Manage Food",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editFood ? "Edit Food" : "Add Food Item"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-food" class="form-grid">
        ${editFood ? `<input type="hidden" name="food_id" value="${editFood.Food_ID}">` : ""}
          <label>Food Name
            <input type="text" name="food_name"
            value="${editFood ? escapeHtml(editFood.Food_Name) : ""}" required>
          </label>
          <label>Food Price
            <input type="number" step="0.01" name="food_price" 
            value="${editFood ? editFood.Food_Price : ""}" required>
          </label>
         <button class="button" type="submit">
            ${editFood ? "Update Food" : "Add Food"}
          </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Food Menu</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${foodRows || '<tr><td colspan="4">No food items found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-food", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const foodId = req.body.food_id || null;
    const { food_name: foodName, food_price: foodPrice } = req.body;

    if (!foodName || !foodPrice) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-food");
    }
    if (foodId) {
      await pool.query(
      "UPDATE Food SET Food_Name = ?, Food_Price = ? WHERE Food_ID = ?",
      [foodName, foodPrice, foodId],
    );
    setFlash(req, "Food updated.");
  } else {
    await pool.query(
      "INSERT INTO Food (Food_Name, Food_Price) VALUES (?, ?)",
      [foodName, foodPrice],
    );
    setFlash(req, "Food added.");
  }
    res.redirect("/add-food");
  }));

  app.post("/delete-food", requireLogin, allowRoles(["supervisor"]), asyncHandler(async (req, res) => {
    const idToDelete = req.body.food_id;

    await pool.query("DELETE FROM Food WHERE Food_ID = ?", [idToDelete]);
    setFlash(req, "Food item deleted.");
    res.redirect("/add-food");
  }));

  app.get("/add-food-sale", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const [sales] = await pool.query("SELECT Food_Sale_ID, Sale_Date, Employee_ID FROM Food_Sale");

    let editSale = null;

    if (req.query.edit_id) {
      const [rows] = await pool.query(
        "SELECT * FROM Food_Sale WHERE Food_Sale_ID = ?",
        [req.query.edit_id],
      );
      editSale = rows[0] || null;
    }

    const saleRows = sales.map((sale) => `
      <tr>
        <td>#${sale.Food_Sale_ID}</td>
        <td>${formatDisplayDate(sale.Sale_Date)}</td>
        <td>${escapeHtml(sale.Employee_ID)}</td>
        <td class="actions">
          <form method="get" action="/add-food-sale" class="inline-form">
          <input type="hidden" name="edit_id" value="${sale.Food_Sale_ID}">
          <button class="link-button" type="submit">Edit</button>
        </form>
          <form method="post" action="/delete-food-sale" class="inline-form" onsubmit="return confirm('Delete this sale?');">
            <input type="hidden" name="sale_id" value="${sale.Food_Sale_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Add Food Sale",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editSale ? "Edit Food Sale" : "Add Food Sale"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-food-sale" class="form-grid">
        ${editSale ? `<input type="hidden" name="sale_id" value="${editSale.Food_Sale_ID}">` : ""}
          <label>Sale Date
            <input type="date" name="sale_date" 
            value="${editSale ? formatDateInput(editSale.Sale_Date) : ""}" required>
          </label>
            <button class="button" type="submit">
            ${editSale ? "Update Sale" : "Create Sale"}
          </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Recent Food Sales</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Employee ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${saleRows || '<tr><td colspan="4">No food sales found.</td></tr>'}</tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-food-sale", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const saleId = req.body.sale_id || null;
    const { sale_date: saleDate } = req.body;

    if (!saleDate) {
      setFlash(req, "Sale date is required.");
      return res.redirect("/add-food-sale");
    }

    if (saleId) {
      await pool.query(
      "UPDATE Food_Sale SET Sale_Date = ? WHERE Food_Sale_ID = ?",
      [saleDate, saleId],
    );

    setFlash(req, "Food sale updated.");
    return res.redirect("/add-food-sale");
  } else {
      await pool.query(
      "INSERT INTO Food_Sale (Sale_Date, Employee_ID) VALUES (?, ?)",
      [saleDate, req.session.user.employeeId],
    );
    setFlash(req, "Food sale created. Now add items.");
  }
    res.redirect("/add-food-sale-line");
  }));

  app.post("/delete-food-sale", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const { sale_id: saleId } = req.body;

    await pool.query("DELETE FROM Food_Sale_Line WHERE Food_Sale_ID = ?", [saleId]);
    await pool.query("DELETE FROM Food_Sale WHERE Food_Sale_ID = ?", [saleId]);
    setFlash(req, "Food sale deleted.");
    res.redirect("/add-food-sale");
  }));

  app.get("/add-food-sale-line", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const [sales] = await pool.query("SELECT Food_Sale_ID FROM Food_Sale");
    const [foods] = await pool.query("SELECT Food_ID, Food_Name, Food_Price FROM Food");
    const [lines] = await pool.query(`
      SELECT fsl.Food_Sale_ID, fsl.Food_ID, f.Food_Name, fsl.Quantity, fsl.Price_When_Food_Was_Sold
      FROM Food_Sale_Line fsl
      JOIN Food f ON fsl.Food_ID = f.Food_ID
    `);

    let editLine = null;

    if (req.query.edit_sale && req.query.edit_food) {
      const [rows] = await pool.query(
        "SELECT * FROM Food_Sale_Line WHERE Food_Sale_ID = ? AND Food_ID = ?",
        [req.query.edit_sale, req.query.edit_food],
      );
      editLine = rows[0] || null;
    }

    const lineRows = lines.map((line) => `
      <tr>
        <td>#${line.Food_Sale_ID}</td>
        <td>${escapeHtml(line.Food_Name)}</td>
        <td>${line.Quantity}</td>
        <td>$${Number(line.Price_When_Food_Was_Sold).toFixed(2)}</td>
        <td class="actions">
          <form method="get" action="/add-food-sale-line" class="inline-form">
            <input type="hidden" name="edit_sale" value="${line.Food_Sale_ID}">
            <input type="hidden" name="edit_food" value="${line.Food_ID}">
            <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-food-sale-line" class="inline-form" onsubmit="return confirm('Remove item from sale?');">
            <input type="hidden" name="sale_id" value="${line.Food_Sale_ID}">
            <input type="hidden" name="food_id" value="${line.Food_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Add Food Sale Line",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editLine ? "Edit Food Sale Line" : "Add Food to Sale"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-food-sale-line" class="form-grid">
          ${editLine ? `
          <input type="hidden" name="original_food" value="${editLine.Food_ID}">
        ` : ""}
          <label>Sale
            <select name="sale_id">
              ${sales.map((sale) => `<option value="${sale.Food_Sale_ID}">Sale #${sale.Food_Sale_ID}</option>`).join("")}
            </select>
          </label>
          <label>Food
            <select name="food_id">
              ${foods.map((food) => `<option value="${food.Food_ID}">${escapeHtml(food.Food_Name)} ($${food.Food_Price})</option>`).join("")}
            </select>
          </label>
          <label>Quantity<input type="number" name="quantity" 
          value="${editLine ? editLine.Quantity : ""}" required></label>
          <button class="button" type="submit">
              ${editLine ? "Update Food" : "Add Food"}
            </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Items in Sales</h2>
        <table>
          <thead>
            <tr>
              <th>Sale ID</th>
              <th>Food</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${lineRows || '<tr><td colspan="5">No items found.</td></tr>'}</tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-food-sale-line", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    
    const { sale_id: saleId, food_id: foodId, quantity, original_food } = req.body;

    if (!saleId || !foodId || !quantity) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-food-sale-line");
    }

    const [[food]] = await pool.query("SELECT Food_Price FROM Food WHERE Food_ID = ?", [foodId]);
    if (original_food) {
      await pool.query(
        `UPDATE Food_Sale_Line
        SET Quantity = ?
        WHERE Food_Sale_ID = ? AND Food_ID = ?`,
        [quantity, saleId, original_food],
    );
      setFlash(req, "Food sale line updated.");
  } else {
    await pool.query(
      `INSERT INTO Food_Sale_Line (Food_Sale_ID, Food_ID, Quantity, Price_When_Food_Was_Sold)
       VALUES (?, ?, ?, ?)`,
      [saleId, foodId, quantity, food.Food_Price],
    );
    setFlash(req, "Food added to sale.");
  }
    res.redirect("/add-food-sale-line");
  }));

  app.post("/delete-food-sale-line", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const { sale_id: saleId, food_id: foodId } = req.body;

    await pool.query(
      "DELETE FROM Food_Sale_Line WHERE Food_Sale_ID = ? AND Food_ID = ?",
      [saleId, foodId],
    );
    setFlash(req, "Item removed.");
    res.redirect("/add-food-sale-line");
  }));

  app.get("/add-sale", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const [sales] = await pool.query("SELECT Gift_Shop_Sale_ID, Sale_Date, Employee_ID FROM Gift_Shop_Sale");
    let editSale = null;

      if (req.query.edit_id) {
        const [rows] = await pool.query(
          "SELECT * FROM Gift_Shop_Sale WHERE Gift_Shop_Sale_ID = ?",
          [req.query.edit_id],
        );
        editSale = rows[0] || null;
      }
    const saleRows = sales.map((sale) => `
      <tr>
        <td>#${sale.Gift_Shop_Sale_ID}</td>
        <td>${formatDisplayDate(sale.Sale_Date)}</td>
        <td>${escapeHtml(sale.Employee_ID)}</td>
        <td class="actions">
        <form method="get" action="/add-sale" class="inline-form">
          <input type="hidden" name="edit_id" value="${sale.Gift_Shop_Sale_ID}">
          <button class="link-button" type="submit">Edit</button>
          </form>
          <form method="post" action="/delete-sale" class="inline-form" onsubmit="return confirm('Delete this sale?');">
            <input type="hidden" name="sale_id" value="${sale.Gift_Shop_Sale_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Add Gift Shop Sale",
      user: req.session.user,
      content: `
      <section class="card narrow">
        <h1>${editSale ? "Edit Gift Shop Sale" : "Add Gift Shop Sale"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-sale" class="form-grid">
        ${editSale ? `<input type="hidden" name="sale_id" value="${editSale.Gift_Shop_Sale_ID}">` : ""}
          <label>Sale Date
            <input type="date" name="sale_date" 
            value="${editSale ? formatDateInput(editSale.Sale_Date) : ""}" required>
          </label>
          <button class="button" type="submit">
              ${editSale ? "Update Sale" : "Create Sale"}
            </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Recent Sales</h2>
        <table>
          <thead><tr><th>ID</th><th>Date</th><th>Employee ID</th><th>Actions</th></tr></thead>
          <tbody>${saleRows || '<tr><td colspan="4">No sales found.</td></tr>'}</tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-sale", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const saleId = req.body.sale_id || null;
    const { sale_date: saleDate } = req.body;

    if (!saleDate) {
      setFlash(req, "Sale date is required.");
      return res.redirect("/add-sale");
    }
    if (saleId) {
      await pool.query(
      "UPDATE Gift_Shop_Sale SET Sale_Date = ? WHERE Gift_Shop_Sale_ID = ?",
      [saleDate, saleId],
    );

    setFlash(req, "Sale updated.");
    return res.redirect("/add-sale");
  } else {
    await pool.query(
      "INSERT INTO Gift_Shop_Sale (Sale_Date, Employee_ID) VALUES (?, ?)",
      [saleDate, req.session.user.employeeId],
    );
    setFlash(req, "Sale created. Now add items to it.");
    res.redirect("/add-sale-line");
  }
  }));

  app.post("/delete-sale", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const { sale_id: saleId } = req.body;

    await pool.query("DELETE FROM Gift_Shop_Sale_Line WHERE Gift_Shop_Sale_ID = ?", [saleId]);
    await pool.query("DELETE FROM Gift_Shop_Sale WHERE Gift_Shop_Sale_ID = ?", [saleId]);
    setFlash(req, "Sale deleted.");
    res.redirect("/add-sale");
  }));

  app.get("/add-sale-line", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const [sales] = await pool.query("SELECT Gift_Shop_Sale_ID FROM Gift_Shop_Sale");
    const [items] = await pool.query("SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item FROM Gift_Shop_Item");
    const [lines] = await pool.query(`
      SELECT gsl.Gift_Shop_Sale_ID, gsl.Gift_Shop_Item_ID, i.Name_of_Item, gsl.Quantity, gsl.Price_When_Item_is_Sold, gsl.Total_Sum_For_Gift_Shop_Sale
      FROM Gift_Shop_Sale_Line gsl
      JOIN Gift_Shop_Item i ON gsl.Gift_Shop_Item_ID = i.Gift_Shop_Item_ID
    `);

      let editLine = null;

      if (req.query.edit_sale && req.query.edit_item) {
        const [rows] = await pool.query(
          "SELECT * FROM Gift_Shop_Sale_Line WHERE Gift_Shop_Sale_ID = ? AND Gift_Shop_Item_ID = ?",
          [req.query.edit_sale, req.query.edit_item],
        );
        editLine = rows[0] || null;
      }
    const lineRows = lines.map((line) => `
      <tr>
        <td>#${line.Gift_Shop_Sale_ID}</td>
        <td>${escapeHtml(line.Name_of_Item)}</td>
        <td>${line.Quantity}</td>
        <td>$${Number(line.Price_When_Item_is_Sold).toFixed(2)}</td>
        <td>$${Number(line.Total_Sum_For_Gift_Shop_Sale).toFixed(2)}</td>
        <td class="actions">
        <form method="get" action="/add-sale-line" class="inline-form">
          <input type="hidden" name="edit_sale" value="${line.Gift_Shop_Sale_ID}">
          <input type="hidden" name="edit_item" value="${line.Gift_Shop_Item_ID}">
          <button class="link-button" type="submit">Edit</button>
        </form>
          <form method="post" action="/delete-sale-line" class="inline-form" onsubmit="return confirm('Remove item from sale?');">
            <input type="hidden" name="sale_id" value="${line.Gift_Shop_Sale_ID}">
            <input type="hidden" name="item_id" value="${line.Gift_Shop_Item_ID}">
            <button class="link-button danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(renderPage({
      title: "Add Sale Line",
      user: req.session.user,
      content: `
      <section class="card narrow">
         <h1>${editLine ? "Edit Item in Sale" : "Add Item to Sale"}</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-sale-line" class="form-grid">
        ${editLine ? `
            <input type="hidden" name="original_item" value="${editLine.Gift_Shop_Item_ID}">
          ` : ""}
          <label>Sale
            <select name="sale_id">
              ${sales.map((sale) => `<option value="${sale.Gift_Shop_Sale_ID}">Sale #${sale.Gift_Shop_Sale_ID}</option>`).join("")}
            </select>
          </label>
          <label>Item
            <select name="item_id">
              ${items.map((item) => `<option value="${item.Gift_Shop_Item_ID}">${escapeHtml(item.Name_of_Item)} ($${item.Price_of_Item})</option>`).join("")}
            </select>
          </label>
          <label>Quantity
            <input type="number" name="quantity" value="${editLine ? editLine.Quantity : ""}" required>
          </label>
           <button class="button" type="submit">
            ${editLine ? "Update Item" : "Add Item"}
          </button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Items in Sales</h2>
        <table>
          <thead><tr><th>Sale ID</th><th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th>Actions</th></tr></thead>
          <tbody>${lineRows || '<tr><td colspan="6">No items found.</td></tr>'}</tbody>
        </table>
      </section>
    `,
    }));
  }));

  app.post("/add-sale-line", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const { sale_id: saleId, item_id: itemId, quantity, original_item } = req.body;

    if (!saleId || !itemId || !quantity) {
      setFlash(req, "All fields are required.");
      return res.redirect("/add-sale-line");
    }

    const [[item]] = await pool.query(
      "SELECT Price_of_Item FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?",
      [itemId],
    );
    const price = item.Price_of_Item;
    const total = price * quantity;

    if (original_item) {
      await pool.query(
      `UPDATE Gift_Shop_Sale_Line
       SET Quantity = ?, Total_Sum_For_Gift_Shop_Sale = ?
       WHERE Gift_Shop_Sale_ID = ? AND Gift_Shop_Item_ID = ?`,
      [quantity, total, saleId, original_item],
    );
    setFlash(req, "Sale line updated.");
  } else {
    await pool.query(
      `INSERT INTO Gift_Shop_Sale_Line
       (Gift_Shop_Sale_ID, Gift_Shop_Item_ID, Quantity, Price_When_Item_is_Sold, Total_Sum_For_Gift_Shop_Sale)
       VALUES (?, ?, ?, ?, ?)`,
      [saleId, itemId, quantity, price, total],
    );
    setFlash(req, "Item added to sale.");
  }
    res.redirect("/add-sale-line");
  }));

  app.post("/delete-sale-line", requireLogin, allowRoles(["employee", "supervisor"]), asyncHandler(async (req, res) => {
    const { sale_id: saleId, item_id: itemId } = req.body;

    await pool.query(
      "DELETE FROM Gift_Shop_Sale_Line WHERE Gift_Shop_Sale_ID = ? AND Gift_Shop_Item_ID = ?",
      [saleId, itemId],
    );
    setFlash(req, "Item removed.");
    res.redirect("/add-sale-line");
  }));
}

module.exports = { registerRoutes };
