import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import * as recipes from "../controllers/recipe.controller";

import { tagRecipe } from "../controllers/preference.controller";

const router = Router();
router.get("/categories", recipes.categories);
router.get("/", recipes.list);
router.get("/:id", recipes.read);
router.post("/", verifyToken, recipes.create);
router.put("/:id/preferences", verifyToken, tagRecipe);
router.put("/:id", verifyToken, recipes.replace);
router.delete("/:id", verifyToken, recipes.remove);
export default router;
