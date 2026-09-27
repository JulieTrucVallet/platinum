import { Request, Response, NextFunction } from "express";
import * as accounts from "../services/account.service";
import { positiveId } from "../services/stock.validation";
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await accounts.listAccounts(req.query));
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await accounts.deleteAccount(positiveId(req.params.id), req.user!.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
