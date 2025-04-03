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
import { db } from "./db-cf";

// Helper function to get the database or throw an error if not available
function getDb() {
  if (!db.current) {
    throw new Error('Database not initialized. Try again when database is ready.');
  }
  return db.current;
}
import { eq, desc, count, and, like, sql } from "drizzle-orm";
import type { IStorage } from './storage';
import session from "express-session";
import createMemoryStore from "memorystore";

// Cloudflare Workers have a different runtime environment
// We'll handle session storage differently

/**
 * CloudflareStorage implements the IStorage interface for Cloudflare Workers
 * This class uses the D1 database in Cloudflare Workers
 */
export class CloudflareStorage implements IStorage {
  public sessionStore: session.Store;
  
  constructor() {
    // Check if we're in a Cloudflare Worker environment
    // First check for the explicit flag we set in our worker entry points
    // If that's not set, fall back to the older detection method (this ensures backward compatibility)
    const isCloudflareWorker = 
      typeof globalThis.__IS_CLOUDFLARE_WORKER !== 'undefined' ||
      (typeof globalThis.__D1_DB !== 'undefined' && typeof process === 'undefined');
    
    // IMPORTANT: Always use the minimal session store in Cloudflare Workers
    // to avoid the setInterval.unref() issue which causes worker errors
    if (isCloudflareWorker) {
      // In Cloudflare Workers environment, create a minimal session store that doesn't use setInterval
      this.sessionStore = {
        all: (callback: (err: any, sessions: Record<string, any> | null) => void) => callback(null, {}),
        destroy: (sid: string, callback: (err: any) => void) => callback(null),
        clear: (callback: (err: any) => void) => callback(null),
        length: (callback: (err: any, length: number) => void) => callback(null, 0),
        get: (sid: string, callback: (err: any, session: any) => void) => callback(null, null),
        set: (sid: string, session: any, callback: (err: any) => void) => callback(null),
        touch: (sid: string, session: any, callback: (err: any) => void) => callback(null),
      } as any;
      
      console.log('Using Cloudflare Workers compatible session store (without setInterval)');
    } else {
      try {
        // In Node.js environment, patch the MemoryStore to handle the unref issue safely
        // Monkey patch the global setInterval function to handle unref safely when it doesn't exist
        const originalSetInterval = globalThis.setInterval;
        globalThis.setInterval = function(...args: any[]) {
          const intervalId = originalSetInterval(...args);
          // Add a no-op unref method if it doesn't exist
          if (typeof intervalId.unref !== 'function') {
            intervalId.unref = () => intervalId; // No-op function that returns the interval id
          }
          return intervalId;
        };
        
        // Now create the memory store which will use our patched setInterval
        const MemoryStore = createMemoryStore(session);
        this.sessionStore = new MemoryStore({
          checkPeriod: 86400000, // 1 day in milliseconds
        });
        
        // Restore the original setInterval 
        globalThis.setInterval = originalSetInterval;
        
        console.log('Using patched MemoryStore session store for Node.js environment');
      } catch (error) {
        console.error('Error creating MemoryStore, falling back to minimal store:', error);
        // Fallback to minimal store on error
        this.sessionStore = {
          all: (callback: (err: any, sessions: Record<string, any> | null) => void) => callback(null, {}),
          destroy: (sid: string, callback: (err: any) => void) => callback(null),
          clear: (callback: (err: any) => void) => callback(null),
          length: (callback: (err: any, length: number) => void) => callback(null, 0),
          get: (sid: string, callback: (err: any, session: any) => void) => callback(null, null),
          set: (sid: string, session: any, callback: (err: any) => void) => callback(null),
          touch: (sid: string, session: any, callback: (err: any) => void) => callback(null),
        } as any;
      }
    }
  }
  
  // ===== USER METHODS =====
  
  async getUser(id: number): Promise<User | undefined> {
    const database = getDb();
    const [user] = await database.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const database = getDb();
    const [user] = await database.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const database = getDb();
    const [user] = await database.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const database = getDb();
    const [newUser] = await database.insert(users).values(user).returning();
    return newUser;
  }
  
