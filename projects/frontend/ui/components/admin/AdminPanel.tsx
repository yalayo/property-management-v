import React, { useEffect, useRef, useState } from "react";
import { Shield, RefreshCw, ChevronDown, Plus, Pencil, Trash2, Check, X, UserCheck, Download, Upload, Loader2, Pause, Play, History, Clock, AlertTriangle, Flag, Settings2, Save } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
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

type TrialHistoryEntry = { type: string; ts: number };

type TrialInfo = {
  status: "active" | "paused" | "expired";
  "days-remaining": number;
  "started-at": number;
  paused: boolean;
  history?: TrialHistoryEntry[];
};

type AdminUser = {
  id: string | number;
  email: string;
  name?: string;
  plan?: string;
  trial?: TrialInfo;
};

type SurveyQuestion = {
  "db/id": string | number;
  "question/text": string;
  "question/order": number;
};

type Feature = {
  "db/id": string | number;
  "feature/key": string;
  "feature/name": string;
  "feature/description"?: string;
  "feature/category"?: string;
  "feature/default-on"?: boolean;
  "feature/enabled"?: boolean;
};

// Per-organization resolution of a feature (returned for the overrides dialog).
type OrgFeature = {
  key: string;
  name: string;
  description?: string;
  category?: string;
  "default-on"?: boolean;
  enabled?: boolean;         // global master switch
  override?: boolean | null; // per-org override: null/undefined = use default
  effective?: boolean;       // resolved on/off for this org
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
  onPauseUserTrial?: (email: string) => void;
  onResumeUserTrial?: (email: string) => void;
  onExtendUserTrial?: (email: string, days: number) => void;
  // Feature flags
  features?: Feature[];
  featuresLoading?: boolean;
  onLoadFeatures?: () => void;
  onCreateFeature?: (data: { key: string; name: string; description: string; category: string; "default-on": boolean }) => void;
  onUpdateFeature?: (id: string | number, data: Record<string, any>) => void;
  onDeleteFeature?: (id: string | number) => void;
  orgFeatures?: OrgFeature[];
  orgFeaturesLoading?: boolean;
  onLoadOrgFeatures?: (email: string) => void;
  onSetOrgFeature?: (email: string, featureKey: string, enabled: boolean | null) => void;
};

function planLabel(tier?: string): string {
  return PLAN_TIERS.find((t) => t.id === tier)?.label ?? "—";
}

function TrialStatusBadge({ trial }: { trial?: TrialInfo }) {
  if (!trial) return <Badge variant="secondary" className="text-xs font-mono">no trial</Badge>;
  const days = Math.ceil(trial["days-remaining"] ?? 0);
  if (trial.status === "expired") {
    return <Badge variant="destructive" className="text-xs font-mono flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Expired</Badge>;
  }
  if (trial.status === "paused") {
    return <Badge variant="outline" className="text-xs font-mono text-slate-600 flex items-center gap-1"><Pause className="h-3 w-3" />{days}d left (paused)</Badge>;
  }
  return <Badge variant="outline" className="text-xs font-mono text-blue-700 border-blue-300 flex items-center gap-1"><Clock className="h-3 w-3" />{days}d left</Badge>;
}

