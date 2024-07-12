const express = require("express");
const router = express.Router();

let db = global.db;

global.title = "The Handlebar Diaries";
global.subtitle = "a journey on two wheels";
global.author = "Xavier";

// Check if user is authenticated and is an author
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated() && req.user.type == "author") {
    return next();
  }
  req.session.messages.push(
    "Access denied. You must be an author to access this page.",
  );
  res.redirect("/users/login");
}

/**
 * @desc Display the author's home page
 */
router.get("/home", ensureAuthenticated, (req, res, next) => {
  const draftQuery = `SELECT id, title, subtitle, created_at, published_at, last_modified, content, author_name FROM articles WHERE status = 'draft' and author_name = ?`;
  const publishedQuery = `SELECT id, title, subtitle, created_at, published_at, last_modified, content, author_name, likes, reads FROM articles WHERE status = 'published' and author_name = ?`;

  db.all(draftQuery, [req.user.username], (err, draftArticles) => {
    if (err) {
      return res.status(500).send("Database query error");
    }
    db.all(publishedQuery, [req.user.username], (err, publishedArticles) => {
      if (err) {
        return res.status(500).send("Database query error");
      }
      res.render("author-home", {
        user: req.user,
        title: global.title,
        subtitle: global.subtitle,
        author: global.author,
        draftArticles,
        publishedArticles,
      });
    });
  });
});

router.get("/articles/create", ensureAuthenticated, (req, res) => {
  res.render("write-article");
});

router.post("/articles/create", ensureAuthenticated, (req, res) => {
  const { title, subtitle, content } = req.body;
  const query = `INSERT INTO articles (title, subtitle, content, author_name, status, created_at) VALUES (?, ?, ?, ?, 'draft', datetime('now'))`;
  db.run(query, [title, subtitle, content, req.user.username], function (err) {
    if (err) {
      return res.status(500).send("Database query error");
    }
    res.redirect("/author/home");
  });
});

router.get("/articles/edit/:id", ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const query = `SELECT id, title, subtitle, content, created_at, last_modified FROM articles WHERE id = ?`;
  db.get(query, [id], (err, article) => {
    if (err) {
      return res.status(500).send("Database query error");
    }
    res.render("edit-article", { article });
  });
});

router.post("/articles/update/:id", ensureAuthenticated, (req, res) => {
  const { title, subtitle, content } = req.body;
  const { id } = req.params;
  const query = `UPDATE articles SET title = ?, subtitle = ?, content = ?, last_modified = datetime('now') WHERE id = ?`;
  db.run(query, [title, subtitle, content, id], function (err) {
    if (err) {
      return res.status(500).send("Database query error");
    }
    res.redirect("/author/home");
  });
});

/* Route to publish an article */
router.post("/articles/publish", ensureAuthenticated, (req, res) => {
  const { id } = req.body;
  const query = `UPDATE articles SET status = 'published', published_at = datetime('now') WHERE id = ?`;
  db.run(query, [id], function (err) {
    if (err) {
      return res.status(500).send("Database query error");
    }
    res.redirect("/author/home");
  });
});

// Route to delete an article
router.post("/articles/delete", ensureAuthenticated, (req, res) => {
  const { id } = req.body;
  const query = `DELETE FROM articles WHERE id = ?`;
  db.run(query, [id], function (err) {
    if (err) {
      return res.status(500).send("Database query error");
    }
    res.redirect("/author/home");
  });
});

router.get("/settings", ensureAuthenticated, (req, res) => {
  res.render("settings", {
    user: req.user,
    title: global.title,
    subtitle: global.subtitle,
    author: global.author,
  });
});

router.post("/settings", ensureAuthenticated, (req, res) => {
  const { title, subtitle, author } = req.body;
  global.title = title;
  global.subtitle = subtitle;
  global.author = author;
  res.redirect("/author/home");
});

// Export the router object so index.js can access it
module.exports = router;
