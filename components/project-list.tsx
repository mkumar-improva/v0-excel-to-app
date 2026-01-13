"use client"

import { Project } from "@/lib/types"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Folder, Calendar, ArrowRight, Trash2 } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface ProjectListProps {
    projects: Project[]
    onDelete: (id: number) => Promise<void>
}

export function ProjectList({ projects, onDelete }: ProjectListProps) {
    if (projects.length === 0) {
        return (
            <div className="text-center py-12 bg-card rounded-lg border border-dashed border-border">
                <Folder className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">No projects yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">Get started by creating your first project.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
                <Card key={project.id} className="flex flex-col hover:shadow-md transition-shadow">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <CardTitle className="truncate pr-4" title={project.name}>
                                {project.name}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-red-500 -mt-2 -mr-2"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (confirm("Are you sure you want to delete this project?")) {
                                        onDelete(project.id)
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <CardDescription className="line-clamp-2 h-10">
                            {project.description || "No description"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Created {formatDistanceToNow(new Date(project.created_at))} ago</span>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                        <Link href={`/projects/${project.id}`} className="w-full">
                            <Button className="w-full group">
                                Open Project
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
