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
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for: ${username}`);

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            console.log("User not found");
            return res.status(401).json({ error: "Invalid credentials" });
        }

        console.log("User found, comparing password...");
        bcrypt.compare(password, user.password_hash, (err, result) => {
            if (err) {
                console.error("Bcrypt error:", err);
                return res.status(500).json({ error: "Auth error" });
            }
            if (result) {
                console.log("Password match!");
                req.session.userId = user.id;
                req.session.username = user.username;
                res.json({ message: "Login successful", username: user.username });
            } else {
                console.log("Password mismatch");
                res.status(401).json({ error: "Invalid credentials" });
            }
        });
    });
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

    bcrypt.hash(newPassword, saltRounds, (err, hash) => {
        if (err) return res.status(500).json({ error: "Error hashing password" });
        db.run("UPDATE users SET password_hash = ? WHERE id = ?", [hash, userId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Password updated successfully" });
        });
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

// Get All People (with optional filtering)
app.get('/api/people', requireAuth, (req, res) => {
    const { age } = req.query;
    let query = "SELECT * FROM people";
    let params = [];

    if (age) {
        query += " WHERE age = ?";
        params.push(age);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Helper to add log
function addLog(action, details, username) {
    db.run("INSERT INTO logs (action, details, username) VALUES (?, ?, ?)", [action, details, username], (err) => {
        if (err) console.error("Error logging action:", err);
    });
}

// Get Logs
app.get('/api/logs', requireAuth, (req, res) => {
    db.all("SELECT * FROM logs ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add Person
app.post('/api/people', requireAuth, upload.single('photo'), (req, res) => {
    const { name, age, place } = req.body;
    const photo_url = req.file ? '/uploads/' + req.file.filename : null;
    const created_by = req.session.username;

    db.run(`INSERT INTO people (name, age, place, photo_url, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)`,
        [name, age, place, photo_url, created_by, created_by],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            addLog('ADD', `Added person: ${name}`, created_by);
            res.json({ id: this.lastID, name, age, place, photo_url, created_by });
        }
    );
});

// Edit Person
app.put('/api/people/:id', requireAuth, upload.single('photo'), (req, res) => {
    const { name, age, place } = req.body;
    const id = req.params.id;
    const updated_by = req.session.username;

    console.log(`Update Request for ID: ${id}. User: ${updated_by}`);

    // First get existing photo to verify if we need to keep it
    db.get("SELECT photo_url FROM people WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error("DB Select Error:", err);
            return res.status(500).json({ error: "Select failed: " + err.message });
        }
        if (!row) return res.status(404).json({ error: "Record not found" });

        const photo_url = req.file ? '/uploads/' + req.file.filename : row.photo_url;
        console.log(`New Photo URL: ${photo_url}`);

        db.run(`UPDATE people SET name = ?, age = ?, place = ?, photo_url = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [name, age, place, photo_url, updated_by, id],
            function (err) {
                if (err) {
                    console.error("DB Update Error:", err);
                    return res.status(500).json({ error: "Update failed: " + err.message });
                }
                addLog('EDIT', `Edited person ID ${id}: ${name}`, updated_by);
                res.json({ message: "Updated successfully" });
            }
        );
    });
});

// Delete Person
app.delete('/api/people/:id', requireAuth, (req, res) => {
    const id = req.params.id;
    const username = req.session.username;

    // Get name before delete for log
    db.get("SELECT name FROM people WHERE id = ?", [id], (err, row) => {
        const name = row ? row.name : 'Unknown';

        db.run("DELETE FROM people WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            addLog('DELETE', `Deleted person ID ${id}: ${name}`, username);
            res.json({ message: "Deleted successfully" });
        });
    });
});

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
