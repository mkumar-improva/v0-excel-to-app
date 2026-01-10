"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: string
  rowData: Record<string, unknown> | null
}

export function PromptDialog({ open, onOpenChange, prompt }: PromptDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("prompt")

  useEffect(() => {
    if (open) {
      setAiResponse("")
      setActiveTab("prompt")
    }
  }, [open])

  const handleSendToAI = async () => {
    setIsLoading(true)
    setAiResponse("")
    setActiveTab("response")

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate response")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          setAiResponse((prev) => prev + chunk)
        }
      }
    } catch (error) {
      console.error("Error generating AI response:", error)
      setAiResponse("Error generating response. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt)
  }

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(aiResponse)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Generate AI Prompt</DialogTitle>
          <DialogDescription>Review the generated prompt and send it to AI</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="response">
              AI Response
              {isLoading && <span className="ml-2 w-2 h-2 rounded-full bg-primary animate-pulse" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="mt-4">
            <ScrollArea className="h-[300px] w-full rounded-md border border-border p-4 bg-muted/30">
              <pre className="text-sm whitespace-pre-wrap font-mono">{prompt}</pre>
            </ScrollArea>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleCopyPrompt} variant="outline" className="flex-1 bg-transparent">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Prompt
              </Button>
              <Button
                onClick={handleSendToAI}
                disabled={isLoading}
                className="flex-1 bg-primary text-primary-foreground"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Send to AI
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="response" className="mt-4">
            <ScrollArea className="h-[300px] w-full rounded-md border border-border p-4 bg-muted/30">
              {aiResponse ? (
                <div className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                  {aiResponse}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {isLoading ? "Generating response..." : "No response yet. Send a prompt to AI."}
                </div>
              )}
            </ScrollArea>

            {aiResponse && (
              <div className="flex gap-2 mt-4">
                <Button onClick={handleCopyResponse} variant="outline" className="flex-1 bg-transparent">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy Response
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
