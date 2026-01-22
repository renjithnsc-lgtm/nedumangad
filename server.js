const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve index.html on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(session({
    secret: 'secret-key-replace-in-production',
    resave: false,
    saveUninitialized: false
}));

// File Upload Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Authentication Middleware
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- AUTH ROUTES ---

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for: ${username}`);

    try {
        const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        const user = result.rows[0];

        if (!user) {
            console.log("User not found");
            return res.status(401).json({ error: "Invalid credentials" });
        }

        console.log("User found, comparing password...");
        bcrypt.compare(password, user.password_hash, (err, match) => {
            if (err) {
                console.error("Bcrypt error:", err);
                return res.status(500).json({ error: "Auth error" });
            }
            if (match) {
                console.log("Password match!");
                req.session.userId = user.id;
                req.session.username = user.username;
                res.json({ message: "Login successful", username: user.username });
            } else {
                console.log("Password mismatch");
                res.status(401).json({ error: "Invalid credentials" });
            }
        });
    } catch (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: "Logged out" });
});

// Change Password
app.post('/api/change-password', requireAuth, (req, res) => {
    const { newPassword } = req.body;
    const userId = req.session.userId;
    const saltRounds = 10;

    bcrypt.hash(newPassword, saltRounds, async (err, hash) => {
        if (err) return res.status(500).json({ error: "Error hashing password" });
        try {
            await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, userId]);
            res.json({ message: "Password updated successfully" });
        } catch (dbErr) {
            return res.status(500).json({ error: dbErr.message });
        }
    });
});

// Get Current User
app.get('/api/me', (req, res) => {
    if (req.session.userId) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).json({ error: "Not logged in" });
    }
});

// --- PEOPLE DATA ROUTES ---

// Helper to add log
async function addLog(action, details, username) {
    try {
        await db.query("INSERT INTO logs (action, details, username) VALUES ($1, $2, $3)", [action, details, username]);
    } catch (err) {
        console.error("Error logging action:", err);
    }
}

// Get Logs
app.get('/api/logs', requireAuth, async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM logs ORDER BY timestamp DESC");
        res.json(result.rows);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Get All People (with optional filtering)
app.get('/api/people', requireAuth, async (req, res) => {
    const { age } = req.query;
    let queryText = "SELECT * FROM people";
    let params = [];

    if (age) {
        queryText += " WHERE age = $1";
        params.push(age);
    }

    try {
        const result = await db.query(queryText, params);
        res.json(result.rows);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Add Person
app.post('/api/people', requireAuth, upload.single('photo'), async (req, res) => {
    const { name, age, place } = req.body;
    const photo_url = req.file ? '/uploads/' + req.file.filename : null;
    const created_by = req.session.username;

    try {
        const result = await db.query(
            `INSERT INTO people (name, age, place, photo_url, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [name, age, place, photo_url, created_by, created_by]
        );
        const newId = result.rows[0].id;

        await addLog('ADD', `Added person: ${name}`, created_by);
        res.json({ id: newId, name, age, place, photo_url, created_by });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Edit Person
app.put('/api/people/:id', requireAuth, upload.single('photo'), async (req, res) => {
    const { name, age, place } = req.body;
    const id = req.params.id;
    const updated_by = req.session.username;

    console.log(`Update Request for ID: ${id}. User: ${updated_by}`);

    try {
        // First get existing photo to verify if we need to keep it
        const existResult = await db.query("SELECT photo_url FROM people WHERE id = $1", [id]);
        if (existResult.rows.length === 0) return res.status(404).json({ error: "Record not found" });

        const row = existResult.rows[0];
        const photo_url = req.file ? '/uploads/' + req.file.filename : row.photo_url;
        console.log(`New Photo URL: ${photo_url}`);

        await db.query(
            `UPDATE people SET name = $1, age = $2, place = $3, photo_url = $4, updated_by = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6`,
            [name, age, place, photo_url, updated_by, id]
        );

        await addLog('EDIT', `Edited person ID ${id}: ${name}`, updated_by);
        res.json({ message: "Updated successfully" });

    } catch (err) {
        console.error("DB Update Error:", err);
        return res.status(500).json({ error: "Update failed: " + err.message });
    }
});

// Delete Person
app.delete('/api/people/:id', requireAuth, async (req, res) => {
    const id = req.params.id;
    const username = req.session.username;

    try {
        // Get name before delete for log
        const nameRes = await db.query("SELECT name FROM people WHERE id = $1", [id]);
        const name = nameRes.rows.length > 0 ? nameRes.rows[0].name : 'Unknown';

        await db.query("DELETE FROM people WHERE id = $1", [id]);
        await addLog('DELETE', `Deleted person ID ${id}: ${name}`, username);
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
