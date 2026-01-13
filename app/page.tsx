"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api-client"
import { Project } from "@/lib/types"
import { ProjectList } from "@/components/project-list"
import { CreateProjectDialog } from "@/components/create-project-dialog"

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await api.projects.list()
      setProjects(data)
      setError(null)
    } catch (err) {
      setError("Failed to load projects. Please ensure backend is running.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (data: { name: string; description?: string }) => {
    try {
      const newProject = await api.projects.create(data.name, data.description)
      setProjects([newProject, ...projects])
    } catch (err) {
      console.error(err)
      alert("Failed to create project")
    }
  }

  const handleDeleteProject = async (id: number) => {
    try {
      await api.projects.delete(id)
      setProjects(projects.filter((p) => p.id !== id))
    } catch (err) {
      console.error(err)
      alert("Failed to delete project")
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage your Excel data transformation projects</p>
          </div>
          <CreateProjectDialog onCreate={handleCreateProject} />
        </header>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[200px] rounded-lg bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 bg-red-50 rounded-lg">
            <p>{error}</p>
            <button onClick={loadProjects} className="mt-4 underline">
              Try Again
            </button>
          </div>
        ) : (
          <ProjectList projects={projects} onDelete={handleDeleteProject} />
        )}
      </div>
    </main>
  )
}
