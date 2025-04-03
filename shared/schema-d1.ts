import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Use SQL literal for SQLite timestamp that works with Drizzle
const currentTimestamp = sql`CURRENT_TIMESTAMP`;

// SQLite doesn't have native enum types, so we'll use text with constraints
// We'll define the allowed values as arrays to reference in our code
export const EMPLOYMENT_STATUS = ['employed', 'self-employed', 'student', 'unemployed', 'retired'] as const;
export const PAYMENT_METHOD = ['bank_transfer', 'direct_debit', 'standing_order', 'other'] as const;
export const LEASE_DURATION = ['month_to_month', '6_months', '1_year', '2_years', 'other'] as const;
export const PET_POLICY = ['no_pets', 'cats_only', 'small_dogs', 'all_pets', 'case_by_case'] as const;
export const PAYMENT_STATUS = ['pending', 'received', 'late', 'overdue', 'partially_paid', 'waived'] as const;
export const TRANSACTION_STATUS = ['unprocessed', 'processed', 'matched', 'ignored', 'needs_review'] as const;
export const MAINTENANCE_STATUS = ['pending', 'in_progress', 'completed', 'declined', 'deferred'] as const;
export const MAINTENANCE_PRIORITY = ['low', 'medium', 'high', 'emergency'] as const;
export const REMINDER_TYPE = ['upcoming', 'due', 'overdue', 'final_notice'] as const;

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  passwordSalt: text("password_salt"), // Store the salt separately for flexibility
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  isAdmin: integer("is_admin", { mode: "boolean" }).default(sql`0`),
  isActive: integer("is_active", { mode: "boolean" }).default(sql`1`),
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).default(sql`0`),
  passwordChangeRequired: integer("password_change_required", { mode: "boolean" }).default(sql`0`), // Indicates if user must change password
  lastLogin: integer("last_login"), // SQLite timestamp as INTEGER
  tier: text("tier"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  preferredPaymentGateway: text("preferred_payment_gateway"),
  isCrowdfundingContributor: integer("is_crowdfunding_contributor", { mode: "boolean" }).default(sql`0`),
  createdAt: text("created_at").default(currentTimestamp),
  updatedAt: text("updated_at").default(currentTimestamp),
});

export const properties = sqliteTable("properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").default("Germany"),
  units: integer("units").default(1),
  acquisitionDate: text("acquisition_date"),
  purchasePrice: integer("purchase_price"),
  currentValue: integer("current_value"),
});

export const tenants = sqliteTable("tenants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id"),
  userId: integer("user_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  dateOfBirth: text("date_of_birth"),
  idNumber: text("id_number"),
  
  // Employment Information
  employmentStatus: text("employment_status").default('employed'),
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
  paymentMethod: text("payment_method").default('bank_transfer'),
  
  // Lease Information
  moveInDate: text("move_in_date"),
  leaseStartDate: text("lease_start_date"),
  leaseEndDate: text("lease_end_date"),
  leaseDuration: text("lease_duration").default('1_year'),
  customDuration: text("custom_duration"),
  rentAmount: integer("rent_amount"),
  depositAmount: integer("deposit_amount"),
  petPolicy: text("pet_policy").default('case_by_case'),
  hasPets: integer("has_pets", { mode: "boolean" }).default(sql`0`),
  petDetails: text("pet_details"),
  
  // Agreement
  agreeToTerms: integer("agree_to_terms", { mode: "boolean" }).default(sql`0`),
  agreeToRules: integer("agree_to_rules", { mode: "boolean" }).default(sql`0`),
  agreeToPrivacyPolicy: integer("agree_to_privacy_policy", { mode: "boolean" }).default(sql`0`),
  signature: text("signature"),
  
  // Status
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).default(sql`0`),
  active: integer("active", { mode: "boolean" }).default(sql`1`),
  createdAt: text("created_at").default(currentTimestamp),
  updatedAt: text("updated_at").default(currentTimestamp),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull(),
  propertyId: integer("property_id"),
  userId: integer("user_id").notNull(),
  amount: real("amount").notNull(),
  dueDate: text("due_date").notNull(),
  periodStartDate: text("period_start_date"),
  periodEndDate: text("period_end_date"),
  datePaid: text("date_paid"),
  status: text("status").default("pending"),
  paymentMethod: text("payment_method"),
  transactionId: integer("transaction_id"),
  remindersSent: integer("reminders_sent").default(0),
  lastReminderDate: text("last_reminder_date"),
  attachmentId: integer("attachment_id"),
  isRecurring: integer("is_recurring", { mode: "boolean" }).default(sql`0`),
  paymentCategory: text("payment_category").default("rent"),
  notes: text("notes"),
  createdAt: text("created_at").default(currentTimestamp),
  updatedAt: text("updated_at").default(currentTimestamp),
});

