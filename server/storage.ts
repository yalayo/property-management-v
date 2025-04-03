import { 
  users, type User, type InsertUser, 
  properties, type Property, type InsertProperty,
  tenants, type Tenant, type InsertTenant,
  payments, type Payment, type InsertPayment,
  surveyResponses, type SurveyResponse, type InsertSurveyResponse,
  waitingList, type WaitingList, type InsertWaitingList,
  uploadedFiles, type UploadedFile, type InsertUploadedFile,
  questions, type Question, type InsertQuestion,
  // Accounting module imports
  transactionCategories, type TransactionCategory, type InsertTransactionCategory,
  transactions, type Transaction, type InsertTransaction,
  bankAccounts, type BankAccount, type InsertBankAccount,
  bankStatements, type BankStatement, type InsertBankStatement,
  taxYears, type TaxYear, type InsertTaxYear,
  budgets, type Budget, type InsertBudget,
  // Maintenance module imports
  maintenanceRequests, type MaintenanceRequest, type InsertMaintenanceRequest,
  maintenanceComments, type MaintenanceComment, type InsertMaintenanceComment, 
  serviceProviders, type ServiceProvider, type InsertServiceProvider,
  // Payment gateway/processing imports
  paypalOrders, type PaypalOrder, type InsertPaypalOrder,
  // Tenant portal access imports
  tenantCredentials, type TenantCredential, type InsertTenantCredential,
  // Document repository imports
  sharedDocuments, type SharedDocument, type InsertSharedDocument,
  tenantDocuments, type TenantDocument, type InsertTenantDocument,
  // Tenant rating system imports
  tenantRatings, type TenantRating, type InsertTenantRating
} from "@shared/schema";
import { db, getSqlClient } from "./db";
import { eq, desc, count, and } from "drizzle-orm";

import session from "express-session";
import createMemoryStore from "memorystore";

