# API du stock personnel

Périmètre du ticket #6 : les routes serveur. L’écran React reste à construire. Les routes utilisent PostgreSQL par l’intermédiaire de Prisma, avec une séparation routes, contrôleurs et services.

## Contrat

Toutes les routes ci-dessous demandent un en-tête `Authorization: Bearer <jeton>`. Le serveur vérifie la signature HS256, l’expiration et l’identifiant du jeton, puis lit le compte et son rôle actuel. Un compte supprimé ne peut pas continuer à utiliser son ancien jeton.

| Route | Résultat |
| --- | --- |
| GET /api/ingredients?q=riz&page=1&pageSize=50 | Catalogue partagé : items, total, page et pageSize. Recherche sur le nom, sans distinction de casse ; 100 résultats maximum par page. |
| GET /api/stock | Toutes les lignes du compte connecté, triées par identifiant. |
| GET /api/stock?location=FRIDGE | Lignes du compte dans un emplacement. |
| GET /api/stock/:id | Une ligne appartenant au compte connecté. |
| POST /api/stock | Création d’une ligne ; HTTP 201 et objet item. |
| PATCH /api/stock/:id | Remplacement de la quantité totale et/ou changement d’emplacement ; HTTP 200 et objet item. |
| DELETE /api/stock/:id | Suppression ; HTTP 204, sans corps. |

Exemple de création, en remplaçant ingredientId par l’identifiant réel du riz dans le catalogue :

```json
{
  "ingredientId": 1,
  "quantity": "0.5",
  "unit": "KILOGRAM",
  "location": "PANTRY"
}
```

Si l’unité de référence du riz est GRAM, la quantité retournée est la chaîne `"500"`, avec `ingredient.unit: "GRAM"`. Les quantités JSON sont renvoyées sous forme de chaînes par Prisma Decimal pour préserver leur précision.

Pour modifier la quantité, PATCH attend quantity et unit ensemble. Pour déplacer seulement une ligne : `{"location":"FRIDGE"}`. L’ingrédient d’une ligne ne se modifie pas : supprimer la ligne incorrecte puis en créer une pour le bon ingrédient.

## Règles

- Le propriétaire vient uniquement du compte authentifié. Aucun userId n’est accepté dans le corps ni dans les filtres du stock.
- Un ingrédient doit déjà exister dans le catalogue. Cette API ne crée pas de nouvel ingrédient partagé.
- Le catalogue local peut être alimenté volontairement avec le script prisma/demo.sql documenté dans modele-donnees.md. Le développement des routes ne l’exécute pas automatiquement.
- Les emplacements sont FRIDGE, FREEZER, PANTRY et CONDIMENTS. PANTRY est utilisé si l’emplacement de création est absent. « Tout » correspond à l’absence de filtre.
- Un doublon utilisateur/ingrédient/emplacement provoque HTTP 409. L’utilisateur doit modifier la quantité existante ; un ajout répété ne cumule pas silencieusement les quantités.
- Un déplacement vers un emplacement contenant déjà le même ingrédient est refusé avec HTTP 409, sans modifier la ligne.
- La quantité est strictement positive, avec au plus trois décimales en entrée. Après conversion, elle ne doit pas dépasser 999999999.999. Une quantité zéro doit être traitée comme une suppression explicite.
- KILOGRAM est converti en GRAM et LITER en MILLILITER par multiplication exacte par 1000. PIECE reste PIECE. Aucune conversion masse/volume n’est faite.
- Les fractions de pièce sont acceptées (par exemple un demi-ingrédient). Les virgules décimales doivent être normalisées par le futur formulaire avant l’envoi JSON ; cette API attend un point.
- Les lectures, mises à jour et suppressions filtrent par identifiant ET propriétaire. Un identifiant absent ou appartenant à un autre compte renvoie le même HTTP 404.
- Les erreurs de validation retournent 400, l’absence de compte/jeton valide 401. Les erreurs internes ne renvoient ni requête SQL ni détail de connexion.

GET /api/auth/me renvoie maintenant uniquement l’identifiant et le rôle courant du compte, sans les métadonnées iat/exp du jeton. Les droits d’administration utilisent le rôle relu en base.

## Vérification reproductible

Depuis server, `npm run typecheck` vérifie la compilation. `npm run test:stock` utilise le lanceur de tests Node et TypeScript via ts-node, déjà fourni avec l’environnement de développement ts-node-dev.

Les tests nécessitent une base **dédiée** nommée platinum_stock_test sur localhost, initialisée avec les trois migrations, et un JWT_SECRET réservé au test. DATABASE_URL doit être fourni dans l’environnement du processus. Le fichier de test refuse les autres noms de base et hôtes avant de charger l’application.

Procédure : démarrer PostgreSQL 16 dans un conteneur temporaire avec cette base et des identifiants de test ; configurer DATABASE_URL et JWT_SECRET ; exécuter `npx prisma migrate deploy`, puis `npm run test:stock` ; supprimer le conteneur à la fin. Ne jamais remplacer la configuration de la base de développement pour lancer ces tests.

Le test crée deux comptes via inscription et connexion HTTP, puis contrôle le CRUD, les conversions, les erreurs, les conflits simultanés, les tentatives d’accès entre comptes et la révocation d’un compte supprimé. Ses comptes et ingrédients sont nettoyés en fin d’exécution. Les traces réelles se trouvent dans verification-stock-2026-09-20.txt.

## Points restant à traiter

Écran React, messages et conversion de la virgule dans les formulaires, gestion administrative du catalogue, recettes, suggestions et préférences. L’authentification existante demande encore une validation détaillée des formulaires d’inscription/connexion et les autres mesures de sécurité prévues dans le dossier. Le test du stock ne vaut pas validation de toute l’application.
