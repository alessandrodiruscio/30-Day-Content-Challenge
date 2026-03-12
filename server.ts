import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { hash, compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// Gemini Setup
const getAI = () => {
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return new GoogleGenAI({
    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
    httpOptions: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
      ? { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL }
      : undefined,
  });
};

// Helper to get DB config with validation
const getDbConfig = () => ({
  host: process.env.DB_HOST || "MISSING_HOST",
  user: process.env.DB_USER || "MISSING_USER",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "MISSING_DATABASE",
  port: parseInt(process.env.DB_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 30000,
  acquireTimeout: 30000,
});

let pool: mysql.Pool;

const getPool = () => {
  if (!pool) {
    const config = getDbConfig();
    const missing = [];
    if (config.host === "MISSING_HOST") missing.push("DB_HOST");
    if (config.user === "MISSING_USER") missing.push("DB_USER");
    if (config.database === "MISSING_DATABASE") missing.push("DB_NAME");
    
    if (missing.length > 0) {
      throw new Error(`Database not configured. Missing: ${missing.join(", ")}. Please set these in AI Studio Secrets.`);
    }
    
    console.log("Initializing database pool on demand...");
    pool = mysql.createPool(config);
  }
  return pool;
};

async function initDatabase() {
  const config = getDbConfig();
  if (config.host === "MISSING_HOST" || config.user === "MISSING_USER" || config.database === "MISSING_DATABASE") {
    console.warn("⚠️ MySQL Configuration missing. Database initialization skipped.");
    return;
  }

  try {
    console.log(`Initializing MySQL database at ${config.host}:${config.port}...`);
    
    if (!pool) {
      pool = mysql.createPool(config);
    }
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        niche TEXT,
        products TEXT,
        problems TEXT,
        audience TEXT,
        tone VARCHAR(255) DEFAULT 'Professional & Helpful',
        contentType VARCHAR(255) DEFAULT 'Suggestions & Advice',
        reset_token VARCHAR(255),
        reset_token_expiry DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create strategies table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS strategies (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT,
        title VARCHAR(255) NOT NULL,
        data LONGTEXT NOT NULL,
        start_date VARCHAR(255),
        completed_days TEXT,
        day_checklist TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Add day_checklist column if it doesn't exist
    try {
      await pool.execute(`ALTER TABLE strategies ADD COLUMN day_checklist TEXT`);
      console.log("✅ Added day_checklist column to strategies table");
    } catch (err: any) {
      if (err.message.includes("Duplicate column")) {
        console.log("✅ day_checklist column already exists");
      } else {
        console.error("Warning: Could not add day_checklist column:", err.message);
      }
    }
    
    // Upgrade existing tables from TEXT to LONGTEXT
    try {
      await pool.execute(`ALTER TABLE strategies MODIFY data LONGTEXT NOT NULL`);
    } catch (alterErr: any) {
      if (!alterErr.message.includes("Duplicate")) {
        console.warn("Could not upgrade strategies table column:", alterErr.message);
      }
    }

    console.log("✅ MySQL database initialized successfully.");
  } catch (error) {
    console.error("❌ Failed to initialize MySQL database:", error);
  }
}

async function addToActiveCampaign(email: string) {
  const url = process.env.ACTIVECAMPAIGN_URL;
  const apiKey = process.env.ACTIVECAMPAIGN_API_KEY;
  const tagName = process.env.ACTIVECAMPAIGN_TAG_NAME;

  if (!url || !apiKey || !tagName) {
    console.warn("ActiveCampaign credentials missing, skipping contact creation.");
    return;
  }

  try {
    // 1. Create or sync contact
    const contactRes = await fetch(`${url}/api/3/contact/sync`, {
      method: 'POST',
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact: { email }
      })
    });
    const contactData = await contactRes.json();
    const contactId = contactData.contact?.id;

    if (contactId) {
      // 2. Find Tag ID by Name
      const tagsRes = await fetch(`${url}/api/3/tags?search=${encodeURIComponent(tagName)}`, {
        headers: {
          'Api-Token': apiKey
        }
      });
      const tagsData = await tagsRes.json();
      
      // Look for an exact match in the search results
      const tag = tagsData.tags?.find((t: any) => t.tag.toLowerCase() === tagName.toLowerCase());
      let tagId = tag?.id;

      // 3. If tag doesn't exist, create it
      if (!tagId) {
        const createTagRes = await fetch(`${url}/api/3/tags`, {
          method: 'POST',
          headers: {
            'Api-Token': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tag: {
              tag: tagName,
              tagType: "template",
              description: "Created by 30-Day Content Challenge"
            }
          })
        });
        const createTagData = await createTagRes.json();
        tagId = createTagData.tag?.id;
      }

      if (tagId) {
        // 4. Add Tag to contact
        await fetch(`${url}/api/3/contactTags`, {
          method: 'POST',
          headers: {
            'Api-Token': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contactTag: {
              contact: contactId,
              tag: tagId
            }
          })
        });
      }
    }
  } catch (error) {
    console.error("Error adding to ActiveCampaign:", error);
  }
}

