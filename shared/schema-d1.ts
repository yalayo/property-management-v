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

// SQLite doesn't support enum types natively
const userTierEnum = ['free', 'basic', 'pro', 'enterprise'] as const;
const paymentStatusEnum = ['received', 'pending', 'late', 'overdue', 'partially_paid', 'waived'] as const;
const maintenanceStatusEnum = ['pending', 'in_progress', 'completed', 'declined', 'deferred'] as const;
const priorityEnum = ['low', 'medium', 'high', 'emergency'] as const;

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
  questionId: integer('question_id').notNull(),
  response: text('response').notNull(),
  ipAddress: text('ip_address'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;

export type WaitingList = typeof waitingList.$inferSelect;
export type InsertWaitingList = z.infer<typeof insertWaitingListSchema>;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;

export type PaypalOrder = typeof paypalOrders.$inferSelect;
export type InsertPaypalOrder = z.infer<typeof insertPaypalOrderSchema>;

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
};