export const surveyResponses = sqliteTable("survey_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email"),
  responses: text("responses").notNull(), // JSON stored as text
  submittedAt: text("submitted_at").default(currentTimestamp),
});

export const waitingList = sqliteTable("waiting_list", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  joinedAt: text("joined_at").default(currentTimestamp),
});

export const uploadedFiles = sqliteTable("uploaded_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  fileCategory: text("file_category"),
  uploadDate: text("upload_date").default(currentTimestamp),
  processed: integer("processed", { mode: "boolean" }).default(sql`0`),
  extractedData: text("extracted_data"), // JSON stored as text
  processingStatus: text("processing_status"),
  processingError: text("processing_error"),
});

export const bankTransactions = sqliteTable("bank_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bankStatementId: integer("bank_statement_id").notNull(),
  userId: integer("user_id").notNull(),
  bankAccountId: integer("bank_account_id"),
  transactionDate: text("transaction_date").notNull(),
  valueDate: text("value_date"),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  isDeposit: integer("is_deposit", { mode: "boolean" }).notNull(),
  balance: real("balance"),
  reference: text("reference"),
  counterparty: text("counterparty"),
  counterpartyIban: text("counterparty_iban"),
  status: text("status").default("unprocessed"),
  categoryId: integer("category_id"),
  tenantId: integer("tenant_id"),
  paymentId: integer("payment_id"),
  propertyId: integer("property_id"),
  reconciled: integer("reconciled", { mode: "boolean" }).default(sql`0`),
  notes: text("notes"),
  createdAt: text("created_at").default(currentTimestamp).notNull(),
});

export const bankStatements = sqliteTable("bank_statements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  bankAccountId: integer("bank_account_id"),
  fileId: integer("file_id").notNull(),
  statementDate: text("statement_date").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  startingBalance: real("starting_balance").notNull(),
  endingBalance: real("ending_balance").notNull(),
  currency: text("currency").default("EUR").notNull(),
  transactionCount: integer("transaction_count"),
  totalDeposits: real("total_deposits").default(0),
  totalWithdrawals: real("total_withdrawals").default(0),
  processed: integer("processed", { mode: "boolean" }).default(sql`0`),
  reconciled: integer("reconciled", { mode: "boolean" }).default(sql`0`),
  notes: text("notes"),
  createdAt: text("created_at").default(currentTimestamp).notNull(),
  updatedAt: text("updated_at").default(currentTimestamp).notNull(),
});

export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  text: text("text").notNull(),
  order: integer("order").notNull(),
  active: integer("active", { mode: "boolean" }).default(sql`1`),
});

// ========== ACCOUNTING MODULE TABLES ==========

export const transactionCategories = sqliteTable("transaction_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  color: text("color"),
  isDefault: integer("is_default", { mode: "boolean" }).default(sql`0`).notNull(),
  createdAt: text("created_at").default(currentTimestamp).notNull(),
});

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  propertyId: integer("property_id"),
  categoryId: integer("category_id").notNull(),
  bankAccountId: integer("bank_account_id"),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  paymentMethod: text("payment_method"),
  reference: text("reference"),
  notes: text("notes"),
  recurring: integer("recurring", { mode: "boolean" }).default(sql`0`).notNull(),
  recurringInterval: text("recurring_interval"),
  attachmentId: integer("attachment_id"),
  createdAt: text("created_at").default(currentTimestamp).notNull(),
  updatedAt: text("updated_at").default(currentTimestamp).notNull(),
});

export const maintenanceRequests = sqliteTable("maintenance_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id"),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").default("pending").notNull(),
  priority: text("priority").default("medium").notNull(),
  requestDate: text("request_date").default(currentTimestamp).notNull(),
  scheduledDate: text("scheduled_date"),
  completionDate: text("completion_date"),
  estimatedCost: real("estimated_cost"),
  actualCost: real("actual_cost"),
  serviceProviderId: integer("service_provider_id"),
  notes: text("notes"),
  attachmentIds: text("attachment_ids"), // Store as JSON string in SQLite
  createdAt: text("created_at").default(currentTimestamp).notNull(),
  updatedAt: text("updated_at").default(currentTimestamp).notNull(),
});

export const maintenanceComments = sqliteTable("maintenance_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  maintenanceRequestId: integer("maintenance_request_id").notNull(),
  userId: integer("user_id").notNull(),
  comment: text("comment").notNull(),
  attachmentId: integer("attachment_id"),
  createdAt: text("created_at").default(currentTimestamp).notNull(),
});

