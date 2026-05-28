import React, { useEffect, useRef, useState } from "react";
import { Shield, RefreshCw, ChevronDown, Plus, Pencil, Trash2, Check, X, UserCheck, Download, Upload, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const PLAN_TIERS = [
  { id: "done_for_you",  label: "Done For You" },
  { id: "done_with_you", label: "Done With You" },
  { id: "done_by_you",   label: "Done By You" },
  { id: "crowdfunding",  label: "Crowdfunding" },
];

type AdminUser = {
  id: string | number;
  email: string;
  name?: string;
  plan?: string;
};

type SurveyQuestion = {
  "db/id": string | number;
  "question/text": string;
  "question/order": number;
};

type Props = {
  users?: AdminUser[];
  isLoading?: boolean;
  onLoad?: () => void;
  onSetPlan?: (email: string, tier: string) => void;
  onImpersonate?: (email: string) => void;
  questions?: SurveyQuestion[];
  questionsLoading?: boolean;
  onLoadQuestions?: () => void;
  onAddQuestion?: (text: string, order: number) => void;
  onUpdateQuestion?: (id: string | number, text: string) => void;
  onDeleteQuestion?: (id: string | number) => void;
  onExportData?: (email: string) => void;
  onImportEdn?: (rawEdn: string) => void;
  isExporting?: boolean;
  isImporting?: boolean;
};

function planLabel(tier?: string): string {
  return PLAN_TIERS.find((t) => t.id === tier)?.label ?? "—";
}

export default function AdminPanel({
  users = [],
  isLoading = false,
  onLoad,
  onSetPlan,
  onImpersonate,
  questions = [],
  questionsLoading = false,
  onLoadQuestions,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onExportData,
  onImportEdn,
  isExporting = false,
  isImporting = false,
}: Props) {
  const [setting, setSetting] = useState<string | null>(null);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [exportEmail, setExportEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onLoad?.();
    onLoadQuestions?.();
  }, []);

  const handleSetPlan = (email: string, tier: string) => {
    setSetting(email);
    onSetPlan?.(email, tier);
    setTimeout(() => setSetting(null), 1500);
  };

  const handleAddQuestion = () => {
    const text = newQuestionText.trim();
    if (!text) return;
    onAddQuestion?.(text, questions.length);
    setNewQuestionText("");
  };

  const handleStartEdit = (q: SurveyQuestion) => {
    setEditingId(q["db/id"]);
    setEditingText(q["question/text"]);
  };

  const handleSaveEdit = () => {
    if (editingId != null) {
      onUpdateQuestion?.(editingId, editingText.trim());
      setEditingId(null);
      setEditingText("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleImport = () => {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      onImportEdn?.(content);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(selectedFile);
  };

  const sortedQuestions = [...questions].sort(
    (a, b) => (a["question/order"] ?? 0) - (b["question/order"] ?? 0)
  );

  return (
    <div className="space-y-6">
      {/* Users section */}
      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-800">Super Admin</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => onLoad?.()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading && users.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No users found.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border border-amber-100 bg-white px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.email}</p>
                    {u.name && (
                      <p className="text-xs text-muted-foreground truncate">{u.name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge
                      variant={u.plan ? "default" : "secondary"}
                      className="text-xs font-mono"
                    >
                      {u.plan ? planLabel(u.plan) : "no plan"}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={setting === u.email}
                        >
                          Set plan
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {PLAN_TIERS.map((tier) => (
                          <DropdownMenuItem
                            key={tier.id}
                            onClick={() => handleSetPlan(u.email, tier.id)}
                            className={u.plan === tier.id ? "font-semibold" : ""}
                          >
                            {tier.label}
                            {u.plan === tier.id && " ✓"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      onClick={() => onImpersonate?.(u.email)}
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      View as
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Survey questions section */}
      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-800">Survey Questions</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => onLoadQuestions?.()}
            disabled={questionsLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${questionsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {questionsLoading && sortedQuestions.length === 0 ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          ) : sortedQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No questions yet.</p>
          ) : (
            <div className="space-y-2">
              {sortedQuestions.map((q, idx) => (
                <div
                  key={q["db/id"]}
                  className="flex items-center gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>

                  {editingId === q["db/id"] ? (
                    <>
                      <Input
                        className="h-7 text-sm flex-1"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleSaveEdit}>
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCancelEdit}>
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm flex-1 min-w-0 truncate">{q["question/text"]}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleStartEdit(q)}
                      >
                        <Pencil className="h-3.5 w-3.5 text-amber-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => onDeleteQuestion?.(q["db/id"])}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new question */}
          <div className="flex gap-2 pt-1">
            <Input
              className="h-8 text-sm"
              placeholder="New question text…"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddQuestion(); }}
            />
            <Button
              size="sm"
              className="h-8 shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleAddQuestion}
              disabled={!newQuestionText.trim()}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Export / Import section */}
      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-800">Data Export / Import</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Export */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-900">Export user data (EDN)</p>
            <div className="flex gap-2">
              <Input
                placeholder="user@example.com"
                value={exportEmail}
                onChange={(e) => setExportEmail(e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <Button
                size="sm"
                className="h-8 shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => onExportData?.(exportEmail.trim())}
                disabled={!exportEmail.trim() || isExporting}
              >
                {isExporting
                  ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  : <Download className="h-3.5 w-3.5 mr-1" />}
                Export
              </Button>
            </div>
          </div>

          {/* Import */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-900">Import data from EDN file</p>
            <div className="flex gap-2 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".edn,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                {selectedFile ? selectedFile.name : "Choose .edn file"}
              </Button>
              {selectedFile && (
                <Button
                  size="sm"
                  className="h-8 shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleImport}
                  disabled={isImporting}
                >
                  {isImporting
                    ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    : <Upload className="h-3.5 w-3.5 mr-1" />}
                  Import
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Restores raw DB rows. Existing rows with same IDs will be replaced.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
