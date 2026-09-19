# API des recettes

Périmètre du ticket #8 : catalogue public et gestion des recettes côté serveur. L’interface React, les suggestions et les préférences personnelles restent à réaliser.

## Routes

| Route | Accès | Résultat |
| --- | --- | --- |
| GET /api/recipes | Public | Liste paginée : items, total, page, pageSize |
| GET /api/recipes/categories | Public | Catégories existantes : items |
| GET /api/recipes/:id | Public | Détail : recipe, ingrédients et quantités dans leur unité de référence |
| POST /api/recipes | Compte connecté | Création complète, HTTP 201 |
| PUT /api/recipes/:id | Auteur ou ADMIN | Remplacement complet, HTTP 200 |
| DELETE /api/recipes/:id | Auteur ou ADMIN | Suppression, HTTP 204 |

Les écritures utilisent `Authorization: Bearer <jeton>`. Les lectures publiques présentent seulement l’identifiant et le nom de l’auteur, jamais son adresse électronique ni son mot de passe. Une recette dont l’auteur a supprimé son compte reste publique, avec author à null ; seul ADMIN peut la modifier ou la supprimer.

## Recherche et pagination

- `q` : recherche sans distinction de casse dans le titre ou le nom d’un ingrédient ; 100 caractères maximum.
- `categoryId` : filtre sur une catégorie.
- `ingredientIds` : identifiants séparés par des virgules ; la recette doit contenir **tous** les ingrédients demandés, jusqu’à 20 identifiants distincts. Ce filtre ne vérifie pas les quantités disponibles dans le stock.
- `page` : entier positif, 1 par défaut.
- `pageSize` : entier de 1 à 100, 20 par défaut.

Les résultats sont triés par date de création décroissante, puis par identifiant décroissant pour stabiliser la pagination. La liste et son total sont lus dans une transaction avec un instantané cohérent. Une recherche sans résultat renvoie une liste vide, HTTP 200.

## Corps complet de création ou de modification

Remplacer les identifiants d’exemple par ceux du catalogue et des catégories réels :

```json
{
  "title": "Riz nature",
  "instructions": "Cuire le riz dans l’eau.",
  "categoryId": 1,
  "servings": 2,
  "preparationMinutes": 5,
  "cookingMinutes": 20,
  "difficulty": "EASY",
  "imageUrl": null,
  "source": null,
  "ingredients": [
    { "ingredientId": 1, "quantity": "0.2", "unit": "KILOGRAM" },
    { "ingredientId": 2, "quantity": "0.4", "unit": "LITER" }
  ]
}
```

La recette demande ici 200 g et 400 ml pour deux portions. Les quantités JSON retournées sont des chaînes, pour conserver la précision décimale. Si les portions passent à quatre lors d’un PUT, le formulaire doit envoyer les quantités souhaitées pour quatre portions : le serveur ne les double pas implicitement.

PUT remplace les champs de la recette et toute sa composition. Il demande les mêmes champs obligatoires que POST ; il ne s’agit pas d’une mise à jour partielle. L’auteur et les dates ne sont pas modifiables par le corps envoyé. Les champs facultatifs omis deviennent null.

## Validation

- Titre non vide, 150 caractères maximum ; instructions non vides, 20 000 caractères maximum. Les espaces de début et de fin sont retirés.
- Portions : entier positif ; durées : entiers positifs ou nuls en minutes. Ces entiers restent dans la plage PostgreSQL INTEGER.
- Catégorie obligatoire et existante ; entre 1 et 100 ingrédients distincts, présents dans le catalogue.
- Quantités strictement positives, trois décimales maximum en entrée, au plus 999999999.999 après conversion. Même conversion exacte que le stock : kg vers g, litres vers ml, pièces inchangées.
- Difficulté facultative : EASY, MEDIUM, HARD ou null.
- imageUrl facultative : adresse HTTP ou HTTPS sans identifiants, 2048 caractères maximum. Le serveur ne télécharge pas cette image. Le futur client devra la traiter comme une URL externe, jamais comme du HTML.
- Source facultative : texte de 500 caractères maximum, affiché comme texte par le futur client.
- Les champs inattendus, dont authorId, sont refusés avec HTTP 400.

Les textes sont stockés comme des données. L’interface devra les afficher comme texte et ne pas injecter de HTML provenant de ces champs.

## Transactions et droits

L’auteur d’une création vient du compte authentifié. Pour un utilisateur standard, la condition d’écriture comporte l’identifiant de la recette ET celui de l’auteur. L’administrateur peut agir sur toutes les recettes mais conserve l’auteur d’origine. Une recette inexistante ou non modifiable par ce compte donne le même HTTP 404.

La création de la recette et de ses ingrédients forme une seule transaction. Lors du remplacement, la modification des champs, la suppression de l’ancienne composition et l’ajout de la nouvelle sont également transactionnels. Une erreur SQL annule tout, y compris les modifications déjà effectuées.

Les écritures complètes utilisent l’isolation SERIALIZABLE. Une modification concurrente peut produire HTTP 409 : le client doit actualiser la recette avant de proposer un nouvel envoi. Deux modifications successives autorisées restent possibles ; cette version ne comporte pas de verrou de version empêchant un écrasement séquentiel par un formulaire ancien.

**Compatibilité alimentaire :** un PUT retire les anciennes associations RecipePreference, car la recette peut avoir changé. Elles devront être réévaluées dans l’étape dédiée aux préférences. Cette API ne permet pas encore de leur attribuer de nouvelles valeurs. Le futur écran devra prévenir de cette réinitialisation.

La suppression d’une recette supprime ses associations, sans supprimer les ingrédients du catalogue. Les erreurs internes restent génériques, sans SQL ni détails de connexion.

## Vérification

Depuis server : `npm run typecheck` puis, dans un environnement de test dédié, `npm run test:recipes`. Le script exige une DATABASE_URL locale dont le nom de base est **platinum_recipes_test**, ainsi qu’un JWT_SECRET de test. Appliquer d’abord les trois migrations sur cette base. Ne pas modifier le fichier .env de développement pour ces essais.

Les tests démarrent le serveur sur un port temporaire, créent les comptes via HTTP et exécutent de vrais appels contre PostgreSQL 16. Ils couvrent la consultation publique, la recherche, les droits auteur/tiers/administrateur, les entrées invalides, le remplacement, les suppressions et les écritures concurrentes.

Un scénario ajoute temporairement une contrainte SQL de panne dans la base de test : une quantité spécifique, pourtant valide pour le métier, y est refusée. Les essais vérifient qu’aucune création partielle ne reste et qu’une modification échouée conserve intégralement la recette initiale. La contrainte est retirée dans un bloc finally. Les données de test sont nettoyées et le conteneur temporaire est supprimé par le lancement de validation.

Trace de l’exécution : verification-recettes-2026-09-20.txt. La suite du stock est également relancée sur sa propre base pour vérifier sa non-régression.
