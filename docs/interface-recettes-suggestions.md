# Interfaces des recettes, suggestions et préférences

Étape réalisée les 20 et 21 septembre 2026. Client React et TypeScript, sans nouvelle dépendance. API et schéma de données inchangés.

## Parcours

- `#/recettes` : catalogue paginé, recherche par titre ou ingrédient et catégorie.
- `#/recettes/nouvelle` : création complète avec quantités, unités, portions, durées, catégorie et instructions.
- `#/recettes/:id` : lecture, modification et suppression pour l’auteur ou ADMIN ; confirmation avant suppression.
- `#/suggestions` : classement calculé par le serveur, préférences appliquées, quantités nécessaires, disponibles et manquantes. Le score ne change pas les portions et ne consomme pas le stock.
- `#/preferences` : remplacement des choix alimentaires du compte connecté. Décocher tout retire les restrictions.

Le client demande une connexion avant d’afficher ces pages. Les routes HTTP de consultation du catalogue restent publiques. La navigation par fragment conserve les liens après actualisation et fonctionne sans règle de réécriture du serveur statique. Le bouton Précédent du navigateur repose sur ces fragments ; les recherches et brouillons ne sont pas conservés lorsqu’on quitte leur page.

## Organisation du code

App.tsx gère la session, le compte et la navigation. `lib/recipes.ts` définit les types et le hook `useResource`. Une lecture est associée à son URL, son compte et sa révision ; une réponse annulée ne remplace pas la recherche courante. Les erreurs et états de chargement sont distingués d’une liste vide. Les réponses 401 déclenchent la déconnexion.

`RecipeParts.tsx` regroupe titres, pagination, photo et durées. `RecipeEditor.tsx` partage le formulaire de création et de modification. Les ingrédients proviennent du catalogue recherché et paginé ; un ingrédient déjà ajouté n’est plus proposé. Les boutons de catalogue ont le type button pour ne pas envoyer le formulaire. Les conversions restent calculées et validées par le serveur.

Les quantités envoyées correspondent à toutes les portions indiquées. Modifier le nombre de portions ne multiplie pas les quantités automatiquement. Le PUT remplace la composition et retire les étiquettes alimentaires ; un message l’annonce et un formulaire séparé permet de les confirmer après relecture. Ce dernier transmet la version updatedAt obtenue du serveur. Un conflit de version est affiché ; l’utilisateur peut actualiser la recette et relire sa composition.

Les boutons d’édition sont réservés visuellement à l’auteur ou ADMIN, d’après `/auth/me` et l’auteur de la fiche. La véritable autorisation reste le contrôle serveur. Les instructions et sources sont rendues comme du texte React ; aucun HTML utilisateur n’est injecté. Les photos sont des URL HTTP(S) issues de l’API, avec referrerPolicy=no-referrer et remplacement textuel en cas d’échec. Aucune photo d’exemple n’est attribuée artificiellement à une recette sans image.

## Maquettes et adaptation

Figma : fichier `35jm2eGMTuwXBFyl6bJNUF`, Accueil Desktop `6:582`, Recette Desktop `4004:336`, Suggestions Desktop `7:1478`, Nouvelle recette Desktop `11:1896` et Profil Desktop `7:1544`.

Les cartes vertes, le fond citron, les titres avec feuille et le formulaire central sont repris. L’horloge est l’export exact de la maquette, stocké dans `client/public/images/clock.png`. Les autres décors et le logo réutilisent les fichiers existants. Les polices de remplacement et la vérification des droits des images restent les limites déjà documentées.

La page Préférences utilise le cadre du profil pour les choix alimentaires réellement disponibles. La modification du nom, de l’adresse e-mail, du mot de passe et de l’avatar n’est pas implémentée. Favoris, commentaires, vidéos intégrées et index alphabétique ne font pas partie de cette tranche. Les suggestions exposent le classement serveur ; la recherche et les catégories de la maquette ne sont pas simulées, leur API ne les propose pas encore.

Sur mobile, les cartes et les champs se réorganisent, la navigation revient à la ligne. Les résultats ne reposent pas sur la couleur seule. Le contenu principal reçoit le focus lors des changements de page et d’ouverture/fermeture de l’édition. Il reste un audit complet d’accessibilité, notamment après pagination et chargement asynchrone.

## Vérification et limites

Voir `verification-parcours-recettes-2026-09-21.md`. Build et lint du client réussis. Aucun changement serveur : les 84 tests HTTP antérieurs ne sont pas présentés comme une nouvelle exécution.

Restent à approfondir : conflits simultanés depuis deux navigateurs, panne réseau, images externes indisponibles, parcours ADMIN depuis l’interface, navigation arrière et conservation des brouillons. Le remplacement complet d’une recette conserve la limite existante d’écrasement séquentiel ; seul l’enregistrement des étiquettes utilise updatedAt.
