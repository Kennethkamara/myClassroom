/**
 * Main Application Controller
 * Handles tab navigation and module initialization
 */

const App = {
    currentTab: 'dashboard',

    /**
     * Initialize application
     */
    async init() {
        console.log('Initializing Student Marks Management System...');

        // Initialize API client
        await APIClient.init();

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
            button.addEventListener('click', () => {
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

        // Track in URL hash (optional, for bookmarking)
        window.location.hash = tabName;
    },

    /**
     * Get current active tab
     */
    getCurrentTab() {
        return this.currentTab;
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
