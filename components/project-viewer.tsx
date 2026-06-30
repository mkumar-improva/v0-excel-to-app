"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { api } from "@/lib/api-client";
import { generateAIResponse } from "@/lib/generate-ai-response";
import { AILoader } from "@/components/ai-loader";
import { DataTable } from "./data-table";
import { PromptEditor } from "./prompt-editor";
import { FilterPanel } from "./filter-panel";
import { ExportToExcelDialog } from "./export-to-excel-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Loader2,
  ChevronLeft,
  Filter,
  FileSpreadsheet,
  Play,
  ThumbsUp,
  Undo2,
} from "lucide-react";
import { ExcelFileDB, FilterState, Project } from "@/lib/types";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { isSimilarValue } from "@/lib/data-comparison";

interface ProjectViewerProps {
  fileId: number;
  project: Project;
  promptEditorOpen: boolean;
  onPromptEditorOpenChange: (open: boolean) => void;
  onTemplateUpdate: (template: string) => void;
  refreshTrigger: number;
}

export function ProjectViewer({
  fileId,
  project,
  promptEditorOpen,
  onPromptEditorOpenChange,
  onTemplateUpdate,
  refreshTrigger,
}: ProjectViewerProps) {
  const [file, setFile] = useState<ExcelFileDB | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [promptTemplate, setPromptTemplate] = useState<string>(
    project.prompt_template || "",
  );
  const [filters, setFilters] = useState<FilterState>({});
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState("in-queue");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [approvedResponses, setApprovedResponses] = useState<any[]>([]);
  const [fieldOverrides, setFieldOverrides] = useState<
    Record<number, Record<string, "original" | "validated">>
  >({});
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);

  const matchFields = useMemo(() => {
    try {
      const theme =
        typeof project.theme === "string"
          ? JSON.parse(project.theme)
          : project.theme;
      if (theme?.matchFields && Array.isArray(theme.matchFields)) {
        return theme.matchFields;
      }
    } catch (e) {
      console.error("Failed to parse match fields", e);
    }
    return [];
  }, [project.theme]);

  // Update local state when project prop changes (e.g. initial load)
  useEffect(() => {
    setPromptTemplate(project.prompt_template || "");
  }, [project.prompt_template]);

  // Reset filters only when file changes
  useEffect(() => {
    setFilters({});
  }, [fileId]);

  useEffect(() => {
    if (!fileId) return;
    loadData();
  }, [fileId, refreshTrigger, project.theme]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fileData, entriesData, approvedData] = await Promise.all([
        api.files.get(fileId),
        api.files.listEntries(fileId),
        api.files.listApprovedResponses(fileId),
      ]);

      setFile(fileData);

      const processedRows = entriesData.map((entry) => {
        let confidenceScoreVal = "-";
        if (entry.latest_response_text) {
          try {
            const jsonMatch = entry.latest_response_text.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch
              ? jsonMatch[0]
              : entry.latest_response_text;
            const parsed = JSON.parse(jsonString);
            const rawConfidence = parsed.confidence_score;
            if (rawConfidence !== undefined && rawConfidence !== null) {
              const numConf = Number(rawConfidence);
              if (!isNaN(numConf)) {
                if (numConf <= 1.0) {
                  confidenceScoreVal = `${Math.round(numConf * 100)}%`;
                } else {
                  confidenceScoreVal = `${Math.round(numConf)}%`;
                }
              } else {
                confidenceScoreVal = String(rawConfidence);
              }
            }
          } catch (e) {
            console.error(
              "Failed to parse confidence score from entry response",
              e,
            );
          }
        }

        let commentVal = "-";
        if (entry.latest_response_text) {
          try {
            const jsonMatch = entry.latest_response_text.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch
              ? jsonMatch[0]
              : entry.latest_response_text;
            const parsed = JSON.parse(jsonString);
            if (parsed.comment !== undefined && parsed.comment !== null) {
              commentVal = String(parsed.comment);
            } else if (
              parsed.data_quality_notes !== undefined &&
              parsed.data_quality_notes !== null
            ) {
              commentVal = String(parsed.data_quality_notes);
            }
          } catch (e) {}
        }

        return {
          ...entry.data,
          "Validated Data": entry.approved_response_text || "",
          "Confidence Score": confidenceScoreVal,
          Comment: commentVal,
          _entryId: entry.id,
          _responseCount: entry.response_count || 0,
          _approvedCount: entry.approved_count || 0,
          _latestResponseId: (entry as any).latest_response_id || null,
          _latestResponseText: entry.latest_response_text || null,
          _originalEntryData: entry.data,
          _lastActivity:
            [entry.last_generated_at, entry.last_approved_at]
              .filter(Boolean)
              .sort()
              .pop() || "",
        };
      });

      // Sort by most recent activity desc, then by original row order (stable sort implied or explicit)
      processedRows.sort((a, b) => {
        const timeA = a._lastActivity;
        const timeB = b._lastActivity;

        if (timeA && timeB) {
          return timeB.localeCompare(timeA);
        }
        if (timeA) return -1;
        if (timeB) return 1;
        return 0;
      });

      setRows(processedRows);

      const processedApproved = approvedData.map((resp) => {
        let parsed: any = {};
        try {
          // Try to find JSON in the response
          const jsonMatch = resp.response.match(/\{[\s\S]*\}/);
          const jsonString = jsonMatch ? jsonMatch[0] : resp.response;
          parsed = JSON.parse(jsonString);
        } catch (e) {
          console.error("Failed to parse response", e);
        }

        const validated = parsed.validated_data || parsed;

        const normalize = (s: string) =>
          s.toLowerCase().replace(/[^a-z0-9]/g, "");

        const getCI = (obj: any, targetKey: string) => {
          if (!obj) return "";
          const keys = Object.keys(obj);
          const targetNorm = normalize(targetKey);
          const foundKey = keys.find((k) => normalize(k) === targetNorm);
          return foundKey ? obj[foundKey] : "";
        };

        // Find the actual column name for Service Category from file columns if it exists
        const serviceCategoryCol = file?.columns.find(
          (col) =>
            normalize(col).includes("servicecategory") ||
            normalize(col) === "category",
        );

        const rawConfidence = parsed.confidence_score;
        let confidenceScoreVal = "-";
        if (rawConfidence !== undefined && rawConfidence !== null) {
          const numConf = Number(rawConfidence);
          if (!isNaN(numConf)) {
            if (numConf <= 1.0) {
              confidenceScoreVal = `${Math.round(numConf * 100)}%`;
            } else {
              confidenceScoreVal = `${Math.round(numConf)}%`;
            }
          } else {
            confidenceScoreVal = String(rawConfidence);
          }
        }

        return {
          "Service Category": serviceCategoryCol
            ? (resp.entry_data as any)[serviceCategoryCol]
            : getCI(resp.entry_data, "Service Category"),
          ...resp.entry_data,
          ...resp,
          Name:
            getCI(validated, "name") ||
            getCI(validated, "location") ||
            getCI(resp.entry_data, "Name") ||
            getCI(resp.entry_data, "Location"),
          Address: getCI(validated, "address"),
          City: getCI(validated, "city"),
          State: getCI(validated, "state"),
          Zip: getCI(validated, "zip"),
          Telephone:
            getCI(validated, "telephone") ||
            getCI(validated, "phone") ||
            getCI(resp.entry_data, "Telephone") ||
            getCI(resp.entry_data, "Phone"),
          Fax: getCI(validated, "fax"),
          Website: getCI(validated, "website"),
          Comment: parsed.comment || parsed.data_quality_notes || "-",
          "Validated Data": resp.response,
          Model: resp.model,
          Tokens: resp.total_tokens,
          Cost: resp.estimated_cost
            ? `$${resp.estimated_cost.toFixed(4)}`
            : "$0.0000",
          "Approved At": resp.approved_at
            ? new Date(resp.approved_at).toLocaleString("en-US")
            : "",
          "Confidence Score": confidenceScoreVal,
          _entryId: resp.entry_id,
          _responseCount: 1,
          _approvedCount: 1,
        };
      });

      setApprovedResponses(processedApproved);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSave = async () => {
    try {
      setSavingTemplate(true);
      await api.projects.update(project.id, {
        name: project.name,
        description: project.description,
        prompt_template: promptTemplate,
      });
      onTemplateUpdate(promptTemplate);
      toast.success("Prompt template saved");
      onPromptEditorOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const stopBatchRef = useRef(false);

  const handleStopBatch = () => {
    stopBatchRef.current = true;
  };

  // Helper to extract validated data from a response, shared between generated & approved processing
  const normalize = useCallback(
    (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ""),
    [],
  );

  const getCI = useCallback(
    (obj: any, targetKey: string) => {
      if (!obj) return "";
      const keys = Object.keys(obj);
      const targetNorm = normalize(targetKey);
      const foundKey = keys.find((k) => normalize(k) === targetNorm);
      return foundKey ? obj[foundKey] : "";
    },
    [normalize],
  );

  const displayRows = useMemo(() => {
    if (activeTab === "approved") {
      return approvedResponses.filter((row) => {
        return Object.entries(filters).every(([column, filterValues]) => {
          if (!filterValues || filterValues.length === 0) return true;
          const cellValue = String(row[column] ?? "");
          return filterValues.includes(cellValue);
        });
      });
    }

    if (activeTab === "generated") {
      // Process generated rows to show validated data columns (like approved tab)
      const generatedRaw = rows.filter((row) => {
        const passesFilters = Object.entries(filters).every(
          ([column, filterValues]) => {
            if (!filterValues || filterValues.length === 0) return true;
            const cellValue = String(row[column] ?? "");
            return filterValues.includes(cellValue);
          },
        );
        if (!passesFilters) return false;
        return (row._responseCount || 0) > 0 && (row._approvedCount || 0) === 0;
      });

      return generatedRaw.map((row) => {
        let parsed: any = {};
        try {
          const jsonMatch = row._latestResponseText?.match(/\{[\s\S]*\}/);
          const jsonString = jsonMatch ? jsonMatch[0] : row._latestResponseText;
          parsed = JSON.parse(jsonString);
        } catch (e) {}

        const validated = parsed.validated_data || parsed;
        const original = row._originalEntryData || {};

        // Build validated and original value maps for the display columns
        const validatedValues: Record<string, string> = {
          Name:
            getCI(validated, "name") ||
            getCI(validated, "location") ||
            getCI(original, "Name") ||
            getCI(original, "Location"),
          Address: getCI(validated, "address") || getCI(original, "Address"),
          City: getCI(validated, "city") || getCI(original, "City"),
          State: getCI(validated, "state") || getCI(original, "State"),
          Zip: getCI(validated, "zip") || getCI(original, "Zip"),
          Telephone:
            getCI(validated, "telephone") ||
            getCI(validated, "phone") ||
            getCI(original, "Telephone") ||
            getCI(original, "Phone"),
          Fax: getCI(validated, "fax") || getCI(original, "Fax"),
          Website: getCI(validated, "website") || getCI(original, "Website"),
        };

        const originalValues: Record<string, string> = {
          Name: getCI(original, "Name") || getCI(original, "Location") || "",
          Address: getCI(original, "Address") || "",
          City: getCI(original, "City") || "",
          State: getCI(original, "State") || "",
          Zip: getCI(original, "Zip") || "",
          Telephone:
            getCI(original, "Telephone") || getCI(original, "Phone") || "",
          Fax: getCI(original, "Fax") || "",
          Website: getCI(original, "Website") || "",
        };

        // Detect changed fields
        const changedFields: string[] = [];
        const toggleableFields = [
          "Name",
          "Address",
          "City",
          "State",
          "Zip",
          "Telephone",
          "Fax",
          "Website",
        ];
        toggleableFields.forEach((field) => {
          const origVal = originalValues[field] || "";
          const valVal = validatedValues[field] || "";
          // Use the same fuzzy comparison as ResponseViewer to stay consistent
          if (!isSimilarValue(origVal, valVal, field) && (origVal !== "" || valVal !== "")) {
            changedFields.push(field);
          }
        });

        // Apply field overrides to compute display values
        const entryId = row._entryId as number;
        const overrides = fieldOverrides[entryId] || {};
        const displayValues: Record<string, string> = {};
        toggleableFields.forEach((field) => {
          if (overrides[field] === "original") {
            displayValues[field] = originalValues[field];
          } else {
            displayValues[field] = validatedValues[field];
          }
        });

        const serviceCategoryCol = file?.columns.find(
          (col) =>
            normalize(col).includes("servicecategory") ||
            normalize(col) === "category",
        );

        const rawConfidence = parsed.confidence_score;
        let confidenceScoreVal = "-";
        if (rawConfidence !== undefined && rawConfidence !== null) {
          const numConf = Number(rawConfidence);
          if (!isNaN(numConf)) {
            confidenceScoreVal =
              numConf <= 1.0
                ? `${Math.round(numConf * 100)}%`
                : `${Math.round(numConf)}%`;
          } else {
            confidenceScoreVal = String(rawConfidence);
          }
        }

        return {
          "Service Category": serviceCategoryCol
            ? original[serviceCategoryCol]
            : getCI(original, "Service Category"),
          ...displayValues,
          "Confidence Score": confidenceScoreVal,
          Comment: parsed.comment || parsed.data_quality_notes || "-",
          _entryId: entryId,
          _responseCount: row._responseCount,
          _approvedCount: row._approvedCount,
          _latestResponseId: row._latestResponseId,
          _latestResponseText: row._latestResponseText,
          _originalValues: originalValues,
          _validatedValues: validatedValues,
          _changedFields: changedFields,
        };
      });
    }

    // In-queue tab: show original data
    return rows.filter((row) => {
      const passesFilters = Object.entries(filters).every(
        ([column, filterValues]) => {
          if (!filterValues || filterValues.length === 0) return true;
          const cellValue = String(row[column] ?? "");
          return filterValues.includes(cellValue);
        },
      );
      if (!passesFilters) return false;
      return (row._responseCount || 0) === 0;
    });
  }, [
    activeTab,
    rows,
    approvedResponses,
    filters,
    fieldOverrides,
    file?.columns,
    getCI,
    normalize,
  ]);

  const displayColumns = useMemo(() => {
    if (activeTab === "approved") {
      return [
        "Service Category",
        "Name",
        "Address",
        "City",
        "State",
        "Zip",
        "Telephone",
        "Fax",
        "Website",
        "Model",
        "Tokens",
        "Cost",
        "Approved At",
        "Confidence Score",
        "Comment",
      ];
    }
    if (activeTab === "generated") {
      return [
        "Service Category",
        "Name",
        "Address",
        "City",
        "State",
        "Zip",
        "Telephone",
        "Fax",
        "Website",
        "Confidence Score",
        "Comment",
      ];
    }
    return file?.columns || [];
  }, [activeTab, file?.columns]);

  const handleFieldToggle = useCallback((entryId: number, field: string) => {
    setFieldOverrides((prev) => {
      const current = prev[entryId]?.[field];
      const newVal = current === "original" ? "validated" : "original";
      return {
        ...prev,
        [entryId]: {
          ...(prev[entryId] || {}),
          [field]: newVal,
        },
      };
    });
  }, []);

  const handleBulkApprove = async () => {
    if (selectedRows.size === 0) {
      toast.error("No rows selected");
      return;
    }

    setIsBulkApproving(true);
    const selectedIds = Array.from(selectedRows);

    try {
      const result = await api.entries.bulkApproveResponses(selectedIds);
      toast.success(`${result.approvedCount} approved`);
    } catch (err) {
      console.error("Failed to bulk approve:", err);
      toast.error("Failed to approve selected rows");
    }

    setIsBulkApproving(false);
    setSelectedRows(new Set());
    setFieldOverrides((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => delete next[id]);
      return next;
    });

    loadData();
  };

  const handleBulkRevert = async () => {
    if (selectedRows.size === 0) {
      toast.error("No rows selected");
      return;
    }

    const selectedIds = Array.from(selectedRows);

    setIsBulkRejecting(true);

    try {
      const result = await api.entries.bulkDeleteResponses(selectedIds);
      toast.success(`${result.deletedCount} reverted to In Queue`);
    } catch (err) {
      console.error("Failed to bulk revert:", err);
      toast.error("Failed to revert selected rows");
    }

    setIsBulkRejecting(false);
    setSelectedRows(new Set());

    setFieldOverrides((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => delete next[id]);
      return next;
    });

    loadData();
  };

  const handleBatchProcess = async () => {
    if (selectedRows.size === 0) {
      toast.error("No rows selected");
      return;
    }

    setIsBatchProcessing(true);
    stopBatchRef.current = false;
    setBatchProgress({ current: 0, total: selectedRows.size });

    const selectedEntries = rows.filter((row) =>
      selectedRows.has(row._entryId as number),
    );
    let successCount = 0;
    let failCount = 0;
    let stopped = false;

    for (let i = 0; i < selectedEntries.length; i++) {
      if (stopBatchRef.current) {
        stopped = true;
        break;
      }

      const row = selectedEntries[i];
      setBatchProgress({ current: i + 1, total: selectedRows.size });

      try {
        // Generate prompt from template — same fallback as single-entry flow
        const template = promptTemplate || `Please validate and verify the business contact information.
        Name: {{Name}}
        Address: {{Address}}
        City: {{City}}
        State: {{State}}
        Zip: {{Zip}}
        Telephone: {{Telephone}}`;
        let entryPrompt = template;
        file?.columns.forEach((col) => {
          const regex = new RegExp(`{{${col}}}`, "gi");
          entryPrompt = entryPrompt.replace(regex, String(row[col] ?? ""));
        });

        // Use same generateAIResponse as handleSendToAI in prompt-dialog
        const result = await generateAIResponse(entryPrompt, template);

        // Save response as pending
        await api.entries.createResponse(row._entryId as number, {
          prompt: entryPrompt,
          response: result.finalResponse,
          input_tokens: result.tokenUsage?.inputTokens || 0,
          output_tokens: result.tokenUsage?.outputTokens || 0,
          total_tokens: result.tokenUsage?.totalTokens || 0,
          estimated_cost: result.tokenUsage?.estimatedCost || 0,
          status: "pending",
          approved_at: undefined,
        });

        successCount++;
      } catch (err) {
        console.error(`Failed to process row ${row._entryId}:`, err);
        failCount++;
      }
    }

    setIsBatchProcessing(false);
    setBatchProgress({ current: 0, total: 0 });

    // Only clear selection if completed normally
    if (!stopped) {
      setSelectedRows(new Set());
      toast.success(
        `Batch processing complete: ${successCount} succeeded, ${failCount} failed`,
      );
    } else {
      toast.info(
        `Batch processing stopped: ${successCount} succeeded, ${failCount} failed`,
      );
    }

    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <AILoader message="Loading project data..." />
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a file to view data
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex items-center gap-4 border-b px-4 py-2 bg-background shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{file.file_name}</h2>
          <p className="text-xs text-muted-foreground">
            {displayRows.length} of{" "}
            {activeTab === "approved" ? approvedResponses.length : rows.length}{" "}
            {activeTab === "approved" ? "responses" : "rows"}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {activeTab === "in-queue" && selectedRows.size > 0 && (
            <div className="flex items-center gap-2">
              {isBatchProcessing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing {batchProgress.current}/{batchProgress.total}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleStopBatch}
                  >
                    Stop
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBatchProcess}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <Play className="h-4 w-4" />
                  Process Batch ({selectedRows.size})
                </Button>
              )}
            </div>
          )}
          {activeTab === "generated" && selectedRows.size > 0 && (
            <div className="flex items-center gap-2">
              {isBulkRejecting ? (
                <Button variant="outline" size="sm" disabled className="gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reverting...
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkRevert}
                  className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Undo2 className="h-4 w-4" />
                  Revert to Queue ({selectedRows.size})
                </Button>
              )}
              {isBulkApproving ? (
                <Button variant="outline" size="sm" disabled className="gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Approving...
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBulkApprove}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Approve ({selectedRows.size})
                </Button>
              )}
            </div>
          )}
          {activeTab === "approved" && displayRows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
          )}
          <Tabs
            value={activeTab}
            onValueChange={(tab) => {
              setActiveTab(tab);
              setSelectedRows(new Set());
            }}
          >
            <TabsList>
              <TabsTrigger value="in-queue">In Queue</TabsTrigger>
              <TabsTrigger value="generated">Generated</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`relative border-r border-border bg-card transition-all duration-300 ease-in-out ${
            leftPanelOpen ? "w-64" : "w-12"
          }`}
        >
          {leftPanelOpen ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border border-border bg-card shadow-sm"
                onClick={() => setLeftPanelOpen(false)}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="overflow-y-auto h-full">
                <FilterPanel
                  columns={file.columns}
                  rows={rows}
                  filters={filters}
                  onFilterChange={setFilters}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center pt-4 gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setLeftPanelOpen(true)}
                title="Open Filters"
              >
                <Filter className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground [writing-mode:vertical-lr] rotate-180">
                Filters
              </span>
            </div>
          )}
        </aside>

        <main className="flex-1 overflow-hidden">
          <DataTable
            columns={displayColumns}
            rows={displayRows}
            promptTemplate={promptTemplate}
            onDataChange={loadData}
            matchFields={matchFields}
            showMultiSelect={
              activeTab === "in-queue" || activeTab === "generated"
            }
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            showFieldToggles={activeTab === "generated"}
            fieldOverrides={fieldOverrides}
            onFieldToggle={handleFieldToggle}
            isApproved={activeTab === "approved"}
          />
        </main>
      </div>

      <Dialog open={promptEditorOpen} onOpenChange={onPromptEditorOpenChange}>
        <DialogContent className="sm:max-w-[80vw] w-[80vw] max-h-[85vh] h-[85vh] flex flex-col overflow-hidden p-6 gap-0">
          <DialogHeader className="shrink-0 pb-4 border-b">
            <DialogTitle>Edit Prompt Template</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-4">
            <div className="flex-1 min-h-0">
              <PromptEditor
                template={promptTemplate}
                onTemplateChange={setPromptTemplate}
                columns={file.columns}
              />
            </div>
            <div className="flex justify-end pt-4 gap-2 border-t shrink-0">
              <Button
                variant="outline"
                onClick={() => onPromptEditorOpenChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleTemplateSave} disabled={savingTemplate}>
                {savingTemplate ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ExportToExcelDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        rows={displayRows}
        columns={displayColumns}
        fileName={`${file.file_name.replace(/\.[^/.]+$/, "")}_approved`}
      />
    </div>
  );
}
