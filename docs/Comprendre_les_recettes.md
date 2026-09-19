# Comprendre les recettes

Fiche personnelle à rapprocher du code, hors dossier de remise.

## Ce qui change par rapport au stock

Le stock est personnel. Une recette du catalogue est publique, mais cela ne veut pas dire que tout le monde peut la modifier. Son auteur et les administrateurs peuvent intervenir. Le serveur détermine ces droits à partir du compte connecté.

## Pourquoi utiliser une transaction ?

Une recette et ses ingrédients sont enregistrés dans plusieurs tables. Si la création de la recette réussit mais que l’ajout d’un ingrédient échoue, on ne veut pas conserver une recette incomplète. La transaction regroupe ces écritures : elles réussissent ensemble ou elles sont toutes annulées.

C’est aussi utile à la modification : si l’on remplace le riz par des pâtes et que l’enregistrement des pâtes échoue, l’ancienne composition doit rester intacte. Un test provoque volontairement une erreur SQL pour vérifier ce comportement.

## Deux contrôles différents

Le service vérifie qu’il y a au moins un ingrédient. La base vérifie que chaque identifiant d’ingrédient existe et que sa quantité est positive. Une clé étrangère seule ne peut pas imposer qu’une recette ait au moins une association : les deux niveaux se complètent.

## Ce que signifie PUT

Le formulaire envoie la recette complète : titre, instructions, catégorie, portions, durées et ingrédients. Le serveur remplace la composition précédente. L’auteur reste le même. Une modification vide ou incohérente est refusée.

Les quantités correspondent aux portions indiquées. Passer de deux à quatre portions ne modifie pas automatiquement les nombres envoyés ; le formulaire devra envoyer les quantités adaptées.

## Exemple à expliquer

Alice crée une recette pour deux personnes avec 0,2 kg de riz et 0,4 litre d’eau. Le serveur enregistre 200 g et 400 ml. Bob peut lire cette recette, mais sa tentative de modification est refusée. Si Alice supprime son compte, la recette reste consultable ; l’administration pourra la gérer.

## Limites à connaître

Les écrans ne sont pas encore développés. La recherche trouve des recettes contenant les ingrédients demandés ; elle ne dit pas encore si mon stock permet de cuisiner la recette. Ce calcul sera la fonctionnalité de suggestions.

Une modification complète retire les anciennes étiquettes de compatibilité alimentaire pour éviter de conserver une information devenue fausse. Leur réévaluation sera traitée dans la partie préférences. Les modifications simultanées sont protégées contre un mélange de compositions ; il n’y a pas encore de verrou de version contre un ancien formulaire enregistré plus tard.
