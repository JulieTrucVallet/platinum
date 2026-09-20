# Vérification des écrans — 20 septembre 2026

Essais effectués dans le navigateur intégré, sur le client React relié à la vraie API Express et à PostgreSQL 16. Base temporaire platinum_ui_test, trois migrations appliquées, catalogue demo.sql chargé. Les comptes et ingrédients utilisés sont fictifs ; la base de développement et son fichier .env n’ont pas été modifiés.

Il s’agit de parcours observés dans le navigateur, distincts des 84 tests HTTP automatisés des suites métier. Aucun nouveau total de tests automatisés n’est revendiqué pour ces essais.

| Parcours | Résultat attendu | Résultat observé |
| --- | --- | --- |
| Inscription du compte DemoStock | Confirmation et retour à la connexion | Conforme |
| Connexion avec un mauvais mot de passe | Refus sans accès au stock | « Identifiants incorrects » |
| Connexion correcte | Stock personnel vide visible | Conforme |
| Ajouter 0,5 kg de riz au placard | Enregistrement de 500 g, filtre Placard | 500 g affichés ; virgule acceptée |
| Ajouter une quantité nulle | Refus avant envoi | Message de quantité positive ; formulaire conservé |
| Ajouter de nouveau du riz au placard | Refus du doublon | Message serveur affiché ; quantité 100 et sélection conservées |
| Modifier le riz en 0,125 kg et déplacer au frigo | 125 g au frigo, placard vide | Conforme dans les deux filtres |
| Actualiser entièrement la page | Session reconnue et données conservées | 125 g au frigo retrouvés |
| Demander un retrait puis annuler | Ligne conservée | Conforme |
| Confirmer le retrait | Ligne retirée et stock vide | Conforme, message de succès |
| Ajouter 700 g de poulet au frigo | Ligne visible après réponse serveur | Conforme ; capture conservée |
| Stock sur mobile 390 × 844 | Données lisibles, pas de débordement horizontal | Largeur du document 390 px ; filtres sur plusieurs lignes |
| Ouvrir la modification sur mobile puis Échap | Fermeture, focus sur le bouton déclencheur | Défaut de retour du focus corrigé ; nouvelle vérification conforme |
| Se déconnecter puis actualiser | Rester sur la connexion | Conforme |
| Créer et connecter AutreDemo | Stock vide, sans les 700 g du premier compte | Conforme |
| Supprimer uniquement AutreDemo dans la base de test puis Actualiser | Session refusée et retour à la connexion | Message « Ta session a expiré. Connecte-toi à nouveau. » |

Les lectures du DOM et les captures ont aussi confirmé le chargement des images et l’absence de débordement horizontal au format ordinateur. Le formulaire mobile reste lisible et dispose de boutons Annuler et Enregistrer. Le contrôle au clavier effectué porte sur l’ouverture et la fermeture du formulaire ; il ne constitue pas un audit complet au lecteur d’écran.

Compilation et qualité : npm run build et npm run lint réussis après correction du focus. Aucun changement serveur dans cette tranche ; les résultats automatisés des API sont ceux de la tranche précédente, pas une nouvelle exécution.

Captures : captures/connexion-desktop.png, captures/stock-desktop.png, captures/stock-mobile.png. Le contenu provient de l’application en fonctionnement avec des données fictives, et non des images de la maquette.

Restent à vérifier : catalogue volumineux et pagination sur plusieurs pages, panne réseau, essais sur plusieurs navigateurs, parcours des futures pages, accessibilité complète et comportement en production.
