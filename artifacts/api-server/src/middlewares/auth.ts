import type { Request, Response, NextFunction } from "express";

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.staffId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
