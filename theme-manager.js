/**
 * Theme Manager
 * Handles light/dark mode toggling and persistence
 */
const ThemeManager = {
    // Theme constants
    THEME_LIGHT: 'light',
    THEME_DARK: 'dark',
    STORAGE_KEY: 'myclassroom_theme',

    /**
     * Initialize theme manager
     */
    init() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);

        // Check for system preference if no saved theme
        const systemPrefersDark = window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Determine initial theme
        let initialTheme = this.THEME_LIGHT;
        if (savedTheme) {
            initialTheme = savedTheme;
        } else if (systemPrefersDark) {
            initialTheme = this.THEME_DARK;
        }

        // Apply initial theme
        this.applyTheme(initialTheme);

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (!localStorage.getItem(this.STORAGE_KEY)) {
                    this.applyTheme(e.matches ? this.THEME_DARK : this.THEME_LIGHT);
                }
            });
        }
    },

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || this.THEME_LIGHT;
        const newTheme = currentTheme === this.THEME_LIGHT ? this.THEME_DARK : this.THEME_LIGHT;

        this.applyTheme(newTheme);
        this.saveTheme(newTheme);

        return newTheme;
    },

    /**
     * Apply theme to document
     * @param {string} theme - 'light' or 'dark'
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.updateToggleButton(theme);
    },

    /**
     * Save theme preference
     * @param {string} theme 
     */
    saveTheme(theme) {
        localStorage.setItem(this.STORAGE_KEY, theme);
    },

    /**
     * Update toggle button icon/state
     * @param {string} theme 
     */
    updateToggleButton(theme) {
        const btn = document.getElementById('themeToggle');
        if (btn) {
            // Update icon based on theme
            // If dark (moon), show sun icon to switch to light
            // If light (sun), show moon icon to switch to dark
            const isDark = theme === this.THEME_DARK;
            btn.innerHTML = isDark ? '☀️' : '🌙';
            btn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
            btn.setAttribute('aria-label', btn.title);
        }
    }
};
