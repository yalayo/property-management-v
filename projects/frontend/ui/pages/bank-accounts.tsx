import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, FileText, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import { useToast } from '../hooks/use-toast';

// UI Components
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Loader2 } from "lucide-react";

type BankAccount = {
  id: number;
  accountName: string;
  bankName: string;
  accountNumber: string;
  currency: string;
  currentBalance: number;
  isDefault: boolean;
};

type BankStatement = {
  id: number;
  statementDate: string;
  startDate: string;
  endDate: string;
  startingBalance: number;
  endingBalance: number;
  currency: string;
  transactionCount: number;
  processed: boolean;
};

const BankAccountsPage = (props) => {
  const { user } = props;
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>('accounts');
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [isNewAccountDialogOpen, setIsNewAccountDialogOpen] = useState(false);
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [newAccountData, setNewAccountData] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    currency: 'EUR',
    currentBalance: 0,
    isDefault: false
  });

  // Form validation state
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const bankAccounts: BankAccount[] = [];
  const isLoadingAccounts = false;
  const isAccountsError = false;
  const bankStatements: BankStatement[] = [];
  const isLoadingStatements = false;
  const refetchStatements = () => {};

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeletingStatement, setIsDeletingStatement] = useState(false);

  // Select the first account by default when data is loaded
  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(bankAccounts[0]);
    }
  }, [bankAccounts, selectedAccount]);

  // Handle account selection
  const handleAccountSelect = (account: BankAccount) => {
    setSelectedAccount(account);
    setActiveTab('statements');
  };

  // Reset the new account form
  const resetNewAccountForm = () => {
    setNewAccountData({
      accountName: '',
      bankName: '',
      accountNumber: '',
      currency: 'EUR',
      currentBalance: 0,
      isDefault: false
    });
    setFormErrors({});
  };

  // Handle new account form submit
  const handleCreateAccount = () => {
    // Basic validation
    const errors: { [key: string]: string } = {};
    if (!newAccountData.accountName.trim()) {
      errors.accountName = 'Account name is required';
    }
    if (!newAccountData.bankName.trim()) {
      errors.bankName = 'Bank name is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    toast({ title: 'Coming soon', description: 'Bank account management will be connected via ClojureScript.' });
    setIsNewAccountDialogOpen(false);
    resetNewAccountForm();
  };

  // Handle edit account form submit
  const handleUpdateAccount = () => {
    if (!selectedAccount) return;

    // Basic validation
    const errors: { [key: string]: string } = {};
    if (!newAccountData.accountName.trim()) {
      errors.accountName = 'Account name is required';
    }
    if (!newAccountData.bankName.trim()) {
      errors.bankName = 'Bank name is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    toast({ title: 'Coming soon', description: 'Bank account management will be connected via ClojureScript.' });
    setIsEditAccountDialogOpen(false);
  };

  // Handle delete account
  const handleDeleteAccount = () => {
    toast({ title: 'Coming soon', description: 'Bank account management will be connected via ClojureScript.' });
    setIsDeleteAccountDialogOpen(false);
  };

  // Handle opening edit dialog
  const handleOpenEditDialog = (account: BankAccount) => {
    setSelectedAccount(account);
    setNewAccountData({
      accountName: account.accountName,
      bankName: account.bankName,
      accountNumber: account.accountNumber || '',
      currency: account.currency,
      currentBalance: account.currentBalance,
      isDefault: account.isDefault
    });
    setIsEditAccountDialogOpen(true);
  };

  // Handle process statement
  const handleProcessStatement = (_statement: BankStatement) => {
    toast({ title: 'Coming soon', description: 'Statement processing will be connected via ClojureScript.' });
  };

  // Handle delete statement
  const handleDeleteStatement = (_statement: BankStatement) => {
    toast({ title: 'Coming soon', description: 'Statement management will be connected via ClojureScript.' });
  };

  if (isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Banking</h1>
        <Button onClick={() => setIsNewAccountDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Bank Account
        </Button>
      </div>

      {bankAccounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">No Bank Accounts Yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first bank account to start managing your finances.
            </p>
            <Button onClick={() => setIsNewAccountDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Bank Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
            <TabsTrigger value="statements" disabled={!selectedAccount}>Bank Statements</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <Table>
              <TableCaption>A list of your bank accounts.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map((account: BankAccount) => (
                  <TableRow key={account.id} className={selectedAccount?.id === account.id ? 'bg-muted/50' : ''}>
                    <TableCell className="font-medium">
                      <span className="cursor-pointer" onClick={() => handleAccountSelect(account)}>
                        {account.accountName}
                      </span>
                      {account.isDefault && (
                        <Badge variant="outline" className="ml-2">Default</Badge>
                      )}
                    </TableCell>
                    <TableCell>{account.bankName}</TableCell>
                    <TableCell>{account.accountNumber || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('de-DE', { style: 'currency', currency: account.currency }).format(account.currentBalance)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleAccountSelect(account)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(account)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        setSelectedAccount(account);
                        setIsDeleteAccountDialogOpen(true);
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="statements">
            {selectedAccount && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{selectedAccount.accountName} Statements</h2>
                    <p className="text-muted-foreground">{selectedAccount.bankName} • {selectedAccount.accountNumber || 'No account number'}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => refetchStatements()}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/dashboard')}>
                      <Plus className="mr-2 h-4 w-4" /> Upload Statement
                    </Button>
                  </div>
                </div>

                {isLoadingStatements ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : bankStatements.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <h3 className="text-lg font-semibold mb-2">No Bank Statements Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Upload bank statements from the File Upload section on the dashboard.
                      </p>
                      <Button onClick={() => navigate('/dashboard')}>
                        Go to Dashboard
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Table>
                    <TableCaption>Bank statements for {selectedAccount.accountName}.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Starting Balance</TableHead>
                        <TableHead className="text-right">Ending Balance</TableHead>
                        <TableHead>Transactions</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankStatements.map((statement: BankStatement) => (
                        <TableRow key={statement.id}>
                          <TableCell className="font-medium">
                            {format(new Date(statement.statementDate), 'dd.MM.yyyy')}
                          </TableCell>
                          <TableCell>
                            {format(new Date(statement.startDate), 'dd.MM.yyyy')} - {format(new Date(statement.endDate), 'dd.MM.yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: statement.currency }).format(statement.startingBalance)}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: statement.currency }).format(statement.endingBalance)}
                          </TableCell>
                          <TableCell>
                            {statement.transactionCount || 0}
                          </TableCell>
                          <TableCell>
                            {statement.processed ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Processed</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {!statement.processed && (
                              <Button variant="ghost" size="icon" onClick={() => handleProcessStatement(statement)}>
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" disabled>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteStatement(statement)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* New Bank Account Dialog */}
      <Dialog open={isNewAccountDialogOpen} onOpenChange={setIsNewAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>
              Enter your bank account details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={newAccountData.accountName}
                onChange={(e) => setNewAccountData({ ...newAccountData, accountName: e.target.value })}
                placeholder="e.g., Main Checking Account"
              />
              {formErrors.accountName && (
                <p className="text-sm text-red-500">{formErrors.accountName}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={newAccountData.bankName}
                onChange={(e) => setNewAccountData({ ...newAccountData, bankName: e.target.value })}
                placeholder="e.g., Deutsche Bank"
              />
              {formErrors.bankName && (
                <p className="text-sm text-red-500">{formErrors.bankName}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountNumber">Account Number/IBAN (Optional)</Label>
              <Input
                id="accountNumber"
                value={newAccountData.accountNumber}
                onChange={(e) => setNewAccountData({ ...newAccountData, accountNumber: e.target.value })}
                placeholder="e.g., DE89 3704 0044 0532 0130 00"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={newAccountData.currency}
                  onValueChange={(value) => setNewAccountData({ ...newAccountData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currentBalance">Current Balance</Label>
                <Input
                  id="currentBalance"
                  type="number"
                  value={newAccountData.currentBalance.toString()}
                  onChange={(e) => setNewAccountData({ ...newAccountData, currentBalance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={newAccountData.isDefault}
                onChange={(e) => setNewAccountData({ ...newAccountData, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isDefault" className="text-sm font-normal">Set as default account</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetNewAccountForm();
              setIsNewAccountDialogOpen(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateAccount} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bank Account Dialog */}
      <Dialog open={isEditAccountDialogOpen} onOpenChange={setIsEditAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bank Account</DialogTitle>
            <DialogDescription>
              Update your bank account details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-accountName">Account Name</Label>
              <Input
                id="edit-accountName"
                value={newAccountData.accountName}
                onChange={(e) => setNewAccountData({ ...newAccountData, accountName: e.target.value })}
              />
              {formErrors.accountName && (
                <p className="text-sm text-red-500">{formErrors.accountName}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-bankName">Bank Name</Label>
              <Input
                id="edit-bankName"
                value={newAccountData.bankName}
                onChange={(e) => setNewAccountData({ ...newAccountData, bankName: e.target.value })}
              />
              {formErrors.bankName && (
                <p className="text-sm text-red-500">{formErrors.bankName}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-accountNumber">Account Number/IBAN (Optional)</Label>
              <Input
                id="edit-accountNumber"
                value={newAccountData.accountNumber}
                onChange={(e) => setNewAccountData({ ...newAccountData, accountNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <Select
                  value={newAccountData.currency}
                  onValueChange={(value) => setNewAccountData({ ...newAccountData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-currentBalance">Current Balance</Label>
                <Input
                  id="edit-currentBalance"
                  type="number"
                  value={newAccountData.currentBalance.toString()}
                  onChange={(e) => setNewAccountData({ ...newAccountData, currentBalance: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isDefault"
                checked={newAccountData.isDefault}
                onChange={(e) => setNewAccountData({ ...newAccountData, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="edit-isDefault" className="text-sm font-normal">Set as default account</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAccountDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAccount} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Bank Account Dialog */}
      <Dialog open={isDeleteAccountDialogOpen} onOpenChange={setIsDeleteAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bank Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bank account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedAccount && (
              <div className="bg-red-50 p-4 rounded-md text-red-800">
                <p className="font-medium">You are about to delete:</p>
                <p>{selectedAccount.accountName} at {selectedAccount.bankName}</p>
                <p className="mt-2 text-sm">
                  All associated bank statements and transactions will also be deleted.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteAccountDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankAccountsPage;