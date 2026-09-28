# Catalogue de recettes

Le catalogue contient 50 recettes rédigées pour Platinum : 8 apéritifs, 19 plats, 3 accompagnements, 12 desserts, 4 petits déjeuners et 4 boissons. Les idées de repas ont servi d’inspiration ; les textes sont des versions simples rédigées pour l’application, et non une transcription de recettes sources.

Chaque recette contient un nombre de portions, des quantités explicites, quatre étapes, une catégorie, une difficulté et des durées indicatives. Les quantités concernent toutes les portions annoncées. Les temps de réfrigération et de repos sont précisés dans les étapes et ne sont pas inclus dans les temps de préparation et de cuisson.

Les ingrédients sont reliés au catalogue existant, avec les unités de chaque ligne. Les instructions précisent les cas de produits déjà cuits ou égouttés, par exemple les pois chiches et les haricots rouges.

## Installation

Depuis `server`, après les migrations et avec `DATABASE_URL` configurée :

```sh
npm run seed:ingredients
npm run seed:recipes:check
npm run seed:recipes
```

L’aperçu et l’appel direct du script sans option ne font aucune insertion. L’écriture exige `--apply`, déjà inclus dans le script npm `seed:recipes`.

L’import est transactionnel et n’écrase aucune recette existante. Il reconnaît les recettes déjà importées par leur source stable et évite aussi les titres identiques après normalisation. Une modification manuelle du titre ne provoque pas de doublon tant que la source est conservée. Modifier à la fois le titre et la source retire cette reconnaissance : ne pas le faire si l’on souhaite relancer l’import.

Les ingrédients manquants ou les unités incompatibles bloquent tout l’import avant création. Deux imports simultanés sont sérialisés par un verrou transactionnel PostgreSQL. Les catégories et préférences absentes sont créées sans modifier celles déjà présentes. Les stocks et comptes ne sont jamais modifiés.

## Dans l’application

Les recettes sont publiques et accessibles par la recherche, la pagination et les filtres de catégories ou d’ingrédients. Le compte administrateur peut les modifier ou les supprimer ; elles ne sont attribuées artificiellement à aucun compte personnel.

Les étiquettes Végétarien et Végétalien sont attribuées manuellement selon les compositions proposées. Les recettes à base de fromages dont la présure n’est pas précisée restent sans étiquette végétarienne. Aucune certification d’absence d’allergènes n’est attribuée. Les suggestions continuent à comparer les mêmes ingrédients et des unités compatibles.

33 photographies du OneNote de Julie illustrent les recettes correspondantes. Les 17 autres recettes gardent l’affichage sans photo. Voir [Photos des recettes](Photos_recettes.md) pour les associations et la commande qui complète une base existante.

## Validation

Le test `server/tests/recipe-catalogue.test.cjs` utilise exclusivement une base locale isolée nommée `platinum_recipe_catalogue_test`. Il vérifie l’absence d’écriture sans option, l’aperçu, les ingrédients manquants, les imports simultanés, les réimportations après modification, la conservation des recettes et du stock, les validations métier, la pagination publique, le filtre Dessert et une suggestion végétalienne réalisable avec un stock correspondant.
