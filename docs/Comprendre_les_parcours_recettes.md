# Comprendre les recettes et les suggestions

Fiche personnelle de préparation, à lire avec le code. Elle ne fait pas partie du dossier à remettre.

Le catalogue permet de trouver une recette par son titre ou un ingrédient. Le navigateur demande une page de résultats au serveur. Il n’a pas besoin de télécharger toutes les recettes pour faire la recherche.

Une recette contient ses informations générales et sa composition. Si tu entres 0,2 kg de riz, le formulaire envoie cette valeur avec son unité ; le serveur enregistre 200 g. Les quantités concernent toutes les portions de la recette. Passer de deux à quatre portions ne double pas les quantités tout seul : il faut les modifier.

La recette appartient au compte qui l’a créée. Le client affiche les boutons de modification à son auteur, mais c’est le serveur qui interdit réellement les écritures d’un autre compte. Masquer un bouton ne serait pas une protection suffisante.

Les préférences d’une personne et les étiquettes d’une recette sont deux choses différentes. La personne choisit ce qu’elle souhaite retrouver ; l’auteur vérifie si sa recette correspond à ces choix. Une modification de composition retire les anciennes étiquettes, car elles peuvent ne plus être vraies.

Exemple réellement essayé : une recette demande 250 g de riz, et le compte a 250 g en stock. Elle atteint 100 %. Le riz aux carottes demande aussi des carottes et de l’eau absentes du stock : un seul de ses trois ingrédients est suffisant, donc 33 %. Un autre compte sans stock obtient 0 %, même si le premier compte a du riz.

Le pourcentage mesure le nombre d’ingrédients disponibles en quantité suffisante. Il ne mesure ni le poids total disponible, ni la facilité, ni la valeur nutritionnelle. Le texte « Tout est disponible » apparaît uniquement lorsque tous les ingrédients sont suffisants.

À refaire toi-même : crée une recette avec un ingrédient, ajoute une quantité insuffisante au stock, regarde le manque, complète le stock puis regarde le score. Modifie ensuite la composition et vérifie que ses étiquettes doivent être confirmées à nouveau. Explique chaque étape avec tes propres mots.