  async updateStripeCustomerId(userId: number, customerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async updateUserStripeInfo(userId: number, info: { customerId: string, subscriptionId: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: info.customerId,
        stripeSubscriptionId: info.subscriptionId
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async updateUserTier(userId: number, tier: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ tier })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async updateUserOnboardingStatus(userId: number, hasCompleted: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ onboardingCompleted: hasCompleted })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async getUserCount(): Promise<number> {
    const database = getDb();
    const [result] = await database.select({ count: count() }).from(users);
    return result.count;
  }
  
  async getSurveyResponseCount(): Promise<number> {
    const database = getDb();
    const [result] = await database.select({ count: count() }).from(surveyResponses);
    return result.count;
  }
  
  async getWaitingListCount(): Promise<number> {
    const database = getDb();
    const [result] = await database.select({ count: count() }).from(waitingList);
    return result.count;
  }
  
  // ===== SURVEY RESPONSE METHODS =====
  
  async createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse> {
    const database = getDb();
    const [surveyResponse] = await database.insert(surveyResponses).values(response).returning();
    return surveyResponse;
  }
  
  async getSurveyResponses(): Promise<SurveyResponse[]> {
    const database = getDb();
    return await database.select().from(surveyResponses);
  }
  
  async getAllSurveyResponses(): Promise<SurveyResponse[]> {
    const database = getDb();
    return await database.select().from(surveyResponses);
  }
  
  async getSurveyAnalytics(): Promise<{ questionId: number; yesCount: number; noCount: number; }[]> {
    // This is a more complex query - in D1 we might need to simplify or do post-processing
    // For now, we'll get all responses and compute analytics in memory
    const responses = await this.getSurveyResponses();
    
    // Group by questionId and count yes/no answers
    const questionStats = new Map<number, { yesCount: number; noCount: number }>();
    
    for (const response of responses) {
      if (!response.responses) continue;
      
      try {
        const parsedResponses = JSON.parse(response.responses.toString());
        for (const questionResponse of parsedResponses) {
          const questionId = questionResponse.questionId;
          const answer = questionResponse.answer;
          
          if (!questionStats.has(questionId)) {
            questionStats.set(questionId, { yesCount: 0, noCount: 0 });
          }
          
          const stats = questionStats.get(questionId)!;
          if (answer) {
            stats.yesCount++;
          } else {
            stats.noCount++;
          }
        }
      } catch (error) {
        console.error('Error parsing survey responses:', error);
      }
    }
    
    // Convert Map to array of objects
    return Array.from(questionStats.entries()).map(([questionId, stats]) => ({
      questionId,
      yesCount: stats.yesCount,
      noCount: stats.noCount
    }));
  }
  
  // ===== QUESTIONS METHODS =====
  
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const database = getDb();
    const [newQuestion] = await database.insert(questions).values(question).returning();
    return newQuestion;
  }
  
  async getAllQuestions(): Promise<Question[]> {
    const database = getDb();
    return await database.select().from(questions);
  }
  
  async getActiveQuestions(): Promise<Question[]> {
    const database = getDb();
    
    // Use the correct property name 'active' (not 'isActive')
    // Cloudflare D1 handles booleans differently than PostgreSQL
    // Use either 1 for true or direct SQL for compatibility
    return await database.select().from(questions).where(eq(questions.active, 1));
    
    // Alternative approach if numeric comparison doesn't work:
    // return await database.select().from(questions)
    //   .where(sql`${questions.active} = 1`);
  }
  
  // ===== WAITING LIST METHODS =====
  
  async addToWaitingList(entry: InsertWaitingList): Promise<WaitingList> {
    const database = getDb();
    const [waitingListEntry] = await database.insert(waitingList).values(entry).returning();
    return waitingListEntry;
  }
  
  async isEmailInWaitingList(email: string): Promise<boolean> {
    const database = getDb();
    const [entry] = await database.select().from(waitingList).where(eq(waitingList.email, email));
    return !!entry;
  }
  
  async getWaitingList(): Promise<WaitingList[]> {
    const database = getDb();
    return await database.select().from(waitingList).orderBy(desc(waitingList.joinedAt));
  }
  
  // ===== PROPERTIES METHODS =====
  
  async createProperty(property: InsertProperty): Promise<Property> {
    const database = getDb();
    const [newProperty] = await database.insert(properties).values(property).returning();
    return newProperty;
  }
  
  async getPropertyById(id: number): Promise<Property | undefined> {
    const database = getDb();
    const [property] = await database.select().from(properties).where(eq(properties.id, id));
    return property;
  }
  
  async getPropertiesByUserId(userId: number): Promise<Property[]> {
    const database = getDb();
    return await database.select().from(properties).where(eq(properties.userId, userId));
  }
  
