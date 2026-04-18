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
          ${hiddenAudience === "staff" ? `
            <div class="staff-access-list" aria-label="Staff role access">
              <span>Admissions: tickets and memberships</span>
              <span>Gift shop: POS and inventory</span>
              <span>Café: orders and menu stock</span>
              <span>Curators: collection records</span>
              <span>Supervisors: reports and alerts</span>
            </div>
          ` : ""}
        </div>
        <aside class="auth-media">
          <img src="${imagePath}" alt="${mediaTitle}">
          <div class="auth-media__overlay"></div>
          <div class="auth-media__content">
            <h2>${mediaTitle}</h2>
            ${mediaCopy ? `<p>${mediaCopy}</p>` : ""}
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
      pageTheme: "home",
      hero: {
        eyebrow: "The Museum of Fine Arts, Houston",
        title: "MFAH",
        typewriter: true,
        description: "Art lives here.",
        videoPath: "/images/homepage-museum-video.mp4",
        posterPath: visitAsset.imagePath,
        actions: req.session.user ? [
          { href: "/dashboard", label: "Open Overview" },
        ] : [
          { href: "/member-login", label: "Member Access" },
          { href: "/staff-login", label: "Staff Login", secondary: true },
        ],
        details: [
          { label: "Visit", title: "Admission", description: "Tickets and member access." },
          { label: "Collection", title: "Galleries", description: "Artworks and exhibitions." },
          { label: "Operations", title: "Staff", description: "Museum workspaces." },
        ],
      },
      content: `
        ${renderCarousel({
          title: "Pathways",
          slides: [
            {
              eyebrow: "Visit",
              title: "Tickets",
              description: "Admission, member pricing, tours, and events in one place.",
              href: req.session.user ? "/purchase-ticket" : "/member-login",
              linkLabel: "Plan Visit",
              imagePath: "/images/summer-showcase.jpg",
              alt: "Visitors approaching a museum experience.",
            },
            {
              eyebrow: "Art",
              title: "Collection",
              description: "Search artworks, artists, exhibitions, and collection records.",
              href: req.session.user ? "/queries?view=artwork-status#query-tabs" : "/member-login",
              linkLabel: "Search Collection",
              imagePath: "/images/the-farnese-hours.jpg",
              alt: "Collection artwork and exhibition materials.",
            },
            {
              eyebrow: "Operations",
              title: "Staff",
              description: "Role-based tools for the museum team.",
              href: "/staff-login",
              linkLabel: "Staff Login",
              imagePath: "/images/spring-exhibition-opening-gala.jpg",
              alt: "Museum staff and event operations.",
            },
          ],
        })}
        <section class="card">
          <div class="section-header">
            <div>
              <h2>Access</h2>
            </div>
          </div>
          <div class="feature-grid">
            <article class="feature-card">
              <div class="feature-card__media"><img src="/images/summer-showcase.jpg" alt="Member visit planning area."></div>
              <div class="feature-card__body">
                <h2>Member Access</h2>
                <p>Tickets, tours, events, and membership.</p>
                <a class="feature-card__link" href="/member-login">Member Login</a>
              </div>
            </article>
            <article class="feature-card">
              <div class="feature-card__media"><img src="/images/museum4.jpg" alt="Museum staff and operations area."></div>
              <div class="feature-card__body">
                <h2>Staff Access</h2>
                <p>Admissions, retail, cafe, curatorial, and reporting.</p>
                <a class="feature-card__link" href="/staff-login">Staff Login</a>
              </div>
            </article>
          </div>
        </section>
        <section class="home-collection-search" id="home-collection-search">
          <div class="home-collection-collage" aria-hidden="true">
            <img src="/images/the-farnese-hours.jpg" alt="">
            <img src="/images/allegory.jpg" alt="">
            <img src="/images/van-gogh.jpg" alt="">
            <img src="/images/claude-monet.jpg" alt="">
            <img src="/images/Jean-Auguste-Dominique-Ingres.jpg" alt="">
            <img src="/images/the-rose-garden.jpg" alt="">
          </div>
          <div class="home-collection-search__content">
            <h2>Collection</h2>
            <p>Search the collection by artwork, artist, style, type, or period.</p>
            <form method="get" action="/queries" class="home-collection-search__form">
              <input type="hidden" name="view" value="artwork-search">
              <label class="sr-only" for="home-collection-query">Search collection</label>
              <input id="home-collection-query" type="search" name="title" placeholder="Search artworks, artists, and periods">
              <button class="button" type="submit">Search Collection</button>
            </form>
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
      intro: "Sign in with staff credentials.",
      action: "Sign In",
      secondaryLink: '<a class="button button-secondary" href="/">Return Home</a>',
      hiddenAudience: "staff",
      mediaTitle: "Staff Access",
      mediaCopy: "",
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
      intro: "Sign in for tickets, tours, and events.",
      action: "Enter Member Portal",
      secondaryLink: '<a class="button button-secondary" href="/member-signup">Create Member Account</a>',
      hiddenAudience: "member",
      mediaTitle: "Member Access",
      mediaCopy: "",
      imagePath: "/images/museum3.jpg",
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
            <h1>Create a Member Account</h1>
            <p class="auth-intro">Tickets, tours, events, and membership.</p>
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
              <h2>Membership</h2>
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
      setFlash(req, "Staff members should use the staff login page.");
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
      setFlash(req, "Complete all required fields.");
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

    try {
      await pool.query(
        `INSERT INTO users (name, email, password, role, is_active, membership_id)
         VALUES (?, ?, ?, 'user', TRUE, NULL)`,
        [`${firstName} ${lastName}`, email, password],
      );
    } catch (error) {
      if (error && error.code === "ER_DUP_ENTRY") {
        setFlash(req, "An account with that email already exists.");
        return res.redirect("/member-signup");
      }

      throw error;
    }

    setFlash(req, "Account created. Sign in to continue.");
    res.redirect("/member-login");
  }));

  app.post("/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
}

module.exports = { registerAuthenticationRoutes };
