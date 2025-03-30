import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Transaction } from '@shared/schema';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { 
  ArrowUpDown,
  CalendarIcon, 
  Download, 
  Edit, 
  MoreHorizontal, 
  Search, 
  Trash2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TransactionsTableProps {
  transactions: Transaction[];
  type?: 'all' | 'income' | 'expense';
}

export function TransactionsTable({ 
  transactions, 
  type = 'all',
}: TransactionsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showRecurringOnly, setShowRecurringOnly] = useState(false);
  const [filterType, setFilterType] = useState(type);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'description'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // Delete transaction mutation
  const { mutate: deleteTransaction, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/transactions/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: 'Transaction deleted',
        description: 'The transaction has been successfully deleted.',
      });
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting transaction',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const confirmDelete = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete.id);
    }
  };

  // Filter and sort transactions
  const filteredTransactions = transactions 
    ? transactions.filter(transaction => {
        // Apply type filter
        if (filterType !== 'all' && transaction.type !== filterType) {
          return false;
        }

        // Apply search filter
        if (searchTerm && !(
          transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.categoryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(transaction.amount).includes(searchTerm)
        )) {
          return false;
        }

        // Apply date filter
        if (selectedDate) {
          const transactionDate = parseISO(transaction.date.toString());
          if (!isWithinInterval(transactionDate, {
            start: startOfDay(selectedDate),
            end: endOfDay(selectedDate),
          })) {
            return false;
          }
        }

        // Apply recurring filter
        if (showRecurringOnly && !transaction.recurring) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortField === 'date') {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        } else if (sortField === 'amount') {
          return sortDirection === 'asc' 
            ? a.amount - b.amount 
            : b.amount - a.amount;
        } else {
          return sortDirection === 'asc'
            ? a.description.localeCompare(b.description)
            : b.description.localeCompare(a.description);
        }
      })
    : [];

  // Toggle sort
  const toggleSort = (field: 'date' | 'amount' | 'description') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Date filter options
  const dateFilterOptions = [
    { label: 'Today', date: new Date() },
    { label: 'Yesterday', date: subDays(new Date(), 1) },
    { label: 'Last 7 days', value: '7days' },
    { label: 'Last 30 days', value: '30days' },
    { label: 'Custom', value: 'custom' },
  ];

  // Format currency 
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Empty state
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium mb-2">No transactions found</h3>
        <p className="text-muted-foreground mb-4">
          There are no transactions to display.
        </p>
        <Button asChild>
          <Link href="/accounting/transactions/new">
            Add your first transaction
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex gap-2 whitespace-nowrap">
                <CalendarIcon className="h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : 'Filter by date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
              <div className="border-t p-3 flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)}>
                  Clear
                </Button>
                <Button variant="default" size="sm" onClick={() => setSelectedDate(new Date())}>
                  Today
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <div className="flex items-center space-x-2 ml-2">
            <Checkbox
              id="recurring"
              checked={showRecurringOnly}
              onCheckedChange={(checked) => setShowRecurringOnly(!!checked)}
            />
            <label
              htmlFor="recurring"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Recurring only
            </label>
          </div>
        </div>
      </div>
      
      {/* Type filter buttons */}
      <div className="flex gap-2">
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('all')}
        >
          All
        </Button>
        <Button
          variant={filterType === 'income' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('income')}
        >
          Income
        </Button>
        <Button
          variant={filterType === 'expense' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('expense')}
        >
          Expenses
        </Button>
      </div>
      
      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex gap-1 -ml-3 font-medium"
                  onClick={() => toggleSort('date')}
                >
                  Date
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex gap-1 -ml-3 font-medium"
                  onClick={() => toggleSort('description')}
                >
                  Description
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Property</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex gap-1 -ml-3 font-medium"
                  onClick={() => toggleSort('amount')}
                >
                  Amount
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{format(new Date(transaction.date), 'PPP')}</span>
                    {transaction.recurring && (
                      <Badge variant="outline" className="w-fit text-xs mt-1">Recurring</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>
                  {transaction.categoryName || `Category ${transaction.categoryId}`}
                </TableCell>
                <TableCell>
                  {transaction.propertyName || (transaction.propertyId ? `Property ${transaction.propertyId}` : '-')}
                </TableCell>
                <TableCell className={`text-right font-medium ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/accounting/transactions/${transaction.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => confirmDelete(transaction)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`/api/transactions/${transaction.id}/export`} download>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredTransactions.length} of {transactions.length} transactions
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the transaction 
              "{transactionToDelete?.description}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}