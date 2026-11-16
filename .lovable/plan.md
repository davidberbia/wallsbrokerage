# Mandats, classes d'actifs et portefeuilles

## 1. Mise en page du mandat (PDF DocuSign, Word, PDF)
- Police agrandie de 2 points (11 → 13 pt, titres en proportion).
- Première ligne « Mandat N° … » centrée.
- Noms des sociétés ou prénoms/noms du Mandant et du Mandataire en gras.
- Lignes « ci-après dénommé(e)… » alignées à droite.
- Paragraphes de 2 lignes ou plus en texte justifié.
- Paraphes : un cadre « Paraphes Mandant / Mandataire » en bas de chaque page, avec un champ paraphe DocuSign pour chaque partie.
- Signatures : cadres visibles pour chaque partie, avec la mention pré-écrite (« Lu et accepté, Bon pour Mandat » / « Lu et Mandat accepté »), le nom, la date et la zone de signature.

## 2. Désignation du bien
Reprise de toutes les données saisies : type d'actif exact (ex. « immeuble de bureaux »), surfaces (totale, pondérée, extérieure), parkings, étages, nombre de lots et caractéristiques de l'appartement si elles sont renseignées.

## 3. Classes d'actifs
Menu à deux niveaux. Toutes les classes actuelles sont conservées, avec ce regroupement :
- **Bureaux** : Immeuble(s), Plateau(x), Lot(s)
- **Commerces** : murs de pied d'immeuble, locaux de périphérie, ensemble de périphérie, retail park, galeries, centres commerciaux
- **Hôtellerie** : city/resort, sans fonds ou murs et fonds
- **Résidentiel** : appartement, maison, immeuble de logements ou mixte, résidence étudiants
- **Santé** : EHPAD, santé
- **Loisirs/Restauration** : salle de sport, buffets à volonté
- **Industriel** : activité, logistique
- **Foncier** : terrains à bâtir, immeubles à restructurer

Les actifs, investisseurs et critères de matching existants seront convertis automatiquement, sans perte. Le regroupement est à valider ou à corriger.

## 4. Portefeuille multi-adresses
- Case « Portefeuille » à la création d'un actif.
- Ajout de plusieurs biens, chacun avec son adresse, son code postal, sa ville, sa classe d'actif, sa surface et son loyer.
- Les totaux (surface, loyers) sont calculés automatiquement.
- Le portefeuille reçoit un seul numéro de mandat, et la désignation du mandat liste tous les biens.
- Les biens apparaissent aussi dans la brochure et la fiche.

## Points techniques
- Modifications dans mandate-template.ts (styles, gras, ancres paraphes \\initmandant\\ et \\initmandataire\\ placées sur chaque page) et dans docusign.functions.ts (onglets initialHere).
- Ajout d'une sous-classe (asset_subclass) et d'une table asset_lots (actif, adresse, classe, surface, loyer) avec les mêmes règles d'accès que les actifs.
- Mise à jour du Manuel du CRM.