async function checkActiveCampaignMembership(email: string): Promise<boolean> {
  const url = process.env.ACTIVECAMPAIGN_URL;
  const apiKey = process.env.ACTIVECAMPAIGN_API_KEY;
  const memberTagName = process.env.ACTIVECAMPAIGN_MEMBER_TAG_NAME;

  if (!url || !apiKey || !memberTagName) {
    console.warn("ActiveCampaign credentials or member tag name missing.");
    return false;
  }

  try {
    // 1. Get contact by email
    const contactRes = await fetch(`${url}/api/3/contacts?email=${encodeURIComponent(email)}`, {
      headers: { 'Api-Token': apiKey }
    });
    const contactData = await contactRes.json();
    const contact = contactData.contacts?.[0];

    if (!contact) return false;

    // 2. Get contact's tags
    const contactTagsRes = await fetch(`${url}/api/3/contacts/${contact.id}/contactTags`, {
      headers: { 'Api-Token': apiKey }
    });
    const contactTagsData = await contactTagsRes.json();
    
    // 3. Get all tags to find the ID of the member tag
    const tagsRes = await fetch(`${url}/api/3/tags?search=${encodeURIComponent(memberTagName)}`, {
      headers: { 'Api-Token': apiKey }
    });
    const tagsData = await tagsRes.json();
    const memberTag = tagsData.tags?.find((t: any) => t.tag.toLowerCase() === memberTagName.toLowerCase());

    if (!memberTag) return false;

    // 4. Check if the contact has the member tag ID
    return contactTagsData.contactTags?.some((ct: any) => ct.tag === memberTag.id);
  } catch (error) {
    console.error("Error checking ActiveCampaign membership:", error);
    return false;
  }
}

