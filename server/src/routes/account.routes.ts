import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import * as accounts from "../controllers/account.controller";
const router = Router();

router.use(verifyToken, authorizeRoles("ADMIN"));

router.get("/", accounts.list);

router.delete("/:id", accounts.remove);

export default router;