export const serviceProviders = sqliteTable("service_providers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  specialty: text("specialty"),
  hourlyRate: real("hourly_rate"),
  isPreferred: integer("is_preferred", { mode: "boolean" }).default(sql`0`),
  notes: text("notes"),
  createdAt: text("created_at").default(currentTimestamp).notNull(),
});

export const bankAccounts = sqliteTable("bank_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number"),
  bankName: text("bank_name").notNull(),
  currentBalance: real("current_balance").default(0).notNull(),
  currency: text("currency").default("EUR").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).default(sql`0`).notNull(),
  createdAt: text("created_at").default(currentTimestamp).notNull(),
});

export const taxYears = sqliteTable("tax_years", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  year: integer("year").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isClosed: integer("is_closed", { mode: "boolean" }).default(sql`0`).notNull(),
  totalIncome: real("total_income").default(0).notNull(),
  totalExpenses: real("total_expenses").default(0).notNull(),
  netIncome: real("net_income").default(0).notNull(),
  taxRate: real("tax_rate"),
  estimatedTax: real("estimated_tax"),
  createdAt: text("created_at").default(currentTimestamp).notNull(),
});

export const budgets = sqliteTable("budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  propertyId: integer("property_id"),
  categoryId: integer("category_id"),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  period: text("period").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  createdAt: text("created_at").default(currentTimestamp).notNull(),
});

export const paymentReminders = sqliteTable("payment_reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  paymentId: integer("payment_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  sendDate: text("send_date").notNull(),
  sent: integer("sent", { mode: "boolean" }).default(sql`0`),
  sentAt: text("sent_at"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  deliveryStatus: text("delivery_status"),
  retryCount: integer("retry_count").default(0),
  notificationMethod: text("notification_method").default("email"),
  createdAt: text("created_at").default(currentTimestamp).notNull(),
  updatedAt: text("updated_at").default(currentTimestamp).notNull(),
});

export const tenantCredentials = sqliteTable("tenant_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  lastLogin: text("last_login"),
  active: integer("active", { mode: "boolean" }).default(sql`1`),
  resetToken: text("reset_token"),
  resetTokenExpiry: text("reset_token_expiry"),
  createdAt: text("created_at").default(currentTimestamp),
  updatedAt: text("updated_at").default(currentTimestamp),
});

export const sharedDocuments = sqliteTable("shared_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  fileId: integer("file_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  isPublic: integer("is_public", { mode: "boolean" }).default(sql`0`),
  documentType: text("document_type"), // lease, rules, notice, etc.
  expiresAt: text("expires_at"),
  createdAt: text("created_at").default(currentTimestamp),
  updatedAt: text("updated_at").default(currentTimestamp),
});

export const tenantDocuments = sqliteTable("tenant_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull(),
  documentId: integer("document_id").notNull(),
  viewed: integer("viewed", { mode: "boolean" }).default(sql`0`),
  viewedAt: text("viewed_at"),
  acknowledged: integer("acknowledged", { mode: "boolean" }).default(sql`0`),
  createdAt: text("created_at").default(currentTimestamp),
});

export const tenantRatings = sqliteTable("tenant_ratings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull(),
  userId: integer("user_id").notNull(),
  rating: integer("rating").notNull(), // 1-5 scale
  category: text("category"), // payment, cleanliness, communication, etc.
  comment: text("comment"),
  isPrivate: integer("is_private", { mode: "boolean" }).default(sql`1`),
  anonymous: integer("anonymous", { mode: "boolean" }).default(sql`0`),
  createdAt: text("created_at").default(currentTimestamp),
  updatedAt: text("updated_at").default(currentTimestamp),
});

export const paypalOrders = sqliteTable("paypal_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  paypalOrderId: text("paypal_order_id").notNull().unique(),
  amount: real("amount").notNull(),
  currency: text("currency").default("EUR").notNull(),
  status: text("status").notNull(), // 'CREATED', 'APPROVED', 'COMPLETED', 'FAILED'
  createdAt: text("created_at").default(currentTimestamp),
  updatedAt: text("updated_at").default(currentTimestamp),
});

export const tenantApplications = sqliteTable("tenant_applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  propertyId: integer("property_id").notNull(),
  applicantName: text("applicant_name").notNull(),
  applicantEmail: text("applicant_email").notNull(),
  applicantPhone: text("applicant_phone"),
  desiredMoveInDate: text("desired_move_in_date"),
  status: text("status").default("pending").notNull(), // pending, approved, rejected, waitlisted
  monthlyIncome: real("monthly_income"),
  creditScore: integer("credit_score"),
  backgroundCheckComplete: integer("background_check_complete", { mode: "boolean" }).default(sql`0`),
  backgroundCheckPassed: integer("background_check_passed", { mode: "boolean" }),
  notes: text("notes"),
  decisionDate: text("decision_date"),
  decisionReason: text("decision_reason"),
  createdAt: text("created_at").default(currentTimestamp),
  updatedAt: text("updated_at").default(currentTimestamp),
});

