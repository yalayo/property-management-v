CREATE TYPE "public"."application_document_type" AS ENUM('id_document', 'proof_of_income', 'credit_report', 'bank_statement', 'reference_letter', 'employment_verification', 'other');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('submitted', 'reviewing', 'approved', 'declined', 'pending_verification', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."employment_status" AS ENUM('employed', 'self-employed', 'student', 'unemployed', 'retired');--> statement-breakpoint
CREATE TYPE "public"."lease_duration" AS ENUM('month_to_month', '6_months', '1_year', '2_years', 'other');--> statement-breakpoint
CREATE TYPE "public"."maintenance_priority" AS ENUM('low', 'medium', 'high', 'emergency');--> statement-breakpoint
CREATE TYPE "public"."maintenance_status" AS ENUM('pending', 'in_progress', 'completed', 'declined', 'deferred');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'direct_debit', 'standing_order', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'received', 'late', 'overdue', 'partially_paid', 'waived');--> statement-breakpoint
CREATE TYPE "public"."pet_policy" AS ENUM('no_pets', 'cats_only', 'small_dogs', 'all_pets', 'case_by_case');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('pending', 'sent', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."reminder_type" AS ENUM('upcoming', 'due', 'overdue', 'final', 'custom');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('unprocessed', 'processed', 'matched', 'ignored', 'needs_review');--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text,
	"bank_name" text NOT NULL,
	"current_balance" double precision DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_statements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"bank_account_id" integer,
	"file_id" integer NOT NULL,
	"statement_date" date NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"starting_balance" double precision NOT NULL,
	"ending_balance" double precision NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"transaction_count" integer,
	"total_deposits" double precision DEFAULT 0,
	"total_withdrawals" double precision DEFAULT 0,
	"processed" boolean DEFAULT false,
	"reconciled" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_statement_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"bank_account_id" integer,
	"transaction_date" date NOT NULL,
	"value_date" date,
	"description" text NOT NULL,
	"amount" double precision NOT NULL,
	"is_deposit" boolean NOT NULL,
	"balance" double precision,
	"reference" text,
	"counterparty" text,
	"counterparty_iban" text,
	"status" "transaction_status" DEFAULT 'unprocessed',
	"category_id" integer,
	"tenant_id" integer,
	"payment_id" integer,
	"property_id" integer,
	"reconciled" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"property_id" integer,
	"category_id" integer,
	"name" text NOT NULL,
	"amount" double precision NOT NULL,
	"period" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"maintenance_request_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"comment" text NOT NULL,
	"attachment_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"tenant_id" integer,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "maintenance_status" DEFAULT 'pending' NOT NULL,
	"priority" "maintenance_priority" DEFAULT 'medium' NOT NULL,
	"request_date" timestamp DEFAULT now() NOT NULL,
	"scheduled_date" timestamp,
	"completion_date" timestamp,
	"estimated_cost" double precision,
	"actual_cost" double precision,
	"service_provider_id" integer,
	"notes" text,
	"attachment_ids" integer[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reminder_type" "reminder_type" NOT NULL,
	"reminder_status" "reminder_status" DEFAULT 'pending',
	"scheduled_date" timestamp NOT NULL,
	"sent_date" timestamp,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"delivery_channel" text DEFAULT 'email',
	"email_address" text,
	"phone_number" text,
	"response_received" boolean DEFAULT false,
	"response_date" timestamp,
	"response_message" text,
	"notification_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"property_id" integer,
	"user_id" integer NOT NULL,
	"amount" double precision NOT NULL,
	"due_date" date NOT NULL,
	"period_start_date" date,
	"period_end_date" date,
	"date_paid" timestamp,
	"status" "payment_status" DEFAULT 'pending',
	"payment_method" "payment_method",
	"transaction_id" integer,
	"reminders_sent" integer DEFAULT 0,
	"last_reminder_date" timestamp,
	"attachment_id" integer,
	"is_recurring" boolean DEFAULT false,
	"payment_category" text DEFAULT 'rent',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "paypal_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"order_id" text NOT NULL,
	"amount" double precision NOT NULL,
	"status" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "paypal_orders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"postal_code" text NOT NULL,
	"country" text DEFAULT 'Germany',
	"units" integer DEFAULT 1,
	"acquisition_date" timestamp,
	"purchase_price" integer,
	"current_value" integer
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"order" integer NOT NULL,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "service_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"specialty" text,
	"hourly_rate" double precision,
	"is_preferred" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"file_id" integer NOT NULL,
	"document_name" text NOT NULL,
	"document_type" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text,
	"responses" jsonb NOT NULL,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tax_years" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"year" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"total_income" double precision DEFAULT 0 NOT NULL,
	"total_expenses" double precision DEFAULT 0 NOT NULL,
	"net_income" double precision DEFAULT 0 NOT NULL,
	"tax_rate" double precision,
	"estimated_tax" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_application_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"file_id" integer NOT NULL,
	"document_type" "application_document_type" NOT NULL,
	"upload_date" timestamp DEFAULT now() NOT NULL,
	"verified" boolean DEFAULT false,
	"verification_date" timestamp,
	"verified_by" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "tenant_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"property_id" integer,
	"application_data" jsonb NOT NULL,
	"status" "application_status" DEFAULT 'submitted' NOT NULL,
	"submission_date" timestamp DEFAULT now() NOT NULL,
	"review_date" timestamp,
	"reviewed_by" integer,
	"notes" text,
	"background_check_status" text,
	"credit_check_status" text,
	"approval_date" timestamp,
	"move_in_date" date,
	"tenant_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_login" timestamp,
	"expiry_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_credentials_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "tenant_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"has_viewed" boolean DEFAULT false,
	"last_viewed" timestamp,
	"expiry_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"payment_rating" integer NOT NULL,
	"property_rating" integer NOT NULL,
	"communication_rating" integer NOT NULL,
	"overall_rating" integer NOT NULL,
	"notes" text,
	"rating_date" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer,
	"user_id" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"date_of_birth" date,
	"id_number" text,
	"employment_status" "employment_status" DEFAULT 'employed',
	"employer_name" text,
	"employer_phone" text,
	"occupation" text,
	"monthly_income" integer,
	"employment_duration" text,
	"reference1_name" text,
	"reference1_relationship" text,
	"reference1_phone" text,
	"reference1_email" text,
	"reference2_name" text,
	"reference2_relationship" text,
	"reference2_phone" text,
	"reference2_email" text,
	"account_holder" text,
	"bank_name" text,
	"account_number" text,
	"iban" text,
	"bic" text,
	"payment_method" "payment_method" DEFAULT 'bank_transfer',
	"move_in_date" date,
	"lease_start_date" date,
	"lease_end_date" date,
	"lease_duration" "lease_duration" DEFAULT '1_year',
	"custom_duration" text,
	"rent_amount" integer,
	"deposit_amount" integer,
	"pet_policy" "pet_policy" DEFAULT 'case_by_case',
	"has_pets" boolean DEFAULT false,
	"pet_details" text,
	"agree_to_terms" boolean DEFAULT false,
	"agree_to_rules" boolean DEFAULT false,
	"agree_to_privacy_policy" boolean DEFAULT false,
	"signature" text,
	"onboarding_completed" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transaction_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"color" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"property_id" integer,
	"category_id" integer NOT NULL,
	"bank_account_id" integer,
	"amount" double precision NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"payment_method" text,
	"reference" text,
	"notes" text,
	"recurring" boolean DEFAULT false NOT NULL,
	"recurring_interval" text,
	"attachment_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"filename" text NOT NULL,
	"file_type" text NOT NULL,
	"file_category" text,
	"upload_date" timestamp DEFAULT now(),
	"processed" boolean DEFAULT false,
	"extracted_data" jsonb,
	"processing_status" text,
	"processing_error" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"is_admin" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"onboarding_completed" boolean DEFAULT false,
	"tier" text,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_payment_intent_id" text,
	"preferred_payment_gateway" text,
	"is_crowdfunding_contributor" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waiting_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"joined_at" timestamp DEFAULT now(),
	CONSTRAINT "waiting_list_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_file_id_uploaded_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_statement_id_bank_statements_id_fk" FOREIGN KEY ("bank_statement_id") REFERENCES "public"."bank_statements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_category_id_transaction_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."transaction_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_transaction_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."transaction_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_comments" ADD CONSTRAINT "maintenance_comments_maintenance_request_id_maintenance_requests_id_fk" FOREIGN KEY ("maintenance_request_id") REFERENCES "public"."maintenance_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_comments" ADD CONSTRAINT "maintenance_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_attachment_id_uploaded_files_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."uploaded_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paypal_orders" ADD CONSTRAINT "paypal_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_documents" ADD CONSTRAINT "shared_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_documents" ADD CONSTRAINT "shared_documents_file_id_uploaded_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_years" ADD CONSTRAINT "tax_years_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_application_documents" ADD CONSTRAINT "tenant_application_documents_application_id_tenant_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."tenant_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_application_documents" ADD CONSTRAINT "tenant_application_documents_file_id_uploaded_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_application_documents" ADD CONSTRAINT "tenant_application_documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_applications" ADD CONSTRAINT "tenant_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_applications" ADD CONSTRAINT "tenant_applications_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_applications" ADD CONSTRAINT "tenant_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_applications" ADD CONSTRAINT "tenant_applications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_credentials" ADD CONSTRAINT "tenant_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_documents" ADD CONSTRAINT "tenant_documents_document_id_shared_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."shared_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_documents" ADD CONSTRAINT "tenant_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_ratings" ADD CONSTRAINT "tenant_ratings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_ratings" ADD CONSTRAINT "tenant_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_transaction_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."transaction_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_attachment_id_uploaded_files_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."uploaded_files"("id") ON DELETE no action ON UPDATE no action;