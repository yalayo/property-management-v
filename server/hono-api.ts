import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { Env } from './types';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as schema from '@shared/schema';
import { User } from '@shared/schema';
import { db } from './db-cf';
import { eq } from 'drizzle-orm';
import { getStorage } from './storage-init';
import { IStorage } from './storage';

// Session handling will be done via cookies and tokens rather than hono-session
// Implement crypto functions using Web Crypto API

// Define custom variables for Hono context
type Variables = {
  user: User;
};

// Create Hono app instance
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Simple cookie middleware to set auth cookies
app.use('*', async (c, next) => {
  // Continue without session middleware for now
  // API authentication will be handled via Bearer tokens
  await next();
});

// Helper functions for authentication using Web Crypto API
function generateRandomBytes(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password: string): Promise<string> {
  const salt = generateRandomBytes(16);
  const encoder = new TextEncoder();
  const passwordWithSalt = encoder.encode(password + salt);
  
  // Use SHA-256 for password hashing
  const hashBuffer = await crypto.subtle.digest('SHA-256', passwordWithSalt);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${hashHex}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split('.');
  const encoder = new TextEncoder();
  const passwordWithSalt = encoder.encode(supplied + salt);
  
  // Hash the supplied password with the stored salt
  const hashBuffer = await crypto.subtle.digest('SHA-256', passwordWithSalt);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Compare the hashes (constant-time comparison would be better)
  return hashHex === hashed;
}

// Session middleware (simplified for Workers)
const authMiddleware = async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ message: 'Not authenticated' }, 401);
  }
  
  const token = authHeader.split(' ')[1];
  // In a real implementation, you would validate the token
  // For now, we'll use a simple userId extraction
  try {
    const userId = parseInt(token, 10);
    if (isNaN(userId)) {
      throw new Error('Invalid token');
    }
    
    const storage = getStorage();
    const user = await storage.getUser(userId);
    if (!user) {
      return c.json({ message: 'User not found' }, 401);
    }
    
    // Add user to context
    c.set('user', user);
    await next();
  } catch (error) {
    return c.json({ message: 'Invalid token' }, 401);
  }
};

// Authentication routes
app.post('/api/register', zValidator('json', z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  email: z.string().email(),
  fullName: z.string().optional(),
})), async (c) => {
  const body = c.req.valid('json');
  const storage = getStorage();
  
  try {
    const existingUser = await storage.getUserByUsername(body.username);
    if (existingUser) {
      return c.json({ message: 'Username already exists' }, 400);
    }
    
    const user = await storage.createUser({
      ...body,
      password: await hashPassword(body.password),
    });
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    
    // In a real implementation, you would generate a JWT token here
    // For now, we'll use the user ID as a simple token
    return c.json({ 
      user: userWithoutPassword,
      token: user.id.toString() 
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ message: 'Failed to register user' }, 500);
  }
});

app.post('/api/login', zValidator('json', z.object({
  username: z.string(),
  password: z.string(),
})), async (c) => {
  const { username, password } = c.req.valid('json');
  const storage = getStorage();
  
  try {
    const user = await storage.getUserByUsername(username);
    if (!user || !(await comparePasswords(password, user.password))) {
      return c.json({ message: 'Invalid username or password' }, 401);
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    // In a real implementation, you would generate a JWT token here
    // For now, we'll use the user ID as a simple token
    return c.json({ 
      user: userWithoutPassword,
      token: user.id.toString() 
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ message: 'Failed to login' }, 500);
  }
});

app.get('/api/user', authMiddleware, async (c) => {
  const user = c.get('user');
  // Remove password from response
  const { password, ...userWithoutPassword } = user;
  return c.json(userWithoutPassword);
});

// Survey routes
app.get('/api/questions', async (c) => {
  const storage = getStorage();
  try {
    const questions = await storage.getActiveQuestions();
    return c.json(questions);
  } catch (error) {
    console.error('Failed to fetch questions:', error);
    return c.json({ message: 'Failed to fetch questions' }, 500);
  }
});

app.post('/api/survey', zValidator('json', z.object({
  responses: z.array(z.object({
    questionId: z.number(),
    answer: z.boolean(),
  })),
  email: z.string().email().optional(),
})), async (c) => {
  const body = c.req.valid('json');
  const storage = getStorage();
  
  try {
    const surveyResponse = await storage.createSurveyResponse(body);
    return c.json(surveyResponse, 201);
  } catch (error) {
    console.error('Failed to submit survey:', error);
    return c.json({ message: 'Failed to submit survey' }, 500);
  }
});

// Waiting list routes
app.post('/api/waiting-list', zValidator('json', z.object({
  email: z.string().email(),
  fullName: z.string().optional(),
})), async (c) => {
  const body = c.req.valid('json');
  const storage = getStorage();
  
  try {
    const isInList = await storage.isEmailInWaitingList(body.email);
    if (isInList) {
      return c.json({ message: 'Email already in waiting list' }, 400);
    }
    
    const entry = await storage.addToWaitingList(body);
    return c.json(entry, 201);
  } catch (error) {
    console.error('Failed to add to waiting list:', error);
    return c.json({ message: 'Failed to add to waiting list' }, 500);
  }
});

// Admin routes
app.get('/api/admin/survey-analytics', authMiddleware, async (c) => {
  const user = c.get('user');
  const storage = getStorage();
  
  if (!user.isAdmin) {
    return c.json({ message: 'Unauthorized' }, 403);
  }
  
  try {
    const analytics = await storage.getSurveyAnalytics();
    return c.json(analytics);
  } catch (error) {
    console.error('Failed to fetch survey analytics:', error);
    return c.json({ message: 'Failed to fetch survey analytics' }, 500);
  }
});

app.get('/api/admin/waiting-list', authMiddleware, async (c) => {
  const user = c.get('user');
  const storage = getStorage();
  
  if (!user.isAdmin) {
    return c.json({ message: 'Unauthorized' }, 403);
  }
  
  try {
    const waitingList = await storage.getWaitingList();
    return c.json(waitingList);
  } catch (error) {
    console.error('Failed to fetch waiting list:', error);
    return c.json({ message: 'Failed to fetch waiting list' }, 500);
  }
});

app.get('/api/admin/stats', authMiddleware, async (c) => {
  const user = c.get('user');
  const storage = getStorage();
  
  if (!user.isAdmin) {
    return c.json({ message: 'Unauthorized' }, 403);
  }
  
  try {
    const userCount = await storage.getUserCount();
    const surveyCount = await storage.getSurveyResponseCount();
    const waitingListCount = await storage.getWaitingListCount();
    
    return c.json({
      userCount,
      surveyCount,
      waitingListCount
    });
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    return c.json({ message: 'Failed to fetch admin stats' }, 500);
  }
});

// Stripe payment routes
app.post('/api/create-payment-intent', authMiddleware, zValidator('json', z.object({
  amount: z.number().positive(),
})), async (c) => {
  const { amount } = c.req.valid('json');
  const user = c.get('user');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    return c.json({ message: 'Stripe API key not configured' }, 500);
  }

  try {
    // Create a Stripe instance without require()
    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'amount': Math.round(amount * 100).toString(), // Convert to cents
        'currency': 'usd',
        'metadata[userId]': user.id.toString(),
      }),
    });
    
    const paymentIntent = await res.json();
    
    return c.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return c.json({ message: 'Failed to create payment intent' }, 500);
  }
});

