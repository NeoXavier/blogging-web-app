// Description: This file contains the routes for user management, including login, logout, signup, and password change.

const express = require("express");
const router = express.Router();
const passport = require("passport");
const crypto = require("crypto");
var LocalStrategy = require("passport-local");
const { dbRun, dbGet } = require("../helpers");

let db = global.db;

///////////////////////
// Helper functions //
///////////////////////

// Check if user is authenticated and is an author
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  // Flash an error message and redirect to the login page
  req.session.messages.push({
    type: "error",
    message: "Access Denied. You must be logged in to access this page.",
  });
  res.redirect("/users/login");
}

// Function to hash a password
function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      310000,
      32,
      "sha256",
      (err, hashedPassword) => {
        if (err) {
          return reject(err);
        }
        resolve(hashedPassword);
      },
    );
  });
}

/////////////////////////////////////
// Passport setup & User management//
/////////////////////////////////////

// Configure password authentication strategy
passport.use(
  new LocalStrategy(async function verify(username, password, cb) {
    try {
      /* DATABASE INTERACTION
       * To retrieve the user's password from the database
       * Inputs: username
       * Outputs: user (object with id, username, hashed_password, salt, type)
       */
      const user = await dbGet("SELECT * FROM users WHERE username = ?", [
        username,
      ]);

      // If the user is not found, return false
      if (!user) {
        return cb(null, false, {
          type: "error",
          message: "Incorrect username or password.",
        });
      }

      // Hash the provided password with the user's salt
      const hashedPassword = await hashPassword(password, user.salt);

      // Compare the hashed password with the stored hashed password
      if (!crypto.timingSafeEqual(hashedPassword, user.hashed_password)) {
        return cb(null, false, {
          type: "error",
          message: "Incorrect username or password.",
        });
      }

      // Authentication successful
      return cb(null, user);
    } catch (err) {
      return cb(err);
    }
  }),
);

// Session management
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, type: user.type });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(async function () {
    try {
      const dbUser = await dbGet("SELECT * FROM users WHERE id = ?", [user.id]);
      cb(null, {
        id: dbUser.id,
        username: dbUser.username,
        type: dbUser.type,
      });
    } catch (err) {
      cb(err);
    }
  });
});

/////////////////
// User Routes //
/////////////////

/**
 * @desc GET /login - Render the login page
 */
router.get("/login", (req, res) => {
  res.render("login");
});

/**
 * @desc POST /login/password - Handles login form submission and redirects to the appropriate page
 */
router.post("/login/password", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      req.session.messages.push(info);
      return res.redirect("/users/login");
    }
    req.login(user, async (err) => {
      if (err) {
        return next(err);
      }
      try {
        /* DATABASE INTERACTION
         * To retrieve the user's type from the database
         * Inputs: username
         * Outputs: type
         */
        const row = await dbGet("SELECT type FROM users WHERE username = ?", [
          user.username,
        ]);

        // Store the user type in req.user
        user.type = row.type;

        // Redirect to the appropriate page based on the user's type
        if (row.type == "reader") {
          return res.redirect("/reader/home");
        }
        if (row.type == "author") {
          return res.redirect("/author/home");
        }

        // Default redirection if type is not found or does not match
        return res.redirect("/");
      } catch (err) {
        return next(err);
      }
    });
  })(req, res, next);
});

/**
 * @desc GET /logout - Logs the user out and redirects to the home page
 */
router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.session.destroy(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/"); // Redirect to home page or login page
    });
  });
});

/**
 * @desc GET /signup - Render the signup page
 */
router.get("/signup", function (req, res, next) {
  res.render("signup");
});

/**
 * @desc POST /signup - Handles signup form submission and redirects to the home page
 */
router.post("/signup", async (req, res, next) => {
  try {
    // Generate salt and hash the password
    const salt = crypto.randomBytes(16);
    const hashedPassword = await hashPassword(req.body.password, salt);

    // Insert a new user into the database and create a req.user object
    const user = await new Promise((resolve, reject) => {
      /* DATABASE INTERACTION
       * To add a new user into the database
       * Inputs: username, hashed_password, salt, type
       */
      db.run(
        "INSERT INTO users (username, hashed_password, salt, type) VALUES (?, ?, ?, ?)",
        [req.body.username, hashedPassword, salt, "reader"],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve({
            id: this.lastID,
            username: req.body.username,
            type: "reader", // Default type is reader
          });
        },
      );
    });

    // Log the user in
    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * @desc GET /settings - Render the settings page
 */
router.get("/settings", ensureAuthenticated, (req, res) => {
  res.render("settings", {
    user: req.user,
    title: global.title,
    subtitle: global.subtitle,
    author: global.author,
  });
});

/**
 * @desc POST /change-password - Handles password change form submission and
 * redirects to the settings page with a success message if successful
 */
router.post("/change-password", ensureAuthenticated, async (req, res) => {
  const user_id = req.user.id;
  const { oldPassword, newPassword } = req.body;

  try {
    /* DATABASE INTERACTION
     * To retrieve the user's salt and hashed password from the database
     * Inputs: user_id
     * Outputs: user object
     */
    const user = await dbGet("SELECT * FROM users WHERE id = ?", [user_id]);

    // If the user is not found, return an error
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Verify the old password
    const oldHashedPassword = await hashPassword(oldPassword, user.salt);
    if (!crypto.timingSafeEqual(oldHashedPassword, user.hashed_password)) {
      req.session.messages.push({
        type: "error",
        message: "Old password is incorrect.",
      });
      return res.redirect("/users/settings");
    }

    // Hash the new password
    const newSalt = crypto.randomBytes(16);
    const newHashedPassword = await hashPassword(newPassword, newSalt);

    /* DATABASE INTERACTION
     * To update the user's hashed password and salt in the database
     * Inputs: newHashedPassword, newSalt, user_id
     */
    await dbRun("UPDATE users SET hashed_password = ?, salt = ? WHERE id = ?", [
      newHashedPassword,
      newSalt,
      user_id,
    ]);

    req.session.messages.push({
      type: "success",
      message: "Password has been changed successfully!",
    });
    // Redirect to the settings page
    res.redirect("/users/settings");
  } catch (err) {
    res.status(500).send("Internal server error");
  }
});

// Export the router object so index.js can access it
module.exports = router;
