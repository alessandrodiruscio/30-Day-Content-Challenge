import app from "../server.ts";

export default async function handler(req: any, res: any) {
  return app(req, res);
}
