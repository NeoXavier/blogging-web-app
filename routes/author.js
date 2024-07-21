const express = require("express");
const router = express.Router();
const { dbRun, dbGet, dbAll } = require("../helpers");

global.title = "The Handlebar Diaries";
global.subtitle = "a journey on two wheels";
global.author = "Xavier";

// Check if user is authenticated AND is an author
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated() && req.user.type == "author") {
    return next();
  }
  req.session.messages.push({
    type: "error",
    message: "Access denied. You must be an author to access this page.",
  });
  res.redirect("/users/login");
}

/**
 * @desc GET /home - Display the author's home page
 */
router.get("/home", ensureAuthenticated, async function (req, res, next) {
  try {
    /* DATABASE INTERACTION
     * To retrieve the author's articles from the database
     * Inputs: author_name
     * Outputs: articles (array of article objects)
     */
    const query = `SELECT id, title, subtitle, created_at, published_at, last_modified, content, author_name, status FROM articles WHERE author_name = ?`;
    const articles = await dbAll(query, [req.user.username]);

    // Split the articles by status
    let draftArticles = [];
    let publishedArticles = [];
    articles.forEach((article) => {
      if (article.status === "published") {
        publishedArticles.push(article);
      }
      if (article.status === "draft") {
        draftArticles.push(article);
      }
    });

    // Sort the articles by date
    draftArticles.sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    publishedArticles.sort((a, b) => {
      return new Date(b.published_at) - new Date(a.published_at);
    });

    res.render("author-home", {
      user: req.user,
      title: global.title,
      subtitle: global.subtitle,
      draftArticles,
      publishedArticles,
    });
  } catch (err) {
    return res.status(500).send("Failed to retrieve articles");
  }
});

/**
 * @desc GET /article/create - Renders the create article page
 */
router.get("/article/create", ensureAuthenticated, (req, res) => {
  res.render("write-article", { user: req.user });
});

/**
 * @desc POST /article/create - Creates a new article with the form data and
 * adds it to the database
 */
router.post("/article/create", ensureAuthenticated, async function (req, res) {
  const { title, subtitle, content } = req.body;

  /* DATABASE INTERACTION
   * To insert a new article into the database
   * Inputs: title, subtitle, content, author_name
   */
  const query = `INSERT INTO articles (title, subtitle, content, author_name, status, created_at) VALUES (?, ?, ?, ?, 'draft', datetime('now'))`;
  try {
    await dbRun(query, [title, subtitle, content, req.user.username]);
    res.redirect("/author/home");
  } catch (err) {
    res.status(500).send("Failed to create article");
  }
});

/**
 * @desc GET /article/edit/:id - Renders the edit article page for a specific article
 */
router.get("/article/edit/:id", ensureAuthenticated, async function (req, res) {
  const { id } = req.params;

  /* DATABASE INTERACTION
   * To retrieve the article from the database
   * Inputs: id
   * Outputs: article (object)
   */
  const query = `SELECT id, title, subtitle, content, created_at, published_at, last_modified FROM articles WHERE id = ?`;
  try {
    const article = await dbGet(query, [id]);
    res.render("edit-article", { user: req.user, article });
  } catch (err) {
    res.status(500).send("Failed to retrieve article");
  }
});

/**
 * @desc POST /article/update/ - Updates an article with the form data
 */
router.post("/article/update", ensureAuthenticated, async function (req, res) {
  const { title, subtitle, content, id } = req.body;

  /* DATABASE INTERACTION
   * To update an article in the database
   * Inputs: title, subtitle, content, id
   */
  const query = `UPDATE articles SET title = ?, subtitle = ?, content = ?, last_modified = datetime('now') WHERE id = ?`;
  try {
    await dbRun(query, [title, subtitle, content, id]);
    res.redirect("/author/home");
  } catch (err) {
    res.status(500).send("Failed to update article");
  }
});

/**
 * @desc GET /article/publish - Change the status of an article to published
 */
router.get(
  "/article/publish/:id",
  ensureAuthenticated,
  async function (req, res) {
    const { id } = req.params;
    const query = `UPDATE articles SET status = 'published', published_at = datetime('now') WHERE id = ?`;

    /* DATABASE INTERACTION
     * To publish an article
     * Inputs: id
     */
    try {
      await dbRun(query, [id]);
      res.redirect("/author/home");
    } catch (err) {
      res.status(500).send("Failed to publish article");
    }
  },
);

/**
 * @desc GET /article/unpublish - Change the status of an article to draft
 */
router.get(
  "/article/unpublish/:id",
  ensureAuthenticated,
  async function (req, res) {
    const { id } = req.params;
    const query = `UPDATE articles SET status = 'draft', published_at = NULL WHERE id = ?`;

    try {
      /* DATABASE INTERACTION
       * To set the status of an article to "draft"
       * Inputs: id
       */
      await dbRun(query, [id]);
      res.redirect("/author/home");
    } catch (err) {
      res.status(500).send("Failed to unpublish article");
    }
  },
);

/**
 * @desc POST /article/delete/:id - Delete a specific article from the database
 */
router.post("/article/delete", ensureAuthenticated, async function (req, res) {
  const { id } = req.body;
  const query = `DELETE FROM articles WHERE id = ?`;

  try {
    /* DATABASE INTERACTION
     * To delete an article from the database
     * Inputs: id
     */
    await dbRun(query, [id]);
    res.redirect("/author/home");
  } catch (err) {
    res.status(500).send("Failed to delete article");
  }
});

/**
 * @desc POST /blog-settings - Changes the settings of the blog (i.e. title, subtitle or author name)
 */
router.post("/blog-settings", ensureAuthenticated, (req, res) => {
  const { title, subtitle, author } = req.body;
  global.title = title;
  global.subtitle = subtitle;
  global.author = author;
  res.redirect("/author/home");
});

// Export the router object so index.js can access it
module.exports = router;
