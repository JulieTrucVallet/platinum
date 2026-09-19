# Comprendre le modèle de Platinum

Cette fiche sert à relire les décisions et à vérifier que tu peux les expliquer avec tes mots. Elle ne fait pas partie du dossier à remettre.

## Trois vues du même modèle

- Le MCD répond à « quelles informations ai-je besoin de gérer et quels sont leurs liens ? ». Il parle d’utilisateurs, d’ingrédients, de recettes et de cardinalités, sans clés étrangères.
- Le MLD répond à « comment organiser ces informations en tables ? ». Il ajoute les clés et transforme les associations plusieurs-à-plusieurs en tables.
- Le MPD répond à « comment PostgreSQL stocke-t-il ces tables ? ». Il précise les types, les valeurs nulles, les index et les contraintes.

## Les décisions à savoir expliquer

**Ingrédient et stock.** Le riz existe dans le catalogue même si personne n’en possède. Une ligne de stock indique qui en possède, combien et où. Deux personnes ne partagent donc pas la même ligne de stock.

**Quantité et unité.** Si le riz utilise le gramme comme unité de référence, 500 signifie 500 g, dans le stock comme dans une recette. Une saisie de 0,5 kg devra être convertie en 500 g. Cette conversion est maintenant réalisée dans l’API du stock ; elle est aussi utilisée par les recettes.

**Même produit, plusieurs emplacements.** Un utilisateur peut avoir des tomates au frigo et au congélateur. Deux lignes sont alors possibles. En revanche, le même utilisateur ne peut pas avoir deux lignes pour les tomates dans le même emplacement : l’unicité du triplet l’empêche. Un nouvel ajout en doublon est refusé ; la modification remplace la quantité totale de la ligne existante.

**Ingrédients d’une recette.** RecipeIngredient porte la quantité nécessaire pour les portions de la recette. Pour doubler les portions, il faudra doubler les quantités dans le calcul ; le catalogue Ingredient ne change pas.

**Préférences.** Un utilisateur peut en choisir plusieurs et une préférence peut être choisie par plusieurs utilisateurs. UserPreference relie les deux. RecipePreference remplit le même rôle pour les recettes compatibles.

**Suppression d’un compte.** Son stock et ses préférences sont supprimés. Ses recettes restent dans le catalogue, avec un auteur vide. Cela ne donne pas à tous le droit de les modifier : l’API réserve ce droit à l’administration.

## Ce qui est vérifié, ce qui reste à faire

Les migrations, les contraintes SQL et les comportements de suppression ont été vérifiés. Les 22 contrôles réussis concernent PostgreSQL. Ces contrôles SQL sont complétés depuis le 20 septembre par les tests HTTP du stock, qui vérifient aussi le refus des lectures et modifications entre comptes.

Le MCD impose au moins un ingrédient par recette. Une clé étrangère ne suffit pas à imposer cette règle : le service crée maintenant la recette et ses ingrédients ensemble, dans une transaction, et refuse une recette vide.

## Petit exercice avant de poursuivre

À expliquer sans lire la fiche : « J’ai 500 g de riz dans mon placard et une recette pour deux personnes demande 200 g. Où sont enregistrées ces informations ? Que change une préparation pour quatre personnes ? »

Repères : Ingredient décrit le riz et l’unité ; StockItem contient 500 et l’emplacement ; Recipe contient deux portions ; RecipeIngredient contient 200. Pour quatre portions, le besoin devient 400 g, sans modifier la recette d’origine.

Si un choix ne correspond pas à ce que tu souhaites pour Platinum, il faut le revoir dans les règles, le modèle, le code et le dossier avant de le présenter.
