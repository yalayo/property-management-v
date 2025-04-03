CREATE TABLE `bank_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`account_name` text NOT NULL,
	`account_number` text,
	`bank_name` text NOT NULL,
	`current_balance` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`is_default` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bank_statements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`bank_account_id` integer,
	`file_id` integer NOT NULL,
	`statement_date` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`starting_balance` real NOT NULL,
	`ending_balance` real NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`transaction_count` integer,
	`total_deposits` real DEFAULT 0,
	`total_withdrawals` real DEFAULT 0,
	`processed` integer DEFAULT 0,
	`reconciled` integer DEFAULT 0,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bank_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bank_statement_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`bank_account_id` integer,
	`transaction_date` text NOT NULL,
	`value_date` text,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`is_deposit` integer NOT NULL,
	`balance` real,
	`reference` text,
	`counterparty` text,
	`counterparty_iban` text,
	`status` text DEFAULT 'unprocessed',
	`category_id` integer,
	`tenant_id` integer,
	`payment_id` integer,
	`property_id` integer,
	`reconciled` integer DEFAULT 0,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`property_id` integer,
	`category_id` integer,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`period` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `maintenance_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`maintenance_request_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`comment` text NOT NULL,
	`attachment_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `maintenance_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`tenant_id` integer,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`request_date` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`scheduled_date` text,
	`completion_date` text,
	`estimated_cost` real,
	`actual_cost` real,
	`service_provider_id` integer,
	`notes` text,
	`attachment_ids` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`payment_id` integer NOT NULL,
	`tenant_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`send_date` text NOT NULL,
	`sent` integer DEFAULT 0,
	`sent_at` text,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`delivery_status` text,
	`retry_count` integer DEFAULT 0,
	`notification_method` text DEFAULT 'email',
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`property_id` integer,
	`user_id` integer NOT NULL,
	`amount` real NOT NULL,
	`due_date` text NOT NULL,
	`period_start_date` text,
	`period_end_date` text,
	`date_paid` text,
	`status` text DEFAULT 'pending',
	`payment_method` text,
	`transaction_id` integer,
	`reminders_sent` integer DEFAULT 0,
	`last_reminder_date` text,
	`attachment_id` integer,
	`is_recurring` integer DEFAULT 0,
	`payment_category` text DEFAULT 'rent',
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `paypal_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`paypal_order_id` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `paypal_orders_paypal_order_id_unique` ON `paypal_orders` (`paypal_order_id`);--> statement-breakpoint
CREATE TABLE `properties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`postal_code` text NOT NULL,
	`country` text DEFAULT 'Germany',
	`units` integer DEFAULT 1,
	`acquisition_date` text,
	`purchase_price` integer,
	`current_value` integer
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`order` integer NOT NULL,
	`active` integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `service_providers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`specialty` text,
	`hourly_rate` real,
	`is_preferred` integer DEFAULT 0,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shared_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`file_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`is_public` integer DEFAULT 0,
	`document_type` text,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `survey_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text,
	`responses` text NOT NULL,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `tax_years` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`year` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_closed` integer DEFAULT 0 NOT NULL,
	`total_income` real DEFAULT 0 NOT NULL,
	`total_expenses` real DEFAULT 0 NOT NULL,
	`net_income` real DEFAULT 0 NOT NULL,
	`tax_rate` real,
	`estimated_tax` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tenant_application_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`file_id` integer NOT NULL,
	`document_type` text NOT NULL,
	`verified` integer DEFAULT 0,
	`verification_date` text,
	`verification_notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `tenant_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`property_id` integer NOT NULL,
	`applicant_name` text NOT NULL,
	`applicant_email` text NOT NULL,
	`applicant_phone` text,
	`desired_move_in_date` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`monthly_income` real,
	`credit_score` integer,
	`background_check_complete` integer DEFAULT 0,
	`background_check_passed` integer,
	`notes` text,
	`decision_date` text,
	`decision_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `tenant_credentials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`last_login` text,
	`active` integer DEFAULT 1,
	`reset_token` text,
	`reset_token_expiry` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_credentials_username_unique` ON `tenant_credentials` (`username`);--> statement-breakpoint
CREATE TABLE `tenant_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`document_id` integer NOT NULL,
	`viewed` integer DEFAULT 0,
	`viewed_at` text,
	`acknowledged` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `tenant_ratings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`category` text,
	`comment` text,
	`is_private` integer DEFAULT 1,
	`anonymous` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer,
	`user_id` integer NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text,
	`date_of_birth` text,
	`id_number` text,
	`employment_status` text DEFAULT 'employed',
	`employer_name` text,
	`employer_phone` text,
	`occupation` text,
	`monthly_income` integer,
	`employment_duration` text,
	`reference1_name` text,
	`reference1_relationship` text,
	`reference1_phone` text,
	`reference1_email` text,
	`reference2_name` text,
	`reference2_relationship` text,
	`reference2_phone` text,
	`reference2_email` text,
	`account_holder` text,
	`bank_name` text,
	`account_number` text,
	`iban` text,
	`bic` text,
	`payment_method` text DEFAULT 'bank_transfer',
	`move_in_date` text,
	`lease_start_date` text,
	`lease_end_date` text,
	`lease_duration` text DEFAULT '1_year',
	`custom_duration` text,
	`rent_amount` integer,
	`deposit_amount` integer,
	`pet_policy` text DEFAULT 'case_by_case',
	`has_pets` integer DEFAULT 0,
	`pet_details` text,
	`agree_to_terms` integer DEFAULT 0,
	`agree_to_rules` integer DEFAULT 0,
	`agree_to_privacy_policy` integer DEFAULT 0,
	`signature` text,
	`onboarding_completed` integer DEFAULT 0,
	`active` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `transaction_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`color` text,
	`is_default` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`property_id` integer,
	`category_id` integer NOT NULL,
	`bank_account_id` integer,
	`amount` real NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`type` text NOT NULL,
	`payment_method` text,
	`reference` text,
	`notes` text,
	`recurring` integer DEFAULT 0 NOT NULL,
	`recurring_interval` text,
	`attachment_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uploaded_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`filename` text NOT NULL,
	`file_type` text NOT NULL,
	`file_category` text,
	`upload_date` text DEFAULT CURRENT_TIMESTAMP,
	`processed` integer DEFAULT 0,
	`extracted_data` text,
	`processing_status` text,
	`processing_error` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`email` text NOT NULL,
	`full_name` text,
	`is_admin` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`onboarding_completed` integer DEFAULT 0,
	`tier` text,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`stripe_payment_intent_id` text,
	`preferred_payment_gateway` text,
	`is_crowdfunding_contributor` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `waiting_list` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`full_name` text,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `waiting_list_email_unique` ON `waiting_list` (`email`);