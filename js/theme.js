(function () {
    const THEME_STORAGE_KEY = 'nexus-theme';
    const DARK_THEME = 'dark';
    const LIGHT_THEME = 'light';

    function getSavedTheme() {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === DARK_THEME || saved === LIGHT_THEME) {
            return saved;
        }
        return null;
    }

    function getPreferredTheme() {
        const saved = getSavedTheme();
        if (saved) return saved;

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return DARK_THEME;
        }
        return LIGHT_THEME;
    }

    function applyTheme(theme) {
        const normalizedTheme = theme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
        document.documentElement.setAttribute('data-theme', normalizedTheme);
        localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: normalizedTheme } }));

        const button = document.getElementById('themeToggleBtn');
        if (button) {
            const isDark = normalizedTheme === DARK_THEME;
            button.textContent = isDark ? 'Light' : 'Dark';
            button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
            button.title = isDark ? 'Светлая тема' : 'Тёмная тема';
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || LIGHT_THEME;
        applyTheme(current === DARK_THEME ? LIGHT_THEME : DARK_THEME);
    }

    function ensureThemeButton() {
        if (document.getElementById('themeToggleBtn')) return;

        const button = document.createElement('button');
        button.id = 'themeToggleBtn';
        button.className = 'theme-toggle-btn btn-secondary';
        button.type = 'button';
        button.addEventListener('click', toggleTheme);

        const navActions = document.querySelector('.nav-actions, .toolbar-right');
        if (navActions) {
            navActions.prepend(button);
        } else {
            button.classList.add('theme-toggle-floating');
            document.body.appendChild(button);
        }

        applyTheme(getPreferredTheme());
    }

    document.addEventListener('DOMContentLoaded', function () {
        applyTheme(getPreferredTheme());
        ensureThemeButton();
    });
})();
