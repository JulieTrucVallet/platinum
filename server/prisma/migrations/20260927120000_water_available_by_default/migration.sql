-- Règle métier du dossier : l’eau du catalogue est disponible par défaut.
-- Les autres ingrédients conservent leur valeur existante.
UPDATE "Ingredient" SET "isDefaultAvailable" = true
WHERE slug = 'eau' AND unit = 'MILLILITER';
