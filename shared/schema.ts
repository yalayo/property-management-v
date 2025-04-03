import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, date, doublePrecision, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  passwordSalt: text("password_salt"), // Store the salt separately for flexibility
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  isAdmin: boolean("is_admin").default(false),
  isActive: boolean("is_active").default(true),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  passwordChangeRequired: boolean("password_change_required").default(false), // Indicates if user must change password
  lastLogin: timestamp("last_login"), // Track last login timestamp
  tier: text("tier"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  preferredPaymentGateway: text("preferred_payment_gateway"), // Can be 'stripe' or 'paypal'
  isCrowdfundingContributor: boolean("is_crowdfunding_contributor").default(false), // For the €370 lifetime contribution
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const employmentStatusEnum = pgEnum('employment_status', [
  'employed',
  'self-employed',
  'student',
  'unemployed',
  'retired'
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'bank_transfer',
  'direct_debit',
  'standing_order',
  'other'
]);

export const leaseDurationEnum = pgEnum('lease_duration', [
  'month_to_month',
  '6_months',
  '1_year',
  '2_years',
  'other'
]);

export const petPolicyEnum = pgEnum('pet_policy', [
  'no_pets',
  'cats_only',
  'small_dogs',
  'all_pets',
  'case_by_case'
]);

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id"), // Optional, can be assigned later
  userId: integer("user_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  dateOfBirth: date("date_of_birth"),
  idNumber: text("id_number"),
  
  // Employment Information
  employmentStatus: employmentStatusEnum("employment_status").default('employed'),
  employerName: text("employer_name"),
  employerPhone: text("employer_phone"),
  occupation: text("occupation"),
  monthlyIncome: integer("monthly_income"),
  employmentDuration: text("employment_duration"),
  
  // References
  reference1Name: text("reference1_name"),
  reference1Relationship: text("reference1_relationship"),
  reference1Phone: text("reference1_phone"),
  reference1Email: text("reference1_email"),
  reference2Name: text("reference2_name"),
  reference2Relationship: text("reference2_relationship"),
  reference2Phone: text("reference2_phone"),
  reference2Email: text("reference2_email"),
  
  // Banking Information
  accountHolder: text("account_holder"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  iban: text("iban"),
  bic: text("bic"),
  paymentMethod: paymentMethodEnum("payment_method").default('bank_transfer'),
  
  // Lease Information
  moveInDate: date("move_in_date"),
  leaseStartDate: date("lease_start_date"),
  leaseEndDate: date("lease_end_date"),
  leaseDuration: leaseDurationEnum("lease_duration").default('1_year'),
  customDuration: text("custom_duration"),
  rentAmount: integer("rent_amount"),
  depositAmount: integer("deposit_amount"),
  petPolicy: petPolicyEnum("pet_policy").default('case_by_case'),
  hasPets: boolean("has_pets").default(false),
  petDetails: text("pet_details"),
  
  // Agreement
  agreeToTerms: boolean("agree_to_terms").default(false),
  agreeToRules: boolean("agree_to_rules").default(false),
  agreeToPrivacyPolicy: boolean("agree_to_privacy_policy").default(false),
  signature: text("signature"),
  
  // Status
  onboardingCompleted: boolean("onboarding_completed").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'received',
  'late',
  'overdue',
  'partially_paid',
  'waived'
]);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  propertyId: integer("property_id").references(() => properties.id),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: doublePrecision("amount").notNull(),
  dueDate: date("due_date").notNull(),
  periodStartDate: date("period_start_date"),
  periodEndDate: date("period_end_date"),
  datePaid: timestamp("date_paid"),
  status: paymentStatusEnum("status").default("pending"),
  paymentMethod: paymentMethodEnum("payment_method"),
  transactionId: integer("transaction_id").references(() => transactions.id),
  remindersSent: integer("reminders_sent").default(0),
  lastReminderDate: timestamp("last_reminder_date"),
  attachmentId: integer("attachment_id").references(() => uploadedFiles.id),
  isRecurring: boolean("is_recurring").default(false),
  paymentCategory: text("payment_category").default("rent"), // rent, utility, other
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  fileType: text("file_type").notNull(), // 'bank_statement', 'invoice', 'receipt', etc.
  fileCategory: text("file_category"), // 'financial', 'property', 'tenant', etc.
  uploadDate: timestamp("upload_date").defaultNow(),
  processed: boolean("processed").default(false),
  extractedData: jsonb("extracted_data"),
  processingStatus: text("processing_status"), // 'pending', 'processing', 'completed', 'failed'
  processingError: text("processing_error"),
});

