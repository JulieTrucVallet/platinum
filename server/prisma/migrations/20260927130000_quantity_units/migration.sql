ALTER TABLE "StockItem" ADD COLUMN "unit" "IngredientUnit";
ALTER TABLE "RecipeIngredient" ADD COLUMN "unit" "IngredientUnit";
-- Preserve every existing quantity in its original catalogue unit.
UPDATE "StockItem" s SET "unit" = i."unit" FROM "Ingredient" i WHERE s."ingredientId" = i.id;
UPDATE "RecipeIngredient" r SET "unit" = i."unit" FROM "Ingredient" i WHERE r."ingredientId" = i.id;
-- A fillet and a whole chicken are different ingredients; no weight is inferred.
INSERT INTO "Ingredient" (name,slug,unit,"isDefaultAvailable")
VALUES ('Filet de poulet','filet-de-poulet','PIECE',false)
ON CONFLICT (slug) DO NOTHING;
