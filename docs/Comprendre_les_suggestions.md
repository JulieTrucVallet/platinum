# Comprendre les préférences et les suggestions

Fiche personnelle de travail : relis les explications et reformule-les avec tes mots avant de les intégrer à ta présentation.

## Ce que tu peux expliquer

Platinum compare le contenu de ton stock avec les ingrédients demandés par les recettes. Le calcul porte sur les portions indiquées dans la recette. Il n’est pas nécessaire d’avoir tout pour recevoir une suggestion : l’application indique ce qui manque.

Si une recette demande 200 g de riz et 100 g de carotte, avec 200 g de riz et 60 g de carotte chez toi, un ingrédient sur deux est suffisant. Le score est donc 50 %. Il manque 40 g de carotte. Ce n’est pas 80 % : le score compte les ingrédients couverts, il ne fait pas une moyenne des grammes.

Le riz peut être réparti entre plusieurs rangements : 150 g au placard et 50 g au frigo donnent bien 200 g. Le stock d’un autre utilisateur ne participe pas au calcul. Toutes les quantités restent exprimées dans l’unité propre à l’ingrédient.

Vert signifie qu’une majorité des ingrédients est suffisante. Il faut regarder aussi la mention « réalisable » : elle exige que tout soit suffisant. Avec trois ingrédients dont deux suffisants, le résultat est vert à 67 %, mais il reste un ingrédient à compléter.

## Le rôle des préférences

Tes choix sont enregistrés sur ton compte. Si tu coches deux préférences, la recette doit porter les deux étiquettes. Une recette non étiquetée est exclue quand un filtre alimentaire est actif. Enlever tous les choix rétablit le catalogue sans ce filtre.

L’auteur ou un administrateur confirme les étiquettes d’une recette après lecture de sa composition. L’application n’analyse pas automatiquement les allergènes. Quand la recette est modifiée, les anciennes étiquettes sont retirées : il faut les confirmer à nouveau. Le serveur refuse également de confirmer une ancienne version de la recette.

## À retrouver dans le code

- preference.service.ts : choix personnels, contrôle du catalogue, droit de confirmer les étiquettes.
- suggestion.service.ts : lecture des données, calcul des manques, score, classement.
- suggestions.test.cjs : appels HTTP avec une base isolée et comparaison des résultats attendus.

## Pour vérifier ta compréhension

1. Pourquoi ne pas additionner les grammes de riz avec les millilitres d’eau ?
2. Avec 99,999 g disponibles pour 100 g demandés, la recette est-elle réalisable ?
3. Que se passe-t-il quand tu n’as aucune préférence sélectionnée ?
4. Pourquoi une recette verte peut-elle encore demander un achat ?
5. Pourquoi effacer ses étiquettes quand sa composition change ?

Les API existent ; le parcours visuel React sera l’étape suivante. La fiche ne décrit pas encore une démonstration réalisée dans l’interface.
