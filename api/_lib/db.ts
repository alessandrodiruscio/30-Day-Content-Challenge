import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
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
    });
  }
  return pool;
}

export async function initDb() {
  const db = getPool();

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

  try { await db.execute('ALTER TABLE strategies MODIFY COLUMN data LONGTEXT NOT NULL'); } catch {}
  try { await db.execute('ALTER TABLE strategies MODIFY COLUMN day_notes LONGTEXT'); } catch {}
  try { await db.execute('ALTER TABLE strategies MODIFY COLUMN day_checklist LONGTEXT'); } catch {}

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
    try { await db.execute(sql); } catch {}
  }
}
