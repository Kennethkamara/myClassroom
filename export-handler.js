/**
 * Export Handler
 * Handles export to CSV, Excel, PDF, and printing
 */

const ExportHandler = {
    selectedClass: '',
    selectedSubject: '',
    selectedTerm: '',
    exportData: [],

    /**
     * Initialize export handler
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

            this.populateSelect('exportClass', classes);
            this.populateSelect('exportSubject', subjects);
            this.populateSelect('exportTerm', terms);
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
        const exportCSVBtn = document.getElementById('exportCSVBtn');
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', () => this.exportCSV());
        }

        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => this.exportExcel());
        }

        const exportPDFBtn = document.getElementById('exportPDFBtn');
        if (exportPDFBtn) {
            exportPDFBtn.addEventListener('click', () => this.exportPDF());
        }

        const printBtn = document.getElementById('printBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printResults());
        }

        // Update preview when selection changes
        ['exportClass', 'exportSubject', 'exportTerm'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updatePreview());
            }
        });
    },

    /**
     * Load export data
     */
    async loadExportData() {
        this.selectedClass = document.getElementById('exportClass').value;
        this.selectedSubject = document.getElementById('exportSubject').value;
        this.selectedTerm = document.getElementById('exportTerm').value;

        if (!this.selectedClass || !this.selectedSubject || !this.selectedTerm) {
            Utils.showToast('Please select class, subject, and term', 'error');
            return false;
        }

        try {
            Utils.showLoading();

            // Load configuration
            const config = await APIClient.getConfiguration(
                this.selectedClass,
                this.selectedSubject,
                this.selectedTerm
            );

            // Load students
            const students = await APIClient.getStudentsByClass(this.selectedClass);
            const sortedStudents = Utils.sortBy(students, 'name', true);

            // Load marks
            const marks = await APIClient.getMarks(
                this.selectedClass,
                this.selectedSubject,
                this.selectedTerm
            );

            // Build marks map
            const marksMap = {};
            marks.forEach(mark => {
                marksMap[mark.student_id] = {
                    raw_score: mark.raw_score || 0,
                    added_mark: mark.added_mark || 0
                };
            });

            // Build export data
            this.exportData = sortedStudents.map(student => {
                const studentMarks = marksMap[student.id] || { raw_score: 0, added_mark: 0 };
                const finalContribution = Validators.calculateFinalContribution(
                    studentMarks.raw_score,
                    studentMarks.added_mark,
                    config.test_marked_over,
                    config.test_contribution || 10
                );

                return {
                    student_name: student.name,
                    raw_score: studentMarks.raw_score,
                    added_mark: studentMarks.added_mark,
                    final_contribution: Utils.formatNumber(finalContribution, 2)
                };
            });

            Utils.hideLoading();
            return true;
        } catch (error) {
            console.error('Error loading export data:', error);
            Utils.showToast('Error loading data', 'error');
            Utils.hideLoading();
            return false;
        }
    },

    /**
     * Get class, subject, term names
     */
    async getNames() {
        const [classes, subjects, terms] = await Promise.all([
            APIClient.getClasses(),
            APIClient.getSubjects(),
            APIClient.getTerms()
        ]);

        const className = classes.find(c => c.id === this.selectedClass)?.name || '';
        const subjectName = subjects.find(s => s.id === this.selectedSubject)?.name || '';
        const termName = terms.find(t => t.id === this.selectedTerm)?.name || '';

        return { className, subjectName, termName };
    },

    /**
     * Export as CSV
     */
    async exportCSV() {
        const loaded = await this.loadExportData();
        if (!loaded) return;

        const { className, subjectName, termName } = await this.getNames();

        // Prepare CSV data
        const headers = ['Student Name', 'Raw Test Score', 'Final Test Contribution (out of 10)'];
        const rows = this.exportData.map(row => [
            row.student_name,
            row.raw_score,
            row.final_contribution
        ]);

        const csvContent = Utils.tableToCSV(headers, rows);
        const filename = Utils.generateExportFilename(className, subjectName, termName, 'csv');

        Utils.downloadFile(csvContent, filename, 'text/csv');
        Utils.showToast('CSV file downloaded!', 'success');
    },

    /**
     * Export as Excel
     */
    async exportExcel() {
        const loaded = await this.loadExportData();
        if (!loaded) return;

        const { className, subjectName, termName } = await this.getNames();

        try {
            // Check if XLSX library is loaded
            if (typeof XLSX === 'undefined') {
                Utils.showToast('Excel export library not loaded', 'error');
                return;
            }

            // Prepare data for Excel
            const wsData = [
                ['Student Name', 'Raw Test Score', 'Final Test Contribution (out of 10)']
            ];

            this.exportData.forEach(row => {
                wsData.push([
                    row.student_name,
                    row.raw_score,
                    row.final_contribution
                ]);
            });

            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Define Styles
            const borderStyle = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
            const headerStyle = {
                font: { bold: true, color: { rgb: "FFFFFF" }, name: "Arial", sz: 12 },
                fill: { fgColor: { rgb: "00A3E0" } }, // Brand Blue
                alignment: { horizontal: "center", vertical: "center", wrapText: true },
                border: borderStyle
            };
            const cellStyleLeft = {
                font: { name: "Arial", sz: 11 },
                alignment: { vertical: "center", horizontal: "left", wrapText: true },
                border: borderStyle
            };
            const cellStyleCenter = {
                font: { name: "Arial", sz: 11 },
                alignment: { vertical: "center", horizontal: "center", wrapText: true },
                border: borderStyle
            };

            // Apply Styles
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[cell_address]) continue;

                    if (R === 0) {
                        ws[cell_address].s = headerStyle;
                        // Ensure header is always centered
                        ws[cell_address].s.alignment = { horizontal: "center", vertical: "center", wrapText: true };
                    } else {
                        // Data Rows: Center metrics, Left align Text (Name)
                        if (C === 0) {
                            ws[cell_address].s = cellStyleLeft;
                        } else {
                            ws[cell_address].s = cellStyleCenter;
                        }
                    }
                }
            }

            // Set column widths
            ws['!cols'] = [
                { wch: 35 }, // Student Name
                { wch: 20 }, // Raw Test Score
                { wch: 35 }  // Final Contribution
            ];

            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Marks');

            // Download
            const filename = Utils.generateExportFilename(className, subjectName, termName, 'xlsx');
            XLSX.writeFile(wb, filename);

            Utils.showToast('Excel file downloaded!', 'success');
        } catch (error) {
            console.error('Error exporting Excel:', error);
            Utils.showToast('Error generating Excel file', 'error');
        }
    },

    /**
     * Export as PDF
     */
    async exportPDF() {
        const loaded = await this.loadExportData();
        if (!loaded) return;

        const { className, subjectName, termName } = await this.getNames();

        try {
            // Check if jsPDF is loaded
            if (typeof window.jspdf === 'undefined') {
                Utils.showToast('PDF export library not loaded', 'error');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Add title
            doc.setFontSize(18);
            doc.text('Student Marks Report', 14, 20);

            // Add info
            doc.setFontSize(12);
            doc.text(`Class: ${className}`, 14, 30);
            doc.text(`Subject: ${subjectName}`, 14, 37);
            doc.text(`Term: ${termName}`, 14, 44);
            doc.text(`Date: ${Utils.formatDateReadable()}`, 14, 51);

            // Add table
            const tableData = this.exportData.map(row => [
                row.student_name,
                row.raw_score.toString(),
                row.final_contribution.toString()
            ]);

            doc.autoTable({
                head: [['Student Name', 'Raw Test Score', 'Final Contribution (out of 10)']],
                body: tableData,
                startY: 60,
                theme: 'grid',
                headStyles: { fillColor: [44, 90, 160] },
                styles: { fontSize: 10 }
            });

            // Download
            const filename = Utils.generateExportFilename(className, subjectName, termName, 'pdf');
            doc.save(filename);

            Utils.showToast('PDF file downloaded!', 'success');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            Utils.showToast('Error generating PDF file', 'error');
        }
    },

    /**
     * Print results
     */
    async printResults() {
        const loaded = await this.loadExportData();
        if (!loaded) return;

        const { className, subjectName, termName } = await this.getNames();

        console.log('=== PRINT DEBUG ===');
        console.log('Export Data:', this.exportData);
        console.log('First row data:', this.exportData[0]);

        // Populate print section
        document.getElementById('printClass').textContent = className;
        document.getElementById('printSubject').textContent = subjectName;
        document.getElementById('printTerm').textContent = termName;
        document.getElementById('printDate').textContent = Utils.formatDateReadable();

        // Build table WITHOUT Added Mark column
        const tableHTML = `
            <table class="print-table">
                <thead>
                    <tr>
                        <th>Student Name</th>
                        <th>Raw Test Score</th>
                        <th>Final Contribution (out of 10)</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.exportData.map(row => `
                        <tr>
                            <td>${row.student_name}</td>
                            <td>${row.raw_score}</td>
                            <td>${row.final_contribution} / 10</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        console.log('Table HTML:', tableHTML.substring(0, 500));

        document.getElementById('printTableContainer').innerHTML = tableHTML;

        // Trigger print dialog
        window.print();
    },

    /**
     * Update preview
     */
    async updatePreview() {
        const loaded = await this.loadExportData();
        if (!loaded) {
            document.getElementById('exportPreview').style.display = 'none';
            return;
        }

        const { className, subjectName, termName } = await this.getNames();

        const previewHTML = `
            <div style="padding: 1rem; background: var(--gray-50); border-radius: var(--radius-sm);">
                <p><strong>Class:</strong> ${className}</p>
                <p><strong>Subject:</strong> ${subjectName}</p>
                <p><strong>Term:</strong> ${termName}</p>
                <p><strong>Total Students:</strong> ${this.exportData.length}</p>
            </div>
        `;

        document.getElementById('exportPreviewContent').innerHTML = previewHTML;
        document.getElementById('exportPreview').style.display = 'block';
    }
};
