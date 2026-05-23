import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";

type ExpenseType = {
  id: string;
  key: string;
  name: string;
};

type Props = {
  expenseTypes?: ExpenseType[];
  isLoading?: boolean;
  isSaving?: boolean;
  onLoad?: () => void;
  onAdd?: (data: { key: string; name: string }) => void;
  onUpdate?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
};

export default function ExpenseTypes({
  expenseTypes = [],
  isLoading = false,
  isSaving = false,
  onLoad,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const { t } = useTranslation("expenseTypes");
  const { t: tCommon } = useTranslation("common");

  const [addForm, setAddForm] = useState({ key: "", name: "" });
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { onLoad?.(); }, []);

  const handleAdd = () => {
    if (!addForm.key.trim() || !addForm.name.trim()) return;
    onAdd?.({ key: addForm.key.trim(), name: addForm.name.trim() });
    setAddForm({ key: "", name: "" });
    setAddOpen(false);
  };

  const handleOpenEdit = (et: ExpenseType) => {
    setEditId(et.id);
    setEditName(et.name);
  };

  const handleUpdate = () => {
    if (!editName.trim() || !editId) return;
    onUpdate?.(editId, editName.trim());
    setEditId(null);
    setEditName("");
  };

  const handleDelete = () => {
    if (!deleteId) return;
    onDelete?.(deleteId);
    setDeleteId(null);
  };

  const deletingItem = expenseTypes.find((et) => et.id === deleteId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Tags className="h-5 w-5 text-primary" />
          <CardTitle>{t("title")}</CardTitle>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("add")}
        </Button>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{t("description")}</p>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : expenseTypes.length === 0 ? (
          <div className="text-center py-10">
            <Tags className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("emptyHint")}</p>
            <Button className="mt-4" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("add")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {expenseTypes.map((et) => (
              <div
                key={et.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-card"
              >
                {editId === et.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate();
                        if (e.key === "Escape") setEditId(null);
                      }}
                      autoFocus
                      className="h-8"
                    />
                    <Button size="sm" onClick={handleUpdate} disabled={isSaving}>
                      {tCommon("save")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                      {tCommon("cancel")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-1">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {et.key}
                    </Badge>
                    <span className="font-medium">{et.name}</span>
                  </div>
                )}
                {editId !== et.id && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenEdit(et)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(et.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addNew")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium block">{t("fields.key")}</label>
              <p className="text-xs text-muted-foreground mb-1">{t("fields.keyHint")}</p>
              <Input
                value={addForm.key}
                onChange={(e) => setAddForm((f) => ({ ...f, key: e.target.value }))}
                placeholder={t("placeholders.key")}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">{t("fields.name")}</label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("placeholders.name")}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleAdd}
                disabled={isSaving || !addForm.key.trim() || !addForm.name.trim()}
              >
                {isSaving ? tCommon("saving") : t("add")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            {t("deleteConfirm", { name: deletingItem?.name })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving ? tCommon("deleting") : tCommon("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
