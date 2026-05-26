import React, { useEffect, useState } from "react";
import { Shield, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
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

type Props = {
  users?: AdminUser[];
  isLoading?: boolean;
  onLoad?: () => void;
  onSetPlan?: (email: string, tier: string) => void;
};

function planLabel(tier?: string): string {
  return PLAN_TIERS.find((t) => t.id === tier)?.label ?? "—";
}

export default function AdminPanel({ users = [], isLoading = false, onLoad, onSetPlan }: Props) {
  const [setting, setSetting] = useState<string | null>(null);

  useEffect(() => { onLoad?.(); }, []);

  const handleSetPlan = (email: string, tier: string) => {
    setSetting(email);
    onSetPlan?.(email, tier);
    setTimeout(() => setSetting(null), 1500);
  };

  return (
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
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
