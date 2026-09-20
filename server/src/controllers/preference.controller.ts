import { Request, Response, NextFunction } from "express";
import * as preferences from "../services/preference.service";
import { suggestRecipes } from "../services/suggestion.service";
import { positiveId } from "../services/stock.validation";
import { ApiError } from "../utils/api-error";

function account(req: Request) {
  if (!req.user) throw new ApiError(401, "Utilisateur non authentifié");
  return req.user;
}
export async function catalogue(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ items: await preferences.listPreferences() }); } catch (error) { next(error); }
}
export async function read(req: Request, res: Response, next: NextFunction) {
  try { res.json({ items: await preferences.getUserPreferences(account(req).id) }); } catch (error) { next(error); }
}
export async function replace(req: Request, res: Response, next: NextFunction) {
  try { res.json({ items: await preferences.replaceUserPreferences(account(req).id, req.body) }); } catch (error) { next(error); }
}
export async function tagRecipe(req: Request, res: Response, next: NextFunction) {
  try { res.json({ recipe: await preferences.replaceRecipePreferences(positiveId(req.params.id), account(req), req.body) }); } catch (error) { next(error); }
}
export async function suggestions(req: Request, res: Response, next: NextFunction) {
  try { res.json(await suggestRecipes(account(req).id, req.query)); } catch (error) { next(error); }
}
