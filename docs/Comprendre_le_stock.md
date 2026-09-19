# Comprendre et expliquer le stock

Fiche de travail personnelle, à lire avec le code. Elle ne fait pas partie du dossier à remettre.

## Le trajet d’un ajout

1. L’utilisateur choisit le riz et saisit 0,5 kg dans le placard. Le futur formulaire devra envoyer le nombre avec un point décimal : 0.5.
2. La route POST /api/stock reçoit la demande. Le middleware vérifie le jeton et retrouve le compte en base.
3. Le contrôleur transmet l’identifiant de ce compte et les champs saisis au service.
4. Le service vérifie l’ingrédient, l’unité et la quantité. Il convertit 0,5 kg en 500 g.
5. Prisma crée la ligne dans PostgreSQL. La base refuse un doublon pour le même compte, ingrédient et emplacement.
6. Le serveur répond 201 avec la ligne créée. L’interface pourra l’afficher lorsqu’elle sera développée.

## Les quatre opérations du CRUD

- Create : ajouter une ligne, POST.
- Read : lire la liste ou une ligne, GET.
- Update : remplacer la quantité totale ou déplacer la ligne, PATCH.
- Delete : supprimer une ligne, DELETE.

Les routes sont dans server/src/routes/stock.routes.ts ; les contrôleurs dans controllers/stock.controller.ts ; les traitements et validations dans services/stock.service.ts et services/stock.validation.ts.

## Le point de sécurité à retenir

Le serveur ne doit jamais croire un userId envoyé dans le formulaire. Il utilise le compte identifié par le jeton, relu en base. Le filtre de modification comporte deux conditions : l’identifiant de la ligne ET celui du propriétaire. Changer l’identifiant dans l’URL ne permet donc pas de modifier le stock d’une autre personne. Le rôle ADMIN ne donne pas ici d’accès au stock personnel des autres.

## Une décision de fonctionnement

Si j’ai déjà 500 g de riz dans mon placard, un nouvel ajout de riz au placard est refusé. Je dois modifier la quantité totale. Saisir 200 g dans cette modification signifie « il m’en reste 200 », et non « ajouter 200 aux 500 ».

## Ce qui a réellement été testé

Les tests ont effectué des appels HTTP sur une base PostgreSQL temporaire, avec plusieurs comptes de test. Le bilan du 20 septembre contient 29 tests réussis (neuf scénarios principaux et vingt sous-cas). Les cas comprennent le CRUD, les unités, les doublons et les accès entre comptes. La base de développement n’a pas été utilisée pour ces essais.

## À expliquer avec tes mots

Pourquoi l’unicité en base ne suffit-elle pas à protéger mon stock ? Parce qu’elle empêche les doublons, mais ne décide pas qui a le droit de modifier une ligne. Le contrôle du propriétaire appartient au serveur.

Pourquoi 29 tests ne signifient-ils pas que Platinum est terminé ? Ces tests portent sur le stock et quelques protections d’authentification. Les recettes, les suggestions, les préférences et les écrans ont encore leurs propres développements et vérifications à faire.
