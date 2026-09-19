import { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/api-error";

export const handleApiError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({ message: "Cet ingrédient existe déjà à cet emplacement. Modifiez sa quantité." });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({ message: "Ligne de stock introuvable" });
      return;
    }
    if (error.code === "P2003") {
      res.status(409).json({ message: "Une donnée associée a changé. Actualisez la liste." });
      return;
    }
  }
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ message: "Le corps de la requête doit être un JSON valide" });
    return;
  }
  if (error?.type === "entity.too.large") {
    res.status(413).json({ message: "Requête trop volumineuse" });
    return;
  }
  res.status(500).json({ message: "Erreur interne du serveur" });
};
