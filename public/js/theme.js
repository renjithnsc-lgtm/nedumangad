document.addEventListener('DOMContentLoaded', () => {
    // Add theme toggle button to body if it doesn't exist
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'theme-toggle';
    toggleBtn.className = 'theme-toggle-btn';
    toggleBtn.innerHTML = '🌓';
    toggleBtn.title = 'Toggle Theme';
    toggleBtn.onclick = toggleTheme;
    document.body.appendChild(toggleBtn);

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
});

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}
