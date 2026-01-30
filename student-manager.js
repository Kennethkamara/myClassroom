/**
 * Student Manager
 * Handles student CRUD operations
 */

const StudentManager = {
    currentStudents: [],
    classes: [], // Store classes for lookup
    currentClassFilter: '',
    currentGenderFilter: '',
    currentSearchTerm: '',
    editingStudentId: null,

    /**
     * Initialize student manager
     */
    async init() {
        await this.loadSelectOptions();
        await this.loadStudents();
        this.attachEventListeners();
    },

    /**
     * Load options for select dropdowns
     */
    async loadSelectOptions() {
        try {
            const classes = await APIClient.getClasses();
            this.classes = classes; // Save for later use

            this.populateSelect('studentClassFilter', classes, true);
            this.populateSelect('studentClass', classes, false);
        } catch (error) {
            console.error('Error loading select options:', error);
        }
    },

    /**
     * Populate select dropdown
     */
    populateSelect(selectId, options, includeAll = false) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Clear existing options except first
        while (select.options.length > (includeAll ? 1 : 1)) {
            select.remove(includeAll ? 1 : 1);
        }

        // Add options
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
        // Add student button
        const addBtn = document.getElementById('addStudentBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddStudentModal());
        }

        // Import student button
        const importBtn = document.getElementById('importStudentBtn');
        const fileInput = document.getElementById('importStudentFile');

        if (importBtn && fileInput) {
            importBtn.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', (e) => this.handleImport(e));
        }

        // Delete Class Button
        const deleteClassBtn = document.getElementById('deleteClassBtn');
        if (deleteClassBtn) {
            deleteClassBtn.addEventListener('click', () => {
                console.log("Delete Class Button Clicked!");
                this.deleteCurrentClass();
            });
        }

        // Class filter
        const classFilter = document.getElementById('studentClassFilter');
        if (classFilter) {
            classFilter.addEventListener('change', (e) => {
                this.currentClassFilter = e.target.value;
                this.renderStudentsTable();
            });
        }

        // Gender filter
        const genderFilter = document.getElementById('studentGenderFilter');
        if (genderFilter) {
            genderFilter.addEventListener('change', (e) => {
                this.currentGenderFilter = e.target.value;
                this.renderStudentsTable();
            });
        }

        // Search
        const searchInput = document.getElementById('studentSearch');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.currentSearchTerm = e.target.value;
                this.renderStudentsTable();
            }, 300));
        }

        // Modal events
        const closeModal = document.getElementById('closeStudentModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.hideModal());
        }

        const cancelBtn = document.getElementById('cancelStudentBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideModal());
        }

        const saveBtn = document.getElementById('saveStudentBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveStudent());
        }
    },

    /**
     * Update student gender (inline editing from table)
     */
    async updateStudentGender(studentId, newGender) {
        try {
            const studentIndex = this.currentStudents.findIndex(s => s.id === studentId);
            if (studentIndex === -1) return;

            // Optimistic update
            const oldGender = this.currentStudents[studentIndex].gender;
            this.currentStudents[studentIndex].gender = newGender;

            // Recalculate counts immediately based on source of truth
            this.updateGenderCounts();

            await APIClient.updateStudent(studentId, {
                name: this.currentStudents[studentIndex].name,
                gender: newGender,
                class_id: this.currentStudents[studentIndex].class_id
            });

            Utils.showToast(`Gender updated to ${newGender === 'Male' ? '♂️ Male' : '♀️ Female'}`, 'success');
        } catch (error) {
            console.error('Error updating student gender:', error);
            // Revert optimistic update
            const studentIndex = this.currentStudents.findIndex(s => s.id === studentId);
            if (studentIndex !== -1) {
                // We'd ideally need the old value passed in or stored, but simpler to just reload or let user try again.
                // For now, let's just warn.
            }
            Utils.showToast('Failed to update gender', 'error');
            // Reload to ensure consistency
            this.loadStudents();
        }
    },

    /**
     * Helper to update gender counts from currentStudents
     */
    updateGenderCounts() {
        // We need to respect the current filters effectively
        // Actually, the main "Total" usually refers to the CURRENT filtered view.
        // Let's re-use the logic from renderStudentsTable roughly or just operate on current visible if possible.
        // However, rendersStudentsTable filters `this.currentStudents`.

        // To be safe and consistent with UI, we should probably just re-run the calculation logic
        // that renderStudentsTable uses, BUT avoiding full re-render if possible.
        // The previous implementation tried to parse DOM. 

        // Let's filter like renderStudentsTable does:
        let filtered = [...this.currentStudents];

        if (this.currentClassFilter) {
            filtered = filtered.filter(s => s.class_id === this.currentClassFilter);
        }
        if (this.currentGenderFilter) {
            filtered = filtered.filter(s => s.gender === this.currentGenderFilter);
        }
        if (this.currentSearchTerm) {
            filtered = Utils.searchFilter(filtered, this.currentSearchTerm, ['name']);
        }

        const maleCount = filtered.filter(s => s.gender === 'Male').length;
        const femaleCount = filtered.filter(s => s.gender === 'Female').length;
        const totalCount = filtered.length;

        document.getElementById('maleCount').textContent = maleCount;
        document.getElementById('femaleCount').textContent = femaleCount;
        document.getElementById('totalCount').textContent = totalCount;
    },

    /**
     * Load students
     */
    async loadStudents() {
        try {
            Utils.showLoading();
            this.currentStudents = await APIClient.getStudents();
            await this.renderStudentsTable();
            Utils.hideLoading();
        } catch (error) {
            console.error('Error loading students:', error);
            Utils.showToast('Error loading students', 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Render students table
     */
    async renderStudentsTable() {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;

        // Get classes for display
        const classes = await APIClient.getClasses();
        const classMap = {};
        classes.forEach(c => {
            classMap[c.id] = c.name;
        });

        // Filter students
        let filtered = [...this.currentStudents];

        // Filter by class
        if (this.currentClassFilter) {
            filtered = filtered.filter(s => s.class_id === this.currentClassFilter);
        }

        // Filter by gender
        if (this.currentGenderFilter) {
            filtered = filtered.filter(s => s.gender === this.currentGenderFilter);
        }

        // Filter by search
        if (this.currentSearchTerm) {
            filtered = Utils.searchFilter(filtered, this.currentSearchTerm, ['name']);
        }

        // Calculate and display counts
        const maleCount = filtered.filter(s => s.gender === 'Male').length;
        const femaleCount = filtered.filter(s => s.gender === 'Female').length;
        const totalCount = filtered.length;

        document.getElementById('maleCount').textContent = maleCount;
        document.getElementById('femaleCount').textContent = femaleCount;
        document.getElementById('totalCount').textContent = totalCount;

        // Sort by name
        filtered = Utils.sortBy(filtered, 'name', true);

        // Render
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr class="loading-row"><td colspan="5">No students found</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        filtered.forEach((student, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${student.name}</td>
                    <select class="form-control gender-select" data-student-id="${student.id}" data-old-gender="${student.gender || ''}" style="padding: 0.4rem; font-size: 0.9rem;">
                        <option value="">Select Gender</option>
                        <option value="Male" ${student.gender === 'Male' ? 'selected' : ''}>♂️ Male</option>
                        <option value="Female" ${student.gender === 'Female' ? 'selected' : ''}>♀️ Female</option>
                    </select>
                </td>
                <td>${classMap[student.class_id] || 'Unknown'}</td>
                <td>
                    <button class="btn btn-edit" onclick="StudentManager.editStudent('${student.id}')">
                        <span>✏️</span> Edit
                    </button>
                    <button class="btn btn-danger" onclick="StudentManager.deleteStudent('${student.id}')">
                        <span>🗑️</span> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners to gender dropdowns for inline editing
        document.querySelectorAll('.gender-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const studentId = e.target.dataset.studentId;
                const newGender = e.target.value;
                this.updateStudentGender(studentId, newGender);
            });
        });
    },

    /**
     * Show add student modal
     */
    showAddStudentModal() {
        this.editingStudentId = null;
        document.getElementById('studentModalTitle').textContent = 'Add Student';
        document.getElementById('studentName').value = '';
        document.getElementById('studentGender').value = '';

        // AUTO-SELECT CLASS FROM FILTER (bulk entry feature)
        const selectedClass = document.getElementById('studentClassFilter').value;
        document.getElementById('studentClass').value = selectedClass || '';

        const modal = document.getElementById('studentModal');
        if (modal) {
            modal.classList.add('active');
        }

        // Auto-focus name input for quick entry
        setTimeout(() => {
            const nameInput = document.getElementById('studentName');
            if (nameInput) nameInput.focus();
        }, 100);
    },

    /**
     * Show edit student modal
     */
    editStudent(studentId) {
        const student = this.currentStudents.find(s => s.id === studentId);
        if (!student) return;

        this.editingStudentId = student.id;
        document.getElementById('studentModalTitle').textContent = 'Edit Student';
        document.getElementById('studentName').value = student.name;
        document.getElementById('studentGender').value = student.gender || '';
        document.getElementById('studentClass').value = student.class_id;

        const modal = document.getElementById('studentModal');
        if (modal) {
            modal.classList.add('active');
        }
    },

    /**
     * Hide modal
     */
    hideModal() {
        const modal = document.getElementById('studentModal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.editingStudentId = null;
    },

    /**
     * Save student (add or update)
     */
    async saveStudent() {
        const name = document.getElementById('studentName').value.trim();
        const gender = document.getElementById('studentGender').value;
        const classId = document.getElementById('studentClass').value;

        // Validation
        const nameValidation = Validators.validateStudentName(name);
        if (!nameValidation.valid) {
            Utils.showToast(nameValidation.error, 'error');
            return;
        }

        if (!gender) {
            Utils.showToast('Please select gender', 'error');
            return;
        }

        try {
            Utils.showLoading();

            const studentData = {
                name,
                gender,
                class_id: classId
            };

            if (this.editingStudentId) {
                // Update
                await APIClient.updateStudent(this.editingStudentId, studentData);
                Utils.showToast('Student updated successfully!', 'success');
                this.hideModal();
            } else {
                // Add - KEEP MODAL OPEN FOR BULK ENTRY
                await APIClient.addStudent(studentData);
                Utils.showToast(`✅ ${name} added!`, 'success');

                // Clear name but KEEP class selected
                document.getElementById('studentName').value = '';
                document.getElementById('studentGender').value = '';
                document.getElementById('studentName').focus();

                // Don't close modal - allow adding more students
            }

            await this.loadStudents();
            Utils.hideLoading();
        } catch (error) {
            console.error('Error saving student:', error);
            Utils.showToast('Error saving student', 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Delete student
     */
    async deleteStudent(studentId) {
        if (!await Utils.showConfirm('Are you sure you want to delete this student? This action cannot be undone.', 'Delete Student')) {
            return;
        }

        try {
            Utils.showLoading();
            await APIClient.deleteStudent(studentId);
            Utils.showToast('Student deleted successfully!', 'success');
            await this.loadStudents();
            Utils.hideLoading();
        } catch (error) {
            console.error('Error deleting student:', error);
            Utils.showToast('Error deleting student', 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Handle CSV Import
     */
    async handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Reset input
        event.target.value = '';

        const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        const validExtensions = ['.csv', '.xls', '.xlsx'];

        const isValid = validExtensions.some(ext => file.name.endsWith(ext));

        if (!isValid) {
            Utils.showToast('Please upload a CSV or Excel file', 'error');
            return;
        }

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = e.target.result;
                let jsonData = [];

                if (file.name.endsWith('.csv')) {
                    // Manual CSV parsing or use SheetJS if preferred, keeping Utils.parseCSV for now for backward compat
                    // But actually, SheetJS handles CSV robustly too. Let's use SheetJS for EVERYTHING to be safe.
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    jsonData = XLSX.utils.sheet_to_json(firstSheet);
                } else {
                    // Excel
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    jsonData = XLSX.utils.sheet_to_json(firstSheet);
                }

                if (jsonData.length === 0) {
                    // Fallback to text parsing if SheetJS returns empty for CSV (sometimes specific encodings)
                    if (file.name.endsWith('.csv')) {
                        jsonData = Utils.parseCSV(data);
                    } else {
                        Utils.showToast('File is empty or invalid', 'error');
                        return;
                    }
                }

                if (jsonData.length === 0) {
                    Utils.showToast('No data found in file', 'error');
                    return;
                }

                // Process Import Data
                await this.processImportData(jsonData);

            } catch (error) {
                console.error('Import error:', error);
                Utils.showToast('Error parsing file: ' + error.message, 'error');
            }
        };

        // Read as binary string for XLSX compatibility
        reader.readAsBinaryString(file);
    },

    /**
     * Process imported JSON data
     */
    async processImportData(data) {
        const validStudents = [];
        let skipCount = 0;

        // Get valid classes to map names to IDs if needed
        const classes = await APIClient.getClasses();
        const classMap = {};
        classes.forEach(c => {
            classMap[c.name.toLowerCase()] = c.id;
            classMap[c.id.toLowerCase()] = c.id;
            // Also map clean versions (e.g. "JSS 1 A" -> "jss1a")
            classMap[c.name.replace(/\s/g, '').toLowerCase()] = c.id;
        });

        for (const row of data) {
            // Keys might be "Student Name", "Name", "Full Name", etc.
            // Normalize keys to lowercase for searching
            const keys = Object.keys(row);
            const nameKey = keys.find(k => k.toLowerCase().includes('name'));
            const classKey = keys.find(k => k.toLowerCase().includes('class'));
            const genderKey = keys.find(k => k.toLowerCase().includes('gender') || k.toLowerCase().includes('sex'));

            if (nameKey && row[nameKey]) {
                const name = String(row[nameKey]).trim();
                let classId = 'unknown';
                let gender = '';

                // Try to map class name/id
                if (classKey && row[classKey]) {
                    const classVal = String(row[classKey]).trim().toLowerCase();
                    const cleanClassVal = classVal.replace(/\s/g, ''); // handle "JSS 1" vs "JSS1"

                    if (classMap[classVal]) {
                        classId = classMap[classVal];
                    } else if (classMap[cleanClassVal]) {
                        classId = classMap[cleanClassVal];
                    } else {
                        // Default to current filter or first class
                        classId = this.currentClassFilter || (classes[0] ? classes[0].id : '');
                    }
                } else {
                    // If no class column, use current filter if set
                    classId = this.currentClassFilter || (classes[0] ? classes[0].id : '');
                }

                // Try to map gender
                if (genderKey && row[genderKey]) {
                    const gVal = String(row[genderKey]).trim().toLowerCase();
                    if (gVal.startsWith('m')) gender = 'Male';
                    else if (gVal.startsWith('f')) gender = 'Female';
                }

                validStudents.push({
                    name: name,
                    class_id: classId,
                    gender: gender // New Field
                });
            } else {
                skipCount++;
            }
        }

        if (validStudents.length > 0) {
            if (await Utils.showConfirm(`Ready to import ${validStudents.length} students?`, 'Import Students')) {
                Utils.showLoading();
                await APIClient.importStudents(validStudents);
                await this.loadStudents();
                Utils.hideLoading();
                Utils.showToast(`Successfully imported ${validStudents.length} students`, 'success');
            }
        } else {
            Utils.showToast('No valid student data found. Headers should include "Name" and optionally "Class" and "Gender".', 'error');
        }
    },

    /**
     * Delete all students in the currently selected class
     */
    async deleteCurrentClass() {
        if (!this.currentClassFilter) {
            Utils.showToast("Please select a class filter first to delete all students in it.", "warning");
            return;
        }

        const className = this.classes.find(c => c.id === this.currentClassFilter)?.name || "Selected Class";

        if (await Utils.showConfirm(`Are you SURE you want to delete ALL students in ${className}? This cannot be undone.`, 'Delete Class')) {
            if (await Utils.showConfirm(`Please confirm AGAIN. Delete ALL ${className} students?`, 'Final Confirmation')) {
                Utils.showLoading();
                const success = await APIClient.deleteStudentsByClass(this.currentClassFilter);
                if (success) {
                    Utils.showToast("Class deleted successfully.", "success");
                    await this.loadStudents();
                }
                Utils.hideLoading();
            }
        }
    }
};
