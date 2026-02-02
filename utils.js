/**
 * Utility Functions
 * Helper utilities for the Student Marks Management System
 */

const Utils = {
    /**
     * Format date as YYYY-MM-DD
     */
    formatDate(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Format date as readable string
     */
    formatDateReadable(date = new Date()) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Format number to 2 decimal places
     */
    formatNumber(num, decimals = 2) {
        if (isNaN(num) || num === null || num === undefined) return '0.00';
        return parseFloat(num).toFixed(decimals);
    },

    /**
     * Debounce function - delays execution until after wait time
     */
    debounce(func, wait = 500) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Show custom confirmation modal
     * Returns a Promise that resolves to true (Confirm) or false (Cancel)
     */
    showConfirm(message, title = "Confirm Action") {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            const titleEl = document.getElementById('confirmModalTitle');
            const msgEl = document.getElementById('confirmModalMessage');
            const okBtn = document.getElementById('confirmOkBtn');
            const cancelBtn = document.getElementById('confirmCancelBtn');

            if (!modal || !okBtn || !cancelBtn) {
                // Fallback if modal elements missing
                const result = confirm(message);
                resolve(result);
                return;
            }

            titleEl.textContent = title;
            msgEl.textContent = message;

            // Show modal
            modal.style.display = 'flex';

            // Clean up listeners
            const cleanup = () => {
                okBtn.onclick = null;
                cancelBtn.onclick = null;
                modal.style.display = 'none';
            };

            okBtn.onclick = () => {
                cleanup();
                resolve(true);
            };

            cancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };
        });
    },

    /**
     * Get value from localStorage
     */
    getLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },

    /**
     * Set value in localStorage
     */
    setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    },

    /**
     * Remove item from localStorage
     */
    removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s ease';
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, duration);
    },

    /**
     * Show loading overlay
     */
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('active');
        }
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    },

    /**
     * Convert table to CSV string
     */
    tableToCSV(headers, rows) {
        const csvRows = [];

        // Add headers
        csvRows.push(headers.map(h => `"${h}"`).join(','));

        // Add data rows
        rows.forEach(row => {
            const values = row.map(cell => {
                const escaped = String(cell).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        });

        return csvRows.join('\n');
    },

    /**
     * Download file
     */
    downloadFile(content, filename, type = 'text/plain') {
        // For CSV files, use data URL to bypass file:// protocol restrictions
        if (type === 'text/csv') {
            const encodedContent = encodeURIComponent(content);
            const dataUrl = `data:${type};charset=utf-8,${encodedContent}`;
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // For other files (Excel, PDF), use blob URL
            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    },

    /**
     * Sanitize filename
     */
    sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9_-]/gi, '_');
    },

    /**
     * Parse integer safely
     */
    parseInt(value, defaultValue = 0) {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    },

    /**
     * Parse float safely
     */
    parseFloat(value, defaultValue = 0) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
    },

    /**
     * Check if value is empty
     */
    isEmpty(value) {
        return value === null || value === undefined || value === '';
    },

    /**
     * Smart round to nearest whole number
     */
    smartRound(value) {
        const num = this.parseFloat(value);
        return Math.round(num);
    },

    /**
     * Parse CSV string to array of objects
     * @param {string} csvText 
     * @returns {Array} Array of objects
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i].trim();
            if (!currentLine) continue;

            // Simple split by comma (doesn't handle commas inside quotes well, but enough for simple names)
            // For specified requirement, this is likely sufficient.
            const values = currentLine.split(',').map(v => v.trim().replace(/^"|"$/g, ''));

            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || '';
            });
            result.push(obj);
        }
        return result;
    },

    /**
     * Deep clone object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Sort array of objects by key
     */
    sortBy(array, key, ascending = true) {
        return [...array].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];

            if (aVal < bVal) return ascending ? -1 : 1;
            if (aVal > bVal) return ascending ? 1 : -1;
            return 0;
        });
    },

    /**
     * Filter array of objects by search string
     */
    searchFilter(array, searchTerm, keys) {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return array;

        return array.filter(item => {
            return keys.some(key => {
                const value = String(item[key] || '').toLowerCase();
                return value.includes(term);
            });
        });
    },

    /**
     * Generate filename for export
     */
    generateExportFilename(className, subject, term, extension) {
        const date = this.formatDate();
        const classStr = this.sanitizeFilename(className);
        const subjectStr = this.sanitizeFilename(subject);
        const termStr = this.sanitizeFilename(term);

        return `${classStr}_${subjectStr}_${termStr}_${date}.${extension}`;
    },

    /**
     * Trigger Flying Robot Alert
     */
    triggerRobotAlert(message) {
        const robot = document.getElementById('flyingRobot');
        const msgEl = document.getElementById('robotMessage');
        if (!robot || !msgEl) return;

        msgEl.textContent = message;

        // Reset animation
        robot.classList.remove('animate-fly');
        void robot.offsetWidth; // Trigger reflow

        robot.classList.add('animate-fly');
    },

    /**
     * Trigger Confetti Celebration
     */
    triggerConfetti() {
        const canvas = document.getElementById('confettiCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.display = 'block';

        const confetti = [];
        const colors = ['#00A3E0', '#4DC3F7', '#FFD700', '#FF6B9D', '#C5F', '#00E676'];

        for (let i = 0; i < 150; i++) {
            confetti.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                r: Math.random() * 6 + 4,
                d: Math.random() * 10 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                tilt: Math.random() * 10 - 10,
                tiltAngleIncremental: Math.random() * 0.07 + 0.05,
                tiltAngle: 0
            });
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            confetti.forEach((c, i) => {
                ctx.beginPath();
                ctx.lineWidth = c.r / 2;
                ctx.strokeStyle = c.color;
                ctx.moveTo(c.x + c.tilt + c.r, c.y);
                ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r);
                ctx.stroke();

                c.tiltAngle += c.tiltAngleIncremental;
                c.y += (Math.cos(c.d) + 3 + c.r / 2) / 2;
                c.x += Math.sin(c.d);
                c.tilt = Math.sin(c.tiltAngle - i / 3) * 15;

                if (c.y > canvas.height) confetti.splice(i, 1);
            });

            if (confetti.length > 0) requestAnimationFrame(draw);
            else canvas.style.display = 'none';
        }

        draw();
    },

    /**
     * Show Success Checkmark
     */
    showSuccessCheck() {
        const check = document.getElementById('successCheck');
        if (!check) return;

        check.style.display = 'block';
        const svg = check.querySelector('svg');
        svg.style.animation = 'bounceIn 0.6s ease-out';

        setTimeout(() => {
            check.style.display = 'none';
        }, 2000);
    },

    /**
     * Shake Element (for errors)
     */
    shakeElement(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return;

        el.classList.remove('animate-shake');
        void el.offsetWidth; // Trigger reflow
        el.classList.add('animate-shake');

        setTimeout(() => el.classList.remove('animate-shake'), 500);
    },

    /**
     * Add mobile-compatible click handler
     * Adds both touch and click events to prevent issues on mobile devices
     * @param {Element} element - DOM element to attach handlers to
     * @param {Function} handler - Click/touch handler function
     */
    addClickHandler(element, handler) {
        if (!element) return;
        
        let touchHandled = false;
        
        // Touch event for mobile devices
        element.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchHandled = true;
            handler(e);
            // Reset flag after a short delay to allow click events on desktop
            setTimeout(() => touchHandled = false, 500);
        }, { passive: false });
        
        // Click event for desktop (only fires if touch wasn't handled)
        element.addEventListener('click', (e) => {
            if (!touchHandled) {
                handler(e);
            }
        });
    }
};

// Add CSS animation for toast slide out
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
