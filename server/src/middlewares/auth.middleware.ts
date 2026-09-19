import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Token manquant",
    });
  }

  const token = authHeader.split(" ")[1];

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ message: "Configuration du serveur indisponible" });
  let decoded;
  try {
    decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (typeof decoded === "string" || !Number.isInteger(decoded.id) ||
        decoded.id <= 0 || decoded.id > 2147483647 ||
        typeof decoded.exp !== "number") {
      return res.status(401).json({ message: "Token invalide" });
    }
  } catch {
    return res.status(401).json({
      message: "Token invalide",
    });
  }
  try {
    // Le compte et son rôle actuel font autorité, même si le jeton est encore valide.
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }, select: { id: true, role: true },
    });
    if (!user) return res.status(401).json({ message: "Compte indisponible" });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
