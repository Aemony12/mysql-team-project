const {
  getExhibitionAsset,
  getRoleAsset,
  renderCarousel,
  renderFlash,
  renderPage,
  setFlash,
  asyncHandler,
} = require("../helpers");

function renderLoginPage({ req, title, eyebrow, heading, intro, action, secondaryLink, hiddenAudience, mediaTitle, mediaCopy, imagePath }) {
  return renderPage({
    title,
    user: req.session.user,
    currentPath: req.path,
    pageTheme: hiddenAudience === "member" ? "member-entry" : "staff-entry",
    content: `
      <section class="card auth-card auth-shell">
        <div class="auth-panel">
          <p class="eyebrow">${eyebrow}</p>
          <h1>${heading}</h1>
          <p class="auth-intro">${intro}</p>
          ${renderFlash(req)}
          <form id="login-form" method="post" action="/login" class="form-grid">
            <input type="hidden" name="audience" value="${hiddenAudience}">
            <label>Email<input type="email" name="email" required autocomplete="email"></label>
            <label>Password<input type="password" name="password" required autocomplete="current-password"></label>
          </form>
          <div class="button-row form-actions">
            <button class="button" type="submit" form="login-form">${action}</button>
            ${secondaryLink}
          </div>
        </div>
        <aside class="auth-media">
          <img src="${imagePath}" alt="${mediaTitle}">
          <div class="auth-media__overlay"></div>
          <div class="auth-media__content">
            <p class="eyebrow">${eyebrow}</p>
            <h2>${mediaTitle}</h2>
            <p>${mediaCopy}</p>
          </div>
        </aside>
      </section>
    `,
  });
}

