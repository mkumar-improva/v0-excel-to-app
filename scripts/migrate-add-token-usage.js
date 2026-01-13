/**
 * Migration script to add token usage and cost tracking fields to ai_responses table
 * Run this script to update existing databases
 */

const Database = require("better-sqlite3")
const path = require("path")
const fs = require("fs")

const dbPath = path.join(process.cwd(), "data", "app.sqlite")

function migrate() {
    console.log("Starting migration to add token usage fields...")

    if (!fs.existsSync(dbPath)) {
        console.log("Database does not exist yet. Schema will be created with new fields on first run.")
        return
    }

    const db = new Database(dbPath)

    try {
        // Check if columns already exist
        const tableInfo = db.pragma("table_info(ai_responses)")
        const columnNames = tableInfo.map((col) => col.name)

        const columnsToAdd = [
            { name: "input_tokens", type: "INTEGER" },
            { name: "output_tokens", type: "INTEGER" },
            { name: "total_tokens", type: "INTEGER" },
            { name: "estimated_cost", type: "REAL" }
        ]

        for (const column of columnsToAdd) {
            if (!columnNames.includes(column.name)) {
                console.log(`Adding column ${column.name}...`)
                db.exec(`ALTER TABLE ai_responses ADD COLUMN ${column.name} ${column.type}`)
                console.log(`✓ Column ${column.name} added successfully`)
            } else {
                console.log(`Column ${column.name} already exists, skipping`)
            }
        }

        console.log("Migration completed successfully!")
    } catch (error) {
        console.error("Migration failed:", error)
        throw error
    } finally {
        db.close()
    }
}

// Run migration
migrate()
