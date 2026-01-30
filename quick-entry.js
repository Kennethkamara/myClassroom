/**
 * Quick Entry Module
 * Streamlined interface for rapid student mark entry
 */

const QuickEntry = {
    currentConfig: null,
    selectedClass: '',
    selectedSubject: '',
    selectedTerm: '',
    recentEntries: [],

    /**
     * Initialize quick entry
     */
    async init() {
        console.log('Initializing Quick Entry...');
        this.attachEventListeners();
        // Load options after a short delay to ensure DOM is ready
        setTimeout(() => this.loadSelectOptions(), 100);
    },

    /**
     * Load select options
     */
    async loadSelectOptions() {
        try {
            console.log('Loading select options for Quick Entry...');
            const [classes, subjects, terms] = await Promise.all([
                APIClient.getClasses(),
                APIClient.getSubjects(),
                APIClient.getTerms()
            ]);

            console.log('Loaded classes:', classes);
            console.log('Loaded subjects:', subjects);
            console.log('Loaded terms:', terms);

            this.populateSelect('quickClass', classes);
            this.populateSelect('quickSubject', subjects);
            this.populateSelect('quickTerm', terms);
        } catch (error) {
            console.error('Error loading select options:', error);
            Utils.showToast('Error loading dropdown options', 'error');
        }
    },

    /**
     * Populate select dropdown
     */
    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) {
            console.error(`Select element not found: ${selectId}`);
            return;
        }

        console.log(`Populating ${selectId} with ${options.length} options`);

        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }

        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.id;
            opt.textContent = option.name;
            select.appendChild(opt);
        });

        console.log(`${selectId} now has ${select.options.length} options`);
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Load configuration when selections change
        ['quickClass', 'quickSubject', 'quickTerm'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.loadConfiguration());
            }
        });

        // Quick entry form
        const form = document.getElementById('quickEntryForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveQuickEntry();
            });
        }

        // Real-time calculation preview
        const rawScoreInput = document.getElementById('quickRawScore');
        if (rawScoreInput) {
            rawScoreInput.addEventListener('input', () => this.updateCalculationPreview());
        }
    },

    /**
     * Load configuration
     */
    async loadConfiguration() {
        this.selectedClass = document.getElementById('quickClass').value;
        this.selectedSubject = document.getElementById('quickSubject').value;
        this.selectedTerm = document.getElementById('quickTerm').value;

        if (!this.selectedClass || !this.selectedSubject || !this.selectedTerm) {
            document.getElementById('quickEntryFormContainer').style.display = 'none';
            return;
        }

        try {
            Utils.showLoading();

            this.currentConfig = await APIClient.getConfiguration(
                this.selectedClass,
                this.selectedSubject,
                this.selectedTerm
            );

            // Update UI
            document.getElementById('quickMarkedOver').textContent = this.currentConfig.test_marked_over;
            document.getElementById('quickMaxAdded').textContent = this.currentConfig.max_added_marks;

            // Set input max value
            const rawScoreInput = document.getElementById('quickRawScore');
            if (rawScoreInput) {
                rawScoreInput.max = this.currentConfig.test_marked_over;
            }

            // Show form
            document.getElementById('quickEntryFormContainer').style.display = 'block';

            // Focus on name input
            document.getElementById('quickStudentName').focus();

            Utils.hideLoading();
        } catch (error) {
            console.error('Error loading configuration:', error);
            Utils.showToast('Error loading configuration', 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Update calculation preview
     */
    updateCalculationPreview() {
        const rawScore = parseFloat(document.getElementById('quickRawScore').value) || 0;

        if (!this.currentConfig) return;

        // Use max_added_marks as the default added mark
        const defaultAddedMark = this.currentConfig.max_added_marks || 0;
        const testContribution = this.currentConfig.test_contribution || 10;

        const finalContribution = Validators.calculateFinalContribution(
            rawScore,
            defaultAddedMark,
            this.currentConfig.test_marked_over,
            testContribution
        );

        document.getElementById('calculationPreview').textContent =
            `Final: ${Utils.formatNumber(finalContribution, 2)} / ${testContribution} (${rawScore} + ${defaultAddedMark})`;
    },


    /**
     * Save quick entry
     */
    async saveQuickEntry() {
        const studentName = document.getElementById('quickStudentName').value.trim();
        const gender = document.getElementById('quickGender').value;
        const rawScore = document.getElementById('quickRawScore').value;

        console.log('=== QUICK ENTRY SAVE ===');
        console.log('Student Name:', studentName);
        console.log('Gender:', gender);
        console.log('Raw Score:', rawScore);
        console.log('Config:', this.currentConfig);

        // Validate student name
        const nameValidation = Validators.validateStudentName(studentName);
        if (!nameValidation.valid) {
            Utils.showToast(nameValidation.error, 'error');
            document.getElementById('quickStudentName').focus();
            return;
        }

        // Validate gender
        if (!gender) {
            Utils.showToast('Please select gender', 'error');
            document.getElementById('quickGender').focus();
            return;
        }

        // Validate raw score
        const scoreValidation = Validators.validateRawScore(rawScore, this.currentConfig.test_marked_over);
        if (!scoreValidation.valid) {
            Utils.showToast(scoreValidation.error, 'error');
            document.getElementById('quickRawScore').focus();
            return;
        }

        console.log('Validation passed');

        try {
            console.log('Fetching students for class:', this.selectedClass);

            // Check if student exists, if not create
            const students = await APIClient.getStudentsByClass(this.selectedClass);
            console.log('Found students:', students);

            let student = students.find(s => s.name.toLowerCase() === studentName.toLowerCase());
            console.log('Student lookup result:', student);

            if (!student) {
                console.log('Student not found, creating new student...');
                // Create new student
                student = await APIClient.addStudent({
                    name: studentName,
                    gender: gender,
                    class_id: this.selectedClass
                });
                console.log('New student created:', student);
            } else {
                console.log('Using existing student:', student);
            }

            // Save mark - automatically use max_added_marks as default
            const defaultAddedMark = this.currentConfig.max_added_marks || 0;

            const markData = {
                student_id: student.id,
                class_id: this.selectedClass,
                subject_id: this.selectedSubject,
                term_id: this.selectedTerm,
                raw_score: parseFloat(rawScore),
                added_mark: defaultAddedMark
            };

            console.log('Saving mark data:', markData);
            await APIClient.saveMarks([markData]);
            console.log('Mark saved successfully');

            // Calculate final contribution for display
            const testContribution = this.currentConfig.test_contribution || 10;
            const finalContribution = Validators.calculateFinalContribution(
                parseFloat(rawScore),
                defaultAddedMark,
                this.currentConfig.test_marked_over,
                testContribution
            );

            // Add to recent entries
            this.addRecentEntry(studentName, rawScore, finalContribution);

            // Show success
            Utils.showToast(`✓ Saved: ${studentName} - ${rawScore}/${this.currentConfig.test_marked_over}`, 'success');

            // Clear form and focus on name for next entry
            this.clearForm();

        } catch (error) {
            console.error('=== QUICK ENTRY ERROR ===');
            console.error('Error type:', error.name);
            console.error('Error message:', error.message);
            console.error('Full error:', error);
            console.error('Stack:', error.stack);
            Utils.showToast(`Error: ${error.message}`, 'error');
        }
    },

    /**
     * Add to recent entries list
     */
    addRecentEntry(name, rawScore, finalContribution) {
        this.recentEntries.unshift({
            name,
            rawScore,
            finalContribution,
            timestamp: new Date()
        });

        // Keep only last 10 entries
        if (this.recentEntries.length > 10) {
            this.recentEntries.pop();
        }

        this.updateRecentEntriesDisplay();
    },

    /**
     * Update recent entries display
     */
    updateRecentEntriesDisplay() {
        const container = document.getElementById('recentEntriesList');
        if (!container) return;

        if (this.recentEntries.length === 0) {
            container.innerHTML = '<p class="empty-state">No entries yet</p>';
            return;
        }

        const html = this.recentEntries.map(entry => `
            <div class="recent-entry">
                <span class="entry-name">${entry.name}</span>
                <span class="entry-score">${entry.rawScore}</span>
                <span class="entry-final">${Utils.formatNumber(entry.finalContribution, 2)} / 10</span>
            </div>
        `).join('');

        container.innerHTML = html;
    },

    /**
     * Clear form
     */
    clearForm() {
        document.getElementById('quickStudentName').value = '';
        document.getElementById('quickGender').value = '';
        document.getElementById('quickRawScore').value = '';
        document.getElementById('calculationPreview').textContent = 'Final: 0.00 / 10';
        document.getElementById('quickStudentName').focus();
    }
};
