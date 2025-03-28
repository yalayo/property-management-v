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

  // Stripe payment route for one-time payments
  app.post("/api/create-payment-intent", handleErrors(async (req, res) => {
    try {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "eur",
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error creating payment intent: " + error.message });
    }
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

  // Initialize HTTP server
  const httpServer = createServer(app);
  return httpServer;
}