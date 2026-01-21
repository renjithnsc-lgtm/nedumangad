const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database: ' + err.message);
    } else {
        console.log('Connected to database.');
    }
});

db.serialize(() => {
    db.all("SELECT id, username, password_hash FROM users", [], (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Users found:", rows.length);
            rows.forEach((row) => {
                console.log(`ID: ${row.id}, Username: ${row.username}, Hash: ${row.password_hash.substring(0, 10)}...`);
            });
        }
    });
});
