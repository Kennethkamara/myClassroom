/**
 * API Client
 * Handles communication with Google Sheets backend
 * 
 * For now, uses dummy data with localStorage persistence
 * Can be extended to use Google Apps Script or Google Sheets API
 */

const APIClient = {
    // Configuration
    USE_DUMMY_DATA: true, // Set to false when connecting to Google Sheets
    GOOGLE_SCRIPT_URL: '', // Add your Google Apps Script deployment URL here

    // Local storage keys
    STORAGE_KEYS: {
        CLASSES: 'cmt_classes',
        SUBJECTS: 'cmt_subjects',
        TERMS: 'cmt_terms',
        STUDENTS: 'cmt_students',
        CONFIGURATIONS: 'cmt_configurations',
        MARKS: 'cmt_marks'
    },

    /**
     * Initialize data (load from localStorage or use dummy data)
     */
    async init() {
        if (this.USE_DUMMY_DATA) {
            // Check if data exists in localStorage
            const hasData = Utils.getLocalStorage(this.STORAGE_KEYS.STUDENTS);

            if (!hasData) {
                // First time - load dummy data into localStorage
                const data = DummyData.getAllData();
                Utils.setLocalStorage(this.STORAGE_KEYS.CLASSES, data.classes);
                Utils.setLocalStorage(this.STORAGE_KEYS.SUBJECTS, data.subjects);
                Utils.setLocalStorage(this.STORAGE_KEYS.TERMS, data.terms);
                Utils.setLocalStorage(this.STORAGE_KEYS.STUDENTS, data.students);
                Utils.setLocalStorage(this.STORAGE_KEYS.CONFIGURATIONS, data.configurations);
                Utils.setLocalStorage(this.STORAGE_KEYS.MARKS, data.marks);
            }
        }
    },

    /**
     * Fetch data from a sheet
     */
    async fetchData(sheetName) {
        if (this.USE_DUMMY_DATA) {
            // Return from localStorage
            return Utils.getLocalStorage(this.STORAGE_KEYS[sheetName.toUpperCase()], []);
        }

        // TODO: Implement Google Sheets API call
        try {
            const response = await fetch(`${this.GOOGLE_SCRIPT_URL}?action=get&sheet=${sheetName}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    },

    /**
     * Get all classes
     */
    async getClasses() {
        return this.fetchData('CLASSES');
    },

    /**
     * Get all subjects
     */
    async getSubjects() {
        return this.fetchData('SUBJECTS');
    },

    /**
     * Get all terms
     */
    async getTerms() {
        return this.fetchData('TERMS');
    },

    /**
     * Get all students
     */
    async getStudents() {
        return this.fetchData('STUDENTS');
    },

    /**
     * Get students by class
     */
    async getStudentsByClass(classId) {
        const students = await this.getStudents();
        return students.filter(s => s.class_id === classId);
    },

    /**
     * Add new student
     */
    async addStudent(studentData) {
        if (this.USE_DUMMY_DATA) {
            const students = Utils.getLocalStorage(this.STORAGE_KEYS.STUDENTS, []);

            // Generate sequential ID (e.g., 1, 2, 3...)
            const maxId = students.length > 0
                ? Math.max(...students.map(s => parseInt(s.id) || 0))
                : 0;

            const newStudent = {
                id: String(maxId + 1),
                ...studentData
            };
            students.push(newStudent);
            Utils.setLocalStorage(this.STORAGE_KEYS.STUDENTS, students);
            return newStudent;
        }

        // TODO: Implement Google Sheets API call
    },

    /**
     * Update student
     */
    async updateStudent(studentId, studentData) {
        if (this.USE_DUMMY_DATA) {
            const students = Utils.getLocalStorage(this.STORAGE_KEYS.STUDENTS, []);
            const index = students.findIndex(s => s.id === studentId);
            if (index !== -1) {
                students[index] = { ...students[index], ...studentData };
                Utils.setLocalStorage(this.STORAGE_KEYS.STUDENTS, students);
                return students[index];
            }
            return null;
        }

        // TODO: Implement Google Sheets API call
    },

    /**
     * Delete student
     */
    async deleteStudent(studentId) {
        if (this.USE_DUMMY_DATA) {
            const students = Utils.getLocalStorage(this.STORAGE_KEYS.STUDENTS, []);
            const filtered = students.filter(s => s.id !== studentId);
            Utils.setLocalStorage(this.STORAGE_KEYS.STUDENTS, filtered);
            return true;
        }

        // TODO: Implement Google Sheets API call
    },

    /**
     * Get configuration
     */
    async getConfiguration(classId, subjectId, termId) {
        const configurations = await this.fetchData('CONFIGURATIONS');
        return configurations.find(c =>
            c.class_id === classId &&
            c.subject_id === subjectId &&
            c.term_id === termId
        ) || {
            test_marked_over: 100,
            max_added_marks: 20
        };
    },

    /**
     * Save configuration
     */
    async saveConfiguration(configData) {
        if (this.USE_DUMMY_DATA) {
            const configurations = Utils.getLocalStorage(this.STORAGE_KEYS.CONFIGURATIONS, []);

            // Find existing config
            const index = configurations.findIndex(c =>
                c.class_id === configData.class_id &&
                c.subject_id === configData.subject_id &&
                c.term_id === configData.term_id
            );

            if (index !== -1) {
                // Update existing
                configurations[index] = { ...configurations[index], ...configData };
            } else {
                // Create new
                const newConfig = {
                    id: Utils.generateId(),
                    ...configData
                };
                configurations.push(newConfig);
            }

            Utils.setLocalStorage(this.STORAGE_KEYS.CONFIGURATIONS, configurations);
            return true;
        }

        // TODO: Implement Google Sheets API call
    },

    /**
     * Get marks
     */
    async getMarks(classId, subjectId, termId) {
        const marks = await this.fetchData('MARKS');
        return marks.filter(m =>
            m.class_id === classId &&
            m.subject_id === subjectId &&
            m.term_id === termId
        );
    },

    /**
     * Save mark
     */
    async saveMark(markData) {
        if (this.USE_DUMMY_DATA) {
            const marks = Utils.getLocalStorage(this.STORAGE_KEYS.MARKS, []);

            // Find existing mark
            const index = marks.findIndex(m =>
                m.student_id === markData.student_id &&
                m.class_id === markData.class_id &&
                m.subject_id === markData.subject_id &&
                m.term_id === markData.term_id
            );

            if (index !== -1) {
                // Update existing
                marks[index] = { ...marks[index], ...markData };
            } else {
                // Create new
                const newMark = {
                    id: Utils.generateId(),
                    ...markData
                };
                marks.push(newMark);
            }

            Utils.setLocalStorage(this.STORAGE_KEYS.MARKS, marks);
            return true;
        }

        // TODO: Implement Google Sheets API call
    },

    /**
     * Save multiple marks (batch operation)
     */
    async saveMarks(marksArray) {
        for (const markData of marksArray) {
            await this.saveMark(markData);
        }
        return true;
    },

    /**
     * Clear all data (for testing)
     */
    clearAllData() {
        if (this.USE_DUMMY_DATA) {
            Object.values(this.STORAGE_KEYS).forEach(key => {
                Utils.removeLocalStorage(key);
            });
        }
    },

    /**
     * Reset to dummy data
     */
    resetToDummyData() {
        this.clearAllData();
        // Force synchronous initialization
        const data = DummyData.getAllData();
        Utils.setLocalStorage(this.STORAGE_KEYS.CLASSES, data.classes);
        Utils.setLocalStorage(this.STORAGE_KEYS.SUBJECTS, data.subjects);
        Utils.setLocalStorage(this.STORAGE_KEYS.TERMS, data.terms);
        Utils.setLocalStorage(this.STORAGE_KEYS.STUDENTS, data.students);
        Utils.setLocalStorage(this.STORAGE_KEYS.CONFIGURATIONS, data.configurations);
        Utils.setLocalStorage(this.STORAGE_KEYS.MARKS, data.marks);
    }
};

// Initialize on load - make it synchronous
if (typeof document !== 'undefined') {
    // Initialize immediately (synchronous)
    const data = DummyData.getAllData();
    if (!localStorage.getItem('cmt_students')) {
        localStorage.setItem('cmt_classes', JSON.stringify(data.classes));
        localStorage.setItem('cmt_subjects', JSON.stringify(data.subjects));
        localStorage.setItem('cmt_terms', JSON.stringify(data.terms));
        localStorage.setItem('cmt_students', JSON.stringify(data.students));
        localStorage.setItem('cmt_configurations', JSON.stringify(data.configurations));
        localStorage.setItem('cmt_marks', JSON.stringify(data.marks));
    }
}
