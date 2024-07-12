/**
 * users.js
 * These are example routes for user management
 * This shows how to correctly structure your routes for the project
 * and the suggested pattern for retrieving data by executing queries
 *
 * NB. it's better NOT to use arrow functions for callbacks with the SQLite library
 *
 */

const express = require("express");
const router = express.Router();
const passport = require("passport");
const crypto = require("crypto");
var LocalStrategy = require("passport-local");

let db = global.db;

// Configure password authentication strategy
passport.use(
  new LocalStrategy(function verify(username, password, cb) {
    db.get(
      "SELECT * FROM users WHERE username = ?",
      [username],
      function (err, row) {
        if (err) {
          return cb(err);
        }
        if (!row) {
          return cb(null, false, {
            message: "Incorrect username or password.",
          });
        }

        crypto.pbkdf2(
          password,
          row.salt,
          310000,
          32,
          "sha256",
          function (err, hashedPassword) {
            if (err) {
              return cb(err);
            }
            if (!crypto.timingSafeEqual(row.hashed_password, hashedPassword)) {
              return cb(null, false, {
                message: "Incorrect username or password.",
              });
            }
            return cb(null, row);
          },
        );
      },
    );
  }),
);

// Configure session management
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    // console.log(user);
    cb(null, { id: user.user_id, username: user.username, type: user.type });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    console.log(user);
    db.get(
      "SELECT * FROM users WHERE user_id = ?",
      [user.id],
      function (err, dbUser) {
        if (err) {
          return cb(err);
        }
        cb(null, {
          id: dbUser.user_id,
          username: dbUser.username,
          type: dbUser.type,
        });
      },
    );
  });
});

/**
 * @desc Display all the users
 */
router.get("/list-users", (req, res, next) => {
  // Define the query
  let query = "SELECT * FROM users";
  // Execute the query and render the page with the results
  global.db.all(query, function (err, rows) {
    if (err) {
      next(err); //send the error on to the error handler
    } else {
      res.json(rows); // render page as simple json
    }
  });
});

router.get("/login", (req, res) => {
  res.render("login");
});

router.post("/login/password", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.redirect("/users/login");
    }
    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      // Query the database for the user type
      const sql = "SELECT type FROM users WHERE username = ?";
      global.db.get(sql, [user.username], (err, row) => {
        if (err) {
          return next(err);
        }

        // Store the user type in req.user
        user.type = row.type;

        if (row.type == "reader") {
          return res.redirect("/reader/home");
        }
        if (row.type == "author") {
          return res.redirect("/author/home");
        }
        // Default redirection if type is not found or does not match
        return res.redirect("/");
      });
    });
  })(req, res, next);
});

/* POST /logout
 * Logs the user out and redirects to the home page
 * */
router.post("/logout", function (req, res, next) {
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

router.get("/signup", function (req, res, next) {
  res.render("signup");
});

router.post("/signup", function (req, res, next) {
  var salt = crypto.randomBytes(16);
  crypto.pbkdf2(
    req.body.password,
    salt,
    310000,
    32,
    "sha256",
    function (err, hashedPassword) {
      if (err) {
        return next(err);
      }
      global.db.run(
        "INSERT INTO users (username, hashed_password, salt) VALUES (?, ?, ?)",
        [req.body.username, hashedPassword, salt],
        function (err) {
          if (err) {
            return next(err);
          }
          var user = {
            id: this.lastID,
            username: req.body.username,
            type: "reader",
          };
          req.login(user, function (err) {
            if (err) {
              return next(err);
            }
            res.redirect("/");
          });
        },
      );
    },
  );
});

// Export the router object so index.js can access it
module.exports = router;
