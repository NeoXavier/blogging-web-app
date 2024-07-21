const express = require("express");
const router = express.Router();
const { dbRun, dbGet, dbAll } = require("../helpers");

// Check if user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.session.messages.push({
    type: "error",
    message: "Access Denied. You must be logged in to access this page.",
  });
  res.redirect("/users/login");
}

/**
 * @desc GET /home - Display the reader's home page
 */
router.get("/home", ensureAuthenticated, async (req, res, next) => {
  try {
    /* DATABASE INTERACTION
     * To retrieve the articles from the database
     */
    const query = `SELECT id, title, subtitle, published_at, author_name, likes, reads FROM articles WHERE status = 'published' ORDER BY published_at DESC`;
    const articles = await dbAll(query);
    res.render("reader-home.ejs", {
      user: req.user,
      title: global.title,
      subtitle: global.subtitle,
      author: global.author,
      articles,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database query error");
  }
});

/**
 * @desc GET /article/view/:id - Display the article page
 * @param id - The article id
 */
router.get("/article/view/:id", ensureAuthenticated, async (req, res, next) => {
  const { id } = req.params;

  // Check if the user has viewed the article before, if not, increment the article reads count
  try {
    /* DATABASE INTERACTION
     * To check if the user has viewed the article before
     * Inputs: user_id, article_id
     * Outputs: row (object)
     */
    const readQuery =
      "SELECT * FROM reads WHERE user_id = ? AND article_id = ?";
    const row = await dbGet(readQuery, [req.user.id, id]);

    // If the user has not viewed the article before
    if (!row) {
      // Begin a transaction as if one query fails, the other should not be executed
      await dbRun("BEGIN TRANSACTION");

      try {
        // Insert new read record for the user and article
        /* DATABASE INTERACTION
         * To insert a read record for the user and article
         * Inputs: user_id, article_id
         */
        const insertRead =
          "INSERT INTO reads (user_id, article_id) VALUES (?, ?)";
        await dbRun(insertRead, [req.user.id, id]);

        // Increment the article reads count
        /* DATABASE INTERACTION
         * To update the reads count for the article
         * Inputs: id
         */
        const updateReads =
          "UPDATE articles SET reads = reads + 1 WHERE id = ?";
        await dbRun(updateReads, [id]);

        // Commit the transaction
        await dbRun("COMMIT");
      } catch (err) {
        await dbRun("ROLLBACK");
        throw err;
      }
    }

    // Fetch the article
    /* DATABASE INTERACTION
     * To retrieve the article from the database
     * Inputs: id
     * Outputs: article (object)
     */
    const articleQuery = "SELECT * FROM articles WHERE id = ?";
    const article = await dbGet(articleQuery, [id]);

    // Fetch the comments for the article
    /* DATABASE INTERACTION
     * To retrieve the comments for the article
     * Inputs: id
     * Outputs: comments (array)
     */
    const commentsQuery =
      "SELECT * FROM comments WHERE article_id = ? ORDER BY created_at DESC";
    const comments = await dbAll(commentsQuery, [id]);

    // Render the article page
    res.render("article.ejs", {
      user: req.user,
      title: global.title,
      subtitle: global.subtitle,
      article,
      comments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database query error");
  }
});

/**
 * @desc POST /article/comment/:id - Add a comment to an article
 * @param id - The article id
 */
router.post(
  "/article/comment/:id",
  ensureAuthenticated,
  async (req, res, next) => {
    const { id } = req.params;
    const { comment } = req.body;

    try {
      /* DATABASE INTERACTION
       * To insert a comment for the article
       * Inputs: id, username, comment
       */
      const query = `INSERT INTO comments (article_id, username, content) VALUES (?, ?, ?)`;
      await dbRun(query, [id, req.user.username, comment]);
      res.redirect(`/reader/article/view/${id}`);
    } catch (err) {
      console.error(err);
      res.status(500).send("Database query error");
    }
  },
);

/**
 * @desc GET /article/like/:id - Like an article
 * @param id - The article id @returns Redirect to the article page
 */
router.get("/article/like/:id", ensureAuthenticated, async (req, res, next) => {
  const { id } = req.params;
  const { username } = req.user;
  const user_id = req.user.id;

  try {
    /* DATABASE INTERACTION
     * To check if the user has already liked the article
     * Inputs: id, username
     * Outputs: like (object)
     */
    const likeQuery = `SELECT * FROM likes WHERE article_id = ? AND username = ?`;
    const row = await dbGet(likeQuery, [id, username]);

    // If user has already liked the article, redirect to the article page
    if (row) {
      return res.redirect(`/reader/article/view/${id}`);
    }

    // Begin a transaction as if one query fails, the other should not be executed
    await dbRun("BEGIN TRANSACTION");

    // Insert new like for the user and article, and update the article likes count
    // if any error occurs, rollback the transaction
    try {
      /* DATABASE INTERACTION
       * To insert a like for the article
       * Inputs: user_id, username, id
       */
      const insertLikeQuery = `INSERT INTO likes (user_id, username, article_id) VALUES (?, ?, ?)`;
      await dbRun(insertLikeQuery, [user_id, username, id]);

      /* DATABASE INTERACTION
       * To update the likes count for the article
       * Inputs: id
       */
      const updateLikesQuery = `UPDATE articles SET likes = likes + 1 WHERE id = ?`;
      await dbRun(updateLikesQuery, [id]);

      await dbRun("COMMIT");

      res.redirect(`/reader/article/view/${id}`);
    } catch (err) {
      await dbRun("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Database query error");
  }
});

// Export the router object so index.js can access it
module.exports = router;
