# Vérification des parcours recettes, préférences et suggestions

Essais effectués dans la continuité du 20 septembre, compte rendu finalisé le 21 septembre 2026. Navigateur intégré, API Express réelle et PostgreSQL 16 temporaire `platinum_ui_test`. Aucune utilisation de la base de développement. Comptes et recettes fictifs uniquement.

Le catalogue initial comporte deux recettes de démonstration. Une recette est créée par l’interface. Neuf recettes et vingt et un ingrédients fictifs supplémentaires sont ensuite insérés dans la seule base temporaire pour tester les pages suivantes. Le second compte est également une fixture de test. Les contrôles ci-dessous sont manuels, pas une suite automatisée.

| Cas observé | Résultat |
| --- | --- |
| Recherche introuvable puis citron | Liste vide expliquée, puis une recette correspondante |
| Lecture du poulet du catalogue | Composition et instructions visibles ; aucune action d’édition pour le compte standard |
| Création sans ingrédient | Refus explicite, titre et instructions conservés |
| Création avec 0,2 kg de riz | Fiche enregistrée avec 200 g et le bon auteur |
| Instructions contenant des balises b | Balises affichées littéralement, pas interprétées comme HTML |
| Confirmation de Végétarien | Étiquette visible sur la fiche après réponse serveur |
| Modification à 250 g | Nouvelle quantité visible ; étiquette retirée et message invitant à la revérifier |
| Préférences végétarien et végétalien, puis actualisation | Deux choix toujours cochés |
| Suggestions avec ces deux choix et stock vide | Seul le riz aux carottes est retenu, score 0 %, besoins détaillés |
| Retirer végétalien, ajouter 250 g de riz au stock | Recette créée à 100 %, riz aux carottes à 33 %, quantités manquantes affichées |
| Décocher tous les choix et enregistrer | Aucune restriction ; le poulet réapparaît |
| Suggestions et catalogue de douze recettes | Page 2 sur 2 accessible, Suivant désactivé sur la dernière page |
| Catalogue de vingt-sept ingrédients dans un brouillon | Page 2 accessible ; titre conservé, aucun envoi du formulaire |
| Suggestions, préférences et édition au format 390 × 844 | Aucun débordement horizontal : largeur du document 375 px pour viewport 390 px avec barre de défilement |
| Quantité nulle pendant une modification | Message d’erreur, formulaire conservé ; annulation laisse la recette à 250 g |
| Annuler la suppression | Recette encore accessible |
| Lire la recette depuis un second compte | Aucun bouton de modification, suppression ou confirmation d’étiquettes |
| Suggestions du second compte | Recette à 0 % ; les 250 g du premier compte ne sont pas utilisés |
| Retour au premier compte, suppression confirmée | Retour au catalogue ; recherche de cette recette sans résultat |

Corrections revérifiées : les boutons de pagination et de reprise de chargement dans un formulaire ne le soumettent pas ; le contenu principal reçoit le focus lorsqu’on ouvre l’édition (id main observé). Les titres de l’onglet suivent la navigation.

`npm --prefix client run build` et `npm --prefix client run lint` réussis après les dernières corrections. Les 84 tests HTTP précédents n’ont pas été réexécutés pour cette tranche sans changement serveur.

Captures conservées : suggestions-desktop.png, suggestions-mobile.png, preferences-mobile.png et recette-desktop.png. La fiche de recette contient volontairement le texte avec balises utilisé pour le contrôle du rendu textuel.

Non revendiqué : audit complet d’accessibilité, essais multi-navigateurs, panne réseau, conflits concurrents depuis l’interface, rôle ADMIN dans le navigateur, panne des photos externes, navigation arrière, conservation des brouillons et tests de charge. Les fonctionnalités restent à relire puis intégrer avant remise.
