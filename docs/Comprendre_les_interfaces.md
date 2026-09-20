# Comprendre la connexion entre React et l’API

Fiche personnelle : explique ces étapes avec tes mots après avoir essayé les écrans.

Quand tu te connectes, React envoie ton adresse e-mail et ton mot de passe à l’API. Le serveur vérifie le mot de passe et renvoie un jeton. React utilise ensuite ce jeton pour demander ton stock. Le serveur sait quel compte est connecté grâce à ce jeton ; le formulaire n’envoie pas l’identifiant d’un utilisateur à choisir.

Pour ajouter 0,5 kg de riz, le formulaire envoie l’ingrédient choisi, « 0.5 », l’unité KILOGRAM et le rangement. Le serveur contrôle les informations, convertit en 500 g et enregistre la ligne. L’écran affiche la ligne renvoyée par le serveur. Il ne prétend pas que l’ajout a réussi avant d’avoir reçu la réponse.

Si ce riz existe déjà dans le même rangement, le serveur refuse le doublon. Le message apparaît dans le formulaire et tes valeurs restent présentes. Tu peux annuler puis modifier la ligne existante.

React conserve la liste affichée dans un état. Choisir « Frigo » filtre cette liste. Cliquer sur « Actualiser » relit les données du serveur. Quand une quantité est modifiée, la ligne renvoyée remplace l’ancienne dans l’état. Les données enregistrées restent en PostgreSQL même si l’onglet est fermé.

Le jeton de connexion est gardé dans la session de l’onglet pour permettre d’actualiser la page. En revanche, aucun mot de passe n’est conservé par notre code. La déconnexion retire le jeton de cet onglet ; elle ne supprime ni ton compte ni ton stock.

À observer toi-même : ajouter un ingrédient, changer sa quantité, déplacer son rangement et utiliser les filtres. Essaie ensuite un doublon et une quantité nulle. Explique pourquoi les contrôles du formulaire ne remplacent pas ceux du serveur.
