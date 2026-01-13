const ProjectModel = require('./backend/src/models/project.model.js');
const FileModel = require('./backend/src/models/file.model.js');
const EntryModel = require('./backend/src/models/entry.model.js');
const ResponseModel = require('./backend/src/models/response.model.js');
const { closeDb } = require('./backend/src/config/database.js');

async function verifyMigration() {
    try {
        console.log('🧪 Starting Verification Test...\n');

        // 1. Create Project
        console.log('1. Testing Project Creation...');
        const project = await ProjectModel.create('Test Project', 'Verification Test');
        console.log('✅ Project Created:', project);

        // 2. Create File
        console.log('\n2. Testing File Creation...');
        const file = await FileModel.create(
            project.id,
            'test.xlsx',
            '/tmp/test.xlsx',
            ['col1', 'col2']
        );
        console.log('✅ File Created:', file);

        // 3. Create Entries (Batch)
        console.log('\n3. Testing Entry Batch Creation...');
        const entriesData = [
            { rowNumber: 1, data: { col1: 'val1', col2: 'val2' } },
            { rowNumber: 2, data: { col1: 'val3', col2: 'val4' } }
        ];
        const entries = await EntryModel.createBatch(file.id, entriesData);
        console.log(`✅ Entries Created: ${entries.length}`);

        // 4. Create Response
        console.log('\n4. Testing Response Creation...');
        const response = await ResponseModel.create(
            entries[0].id,
            'Test Prompt',
            'Test Response',
            'gpt-4'
        );
        console.log('✅ Response Created:', response);

        // 5. Cleanup (Cascade Delete)
        console.log('\n5. Testing Cascade Delete...');
        await ProjectModel.delete(project.id);
        const checkProject = await ProjectModel.findById(project.id);
        if (!checkProject) {
            console.log('✅ Project Deleted Successfully');
        } else {
            console.error('❌ Project Deletion Failed');
        }

        console.log('\n✨ Verification Complete! All async operations working.');
    } catch (error) {
        console.error('\n❌ Verification Failed:', error);
    } finally {
        closeDb();
    }
}

verifyMigration();
