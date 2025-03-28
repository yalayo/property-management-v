import type { Express, Response, NextFunction } from "express";
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

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
};

// Admin check middleware
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.session || !req.session.user || !req.session.user.isAdmin) {
    return res.status(403).json({ message: "Access denied: Admin privileges required" });
  }
  next();
};

// Helper for async request handling
const asyncHandler = (fn: Function) => (req: ExpressRequest, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import Stripe from "stripe"; 
import { stripe } from "./utils/stripeConfig";
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
      onboardingCompleted?: boolean;
      tier?: string;
      isActive?: boolean;
    };
    destroy(callback: (err: any) => void): void;
  };
}
import { extractDataFromFile } from "./services/gemini";
import { getChatbotResponse, clearChatHistory } from "./services/chatbot";
import { sendPaymentReminder, sendMonthlyLatePaymentReport } from "./services/emailService";

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
const __filename = fileURLToPath(new URL(import.meta.url));
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
      fullName: user.fullName || undefined,
      isAdmin: user.isAdmin || false,
      onboardingCompleted: user.onboardingCompleted || false,
      tier: user.tier || undefined,
      isActive: user.isActive || false
    };
    
    // Return user data (without password)
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
      onboardingCompleted: user.onboardingCompleted,
      tier: user.tier,
      isActive: user.isActive
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
      fullName: user.fullName || undefined,
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
          onboardingCompleted: mockUser.onboardingCompleted,
          tier: mockUser.tier,
          isActive: mockUser.isActive
        });
      }
    }
    
    // Unauthorized if not logged in or no user found
    return res.status(401).json({ message: "Not authenticated" });
  }));
  
  // Add the /api/user endpoint to match what the frontend expects
  app.get("/api/user", handleErrors(async (req, res) => {
    // Check if user is logged in via session
    if (req.session && req.session.user) {
      return res.json(req.session.user);
    }
    
    // Unauthorized if not logged in
    return res.status(401).json({ message: "Not authenticated" });
  }));
  

  
  // Update user tier
  app.post("/api/user/tier", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { tier } = req.body;
    
    if (!tier) {
      return res.status(400).json({ message: "Tier is required" });
    }
    
    try {
      const updatedUser = await storage.updateUserTier(userId, tier);
      
      // Update the session user data
      if (req.session && req.session.user) {
        req.session.user = {
          ...req.session.user,
          tier: updatedUser.tier,
          isActive: updatedUser.isActive
        };
      }
      
      res.status(200).json(updatedUser);
    } catch (error: any) {
      res.status(400).json({ message: `Error updating user tier: ${error.message}` });
    }
  }));
  
  // Alternative endpoint for updating tier (used by subscription management UI)
  app.post("/api/update-tier", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { tier } = req.body;
    
    if (!tier) {
      return res.status(400).json({ message: "Tier is required" });
    }
    
    try {
      const updatedUser = await storage.updateUserTier(userId, tier);
      
      // Update the session user data
      if (req.session && req.session.user) {
        req.session.user = {
          ...req.session.user,
          tier: updatedUser.tier,
          isActive: updatedUser.isActive
        };
      }
      
      res.status(200).json(updatedUser);
    } catch (error: any) {
      res.status(400).json({ message: `Error updating user tier: ${error.message}` });
    }
  }));
  
  // Properties API
  app.get("/api/properties", handleErrors(async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.session.user.id;
    const properties = await storage.getPropertiesByUserId(userId);
    res.json(properties);
  }));
  
  app.post("/api/properties", handleErrors(async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.session.user.id;
    const propertyData = req.body;
    const validatedData = insertPropertySchema.parse({
      ...propertyData,
      userId
    });
    
    const property = await storage.createProperty(validatedData);
    res.status(201).json(property);
  }));
  
  // Tenants API
  app.get("/api/tenants", handleErrors(async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.session.user.id;
    const tenants = await storage.getTenantsByUserId(userId);
    res.json(tenants);
  }));
  
  app.post("/api/tenants", handleErrors(async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.session.user.id;
    const tenantData = req.body;
    const validatedData = insertTenantSchema.parse({
      ...tenantData,
      userId
    });
    
    const tenant = await storage.createTenant(validatedData);
    res.status(201).json(tenant);
  }));
  
  // Late Payments API
  app.get("/api/late-payments", handleErrors(async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.session.user.id;
    const latePayers = await storage.getLatePayers(userId);
    res.json(latePayers);
  }));
  
  // Send payment reminder to tenant
  app.post("/api/tenants/:id/send-payment-reminder", handleErrors(async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.session.user.id;
    const tenantId = parseInt(req.params.id);
    const { message } = req.body; // Optional additional message
    
    // Verify tenant belongs to this user
    const tenant = await storage.getTenantById(tenantId);
    if (!tenant || tenant.userId !== userId) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    
    // Check if tenant has an email
    if (!tenant.email) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot send reminder: tenant has no email address" 
      });
    }
    
    // Get tenant's last payment
    const payments = await storage.getPaymentsByTenantId(tenantId);
    const lastPayment = payments.length > 0 ? 
      payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : 
      null;
    
    // Send the reminder email
    const result = await sendPaymentReminder(tenant, lastPayment, message);
    
    if (result.success) {
      res.json({ 
        success: true,
        message: "Payment reminder sent successfully",
        previewUrl: result.previewUrl // For testing purposes
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: `Failed to send reminder: ${result.error || "Unknown error"}` 
      });
    }
  }));
  
  // Generate and send monthly late payment report
  app.post("/api/generate-late-payment-report", handleErrors(async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.session.user.id;
    const user = await storage.getUser(userId);
    
    if (!user || !user.email) {
      return res.status(400).json({ 
        success: false, 
        message: "User has no email address for report delivery" 
      });
    }
    
    // Get list of late payers
    const latePayers = await storage.getLatePayers(userId);
    
    // Send the report
    const result = await sendMonthlyLatePaymentReport(user.email, latePayers);
    
    if (result.success) {
      res.json({ 
        success: true,
        message: "Late payment report generated and sent successfully",
        reportCount: latePayers.length,
        previewUrl: result.previewUrl // For testing purposes
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: `Failed to generate report: ${result.error || "Unknown error"}` 
      });
    }
  }));
  
  // Files API
  app.get("/api/files", handleErrors(async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.session.user.id;
    const files = await storage.getFilesByUserId(userId);
    res.json(files);
  }));

  // Admin endpoints
  
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
      } catch (error) {
        console.error("Error processing file:", error);
        // Update the file record with the error
        await storage.updateFileData(fileRecord.id, { 
          processed: true,
          error: error instanceof Error ? error.message : "Unknown error during processing"
        });
      }
    })();
    
    res.json({
      id: fileRecord.id,
      filename: fileRecord.filename,
      fileType: fileRecord.fileType,
      message: "File uploaded successfully. Processing has started."
    });
  }));

  // Onboarding wizard endpoint
  app.post("/api/onboarding", handleErrors(async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.user.id;
    const onboardingData = req.body;
    
    // Store onboarding data based on the step
    const updatedUser = await storage.updateUserOnboardingStatus(userId, false);
    
    res.json({
      success: true,
      message: "Onboarding data saved successfully",
      user: updatedUser
    });
  }));
  
  // Simplified complete-onboarding endpoint
  app.post("/api/complete-onboarding", handleErrors(async (req, res) => {
    // In a real app, we would authenticate the user
    // For demo purposes, we'll use a mock user ID
    const userId = 1; // Mock user ID
    
    // Mark onboarding as complete
    const updatedUser = await storage.updateUserOnboardingStatus(userId, true);
    
    res.json({
      success: true,
      message: "Onboarding completed successfully",
      user: updatedUser
    });
  }));

  // Chatbot API endpoints
  app.post("/api/chatbot/message", handleErrors(async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.session.user.id;
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: "Message is required" });
    }
    
    // Get user properties to provide context to the chatbot
    const properties = await storage.getPropertiesByUserId(userId);
    
    try {
      const response = await getChatbotResponse(userId, message, properties);
      res.json({ response });
    } catch (error: any) {
      console.error("Chatbot error:", error);
      res.status(500).json({ 
        message: "Error processing your message", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  }));
  
  app.post("/api/chatbot/reset", handleErrors(async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.session.user.id;
    
    // Clear chat history for the user
    clearChatHistory(userId);
    
    res.json({ message: "Chat history reset successfully" });
  }));
  
  // Stripe payment route for one-time payments
  app.post("/api/create-payment-intent", handleErrors(async (req, res) => {
    try {
      const { amount, tier } = req.body;
      
      // If this is a subscription (Done for You tier), handle differently
      if (tier === 'done_for_you') {
        // For subscriptions, we need to create a customer first if the user is logged in
        let customerId = null;
        
        if (req.isAuthenticated() && req.user) {
          // Check if user already has a customer ID
          if (req.user.stripeCustomerId) {
            customerId = req.user.stripeCustomerId;
          } else {
            // Create a new customer
            const customer = await stripe.customers.create({
              email: req.user.email,
              name: req.user.fullName || req.user.username,
            });
            customerId = customer.id;
            
            // Update user with the new customer ID
            await storage.updateStripeCustomerId(req.user.id, customer.id);
          }
        }
        
        // Create a subscription setup intent
        const setupIntent = await stripe.setupIntents.create({
          payment_method_types: ['card'],
          customer: customerId,
          usage: 'off_session',
          metadata: {
            tier: tier,
            isSubscription: true
          }
        });
        
        res.json({ 
          clientSecret: setupIntent.client_secret,
          isSubscription: true,
          setupIntentId: setupIntent.id
        });
      } else {
        // For one-time payments, create a regular payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: "eur",
          metadata: {
            tier: tier,
            isSubscription: false
          }
        });
        res.json({ 
          clientSecret: paymentIntent.client_secret, 
          isSubscription: false 
        });
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error creating payment intent: " + error.message });
    }
  }));
  
  // Create subscription after setup intent is complete
  app.post("/api/create-subscription", isAuthenticated, handleErrors(async (req, res) => {
    try {
      const { paymentMethodId } = req.body;
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ message: "User has no Stripe customer ID" });
      }
      
      // Attach the payment method to the customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId,
      });
      
      // Set as the default payment method
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      
      // Create the subscription - €35/month
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Done for You - Monthly Subscription',
                description: 'Monthly subscription for the Done for You plan',
              },
              unit_amount: 3500, // €35 in cents
              recurring: {
                interval: 'month',
              },
            },
          },
        ],
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });
      
      // Update user record with subscription ID
      await storage.updateUserStripeInfo(userId, {
        customerId: user.stripeCustomerId,
        subscriptionId: subscription.id
      });
      
      // Update user tier
      await storage.updateUserTier(userId, 'done_for_you');
      
      res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        success: true
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating subscription: " + error.message });
    }
  }));
  
  // User analytics endpoint
  app.get("/api/user/analytics", handleErrors(async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.session.user.id;
    
    // Sample data for now - in a real implementation, this would come from the database
    // This matches the format expected by the UserAnalytics component
    const monthlyIncome = [
      { name: 'Jan', income: 3200 },
      { name: 'Feb', income: 3200 },
      { name: 'Mar', income: 3200 },
      { name: 'Apr', income: 3400 },
      { name: 'May', income: 3400 },
      { name: 'Jun', income: 3400 },
    ];

    const expenseCategories = [
      { name: 'Maintenance', value: 450 },
      { name: 'Insurance', value: 180 },
      { name: 'Taxes', value: 380 },
      { name: 'Utilities', value: 120 },
      { name: 'Other', value: 75 },
    ];
    
    res.json({
      monthlyIncome,
      expenseCategories
    });
  }));
  
  // User registration after successful payment
  app.post("/api/register-after-payment", handleErrors(async (req, res) => {
    try {
      const { username, fullName, email, password, paymentIntentId, tier } = req.body;
      
      // Verify if this email is already registered
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Create new user record
      const userToCreate = {
        username,
        fullName,
        email,
        password, // In production, this should be hashed!
        isAdmin: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        onboardingCompleted: false,
        tier,
        stripePaymentIntentId: paymentIntentId,
      };
      
      const createdUser = await storage.createUser(userToCreate);
      
      // Return success without sending the full user object (for security)
      res.status(200).json({ 
        success: true, 
        message: "User registered successfully",
        userId: createdUser.id
      });
      
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Error during registration: " + error.message });
    }
  }));

  // Authentication middleware


  // Accounting Module - Bank Statement endpoints
  app.get("/api/bank-statements", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const statements = await storage.getBankStatementsByUserId(userId);
    res.status(200).json(statements);
  }));
  
  app.get("/api/bank-statements/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const statement = await storage.getBankStatementById(id);
    
    if (!statement) {
      return res.status(404).json({ message: "Bank statement not found" });
    }
    
    // Check if the statement belongs to the user
    if (statement.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to access this statement" });
    }
    
    res.status(200).json(statement);
  }));
  
  app.post("/api/bank-statements", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const statementData = req.body;
    
    // Validate using the schema
    try {
      // Add userId to the statement data
      const newStatement = await storage.createBankStatement({
        ...statementData,
        userId
      });
      
      res.status(201).json(newStatement);
    } catch (error: any) {
      res.status(400).json({ message: `Invalid bank statement data: ${error.message}` });
    }
  }));
  
  app.put("/api/bank-statements/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const statement = await storage.getBankStatementById(id);
    
    if (!statement) {
      return res.status(404).json({ message: "Bank statement not found" });
    }
    
    // Check if the statement belongs to the user
    if (statement.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to update this statement" });
    }
    
    try {
      const updatedStatement = await storage.updateBankStatement(id, req.body);
      res.status(200).json(updatedStatement);
    } catch (error: any) {
      res.status(400).json({ message: `Error updating bank statement: ${error.message}` });
    }
  }));
  
  app.delete("/api/bank-statements/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const statement = await storage.getBankStatementById(id);
    
    if (!statement) {
      return res.status(404).json({ message: "Bank statement not found" });
    }
    
    // Check if the statement belongs to the user
    if (statement.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to delete this statement" });
    }
    
    try {
      const success = await storage.deleteBankStatement(id);
      if (success) {
        res.status(200).json({ message: "Bank statement deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete bank statement" });
      }
    } catch (error: any) {
      res.status(500).json({ message: `Error deleting bank statement: ${error.message}` });
    }
  }));
  
  app.get("/api/bank-accounts/:id/statements", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const bankAccountId = parseInt(req.params.id);
    const statements = await storage.getBankStatementsByBankAccountId(bankAccountId);
    
    // Check if any statements were found
    if (statements.length === 0) {
      return res.status(200).json([]); // Return empty array instead of 404
    }
    
    // Check if the statements belong to the user (check the first one)
    if (statements[0].userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to access these statements" });
    }
    
    res.status(200).json(statements);
  }));
  
  app.post("/api/bank-statements/:id/process", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const statement = await storage.getBankStatementById(id);
    
    if (!statement) {
      return res.status(404).json({ message: "Bank statement not found" });
    }
    
    // Check if the statement belongs to the user
    if (statement.userId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to process this statement" });
    }
    
    try {
      // The extractedData would come from AI processing
      const extractedData = req.body.extractedData || {};
      const processedStatement = await storage.processStatement(id, extractedData);
      res.status(200).json(processedStatement);
    } catch (error: any) {
      res.status(500).json({ message: `Error processing bank statement: ${error.message}` });
    }
  }));

  // Initialize HTTP server
  const httpServer = createServer(app);
  return httpServer;
}