async function sendResetEmail(email: string, token: string, origin?: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const appUrl = process.env.APP_URL || origin || "http://localhost:3000";
  const resetUrl = `${appUrl.replace(/\/$/, '')}?step=reset_password&token=${token}`;

  console.log(`[PASSWORD RESET] Email: ${email}, Token: ${token}`);
  console.log(`[PASSWORD RESET] Link: ${resetUrl}`);

  if (!resendApiKey || resendApiKey === 're_123456789') {
    const msg = "⚠️ RESEND_API_KEY is missing or using placeholder value. Reset email not sent.";
    console.warn(msg);
    console.log("--------------------------------------------------");
    console.log(`[PASSWORD RESET - MOCK MODE]`);
    console.log(`Email: ${email}`);
    console.log(`Link: ${resetUrl}`);
    console.log("--------------------------------------------------");
    throw new Error(msg);
  }

  try {
    console.log(`Attempting to send reset email to ${email} via Resend...`);
    
    // If using the default onboarding email, Resend is very strict about the 'from' format
    const fromField = resendFromEmail.includes('onboarding@resend.dev') 
      ? 'onboarding@resend.dev' 
      : `"30-Day Content Challenge" <${resendFromEmail.trim()}>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromField,
        to: email.trim(),
        subject: 'Reset Your Password - 30-Day Content Challenge',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #fff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #111; font-size: 24px; font-weight: bold; margin: 0;">Password Reset Request</h1>
            </div>
            <p style="color: #444; line-height: 1.6; font-size: 16px;">You requested a password reset for your <strong>30-Day Content Challenge</strong> account.</p>
            <p style="color: #444; line-height: 1.6; font-size: 16px;">Click the button below to set a new password. This link will expire in 1 hour.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #000; color: #fff; text-decoration: none; border-radius: 9999px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If the button above doesn't work, copy and paste this link into your browser:
              <br />
              <a href="${resetUrl}" style="color: #6D28D9; text-decoration: underline;">${resetUrl}</a>
            </p>
            <p style="color: #888; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 24px; text-align: center;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `
      })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      console.error("❌ Resend API error:", JSON.stringify(data, null, 2));
      if (data.name === 'validation_error' && resendFromEmail === 'onboarding@resend.dev') {
        const tip = "💡 TIP: When using 'onboarding@resend.dev', you can only send emails to your own Resend account email. To send to others, you must verify a domain in Resend.";
        console.error(tip);
        throw new Error(`Resend validation error: ${data.message || 'Check logs'}. ${tip}`);
      }
      throw new Error(`Resend API error: ${data.message || 'Check logs'}`);
    } else {
      console.log(`✅ Reset email sent successfully to ${email}. Resend ID: ${data.id}`);
    }
  } catch (error) {
    console.error("Error sending reset email via Resend:", error);
    throw error;
  }
}

