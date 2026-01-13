const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'app.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking database structure...\n');

// Check table structure
db.all("PRAGMA table_info(ai_responses)", (err, columns) => {
    if (err) {
        console.error('❌ Error:', err.message);
        db.close();
        return;
    }

    console.log('📋 Current ai_responses table columns:');
    console.log('─'.repeat(60));
    columns.forEach(col => {
        const hasToken = col.name.includes('token') || col.name.includes('cost');
        const icon = hasToken ? '🎯' : '  ';
        console.log(`${icon} ${col.name.padEnd(20)} ${col.type.padEnd(10)} ${col.notnull ? 'NOT NULL' : ''}`);
    });
    console.log('─'.repeat(60));

    // Check if token columns exist
    const columnNames = columns.map(c => c.name);
    const requiredColumns = ['input_tokens', 'output_tokens', 'total_tokens', 'estimated_cost'];
    const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));

    if (missingColumns.length > 0) {
        console.log('\n❌ MISSING COLUMNS:', missingColumns.join(', '));
        console.log('\n🔧 Run migration to add these columns!');
    } else {
        console.log('\n✅ All token usage columns exist!');

        // Check if there's any data
        db.get("SELECT COUNT(*) as count FROM ai_responses", (err, row) => {
            if (!err) {
                console.log(`\n📊 Total AI responses in DB: ${row.count}`);

                if (row.count > 0) {
                    // Show latest response with token data
                    db.get(`
                        SELECT id, entry_id, model, 
                               input_tokens, output_tokens, total_tokens, estimated_cost,
                               created_at
                        FROM ai_responses 
                        ORDER BY created_at DESC 
                        LIMIT 1
                    `, (err, latest) => {
                        if (!err && latest) {
                            console.log('\n📄 Latest response:');
                            console.log('   ID:', latest.id);
                            console.log('   Model:', latest.model);
                            console.log('   Input Tokens:', latest.input_tokens || 'NULL');
                            console.log('   Output Tokens:', latest.output_tokens || 'NULL');
                            console.log('   Total Tokens:', latest.total_tokens || 'NULL');
                            console.log('   Cost:', latest.estimated_cost || 'NULL');

                            if (!latest.input_tokens && !latest.output_tokens) {
                                console.log('\n⚠️  Token data is NULL - backend not saving properly!');
                            }
                        }
                        db.close();
                    });
                } else {
                    db.close();
                }
            } else {
                db.close();
            }
        });
    }
});
