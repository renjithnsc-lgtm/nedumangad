// Auth Logic
async function login(username, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            window.location.href = '/dashboard.html';
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Login failed');
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/index.html';
    } catch (err) {
        console.error(err);
    }
}

async function changePassword(newPassword) {
    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword })
        });
        const data = await response.json();
        alert(data.message || data.error);
        if (response.ok) {
            document.getElementById('changePasswordModal').style.display = 'none';
        }
    } catch (err) {
        alert('Error changing password');
    }
}

async function checkAuth() {
    try {
        const response = await fetch('/api/me');
        if (!response.ok) {
            window.location.href = '/index.html';
        } else {
            const data = await response.json();
            const usernameDisplay = document.getElementById('username-display');
            if (usernameDisplay) usernameDisplay.textContent = `Welcome, ${data.username}`;
        }
    } catch (err) {
        window.location.href = '/index.html';
    }
}
