import React, { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Building, Building2, Database, FileText, Receipt, Warehouse } from "lucide-react";
import { cn } from "../../lib/utils";

type Props = {
  properties: any[];
  apartments: any[];
  garages?: any[];
  allAptCosts: any[];
  allRentPayments: any[];
  selectedApartmentId?: string | null;
  selectedPropertyId?: string | null;
  selectedNebenkostenKey?: string | null;
  selectedGarageId?: string | null;
  onSelectApartment: (aptId: string, year: number) => void;
  onSelectGarage?: (garageId: string) => void;
  onSelectPropertyStammdaten?: (propertyId: string) => void;
  onSelectPropertyNebenkosten?: (propertyId: string, year: number) => void;
  onSelectStammdaten: () => void;
};

export default function TreeNav({
  properties,
  apartments,
  garages = [],
  allAptCosts,
  allRentPayments,
  selectedApartmentId,
  selectedPropertyId,
  selectedNebenkostenKey,
  selectedGarageId,
  onSelectApartment,
  onSelectGarage,
  onSelectPropertyStammdaten,
  onSelectPropertyNebenkosten,
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
    <button
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
      className={cn(
        "flex items-center gap-3 w-full rounded-md py-2 pr-3 text-sm font-medium transition-colors text-left select-none",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-accent hover:text-accent-foreground"
      )}
      onClick={onClick}
    >
      {!isLeaf && nodeKey ? (
        open(nodeKey)
          ? <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          : <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
      ) : (
        <span className="h-4 w-4 shrink-0" />
      )}
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="space-y-0.5">
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
        const propGarages = garages.filter(g => String(g["property-id"]) === String(prop.id));
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

            {open(propKey) && propGarages.length > 0 && (() => {
              const garagesKey = `${propKey}-garages`;
              return (
                <React.Fragment key="garages">
                  <Row
                    depth={2}
                    label="Garagen"
                    icon={Warehouse}
                    nodeKey={garagesKey}
                    onClick={() => toggle(garagesKey)}
                  />
                  {open(garagesKey) && propGarages.map(g => (
                    <Row
                      key={g.id}
                      depth={3}
                      label={g.code ?? String(g.id)}
                      icon={Warehouse}
                      isLeaf
                      isActive={String(g.id) === String(selectedGarageId)}
                      onClick={() => onSelectGarage?.(String(g.id))}
                    />
                  ))}
                </React.Fragment>
              );
            })()}

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

                  {open(yearKey) && (
                    <Row
                      depth={3}
                      label="Nebenkosten"
                      icon={Receipt}
                      isLeaf
                      isActive={selectedNebenkostenKey === `${prop.id}-${year}`}
                      onClick={() => onSelectPropertyNebenkosten?.(String(prop.id), year)}
                    />
                  )}

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
      <div className="my-1 mx-2 border-t border-border" />

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
