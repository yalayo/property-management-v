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

  // Initialize HTTP server
  const httpServer = createServer(app);
  return httpServer;
}