// Checked app.js, no changes needed for index.html -> app.html here as it redirects to login.html.
// Proceeding to grep search.

const App = {
    currentTab: 'dashboard',
    currentUser: null, // Added to store the authenticated user

    /**
     * Initialize application
     */
    async init() {
        console.log('Initializing app...');

        // Global Auth Listener
        if (typeof firebase !== 'undefined') {
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    console.log("User authenticated:", user.email);
                    this.currentUser = user;
                    this.initializeApp();
                } else {
                    console.warn("User not logged in. Redirecting...");
                    // If we are not on login page, redirect
                    if (!window.location.href.includes('login.html') && !window.location.href.includes('setup.html')) {
                        window.location.href = 'login.html';
                    }
                }
            });
        } else {
            // Fallback if firebase not loaded (should not happen in prod)
            this.initializeApp();
        }

        // Logout handler with animation
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            Utils.addClickHandler(logoutBtn, () => {
                console.log('🚪 Logout clicked!');
                const overlay = document.getElementById('logoutOverlay');
                const content = document.getElementById('logoutContent');
                console.log('Overlay:', overlay, 'Content:', content);

                if (overlay && content) {
                    console.log('✅ Showing goodbye animation');

                    // Reset overlay state
                    overlay.style.display = 'flex';
                    content.style.transform = 'scale(0.8)';
                    content.style.opacity = '0';
                    content.classList.remove('goodbye-animate');

                    // Remove old particles
                    const oldParticles = overlay.querySelectorAll('div:not(#logoutContent)');
                    oldParticles.forEach(p => p.remove());

                    setTimeout(() => {
                        content.classList.add('goodbye-animate');
                        // Fading wave particles
                        const particles = ['👋', '✨', '💫', '⭐'];
                        for (let i = 0; i < 15; i++) {
                            const p = document.createElement('div');
                            p.textContent = particles[Math.floor(Math.random() * particles.length)];
                            p.style.cssText = `position:absolute;font-size:${Math.random() * 40 + 30}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;opacity:1;pointer-events:none;`;
                            overlay.appendChild(p);
                            p.animate([
                                { opacity: 1, transform: 'scale(1)' },
                                { opacity: 0, transform: 'scale(0.3)' }
                            ], { duration: 2000, easing: 'ease-in' });
                        }
                    }, 50);
                    setTimeout(() => firebase.auth().signOut().then(() => window.location.href = 'login.html'), 2000);
                } else {
                    console.log('❌ Overlay not found!');
                    firebase.auth().signOut().then(() => window.location.href = 'login.html');
                }
            });
        }

        // PWA Install Prompt Logic
        let deferredPrompt;
        const installPromptEl = document.getElementById('installPrompt');
        const installBtn = document.getElementById('installAcceptBtn');
        const dismissBtn = document.getElementById('installDismissBtn');

        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            deferredPrompt = e;

            // Show the prompt immediately without dismissal check for now
            console.log("👋 Showing install prompt!");
            if (installPromptEl) installPromptEl.style.display = 'flex';
        });

        if (installBtn) {
            Utils.addClickHandler(installBtn, async () => {
                if (installPromptEl) installPromptEl.style.display = 'none';
                if (!deferredPrompt) return;

                // Show the install prompt
                deferredPrompt.prompt();

                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);

                deferredPrompt = null;
            });
        }

        if (dismissBtn) {
            Utils.addClickHandler(dismissBtn, () => {
                if (installPromptEl) installPromptEl.style.display = 'none';
                // Save dismissal time
                localStorage.setItem('installPromptDismissed', Date.now().toString());
            });
        }
    },

    async initializeApp() {
        console.log('Initializing Student Marks Management System...');

        // Initialize Theme
        ThemeManager.init();
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            Utils.addClickHandler(themeBtn, () => ThemeManager.toggleTheme());
        }

        // Initialize API Client
        await APIClient.init();

        // Initialize Google Sheets API
        if (window.GoogleSheetsAPI) {
            GoogleSheetsAPI.init();
        }

        // Initialize modules
        await this.initializeModules();

        // Setup tab navigation
        this.setupTabNavigation();

        // Show initial tab
        this.showTab('dashboard');

        console.log('Application initialized successfully!');
    },

    /**
     * Initialize all modules
     */
    async initializeModules() {
        try {
            await Promise.all([
                ConfigManager.init(),
                StudentManager.init(),
                MarksTable.init(),
                QuickEntry.init(),
                ExportHandler.init()
            ]);
        } catch (error) {
            console.error('Error initializing modules:', error);
            Utils.showToast('Error initializing application', 'error');
        }
    },

    /**
     * Setup tab navigation
     */
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');

        tabButtons.forEach(button => {
            Utils.addClickHandler(button, () => {
                const tabName = button.dataset.tab;
                this.showTab(tabName);
            });
        });
    },

    /**
     * Show specific tab
     */
    showTab(tabName) {
        // Update current tab
        this.currentTab = tabName;

        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            if (content.id === `${tabName}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Trigger data refresh for specific tabs
        this.refreshTab(tabName);

        // Track in URL hash (optional, for bookmarking)
        window.location.hash = tabName;
    },

    /**
     * Get current active tab
     */
    getCurrentTab() {
        return this.currentTab;
    },

    /**
     * Refresh data for specific tab
     */
    async refreshTab(tabName) {
        switch (tabName) {
            case 'students':
                if (window.StudentManager) await StudentManager.loadStudents();
                break;
            case 'marks':
                if (window.MarksTable) await MarksTable.loadData();
                break;
            case 'config':
            case 'dashboard':
                if (window.ConfigManager) await ConfigManager.loadSelectOptions();
                break;
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();

    // Handle hash navigation (optional)
    if (window.location.hash) {
        const tabName = window.location.hash.substring(1);
        const validTabs = ['dashboard', 'students', 'quick', 'marks', 'export'];
        if (validTabs.includes(tabName)) {
            App.showTab(tabName);
        }
    }
});

// Make functions globally accessible (for onclick handlers)
window.StudentManager = StudentManager;
window.App = App;
