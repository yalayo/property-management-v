import type { Express, Response } from "express";
import type { Request as ExpressRequest } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { 
  insertUserSchema, 
  insertPropertySchema, 
  insertTenantSchema, 
  insertPaymentSchema, 
  insertSurveyResponseSchema, 
  insertWaitingListSchema,
  surveySubmissionSchema,
  users
} from "@shared/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { ZodError } from "zod";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import Stripe from "stripe";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Session } from "express-session";

// Extend Express Request type to include session
interface Request extends ExpressRequest {
  session: Session & {
    user?: {
      id: number;
      username: string;
      email: string;
      fullName?: string;
      isAdmin: boolean;
      hasCompletedOnboarding?: boolean;
      subscriptionType?: string;
      subscriptionStatus?: string;
    };
    destroy(callback: (err: any) => void): void;
  };
}
import { extractDataFromFile } from "./services/gemini";

// Extend Express Request to include authentication properties
declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: any;
    }
  }
}

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, "../uploads"));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  })
});

// Initialize Stripe if the key exists
let stripe: Stripe | undefined;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16" as any, // Force type to avoid version mismatch issues
  });
}

// Create the uploads directory if it doesn't exist
async function ensureUploadsDir() {
  const uploadsDir = path.join(__dirname, "../uploads");
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create uploads directory:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  await ensureUploadsDir();

  // Error handling middleware
  const handleErrors = (fn: (req: Request, res: Response) => Promise<any>) => {
    return async (req: Request, res: Response) => {
      try {
        await fn(req, res);
      } catch (error) {
        console.error("API error:", error);
        if (error instanceof ZodError) {
          return res.status(400).json({ 
            message: "Validation error", 
            errors: fromZodError(error).message 
          });
        }
        res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
      }
    };
  };

  // Survey endpoints
  app.get("/api/questions", handleErrors(async (req, res) => {
    const questions = await storage.getActiveQuestions();
    res.json(questions);
  }));

  app.post("/api/survey", handleErrors(async (req, res) => {
    const data = surveySubmissionSchema.parse(req.body);
    const surveyResponse = await storage.createSurveyResponse({
      email: data.email || null,
      responses: data.responses
    });
    res.json(surveyResponse);
  }));

  // Waiting list endpoints
  app.post("/api/waiting-list", handleErrors(async (req, res) => {
    const validatedData = insertWaitingListSchema.parse(req.body);
    const waitingListEntry = await storage.addToWaitingList(validatedData);
    res.json(waitingListEntry);
  }));

  app.get("/api/waiting-list/check", handleErrors(async (req, res) => {
    const email = z.string().email().parse(req.query.email);
    const exists = await storage.isEmailInWaitingList(email);
    res.json({ exists });
  }));

  // Authentication endpoints
  app.post("/api/login", handleErrors(async (req, res) => {
    const { username, password } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    
    // Get user by username
    const user = await storage.getUserByUsername(username);
    
    // Check if user exists and password matches
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    
    // In a real application, we would set up a session with an encrypted cookie
    // For simplicity in this demo, we'll use a simple session
    if (!req.session) {
      // Initialize session if it doesn't exist
      req.session = {} as any;
    }
    
    // Store user info in session (excluding password)
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      subscriptionType: user.subscriptionType,
      subscriptionStatus: user.subscriptionStatus
    };
    
    // Return user data (without password)
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      subscriptionType: user.subscriptionType,
      subscriptionStatus: user.subscriptionStatus
    });
  }));
  
  app.post("/api/admin/login", handleErrors(async (req, res) => {
    const { username, password } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    
    // Get user by username
    const user = await storage.getUserByUsername(username);
    
    // Check if user exists, password matches, and user is an admin
    if (!user || user.password !== password || !user.isAdmin) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }
    
    // In a real application, we would set up a session with an encrypted cookie
    // For simplicity in this demo, we'll use a simple session
    if (!req.session) {
      // Initialize session if it doesn't exist
      req.session = {} as any;
    }
    
    // Store user info in session (excluding password)
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      isAdmin: user.isAdmin
    };
    
    // Return user data (without password)
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      isAdmin: user.isAdmin
    });
  }));
  
  app.post("/api/logout", handleErrors(async (req, res) => {
    // Clear the session
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.json({ success: true, message: "Logged out successfully" });
      });
    } else {
      res.json({ success: true, message: "No active session" });
    }
  }));
  
  app.get("/api/me", handleErrors(async (req, res) => {
    // Check if user is logged in via session
    if (req.session && req.session.user) {
      return res.json(req.session.user);
    }
    
    // For development testing with query parameter
    const isForceLogin = req.query.forceLogin === 'true';
    if (isForceLogin) {
      const mockUser = await storage.getUser(1); // Get the first user from DB
      if (mockUser) {
        return res.json({
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          fullName: mockUser.fullName,
          isAdmin: mockUser.isAdmin,
          hasCompletedOnboarding: mockUser.hasCompletedOnboarding,
          subscriptionType: mockUser.subscriptionType,
          subscriptionStatus: mockUser.subscriptionStatus
        });
      }
    }
    
    // Unauthorized if not logged in or no user found
    return res.status(401).json({ message: "Not authenticated" });
  }));

  // Admin endpoints
  // Middleware to check if user is admin
  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (!req.session || !req.session.user || !req.session.user.isAdmin) {
      return res.status(403).json({ message: "Access denied: Admin privileges required" });
    }
    next();
  };
  
  // Admin dashboard data endpoint
  app.get("/api/admin/dashboard", isAdmin, handleErrors(async (req, res) => {
    // Get summary statistics for admin dashboard
    const totalUsers = await storage.getUserCount();
    const totalSurveyResponses = await storage.getSurveyResponseCount();
    const totalWaitingList = await storage.getWaitingListCount();
    
    res.json({
      totalUsers,
      totalSurveyResponses,
      totalWaitingList,
      lastUpdated: new Date().toISOString()
    });
  }));
  
  app.get("/api/admin/survey-analytics", isAdmin, handleErrors(async (req, res) => {
    const analytics = await storage.getSurveyAnalytics();
    const questions = await storage.getAllQuestions();
    
    const enrichedAnalytics = analytics.map(stat => {
      const question = questions.find(q => q.id === stat.questionId);
      return {
        ...stat,
        questionText: question?.text || `Question ${stat.questionId}`,
        totalResponses: stat.yesCount + stat.noCount,
        yesPercentage: stat.yesCount + stat.noCount > 0 
          ? Math.round((stat.yesCount / (stat.yesCount + stat.noCount)) * 100) 
          : 0
      };
    });
    
    res.json(enrichedAnalytics);
  }));

  app.get("/api/admin/survey-responses", isAdmin, handleErrors(async (req, res) => {
    const responses = await storage.getSurveyResponses();
    const questions = await storage.getAllQuestions();
    
    // Enrich responses with question text for better readability
    const enrichedResponses = responses.map(response => {
      const parsedResponses = typeof response.responses === 'string' ? 
        JSON.parse(response.responses) : response.responses;
      
      const enrichedResponsesData = Array.isArray(parsedResponses) ? 
        parsedResponses.map((resp: any) => {
          const question = questions.find(q => q.id === resp.questionId);
          return {
            ...resp,
            questionText: question?.text || `Question ${resp.questionId}`
          };
        }) : [];
      
      return {
        ...response,
        enrichedResponses: enrichedResponsesData
      };
    });
    
    res.json(enrichedResponses);
  }));

  app.get("/api/admin/waiting-list", isAdmin, handleErrors(async (req, res) => {
    const waitingList = await storage.getWaitingList();
    res.json(waitingList);
  }));

  // File upload endpoints
  app.post("/api/upload", upload.single("file"), handleErrors(async (req, res) => {
    // In a real app, we would authenticate the user and get their ID
    const userId = 1; // Mock user ID for now
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const fileType = path.extname(req.file.originalname).substring(1).toLowerCase();
    
    // Check if file type is supported
    const supportedTypes = ['xlsx', 'xls', 'csv', 'pdf', 'doc', 'docx', 'txt'];
    if (!supportedTypes.includes(fileType)) {
      return res.status(400).json({ 
        message: `Unsupported file type: ${fileType}. Supported types are: ${supportedTypes.join(', ')}` 
      });
    }
    
    const fileRecord = await storage.uploadFile({
      userId,
      filename: req.file.originalname,
      fileType: fileType,
    });
    
    // Process the file asynchronously
    (async () => {
      try {
        console.log(`Starting AI data extraction for file: ${fileRecord.filename} (${fileType})`);
        
        // Extract data using Google Gemini
        const extractedData = await extractDataFromFile(
          req.file!.path,
          fileType
        );
        
        // Update the file record with the extracted data
        await storage.updateFileData(fileRecord.id, { 
          processed: true,
          data: extractedData
        });
        
        // If it's a bank statement with transactions, import them into the accounting system
        if (extractedData?.document_type === 'bank_statement' && Array.isArray(extractedData.transactions)) {
          try {
            const userId = fileRecord.userId;
            console.log(`Importing ${extractedData.transactions.length} transactions from bank statement`);
            
            // If we have bank account information, check if we already have this account
            let bankAccountId = null;
            if (extractedData.bank_name && extractedData.account_number) {
              const bankAccounts = await storage.getBankAccountsByUserId(userId);
              const existingAccount = bankAccounts.find(account => 
                account.bankName === extractedData.bank_name && 
                account.accountNumber?.includes(extractedData.account_number)
              );
              
              if (existingAccount) {
                bankAccountId = existingAccount.id;
              } else {
                // Create a new bank account
                const newAccount = await storage.createBankAccount({
                  userId,
                  bankName: extractedData.bank_name,
                  accountName: `${extractedData.bank_name} Account`,
                  accountNumber: extractedData.account_number,
                  currency: 'EUR', // Default to EUR for German bank accounts
                  currentBalance: 0, // Will need to be updated later
                  isDefault: bankAccounts.length === 0 // Make it default if it's the first one
                });
                bankAccountId = newAccount.id;
              }
            }
            
            // Get all categories to match against
            const categories = await storage.getTransactionCategoriesByUserId(userId);
            
            // Process each transaction
            for (const transaction of extractedData.transactions) {
              // Skip if required fields are missing
              if (!transaction.date || !transaction.amount || !transaction.description || !transaction.type) {
                console.log('Skipping transaction due to missing required fields:', transaction);
                continue;
              }
              
              // Find matching category or use default
              let categoryId = null;
              if (transaction.category) {
                const matchedCategory = categories.find(cat => 
                  cat.name.toLowerCase() === transaction.category.toLowerCase() &&
                  cat.type === transaction.type
                );
                if (matchedCategory) {
                  categoryId = matchedCategory.id;
                } else {
                  // Use the first category of the right type (income/expense)
                  const defaultCategory = categories.find(cat => cat.type === transaction.type && cat.isDefault);
                  if (defaultCategory) categoryId = defaultCategory.id;
                }
              }
              
              // Create the transaction
              await storage.createTransaction({
                userId,
                date: transaction.date,
                description: transaction.description,
                amount: Math.abs(transaction.amount), // Ensure positive amount
                type: transaction.type,
                categoryId: categoryId || 0, // Default to 0 if null to avoid type issues
                propertyId: null, // No property info from bank statement
                bankAccountId: bankAccountId || null, // Handle possible null
                reference: transaction.reference || null,
                paymentMethod: 'bank_transfer',
                notes: `Imported from bank statement: ${fileRecord.filename}`
              });
            }
            
            console.log(`Successfully imported transactions from bank statement`);
          } catch (importError) {
            console.error('Error importing transactions from bank statement:', importError);
          }
        }
        
        console.log(`Data extraction completed for file: ${fileRecord.filename}`);
      } catch (error) {
        console.error(`Error processing file ${fileRecord.filename}:`, error);
        // Mark as processed but with error
        await storage.updateFileData(fileRecord.id, { 
          processed: true,
          data: { 
            error: error instanceof Error ? error.message : "Unknown error during extraction",
            processingFailed: true
          }
        });
      }
    })();
    
    res.json({ 
      id: fileRecord.id,
      filename: fileRecord.filename,
      fileType: fileType,
      message: "File uploaded successfully and is being processed with AI" 
    });
  }));

  app.get("/api/files", handleErrors(async (req, res) => {
    // In a real app, we would authenticate the user and get their ID
    const userId = 1; // Mock user ID for now
    const files = await storage.getFilesByUserId(userId);
    res.json(files);
  }));

  // Property management endpoints
  app.post("/api/properties", handleErrors(async (req, res) => {
    // In a real app, we would authenticate the user and get their ID
    const userId = 1; // Mock user ID for now
    const propertyData = insertPropertySchema.parse({
      ...req.body,
      userId
    });
    
    const property = await storage.createProperty(propertyData);
    res.json(property);
  }));

  app.get("/api/properties", handleErrors(async (req, res) => {
    // In a real app, we would authenticate the user and get their ID
    const userId = 1; // Mock user ID for now
    const properties = await storage.getPropertiesByUserId(userId);
    res.json(properties);
  }));

  // Tenant endpoints
  app.post("/api/tenants", handleErrors(async (req, res) => {
    // In a real app, we would authenticate the user and get their ID
    const userId = 1; // Mock user ID for now
    const tenantData = insertTenantSchema.parse({
      ...req.body,
      userId
    });
    
    const tenant = await storage.createTenant(tenantData);
    res.json(tenant);
  }));

  app.get("/api/tenants", handleErrors(async (req, res) => {
    // In a real app, we would authenticate the user and get their ID
    const userId = 1; // Mock user ID for now
    const tenants = await storage.getTenantsByUserId(userId);
    res.json(tenants);
  }));

  app.get("/api/properties/:propertyId/tenants", handleErrors(async (req, res) => {
    const propertyId = parseInt(req.params.propertyId);
    const tenants = await storage.getTenantsByPropertyId(propertyId);
    res.json(tenants);
  }));

  // Payment endpoints
  app.post("/api/payments", handleErrors(async (req, res) => {
    const paymentData = insertPaymentSchema.parse(req.body);
    const payment = await storage.createPayment(paymentData);
    res.json(payment);
  }));

  app.get("/api/tenants/:tenantId/payments", handleErrors(async (req, res) => {
    const tenantId = parseInt(req.params.tenantId);
    const payments = await storage.getPaymentsByTenantId(tenantId);
    res.json(payments);
  }));

  app.get("/api/late-payments", handleErrors(async (req, res) => {
    // In a real app, we would authenticate the user and get their ID
    const userId = 1; // Mock user ID for now
    const latePayers = await storage.getLatePayers(userId);
    res.json(latePayers);
  }));

  // Stripe payment endpoints
  if (stripe) {
    app.post("/api/create-payment-intent", handleErrors(async (req, res) => {
      const { amount, tier } = req.body;
      
      // Validate amount based on tier
      let validatedAmount: number;
      switch (tier) {
        case 'done_for_you':
          validatedAmount = 3500; // €35 in cents
          break;
        case 'done_with_you':
          validatedAmount = 270000; // €2,700 in cents
          break;
        case 'done_by_you':
          validatedAmount = 95000; // €950 in cents
          break;
        case 'crowdfunding':
          validatedAmount = 37000; // €370 in cents
          break;
        default:
          return res.status(400).json({ message: "Invalid tier selected" });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: validatedAmount,
        currency: "eur",
        // Add metadata for tracking
        metadata: {
          tier
        }
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    }));

    app.post("/api/create-subscription", handleErrors(async (req, res) => {
      // In a real app, we would authenticate the user and get their details
      const { email, name } = req.body;
      
      try {
        // Create customer
        const customer = await stripe.customers.create({
          email,
          name,
        });
        
        // Create subscription (recurring payment)
        // This assumes you've created a price object in your Stripe dashboard
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{
            price: process.env.STRIPE_PRICE_ID || 'price_monthly_subscription',
          }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });
        
        // @ts-ignore - TypeScript doesn't know about the expanded field
        const clientSecret = subscription.latest_invoice?.payment_intent?.client_secret;
        
        res.json({
          subscriptionId: subscription.id,
          clientSecret,
        });
      } catch (error) {
        console.error("Stripe error:", error);
        res.status(400).json({ 
          message: error instanceof Error ? error.message : "Failed to create subscription" 
        });
      }
    }));

    // Post-payment registration endpoint
    app.post("/api/register-after-payment", handleErrors(async (req, res) => {
      const { username, fullName, email, password, paymentIntentId, tier } = req.body;
      
      // Validate required fields
      if (!username || !email || !password || !paymentIntentId || !tier) {
        return res.status(400).json({ message: "Missing required registration fields" });
      }

      try {
        // Verify the payment intent actually exists and was successful
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== 'succeeded') {
          return res.status(400).json({ 
            message: "Payment verification failed. Please contact support." 
          });
        }
        
        // Check if user already exists with this email or username
        const existingUserByEmail = await storage.getUserByEmail(email);
        if (existingUserByEmail) {
          return res.status(400).json({ message: "Email already registered" });
        }
        
        const existingUserByUsername = await storage.getUserByUsername(username);
        if (existingUserByUsername) {
          return res.status(400).json({ message: "Username already taken" });
        }
        
        // Create the user
        const newUser = await storage.createUser({
          username,
          password, // In a real app, this would be hashed
          email,
          fullName: fullName || null
        });
        
        // Update user with subscription information
        const subscriptionType = tier;
        const subscriptionStatus = 'active';
        
        // For payment intent, we don't have a customer ID, but we can create one
        const customer = await stripe.customers.create({
          email,
          name: fullName || username,
          metadata: {
            userId: newUser.id.toString()
          }
        });
        
        // Update user with Stripe customer ID and subscription details
        const updatedUser = await storage.updateUserStripeInfo(newUser.id, {
          customerId: customer.id,
          subscriptionId: tier === 'done_for_you' ? 'pending_subscription' : 'one_time_payment'
        });
        
        // Create default categories for the new user
        await storage.createDefaultTransactionCategories(newUser.id);
        
        // In a real app, you'd set up a session here
        res.status(201).json({ 
          message: "User registered successfully",
          user: { 
            id: updatedUser.id, 
            username: updatedUser.username, 
            email: updatedUser.email 
          }
        });
      } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ 
          message: error instanceof Error ? error.message : "Registration failed" 
        });
      }
    }));
  }

  // Onboarding wizard endpoint
  app.post("/api/onboarding", handleErrors(async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.user.id;
    
    // Get the onboarding data from the request body
    const {
      firstName,
      lastName,
      email,
      phone,
      numberOfProperties,
      propertyTypes,
      mainPropertyAddress,
      bankName,
      iban,
      taxId,
      monthlyRentCollection,
      preferredCommunication,
      receiveReports,
      automaticReminders,
      additionalNotes,
    } = req.body;
    
    // In a real app, we would save all this data to the user's profile
    // For now, just log it and mark onboarding as complete
    console.log("Onboarding data received:", {
      userId,
      firstName,
      lastName,
      email,
      phone,
      numberOfProperties,
      propertyTypes,
      mainPropertyAddress,
      bankName,
      iban: iban.substring(0, 6) + "..." + iban.substring(iban.length - 4), // Mask IBAN for privacy
      taxId: taxId ? taxId.substring(0, 2) + "..." + taxId.substring(taxId.length - 2) : null, // Mask taxId
      monthlyRentCollection,
      preferredCommunication,
      receiveReports,
      automaticReminders,
      additionalNotes,
    });
    
    // Mark onboarding as completed
    const updatedUser = await storage.updateUserOnboardingStatus(userId, true);
    
    // Return success
    res.json({ 
      success: true, 
      message: "Onboarding completed successfully",
      user: updatedUser
    });
  }));
  
  // Simplified complete-onboarding endpoint
  app.post("/api/complete-onboarding", handleErrors(async (req, res) => {
    // In a real app, we would authenticate the user
    // For demo purposes, we'll use a mock user ID
    const userId = 1; // Mock user ID
    
    // Mark onboarding as completed
    const updatedUser = await storage.updateUserOnboardingStatus(userId, true);
    
    // Return success
    res.json({ 
      success: true, 
      message: "Onboarding marked as completed",
      user: updatedUser
    });
  }));

  const httpServer = createServer(app);
  return httpServer;
}