  async updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined> {
    const [updatedProperty] = await db
      .update(properties)
      .set(property)
      .where(eq(properties.id, id))
      .returning();
    return updatedProperty;
  }
  
  // ===== TENANTS METHODS =====
  
  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const database = getDb();
    const [newTenant] = await database.insert(tenants).values(tenant).returning();
    return newTenant;
  }
  
  async getTenantById(id: number): Promise<Tenant | undefined> {
    const database = getDb();
    const [tenant] = await database.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }
  
  async getTenantsByPropertyId(propertyId: number): Promise<Tenant[]> {
    const database = getDb();
    return await database.select().from(tenants).where(eq(tenants.propertyId, propertyId));
  }
  
  async getTenantsByUserId(userId: number): Promise<Tenant[]> {
    const database = getDb();
    return await database.select().from(tenants).where(eq(tenants.userId, userId));
  }
  
  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant> {
    const [updatedTenant] = await db
      .update(tenants)
      .set(tenant)
      .where(eq(tenants.id, id))
      .returning();
    return updatedTenant;
  }
  
  // ===== PAYMENTS METHODS =====
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const database = getDb();
    const [newPayment] = await database.insert(payments).values(payment).returning();
    return newPayment;
  }
  
  async getPaymentsByTenantId(tenantId: number): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.date));
  }
  
  async getLatePayers(userId: number): Promise<{ tenant: Tenant; lastPayment: Payment | null; }[]> {
    // This is a complex query, we might need to simplify for D1
    // For now, get all tenants and their payments, then filter in memory
    const userTenants = await this.getTenantsByUserId(userId);
    
    const result = [];
    for (const tenant of userTenants) {
      const tenantPayments = await this.getPaymentsByTenantId(tenant.id);
      const lastPayment = tenantPayments.length > 0 ? tenantPayments[0] : null;
      
      // Consider a tenant late if they haven't paid this month
      // or if their last payment was marked as late
      const now = new Date();
      const isLate = !lastPayment || 
        (lastPayment.date.getMonth() !== now.getMonth() && lastPayment.date.getFullYear() !== now.getFullYear()) ||
        lastPayment.isLate;
      
      if (isLate) {
        result.push({ tenant, lastPayment });
      }
    }
    
    return result;
  }
  
  // ===== FILES METHODS =====
  
  async uploadFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const database = getDb();
    const [newFile] = await database.insert(uploadedFiles).values(file).returning();
    return newFile;
  }
  
  async getFilesByUserId(userId: number): Promise<UploadedFile[]> {
    const database = getDb();
    return await database.select().from(uploadedFiles).where(eq(uploadedFiles.userId, userId));
  }
  
  async updateFileData(fileId: number, extractedData: any): Promise<UploadedFile> {
    const extractedDataStr = typeof extractedData === 'string' 
      ? extractedData 
      : JSON.stringify(extractedData);
    
    const [updatedFile] = await db
      .update(uploadedFiles)
      .set({ extractedData: extractedDataStr })
      .where(eq(uploadedFiles.id, fileId))
      .returning();
    return updatedFile;
  }
  
  // ... Additional methods would be implemented here following the same pattern
  // to fulfill the IStorage interface. Since there are many methods, they would 
  // follow the same pattern of using db.select(), db.insert(), db.update(), etc.
  
  // ===== PAYMENT GATEWAY METHODS =====
  
  // Example implementations for a few of the required methods:
  
  async createPayPalOrder(order: InsertPaypalOrder): Promise<PaypalOrder> {
    const database = getDb();
    const [newOrder] = await database.insert(paypalOrders).values(order).returning();
    return newOrder;
  }
  
  async getPayPalOrderById(id: number): Promise<PaypalOrder | undefined> {
    const database = getDb();
    const [order] = await database.select().from(paypalOrders).where(eq(paypalOrders.id, id));
    return order;
  }
  
  async getPayPalOrdersByUserId(userId: number): Promise<PaypalOrder[]> {
    const database = getDb();
    return await database.select().from(paypalOrders).where(eq(paypalOrders.userId, userId));
  }
  
  async updatePayPalOrderStatus(id: number, status: string): Promise<PaypalOrder> {
    const [updatedOrder] = await db
      .update(paypalOrders)
      .set({ status })
      .where(eq(paypalOrders.id, id))
      .returning();
    return updatedOrder;
  }
  
  async updateUserPaymentGateway(userId: number, gateway: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ preferredPaymentGateway: gateway })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async getUserPaymentGateway(userId: number): Promise<string | null> {
    const database = getDb();
    const [user] = await database.select({ preferredGateway: users.preferredPaymentGateway }).from(users).where(eq(users.id, userId));
    return user?.preferredGateway || null;
  }
  
  // ===== TRANSACTION METHODS =====
  
  // NOTE: For the sake of brevity, we'll just implement the minimum required methods here, 
  // but in a real implementation you would need to implement all methods from the interface.
  
  async createTransactionCategory(category: InsertTransactionCategory): Promise<TransactionCategory> {
    const database = getDb();
    const [newCategory] = await database.insert(transactionCategories).values(category).returning();
    return newCategory;
  }
  
  async getTransactionCategoriesByUserId(userId: number): Promise<TransactionCategory[]> {
    const database = getDb();
    return await database.select().from(transactionCategories).where(eq(transactionCategories.userId, userId));
  }
  
  async getTransactionCategoryById(id: number): Promise<TransactionCategory | undefined> {
    const database = getDb();
    const [category] = await database.select().from(transactionCategories).where(eq(transactionCategories.id, id));
    return category;
  }
  
  async updateTransactionCategory(id: number, data: Partial<InsertTransactionCategory>): Promise<TransactionCategory | undefined> {
    const [updatedCategory] = await db
      .update(transactionCategories)
      .set(data)
      .where(eq(transactionCategories.id, id))
      .returning();
    return updatedCategory;
  }
  
  async deleteTransactionCategory(id: number): Promise<boolean> {
    const database = getDb();
    const result = await database.delete(transactionCategories).where(eq(transactionCategories.id, id));
    return !!result;
  }
  
  async createDefaultTransactionCategories(userId: number): Promise<TransactionCategory[]> {
    const defaultCategories = [
      { name: 'Rent Income', type: 'income', userId },
      { name: 'Maintenance', type: 'expense', userId },
      { name: 'Utilities', type: 'expense', userId },
      { name: 'Insurance', type: 'expense', userId },
      { name: 'Property Tax', type: 'expense', userId },
      { name: 'Mortgage', type: 'expense', userId }
    ];
    
    const createdCategories = [];
    for (const category of defaultCategories) {
      const newCategory = await this.createTransactionCategory(category);
      createdCategories.push(newCategory);
    }
    
    return createdCategories;
  }

  // ... In a complete implementation, all other methods from IStorage would be implemented here
  
  // For now, provide stub implementations for remaining required methods
  
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const database = getDb();
    const [newTransaction] = await database.insert(transactions).values(transaction).returning();
    return newTransaction;
  }
  
  async getTransactionsByUserId(userId: number, params?: { 
    startDate?: Date, 
    endDate?: Date,
    categoryId?: number,
    propertyId?: number,
    type?: 'income' | 'expense' | 'all'
  }): Promise<Transaction[]> {
    const database = getDb();
    let query = database.select().from(transactions).where(eq(transactions.userId, userId));
    
    if (params) {
      if (params.startDate) {
        query = query.where(sql`${transactions.date} >= ${params.startDate}`);
      }
      if (params.endDate) {
        query = query.where(sql`${transactions.date} <= ${params.endDate}`);
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
    
    return await query.orderBy(desc(transactions.date));
  }
  
  async getTransactionById(id: number): Promise<Transaction | undefined> {
    const database = getDb();
    const [transaction] = await database.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }
  
  async updateTransaction(id: number, data: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set(data)
      .where(eq(transactions.id, id))
      .returning();
    return updatedTransaction;
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    const database = getDb();
    const result = await database.delete(transactions).where(eq(transactions.id, id));
    return !!result;
  }
  
  // This would need a more complex implementation with aggregations
  async getTransactionSummary(userId: number, timeframe: 'month' | 'quarter' | 'year'): Promise<{
    totalIncome: number,
    totalExpenses: number,
    netIncome: number,
    incomeByCategory: {categoryId: number, categoryName: string, amount: number}[],
    expensesByCategory: {categoryId: number, categoryName: string, amount: number}[]
  }> {
    // For now, we'll implement a simplified version using client-side aggregation
    const now = new Date();
    let startDate = new Date();
    
    if (timeframe === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === 'quarter') {
      startDate.setMonth(now.getMonth() - 3);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    const transactions = await this.getTransactionsByUserId(userId, {
      startDate,
      endDate: now
    });
    
    const categories = await this.getTransactionCategoriesByUserId(userId);
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    
    let totalIncome = 0;
    let totalExpenses = 0;
    const incomeByCategory = new Map<number, number>();
    const expensesByCategory = new Map<number, number>();
    
    for (const tx of transactions) {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
        const currentAmount = incomeByCategory.get(tx.categoryId) || 0;
        incomeByCategory.set(tx.categoryId, currentAmount + tx.amount);
      } else {
        totalExpenses += tx.amount;
        const currentAmount = expensesByCategory.get(tx.categoryId) || 0;
        expensesByCategory.set(tx.categoryId, currentAmount + tx.amount);
      }
    }
    
    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      incomeByCategory: Array.from(incomeByCategory.entries()).map(([categoryId, amount]) => ({
        categoryId,
        categoryName: categoryMap.get(categoryId)?.name || 'Unknown',
        amount
      })),
      expensesByCategory: Array.from(expensesByCategory.entries()).map(([categoryId, amount]) => ({
        categoryId,
        categoryName: categoryMap.get(categoryId)?.name || 'Unknown',
        amount
      }))
    };
  }
  
  // Remaining stub method implementations to meet interface requirements
  async createBankAccount(account: InsertBankAccount): Promise<BankAccount> {
    const database = getDb();
    const [newAccount] = await database.insert(bankAccounts).values(account).returning();
    return newAccount;
  }
  
  async getBankAccountsByUserId(userId: number): Promise<BankAccount[]> {
    const database = getDb();
    return await database.select().from(bankAccounts).where(eq(bankAccounts.userId, userId));
  }
  
  async getBankAccountById(id: number): Promise<BankAccount | undefined> {
    const database = getDb();
    const [account] = await database.select().from(bankAccounts).where(eq(bankAccounts.id, id));
    return account;
  }
  
  async updateBankAccount(id: number, data: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    const [updatedAccount] = await db
      .update(bankAccounts)
      .set(data)
      .where(eq(bankAccounts.id, id))
      .returning();
    return updatedAccount;
  }
  
  async deleteBankAccount(id: number): Promise<boolean> {
    const database = getDb();
    const result = await database.delete(bankAccounts).where(eq(bankAccounts.id, id));
    return !!result;
  }
  
  async createBankStatement(statement: InsertBankStatement): Promise<BankStatement> {
    const database = getDb();
    const [newStatement] = await database.insert(bankStatements).values(statement).returning();
    return newStatement;
  }
  
  async getBankStatementsByUserId(userId: number): Promise<BankStatement[]> {
    return await db
      .select()
      .from(bankStatements)
      .innerJoin(bankAccounts, eq(bankStatements.bankAccountId, bankAccounts.id))
      .where(eq(bankAccounts.userId, userId))
      .orderBy(desc(bankStatements.statementDate));
  }
  
  async getBankStatementsByBankAccountId(bankAccountId: number): Promise<BankStatement[]> {
    return await db
      .select()
      .from(bankStatements)
      .where(eq(bankStatements.bankAccountId, bankAccountId))
      .orderBy(desc(bankStatements.statementDate));
  }
  
  async getBankStatementById(id: number): Promise<BankStatement | undefined> {
    const database = getDb();
    const [statement] = await database.select().from(bankStatements).where(eq(bankStatements.id, id));
    return statement;
  }
  
  async updateBankStatement(id: number, data: Partial<InsertBankStatement>): Promise<BankStatement | undefined> {
    const [updatedStatement] = await db
      .update(bankStatements)
      .set(data)
      .where(eq(bankStatements.id, id))
      .returning();
    return updatedStatement;
  }
  
  async processStatement(id: number, extractedData: any): Promise<BankStatement> {
    // Parse and process the extracted data, then update the statement
    let dataToStore: string;
    if (typeof extractedData === 'string') {
      dataToStore = extractedData;
    } else {
      dataToStore = JSON.stringify(extractedData);
    }
    
    const [updatedStatement] = await db
      .update(bankStatements)
      .set({
        extractedData: dataToStore,
        processed: true,
        processedDate: new Date()
      })
      .where(eq(bankStatements.id, id))
      .returning();
    
    return updatedStatement;
  }
  
  async deleteBankStatement(id: number): Promise<boolean> {
    const database = getDb();
    const result = await database.delete(bankStatements).where(eq(bankStatements.id, id));
    return !!result;
  }
  
  // Additional stub implementations for tax years, budgets, etc.
  async createTaxYear(taxYear: InsertTaxYear): Promise<TaxYear> {
    const database = getDb();
    const [newTaxYear] = await database.insert(taxYears).values(taxYear).returning();
    return newTaxYear;
  }
  
  async getTaxYearsByUserId(userId: number): Promise<TaxYear[]> {
    const database = getDb();
    return await database.select().from(taxYears).where(eq(taxYears.userId, userId));
  }
  
  async getTaxYearById(id: number): Promise<TaxYear | undefined> {
    const database = getDb();
    const [taxYear] = await database.select().from(taxYears).where(eq(taxYears.id, id));
    return taxYear;
  }
  
  async updateTaxYear(id: number, data: Partial<InsertTaxYear>): Promise<TaxYear | undefined> {
    const [updatedTaxYear] = await db
      .update(taxYears)
      .set(data)
      .where(eq(taxYears.id, id))
      .returning();
    return updatedTaxYear;
  }
  
  async closeTaxYear(id: number, data: { 
    totalIncome: number, 
    totalExpenses: number, 
    netIncome: number, 
    taxRate?: number, 
    estimatedTax?: number 
  }): Promise<TaxYear | undefined> {
    const [updatedTaxYear] = await db
      .update(taxYears)
      .set({
        ...data,
        isClosed: true,
        closedAt: new Date()
      })
      .where(eq(taxYears.id, id))
      .returning();
    return updatedTaxYear;
  }
  
  async createBudget(budget: InsertBudget): Promise<Budget> {
    const database = getDb();
    const [newBudget] = await database.insert(budgets).values(budget).returning();
    return newBudget;
  }
  
  async getBudgetsByUserId(userId: number): Promise<Budget[]> {
    const database = getDb();
    return await database.select().from(budgets).where(eq(budgets.userId, userId));
  }
  
  async getBudgetById(id: number): Promise<Budget | undefined> {
    const database = getDb();
    const [budget] = await database.select().from(budgets).where(eq(budgets.id, id));
    return budget;
  }
  
  async updateBudget(id: number, data: Partial<InsertBudget>): Promise<Budget | undefined> {
    const [updatedBudget] = await db
      .update(budgets)
      .set(data)
      .where(eq(budgets.id, id))
      .returning();
    return updatedBudget;
  }
  
  async deleteBudget(id: number): Promise<boolean> {
    const database = getDb();
    const result = await database.delete(budgets).where(eq(budgets.id, id));
    return !!result;
  }
  
  async getBudgetAnalytics(userId: number): Promise<{
    budgetId: number,
    budgetName: string,
    budgetAmount: number,
    actualAmount: number,
    variance: number,
    percentUsed: number
  }[]> {
    // Get all budgets for the user
    const userBudgets = await this.getBudgetsByUserId(userId);
    
    // Get transactions for the current budget period
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
    
    const transactions = await this.getTransactionsByUserId(userId, {
      startDate,
      endDate
    });
    
    // Calculate budget analytics
    return userBudgets.map(budget => {
      // Calculate actual amount spent/earned for this budget category
      const relevantTransactions = transactions.filter(tx => 
        tx.categoryId === budget.categoryId && tx.type === budget.type
      );
      
      const actualAmount = relevantTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const variance = budget.amount - actualAmount;
      const percentUsed = (actualAmount / budget.amount) * 100;
      
      return {
        budgetId: budget.id,
        budgetName: budget.name,
        budgetAmount: budget.amount,
        actualAmount,
        variance,
        percentUsed
      };
    });
  }
  
  // Maintenance request methods
  async createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const database = getDb();
    const [newRequest] = await database.insert(maintenanceRequests).values(request).returning();
    return newRequest;
  }
  
  async getMaintenanceRequestById(id: number): Promise<MaintenanceRequest | undefined> {
    const database = getDb();
    const [request] = await database.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, id));
    return request;
  }
  
  async getMaintenanceRequestsByUserId(userId: number, filters?: {
    status?: string,
    propertyId?: number,
    priority?: string
  }): Promise<MaintenanceRequest[]> {
    const database = getDb();
    let query = database.select().from(maintenanceRequests).where(eq(maintenanceRequests.userId, userId));
    
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
    
    return await query.orderBy(desc(maintenanceRequests.createdAt));
  }
  
  async getMaintenanceRequestsByPropertyId(propertyId: number): Promise<MaintenanceRequest[]> {
    return await db
      .select()
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.propertyId, propertyId))
      .orderBy(desc(maintenanceRequests.createdAt));
  }
  
  async updateMaintenanceRequest(id: number, data: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined> {
    const [updatedRequest] = await db
      .update(maintenanceRequests)
      .set(data)
      .where(eq(maintenanceRequests.id, id))
      .returning();
    return updatedRequest;
  }
  
  async deleteMaintenanceRequest(id: number): Promise<boolean> {
    const database = getDb();
    const result = await database.delete(maintenanceRequests).where(eq(maintenanceRequests.id, id));
    return !!result;
  }
  
  async createMaintenanceComment(comment: InsertMaintenanceComment): Promise<MaintenanceComment> {
    const database = getDb();
    const [newComment] = await database.insert(maintenanceComments).values(comment).returning();
    return newComment;
  }
  
  async getMaintenanceCommentsByRequestId(requestId: number): Promise<MaintenanceComment[]> {
    return await db
      .select()
      .from(maintenanceComments)
      .where(eq(maintenanceComments.requestId, requestId))
      .orderBy(maintenanceComments.createdAt);
  }
  
  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    const database = getDb();
    const [newProvider] = await database.insert(serviceProviders).values(provider).returning();
    return newProvider;
  }
  
  async getServiceProvidersByUserId(userId: number): Promise<ServiceProvider[]> {
    const database = getDb();
    return await database.select().from(serviceProviders).where(eq(serviceProviders.userId, userId));
  }
  
  async getServiceProviderById(id: number): Promise<ServiceProvider | undefined> {
    const database = getDb();
    const [provider] = await database.select().from(serviceProviders).where(eq(serviceProviders.id, id));
    return provider;
  }
  
  async updateServiceProvider(id: number, data: Partial<InsertServiceProvider>): Promise<ServiceProvider | undefined> {
    const [updatedProvider] = await db
      .update(serviceProviders)
      .set(data)
      .where(eq(serviceProviders.id, id))
      .returning();
    return updatedProvider;
  }
  
  async deleteServiceProvider(id: number): Promise<boolean> {
    const database = getDb();
    const result = await database.delete(serviceProviders).where(eq(serviceProviders.id, id));
    return !!result;
  }
  
  // Tenant Management Module stubs
  
  async createTenantCredential(credential: InsertTenantCredential): Promise<TenantCredential> {
    const database = getDb();
    const [newCredential] = await database.insert(tenantCredentials).values(credential).returning();
    return newCredential;
  }
  
  async getTenantCredentialById(id: number): Promise<TenantCredential | undefined> {
    const database = getDb();
    const [credential] = await database.select().from(tenantCredentials).where(eq(tenantCredentials.id, id));
    return credential;
  }
  
  async getTenantCredentialByUsername(username: string): Promise<TenantCredential | undefined> {
    const database = getDb();
    const [credential] = await database.select().from(tenantCredentials).where(eq(tenantCredentials.username, username));
    return credential;
  }
  
  async getTenantCredentialByTenantId(tenantId: number): Promise<TenantCredential | undefined> {
    const database = getDb();
    const [credential] = await database.select().from(tenantCredentials).where(eq(tenantCredentials.tenantId, tenantId));
    return credential;
  }
  
  async getTenantCredentialsByUserId(userId: number): Promise<TenantCredential[]> {
    return await db
      .select()
      .from(tenantCredentials)
      .innerJoin(tenants, eq(tenantCredentials.tenantId, tenants.id))
      .where(eq(tenants.userId, userId));
  }
  
  async updateTenantCredential(id: number, data: Partial<InsertTenantCredential>): Promise<TenantCredential | undefined> {
    const [updatedCredential] = await db
      .update(tenantCredentials)
      .set(data)
      .where(eq(tenantCredentials.id, id))
      .returning();
    return updatedCredential;
  }
  
  async deleteTenantCredential(id: number): Promise<boolean> {
    const database = getDb();
    const result = await database.delete(tenantCredentials).where(eq(tenantCredentials.id, id));
    return !!result;
  }
  
  async updateTenantCredentialLastLogin(id: number): Promise<TenantCredential> {
    const [updatedCredential] = await db
      .update(tenantCredentials)
      .set({ lastLogin: new Date() })
      .where(eq(tenantCredentials.id, id))
      .returning();
    return updatedCredential;
  }
  
  async createSharedDocument(document: InsertSharedDocument): Promise<SharedDocument> {
    const database = getDb();
    const [newDocument] = await database.insert(sharedDocuments).values(document).returning();
    return newDocument;
  }
  
  async getSharedDocumentById(id: number): Promise<SharedDocument | undefined> {
    const database = getDb();
    const [document] = await database.select().from(sharedDocuments).where(eq(sharedDocuments.id, id));
    return document;
  }
  
  async getSharedDocumentsByUserId(userId: number): Promise<SharedDocument[]> {
    const database = getDb();
    return await database.select().from(sharedDocuments).where(eq(sharedDocuments.userId, userId));
  }
  
  async getPublicDocumentsByUserId(userId: number): Promise<SharedDocument[]> {
    return await db
      .select()
      .from(sharedDocuments)
      .where(and(
        eq(sharedDocuments.userId, userId),
        eq(sharedDocuments.isPublic, true)
      ));
  }
  
  async updateSharedDocument(id: number, data: Partial<InsertSharedDocument>): Promise<SharedDocument | undefined> {
    const [updatedDocument] = await db
      .update(sharedDocuments)
      .set(data)
      .where(eq(sharedDocuments.id, id))
      .returning();
    return updatedDocument;
  }
  
  async deleteSharedDocument(id: number): Promise<boolean> {
    const database = getDb();
    const result = await database.delete(sharedDocuments).where(eq(sharedDocuments.id, id));
    return !!result;
  }
  
  async createTenantDocument(document: InsertTenantDocument): Promise<TenantDocument> {
    const database = getDb();
    const [newDocument] = await database.insert(tenantDocuments).values(document).returning();
    return newDocument;
  }
  
  async getTenantDocumentById(id: number): Promise<TenantDocument | undefined> {
    const database = getDb();
    const [document] = await database.select().from(tenantDocuments).where(eq(tenantDocuments.id, id));
    return document;
  }
  
  async getTenantDocumentsByTenantId(tenantId: number): Promise<TenantDocument[]> {
    const database = getDb();
    return await database.select().from(tenantDocuments).where(eq(tenantDocuments.tenantId, tenantId));
  }
  
  async getTenantDocumentsByDocumentId(documentId: number): Promise<TenantDocument[]> {
    const database = getDb();
    return await database.select().from(tenantDocuments).where(eq(tenantDocuments.documentId, documentId));
  }
  
  async updateTenantDocumentViewStatus(id: number, hasViewed: boolean): Promise<TenantDocument> {
    const [updatedDocument] = await db
      .update(tenantDocuments)
      .set({ 
        hasViewed,
        viewedAt: hasViewed ? new Date() : undefined
      })
      .where(eq(tenantDocuments.id, id))
      .returning();
    return updatedDocument;
  }
  
  async deleteTenantDocument(id: number): Promise<boolean> {
    const database = getDb();
    const result = await database.delete(tenantDocuments).where(eq(tenantDocuments.id, id));
    return !!result;
  }
  
  async createTenantRating(rating: InsertTenantRating): Promise<TenantRating> {
    const database = getDb();
    const [newRating] = await database.insert(tenantRatings).values(rating).returning();
    return newRating;
  }
  
  async getTenantRatingById(id: number): Promise<TenantRating | undefined> {
    const database = getDb();
    const [rating] = await database.select().from(tenantRatings).where(eq(tenantRatings.id, id));
    return rating;
  }
  
  async getTenantRatingsByTenantId(tenantId: number): Promise<TenantRating[]> {
    const database = getDb();
    return await database.select().from(tenantRatings).where(eq(tenantRatings.tenantId, tenantId));
  }
  
  async getTenantRatingsByUserId(userId: number): Promise<TenantRating[]> {
    return await db
      .select()
      .from(tenantRatings)
      .innerJoin(tenants, eq(tenantRatings.tenantId, tenants.id))
      .where(eq(tenants.userId, userId));
  }
  
  async updateTenantRating(id: number, data: Partial<InsertTenantRating>): Promise<TenantRating | undefined> {
    const [updatedRating] = await db
      .update(tenantRatings)
      .set(data)
      .where(eq(tenantRatings.id, id))
      .returning();
    return updatedRating;
  }
  
  async deleteTenantRating(id: number): Promise<boolean> {
    const database = getDb();
    const result = await database.delete(tenantRatings).where(eq(tenantRatings.id, id));
    return !!result;
  }
  
  async getTenantAverageRating(tenantId: number): Promise<number> {
    const ratings = await this.getTenantRatingsByTenantId(tenantId);
    if (ratings.length === 0) return 0;
    
    const sum = ratings.reduce((total, rating) => total + rating.rating, 0);
    return sum / ratings.length;
  }
}