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
  const query = `SELECT id, title, subtitle, published_at, author_name, likes, reads FROM articles WHERE status = 'published' ORDER BY published_at DESC`;
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

router.get("/article/view/:id", ensureAuthenticated, async (req, res, next) => {
  const { id } = req.params;

  try {
    // Check if user has viewed the article before
    const readQuery =
      "SELECT * FROM reads WHERE user_id = ? AND article_id = ?";
    const row = await new Promise((resolve, reject) => {
      db.get(readQuery, [req.user.id, id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!row) {
      // Insert new read record for the user and article, and increment the article reads count
      await new Promise((resolve, reject) => {
        db.run("BEGIN TRANSACTION", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        const insertRead =
          "INSERT INTO reads (user_id, article_id) VALUES (?, ?)";
        db.run(insertRead, [req.user.id, id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        const updateReads =
          "UPDATE articles SET reads = reads + 1 WHERE id = ?";
        db.run(updateReads, [id], (err) => {
          if (err) {
            db.run("ROLLBACK", (rollbackErr) => {
              if (rollbackErr) {
                console.error("Rollback failed: ", rollbackErr);
              }
              reject(err);
            });
          } else {
            db.run("COMMIT", (commitErr) => {
              if (commitErr) reject(commitErr);
              else resolve();
            });
          }
        });
      });
    }

    // Fetch the article
    const articleQuery = "SELECT * FROM articles WHERE id = ?";
    const article = await new Promise((resolve, reject) => {
      db.get(articleQuery, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Fetch the comments for the article
    const commentsQuery =
      "SELECT * FROM comments WHERE article_id = ? ORDER BY created_at DESC";
    const comments = await new Promise((resolve, reject) => {
      db.all(commentsQuery, [id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

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

router.post("/article/comment/:id", ensureAuthenticated, (req, res, next) => {
  const { id } = req.params;
  const { comment } = req.body;
  const query = `INSERT INTO comments (article_id, username, content) VALUES (?, ?, ?)`;
  db.run(query, [id, req.user.username, comment], (err) => {
    if (err) {
      return res.status(500).send("Database query error");
    }
    res.redirect(`/reader/article/view/${id}`);
  });
});

router.get("/article/like/:id", ensureAuthenticated, (req, res, next) => {
  const { id } = req.params;
  const { username } = req.user;
  const user_id = req.user.id;

  // Check if user has already liked the article
  const likeQuery = `SELECT * FROM likes WHERE article_id = ? AND username = ?`;
  db.get(likeQuery, [id, username], (err, row) => {
    if (err) {
      return res.status(500).send("Database query error");
    }
    if (row) {
      return res.redirect(`/reader/article/view/${id}`);
    }

    // Insert new like for the user and article, and update the article likes count
    // if any error occurs, rollback the transaction
    const insertLikeQuery = `INSERT INTO likes (user_id, username, article_id) VALUES (?, ?, ?)`;
    const updateLikesQuery = `UPDATE articles SET likes = likes + 1 WHERE id = ?`;
    db.run("BEGIN TRANSACTION", (err) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to begin transaction" });
      }

      db.run(insertLikeQuery, [user_id, username, id], (err) => {
        if (err) {
          console.log("Error: ", err);
          return res
            .status(500)
            .json({ success: false, message: "Failed to insert like" });
        }

        db.run(updateLikesQuery, [id], (err) => {
          if (err) {
            db.run("ROLLBACK", (rollbackErr) => {
              if (rollbackErr) {
                console.error("Rollback failed: ", rollbackErr);
              }
              return res
                .status(500)
                .json({ success: false, message: "Failed to update article" });
            });
          }

          db.run("COMMIT", (err) => {
            if (err) {
              return res.status(500).json({
                success: false,
                message: "Failed to commit transaction",
              });
            }
            res.redirect(`/reader/article/view/${id}`);
          });
        });
      });
    });
  });
});

// Export the router object so index.js can access it
module.exports = router;
