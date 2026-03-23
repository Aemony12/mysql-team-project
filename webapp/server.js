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
        ${user.role === "user" || user.role === "employee" || user.role === "supervisor" ? `
        <div class="button-row">
          <a class="button" href="/add-ticket">Add Ticket</a>
        </div>
        `: ""}
        ${user.role === "employee" || user.role === "supervisor" ? `
        <div class="button-row">
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

app.get("/add-artist", requireLogin, (req, res) => {
  res.send(renderPage({
    title: "Add Artist", 
    user: req.session.user,
    content: `
      <section class="card narrow">
        <h1>Add Artist</h1>

        ${renderFlash(req)}

        <form method="post" action="/add-artist" class="form-grid">

          <label>
            Artist Name
            <input type="text" name="name" required>
          </label>

          <label>
            Date of Birth
            <input type="date" name="dob">
          </label>

          <label>
            Birth Place
            <input type="text" name="birthplace">
          </label>

          <button class="button" type="submit">Add Artist</button>

        </form>
      </section>
    `,
  }));
});


app.post("/add-artist", requireLogin, asyncHandler(async (req, res) => { 
  const name = req.body.name?.trim();
  const dob = req.body.dob || null;
  const birthplace = req.body.birthplace?.trim() || null;

  if (!name) {
    setFlash(req, "Artist name is required.");
    return res.redirect("/add-artist");
  }
  
  await pool.query(
    `INSERT INTO Artist (Artist_Name, Date_of_Birth, Birth_Place)
    VALUES (?, ?, ?)`, 
    [name, dob, birthplace]
  );

  setFlash(req, "Artist added successfully.");
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

  res.send(renderPage({
    title: "Add Artwork",
    user: req.session.user,
    content: `
      <section class="card narrow">
        <h1>Add Artwork</h1>

        ${renderFlash(req)}

        <form method="post" action="/add-artwork" class="form-grid">

          <label>
            Title
            <input type="text" name="title" required>
          </label>

          <label>
            Type
            <input type="text" name="type" required>
          </label>

          <label>
            Artist ID
            <input type="number" name="artist_id" required>
          </label>

          <button class="button" type="submit">Add Artwork</button>

        </form>
      </section>
    `,
  }));
}));

app.post("/add-artwork", requireLogin, asyncHandler(async (req, res) => {

  if (req.session.user.role === "member") {
    setFlash(req, "Access denied.");
    return res.redirect("/dashboard");
  }

  const title = req.body.title?.trim();
  const type = req.body.type?.trim();
  const artist_id = req.body.artist_id;

  if (!title || !type || !artist_id) {
    setFlash(req, "All fields are required.");
    return res.redirect("/add-artwork");
  }

  await pool.query(
    `INSERT INTO Artwork (Title, Type, Artist_ID)
     VALUES (?, ?, ?)`,
    [title, type, artist_id]
  );

  setFlash(req, "Artwork added successfully.");
  res.redirect("/add-artwork");
}));

app.get("/add-membership", requireLogin, (req, res) => {
  res.send(renderPage({
    title: "Add Membership", 
    user: req.session.user,
    content: ` 
    <section class="card narrow">
    <h1>Add Membership</h1>
    ${renderFlash(req)}
    <form method="post" action="/add-membership" class="form-grid">
      <label>First Name 
        <input type="text" name="first_name" required> 
        </label>

        <label>Last Name
          <input type="text" name="last_name" required>
        </label>

        <label>Email
          <input type="email" name="email" required>
        </label>

        <label>Phone
          <input type="tel" name="phone" required>
        </label>

        <label>Date Joined
          <input type="date" name="date_joined">
        </label>

        <button class="button" type="submit">Add Membership</button>
      </form>
    </section>
   `,
    }));
});

app.post("/add-membership", requireLogin, asyncHandler(async(req,res) => {
  const {first_name, last_name, email, phone, date_joined} = req.body;
  if (!first_name || !last_name) {
    setFlash(req, "Name is required.");
    return res.redirect("/add-membership");
  }
  await pool.query(
    `INSERT INTO Membership
    (First_Name, Last_Name, Email, Phone_Number, Date_Joined)
    VALUES (?, ?, ?, ?, ?)
    `,
    [first_name,  last_name, email || null, phone || null, date_joined || null]
  );
  setFlash(req, "Membership added.");
  res.redirect("/add-membership");
}));

app.get("/add-exhibition", requireLogin, (req, res) => {
  res.send(renderPage({
    title: "Add Exhibition" ,
      user:req.session.user,
      content: `
      <section class="card narrow">
        <h1>Add Exhibition</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-exhibition" class="form-grid">

        <label>Name 
        <input type="text" name="name" required>
        </label>

        <label>Start Date
        <input type="date" name="start_date" required>
        </label>

        <label>End Date
        <input type="date" name="end_date" required>
        </label>
        <button class="button" type="submit">Add Exhibition</button>
        </form>
        </section>
      `, 
  }));
});

app.post("/add-exhibition", requireLogin, asyncHandler(async (req, res) => {
  const {name, start_date, end_date} = req.body;
  await pool.query ( 
    `INSERT INTO Exhibition (Exhibition_Name, Starting_Date, Ending_Date) 
    VALUES (?, ?, ?)` , 
    [name, start_date, end_date]
  );
  setFlash(req, "Now link artwork to the exhibition.");
  res.redirect("/add-exhibition-artwork");
}));

app.get("/add-exhibition-artwork", requireLogin, asyncHandler(async(req, res) =>  {

  if (req.session.user.role == "member" ) {
    setFlash (req, "Access denied.");
    return res.redirect("/dashboard");
  }
  const[exhibitions] = await pool.query(
    "SELECT Exhibition_ID, Exhibition_Name FROM Exhibition"
  );

  const [artworks] = await pool.query(
    "SELECT Artwork_ID, Title FROM Artwork"
  );

  res.send(renderPage ({
    title: "Link Artwork to Exhibition",
    user: req.session.user, 
    content: `
      <section class="card narrow">
        <h1>Link Artwork to Exhibition</h1>
        ${renderFlash(req)}
        <form method="post" action="/add-exhibition-artwork" class="form-grid">
          <label>Exhibition
            <select name="exhibition_id">
              ${exhibitions.map(e => `
                <option value="${e.Exhibition_ID}">
                  ${e.Exhibition_Name}
                  </option>
                  `).join("")}
                  </select>
                </label>

                <label> Artwork
                  <select name="artwork_id">
                    ${artworks.map(a => `
                      <option value="${a.Artwork_ID}">
                        ${a.Title}
                      </option>
                      `).join("")}
                    </select>
                  </label>
                  <label>Display Room
                      <input type="text" name="display_room">
                  </label>
                  <label>Installed
                      <input type="date" name="date_installed">
                  </label>
                  <button class="button" type="submit">Link</button>
                </form>
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
    await pool.query(
      `INSERT INTO Exhibition_Artwork
      (Exhibition_ID, Artwork_ID, Display_Room, Date_Installed)
      VALUES (?,?,?,?)`,
      [exhibition_id, artwork_id, display_room || null, date_installed || null]
    );
    setFlash(req, "Artwork linked successfully.");
    res.redirect("/add-exhibition-artwork");
  }));

