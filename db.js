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

    db.get("SELECT * FROM users", function (err, row) {
      if (row) {
        return;
      }
      // Create an admin users
      db.run(
        "INSERT OR IGNORE INTO users (username, hashed_password, salt, type) VALUES (?, ?, ?, 'author')",
        [
          "admin",
          crypto.pbkdf2Sync("passwd", salt, 310000, 32, "sha256"),
          salt,
        ],
      );
      db.run(
        "INSERT OR IGNORE INTO users (username, hashed_password, salt, type) VALUES (?, ?, ?, 'author')",
        ["admin2", crypto.pbkdf2Sync("pass", salt, 310000, 32, "sha256"), salt],
      );
      // Create a reader users
      db.run(
        "INSERT OR IGNORE INTO users (username, hashed_password, salt, type) VALUES (?, ?, ?, 'reader')",
        [
          "SimonK",
          crypto.pbkdf2Sync("password", salt, 310000, 32, "sha256"),
          salt,
        ],
      );
      db.run(
        "INSERT OR IGNORE INTO users (username, hashed_password, salt, type) VALUES (?, ?, ?, 'reader')",
        [
          "Dianne Dean",
          crypto.pbkdf2Sync("password1", salt, 310000, 32, "sha256"),
          salt,
        ],
      );
    });

    // Insert dummy articles
    db.get("SELECT * FROM articles", function (err, row) {
      if (row) {
        return;
      }
      db.run(
        "INSERT INTO articles ('title', 'subtitle', 'content', 'status', 'author_id', 'author_name') VALUES ('Example draft article', 'This is the subtitle', 'This is the content of the draft article', 'draft', 1, 'admin')",
      );
      db.run(
        "INSERT INTO articles ('title', 'subtitle','content', 'created_at','published_at', 'last_modified', 'status', 'author_id', 'author_name') VALUES ('Example published article', 'This is the subtitle','This is the content of the published article', '2019-12-08 14:23:29','2019-12-08 14:23:29','2019-12-08 14:23:29',  'published', 1, 'admin')",
      );
      db.run(
        "INSERT INTO articles ('title', 'subtitle','content', 'created_at', 'published_at', 'last_modified', 'status', 'author_id', 'author_name') VALUES ('Example old published article', 'This is the subtitle','This is the content of the old published article', '2016-01-01 10:20:05', '2016-01-01 10:20:05', '2016-01-01 10:20:05', 'published', 1, 'admin')",
      );
    });
  }
});

module.exports = db;
