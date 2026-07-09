import React, { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Building, Building2, Database, FileText } from "lucide-react";
import { cn } from "../../lib/utils";

type Props = {
  properties: any[];
  apartments: any[];
  allAptCosts: any[];
  allRentPayments: any[];
  selectedApartmentId?: string | null;
  selectedPropertyId?: string | null;
  onSelectApartment: (aptId: string, year: number) => void;
  onSelectPropertyStammdaten?: (propertyId: string) => void;
  onSelectStammdaten: () => void;
};

export default function TreeNav({
  properties,
  apartments,
  allAptCosts,
  allRentPayments,
  selectedApartmentId,
  selectedPropertyId,
  onSelectApartment,
  onSelectPropertyStammdaten,
  onSelectStammdaten,
}: Props) {
  const currentYear = new Date().getFullYear();

  const yearsByProperty = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const p of properties) {
      const propAptIds = new Set(
        apartments.filter(a => String(a["property-id"]) === String(p.id)).map(a => String(a.id))
      );
      const years = new Set<number>([currentYear, currentYear - 1]);
      for (const c of allAptCosts) {
        if (propAptIds.has(String(c["apartment-id"])) && c.year) years.add(Number(c.year));
      }
      for (const r of allRentPayments) {
        if (propAptIds.has(String(r["apartment-id"])) && r.year) years.add(Number(r.year));
      }
      map.set(String(p.id), [...years].sort((a, b) => b - a));
    }
    return map;
  }, [properties, apartments, allAptCosts, allRentPayments, currentYear]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["objekte"]));

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const open = (key: string) => expanded.has(key);

  const Row = ({
    depth,
    label,
    icon: Icon,
    nodeKey,
    isLeaf = false,
    isActive = false,
    onClick,
  }: {
    depth: number;
    label: string;
    icon?: React.ElementType;
    nodeKey?: string;
    isLeaf?: boolean;
    isActive?: boolean;
    onClick: () => void;
  }) => (
    <div
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      className={cn(
        "flex items-center gap-1.5 py-1.5 pr-2 rounded cursor-pointer text-sm leading-none select-none",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-gray-100 text-gray-700"
      )}
      onClick={onClick}
    >
      {!isLeaf && nodeKey ? (
        open(nodeKey)
          ? <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" />
          : <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
      ) : (
        <span className="h-3 w-3 shrink-0" />
      )}
      {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-gray-400")} />}
      <span className="truncate">{label}</span>
    </div>
  );

  return (
    <div className="py-2">
      {/* Objekte root */}
      <Row
        depth={0}
        label="Objekte"
        icon={Building}
        nodeKey="objekte"
        onClick={() => toggle("objekte")}
      />

      {open("objekte") && properties.map(prop => {
        const propKey = `p-${prop.id}`;
        const propApts = apartments.filter(a => String(a["property-id"]) === String(prop.id));
        const years = yearsByProperty.get(String(prop.id)) ?? [];

        return (
          <React.Fragment key={prop.id}>
            <Row
              depth={1}
              label={prop.name ?? `Objekt ${prop.id}`}
              icon={Building2}
              nodeKey={propKey}
              onClick={() => toggle(propKey)}
            />

            {open(propKey) && (
              <Row
                depth={2}
                label="Stammdaten"
                icon={FileText}
                isLeaf
                isActive={String(prop.id) === String(selectedPropertyId)}
                onClick={() => onSelectPropertyStammdaten?.(String(prop.id))}
              />
            )}

            {open(propKey) && years.map(year => {
              const yearKey = `${propKey}-y-${year}`;
              return (
                <React.Fragment key={year}>
                  <Row
                    depth={2}
                    label={String(year)}
                    nodeKey={yearKey}
                    onClick={() => toggle(yearKey)}
                  />

                  {open(yearKey) && propApts.map(apt => (
                    <Row
                      key={apt.id}
                      depth={3}
                      label={apt.code ?? apt.name ?? String(apt.id)}
                      isLeaf
                      isActive={String(apt.id) === String(selectedApartmentId)}
                      onClick={() => onSelectApartment(String(apt.id), year)}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* Divider */}
      <div className="my-2 mx-3 border-t border-gray-100" />

      {/* Stammdaten */}
      <Row
        depth={0}
        label="Stammdaten"
        icon={Database}
        isLeaf
        onClick={onSelectStammdaten}
      />
    </div>
  );
}