app.get("/add-ticket", requireLogin, (req, res) => {
  res.send(renderPage({
     title: "Add Ticket",
     user: req.session.user,
     content: `
      <section class="card narrow">
        <h1> Add Ticket</h1>
        ${renderFlash(req)}

        <form method="post" action="/add-ticket" class="form-grid">
          <label>Purchase Type 
            <input type="text" name="type">
          </label>
          <label>Purchase Date 
            <input type="date" name="purchase_date" required>
          </label>
          <label>Visit Date 
            <input type="date" name="visit_date" required>
          </label>
          <label>Phone
            <input type="tel" name="phone">
          </label>
          <label>Email
            <input type="email" name="email">
          </label>
          <button class="button" type="submit">Add Ticket</button>
        </form>
      </section>
      `,
  }));
});

app.post("/add-ticket", requireLogin, asyncHandler(async(req, res) => {
  const { type, purchase_date, visit_date, email, phone } = req.body;
  if (!phone && !email) {
    setFlash(req, "Please enter either Phone or Email.");
    return res.redirect("/add-ticket");
  }
  await pool.query(
    `INSERT INTO Ticket (Purchase_type, Purchase_Date, Visit_Date, Email)
    VALUES (?, ?, ?, ?)`,
    [type, purchase_date, visit_date, email, phone, req.session.user.membershipId]
  );

  setFlash(req, "Ticket added.");
  res.redirect("/add-ticket");
}));

app.get("/add-ticket-line", requireLogin, asyncHandler(async (req, res) => {

  const [tickets] = await pool.query(
    "SELECT Ticket_ID FROM Ticket"
  );

  const [exhibitions] = await pool.query(
    "SELECT Exhibition_ID, Exhibition_Name FROM Exhibition"
  );

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
              ${tickets.map(t => `
                <option value="${t.Ticket_ID}">
                  Ticket #${t.Ticket_ID}
                </option>
              `).join("")}
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
              ${exhibitions.map(e => `
                <option value="${e.Exhibition_ID}">
                  ${e.Exhibition_Name}
                </option>
              `).join("")}
            </select>
          </label>

          <button class="button" type="submit">Add Ticket Line</button>

        </form>
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

  const total = quantity * price;

  await pool.query(
    `INSERT INTO ticket_line
     (Ticket_ID, Ticket_Type, Quantity, Price_per_ticket, Exhibition_ID)
     VALUES (?, ?, ?, ?, ?)`,
    [ticket_id, ticket_type, quantity, price, exhibition_id || null]
  );

  setFlash(req, "Ticket line added.");
  res.redirect("/add-ticket-line");

}));



