const express = require("express");
const session = require("express-session");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

loadEnv(path.join(__dirname, ".env"));

const app = express();
const port = Number(process.env.PORT || 3000);
//hi 
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
        ${user.role === "user" || user.role === "employee" || user.role === "supervisor" ? `
        <div class="button-row">
          <a class="button" href="/add-ticket">Add Ticket</a>
        </div>
        `: ""}
        ${user.role === "employee" || user.role === "supervisor" ? `
        <div class="button-row">
          <a class="button" href="/add-artist">Add Artist</a>
          <a class="button" href="/add-artwork">Add Artwork</a>
          <a class="button" href="/add-membership">Add Membership</a>
          <a class="button" href="/add-exhibition">Add Exhibtion</a>
          <a class="button" href="/add-item">Add Gift Item</a>
          <a class="button" href="/add-sale">Create Gift Sale</a>
          <a class="button" href="/add-sale">Add Item to Sale</a>
          <a class="button" href="/add-food">Add Food</a>
          <a class="button" href="/add-food-sale">Add Food to Sale</a>
        </div>
        `: ""}
        <form method="post" action="/logout">
          <button class="button" type="submit">Log Out</button>
        </form>
      </section>
    `,
  }));
});

//my code

app.get("/add-artist", requireLogin, asyncHandler(async (req, res) => {
  const [artists] = await pool.query("SELECT Artist_ID, Artist_Name, Date_of_Birth, Birth_Place FROM Artist");

  // this to modify artist info 
  let editArtist = null;
  if (req.query.edit_id) {
    const [rows] = await pool.query(
      "SELECT * FROM Artist WHERE Artist_ID = ?",
      [req.query.edit_id]
    );
    if (rows.length){
      editArtist = rows[0];
    }
  }

  const artistRows = artists.map(a => `
    <tr>
      <td>${a.Artist_ID}</td>
      <td>${escapeHtml(a.Artist_Name)}</td>
      <td>${escapeHtml(a.Birth_Place || 'Unknown')}</td>
      <td>${a.Date_of_Birth || 'Unknown'}</td>
      <td>${a.Date_of_Death || ''}</td>
      <td class="actions">
        <form method= "get" action="/add-artist" class="inline-form">
          <input type="hidden" name="edit_id" value="${a.Artist_ID}">
          <button class="link-button" type="submit">Edit</button>
        </form>
        <form method="post" action="/delete-artist" class="inline-form" onsubmit="return confirm('Are you sure you want to delete this artist?');">
          <input type="hidden" name="artist_id" value="${a.Artist_ID}">
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
          ${editArtist ? `<input type="hidden" name="artist_id" value="${editArtist.Artist_ID}">` : ''}

          <label>
            Artist Name
            <input type="text" name="name" value="${editArtist ? escapeHtml(editArtist.Artist_Name) : ''}" required>
          </label>

          <label>
            Birth Place
            <input type="text" name="birthplace" value="${editArtist ? escapeHtml(editArtist.Birth_Place) : ''}">
          </label>

          <label>
            Date of Birth
            <input type="date" name="dob" value="${editArtist && editArtist.Date_of_Birth ? editArtist.Date_of_Birth.toISOString().split('T')[0] : ''}"> 
          </label>

          <label>
            Date of Death
            <input type="date" name="dod" value="${editArtist && editArtist.Date_of_Death ? editArtist.Date_of_Death.toISOString().split('T')[0] : ''}">
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
            ${artistRows || '<tr><td colspan="4">No artists found.</td></tr>'}
          </tbody>
        </table>
      </section>
    `,
  }));
}));


app.post("/add-artist", requireLogin, asyncHandler(async (req, res) => { 
  const id = req.body.artist_id || null; // use for updating 
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
    `UPDATE Artist SET Artist_Name = ?, Birth_Place = ?, Date_of_Birth = ?, Date_of_Death = ? 
    WHERE Artist_ID = ?`,
    [name, birthplace, dob, dod, id]
  );
  setFlash(req, "Artist updated successfully.");
} else {
  await pool.query(
    `INSERT INTO Artist (Artist_Name, Birth_Place, Date_of_Birth, Date_of_Death)
    VALUES (?, ?, ?, ?)`, 
    [name, birthplace, dob, dod]
  );
  setFlash(req, "Artist added successfully.");
}
  res.redirect("/add-artist");
}));


// DELETE ROUTE: ARTIST
app.post("/delete-artist", requireLogin, asyncHandler(async (req, res) => {
  const idToDelete = req.body.artist_id;

  if (!idToDelete) {
    setFlash(req, "Error: No artist ID provided.");
    return res.redirect("/add-artist");
  }

  await pool.query("DELETE FROM Artist WHERE Artist_ID = ?", [idToDelete]);

  setFlash(req, "Artist successfully deleted!");
  res.redirect("/add-artist");
}));


app.get("/add-artwork", requireLogin, asyncHandler(async (req, res) => {
  if (req.session.user.role === "member") {
    setFlash(req, "Access denied.");
    return res.redirect("/dashboard");
  }

  const [artists] = await pool.query(
    "SELECT Artist_ID, Artist_Name FROM Artist"
  );

  if (artists.length === 0) {
    setFlash(req, "Please add an artist first.");
    return res.redirect("/add-artist");
  }

  // edits artwork 
  let editArtwork = null;
  if (req.query.edit_id) {
    const [rows] = await pool.query(
      "SELECT * FROM Artwork WHERE Artwork_ID = ?",
      [req.query.edit_id]
    );
    if (rows.length){
      editArtwork = rows[0];
    }
  }

  const [artworks] = await pool.query(`
    SELECT Artwork.Artwork_ID, Artwork.Title, Artwork.Type, Artist.Artist_Name 
    FROM Artwork
    JOIN Artist ON Artwork.Artist_ID = Artist.Artist_ID
  `);

  const artworkRows = artworks.map(art => `
    <tr>
      <td>${art.Artwork_ID}</td>
      <td>${escapeHtml(art.Title)}</td>
      <td>${escapeHtml(art.Type)}</td>
      <td>${escapeHtml(art.Artist_Name)}</td>
      <td class="actions">
        <form method="get" action="/add-artwork" class="inline-form">
          <input type="hidden" name="edit_id" value="${art.Artwork_ID}">
          <button class="link-button danger" type="submit">Edit</button>
        </form>
        <form method="post" action="/delete-artwork" class="inline-form" onsubmit="return confirm('Are you sure you want to delete this artwork?');">
          <input type="hidden" name="artwork_id" value="${art.Artwork_ID}">
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
          ${editArtwork ? `<input type="hidden" name="artwork_id" value="${editArtwork.Artwork_ID}">` : ''}
          <label>
            Title
            <input type="text" name="title" value="${editArtwork ? escapeHtml(editArtwork.Title) : ''}" required>
          </label>

          <label>
            Type
            <input type="text" name="type" value="${editArtwork ? escapeHtml(editArtwork.Type) : ''}" required>
          </label>

          <label>Artist
            <select name="artist_id" required>
              ${artists.map(a => `<option value="${a.Artist_ID}">${escapeHtml(a.Artist_Name)}</option>`).join("")}
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
app.post("/add-artwork", requireLogin, asyncHandler(async (req, res) => {
  const id = req.body.artwork_id || null; // use for updating
  const title = req.body.title?.trim();
  const type = req.body.type?.trim();
  const artist_id = req.body.artist_id;

  if (!title || !type || !artist_id) {
    setFlash(req, "All fields are required.");
    return res.redirect("/add-artwork");
  }

  if (id){
    await pool.query(
      `UPDATE Artwork SET Title = ?, Type = ?, Artist_ID = ? WHERE Artwork_ID = ?`,
      [title, type, artist_id, id]
    );
    setFlash(req, "Artwork updated successfully.");
  } else {
    await pool.query(
      `INSERT INTO Artwork (Title, Type, Artist_ID)
       VALUES (?, ?, ?)`,
      [title, type, artist_id]
    );
  setFlash(req, "Artwork added successfully.");
  }
  res.redirect("/add-artwork");
}));

