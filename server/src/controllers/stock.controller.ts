import { Request, Response, NextFunction } from "express";
import * as stock from "../services/stock.service";
import { positiveId } from "../services/stock.validation";
import { ApiError } from "../utils/api-error";

function owner(req: Request): number {
  if (!req.user) throw new ApiError(401, "Utilisateur non authentifié");
  return req.user.id;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try { res.json({ items: await stock.listStock(owner(req), req.query) }); } catch (error) { next(error); }
}
export async function read(req: Request, res: Response, next: NextFunction) {
  try { res.json({ item: await stock.getStockItem(owner(req), positiveId(req.params.id)) }); } catch (error) { next(error); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json({ item: await stock.createStockItem(owner(req), req.body) }); } catch (error) { next(error); }
}
export async function update(req: Request, res: Response, next: NextFunction) {
  try { res.json({ item: await stock.updateStockItem(owner(req), positiveId(req.params.id), req.body) }); } catch (error) { next(error); }
}
export async function remove(req: Request, res: Response, next: NextFunction) {
  try { await stock.deleteStockItem(owner(req), positiveId(req.params.id)); res.status(204).end(); } catch (error) { next(error); }
}
export async function ingredients(req: Request, res: Response, next: NextFunction) {
  try { res.json(await stock.listIngredients(req.query)); } catch (error) { next(error); }
}
