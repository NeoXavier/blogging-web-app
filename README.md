# Handlebar Diaries

A simple blog website created to showcase the use serverside rendering and databases.

## Description

The website that allows users to create, edit, and delete posts. Users can also comment on posts. The website is built using Node.js, Express, EJS, and SQLite3.

## Getting Started

### Dependencies

* Node.js

### Program Setup

1. run `npm install`
2. run `npm run build-db`
3. run `npm run start`
4. Go to `https://localhost:3000` on your web browser

### Defualt User accounts

These are the default user accounts. Additional accounts can be created using the signup page, however they will be of "reader" type. Admin users can only be created on the database.

| Username | Password  | type   |
| -------- | --------- | ------ |
| admin    | passwd    | author |
| admin2   | pass      | author |
| SimonK   | password  | reader |
| DianneD  | password1 | reader |

### List of packages
1. connect-sqlite3
2. cookie-parser
3. ejs
4. express
5. express-session
6. morgan
7. passport
8. passport-local
9. sqlite3

## Acknowledgments

Inspiration, code snippets, etc.
* [Node-SQLite3 docs](https://github.com/TryGhost/node-sqlite3/wiki)
* [Passport.js docs](http://www.passportjs.org/docs/)
* [SQLite docs](https://www.tutorialspoint.com/sqlite/index.htm)


