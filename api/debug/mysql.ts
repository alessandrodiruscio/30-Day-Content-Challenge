import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool, initDb } from "../_lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await initDb();
    const db = getPool();
    const [rows]: any = await db.execute('SELECT 1 as connected');
    res.json({ status: "connected", result: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
