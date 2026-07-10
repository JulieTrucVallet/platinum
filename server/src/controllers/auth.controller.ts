import { Request, Response } from "express";
import { loginUser, registerUser } from "../services/auth.service";

export async function register(req: Request, res: Response) {
  try {
    const { username, email, password } = req.body;

    const user = await registerUser(username, email, password);

    res.status(201).json({
      message: "Compte créé avec succès",
      user,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    res.status(400).json({ message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const result = await loginUser(email, password);

    res.status(200).json({
      message: "Connexion réussie",
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    res.status(401).json({ message });
  }
}

export function getCurrentUser(
    req: Request,
    res: Response
) {
    res.json(req.user);
}