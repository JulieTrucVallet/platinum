# Catalogue d’ingrédients

Le fichier `server/prisma/catalogue-ingredients.json` contient 649 ingrédients génériques, sans marques, répartis en 14 familles de rangement. Ces familles organisent le fichier ; elles ne créent pas de nouvelles catégories de recettes dans la base.

Le choix couvre les plats du quotidien, viandes, poissons, accompagnements, féculents, desserts, apéritifs, petits déjeuners et boissons. Il s’agit d’un catalogue d’ingrédients : l’import ne crée aucune recette et n’attribue aucune préférence alimentaire.

## Import

Depuis le dossier `server`, avec les migrations appliquées et `DATABASE_URL` configurée :

```sh
npm run seed:ingredients:check
npm run seed:ingredients
```

La première commande affiche un aperçu sans insertion. La seconde ajoute les entrées absentes. Le résultat indique le nombre prévu, ajouté, conservé et le total du catalogue. Les scripts npm portent explicitement les options pour ne pas dépendre de leur transmission par le terminal Windows. L’appel direct du fichier sans option reste un aperçu ; seule l’option `--apply` autorise l’écriture.

L’import ne supprime rien et ne modifie pas les ingrédients existants, leurs identifiants, leurs unités, les stocks ni les recettes. Il peut être relancé : les slugs et les noms normalisés empêchent de recréer les mêmes entrées, y compris avec une différence d’accents, de casse ou avec « œ » à la place de « oe ». Un slug déjà associé à un nom différent bloque l’import pour éviter une association incorrecte.

Les migrations existantes restent inchangées. Ce catalogue est un jeu de données optionnel et versionné, distinct de l’évolution du schéma.

## Utilisation

Les ingrédients sont disponibles dans la recherche du stock et dans la composition des recettes. Le catalogue est paginé ; utiliser la recherche pour retrouver un ingrédient, par exemple « Spaghetti », « Mascarpone », « Œuf » ou « Gochujang ».

Les unités de référence sont le gramme, le millilitre et la pièce. L’interface permet de choisir les unités compatibles déjà prévues par l’application. Aucune conversion arbitraire entre poids et pièces n’est introduite. Les unités d’un ingrédient déjà présent sont conservées même si le fichier propose une autre valeur.

Les variantes sont distinctes : « Riz » et « Riz à sushi », ou « Pâtes » et « Spaghetti », ne sont pas automatiquement interchangeables dans les suggestions. Choisir le même ingrédient dans le stock et la recette. Les nouveaux ingrédients ne sont pas marqués disponibles par défaut.

## Vérification

Le test `server/tests/catalogue.test.cjs` doit être exécuté avec une base locale isolée nommée `platinum_catalogue_test`, après les migrations. Il contrôle la validation du catalogue, l’aperçu sans écriture, la répétition de l’import, la conservation des données et unités existantes, les conflits, la recherche et la pagination de l’API publique.
