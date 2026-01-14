"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Project } from "@/lib/types"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import { Check, Loader2 } from "lucide-react"

interface ProjectSettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    project: Project
    onProjectUpdated: (project: Project) => void
}

const THEME_PRESETS = [
    { name: "Default Red", primary: "oklch(0.57 0.23 27)" },
    { name: "Ocean Blue", primary: "oklch(0.62 0.22 260)" },
    { name: "Forest Green", primary: "oklch(0.65 0.22 145)" },
    { name: "Royal Purple", primary: "oklch(0.55 0.28 300)" },
    { name: "Sunset Orange", primary: "oklch(0.65 0.20 50)" },
    { name: "Slate Gray", primary: "oklch(0.55 0.05 260)" },
]

export function ProjectSettingsDialog({ open, onOpenChange, project, onProjectUpdated }: ProjectSettingsDialogProps) {
    const [name, setName] = useState(project.name)
    const [description, setDescription] = useState(project.description || "")
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("general")
    const [selectedTheme, setSelectedTheme] = useState<string>(
        (typeof project.theme === 'string' ? JSON.parse(project.theme).primary : project.theme?.primary) || THEME_PRESETS[0].primary
    )
    const [matchFields, setMatchFields] = useState("")
    const [availableFields, setAvailableFields] = useState<string[]>([])
    const [selectedMatchFields, setSelectedMatchFields] = useState<string[]>([])

    useEffect(() => {
        if (open) {
            setName(project.name)
            setDescription(project.description || "")

            // Load available fields from project files
            const loadFields = async () => {
                try {
                    const files = await api.projects.listFiles(project.id)
                    if (files && files.length > 0) {
                        // Get columns from the first file as available fields
                        const firstFile = files[0]
                        if (firstFile.columns) {
                            setAvailableFields(firstFile.columns)
                        }
                    }
                } catch (e) {
                    console.error("Failed to load fields", e)
                }
            }
            loadFields()

            try {
                const theme = typeof project.theme === 'string' ? JSON.parse(project.theme) : project.theme
                setSelectedTheme(theme?.primary || THEME_PRESETS[0].primary)
                // Load match fields if they exist in theme
                if (theme?.matchFields && Array.isArray(theme.matchFields)) {
                    setSelectedMatchFields(theme.matchFields)
                    setMatchFields(theme.matchFields.join("\n"))
                } else {
                    setSelectedMatchFields([])
                    setMatchFields("")
                }
            } catch (e) {
                setSelectedTheme(THEME_PRESETS[0].primary)
                setSelectedMatchFields([])
                setMatchFields("")
            }
        }
    }, [open, project])

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Project name is required")
            return
        }

        try {
            setLoading(true)

            const updatedProject = await api.projects.update(project.id, {
                name,
                description,
                theme: {
                    primary: selectedTheme,
                    matchFields: selectedMatchFields
                }
            })
            onProjectUpdated(updatedProject)
            toast.success("Project settings saved")
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error("Failed to save project settings")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Project Settings</DialogTitle>
                    <DialogDescription>
                        Manage project details and appearance.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="theme">Theme</TabsTrigger>
                        <TabsTrigger value="matching">Comparison</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="My Awesome Project"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Validating business listings using AI..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="theme" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Primary Color</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {THEME_PRESETS.map((preset) => (
                                    <button
                                        key={preset.name}
                                        onClick={() => setSelectedTheme(preset.primary)}
                                        className={`
                                            flex items-center justify-between px-3 py-2 rounded-md border text-sm font-medium transition-all
                                            ${selectedTheme === preset.primary ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:bg-muted'}
                                        `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                                                style={{ backgroundColor: preset.primary }} // This might interpret OKLCH depending on browser support, usually works in modern ones. Fallback isn't strictly needed for this internal tool context.
                                            />
                                            {preset.name}
                                        </div>
                                        {selectedTheme === preset.primary && (
                                            <Check className="h-3 w-3 text-primary" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                            <div className="space-y-2">
                                <h4 className="font-semibold" style={{ color: selectedTheme }}>Preview Theme</h4>
                                <p className="text-sm text-muted-foreground">
                                    This is how your project heading and accents will look.
                                </p>
                                <div className="flex gap-2 mt-4">
                                    <Button size="sm" style={{ backgroundColor: selectedTheme, color: 'white' }}>
                                        Primary Button
                                    </Button>
                                    <Button size="sm" variant="outline" style={{ borderColor: selectedTheme, color: selectedTheme }}>
                                        Secondary
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="matching" className="space-y-4 py-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Fields to Compare</Label>
                                {selectedMatchFields.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        {selectedMatchFields.length} field{selectedMatchFields.length !== 1 ? 's' : ''} selected
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Select the fields that should be compared between your original data and AI-validated data to calculate the "Data Match" percentage.
                            </p>

                            {availableFields.length > 0 ? (
                                <>
                                    <div className="flex items-center gap-2 pb-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (selectedMatchFields.length === availableFields.length) {
                                                    setSelectedMatchFields([])
                                                } else {
                                                    setSelectedMatchFields([...availableFields])
                                                }
                                            }}
                                            className="h-8 text-xs"
                                        >
                                            {selectedMatchFields.length === availableFields.length ? 'Clear All' : 'Select All'}
                                        </Button>
                                    </div>

                                    <div className="border rounded-md p-3 max-h-[240px] overflow-y-auto space-y-2">
                                        {availableFields.map((field) => (
                                            <label
                                                key={field}
                                                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMatchFields.includes(field)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedMatchFields([...selectedMatchFields, field])
                                                        } else {
                                                            setSelectedMatchFields(selectedMatchFields.filter(f => f !== field))
                                                        }
                                                    }}
                                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm font-mono">{field}</span>
                                            </label>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="border rounded-md p-6 text-center text-sm text-muted-foreground">
                                    <p>No fields available.</p>
                                    <p className="text-xs mt-1">Upload a file to this project to see available fields.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
