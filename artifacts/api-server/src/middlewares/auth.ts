import type { Request, Response, NextFunction } from "express";

const OWNER_ROLES = ["owner", "developer"];

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.staffId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.staffId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!OWNER_ROLES.includes(session.staffRole)) {
    res.status(403).json({ error: "Forbidden — owner access required" });
    return;
  }
  next();
}
