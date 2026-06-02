import express from "express";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
// dotenv.config() removed to prevent placeholder overrides
import fs from "fs";
import path from "path";
import { Resend } from "resend";
import { 
  generateOptions, 
  generateSeries, 
  generateSeriesChunk, 
  generateDayContent, 
  refineScript, 
  regenerateDayContentWithIdea 
} from "./_geminiService.js";
import { defaultCreatorExamples } from "./creatorExamples.js";

// Server initialization

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "escape_9_to_5_super_secret_key";
if (!process.env.JWT_SECRET) {
  console.warn("[Auth] No JWT_SECRET found in environment. Using default fallback.");
} else {
  console.log("[Auth] Custom JWT_SECRET detected.");
}

// Allow CORS for preflight (custom headers like X-No-Retry trigger this)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-No-Retry");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 2. Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Helpers for multi-path routing
const post = (path: string, ...handlers: any[]) => {
  app.post(path, ...handlers);
  if (path.startsWith('/api')) app.post(path.replace('/api', ''), ...handlers);
};

const get = (path: string, ...handlers: any[]) => {
  app.get(path, ...handlers);
  if (path.startsWith('/api')) app.get(path.replace('/api', ''), ...handlers);
};

const put = (path: string, ...handlers: any[]) => {
  app.put(path, ...handlers);
  if (path.startsWith('/api')) app.put(path.replace('/api', ''), ...handlers);
};

const patch = (path: string, ...handlers: any[]) => {
  app.patch(path, ...handlers);
  if (path.startsWith('/api')) app.patch(path.replace('/api', ''), ...handlers);
};

const del = (path: string, ...handlers: any[]) => {
  app.delete(path, ...handlers);
  if (path.startsWith('/api')) app.delete(path.replace('/api', ''), ...handlers);
};

// 3. Health Check
app.use('/api', async (req, res, next) => {
  try {
    if (!dbInitialized) await initDb();
    next();
  } catch (error: any) {
    console.error("[DB] Lifecycle Middleware Error:", error);
    res.status(500).json({ error: "Database initialization failed", details: error.message });
  }
});

get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Server is alive - Multi-path Cors Enabled",
    db_configured: !!process.env.DB_HOST,
    timestamp: new Date().toISOString()
  });
});

get("/api/debug/mysql", async (req, res) => {
  try {
    const db = getPool();
    const [userCount]: any = await db.execute('SELECT COUNT(*) as count FROM users');
    const [strategyCount]: any = await db.execute('SELECT COUNT(*) as count FROM strategies');
    
    // Detailed breakdown (limit to first 20 for safety)
    const [breakdown]: any = await db.execute(`
      SELECT u.id, u.email, COUNT(s.id) as strategy_count 
      FROM users u 
      LEFT JOIN strategies s ON u.id = s.user_id 
      GROUP BY u.id 
      LIMIT 20
    `);

    res.json({ 
      status: "connected", 
      message: "Database connection established successfully.",
      stats: {
        total_users: userCount[0].count,
        total_strategies: strategyCount[0].count,
        user_breakdown: breakdown
      },
      config: {
        host: process.env.DB_HOST === '127.0.0.1' || !process.env.DB_HOST ? 'LOCAL (Private)' : 'EXTERNAL (Public)',
      }
    });
  } catch (error: any) {
    console.error("Debug MySQL failed:", error);
    res.status(500).json({ 
      status: "error", 
      message: `Database Connection Failed: ${error.message}` 
    });
  }
});

// 4. DB Configuration
const getDbConfig = () => {
  const host = process.env.DB_HOST;
  return {
    host: host || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "database",
    port: parseInt(process.env.DB_PORT || "3306"),
    connectTimeout: 30000, 
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  };
};

let pool: mysql.Pool | null = null;
let dbInitialized = false;

const getPool = () => {
  if (!pool) {
    console.log("[DB] Creating new connection pool...");
    const config = getDbConfig();
    if ((!process.env.DB_HOST || config.host === "127.0.0.1") && process.env.VERCEL) {
      console.error("[DB] CRITICAL: DB_HOST is missing in Vercel environment.");
      throw new Error("DATABASE_CONFIG_ERROR: No DB_HOST provided.");
    }
    pool = mysql.createPool(config);
    
    // Add health probe to pool
    pool.on('connection', (connection) => {
      console.log('[DB] New connection acquired from pool');
    });
  }
  return pool;
};

