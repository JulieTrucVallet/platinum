-- Integration checks. Use a disposable test database, never production.
-- All fixture rows are rolled back. psql must run with ON_ERROR_STOP=1.
BEGIN;

DO $$
DECLARE
  first_user INTEGER;
  second_user INTEGER;
  ingredient INTEGER;
  category INTEGER;
  recipe INTEGER;
  preference INTEGER;
  checks INTEGER := 0;
BEGIN
  INSERT INTO "User" (username,email,password) VALUES ('__db_test_a','__db_test_a@example.invalid','not-a-login-hash') RETURNING id INTO first_user;
  INSERT INTO "User" (username,email,password) VALUES ('__db_test_b','__db_test_b@example.invalid','not-a-login-hash') RETURNING id INTO second_user;
  IF (SELECT role FROM "User" WHERE id=first_user) <> 'USER' THEN RAISE EXCEPTION 'Default role is not USER'; END IF;
  checks := checks + 1;
  INSERT INTO "Ingredient" (name,slug,unit) VALUES ('Test ingredient','__db_test_ingredient','GRAM') RETURNING id INTO ingredient;
  INSERT INTO "Category" (name,slug) VALUES ('Test category','__db_test_category') RETURNING id INTO category;
  INSERT INTO "FoodPreference" (name,slug) VALUES ('Test preference','__db_test_preference') RETURNING id INTO preference;
  INSERT INTO "Recipe" (title,instructions,"authorId","categoryId","updatedAt") VALUES ('Test recipe','Test instructions',first_user,category,NOW()) RETURNING id INTO recipe;

  INSERT INTO "StockItem" ("userId","ingredientId",quantity,location,"updatedAt") VALUES
    (first_user,ingredient,250.125,'FRIDGE',NOW()),
    (first_user,ingredient,100,'FREEZER',NOW()),
    (second_user,ingredient,50,'FRIDGE',NOW());
  IF (SELECT SUM(quantity) FROM "StockItem" WHERE "userId"=first_user) <> 350.125 THEN RAISE EXCEPTION 'Decimal quantity or location aggregation failed'; END IF;
  checks := checks + 1;

  BEGIN
    INSERT INTO "StockItem" ("userId","ingredientId",quantity,location,"updatedAt") VALUES (first_user,ingredient,1,'FRIDGE',NOW());
    RAISE EXCEPTION 'Duplicate stock was accepted';
  EXCEPTION WHEN unique_violation THEN checks := checks + 1; END;

  BEGIN
    UPDATE "StockItem" SET quantity=0 WHERE "userId"=first_user;
    RAISE EXCEPTION 'Zero stock quantity was accepted';
  EXCEPTION WHEN check_violation THEN checks := checks + 1; END;
  BEGIN
    UPDATE "StockItem" SET quantity=-1 WHERE "userId"=first_user;
    RAISE EXCEPTION 'Negative stock quantity was accepted';
  EXCEPTION WHEN check_violation THEN checks := checks + 1; END;
  BEGIN
    INSERT INTO "StockItem" ("userId","ingredientId",quantity,"updatedAt") VALUES (first_user,-1,1,NOW());
    RAISE EXCEPTION 'Missing ingredient was accepted';
  EXCEPTION WHEN foreign_key_violation THEN checks := checks + 1; END;

  INSERT INTO "RecipeIngredient" ("recipeId","ingredientId",quantity) VALUES (recipe,ingredient,300);
  BEGIN
    INSERT INTO "RecipeIngredient" ("recipeId","ingredientId",quantity) VALUES (recipe,ingredient,1);
    RAISE EXCEPTION 'Duplicate recipe ingredient was accepted';
  EXCEPTION WHEN unique_violation THEN checks := checks + 1; END;
  BEGIN
    UPDATE "RecipeIngredient" SET quantity=-1 WHERE "recipeId"=recipe;
    RAISE EXCEPTION 'Negative recipe quantity was accepted';
  EXCEPTION WHEN check_violation THEN checks := checks + 1; END;
  BEGIN
    UPDATE "RecipeIngredient" SET quantity=0 WHERE "recipeId"=recipe;
    RAISE EXCEPTION 'Zero recipe quantity was accepted';
  EXCEPTION WHEN check_violation THEN checks := checks + 1; END;
  BEGIN
    UPDATE "Recipe" SET servings=0 WHERE id=recipe;
    RAISE EXCEPTION 'Zero servings was accepted';
  EXCEPTION WHEN check_violation THEN checks := checks + 1; END;
  BEGIN
    UPDATE "Recipe" SET "preparationMinutes"=-1 WHERE id=recipe;
    RAISE EXCEPTION 'Negative preparation time was accepted';
  EXCEPTION WHEN check_violation THEN checks := checks + 1; END;
  BEGIN
    UPDATE "Recipe" SET "cookingMinutes"=-1 WHERE id=recipe;
    RAISE EXCEPTION 'Negative cooking time was accepted';
  EXCEPTION WHEN check_violation THEN checks := checks + 1; END;

  INSERT INTO "UserPreference" ("userId","preferenceId") VALUES (first_user,preference);
  INSERT INTO "RecipePreference" ("recipeId","preferenceId") VALUES (recipe,preference);
  BEGIN
    INSERT INTO "UserPreference" ("userId","preferenceId") VALUES (first_user,preference);
    RAISE EXCEPTION 'Duplicate user preference was accepted';
  EXCEPTION WHEN unique_violation THEN checks := checks + 1; END;
  BEGIN
    INSERT INTO "RecipePreference" ("recipeId","preferenceId") VALUES (recipe,preference);
    RAISE EXCEPTION 'Duplicate recipe preference was accepted';
  EXCEPTION WHEN unique_violation THEN checks := checks + 1; END;
  BEGIN
    DELETE FROM "Ingredient" WHERE id=ingredient;
    RAISE EXCEPTION 'Referenced ingredient deletion was accepted';
  EXCEPTION WHEN foreign_key_violation THEN checks := checks + 1; END;
  BEGIN
    DELETE FROM "Category" WHERE id=category;
    RAISE EXCEPTION 'Referenced category deletion was accepted';
  EXCEPTION WHEN foreign_key_violation THEN checks := checks + 1; END;

  DELETE FROM "User" WHERE id=first_user;
  IF EXISTS (SELECT 1 FROM "StockItem" WHERE "userId"=first_user) OR EXISTS (SELECT 1 FROM "UserPreference" WHERE "userId"=first_user) THEN RAISE EXCEPTION 'User dependent rows not deleted'; END IF;
  checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM "Recipe" WHERE id=recipe AND "authorId" IS NULL) THEN RAISE EXCEPTION 'Recipe was not retained with null author'; END IF;
  checks := checks + 1;
  IF (SELECT COUNT(*) FROM "StockItem" WHERE "userId"=second_user) <> 1 THEN RAISE EXCEPTION 'Other user stock was altered'; END IF;
  checks := checks + 1;

  DELETE FROM "Recipe" WHERE id=recipe;
  IF EXISTS (SELECT 1 FROM "RecipeIngredient" WHERE "recipeId"=recipe) OR EXISTS (SELECT 1 FROM "RecipePreference" WHERE "recipeId"=recipe) THEN RAISE EXCEPTION 'Recipe dependent rows not deleted'; END IF;
  checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM "Ingredient" WHERE id=ingredient) THEN RAISE EXCEPTION 'Catalogue ingredient deleted with recipe'; END IF;
  checks := checks + 1;

  INSERT INTO "UserPreference" ("userId","preferenceId") VALUES (second_user,preference);
  DELETE FROM "FoodPreference" WHERE id=preference;
  IF EXISTS (SELECT 1 FROM "UserPreference" WHERE "preferenceId"=preference) THEN RAISE EXCEPTION 'Preference dependent rows not deleted'; END IF;
  checks := checks + 1;
  RAISE NOTICE '% database checks passed',checks;
END $$;
ROLLBACK;
