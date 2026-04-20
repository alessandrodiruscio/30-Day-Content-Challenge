import express from "express";
import path from "path";
import fs from "fs";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

// Conditional Vite import to avoid crashes in production
let createViteServer: any = null;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "escape_9_to_5_super_secret_key";

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// DB Configuration
const getDbConfig = () => {
  const host = process.env.DB_HOST;
  if (!host && process.env.VERCEL) {
    console.error("CRITICAL: DB_HOST environment variable is missing for Vercel deployment.");
  }
  return {
    host: host || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "database",
    port: parseInt(process.env.DB_PORT || "3306"),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 5000, // Reduced from 30s to 5s for faster failure on Vercel
  };
};

let pool: mysql.Pool;
let dbInitialized = false;

const getPool = () => {
  if (!pool) {
    const config = getDbConfig();
    // Fail immediately if we are on Vercel and host is default/missing
    if ((!process.env.DB_HOST || config.host === "127.0.0.1") && process.env.VERCEL) {
      throw new Error("DATABASE_CONFIG_ERROR: No DB_HOST provided. Please set up your database environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) in Vercel settings.");
    }
    pool = mysql.createPool(config);
  }
  return pool;
};

// Initialize DB schema
const initDb = async () => {
  try {
    const db = getPool();
    
    // Create tables if they don't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        niche VARCHAR(255),
        products TEXT,
        problems TEXT,
        audience TEXT,
        tone VARCHAR(255),
        contentType VARCHAR(255),
        primaryCTA TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS strategies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        data LONGTEXT NOT NULL,
        start_date VARCHAR(255),
        completed_days TEXT,
        day_checklist TEXT,
        day_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Ensure data is LONGTEXT (might have been created as TEXT before)
    try {
      await db.execute('ALTER TABLE strategies MODIFY COLUMN data LONGTEXT NOT NULL');
    } catch (e) {}
    try {
      await db.execute('ALTER TABLE strategies MODIFY COLUMN day_notes LONGTEXT');
    } catch (e) {}
    try {
      await db.execute('ALTER TABLE strategies MODIFY COLUMN day_checklist LONGTEXT');
    } catch (e) {}

    await db.execute(`
      CREATE TABLE IF NOT EXISTS achievements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(255) UNIQUE NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        name_es VARCHAR(255) NOT NULL,
        description_en TEXT NOT NULL,
        description_es TEXT NOT NULL,
        icon VARCHAR(255) NOT NULL,
        tier VARCHAR(50) NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        achievement_id INT NOT NULL,
        strategy_id INT,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY user_ach_at (user_id, achievement_id, strategy_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
        FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
      )
    `);

    // Seed achievements if empty
    const [rows]: any = await db.execute('SELECT COUNT(*) as count FROM achievements');
    if (rows[0].count === 0) {
      const initialAchievements = [
        ['FIRST_STRATEGY', 'Strategic Visionary', 'Visionario Estratégico', 'Created your first 30-day challenge.', 'Creó su primer desafío de 30 días.', 'Target', 'bronze'],
        ['WEEK_ONE', 'Week One Warrior', 'Guerrero de la Primera Semana', 'Completed 7 days of content.', 'Completó 7 días de contenido.', 'Zap', 'silver'],
        ['HALF_WAY', 'Consistent Creator', 'Creador Consistente', 'Completed 15 days of content.', 'Completó 15 días de contenido.', 'Calendar', 'gold'],
        ['COMPLETED', 'Challenge Master', 'Maestro del Desafío', 'Completed the full 30-day challenge!', '¡Completó el desafío completo de 30 días!', 'Trophy', 'platinum']
      ];
      for (const ach of initialAchievements) {
        await db.execute(
          'INSERT INTO achievements (code, name_en, name_es, description_en, description_es, icon, tier) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ach
        );
      }
    }
    
    // Ensure all columns exist for migration cases
    const columns = [
      'ALTER TABLE users ADD COLUMN niche VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN products TEXT',
      'ALTER TABLE users ADD COLUMN problems TEXT',
      'ALTER TABLE users ADD COLUMN audience TEXT',
      'ALTER TABLE users ADD COLUMN tone VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN contentType VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN primaryCTA TEXT'
    ];
    
    for (const sql of columns) {
      try {
        await db.execute(sql);
      } catch (e) {} 
    }
    console.log("Database schema verified.");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
};

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

// Lazy DB Init Middleware for Vercel
const ensureDb = async (req: any, res: any, next: any) => {
  if (!dbInitialized && req.url.startsWith('/api') && !req.url.includes('/api/health')) {
    try {
      console.log("Lazy initializing database schema...");
      await initDb();
      dbInitialized = true;
    } catch (err: any) {
      console.error("Lazy DB initialization failed:", err);
      // We don't block here, let the handler fail naturally with better error reporting
    }
  }
  next();
};

app.use(ensureDb);

// Routes (Restoring core logic)

// 1. Auth
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    db_configured: !!process.env.DB_HOST 
  });
});

