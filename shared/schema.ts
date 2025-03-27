import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  isAdmin: boolean("is_admin").default(false),
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
