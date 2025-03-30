import express from 'express';
import { Env } from './types';
import { getRequestContext } from './vite';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';
import session from 'express-session';
import passport from 'passport';

// Create upload directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    },
  }),
});

// Create Express app instance
const app = express();

// Configure middleware
app.use(express.json());

// Configure session with appropriate store
const isProduction = process.env.NODE_ENV === 'production';
const sessionConfig: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
  store: storage.sessionStore,
};

if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Import and set up routes
import { registerRoutes } from './routes';
registerRoutes(app);

/**
 * Handle API requests by passing them through our Express app
 */
export async function handleApiRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Get the express context
  const { req, res, responsePromise } = getRequestContext(request);

  // Execute express handler
  app(req, res);

  // Return the express response
  return await responsePromise;
}