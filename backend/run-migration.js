const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'app.sqlite');

console.log('🔧 Migrating database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
});

const sqlStatements = [
    'ALTER TABLE ai_responses ADD COLUMN input_tokens INTEGER',
    'ALTER TABLE ai_responses ADD COLUMN output_tokens INTEGER',
    'ALTER TABLE ai_responses ADD COLUMN total_tokens INTEGER',
    'ALTER TABLE ai_responses ADD COLUMN estimated_cost REAL'
];

function runMigration(index) {
    if (index >= sqlStatements.length) {
        console.log('\n✅ Migration completed!');
        console.log('🎉 All token usage columns added successfully.');
        console.log('⚠️  Please restart your backend server now.\n');
        db.close();
        return;
    }

    const sql = sqlStatements[index];
    const colName = sql.match(/ADD COLUMN (\w+)/)[1];

    db.run(sql, (err) => {
        if (err) {
            if (err.message.includes('duplicate column')) {
                console.log(`⏭️  ${colName} - already exists`);
            } else {
                console.log(`❌ ${colName} - ERROR: ${err.message}`);
            }
        } else {
            console.log(`✅ ${colName} - added successfully`);
        }

        // Run next statement
        runMigration(index + 1);
    });
}

// Start migration
runMigration(0);
