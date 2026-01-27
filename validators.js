/**
 * Validation Functions
 * Handles all validation and calculation logic for marks
 */

const Validators = {
    /**
     * Validate raw test score
     * @param {number} score - The raw score entered
     * @param {number} markedOver - The total marks the test is out of
     * @returns {object} - { valid: boolean, error: string }
     */
    validateRawScore(score, markedOver) {
        // Allow empty (will be treated as 0)
        if (Utils.isEmpty(score) || score === '') {
            return { valid: true, error: '' };
        }

        const numScore = Utils.parseFloat(score);
        const numMarkedOver = Utils.parseFloat(markedOver);

        // Check if it's a valid number
        if (isNaN(numScore)) {
            return { valid: false, error: 'Please enter a valid number' };
        }

        // Check if negative
        if (numScore < 0) {
            return { valid: false, error: 'Score cannot be negative' };
        }

        // Check if exceeds marked over
        if (numScore > numMarkedOver) {
            return {
                valid: false,
                error: `Score cannot exceed ${numMarkedOver}`
            };
        }

        return { valid: true, error: '' };
    },

    /**
     * Validate added mark
     * @param {number} mark - The added mark entered
     * @param {number} maxAllowed - Maximum added marks allowed
     * @returns {object} - { valid: boolean, error: string }
     */
    validateAddedMark(mark, maxAllowed) {
        // Allow empty (will be treated as 0)
        if (Utils.isEmpty(mark) || mark === '') {
            return { valid: true, error: '' };
        }

        const numMark = Utils.parseFloat(mark);
        const numMax = Utils.parseFloat(maxAllowed);

        // Check if it's a valid number
        if (isNaN(numMark)) {
            return { valid: false, error: 'Please enter a valid number' };
        }

        // Check if negative
        if (numMark < 0) {
            return { valid: false, error: 'Added mark cannot be negative' };
        }

        // Check if exceeds maximum
        if (numMark > numMax) {
            return {
                valid: false,
                error: `Added mark cannot exceed ${numMax}`
            };
        }

        return { valid: true, error: '' };
    },

    /**
     * Calculate final test contribution
     * CALCULATION LOGIC:
     * Adjusted Score = Raw Test Score + Added Mark
     * Actual Percentage = Adjusted Score / Test Marked Over
     * Final Test Contribution = Actual Percentage × Test Contribution %
     * Final contribution capped at test contribution %
     * 
     * @param {number} rawScore - Raw test score
     * @param {number} addedMark - Added discretionary mark
     * @param {number} markedOver - Test marked over value
     * @param {number} testContribution - Test contribution percentage (default 10)
     * @returns {number} - Final contribution (0-testContribution)
     */
    calculateFinalContribution(rawScore, addedMark, markedOver, testContribution = 10) {
        // Default empty values to 0
        const raw = Utils.parseFloat(rawScore, 0);
        const added = Utils.parseFloat(addedMark, 0);
        const total = Utils.parseFloat(markedOver, 100);
        const contribution = Utils.parseFloat(testContribution, 10);

        // Avoid division by zero
        if (total === 0) return 0;

        // Calculate adjusted score
        const adjustedScore = raw + added;

        // Calculate actual percentage
        const actualPercentage = adjustedScore / total;

        // Calculate final contribution (out of configured percentage)
        let finalContribution = actualPercentage * contribution;

        // Cap at configured contribution percentage
        finalContribution = Math.min(finalContribution, contribution);

        // Round to 2 decimal places
        return parseFloat(finalContribution.toFixed(2));
    },

    /**
     * Calculate final contribution and return formatted string
     * @param {number} rawScore 
     * @param {number} addedMark 
     * @param {number} markedOver 
     * @returns {string} - Formatted as "X.XX / 10"
     */
    calculateFinalContributionFormatted(rawScore, addedMark, markedOver, testContribution = 10) {
        const contribution = this.calculateFinalContribution(rawScore, addedMark, markedOver, testContribution);
        return `${Utils.formatNumber(contribution, 2)} / ${testContribution}`;
    },

    /**
     * Validate configuration values
     * @param {number} testMarkedOver 
     * @param {number} maxAddedMarks 
     * @returns {object}
     */
    validateConfiguration(testMarkedOver, maxAddedMarks) {
        const errors = [];

        const markedOver = Utils.parseFloat(testMarkedOver);
        const maxAdded = Utils.parseFloat(maxAddedMarks);

        if (isNaN(markedOver) || markedOver <= 0) {
            errors.push('Test Marked Over must be a positive number');
        }

        if (isNaN(maxAdded) || maxAdded < 0) {
            errors.push('Maximum Added Marks must be a non-negative number');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * Validate student name
     * @param {string} name 
     * @returns {object}
     */
    validateStudentName(name) {
        if (!name || name.trim() === '') {
            return { valid: false, error: 'Student name is required' };
        }

        if (name.trim().length < 2) {
            return { valid: false, error: 'Student name must be at least 2 characters' };
        }

        if (name.trim().length > 100) {
            return { valid: false, error: 'Student name is too long (max 100 characters)' };
        }

        return { valid: true, error: '' };
    },

    /**
     * Check if percentage total equals 100
     * This is for future use when adding other assessment components
     * @param {array} components - Array of component percentages
     * @returns {object}
     */
    checkPercentageTotal(components) {
        const total = components.reduce((sum, val) => sum + Utils.parseFloat(val, 0), 0);

        if (total !== 100) {
            return {
                valid: false,
                warning: `Total percentage is ${total}%, not 100%. Please review your configuration.`,
                total: total
            };
        }

        return { valid: true, warning: '', total: 100 };
    },

    /**
     * Format validation error for display
     * @param {string} fieldName 
     * @param {string} error 
     * @returns {string}
     */
    formatError(fieldName, error) {
        return `${fieldName}: ${error}`;
    }
};
