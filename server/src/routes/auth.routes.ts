import { Router } from "express";
import { getCurrentUser, login, register } from "../controllers/auth.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get(
    "/me",
    verifyToken,
    getCurrentUser
);

export default router;