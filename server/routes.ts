import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertPropertySchema, 
  insertTenantSchema, 
  insertPaymentSchema, 
  insertSurveyResponseSchema, 
  insertWaitingListSchema,
  surveySubmissionSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { ZodError } from "zod";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import Stripe from "stripe";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
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
  app.get("/api/me", handleErrors(async (req, res) => {
    // In production, this would check session cookies to verify if user is logged in
    // Here we'll use a mock user for demonstration purposes
    
    // If the user is not logged in, return 401 unauthorized
    // For development purposes, we're returning a mock user
    // In real app, replace this with actual authentication logic
    const isLoggedIn = req.query.forceLogin === 'true'; // For testing - add ?forceLogin=true to simulate logged in
    
    if (isLoggedIn) {
      const mockUser = await storage.getUser(1); // Get the first user from DB
      if (mockUser) {
        return res.json(mockUser);
      }
    }
    
    // Unauthorized if not logged in or no user found
    return res.status(401).json({ message: "Not authenticated" });
  }));

  // Admin endpoints
  app.get("/api/admin/survey-analytics", handleErrors(async (req, res) => {
    // In a real app, we would authenticate admin access here
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

  app.get("/api/admin/waiting-list", handleErrors(async (req, res) => {
    // In a real app, we would authenticate admin access here
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
