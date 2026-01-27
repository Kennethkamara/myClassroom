/**
 * Google Sheets API Client
 * Connects directly to Google Sheets using public CSV export
 */

const GoogleSheetsAPI = {
    sheetId: null,
    baseUrl: null,

    /**
     * Initialize - get sheet ID from localStorage
     */
    init() {
        this.sheetId = localStorage.getItem('google_sheets_id');
        if (this.sheetId) {
            this.baseUrl = `https://docs.google.com/spreadsheets/d/${this.sheetId}`;
            console.log('Google Sheets connected:', this.sheetId);
            return true;
        }
        console.warn('No Google Sheet connected. Please run setup.html first.');
        return false;
    },

    /**
     * Check if connected
     */
    isConnected() {
        return this.sheetId !== null;
    },

    /**
     * Fetch data from a specific sheet as CSV and convert to JSON
     */
    async fetchSheet(sheetName) {
        if (!this.isConnected()) {
            throw new Error('Google Sheets not connected. Run setup.html first.');
        }

        try {
            // Get sheet as CSV
            const url = `${this.baseUrl}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch ${sheetName}: ${response.status}`);
            }

            const csvText = await response.text();
            return this.csvToJson(csvText);
        } catch (error) {
            console.error(`Error fetching ${sheetName}:`, error);
            return [];
        }
    },

    /**
     * Convert CSV to JSON array
     */
    csvToJson(csv) {
        const lines = csv.split('\n').filter(line => line.trim());
        if (lines.length === 0) return [];

        // First line is headers
        const headers = this.parseCSVLine(lines[0]);
        const data = [];

        // Parse each data row
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === 0) continue;

            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || '';
            });
            data.push(obj);
        }

        return data;
    },

    /**
     * Parse a CSV line (handles quoted values)
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    },

    /**
     * Append a row to a sheet (requires opening sheet in browser)
     * Note: This is a limitation of the simple approach
     */
    async appendRow(sheetName, data) {
        // For the simple approach, we can't directly append
        // User must add data through the app UI which will guide them
        console.warn('Direct append not supported in simple mode. Data shown in UI for manual entry.');
        return null;
    }
};
