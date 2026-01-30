/**
 * Marks Table Manager
 * Handles the Excel-like marks entry table
 */

const MarksTable = {
    currentConfig: null,
    currentStudents: [],
    currentMarks: [],
    marksData: {}, // studentId -> { raw_score, added_mark }

    selectedClass: '',
    selectedSubject: '',
    selectedTerm: '',

    /**
     * Initialize marks table
     */
    async init() {
        await this.loadSelectOptions();
        this.attachEventListeners();
    },

    /**
     * Load select options
     */
    async loadSelectOptions() {
        try {
            const [classes, subjects, terms] = await Promise.all([
                APIClient.getClasses(),
                APIClient.getSubjects(),
                APIClient.getTerms()
            ]);

            this.populateSelect('marksClass', classes);
            this.populateSelect('marksSubject', subjects);
            this.populateSelect('marksTerm', terms);
        } catch (error) {
            console.error('Error loading select options:', error);
        }
    },

    /**
     * Populate select dropdown
     */
    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;

        while (select.options.length > 1) {
            select.remove(1);
        }

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
        const loadBtn = document.getElementById('loadMarksBtn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => this.loadMarks());
        }

        const saveBtn = document.getElementById('saveAllMarksBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAllMarks());
        }

        // Import Marks Button
        const importBtn = document.getElementById('importMarksBtn');
        const fileInput = document.getElementById('importMarksFile');

        if (importBtn && fileInput) {
            importBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleMarksImport(e));
        }
    },

    /**
     * Load marks for selected class, subject, term
     */
    async loadMarks() {
        this.selectedClass = document.getElementById('marksClass').value;
        this.selectedSubject = document.getElementById('marksSubject').value;
        this.selectedTerm = document.getElementById('marksTerm').value;

        if (!this.selectedClass || !this.selectedSubject || !this.selectedTerm) {
            Utils.triggerRobotAlert("BEEP BOOP! Select Class, Subject & Term first!");
            return;
        }

        try {
            Utils.showLoading();

            // Load configuration
            this.currentConfig = await APIClient.getConfiguration(
                this.selectedClass,
                this.selectedSubject,
                this.selectedTerm
            );

            // Display configuration
            document.getElementById('displayMarkedOver').textContent = this.currentConfig.test_marked_over;
            document.getElementById('displayMaxAdded').textContent = this.currentConfig.max_added_marks;
            document.getElementById('configDisplay').style.display = 'flex';

            // Load students for this class
            this.currentStudents = await APIClient.getStudentsByClass(this.selectedClass);
            this.currentStudents = Utils.sortBy(this.currentStudents, 'name', true);

            // Load existing marks
            this.currentMarks = await APIClient.getMarks(
                this.selectedClass,
                this.selectedSubject,
                this.selectedTerm
            );

            // Build marks data map
            this.marksData = {};
            this.currentMarks.forEach(mark => {
                this.marksData[mark.student_id] = {
                    raw_score: mark.raw_score || 0,
                    added_mark: mark.added_mark || 0
                };
            });

            // Render table
            this.renderMarksTable();

            // Show table
            document.getElementById('marksTableContainer').style.display = 'block';
            document.getElementById('marksEmptyState').style.display = 'none';

            Utils.hideLoading();
            Utils.hideLoading();
        } catch (error) {
            console.error('Error loading marks:', error);
            if (error.message.includes("Log In")) {
                Utils.showToast('Session expired. Please log in again.', 'warning');
                setTimeout(() => window.location.href = 'login.html', 2000);
            } else {
                // Show actual error for debugging
                Utils.showToast(`Error: ${error.message}`, 'error');
            }
            Utils.hideLoading();
        }
    },

    /**
     * Render marks table
     */
    renderMarksTable() {
        const tbody = document.getElementById('marksTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.currentStudents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No students in this class</td></tr>';
            return;
        }

        this.currentStudents.forEach((student, index) => {
            const studentMarks = this.marksData[student.id] || { raw_score: 0, added_mark: 0 };

            const tr = document.createElement('tr');
            tr.dataset.studentId = student.id;

            // Add staggered animation
            tr.style.opacity = '0';
            tr.classList.add('animate-fade-up');
            tr.style.animationDelay = `${index * 0.03}s`; // 30ms stagger

            // Student Name (Read-only)
            const nameTd = document.createElement('td');
            nameTd.textContent = student.name;
            nameTd.classList.add('readonly-cell'); // Keep original class
            tr.appendChild(nameTd);

            // Raw test score (editable)
            const rawScoreCell = document.createElement('td');
            const rawScoreInput = document.createElement('input');
            rawScoreInput.type = 'number';
            rawScoreInput.value = studentMarks.raw_score;
            rawScoreInput.min = '0';
            rawScoreInput.max = this.currentConfig.test_marked_over;
            rawScoreInput.step = '0.5';
            rawScoreInput.dataset.field = 'raw_score';
            rawScoreInput.dataset.studentId = student.id;
            rawScoreInput.addEventListener('input', (e) => this.handleMarkInput(e));
            rawScoreInput.addEventListener('blur', (e) => this.validateField(e));
            rawScoreCell.appendChild(rawScoreInput);
            row.appendChild(rawScoreCell);

            // Added mark (editable)
            const addedMarkCell = document.createElement('td');
            const addedMarkInput = document.createElement('input');
            addedMarkInput.type = 'number';
            addedMarkInput.value = studentMarks.added_mark;
            addedMarkInput.min = '0';
            addedMarkInput.max = this.currentConfig.max_added_marks;
            addedMarkInput.step = '0.5';
            addedMarkInput.dataset.field = 'added_mark';
            addedMarkInput.dataset.studentId = student.id;
            addedMarkInput.addEventListener('input', (e) => this.handleMarkInput(e));
            addedMarkInput.addEventListener('blur', (e) => this.validateField(e));
            addedMarkCell.appendChild(addedMarkInput);
            row.appendChild(addedMarkCell);

            // Final contribution (calculated)
            const finalCell = document.createElement('td');
            finalCell.className = 'calculated-cell';
            finalCell.dataset.studentId = student.id;
            const finalValue = Validators.calculateFinalContributionFormatted(
                studentMarks.raw_score,
                studentMarks.added_mark,
                this.currentConfig.test_marked_over,
                this.currentConfig.test_contribution || 10
            );
            finalCell.textContent = finalValue;
            row.appendChild(finalCell);

            tbody.appendChild(row);
        });
    },

    /**
     * Handle mark input (update marks data and recalculate)
     */
    handleMarkInput(event) {
        const input = event.target;
        const studentId = input.dataset.studentId;
        const field = input.dataset.field;
        const value = parseFloat(input.value) || 0;

        // Update marks data
        if (!this.marksData[studentId]) {
            this.marksData[studentId] = { raw_score: 0, added_mark: 0 };
        }
        this.marksData[studentId][field] = value;

        // Recalculate and update final contribution
        this.updateFinalContribution(studentId);

        // Show save indicator
        this.showSaveStatus('Unsaved changes', 'saving');
    },

    /**
     * Validate field on blur
     */
    validateField(event) {
        const input = event.target;
        const field = input.dataset.field;
        const value = input.value;

        let validation;
        if (field === 'raw_score') {
            validation = Validators.validateRawScore(value, this.currentConfig.test_marked_over);
        } else if (field === 'added_mark') {
            validation = Validators.validateAddedMark(value, this.currentConfig.max_added_marks);
        }

        if (!validation.valid) {
            input.classList.add('error');
            Utils.showToast(validation.error, 'error');

            // Mark row as error
            const row = input.closest('tr');
            if (row) {
                row.classList.add('error-row');
            }
        } else {
            input.classList.remove('error');

            // Remove error from row if no other errors
            const row = input.closest('tr');
            if (row) {
                const otherErrors = row.querySelectorAll('input.error');
                if (otherErrors.length === 0) {
                    row.classList.remove('error-row');
                }
            }
        }
    },

    /**
     * Update final contribution cell for a student
     */
    updateFinalContribution(studentId) {
        const marks = this.marksData[studentId] || { raw_score: 0, added_mark: 0 };
        const finalValue = Validators.calculateFinalContributionFormatted(
            marks.raw_score,
            marks.added_mark,
            this.currentConfig.test_marked_over,
            this.currentConfig.test_contribution || 10
        );

        const finalCell = document.querySelector(`.calculated-cell[data-student-id="${studentId}"]`);
        if (finalCell) {
            finalCell.textContent = finalValue;
        }
    },

    /**
     * Show save status
     */
    showSaveStatus(message, type = 'info') {
        const statusElement = document.getElementById('saveStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `save-status ${type}`;
        }
    },

    /**
     * Save all marks
     */
    async saveAllMarks() {
        // Check for errors
        const errorInputs = document.querySelectorAll('#marksTable input.error');
        if (errorInputs.length > 0) {
            Utils.showToast('Please fix validation errors before saving', 'error');
            return;
        }

        try {
            Utils.showLoading();
            this.showSaveStatus('Saving...', 'saving');

            // Prepare marks array
            const marksArray = [];
            Object.keys(this.marksData).forEach(studentId => {
                const marks = this.marksData[studentId];
                marksArray.push({
                    student_id: studentId,
                    class_id: this.selectedClass,
                    subject_id: this.selectedSubject,
                    term_id: this.selectedTerm,
                    raw_score: marks.raw_score,
                    added_mark: marks.added_mark
                });
            });

            // Save to backend
            await APIClient.saveMarks(marksArray);

            this.showSaveStatus('All changes saved', 'saved');
            Utils.hideLoading();

            // CELEBRATION TIME! 🎉
            Utils.triggerConfetti();
            Utils.showSuccessCheck();
            Utils.showToast('All marks saved successfully!', 'success');

            // Reload to reflect saved data
            await this.loadMarks();
        } catch (error) {
            console.error('Error saving all marks:', error);
            this.showSaveStatus('Error saving', 'error');
            Utils.showToast('Error saving marks', 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Get current marks data (for export)
     */
    getCurrentMarksData() {
        const data = [];

        this.currentStudents.forEach(student => {
            const marks = this.marksData[student.id] || { raw_score: 0, added_mark: 0 };
            const finalContribution = Validators.calculateFinalContribution(
                marks.raw_score,
                marks.added_mark,
                this.currentConfig.test_marked_over,
                this.currentConfig.test_contribution || 10
            );

            data.push({
                student_name: student.name,
                raw_score: marks.raw_score,
                added_mark: marks.added_mark,
                final_contribution: finalContribution
            });
        });

        return data;
    },

    /**
     * Handle CSV Marks Import
     * "Import the whole csv and it arrange the table exactly how the csv is"
     */
    async handleMarksImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Reset input
        event.target.value = '';

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
            Utils.showToast('Please upload a CSV or TXT file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const data = Utils.parseCSV(text);

                if (data.length === 0) {
                    Utils.showToast('CSV file is empty or invalid', 'error');
                    return;
                }

                // 1. Identify missing students
                const existingNames = new Set(this.currentStudents.map(s => s.name.toLowerCase()));
                const newStudents = [];
                const csvNamesOrder = []; // To preserve CSV order

                data.forEach(row => {
                    const keys = Object.keys(row);
                    const nameKey = keys.find(k => k.toLowerCase().includes('name'));
                    if (nameKey && row[nameKey]) {
                        const name = row[nameKey].trim();
                        csvNamesOrder.push(name.toLowerCase());

                        if (!existingNames.has(name.toLowerCase())) {
                            newStudents.push(name);
                            existingNames.add(name.toLowerCase()); // Avoid duplicates in new list
                        }
                    }
                });

                // 2. Add missing students if any
                if (newStudents.length > 0) {
                    if (await Utils.showConfirm(`Found ${newStudents.length} new students in CSV. Add them to this class?`, 'Import New Students')) {
                        Utils.showLoading();
                        for (const name of newStudents) {
                            await APIClient.addStudent({
                                name: name,
                                class_id: this.selectedClass
                            });
                        }
                        // Reload fresh list
                        this.currentStudents = await APIClient.getStudentsByClass(this.selectedClass);
                        Utils.hideLoading();
                        Utils.showToast(`Added ${newStudents.length} new students.`, 'success');
                    }
                }

                // 3. Update Marks Data
                const nameMap = {};
                this.currentStudents.forEach(s => {
                    if (s.name) nameMap[s.name.toLowerCase()] = s.id;
                });

                let matchCount = 0;
                data.forEach(row => {
                    const keys = Object.keys(row);
                    const nameKey = keys.find(k => k.toLowerCase().includes('name'));

                    // Mark Columns
                    // Mark Columns
                    const rawKey = keys.find(k => k.toLowerCase().includes('raw') || k.toLowerCase().includes('test') || k.toLowerCase().includes('score'));
                    const addedKey = keys.find(k => k.toLowerCase().includes('added') || k.toLowerCase().includes('exam') || k.toLowerCase().includes('bonus') || k.toLowerCase().includes('ass') || k.toLowerCase().includes('class') || k.includes('20'));

                    if (nameKey && row[nameKey]) {
                        const name = row[nameKey].trim().toLowerCase();
                        const studentId = nameMap[name];

                        if (studentId) {
                            // Ensure structure exists
                            if (!this.marksData[studentId]) {
                                this.marksData[studentId] = { raw_score: 0, added_mark: 0 };
                            }

                            // 1. RAW SCORE
                            if (rawKey && row[rawKey]) {
                                const val = parseFloat(row[rawKey]);
                                if (!isNaN(val)) this.marksData[studentId].raw_score = val;
                            }

                            // 2. ADDED MARK
                            if (addedKey && row[addedKey]) {
                                const val = parseFloat(row[addedKey]);
                                if (!isNaN(val)) {
                                    this.marksData[studentId].added_mark = val;
                                }
                            } else {
                                // If CSV column missing or empty, DEFAULT TO MAX
                                // We trust "added_mark" is 0 if not set, so checking if falsy is okay, 
                                // but specifically check for 0 or undefined to avoid overwriting real edits if possible (though import implies override).
                                // Actually, simpler rule: If key missing -> Default to Max.
                                if (!this.marksData[studentId].added_mark) {
                                    this.marksData[studentId].added_mark = this.currentConfig.max_added_marks || 20;
                                }
                            }
                            matchCount++;
                        }
                    }
                });

                // 4. Sort table to match CSV order
                // We create a map of name -> index in CSV
                const orderMap = {};
                csvNamesOrder.forEach((name, index) => {
                    orderMap[name] = index;
                });

                // Sort existing students: CSV names first (in order), then others
                this.currentStudents.sort((a, b) => {
                    const indexA = orderMap[a.name.toLowerCase()] !== undefined ? orderMap[a.name.toLowerCase()] : 999999;
                    const indexB = orderMap[b.name.toLowerCase()] !== undefined ? orderMap[b.name.toLowerCase()] : 999999;
                    return indexA - indexB;
                });

                this.renderMarksTable();
                Utils.showToast(`Imported marks for ${matchCount} students. Click 'Save All Marks' to persist.`, 'success');

            } catch (error) {
                console.error('Error importing marks:', error);
                Utils.showToast('Error parsing CSV', 'error');
                Utils.hideLoading();
            }
        };
        reader.readAsText(file);
    }
};
