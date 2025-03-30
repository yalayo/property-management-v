-- Cloudflare D1 Schema Migration
-- This migration creates the initial schema for the landlord property management system

-- Users Table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT,
  fullName TEXT,
  isAdmin BOOLEAN DEFAULT FALSE,
  onboardingCompleted BOOLEAN DEFAULT FALSE,
  tier TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  stripeCustomerId TEXT,
  stripeSubscriptionId TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank Accounts Table
CREATE TABLE bank_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  accountName TEXT NOT NULL,
  accountNumber TEXT NOT NULL,
  bankName TEXT NOT NULL,
  routingNumber TEXT,
  iban TEXT,
  bic TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Bank Statements Table
CREATE TABLE bank_statements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bankAccountId INTEGER NOT NULL,
  statementDate DATE NOT NULL,
  fileName TEXT NOT NULL,
  filePath TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processingDate TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bankAccountId) REFERENCES bank_accounts(id)
);

-- Transactions Table
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bankStatementId INTEGER NOT NULL,
  transactionDate DATE NOT NULL, 
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'EUR',
  type TEXT NOT NULL,
  category TEXT,
  tenant TEXT,
  property TEXT,
  processed BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bankStatementId) REFERENCES bank_statements(id)
);

-- Tenants Table
CREATE TABLE tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  leaseStartDate DATE,
  leaseEndDate DATE,
  monthlyRent REAL,
  securityDeposit REAL,
  paymentDueDay INTEGER,
  portalAccess BOOLEAN DEFAULT FALSE,
  portalUsername TEXT,
  portalPassword TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Properties Table
CREATE TABLE properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  units INTEGER DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Tenant Payments Table
CREATE TABLE tenant_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId INTEGER NOT NULL,
  amount REAL NOT NULL,
  dueDate DATE NOT NULL,
  paidDate DATE,
  isPaid BOOLEAN DEFAULT FALSE,
  isLate BOOLEAN DEFAULT FALSE,
  reminderSent BOOLEAN DEFAULT FALSE,
  reminderDate DATE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);

-- Documents Table
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  tenantId INTEGER,
  name TEXT NOT NULL,
  filePath TEXT NOT NULL,
  fileType TEXT NOT NULL,
  isPublic BOOLEAN DEFAULT FALSE,
  uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);

-- Tenant Ratings Table
CREATE TABLE tenant_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  ratedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);

-- PayPal Orders Table
CREATE TABLE paypal_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  orderId TEXT NOT NULL,
  status TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'EUR',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completedAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Payment Gateway Preferences Table
CREATE TABLE payment_gateway_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL UNIQUE,
  preferredGateway TEXT,
  lastUsedGateway TEXT,
  roundRobinEnabled BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Surveys Table
CREATE TABLE surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  propertyCount INTEGER,
  tenantCount INTEGER,
  painPoints TEXT,
  currentSolution TEXT,
  desiredFeatures TEXT,
  budgetRange TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wait List Table
CREATE TABLE wait_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  fullName TEXT,
  tier TEXT,
  signupDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial admin user
INSERT INTO users (username, password, email, isAdmin, onboardingCompleted, tier, isActive)
VALUES ('admin', '$argon2id$v=19$m=65536,t=3,p=4$TDnm2CdTofnLx7YFXvdw8A$2L8qNgi4X5oQz+MecbPVdvRZq9zJB/Z8ij+NKDmGbAM', 'admin@example.com', TRUE, TRUE, 'admin', TRUE);