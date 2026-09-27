# Cohérence du dossier et du code — 27 septembre 2026

Référence lue : `Julie_Truc-Vallet_Dossier_Projet.pdf.pdf`, version de 46 pages fournie par Julie. Ce compte rendu est séparé du dossier : le PDF n’a pas été modifié.

## Corrections réalisées

| Partie du dossier | Fonctionnement du code après correction |
| --- | --- |
| §2.4, §2.6, §6.5 : visiteur | Le catalogue et les fiches recettes sont accessibles sans connexion depuis React. L’accueil ouvre le catalogue. La création d’une recette demande une connexion puis revient à la création. |
| §2.2, §2.5, §2.6 : administration | Un administrateur recherche les utilisateurs par nom ou e-mail et peut supprimer un compte standard après confirmation. Aucun compte administrateur ne peut être supprimé par cette fonction. Les recettes restent consultables avec un auteur non renseigné ; le stock et les préférences du compte supprimé sont effacés. Son ancien token est refusé. |
| §2.5–2.7 : profil | La page « Mon profil » permet de modifier le nom d’utilisateur et l’e-mail, après vérification du mot de passe actuel. L’utilisateur ne choisit ni l’identifiant du compte à modifier ni son rôle. Le changement du mot de passe n’est pas inclus. |
| §5.5.3 : recherche par ingrédients | Le catalogue permet de sélectionner jusqu’à 20 ingrédients distincts. Une recette doit contenir tous les ingrédients sélectionnés. La recherche ne modifie pas le stock. |
| §5.5.4 : fiche avec compatibilité | Une personne connectée voit les quantités nécessaires, disponibles et manquantes sur la fiche de chaque recette. Le calcul est partagé avec les suggestions. Le détail peut être consulté même si la recette ne correspond pas aux préférences choisies ; ce sont les suggestions qui appliquent ce filtre. |
| §10 : eau disponible par défaut | Le champ `isDefaultAvailable` déjà ajouté par Julie est conservé. La migration complémentaire et le catalogue de démonstration marquent l’eau (`slug=eau`, unité ml) comme disponible par défaut. L’interface affiche « Disponible par défaut », sans présenter cette quantité comme un stock personnel. |
| §8 : validation et erreurs | Inscription et profil vérifient les champs, e-mails, mots de passe et doublons. Une erreur inattendue passe par le gestionnaire général, sans exposer le détail interne de Prisma. Les réponses utilisateur ne contiennent pas de mot de passe haché. |

La gestion des utilisateurs a été ajoutée à la demande explicite de Julie. Elle comprend la consultation, la recherche et la suppression des comptes standards. Elle ne comprend pas l’attribution de rôles, la suspension de compte ou l’édition du profil d’une autre personne.

## Points du PDF qui restent à actualiser

Ces éléments se contredisent avec d’autres passages du dossier. Modifier le code pour reproduire les anciens schémas rendrait les réalisations actuelles incohérentes.

1. **Pages 18–19, diagrammes de séquence : API externe.** Les schémas appellent encore une API externe et fusionnent des résultats. Le §6.6 précise qu’elle n’a pas été intégrée. Retirer ces appels des diagrammes de la version réalisée, ou les identifier explicitement comme une conception initiale non réalisée.
2. **Page 18, stock vide et suggestions.** Le diagramme quitte le parcours quand le stock est vide et ne recherche que des recettes partageant un ingrédient. Le comportement présenté au §10 conserve les recettes étiquetées compatibles, calcule les manques et considère l’eau disponible par défaut, même sans stock. Actualiser ce diagramme selon ce comportement.
3. **Pages 23–24, modèles de données.** Les images montrent un ancien modèle (`has`, `contains`, `matches`, `prefers`, `picture`, `preparation_time`). Les tables Prisma actuelles sont `StockItem`, `RecipeIngredient`, `RecipePreference`, `UserPreference`, etc. Le MPD doit représenter la base réellement utilisée.
4. **Page 24, quantités et rangement.** Les quantités du MPD sont en `INTEGER` alors que les cas du §10 utilisent trois décimales. Le code utilise `Decimal(12,3)` ; l’unité de référence est portée par `Ingredient`, et le stock distingue les emplacements. Ajouter aussi `isDefaultAvailable`, les portions, les temps de cuisson/préparation et les contraintes actuelles au schéma physique. Ne pas revenir à des entiers dans le code.
5. **Pages 27–28, captures du service d’authentification.** Le fonctionnement bcrypt/JWT reste identique, mais les extraits sont antérieurs aux nouveaux contrôles de saisie et à la gestion centralisée des erreurs. Remplacer les captures si elles doivent montrer exactement la dernière version.
6. **Partie 9, validation et captures.** Ajouter le parcours visiteur, le profil, l’administration et le test exact du §10 aux preuves. Les anciens comptes rendus conservés dans le dépôt décrivent leurs versions d’origine ; ils ne prouvent pas les nouvelles fonctions à eux seuls.