app.get("/add-item", requireLogin, (req, res) => {
  res.send(renderPage({
    title: "Add Item",
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
    `
  }));
});



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

app.get("/add-food", requireLogin, (req, res) => {
  res.send(renderPage({
    title: "Add Food",
    user: req.session.user,
    content: `
      <section class="card narrow">
        <h1>Add Food</h1>

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
    `
  }));
});


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
    [sale_date, employeeId]
  );

  setFlash(req, "Food sale created. Now add items.");
  res.redirect("/add-food-sale-line");

}));

app.get("/add-food-sale-line", requireLogin, asyncHandler(async (req, res) => {

  if (req.session.user.role !== "employee" && req.session.user.role !== "supervisor") {
    setFlash(req, "Access denied.");
    return res.redirect("/dashboard");
  }

  const [sales] = await pool.query(
    "SELECT Food_Sale_ID FROM Food_Sale"
  );

  const [foods] = await pool.query(
    "SELECT Food_ID, Food_Name, Food_Price FROM Food"
  );

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
              ${sales.map(s => `
                <option value="${s.Food_Sale_ID}">
                  Sale #${s.Food_Sale_ID}
                </option>
              `).join("")}
            </select>
          </label>

          <label>Food
            <select name="food_id">
              ${foods.map(f => `
                <option value="${f.Food_ID}">
                  ${f.Food_Name} ($${f.Food_Price})
                </option>
              `).join("")}
            </select>
          </label>

          <label>Quantity
            <input type="number" name="quantity" required>
          </label>

          <button class="button" type="submit">Add Food</button>

        </form>
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

  const [[food]] = await pool.query(
    "SELECT Food_Price FROM Food WHERE Food_ID = ?",
    [food_id]
  );

  const price = food.Food_Price;

  await pool.query(
    `INSERT INTO Food_Sale_Line
     (Food_Sale_ID, Food_ID, Quantity, Price_When_Food_Was_Sold)
     VALUES (?, ?, ?, ?)`,
    [sale_id, food_id, quantity, price]
  );

  setFlash(req, "Food added to sale.");
  res.redirect("/add-food-sale-line");

}));

app.get("/add-sale", requireLogin, (req, res) => {

  if (req.session.user.role !== "employee" && req.session.user.role !== "supervisor") {
    setFlash(req, "Access denied.");
    return res.redirect("/dashboard");
  }

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
    `
  }));

});


app.post("/add-sale", requireLogin, asyncHandler(async (req, res) => {

  const { sale_date } = req.body;

  if (!sale_date) {
    setFlash(req, "Sale date is required.");
    return res.redirect("/add-sale");
  }

  const employeeId = req.session.user.employeeId;

  await pool.query(
    `INSERT INTO Gift_Shop_Sale (Sale_Date, Employee_ID)
     VALUES (?, ?)`,
    [sale_date, employeeId]
  );

  setFlash(req, "Sale created. Now add items to it.");
  res.redirect("/add-sale-line");

}));

app.get("/add-sale-line", requireLogin, asyncHandler(async (req, res) => {

  if (req.session.user.role !== "employee" && req.session.user.role !== "supervisor") {
    setFlash(req, "Access denied.");
    return res.redirect("/dashboard");
  }

  const [sales] = await pool.query(
    "SELECT Gift_Shop_Sale_ID FROM Gift_Shop_Sale"
  );

  const [items] = await pool.query(
    "SELECT Gift_Shop_Item_ID, Name_of_Item, Price_of_Item FROM Gift_Shop_Item"
  );

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
              ${sales.map(s => `
                <option value="${s.Gift_Shop_Sale_ID}">
                  Sale #${s.Gift_Shop_Sale_ID}
                </option>
              `).join("")}
            </select>
          </label>

          <label>Item
            <select name="item_id">
              ${items.map(i => `
                <option value="${i.Gift_Shop_Item_ID}">
                  ${i.Name_of_Item} ($${i.Price_of_Item})
                </option>
              `).join("")}
            </select>
          </label>

          <label>Quantity
            <input type="number" name="quantity" required>
          </label>

          <button class="button" type="submit">Add Item</button>

        </form>
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

  const [[item]] = await pool.query(
    "SELECT Price_of_Item FROM Gift_Shop_Item WHERE Gift_Shop_Item_ID = ?",
    [item_id]
  );

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
