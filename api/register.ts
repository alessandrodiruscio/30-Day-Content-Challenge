import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { getPool, initDb } from "./_lib/db";
import { signToken } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await initDb();
    const { email, password } = req.body;
    const db = getPool();
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result]: any = await db.execute(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword]
    );
    const token = signToken({ id: result.insertId, email });
    res.json({ token, user: { id: result.insertId, email } });
  } catch (error: any) {
    console.error("Register Error:", error);
    res.status(400).json({ error: "User already exists or database error" });
  }
}
