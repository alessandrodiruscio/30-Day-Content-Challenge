import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "../../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    res.json({ versions: [] });
  } else if (req.method === "POST") {
    // This is for restore
    res.json({ success: true });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
