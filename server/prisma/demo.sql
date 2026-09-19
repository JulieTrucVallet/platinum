-- Optional demonstration catalogue. Does not create users or overwrite data.
-- Run with psql ON_ERROR_STOP=1; safe to rerun for this catalogue version.
BEGIN;
INSERT INTO "Category" (name,slug) VALUES ('Plat','plat') ON CONFLICT (slug) DO NOTHING;
INSERT INTO "FoodPreference" (name,slug) VALUES ('Végétarien','vegetarien'),('Végétalien','vegetalien') ON CONFLICT (slug) DO NOTHING;
INSERT INTO "Ingredient" (name,slug,unit) VALUES
  ('Poulet','poulet','GRAM'),('Riz','riz','GRAM'),('Carotte','carotte','GRAM'),
  ('Citron','citron','PIECE'),('Eau','eau','MILLILITER'),('Lait','lait','MILLILITER')
ON CONFLICT (slug) DO NOTHING;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "Ingredient" i JOIN (VALUES
      ('poulet','GRAM'),('riz','GRAM'),('carotte','GRAM'),
      ('citron','PIECE'),('eau','MILLILITER'),('lait','MILLILITER')
    ) AS expected(slug,unit) ON expected.slug=i.slug WHERE i.unit::text<>expected.unit
  ) THEN RAISE EXCEPTION 'Existing catalogue units conflict with demonstration quantities; no changes were applied'; END IF;
END $$;

INSERT INTO "Recipe" (title,instructions,servings,"preparationMinutes","cookingMinutes",difficulty,source,"categoryId","updatedAt")
SELECT 'Poulet au citron — exemple','Découper le poulet, préparer le citron, puis cuire complètement le poulet avec le jus de citron. Recette simplifiée pour la démonstration.',2,10,20,'EASY','platinum-demo-v1/poulet-citron',c.id,NOW()
FROM "Category" c WHERE c.slug='plat' AND NOT EXISTS (SELECT 1 FROM "Recipe" WHERE source='platinum-demo-v1/poulet-citron');
INSERT INTO "Recipe" (title,instructions,servings,"preparationMinutes","cookingMinutes",difficulty,source,"categoryId","updatedAt")
SELECT 'Riz aux carottes — exemple','Laver et découper les carottes. Cuire le riz et les carottes dans l’eau. Recette simplifiée pour la démonstration.',2,10,20,'EASY','platinum-demo-v1/riz-carottes',c.id,NOW()
FROM "Category" c WHERE c.slug='plat' AND NOT EXISTS (SELECT 1 FROM "Recipe" WHERE source='platinum-demo-v1/riz-carottes');

INSERT INTO "RecipeIngredient" ("recipeId","ingredientId",quantity)
SELECT r.id,i.id,v.quantity FROM (VALUES
  ('platinum-demo-v1/poulet-citron','poulet',500),
  ('platinum-demo-v1/poulet-citron','citron',2),
  ('platinum-demo-v1/riz-carottes','riz',150),
  ('platinum-demo-v1/riz-carottes','carotte',200),
  ('platinum-demo-v1/riz-carottes','eau',300)
) v(source,slug,quantity) JOIN "Recipe" r ON r.source=v.source JOIN "Ingredient" i ON i.slug=v.slug
ON CONFLICT ("recipeId","ingredientId") DO NOTHING;

INSERT INTO "RecipePreference" ("recipeId","preferenceId")
SELECT r.id,p.id FROM "Recipe" r CROSS JOIN "FoodPreference" p
WHERE r.source='platinum-demo-v1/riz-carottes' AND p.slug IN ('vegetarien','vegetalien')
ON CONFLICT ("recipeId","preferenceId") DO NOTHING;
COMMIT;
