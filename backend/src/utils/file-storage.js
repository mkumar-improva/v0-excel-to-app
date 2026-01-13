const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../data/uploads');

function ensureUploadDir(projectId) {
    const projectDir = path.join(UPLOAD_DIR, String(projectId));
    if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
    }
    return projectDir;
}

function saveFile(projectId, fileName, buffer) {
    const projectDir = ensureUploadDir(projectId);

    // Generate a unique filename to avoid conflicts
    const timestamp = Date.now();
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const uniqueFileName = `${baseName}_${timestamp}${ext}`;

    const filePath = path.join(projectDir, uniqueFileName);
    fs.writeFileSync(filePath, buffer);

    // Return relative path from backend root
    return path.relative(path.join(__dirname, '../..'), filePath);
}

function deleteFile(filePath) {
    try {
        const absolutePath = path.join(__dirname, '../..', filePath);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
}

function fileExists(filePath) {
    const absolutePath = path.join(__dirname, '../..', filePath);
    return fs.existsSync(absolutePath);
}

function getAbsolutePath(filePath) {
    return path.join(__dirname, '../..', filePath);
}

module.exports = {
    ensureUploadDir,
    saveFile,
    deleteFile,
    fileExists,
    getAbsolutePath
};
