/**
 * Schema for D1 database (SQLite compatible)
 * This is a modified version of schema.ts that works with SQLite
 */

import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { type BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/d1';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// D1 Database type definition for Cloudflare Workers
export interface D1Database {
  prepare: (query: string) => {
    bind: (...args: any[]) => {
      all: () => Promise<any[]>;
      first: () => Promise<any>;
      raw: () => Promise<any>;
      run: () => Promise<any>;
    };
  };
  batch: (statements: string[]) => Promise<any>;
  exec: (query: string) => Promise<any>;
}

// SQLite doesn't support enum types natively - define constants for enum values
const userTierEnum = ['free', 'basic', 'pro', 'enterprise'] as const;
const paymentStatusEnum = ['received', 'pending', 'late', 'overdue', 'partially_paid', 'waived'] as const;
const maintenanceStatusEnum = ['pending', 'in_progress', 'completed', 'declined', 'deferred'] as const;
const priorityEnum = ['low', 'medium', 'high', 'emergency'] as const;
const transactionTypeEnum = ['income', 'expense'] as const;

/**
 * User table
 */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  password: text('password').notNull(),
  passwordSalt: text('password_salt'),
  passwordChangeRequired: integer('password_change_required', { mode: 'boolean' }).default(false),
  email: text('email').notNull(),
  fullName: text('full_name'),
  isAdmin: integer('is_admin', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).default(false),
  lastLogin: integer('last_login', { mode: 'timestamp_ms' }),
  tier: text('tier').default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  preferredPaymentGateway: text('preferred_payment_gateway'),
  isCrowdfundingContributor: integer('is_crowdfunding_contributor', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Survey questions table
 */
export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  order: integer('order').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Survey responses table
 */
export const surveyResponses = sqliteTable('survey_responses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email'),
  responses: text('responses').notNull(), // SQLite doesn't have JSONB, so we use TEXT
  submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Waiting list table
 */
export const waitingList = sqliteTable('waiting_list', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  fullName: text('full_name'),
  phone: text('phone'),
  propertyCount: integer('property_count'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Properties table
 */
export const properties = sqliteTable('properties', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  zipCode: text('zip_code').notNull(),
  country: text('country').notNull(),
  type: text('type').notNull(), // apartment, house, condo, etc
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  squareFeet: integer('square_feet'),
  yearBuilt: integer('year_built'),
  description: text('description'),
  monthlyRent: integer('monthly_rent'),
  securityDeposit: integer('security_deposit'),
  isOccupied: integer('is_occupied', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  userId: integer('user_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Tenants table
 */
export const tenants = sqliteTable('tenants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  leaseStart: text('lease_start'), // ISO date string
  leaseEnd: text('lease_end'), // ISO date string
  monthlyRent: integer('monthly_rent'),
  securityDeposit: integer('security_deposit'),
  active: integer('active', { mode: 'boolean' }).default(true),
  userId: integer('user_id').notNull(),
  propertyId: integer('property_id'),
  dateOfBirth: text('date_of_birth'), // ISO date string
  ssn: text('ssn'), // encrypted
  driverLicense: text('driver_license'),
  employerName: text('employer_name'),
  employerPhone: text('employer_phone'),
  employerAddress: text('employer_address'),
  income: integer('income'),
  backgroundCheckConsent: integer('background_check_consent', { mode: 'boolean' }),
  creditCheckConsent: integer('credit_check_consent', { mode: 'boolean' }),
  previousAddress: text('previous_address'),
  previousLandlordName: text('previous_landlord_name'),
  previousLandlordPhone: text('previous_landlord_phone'),
  additionalOccupants: integer('additional_occupants'),
  pets: integer('pets', { mode: 'boolean' }),
  petType: text('pet_type'),
  petBreed: text('pet_breed'),
  petWeight: integer('pet_weight'),
  petFee: integer('pet_fee'),
  smokingAllowed: integer('smoking_allowed', { mode: 'boolean' }),
  vechicleInfo: text('vechicle_info'),
  bankName: text('bank_name'),
  bankAccountNumber: text('bank_account_number'), // encrypted
  bankRoutingNumber: text('bank_routing_number'), // encrypted
  reference1Name: text('reference_1_name'),
  reference1Phone: text('reference_1_phone'),
  reference1Relation: text('reference_1_relation'),
  reference2Name: text('reference_2_name'),
  reference2Phone: text('reference_2_phone'),
  reference2Relation: text('reference_2_relation'),
  signature: text('signature'), // Base64 encoded
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Payments table
 */
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: integer('amount').notNull(),
  date: text('date').notNull(), // ISO date string
  dueDate: text('due_date'), // ISO date string
  status: text('status'), // SQLite doesn't support enums natively
  notes: text('notes'),
  receipt: text('receipt'), // URL to receipt image
  paymentMethod: text('payment_method'), // cash, check, bank transfer, etc
  paymentGateway: text('payment_gateway'), // stripe, paypal, etc
  gatewayTransactionId: text('gateway_transaction_id'), // ID from payment gateway
  chargeId: text('charge_id'), // ID from payment processor
  tenantId: integer('tenant_id').notNull(),
  userId: integer('user_id').notNull(),
  propertyId: integer('property_id'),
  paymentType: text('payment_type').default('rent'), // rent, deposit, fee, utility, etc
  paymentCategory: text('payment_category'), // water, electric, gas, etc (for utilities)
  reminderSent: integer('reminder_sent', { mode: 'boolean' }).default(false),
  reminderDate: integer('reminder_date', { mode: 'timestamp_ms' }),
  lateFee: integer('late_fee'),
  partialPaymentAllowed: integer('partial_payment_allowed', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Uploaded files table
 */
export const uploadedFiles = sqliteTable('uploaded_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(),
  fileCategory: text('file_category'), // statement, document, receipt, etc
  uploadDate: integer('upload_date', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  processed: integer('processed', { mode: 'boolean' }).default(false),
  extractedData: text('extracted_data'), // JSON string with extracted data
  processingStatus: text('processing_status').default('pending'),
  processingError: text('processing_error'),
});

/**
 * PayPal orders table
 */
export const paypalOrders = sqliteTable('paypal_orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: text('order_id').notNull(),
  status: text('status').notNull().default('created'),
  amount: integer('amount').notNull(),
  userId: integer('user_id').notNull(),
  metadata: text('metadata'), // JSON string with additional metadata
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Transaction Categories table
 */
export const transactionCategories = sqliteTable('transaction_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'income' or 'expense'
  color: text('color'), // For UI display
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Bank Accounts table
 */
export const bankAccounts = sqliteTable('bank_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  bankName: text('bank_name').notNull(),
  accountName: text('account_name').notNull(),
  accountNumber: text('account_number'), // Encrypted or masked
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  currentBalance: integer('current_balance').default(0),
  currency: text('currency').default('EUR'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Transactions table
 */
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  propertyId: integer('property_id'),
  categoryId: integer('category_id').notNull(),
  bankAccountId: integer('bank_account_id'),
  amount: integer('amount').notNull(), // Store as cents or smallest currency unit
  date: text('date').notNull(), // ISO date string
  description: text('description').notNull(),
  type: text('type').notNull(), // 'income' or 'expense'
  paymentMethod: text('payment_method'), // cash, bank transfer, etc.
  reference: text('reference'), // invoice or receipt number
  notes: text('notes'),
  recurring: integer('recurring', { mode: 'boolean' }).default(false),
  recurringInterval: text('recurring_interval'), // monthly, quarterly, annually
  attachmentId: integer('attachment_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Bank Statements table
 */
export const bankStatements = sqliteTable('bank_statements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  fileId: integer('file_id').notNull(), // References uploadedFiles
  bankAccountId: integer('bank_account_id'),
  statementDate: text('statement_date').notNull(), // ISO date string
  startDate: text('start_date').notNull(), // ISO date string
  endDate: text('end_date').notNull(), // ISO date string
  startingBalance: integer('starting_balance').notNull(), // Store as cents
  endingBalance: integer('ending_balance').notNull(), // Store as cents
  totalDeposits: integer('total_deposits').default(0), // Store as cents
  totalWithdrawals: integer('total_withdrawals').default(0), // Store as cents
  transactionCount: integer('transaction_count').default(0),
  currency: text('currency').default('EUR'),
  notes: text('notes'),
  processed: integer('processed', { mode: 'boolean' }).default(false),
  reconciled: integer('reconciled', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Tax Years table
 */
export const taxYears = sqliteTable('tax_years', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  year: integer('year').notNull(),
  startDate: text('start_date').notNull(), // ISO date string
  endDate: text('end_date').notNull(), // ISO date string
  status: text('status').default('open'), // open, in_progress, completed, filed
  totalIncome: integer('total_income').default(0), // Store as cents
  totalExpenses: integer('total_expenses').default(0), // Store as cents
  netProfit: integer('net_profit').default(0), // Store as cents
  taxRate: integer('tax_rate'), // Store as percentage * 100 (e.g., 19.5% = 1950)
  estimatedTaxAmount: integer('estimated_tax_amount').default(0), // Store as cents
  currency: text('currency').default('EUR'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Budgets table
 */
export const budgets = sqliteTable('budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  name: text('name').notNull(),
  amount: integer('amount').notNull(), // Store as cents
  propertyId: integer('property_id'),
  categoryId: integer('category_id'),
  startDate: text('start_date').notNull(), // ISO date string
  endDate: text('end_date'), // ISO date string
  period: text('period').notNull(), // monthly, quarterly, annual
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Maintenance Requests table
 */
export const maintenanceRequests = sqliteTable('maintenance_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  propertyId: integer('property_id').notNull(),
  tenantId: integer('tenant_id'),
  requestDate: text('request_date').notNull(), // ISO date string
  description: text('description').notNull(),
  notes: text('notes'),
  status: text('status').default('pending'), // pending, in_progress, completed, declined, deferred
  priority: text('priority').default('medium'), // low, medium, high, emergency
  category: text('category'), // plumbing, electrical, etc.
  estimatedCost: integer('estimated_cost'), // Store as cents
  actualCost: integer('actual_cost'), // Store as cents
  assignedTo: integer('assigned_to'), // References service provider ID
  scheduledDate: text('scheduled_date'), // ISO date string
  completionDate: text('completion_date'), // ISO date string
  attachmentIds: text('attachment_ids'), // Comma-separated IDs or JSON string
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Maintenance Comments table
 */
export const maintenanceComments = sqliteTable('maintenance_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  maintenanceRequestId: integer('maintenance_request_id').notNull(),
  userId: integer('user_id').notNull(),
  comment: text('comment').notNull(),
  attachmentId: integer('attachment_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Service Providers table
 */
export const serviceProviders = sqliteTable('service_providers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  specialty: text('specialty'), // plumbing, electrical, etc.
  hourlyRate: integer('hourly_rate'), // Store as cents
  isPreferred: integer('is_preferred', { mode: 'boolean' }).default(false),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Tenant Credentials table
 */
export const tenantCredentials = sqliteTable('tenant_credentials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: integer('tenant_id').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastLogin: integer('last_login', { mode: 'timestamp_ms' }),
  expiryDate: integer('expiry_date', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Shared Documents table
 */
export const sharedDocuments = sqliteTable('shared_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  fileId: integer('file_id').notNull(), // References uploadedFiles
  documentName: text('document_name').notNull(),
  documentType: text('document_type').notNull(), // lease, rules, notice, etc.
  description: text('description'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Tenant Documents table - documents assigned to tenants
 */
export const tenantDocuments = sqliteTable('tenant_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: integer('tenant_id').notNull(),
  documentId: integer('document_id').notNull(), // References sharedDocuments
  expiryDate: integer('expiry_date', { mode: 'timestamp_ms' }),
  hasViewed: integer('has_viewed', { mode: 'boolean' }).default(false),
  lastViewed: integer('last_viewed', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Tenant Ratings table - ratings given by landlords
 */
export const tenantRatings = sqliteTable('tenant_ratings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: integer('tenant_id').notNull(),
  userId: integer('user_id').notNull(), // Landlord who created rating
  paymentRating: integer('payment_rating').notNull(), // 1-5 scale
  propertyRating: integer('property_rating').notNull(), // 1-5 scale
  communicationRating: integer('communication_rating').notNull(), // 1-5 scale
  overallRating: integer('overall_rating').notNull(), // 1-5 scale
  notes: text('notes'),
  ratingDate: integer('rating_date', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Zod schemas for form validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({ id: true });
export const insertWaitingListSchema = createInsertSchema(waitingList).omit({ id: true });
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true });
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({ id: true });
export const insertPaypalOrderSchema = createInsertSchema(paypalOrders).omit({ id: true });

// Insert schemas for accounting module
export const insertTransactionCategorySchema = createInsertSchema(transactionCategories).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({ id: true });
export const insertBankStatementSchema = createInsertSchema(bankStatements).omit({ id: true });
export const insertTaxYearSchema = createInsertSchema(taxYears).omit({ id: true });
export const insertBudgetSchema = createInsertSchema(budgets).omit({ id: true });

// Insert schemas for maintenance module
export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).omit({ id: true });
export const insertMaintenanceCommentSchema = createInsertSchema(maintenanceComments).omit({ id: true });
export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({ id: true });

// Insert schemas for tenant portal
export const insertTenantCredentialSchema = createInsertSchema(tenantCredentials).omit({ id: true });
export const insertSharedDocumentSchema = createInsertSchema(sharedDocuments).omit({ id: true });
export const insertTenantDocumentSchema = createInsertSchema(tenantDocuments).omit({ id: true });
export const insertTenantRatingSchema = createInsertSchema(tenantRatings).omit({ id: true });

// Types for user and survey modules
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;

export type WaitingList = typeof waitingList.$inferSelect;
export type InsertWaitingList = z.infer<typeof insertWaitingListSchema>;

// Types for property and tenant management
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Types for file handling
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;

// Types for payment processing
export type PaypalOrder = typeof paypalOrders.$inferSelect;
export type InsertPaypalOrder = z.infer<typeof insertPaypalOrderSchema>;

// Types for accounting module
export type TransactionCategory = typeof transactionCategories.$inferSelect;
export type InsertTransactionCategory = z.infer<typeof insertTransactionCategorySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;

export type BankStatement = typeof bankStatements.$inferSelect;
export type InsertBankStatement = z.infer<typeof insertBankStatementSchema>;

export type TaxYear = typeof taxYears.$inferSelect;
export type InsertTaxYear = z.infer<typeof insertTaxYearSchema>;

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;

// Types for maintenance module
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;

export type MaintenanceComment = typeof maintenanceComments.$inferSelect;
export type InsertMaintenanceComment = z.infer<typeof insertMaintenanceCommentSchema>;

export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;

// Types for tenant portal
export type TenantCredential = typeof tenantCredentials.$inferSelect;
export type InsertTenantCredential = z.infer<typeof insertTenantCredentialSchema>;

export type SharedDocument = typeof sharedDocuments.$inferSelect;
export type InsertSharedDocument = z.infer<typeof insertSharedDocumentSchema>;

export type TenantDocument = typeof tenantDocuments.$inferSelect;
export type InsertTenantDocument = z.infer<typeof insertTenantDocumentSchema>;

export type TenantRating = typeof tenantRatings.$inferSelect;
export type InsertTenantRating = z.infer<typeof insertTenantRatingSchema>;

export function createDbClient(d1: D1Database) {
  return drizzle(d1);
}

export type D1Schema = {
  users: typeof users;
  questions: typeof questions;
  surveyResponses: typeof surveyResponses;
  waitingList: typeof waitingList;
  properties: typeof properties;
  tenants: typeof tenants;
  payments: typeof payments;
  uploadedFiles: typeof uploadedFiles;
  paypalOrders: typeof paypalOrders;
  // New accounting tables
  transactionCategories: typeof transactionCategories;
  transactions: typeof transactions;
  bankAccounts: typeof bankAccounts;
  bankStatements: typeof bankStatements;
  taxYears: typeof taxYears;
  budgets: typeof budgets;
  // New maintenance tables
  maintenanceRequests: typeof maintenanceRequests;
  maintenanceComments: typeof maintenanceComments;
  serviceProviders: typeof serviceProviders;
  // New tenant portal tables
  tenantCredentials: typeof tenantCredentials;
  sharedDocuments: typeof sharedDocuments;
  tenantDocuments: typeof tenantDocuments;
  tenantRatings: typeof tenantRatings;
};