function TrialHistoryDialog({ email, trial, open, onClose }: { email: string; trial?: TrialInfo; open: boolean; onClose: () => void }) {
  const history = trial?.history ?? [];
  const startedAt = trial?.["started-at"];
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Trial History — {email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-xs">
          {startedAt && (
            <div className="text-muted-foreground">
              Started: {new Date(startedAt).toLocaleString()}
            </div>
          )}
          {history.length === 0 ? (
            <p className="text-muted-foreground">No events yet.</p>
          ) : (
            <div className="space-y-1 mt-2">
              {history.map((e, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`font-semibold w-14 ${e.type === "pause" ? "text-slate-600" : e.type === "resume" ? "text-blue-600" : "text-green-600"}`}>
                    {e.type}
                  </span>
                  <span className="text-muted-foreground">{new Date(e.ts).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          {trial && (
            <div className="mt-3 pt-2 border-t text-muted-foreground">
              Status: <span className="font-semibold text-foreground">{trial.status}</span>
              {" · "}{Math.ceil(trial["days-remaining"] ?? 0)} day(s) remaining
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const FEATURE_CATEGORIES = [
  { id: "section", label: "Section" },
  { id: "module",  label: "Module" },
];

function FeatureManagementCard({
  features,
  loading,
  onLoad,
  onCreate,
  onUpdate,
  onDelete,
}: {
  features: Feature[];
  loading: boolean;
  onLoad?: () => void;
  onCreate?: Props["onCreateFeature"];
  onUpdate?: Props["onUpdateFeature"];
  onDelete?: Props["onDeleteFeature"];
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ key: "", name: "", description: "", category: "module", defaultOn: true });
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", category: "module", defaultOn: true });

  useEffect(() => { onLoad?.(); }, []);

  const resetAdd = () => { setForm({ key: "", name: "", description: "", category: "module", defaultOn: true }); setAdding(false); };
  const submitAdd = () => {
    const key = form.key.trim();
    if (!key || !form.name.trim()) return;
    onCreate?.({ key, name: form.name.trim(), description: form.description.trim(), category: form.category, "default-on": form.defaultOn });
    resetAdd();
  };

  const startEdit = (f: Feature) => {
    setEditingId(f["db/id"]);
    setEditForm({
      name: f["feature/name"] ?? "",
      description: f["feature/description"] ?? "",
      category: f["feature/category"] ?? "module",
      defaultOn: f["feature/default-on"] !== false,
    });
  };
  const saveEdit = () => {
    if (editingId == null) return;
    onUpdate?.(editingId, { name: editForm.name.trim(), description: editForm.description.trim(), category: editForm.category, "default-on": editForm.defaultOn });
    setEditingId(null);
  };

  const sorted = [...features].sort((a, b) =>
    (a["feature/category"] ?? "").localeCompare(b["feature/category"] ?? "") ||
    (a["feature/name"] ?? "").localeCompare(b["feature/name"] ?? "")
  );

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-amber-800">Feature Management</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-amber-300 text-amber-700 hover:bg-amber-100"
          onClick={() => onLoad?.()}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          The global feature catalog. Toggling a feature off here disables it for every organization (master switch).
          Default determines whether an organization gets the feature unless a per-user override is set.
        </p>

        {loading && sorted.length === 0 ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No features yet.</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((f) => {
              const enabled = f["feature/enabled"] !== false;
              const defaultOn = f["feature/default-on"] !== false;
              const isEditing = editingId === f["db/id"];
              return (
                <div key={f["db/id"]} className="rounded-lg border border-amber-100 bg-white px-3 py-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input className="h-8 text-sm" placeholder="Name" value={editForm.name} onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))} />
                        <Select value={editForm.category} onValueChange={(v) => setEditForm((s) => ({ ...s, category: v }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{FEATURE_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Input className="h-8 text-sm" placeholder="Description" value={editForm.description} onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))} />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={editForm.defaultOn} onCheckedChange={(c) => setEditForm((s) => ({ ...s, defaultOn: !!c }))} />
                          On by default for new orgs
                        </label>
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 bg-amber-600 hover:bg-amber-700 text-white" onClick={saveEdit}><Save className="h-3.5 w-3.5 mr-1" />Save</Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{f["feature/name"]}</p>
                          <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{f["feature/key"]}</code>
                          <Badge variant="secondary" className="text-[10px]">{f["feature/category"] ?? "module"}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${defaultOn ? "text-green-700 border-green-300" : "text-slate-500"}`}>
                            default {defaultOn ? "on" : "off"}
                          </Badge>
                        </div>
                        {f["feature/description"] && <p className="text-xs text-muted-foreground truncate mt-0.5">{f["feature/description"]}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-7 text-xs ${enabled ? "border-green-300 text-green-700 hover:bg-green-50" : "border-slate-300 text-slate-500 hover:bg-slate-50"}`}
                          onClick={() => onUpdate?.(f["db/id"], { enabled: !enabled })}
                        >
                          {enabled ? "Enabled" : "Disabled"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(f)}><Pencil className="h-3.5 w-3.5 text-amber-600" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete?.(f["db/id"])}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add feature */}
        {adding ? (
          <div className="rounded-lg border border-amber-200 bg-white p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-8 text-sm" placeholder="key (e.g. section-reports)" value={form.key} onChange={(e) => setForm((s) => ({ ...s, key: e.target.value }))} />
              <Input className="h-8 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <Input className="h-8 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            <div className="flex items-center justify-between gap-2">
              <Select value={form.category} onValueChange={(v) => setForm((s) => ({ ...s, category: v }))}>
                <SelectTrigger className="h-8 text-sm w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{FEATURE_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm cursor-pointer flex-1">
                <Checkbox checked={form.defaultOn} onCheckedChange={(c) => setForm((s) => ({ ...s, defaultOn: !!c }))} />
                Default on
              </label>
              <div className="flex gap-1">
                <Button size="sm" className="h-8 bg-amber-600 hover:bg-amber-700 text-white" onClick={submitAdd} disabled={!form.key.trim() || !form.name.trim()}>Create</Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={resetAdd}>Cancel</Button>
              </div>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add feature
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function FeatureOverridesDialog({
  email,
  features,
  loading,
  open,
  onClose,
  onLoad,
  onSet,
}: {
  email: string;
  features: OrgFeature[];
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onLoad?: (email: string) => void;
  onSet?: (email: string, key: string, enabled: boolean | null) => void;
}) {
  useEffect(() => { if (open && email) onLoad?.(email); }, [open, email]);

  const stateOf = (f: OrgFeature): "default" | "on" | "off" =>
    f.override === true ? "on" : f.override === false ? "off" : "default";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-amber-600" />
            Features — {email}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Override which features this organization can use. <span className="font-medium">Default</span> follows the
            feature's global default; <span className="font-medium">On</span>/<span className="font-medium">Off</span> force it for this org.
          </DialogDescription>
        </DialogHeader>

        {loading && features.length === 0 ? (
          <div className="space-y-2 py-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
        ) : features.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No features.</p>
        ) : (
          <div className="space-y-1.5 py-1">
            {features.map((f) => {
              const st = stateOf(f);
              const masterOff = f.enabled === false;
              return (
                <div key={f.key} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${f.effective ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {f.effective ? "on" : "off"}
                      </span>
                      {masterOff && <span className="text-[10px] text-destructive">globally off</span>}
                    </div>
                    <code className="text-[10px] text-muted-foreground">{f.key}</code>
                  </div>
                  <div className="flex rounded-md border overflow-hidden shrink-0">
                    {(["default", "on", "off"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={masterOff && opt !== "default"}
                        onClick={() => onSet?.(email, f.key, opt === "default" ? null : opt === "on")}
                        className={`px-2 py-1 text-xs capitalize transition-colors ${
                          st === opt ? "bg-amber-600 text-white" : "bg-white text-muted-foreground hover:bg-amber-50"
                        } ${masterOff && opt !== "default" ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        {opt === "default" ? `default (${f["default-on"] !== false ? "on" : "off"})` : opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
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
  onPauseUserTrial,
  onResumeUserTrial,
  onExtendUserTrial,
  features = [],
  featuresLoading = false,
  onLoadFeatures,
  onCreateFeature,
  onUpdateFeature,
  onDeleteFeature,
  orgFeatures = [],
  orgFeaturesLoading = false,
  onLoadOrgFeatures,
  onSetOrgFeature,
}: Props) {
  const [setting, setSetting] = useState<string | null>(null);
  const [featuresEmail, setFeaturesEmail] = useState<string | null>(null);
  const [extendEmail, setExtendEmail] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState("7");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [historyEmail, setHistoryEmail] = useState<string | null>(null);
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

  // Module gates driven by the global feature catalog's master switch.
  // Unknown/not-yet-loaded features count as enabled.
  const moduleEnabled = (key: string): boolean => {
    const f = features.find((x) => x["feature/key"] === key);
    return f ? f["feature/enabled"] !== false : true;
  };

  const historyUser = users.find((u) => u.email === historyEmail);

  return (
    <div className="space-y-6">
      {historyEmail && (
        <TrialHistoryDialog
          email={historyEmail}
          trial={historyUser?.trial}
          open={!!historyEmail}
          onClose={() => setHistoryEmail(null)}
        />
      )}
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

                  <div className="flex items-center gap-2 shrink-0 ml-3 flex-wrap justify-end">
                    <Badge
                      variant={u.plan ? "default" : "secondary"}
                      className="text-xs font-mono"
                    >
                      {u.plan ? planLabel(u.plan) : "no plan"}
                    </Badge>

                    {!u.plan && <TrialStatusBadge trial={u.trial} />}

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

                    {!u.plan && u.trial?.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-slate-300 text-slate-600 hover:bg-slate-100"
                        onClick={() => onPauseUserTrial?.(u.email)}
                      >
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </Button>
                    )}
                    {!u.plan && u.trial?.status === "paused" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                        onClick={() => onResumeUserTrial?.(u.email)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Resume
                      </Button>
                    )}
                    {!u.plan && u.trial && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setHistoryEmail(u.email)}
                      >
                        <History className="h-3.5 w-3.5 mr-1" />
                        History
                      </Button>
                    )}

                    {!u.plan && u.trial && extendEmail !== u.email && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-green-700 hover:bg-green-50"
                        onClick={() => { setExtendEmail(u.email); setExtendDays("7"); }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Extend
                      </Button>
                    )}
                    {!u.plan && u.trial && extendEmail === u.email && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          className="h-7 w-16 text-xs px-2"
                          value={extendDays}
                          onChange={(e) => setExtendDays(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const d = parseInt(extendDays, 10);
                              if (d > 0) { onExtendUserTrial?.(u.email, d); setExtendEmail(null); }
                            }
                            if (e.key === "Escape") setExtendEmail(null);
                          }}
                          autoFocus
                        />
                        <span className="text-xs text-muted-foreground">d</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const d = parseInt(extendDays, 10);
                            if (d > 0) { onExtendUserTrial?.(u.email, d); setExtendEmail(null); }
                          }}
                        >
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setExtendEmail(null)}
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                      onClick={() => setFeaturesEmail(u.email)}
                    >
                      <Flag className="h-3.5 w-3.5 mr-1" />
                      Features
                    </Button>

                    {moduleEnabled("impersonation") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        onClick={() => onImpersonate?.(u.email)}
                      >
                        <UserCheck className="h-3.5 w-3.5 mr-1" />
                        View as
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Survey questions section */}
      {moduleEnabled("survey") && (
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
      )}

      {/* Data Export / Import section */}
      {moduleEnabled("data-export-import") && (
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
      )}

      {/* Feature flags section */}
      <FeatureManagementCard
        features={features}
        loading={featuresLoading}
        onLoad={onLoadFeatures}
        onCreate={onCreateFeature}
        onUpdate={onUpdateFeature}
        onDelete={onDeleteFeature}
      />

      {featuresEmail && (
        <FeatureOverridesDialog
          email={featuresEmail}
          features={orgFeatures}
          loading={orgFeaturesLoading}
          open={!!featuresEmail}
          onClose={() => setFeaturesEmail(null)}
          onLoad={onLoadOrgFeatures}
          onSet={onSetOrgFeature}
        />
      )}
    </div>
  );
}