Il n’est pas nécessaire d’ajouter une API externe ou un déploiement public pour correspondre aux §6.6 et §6.7, qui les présentent comme des étapes futures. Ce contrôle porte sur la cohérence du document fourni, pas sur une garantie de validation du diplôme.

## Vérifications réalisées

- Serveur : contrôle TypeScript.
- Client : compilation de production et ESLint.
- PostgreSQL 16 temporaire, migrations appliquées : 29 tests stock, 30 tests recettes, 25 tests suggestions et 8 tests complémentaires du dossier, soit **92 tests réussis**.
- Le test du dossier utilise bien **150 g de riz, 200 g de carotte et 300 ml d’eau** pour la recette, contre **200 g de riz et 60 g de carotte** dans le stock. Résultat : **67 %, vert, non réalisable, 140 g de carotte manquants**.
- Un déficit de **0,001 g** n’est pas arrondi à une quantité suffisante. À 200 g de carotte, la recette passe à 100 %.
- La suppression administrative a été testée par requêtes HTTP sur des comptes fictifs : suppression des données personnelles associées, recette conservée, ancien token refusé, autre compte intact.
- Navigateur : catalogue et détail anonymes, sélection riz + carotte, création protégée et retour après connexion, sauvegarde du profil, affichage du score et de l’eau, recherche administrateur, confirmation et annulation de suppression.
- Affichage de la gestion des comptes vérifié à 390 px de large, sans débordement horizontal.

Les bases temporaires utilisées pour ces contrôles sont indépendantes de la base de développement. Aucun compte réel n’a été supprimé ni promu administrateur pendant ces vérifications.

## Repères pour comprendre les changements

- `client/src/App.tsx` distingue les pages publiques des pages personnelles. Cela complète les permissions de l’API ; masquer un bouton n’est jamais le seul contrôle.
- `server/src/routes/account.routes.ts` applique d’abord la vérification du token puis celle du rôle administrateur.
- `server/src/services/account.service.ts` sélectionne les informations exposées, vérifie les modifications du profil et limite la suppression aux comptes `USER`.
- `server/src/services/suggestion.service.ts` partage le même calcul de quantités entre les suggestions et la fiche d’une recette.
- `server/tests/dossier.test.cjs` vérifie les nouveaux parcours à travers la véritable API et une base PostgreSQL dédiée.

## Relancer la version locale

Docker Desktop doit être démarré. Dans le terminal du serveur, arrêter le processus de développement avec Ctrl+C, puis exécuter :

```powershell
cd "C:\Users\julie\Documents\Cours\3WA\CDA\Projet - Platinum\server"
npx prisma migrate deploy
npx prisma generate
npm run dev
```

`migrate deploy` applique les migrations en attente à la base configurée dans le fichier `.env`. Il ne réinitialise pas la base. La nouvelle migration marque l’eau du catalogue comme disponible par défaut. Le catalogue de démonstration marque aussi l’eau lors de son import sur une base neuve.

Dans le terminal du client :

```powershell
cd "C:\Users\julie\Documents\Cours\3WA\CDA\Projet - Platinum\client"
npm run dev
```

Ouvrir l’adresse indiquée par Vite. Sans connexion, le catalogue est accessible. Après connexion, « Mon profil » apparaît ; « Utilisateurs » apparaît uniquement pour un compte possédant déjà le rôle `ADMIN`. L’inscription normale crée toujours un compte `USER`.

Pour les tests HTTP, utiliser une base locale isolée portant exactement le nom attendu par chaque suite (`platinum_stock_test`, `platinum_recipes_test`, `platinum_suggestions_test`, `platinum_dossier_test`), avec `DATABASE_URL` et `JWT_SECRET` de test, puis appliquer les migrations et lancer respectivement `npm run test:stock`, `npm run test:recipes`, `npm run test:suggestions`, `npm run test:dossier`. Ne pas utiliser la base de développement pour ces jeux de tests.