// Transaction status enum for bank transactions
export const transactionStatusEnum = pgEnum('transaction_status', [
  'unprocessed',  // Not yet processed
  'processed',    // Processed but not matched
  'matched',      // Matched to a tenant or category
  'ignored',      // Flagged to be ignored
  'needs_review'  // Needs manual review
]);

// Bank statement transactions table - for individual transactions in bank statements
export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  bankStatementId: integer("bank_statement_id").notNull().references(() => bankStatements.id),
  userId: integer("user_id").notNull().references(() => users.id),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
  transactionDate: date("transaction_date").notNull(),
  valueDate: date("value_date"),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  isDeposit: boolean("is_deposit").notNull(),
  balance: doublePrecision("balance"),
  reference: text("reference"),
  counterparty: text("counterparty"),
  counterpartyIban: text("counterparty_iban"),
  status: transactionStatusEnum("status").default("unprocessed"),
  categoryId: integer("category_id").references(() => transactionCategories.id),
  tenantId: integer("tenant_id").references(() => tenants.id),
  paymentId: integer("payment_id").references(() => payments.id),
  propertyId: integer("property_id").references(() => properties.id),
  reconciled: boolean("reconciled").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bank statements table
export const bankStatements = pgTable("bank_statements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
  fileId: integer("file_id").notNull().references(() => uploadedFiles.id),
  statementDate: date("statement_date").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  startingBalance: doublePrecision("starting_balance").notNull(),
  endingBalance: doublePrecision("ending_balance").notNull(),
  currency: text("currency").default("EUR").notNull(),
  transactionCount: integer("transaction_count"),
  totalDeposits: doublePrecision("total_deposits").default(0),
  totalWithdrawals: doublePrecision("total_withdrawals").default(0),
  processed: boolean("processed").default(false),
  reconciled: boolean("reconciled").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// Payment reminder types
export const reminderTypeEnum = pgEnum('reminder_type', [
  'upcoming',  // Reminder before payment is due
  'due',       // Reminder on due date
  'overdue',   // Reminder after payment is overdueer after due date
  'final',     // Final notice
  'custom'     // Custom reminder
]);

// Reminder status types
export const reminderStatusEnum = pgEnum('reminder_status', [
  'pending',   // Not yet sent
  'sent',      // Successfully sent
  'failed',    // Failed to send
  'cancelled'  // Cancelled
]);

// Table for storing payment reminders to tenants
export const paymentReminders = pgTable("payment_reminders", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull().references(() => payments.id),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  userId: integer("user_id").notNull().references(() => users.id),
  reminderType: reminderTypeEnum("reminder_type").notNull(),
  reminderStatus: reminderStatusEnum("reminder_status").default("pending"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  sentDate: timestamp("sent_date"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  deliveryChannel: text("delivery_channel").default("email"), // 'email', 'sms', 'whatsapp', etc.
  emailAddress: text("email_address"),
  phoneNumber: text("phone_number"),
  responseReceived: boolean("response_received").default(false),
  responseDate: timestamp("response_date"),
  responseMessage: text("response_message"),
  notificationId: text("notification_id"), // ID from notification service if applicable
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// PayPal orders for the round-robin payment gateway implementation
export const paypalOrders = pgTable("paypal_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  orderId: text("order_id").notNull().unique(),
  amount: doublePrecision("amount").notNull(),
  status: text("status").notNull(), // CREATED, APPROVED, COMPLETED, CANCELLED
  metadata: text("metadata"), // JSON stringified additional information
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tenant portal credentials to allow tenants to login to their portal
export const tenantCredentials = pgTable("tenant_credentials", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  expiryDate: timestamp("expiry_date"), // Optional expiry date for temporary access
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Shared documents between landlords and tenants
export const sharedDocuments = pgTable("shared_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // Landlord who shared the document
  fileId: integer("file_id").notNull().references(() => uploadedFiles.id),
  documentName: text("document_name").notNull(),
  documentType: text("document_type").notNull(), // "lease", "rules", "notice", "receipt", etc.
  description: text("description"),
  isPublic: boolean("is_public").default(false), // If true, visible to all tenants of this landlord
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Links documents to specific tenants
export const tenantDocuments = pgTable("tenant_documents", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => sharedDocuments.id),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  hasViewed: boolean("has_viewed").default(false),
  lastViewed: timestamp("last_viewed"),
  expiryDate: timestamp("expiry_date"), // Optional, for time-limited document access
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tenant ratings given by landlords to track tenant reliability
export const tenantRatings = pgTable("tenant_ratings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  userId: integer("user_id").notNull().references(() => users.id), // Landlord who created rating
  paymentRating: integer("payment_rating").notNull(), // 1-5 scale
  propertyRating: integer("property_rating").notNull(), // 1-5 scale
  communicationRating: integer("communication_rating").notNull(), // 1-5 scale
  overallRating: integer("overall_rating").notNull(), // 1-5 scale
  notes: text("notes"),
  ratingDate: timestamp("rating_date").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas and types
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
  processingStatus: true,
  processingError: true,
});

export const insertBankStatementSchema = createInsertSchema(bankStatements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processed: true,
  reconciled: true,
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

export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentReminderSchema = createInsertSchema(paymentReminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentDate: true,
  responseReceived: true,
  responseDate: true,
  responseMessage: true,
});

export const paymentReminderFormSchema = insertPaymentReminderSchema
  .extend({
    scheduledDate: z.coerce.date(),
    paymentId: z.number(),
    tenantId: z.number(),
    reminderType: z.enum(['upcoming', 'due', 'overdue', 'final', 'custom']),
    subject: z.string().min(1, "Subject is required"),
    message: z.string().min(1, "Message is required"),
    deliveryChannel: z.string().default("email"),
    emailAddress: z.string().email("Valid email address is required").optional().nullable(),
    phoneNumber: z.string().optional().nullable(),
  });

export const insertPaypalOrderSchema = createInsertSchema(paypalOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

// Insert schemas for tenant portal access and document sharing
export const insertTenantCredentialSchema = createInsertSchema(tenantCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertSharedDocumentSchema = createInsertSchema(sharedDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantDocumentSchema = createInsertSchema(tenantDocuments).omit({
  id: true,
  createdAt: true,
  hasViewed: true,
  lastViewed: true,
});

export const insertTenantRatingSchema = createInsertSchema(tenantRatings).omit({
  id: true,
  ratingDate: true,
  updatedAt: true,
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

export const bankStatementFormSchema = insertBankStatementSchema
  .extend({
    statementDate: z.coerce.date(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    startingBalance: z.coerce.number(),
    endingBalance: z.coerce.number(),
    currency: z.string().min(1, "Currency is required").default("EUR"),
    bankAccountId: z.number().optional().nullable(),
  });

export const bankTransactionFormSchema = insertBankTransactionSchema
  .extend({
    transactionDate: z.coerce.date(),
    valueDate: z.coerce.date().optional().nullable(),
    description: z.string().min(1, "Description is required"),
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
    isDeposit: z.boolean(),
    balance: z.coerce.number().optional().nullable(),
    status: z.enum(['unprocessed', 'processed', 'matched', 'ignored', 'needs_review']).default('unprocessed'),
    bankAccountId: z.number().optional().nullable(),
    tenantId: z.number().optional().nullable(),
    categoryId: z.number().optional().nullable(),
    propertyId: z.number().optional().nullable(),
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

// Tenant Application status enum
export const applicationStatusEnum = pgEnum('application_status', [
  'submitted',
  'reviewing',
  'approved',
  'declined',
  'pending_verification',
  'incomplete'
]);

// Tenant applications table
export const tenantApplications = pgTable("tenant_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  propertyId: integer("property_id").references(() => properties.id),
  applicationData: jsonb("application_data").notNull(),
  status: applicationStatusEnum("status").default("submitted").notNull(),
  submissionDate: timestamp("submission_date").defaultNow().notNull(),
  reviewDate: timestamp("review_date"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  notes: text("notes"),
  backgroundCheckStatus: text("background_check_status"),
  creditCheckStatus: text("credit_check_status"),
  approvalDate: timestamp("approval_date"),
  moveInDate: date("move_in_date"),
  tenantId: integer("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tenant Application Document Types
export const applicationDocumentTypes = pgEnum('application_document_type', [
  'id_document',
  'proof_of_income',
  'credit_report',
  'bank_statement',
  'reference_letter',
  'employment_verification',
  'other'
]);

// Tenant application documents
export const tenantApplicationDocuments = pgTable("tenant_application_documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => tenantApplications.id),
  fileId: integer("file_id").notNull().references(() => uploadedFiles.id),
  documentType: applicationDocumentTypes("document_type").notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  verified: boolean("verified").default(false),
  verificationDate: timestamp("verification_date"),
  verifiedBy: integer("verified_by").references(() => users.id),
  notes: text("notes"),
});

// Tenant application insert schemas
export const insertTenantApplicationSchema = createInsertSchema(tenantApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submissionDate: true,
  reviewDate: true,
  approvalDate: true,
});

export const insertTenantApplicationDocumentSchema = createInsertSchema(tenantApplicationDocuments).omit({
  id: true,
  uploadDate: true,
  verificationDate: true,
});

// Tenant Onboarding schema
export const tenantOnboardingSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(2, { message: 'First name is required' }),
    lastName: z.string().min(2, { message: 'Last name is required' }),
    email: z.string().email({ message: 'Invalid email address' }),
    phone: z.string().min(8, { message: 'Valid phone number is required' }),
    dateOfBirth: z.date().optional(),
    idNumber: z.string().optional(),
  }),
  employmentInfo: z.object({
    employmentStatus: z.enum(['employed', 'self-employed', 'student', 'unemployed', 'retired']),
    employerName: z.string().optional(),
    employerPhone: z.string().optional(),
    occupation: z.string().optional(),
    monthlyIncome: z.string().optional(),
    employmentDuration: z.string().optional(),
  }),
  references: z.object({
    reference1Name: z.string().min(2, { message: 'Reference name is required' }),
    reference1Relationship: z.string().min(2, { message: 'Relationship is required' }),
    reference1Phone: z.string().min(8, { message: 'Valid phone number is required' }),
    reference1Email: z.string().email({ message: 'Invalid email address' }).optional(),
    reference2Name: z.string().optional(),
    reference2Relationship: z.string().optional(),
    reference2Phone: z.string().optional(),
    reference2Email: z.string().email({ message: 'Invalid email address' }).optional(),
  }),
  bankingInfo: z.object({
    accountHolder: z.string().min(2, { message: 'Account holder name is required' }),
    bankName: z.string().min(2, { message: 'Bank name is required' }),
    accountNumber: z.string().min(5, { message: 'Account number is required' }),
    iban: z.string().optional(),
    bic: z.string().optional(),
    paymentMethod: z.enum(['bank_transfer', 'direct_debit', 'standing_order', 'other']),
  }),
  leaseInfo: z.object({
    moveInDate: z.date({ required_error: 'Move-in date is required' }),
    leaseStartDate: z.date({ required_error: 'Lease start date is required' }),
    leaseDuration: z.enum(['month_to_month', '6_months', '1_year', '2_years', 'other']),
    customDuration: z.string().optional(),
    rentAmount: z.string().min(1, { message: 'Rent amount is required' }),
    depositAmount: z.string().min(1, { message: 'Deposit amount is required' }),
    petPolicy: z.enum(['no_pets', 'cats_only', 'small_dogs', 'all_pets', 'case_by_case']),
    hasPets: z.boolean().default(false),
    petDetails: z.string().optional(),
  }),
  agreement: z.object({
    agreeToTerms: z.boolean().refine(val => val === true, { message: 'You must agree to the terms' }),
    agreeToRules: z.boolean().refine(val => val === true, { message: 'You must agree to the house rules' }),
    agreeToPrivacyPolicy: z.boolean().refine(val => val === true, { message: 'You must agree to the privacy policy' }),
    signature: z.string().min(2, { message: 'Signature is required' }),
  }),
  propertyId: z.number().optional().nullable(),
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

export type InsertBankStatement = z.infer<typeof insertBankStatementSchema>;
export type BankStatement = typeof bankStatements.$inferSelect;

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export type SurveySubmission = z.infer<typeof surveySubmissionSchema>;
export type SurveyQuestionResponse = z.infer<typeof surveyQuestionResponseSchema>;
export type TenantOnboarding = z.infer<typeof tenantOnboardingSchema>;

// Accounting Module Types
export type InsertTransactionCategory = z.infer<typeof insertTransactionCategorySchema>;
export type TransactionCategory = typeof transactionCategories.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type TransactionForm = z.infer<typeof transactionFormSchema>;

export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type BankAccountForm = z.infer<typeof bankAccountFormSchema>;

export type BankStatementForm = z.infer<typeof bankStatementFormSchema>;

export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type BankTransactionForm = z.infer<typeof bankTransactionFormSchema>;

export type InsertPaymentReminder = z.infer<typeof insertPaymentReminderSchema>;
export type PaymentReminder = typeof paymentReminders.$inferSelect;
export type PaymentReminderForm = z.infer<typeof paymentReminderFormSchema>;

export type InsertTaxYear = z.infer<typeof insertTaxYearSchema>;
export type TaxYear = typeof taxYears.$inferSelect;

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

export type InsertPaypalOrder = z.infer<typeof insertPaypalOrderSchema>;
export type PaypalOrder = typeof paypalOrders.$inferSelect;

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

// Tenant Portal Access Types
export type InsertTenantCredential = z.infer<typeof insertTenantCredentialSchema>;
export type TenantCredential = typeof tenantCredentials.$inferSelect;

// Document Sharing Types
export type InsertSharedDocument = z.infer<typeof insertSharedDocumentSchema>;
export type SharedDocument = typeof sharedDocuments.$inferSelect;

export type InsertTenantDocument = z.infer<typeof insertTenantDocumentSchema>;
export type TenantDocument = typeof tenantDocuments.$inferSelect;

// Tenant Rating Types
export type InsertTenantRating = z.infer<typeof insertTenantRatingSchema>;
export type TenantRating = typeof tenantRatings.$inferSelect;

// Tenant Application Types
export type InsertTenantApplication = z.infer<typeof insertTenantApplicationSchema>;
export type TenantApplication = typeof tenantApplications.$inferSelect;

export type InsertTenantApplicationDocument = z.infer<typeof insertTenantApplicationDocumentSchema>;
export type TenantApplicationDocument = typeof tenantApplicationDocuments.$inferSelect;
