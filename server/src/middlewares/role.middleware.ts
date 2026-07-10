import { NextFunction, Request, Response } from "express";

type Role = "USER" | "ADMIN";

export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Utilisateur non authentifié",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Accès interdit",
      });
    }

    next();
  };
}