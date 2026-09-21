# Préférences et suggestions — contrat de l’API

Implémentation du 20 septembre 2026. Routes JSON ; données personnelles réservées au compte connecté avec un jeton Bearer. Aucune modification du schéma ni migration supplémentaire.

## Préférences

| Méthode et route | Résultat |
| --- | --- |
| GET /api/preferences | Catalogue public : items contenant id, name, slug |
| GET /api/preferences/me | Choix du compte connecté, items vide si aucun |
| PUT /api/preferences/me | Remplacement complet : {"preferenceIds":[1,2]} ; [] efface les choix |
| PUT /api/recipes/:id/preferences | Étiquettes d’une recette, réservées à son auteur ou ADMIN |

Une liste contient au maximum vingt identifiants distincts du catalogue. Les champs inconnus, doublons et références inexistantes sont refusés (400). L’identité vient exclusivement du jeton validé. Les écritures utilisent une transaction SERIALIZABLE : en cas de conflit, 409 invite à actualiser puis réessayer. Deux requêtes successives complètes appliquent le dernier choix reçu.

Pour étiqueter une recette, envoyer {"preferenceIds":[1],"updatedAt":"2026-09-20T10:00:00.000Z"}, en reprenant exactement sa version obtenue avec GET /api/recipes/:id. Une version ancienne est refusée (409). La mise à jour avance cette version et renvoie {recipe:{id,updatedAt,preferences}}. Le détail public expose aussi les étiquettes dans preferences, sous forme d’associations {preference:{id,name,slug}}.

Ces étiquettes sont déclarées après vérification de la composition par l’auteur ou l’administration. Elles ne sont pas déduites automatiquement des noms d’ingrédients et ne constituent pas une certification d’absence d’allergènes. Une modification complète par PUT /api/recipes/:id retire toutes les étiquettes. Le formulaire devra inviter à les réexaminer après l’enregistrement. Le contrôle de version protège la confirmation des étiquettes ; le remplacement complet de la recette conserve les limites documentées dans api-recettes.md.

## Suggestions

GET /api/suggestions?page=1&pageSize=20 nécessite une connexion. Vingt résultats par défaut, cent maximum. Les autres paramètres sont refusés, notamment userId et servings. Le calcul porte sur les portions déclarées par chaque recette ; cette première version ne permet pas de changer leur nombre dans la demande.

La réponse contient items, total, page, pageSize et appliedPreferences. Pour chaque recette : id, title, imageUrl, servings, durées, preferences, ingredients, sufficientCount, ingredientCount, missingCount, scorePercent, level et canCook.

Chaque ingrédient contient ingredient:{id,name,unit}, required, available, missing et status. Les trois quantités sont des chaînes décimales dans l’unité de référence : GRAM, MILLILITER ou PIECE. Elles ne sont pas additionnées entre ingrédients ni entre unités différentes.

Règles :

1. Additionner les quantités du même ingrédient dans tous les rangements du compte connecté.
2. Conserver seulement les recettes comportant au moins un ingrédient et toutes les préférences sélectionnées (ET logique). Sans préférence sélectionnée, aucune restriction alimentaire. Une étiquette absente ne vaut pas compatibilité.
3. Pour chaque ingrédient : manque = maximum(besoin − stock, 0). SUFFICIENT si le manque est nul ; PARTIAL si du stock existe mais ne suffit pas ; ABSENT sinon.
4. Score = nombre d’ingrédients suffisants / nombre d’ingrédients requis × 100, arrondi à l’entier pour l’affichage. Les comparaisons de quantités utilisent Decimal, sans conversion en nombre flottant.
5. GREEN si plus de la moitié sont suffisants ; ORANGE si au moins un est suffisant mais pas plus de la moitié ; RED si aucun n’est suffisant. Ces seuils précisent la description qualitative de semaine 1. Vert ne signifie pas toujours réalisable : canCook est vrai uniquement si tous sont suffisants.
6. Classer par proportion exacte décroissante, puis nombre d’ingrédients manquants croissant, puis identifiant croissant ; paginer après classement.

Le stock, les choix alimentaires et les recettes sont lus dans un même instantané REPEATABLE READ. Consulter ne consomme pas le stock. Avec un stock vide, les recettes compatibles restent proposées à 0 %, avec leur liste de courses manquantes ; une recette sans ingrédients est exclue.

Exemple : recette pour deux personnes avec 200 g de riz et 100 g de carotte. Stock personnel : 150 g de riz au placard, 50 g au frigo et 60 g de carotte. Riz suffisant, carotte partielle, manque 40 g, score 50 %, ORANGE, canCook=false. Ajouter les 40 g donne 100 % et canCook=true. Le stock d’un autre compte ne change jamais ce résultat.

## Limites et vérification

Le classement est réalisé en mémoire sur l’ensemble des recettes compatibles. Ce choix convient au petit catalogue pédagogique ; il faudra mesurer puis adapter la requête pour un catalogue important. Aucun test de charge n’est revendiqué. Il n’y a pas encore de réservation du stock, de déduction après préparation, d’historique NoSQL avant consolidation pour la remise. Les écrans React sont décrits dans interface-recettes-suggestions.md.

Suite : server/tests/suggestions.test.cjs. Base dédiée obligatoire : platinum_suggestions_test sur localhost, JWT_SECRET de test requis ; appliquer les migrations puis npm run test:suggestions. Ne pas utiliser la base de développement. Trace : verification-suggestions-2026-09-20.txt.
