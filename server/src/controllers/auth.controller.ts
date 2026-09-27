import { Request, Response, NextFunction } from "express";
import { loginUser, registerUser } from "../services/auth.service";
import { getAccount, updateAccount } from "../services/account.service";
import { objectFields } from "../services/stock.validation";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email, password } = objectFields(req.body, ["username", "email", "password"]);
    res.status(201).json({ message: "Compte créé avec succès", user: await registerUser(username, email, password) });
  } catch (error) { next(error); }
}
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    // Les anciens clients peuvent aussi transmettre le nom, sans effet sur l’authentification.
    const { email, password } = objectFields(req.body, ["username", "email", "password"]);
    res.json({ message: "Connexion réussie", ...await loginUser(email, password) });
  } catch (error) { next(error); }
}
export async function getCurrentUser(req: Request, res: Response, next: NextFunction) {
  try { res.json(await getAccount(req.user!.id)); } catch (error) { next(error); }
}
export async function updateCurrentUser(req: Request, res: Response, next: NextFunction) {
  try { res.json(await updateAccount(req.user!.id, req.body)); } catch (error) { next(error); }
}
