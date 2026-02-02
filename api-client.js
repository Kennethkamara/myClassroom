/**
 * API Client
 * Handles communication with Google Sheets backend
 * 
 * For now, uses dummy data with localStorage persistence
 * Can be extended to use Google Apps Script or Google Sheets API
 */

const APIClient = {
    // Configuration
    USE_FIREBASE: true,

    // Local storage keys (Fallback / Cache)
    STORAGE_KEYS: {
        CLASSES: 'cmt_classes',
        SUBJECTS: 'cmt_subjects',
        TERMS: 'cmt_terms',
        STUDENTS: 'cmt_students',
        CONFIGURATIONS: 'cmt_configurations',
        MARKS: 'cmt_marks'
    },

    /**
     * Initialize data
     */
    async init() {
        if (this.USE_FIREBASE) {
            // Firestore is initialized in firebase-config.js
            console.log("Using Firebase Firestore");
        }
    },

    // ==========================================
    // Core Data Methods (Firestore Implementation)
    // ==========================================

    async getClasses() {
        try {
            // Always return static classes for simplicity, regardless of Firebase state
            if (typeof DummyData !== 'undefined') return DummyData.classes;
            return [];
        } catch (error) {
            console.error("Error fetching classes:", error);
            return [];
        }
    },

    /**
     * Get all subjects
     */
    async getSubjects() {
        try {
            if (typeof DummyData !== 'undefined') return DummyData.subjects;
            return [];
        } catch (e) { return []; }
    },

    /**
     * Get all terms
     */
    async getTerms() {
        try {
            if (typeof DummyData !== 'undefined') return DummyData.terms;
            return [];
        } catch (e) { return []; }
    },

    /**
     * Get all students (internal helper, mostly unused directly in UI)
     */
    async getStudents() {
        if (!this.USE_FIREBASE) return [];

        const user = firebase.auth().currentUser;
        if (!user) return [];

        try {
            // Fetch ALL students for this teacher
            const q = firebase.firestore().collection("students")
                .where("teacher_id", "==", user.uid);

            const querySnapshot = await q.get();
            const students = [];
            querySnapshot.forEach((doc) => {
                students.push({ id: doc.id, ...doc.data() });
            });
            return students;
        } catch (e) {
            console.error("Error getting students: ", e);
            Utils.showToast("Error loading students", "error");
            return [];
        }
    },

    /**
     * Get students by class
     */
    async getStudentsByClass(classId) {
        const students = await this.getStudents();
        return students.filter(s => s.class_id === classId);
    },

    /**
     * Update student
     */
    async updateStudent(studentId, studentData) {
        if (!this.USE_FIREBASE) { // Assuming USE_DUMMY_DATA is implied if not using Firebase
            const students = Utils.getLocalStorage(this.STORAGE_KEYS.STUDENTS, []);
            const index = students.findIndex(s => s.id === studentId);
            if (index !== -1) {
                students[index] = { ...students[index], ...studentData };
                Utils.setLocalStorage(this.STORAGE_KEYS.STUDENTS, students);
                return students[index];
            }
            return null;
        }
        // Firebase update implementation
        const user = firebase.auth().currentUser;
        if (!user) return null;

        try {
            await firebase.firestore().collection("students").doc(studentId).update(studentData);
            return { id: studentId, ...studentData };
        } catch (e) {
            console.error("Error updating student:", e);
            return null;
        }
    },



    /**
     * Add a new student
     */
    async addStudent(student) {
        const user = firebase.auth().currentUser;
        if (!user) return { status: 'error', message: 'Not logged in' };

        try {
            // Add teacher_id to the student object
            const studentData = {
                ...student,
                teacher_id: user.uid,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await firebase.firestore().collection("students").add(studentData);
            return { status: 'success', message: 'Student added', id: docRef.id };
        } catch (e) {
            console.error("Error adding student: ", e);
            return { status: 'error', message: e.message };
        }
    },

    /**
     * Import multiple students (CSV)
     */
    async importStudents(students) {
        const user = firebase.auth().currentUser;
        if (!user) return { status: 'error', message: 'Not logged in' };

        const batch = firebase.firestore().batch();
        const studentsRef = firebase.firestore().collection("students");

        try {
            students.forEach(student => {
                const docRef = studentsRef.doc(); // Auto-ID
                batch.set(docRef, {
                    ...student,
                    teacher_id: user.uid,
                    created_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            return { status: 'success', message: `${students.length} students imported` };
        } catch (e) {
            console.error("Error importing students: ", e);
            return { status: 'error', message: e.message };
        }
    },


    /**
     * Delete student
     */
    async deleteStudent(studentId) {
        if (!this.USE_FIREBASE) return;

        try {
            await firebase.firestore().collection("students").doc(studentId).delete();
            return { status: 'success' };
        } catch (e) {
            console.error("Error deleting student: ", e);
            throw e;
        }
    },

    /**
     * Get configuration
     */
    async getConfiguration(classId, subjectId, termId) {
        if (!this.USE_FIREBASE) return DummyData.configurations[0]; // Fallback

        const user = firebase.auth().currentUser;
        if (!user) throw new Error("Please Log In");

        try {
            const q = firebase.firestore().collection("configurations")
                .where("teacher_id", "==", user.uid)
                .where("class_id", "==", classId)
                .where("subject_id", "==", subjectId)
                .where("term_id", "==", termId);

            const snapshot = await q.get();
            if (!snapshot.empty) {
                return snapshot.docs[0].data();
            }
            // Return default if not found
            return {
                test_marked_over: 100,
                max_added_marks: 20
            };
        } catch (e) {
            console.error("Error fetching config:", e);
            return { test_marked_over: 100, max_added_marks: 20 };
        }
    },

    /**
     * Save configuration
     */
    async saveConfiguration(configData) {
        const user = firebase.auth().currentUser;
        if (!user) return false;

        try {
            const configurationsRef = firebase.firestore().collection("configurations");
            const q = configurationsRef
                .where("teacher_id", "==", user.uid)
                .where("class_id", "==", configData.class_id)
                .where("subject_id", "==", configData.subject_id)
                .where("term_id", "==", configData.term_id);

            const snapshot = await q.get();

            if (!snapshot.empty) {
                // Update existing
                await snapshot.docs[0].ref.update(configData);
            } else {
                // Create new
                await configurationsRef.add({
                    ...configData,
                    teacher_id: user.uid,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            return true;
        } catch (e) {
            console.error("Error saving config:", e);
            return false;
        }
    },

    /**
     * Get marks
     */
    async getMarks(classId, subjectId, termId) {
        if (!this.USE_FIREBASE) return [];

        const user = firebase.auth().currentUser;
        if (!user) {
            console.warn("getMarks: No user logged in");
            // Throw specific error that can be caught
            throw new Error("Please Log In");
        }

        try {
            const q = firebase.firestore().collection("marks")
                .where("teacher_id", "==", user.uid)
                .where("class_id", "==", classId)
                .where("subject_id", "==", subjectId)
                .where("term_id", "==", termId);

            const snapshot = await q.get();
            const marks = [];
            snapshot.forEach(doc => {
                marks.push({ id: doc.id, ...doc.data() });
            });
            return marks;
        } catch (e) {
            console.error("Error fetching marks:", e);
            return [];
        }
    },

    /**
     * Save mark
     */
    async saveMark(markData) {
        const user = firebase.auth().currentUser;
        if (!user) return false;

        try {
            const marksRef = firebase.firestore().collection("marks");

            // Check if mark already exists for this student/subject/term
            const q = marksRef
                .where("teacher_id", "==", user.uid)
                .where("student_id", "==", markData.student_id)
                .where("class_id", "==", markData.class_id)
                .where("subject_id", "==", markData.subject_id)
                .where("term_id", "==", markData.term_id);

            const snapshot = await q.get();

            if (!snapshot.empty) {
                // Update
                await snapshot.docs[0].ref.update({
                    ...markData,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Create
                await marksRef.add({
                    ...markData,
                    teacher_id: user.uid,
                    created_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            return true;
        } catch (e) {
            console.error("Error saving mark:", e);
            return false;
        }
    },

    /**
     * Save multiple marks (batch operation)
     */
    async saveMarks(marksArray) {
        const user = firebase.auth().currentUser;
        if (!user) return false;

        if (!marksArray || marksArray.length === 0) return true;

        try {
            const db = firebase.firestore();
            const batch = db.batch();
            const marksRef = db.collection("marks");

            // 1. Get context from first item to fetch existing marks efficiently
            const context = marksArray[0];

            // Fetch all existing marks for this Class + Subject + Term
            // This turns N reads into 1 read.
            const q = marksRef
                .where("teacher_id", "==", user.uid)
                .where("class_id", "==", context.class_id)
                .where("subject_id", "==", context.subject_id)
                .where("term_id", "==", context.term_id);

            const snapshot = await q.get();
            const existingMarksMap = {}; // Map student_id -> docRef

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.student_id) {
                    existingMarksMap[data.student_id] = doc.ref;
                }
            });

            // 2. Build Batch
            marksArray.forEach(mark => {
                const existingRef = existingMarksMap[mark.student_id];

                if (existingRef) {
                    // Update
                    batch.update(existingRef, {
                        ...mark,
                        updated_at: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Create
                    const newRef = marksRef.doc();
                    batch.set(newRef, {
                        ...mark,
                        teacher_id: user.uid,
                        created_at: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });

            // 3. Commit Batch
            await batch.commit();
            console.log("✅ Batch save completed successfully");
            return true;
        } catch (e) {
            console.error("Error saving marks batch:", e);
            Utils.showToast("Error saving: " + e.message, "error");
            return false;
        }
    },

    /**
     * Delete all students in a class
     */
    async deleteStudentsByClass(classId) {
        if (!this.USE_FIREBASE) return false;

        const user = firebase.auth().currentUser;
        if (!user) return false;

        try {
            const batch = firebase.firestore().batch();
            const studentsRef = firebase.firestore().collection("students");

            // Note: This requires a composite index on teacher_id + class_id
            const q = studentsRef
                .where("teacher_id", "==", user.uid)
                .where("class_id", "==", classId);

            const snapshot = await q.get();

            if (snapshot.empty) return true; // Nothing to delete

            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            return true;
        } catch (e) {
            console.error("Error deleting students by class:", e);
            Utils.showToast("Error deleting: " + e.message, "error");
            return false;
        }
    }
};

// Initialize on load - make it synchronous
if (typeof document !== 'undefined') {
    // Only used for static init if needed
}
