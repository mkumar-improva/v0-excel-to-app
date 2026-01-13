// Test script for database operations
import {
    createProject,
    listProjects,
    getProjectById,
    updateProject,
    deleteProject,
    createExcelFile,
    listExcelFilesByProject,
    getExcelFileById,
    deleteExcelFile,
    createEntry,
    createEntriesBatch,
    listEntriesByExcelFile,
    getEntryById,
    deleteEntry,
    createAIResponse,
    listAIResponsesByEntry,
    getAIResponseById,
    updateAIResponse,
    deleteAIResponse,
    getEntryWithResponses,
    listEntriesWithResponses,
} from "../lib/db"

function testDatabaseOperations() {
    console.log("🧪 Starting Database Operations Test\n")

    // Test 1: Create Project
    console.log("1️⃣ Creating a test project...")
    const project = createProject("Test Project", "A project for testing the backend")
    console.log("✅ Project created:", project)
    console.log()

    // Test 2: List Projects
    console.log("2️⃣ Listing all projects...")
    const projects = listProjects()
    console.log(`✅ Found ${projects.length} project(s):`, projects)
    console.log()

    // Test 3: Get Project by ID
    console.log("3️⃣ Getting project by ID...")
    const fetchedProject = getProjectById(project.id)
    console.log("✅ Project fetched:", fetchedProject)
    console.log()

    // Test 4: Update Project
    console.log("4️⃣ Updating project...")
    const updatedProject = updateProject(project.id, "Updated Test Project", "Updated description")
    console.log("✅ Project updated:", updatedProject)
    console.log()

    // Test 5: Create Excel File
    console.log("5️⃣ Creating an Excel file record...")
    const excelFile = createExcelFile(
        project.id,
        "test.xlsx",
        "data/uploads/1/test_123456.xlsx",
        ["Name", "Email", "Age"]
    )
    console.log("✅ Excel file created:", excelFile)
    console.log()

    // Test 6: List Excel Files
    console.log("6️⃣ Listing Excel files for project...")
    const excelFiles = listExcelFilesByProject(project.id)
    console.log(`✅ Found ${excelFiles.length} file(s):`, excelFiles)
    console.log()

    // Test 7: Create Entries (Batch)
    console.log("7️⃣ Creating entries in batch...")
    const entries = createEntriesBatch(excelFile.id, [
        { rowNumber: 1, data: { Name: "Alice", Email: "alice@example.com", Age: 30 } },
        { rowNumber: 2, data: { Name: "Bob", Email: "bob@example.com", Age: 25 } },
        { rowNumber: 3, data: { Name: "Charlie", Email: "charlie@example.com", Age: 35 } },
    ])
    console.log(`✅ Created ${entries.length} entries:`, entries)
    console.log()

    // Test 8: List Entries
    console.log("8️⃣ Listing entries for Excel file...")
    const listedEntries = listEntriesByExcelFile(excelFile.id)
    console.log(`✅ Found ${listedEntries.length} entries`)
    console.log()

    // Test 9: Create AI Responses
    console.log("9️⃣ Creating AI responses for entries...")
    const response1 = createAIResponse(
        entries[0].id,
        "Generate a summary for Alice",
        "Alice is a 30-year-old professional with extensive experience...",
        "gemini-2.0-flash"
    )
    const response2 = createAIResponse(
        entries[0].id,
        "Generate another summary for Alice",
        "Alternative summary for Alice...",
        "gemini-2.0-flash"
    )
    console.log("✅ AI responses created:", [response1, response2])
    console.log()

    // Test 10: List AI Responses
    console.log("🔟 Listing AI responses for entry...")
    const aiResponses = listAIResponsesByEntry(entries[0].id)
    console.log(`✅ Found ${aiResponses.length} AI responses:`, aiResponses)
    console.log()

    // Test 11: Get Entry with Responses
    console.log("1️⃣1️⃣ Getting entry with all AI responses...")
    const entryWithResponses = getEntryWithResponses(entries[0].id)
    console.log("✅ Entry with responses:", entryWithResponses)
    console.log()

    // Test 12: List Entries with Responses
    console.log("1️⃣2️⃣ Listing all entries with their responses...")
    const entriesWithResponses = listEntriesWithResponses(excelFile.id)
    console.log(`✅ Found ${entriesWithResponses.length} entries with responses`)
    console.log()

    // Test 13: Update AI Response
    console.log("1️⃣3️⃣ Updating AI response...")
    const updatedResponse = updateAIResponse(
        response1.id,
        undefined,
        "Updated response for Alice with more details..."
    )
    console.log("✅ AI response updated:", updatedResponse)
    console.log()

    // Test 14: Delete AI Response
    console.log("1️⃣4️⃣ Deleting an AI response...")
    const deletedResponse = deleteAIResponse(response2.id)
    console.log(`✅ AI response deleted: ${deletedResponse}`)
    console.log()

    // Test 15: Delete Entry
    console.log("1️⃣5️⃣ Deleting an entry...")
    const deletedEntry = deleteEntry(entries[2].id)
    console.log(`✅ Entry deleted: ${deletedEntry}`)
    console.log()

    // Test 16: Verify Cascade Delete (Excel File)
    console.log("1️⃣6️⃣ Testing cascade delete (deleting Excel file)...")
    const deletedExcelFile = deleteExcelFile(excelFile.id)
    console.log(`✅ Excel file deleted: ${deletedExcelFile}`)
    const remainingEntries = listEntriesByExcelFile(excelFile.id)
    console.log(`✅ Remaining entries after cascade: ${remainingEntries.length} (should be 0)`)
    console.log()

    // Test 17: Verify Cascade Delete (Project)
    console.log("1️⃣7️⃣ Testing cascade delete (deleting project)...")
    const deletedProject = deleteProject(project.id)
    console.log(`✅ Project deleted: ${deletedProject}`)
    const remainingFiles = listExcelFilesByProject(project.id)
    console.log(`✅ Remaining files after cascade: ${remainingFiles.length} (should be 0)`)
    console.log()

    console.log("🎉 All database tests completed successfully!\n")
}

// Run the tests
try {
    testDatabaseOperations()
} catch (error) {
    console.error("❌ Test failed:", error)
    process.exit(1)
}
