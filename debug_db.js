const db = require('./database');

async function debugUsers() {
    try {
        const res = await db.query("SELECT * FROM users");
        console.log("Users:", res.rows);
    } catch (err) {
        console.error(err);
    }
}

debugUsers();