const initDb = async (force = false) => {
  if (dbInitialized && !force) return;
  
  try {
    console.log(`[DB] initializing... (Force: ${force})`);
    const db = getPool();
    
    // Test connection first
    await db.query('SELECT 1');
    console.log("[DB] Connection test successful.");

    await db.execute(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, niche VARCHAR(255), products TEXT, problems TEXT, audience TEXT, tone VARCHAR(255), contentType VARCHAR(255), primaryCTA TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS system_settings (key_name VARCHAR(255) PRIMARY KEY, value_text TEXT)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS strategies (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255) NOT NULL, data LONGTEXT NOT NULL, start_date VARCHAR(255), completed_days TEXT, day_checklist TEXT, day_notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
    try { await db.execute('ALTER TABLE strategies MODIFY COLUMN data LONGTEXT NOT NULL'); } catch (e) {}
    await db.execute(`CREATE TABLE IF NOT EXISTS achievements (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(255) UNIQUE NOT NULL, name_en VARCHAR(255) NOT NULL, name_es VARCHAR(255) NOT NULL, description_en TEXT NOT NULL, description_es TEXT NOT NULL, icon VARCHAR(255) NOT NULL, tier VARCHAR(50) NOT NULL)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS user_achievements (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, achievement_id INT NOT NULL, strategy_id INT, unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY user_ach_at (user_id, achievement_id, strategy_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE, FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY, 
      user_id INT NOT NULL, 
      title VARCHAR(255) NOT NULL, 
      message TEXT NOT NULL, 
      link VARCHAR(255), 
      is_read BOOLEAN DEFAULT FALSE, 
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
      INDEX (user_id)
    ) ENGINE=InnoDB`);
    try {
      await db.execute(`ALTER TABLE notifications ADD CONSTRAINT fk_user_notifications FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    } catch (fkErr: any) {
      console.warn("[DB] Notifications FK warning:", fkErr.message);
    }
    
    const [rows]: any = await db.execute('SELECT COUNT(*) as count FROM achievements');
    if (rows[0].count === 0) {
      console.log("[DB] Seeding default achievements...");
      const initialAchievements = [
        ['FIRST_STRATEGY', 'Strategic Visionary', 'Visionario Estratégico', 'First challenge.', 'Primer desafío.', 'Target', 'bronze'],
        ['WEEK_ONE', 'Week One Warrior', 'Guerrero de la Primera Semana', '7 days.', '7 días.', 'Zap', 'silver'],
        ['HALF_WAY', 'Consistent Creator', 'Creador Consistente', '15 days.', '15 días.', 'Calendar', 'gold'],
        ['COMPLETED', 'Challenge Master', 'Maestro del Desafío', '30 days.', '30 días.', 'Trophy', 'platinum']
      ];
      for (const ach of initialAchievements) {
        await db.execute('INSERT INTO achievements (code, name_en, name_es, description_en, description_es, icon, tier) VALUES (?, ?, ?, ?, ?, ?, ?)', ach);
      }
    }

    // Seed default Google Sheet URL for Creator Examples if not already set
    await db.execute(`INSERT INTO system_settings (key_name, value_text) VALUES ('creator_examples_sheet_url', 'https://docs.google.com/spreadsheets/d/1Uo0pM9T_XGuqkaarUhZMiDq_C5crehwN3a8RDxfW_40/edit?usp=sharing') ON DUPLICATE KEY UPDATE value_text = 'https://docs.google.com/spreadsheets/d/1Uo0pM9T_XGuqkaarUhZMiDq_C5crehwN3a8RDxfW_40/edit?usp=sharing'`);
    
    dbInitialized = true;
    console.log("[DB] Initialization completed successfully.");
  } catch (err: any) {
    console.error("[DB] Initialization CRITICAL FAILURE:", err);
    dbInitialized = false;
    throw err;
  }
};

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

const ensureOnboardingNotifications = async (userId: number, attempts = 2) => {
  for (let i = 0; i < attempts; i++) {
    try {
      const db = getPool();
      const [existing]: any = await db.execute(
        'SELECT title FROM notifications WHERE user_id = ? AND (title LIKE "Welcome!%" OR title LIKE "Join our Discord%")',
        [userId]
      );

      if (existing.length < 2) {
        const onboardingNotifications = [
          {
            title: "Welcome! Watch the Playbook",
            message: "As a new member, we recommend watching our Playbook mini-course to get the most out of your 30-day challenge.",
            link: process.env.PLAYBOOK_LINK || "https://example.com/playbook"
          },
          {
            title: "Join our Discord Community",
            message: "Connect with other creators, share your progress, and get feedback in our private Discord.",
            link: process.env.DISCORD_LINK || "https://discord.com/invite/example"
          }
        ];

        for (const notif of onboardingNotifications) {
          const alreadyHas = existing.some((e: any) => e.title === notif.title);
          if (!alreadyHas) {
            await db.execute(
              'INSERT INTO notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)',
              [userId, notif.title, notif.message, notif.link]
            );
          }
        }
      }
      return; // Success
    } catch (err) {
      if (i === attempts - 1) {
        console.error("[Notifications] Error ensuring onboarding notifs:", err);
      } else {
        console.warn(`[Notifications] Onboarding attempt ${i+1} failed, retrying...`, err instanceof Error ? err.message : err);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }
};

// 5. Routes
post("/api/register", async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const db = getPool();
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result]: any = await db.execute('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
    const userId = result.insertId;
    
    await ensureOnboardingNotifications(userId);

    const token = jwt.sign({ id: userId, email }, JWT_SECRET);
    res.json({ token, user: { id: userId, email } });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Register failed" });
  }
});

post("/api/login", async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const db = getPool();
    const [rows]: any = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    await ensureOnboardingNotifications(user.id);

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Login failed" });
  }
});

post("/api/forgot-password", async (req: any, res: any) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    const db = getPool();
    const [rows]: any = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    
    if (rows.length === 0) {
      // Don't reveal that the user doesn't exist for security reasons
      return res.json({ success: true });
    }
    
    const user = rows[0];
    
    // Create a temporary token that expires in 1 hour
    // Include password hash in secret so if password changes, token is invalidated
    const resetSecret = JWT_SECRET + user.password;
    const resetToken = jwt.sign({ id: user.id, email: user.email }, resetSecret, { expiresIn: '1h' });
    
    const origin = req.headers.origin || req.headers.referer?.split('?')[0] || process.env.APP_URL || 'http://localhost:3000';
    const baseUrl = origin.replace(/\/$/, '');
    const resetUrl = `${baseUrl}/?step=reset-password&token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not defined. Attempting fallback print.");
      console.log(`[Password Reset] URL for ${user.email}:\n${resetUrl}`);
      return res.json({ success: true, fake: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Content Challenge App <onboarding@resend.dev>",
      to: user.email,
      subject: "Reset Your Password - Content Challenge",
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your 30-Day Content Challenge account.</p>
        <p>Click the link below to reset your password. This link is valid for 1 hour.</p>
        <p><a href="${resetUrl}"><strong>Reset My Password</strong></a></p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Alternatively, copy and paste this URL into your browser:</p>
        <p>${resetUrl}</p>
      `
    });

    if (error) {
      console.error("Resend error:", error);
      return res.status(500).json({ error: "Failed to send reset email." });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: error.message || "Failed to process request" });
  }
});

post("/api/reset-password", async (req: any, res: any) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Missing required fields" });
    
    // Decode token to get the email (without verifying yet) to pull the user record
    const decoded = jwt.decode(token) as { email?: string };
    if (!decoded || !decoded.email) {
       return res.status(400).json({ error: "Invalid token format" });
    }
    
    const db = getPool();
    const [rows]: any = await db.execute('SELECT * FROM users WHERE email = ?', [decoded.email]);
    if (rows.length === 0) return res.status(400).json({ error: "User not found" });
    
    const user = rows[0];
    const resetSecret = JWT_SECRET + user.password;
    
    try {
      jwt.verify(token, resetSecret);
    } catch (err) {
      return res.status(400).json({ error: "Invalid or expired reset token. Please request a new one." });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: error.message || "Failed to reset password" });
  }
});

get("/api/me", authenticateToken, async (req: any, res: any) => {
  try {
    const db = getPool();
    console.log(`[Profile] Fetching for user ID from token: ${req.user.id}`);
    const [rows]: any = await db.execute('SELECT id, email, niche, products, problems, audience, tone, contentType, primaryCTA FROM users WHERE id = ?', [req.user.id]);
    
    if (rows.length === 0) {
      console.warn(`[Profile] No user found in DB for ID: ${req.user.id}`);
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log(`[Profile] Found user: ${rows[0].email}`);
    res.json({ user: rows[0] });
  } catch (error: any) { 
    console.error(`[Profile] Fetch failed for ID ${req.user.id}:`, error);
    res.status(500).json({ error: "Fetch failed" }); 
  }
});

put("/api/profile", authenticateToken, async (req: any, res: any) => {
  try {
    const { niche, products, problems, audience, tone, contentType, primaryCTA } = req.body;
    const db = getPool();
    await db.execute('UPDATE users SET niche=?, products=?, problems=?, audience=?, tone=?, contentType=?, primaryCTA=? WHERE id=?', [niche || null, products || null, problems || null, audience || null, tone || null, contentType || null, primaryCTA || null, req.user.id]);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

get("/api/strategies", authenticateToken, async (req: any, res: any) => {
  try {
    const db = getPool();
    const userId = Number(req.user.id);
    console.log(`[Strategies] Requesting for UserID: ${userId} (Type: ${typeof userId}), Email: ${req.user.email}`);
    
    // Test if pool is active 
    await db.query('SELECT 1');
    
    const [rows]: any = await db.execute('SELECT * FROM strategies WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    
    console.log(`[Strategies] DB matched ${rows.length} rows for user ${userId}`);
    
    if (rows.length > 0) {
      console.log(`[Strategies] Sample row user_id: ${rows[0].user_id} (Type: ${typeof rows[0].user_id})`);
    }

    const mapped = rows.map((s: any) => {
      try {
        return {
          id: s.id, 
          title: s.title, 
          data: typeof s.data === 'string' ? JSON.parse(s.data) : s.data, 
          start_date: s.start_date,
          completed_days: typeof s.completed_days === 'string' ? JSON.parse(s.completed_days || '[]') : (s.completed_days || []),
          day_checklist: typeof s.day_checklist === 'string' ? JSON.parse(s.day_checklist || '{}') : (s.day_checklist || {}),
          day_notes: typeof s.day_notes === 'string' ? JSON.parse(s.day_notes || '{}') : (s.day_notes || {}),
          created_at: s.created_at,
          debug_user_id: userId
        };
      } catch (e: any) {
        console.error(`[Strategies] Serialization error on strategy ${s.id}:`, e.message);
        return null; // Skip corrupted ones
      }
    }).filter((s: any) => s !== null);

    console.log(`[Strategies] Returning ${mapped.length} valid mapped strategies`);
    res.json(mapped);
  } catch (error: any) { 
    console.error(`[Strategies] CRITICAL FETCH ERROR for user ${req.user?.id}:`, error);
    res.status(500).json({ 
      error: "Strategies fetch failed", 
      details: error.message,
      code: error.code 
    }); 
  }
});

post("/api/strategies", authenticateToken, async (req: any, res: any) => {
  try {
    const { title, data, start_date } = req.body;
    const db = getPool();
    const [result]: any = await db.query('INSERT INTO strategies (user_id, title, data, start_date) VALUES (?, ?, ?, ?)', [req.user.id, title, JSON.stringify(data), start_date || null]);
    res.json({ id: result.insertId, title, data, start_date });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

patch("/api/strategies/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const { title, data, start_date } = req.body;
    const db = getPool();
    await db.query('UPDATE strategies SET title = ?, data = ?, start_date = ? WHERE id = ? AND user_id = ?', [title, JSON.stringify(data), start_date || null, req.params.id, req.user.id]);
    res.json({ id: req.params.id, title, data, start_date });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

post("/api/strategies/:id/progress", authenticateToken, async (req: any, res: any) => {
  try {
    const { completed_days, day_checklist } = req.body;
    const db = getPool();
    await db.execute('UPDATE strategies SET completed_days = ?, day_checklist = ? WHERE id = ? AND user_id = ?', [JSON.stringify(completed_days), JSON.stringify(day_checklist), req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

del("/api/strategies/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const db = getPool();
    await db.execute('DELETE FROM strategies WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

get("/api/achievements", authenticateToken, async (req: any, res: any) => {
  try {
    const db = getPool();
    const strategyId = req.query.strategyId;
    const [allAchievements]: any = await db.execute('SELECT * FROM achievements');
    let unlockedQuery = 'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?';
    let queryParams: any[] = [req.user.id];
    if (strategyId) { unlockedQuery += ' AND (strategy_id = ? OR strategy_id IS NULL)'; queryParams.push(strategyId); }
    const [unlockedRows]: any = await db.execute(unlockedQuery, queryParams);
    const unlockedMap = new Map();
    unlockedRows.forEach((r: any) => unlockedMap.set(r.achievement_id, r.unlocked_at));
    const achievements = allAchievements.map((a: any) => ({ ...a, unlocked_at: unlockedMap.get(a.id) || null }));
    res.json({ achievements });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Notifications
get("/api/notifications", authenticateToken, async (req: any, res: any) => {
  try {
    const db = getPool();
    
    // Always ensure onboarding notifs exist
    await ensureOnboardingNotifications(req.user.id);
    console.log(`[Notifications] Onboarding check completed for user ${req.user.id}`);

    const [rows]: any = await db.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

post("/api/notifications/:id/read", authenticateToken, async (req: any, res: any) => {
  try {
    const db = getPool();
    await db.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

post("/api/admin/notifications/broadcast", authenticateToken, async (req: any, res: any) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "alessandro.diruscio@gmail.com";
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ error: "Access denied: Admin only" });
    }

    const adminSecret = req.headers['x-admin-secret'];
    if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: "Unauthorized admin access (Invlid Secret)" });
    }

    const { title, message, link } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }

    const db = getPool();
    const [users]: any = await db.execute('SELECT id FROM users');
    
    for (const u of users) {
      await db.execute(
        'INSERT INTO notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)',
        [u.id, title, message, link || null]
      );
    }

    res.json({ success: true, count: users.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin & Debug Routes
post("/api/admin/reinit-db", async (req: any, res: any) => {
  try {
    // Basic protection (can be enhanced with a secret header)
    const adminSecret = req.headers['x-admin-secret'];
    if (process.env.ADMIN_SECRET && adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: "Unauthorized admin access" });
    }

    console.log("[Admin] Manual DB Re-initialization triggered.");
    pool = null; // Clear existing pool
    await initDb(true); // Force re-init
    res.json({ success: true, message: "Database pool and schema re-initialized." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Gemini API Routes
post("/api/gemini/options", authenticateToken, async (req: any, res: any) => {
  try {
    const { profile, language } = req.body;
    const result = await generateOptions(profile, language);
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

post("/api/gemini/series", authenticateToken, async (req: any, res: any) => {
  try {
    const { concept, profile, language } = req.body;
    const result = await generateSeries(concept, profile, language);
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

post("/api/gemini/series-chunk", authenticateToken, async (req: any, res: any) => {
  try {
    const { skeletonDays, profile, concept, language } = req.body;
    const result = await generateSeriesChunk(skeletonDays, profile, concept, language);
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

post("/api/gemini/day-content", authenticateToken, async (req: any, res: any) => {
  try {
    const { day, profile, concept, hookIndex, language } = req.body;
    const result = await generateDayContent(day, profile, concept, hookIndex, language);
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

post("/api/gemini/refine-script", authenticateToken, async (req: any, res: any) => {
  try {
    const { baseScript, newHook, audience, niche, language } = req.body;
    const result = await refineScript(baseScript, newHook, audience, niche, language);
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

post("/api/gemini/regenerate-day", authenticateToken, async (req: any, res: any) => {
  try {
    const { dayNumber, idea, profile, concept, language } = req.body;
    const result = await regenerateDayContentWithIdea(dayNumber, idea, profile, concept, language);
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Report Bug Route
post("/api/report-bug", async (req: any, res: any) => {
  try {
    const { name, email, message } = req.body;
    
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not defined. Attempting fallback print.");
      console.log(`[Bug Report] From: ${name} <${email}>\n${message}`);
      return res.json({ success: true, fake: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Content Challenge App <onboarding@resend.dev>", // Resend test email
      to: "alex@alessandrodiruscio.com",
      subject: `New Bug Report from ${name}`,
      html: `
        <h2>New Bug Report received</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br/>")}</p>
      `
    });

    if (error) {
      console.error("[Bug Report] Resend API Error:", error);
      return res.status(500).json({ error: error.message || "Resend API rejected the email." });
    }

    res.json({ success: true, data });
  } catch (error: any) { 
    res.status(500).json({ error: error.message }); 
  }
});

// Helper functions for parsing Google Spreadsheet CSVs
function getGoogleSheetCsvUrl(url: string): string {
  if (url.includes('/export?format=csv')) return url;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    const sheetId = match[1];
    const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch && gidMatch[1] ? `&gid=${gidMatch[1]}` : '';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid}`;
  }
  return url;
}

function parseCSV(csvText: string): { headers: string[], rows: string[][] } {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const parsedLines: string[][] = [];
  if (lines.length === 0) return { headers: [], rows: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row: string[] = [];
    let insideQuote = false;
    let currentEntry = '';
    
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(currentEntry.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        currentEntry = '';
      } else {
        currentEntry += char;
      }
    }
    row.push(currentEntry.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    parsedLines.push(row);
  }

  if (parsedLines.length === 0) return { headers: [], rows: [] };

  const firstRow = parsedLines[0];
  const firstRowStr = firstRow.join(' ').toLowerCase();
  const hasHeaderSign = firstRowStr.includes('day') || 
                        firstRowStr.includes('link') || 
                        firstRowStr.includes('url') || 
                        firstRowStr.includes('instagram') ||
                        firstRowStr.includes('giorno') ||
                        firstRowStr.includes('desc') ||
                        firstRowStr.includes('result') ||
                        firstRowStr.includes('risultat') ||
                        firstRowStr.includes('style') ||
                        firstRowStr.includes('stile');

  if (hasHeaderSign) {
    const headers = firstRow.map(h => h.trim().toLowerCase());
    return { headers, rows: parsedLines.slice(1) };
  } else {
    const headers = Array.from({ length: firstRow.length }, (_, idx) => `col_${idx}`);
    return { headers, rows: parsedLines };
  }
}

// System settings routes
get("/api/admin/settings", authenticateToken, async (req: any, res: any) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "alessandro.diruscio@gmail.com";
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ error: "Access denied: Admin only" });
    }

    const db = getPool();
    const [rows]: any = await db.execute('SELECT key_name, value_text FROM system_settings');
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key_name] = r.value_text;
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

post("/api/admin/settings", authenticateToken, async (req: any, res: any) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "alessandro.diruscio@gmail.com";
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ error: "Access denied: Admin only" });
    }

    const adminSecret = req.headers['x-admin-secret'];
    if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: "Unauthorized admin access (Invalid Secret)" });
    }

    const { creator_examples_sheet_url } = req.body;
    const db = getPool();
    
    await db.execute(
      'INSERT INTO system_settings (key_name, value_text) VALUES ("creator_examples_sheet_url", ?) ON DUPLICATE KEY UPDATE value_text = ?',
      [creator_examples_sheet_url || '', creator_examples_sheet_url || '']
    );

    res.json({ success: true, creator_examples_sheet_url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

get("/api/creator-examples", authenticateToken, async (req: any, res: any) => {
  try {
    const db = getPool();
    let sheetUrl = "";
    try {
      const [rows]: any = await db.execute('SELECT value_text FROM system_settings WHERE key_name = "creator_examples_sheet_url"');
      if (rows.length > 0) {
        sheetUrl = rows[0].value_text;
      }
    } catch (dbErr) {
      console.warn("Could not query system_settings:", dbErr);
    }

    if (sheetUrl) {
      console.log("[Creator Examples] Fetching from Google Sheet:", sheetUrl);
      try {
        const csvUrl = getGoogleSheetCsvUrl(sheetUrl);
        const fetchRes = await fetch(csvUrl);
        if (fetchRes.ok) {
          const csvText = await fetchRes.text();
          const parsed = parseCSV(csvText);
          
          if (parsed && parsed.rows && parsed.rows.length > 0) {
            const { headers, rows } = parsed;

            let dayColIdx = headers.findIndex((h: string) => h.includes('day') || h.includes('giorno') || h.includes('#'));
            if (dayColIdx === -1) dayColIdx = 0;
            
            let linkColIdx = headers.findIndex((h: string) => h.includes('link') || h.includes('url') || h.includes('instagram') || h.includes('ig') || h.includes('video'));
            if (linkColIdx === -1) linkColIdx = 1;
            
            let descColIdx = headers.findIndex((h: string) => h.includes('desc') || h.includes('challenge') || h.includes('concept') || h.includes('copia') || h.includes('detail') || h.includes('cosa'));
            if (descColIdx === -1) descColIdx = 2;
            
            let styleColIdx = headers.findIndex((h: string) => h.includes('style') || h.includes('editing') || h.includes('aest') || h.includes('stile') || h.includes('visu') || h.includes('format'));
            if (styleColIdx === -1) styleColIdx = 3;
            
            let resultsColIdx = headers.findIndex((h: string) => h.includes('result') || h.includes('risultat') || h.includes('growth') || h.includes('metric') || h.includes('views') || h.includes('follower'));
            if (resultsColIdx === -1) resultsColIdx = 4;

            const mapped = rows.map((row, idx) => {
              const day = parseInt(row[dayColIdx]) || (idx + 1);
              return {
                day: day,
                link: row[linkColIdx] || "",
                description: row[descColIdx] || "",
                style: row[styleColIdx] || "",
                results: row[resultsColIdx] || ""
              };
            });
            
            const filteredMapped = mapped.filter(item => item.link || item.description);
            if (filteredMapped.length > 0) {
              console.log(`[Creator Examples] Successfully loaded ${filteredMapped.length} rows from Google Sheet.`);
              return res.json({ source: 'sheet', data: filteredMapped });
            }
          }
        } else {
          console.error("[Creator Examples] Google Sheet fetch responded negative:", fetchRes.status);
        }
      } catch (err) {
        console.error("[Creator Examples] Error fetching/parsing sheet, falling back to static:", err);
      }
    }

    res.json({ source: 'local', data: defaultCreatorExamples });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Instagram Video Thumbnail Proxy
get("/api/instagram-video-thumbnail", async (req: any, res: any) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) {
      return res.status(400).send("No URL provided");
    }

    let shortcode = "";
    // e.g. https://www.instagram.com/reel/C7W24v8S9_d/ or https://www.instagram.com/p/C7W24v8S9_d
    const match = videoUrl.match(/\/(?:p|reel|tv)\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      shortcode = match[1];
    } else {
      return res.status(400).send("Invalid Instagram URL");
    }

    // --- PHASE 1: DIRECT MEDIA ENDPOINT ---
    // Instagram offers direct media endpoints like `https://www.instagram.com/p/${shortcode}/media/?size=l`
    // which redirects directly to the facebook/instagram static CDN photo URL. This works extremely well
    // and is highly reliable since the final URL is hosted on a static public CDN (scontent.cdninstagram.com).
    const directMediaUrl = `https://www.instagram.com/p/${shortcode}/media/?size=l`;
    console.log(`[Instagram Thumbnail] Attempting direct media endpoint: ${directMediaUrl}`);
    try {
      const mediaController = new AbortController();
      const mediaTimeoutId = setTimeout(() => mediaController.abort(), 3000);
      
      const mediaResponse = await fetch(directMediaUrl, {
        signal: mediaController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        }
      });
      clearTimeout(mediaTimeoutId);

      if (mediaResponse.ok && mediaResponse.headers.get("content-type")?.startsWith("image/")) {
        console.log(`[Instagram Thumbnail] Successfully fetched image from media endpoint directly`);
        const contentType = mediaResponse.headers.get("content-type") || "image/jpeg";
        const buffer = await mediaResponse.arrayBuffer();
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
        return res.send(Buffer.from(buffer));
      }
    } catch (err: any) {
      console.log(`[Instagram Thumbnail] Direct media endpoint failed (${err.message}). Trying embed endpoint fallback...`);
    }

    // --- PHASE 2: EMBED SCRAPER ENDPOINT ---
    console.log(`[Instagram Thumbnail] Fetching embed for shortcode: ${shortcode}`);
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(embedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();
      let imageUrl = "";

      // 1. Try matching "display_url" JSON field in script tags
      const displayUrlMatch = html.match(/"display_url"\s*:\s*"([^"]+)"/);
      if (displayUrlMatch && displayUrlMatch[1]) {
        imageUrl = displayUrlMatch[1].replace(/\\u0026/g, '&');
      }

      // 2. Try match og:image meta tag
      if (!imageUrl) {
        const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) || 
                             html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
        if (ogImageMatch && ogImageMatch[1]) {
          imageUrl = ogImageMatch[1].replace(/\\u0026/g, '&');
        }
      }

      // 3. Try match EmbeddedMediaImage img src
      if (!imageUrl) {
        const embeddedImgMatch = html.match(/class=["']EmbeddedMediaImage["'][^>]*src=["']([^"']+)["']/i);
        if (embeddedImgMatch && embeddedImgMatch[1]) {
          imageUrl = embeddedImgMatch[1].replace(/\\u0026/g, '&');
        }
      }

      // 4. Try any fbcdn image URL
      if (!imageUrl) {
        const generalUrlMatch = html.match(/(https:\/\/[a-zA-Z0-9.-]+\.fbcdn\.net\/v\/[^"'\s]+?\.(?:jpg|jpeg|png|webp)[^"'\s]*)/);
        if (generalUrlMatch && generalUrlMatch[1]) {
          imageUrl = generalUrlMatch[1].replace(/\\u0026/g, '&');
        }
      }

      if (imageUrl) {
        console.log(`[Instagram Thumbnail] Proxying extracted image: ${imageUrl}`);
        
        const imgController = new AbortController();
        const imgTimeoutId = setTimeout(() => imgController.abort(), 4000);

        const imgRes = await fetch(imageUrl, {
          signal: imgController.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          }
        });

        clearTimeout(imgTimeoutId);

        if (imgRes.ok) {
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          const buffer = await imgRes.arrayBuffer();

          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
          return res.send(Buffer.from(buffer));
        }
      }
    }

    console.warn(`[Instagram Thumbnail] Extraction failed for ${shortcode}. Using high-quality placeholder image proxy.`);

    // --- PHASE 3: GRACEFUL PREMIUM PLACEHOLDER FLOW ---
    // Fetch and proxy a gorgeous Unsplash mockup creator placeholder directly, keeping a standard image stream 
    // to maintain same-origin safety and avoid client-side image-load context errors.
    const fallbackUrl = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=60";
    const placeholderRes = await fetch(fallbackUrl);
    if (placeholderRes.ok) {
      const buffer = await placeholderRes.arrayBuffer();
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(Buffer.from(buffer));
    } else {
      return res.redirect(fallbackUrl);
    }

  } catch (error: any) {
    console.warn(`[Instagram Thumbnail Proxy Fallback]:`, error.message);
    return res.redirect("https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=60");
  }
});

// Community mock
get("/api/community/membership", (req: any, res: any) => res.json({ isMember: false }));

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Express Error:", err);
  res.status(500).json({ 
    error: err.message || "Internal Server Error",
    path: req.url,
    method: req.method
  });
});

// Final catch-all for 404s within the API block
app.use('/api', (req, res) => {
  res.status(404).json({ 
    error: "API Endpoint not found", 
    path: req.url, 
    method: req.method,
    hint: "Check if you're hitting /api/login or just /login"
  });
});

// 6. Startup
if (!process.env.VERCEL) {
  initDb().catch(err => console.error("Immediate startup DB failure:", err));
}

// 7. Export for Vercel
export default app;
