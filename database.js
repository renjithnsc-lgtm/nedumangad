const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT
    )`, (err) => {
        if (err) {
            console.error("Error creating users table:", err.message);
        } else {
            // Create default admin user if not exists
            const adminUser = 'admin';
            const adminPass = 'admin123';
            const saltRounds = 10;

            db.get("SELECT * FROM users WHERE username = ?", [adminUser], (err, row) => {
                if (!row) {
                    bcrypt.hash(adminPass, saltRounds, (err, hash) => {
                        if (err) {
                            console.error("Error hashing password:", err);
                        } else {
                            db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [adminUser, hash], (err) => {
                                if (err) console.error("Error creating admin user:", err);
                                else console.log("Default admin user created.");
                            });
                        }
                    });
                }
            });
        }
    });

    // People table (Data Entry)
    db.run(`CREATE TABLE IF NOT EXISTS people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        age INTEGER,
        place TEXT,
        photo_url TEXT,
        created_by TEXT,
        updated_by TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error("Error creating people table:", err.message);
    });

    // Logs table
    db.run(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT,
        details TEXT,
        username TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error("Error creating logs table:", err.message);
    });
});

module.exports = db;
