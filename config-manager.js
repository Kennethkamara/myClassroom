/**
 * Configuration Manager
 * Handles term configuration dashboard
 */

const ConfigManager = {
    currentConfig: {
        classId: '',
        subjectId: '',
        termId: '',
        testMarkedOver: 100,
        maxAddedMarks: 20,
        testContribution: 10
    },

    /**
     * Initialize configuration manager
     */
    async init() {
        await this.loadSelectOptions();
        this.attachEventListeners();
    },

    /**
     * Load options for select dropdowns
     */
    async loadSelectOptions() {
        try {
            const [classes, subjects, terms] = await Promise.all([
                APIClient.getClasses(),
                APIClient.getSubjects(),
                APIClient.getTerms()
            ]);

            this.populateSelect('configClass', classes);
            this.populateSelect('configSubject', subjects);
            this.populateSelect('configTerm', terms);
        } catch (error) {
            console.error('Error loading select options:', error);
            Utils.showToast('Error loading options', 'error');
        }
    },

    /**
     * Populate a select dropdown
     */
    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Clear existing options except first
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add new options
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.id;
            opt.textContent = option.name;
            select.appendChild(opt);
        });
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // When class, subject, or term changes, load configuration
        ['configClass', 'configSubject', 'configTerm'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.loadConfiguration());
            }
        });

        // Save configuration button
        const saveBtn = document.getElementById('saveConfigBtn');
        if (saveBtn) {
            Utils.addClickHandler(saveBtn, () => this.saveConfiguration());
        }

        // **LIVE UPDATE LISTENERS** - Update marks table as user types (no save needed)
        const testMarkedOverInput = document.getElementById('testMarkedOver');
        const maxAddedMarksInput = document.getElementById('maxAddedMarks');
        const testContributionInput = document.getElementById('testContribution');

        if (testMarkedOverInput) {
            testMarkedOverInput.addEventListener('input', () => this.handleLiveConfigUpdate());
        }
        if (maxAddedMarksInput) {
            maxAddedMarksInput.addEventListener('input', () => this.handleLiveConfigUpdate());
        }
        if (testContributionInput) {
            testContributionInput.addEventListener('input', () => this.handleLiveConfigUpdate());
        }
    },

    handleLiveConfigUpdate() {
        // Get current typed values
        const testMarkedOver = parseFloat(document.getElementById('testMarkedOver').value) || 100;
        const maxAddedMarks = parseFloat(document.getElementById('maxAddedMarks').value) || 20;
        const testContribution = parseFloat(document.getElementById('testContribution').value) || 10;

        // Check if marks table is loaded
        if (!window.MarksTable || !window.MarksTable.currentConfig) return;

        const configClass = document.getElementById('configClass').value;
        const configSubject = document.getElementById('configSubject').value;
        const configTerm = document.getElementById('configTerm').value;

        const marksClass = document.getElementById('marksClass')?.value;
        const marksSubject = document.getElementById('marksSubject')?.value;
        const marksTerm = document.getElementById('marksTerm')?.value;

        // Only update if marks table is viewing same class/subject/term
        if (marksClass === configClass && marksSubject === configSubject && marksTerm === configTerm) {
            // Update MarksTable config with typed values
            window.MarksTable.currentConfig.test_marked_over = testMarkedOver;
            window.MarksTable.currentConfig.max_added_marks = maxAddedMarks; // This acts as the default added mark value now
            window.MarksTable.currentConfig.test_contribution = testContribution;

            // **BULK UPDATE ALL STUDENTS** to the new added mark value
            // The user wants configuration to control the marks for all students (lazy mode)
            if (window.MarksTable.marksData) {
                Object.keys(window.MarksTable.marksData).forEach(studentId => {
                    // Update only if the student exists in data
                    if (window.MarksTable.marksData[studentId]) {
                        window.MarksTable.marksData[studentId].added_mark = maxAddedMarks;
                        
                        // FORCE UPDATE UI ROW IMMEDIATELY
                        window.MarksTable.updateFinalContribution(studentId);
                    }
                });
            }

            // Also re-render table to be safe (ensure headers and everything aligns)
            // But the loop above handles the immediate row updates
            // We debounce this slightly to avoid UI flicker if typing fast, 
            // but for "instant" feel we leave it direct.
            // Actually, we might not need full render if we updated rows, 
            // but let's keep render for safety of total structure.
            // window.MarksTable.renderMarksTable(); <-- Removed to prevent input focus loss while typing
            
            // Instead of full re-render (which kills focus), we rely on updateFinalContribution from the loop above
            // to update the values in the inputs and the calculated cells.
            
            // Update display in marks table header
            document.getElementById('displayMarkedOver').textContent = testMarkedOver;
            document.getElementById('displayMaxAdded').textContent = maxAddedMarks;
        }
    },

    /**
     * Load configuration for selected class, subject, term
     */
    async loadConfiguration() {
        const classId = document.getElementById('configClass').value;
        const subjectId = document.getElementById('configSubject').value;
        const termId = document.getElementById('configTerm').value;

        if (!classId || !subjectId || !termId) {
            return;
        }

        try {
            Utils.showLoading();

            const config = await APIClient.getConfiguration(classId, subjectId, termId);

            this.currentConfig = {
                classId,
                subjectId,
                termId,
                testMarkedOver: config.test_marked_over || 100,
                maxAddedMarks: config.max_added_marks || 20,
                testContribution: config.test_contribution || 10
            };

            // Update form fields
            document.getElementById('testMarkedOver').value = this.currentConfig.testMarkedOver;
            document.getElementById('maxAddedMarks').value = this.currentConfig.maxAddedMarks;
            document.getElementById('testContribution').value = this.currentConfig.testContribution;

            Utils.hideLoading();
        } catch (error) {
            console.error('Error loading configuration:', error);
            Utils.showToast('Error loading configuration', 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Save configuration
     */
    async saveConfiguration() {
        const classId = document.getElementById('configClass').value;
        const subjectId = document.getElementById('configSubject').value;
        const termId = document.getElementById('configTerm').value;
        const testMarkedOver = document.getElementById('testMarkedOver').value;
        const maxAddedMarks = document.getElementById('maxAddedMarks').value;
        const testContribution = document.getElementById('testContribution').value;

        // Validation
        if (!classId || !subjectId || !termId) {
            Utils.showToast('Please select class, subject, and term', 'error');
            return;
        }

        const validation = Validators.validateConfiguration(testMarkedOver, maxAddedMarks);
        if (!validation.valid) {
            Utils.showToast(validation.errors.join(', '), 'error');
            return;
        }

        try {
            Utils.showLoading();

            const configData = {
                class_id: classId,
                subject_id: subjectId,
                term_id: termId,
                test_marked_over: parseFloat(testMarkedOver),
                max_added_marks: parseFloat(maxAddedMarks),
                test_contribution: parseFloat(testContribution)
            };

            await APIClient.saveConfiguration(configData);

            this.currentConfig = {
                classId,
                subjectId,
                termId,
                testMarkedOver: parseFloat(testMarkedOver),
                maxAddedMarks: parseFloat(maxAddedMarks),
                testContribution: parseFloat(testContribution)
            };

            Utils.hideLoading();
            Utils.showToast('Configuration saved successfully!', 'success');
            
            // **IMMEDIATELY UPDATE MARKS TABLE** if currently viewing same class/subject/term
            // This applies the new config limits AND updates the added marks for all students
            if (window.MarksTable) {
                const marksClass = document.getElementById('marksClass')?.value;
                const marksSubject = document.getElementById('marksSubject')?.value;
                const marksTerm = document.getElementById('marksTerm')?.value;
                
                // If marks table is loaded for the same class/subject/term we just configured
                if (marksClass === classId && marksSubject === subjectId && marksTerm === termId) {
                    console.log('🔄 Updating marks table with new configuration...');
                    
                    // Update MarksTable config
                    window.MarksTable.currentConfig.test_marked_over = parseFloat(testMarkedOver);
                    window.MarksTable.currentConfig.max_added_marks = parseFloat(maxAddedMarks);
                    window.MarksTable.currentConfig.test_contribution = parseFloat(testContribution);

                    // **BULK UPDATE ALL STUDENTS** to the new added mark value locally
                    // This ensures "IMMEDIATE CHANGE NO REFRESH" as requested
                    if (window.MarksTable.marksData) {
                        Object.keys(window.MarksTable.marksData).forEach(studentId => {
                            if (window.MarksTable.marksData[studentId]) {
                                window.MarksTable.marksData[studentId].added_mark = parseFloat(maxAddedMarks);
                            }
                        });
                    }

                    // Re-render table locally (fast, no DB fetch)
                    window.MarksTable.renderMarksTable();
                    Utils.showToast('Marks updated with new configuration!', 'info');
                }
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            Utils.showToast('Error saving configuration', 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Get current configuration
     */
    getCurrentConfig() {
        return this.currentConfig;
    }
};
