const express = require("express");
const router = express.Router();

let db = global.db;

// Check if user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/users/login");
}

/**
 * @desc Display all the users
 */
router.get("/home", ensureAuthenticated, (req, res, next) => {
  const query = `SELECT id, title, subtitle, published_at, author_name, likes, reads FROM articles WHERE status = 'published'`;
  db.all(query, (err, articles) => {
    if (err) {
      return res.status(500).send("Database query error");
    }
    res.render("reader-home.ejs", {
      user: req.user,
      title: global.title,
      subtitle: global.subtitle,
      author: global.author,
      articles,
    });
  });
});

// Export the router object so index.js can access it
module.exports = router;
