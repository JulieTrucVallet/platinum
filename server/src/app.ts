import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import accountRoutes from "./routes/account.routes";
import authRoutes from "./routes/auth.routes";
import stockRoutes from "./routes/stock.routes";
import * as preferences from "./controllers/preference.controller";
import recipeRoutes from "./routes/recipe.routes";
import { verifyToken } from "./middlewares/auth.middleware";
import { handleApiError } from "./middlewares/error.middleware";
import { ingredients } from "./controllers/stock.controller";

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "API PLATINUM running" });
});

app.use("/api/auth", authRoutes);

app.use("/api/admin/users", accountRoutes);

app.use("/api/stock", stockRoutes);

app.use("/api/recipes", recipeRoutes);

app.get("/api/ingredients", ingredients);

app.get("/api/preferences", preferences.catalogue);

app.get("/api/preferences/me", verifyToken, preferences.read);

app.put("/api/preferences/me", verifyToken, preferences.replace);

app.get("/api/suggestions", verifyToken, preferences.suggestions);

app.use(handleApiError);

export default app;
