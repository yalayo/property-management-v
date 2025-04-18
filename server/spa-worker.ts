import { Env } from "./types";
import { ExecutionContext } from "@cloudflare/workers-types";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/d1";
import { initStorage } from './storage-init';

// SPA-compatible Worker that inlines critical CSS and avoids external assets
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // Initialize D1 database connection if available
    if (env.DB) {
      try {
        // Create Drizzle instance with schema
        const db = drizzle(env.DB, { schema });
        
        // Set DB instance in a global variable for access in other modules
        // @ts-ignore - making the DB available to our adapters
        globalThis.__D1_DB = db;
        
        // Store environment information to detect Cloudflare Worker environment
        // This allows us to avoid using setInterval in Cloudflare Workers
        globalThis.__IS_CLOUDFLARE_WORKER = true;
        
        // Initialize storage with CloudflareStorage implementation
        initStorage();
        
        console.log('SPA Worker: D1 database binding initialized successfully');
      } catch (error) {
        console.error('Failed to initialize D1 database in SPA worker:', error);
      }
    }
    const url = new URL(request.url);
    
    // API requests will be handled by a separate worker later
    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "API endpoints not yet implemented" }), { 
        status: 501, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    // Check both possible bindings: __STATIC_CONTENT (KV namespace) or ASSETS (site binding)
    const staticBinding = env.__STATIC_CONTENT || env.ASSETS;
    
    // Define regex patterns for our main asset types
    const assetPatterns = [
      { pattern: /^\/index\.html$/, regexSearch: /public\/index\.[a-f0-9]+\.html$/ },
      { pattern: /^\/index\.js$/, regexSearch: /^index\.[a-f0-9]+\.js$/ },
      { pattern: /^\/assets\/index\.css$/, regexSearch: /public\/assets\/index\.[a-f0-9]+\.css$/ },
      { pattern: /^\/assets\/index\.js$/, regexSearch: /public\/assets\/index\.[a-f0-9]+\.js$/ }
    ];
    
    // Function to find matching hashed asset using regex
    async function findHashedAsset(requestPath: string): Promise<string | null> {
      // First check if this is a standard pattern we recognize
      const matchingPattern = assetPatterns.find(p => p.pattern.test(requestPath));
      
      if (!matchingPattern) return null;
      
      // If we have the list function available, use it to search
      if (staticBinding && typeof staticBinding.list === 'function') {
        try {
          console.log(`Searching for assets matching ${matchingPattern.regexSearch}`);
          const listResult = await staticBinding.list();
          if (listResult && listResult.keys) {
            // Find first matching key
            const matchingKey = listResult.keys.find(key => 
              matchingPattern.regexSearch.test(key.name)
            );
            
            if (matchingKey) {
              console.log(`Found matching hashed asset: ${matchingKey.name}`);
              return matchingKey.name;
            }
          }
        } catch (error) {
          console.error('Error listing assets:', error);
        }
      }
      
      // Fallback to our last known hashed paths if list isn't available
      const fallbackPaths: Record<string, string> = {
        '/index.js': 'index.050e646218.js',
        '/assets/index.css': 'public/assets/index.440fa24244.css',
        '/assets/index.js': 'public/assets/index.d47fb2a45d.js',
        '/index.html': 'public/index.7831ed9bd0.html'
      };
      
      return fallbackPaths[requestPath] || null;
    }
    
    // Try to find and serve the asset with regex matching
    const hashedAssetPath = await findHashedAsset(url.pathname);
    if (staticBinding && hashedAssetPath) {
      try {
        console.log(`Mapped request for ${url.pathname} to hashed asset: ${hashedAssetPath}`);
        if (typeof staticBinding.fetch === 'function') {
          const response = await staticBinding.fetch(new Request(hashedAssetPath));
          if (response.ok) {
            console.log(`Successfully served hashed asset: ${hashedAssetPath}`);
            return response;
          }
        }
      } catch (err) {
        console.error(`Error fetching hashed asset ${hashedAssetPath}:`, err);
      }
    }
    
    // Check if requesting other static assets from KV store
    if (staticBinding && url.pathname !== "/" && url.pathname !== "" && url.pathname.includes(".")) {
      try {
        if (typeof staticBinding.fetch === 'function') {
          console.log(`Trying to fetch asset ${url.pathname} using binding: ${env.__STATIC_CONTENT ? '__STATIC_CONTENT' : 'ASSETS'}`);
          const assetResponse = await staticBinding.fetch(request);
          if (assetResponse.ok) {
            return assetResponse;
          }
        }
      } catch (err) {
        console.error(`Error fetching asset ${url.pathname}:`, err);
      }
      
      // If asset not found by direct path, check if it's a non-hashed version of a hashed file
      // Use the fallback paths from our findHashedAsset function
      const fallbackPaths: Record<string, string> = {
        '/index.js': 'index.050e646218.js',
        '/assets/index.css': 'public/assets/index.440fa24244.css',
        '/assets/index.js': 'public/assets/index.d47fb2a45d.js',
        '/index.html': 'public/index.7831ed9bd0.html'
      };
      
      for (const [standardPath, hashedPath] of Object.entries(fallbackPaths)) {
        if (url.pathname.endsWith(standardPath.split('/').pop() || '')) {
          try {
            console.log(`Trying hashed version ${hashedPath} for requested file ${url.pathname}`);
            if (typeof staticBinding.fetch === 'function') {
              const response = await staticBinding.fetch(new Request(hashedPath));
              if (response.ok) {
                console.log(`Found and serving hashed version: ${hashedPath}`);
                return response;
              }
            }
          } catch (err) {
            console.warn(`Error serving hashed version ${hashedPath}:`, err);
          }
        }
      }
    }
    
    // For the root path or client-side routes, try to serve index.html from KV
    if (staticBinding && (url.pathname === "/" || url.pathname === "" || !url.pathname.includes("."))) {
      // Always try the known index HTML first
      try {
        if (typeof staticBinding.fetch === 'function') {
          console.log(`Trying known index.html: public/index.7831ed9bd0.html`);
          const indexResponse = await staticBinding.fetch(new Request('public/index.7831ed9bd0.html'));
          if (indexResponse.ok) {
            console.log(`Found and serving known index.html`);
            return indexResponse;
          }
        }
      } catch (err) {
        console.warn(`Error trying known index.html:`, err);
      }
      
      // Fallback to other index paths
      try {
        // Try common paths for index.html
        const possiblePaths = [
          "index.html",
          "public/index.html",
          "index", 
          "public/index"
        ];
        
        for (const path of possiblePaths) {
          try {
            console.log(`Trying to fetch index at: ${path} using binding: ${env.__STATIC_CONTENT ? '__STATIC_CONTENT' : 'ASSETS'}`);
            if (typeof staticBinding.fetch === 'function') {
              const indexHtml = await staticBinding.fetch(new Request(path));
              if (indexHtml.ok) {
                console.log(`Found and serving index.html from: ${path}`);
                return indexHtml;
              }
            }
          } catch (err) {
            console.warn(`Error trying path ${path}:`, err);
            // Continue trying other paths
          }
        }
        
        // If specific paths didn't work, try to serve the default SPA index
        try {
          if (typeof staticBinding.fetch === 'function') {
            console.log('Trying to fetch root path /');
            const response = await staticBinding.fetch(new Request('/'));
            if (response.ok) {
              console.log('Successfully fetched root path, serving as index');
              return response;
            }
          }
        } catch (err) {
          console.error("Could not serve SPA index:", err);
        }
      } catch (err) {
        console.error("Error fetching index.html from KV:", err);
      }
    } else if (!staticBinding) {
      console.warn("No static content binding found: neither __STATIC_CONTENT nor ASSETS is available");
    }
    
    // If assets not found or any error, fall back to the inline HTML
    // Define a complete SPA HTML template with inlined CSS and minimal JavaScript
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PropManager - Property Management Solution</title>
  <meta name="description" content="The property management solution for German landlords">
  <style>
    /* Reset and base styles */
    *,*::before,*::after{box-sizing:border-box}
    body,h1,h2,h3,h4,p,figure,blockquote,dl,dd{margin:0}
    body{
      min-height:100vh;
      text-rendering:optimizeSpeed;
      line-height:1.5;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif;
      background-color:#f8fafc;
      color:#1e293b;
    }
    
    /* Layout */
    .container{
      width:100%;
      max-width:1200px;
      margin:0 auto;
      padding:0 1rem;
    }
    
    /* Header */
    header{
      background-color:#4f46e5;
      color:white;
      padding:1rem 0;
      box-shadow:0 2px 4px rgba(0,0,0,0.1);
    }
    .header-content{
      display:flex;
      justify-content:space-between;
      align-items:center;
    }
    .logo{
      font-size:1.5rem;
      font-weight:bold;
    }
    
    /* Navigation */
    nav ul{
      display:flex;
      gap:1.5rem;
      list-style:none;
      padding:0;
    }
    nav a{
      color:white;
      text-decoration:none;
      font-weight:500;
      transition:opacity 0.2s;
    }
    nav a:hover{
      opacity:0.8;
    }
    
    /* Hero section */
    .hero{
      padding:4rem 0;
      text-align:center;
      background-color:#4f46e5;
      color:white;
    }
    .hero h1{
      font-size:2.5rem;
      margin-bottom:1rem;
      line-height:1.2;
    }
    .hero p{
      font-size:1.25rem;
      max-width:600px;
      margin:0 auto 2rem;
      opacity:0.9;
    }
    
    /* Features */
    .features{
      padding:4rem 0;
      background-color:white;
    }
    .section-title{
      text-align:center;
      font-size:2rem;
      margin-bottom:3rem;
      color:#1e293b;
    }
    .features-grid{
      display:grid;
      grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));
      gap:2rem;
    }
    .feature-card{
      padding:1.5rem;
      border-radius:0.5rem;
      box-shadow:0 4px 6px rgba(0,0,0,0.05);
      transition:transform 0.3s, box-shadow 0.3s;
    }
    .feature-card:hover{
      transform:translateY(-5px);
      box-shadow:0 10px 15px rgba(0,0,0,0.1);
    }
    .feature-card h3{
      margin-bottom:0.75rem;
      color:#4f46e5;
    }
    
    /* CTA */
    .cta{
      padding:4rem 0;
      text-align:center;
      background-color:#f1f5f9;
    }
    .cta h2{
      font-size:2rem;
      margin-bottom:1.5rem;
    }
    .cta p{
      font-size:1.25rem;
      max-width:600px;
      margin:0 auto 2rem;
      color:#475569;
    }
    
    /* Buttons */
    .btn{
      display:inline-block;
      padding:0.75rem 1.5rem;
      background-color:#4f46e5;
      color:white;
      border:none;
      border-radius:0.375rem;
      font-weight:500;
      cursor:pointer;
      text-decoration:none;
      transition:background-color 0.2s;
    }
    .btn:hover{
      background-color:#4338ca;
    }
    .btn-outline{
      background-color:transparent;
      border:2px solid #4f46e5;
      color:#4f46e5;
    }
    .btn-outline:hover{
      background-color:#4f46e5;
      color:white;
    }
    
    /* Footer */
    footer{
      background-color:#1e293b;
      color:white;
      padding:3rem 0;
    }
    .footer-content{
      display:grid;
      grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));
      gap:2rem;
    }
    .footer-col h4{
      margin-bottom:1.25rem;
      font-size:1.25rem;
    }
    .footer-col ul{
      list-style:none;
      padding:0;
      margin:0;
    }
    .footer-col li{
      margin-bottom:0.5rem;
    }
    .footer-col a{
      color:#cbd5e1;
      text-decoration:none;
      transition:color 0.2s;
    }
    .footer-col a:hover{
      color:white;
    }
    
    /* Modal */
    .modal{
      display:none;
      position:fixed;
      top:0;
      left:0;
      width:100%;
      height:100%;
      background-color:rgba(0,0,0,0.5);
      z-index:100;
      align-items:center;
      justify-content:center;
    }
    .modal.active{
      display:flex;
    }
    .modal-content{
      background-color:white;
      border-radius:0.5rem;
      padding:2rem;
      width:90%;
      max-width:500px;
      box-shadow:0 10px 25px rgba(0,0,0,0.1);
    }
    .modal-header{
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:1.5rem;
    }
    .modal-close{
      background:none;
      border:none;
      font-size:1.5rem;
      cursor:pointer;
      color:#64748b;
    }
    
    /* Form */
    .form-group{
      margin-bottom:1.5rem;
    }
    .form-label{
      display:block;
      margin-bottom:0.5rem;
      font-weight:500;
    }
    .form-input{
      width:100%;
      padding:0.75rem;
      border:1px solid #cbd5e1;
      border-radius:0.375rem;
      font-size:1rem;
    }
    .form-input:focus{
      outline:none;
      border-color:#4f46e5;
      box-shadow:0 0 0 3px rgba(79,70,229,0.2);
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .hero h1{
        font-size:2rem;
      }
      nav ul{
        gap:1rem;
      }
    }
    @media (max-width: 640px) {
      .header-content{
        flex-direction:column;
        gap:1rem;
      }
      .features-grid{
        grid-template-columns:1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container header-content">
      <div class="logo">PropManager</div>
      <nav>
        <ul>
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#contact">Contact</a></li>
          <li><a href="javascript:void(0)" id="show-login">Login</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="container">
      <h1>Simplified Property Management for German Landlords</h1>
      <p>Streamline your rental business with automated payment tracking, document management, and tenant communication.</p>
      <a href="javascript:void(0)" id="show-demo" class="btn">Request Demo</a>
    </div>
  </section>

  <section class="features" id="features">
    <div class="container">
      <h2 class="section-title">Key Features</h2>
      <div class="features-grid">
        <div class="feature-card">
          <h3>Payment Tracking</h3>
          <p>Automatically track and reconcile tenant payments with smart bank statement analysis.</p>
        </div>
        <div class="feature-card">
          <h3>Document Management</h3>
          <p>Store and organize all property-related documents securely in one place.</p>
        </div>
        <div class="feature-card">
          <h3>Maintenance Requests</h3>
          <p>Handle maintenance requests efficiently with our streamlined workflow system.</p>
        </div>
        <div class="feature-card">
          <h3>Automated Communications</h3>
          <p>Send automated payment reminders and important notices to tenants.</p>
        </div>
        <div class="feature-card">
          <h3>Financial Reporting</h3>
          <p>Generate detailed financial reports and analytics for your rental business.</p>
        </div>
        <div class="feature-card">
          <h3>Legal Compliance</h3>
          <p>Stay compliant with German rental laws and regulations with built-in guidance.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="cta" id="pricing">
    <div class="container">
      <h2>Choose the Right Plan for Your Needs</h2>
      <p>Whether you manage a single property or multiple units, we have a solution that fits your business.</p>
      <a href="javascript:void(0)" id="show-pricing" class="btn">View Pricing Plans</a>
    </div>
  </section>

  <section class="cta" id="contact">
    <div class="container">
      <h2>Ready to Simplify Your Property Management?</h2>
      <p>Join our waiting list to be notified when we launch.</p>
      <a href="javascript:void(0)" id="show-waitlist" class="btn">Join Waiting List</a>
    </div>
  </section>

  <footer>
    <div class="container">
      <div class="footer-content">
        <div class="footer-col">
          <h4>PropManager</h4>
          <p>The smart solution for German landlords to manage their rental properties efficiently.</p>
        </div>
        <div class="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Press</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Support</h4>
          <ul>
            <li><a href="#">Contact</a></li>
            <li><a href="#">Help Center</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Privacy Policy</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Connect</h4>
          <ul>
            <li><a href="#">Twitter</a></li>
            <li><a href="#">Facebook</a></li>
            <li><a href="#">LinkedIn</a></li>
            <li><a href="#">Instagram</a></li>
          </ul>
        </div>
      </div>
    </div>
  </footer>

  <!-- Modals -->
  <div class="modal" id="demo-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Request a Demo</h2>
        <button class="modal-close" data-close-modal>&times;</button>
      </div>
      <form>
        <div class="form-group">
          <label class="form-label" for="demo-name">Your Name</label>
          <input type="text" id="demo-name" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="demo-email">Email Address</label>
          <input type="email" id="demo-email" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="demo-properties">Number of Properties</label>
          <input type="number" id="demo-properties" class="form-input" min="1" required>
        </div>
        <button type="submit" class="btn">Submit Request</button>
      </form>
    </div>
  </div>

  <div class="modal" id="waitlist-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Join Our Waiting List</h2>
        <button class="modal-close" data-close-modal>&times;</button>
      </div>
      <form>
        <div class="form-group">
          <label class="form-label" for="waitlist-name">Your Name</label>
          <input type="text" id="waitlist-name" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="waitlist-email">Email Address</label>
          <input type="email" id="waitlist-email" class="form-input" required>
        </div>
        <button type="submit" class="btn">Join Waiting List</button>
      </form>
    </div>
  </div>

  <div class="modal" id="login-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Log In</h2>
        <button class="modal-close" data-close-modal>&times;</button>
      </div>
      <form>
        <div class="form-group">
          <label class="form-label" for="login-email">Email Address</label>
          <input type="email" id="login-email" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="login-password">Password</label>
          <input type="password" id="login-password" class="form-input" required>
        </div>
        <button type="submit" class="btn">Log In</button>
      </form>
    </div>
  </div>

  <div class="modal" id="pricing-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Pricing Plans</h2>
        <button class="modal-close" data-close-modal>&times;</button>
      </div>
      <div>
        <h3 style="color:#4f46e5;margin:1.5rem 0 0.75rem">Done For You</h3>
        <p style="margin-bottom:0.5rem"><strong>€35/month</strong></p>
        <p>Full-service property management assistance including automatic payment tracking, document processing, and tenant communication.</p>
        
        <h3 style="color:#4f46e5;margin:1.5rem 0 0.75rem">Done With You</h3>
        <p style="margin-bottom:0.5rem"><strong>€2,700 one-time</strong></p>
        <p>Complete system setup and training with ongoing support to help you manage your properties effectively.</p>
        
        <h3 style="color:#4f46e5;margin:1.5rem 0 0.75rem">Done By You</h3>
        <p style="margin-bottom:0.5rem"><strong>€950 installation + hourly support</strong></p>
        <p>Self-managed system with initial setup and training, plus access to hourly support when needed.</p>
        
        <button class="btn" style="margin-top:1.5rem">Join Waiting List</button>
      </div>
    </div>
  </div>

  <script>
    // Simple modal functionality
    document.addEventListener('DOMContentLoaded', function() {
      // Modal show buttons
      document.getElementById('show-demo').addEventListener('click', function() {
        document.getElementById('demo-modal').classList.add('active');
      });
      
      document.getElementById('show-waitlist').addEventListener('click', function() {
        document.getElementById('waitlist-modal').classList.add('active');
      });
      
      document.getElementById('show-login').addEventListener('click', function() {
        document.getElementById('login-modal').classList.add('active');
      });
      
      document.getElementById('show-pricing').addEventListener('click', function() {
        document.getElementById('pricing-modal').classList.add('active');
      });
      
      // Modal close buttons
      document.querySelectorAll('.modal-close').forEach(function(button) {
        button.addEventListener('click', function() {
          document.querySelectorAll('.modal').forEach(function(modal) {
            modal.classList.remove('active');
          });
        });
      });
      
      // Close modal when clicking outside
      document.querySelectorAll('.modal').forEach(function(modal) {
        modal.addEventListener('click', function(event) {
          if (event.target === modal) {
            modal.classList.remove('active');
          }
        });
      });
      
      // Prevent form submission (dummy functionality)
      document.querySelectorAll('form').forEach(function(form) {
        form.addEventListener('submit', function(event) {
          event.preventDefault();
          alert('This feature is not yet available. We are working on it!');
          document.querySelectorAll('.modal').forEach(function(modal) {
            modal.classList.remove('active');
          });
        });
      });
    });
  </script>
</body>
</html>`;

    // Serve the HTML content for all routes
    return new Response(htmlContent, {
      headers: { 
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
    });
  },
};