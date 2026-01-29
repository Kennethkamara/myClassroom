/**
 * Student Manager
 * Handles student CRUD operations
 */

const StudentManager = {
    currentStudents: [],
    currentClassFilter: '',
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
            deleteClassBtn.addEventListener('click', () => this.deleteCurrentClass());
        }

        // Class filter
        const classFilter = document.getElementById('studentClassFilter');
        if (classFilter) {
            classFilter.addEventListener('change', (e) => {
                this.currentClassFilter = e.target.value;
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

        // Filter by search
        if (this.currentSearchTerm) {
            filtered = Utils.searchFilter(filtered, this.currentSearchTerm, ['name']);
        }

        // Sort by name
        filtered = Utils.sortBy(filtered, 'name', true);

        // Render
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr class="loading-row"><td colspan="4">No students found</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        filtered.forEach((student, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${student.name}</td>
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
    },

    /**
     * Show add student modal
     */
    showAddStudentModal() {
        this.editingStudentId = null;
        document.getElementById('studentModalTitle').textContent = 'Add Student';
        document.getElementById('studentName').value = '';

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

        this.editingStudentId = studentId;
        document.getElementById('studentModalTitle').textContent = 'Edit Student';
        document.getElementById('studentName').value = student.name;
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
        const classId = document.getElementById('studentClass').value;

        // Validation
        const nameValidation = Validators.validateStudentName(name);
        if (!nameValidation.valid) {
            Utils.showToast(nameValidation.error, 'error');
            return;
        }

        if (!classId) {
            Utils.showToast('Please select a class', 'error');
            return;
        }

        try {
            Utils.showLoading();

            const studentData = {
                name,
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
        if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
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

        // Reset input so same file can be selected again
        event.target.value = '';

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            Utils.showToast('Please upload a CSV file', 'error');
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

                // Basic validation/mapping
                // Expect headers like: "Name", "Class" (or "name", "class_id")
                // We'll normalize keys to lowercase match

                const validStudents = [];
                let skipCount = 0;

                // Get valid classes to map names to IDs if needed
                const classes = await APIClient.getClasses();
                const classMap = {};
                classes.forEach(c => {
                    classMap[c.name.toLowerCase()] = c.id;
                    classMap[c.id.toLowerCase()] = c.id;
                });

                for (const row of data) {
                    // Try to find name and class columns
                    // Keys might be "Student Name", "Name", "Full Name", etc.
                    const keys = Object.keys(row);
                    const nameKey = keys.find(k => k.toLowerCase().includes('name'));
                    const classKey = keys.find(k => k.toLowerCase().includes('class'));

                    if (nameKey && row[nameKey]) {
                        const name = row[nameKey].trim();
                        let classId = 'unknown';

                        // Try to map class name/id
                        if (classKey && row[classKey]) {
                            const classVal = row[classKey].trim().toLowerCase();
                            // try direct match or map match
                            if (classMap[classVal]) {
                                classId = classMap[classVal];
                            } else {
                                // Default to current filter or just keep as text if system allows (system expects IDs)
                                // If we can't map, we'll just set it to "Unassigned" or ID "1" if we must.
                                // For now, let's look for a class with ID '1' or use the first one.
                                classId = classes[0] ? classes[0].id : '';
                            }
                        } else {
                            // If no class column, use current filter if set
                            classId = this.currentClassFilter || (classes[0] ? classes[0].id : '');
                        }

                        validStudents.push({
                            name: name,
                            class_id: classId
                        });
                    } else {
                        skipCount++;
                    }
                }

                if (validStudents.length > 0) {
                    if (confirm(`Ready to import ${validStudents.length} students?`)) {
                        Utils.showLoading();
                        await APIClient.importStudents(validStudents);
                        await this.loadStudents();
                        Utils.hideLoading();
                        Utils.showToast(`Successfully imported ${validStudents.length} students`, 'success');
                    }
                } else {
                    Utils.showToast('No valid student data found in CSV. Headers should include "Name" and "Class".', 'error');
                }

            } catch (error) {
                console.error('Import error:', error);
                Utils.showToast('Error parsing CSV file', 'error');
            }
        };
        reader.readAsText(file);
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

        if (confirm(`Are you SURE you want to delete ALL students in ${className}? This cannot be undone.`)) {
            if (confirm(`Please confirm AGAIN. Delete ALL ${className} students?`)) {
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