app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getPool();
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result]: any = await db.execute(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword]
    );
    const token = jwt.sign({ id: result.insertId, email }, JWT_SECRET);
    res.json({ token, user: { id: result.insertId, email } });
  } catch (error: any) {
    console.error("Register Error:", error);
    res.status(400).json({ error: "User already exists or database error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getPool();
    const [rows]: any = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error: any) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/forgot-password", (req, res) => {
  res.json({ message: "Reset link sent to your email (Demo: checks not required)" });
});

app.post("/api/reset-password", (req, res) => {
  res.json({ message: "Password updated successfully" });
});

app.get("/api/me", authenticateToken, async (req: any, res) => {
  try {
    const db = getPool();
    const [rows]: any = await db.execute('SELECT id, email, niche, products, problems, audience, tone, contentType, primaryCTA FROM users WHERE id = ?', [req.user.id]);
    res.json({ user: rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// 2. Profile
app.put("/api/profile", authenticateToken, async (req: any, res) => {
  try {
    const { niche, products, problems, audience, tone, contentType, primaryCTA } = req.body;
    const db = getPool();
    
    // Ensure columns exist first (idempotent check)
    try {
      await db.execute('ALTER TABLE users ADD COLUMN niche VARCHAR(255)');
    } catch (e) {}
    try {
      await db.execute('ALTER TABLE users ADD COLUMN products TEXT');
    } catch (e) {}
    try {
      await db.execute('ALTER TABLE users ADD COLUMN problems TEXT');
    } catch (e) {}
    try {
      await db.execute('ALTER TABLE users ADD COLUMN audience TEXT');
    } catch (e) {}
    try {
      await db.execute('ALTER TABLE users ADD COLUMN tone VARCHAR(255)');
    } catch (e) {}
    try {
      await db.execute('ALTER TABLE users ADD COLUMN contentType VARCHAR(255)');
    } catch (e) {}
    try {
      await db.execute('ALTER TABLE users ADD COLUMN primaryCTA TEXT');
    } catch (e) {}

    await db.execute(
      'UPDATE users SET niche=?, products=?, problems=?, audience=?, tone=?, contentType=?, primaryCTA=? WHERE id=?',
      [niche || null, products || null, problems || null, audience || null, tone || null, contentType || null, primaryCTA || null, req.user.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Strategies
app.get("/api/strategies", authenticateToken, async (req: any, res) => {
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
          day_notes: (() => { try { return s.day_notes ? (typeof s.day_notes === 'string' ? JSON.parse(s.day_notes) : s.day_notes) : {}; } catch { return {}; } })(),
          created_at: s.created_at
        };
      } catch (e) {
        console.error("Error parsing strategy row:", s.id, e);
        return null;
      }
    }).filter(Boolean));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/strategies/:id", authenticateToken, async (req: any, res) => {
  try {
    const db = getPool();
    const [rows]: any = await db.execute(
      'SELECT * FROM strategies WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Strategy not found" });
    const s = rows[0];
    res.json({
      id: s.id,
      title: s.title,
      data: typeof s.data === 'string' ? JSON.parse(s.data) : s.data,
      start_date: s.start_date,
      completed_days: typeof s.completed_days === 'string' ? JSON.parse(s.completed_days) : (s.completed_days || []),
      day_checklist: typeof s.day_checklist === 'string' ? JSON.parse(s.day_checklist) : (s.day_checklist || {}),
      day_notes: (() => { try { return s.day_notes ? (typeof s.day_notes === 'string' ? JSON.parse(s.day_notes) : s.day_notes) : {}; } catch { return {}; } })(),
      created_at: s.created_at
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/strategies", authenticateToken, async (req: any, res) => {
  try {
    const { title, data, start_date } = req.body;
    if (!title || !data) return res.status(400).json({ error: "Missing title or strategy data" });
    
    const db = getPool();
    // Using query instead of execute for potentially very large JSON payloads
    const [result]: any = await db.query(
      'INSERT INTO strategies (user_id, title, data, start_date) VALUES (?, ?, ?, ?)',
      [req.user.id, title, JSON.stringify(data), start_date || null]
    );
    res.json({ id: result.insertId, title, data, start_date });
  } catch (error: any) {
    console.error("Strategy Create Error:", error);
    res.status(500).json({ error: "Failed to save strategy: " + error.message });
  }
});

app.patch("/api/strategies/:id", authenticateToken, async (req: any, res) => {
  try {
    const { title, data, start_date } = req.body;
    const db = getPool();
    // Using query for large payloads
    await db.query(
      'UPDATE strategies SET title = ?, data = ?, start_date = ? WHERE id = ? AND user_id = ?',
      [title, JSON.stringify(data), start_date || null, req.params.id, req.user.id]
    );
    res.json({ id: req.params.id, title, data, start_date });
  } catch (error: any) {
    console.error("Strategy Update Error:", error);
    res.status(500).json({ error: "Failed to update strategy: " + error.message });
  }
});

app.post("/api/strategies/:id/progress", authenticateToken, async (req: any, res) => {
  try {
    const { completed_days, day_checklist } = req.body;
    const db = getPool();
    await db.execute(
      'UPDATE strategies SET completed_days = ?, day_checklist = ? WHERE id = ? AND user_id = ?',
      [JSON.stringify(completed_days), JSON.stringify(day_checklist), req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/strategies/:id/notes", authenticateToken, async (req: any, res) => {
  try {
    const { day_notes } = req.body;
    const db = getPool();
    await db.execute(
      'UPDATE strategies SET day_notes = ? WHERE id = ? AND user_id = ?',
      [JSON.stringify(day_notes), req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/strategies/:id/script-versions", authenticateToken, (req, res) => {
  res.json({ versions: [] });
});

app.post("/api/strategies/:id/script-versions/restore", authenticateToken, (req, res) => {
  res.json({ success: true });
});

app.delete("/api/strategies/:id", authenticateToken, async (req: any, res) => {
  try {
    const db = getPool();
    await db.execute('DELETE FROM strategies WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Achievements
app.get("/api/achievements", authenticateToken, async (req: any, res) => {
  try {
    const db = getPool();
    const strategyId = req.query.strategyId;
    
    // Get all achievements
    const [allAchievements]: any = await db.execute('SELECT * FROM achievements');
    
    // Get unlocked achievements for this user
    let unlockedQuery = 'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?';
    let queryParams: any[] = [req.user.id];
    
    if (strategyId) {
      unlockedQuery += ' AND (strategy_id = ? OR strategy_id IS NULL)';
      queryParams.push(strategyId);
    }
    
    const [unlockedRows]: any = await db.execute(unlockedQuery, queryParams);
    
    const unlockedMap = new Map();
    unlockedRows.forEach((r: any) => unlockedMap.set(r.achievement_id, r.unlocked_at));
    
    const achievements = allAchievements.map((a: any) => ({
      ...a,
      unlocked_at: unlockedMap.get(a.id) || null
    }));
    
    res.json({ achievements });
  } catch (error: any) {
    console.error("Fetch achievements error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Debug
app.get("/api/debug/mysql", async (req, res) => {
  try {
    const db = getPool();
    const [rows]: any = await db.execute('SELECT 1 as connected');
    res.json({ status: "connected", result: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Community mock
app.get("/api/community/membership", authenticateToken, (req, res) => {
  res.json({ isMember: false, discordUrl: "https://discord.gg/mock", trialUrl: "https://mock.com" });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global Error:", err);
  res.status(500).json({ 
    error: err.message || "Internal Server Error",
    stack: err.stack, // Always show stack on Vercel for easier debugging
    phase: "global_error_handler"
  });
});

// Export for Vercel
export default app;

// Vite Middleware
async function startServer() {
  await initDb();
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    if (!createViteServer) {
      const viteModule = await import("vite");
      createViteServer = viteModule.createServer;
    }
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return res.status(404).json({ error: `API route not found: ${req.method} ${url}` });
      }
      try {
        let template = fs.readFileSync(path.resolve("index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve("dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  // Only listen if not running as a Vercel serverless function
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

// Start if not in Vercel environment (Vercel will import the app and use its own runner)
if (!process.env.VERCEL) {
  startServer();
}