// DELETE ROUTE: ARTWORK
app.post("/delete-artwork", requireLogin, asyncHandler(async (req, res) => {
  const idToDelete = req.body.artwork_id;

  if (!idToDelete) {
    setFlash(req, "Error: No artwork ID provided.");
    return res.redirect("/add-artwork");
  }

  await pool.query("DELETE FROM Artwork WHERE Artwork_ID = ?", [idToDelete]);

  setFlash(req, "Artwork successfully deleted!");
  res.redirect("/add-artwork");
}));

app.get("/add-membership", requireLogin, asyncHandler(async (req, res) => {
  const [members] = await pool.query(
    "SELECT Membership_ID, First_Name, Last_Name, Email, Phone_Number, Date_Joined FROM Membership"
  );

  // edits membership info
  let editMember = null;
  if (req.query.edit_id) {
    const [rows] = await pool.query(
      "SELECT * FROM Membership WHERE Membership_ID = ?",
      [req.query.edit_id]
    );
    if (rows.length){
       editMember = rows[0];
    }
  }

  const memberRows = members.map(m => `
    <tr>
      <td>${m.Membership_ID}</td>
      <td>${escapeHtml(m.First_Name)} ${escapeHtml(m.Last_Name)}</td>
      <td>${escapeHtml(m.Email || 'N/A')}</td>
      <td>${escapeHtml(m.Phone_Number || 'N/A')}</td>
      <td class="actions">
        <form method="get" action="/add-membership" class="inline-form">
          <input type="hidden" name="edit_id" value="${m.Membership_ID}">
          <button class="link-button" type="submit">Edit</button>
        </form>
        <form method="post" action="/delete-membership" class="inline-form" onsubmit="return confirm('Are you sure you want to delete this member?');">
          <input type="hidden" name="membership_id" value="${m.Membership_ID}">
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
          ${editMember ? `<input type="hidden" name="membership_id" value="${editMember.Membership_ID}">` : ''}

          <label>First Name 
            <input type="text" name="first_name" value="${editMember ? escapeHtml(editMember.First_Name) : ''}" required>
          </label>

          <label>Last Name 
            <input type="text" name="last_name" value="${editMember ? escapeHtml(editMember.Last_Name) : ''}" required>
          </label>

          <label>Email 
            <input type="email" name="email" value="${editMember ? escapeHtml(editMember.Email || '') : ''}">
          </label>

          <label>Phone 
            <input type="tel" name="phone" value="${editMember ? escapeHtml(editMember.Phone_Number || '') : ''}">
          </label>

          <label>Date Joined 
            <input type="date" name="date_joined" value="${editMember && editMember.Date_Joined ? editMember.Date_Joined.toISOString().split('T')[0] : ''}">
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

app.post("/add-membership", requireLogin, asyncHandler(async (req,res) => {
  const id = req.body.membership_id || null;
  const {first_name, last_name, email, phone, date_joined} = req.body;
  if (!first_name || !last_name) {
    setFlash(req, "Name is required.");
    return res.redirect("/add-membership");
  }

  if (id) {
    await pool.query(
      `UPDATE Membership SET First_Name = ?, Last_Name = ?, Email = ?, Phone_Number = ?, Date_Joined = ? WHERE Membership_ID = ?`,
      [first_name, last_name, email || null, phone || null, date_joined || null, id]
    );
    setFlash(req, "Membership updated successfully.");
  } else {
    await pool.query(
      `INSERT INTO Membership (First_Name, Last_Name, Email, Phone_Number, Date_Joined) VALUES (?, ?, ?, ?, ?)`,
      [first_name, last_name, email || null, phone || null, date_joined || null]
    );
    setFlash(req, "Membership added.");
  }
  res.redirect("/add-membership");
}));

// DELETE route: Membership
app.post("/delete-membership", requireLogin, asyncHandler(async (req, res) => {
  const idToDelete = req.body.membership_id;

  if (!idToDelete) {
    setFlash(req, "Error: No membership ID provided.");
    return res.redirect("/add-membership");
  }

  await pool.query("DELETE FROM Membership WHERE Membership_ID = ?", [idToDelete]);
  setFlash(req, "Membership successfully deleted!");
  res.redirect("/add-membership");
}));

app.get("/add-exhibition", requireLogin, asyncHandler(async (req, res) => {
  const [exhibitions] = await pool.query(
    "SELECT Exhibition_ID, Exhibition_Name, Starting_Date, Ending_Date FROM Exhibition"
  );

  // edits exhibition info
  let editExhibition = null;
  if (req.query.edit_id) {
    const [rows] = await pool.query(
      "SELECT * FROM Exhibition WHERE Exhibition_ID = ?",
      [req.query.edit_id]
    );
    if (rows.length){
       editExhibition = rows[0];
    }
  }

  const exhibitionRows = exhibitions.map(ex => `
    <tr>
      <td>${ex.Exhibition_ID}</td>
      <td>${escapeHtml(ex.Exhibition_Name)}</td>
      <td>${ex.Starting_Date ? new Date(ex.Starting_Date).toLocaleDateString() : 'N/A'}</td>
      <td>${ex.Ending_Date ? new Date(ex.Ending_Date).toLocaleDateString() : 'N/A'}</td>
      <td class="actions">
        <form method="get" action="/add-exhibition" class="inline-form">
          <input type="hidden" name="edit_id" value="${ex.Exhibition_ID}">
          <button class="link-button" type="submit">Edit</button>
        </form>
        <form method="post" action="/delete-exhibition" class="inline-form" onsubmit="return confirm('Delete this exhibition?');">
          <input type="hidden" name="exhibition_id" value="${ex.Exhibition_ID}">
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
          ${editExhibition ? `<input type="hidden" name="exhibition_id" value="${editExhibition.Exhibition_ID}">` : ''}

          <label>Exhibition Name
            <input type="text" name="name" value="${editExhibition ? escapeHtml(editExhibition.Exhibition_Name) : ''}" required>
          </label>
          
          <label>Start Date
            <input type="date" name="start_date" value="${editExhibition && editExhibition.Starting_Date ? editExhibition.Starting_Date.toISOString().split('T')[0] : ''}" required>
          </label>

          <label>End Date
            <input type="date" name="end_date" value="${editExhibition && editExhibition.Ending_Date ? editExhibition.Ending_Date.toISOString().split('T')[0] : ''}" required>
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

app.post("/add-exhibition", requireLogin, asyncHandler(async (req, res) => {
  const id = req.body.exhibition_id || null;
  const { name, start_date, end_date } = req.body;
  if (!name || !start_date || !end_date) {
    setFlash(req, "All fields are required.");
    return res.redirect("/add-exhibition");
  }
  if (id) {
    await pool.query(
      `UPDATE Exhibition SET Exhibition_Name = ?, Starting_Date = ?, Ending_Date = ? WHERE Exhibition_ID = ?`,
      [name, start_date, end_date, id]
    );
    setFlash(req, "Exhibition updated successfully.");
  } else {
    await pool.query(
      `INSERT INTO Exhibition (Exhibition_Name, Starting_Date, Ending_Date)
      VALUES (?, ?, ?)`,
      [name, start_date, end_date]
    );
    setFlash(req, "Exhibition added successfully. Now link artwork to the exhibition.");
  }
  res.redirect("/add-exhibition");
}));

// DELETE ROUTE: EXHIBITION 
app.post("/delete-exhibition", requireLogin, asyncHandler(async (req, res) => {
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

app.get("/add-exhibition-artwork", requireLogin, asyncHandler(async(req, res) =>  {
  if (req.session.user.role === "member") {
    setFlash(req, "Access denied.");
    return res.redirect("/dashboard");
  }

  const [exhibitions] = await pool.query("SELECT Exhibition_ID, Exhibition_Name FROM Exhibition");
  const [artworks] = await pool.query("SELECT Artwork_ID, Title FROM Artwork");

  // edits link info
  let editLink = null;
  if (req.query.edit_exhibition_id && req.query.edit_artwork_id) {
    const [rows] = await pool.query(
      `SELECT * FROM Exhibition_Artwork WHERE Exhibition_ID = ? AND Artwork_ID = ?`,
      [req.query.edit_exhibition_id, req.query.edit_artwork_id]
    );
    if (rows.length){
      editLink = rows[0];
    }
  }

  const [links] = await pool.query(`
    SELECT ea.Exhibition_ID, ea.Artwork_ID, e.Exhibition_Name, a.Title, ea.Display_Room 
    FROM Exhibition_Artwork ea
    JOIN Exhibition e ON ea.Exhibition_ID = e.Exhibition_ID
    JOIN Artwork a ON ea.Artwork_ID = a.Artwork_ID
  `);

  const linkRows = links.map(l => `
    <tr>
      <td>${escapeHtml(l.Exhibition_Name)}</td>
      <td>${escapeHtml(l.Title)}</td>
      <td>${escapeHtml(l.Display_Room || 'N/A')}</td>
      <td class="actions">
        <form method="get" action="/add-exhibition-artwork" class="inline-form">
          <input type="hidden" name="edit_exhibition_id" value="${l.Exhibition_ID}">
          <input type="hidden" name="edit_artwork_id" value="${l.Artwork_ID}">
          <button class="link-button" type="submit">Edit</button>
        </form>
        <form method="post" action="/delete-exhibition-artwork" class="inline-form" onsubmit="return confirm('Remove this artwork from the exhibition?');">
          <input type="hidden" name="exhibition_id" value="${l.Exhibition_ID}">
          <input type="hidden" name="artwork_id" value="${l.Artwork_ID}">
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
          ` : ''}

          <label>Exhibition
            <select name="exhibition_id" required>
              ${exhibitions.map(e => `<option value="${e.Exhibition_ID}" ${editLink && editLink.Exhibition_ID === e.Exhibition_ID ? 'selected' : ''}>${escapeHtml(e.Exhibition_Name)}</option>`).join("")}
            </select>
          </label>

          <label>Artwork
            <select name="artwork_id" required>
              ${artworks.map(a => `<option value="${a.Artwork_ID}" ${editLink && editLink.Artwork_ID === a.Artwork_ID ? 'selected' : ''}>${escapeHtml(a.Title)}</option>`).join("")}
            </select>
          </label>

          <label>Display Room
            <input type="text" name="display_room" value="${editLink ? escapeHtml(editLink.Display_Room || '') : ''}">
          </label>

          <label>Date Installed
            <input type="date" name="date_installed" value="${editLink && editLink.Date_Installed ? editLink.Date_Installed.toISOString().split('T')[0] : ''}">
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
    `
  }));
}));

app.post("/add-exhibition-artwork", requireLogin, asyncHandler(async (req, res) => {
  const { exhibition_id, artwork_id, display_room, date_installed } = req.body;
  if (!exhibition_id || !artwork_id) {
     setFlash(req, "Please select both exhibition and artwork.");
     return res.redirect("/add-exhibition-artwork");
  }

  if (edit_exhibition_id && edit_artwork_id) {
    await pool.query(`
      UPDATE Exhibition_Artwork 
      SET Exhibition_ID = ?, Artwork_ID = ?, Display_Room = ?, Date_Installed = ?
      WHERE Exhibition_ID = ? AND Artwork_ID = ?
    `, [exhibition_id, artwork_id, display_room || null, date_installed || null, edit_exhibition_id, edit_artwork_id]);

    setFlash(req, "Artwork link updated successfully.");
  } else {
    await pool.query(`
      INSERT INTO Exhibition_Artwork (Exhibition_ID, Artwork_ID, Display_Room, Date_Installed)
      VALUES (?, ?, ?, ?)
    `, [exhibition_id, artwork_id, display_room || null, date_installed || null]);

    setFlash(req, "Artwork linked successfully.");
  }

  res.redirect("/add-exhibition-artwork");
}));

// DELETE ROUTE: EXHIBITION ARTWORK
app.post("/delete-exhibition-artwork", requireLogin, asyncHandler(async (req, res) => {
  const { exhibition_id, artwork_id } = req.body;
  await pool.query(
    "DELETE FROM Exhibition_Artwork WHERE Exhibition_ID = ? AND Artwork_ID = ?",
    [exhibition_id, artwork_id]
  );
  setFlash(req, "Link removed.");
  res.redirect("/add-exhibition-artwork");
}));


app.get("/add-ticket", requireLogin, asyncHandler(async (req, res) => {
  const [tickets] = await pool.query(
    "SELECT Ticket_ID, Purchase_type, Purchase_Date, Visit_Date, Email FROM Ticket"
  );

  // edits ticket info
  let editTicket = null;
  if (req.query.edit_id) {
    const [rows] = await pool.query(
      "SELECT * FROM Ticket WHERE Ticket_ID = ?",
      [req.query.edit_id]
    );
    if (rows.length) editTicket = rows[0];
  }

  const ticketRows = tickets.map(t => `
    <tr>
      <td>${t.Ticket_ID}</td>
      <td>${escapeHtml(t.Purchase_type || 'N/A')}</td>
      <td>${t.Purchase_Date ? new Date(t.Purchase_Date).toLocaleDateString() : 'N/A'}</td>
      <td>${t.Visit_Date ? new Date(t.Visit_Date).toLocaleDateString() : 'N/A'}</td>
      <td>${escapeHtml(t.Email || 'N/A')}</td>
      <td class="actions">
        <form method="get" action="/add-ticket" class="inline-form">
          <input type="hidden" name="edit_id" value="${t.Ticket_ID}">
          <button class="link-button" type="submit">Edit</button>
        </form>
        <form method="post" action="/delete-ticket" class="inline-form" onsubmit="return confirm('Delete this ticket record?');">
          <input type="hidden" name="ticket_id" value="${t.Ticket_ID}">
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
        <form method="post" action="/add-ticket" class="form-grid">
          ${editTicket ? `<input type="hidden" name="ticket_id" value="${editTicket.Ticket_ID}">` : ''}

          <label>Purchase Type
            <input type="text" name="type" value="${editTicket ? escapeHtml(editTicket.Purchase_type) : ''}" required>
          </label>

          <label>Purchase Date
            <input type="date" name="purchase_date" value="${editTicket && editTicket.Purchase_Date ? editTicket.Purchase_Date.toISOString().split('T')[0] : ''}" required>
          </label>

          <label>Visit Date
            <input type="date" name="visit_date" value="${editTicket && editTicket.Visit_Date ? editTicket.Visit_Date.toISOString().split('T')[0] : ''}" required>
          </label>

          <label>Phone
            <input type="tel" name="phone" value="${editTicket ? escapeHtml(editTicket.Phone_Number || '') : ''}">
          </label>

          <label>Email
            <input type="email" name="email" value="${editTicket ? escapeHtml(editTicket.Email || '') : ''}">
          </label>

          <button class="button" type="submit">${editTicket ? "Update Ticket" : "Add Ticket"}</button>
        </form>
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

app.post("/add-ticket", requireLogin, asyncHandler(async(req, res) => {
  const { type, purchase_date, visit_date, email, phone } = req.body;
  
  if (!phone && !email) {
    setFlash(req, "Please enter either Phone or Email.");
    return res.redirect("/add-ticket");
  }

  if (ticket_id) {
    await pool.query(
      `UPDATE Ticket 
       SET Purchase_type = ?, Purchase_Date = ?, Visit_Date = ?, Email = ?, Phone_Number = ? 
       WHERE Ticket_ID = ?`,
      [type, purchase_date, visit_date, email || null, phone || null, ticket_id]
    );
    setFlash(req, "Ticket updated successfully.");
  } else {
    await pool.query(
      `INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Email, Phone_Number)
       VALUES (?, ?, ?, ?, ?)`,
      [type, purchase_date, visit_date, email || null, phone || null]
    );
    setFlash(req, "Ticket added successfully.");
  }

  res.redirect("/add-ticket");
}));

// DELETE ROUTE: TICKET
app.post("/delete-ticket", requireLogin, asyncHandler(async (req, res) => {
  const idToDelete = req.body.ticket_id;

  if (!idToDelete) {
    setFlash(req, "Error: No ticket ID provided.");
    return res.redirect("/add-ticket");
  }

  await pool.query("DELETE FROM Ticket WHERE Ticket_ID = ?", [idToDelete]);

  setFlash(req, "Ticket record deleted.");
  res.redirect("/add-ticket");
}));

app.get("/add-ticket-line", requireLogin, asyncHandler(async (req, res) => {
  // 1. Fetch dropdown data
  const [tickets] = await pool.query("SELECT Ticket_ID FROM Ticket");
  const [exhibitions] = await pool.query("SELECT Exhibition_ID, Exhibition_Name FROM Exhibition");

  // 2. Fetch existing lines to show in the table
  const [lines] = await pool.query(`
    SELECT tl.Ticket_ID, tl.Ticket_Type, tl.Quantity, tl.Price_per_ticket, e.Exhibition_Name 
    FROM ticket_line tl
    LEFT JOIN Exhibition e ON tl.Exhibition_ID = e.Exhibition_ID
  `);

  // 3. Build the table rows
  const lineRows = lines.map(line => `
    <tr>
      <td>#${line.Ticket_ID}</td>
      <td>${escapeHtml(line.Ticket_Type)}</td>
      <td>${line.Quantity}</td>
      <td>$${Number(line.Price_per_ticket).toFixed(2)}</td>
      <td>${escapeHtml(line.Exhibition_Name || 'General')}</td>
      <td class="actions">
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
          <label>Ticket
            <select name="ticket_id">
              ${tickets.map(t => `<option value="${t.Ticket_ID}">Ticket #${t.Ticket_ID}</option>`).join("")}
            </select>
          </label>

          <label>Ticket Type
            <input type="text" name="ticket_type" required>
          </label>

          <label>Quantity
            <input type="number" name="quantity" required>
          </label>

          <label>Price per Ticket
            <input type="number" step="0.01" name="price" required>
          </label>
          
          <label>Exhibition
            <select name="exhibition_id">
              <option value="">None</option>
              ${exhibitions.map(e => `<option value="${e.Exhibition_ID}">${e.Exhibition_Name}</option>`).join("")}
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
    `
  }));
}));

app.post("/add-ticket-line", requireLogin, asyncHandler(async (req, res) => {
  const { ticket_id, ticket_type, quantity, price, exhibition_id } = req.body;
  if (!ticket_id || !ticket_type || !quantity || !price) {
    setFlash(req, "All fields are required.");
    return res.redirect("/add-ticket-line");
  }
  await pool.query(
    `INSERT INTO ticket_line 
    (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket, Exhibition_ID) 
    VALUES (?, ?, ?, ?, ?)`,
    [ticket_id, ticket_type, quantity, price, exhibition_id || null]
  );
  setFlash(req, "Ticket line added.");
  res.redirect("/add-ticket-line");
}));

app.post("/delete-ticket-line", requireLogin, asyncHandler(async (req, res) => {
  const { ticket_id, ticket_type } = req.body;
  await pool.query(
    "DELETE FROM ticket_line WHERE Ticket_ID = ? AND Ticket_Type = ?",
    [ticket_id, ticket_type]
  );
  setFlash(req, "Line removed.");
  res.redirect("/add-ticket-line");
}));


// GIFT SHOP ROUTES

// stopping here because there might be duplicate pieces of the same code

app.get("/add-item", requireLogin, asyncHandler(async (req, res) => {
  const [items] = await pool.query(
    "SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item, Stock_Quantity FROM Gift_Shop_Item"
  );

  const itemRows = items.map(item => `
    <tr>
      <td>${item.Gift_Shop_Item_ID}</td>
      <td>${escapeHtml(item.Name_of_Item)}</td>
      <td>$${Number(item.Price_of_Item).toFixed(2)}</td>
      <td>${item.Stock_Quantity}</td>
      <td class="actions">
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
        <h1>Add Gift Shop Item</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-item" class="form-grid">
          <label>Name
            <input type="text" name="name" required>
          </label>

          <label>Price
            <input type="number" step="0.01" name="price" required>
          </label>

          <label>Stock
            <input type="number" name="stock" required>
          </label>

          <button class="button" type="submit">Add Item</button>
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
    `
  }));
}));

app.post("/add-item", requireLogin, asyncHandler(async (req, res) => {
  const { name, price, stock } = req.body;
  if (!name || !price || !stock) {
    setFlash(req, "All fields are required.");
    return res.redirect("/add-item");
  }

  await pool.query(
    `INSERT INTO Gift_Shop_Item 
     (Name_of_Item, Price_of_Item, Stock_Quantity) 
     VALUES (?, ?, ?)`,
    [name, price, stock]
  );

  setFlash(req, "Item added successfully.");
  res.redirect("/add-item");
}));

app.post("/delete-item", requireLogin, asyncHandler(async (req, res) => {
  const idToDelete = req.body.item_id;
  if (!idToDelete) {
    setFlash(req, "Error: No item ID provided.");
    return res.redirect("/add-item");
  }

  await pool.query("DELETE FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?", [idToDelete]);
  setFlash(req, "Item removed.");
  res.redirect("/add-item");
}));


// FOOD ROUTES

app.get("/add-food", requireLogin, asyncHandler(async (req, res) => {
  const [foods] = await pool.query("SELECT Food_ID, Food_Name, Food_Price FROM Food");

  const foodRows = foods.map(f => `
    <tr>
      <td>${f.Food_ID}</td>
      <td>${escapeHtml(f.Food_Name)}</td>
      <td>$${Number(f.Food_Price).toFixed(2)}</td>
      <td class="actions">
        <form method="post" action="/delete-food" class="inline-form" onsubmit="return confirm('Delete this food item?');">
          <input type="hidden" name="food_id" value="${f.Food_ID}">
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
        <h1>Add Food Item</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-food" class="form-grid">
          <label>Food Name
            <input type="text" name="food_name" required>
          </label>

          <label>Food Price
            <input type="number" step="0.01" name="food_price" required>
          </label>

          <button class="button" type="submit">Add Food</button>
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
    `
  }));
}));

app.post("/add-food", requireLogin, asyncHandler(async (req, res) => {
  const { food_name, food_price } = req.body;
  if (!food_name || !food_price) {
    setFlash(req, "All fields are required.");
    return res.redirect("/add-food");
  }

  await pool.query(
    `INSERT INTO Food (Food_Name, Food_Price) 
    VALUES (?, ?)`, 
    [food_name, food_price]);
  setFlash(req, "Food added.");
  res.redirect("/add-food");
}));

app.post("/delete-food", requireLogin, asyncHandler(async (req, res) => {
  const idToDelete = req.body.food_id;
  await pool.query("DELETE FROM Food WHERE Food_ID = ?", [idToDelete]);
  setFlash(req, "Food item deleted.");
  res.redirect("/add-food");
}));


app.post("/add-item", requireLogin, asyncHandler(async (req, res) => {

  const { name, price, stock } = req.body;

  if (!name || !price || !stock) {
    setFlash(req, "All fields are required.");
    return res.redirect("/add-item");
  }

  await pool.query(
    `INSERT INTO Gift_Shop_Item 
     (Name_of_Item, Price_of_Item, Stock_Quantity)
     VALUES (?, ?, ?)`,
    [name, price, stock]
  );

  setFlash(req, "Item added successfully.");
  res.redirect("/add-item");

}));

app.get("/add-food", requireLogin, asyncHandler(async (req, res) => {
  const [foods] = await pool.query("SELECT Food_ID, Food_Name, Food_Price FROM Food");

  const foodRows = foods.map(f => `
    <tr>
      <td>${f.Food_ID}</td>
      <td>${escapeHtml(f.Food_Name)}</td>
      <td>$${Number(f.Food_Price).toFixed(2)}</td>
      <td class="actions">
        <form method="post" action="/delete-food" class="inline-form" onsubmit="return confirm('Delete this food item?');">
          <input type="hidden" name="food_id" value="${f.Food_ID}">
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
        <h1>Add Food Item</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-food" class="form-grid">
          <label>Food Name
            <input type="text" name="food_name" required>
          </label>

          <label>Food Price
            <input type="number" step="0.01" name="food_price" required>
          </label>

          <button class="button" type="submit">Add Food</button>
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
    `
  }));
}));

app.post("/add-food", requireLogin, asyncHandler(async (req, res) => {
  const { food_name, food_price } = req.body;
  if (!food_name || !food_price) {
    setFlash(req, "All fields are required.");
    return res.redirect("/add-food");
  }

  await pool.query(
    `INSERT INTO Food (Food_Name, Food_Price) 
    VALUES (?, ?)`, 
    [food_name, food_price]);
  setFlash(req, "Food added.");
  res.redirect("/add-food");
}));

// DELETE ROUTE: FOOD
app.post("/delete-food", requireLogin, asyncHandler(async (req, res) => {
  const idToDelete = req.body.food_id;
  await pool.query("DELETE FROM Food WHERE Food_ID = ?", [idToDelete]);
  setFlash(req, "Food item deleted.");
  res.redirect("/add-food");
}));


app.post("/add-food", requireLogin, asyncHandler(async (req, res) => {

  const { food_name, food_price } = req.body;

  if (!food_name || !food_price) {
    setFlash(req, "All fields are required.");
    return res.redirect("/add-food");
  }

  await pool.query(
    `INSERT INTO Food (Food_Name, Food_Price)
     VALUES (?, ?)`,
    [food_name, food_price]
  );

  setFlash(req, "Food added.");
  res.redirect("/add-food");

}));

app.get("/add-food-sale", requireLogin, (req, res) => {

  if (req.session.user.role !== "employee" && req.session.user.role !== "supervisor") {
    setFlash(req, "Access denied.");
    return res.redirect("/dashboard");
  }

  res.send(renderPage({
    title: "Add Food Sale",
    user: req.session.user,
    content: `
      <section class="card narrow">
        <h1>Add Food Sale</h1>

        ${renderFlash(req)}

        <form method="post" action="/add-food-sale" class="form-grid">

          <label>Sale Date
            <input type="date" name="sale_date" required>
          </label>

          <button class="button" type="submit">Create Sale</button>

        </form>
      </section>
    `
  }));

});

app.get("/add-food-sale", requireLogin, asyncHandler(async (req, res) => {
  if (req.session.user.role !== "employee" && req.session.user.role !== "supervisor") {
    setFlash(req, "Access denied.");
    return res.redirect("/dashboard");
  }

  const [sales] = await pool.query("SELECT Food_Sale_ID, Sale_Date, Employee_ID FROM Food_Sale");
  const saleRows = sales.map(s => `
    <tr>
      <td>#${s.Food_Sale_ID}</td>
      <td>${s.Sale_Date ? new Date(s.Sale_Date).toLocaleDateString() : 'N/A'}</td>
      <td>${escapeHtml(s.Employee_ID)}</td>
      <td class="actions">
        <form method="post" action="/delete-food-sale" class="inline-form" onsubmit="return confirm('Delete this sale?');">
          <input type="hidden" name="sale_id" value="${s.Food_Sale_ID}">
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
        <h1>Add Food Sale</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-food-sale" class="form-grid">
          <label>Sale Date
            <input type="date" name="sale_date" required>
          </label>

          <button class="button" type="submit">Create Sale</button>
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
    `
  }));
}));

app.post("/add-food-sale", requireLogin, asyncHandler(async (req, res) => {
  const { sale_date } = req.body;
  if (!sale_date) {
    setFlash(req, "Sale date is required.");
    return res.redirect("/add-food-sale");
  }
  const employeeId = req.session.user.employeeId;
  await pool.query(
    `INSERT INTO Food_Sale (Sale_Date, Employee_ID) 
    VALUES (?, ?)`, 
    [sale_date, employeeId]);
  setFlash(req, "Food sale created. Now add items.");
  res.redirect("/add-food-sale-line");
}));

// DELETE ROUTE: FOOD SALE
app.post("/delete-food-sale", requireLogin, asyncHandler(async (req, res) => {
  const { sale_id } = req.body;
  await pool.query("DELETE FROM Food_Sale_Line WHERE Food_Sale_ID = ?", [sale_id]); // Clean lines first
  await pool.query("DELETE FROM Food_Sale WHERE Food_Sale_ID = ?", [sale_id]);
  setFlash(req, "Food sale deleted.");
  res.redirect("/add-food-sale");
}));

app.get("/add-food-sale-line", requireLogin, asyncHandler(async (req, res) => {
  if (req.session.user.role !== "employee" && req.session.user.role !== "supervisor") {
    setFlash(req, "Access denied.");
    return res.redirect("/dashboard");
  }

  const [sales] = await pool.query("SELECT Food_Sale_ID FROM Food_Sale");
  const [foods] = await pool.query("SELECT Food_ID, Food_Name, Food_Price FROM Food");
  const [lines] = await pool.query(`
    SELECT fsl.Food_Sale_ID, fsl.Food_ID, f.Food_Name, fsl.Quantity, fsl.Price_When_Food_Was_Sold 
    FROM Food_Sale_Line fsl
    JOIN Food f ON fsl.Food_ID = f.Food_ID
  `);

  const lineRows = lines.map(l => `
    <tr>
      <td>#${l.Food_Sale_ID}</td>
      <td>${escapeHtml(l.Food_Name)}</td>
      <td>${l.Quantity}</td>
      <td>$${Number(l.Price_When_Food_Was_Sold).toFixed(2)}</td>
      <td class="actions">
        <form method="post" action="/delete-food-sale-line" class="inline-form" onsubmit="return confirm('Remove item from sale?');">
          <input type="hidden" name="sale_id" value="${l.Food_Sale_ID}">
          <input type="hidden" name="food_id" value="${l.Food_ID}">
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
        <h1>Add Food to Sale</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-food-sale-line" class="form-grid">
          <label>Sale
            <select name="sale_id">
              ${sales.map(s => `<option value="${s.Food_Sale_ID}">Sale #${s.Food_Sale_ID}</option>`).join("")}
            </select>
          </label>
          <label>Food
            <select name="food_id">
              ${foods.map(f => `<option value="${f.Food_ID}">${f.Food_Name} ($${f.Food_Price})</option>`).join("")}
            </select>
          </label>
          <label>Quantity<input type="number" name="quantity" required></label>
          <button class="button" type="submit">Add Food</button>
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
    `
  }));
}));

app.post("/add-food-sale-line", requireLogin, asyncHandler(async (req, res) => {
  const { sale_id, food_id, quantity } = req.body;
  if (!sale_id || !food_id || !quantity) {
    setFlash(req, "All fields are required.");
    return res.redirect("/add-food-sale-line");
  }
  const [[food]] = await pool.query("SELECT Food_Price FROM Food WHERE Food_ID = ?", [food_id]);
  await pool.query(
    `INSERT INTO Food_Sale_Line 
    (Food_Sale_ID, Food_ID, Quantity, Price_When_Food_Was_Sold) 
    VALUES (?, ?, ?, ?)`,
    [sale_id, food_id, quantity, food.Food_Price]
  );
  setFlash(req, "Food added to sale.");
  res.redirect("/add-food-sale-line");
}));

// DELETE ROUTE: FOOD SALE LINE
app.post("/delete-food-sale-line", requireLogin, asyncHandler(async (req, res) => {
  const { sale_id, food_id } = req.body;
  await pool.query("DELETE FROM Food_Sale_Line WHERE Food_Sale_ID = ? AND Food_ID = ?", [sale_id, food_id]);
  setFlash(req, "Item removed.");
  res.redirect("/add-food-sale-line");
}));


app.get("/add-sale", requireLogin, asyncHandler(async (req, res) => {
  if (req.session.user.role !== "employee" && req.session.user.role !== "supervisor") {
    setFlash(req, "Access denied.");
    return res.redirect("/dashboard");
  }

  const [sales] = await pool.query("SELECT Gift_Shop_Sale_ID, Sale_Date, Employee_ID FROM Gift_Shop_Sale");
  const saleRows = sales.map(s => `
    <tr>
      <td>#${s.Gift_Shop_Sale_ID}</td>
      <td>${s.Sale_Date ? new Date(s.Sale_Date).toLocaleDateString() : 'N/A'}</td>
      <td>${escapeHtml(s.Employee_ID)}</td>
      <td class="actions">
        <form method="post" action="/delete-sale" class="inline-form" onsubmit="return confirm('Delete this sale?');">
          <input type="hidden" name="sale_id" value="${s.Gift_Shop_Sale_ID}">
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
        <h1>Add Gift Shop Sale</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-sale" class="form-grid">
          <label>Sale Date
            <input type="date" name="sale_date" required>
          </label>
          
          <button class="button" type="submit">Create Sale</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Recent Sales</h2>
        <table>
          <thead><tr><th>ID</th><th>Date</th><th>Employee ID</th><th>Actions</th></tr></thead>
          <tbody>${saleRows || '<tr><td colspan="4">No sales found.</td></tr>'}</tbody>
        </table>
      </section>
    `
  }));
}));

app.post("/add-sale", requireLogin, asyncHandler(async (req, res) => {
  const { sale_date } = req.body;
  if (!sale_date) {
    setFlash(req, "Sale date is required.");
    return res.redirect("/add-sale");
  }
  const employeeId = req.session.user.employeeId;
  await pool.query("INSERT INTO Gift_Shop_Sale (Sale_Date, Employee_ID) VALUES (?, ?)", [sale_date, employeeId]);
  setFlash(req, "Sale created. Now add items to it.");
  res.redirect("/add-sale-line");
}));

// DELETE ROUTE: GIFT SHOP SALE
app.post("/delete-sale", requireLogin, asyncHandler(async (req, res) => {
  const { sale_id } = req.body;
  await pool.query("DELETE FROM Gift_Shop_Sale_Line WHERE Gift_Shop_Sale_ID = ?", [sale_id]); // Clean lines first
  await pool.query("DELETE FROM Gift_Shop_Sale WHERE Gift_Shop_Sale_ID = ?", [sale_id]);
  setFlash(req, "Sale deleted.");
  res.redirect("/add-sale");
}));

app.get("/add-sale-line", requireLogin, asyncHandler(async (req, res) => {
  if (req.session.user.role !== "employee" && req.session.user.role !== "supervisor") {
    setFlash(req, "Access denied.");
    return res.redirect("/dashboard");
  }

  const [sales] = await pool.query("SELECT Gift_Shop_Sale_ID FROM Gift_Shop_Sale");
  const [items] = await pool.query("SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item FROM Gift_Shop_Item");
  const [lines] = await pool.query(`
    SELECT gsl.Gift_Shop_Sale_ID, gsl.Gift_Shop_Item_ID, i.Name_of_Item, gsl.Quantity, gsl.Price_When_Item_is_Sold, gsl.Total_Sum_For_Gift_Shop_Sale 
    FROM Gift_Shop_Sale_Line gsl
    JOIN Gift_Shop_Item i ON gsl.Gift_Shop_Item_ID = i.Gift_Shop_Item_ID
  `);

  const lineRows = lines.map(l => `
    <tr>
      <td>#${l.Gift_Shop_Sale_ID}</td>
      <td>${escapeHtml(l.Name_of_Item)}</td>
      <td>${l.Quantity}</td>
      <td>$${Number(l.Price_When_Item_is_Sold).toFixed(2)}</td>
      <td>$${Number(l.Total_Sum_For_Gift_Shop_Sale).toFixed(2)}</td>
      <td class="actions">
        <form method="post" action="/delete-sale-line" class="inline-form" onsubmit="return confirm('Remove item from sale?');">
          <input type="hidden" name="sale_id" value="${l.Gift_Shop_Sale_ID}">
          <input type="hidden" name="item_id" value="${l.Gift_Shop_Item_ID}">
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
        <h1>Add Item to Sale</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-sale-line" class="form-grid">
          <label>Sale
            <select name="sale_id">
              ${sales.map(s => `<option value="${s.Gift_Shop_Sale_ID}">Sale #${s.Gift_Shop_Sale_ID}</option>`).join("")}
            </select>
          </label>
          <label>Item
            <select name="item_id">
              ${items.map(i => `<option value="${i.Gift_Shop_Item_ID}">${i.Name_of_Item} ($${i.Price_of_Item})</option>`).join("")}
            </select>
          </label>
          <label>Quantity
            <input type="number" name="quantity" required>
          </label>
          <button class="button" type="submit">Add Item</button>
        </form>
      </section>
      <section class="card narrow">
        <h2>Items in Sales</h2>
        <table>
          <thead><tr><th>Sale ID</th><th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th>Actions</th></tr></thead>
          <tbody>${lineRows || '<tr><td colspan="6">No items found.</td></tr>'}</tbody>
        </table>
      </section>
    `
  }));
}));

app.post("/add-sale-line", requireLogin, asyncHandler(async (req, res) => {
  const { sale_id, item_id, quantity } = req.body;
  if (!sale_id || !item_id || !quantity) {
    setFlash(req, "All fields are required.");
    return res.redirect("/add-sale-line");
  }
  const [[item]] = await pool.query("SELECT Price_of_Item FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?", [item_id]);
  const price = item.Price_of_Item;
  const total = price * quantity;

  await pool.query(
    `INSERT INTO Gift_Shop_Sale_Line 
    (Gift_Shop_Sale_ID, Gift_Shop_Item_ID, Quantity, Price_When_Item_is_Sold, Total_Sum_For_Gift_Shop_Sale) 
    VALUES (?, ?, ?, ?, ?)`,
    [sale_id, item_id, quantity, price, total]
  );
  setFlash(req, "Item added to sale.");
  res.redirect("/add-sale-line");
}));

// DELETE ROUTE: GIFT SHOP SALE LINE
app.post("/delete-sale-line", requireLogin, asyncHandler(async (req, res) => {
  const { sale_id, item_id } = req.body;
  await pool.query("DELETE FROM Gift_Shop_Sale_Line WHERE Gift_Shop_Sale_ID = ? AND Gift_Shop_Item_ID = ?", [sale_id, item_id]);
  setFlash(req, "Item removed.");
  res.redirect("/add-sale-line");
}));



// end of my code


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