// Property routes
app.post('/api/properties', authMiddleware, zValidator('json', z.object({
  name: z.string(),
  address: z.string(),
  city: z.string(),
  postalCode: z.string(),  // Changed from zipCode to postalCode to match schema
  country: z.string().optional(),
  units: z.number().optional(),
  acquisitionDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  currentValue: z.number().optional(),
})), async (c) => {
  const body = c.req.valid('json');
  const user = c.get('user');
  const storage = getStorage();
  
  try {
    // Convert string date to Date object if provided
    const acquisitionDate = body.acquisitionDate ? new Date(body.acquisitionDate) : undefined;
    
    const property = await storage.createProperty({
      ...body,
      acquisitionDate,
      userId: user.id,
    });
    
    return c.json(property, 201);
  } catch (error) {
    console.error('Failed to create property:', error);
    return c.json({ message: 'Failed to create property' }, 500);
  }
});

app.get('/api/properties', authMiddleware, async (c) => {
  const user = c.get('user');
  const storage = getStorage();
  
  try {
    const properties = await storage.getPropertiesByUserId(user.id);
    return c.json(properties);
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    return c.json({ message: 'Failed to fetch properties' }, 500);
  }
});

app.get('/api/properties/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const user = c.get('user');
  const storage = getStorage();
  
  try {
    const property = await storage.getPropertyById(id);
    
    if (!property) {
      return c.json({ message: 'Property not found' }, 404);
    }
    
    if (property.userId !== user.id && !user.isAdmin) {
      return c.json({ message: 'Unauthorized' }, 403);
    }
    
    return c.json(property);
  } catch (error) {
    console.error('Failed to fetch property:', error);
    return c.json({ message: 'Failed to fetch property' }, 500);
  }
});

// Tenant routes
app.post('/api/tenants', authMiddleware, zValidator('json', z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  propertyId: z.number().optional(),
})), async (c) => {
  const body = c.req.valid('json');
  const user = c.get('user');
  const storage = getStorage();
  
  try {
    // Validate property belongs to user if propertyId is provided
    if (body.propertyId) {
      const property = await storage.getPropertyById(body.propertyId);
      if (!property || property.userId !== user.id) {
        return c.json({ message: 'Invalid property' }, 400);
      }
    }
    
    const tenant = await storage.createTenant({
      ...body,
      userId: user.id,
    });
    
    return c.json(tenant, 201);
  } catch (error) {
    console.error('Failed to create tenant:', error);
    return c.json({ message: 'Failed to create tenant' }, 500);
  }
});

app.get('/api/tenants', authMiddleware, async (c) => {
  const user = c.get('user');
  const storage = getStorage();
  
  try {
    const tenants = await storage.getTenantsByUserId(user.id);
    return c.json(tenants);
  } catch (error) {
    console.error('Failed to fetch tenants:', error);
    return c.json({ message: 'Failed to fetch tenants' }, 500);
  }
});

app.get('/api/tenants/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const user = c.get('user');
  const storage = getStorage();
  
  try {
    const tenant = await storage.getTenantById(id);
    
    if (!tenant) {
      return c.json({ message: 'Tenant not found' }, 404);
    }
    
    if (tenant.userId !== user.id && !user.isAdmin) {
      return c.json({ message: 'Unauthorized' }, 403);
    }
    
    return c.json(tenant);
  } catch (error) {
    console.error('Failed to fetch tenant:', error);
    return c.json({ message: 'Failed to fetch tenant' }, 500);
  }
});

// Late payers route
app.get('/api/late-payers', authMiddleware, async (c) => {
  const user = c.get('user');
  const storage = getStorage();
  
  try {
    const latePayers = await storage.getLatePayers(user.id);
    return c.json(latePayers);
  } catch (error) {
    console.error('Failed to fetch late payers:', error);
    return c.json({ message: 'Failed to fetch late payers' }, 500);
  }
});

// Map additional API routes as needed
// This is where you'd add all your other routes from the Express app
// ...

export { app };