import { 
  users, type User, type InsertUser, 
  properties, type Property, type InsertProperty,
  tenants, type Tenant, type InsertTenant,
  payments, type Payment, type InsertPayment,
  surveyResponses, type SurveyResponse, type InsertSurveyResponse,
  waitingList, type WaitingList, type InsertWaitingList,
  uploadedFiles, type UploadedFile, type InsertUploadedFile,
  questions, type Question, type InsertQuestion
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateStripeCustomerId(userId: number, customerId: string): Promise<User>;
  updateUserStripeInfo(userId: number, info: { customerId: string, subscriptionId: string }): Promise<User>;
  updateUserOnboardingStatus(userId: number, hasCompleted: boolean): Promise<User>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private properties: Map<number, Property>;
  private tenants: Map<number, Tenant>;
  private payments: Map<number, Payment>;
  private surveyResponses: Map<number, SurveyResponse>;
  private waitingListEntries: Map<number, WaitingList>;
  private files: Map<number, UploadedFile>;
  private questionsList: Map<number, Question>;
  
  private currentUserId: number;
  private currentPropertyId: number;
  private currentTenantId: number;
  private currentPaymentId: number;
  private currentSurveyResponseId: number;
  private currentWaitingListId: number;
  private currentFileId: number;
  private currentQuestionId: number;
  
  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.tenants = new Map();
    this.payments = new Map();
    this.surveyResponses = new Map();
    this.waitingListEntries = new Map();
    this.files = new Map();
    this.questionsList = new Map();
    
    this.currentUserId = 1;
    this.currentPropertyId = 1;
    this.currentTenantId = 1;
    this.currentPaymentId = 1;
    this.currentSurveyResponseId = 1;
    this.currentWaitingListId = 1;
    this.currentFileId = 1;
    this.currentQuestionId = 1;
    
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
      isAdmin: false, 
      hasCompletedOnboarding: false,
      subscriptionType: null, 
      subscriptionStatus: null, 
      stripeCustomerId: null, 
      stripeSubscriptionId: null,
      fullName: insertUser.fullName || null
    };
    this.users.set(id, user);
    return user;
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
      subscriptionStatus: 'active'
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserOnboardingStatus(userId: number, hasCompleted: boolean): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { 
      ...user, 
      hasCompletedOnboarding: hasCompleted 
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
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with some default questions data
    this.initializeDefaultData();
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
      isAdmin: false,
      hasCompletedOnboarding: false,
      subscriptionType: null,
      subscriptionStatus: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null
    }).returning();
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
        subscriptionType: 'monthly',
        subscriptionStatus: 'active'
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
        hasCompletedOnboarding: hasCompleted
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
}

export const storage = new DatabaseStorage();
