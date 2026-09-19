import { Request, Response, NextFunction } from "express";
import * as recipes from "../services/recipe.service";
import { positiveId } from "../services/stock.validation";
import { ApiError } from "../utils/api-error";

function account(req: Request) {
  if (!req.user) throw new ApiError(401, "Utilisateur non authentifié");
  return req.user;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try { res.json(await recipes.listRecipes(req.query)); }
  catch (error) { next(error); }
}
export async function read(req: Request, res: Response, next: NextFunction) {
  try { res.json({ recipe: await recipes.getRecipe(positiveId(req.params.id)) }); }
  catch (error) { next(error); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json({ recipe: await recipes.createRecipe(account(req), req.body) }); }
  catch (error) { next(error); }
}
export async function replace(req: Request, res: Response, next: NextFunction) {
  try { res.json({ recipe: await recipes.replaceRecipe(positiveId(req.params.id), account(req), req.body) }); }
  catch (error) { next(error); }
}
export async function remove(req: Request, res: Response, next: NextFunction) {
  try { await recipes.deleteRecipe(positiveId(req.params.id), account(req)); res.status(204).end(); }
  catch (error) { next(error); }
}
export async function categories(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ items: await recipes.listCategories() }); }
  catch (error) { next(error); }
}
