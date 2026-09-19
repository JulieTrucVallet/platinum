BEGIN;
-- CreateEnum
CREATE TYPE "IngredientUnit" AS ENUM ('GRAM', 'MILLILITER', 'PIECE');

-- CreateEnum
CREATE TYPE "StorageLocation" AS ENUM ('FRIDGE', 'FREEZER', 'PANTRY', 'CONDIMENTS');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "unit" "IngredientUnit" NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "location" "StorageLocation" NOT NULL DEFAULT 'PANTRY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "imageUrl" TEXT,
    "servings" INTEGER NOT NULL DEFAULT 2,
    "preparationMinutes" INTEGER NOT NULL DEFAULT 0,
    "cookingMinutes" INTEGER NOT NULL DEFAULT 0,
    "difficulty" "Difficulty",
    "source" TEXT,
    "authorId" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "recipeId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("recipeId","ingredientId")
);

-- CreateTable
CREATE TABLE "FoodPreference" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "FoodPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" INTEGER NOT NULL,
    "preferenceId" INTEGER NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId","preferenceId")
);

-- CreateTable
CREATE TABLE "RecipePreference" (
    "recipeId" INTEGER NOT NULL,
    "preferenceId" INTEGER NOT NULL,

    CONSTRAINT "RecipePreference_pkey" PRIMARY KEY ("recipeId","preferenceId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_slug_key" ON "Ingredient"("slug");

-- CreateIndex
CREATE INDEX "StockItem_ingredientId_idx" ON "StockItem"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_userId_ingredientId_location_key" ON "StockItem"("userId", "ingredientId", "location");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Recipe_authorId_idx" ON "Recipe"("authorId");

-- CreateIndex
CREATE INDEX "Recipe_categoryId_idx" ON "Recipe"("categoryId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_ingredientId_idx" ON "RecipeIngredient"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodPreference_slug_key" ON "FoodPreference"("slug");

-- CreateIndex
CREATE INDEX "UserPreference_preferenceId_idx" ON "UserPreference"("preferenceId");

-- CreateIndex
CREATE INDEX "RecipePreference_preferenceId_idx" ON "RecipePreference"("preferenceId");

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_preferenceId_fkey" FOREIGN KEY ("preferenceId") REFERENCES "FoodPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipePreference" ADD CONSTRAINT "RecipePreference_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipePreference" ADD CONSTRAINT "RecipePreference_preferenceId_fkey" FOREIGN KEY ("preferenceId") REFERENCES "FoodPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Business invariants not expressible as CHECK constraints in Prisma 6 schema syntax.
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_servings_positive" CHECK ("servings" > 0);
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_preparationMinutes_nonnegative" CHECK ("preparationMinutes" >= 0);
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_cookingMinutes_nonnegative" CHECK ("cookingMinutes" >= 0);

COMMIT;
