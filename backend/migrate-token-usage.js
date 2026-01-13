const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'app.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Adding token usage columns to backend database...\n');

const columns = [
    'ALTER TABLE ai_responses ADD COLUMN input_tokens INTEGER',
    'ALTER TABLE ai_responses ADD COLUMN output_tokens INTEGER',
    'ALTER TABLE ai_responses ADD COLUMN total_tokens INTEGER',
    'ALTER TABLE ai_responses ADD COLUMN estimated_cost REAL'
];

let completed = 0;

columns.forEach((sql, index) => {
    const colName = sql.match(/ADD COLUMN (\w+)/)[1];
    db.run(sql, (err) => {
        if (err) {
            if (err.message.includes('duplicate column')) {
                console.log(`✓ ${colName} already exists`);
            } else {
                console.log(`✗ Error adding ${colName}: ${err.message}`);
            }
        } else {
            console.log(`✓ Added ${colName}`);
        }

        completed++;
        if (completed === columns.length) {
            console.log('\nMigration complete! Restart the backend server.');
            db.close();
        }
    });
});
