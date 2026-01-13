const XLSX = require('xlsx');

function parseExcelFile(buffer, fileName) {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            defval: ''
        });

        if (jsonData.length === 0) {
            throw new Error('No data found in the Excel file');
        }

        // Extract columns from the first row
        const columns = Object.keys(jsonData[0]);

        return {
            columns,
            rows: jsonData,
            fileName
        };
    } catch (error) {
        throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
}

module.exports = {
    parseExcelFile
};
