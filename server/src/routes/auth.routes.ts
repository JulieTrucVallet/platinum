import { Router } from "express";
import {
    getCurrentUser,
    login,
    register,
} from "../controllers/auth.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", verifyToken, getCurrentUser);

router.get(
  "/admin-test",
  verifyToken,
  authorizeRoles("ADMIN"),
  (_req, res) => {
    res.status(200).json({
      message: "Accès administrateur autorisé",
    });
  }
);

export default router;