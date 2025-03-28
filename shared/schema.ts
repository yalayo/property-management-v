import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, date, doublePrecision, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  isAdmin: boolean("is_admin").default(false),
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false),
  subscriptionType: text("subscription_type"),
  subscriptionStatus: text("subscription_status"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").default("Germany"),
  units: integer("units").default(1),
  acquisitionDate: timestamp("acquisition_date"),
  purchasePrice: integer("purchase_price"),
  currentValue: integer("current_value"),
});

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  userId: integer("user_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  leaseStart: timestamp("lease_start"),
  leaseEnd: timestamp("lease_end"),
  monthlyRent: integer("monthly_rent"),
  active: boolean("active").default(true),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  amount: integer("amount").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").default("received"),
  notes: text("notes"),
});

export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  email: text("email"),
  responses: jsonb("responses").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const waitingList = pgTable("waiting_list", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const uploadedFiles = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  uploadDate: timestamp("upload_date").defaultNow(),
  processed: boolean("processed").default(false),
  extractedData: jsonb("extracted_data"),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  order: integer("order").notNull(),
  active: boolean("active").default(true),
});

// ========== ACCOUNTING MODULE TABLES ==========

// Categories for transactions (e.g., Utilities, Maintenance, Rent Income)
export const transactionCategories = pgTable("transaction_categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  color: text("color"), // For UI display
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Transactions for income and expenses
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  propertyId: integer("property_id").references(() => properties.id),
  categoryId: integer("category_id").notNull().references(() => transactionCategories.id),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
  amount: doublePrecision("amount").notNull(),
  date: date("date").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  paymentMethod: text("payment_method"), // cash, bank transfer, etc.
  reference: text("reference"), // invoice or receipt number
  notes: text("notes"),
  recurring: boolean("recurring").default(false).notNull(),
  recurringInterval: text("recurring_interval"), // monthly, quarterly, annually
  attachmentId: integer("attachment_id").references(() => uploadedFiles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Maintenance request status enum
export const maintenanceStatusEnum = pgEnum('maintenance_status', [
  'pending',
  'in_progress',
  'completed',
  'declined',
  'deferred'
]);

// Maintenance request priority enum
export const maintenancePriorityEnum = pgEnum('maintenance_priority', [
  'low', 
  'medium', 
  'high', 
  'emergency'
]);

// Maintenance requests table
export const maintenanceRequests = pgTable("maintenance_requests", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  tenantId: integer("tenant_id").references(() => tenants.id),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: maintenanceStatusEnum("status").default("pending").notNull(),
  priority: maintenancePriorityEnum("priority").default("medium").notNull(),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  scheduledDate: timestamp("scheduled_date"),
  completionDate: timestamp("completion_date"),
  estimatedCost: doublePrecision("estimated_cost"),
  actualCost: doublePrecision("actual_cost"),
  serviceProviderId: integer("service_provider_id"),
  notes: text("notes"),
  attachmentIds: integer("attachment_ids").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Maintenance comments for communication
export const maintenanceComments = pgTable("maintenance_comments", {
  id: serial("id").primaryKey(),
  maintenanceRequestId: integer("maintenance_request_id").notNull().references(() => maintenanceRequests.id),
  userId: integer("user_id").notNull().references(() => users.id),
  comment: text("comment").notNull(),
  attachmentId: integer("attachment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Service providers for maintenance
export const serviceProviders = pgTable("service_providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  specialty: text("specialty"),
  hourlyRate: doublePrecision("hourly_rate"),
  isPreferred: boolean("is_preferred").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bank accounts for users to track income/expenses
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number"),
  bankName: text("bank_name").notNull(),
  currentBalance: doublePrecision("current_balance").default(0).notNull(),
  currency: text("currency").default("EUR").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// For annual tax reporting and calculations
export const taxYears = pgTable("tax_years", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isClosed: boolean("is_closed").default(false).notNull(),
  totalIncome: doublePrecision("total_income").default(0).notNull(),
  totalExpenses: doublePrecision("total_expenses").default(0).notNull(),
  netIncome: doublePrecision("net_income").default(0).notNull(),
  taxRate: doublePrecision("tax_rate"),
  estimatedTax: doublePrecision("estimated_tax"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// For budgeting by property or category
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  propertyId: integer("property_id").references(() => properties.id),
  categoryId: integer("category_id").references(() => transactionCategories.id),
  name: text("name").notNull(),
  amount: doublePrecision("amount").notNull(),
  period: text("period").notNull(), // monthly, quarterly, annual
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas and types
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
});

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({
  id: true,
  submittedAt: true,
});

export const insertWaitingListSchema = createInsertSchema(waitingList).omit({
  id: true,
  joinedAt: true,
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  uploadDate: true,
  processed: true,
  extractedData: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
});

// Accounting module schemas
export const insertTransactionCategorySchema = createInsertSchema(transactionCategories).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({
  id: true,
  createdAt: true,
});

export const insertTaxYearSchema = createInsertSchema(taxYears).omit({
  id: true,
  createdAt: true,
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
});

// Maintenance module schemas
export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).omit({
  id: true,
  requestDate: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaintenanceCommentSchema = createInsertSchema(maintenanceComments).omit({
  id: true,
  createdAt: true,
});

export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({
  id: true,
  createdAt: true,
});

// Form validation schemas for accounting
export const transactionFormSchema = insertTransactionSchema
  .extend({
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
    date: z.coerce.date(),
    description: z.string().min(1, "Description is required"),
    type: z.enum(["income", "expense"]),
    bankAccountId: z.number().optional().nullable(),
  });

export const bankAccountFormSchema = insertBankAccountSchema
  .extend({
    accountName: z.string().min(1, "Account name is required"),
    bankName: z.string().min(1, "Bank name is required"),
    currency: z.string().min(1, "Currency is required"),
    currentBalance: z.coerce.number().default(0),
  });

// Maintenance request form validation schema
export const maintenanceRequestFormSchema = insertMaintenanceRequestSchema
  .extend({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    status: z.enum(['pending', 'in_progress', 'completed', 'declined', 'deferred']),
    priority: z.enum(['low', 'medium', 'high', 'emergency']),
    estimatedCost: z.coerce.number().optional().nullable(),
    scheduledDate: z.coerce.date().optional().nullable(),
  });

export const maintenanceCommentFormSchema = insertMaintenanceCommentSchema
  .extend({
    comment: z.string().min(1, "Comment is required"),
  });

export const serviceProviderFormSchema = insertServiceProviderSchema
  .extend({
    name: z.string().min(1, "Service provider name is required"),
    email: z.string().email("Invalid email address").optional().nullable(),
    phone: z.string().optional().nullable(),
  });

// Survey schema
export const surveyQuestionResponseSchema = z.object({
  questionId: z.number(),
  answer: z.boolean(),
});

export const surveySubmissionSchema = z.object({
  email: z.string().email().optional(),
  responses: z.array(surveyQuestionResponseSchema),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type SurveyResponse = typeof surveyResponses.$inferSelect;

export type InsertWaitingList = z.infer<typeof insertWaitingListSchema>;
export type WaitingList = typeof waitingList.$inferSelect;

export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export type SurveySubmission = z.infer<typeof surveySubmissionSchema>;
export type SurveyQuestionResponse = z.infer<typeof surveyQuestionResponseSchema>;

// Accounting Module Types
export type InsertTransactionCategory = z.infer<typeof insertTransactionCategorySchema>;
export type TransactionCategory = typeof transactionCategories.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type TransactionForm = z.infer<typeof transactionFormSchema>;

export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type BankAccountForm = z.infer<typeof bankAccountFormSchema>;

export type InsertTaxYear = z.infer<typeof insertTaxYearSchema>;
export type TaxYear = typeof taxYears.$inferSelect;

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

// Maintenance Module Types
export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type MaintenanceRequestForm = z.infer<typeof maintenanceRequestFormSchema>;

export type InsertMaintenanceComment = z.infer<typeof insertMaintenanceCommentSchema>;
export type MaintenanceComment = typeof maintenanceComments.$inferSelect;
export type MaintenanceCommentForm = z.infer<typeof maintenanceCommentFormSchema>;

export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;
export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type ServiceProviderForm = z.infer<typeof serviceProviderFormSchema>;
