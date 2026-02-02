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
            Utils.addClickHandler(loadBtn, () => this.loadMarks());
        }

        const saveBtn = document.getElementById('saveAllMarksBtn');
        if (saveBtn) {
            Utils.addClickHandler(saveBtn, () => this.saveAllMarks());
        }

        // Import Marks Button
        const importBtn = document.getElementById('importMarksBtn');
        const fileInput = document.getElementById('importMarksFile');

        if (importBtn && fileInput) {
            Utils.addClickHandler(importBtn, () => fileInput.click());
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
            console.log('[Mobile Debug] Starting loadMarks...');
            console.log('[Mobile Debug] Firebase available:', typeof firebase !== 'undefined');
            console.log('[Mobile Debug] Current user:', firebase?.auth()?.currentUser?.email);

            // Load configuration
            console.log('[Mobile Debug] Loading configuration...');
            this.currentConfig = await APIClient.getConfiguration(
                this.selectedClass,
                this.selectedSubject,
                this.selectedTerm
            );
            console.log('[Mobile Debug] Config loaded:', this.currentConfig);

            // Display configuration
            document.getElementById('displayMarkedOver').textContent = this.currentConfig.test_marked_over;
            document.getElementById('displayMaxAdded').textContent = this.currentConfig.max_added_marks;
            document.getElementById('configDisplay').style.display = 'flex';

            // Load students for this class
            console.log('[Mobile Debug] Loading students...');
            this.currentStudents = await APIClient.getStudentsByClass(this.selectedClass);
            console.log('[Mobile Debug] Students loaded:', this.currentStudents.length);
            this.currentStudents = Utils.sortBy(this.currentStudents, 'name', true);

            // Load existing marks
            console.log('[Mobile Debug] Loading marks...');
            this.currentMarks = await APIClient.getMarks(
                this.selectedClass,
                this.selectedSubject,
                this.selectedTerm
            );
            console.log('[Mobile Debug] Marks loaded:', this.currentMarks.length);

            // Build marks data map
            this.marksData = {};
            this.currentMarks.forEach(mark => {
                this.marksData[mark.student_id] = {
                    raw_score: mark.raw_score || 0,
                    added_mark: mark.added_mark || 0
                };
            });

            // Render table
            console.log('[Mobile Debug] Rendering table...');
            this.renderMarksTable();

            // Show table
            document.getElementById('marksTableContainer').style.display = 'block';
            document.getElementById('marksEmptyState').style.display = 'none';

            console.log('[Mobile Debug] Load complete!');
            Utils.hideLoading();
        } catch (error) {
            console.error('[Mobile Debug] Error in loadMarks:', error);
            console.error('[Mobile Debug] Error name:', error.name);
            console.error('[Mobile Debug] Error message:', error.message);
            console.error('[Mobile Debug] Error stack:', error.stack);
            
            Utils.hideLoading();
            
            if (error.message.includes("Log In")) {
                Utils.showToast('Session expired. Please log in again.', 'warning');
                setTimeout(() => window.location.href = 'login.html', 2000);
            } else {
                // Show detailed error for debugging
                const errorMsg = `Error loading marks: ${error.name} - ${error.message}. Check console for details.`;
                Utils.showToast(errorMsg, 'error');
            }
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
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No students in this class</td></tr>';
            return;
        }

        this.currentStudents.forEach((student, index) => {
            const studentMarks = this.marksData[student.id] || { raw_score: 0, added_mark: 0 };

            const rawScore = studentMarks.raw_score || 0;
            
            // **AUTO-FILL ADDED MARK FROM CONFIG**
            // If the added mark is 0 or undefined, OR if we want to enforce the config standard (simplest for "lazy user")
            // We'll use the current MarksData value if valid, otherwise default to config default
            // However, based on user request "I want to add for all", the ConfigManager update handles the live change.
            // Here we ensure initial load aligns or defaults correctly.
            let addedMark = studentMarks.added_mark;
            
            // If data is empty/new, default to config
            if (addedMark === undefined) {
                 addedMark = this.currentConfig.max_added_marks;
                 // Save back to local data structure
                 if (!this.marksData[student.id]) this.marksData[student.id] = {};
                 this.marksData[student.id].added_mark = addedMark;
                 this.marksData[student.id].raw_score = rawScore;
            }

            const tr = document.createElement('tr');
            tr.dataset.studentId = student.id;

            // Add staggered animation
            tr.style.opacity = '0';
            tr.classList.add('animate-fade-up');
            tr.style.animationDelay = `${index * 0.03}s`; // 30ms stagger

            // Student Name (Read-only)
            const nameTd = document.createElement('td');
            nameTd.textContent = student.name;
            nameTd.classList.add('readonly-cell');
            tr.appendChild(nameTd);

            // Raw test score (editable) - from imported marks
            const rawScoreCell = document.createElement('td');
            const rawScoreInput = document.createElement('input');
            rawScoreInput.type = 'number';
            rawScoreInput.value = rawScore;
            rawScoreInput.min = '0';
            rawScoreInput.step = '0.5';
            rawScoreInput.dataset.field = 'raw_score';
            rawScoreInput.dataset.studentId = student.id;
            rawScoreInput.addEventListener('input', (e) => this.handleMarkInput(e));
            rawScoreInput.addEventListener('blur', (e) => this.validateField(e));
            rawScoreCell.appendChild(rawScoreInput);
            tr.appendChild(rawScoreCell);

            // Added mark (editable) - Defaulted from Config
            const addedMarkCell = document.createElement('td');
            const addedMarkInput = document.createElement('input');
            addedMarkInput.type = 'number';
            addedMarkInput.value = addedMark;
            addedMarkInput.min = '0';
            addedMarkInput.step = '0.5';
            addedMarkInput.dataset.field = 'added_mark';
            addedMarkInput.dataset.studentId = student.id;
            addedMarkInput.addEventListener('input', (e) => this.handleMarkInput(e));
            addedMarkInput.addEventListener('blur', (e) => this.validateField(e));
            addedMarkCell.appendChild(addedMarkInput);
            tr.appendChild(addedMarkCell);

            // **TOTAL SCORE** (Raw + Added) - Read-only calculated field
            const totalScoreCell = document.createElement('td');
            totalScoreCell.className = 'calculated-cell';
            totalScoreCell.dataset.studentId = student.id;
            const totalScore = rawScore + addedMark;
            totalScoreCell.textContent = Utils.formatNumber(totalScore, 2);
            tr.appendChild(totalScoreCell);

            // Final contribution (calculated)
            const finalCell = document.createElement('td');
            finalCell.className = 'calculated-cell';
            finalCell.dataset.studentId = student.id;
            
            const finalValue = Validators.calculateFinalContributionFormatted(
                rawScore,
                addedMark,
                this.currentConfig.test_marked_over,
                this.currentConfig.test_contribution || 10
            );
            
            finalCell.textContent = finalValue;
            tr.appendChild(finalCell);

            tbody.appendChild(tr);
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
        // Validation removed: User requested full manual control without limits
        // The red error styling was blocking the "Live Update" visualization
        // So we remove the error class to allow any value.
        const input = event.target;
        input.classList.remove('error');
        
        // Remove error from row
        const row = input.closest('tr');
        if (row) {
            row.classList.remove('error-row');
        }
    },

    /**
     * Update final contribution cell and sync inputs for a student
     */
    updateFinalContribution(studentId) {
        const marks = this.marksData[studentId] || { raw_score: 0, added_mark: 0 };
        
        // SYNC INPUTS: Ensure the input fields match the data model
        // This is critical for the "Live Config Update" to reflect in the input box immediately
        const addedMarkInput = document.querySelector(`input[dataset-field="added_mark"][dataset-student-id="${studentId}"]`) || 
                               document.querySelector(`tr[data-student-id="${studentId}"] input[data-field="added_mark"]`);
        
        if (addedMarkInput && parseFloat(addedMarkInput.value) !== marks.added_mark) {
            addedMarkInput.value = marks.added_mark;
        }

        // Update Total Score calculation
        const totalScoreCell = document.querySelector(`.calculated-cell[data-student-id="${studentId}"]:nth-of-type(1)`) ||
                               document.querySelector(`tr[data-student-id="${studentId}"] .calculated-cell`);
                               
        if (totalScoreCell && totalScoreCell.textContent) {
             // Re-calculate simply: Raw + Added
             // Note: We need to find the specific cell correctly. 
             // The render function creates two .calculated-cell elements.
             // The first one is Total Score, the second is Final Contribution.
             // Let's target parent row to be safe.
             const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
             if (row) {
                 const totalCell = row.querySelectorAll('.calculated-cell')[0];
                 const totalVal = (marks.raw_score || 0) + (marks.added_mark || 0);
                 if (totalCell) totalCell.textContent = Utils.formatNumber(totalVal, 2);
             }
        }

        const finalValue = Validators.calculateFinalContributionFormatted(
            marks.raw_score,
            marks.added_mark,
            this.currentConfig.test_marked_over,
            this.currentConfig.test_contribution || 10
        );

        const finalCell = document.querySelector(`.calculated-cell[data-student-id="${studentId}"]`);
        // We need to target the LAST calculated cell which is Final Contribution
        const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
        if (row) {
             const finalContribCell = row.querySelectorAll('.calculated-cell');
             if (finalContribCell.length > 1) {
                 finalContribCell[1].textContent = finalValue;
             } else if (finalContribCell.length === 1) {
                 // Fallback if structure is different
                 finalContribCell[0].textContent = finalValue; 
             }
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

        const validExtensions = ['.csv', '.txt', '.xlsx', '.xls'];
        const isValid = validExtensions.some(ext => file.name.endsWith(ext));

        if (!isValid) {
            Utils.showToast('Please upload a CSV, TXT, or Excel file', 'error');
            return;
        }

        const reader = new FileReader();

        // Handle Excel files
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.onload = async (e) => {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    this.processimportedMarks(jsonData);
                } catch (error) {
                    console.error('Error parsing Excel:', error);
                    Utils.showToast('Error parsing Excel file', 'error');
                }
            };
            reader.readAsBinaryString(file);
        } else {
            // Handle CSV/TXT files
            reader.onload = async (e) => {
                try {
                    const text = e.target.result;
                    const data = Utils.parseCSV(text);
                    this.processimportedMarks(data);
                } catch (error) {
                    console.error('Error parsing CSV:', error);
                    Utils.showToast('Error parsing CSV file', 'error');
                }
            };
            reader.readAsText(file);
        }
    },

    /**
     * Process imported marks data (Common for CSV and Excel)
     */
    async processimportedMarks(data) {
        if (data.length === 0) {
            Utils.showToast('Import file is empty or invalid', 'error');
            return;
        }

        try {
            // 1. Identify missing students
            const existingNames = new Set(this.currentStudents.map(s => s.name.toLowerCase()));
            const newStudents = [];

            // To preserve file order for sorting later
            const fileNamesOrder = [];

            data.forEach(row => {
                const keys = Object.keys(row);
                // Look for 'name' column case-insensitive
                const nameKey = keys.find(k => k.toLowerCase().includes('name'));
                if (nameKey && row[nameKey]) {
                    const name = String(row[nameKey]).trim();
                    fileNamesOrder.push(name.toLowerCase());

                    if (!existingNames.has(name.toLowerCase())) {
                        newStudents.push(name);
                        existingNames.add(name.toLowerCase()); // Avoid adding same new student twice
                    }
                }
            });

            // 2. Add missing students if any
            if (newStudents.length > 0) {
                if (await Utils.showConfirm(`Found ${newStudents.length} new students in file. Add them to this class?`, 'Import New Students')) {
                    Utils.showLoading();

                    const studentsBatch = newStudents.map(name => ({
                        name: name,
                        class_id: this.selectedClass,
                        gender: 'Male' // Default
                    }));

                    await APIClient.importStudents(studentsBatch);

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

                // Flexible Column Matching
                const rawKey = keys.find(k => {
                    const l = k.toLowerCase();
                    return l.includes('raw') || (l.includes('test') && !l.includes('contribution')) || l === 'score';
                });

                // Flexible Added Mark Matching (exam, bonus, etc.)
                const addedKey = keys.find(k => {
                    const l = k.toLowerCase();
                    return l.includes('added') || l.includes('exam') || l.includes('bonus') || l.includes('ass') || l.includes('class') || l.includes('20');
                });

                if (nameKey && row[nameKey]) {
                    const name = String(row[nameKey]).trim().toLowerCase();
                    const studentId = nameMap[name];

                    if (studentId) {
                        // Ensure structure exists
                        if (!this.marksData[studentId]) {
                            this.marksData[studentId] = { raw_score: 0, added_mark: 0 };
                        }

                        // 1. RAW SCORE
                        if (rawKey && row[rawKey] !== undefined) {
                            const val = parseFloat(row[rawKey]);
                            if (!isNaN(val)) {
                                this.marksData[studentId].raw_score = Math.min(val, this.currentConfig.test_marked_over);
                            }
                        }

                        // 2. ADDED MARK
                        if (addedKey && row[addedKey] !== undefined) {
                            const val = parseFloat(row[addedKey]);
                            if (!isNaN(val)) {
                                this.marksData[studentId].added_mark = Math.min(val, this.currentConfig.max_added_marks);
                            }
                        } else if (!this.marksData[studentId].added_mark) {
                            // Default if missing
                            this.marksData[studentId].added_mark = this.currentConfig.max_added_marks || 20;
                        }
                        matchCount++;
                    }
                }
            });

            // 4. Sort table to match File order
            const orderMap = {};
            fileNamesOrder.forEach((name, index) => {
                orderMap[name] = index;
            });

            this.currentStudents.sort((a, b) => {
                const indexA = orderMap[a.name.toLowerCase()] !== undefined ? orderMap[a.name.toLowerCase()] : 999999;
                const indexB = orderMap[b.name.toLowerCase()] !== undefined ? orderMap[b.name.toLowerCase()] : 999999;
                return indexA - indexB;
            });

            this.renderMarksTable();
            Utils.showToast(`Imported marks for ${matchCount} students. Click 'Save All Marks' to persist.`, 'success');
            this.showSaveStatus('Unsaved imported data', 'saving');

        } catch (error) {
            console.error('Error processing import:', error);
            Utils.showToast('Error processing imported data', 'error');
            Utils.hideLoading();
        }
    }
};