function registerAuthenticationRoutes(app, { pool }) {
  app.get("/", (req, res) => {
    const visitAsset = getExhibitionAsset("Spring Collection 2026");
    res.send(renderPage({
      title: "The Museum of Fine Arts, Houston",
      user: req.session.user,
      currentPath: req.path,
      hero: {
        eyebrow: "Museum Visit Planning",
        title: "A clearer museum experience for members, staff, and supervisors.",
        description: "Explore tickets, collections, events, memberships, and operational workspaces through a layout modeled after the MFAH site instead of walls of buttons.",
        videoPath: "/images/homepage-museum-video.mp4",
        posterPath: visitAsset.imagePath,
        actions: req.session.user ? [
          { href: "/dashboard", label: "Open Overview" },
        ] : [
          { href: "/member-login", label: "Plan Your Visit" },
          { href: "/staff-login", label: "Staff Login", secondary: true },
        ],
        details: [
          { label: "Visit", title: "Tickets and Membership", description: "Guide first-time visitors with obvious next steps for admission, tours, and account access." },
          { label: "Art", title: "Collection Search", description: "Browse artworks and exhibitions with imagery, stronger labels, and museum-style framing." },
          { label: "Operations", title: "Role-Based Workspaces", description: "Admissions, retail, cafe, curatorial, and supervisor areas now feel distinct." },
        ],
      },
      featureCards: [
        {
          eyebrow: "Visit",
          title: "Admission and Membership",
          description: "Buy tickets, review member benefits, and plan a clear museum visit experience.",
          href: req.session.user ? "/purchase-ticket" : "/member-login",
          linkLabel: "Plan Your Visit",
          imagePath: "/images/summer-showcase.jpg",
          alt: "Visitors entering a museum exhibition.",
        },
        {
          eyebrow: "Art",
          title: "Explore the Collection",
          description: "Search artworks, exhibitions, and collection status using an image-led gallery layout.",
          href: req.session.user ? "/queries" : "/member-login",
          linkLabel: "Explore Art",
          imagePath: "/images/the-farnese-hours.jpg",
          alt: "Historic illuminated artwork from the collection.",
        },
        {
          eyebrow: "Events",
          title: "Tours and Programs",
          description: "Browse guided tours, museum programs, and special events without confusing tables as the first impression.",
          href: req.session.user ? "/event-register" : "/member-login",
          linkLabel: "View Events",
          imagePath: "/images/spring-exhibition-opening-gala.jpg",
          alt: "Museum event gathering.",
        },
        {
          eyebrow: "Access",
          title: "Choose the Right Entrance",
          description: "Members and staff now use separate, clearly labeled entry points with role-specific guidance.",
          href: "/staff-login",
          linkLabel: "Open Login Options",
          imagePath: "/images/spring-collection.jpg",
          alt: "Museum interior with visitors.",
        },
      ],
      content: `
        ${renderCarousel({
          title: "Move through the site with clearer next steps",
          description: "This carousel adds a guided path without changing the existing museum-style layout.",
          slides: [
            {
              eyebrow: "Visit",
              title: "Buy admission and check membership status",
              description: "Start with tickets, then renew membership directly from the visit planning page if pricing is locked.",
              href: req.session.user ? "/purchase-ticket" : "/member-login",
              linkLabel: "Open Visit Planning",
              imagePath: "/images/summer-showcase.jpg",
              alt: "Visitors approaching a museum experience.",
            },
            {
              eyebrow: "Art",
              title: "Open the artwork status view first",
              description: "Collection browsing now lands on the artwork status tab instead of a generic wall of search tools.",
              href: req.session.user ? "/queries?view=artwork-status#query-tabs" : "/member-login",
              linkLabel: "View Artwork",
              imagePath: "/images/the-farnese-hours.jpg",
              alt: "Collection artwork and exhibition materials.",
            },
            {
              eyebrow: "Operations",
              title: "Reach the right workspace by role",
              description: "Supervisors, curators, admissions, retail, and cafe staff all keep their existing routes but with clearer entry points.",
              href: "/staff-login",
              linkLabel: "Open Staff Login",
              imagePath: "/images/spring-exhibition-opening-gala.jpg",
              alt: "Museum staff and event operations.",
            },
          ],
        })}
        <section class="card">
          <div class="section-header">
            <div>
              <p class="eyebrow">Choose Your Portal</p>
              <h2>Start from the page that matches your role.</h2>
            </div>
          </div>
          <div class="feature-grid">
            <article class="feature-card">
              <div class="feature-card__media"><img src="/images/summer-showcase.jpg" alt="Member visit planning area."></div>
              <div class="feature-card__body">
                <p class="eyebrow">Members</p>
                <h2>Tickets, Tours, and Events</h2>
                <p>Use the member portal to buy admission, register for events, and explore the museum collection.</p>
                <a class="feature-card__link" href="/member-login">Member Login</a>
              </div>
            </article>
            <article class="feature-card">
              <div class="feature-card__media"><img src="/images/spring-exhibition-opening-gala.jpg" alt="Museum staff and operations area."></div>
              <div class="feature-card__body">
                <p class="eyebrow">Staff</p>
                <h2>Operations and Oversight</h2>
                <p>Admissions, gift shop, cafe, curatorial, and supervisor workspaces now use clearer navigation and stronger visual hierarchy.</p>
                <a class="feature-card__link" href="/staff-login">Staff Login</a>
              </div>
            </article>
          </div>
        </section>
      `,
    }));
  });

  app.get("/login", (req, res) => res.redirect("/staff-login"));

  app.get("/staff-login", (req, res) => {
    if (req.session.user) {
      return res.redirect("/dashboard");
    }

    res.send(renderLoginPage({
      req,
      title: "Staff Login",
      eyebrow: "Staff Access",
      heading: "Staff Login",
      intro: "Use staff credentials to enter admissions, retail, cafe, curatorial, or supervisor workspaces.",
      action: "Sign In",
      secondaryLink: '<a class="button button-secondary" href="/">Back to Home</a>',
      hiddenAudience: "staff",
      mediaTitle: "Distinct workspaces for each museum role.",
      mediaCopy: "Admissions focuses on tickets, gift shop on products, cafe on orders, and supervisors on alerts and oversight. The entry point should make that obvious.",
      imagePath: getRoleAsset("supervisor").imagePath,
    }));
  });

  app.get("/member-login", (req, res) => {
    if (req.session.user) {
      return res.redirect("/dashboard");
    }

    res.send(renderLoginPage({
      req,
      title: "Member Login",
      eyebrow: "Member Access",
      heading: "Member Login",
      intro: "Use your member account to buy tickets, browse tours, register for events, and manage your museum visit.",
      action: "Enter Member Portal",
      secondaryLink: '<a class="button button-secondary" href="/member-signup">Create Member Account</a>',
      hiddenAudience: "member",
      mediaTitle: "Plan your visit with museum-style guidance.",
      mediaCopy: "The member side centers on admission, exhibitions, tours, and upcoming programs instead of technical forms.",
      imagePath: getRoleAsset("user").imagePath,
    }));
  });

  app.get("/signup", (req, res) => res.redirect("/member-signup"));

  app.get("/member-signup", (req, res) => {
    if (req.session.user) {
      return res.redirect("/dashboard");
    }

    res.send(renderPage({
      title: "Member Sign Up",
      user: req.session.user,
      currentPath: req.path,
      content: `
        <section class="card auth-card auth-shell">
          <div class="auth-panel">
            <p class="eyebrow">Member Access</p>
            <h1>Create a Member Account</h1>
            <p class="auth-intro">Start with a guided museum account for tickets, tours, events, and membership access.</p>
            ${renderFlash(req)}
            <form id="signup-form" method="post" action="/signup" class="form-grid">
              <label>First Name<input type="text" name="first_name" required autocomplete="given-name"></label>
              <label>Last Name<input type="text" name="last_name" required autocomplete="family-name"></label>
              <label>Email<input type="email" name="email" required autocomplete="email"></label>
              <label>Phone<input type="tel" name="phone" autocomplete="tel"></label>
              <label>Password<input type="password" name="password" required autocomplete="new-password"></label>
            </form>
            <div class="button-row form-actions">
              <button class="button" type="submit" form="signup-form">Create Account</button>
              <a class="button button-secondary" href="/member-login">Member Login</a>
            </div>
          </div>
          <aside class="auth-media">
            <img src="/images/spring-collection.jpg" alt="Museum membership sign up experience.">
            <div class="auth-media__overlay"></div>
            <div class="auth-media__content">
              <p class="eyebrow">Membership</p>
              <h2>Use one account for admission, tours, and events.</h2>
              <p>Sign-up should feel like the beginning of a museum visit, not a database worksheet.</p>
            </div>
          </aside>
        </section>
      `,
    }));
  });

  app.post("/login", asyncHandler(async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const submittedCredential = req.body.password?.trim();
    const audience = req.body.audience === "member" ? "member" : "staff";

    const [rows] = await pool.query(
      `SELECT id, name, email, password AS stored_credential, role, is_active, employee_id, membership_id
       FROM users
       WHERE email = ?`,
      [email],
    );

    const authenticatedUser = rows[0];
    if (!authenticatedUser || authenticatedUser.stored_credential !== submittedCredential || !authenticatedUser.is_active) {
      setFlash(req, "Invalid login credentials.");
      return res.redirect(audience === "member" ? "/member-login" : "/staff-login");
    }

    const isMember = authenticatedUser.role === "user";
    if (audience === "member" && !isMember) {
      setFlash(req, "This login page is for members only.");
      return res.redirect("/member-login");
    }

    if (audience === "staff" && isMember) {
      setFlash(req, "This login page is for staff only.");
      return res.redirect("/staff-login");
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
      return res.redirect("/member-signup");
    }

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existingUsers.length > 0) {
      setFlash(req, "An account with that email already exists.");
      return res.redirect("/member-signup");
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
        return res.redirect("/member-signup");
      }

      throw error;
    } finally {
      connection.release();
    }

    setFlash(req, "Account created. Please log in.");
    res.redirect("/member-login");
  }));

  app.post("/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
}

module.exports = { registerAuthenticationRoutes };