// Initialize memory store for in-memory sessions
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Session management
  sessionStore: session.Store;
  
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createUserWithPassword(user: Omit<InsertUser, 'password'>, password: string): Promise<User>;
  updateStripeCustomerId(userId: number, customerId: string): Promise<User>;
  updateUserStripeInfo(userId: number, info: { customerId: string, subscriptionId: string }): Promise<User>;
  updateUserTier(userId: number, tier: string): Promise<User>;
  updateUserOnboardingStatus(userId: number, hasCompleted: boolean): Promise<User>;
  verifyUserPassword(userId: number, password: string): Promise<boolean>;
  updateUserPassword(userId: number, newPassword: string): Promise<User>;
  updateLastLogin(userId: number): Promise<User>;
  setPasswordChangeRequired(userId: number, required: boolean): Promise<User>;
  getUserCount(): Promise<number>;
  getSurveyResponseCount(): Promise<number>;
  getWaitingListCount(): Promise<number>;
  getSurveyResponses(): Promise<SurveyResponse[]>;
  
  // Payment Gateway 
  createPayPalOrder(order: InsertPaypalOrder): Promise<PaypalOrder>;
  getPayPalOrderById(id: number): Promise<PaypalOrder | undefined>;
  getPayPalOrdersByUserId(userId: number): Promise<PaypalOrder[]>;
  updatePayPalOrderStatus(id: number, status: string): Promise<PaypalOrder>;
  updateUserPaymentGateway(userId: number, gateway: string): Promise<User>;
  getUserPaymentGateway(userId: number): Promise<string | null>;
  
  // Properties
  createProperty(property: InsertProperty): Promise<Property>;
  getPropertyById(id: number): Promise<Property | undefined>;
  getPropertiesByUserId(userId: number): Promise<Property[]>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  
  // Tenants
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getTenantById(id: number): Promise<Tenant | undefined>;
  getTenantsByPropertyId(propertyId: number): Promise<Tenant[]>;
  getTenantsByUserId(userId: number): Promise<Tenant[]>;
  updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant>;
  
  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByTenantId(tenantId: number): Promise<Payment[]>;
  getLatePayers(userId: number): Promise<{tenant: Tenant, lastPayment: Payment | null}[]>;
  
  // Survey
  createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse>;
  getAllSurveyResponses(): Promise<SurveyResponse[]>;
  getSurveyAnalytics(): Promise<{questionId: number, yesCount: number, noCount: number}[]>;
  
  // Waiting List
  addToWaitingList(entry: InsertWaitingList): Promise<WaitingList>;
  isEmailInWaitingList(email: string): Promise<boolean>;
  getWaitingList(): Promise<WaitingList[]>;
  
  // Files
  uploadFile(file: InsertUploadedFile): Promise<UploadedFile>;
  getFilesByUserId(userId: number): Promise<UploadedFile[]>;
  updateFileData(fileId: number, extractedData: any): Promise<UploadedFile>;
  
  // Questions
  createQuestion(question: InsertQuestion): Promise<Question>;
  getAllQuestions(): Promise<Question[]>;
  getActiveQuestions(): Promise<Question[]>;
  
  // ===== ACCOUNTING MODULE =====
  
  // Transaction Categories
  createTransactionCategory(category: InsertTransactionCategory): Promise<TransactionCategory>;
  getTransactionCategoriesByUserId(userId: number): Promise<TransactionCategory[]>;
  getTransactionCategoryById(id: number): Promise<TransactionCategory | undefined>;
  updateTransactionCategory(id: number, data: Partial<InsertTransactionCategory>): Promise<TransactionCategory | undefined>;
  deleteTransactionCategory(id: number): Promise<boolean>;
  createDefaultTransactionCategories(userId: number): Promise<TransactionCategory[]>;
  
  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUserId(userId: number, params?: { 
    startDate?: Date, 
    endDate?: Date,
    categoryId?: number,
    propertyId?: number,
    type?: 'income' | 'expense' | 'all'
  }): Promise<Transaction[]>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  updateTransaction(id: number, data: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  getTransactionSummary(userId: number, timeframe: 'month' | 'quarter' | 'year'): Promise<{
    totalIncome: number,
    totalExpenses: number,
    netIncome: number,
    incomeByCategory: {categoryId: number, categoryName: string, amount: number}[],
    expensesByCategory: {categoryId: number, categoryName: string, amount: number}[]
  }>;
  
  // Bank Accounts 
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  getBankAccountsByUserId(userId: number): Promise<BankAccount[]>;
  getBankAccountById(id: number): Promise<BankAccount | undefined>;
  updateBankAccount(id: number, data: Partial<InsertBankAccount>): Promise<BankAccount | undefined>;
  deleteBankAccount(id: number): Promise<boolean>;
  
  // Bank Statements
  createBankStatement(statement: InsertBankStatement): Promise<BankStatement>;
  getBankStatementsByUserId(userId: number): Promise<BankStatement[]>;
  getBankStatementsByBankAccountId(bankAccountId: number): Promise<BankStatement[]>;
  getBankStatementById(id: number): Promise<BankStatement | undefined>;
  updateBankStatement(id: number, data: Partial<InsertBankStatement>): Promise<BankStatement | undefined>;
  processStatement(id: number, extractedData: any): Promise<BankStatement>;
  deleteBankStatement(id: number): Promise<boolean>;
  
  // Tax Years
  createTaxYear(taxYear: InsertTaxYear): Promise<TaxYear>;
  getTaxYearsByUserId(userId: number): Promise<TaxYear[]>;
  getTaxYearById(id: number): Promise<TaxYear | undefined>;
  updateTaxYear(id: number, data: Partial<InsertTaxYear>): Promise<TaxYear | undefined>;
  closeTaxYear(id: number, data: { 
    totalIncome: number, 
    totalExpenses: number, 
    netIncome: number, 
    taxRate?: number, 
    estimatedTax?: number 
  }): Promise<TaxYear | undefined>;
  
  // Budgets
  createBudget(budget: InsertBudget): Promise<Budget>;
  getBudgetsByUserId(userId: number): Promise<Budget[]>;
  getBudgetById(id: number): Promise<Budget | undefined>;
  updateBudget(id: number, data: Partial<InsertBudget>): Promise<Budget | undefined>;
  deleteBudget(id: number): Promise<boolean>;
  getBudgetAnalytics(userId: number): Promise<{
    budgetId: number,
    budgetName: string,
    budgetAmount: number,
    actualAmount: number,
    variance: number,
    percentUsed: number
  }[]>;
  
  // ===== PAYMENT GATEWAY MODULE =====

  // PayPal Orders
  createPayPalOrder(order: InsertPaypalOrder): Promise<PaypalOrder>;
  getPayPalOrderById(id: number): Promise<PaypalOrder | undefined>;
  getPayPalOrdersByUserId(userId: number): Promise<PaypalOrder[]>;
  updatePayPalOrderStatus(id: number, status: string): Promise<PaypalOrder>;
  
  // Payment Gateway Preferences
  updateUserPaymentGateway(userId: number, gateway: string): Promise<User>;
  getUserPaymentGateway(userId: number): Promise<string | null>;
  
  // ===== MAINTENANCE MODULE =====
  
  // Maintenance Requests
  createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest>;
  getMaintenanceRequestById(id: number): Promise<MaintenanceRequest | undefined>;
  getMaintenanceRequestsByUserId(userId: number, filters?: {
    status?: string,
    propertyId?: number,
    priority?: string
  }): Promise<MaintenanceRequest[]>;
  getMaintenanceRequestsByPropertyId(propertyId: number): Promise<MaintenanceRequest[]>;
  updateMaintenanceRequest(id: number, data: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined>;
  deleteMaintenanceRequest(id: number): Promise<boolean>;
  
  // Maintenance Comments
  createMaintenanceComment(comment: InsertMaintenanceComment): Promise<MaintenanceComment>;
  getMaintenanceCommentsByRequestId(requestId: number): Promise<MaintenanceComment[]>;
  
  // Service Providers
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  getServiceProvidersByUserId(userId: number): Promise<ServiceProvider[]>;
  getServiceProviderById(id: number): Promise<ServiceProvider | undefined>;
  updateServiceProvider(id: number, data: Partial<InsertServiceProvider>): Promise<ServiceProvider | undefined>;
  deleteServiceProvider(id: number): Promise<boolean>;

  // ===== TENANT MANAGEMENT MODULE =====

  // Tenant Portal Access
  createTenantCredential(credential: InsertTenantCredential): Promise<TenantCredential>;
  getTenantCredentialById(id: number): Promise<TenantCredential | undefined>;
  getTenantCredentialByUsername(username: string): Promise<TenantCredential | undefined>;
  getTenantCredentialByTenantId(tenantId: number): Promise<TenantCredential | undefined>;
  getTenantCredentialsByUserId(userId: number): Promise<TenantCredential[]>;
  updateTenantCredential(id: number, data: Partial<InsertTenantCredential>): Promise<TenantCredential | undefined>;
  deleteTenantCredential(id: number): Promise<boolean>;
  updateTenantCredentialLastLogin(id: number): Promise<TenantCredential>;

  // Document Repository
  createSharedDocument(document: InsertSharedDocument): Promise<SharedDocument>;
  getSharedDocumentById(id: number): Promise<SharedDocument | undefined>;
  getSharedDocumentsByUserId(userId: number): Promise<SharedDocument[]>;
  getPublicDocumentsByUserId(userId: number): Promise<SharedDocument[]>;
  updateSharedDocument(id: number, data: Partial<InsertSharedDocument>): Promise<SharedDocument | undefined>;
  deleteSharedDocument(id: number): Promise<boolean>;

  createTenantDocument(document: InsertTenantDocument): Promise<TenantDocument>;
  getTenantDocumentById(id: number): Promise<TenantDocument | undefined>;
  getTenantDocumentsByTenantId(tenantId: number): Promise<TenantDocument[]>;
  getTenantDocumentsByDocumentId(documentId: number): Promise<TenantDocument[]>;
  updateTenantDocumentViewStatus(id: number, hasViewed: boolean): Promise<TenantDocument>;
  deleteTenantDocument(id: number): Promise<boolean>;

  // Tenant Rating System
  createTenantRating(rating: InsertTenantRating): Promise<TenantRating>;
  getTenantRatingById(id: number): Promise<TenantRating | undefined>;
  getTenantRatingsByTenantId(tenantId: number): Promise<TenantRating[]>;
  getTenantRatingsByUserId(userId: number): Promise<TenantRating[]>;
  updateTenantRating(id: number, data: Partial<InsertTenantRating>): Promise<TenantRating | undefined>;
  deleteTenantRating(id: number): Promise<boolean>;
  getTenantAverageRating(tenantId: number): Promise<number>;
}



export class MemStorage implements IStorage {
  public sessionStore: session.Store;
  private users: Map<number, User>;
  private properties: Map<number, Property>;
  private tenants: Map<number, Tenant>;
  private payments: Map<number, Payment>;
  private surveyResponses: Map<number, SurveyResponse>;
  private waitingListEntries: Map<number, WaitingList>;
  private files: Map<number, UploadedFile>;
  private questionsList: Map<number, Question>;
  
  // Accounting module storage
  private transactionCategories: Map<number, TransactionCategory>;
  private transactions: Map<number, Transaction>;
  private bankAccounts: Map<number, BankAccount>;
  private bankStatements: Map<number, BankStatement>;
  private taxYears: Map<number, TaxYear>;
  private budgets: Map<number, Budget>;
  
  // Maintenance module storage
  private maintenanceRequests: Map<number, MaintenanceRequest>;
  private maintenanceComments: Map<number, MaintenanceComment>;
  private serviceProviders: Map<number, ServiceProvider>;
  
  // Payment gateway module storage
  private paypalOrders: Map<number, PaypalOrder>;
  
  // Tenant Management Module storage
  private tenantCredentials: Map<number, TenantCredential>;
  private sharedDocuments: Map<number, SharedDocument>;
  private tenantDocuments: Map<number, TenantDocument>;
  private tenantRatings: Map<number, TenantRating>;
  
  private currentUserId: number;
  private currentPropertyId: number;
  private currentTenantId: number;
  private currentPaymentId: number;
  private currentSurveyResponseId: number;
  private currentWaitingListId: number;
  private currentFileId: number;
  private currentQuestionId: number;
  
  // Accounting module IDs
  private currentTransactionCategoryId: number;
  private currentTransactionId: number;
  private currentBankAccountId: number;
  private currentBankStatementId: number;
  private currentTaxYearId: number;
  private currentBudgetId: number;
  
  // Maintenance module IDs
  private currentMaintenanceRequestId: number;
  private currentMaintenanceCommentId: number;
  private currentServiceProviderId: number;
  
  // Payment gateway module IDs
  private currentPaypalOrderId: number;
  
  // Tenant Management Module IDs
  private currentTenantCredentialId: number;
  private currentSharedDocumentId: number;
  private currentTenantDocumentId: number;
  private currentTenantRatingId: number;
  
  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 1 day in milliseconds
    });
    
    this.users = new Map();
    this.properties = new Map();
    this.tenants = new Map();
    this.payments = new Map();
    this.surveyResponses = new Map();
    this.waitingListEntries = new Map();
    this.files = new Map();
    this.questionsList = new Map();
    
    // Initialize accounting module storage
    this.transactionCategories = new Map();
    this.transactions = new Map();
    this.bankAccounts = new Map();
    this.bankStatements = new Map();
    this.taxYears = new Map();
    this.budgets = new Map();
    
    // Initialize maintenance module storage
    this.maintenanceRequests = new Map();
    this.maintenanceComments = new Map();
    this.serviceProviders = new Map();
    
    // Initialize payment gateway module storage
    this.paypalOrders = new Map();
    
    // Initialize tenant management module storage
    this.tenantCredentials = new Map();
    this.sharedDocuments = new Map();
    this.tenantDocuments = new Map();
    this.tenantRatings = new Map();
    
    this.currentUserId = 1;
    this.currentPropertyId = 1;
    this.currentTenantId = 1;
    this.currentPaymentId = 1;
    this.currentSurveyResponseId = 1;
    this.currentWaitingListId = 1;
    this.currentFileId = 1;
    this.currentQuestionId = 1;
    
    // Initialize accounting module IDs
    this.currentTransactionCategoryId = 1;
    this.currentTransactionId = 1;
    this.currentBankAccountId = 1;
    this.currentBankStatementId = 1;
    this.currentTaxYearId = 1;
    this.currentBudgetId = 1;
    
    // Initialize maintenance module IDs
    this.currentMaintenanceRequestId = 1;
    this.currentMaintenanceCommentId = 1;
    this.currentServiceProviderId = 1;
    
    // Initialize payment gateway module IDs
    this.currentPaypalOrderId = 1;
    
    // Initialize tenant management module IDs
    this.currentTenantCredentialId = 1;
    this.currentSharedDocumentId = 1;
    this.currentTenantDocumentId = 1;
    this.currentTenantRatingId = 1;
    
    // Initialize with 20 questions
    const sampleQuestions = [
      "Do you own multiple rental properties?",
      "Do you struggle with tracking tenant payments?",
      "Do you currently use Excel to manage your properties?",
      "Is responding to tenant inquiries time-consuming?",
      "Do you find it difficult to keep track of property maintenance?",
      "Are you concerned about complying with German rental laws?",
      "Do you manage your rental properties remotely?",
      "Do you have issues with regular financial reporting?",
      "Would you like to automate tenant communications?",
      "Do you have trouble managing utility bills?",
      "Are you manually creating lease agreements?",
      "Do you have a system for tenant screening?",
      "Are you facing issues with property vacancy rates?",
      "Do you struggle with tax documentation for your properties?",
      "Would you benefit from automated payment reminders?",
      "Do you have a system for handling maintenance requests?",
      "Are you interested in analyzing your property performance data?",
      "Do you find bank statement reconciliation tedious?",
      "Would you like to reduce administrative time spent on property management?",
      "Are you looking for better ways to manage property documentation?"
    ];

    sampleQuestions.forEach((text, index) => {
      this.questionsList.set(this.currentQuestionId, {
        id: this.currentQuestionId,
        text,
        order: index + 1,
        active: true
      });
      this.currentQuestionId++;
    });
  }
  
  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      isAdmin: insertUser.isAdmin || false, 
      onboardingCompleted: insertUser.onboardingCompleted || false,
      passwordSalt: insertUser.passwordSalt || null,
      passwordChangeRequired: insertUser.passwordChangeRequired || false,
      lastLogin: insertUser.lastLogin || null,
      tier: insertUser.tier || null, 
      isActive: insertUser.isActive || false, 
      stripeCustomerId: insertUser.stripeCustomerId || null, 
      stripeSubscriptionId: insertUser.stripeSubscriptionId || null,
      stripePaymentIntentId: insertUser.stripePaymentIntentId || null,
      fullName: insertUser.fullName || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async createUserWithPassword(user: Omit<InsertUser, 'password'>, password: string): Promise<User> {
    // Import password utilities
    const { hashPassword } = await import("./utils/password");
    
    // Hash the password
    const { hash, salt } = await hashPassword(password);
    
    // Create the user with the hashed password and salt
    return this.createUser({
      ...user as any, // Type casting to satisfy TypeScript
      password: hash,
      passwordSalt: salt
    });
  }

  async verifyUserPassword(userId: number, password: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    if (!user.passwordSalt) {
      // Legacy password check (plain text)
      return user.password === password;
    }
    
    // Import password utilities
    const { verifyPassword } = await import("./utils/password");
    
    // Verify the password using the stored hash and salt
    return verifyPassword(password, user.password, user.passwordSalt);
  }
  
  async updateUserPassword(userId: number, newPassword: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    // Import password utilities
    const { hashPassword } = await import("./utils/password");
    
    // Hash the new password
    const { hash, salt } = await hashPassword(newPassword);
    
    // Update the user with the new password, salt, and reset password change flag
    const updatedUser: User = {
      ...user,
      password: hash,
      passwordSalt: salt,
      passwordChangeRequired: false,
      updatedAt: new Date()
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateLastLogin(userId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser: User = {
      ...user,
      lastLogin: new Date()
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async setPasswordChangeRequired(userId: number, required: boolean): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser: User = {
      ...user,
      passwordChangeRequired: required,
      updatedAt: new Date()
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateStripeCustomerId(userId: number, customerId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, stripeCustomerId: customerId };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateUserStripeInfo(userId: number, info: { customerId: string, subscriptionId: string }): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { 
      ...user, 
      stripeCustomerId: info.customerId, 
      stripeSubscriptionId: info.subscriptionId,
      isActive: true
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateUserTier(userId: number, tier: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { 
      ...user, 
      tier: tier,
      isActive: true 
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserOnboardingStatus(userId: number, hasCompleted: boolean): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { 
      ...user, 
      onboardingCompleted: hasCompleted 
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  // Properties
  async createProperty(property: InsertProperty): Promise<Property> {
    const id = this.currentPropertyId++;
    const newProperty: Property = { 
      ...property, 
      id,
      country: property.country || null,
      units: property.units || null,
      acquisitionDate: property.acquisitionDate || null,
      purchasePrice: property.purchasePrice || null,
      currentValue: property.currentValue || null
    };
    this.properties.set(id, newProperty);
    return newProperty;
  }
  
  async getPropertyById(id: number): Promise<Property | undefined> {
    return this.properties.get(id);
  }
  
  async getPropertiesByUserId(userId: number): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(
      (property) => property.userId === userId
    );
  }
  
  async updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined> {
    const existingProperty = await this.getPropertyById(id);
    if (!existingProperty) return undefined;
    
    const updatedProperty = { ...existingProperty, ...property };
    this.properties.set(id, updatedProperty);
    return updatedProperty;
  }
  
  // Tenants
  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const id = this.currentTenantId++;
    const newTenant: Tenant = { 
      ...tenant, 
      id,
      email: tenant.email || null,
      phone: tenant.phone || null,
      leaseStart: tenant.leaseStart || null,
      leaseEnd: tenant.leaseEnd || null,
      monthlyRent: tenant.monthlyRent || null,
      active: tenant.active ?? null
    };
    this.tenants.set(id, newTenant);
    return newTenant;
  }
  
  async getTenantById(id: number): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }
  
  async getTenantsByPropertyId(propertyId: number): Promise<Tenant[]> {
    return Array.from(this.tenants.values()).filter(
      (tenant) => tenant.propertyId === propertyId
    );
  }
  
  async getTenantsByUserId(userId: number): Promise<Tenant[]> {
    return Array.from(this.tenants.values()).filter(
      (tenant) => tenant.userId === userId
    );
  }
  
  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant> {
    const existingTenant = await this.getTenantById(id);
    if (!existingTenant) {
      throw new Error(`Tenant with ID ${id} not found`);
    }
    
    const updatedTenant = { ...existingTenant, ...tenant };
    this.tenants.set(id, updatedTenant);
    return updatedTenant;
  }
  
  // Payments
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    const newPayment: Payment = { 
      ...payment, 
      id,
      status: payment.status || null,
      notes: payment.notes || null
    };
    this.payments.set(id, newPayment);
    return newPayment;
  }
  
  async getPaymentsByTenantId(tenantId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.tenantId === tenantId
    );
  }
  
  async getLatePayers(userId: number): Promise<{tenant: Tenant, lastPayment: Payment | null}[]> {
    const tenants = await this.getTenantsByUserId(userId);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return Promise.all(tenants.map(async (tenant) => {
      const payments = await this.getPaymentsByTenantId(tenant.id);
      const sortedPayments = payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastPayment = sortedPayments[0] || null;
      
      const isPotentiallyLate = !lastPayment || 
        new Date(lastPayment.date).getMonth() !== currentMonth || 
        new Date(lastPayment.date).getFullYear() !== currentYear;
      
      if (isPotentiallyLate && tenant.active) {
        return { tenant, lastPayment };
      }
      return null;
    })).then(results => results.filter(Boolean) as {tenant: Tenant, lastPayment: Payment | null}[]);
  }
  
  // Survey
  async createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse> {
    const id = this.currentSurveyResponseId++;
    const newResponse: SurveyResponse = { 
      ...response, 
      id, 
      submittedAt: new Date(),
      email: response.email || null
    };
    this.surveyResponses.set(id, newResponse);
    return newResponse;
  }
  
  async getAllSurveyResponses(): Promise<SurveyResponse[]> {
    return Array.from(this.surveyResponses.values());
  }
  
  async getSurveyResponses(): Promise<SurveyResponse[]> {
    return this.getAllSurveyResponses();
  }
  
  async getUserCount(): Promise<number> {
    return this.users.size;
  }
  
  async getSurveyResponseCount(): Promise<number> {
    return this.surveyResponses.size;
  }
  
  async getWaitingListCount(): Promise<number> {
    return this.waitingListEntries.size;
  }
  
  async getSurveyAnalytics(): Promise<{questionId: number, yesCount: number, noCount: number}[]> {
    const responses = await this.getAllSurveyResponses();
    const questions = await this.getAllQuestions();
    
    return questions.map(question => {
      let yesCount = 0;
      let noCount = 0;
      
      responses.forEach(response => {
        const responseData = response.responses as any;
        if (Array.isArray(responseData)) {
          responseData.forEach((answer: any) => {
            if (answer.questionId === question.id) {
              if (answer.answer === true) yesCount++;
              else noCount++;
            }
          });
        }
      });
      
      return { questionId: question.id, yesCount, noCount };
    });
  }
  
  // Waiting List
  async addToWaitingList(entry: InsertWaitingList): Promise<WaitingList> {
    const existingEmail = await this.isEmailInWaitingList(entry.email);
    if (existingEmail) {
      throw new Error("Email already in waiting list");
    }
    
    const id = this.currentWaitingListId++;
    const newEntry: WaitingList = { 
      ...entry, 
      id, 
      joinedAt: new Date(),
      fullName: entry.fullName || null
    };
    this.waitingListEntries.set(id, newEntry);
    return newEntry;
  }
  
  async isEmailInWaitingList(email: string): Promise<boolean> {
    return Array.from(this.waitingListEntries.values()).some(
      (entry) => entry.email === email
    );
  }
  
  async getWaitingList(): Promise<WaitingList[]> {
    return Array.from(this.waitingListEntries.values());
  }
  
  // Files
  async uploadFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const id = this.currentFileId++;
    const newFile: UploadedFile = { 
      ...file, 
      id, 
      uploadDate: new Date(), 
      processed: false, 
      extractedData: null 
    };
    this.files.set(id, newFile);
    return newFile;
  }
  
  async getFilesByUserId(userId: number): Promise<UploadedFile[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.userId === userId
    );
  }
  
  async updateFileData(fileId: number, extractedData: any): Promise<UploadedFile> {
    const file = this.files.get(fileId);
    if (!file) throw new Error("File not found");
    
    const updatedFile = { ...file, extractedData, processed: true };
    this.files.set(fileId, updatedFile);
    return updatedFile;
  }
  
  // Questions
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const id = this.currentQuestionId++;
    const newQuestion: Question = { 
      ...question, 
      id,
      active: question.active ?? null
    };
    this.questionsList.set(id, newQuestion);
    return newQuestion;
  }
  
  async getAllQuestions(): Promise<Question[]> {
    return Array.from(this.questionsList.values()).sort((a, b) => a.order - b.order);
  }
  
  async getActiveQuestions(): Promise<Question[]> {
    return (await this.getAllQuestions()).filter(q => q.active);
  }

  // ===== ACCOUNTING MODULE =====
  
  // Transaction Categories
  async createTransactionCategory(category: InsertTransactionCategory): Promise<TransactionCategory> {
    const id = this.currentTransactionCategoryId++;
    const newCategory: TransactionCategory = {
      ...category,
      id,
      color: category.color || null,
      isDefault: category.isDefault || false,
      createdAt: new Date()
    };
    this.transactionCategories.set(id, newCategory);
    return newCategory;
  }

  async getTransactionCategoriesByUserId(userId: number): Promise<TransactionCategory[]> {
    return Array.from(this.transactionCategories.values()).filter(
      (category) => category.userId === userId
    );
  }

  async getTransactionCategoryById(id: number): Promise<TransactionCategory | undefined> {
    return this.transactionCategories.get(id);
  }

  async updateTransactionCategory(id: number, data: Partial<InsertTransactionCategory>): Promise<TransactionCategory | undefined> {
    const category = await this.getTransactionCategoryById(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...data };
    this.transactionCategories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteTransactionCategory(id: number): Promise<boolean> {
    const category = await this.getTransactionCategoryById(id);
    if (!category) return false;
    
    return this.transactionCategories.delete(id);
  }

  async createDefaultTransactionCategories(userId: number): Promise<TransactionCategory[]> {
    const defaultCategories = [
      // Income categories
      { name: "Rental Income", type: "income", userId, color: "#4CAF50", isDefault: true },
      { name: "Security Deposits", type: "income", userId, color: "#8BC34A", isDefault: true },
      { name: "Late Fees", type: "income", userId, color: "#CDDC39", isDefault: true },
      { name: "Other Income", type: "income", userId, color: "#FFEB3B", isDefault: true },
      
      // Expense categories
      { name: "Mortgage/Loan", type: "expense", userId, color: "#F44336", isDefault: true },
      { name: "Insurance", type: "expense", userId, color: "#E91E63", isDefault: true },
      { name: "Property Tax", type: "expense", userId, color: "#9C27B0", isDefault: true },
      { name: "Utilities", type: "expense", userId, color: "#673AB7", isDefault: true },
      { name: "Maintenance", type: "expense", userId, color: "#3F51B5", isDefault: true },
      { name: "Repairs", type: "expense", userId, color: "#2196F3", isDefault: true },
      { name: "Property Management", type: "expense", userId, color: "#03A9F4", isDefault: true },
      { name: "Legal & Professional", type: "expense", userId, color: "#00BCD4", isDefault: true },
      { name: "Marketing & Advertising", type: "expense", userId, color: "#009688", isDefault: true },
      { name: "Travel", type: "expense", userId, color: "#607D8B", isDefault: true }
    ] as InsertTransactionCategory[];
    
    const createdCategories: TransactionCategory[] = [];
    
    for (const category of defaultCategories) {
      createdCategories.push(await this.createTransactionCategory(category));
    }
    
    return createdCategories;
  }
  
  // Transactions
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const newTransaction: Transaction = {
      ...transaction,
      id,
      reference: transaction.reference || null,
      notes: transaction.notes || null,
      attachmentId: transaction.attachmentId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }
  
  async getTransactionsByUserId(userId: number, params?: { 
    startDate?: Date, 
    endDate?: Date,
    categoryId?: number,
    propertyId?: number,
    type?: 'income' | 'expense' | 'all'
  }): Promise<Transaction[]> {
    let transactions = Array.from(this.transactions.values()).filter(
      (transaction) => transaction.userId === userId
    );
    
    // Apply filters
    if (params) {
      if (params.startDate) {
        transactions = transactions.filter(t => new Date(t.date) >= params.startDate!);
      }
      
      if (params.endDate) {
        transactions = transactions.filter(t => new Date(t.date) <= params.endDate!);
      }
      
      if (params.categoryId) {
        transactions = transactions.filter(t => t.categoryId === params.categoryId);
      }
      
      if (params.propertyId) {
        transactions = transactions.filter(t => t.propertyId === params.propertyId);
      }
      
      if (params.type && params.type !== 'all') {
        transactions = transactions.filter(t => t.type === params.type);
      }
    }
    
    // Sort by date (newest first)
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getTransactionById(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async updateTransaction(id: number, data: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const transaction = await this.getTransactionById(id);
    if (!transaction) return undefined;
    
    const updatedTransaction = { ...transaction, ...data };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    const transaction = await this.getTransactionById(id);
    if (!transaction) return false;
    
    return this.transactions.delete(id);
  }
  
  async getTransactionSummary(userId: number, timeframe: 'month' | 'quarter' | 'year'): Promise<{
    totalIncome: number,
    totalExpenses: number,
    netIncome: number,
    incomeByCategory: {categoryId: number, categoryName: string, amount: number}[],
    expensesByCategory: {categoryId: number, categoryName: string, amount: number}[]
  }> {
    // Set date range based on timeframe
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    // Get all transactions for this time period
    const transactions = await this.getTransactionsByUserId(userId, {
      startDate,
      endDate: now
    });
    
    // Get all categories for this user
    const categories = await this.getTransactionCategoriesByUserId(userId);
    const categoryMap = new Map<number, TransactionCategory>();
    categories.forEach(cat => categoryMap.set(cat.id, cat));
    
    // Calculate totals
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Group by category
    const incomeByCategoryMap = new Map<number, number>();
    const expensesByCategoryMap = new Map<number, number>();
    
    incomeTransactions.forEach(t => {
      const currentAmount = incomeByCategoryMap.get(t.categoryId) || 0;
      incomeByCategoryMap.set(t.categoryId, currentAmount + t.amount);
    });
    
    expenseTransactions.forEach(t => {
      const currentAmount = expensesByCategoryMap.get(t.categoryId) || 0;
      expensesByCategoryMap.set(t.categoryId, currentAmount + t.amount);
    });
    
    // Format result
    const incomeByCategory = Array.from(incomeByCategoryMap.entries()).map(([categoryId, amount]) => {
      const category = categoryMap.get(categoryId);
      return {
        categoryId,
        categoryName: category ? category.name : 'Unknown',
        amount
      };
    });
    
    const expensesByCategory = Array.from(expensesByCategoryMap.entries()).map(([categoryId, amount]) => {
      const category = categoryMap.get(categoryId);
      return {
        categoryId,
        categoryName: category ? category.name : 'Unknown',
        amount
      };
    });
    
    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      incomeByCategory,
      expensesByCategory
    };
  }
  
  // Bank Accounts
  async createBankAccount(account: InsertBankAccount): Promise<BankAccount> {
    const id = this.currentBankAccountId++;
    const newAccount: BankAccount = {
      ...account,
      id,
      notes: account.notes || null
    };
    this.bankAccounts.set(id, newAccount);
    return newAccount;
  }
  
  async getBankAccountsByUserId(userId: number): Promise<BankAccount[]> {
    return Array.from(this.bankAccounts.values()).filter(
      (account) => account.userId === userId
    );
  }
  
  async getBankAccountById(id: number): Promise<BankAccount | undefined> {
    return this.bankAccounts.get(id);
  }
  
  async updateBankAccount(id: number, data: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    const account = await this.getBankAccountById(id);
    if (!account) return undefined;
    
    const updatedAccount = { ...account, ...data };
    this.bankAccounts.set(id, updatedAccount);
    return updatedAccount;
  }
  
  async deleteBankAccount(id: number): Promise<boolean> {
    const account = await this.getBankAccountById(id);
    if (!account) return false;
    
    return this.bankAccounts.delete(id);
  }
  
  // Bank Statements
  async createBankStatement(statement: InsertBankStatement): Promise<BankStatement> {
    const id = this.currentBankStatementId++;
    const newStatement: BankStatement = {
      ...statement,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      processed: false,
      reconciled: false,
      transactionCount: statement.transactionCount || 0,
      totalDeposits: statement.totalDeposits || 0,
      totalWithdrawals: statement.totalWithdrawals || 0,
      notes: statement.notes || null
    };
    this.bankStatements.set(id, newStatement);
    return newStatement;
  }
  
  async getBankStatementsByUserId(userId: number): Promise<BankStatement[]> {
    return Array.from(this.bankStatements.values()).filter(
      (statement) => statement.userId === userId
    );
  }
  
  async getBankStatementsByBankAccountId(bankAccountId: number): Promise<BankStatement[]> {
    return Array.from(this.bankStatements.values()).filter(
      (statement) => statement.bankAccountId === bankAccountId
    );
  }
  
  async getBankStatementById(id: number): Promise<BankStatement | undefined> {
    return this.bankStatements.get(id);
  }
  
  async updateBankStatement(id: number, data: Partial<InsertBankStatement>): Promise<BankStatement | undefined> {
    const statement = await this.getBankStatementById(id);
    if (!statement) return undefined;
    
    const updatedStatement = { 
      ...statement, 
      ...data,
      updatedAt: new Date()
    };
    this.bankStatements.set(id, updatedStatement);
    return updatedStatement;
  }
  
  async processStatement(id: number, extractedData: any): Promise<BankStatement> {
    const statement = await this.getBankStatementById(id);
    if (!statement) throw new Error("Bank statement not found");
    
    const updatedStatement = { 
      ...statement, 
      processed: true,
      updatedAt: new Date()
    };
    this.bankStatements.set(id, updatedStatement);
    
    // Here you would also process the extracted data to create transactions
    // This is a placeholder for that logic
    
    return updatedStatement;
  }
  
  async deleteBankStatement(id: number): Promise<boolean> {
    const statement = await this.getBankStatementById(id);
    if (!statement) return false;
    
    return this.bankStatements.delete(id);
  }
  
  // Tax Years
  async createTaxYear(taxYear: InsertTaxYear): Promise<TaxYear> {
    const id = this.currentTaxYearId++;
    const newTaxYear: TaxYear = {
      ...taxYear,
      id,
      isClosed: false,
      totalIncome: null,
      totalExpenses: null,
      netIncome: null,
      taxRate: null,
      estimatedTax: null,
      closedDate: null
    };
    this.taxYears.set(id, newTaxYear);
    return newTaxYear;
  }
  
  async getTaxYearsByUserId(userId: number): Promise<TaxYear[]> {
    return Array.from(this.taxYears.values()).filter(
      (taxYear) => taxYear.userId === userId
    );
  }
  
  async getTaxYearById(id: number): Promise<TaxYear | undefined> {
    return this.taxYears.get(id);
  }
  
  async updateTaxYear(id: number, data: Partial<InsertTaxYear>): Promise<TaxYear | undefined> {
    const taxYear = await this.getTaxYearById(id);
    if (!taxYear) return undefined;
    
    const updatedTaxYear = { ...taxYear, ...data };
    this.taxYears.set(id, updatedTaxYear);
    return updatedTaxYear;
  }
  
  async closeTaxYear(id: number, data: { 
    totalIncome: number, 
    totalExpenses: number, 
    netIncome: number, 
    taxRate?: number, 
    estimatedTax?: number 
  }): Promise<TaxYear | undefined> {
    const taxYear = await this.getTaxYearById(id);
    if (!taxYear) return undefined;
    
    const updatedTaxYear = { 
      ...taxYear, 
      ...data,
      isClosed: true,
      closedDate: new Date()
    };
    this.taxYears.set(id, updatedTaxYear);
    return updatedTaxYear;
  }
  
  // Budgets
  async createBudget(budget: InsertBudget): Promise<Budget> {
    const id = this.currentBudgetId++;
    const newBudget: Budget = {
      ...budget,
      id,
      notes: budget.notes || null
    };
    this.budgets.set(id, newBudget);
    return newBudget;
  }
  
  async getBudgetsByUserId(userId: number): Promise<Budget[]> {
    return Array.from(this.budgets.values()).filter(
      (budget) => budget.userId === userId
    );
  }
  
  async getBudgetById(id: number): Promise<Budget | undefined> {
    return this.budgets.get(id);
  }
  
  async updateBudget(id: number, data: Partial<InsertBudget>): Promise<Budget | undefined> {
    const budget = await this.getBudgetById(id);
    if (!budget) return undefined;
    
    const updatedBudget = { ...budget, ...data };
    this.budgets.set(id, updatedBudget);
    return updatedBudget;
  }
  
  async deleteBudget(id: number): Promise<boolean> {
    const budget = await this.getBudgetById(id);
    if (!budget) return false;
    
    return this.budgets.delete(id);
  }
  
  async getBudgetAnalytics(userId: number): Promise<{
    budgetId: number,
    budgetName: string,
    budgetAmount: number,
    actualAmount: number,
    variance: number,
    percentUsed: number
  }[]> {
    const budgets = await this.getBudgetsByUserId(userId);
    const result: {
      budgetId: number,
      budgetName: string,
      budgetAmount: number,
      actualAmount: number,
      variance: number,
      percentUsed: number
    }[] = [];
    
    // For each budget, calculate the actual spending based on transactions
    for (const budget of budgets) {
      // Find the sum of all transactions that match this budget's criteria
      let actualAmount = 0;
      
      // If this is a category-specific budget
      if (budget.categoryId) {
        const transactions = await this.getTransactionsByUserId(userId, {
          categoryId: budget.categoryId,
          startDate: budget.startDate,
          endDate: budget.endDate,
          type: budget.type
        });
        
        actualAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      }
      // If this is a property-specific budget
      else if (budget.propertyId) {
        const transactions = await this.getTransactionsByUserId(userId, {
          propertyId: budget.propertyId,
          startDate: budget.startDate,
          endDate: budget.endDate,
          type: budget.type
        });
        
        actualAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      }
      // General budget for all transactions of a certain type
      else {
        const transactions = await this.getTransactionsByUserId(userId, {
          startDate: budget.startDate,
          endDate: budget.endDate,
          type: budget.type
        });
        
        actualAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      }
      
      // Calculate metrics
      const variance = budget.amount - actualAmount;
      const percentUsed = (actualAmount / budget.amount) * 100;
      
      result.push({
        budgetId: budget.id,
        budgetName: budget.name,
        budgetAmount: budget.amount,
        actualAmount,
        variance,
        percentUsed
      });
    }
    
    return result;
  }

  // ===== PAYMENT GATEWAY MODULE =====
  
  // PayPal Orders
  async createPayPalOrder(order: InsertPaypalOrder): Promise<PaypalOrder> {
    const id = this.currentPaypalOrderId++;
    const newOrder: PaypalOrder = {
      ...order,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.paypalOrders.set(id, newOrder);
    return newOrder;
  }
  
  async getPayPalOrderById(id: number): Promise<PaypalOrder | undefined> {
    return this.paypalOrders.get(id);
  }
  
  async getPayPalOrdersByUserId(userId: number): Promise<PaypalOrder[]> {
    return Array.from(this.paypalOrders.values()).filter(
      (order) => order.userId === userId
    );
  }
  
  async updatePayPalOrderStatus(id: number, status: string): Promise<PaypalOrder> {
    const order = this.paypalOrders.get(id);
    if (!order) throw new Error("PayPal order not found");
    
    const updatedOrder = { 
      ...order, 
      status, 
      updatedAt: new Date() 
    };
    this.paypalOrders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  // Payment Gateway Preferences
  async updateUserPaymentGateway(userId: number, gateway: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { 
      ...user, 
      preferredPaymentGateway: gateway 
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async getUserPaymentGateway(userId: number): Promise<string | null> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    return user.preferredPaymentGateway || null;
  }

  // ===== MAINTENANCE MODULE =====
  
  // Maintenance Requests
  async createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const id = this.currentMaintenanceRequestId++;
    const newRequest: MaintenanceRequest = {
      ...request,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedCost: request.estimatedCost || null,
      actualCost: request.actualCost || null,
      completionDate: request.completionDate || null,
      attachmentIds: request.attachmentIds || null,
      serviceProviderId: request.serviceProviderId || null
    };
    this.maintenanceRequests.set(id, newRequest);
    return newRequest;
  }

  async getMaintenanceRequestById(id: number): Promise<MaintenanceRequest | undefined> {
    return this.maintenanceRequests.get(id);
  }

  async getMaintenanceRequestsByUserId(userId: number, filters?: {
    status?: string,
    propertyId?: number,
    priority?: string
  }): Promise<MaintenanceRequest[]> {
    let requests = Array.from(this.maintenanceRequests.values()).filter(
      (request) => request.userId === userId
    );

    if (filters) {
      if (filters.status) {
        requests = requests.filter(request => request.status === filters.status);
      }
      if (filters.propertyId) {
        requests = requests.filter(request => request.propertyId === filters.propertyId);
      }
      if (filters.priority) {
        requests = requests.filter(request => request.priority === filters.priority);
      }
    }

    return requests;
  }

  async getMaintenanceRequestsByPropertyId(propertyId: number): Promise<MaintenanceRequest[]> {
    return Array.from(this.maintenanceRequests.values()).filter(
      (request) => request.propertyId === propertyId
    );
  }

  async updateMaintenanceRequest(id: number, data: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined> {
    const request = await this.getMaintenanceRequestById(id);
    if (!request) return undefined;
    
    const updatedRequest = { 
      ...request, 
      ...data, 
      updatedAt: new Date() 
    };
    this.maintenanceRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async deleteMaintenanceRequest(id: number): Promise<boolean> {
    const request = await this.getMaintenanceRequestById(id);
    if (!request) return false;
    
    return this.maintenanceRequests.delete(id);
  }
  
  // Maintenance Comments
  async createMaintenanceComment(comment: InsertMaintenanceComment): Promise<MaintenanceComment> {
    const id = this.currentMaintenanceCommentId++;
    const newComment: MaintenanceComment = {
      ...comment,
      id,
      createdAt: new Date()
    };
    this.maintenanceComments.set(id, newComment);
    return newComment;
  }

  async getMaintenanceCommentsByRequestId(requestId: number): Promise<MaintenanceComment[]> {
    return Array.from(this.maintenanceComments.values())
      .filter((comment) => comment.maintenanceRequestId === requestId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  // Service Providers
  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    const id = this.currentServiceProviderId++;
    const newProvider: ServiceProvider = {
      ...provider,
      id,
      email: provider.email || null,
      phone: provider.phone || null,
      specialty: provider.specialty || null,
      notes: provider.notes || null,
      isPreferred: provider.isPreferred ?? null,
      hourlyRate: provider.hourlyRate ?? null,
      createdAt: new Date()
    };
    this.serviceProviders.set(id, newProvider);
    return newProvider;
  }

  async getServiceProvidersByUserId(userId: number): Promise<ServiceProvider[]> {
    return Array.from(this.serviceProviders.values()).filter(
      (provider) => provider.userId === userId
    );
  }

  async getServiceProviderById(id: number): Promise<ServiceProvider | undefined> {
    return this.serviceProviders.get(id);
  }

  async updateServiceProvider(id: number, data: Partial<InsertServiceProvider>): Promise<ServiceProvider | undefined> {
    const provider = await this.getServiceProviderById(id);
    if (!provider) return undefined;
    
    const updatedProvider = { ...provider, ...data };
    this.serviceProviders.set(id, updatedProvider);
    return updatedProvider;
  }

  async deleteServiceProvider(id: number): Promise<boolean> {
    const provider = await this.getServiceProviderById(id);
    if (!provider) return false;
    
    return this.serviceProviders.delete(id);
  }

  // ===== TENANT MANAGEMENT MODULE =====

  // Tenant Portal Access
  async createTenantCredential(credential: InsertTenantCredential): Promise<TenantCredential> {
    const id = this.currentTenantCredentialId++;
    const newCredential: TenantCredential = {
      ...credential,
      id,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: credential.isActive ?? true
    };
    this.tenantCredentials.set(id, newCredential);
    return newCredential;
  }

  async getTenantCredentialById(id: number): Promise<TenantCredential | undefined> {
    return this.tenantCredentials.get(id);
  }

  async getTenantCredentialByUsername(username: string): Promise<TenantCredential | undefined> {
    return Array.from(this.tenantCredentials.values()).find(
      (credential) => credential.username === username
    );
  }

  async getTenantCredentialByTenantId(tenantId: number): Promise<TenantCredential | undefined> {
    return Array.from(this.tenantCredentials.values()).find(
      (credential) => credential.tenantId === tenantId
    );
  }

  async getTenantCredentialsByUserId(userId: number): Promise<TenantCredential[]> {
    return Array.from(this.tenantCredentials.values()).filter(
      (credential) => credential.userId === userId
    );
  }

  async updateTenantCredential(id: number, data: Partial<InsertTenantCredential>): Promise<TenantCredential | undefined> {
    const credential = await this.getTenantCredentialById(id);
    if (!credential) return undefined;
    
    const updatedCredential = { 
      ...credential, 
      ...data,
      updatedAt: new Date()
    };
    this.tenantCredentials.set(id, updatedCredential);
    return updatedCredential;
  }

  async deleteTenantCredential(id: number): Promise<boolean> {
    return this.tenantCredentials.delete(id);
  }

  async updateTenantCredentialLastLogin(id: number): Promise<TenantCredential> {
    const credential = await this.getTenantCredentialById(id);
    if (!credential) throw new Error("Tenant credential not found");
    
    const updatedCredential = { 
      ...credential, 
      lastLogin: new Date(),
      updatedAt: new Date()
    };
    this.tenantCredentials.set(id, updatedCredential);
    return updatedCredential;
  }

  // Document Repository - Shared Documents
  async createSharedDocument(document: InsertSharedDocument): Promise<SharedDocument> {
    const id = this.currentSharedDocumentId++;
    const newDocument: SharedDocument = {
      ...document,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: document.isPublic ?? false
    };
    this.sharedDocuments.set(id, newDocument);
    return newDocument;
  }

  async getSharedDocumentById(id: number): Promise<SharedDocument | undefined> {
    return this.sharedDocuments.get(id);
  }

  async getSharedDocumentsByUserId(userId: number): Promise<SharedDocument[]> {
    return Array.from(this.sharedDocuments.values()).filter(
      (document) => document.userId === userId
    );
  }

  async getPublicDocumentsByUserId(userId: number): Promise<SharedDocument[]> {
    return Array.from(this.sharedDocuments.values()).filter(
      (document) => document.userId === userId && document.isPublic
    );
  }

  async updateSharedDocument(id: number, data: Partial<InsertSharedDocument>): Promise<SharedDocument | undefined> {
    const document = await this.getSharedDocumentById(id);
    if (!document) return undefined;
    
    const updatedDocument = { 
      ...document, 
      ...data,
      updatedAt: new Date()
    };
    this.sharedDocuments.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteSharedDocument(id: number): Promise<boolean> {
    return this.sharedDocuments.delete(id);
  }

  // Document Repository - Tenant Documents
  async createTenantDocument(document: InsertTenantDocument): Promise<TenantDocument> {
    const id = this.currentTenantDocumentId++;
    const newDocument: TenantDocument = {
      ...document,
      id,
      hasViewed: document.hasViewed ?? false,
      viewedAt: null,
      createdAt: new Date()
    };
    this.tenantDocuments.set(id, newDocument);
    return newDocument;
  }

  async getTenantDocumentById(id: number): Promise<TenantDocument | undefined> {
    return this.tenantDocuments.get(id);
  }

  async getTenantDocumentsByTenantId(tenantId: number): Promise<TenantDocument[]> {
    return Array.from(this.tenantDocuments.values()).filter(
      (document) => document.tenantId === tenantId
    );
  }

  async getTenantDocumentsByDocumentId(documentId: number): Promise<TenantDocument[]> {
    return Array.from(this.tenantDocuments.values()).filter(
      (document) => document.documentId === documentId
    );
  }

  async updateTenantDocumentViewStatus(id: number, hasViewed: boolean): Promise<TenantDocument> {
    const document = await this.getTenantDocumentById(id);
    if (!document) throw new Error("Tenant document not found");
    
    const updatedDocument = { 
      ...document, 
      hasViewed,
      viewedAt: hasViewed ? new Date() : null
    };
    this.tenantDocuments.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteTenantDocument(id: number): Promise<boolean> {
    return this.tenantDocuments.delete(id);
  }

  // Tenant Rating System
  async createTenantRating(rating: InsertTenantRating): Promise<TenantRating> {
    const id = this.currentTenantRatingId++;
    const newRating: TenantRating = {
      ...rating,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tenantRatings.set(id, newRating);
    return newRating;
  }

  async getTenantRatingById(id: number): Promise<TenantRating | undefined> {
    return this.tenantRatings.get(id);
  }

  async getTenantRatingsByTenantId(tenantId: number): Promise<TenantRating[]> {
    return Array.from(this.tenantRatings.values()).filter(
      (rating) => rating.tenantId === tenantId
    );
  }

  async getTenantRatingsByUserId(userId: number): Promise<TenantRating[]> {
    return Array.from(this.tenantRatings.values()).filter(
      (rating) => rating.userId === userId
    );
  }

  async updateTenantRating(id: number, data: Partial<InsertTenantRating>): Promise<TenantRating | undefined> {
    const rating = await this.getTenantRatingById(id);
    if (!rating) return undefined;
    
    const updatedRating = { 
      ...rating, 
      ...data,
      updatedAt: new Date()
    };
    this.tenantRatings.set(id, updatedRating);
    return updatedRating;
  }

  async deleteTenantRating(id: number): Promise<boolean> {
    return this.tenantRatings.delete(id);
  }

  async getTenantAverageRating(tenantId: number): Promise<number> {
    const ratings = await this.getTenantRatingsByTenantId(tenantId);
    if (ratings.length === 0) return 0;
    
    const total = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    return total / ratings.length;
  }
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    // Use MemoryStore for all environments for simplicity and Cloudflare compatibility
    // This avoids Node.js-specific dependencies in the Workers environment
    // For more robust session handling in production, token-based authentication 
    // would be better through the Hono API
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 1 day in milliseconds
    });
    
    // Initialize with some default questions data
    // Only do this if the database is already initialized
    if (db && typeof db.select === 'function') {
      // Use setTimeout to ensure this runs after the database is fully initialized
      // This avoids race conditions during startup
      setTimeout(() => {
        this.initializeDefaultData().catch(err => {
          console.error('Error initializing default data:', err);
        });
      }, 1000);
    } else {
      console.warn('Database not initialized yet, skipping default data initialization');
    }
  }

  private async initializeDefaultData() {
    try {
      // Check if we already have questions in the database
      const existingQuestions = await db.select().from(questions);
      if (existingQuestions.length === 0) {
        console.log("Initializing database with default questions...");
        
        // Same questions as in MemStorage
        const sampleQuestions = [
          "Do you own multiple rental properties?",
          "Do you struggle with tracking tenant payments?",
          "Do you currently use Excel to manage your properties?",
          "Is responding to tenant inquiries time-consuming?",
          "Do you find it difficult to keep track of property maintenance?",
          "Are you concerned about complying with German rental laws?",
          "Do you manage your rental properties remotely?",
          "Do you have issues with regular financial reporting?",
          "Would you like to automate tenant communications?",
          "Do you have trouble managing utility bills?",
          "Are you manually creating lease agreements?",
          "Do you have a system for tenant screening?",
          "Are you facing issues with property vacancy rates?",
          "Do you struggle with tax documentation for your properties?",
          "Would you benefit from automated payment reminders?",
          "Do you have a system for handling maintenance requests?",
          "Are you interested in analyzing your property performance data?",
          "Do you find bank statement reconciliation tedious?",
          "Would you like to reduce administrative time spent on property management?",
          "Are you looking for better ways to manage property documentation?"
        ];

        // Insert all questions
        for (let i = 0; i < sampleQuestions.length; i++) {
          await this.createQuestion({
            text: sampleQuestions[i],
            order: i + 1,
            active: true
          });
        }
      }
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      ...insertUser,
      isAdmin: insertUser.isAdmin !== undefined ? insertUser.isAdmin : false,
      isActive: insertUser.isActive !== undefined ? insertUser.isActive : true,
      onboardingCompleted: insertUser.onboardingCompleted !== undefined ? insertUser.onboardingCompleted : false,
      passwordSalt: insertUser.passwordSalt || null,
      passwordChangeRequired: insertUser.passwordChangeRequired !== undefined ? insertUser.passwordChangeRequired : false,
      lastLogin: insertUser.lastLogin || null,
      tier: insertUser.tier || null,
      stripeCustomerId: insertUser.stripeCustomerId || null,
      stripeSubscriptionId: insertUser.stripeSubscriptionId || null,
      stripePaymentIntentId: insertUser.stripePaymentIntentId || null,
      createdAt: insertUser.createdAt || new Date(),
      updatedAt: insertUser.updatedAt || new Date()
    }).returning();
    return result[0];
  }
  
  async createUserWithPassword(user: Omit<InsertUser, 'password'>, password: string): Promise<User> {
    // Import password utilities
    const { hashPassword } = await import("./utils/password");
    
    // Hash the password
    const { hash, salt } = await hashPassword(password);
    
    // Create the user with the hashed password and salt
    return this.createUser({
      ...user as any, // Type casting to satisfy TypeScript
      password: hash,
      passwordSalt: salt
    });
  }
  
  async verifyUserPassword(userId: number, password: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return false;
    
    if (!user.passwordSalt) {
      // Legacy password check (plain text)
      return user.password === password;
    }
    
    // Import password utilities
    const { verifyPassword } = await import("./utils/password");
    
    // Verify the password using the stored hash and salt
    return verifyPassword(password, user.password, user.passwordSalt);
  }
  
  async updateUserPassword(userId: number, newPassword: string): Promise<User> {
    // Import password utilities
    const { hashPassword } = await import("./utils/password");
    
    // Hash the new password
    const { hash, salt } = await hashPassword(newPassword);
    
    // Update the user record
    const result = await db.update(users)
      .set({
        password: hash,
        passwordSalt: salt,
        passwordChangeRequired: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return result[0];
  }
  
  async updateLastLogin(userId: number): Promise<User> {
    const result = await db.update(users)
      .set({ 
        lastLogin: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return result[0];
  }
  
  async setPasswordChangeRequired(userId: number, required: boolean): Promise<User> {
    const result = await db.update(users)
      .set({ 
        passwordChangeRequired: required,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return result[0];
  }

  async updateStripeCustomerId(userId: number, customerId: string): Promise<User> {
    const result = await db.update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return result[0];
  }

  async updateUserStripeInfo(userId: number, info: { customerId: string, subscriptionId: string }): Promise<User> {
    const result = await db.update(users)
      .set({ 
        stripeCustomerId: info.customerId,
        stripeSubscriptionId: info.subscriptionId,
        tier: 'premium',
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return result[0];
  }

  async updateUserTier(userId: number, tier: string): Promise<User> {
    const result = await db.update(users)
      .set({ 
        tier,
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return result[0];
  }

  async updateUserOnboardingStatus(userId: number, hasCompleted: boolean): Promise<User> {
    const result = await db.update(users)
      .set({ 
        onboardingCompleted: hasCompleted,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return result[0];
  }

  // Properties
  async createProperty(property: InsertProperty): Promise<Property> {
    const result = await db.insert(properties).values(property).returning();
    return result[0];
  }

  async getPropertyById(id: number): Promise<Property | undefined> {
    const result = await db.select().from(properties).where(eq(properties.id, id));
    return result[0];
  }

  async getPropertiesByUserId(userId: number): Promise<Property[]> {
    return db.select().from(properties).where(eq(properties.userId, userId));
  }

  async updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined> {
    const result = await db.update(properties)
      .set(property)
      .where(eq(properties.id, id))
      .returning();
    
    return result[0];
  }

  // Tenants
  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const result = await db.insert(tenants).values(tenant).returning();
    return result[0];
  }

  async getTenantById(id: number): Promise<Tenant | undefined> {
    const result = await db.select().from(tenants).where(eq(tenants.id, id));
    return result[0];
  }

  async getTenantsByPropertyId(propertyId: number): Promise<Tenant[]> {
    return db.select().from(tenants).where(eq(tenants.propertyId, propertyId));
  }

  async getTenantsByUserId(userId: number): Promise<Tenant[]> {
    return db.select().from(tenants).where(eq(tenants.userId, userId));
  }

  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant> {
    const result = await db
      .update(tenants)
      .set(tenant)
      .where(eq(tenants.id, id))
      .returning();
    return result[0];
  }

  // Payments
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values(payment).returning();
    return result[0];
  }

  async getPaymentsByTenantId(tenantId: number): Promise<Payment[]> {
    return db.select()
      .from(payments)
      .where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.date));
  }

  async getLatePayers(userId: number): Promise<{tenant: Tenant, lastPayment: Payment | null}[]> {
    const tenants = await this.getTenantsByUserId(userId);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const result: {tenant: Tenant, lastPayment: Payment | null}[] = [];
    
    for (const tenant of tenants) {
      if (!tenant.active) continue;
      
      const paymentsForTenant = await this.getPaymentsByTenantId(tenant.id);
      const lastPayment = paymentsForTenant.length > 0 ? paymentsForTenant[0] : null;
      
      const isPotentiallyLate = !lastPayment || 
        new Date(lastPayment.date).getMonth() !== currentMonth || 
        new Date(lastPayment.date).getFullYear() !== currentYear;
      
      if (isPotentiallyLate) {
        result.push({ tenant, lastPayment });
      }
    }
    
    return result;
  }

  // Survey
  async createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse> {
    const result = await db.insert(surveyResponses).values({
      ...response,
      submittedAt: new Date()
    }).returning();
    return result[0];
  }

  async getAllSurveyResponses(): Promise<SurveyResponse[]> {
    return db.select().from(surveyResponses);
  }
  
  async getSurveyResponses(): Promise<SurveyResponse[]> {
    return this.getAllSurveyResponses();
  }
  
  async getUserCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(users);
    return result[0].count;
  }
  
  async getSurveyResponseCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(surveyResponses);
    return result[0].count;
  }
  
  async getWaitingListCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(waitingList);
    return result[0].count;
  }

  async getSurveyAnalytics(): Promise<{questionId: number, yesCount: number, noCount: number}[]> {
    const responses = await this.getAllSurveyResponses();
    const allQuestions = await this.getAllQuestions();
    
    // Initialize result with all questions
    const result = allQuestions.map(q => ({
      questionId: q.id,
      yesCount: 0,
      noCount: 0
    }));
    
    // Process all responses
    for (const response of responses) {
      const responseData = response.responses as unknown as { questionId: number, answer: boolean }[];
      
      if (Array.isArray(responseData)) {
        for (const item of responseData) {
          const statsIndex = result.findIndex(r => r.questionId === item.questionId);
          if (statsIndex !== -1) {
            if (item.answer) {
              result[statsIndex].yesCount++;
            } else {
              result[statsIndex].noCount++;
            }
          }
        }
      }
    }
    
    return result;
  }

  // Waiting List
  async addToWaitingList(entry: InsertWaitingList): Promise<WaitingList> {
    // Check if email already exists
    const exists = await this.isEmailInWaitingList(entry.email);
    if (exists) {
      throw new Error("Email already in waiting list");
    }
    
    const result = await db.insert(waitingList).values({
      ...entry,
      joinedAt: new Date()
    }).returning();
    return result[0];
  }

  async isEmailInWaitingList(email: string): Promise<boolean> {
    const result = await db.select().from(waitingList).where(eq(waitingList.email, email));
    return result.length > 0;
  }

  async getWaitingList(): Promise<WaitingList[]> {
    return db.select().from(waitingList);
  }

  // Files
  async uploadFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const result = await db.insert(uploadedFiles).values({
      ...file,
      uploadDate: new Date(),
      processed: false,
      extractedData: null
    }).returning();
    return result[0];
  }

  async getFilesByUserId(userId: number): Promise<UploadedFile[]> {
    return db.select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.userId, userId))
      .orderBy(desc(uploadedFiles.uploadDate));
  }

  async updateFileData(fileId: number, extractedData: any): Promise<UploadedFile> {
    const result = await db.update(uploadedFiles)
      .set({
        processed: true,
        extractedData
      })
      .where(eq(uploadedFiles.id, fileId))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`File with ID ${fileId} not found`);
    }
    
    return result[0];
  }

  // Questions
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const result = await db.insert(questions).values(question).returning();
    return result[0];
  }

  async getAllQuestions(): Promise<Question[]> {
    return db.select().from(questions).orderBy(questions.order);
  }

  async getActiveQuestions(): Promise<Question[]> {
    return db.select()
      .from(questions)
      .where(eq(questions.active, true))
      .orderBy(questions.order);
  }

  // ===== ACCOUNTING MODULE =====
  
  // Transaction Categories
  async createTransactionCategory(category: InsertTransactionCategory): Promise<TransactionCategory> {
    const result = await db.insert(transactionCategories).values(category).returning();
    return result[0];
  }

  async getTransactionCategoriesByUserId(userId: number): Promise<TransactionCategory[]> {
    return db.select().from(transactionCategories).where(eq(transactionCategories.userId, userId));
  }

  async getTransactionCategoryById(id: number): Promise<TransactionCategory | undefined> {
    const results = await db.select().from(transactionCategories).where(eq(transactionCategories.id, id));
    return results[0];
  }

  async updateTransactionCategory(id: number, data: Partial<InsertTransactionCategory>): Promise<TransactionCategory | undefined> {
    const results = await db.update(transactionCategories)
      .set(data)
      .where(eq(transactionCategories.id, id))
      .returning();
    
    return results[0];
  }

  async deleteTransactionCategory(id: number): Promise<boolean> {
    try {
      await db.delete(transactionCategories).where(eq(transactionCategories.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting transaction category:", error);
      return false;
    }
  }

  async createDefaultTransactionCategories(userId: number): Promise<TransactionCategory[]> {
    const defaultCategories = [
      // Income categories
      { name: "Rental Income", type: "income", userId, color: "#4CAF50", isDefault: true },
      { name: "Security Deposits", type: "income", userId, color: "#8BC34A", isDefault: true },
      { name: "Late Fees", type: "income", userId, color: "#CDDC39", isDefault: true },
      { name: "Other Income", type: "income", userId, color: "#FFEB3B", isDefault: true },
      
      // Expense categories
      { name: "Mortgage/Loan", type: "expense", userId, color: "#F44336", isDefault: true },
      { name: "Insurance", type: "expense", userId, color: "#E91E63", isDefault: true },
      { name: "Property Tax", type: "expense", userId, color: "#9C27B0", isDefault: true },
      { name: "Utilities", type: "expense", userId, color: "#673AB7", isDefault: true },
      { name: "Maintenance", type: "expense", userId, color: "#3F51B5", isDefault: true },
      { name: "Repairs", type: "expense", userId, color: "#2196F3", isDefault: true },
      { name: "Property Management", type: "expense", userId, color: "#03A9F4", isDefault: true },
      { name: "Legal & Professional", type: "expense", userId, color: "#00BCD4", isDefault: true },
      { name: "Marketing & Advertising", type: "expense", userId, color: "#009688", isDefault: true },
      { name: "Travel", type: "expense", userId, color: "#607D8B", isDefault: true }
    ] as InsertTransactionCategory[];
    
    // Use a transaction to insert all categories at once
    const createdCategories = await db.transaction(async (tx) => {
      const results: TransactionCategory[] = [];
      
      for (const category of defaultCategories) {
        const [inserted] = await tx.insert(transactionCategories).values(category).returning();
        results.push(inserted);
      }
      
      return results;
    });
    
    return createdCategories;
  }
  
  // Transactions
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(transaction).returning();
    return result[0];
  }
  
  async getTransactionsByUserId(userId: number, params?: { 
    startDate?: Date, 
    endDate?: Date,
    categoryId?: number,
    propertyId?: number,
    type?: 'income' | 'expense' | 'all'
  }): Promise<Transaction[]> {
    let query = db.select().from(transactions).where(eq(transactions.userId, userId));
    
    // Apply filters
    if (params) {
      if (params.startDate) {
        query = query.where(db.sql`${transactions.date} >= ${params.startDate}`);
      }
      
      if (params.endDate) {
        query = query.where(db.sql`${transactions.date} <= ${params.endDate}`);
      }
      
      if (params.categoryId) {
        query = query.where(eq(transactions.categoryId, params.categoryId));
      }
      
      if (params.propertyId) {
        query = query.where(eq(transactions.propertyId, params.propertyId));
      }
      
      if (params.type && params.type !== 'all') {
        query = query.where(eq(transactions.type, params.type));
      }
    }
    
    // Sort by date (newest first)
    const results = await query.orderBy(desc(transactions.date));
    return results;
  }
  
  async getTransactionById(id: number): Promise<Transaction | undefined> {
    const results = await db.select().from(transactions).where(eq(transactions.id, id));
    return results[0];
  }
  
  async updateTransaction(id: number, data: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const results = await db.update(transactions)
      .set(data)
      .where(eq(transactions.id, id))
      .returning();
    
    return results[0];
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    try {
      await db.delete(transactions).where(eq(transactions.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting transaction:", error);
      return false;
    }
  }
  
  async getTransactionSummary(userId: number, timeframe: 'month' | 'quarter' | 'year'): Promise<{
    totalIncome: number,
    totalExpenses: number,
    netIncome: number,
    incomeByCategory: {categoryId: number, categoryName: string, amount: number}[],
    expensesByCategory: {categoryId: number, categoryName: string, amount: number}[]
  }> {
    // Set date range based on timeframe
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    // Get all transactions for this time period
    const allTransactions = await this.getTransactionsByUserId(userId, {
      startDate,
      endDate: now
    });
    
    // Get all categories for this user
    const categories = await this.getTransactionCategoriesByUserId(userId);
    const categoryMap = new Map<number, string>();
    categories.forEach(cat => categoryMap.set(cat.id, cat.name));
    
    // Calculate totals and group by category
    const incomeTransactions = allTransactions.filter(t => t.type === 'income');
    const expenseTransactions = allTransactions.filter(t => t.type === 'expense');
    
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Group by category
    const incomeByCategoryMap = new Map<number, number>();
    const expensesByCategoryMap = new Map<number, number>();
    
    incomeTransactions.forEach(t => {
      const currentAmount = incomeByCategoryMap.get(t.categoryId) || 0;
      incomeByCategoryMap.set(t.categoryId, currentAmount + t.amount);
    });
    
    expenseTransactions.forEach(t => {
      const currentAmount = expensesByCategoryMap.get(t.categoryId) || 0;
      expensesByCategoryMap.set(t.categoryId, currentAmount + t.amount);
    });
    
    // Format result
    const incomeByCategory = Array.from(incomeByCategoryMap.entries()).map(([categoryId, amount]) => ({
      categoryId,
      categoryName: categoryMap.get(categoryId) || 'Unknown',
      amount
    }));
    
    const expensesByCategory = Array.from(expensesByCategoryMap.entries()).map(([categoryId, amount]) => ({
      categoryId,
      categoryName: categoryMap.get(categoryId) || 'Unknown',
      amount
    }));
    
    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      incomeByCategory,
      expensesByCategory
    };
  }
  
  // Bank Accounts
  async createBankAccount(account: InsertBankAccount): Promise<BankAccount> {
    const result = await db.insert(bankAccounts).values(account).returning();
    return result[0];
  }
  
  async getBankAccountsByUserId(userId: number): Promise<BankAccount[]> {
    return db.select().from(bankAccounts).where(eq(bankAccounts.userId, userId));
  }
  
  async getBankAccountById(id: number): Promise<BankAccount | undefined> {
    const results = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id));
    return results[0];
  }
  
  async updateBankAccount(id: number, data: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    const results = await db.update(bankAccounts)
      .set(data)
      .where(eq(bankAccounts.id, id))
      .returning();
    
    return results[0];
  }
  
  async deleteBankAccount(id: number): Promise<boolean> {
    try {
      await db.delete(bankAccounts).where(eq(bankAccounts.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting bank account:", error);
      return false;
    }
  }
  
  // Bank Statements
  async createBankStatement(statement: InsertBankStatement): Promise<BankStatement> {
    try {
      const [newStatement] = await db.insert(bankStatements)
        .values({
          ...statement,
          createdAt: new Date(),
          updatedAt: new Date(),
          processed: statement.processed ?? false,
          reconciled: statement.reconciled ?? false,
          transactionCount: statement.transactionCount ?? 0,
          totalDeposits: statement.totalDeposits ?? 0,
          totalWithdrawals: statement.totalWithdrawals ?? 0,
          notes: statement.notes || null
        })
        .returning();
      return newStatement;
    } catch (error) {
      console.error("Error creating bank statement:", error);
      throw error;
    }
  }
  
  async getBankStatementsByUserId(userId: number): Promise<BankStatement[]> {
    try {
      return await db.select()
        .from(bankStatements)
        .where(eq(bankStatements.userId, userId));
    } catch (error) {
      console.error("Error getting bank statements by user ID:", error);
      return [];
    }
  }
  
  async getBankStatementsByBankAccountId(bankAccountId: number): Promise<BankStatement[]> {
    try {
      return await db.select()
        .from(bankStatements)
        .where(eq(bankStatements.bankAccountId, bankAccountId));
    } catch (error) {
      console.error("Error getting bank statements by bank account ID:", error);
      return [];
    }
  }
  
  async getBankStatementById(id: number): Promise<BankStatement | undefined> {
    try {
      const [statement] = await db.select()
        .from(bankStatements)
        .where(eq(bankStatements.id, id));
      return statement;
    } catch (error) {
      console.error("Error getting bank statement by ID:", error);
      return undefined;
    }
  }
  
  async updateBankStatement(id: number, data: Partial<InsertBankStatement>): Promise<BankStatement | undefined> {
    try {
      const [updatedStatement] = await db.update(bankStatements)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(bankStatements.id, id))
        .returning();
      return updatedStatement;
    } catch (error) {
      console.error("Error updating bank statement:", error);
      return undefined;
    }
  }
  
  async processStatement(id: number, extractedData: any): Promise<BankStatement> {
    try {
      const [processedStatement] = await db.update(bankStatements)
        .set({
          processed: true,
          updatedAt: new Date()
        })
        .where(eq(bankStatements.id, id))
        .returning();
      
      if (!processedStatement) {
        throw new Error("Bank statement not found");
      }
      
      // This would be where transaction creation logic would go
      // For now we're just marking the statement as processed
      
      return processedStatement;
    } catch (error) {
      console.error("Error processing bank statement:", error);
      throw error;
    }
  }
  
  async deleteBankStatement(id: number): Promise<boolean> {
    try {
      const result = await db.delete(bankStatements)
        .where(eq(bankStatements.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting bank statement:", error);
      return false;
    }
  }
  
  // Tax Years
  async createTaxYear(taxYear: InsertTaxYear): Promise<TaxYear> {
    const result = await db.insert(taxYears).values({
      ...taxYear,
      isClosed: false,
      totalIncome: null,
      totalExpenses: null,
      netIncome: null,
      taxRate: null,
      estimatedTax: null,
      closedDate: null
    }).returning();
    
    return result[0];
  }
  
  async getTaxYearsByUserId(userId: number): Promise<TaxYear[]> {
    return db.select().from(taxYears).where(eq(taxYears.userId, userId));
  }
  
  async getTaxYearById(id: number): Promise<TaxYear | undefined> {
    const results = await db.select().from(taxYears).where(eq(taxYears.id, id));
    return results[0];
  }
  
  async updateTaxYear(id: number, data: Partial<InsertTaxYear>): Promise<TaxYear | undefined> {
    const results = await db.update(taxYears)
      .set(data)
      .where(eq(taxYears.id, id))
      .returning();
    
    return results[0];
  }
  
  async closeTaxYear(id: number, data: { 
    totalIncome: number, 
    totalExpenses: number, 
    netIncome: number, 
    taxRate?: number, 
    estimatedTax?: number 
  }): Promise<TaxYear | undefined> {
    const results = await db.update(taxYears)
      .set({
        ...data,
        isClosed: true,
        closedDate: new Date()
      })
      .where(eq(taxYears.id, id))
      .returning();
    
    return results[0];
  }
  
  // Budgets
  async createBudget(budget: InsertBudget): Promise<Budget> {
    const result = await db.insert(budgets).values(budget).returning();
    return result[0];
  }
  
  async getBudgetsByUserId(userId: number): Promise<Budget[]> {
    return db.select().from(budgets).where(eq(budgets.userId, userId));
  }
  
  async getBudgetById(id: number): Promise<Budget | undefined> {
    const results = await db.select().from(budgets).where(eq(budgets.id, id));
    return results[0];
  }
  
  async updateBudget(id: number, data: Partial<InsertBudget>): Promise<Budget | undefined> {
    const results = await db.update(budgets)
      .set(data)
      .where(eq(budgets.id, id))
      .returning();
    
    return results[0];
  }
  
  async deleteBudget(id: number): Promise<boolean> {
    try {
      await db.delete(budgets).where(eq(budgets.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting budget:", error);
      return false;
    }
  }
  
  async getBudgetAnalytics(userId: number): Promise<{
    budgetId: number,
    budgetName: string,
    budgetAmount: number,
    actualAmount: number,
    variance: number,
    percentUsed: number
  }[]> {
    const userBudgets = await this.getBudgetsByUserId(userId);
    const result: {
      budgetId: number,
      budgetName: string,
      budgetAmount: number,
      actualAmount: number,
      variance: number,
      percentUsed: number
    }[] = [];
    
    // For each budget, calculate actual spending
    for (const budget of userBudgets) {
      let query = db.select().from(transactions)
        .where(eq(transactions.userId, userId))
        .where(db.sql`${transactions.date} >= ${budget.startDate}`)
        .where(db.sql`${transactions.date} <= ${budget.endDate}`)
        .where(eq(transactions.type, budget.type));
      
      // If this is a category-specific budget
      if (budget.categoryId) {
        query = query.where(eq(transactions.categoryId, budget.categoryId));
      }
      
      // If this is a property-specific budget
      if (budget.propertyId) {
        query = query.where(eq(transactions.propertyId, budget.propertyId));
      }
      
      const matchingTransactions = await query;
      const actualAmount = matchingTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate metrics
      const variance = budget.amount - actualAmount;
      const percentUsed = (actualAmount / budget.amount) * 100;
      
      result.push({
        budgetId: budget.id,
        budgetName: budget.name,
        budgetAmount: budget.amount,
        actualAmount,
        variance,
        percentUsed
      });
    }
    
    return result;
  }

  // ===== MAINTENANCE MODULE =====
  
  // Maintenance Requests
  async createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const result = await db.insert(maintenanceRequests).values({
      ...request,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async getMaintenanceRequestById(id: number): Promise<MaintenanceRequest | undefined> {
    const result = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, id));
    return result[0];
  }

  async getMaintenanceRequestsByUserId(userId: number, filters?: {
    status?: string,
    propertyId?: number,
    priority?: string
  }): Promise<MaintenanceRequest[]> {
    let query = db.select().from(maintenanceRequests).where(eq(maintenanceRequests.userId, userId));
    
    if (filters) {
      if (filters.status) {
        query = query.where(eq(maintenanceRequests.status, filters.status));
      }
      if (filters.propertyId) {
        query = query.where(eq(maintenanceRequests.propertyId, filters.propertyId));
      }
      if (filters.priority) {
        query = query.where(eq(maintenanceRequests.priority, filters.priority));
      }
    }
    
    return query.orderBy(desc(maintenanceRequests.createdAt));
  }

  async getMaintenanceRequestsByPropertyId(propertyId: number): Promise<MaintenanceRequest[]> {
    return db.select()
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.propertyId, propertyId))
      .orderBy(desc(maintenanceRequests.createdAt));
  }

  async updateMaintenanceRequest(id: number, data: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined> {
    const result = await db.update(maintenanceRequests)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(maintenanceRequests.id, id))
      .returning();
    
    return result[0];
  }

  async deleteMaintenanceRequest(id: number): Promise<boolean> {
    const result = await db.delete(maintenanceRequests)
      .where(eq(maintenanceRequests.id, id))
      .returning();
    
    return result.length > 0;
  }
  
  // Maintenance Comments
  async createMaintenanceComment(comment: InsertMaintenanceComment): Promise<MaintenanceComment> {
    const result = await db.insert(maintenanceComments).values({
      ...comment,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getMaintenanceCommentsByRequestId(requestId: number): Promise<MaintenanceComment[]> {
    return db.select()
      .from(maintenanceComments)
      .where(eq(maintenanceComments.requestId, requestId))
      .orderBy(maintenanceComments.createdAt);
  }
  
  // Service Providers
  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    const result = await db.insert(serviceProviders).values(provider).returning();
    return result[0];
  }

  async getServiceProvidersByUserId(userId: number): Promise<ServiceProvider[]> {
    return db.select()
      .from(serviceProviders)
      .where(eq(serviceProviders.userId, userId));
  }

  async getServiceProviderById(id: number): Promise<ServiceProvider | undefined> {
    const result = await db.select()
      .from(serviceProviders)
      .where(eq(serviceProviders.id, id));
    return result[0];
  }

  async updateServiceProvider(id: number, data: Partial<InsertServiceProvider>): Promise<ServiceProvider | undefined> {
    const result = await db.update(serviceProviders)
      .set(data)
      .where(eq(serviceProviders.id, id))
      .returning();
    
    return result[0];
  }

  async deleteServiceProvider(id: number): Promise<boolean> {
    const result = await db.delete(serviceProviders)
      .where(eq(serviceProviders.id, id))
      .returning();
    
    return result.length > 0;
  }

  // ===== TENANT MANAGEMENT MODULE =====

  // Tenant Portal Access
  async createTenantCredential(credential: InsertTenantCredential): Promise<TenantCredential> {
    const result = await db.insert(tenantCredentials).values({
      ...credential,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: credential.isActive ?? true
    }).returning();
    
    return result[0];
  }

  async getTenantCredentialById(id: number): Promise<TenantCredential | undefined> {
    const result = await db.select().from(tenantCredentials).where(eq(tenantCredentials.id, id));
    return result[0];
  }

  async getTenantCredentialByUsername(username: string): Promise<TenantCredential | undefined> {
    const result = await db.select().from(tenantCredentials).where(eq(tenantCredentials.username, username));
    return result[0];
  }

  async getTenantCredentialByTenantId(tenantId: number): Promise<TenantCredential | undefined> {
    const result = await db.select().from(tenantCredentials).where(eq(tenantCredentials.tenantId, tenantId));
    return result[0];
  }

  async getTenantCredentialsByUserId(userId: number): Promise<TenantCredential[]> {
    return db.select().from(tenantCredentials).where(eq(tenantCredentials.userId, userId));
  }

  async updateTenantCredential(id: number, data: Partial<InsertTenantCredential>): Promise<TenantCredential | undefined> {
    const result = await db.update(tenantCredentials)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(tenantCredentials.id, id))
      .returning();
    
    return result[0];
  }

  async deleteTenantCredential(id: number): Promise<boolean> {
    const result = await db.delete(tenantCredentials)
      .where(eq(tenantCredentials.id, id))
      .returning();
    
    return result.length > 0;
  }

  async updateTenantCredentialLastLogin(id: number): Promise<TenantCredential> {
    const result = await db.update(tenantCredentials)
      .set({
        lastLogin: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tenantCredentials.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Tenant credential not found");
    }
    
    return result[0];
  }

  // Document Repository - Shared Documents
  async createSharedDocument(document: InsertSharedDocument): Promise<SharedDocument> {
    const result = await db.insert(sharedDocuments).values({
      ...document,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: document.isPublic ?? false
    }).returning();
    
    return result[0];
  }

  async getSharedDocumentById(id: number): Promise<SharedDocument | undefined> {
    const result = await db.select().from(sharedDocuments).where(eq(sharedDocuments.id, id));
    return result[0];
  }

  async getSharedDocumentsByUserId(userId: number): Promise<SharedDocument[]> {
    return db.select().from(sharedDocuments).where(eq(sharedDocuments.userId, userId));
  }

  async getPublicDocumentsByUserId(userId: number): Promise<SharedDocument[]> {
    return db.select()
      .from(sharedDocuments)
      .where(and(
        eq(sharedDocuments.userId, userId),
        eq(sharedDocuments.isPublic, true)
      ));
  }

  async updateSharedDocument(id: number, data: Partial<InsertSharedDocument>): Promise<SharedDocument | undefined> {
    const result = await db.update(sharedDocuments)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(sharedDocuments.id, id))
      .returning();
    
    return result[0];
  }

  async deleteSharedDocument(id: number): Promise<boolean> {
    const result = await db.delete(sharedDocuments)
      .where(eq(sharedDocuments.id, id))
      .returning();
    
    return result.length > 0;
  }

  // Document Repository - Tenant Documents
  async createTenantDocument(document: InsertTenantDocument): Promise<TenantDocument> {
    const result = await db.insert(tenantDocuments).values({
      ...document,
      hasViewed: document.hasViewed ?? false,
      viewedAt: null,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getTenantDocumentById(id: number): Promise<TenantDocument | undefined> {
    const result = await db.select().from(tenantDocuments).where(eq(tenantDocuments.id, id));
    return result[0];
  }

  async getTenantDocumentsByTenantId(tenantId: number): Promise<TenantDocument[]> {
    return db.select().from(tenantDocuments).where(eq(tenantDocuments.tenantId, tenantId));
  }

  async getTenantDocumentsByDocumentId(documentId: number): Promise<TenantDocument[]> {
    return db.select().from(tenantDocuments).where(eq(tenantDocuments.documentId, documentId));
  }

  async updateTenantDocumentViewStatus(id: number, hasViewed: boolean): Promise<TenantDocument> {
    const result = await db.update(tenantDocuments)
      .set({
        hasViewed,
        viewedAt: hasViewed ? new Date() : null
      })
      .where(eq(tenantDocuments.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Tenant document not found");
    }
    
    return result[0];
  }

  async deleteTenantDocument(id: number): Promise<boolean> {
    const result = await db.delete(tenantDocuments)
      .where(eq(tenantDocuments.id, id))
      .returning();
    
    return result.length > 0;
  }

  // Tenant Rating System
  async createTenantRating(rating: InsertTenantRating): Promise<TenantRating> {
    const result = await db.insert(tenantRatings).values({
      ...rating,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getTenantRatingById(id: number): Promise<TenantRating | undefined> {
    const result = await db.select().from(tenantRatings).where(eq(tenantRatings.id, id));
    return result[0];
  }

  async getTenantRatingsByTenantId(tenantId: number): Promise<TenantRating[]> {
    return db.select().from(tenantRatings).where(eq(tenantRatings.tenantId, tenantId));
  }

  async getTenantRatingsByUserId(userId: number): Promise<TenantRating[]> {
    return db.select().from(tenantRatings).where(eq(tenantRatings.userId, userId));
  }

  async updateTenantRating(id: number, data: Partial<InsertTenantRating>): Promise<TenantRating | undefined> {
    const result = await db.update(tenantRatings)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(tenantRatings.id, id))
      .returning();
    
    return result[0];
  }

  async deleteTenantRating(id: number): Promise<boolean> {
    const result = await db.delete(tenantRatings)
      .where(eq(tenantRatings.id, id))
      .returning();
    
    return result.length > 0;
  }

  async getTenantAverageRating(tenantId: number): Promise<number> {
    const ratings = await this.getTenantRatingsByTenantId(tenantId);
    if (ratings.length === 0) return 0;
    
    const total = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    return total / ratings.length;
  }
}

export const storage = new DatabaseStorage();
