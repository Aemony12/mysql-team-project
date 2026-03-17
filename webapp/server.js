const express = require("express");
const session = require("express-session");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

loadEnv(path.join(__dirname, ".env"));

const app = express();
const port = Number(process.env.PORT || 3000);

const poolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "teamdb",
  waitForConnections: true,
  connectionLimit: 10,
};

if (isTruthy(process.env.DB_SSL)) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = mysql.createPool(poolConfig);

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "museum-session-secret",
    resave: false,
    saveUninitialized: false,
  }),
);

app.get("/", (req, res) => {
  res.send(renderPage({
    title: "The Museum of Fine Arts, Houston",
    user: req.session.user,
    content: `
      <section class="hero card narrow">
        <p class="eyebrow">Login Demo</p>
        <h1>Welcome </h1>
        <p>WIP, only has login, logout, session, and role display using the <code>users</code> table.</p>
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
        <form method="post" action="/login" class="form-grid">
          <label>Email<input type="email" name="email" required></label>
          <label>Password<input type="password" name="password" required></label>
          <button class="button" type="submit">Log In</button>
        </form>
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

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.get("/dashboard", requireLogin, (req, res) => {
  const user = req.session.user;
  res.send(renderPage({
    title: "Dashboard",
    user,
    content: `
      <section class="card narrow">
        <h1>Login Successful</h1>
        <p>You are signed in and the session is active.</p>
        <dl class="details">
          <div><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
          <div><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
          <div><dt>Role</dt><dd>${escapeHtml(user.role)}</dd></div>
          <div><dt>Employee ID</dt><dd>${escapeHtml(user.employeeId || "Not linked")}</dd></div>
          <div><dt>Membership ID</dt><dd>${escapeHtml(user.membershipId || "Not linked")}</dd></div>
        </dl>
        <p>${escapeHtml(roleText(user.role))}</p>
        <form method="post" action="/logout">
          <button class="button" type="submit">Log Out</button>
        </form>
      </section>
    `,
  }));
});

app.use((req, res) => {
  res.status(404).send(renderPage({
    title: "Not Found",
    user: req.session.user,
    content: '<section class="card narrow"><h1>Page not found</h1></section>',
  }));
});

app.use((err, req, res, next) => {
  console.error(err);
  setFlash(req, err && (err.sqlMessage || err.message) ? (err.sqlMessage || err.message) : "Unexpected error.");
  res.redirect(req.headers.referer || "/");
});

app.listen(port, () => {
  console.log(`Museum login app running on http://localhost:${port}`);
});

function requireLogin(req, res, next) {
  if (!req.session.user) {
    setFlash(req, "Please log in first.");
    return res.redirect("/login");
  }
  next();
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function setFlash(req, message) {
  req.session.flash = message;
}

function renderFlash(req) {
  if (!req.session.flash) {
    return "";
  }
  const html = `<div class="flash">${escapeHtml(req.session.flash)}</div>`;
  delete req.session.flash;
  return html;
}

function renderPage({ title, user, content }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/">Museum Login</a>
    <nav>
      <a href="/">Home</a>
      ${user ? '<a href="/dashboard">Dashboard</a>' : '<a href="/login">Login</a>'}
      ${user ? '<form method="post" action="/logout" class="inline-form"><button class="link-button" type="submit">Logout</button></form>' : ""}
    </nav>
  </header>
  <main class="container">
    ${content}
  </main>
</body>
</html>`;
}

function roleText(role) {
  if (role === "employee") {
    return "This account is marked as employee access.";
  }
  if (role === "supervisor") {
    return "This account is marked as supervisor access.";
  }
  return "This account is marked as standard user access.";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) {
      continue;
    }
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function isTruthy(value) {
  if (!value) {
    return false;
  }
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}
