const { google } = require('googleapis');
const config = require('../config/env');

class GoogleSheetService {
    constructor() {
        this.auth = null;
        this.sheets = null;
        this.spreadsheetId = config.GOOGLE_SHEET_ID;
        this.mockMode = false;
    }

    async connect() {
        if (this.sheets) return;

        try {
            this.auth = new google.auth.GoogleAuth({
                credentials: config.CREDENTIALS,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            const client = await this.auth.getClient();
            this.sheets = google.sheets({ version: 'v4', auth: client });
            this.mockMode = false;
            console.log('✅ Connected to Google Sheets API (Real)');
        } catch (error) {
            console.error('❌ Failed to connect to Google Sheets:', error);
            console.log('⚠️ Falling back to Mock Mode temporarily.');
            this.mockMode = true;
        }
    }

    // Auth: Get account by code
    async getAccount(code) {
        await this.connect();

        // Mock Mode
        if (this.mockMode) {
            // Mock accounts: code '123' -> role '', '456' -> role 'oran'
            if (code === '123') return { code: '123', role: '' };
            if (code === '456') return { code: '456', role: 'oran' };
            return null;
        }

        try {
            // Assuming 'compte' sheet has Code in Col A, Role in Col B
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'compte!A:B',
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0) return null;

            // Find row with matching code
            const accountRow = rows.find(row => row[0] === code); // Flexible string match

            if (accountRow) {
                return { code: accountRow[0], role: accountRow[1] };
            }
            return null;

        } catch (error) {
            console.error('Error fetching account:', error);
            throw error;
        }
    }

    // Get All Rows (Dynamic Sheet)
    async getAllRows(sheetName = '') { // Default to  if not provided
        await this.connect();

        if (this.mockMode) {
            return [
                ['Etat', 'Date', 'Reference', 'Client', 'Phone', 'Phone2', 'Address', 'Commune', 'Amount', 'Wilaya', 'Product', 'Note', 'Poids', 'PickUp', 'Echange', 'StopDesk', 'Ouvrir', 'StationCode', 'Tracking'],
                ['Nouvelle', '2023-10-27', 'REF-001', 'Mock Client', '0550000000', '', 'Alger Centre', 'Alger Centre', '5000', '16', 'Montre', '', '1', '', '', '', '', '', '']
            ];
        }

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:Z`,
            });
            return response.data.values;
        } catch (error) {
            // If sheet doesn't exist, might throw. Handle gracefully or let bubble.
            console.error(`Error fetching rows from ${sheetName}:`, error);
            throw error;
        }
    }

    async getReferenceData() {
        await this.connect();

        if (this.mockMode) {
            return {
                wilayas: [['1', 'Adrar'], ['16', 'Alger']],
                communes: [['Alger Centre', '16'], ['Bab El Oued', '16'], ['Adrar', '1']],
                stations: [['Station Alger', 'STOP01'], ['Station Adrar', 'STOP02']],
            };
        }

        try {
            const response = await this.sheets.spreadsheets.values.batchGet({
                spreadsheetId: this.spreadsheetId,
                ranges: ['code wilayas!A:D', 'code communes!A:B', 'code stations!A:B'],
            });

            const result = {};
            const valueRanges = response.data.valueRanges;

            if (valueRanges && valueRanges.length >= 3) {
                result.wilayas = valueRanges[0].values || [];
                result.communes = valueRanges[1].values || [];
                result.stations = valueRanges[2].values || [];
            }

            return result;
        } catch (error) {
            console.error('Error fetching reference data:', error);
            throw error;
        }
    }

    // Add Row (Dynamic Sheet)
    async addRow(rowData, sheetName = '') {
        await this.connect();

        if (this.mockMode) {
            console.log(`[Mock] Adding to ${sheetName}:`, rowData);
            return;
        }

        try {
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:Z`,
                valueInputOption: 'RAW',
                resource: { values: [rowData] },
            });
        } catch (error) {
            console.error(`Error adding row to ${sheetName}:`, error);
            throw error;
        }
    }

    // Helper: Get Sheet Metadata (ID) by Name
    async getSheetIdByName(sheetName) {
        await this.connect();
        const response = await this.sheets.spreadsheets.get({
            spreadsheetId: this.spreadsheetId,
        });
        const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
        if (!sheet) throw new Error(`Sheet ${sheetName} not found`);
        return sheet.properties.sheetId;
    }

    // Update Row
    async updateRow(rowIndex, rowData, sheetName = '') {
        await this.connect();
        // Google Sheets API is 1-indexed for range A1 notation
        // rowIndex comes as 2, 3, etc. (Directly matches Excel row number)
        const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;

        try {
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: range,
                valueInputOption: 'RAW', // Use RAW to preserve leading zeros
                resource: { values: [rowData] },
            });
        } catch (error) {
            console.error(`Error updating row ${rowIndex} in ${sheetName}:`, error);
            throw error;
        }
    }

    // Delete Row
    async deleteRow(rowIndex, sheetName = '') {
        await this.connect();
        const sheetId = await this.getSheetIdByName(sheetName);

        // deleteDimension requests use 0-indexed START and EXCLUSIVE END
        // If row is 5 (1-based), index is 4. 
        // We receive 1-based index from frontend (e.g. 5).
        const startIndex = rowIndex - 1;

        try {
            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: 'ROWS',
                                startIndex: startIndex,
                                endIndex: startIndex + 1,
                            }
                        }
                    }]
                }
            });
        } catch (error) {
            console.error(`Error deleting row ${rowIndex} from ${sheetName}:`, error);
            throw error;
        }
    }

    // Update Tracking for a specific order
    async updateTracking(rowIndex, tracking, sheetName = '') {
        await this.connect();
        // Column S (19th column, 0-indexed = 18) is "Tracking" based on the header structure
        const range = `${sheetName}!S${rowIndex}`;

        try {
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: range,
                valueInputOption: 'RAW', // Use RAW for consistency
                resource: { values: [[tracking]] },
            });
        } catch (error) {
            console.error(`Error updating tracking for row ${rowIndex} in ${sheetName}:`, error);
            throw error;
        }
    }

    // Convert 0-based column index to letter (e.g., 0 -> A, 25 -> Z, 26 -> AA)
    getColumnLetter(columnIndex) {
        let temp, letter = '';
        while (columnIndex >= 0) {
            temp = columnIndex % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            columnIndex = Math.floor(columnIndex / 26) - 1;
        }
        return letter;
    }

    async updateCell(rowIndex, columnIndex, value, sheetName = '') {
        await this.connect();
        const columnLetter = this.getColumnLetter(columnIndex);
        const range = `${sheetName}!${columnLetter}${rowIndex}`;

        try {
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: range,
                valueInputOption: 'RAW',
                resource: { values: [[value]] },
            });
        } catch (error) {
            console.error(`Error updating cell ${columnLetter}${rowIndex} in ${sheetName}:`, error);
            throw error;
        }
    }

    // Update Message Status for a specific order (Legacy/Hardcoded backup)
    async updateMessageStatus(rowIndex, status, sheetName = '') {
        // Fallback to column T (index 19) if used directly
        return this.updateCell(rowIndex, 19, status, sheetName);
    }

    // Get Column Validation Rules
    async getColumnValidation(sheetName = '', column = 'A') {
        await this.connect();

        if (this.mockMode) {
            console.log(`[Mock] Getting validation rules for ${sheetName}!${column}`);
            return { condition: { type: 'ONE_OF_LIST', values: ['Nouvelle', 'Atelier', 'Annuler'] } };
        }

        try {
            // Get the sheetId first
            const sheetId = await this.getSheetIdByName(sheetName);

            // Request spreadsheet data with dataValidation field
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
                fields: 'sheets(properties(sheetId,title),data(rowData(values(dataValidation))))',
                ranges: [`${sheetName}!${column}:${column}`]
            });

            const sheets = response.data.sheets;
            if (!sheets || sheets.length === 0) {
                return null;
            }

            // Find the sheet by ID
            const targetSheet = sheets.find(s => s.properties.sheetId === sheetId);
            if (!targetSheet || !targetSheet.data || !targetSheet.data[0]) {
                return null;
            }

            const rowData = targetSheet.data[0].rowData;
            if (!rowData || rowData.length === 0) {
                return null;
            }

            // Extract validation rules from the first non-empty cell with validation
            for (const row of rowData) {
                if (row.values && row.values[0] && row.values[0].dataValidation) {
                    return row.values[0].dataValidation;
                }
            }

            return null;
        } catch (error) {
            console.error(`Error getting validation rules for ${sheetName}!${column}:`, error);
            throw error;
        }
    }

    // Update Row Color
    async updateRowColor(rowIndex, color, sheetName = '') {
        await this.connect();
        const sheetId = await this.getSheetIdByName(sheetName);

        // Convert hex to rgb (0-1 range)
        let red = 1, green = 1, blue = 1; // Default white
        if (color === 'gray') { red = 0.9; green = 0.9; blue = 0.9; }
        else if (color === 'red') { red = 1; green = 0.8; blue = 0.8; }
        else if (color === 'green') { red = 0.8; green = 1; blue = 0.8; }
        else if (color === 'blue') { red = 0.8; green = 0.9; blue = 1; }
        else if (color === 'yellow') { red = 1; green = 1; blue = 0.8; }
        else if (color.startsWith('#')) {
            // Hex parsing
            const r = parseInt(color.slice(1, 3), 16) / 255;
            const g = parseInt(color.slice(3, 5), 16) / 255;
            const b = parseInt(color.slice(5, 7), 16) / 255;
            if (!isNaN(r)) red = r;
            if (!isNaN(g)) green = g;
            if (!isNaN(b)) blue = b;
        }

        const startIndex = rowIndex - 1; // 0-indexed for API

        try {
            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [{
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: startIndex,
                                endRowIndex: startIndex + 1,
                                startColumnIndex: 0,
                                endColumnIndex: 20 // Adjust as needed, covers A-T
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: {
                                        red: red,
                                        green: green,
                                        blue: blue
                                    }
                                }
                            },
                            fields: 'userEnteredFormat.backgroundColor'
                        }
                    }]
                }
            });
        } catch (error) {
            console.error(`Error updating row color for row ${rowIndex}:`, error);
            // Non-critical, don't throw to avoid blocking main flow
        }
    }

    // Get Row Color
    async getRowColor(rowIndex, sheetName = '') {
        await this.connect();

        try {
            const sheetId = await this.getSheetIdByName(sheetName);
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
                ranges: [`${sheetName}!A${rowIndex}:A${rowIndex}`],
                includeGridData: true
            });

            const rowData = response.data.sheets[0].data[0].rowData;
            if (rowData && rowData.length > 0) {
                const cell = rowData[0].values[0];
                if (cell.userEnteredFormat && cell.userEnteredFormat.backgroundColor) {
                    const color = cell.userEnteredFormat.backgroundColor;
                    // Check if it matches gray (approx)
                    if (color.red > 0.8 && color.red < 1 && color.green > 0.8 && color.green < 1 && color.blue > 0.8 && color.blue < 1) {
                        return 'gray';
                    }
                    if (color.red > 0.9 && color.green < 0.9 && color.blue < 0.9) return 'red';
                    if (color.green > 0.9 && color.red < 0.9 && color.blue < 0.9) return 'green';
                    // Return raw object if no simple match
                    return color;
                }
            }
            return null; // Default/White
        } catch (error) {
            console.error(`Error getting row color for row ${rowIndex}:`, error);
            return null;
        }
    }
}

module.exports = new GoogleSheetService();
