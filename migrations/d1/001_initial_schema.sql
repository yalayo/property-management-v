-- Migration adapted for Cloudflare D1 (SQLite)
-- This file was automatically generated from PostgreSQL schema

CREATE TABLE "bank_accounts" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"user_id" integer NOT NULL,
	"account_name" TEXT NOT NULL,
	"account_number" TEXT,
	"bank_name" TEXT NOT NULL,
	"current_balance" REAL DEFAULT 0 NOT NULL,
	"currency" TEXT DEFAULT 'EUR' NOT NULL,
	"is_default" INTEGER DEFAULT 0 NOT NULL,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_statements" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"user_id" integer NOT NULL,
	"bank_account_id" integer,
	"file_id" integer NOT NULL,
	"statement_TEXT" TEXT NOT NULL,
	"start_TEXT" TEXT NOT NULL,
	"end_TEXT" TEXT NOT NULL,
	"starting_balance" REAL NOT NULL,
	"ending_balance" REAL NOT NULL,
	"currency" TEXT DEFAULT 'EUR' NOT NULL,
	"transaction_count" integer,
	"total_deposits" REAL DEFAULT 0,
	"total_withdrawals" REAL DEFAULT 0,
	"processed" INTEGER DEFAULT 0,
	"reconciled" INTEGER DEFAULT 0,
	"notes" TEXT,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"upTEXTd_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"bank_statement_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"bank_account_id" integer,
	"transaction_TEXT" TEXT NOT NULL,
	"value_TEXT" TEXT,
	"description" TEXT NOT NULL,
	"amount" REAL NOT NULL,
	"is_deposit" INTEGER NOT NULL,
	"balance" REAL,
	"reference" TEXT,
	"counterparty" TEXT,
	"counterparty_iban" TEXT,
	"status" "transaction_status" DEFAULT 'unprocessed',
	"category_id" integer,
	"tenant_id" integer,
	"payment_id" integer,
	"property_id" integer,
	"reconciled" INTEGER DEFAULT 0,
	"notes" TEXT,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"user_id" integer NOT NULL,
	"property_id" integer,
	"category_id" integer,
	"name" TEXT NOT NULL,
	"amount" REAL NOT NULL,
	"period" TEXT NOT NULL,
	"start_TEXT" TEXT NOT NULL,
	"end_TEXT" TEXT,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_comments" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"maintenance_request_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"comment" TEXT NOT NULL,
	"attachment_id" integer,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_requests" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"property_id" integer NOT NULL,
	"tenant_id" integer,
	"user_id" integer NOT NULL,
	"title" TEXT NOT NULL,
	"description" TEXT NOT NULL,
	"status" "maintenance_status" DEFAULT 'pending' NOT NULL,
	"priority" "maintenance_priority" DEFAULT 'medium' NOT NULL,
	"request_TEXT" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"scheduled_TEXT" TEXT,
	"completion_TEXT" TEXT,
	"estimated_cost" REAL,
	"actual_cost" REAL,
	"service_provider_id" integer,
	"notes" TEXT,
	"attachment_ids" integer[],
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"upTEXTd_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_reminders" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"payment_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reminder_type" "reminder_type" NOT NULL,
	"reminder_status" "reminder_status" DEFAULT 'pending',
	"scheduled_TEXT" TEXT NOT NULL,
	"sent_TEXT" TEXT,
	"subject" TEXT NOT NULL,
	"message" TEXT NOT NULL,
	"delivery_channel" TEXT DEFAULT 'email',
	"email_address" TEXT,
	"phone_number" TEXT,
	"response_received" INTEGER DEFAULT 0,
	"response_TEXT" TEXT,
	"response_message" TEXT,
	"notification_id" TEXT,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"upTEXTd_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"tenant_id" integer NOT NULL,
	"property_id" integer,
	"user_id" integer NOT NULL,
	"amount" REAL NOT NULL,
	"due_TEXT" TEXT NOT NULL,
	"period_start_TEXT" TEXT,
	"period_end_TEXT" TEXT,
	"TEXT_paid" TEXT,
	"status" "payment_status" DEFAULT 'pending',
	"payment_method" "payment_method",
	"transaction_id" integer,
	"reminders_sent" integer DEFAULT 0,
	"last_reminder_TEXT" TEXT,
	"attachment_id" integer,
	"is_recurring" INTEGER DEFAULT 0,
	"payment_category" TEXT DEFAULT 'rent',
	"notes" TEXT,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
	"upTEXTd_at" TEXT DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "paypal_orders" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"user_id" integer NOT NULL,
	"order_id" TEXT NOT NULL,
	"amount" REAL NOT NULL,
	"status" TEXT NOT NULL,
	"metadata" TEXT,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"upTEXTd_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "paypal_orders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"user_id" integer NOT NULL,
	"name" TEXT NOT NULL,
	"address" TEXT NOT NULL,
	"city" TEXT NOT NULL,
	"postal_code" TEXT NOT NULL,
	"country" TEXT DEFAULT 'Germany',
	"units" integer DEFAULT 1,
	"acquisition_TEXT" TEXT,
	"purchase_price" integer,
	"current_value" integer
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"TEXT" TEXT NOT NULL,
	"order" integer NOT NULL,
	"active" INTEGER DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "service_providers" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"user_id" integer NOT NULL,
	"name" TEXT NOT NULL,
	"email" TEXT,
	"phone" TEXT,
	"address" TEXT,
	"specialty" TEXT,
	"hourly_rate" REAL,
	"is_preferred" INTEGER DEFAULT 0,
	"notes" TEXT,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_documents" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"user_id" integer NOT NULL,
	"file_id" integer NOT NULL,
	"document_name" TEXT NOT NULL,
	"document_type" TEXT NOT NULL,
	"description" TEXT,
	"is_public" INTEGER DEFAULT 0,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"upTEXTd_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"email" TEXT,
	"responses" TEXT NOT NULL,
	"submitted_at" TEXT DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "tax_years" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"user_id" integer NOT NULL,
	"year" integer NOT NULL,
	"start_TEXT" TEXT NOT NULL,
	"end_TEXT" TEXT NOT NULL,
	"is_closed" INTEGER DEFAULT 0 NOT NULL,
	"total_income" REAL DEFAULT 0 NOT NULL,
	"total_expenses" REAL DEFAULT 0 NOT NULL,
	"net_income" REAL DEFAULT 0 NOT NULL,
	"tax_rate" REAL,
	"estimated_tax" REAL,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_application_documents" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"application_id" integer NOT NULL,
	"file_id" integer NOT NULL,
	"document_type" "application_document_type" NOT NULL,
	"upload_TEXT" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"verified" INTEGER DEFAULT 0,
	"verification_TEXT" TEXT,
	"verified_by" integer,
	"notes" TEXT
);
--> statement-breakpoint
CREATE TABLE "tenant_applications" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"user_id" integer NOT NULL,
	"property_id" integer,
	"application_data" TEXT NOT NULL,
	"status" "application_status" DEFAULT 'submitted' NOT NULL,
	"submission_TEXT" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"review_TEXT" TEXT,
	"reviewed_by" integer,
	"notes" TEXT,
	"background_check_status" TEXT,
	"credit_check_status" TEXT,
	"approval_TEXT" TEXT,
	"move_in_TEXT" TEXT,
	"tenant_id" integer,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"upTEXTd_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_credentials" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"tenant_id" integer NOT NULL,
	"username" TEXT NOT NULL,
	"password" TEXT NOT NULL,
	"is_active" INTEGER DEFAULT 1,
	"last_login" TEXT,
	"expiry_TEXT" TEXT,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"upTEXTd_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "tenant_credentials_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "tenant_documents" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"document_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"has_viewed" INTEGER DEFAULT 0,
	"last_viewed" TEXT,
	"expiry_TEXT" TEXT,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_ratings" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"payment_rating" integer NOT NULL,
	"property_rating" integer NOT NULL,
	"communication_rating" integer NOT NULL,
	"overall_rating" integer NOT NULL,
	"notes" TEXT,
	"rating_TEXT" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"upTEXTd_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"property_id" integer,
	"user_id" integer NOT NULL,
	"first_name" TEXT NOT NULL,
	"last_name" TEXT NOT NULL,
	"email" TEXT,
	"phone" TEXT,
	"TEXT_of_birth" TEXT,
	"id_number" TEXT,
	"employment_status" "employment_status" DEFAULT 'employed',
	"employer_name" TEXT,
	"employer_phone" TEXT,
	"occupation" TEXT,
	"monthly_income" integer,
	"employment_duration" TEXT,
	"reference1_name" TEXT,
	"reference1_relationship" TEXT,
	"reference1_phone" TEXT,
	"reference1_email" TEXT,
	"reference2_name" TEXT,
	"reference2_relationship" TEXT,
	"reference2_phone" TEXT,
	"reference2_email" TEXT,
	"account_holder" TEXT,
	"bank_name" TEXT,
	"account_number" TEXT,
	"iban" TEXT,
	"bic" TEXT,
	"payment_method" "payment_method" DEFAULT 'bank_transfer',
	"move_in_TEXT" TEXT,
	"lease_start_TEXT" TEXT,
	"lease_end_TEXT" TEXT,
	"lease_duration" "lease_duration" DEFAULT '1_year',
	"custom_duration" TEXT,
	"rent_amount" integer,
	"deposit_amount" integer,
	"pet_policy" "pet_policy" DEFAULT 'case_by_case',
	"has_pets" INTEGER DEFAULT 0,
	"pet_details" TEXT,
	"agree_to_terms" INTEGER DEFAULT 0,
	"agree_to_rules" INTEGER DEFAULT 0,
	"agree_to_privacy_policy" INTEGER DEFAULT 0,
	"signature" TEXT,
	"onboarding_completed" INTEGER DEFAULT 0,
	"active" INTEGER DEFAULT 1,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
	"upTEXTd_at" TEXT DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "transaction_categories" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"user_id" integer NOT NULL,
	"name" TEXT NOT NULL,
	"type" TEXT NOT NULL,
	"color" TEXT,
	"is_default" INTEGER DEFAULT 0 NOT NULL,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"user_id" integer NOT NULL,
	"property_id" integer,
	"category_id" integer NOT NULL,
	"bank_account_id" integer,
	"amount" REAL NOT NULL,
	"TEXT" TEXT NOT NULL,
	"description" TEXT NOT NULL,
	"type" TEXT NOT NULL,
	"payment_method" TEXT,
	"reference" TEXT,
	"notes" TEXT,
	"recurring" INTEGER DEFAULT 0 NOT NULL,
	"recurring_interval" TEXT,
	"attachment_id" integer,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"upTEXTd_at" TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"user_id" integer NOT NULL,
	"filename" TEXT NOT NULL,
	"file_type" TEXT NOT NULL,
	"file_category" TEXT,
	"upload_TEXT" TEXT DEFAULT CURRENT_TIMESTAMP,
	"processed" INTEGER DEFAULT 0,
	"extracted_data" TEXT,
	"processing_status" TEXT,
	"processing_error" TEXT
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"username" TEXT NOT NULL,
	"password" TEXT NOT NULL,
	"email" TEXT NOT NULL,
	"full_name" TEXT,
	"is_admin" INTEGER DEFAULT 0,
	"is_active" INTEGER DEFAULT 1,
	"onboarding_completed" INTEGER DEFAULT 0,
	"tier" TEXT,
	"stripe_customer_id" TEXT,
	"stripe_subscription_id" TEXT,
	"stripe_payment_intent_id" TEXT,
	"preferred_payment_gateway" TEXT,
	"is_crowdfunding_contributor" INTEGER DEFAULT 0,
	"created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
	"upTEXTd_at" TEXT DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waiting_list" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"email" TEXT NOT NULL,
	"full_name" TEXT,
	"joined_at" TEXT DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "waiting_list_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_file_id_uploaded_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "uploaded_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_statement_id_bank_statements_id_fk" FOREIGN KEY ("bank_statement_id") REFERENCES "bank_statements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_category_id_transaction_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "transaction_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_transaction_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "transaction_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_comments" ADD CONSTRAINT "maintenance_comments_maintenance_request_id_maintenance_requests_id_fk" FOREIGN KEY ("maintenance_request_id") REFERENCES "maintenance_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_comments" ADD CONSTRAINT "maintenance_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_attachment_id_uploaded_files_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "uploaded_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paypal_orders" ADD CONSTRAINT "paypal_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_documents" ADD CONSTRAINT "shared_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_documents" ADD CONSTRAINT "shared_documents_file_id_uploaded_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "uploaded_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_years" ADD CONSTRAINT "tax_years_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_application_documents" ADD CONSTRAINT "tenant_application_documents_application_id_tenant_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "tenant_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_application_documents" ADD CONSTRAINT "tenant_application_documents_file_id_uploaded_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "uploaded_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_application_documents" ADD CONSTRAINT "tenant_application_documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_applications" ADD CONSTRAINT "tenant_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_applications" ADD CONSTRAINT "tenant_applications_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_applications" ADD CONSTRAINT "tenant_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_applications" ADD CONSTRAINT "tenant_applications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_credentials" ADD CONSTRAINT "tenant_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_documents" ADD CONSTRAINT "tenant_documents_document_id_shared_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "shared_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_documents" ADD CONSTRAINT "tenant_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_ratings" ADD CONSTRAINT "tenant_ratings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_ratings" ADD CONSTRAINT "tenant_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_transaction_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "transaction_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_attachment_id_uploaded_files_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "uploaded_files"("id") ON DELETE no action ON UPDATE no action;
