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

// Configure password authentication strategy
passport.use(
  new LocalStrategy(function verify(username, password, cb) {
    global.db.get(
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
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
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

/**
 * @desc Displays a page with a form for creating a user record
 */
router.get("/add-user", (req, res) => {
  res.render("add-user.ejs");
});

/**
 * @desc Add a new user to the database based on data from the submitted form
 */
router.post("/add-user", (req, res, next) => {
  // Validate input
  if (!req.body.user_name || !req.body.password) {
    res.status(400);
    res.send("Blank fields not allowed!");
    return;
  }

  // query the database to see if the user already exists
  let query = "SELECT * FROM users WHERE user_name = ?;";
  let query_parameters = [req.body.user_name];
  global.db.get(query, query_parameters, function (err, row) {
    if (err) {
      next(err);
    }
    if (row) {
      res.send("User already exists!");
      return;
    }
  });

  // Define the query
  query = "INSERT INTO users (user_name, password) VALUES( ?, ? );";
  query_parameters = [req.body.user_name, req.body.password];
  // Execute the query and send a confirmation message
  global.db.run(query, query_parameters, function (err) {
    if (err) {
      next(err); //send the error on to the error handler
    } else {
      req.session.user = { user_name: req.body.user_name, type: "reader" };
      res.redirect("/users/login");
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
      console.log(info);
      return res.redirect("/users/login");
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      // Query the database for the user type
      const sql = "SELECT type FROM users WHERE username = ?";
      global.db.get(sql, [user.username], (err, row) => {
        if (err) {
          return next(err);
        }
        if (row && row.type) {
          if (row.type === "reader") {
            return res.redirect("/readers/home");
          }
          if (row.type === "author") {
            return res.redirect("/authors/home");
          }
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
    res.redirect("/");
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

// router.post("/login", (req, res, next) => {
//   // Query database for user
//   let query = "SELECT * FROM users WHERE user_name = ? AND password = ?;";
//   let query_parameters = [req.body.user_name, req.body.password];
//
//   global.db.get(query, query_parameters, function (err, row) {
//     if (err) {
//       next(err);
//     } else {
//       // Check if user exists
//       if (row) {
//         req.session.user = { user_name: row.user_name, type: row.type };
//         if (row.type == "author") {
//           res.redirect("/authors/home");
//         } else {
//           res.redirect("/readers/home");
//         }
//       } else {
//         res.send("Username or password incorrect!");
//       }
//     }
//   });
// });

// Export the router object so index.js can access it
module.exports = router;
