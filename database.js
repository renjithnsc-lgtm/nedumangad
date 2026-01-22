const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring client', err.stack);
    } else {
        console.log('Connected to the PostgreSQL database.');
        release();
    }
});

const initDb = async () => {
    try {
        // Users table
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password_hash TEXT
        )`);

        // Create default admin user if not exists
        const adminUser = 'admin';
        const res = await pool.query("SELECT * FROM users WHERE username = $1", [adminUser]);

        if (res.rows.length === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2)", [adminUser, hash]);
            console.log("Default admin user created.");
        }

        // People table (Data Entry)
        await pool.query(`CREATE TABLE IF NOT EXISTS people (
            id SERIAL PRIMARY KEY,
            name TEXT,
            age INTEGER,
            place TEXT,
            photo_url TEXT,
            created_by TEXT,
            updated_by TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Logs table
        await pool.query(`CREATE TABLE IF NOT EXISTS logs (
            id SERIAL PRIMARY KEY,
            action TEXT,
            details TEXT,
            username TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

    } catch (err) {
        console.error("Error initializing database tables:", err);
    }
};

initDb();

module.exports = {
    query: (text, params) => pool.query(text, params)
};
