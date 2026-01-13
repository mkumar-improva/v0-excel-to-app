
// Utility function to normalize phone numbers for comparison
export function normalizePhone(value: any): string {
    if (!value) return ''
    const str = String(value)
    // Remove all non-numeric characters
    return str.replace(/\D/g, '')
}

// Utility function to normalize text for fuzzy comparison
export function normalizeText(value: any): string {
    if (!value) return ''
    return String(value)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[.,\-_]/g, '') // Remove common punctuation
}

// Calculate similarity between two strings using Levenshtein distance
export function calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0

    const len1 = str1.length
    const len2 = str2.length

    if (len1 === 0 || len2 === 0) return 0

    const matrix: number[][] = []

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i]
    }

    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            )
        }
    }

    const maxLen = Math.max(len1, len2)
    const distance = matrix[len1][len2]
    return 1 - (distance / maxLen)
}

// Fuzzy comparison function with field-specific logic
export function isSimilarValue(original: any, validated: any, fieldName: string): boolean {
    // Null/undefined comparison
    if (original === null || original === undefined) {
        return validated === null || validated === undefined
    }
    if (validated === null || validated === undefined) {
        return false
    }

    // Exact match
    if (JSON.stringify(original) === JSON.stringify(validated)) {
        return true
    }

    const fieldLower = fieldName.toLowerCase()

    // Phone number comparison
    if (fieldLower.includes('phone') || fieldLower.includes('fax') || fieldLower.includes('tel')) {
        const normalizedOriginal = normalizePhone(original)
        const normalizedValidated = normalizePhone(validated)

        // If one is subset of another or they match when normalized
        if (normalizedOriginal === normalizedValidated) return true
        if (normalizedOriginal && normalizedValidated) {
            // Allow if one contains the other (for cases like extensions)
            if (normalizedOriginal.includes(normalizedValidated) ||
                normalizedValidated.includes(normalizedOriginal)) {
                return normalizedOriginal.length >= 7 || normalizedValidated.length >= 7
            }
        }
        return false
    }

    // For text fields, use fuzzy matching with threshold
    const normalizedOriginal = normalizeText(original)
    const normalizedValidated = normalizeText(validated)

    // Calculate similarity score
    const similarity = calculateSimilarity(normalizedOriginal, normalizedValidated)

    // Consider values similar if similarity is above 85%
    // Lower threshold for shorter values to avoid false positives
    const threshold = Math.min(normalizedOriginal.length, normalizedValidated.length) < 10 ? 0.90 : 0.85

    return similarity >= threshold
}
