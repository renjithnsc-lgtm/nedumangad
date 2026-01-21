const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

const password = 'admin123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error(err);
        return;
    }
    db.run("UPDATE users SET password_hash = ? WHERE username = 'admin'", [hash], function (err) {
        if (err) console.error(err);
        else console.log(`Password for admin reset. Rows affected: ${this.changes}`);
    });
});
