# Interfaces de connexion et stock

Première tranche React, 20 septembre 2026. Elle prolonge les API existantes sans changer le schéma PostgreSQL ni les routes serveur.

## Parcours disponibles

- Inscription : nom d’utilisateur, adresse e-mail et mot de passe. Le succès ramène au formulaire de connexion ; l’utilisateur ne reste pas sur un bouton inactif.
- Connexion : appel HTTP à /api/auth/login, contrôle du jeton avec /api/auth/me, puis ouverture du stock.
- Stock : lecture personnelle, filtres Tout / Frigo / Congélateur / Placard / Condiments, ajout, modification de quantité ou de rangement, suppression après confirmation.
- Déconnexion : suppression du jeton de l’onglet et retour au formulaire. Une réponse 401 interrompt également la session.

Le jeton est conservé dans sessionStorage pour permettre une actualisation de l’onglet. Aucun mot de passe n’est enregistré par l’application. Le navigateur peut proposer séparément son gestionnaire de mots de passe. Ce stockage de jeton reste accessible à JavaScript : il ne remplace pas une protection contre les injections de scripts. La déconnexion locale ne révoque pas un jeton déjà copié, qui reste soumis à son expiration côté serveur.

## Organisation du code

App.tsx gère la session et choisit entre le formulaire de connexion et le stock. AuthPage.tsx gère les deux formulaires d’authentification. StockPage.tsx affiche les données et confirme le retrait ; StockForm.tsx gère l’ajout et la modification. lib/api.ts centralise les appels HTTP, les en-têtes et les erreurs. Les requêtes de lecture sont annulées quand leur écran disparaît ou que la recherche change.

Les quantités reçues sont des chaînes décimales ; le formulaire les envoie sans conversion flottante. La virgule française est acceptée et remplacée par un point avant envoi. Les conversions kg/g et l/ml restent réalisées par le serveur. Le client limite les unités proposées à celles compatibles avec l’ingrédient. Le serveur conserve ses propres contrôles : le navigateur ne décide jamais du propriétaire du stock.

Le catalogue est recherché et paginé par vingt éléments. Une sélection reste visible si l’utilisateur change de page. Une réponse d’erreur n’est pas présentée comme un stock vide. Les erreurs de doublon sont affichées sans fermer le formulaire ni perdre les valeurs.

## Maquettes et adaptations

Fichier Figma : https://www.figma.com/design/35jm2eGMTuwXBFyl6bJNUF/Maquettes-Platinum

Références : connexion 7:1348, inscription 7:1361 et stock 4004:585. Les images proviennent directement des exports Figma, enregistrés dans client/public/images ; aucun lien temporaire Figma n’est utilisé au chargement de l’application.

Le logo, le jaune #CFA30D des boutons, les filtres #F2DB43 et #7C9660, la feuille, le frigo et le citron reprennent les maquettes. Les textes d’action et les étiquettes de champs restent lisibles, avec une couleur verte plus foncée pour le titre. La police Georgia sert provisoirement de remplacement local à Playfair Display ; Arial remplace Inter. Il reste à intégrer les polices définitives.

L’écran de stock devient une colonne sous 800 px : le frigo décoratif est masqué pour donner la place aux données. Les filtres passent à la ligne. Le formulaire modal utilise dialog, un titre accessible et un retour au bouton déclencheur lors de la fermeture. Les boutons ont une hauteur minimale de 44 px, un contour de focus et des libellés explicites. Les annonces d’erreur et de succès utilisent alert et status. Ces dispositions ne constituent pas un audit d’accessibilité complet.

Le lien de récupération de mot de passe de la maquette n’est pas proposé tant que le parcours serveur n’existe pas. La navigation présente seulement les pages utilisables ; les pages recettes, suggestions et profil seront ajoutées dans les prochaines tranches.

Les illustrations importées conservent les éventuels filigranes d’origine. Leur provenance et leur droit d’utilisation final restent à documenter avant publication publique ; le fait qu’elles figurent dans Figma ne prouve pas une licence.

## Démarrage local

1. Démarrer PostgreSQL et l’API avec la configuration locale existante, puis npm run dev dans server (port 3002).
2. Lancer npm run dev dans client. Vite transmet /api vers http://127.0.0.1:3002 ; PLATINUM_API_TARGET permet de changer cette cible pour un essai isolé.
3. Ouvrir l’adresse locale annoncée, créer un compte et se connecter. Le catalogue doit déjà contenir des ingrédients pour permettre un ajout.

La configuration .env existante n’est pas modifiée. Ne pas charger un catalogue de test dans la base réelle sans décider explicitement de cet usage. Les essais de cette tranche utilisent une base PostgreSQL temporaire séparée.

## Vérifications et limites

Compilation : npm run build dans client. Qualité : npm run lint. Résultats des parcours observés dans verification-interface-2026-09-20.md.

Le proxy Vite est destiné au développement. L’hébergement final devra configurer le service de /api ; ouvrir les fichiers dist seuls ne suffit pas à déployer le serveur. Les validations approfondies et la protection contre les tentatives répétées sur l’authentification restent à traiter côté serveur dans la tranche sécurité. Les écrans actuels ne sont pas une version complète prête pour la production.
