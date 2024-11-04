const express = require("express"); // 
const bodyParser = require("body-parser");
const pg = require("pg");
const bcrypt = require("bcrypt");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const session = require("express-session");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000; // Updated for Railway

const saltRounds = 10;

// Database Configuration
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Connection error", err.stack));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // Ensure correct path for static files

// View Engine Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // Ensure views directory is correctly set

// Passport Initialization
app.use(passport.initialize());
app.use(passport.session());

// Routes

app.get("/", (req, res) => {
  res.render("home.ejs"); // Render home page
});

app.get("/login", (req, res) => {
  const errorMessage =
    req.query.error === "already_registered"
      ? "This email is already registered. Please login."
      : null;
  res.render("login.ejs", { errorMessage }); // Render login page with error message if any
});

app.get("/register", (req, res) => {
  res.render("register.ejs"); // Render register page
});

app.get("/views/dignose", (req, res) => {
    res.render("dignose.ejs"); // or the appropriate rendering method
});

app.get("/help", (req, res) => {
  res.render("help.ejs");
})

app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err); // Handle logout error
    }
    res.redirect("/"); // Redirect to home after logout
  });
});

app.get("/success", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("index.ejs"); // Render index page if authenticated
  } else {
    res.redirect("/login"); // Redirect to login if not authenticated
  }
});

// on clicking the home button on navbar
app.get("/start", (req, res) => {
  res.render("index.ejs");
})

// Authentication Routes

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/success", // Redirect to success page on login success
    failureRedirect: "/login", // Redirect to login page on failure
  })
);

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (checkResult.rows.length > 0) {
      res.redirect("/login?error=already_registered"); // Redirect if email is already registered
    } else {
      const hash = await bcrypt.hash(password, saltRounds); // Hash the password
      const result = await db.query(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
        [email, hash]
      );
      const user = result.rows[0];
      
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err); // Log login errors
          return res.redirect("/login");
        }
        req.session.userId = user.id;
        res.redirect("/success"); // Redirect to success page after registration
      });
    }
  } catch (err) {
    console.error(err); // Log any errors
    res.redirect("/register"); // Redirect to register on error
  }
});

// Route to handle profile update
app.post('/updateProfile', async (req, res) => {
  if (!req.session.userId) {
      return res.status(401).send("Unauthorized");
  }

  const { name, sex, dob, location } = req.body;
  const userId = req.session.userId;

  try {
      const query = `
          UPDATE info 
          SET name = $1, sex = $2, dob = $3, location = $4 
          WHERE user_id = $5
      `;
      await pool.query(query, [name, sex, dob, location, userId]);

      res.redirect('/index'); // Redirect or send success response
  } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).send("An error occurred");
  }
});



// Passport Local Strategy
passport.use(
  "local",
  new LocalStrategy(async (username, password, done) => {
    try {
      const result = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [username]
      );
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password); // Compare passwords
        if (valid) {
          return done(null, user); // Successful login
          req.session.userId = user.id;
        } else {
          return done(null, false, { message: "Incorrect password." });
        }
      } else {
        return done(null, false, { message: "User not found." });
      }
    } catch (err) {
      return done(err);
    }
  })
);

// Passport Google Strategy
passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}/auth/google/success`, // Updated for Railway
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const result = await db.query(
          "SELECT * FROM users WHERE email = $1",
          [profile.email]
        );
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [profile.email, "google"] // Dummy password for Google users
          );
          return done(null, newUser.rows[0]);
        } else {
          return done(null, result.rows[0]);
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Passport Serialize/Deserialize
passport.serializeUser((user, done) => {
  done(null, user.id); // Serialize user ID
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]); // Deserialize user from ID
  } catch (err) {
    done(err, null);
  }
});

// Google Auth Routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }) // Authenticate with Google
);

app.get(
  "/auth/google/success",
  passport.authenticate("google", {
    successRedirect: "/success", // Redirect on success
    failureRedirect: "/login", // Redirect on failure
  })
);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, "views", "404.html")); // Serve 404 page
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`); // Log server status
});
