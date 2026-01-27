/**
 * Dummy Data for Development
 * Realistic dummy data for JSS 1 Integrated Science, 1st Term
 */

const DummyData = {
    // Classes (with subdivisions 101 and 102)
    classes: [
        { id: 'cls_1_101', name: 'JSS 1-101' },
        { id: 'cls_1_102', name: 'JSS 1-102' },
        { id: 'cls_2_101', name: 'JSS 2-101' },
        { id: 'cls_2_102', name: 'JSS 2-102' },
        { id: 'cls_3_101', name: 'JSS 3-101' },
        { id: 'cls_3_102', name: 'JSS 3-102' }
    ],

    // Subjects
    subjects: [
        { id: 'subj_1', name: 'Integrated Science' },
        { id: 'subj_2', name: 'Agriculture' },
        { id: 'subj_3', name: 'Mathematics' },
        { id: 'subj_4', name: 'English Language' }
    ],

    // Terms
    terms: [
        { id: 'term_1', name: '1st Term' },
        { id: 'term_2', name: '2nd Term' },
        { id: 'term_3', name: '3rd Term' }
    ],

    // Students (EMPTY - Add your own students via the Students tab)
    students: [],

    // Configuration (EMPTY - Configure via the Configuration tab)
    configurations: [],

    // Marks (EMPTY - Enter marks via the Mark Entry tab)
    marks: [],

    /**
     * Get all data (for initial load)
     */
    getAllData() {
        return {
            classes: this.classes,
            subjects: this.subjects,
            terms: this.terms,
            students: this.students,
            configurations: this.configurations,
            marks: this.marks
        };
    },

    /**
     * Get students by class
     */
    getStudentsByClass(classId) {
        return this.students.filter(s => s.class_id === classId);
    },

    /**
     * Get configuration
     */
    getConfiguration(classId, subjectId, termId) {
        return this.configurations.find(c =>
            c.class_id === classId &&
            c.subject_id === subjectId &&
            c.term_id === termId
        );
    },

    /**
     * Get marks
     */
    getMarks(classId, subjectId, termId) {
        return this.marks.filter(m =>
            m.class_id === classId &&
            m.subject_id === subjectId &&
            m.term_id === termId
        );
    },

    /**
     * Get class name by ID
     */
    getClassName(classId) {
        const cls = this.classes.find(c => c.id === classId);
        return cls ? cls.name : '';
    },

    /**
     * Get subject name by ID
     */
    getSubjectName(subjectId) {
        const subj = this.subjects.find(s => s.id === subjectId);
        return subj ? subj.name : '';
    },

    /**
     * Get term name by ID
     */
    getTermName(termId) {
        const term = this.terms.find(t => t.id === termId);
        return term ? term.name : '';
    },

    /**
     * Get student name by ID
     */
    getStudentName(studentId) {
        const student = this.students.find(s => s.id === studentId);
        return student ? student.name : '';
    }
};
