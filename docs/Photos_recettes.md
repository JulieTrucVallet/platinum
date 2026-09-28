# Photos des recettes

33 photos sont reprises telles quelles depuis la section Repas du OneNote de Julie. Elles illustrent le plat ; la présentation et les garnitures peuvent varier. Les 17 autres recettes du catalogue restent sans photo faute de correspondance adaptée, selon le choix de Julie. Les deux anciennes recettes exemples restent également inchangées.

Les fichiers sont servis par le front-end depuis `client/public/images/recipes`. Ils ne dépendent pas de OneNote à l’exécution. Les exports complets du carnet ne sont pas inclus dans le dépôt.

## Association des photos

Le repère indique la page et le numéro de l’image dans l’ordre de lecture du carnet. Pages : 1 Plats, 2 Viandes, 3 Poissons, 4 Accompagnements, 5 Féculents, 6 Desserts, 9 Boissons.

| Recette                             | Repère OneNote | Fichier                    |
| ----------------------------------- | -------------- | -------------------------- |
| Houmous au citron                   | 4-56           | houmous.jpg                |
| Guacamole maison                    | 4-55           | guacamole.jpg              |
| Tzatziki au concombre               | 4-68           | tzatziki.jpg               |
| Œufs mimosa                         | 1-106          | oeufs-mimosa.jpg           |
| Feuilletés chèvre et miel           | 1-50           | feuilletes-chevre.jpg      |
| Spaghetti à la bolognaise           | 5-6            | spaghetti-bolognaise.jpg   |
| Tagliatelles au saumon et à l’aneth | 5-13           | pates-saumon.jpg           |
| Risotto aux champignons             | 1-159          | risotto-champignons.jpg    |
| Poulet au curry et lait de coco     | 2-28           | curry-coco.jpg             |
| Poulet basquaise                    | 2-27           | poulet-basquaise.jpg       |
| Bœuf aux oignons                    | 1-6            | boeuf-oignons.jpg          |
| Chili con carne                     | 1-22           | chili.jpg                  |
| Nouilles sautées aux crevettes      | 1-100          | nouilles-crevettes.jpg     |
| Saumon en papillote et courgettes   | 3-18           | saumon-papillote.jpg       |
| Quiche lorraine                     | 1-151          | quiche-lorraine.jpg        |
| Quiche aux poireaux                 | 1-153          | quiche-poireaux.jpg        |
| Croque-monsieur au four             | 1-33           | croque-monsieur.jpg        |
| Fajitas au poulet                   | 1-38           | fajitas-poulet.jpg         |
| Gratin dauphinois                   | 1-58           | gratin-dauphinois.jpg      |
| Butternut rôti au thym              | 4-7            | butternut-roti.jpg         |
| Champignons en persillade           | 4-14           | champignons-persillade.jpg |
| Brownies au chocolat et aux noix    | 6-5            | brownies.jpg               |
| Cookies aux pépites de chocolat     | 6-19           | cookies.jpg                |
| Mousse au chocolat sans œufs        | 6-121          | mousse-chocolat.jpg        |
| Tarte aux pommes                    | 6-140          | tarte-pommes.jpg           |
| Gâteau au yaourt et à la vanille    | 6-107          | gateau-yaourt.jpg          |
| Crème dessert à la vanille          | 6-21           | creme-vanille.jpg          |
| Tiramisu sans œufs crus             | 6-144          | tiramisu-sans-oeufs.jpg    |
| Pancakes moelleux                   | 6-127          | pancakes.jpg               |
| Pain perdu                          | 6-125          | pain-perdu.jpg             |
| Smoothie fraise et banane           | 9-62           | smoothie-fraise.jpg        |
| Chocolat chaud maison               | 9-26           | chocolat-chaud.jpg         |
| Milkshake à la vanille              | 9-56           | milkshake-vanille.jpg      |

## Import

Depuis `server`, `npm run seed:recipe-images:check` prévisualise, puis `npm run seed:recipe-images` complète uniquement les photos absentes des recettes importées du catalogue, sans auteur et identifiées par leur source. Les photos déjà renseignées et les autres recettes sont conservées. Une nouvelle installation reçoit les photos directement avec `npm run seed:recipes`.
