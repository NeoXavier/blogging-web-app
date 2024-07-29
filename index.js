/**
 * index.js
 * This is your main app entry point
 */
// This is to test the new feature issue #2

// Set up express, bodyparser and EJS
const express = require("express");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const logger = require("morgan");

// pass the session to the connect sqlite3 module
// allowing it to inherit from session.Store
var SQLiteStore = require("connect-sqlite3")(session);

app.set("views", __dirname + "/views");
app.set("view engine", "ejs"); // set the app to use ejs for rendering
app.use(express.static(__dirname + "/public")); // set location of static files

app.use(logger("dev"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: "secret",
    resave: false, // dont save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    store: new SQLiteStore({ db: "sessions.db" }),
  }),
);

app.use(passport.authenticate("session"));

// Flash messages
app.use(function (req, res, next) {
  var msgs = req.session.messages || [];
  res.locals.messages = msgs;
  res.locals.hasMessages = !!msgs.length;
  req.session.messages = [];
  next();
});

// Set up SQLite
// Items in the global namespace are accessible throught out the node application
global.db = require("./db");

// Handle requests to the home page
app.get(
  "/",
  (req, res, next) => {
    if (!req.user) {
      return res.render("main");
    }
    next();
  },
  (req, res) => {
    if (req.user.type === "author") {
      res.redirect("/author/home");
    } else if (req.user.type === "reader") {
      res.redirect("/reader/home");
    } else {
      res.redirect("/users/login");
    }
  },
);

// Add all the route handlers in usersRoutes to the app under the path /users
const usersRouter = require("./routes/users");
app.use("/users", usersRouter);

const readersRouter = require("./routes/reader");
app.use("/reader", readersRouter);

const authorsRouter = require("./routes/author");
app.use("/author", authorsRouter);

// Make the web application listen for HTTP requests
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
