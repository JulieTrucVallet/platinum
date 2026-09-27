# Formulaires et unités — 27 septembre 2026

## Ce qui change

- Sur la connexion, le logo Platinum mène au catalogue public. Le bouton « Consulter les recettes sans connexion » a été retiré.
- Les libellés e-mail et mot de passe ont un espace dédié au-dessus de leur champ. Le contour de focus reste visible sans empiéter sur le libellé.
- Dans une recette, les libellés visibles sont simplement « Quantité » et « Unité ». Chaque ligne reste identifiée par le nom de l’ingrédient pour l’accessibilité.
- Un ingrédient solide peut être renseigné en g, kg ou pièces, dans le stock et les recettes. Les liquides restent en ml ou l.
- « Filet de poulet » est ajouté comme ingrédient distinct : compter deux filets ne revient pas à compter deux poulets entiers.

## Comprendre le calcul

Une recette avec 2 carottes et un stock de 3 carottes est comparable en pièces. Une recette avec 200 g de carotte et un stock de 0,5 kg est comparable en grammes : 0,5 kg = 500 g.

En revanche, 2 carottes n’ont pas de poids fixe. Si la recette utilise des pièces et le stock des grammes, l’interface indique **« À vérifier : ton stock utilise une autre unité, sans conversion automatique. »** Aucun poids moyen n’est inventé. Le score compte les ingrédients dont la quantité est confirmée suffisante ; une quantité à vérifier ne permet pas d’annoncer que la recette est réalisable.

Les quantités de plusieurs rangements sont additionnées uniquement lorsqu’elles utilisent la même mesure. La règle existante d’une ligne par ingrédient et rangement est conservée : pour changer de mesure dans un même rangement, modifier sa ligne et saisir la quantité correspondante.

## Données

La migration `20260927130000_quantity_units` ajoute une unité aux lignes `StockItem` et `RecipeIngredient`. Les anciennes quantités gardent exactement leur valeur ; leur unité initiale est reprise du catalogue. Les nouvelles écritures de l’API stockent explicitement g, ml ou pièces, après conversion kg/g ou l/ml.

Une unité absente sur une ancienne écriture signifie l’unité du catalogue. Cette compatibilité évite de changer le sens des anciennes données et des imports existants. Les écrans, le calcul des suggestions et la fiche recette appliquent tous la même règle.

## Vérifications à reproduire

1. Dans la connexion, cliquer dans l’e-mail puis le mot de passe : les libellés restent lisibles. Tabulation sur le logo puis Entrée : ouverture du catalogue.
2. Ajouter une recette contenant 2 carottes en pièces, l’enregistrer puis la modifier : l’unité reste « pièce(s) ».
3. Ajouter 2 carottes en pièces au stock : compatibilité suffisante.
4. Remplacer cette ligne de stock par 500 g : la recette en pièces doit afficher « À vérifier », jamais 500 pièces.
5. Renseigner une recette en kg : la conversion g/kg reste exacte.

La suite `npm run test:units` s’exécute uniquement avec une base locale isolée `platinum_units_test` et un secret JWT de test, après application des migrations. Elle complète les suites stock, recettes, suggestions et dossier.

Résultats du 27 septembre : **99 tests HTTP réussis** (29 stock, 30 recettes, 25 suggestions, 8 dossier, 7 unités), TypeScript serveur, compilation et lint client réussis. Vérification navigateur : espace de 8 px entre chaque libellé de connexion et son champ, navigation depuis le logo, enregistrement d’une recette contenant 2 carottes en pièces puis réouverture avec la même unité.

Pour activer l’évolution sur une installation locale : arrêter le serveur, exécuter `npx prisma migrate deploy`, puis `npx prisma generate`, et relancer `npm run dev` depuis `server`. Ne pas réinitialiser la base. Les deux nouvelles colonnes devront aussi figurer sur le MPD actualisé du dossier.
