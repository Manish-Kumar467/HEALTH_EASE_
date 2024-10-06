import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import dotenv from "dotenv";
import path from "path";
// checking using common js method 
// const express = require("express");
// const bodyParser = require("body-parser");
// const pg = require("pg");
// const bcrypt = require("bcrypt");
// const passport = require("passport");
// const LocalStrategy = require("passport-local").Strategy;
// const GoogleStrategy = require("passport-google-oauth2").Strategy;
// const session = require("express-session");
// const dotenv = require("dotenv");
// const path = require("path");

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
app.use(express.static(path.join(__dirname, 'public'))); // Ensure correct path

// View Engine Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Passport Initialization
app.use(passport.initialize());
app.use(passport.session());

// Routes

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  const errorMessage =
    req.query.error === "already_registered"
      ? "This email is already registered. Please login."
      : null;
  res.render("login.ejs", { errorMessage });
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/success", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("index.ejs");
  } else {
    res.redirect("/login");
  }
});

// Authentication Routes

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/success",
    failureRedirect: "/login",
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
      res.redirect("/login?error=already_registered");
    } else {
      const hash = await bcrypt.hash(password, saltRounds);
      const result = await db.query(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
        [email, hash]
      );
      const user = result.rows[0];
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.redirect("/login");
        }
        res.redirect("/success");
      });
    }
  } catch (err) {
    console.error(err);
    res.redirect("/register");
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
        const valid = await bcrypt.compare(password, user.password);
        if (valid) {
          return done(null, user);
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
            [profile.email, "google"]
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
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

// Google Auth Routes

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/success",
  passport.authenticate("google", {
    successRedirect: "/success",
    failureRedirect: "/login",
  })
);

// 404 Handler

app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, "views", "404.html"));
});

// Start Server

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
