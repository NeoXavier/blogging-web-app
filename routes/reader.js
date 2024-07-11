const express = require("express");
const router = express.Router();

/**
 * @desc Display all the users
 */
router.get("/home", (req, res, next) => {
  res.render("reader-home.ejs", { user: req.user });
});

// Export the router object so index.js can access it
module.exports = router;
