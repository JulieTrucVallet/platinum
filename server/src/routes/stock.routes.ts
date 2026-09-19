import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import * as stock from "../controllers/stock.controller";

const router = Router();
router.use(verifyToken);
router.get("/", stock.list);
router.get("/:id", stock.read);
router.post("/", stock.create);
router.patch("/:id", stock.update);
router.delete("/:id", stock.remove);
export default router;
