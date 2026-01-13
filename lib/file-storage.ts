import fs from "fs"
import path from "path"

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads")

/**
 * Ensure the upload directory exists for a given project
 */
export function ensureUploadDir(projectId: number): string {
    const projectDir = path.join(UPLOAD_DIR, String(projectId))
    fs.mkdirSync(projectDir, { recursive: true })
    return projectDir
}

/**
 * Save a file buffer to disk and return the file path
 */
export function saveFile(projectId: number, fileName: string, buffer: Buffer): string {
    const projectDir = ensureUploadDir(projectId)

    // Generate a unique filename to avoid conflicts
    const timestamp = Date.now()
    const ext = path.extname(fileName)
    const baseName = path.basename(fileName, ext)
    const uniqueFileName = `${baseName}_${timestamp}${ext}`

    const filePath = path.join(projectDir, uniqueFileName)
    fs.writeFileSync(filePath, new Uint8Array(buffer))

    // Return relative path from project root
    return path.relative(process.cwd(), filePath)
}

/**
 * Delete a file from disk
 */
export function deleteFile(filePath: string): boolean {
    try {
        const absolutePath = path.join(process.cwd(), filePath)
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath)
            return true
        }
        return false
    } catch (error) {
        console.error("Error deleting file:", error)
        return false
    }
}

/**
 * Get the absolute path for a stored file
 */
export function getAbsolutePath(filePath: string): string {
    return path.join(process.cwd(), filePath)
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
    const absolutePath = path.join(process.cwd(), filePath)
    return fs.existsSync(absolutePath)
}

/**
 * Read a file buffer
 */
export function readFile(filePath: string): Buffer {
    const absolutePath = path.join(process.cwd(), filePath)
    return fs.readFileSync(absolutePath)
}