async function startServer() {
  console.log("Starting server initialization...");
  await initDatabase();
  
  const app = express();
  const PORT = parseInt(process.env.PORT || "5000");
  const JWT_SECRET = process.env.JWT_SECRET || "insta-challenge-30-super-stable-secret-key-2024";

  console.log("Configuring middleware...");
  app.use(express.json({ limit: '5mb' }));

  // Check Resend Config
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || resendKey === 're_123456789') {
    console.warn("⚠️ [CONFIG] RESEND_API_KEY is missing or using placeholder. Password reset will not work.");
  } else {
    console.log("✅ [CONFIG] RESEND_API_KEY is present.");
  }

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // API Routes
  app.get(["/api/login", "/api/login/"], (req, res) => {
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.redirect(`${appUrl}?step=auth&mode=login`);
  });

  app.get(["/api/register", "/api/register/"], (req, res) => {
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.redirect(`${appUrl}?step=auth&mode=register`);
  });

  app.get(["/api/forgot-password", "/api/forgot-password/"], (req, res) => {
    // If someone accidentally GETs this (e.g. from a browser URL bar or a weird redirect)
    // redirect them to the home page with the forgot password step active
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.redirect(`${appUrl}?step=forgot_password`);
  });

  app.post(["/api/forgot-password", "/api/forgot-password/"], async (req, res) => {
    const { email: rawEmail } = req.body;
    if (!rawEmail) return res.status(400).json({ error: "Email is required" });
    const email = rawEmail.toLowerCase().trim();
    
    try {
      const db = getPool();
      const [rows]: any = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
      const user = rows[0];

      if (!user) {
        return res.json({ success: true, message: "If an account exists, a reset link has been sent." });
      }

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiry = new Date(Date.now() + 3600000); // 1 hour from now

      await db.execute(
        'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
        [token, expiry, user.id]
      );

      const origin = `${req.protocol}://${req.get('host')}`;
      await sendResetEmail(email, token, origin);
      res.json({ success: true, message: "If an account exists, a reset link has been sent." });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: error.message || "Server error" });
    }
  });

  app.post(["/api/register", "/api/register/"], async (req, res) => {
    const { email: rawEmail, password } = req.body;
    
    if (!rawEmail || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const email = rawEmail.toLowerCase().trim();
    console.log(`[AUTH] Registration attempt for: ${email}`);
    try {
      const db = getPool();
      const hashedPassword = await hash(password, 10);
      
      const [result]: any = await db.execute(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [email, hashedPassword]
      );

      const userId = result.insertId;
      const token = jwt.sign({ id: userId, email }, JWT_SECRET);
      
      console.log(`User registered successfully: ${email}`);
      addToActiveCampaign(email).catch(err => console.error("AC background error:", err));
      
      res.json({ token, user: { email } });
    } catch (error: any) {
      console.error(`Registration error for ${email}:`, error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: "Email already exists" });
      }
      const message = error.message || "Server error";
      res.status(500).json({ error: message, details: error });
    }
  });

  app.post(["/api/login", "/api/login/"], async (req, res) => {
    const { email: rawEmail, password } = req.body;
    
    if (!rawEmail || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const email = rawEmail.toLowerCase().trim();
    console.log(`[AUTH] Login attempt for: ${email}`);
    try {
      const db = getPool();
      const [rows]: any = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
      const user = rows[0];
      
      if (!user) {
        console.log(`[AUTH] User not found, auto-registering: ${email}`);
        const hashedPassword = await hash(password, 10);
        const [result]: any = await db.execute(
          'INSERT INTO users (email, password) VALUES (?, ?)',
          [email, hashedPassword]
        );
        
        const userId = result.insertId;
        const token = jwt.sign({ id: userId, email }, JWT_SECRET);
        addToActiveCampaign(email).catch(err => console.error("AC background error:", err));
        return res.json({ token, user: { email } });
      }
      
      const isMatch = await compare(password, user.password);
      if (!isMatch) {
        console.log(`Login failed: Password mismatch - ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const token = jwt.sign({ id: user.id, email }, JWT_SECRET);
      console.log(`Login successful: ${email}`);
      res.json({ token, user: { email } });
    } catch (error: any) {
      console.error(`Login error for ${email}:`, error);
      const message = error.message || "Server error";
      res.status(500).json({ error: message, details: error });
    }
  });

  app.post(["/api/reset-password", "/api/reset-password/"], async (req, res) => {
    const { token, password } = req.body;
    try {
      const db = getPool();
      const [rows]: any = await db.execute(
        'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > ?',
        [token, new Date()]
      );
      const user = rows[0];
      
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      const hashedPassword = await hash(password, 10);
      await pool.execute(
        'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
        [hashedPassword, user.id]
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get(["/api/me", "/api/me/"], authenticateToken, async (req: any, res) => {
    try {
      const db = getPool();
      const [rows]: any = await db.execute(
        'SELECT id, email, niche, products, problems, audience, tone, contentType FROM users WHERE id = ?',
        [req.user.id]
      );
      res.json({ user: rows[0] });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put(["/api/profile", "/api/profile/"], authenticateToken, async (req: any, res) => {
    const { niche, products, problems, audience, tone, contentType } = req.body;
    try {
      const db = getPool();
      await db.execute(
        'UPDATE users SET niche = ?, products = ?, problems = ?, audience = ?, tone = ?, contentType = ? WHERE id = ?',
        [niche, products, problems, audience, tone, contentType, req.user.id]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get(["/api/community/membership", "/api/community/membership/"], authenticateToken, async (req: any, res) => {
    const isMember = await checkActiveCampaignMembership(req.user.email);
    res.json({ 
      isMember,
      discordUrl: process.env.COMMUNITY_DISCORD_URL || "#",
      trialUrl: process.env.COMMUNITY_TRIAL_URL || "#"
    });
  });

  app.post(["/api/strategies", "/api/strategies/"], authenticateToken, async (req: any, res) => {
    const { title, data, start_date } = req.body;
    try {
      const db = getPool();
      const dataStr = JSON.stringify(data);
      const result: any = await db.execute(
        'INSERT INTO strategies (user_id, title, data, start_date) VALUES (?, ?, ?, ?)',
        [req.user.id, title, dataStr, start_date]
      );
      const insertedId = result[0].insertId;
      res.json({
        id: insertedId,
        title,
        data,
        start_date,
        completed_days: [],
        created_at: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Failed to save strategy:", error);
      res.status(500).json({ error: error.message || "Server error" });
    }
  });

  app.get(["/api/strategies", "/api/strategies/"], authenticateToken, async (req: any, res) => {
    try {
      const db = getPool();
      const [rows]: any = await db.execute(
        'SELECT * FROM strategies WHERE user_id = ? ORDER BY created_at DESC',
        [req.user.id]
      );

      res.json(rows.map((s: any) => {
        try {
          return {
            id: s.id,
            title: s.title,
            data: typeof s.data === 'string' ? JSON.parse(s.data) : s.data,
            start_date: s.start_date,
            completed_days: typeof s.completed_days === 'string' ? JSON.parse(s.completed_days) : (s.completed_days || []),
            day_checklist: typeof s.day_checklist === 'string' ? JSON.parse(s.day_checklist) : (s.day_checklist || {}),
            created_at: s.created_at
          };
        } catch (parseErr) {
          console.error(`Failed to parse strategy ${s.id}:`, parseErr);
          return {
            id: s.id,
            title: s.title,
            data: { error: "Failed to load strategy data" },
            start_date: s.start_date,
            completed_days: [],
            created_at: s.created_at
          };
        }
      }));
    } catch (error: any) {
      console.error("Failed to fetch strategies:", error);
      res.status(500).json({ error: error.message || "Server error" });
    }
  });

  app.delete(["/api/strategies/:id", "/api/strategies/:id/"], authenticateToken, async (req: any, res) => {
    try {
      const db = getPool();
      const [result]: any = await db.execute(
        'DELETE FROM strategies WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Strategy not found or unauthorized" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch(["/api/strategies/:id/progress", "/api/strategies/:id/progress/"], authenticateToken, async (req: any, res) => {
    const { completed_days, day_checklist } = req.body;
    try {
      const db = getPool();
      await db.execute(
        'UPDATE strategies SET completed_days = ?, day_checklist = ? WHERE id = ? AND user_id = ?',
        [JSON.stringify(completed_days), JSON.stringify(day_checklist || {}), req.params.id, req.user.id]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/debug/ip", async (req, res) => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      res.json({ 
        publicIp: data.ip,
        hint: "Add this IP to your Hostinger 'Remote MySQL' settings. Note: This IP may change if the container restarts." 
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch public IP", message: err.message });
    }
  });

  app.get("/api/debug/mysql", async (req, res) => {
    const config = getDbConfig();
    const missingVars = [];
    if (config.host === "MISSING_HOST") missingVars.push("DB_HOST");
    if (config.user === "MISSING_USER") missingVars.push("DB_USER");
    if (config.database === "MISSING_DATABASE") missingVars.push("DB_NAME");
    if (!config.password) missingVars.push("DB_PASSWORD");

    if (missingVars.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `Missing environment variables: ${missingVars.join(", ")}`,
        config: { ...config, password: config.password ? "***" : "empty" },
        hint: "Please add these variables to your AI Studio Secrets."
      });
    }

    try {
      if (!pool) pool = mysql.createPool(config);
      const [rows]: any = await pool.query('SELECT 1 as connected');
      const [userCount]: any = await pool.query('SELECT COUNT(*) as count FROM users');
      
      res.json({ 
        status: "connected", 
        userCount: userCount[0].count,
        config: {
          host: config.host,
          database: config.database,
          user: config.user
        }
      });
    } catch (err: any) {
      console.error("MySQL Debug Error:", err);
      res.status(500).json({ 
        status: "error", 
        message: err.message, 
        details: err,
        config: { ...config, password: config.password ? "***" : "empty" },
        hint: "Check your Hostinger MySQL credentials. Ensure 'Remote MySQL' is enabled in your Hostinger panel for this IP or allow all IPs (%) if safe." 
      });
    }
  });

  // Instagram Video Analysis
  app.post(["/api/instagram/analyze", "/api/instagram/analyze/"], async (req: any, res) => {
    const { videoUrl, accessToken } = req.body;
    if (!videoUrl || !accessToken) {
      return res.status(400).json({ error: "videoUrl and accessToken are required" });
    }

    try {
      // Extract shortcode from URL
      const shortcodeMatch = videoUrl.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      if (!shortcodeMatch) {
        return res.status(400).json({ error: "Invalid Instagram URL. Make sure it's a Reel or post URL." });
      }
      const shortcode = shortcodeMatch[2];

      // Get user's IG Business account ID via /me
      const meRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{id}&access_token=${accessToken}`);
      const meData = await meRes.json();

      if (meData.error) {
        return res.status(400).json({ error: `Instagram API error: ${meData.error.message}` });
      }

      // Try to get IG user ID from business accounts or fall back to /me
      let igUserId: string | null = null;
      if (meData.data && meData.data.length > 0) {
        const pageWithIg = meData.data.find((p: any) => p.instagram_business_account);
        if (pageWithIg) igUserId = pageWithIg.instagram_business_account.id;
      }
      if (!igUserId) {
        // Try Basic Display API fallback
        const basicRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id&access_token=${accessToken}`);
        const basicData = await basicRes.json();
        if (basicData.error) return res.status(400).json({ error: `Could not find Instagram account: ${basicData.error.message}` });
        igUserId = basicData.id;
      }

      // Get media list to find matching post by shortcode
      let mediaId: string | null = null;
      let pageUrl = `https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,permalink,shortcode,media_type,like_count,comments_count,timestamp,caption,thumbnail_url,media_url&limit=100&access_token=${accessToken}`;
      
      outer: while (pageUrl) {
        const mediaRes = await fetch(pageUrl);
        const mediaData = await mediaRes.json();
        if (mediaData.error) break;
        for (const item of (mediaData.data || [])) {
          if (item.shortcode === shortcode || (item.permalink && item.permalink.includes(shortcode))) {
            mediaId = item.id;
            break outer;
          }
        }
        pageUrl = mediaData.paging?.next || null;
        if (!mediaId && !mediaData.paging?.next) break;
      }

      if (!mediaId) {
        return res.status(404).json({ error: "Reel not found. Make sure this Reel belongs to your connected Instagram account." });
      }

      // Get full media details
      const detailRes = await fetch(
        `https://graph.facebook.com/v19.0/${mediaId}?fields=id,permalink,media_type,like_count,comments_count,timestamp,caption,thumbnail_url,media_url&access_token=${accessToken}`
      );
      const mediaDetail = await detailRes.json();
      if (mediaDetail.error) return res.status(400).json({ error: mediaDetail.error.message });

      // Get insights
      const metrics = ['impressions', 'reach', 'plays', 'saved', 'shares', 'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time', 'video_views'].join(',');
      const insightsRes = await fetch(
        `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`
      );
      const insightsData = await insightsRes.json();

      // Parse insights into a flat object
      const insightsMap: Record<string, number> = {};
      if (insightsData.data) {
        for (const metric of insightsData.data) {
          insightsMap[metric.name] = metric.values?.[0]?.value ?? metric.value ?? 0;
        }
      }

      const plays = insightsMap['plays'] || 0;
      const impressions = insightsMap['impressions'] || 0;
      const reach = insightsMap['reach'] || 0;
      const saved = insightsMap['saved'] || 0;
      const shares = insightsMap['shares'] || 0;
      const avgWatchMs = insightsMap['ig_reels_avg_watch_time'] || 0;
      const totalWatchMs = insightsMap['ig_reels_video_view_total_time'] || 0;
      const videoViews = insightsMap['video_views'] || 0;

      const likes = mediaDetail.like_count || 0;
      const comments = mediaDetail.comments_count || 0;

      // Derived metrics
      const hookRate = plays > 0 ? (videoViews / plays) * 100 : 0;
      const engagementRate = reach > 0 ? ((likes + comments + saved + shares) / reach) * 100 : 0;
      const saveRate = reach > 0 ? (saved / reach) * 100 : 0;
      const shareRate = reach > 0 ? (shares / reach) * 100 : 0;

      // Use Gemini to generate AI insights
      const ai = getAI();
      const metricsContext = `
        Reel Performance Metrics:
        - Plays: ${plays.toLocaleString()}
        - Impressions: ${impressions.toLocaleString()}
        - Reach: ${reach.toLocaleString()}
        - Likes: ${likes.toLocaleString()}
        - Comments: ${comments.toLocaleString()}
        - Saves: ${saved.toLocaleString()}
        - Shares: ${shares.toLocaleString()}
        - Hook Rate (3s view rate): ${hookRate.toFixed(1)}%
        - Engagement Rate: ${engagementRate.toFixed(1)}%
        - Save Rate: ${saveRate.toFixed(2)}%
        - Share Rate: ${shareRate.toFixed(2)}%
        - Average Watch Time: ${(avgWatchMs / 1000).toFixed(1)} seconds
        Caption: "${(mediaDetail.caption || '').substring(0, 300)}"
      `;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: `You are an expert Instagram Reels strategist. Analyze these performance metrics for an Instagram Reel and provide specific, actionable insights.\n\n${metricsContext}\n\nProvide analysis in JSON format.` }] }],
        config: {
          systemInstruction: "You are an expert social media analyst. Respond only with valid JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: "object" as const,
            properties: {
              summary: { type: "string" as const, description: "2-3 sentence overall analysis of performance" },
              went_well: { type: "array" as const, items: { type: "string" as const }, description: "3-4 specific things that performed well" },
              improve: { type: "array" as const, items: { type: "string" as const }, description: "3-4 specific things to improve" },
              next_steps: { type: "array" as const, items: { type: "string" as const }, description: "3 actionable next steps for the creator's next Reel" }
            },
            required: ["summary", "went_well", "improve", "next_steps"]
          }
        }
      });

      let aiResult = { summary: "", went_well: [], improve: [], next_steps: [] };
      try {
        const rawText = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        aiResult = JSON.parse(rawText);
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }

      return res.json({
        media: {
          id: mediaId,
          caption: mediaDetail.caption || '',
          timestamp: mediaDetail.timestamp || '',
          thumbnail_url: mediaDetail.thumbnail_url || null,
          media_url: mediaDetail.media_url || null,
          permalink: mediaDetail.permalink || videoUrl,
          media_type: mediaDetail.media_type || 'REEL',
          like_count: likes,
          comments_count: comments
        },
        insights: {
          impressions,
          reach,
          plays,
          saved,
          shares,
          avg_watch_time_ms: avgWatchMs,
          total_watch_time_ms: totalWatchMs,
          video_views: videoViews
        },
        derived: {
          hook_rate: parseFloat(hookRate.toFixed(1)),
          engagement_rate: parseFloat(engagementRate.toFixed(2)),
          save_rate: parseFloat(saveRate.toFixed(2)),
          share_rate: parseFloat(shareRate.toFixed(2)),
          avg_watch_time_sec: parseFloat((avgWatchMs / 1000).toFixed(1)),
          completion_estimate: null
        },
        ai: aiResult
      });

    } catch (err: any) {
      console.error("Instagram analysis error:", err);
      res.status(500).json({ error: err.message || "Analysis failed" });
    }
  });

  // Gemini Routes
  app.post(["/api/gemini/generate-options", "/api/gemini/generate-options/"], authenticateToken, async (req: any, res) => {
    const { profile, language = 'en' } = req.body;
    const languageInstruction = language === 'es' ? 'Respond in Spanish.' : 'Respond in English.';
    const prompt = `
      You are an expert Instagram Growth Strategist. 
      Create 3 distinct high-level concepts for a 30-day Instagram Reel series for a creator with the following profile:
      - Niche: ${profile.niche}
      - Products/Services: ${profile.products}
      - Client Problems they solve: ${profile.problems}
      - Target Audience: ${profile.audience}
      - Desired Tone: ${profile.tone}
      - Preferred Content Style: ${profile.contentType}

      IMPORTANT: Each of the 3 options should explore a DIFFERENT "Angle" or "Challenge Type" even within the preferred style. 

      Return only the high-level concepts (Title, Description, Target Audience, and Theme).
      
      ${languageInstruction}
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "You are a professional content strategist. Always respond with valid JSON matching the requested schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                targetAudience: { type: Type.STRING },
                theme: { type: Type.STRING },
              },
              required: ["title", "description", "targetAudience", "theme"],
            },
          },
        },
      });

      res.json(JSON.parse(response.text || "[]"));
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate options" });
    }
  });

  app.post(["/api/gemini/generate-series", "/api/gemini/generate-series/"], authenticateToken, (req: any, res, next) => {
    req.setTimeout(600000);
    res.setTimeout(600000);
    next();
  }, async (req: any, res) => {
    const { concept, profile, language = 'en' } = req.body;
    const languageInstruction = language === 'es' 
      ? 'Respond completely in Spanish. All hooks, scripts, CTAs, captions, and descriptions must be in Spanish.' 
      : 'Respond in English.';
    const prompt = `Create a 30-day Instagram Reel series plan. IMPORTANT: Every day must deliver immediate, standalone value—no filler, no introductions, no "coming soon" days. Start with valuable content from Day 1.

Series: "${concept.title}" — ${concept.theme}
Niche: ${profile.niche} | Audience: ${profile.audience} | Tone: ${profile.tone} | Style: ${profile.contentType}

For each of the 30 days provide:
- 3 distinct hooks (the first 3 seconds of the reel — each hook should be a different angle on the same topic)
- 3 matching full scripts (word-for-word, 80-120 words each). Include 3-4 segments separated by \\n\\n (double newlines). Packed with specific tips, examples, and actionable advice. No filler.
- Storyboard with creator actions (4-5 actions total, one per script segment). CRITICAL: ONLY describe what the creator should DO (e.g., "Smile at camera and point", "Lean forward intensely", "Raise eyebrows", "Nod head"). DO NOT suggest text overlays. If b-roll is useful, say "Use b-roll of [topic] from Descript" or link "Get b-roll at escape9to5.life/descript". Use actual newline characters (\\n) to separate each action, matching the order of script segments (separated by \\n\\n).
- A clear CTA
- A caption with relevant hashtags
- 3 YouTube search queries that would help find real videos (long or short) from other creators who have talked about this day's topic — for inspiration and research

${languageInstruction}`;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: `Respond with valid JSON. Generate all 30 days. Scripts: 80-120 words each, 3-4 segments with \\n\\n breaks. Visuals: 3-4 creator actions only (smile, lean, point, nod). No text overlays. ${language === 'es' ? 'Spanish only.' : ''}`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              theme: { type: Type.STRING },
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.INTEGER },
                    hooks: { 
                      type: Type.ARRAY, 
                      items: { type: Type.STRING },
                      description: "3 distinct hooks for the day"
                    },
                    scripts: { 
                      type: Type.ARRAY, 
                      items: { type: Type.STRING },
                      description: "3 distinct scripts corresponding to each hook"
                    },
                    value: { type: Type.STRING, description: "A summary of the day's value" },
                    cta: { type: Type.STRING },
                    caption: { type: Type.STRING },
                    visuals: { type: Type.STRING, description: "Visual structure and storyboard" },
                    searchTerms: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "3 YouTube search queries to find inspiration videos from other creators on this topic"
                    },
                  },
                  required: ["day", "hooks", "scripts", "value", "cta", "caption", "visuals", "searchTerms"],
                },
              },
            },
            required: ["title", "description", "targetAudience", "theme", "days"],
          },
        },
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate series" });
    }
  });

  // 404 for API
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global error handler for API
  app.use((err: any, req: any, res: any, next: any) => {
    if (req.path.startsWith('/api')) {
      console.error(`[API GLOBAL ERROR] ${req.method} ${req.path}:`, err);
      return res.status(500).json({ error: "Internal server error", message: err.message });
    }
    next(err);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log("Initializing Vite server...");
      const vite = await createViteServer({
        server: { middlewareMode: true, allowedHosts: true },
        appType: "spa",
      });
      app.use(vite.middlewares);

      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        if (url.startsWith('/api')) return next();
        try {
          let template = fs.readFileSync(path.resolve("index.html"), "utf-8");
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      });
    } catch (err) {
      console.error("Failed to start Vite server:", err);
    }
  } else {
    app.use(express.static(path.resolve("dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[STARTUP] Server bound to port ${PORT}. All services initialized.`);
  });

  // Global error handlers to prevent crashes
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
  });
}

startServer();
