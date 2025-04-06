import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from "lucide-react";

interface DataTableProps<TData> {
  data: TData[];
  columns: {
    accessorKey: keyof TData;
    header: string;
    cell?: (item: TData) => React.ReactNode;
  }[];
  searchable?: boolean;
  sortable?: boolean;
  emptyState?: React.ReactNode;
}

export function DataTable<TData>({
  data,
  columns,
  searchable = true,
  sortable = true,
  emptyState = <div className="text-center p-4 text-gray-500">No data available</div>
}: DataTableProps<TData>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof TData | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  // Filter data based on search query
  const filteredData = searchQuery
    ? data.filter((item) =>
        Object.entries(item).some(([key, value]) => {
          if (typeof value === "string") {
            return value.toLowerCase().includes(searchQuery.toLowerCase());
          } else if (typeof value === "number" || typeof value === "boolean") {
            return value.toString().includes(searchQuery);
          }
          return false;
        })
      )
    : data;

  // Sort data if sort column is selected
  const sortedData = sortColumn
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        if (aValue === bValue) return 0;

        // Handle different data types
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
          if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
          return 0;
        }
      })
    : filteredData;

  // Toggle sort for a column
  const toggleSort = (column: keyof TData) => {
    if (!sortable) return;
    
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Get the sort icon for a column
  const getSortIcon = (column: keyof TData) => {
    if (!sortable) return null;
    
    if (sortColumn === column) {
      return sortDirection === "asc" ? (
        <ChevronUp className="ml-2 h-4 w-4" />
      ) : (
        <ChevronDown className="ml-2 h-4 w-4" />
      );
    }
    return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />;
  };

  return (
    <div>
      {searchable && (
        <div className="flex items-center mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {sortedData.length === 0 ? (
        emptyState
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.accessorKey.toString()}>
                    <Button
                      variant="ghost"
                      onClick={() => toggleSort(column.accessorKey)}
                      className={sortable ? "hover:bg-transparent p-0 font-medium" : "p-0 font-medium cursor-default hover:bg-transparent"}
                    >
                      {column.header}
                      {sortable && getSortIcon(column.accessorKey)}
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => (
                    <TableCell key={column.accessorKey.toString()}>
                      {column.cell
                        ? column.cell(row)
                        : row[column.accessorKey]?.toString()}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-sm text-gray-500 mt-2">
        Showing {sortedData.length} of {data.length} entries
      </div>
    </div>
  );
}
