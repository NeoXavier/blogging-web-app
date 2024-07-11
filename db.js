var crypto = require("crypto");
const sqlite3 = require("sqlite3").verbose();

var db = new sqlite3.Database("./database.db", function (err) {
  if (err) {
    console.error(err);
    process.exit(1); // bail out we can't connect to the DB
  } else {
    console.log("Database connected");
    db.run("PRAGMA foreign_keys=ON"); // tell SQLite to pay attention to foreign key constraints
    // create initial user author (username: admin, password: passwd)
    var salt = crypto.randomBytes(16);
    db.run(
      "INSERT OR IGNORE INTO users (username, hashed_password, salt, type) VALUES (?, ?, ?, 'author')",
      ["admin", crypto.pbkdf2Sync("passwd", salt, 310000, 32, "sha256"), salt],
    );
    db.get("SELECT * FROM articles", function (err, row) {
      if (row) {
        return;
      }
      db.run(
        "INSERT INTO articles ('title', 'content', 'status', 'author_id', 'author_name') VALUES ('The first article', 'This is the content of the first article', 'draft', 1, 'admin')",
      );
      db.run(
        "INSERT INTO articles ('title', 'content', 'status', 'author_id', 'author_name') VALUES ('The second article', 'This is the content of the second article', 'published', 1, 'admin')",
      );
    });
  }
});

module.exports = db;