export const tenantApplicationDocuments = sqliteTable("tenant_application_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull(),
  userId: integer("user_id").notNull(),
  fileId: integer("file_id").notNull(),
  documentType: text("document_type").notNull(), // id, paystub, tax_return, reference, etc.
  verified: integer("verified", { mode: "boolean" }).default(sql`0`),
  verificationDate: text("verification_date"),
  verificationNotes: text("verification_notes"),
  createdAt: text("created_at").default(currentTimestamp),
  updatedAt: text("updated_at").default(currentTimestamp),
});

// ==================== SCHEMA TYPES ====================

// Generate insert schemas with Zod
export const insertUserSchema = createInsertSchema(users);

// Add custom validation through transformation
export const userValidation = insertUserSchema
  .extend({
    email: z.string().email(),
    password: z.string().min(8),
  })
  .omit({ id: true });

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true });
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({ id: true });
export const insertWaitingListSchema = createInsertSchema(waitingList).omit({ id: true });

// Define types from schemas
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;

export type WaitingList = typeof waitingList.$inferSelect;
export type InsertWaitingList = z.infer<typeof insertWaitingListSchema>;

export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type BankStatement = typeof bankStatements.$inferSelect;
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type TransactionCategory = typeof transactionCategories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type MaintenanceComment = typeof maintenanceComments.$inferSelect;
export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type TaxYear = typeof taxYears.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type PaymentReminder = typeof paymentReminders.$inferSelect;
export type TenantCredential = typeof tenantCredentials.$inferSelect;
export type SharedDocument = typeof sharedDocuments.$inferSelect;
export type TenantDocument = typeof tenantDocuments.$inferSelect;
export type TenantRating = typeof tenantRatings.$inferSelect;
export type PaypalOrder = typeof paypalOrders.$inferSelect;
export type TenantApplication = typeof tenantApplications.$inferSelect;
export type TenantApplicationDocument = typeof tenantApplicationDocuments.$inferSelect;

// Generate additional insert schemas
export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({ id: true });
export const insertBankStatementSchema = createInsertSchema(bankStatements).omit({ id: true });
export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({ id: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertTransactionCategorySchema = createInsertSchema(transactionCategories).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).omit({ id: true });
export const insertMaintenanceCommentSchema = createInsertSchema(maintenanceComments).omit({ id: true });
export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({ id: true });
export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({ id: true });
export const insertTaxYearSchema = createInsertSchema(taxYears).omit({ id: true });
export const insertBudgetSchema = createInsertSchema(budgets).omit({ id: true });
export const insertPaymentReminderSchema = createInsertSchema(paymentReminders).omit({ id: true });
export const insertTenantCredentialSchema = createInsertSchema(tenantCredentials).omit({ id: true });
export const insertSharedDocumentSchema = createInsertSchema(sharedDocuments).omit({ id: true });
export const insertTenantDocumentSchema = createInsertSchema(tenantDocuments).omit({ id: true });
export const insertTenantRatingSchema = createInsertSchema(tenantRatings).omit({ id: true });
export const insertPaypalOrderSchema = createInsertSchema(paypalOrders).omit({ id: true });
export const insertTenantApplicationSchema = createInsertSchema(tenantApplications).omit({ id: true });
export const insertTenantApplicationDocumentSchema = createInsertSchema(tenantApplicationDocuments).omit({ id: true });

// Define insert types
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type InsertBankStatement = z.infer<typeof insertBankStatementSchema>;
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type InsertTransactionCategory = z.infer<typeof insertTransactionCategorySchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;
export type InsertMaintenanceComment = z.infer<typeof insertMaintenanceCommentSchema>;
export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type InsertTaxYear = z.infer<typeof insertTaxYearSchema>;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type InsertPaymentReminder = z.infer<typeof insertPaymentReminderSchema>;
export type InsertTenantCredential = z.infer<typeof insertTenantCredentialSchema>;
export type InsertSharedDocument = z.infer<typeof insertSharedDocumentSchema>;
export type InsertTenantDocument = z.infer<typeof insertTenantDocumentSchema>;
export type InsertTenantRating = z.infer<typeof insertTenantRatingSchema>;
export type InsertPaypalOrder = z.infer<typeof insertPaypalOrderSchema>;
export type InsertTenantApplication = z.infer<typeof insertTenantApplicationSchema>;
export type InsertTenantApplicationDocument = z.infer<typeof insertTenantApplicationDocumentSchema>;