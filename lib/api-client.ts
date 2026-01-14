import { Project, ExcelFileDB, Entry, AIResponse } from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "API Request Failed")
    }

    return res.json()
}

export const api = {
    projects: {
        list: async () => {
            const res = await fetchAPI<{ projects: Project[] }>("/projects")
            return res.projects
        },
        create: async (name: string, description?: string) => {
            const res = await fetchAPI<{ project: Project }>("/projects", {
                method: "POST",
                body: JSON.stringify({ name, description }),
            })
            return res.project
        },
        update: async (id: number, data: Partial<Project>) => {
            const res = await fetchAPI<{ project: Project }>(`/projects/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            })
            return res.project
        },
        get: async (id: number) => {
            const res = await fetchAPI<{ project: Project }>(`/projects/${id}`)
            return res.project
        },
        delete: async (id: number) => {
            return fetchAPI(`/projects/${id}`, { method: "DELETE" })
        },
        listFiles: async (id: number) => {
            const res = await fetchAPI<{ files: ExcelFileDB[] }>(`/projects/${id}/files`)
            return res.files
        },
        uploadFile: async (id: number, file: File) => {
            const formData = new FormData()
            formData.append("file", file)

            const res = await fetch(`${API_BASE}/projects/${id}/files`, {
                method: "POST",
                body: formData,
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Upload Failed")
            }

            return res.json() as Promise<{ file: ExcelFileDB; entriesCreated: number }>
        },
        getAnalytics: async (id: number, range: '7d' | '30d' | 'all' = '7d') => {
            const res = await fetchAPI<{ analytics: any }>(`/projects/${id}/analytics?range=${range}`)
            return res.analytics
        },
        getAnalyticsSummary: async (id: number) => {
            const res = await fetchAPI<{ summary: any }>(`/projects/${id}/analytics/summary`)
            return res.summary
        },
    },
    files: {
        get: async (id: number) => {
            const res = await fetchAPI<{ file: ExcelFileDB }>(`/files/${id}`)
            return res.file
        },
        delete: async (id: number) => {
            return fetchAPI(`/files/${id}`, { method: "DELETE" })
        },
        listEntries: async (id: number) => {
            const res = await fetchAPI<{ entries: Entry[] }>(`/files/${id}/entries`)
            return res.entries
        },
    },
    entries: {
        listResponses: async (id: number) => {
            const res = await fetchAPI<{ responses: AIResponse[] }>(`/entries/${id}/responses`)
            return res.responses
        },
        createResponse: async (id: number, data: {
            prompt: string;
            response: string;
            model?: string;
            input_tokens?: number;
            output_tokens?: number;
            total_tokens?: number;
            estimated_cost?: number;
        }) => {
            const res = await fetchAPI<{ response: AIResponse }>(`/entries/${id}/responses`, {
                method: "POST",
                body: JSON.stringify(data),
            })
            return res.response
        },
        updateResponse: async (id: number, data: { status?: string, approved_at?: string }) => {
            const res = await fetchAPI<{ response: AIResponse }>(`/responses/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            })
            return res.response
        },
    },
}
