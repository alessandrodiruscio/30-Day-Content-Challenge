import express from "express";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

// 1. Load environment variables
dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "escape_9_to_5_super_secret_key";

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 2. Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 3. Health Check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Server is alive - Unified Minimal",
    env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    db_configured: !!process.env.DB_HOST,
    timestamp: new Date().toISOString()
  });
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
    connectTimeout: 5000, 
  };
};

let pool: mysql.Pool;
let dbInitialized = false;

const getPool = () => {
  if (!pool) {
    const config = getDbConfig();
    if ((!process.env.DB_HOST || config.host === "127.0.0.1") && process.env.VERCEL) {
      throw new Error("DATABASE_CONFIG_ERROR: No DB_HOST provided.");
    }
    pool = mysql.createPool(config);
  }
  return pool;
};

const initDb = async () => {
  const db = getPool();
  await db.execute(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, niche VARCHAR(255), products TEXT, problems TEXT, audience TEXT, tone VARCHAR(255), contentType VARCHAR(255), primaryCTA TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS strategies (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255) NOT NULL, data LONGTEXT NOT NULL, start_date VARCHAR(255), completed_days TEXT, day_checklist TEXT, day_notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  try { await db.execute('ALTER TABLE strategies MODIFY COLUMN data LONGTEXT NOT NULL'); } catch (e) {}
  await db.execute(`CREATE TABLE IF NOT EXISTS achievements (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(255) UNIQUE NOT NULL, name_en VARCHAR(255) NOT NULL, name_es VARCHAR(255) NOT NULL, description_en TEXT NOT NULL, description_es TEXT NOT NULL, icon VARCHAR(255) NOT NULL, tier VARCHAR(50) NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS user_achievements (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, achievement_id INT NOT NULL, strategy_id INT, unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY user_ach_at (user_id, achievement_id, strategy_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE, FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE)`);
  const [rows]: any = await db.execute('SELECT COUNT(*) as count FROM achievements');
  if (rows[0].count === 0) {
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

// 5. Routes
app.post("/api/register", async (req, res) => {
  try {
    if (!dbInitialized) { await initDb(); dbInitialized = true; }
    const { email, password } = req.body;
    const db = getPool();
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result]: any = await db.execute('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
    const token = jwt.sign({ id: result.insertId, email }, JWT_SECRET);
    res.json({ token, user: { id: result.insertId, email } });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Register failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    if (!dbInitialized) { await initDb(); dbInitialized = true; }
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
    res.status(500).json({ error: error.message || "Login failed" });
  }
});

app.get("/api/me", authenticateToken, async (req: any, res) => {
  try {
    const db = getPool();
    const [rows]: any = await db.execute('SELECT id, email, niche, products, problems, audience, tone, contentType, primaryCTA FROM users WHERE id = ?', [req.user.id]);
    res.json({ user: rows[0] });
  } catch (error) { res.status(500).json({ error: "Fetch failed" }); }
});

app.put("/api/profile", authenticateToken, async (req: any, res) => {
  try {
    const { niche, products, problems, audience, tone, contentType, primaryCTA } = req.body;
    const db = getPool();
    await db.execute('UPDATE users SET niche=?, products=?, problems=?, audience=?, tone=?, contentType=?, primaryCTA=? WHERE id=?', [niche || null, products || null, problems || null, audience || null, tone || null, contentType || null, primaryCTA || null, req.user.id]);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get("/api/strategies", authenticateToken, async (req: any, res) => {
  try {
    const db = getPool();
    const [rows]: any = await db.execute('SELECT * FROM strategies WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(rows.map((s: any) => ({
      id: s.id, title: s.title, data: JSON.parse(s.data), start_date: s.start_date,
      completed_days: JSON.parse(s.completed_days || '[]'),
      day_checklist: JSON.parse(s.day_checklist || '{}'),
      day_notes: JSON.parse(s.day_notes || '{}'),
      created_at: s.created_at
    })));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post("/api/strategies", authenticateToken, async (req: any, res) => {
  try {
    const { title, data, start_date } = req.body;
    const db = getPool();
    const [result]: any = await db.query('INSERT INTO strategies (user_id, title, data, start_date) VALUES (?, ?, ?, ?)', [req.user.id, title, JSON.stringify(data), start_date || null]);
    res.json({ id: result.insertId, title, data, start_date });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.patch("/api/strategies/:id", authenticateToken, async (req: any, res) => {
  try {
    const { title, data, start_date } = req.body;
    const db = getPool();
    await db.query('UPDATE strategies SET title = ?, data = ?, start_date = ? WHERE id = ? AND user_id = ?', [title, JSON.stringify(data), start_date || null, req.params.id, req.user.id]);
    res.json({ id: req.params.id, title, data, start_date });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post("/api/strategies/:id/progress", authenticateToken, async (req: any, res) => {
  try {
    const { completed_days, day_checklist } = req.body;
    const db = getPool();
    await db.execute('UPDATE strategies SET completed_days = ?, day_checklist = ? WHERE id = ? AND user_id = ?', [JSON.stringify(completed_days), JSON.stringify(day_checklist), req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete("/api/strategies/:id", authenticateToken, async (req: any, res) => {
  try {
    const db = getPool();
    await db.execute('DELETE FROM strategies WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get("/api/achievements", authenticateToken, async (req: any, res) => {
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

// Community mock
app.get("/api/community/membership", (req, res) => res.json({ isMember: false }));

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Express Error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// 6. Export for Vercel
export default app;
