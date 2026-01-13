"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { api } from "@/lib/api-client"
import { ResponseViewer } from "@/components/response-viewer"
import { AIResponse } from "@/lib/types"

interface PromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: string
  rowData: Record<string, unknown> | null
  initialTab?: "prompt" | "response"
}

export function PromptDialog({ open, onOpenChange, prompt, rowData, initialTab = "prompt" }: PromptDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("prompt")
  const [latestResponse, setLatestResponse] = useState<AIResponse | null>(null)
  const processingRef = useRef(false)

  // Helper to parse response
  const getParsedResponse = () => {
    try {
      // Find JSON blob if embedded in text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse
      return JSON.parse(jsonString)
    } catch (e) {
      return null
    }
  }

  const parsedData = getParsedResponse()

  useEffect(() => {
    if (open) {
      setAiResponse("")
      setLatestResponse(null)
      setActiveTab(initialTab)
      if (initialTab === "response" && rowData?._entryId) {
        loadLatestResponse(rowData._entryId as number)
      }
    }
  }, [open, initialTab, rowData])

  const loadLatestResponse = async (entryId: number) => {
    try {
      setIsLoading(true)
      const responses = await api.entries.listResponses(entryId)
      if (responses && responses.length > 0) {
        // Assume ordered by created_at desc or sort
        const latest = responses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        setAiResponse(latest.response)
        setLatestResponse(latest)
      } else {
        setAiResponse("No response found.")
        setLatestResponse(null)
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to load response")
    } finally {
      setIsLoading(false)
    }
  }

  const saveResponse = async (fullResponse: string, usedPrompt: string) => {
    const entryId = rowData?._entryId as number | undefined
    if (!entryId) return

    try {
      const resp = await api.entries.createResponse(entryId, {
        prompt: usedPrompt,
        response: fullResponse,
        model: "gemini-3-pro-preview"
      })
      setLatestResponse(resp)
      toast.success("Response saved to database")
    } catch (err) {
      console.error("Failed to save response:", err)
      toast.error("Failed to save response to database")
    }
  }

  const handleSendToAI = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt
    if (processingRef.current) return
    processingRef.current = true
    setIsLoading(true)
    setAiResponse("")
    setLatestResponse(null)
    setActiveTab("response")

    let fullResponse = ""

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: activePrompt }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        toast.error(`Generation failed: ${errorText || response.statusText}`)
        throw new Error("Failed to generate response")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          fullResponse += chunk
          setAiResponse((prev) => prev + chunk)
        }
      }

      // Save to backend after complete
      await saveResponse(fullResponse, activePrompt)

    } catch (error) {
      console.error("Error generating AI response:", error)
      toast.error("Error generating response. Please try again.")
    } finally {
      setIsLoading(false)
      processingRef.current = false
    }
  }

  const handleApprove = async () => {
    if (!latestResponse) return
    try {
      setIsLoading(true)
      const updated = await api.entries.updateResponse(latestResponse.id, {
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      setLatestResponse(updated)
      toast.success("Response approved")
    } catch (err) {
      console.error(err)
      toast.error("Failed to approve response")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReiterate = () => {
    const reiterationPrompt = prompt + "\n\nIMPORTANT: Please re-iterate the analysis. Use more sources if available and double check all data points for accuracy."
    handleSendToAI(reiterationPrompt)
  }

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt)
    toast.success("Prompt copied to clipboard")
  }

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(aiResponse)
    toast.success("Response copied to clipboard")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] h-[94vh] sm:max-w-none overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle>Generate AI Prompt</DialogTitle>
          <DialogDescription>Review the generated prompt and send it to AI</DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (isLoading) return
            setActiveTab(value)
          }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="prompt" disabled={isLoading}>
                Prompt
              </TabsTrigger>
              <TabsTrigger value="response" disabled={isLoading}>
                AI Response
                {isLoading && <span className="ml-2 w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="prompt" className="flex-1 mt-4 px-6 pb-6 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 w-full rounded-md border border-border p-4 bg-muted/30 overflow-y-scroll">
              <pre className="text-sm whitespace-pre-wrap font-mono">{prompt}</pre>
            </ScrollArea>

            <div className="flex gap-2 mt-4 shrink-0">
              <Button onClick={handleCopyPrompt} variant="outline" className="flex-1 bg-transparent">
                Copy Prompt
              </Button>
              <Button
                onClick={() => handleSendToAI()}
                disabled={isLoading}
                className="flex-1 bg-primary text-primary-foreground"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    Generating...
                  </>
                ) : (
                  <>Send to AI</>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="response" className="flex-1 mt-0 overflow-hidden flex flex-col h-full">
            {aiResponse ? (
              parsedData ? (
                <div className="flex-1 overflow-hidden">
                  <ResponseViewer
                    data={parsedData}
                    rawJson={aiResponse}
                    onApprove={handleApprove}
                    onReiterate={handleReiterate}
                    status={latestResponse?.status}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-hidden p-6 pb-0 flex flex-col">
                  <ScrollArea className="flex-1 w-full rounded-md border border-border p-4 bg-muted/30">
                    <div className="prose prose-sm dark:prose-invert max-w-none w-full break-words">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: ({ className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || "")
                            return match ? (
                              <pre className={`${className || ''} whitespace-pre-wrap break-words`}>
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {aiResponse}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                  <div className="py-4 shrink-0">
                    <Button onClick={handleCopyResponse} variant="outline" className="w-full">
                      Copy Response
                    </Button>
                  </div>
                </div>
              )
            ) : isLoading ? (
              <div className="flex-1 p-6 space-y-3 animate-pulse">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-4 w-5/6 rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                No response yet. Send a prompt to AI.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
