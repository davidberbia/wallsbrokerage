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
Le menu déroulant est classé par rubriques pour trouver plus vite le bon actif. Chaque classe reste un actif à part entière, et toutes les classes actuelles sont conservées.
- « Immeubles de bureaux » et « Plateaux ou lots de bureaux » sont remplacés par **Bureaux**, avec trois sous-classes : Immeuble(s), Plateau(x), Lot(s). Les actifs existants sont convertis automatiquement.
- Classes ajoutées : **Loisirs** et **Murs de restaurants**. Salle de sport et Buffets à volonté restent des classes distinctes.
- Le mandat reprend la classe exacte saisie, par exemple « immeuble de bureaux ».

## 5. Formulaire de rétractation
Il est supprimé de tous les modèles de mandats et de tous les exports.

## 4. Portefeuille multi-adresses
- Case « Portefeuille » à la création d'un actif.
- Ajout de plusieurs biens, chacun avec son adresse, son code postal, sa ville, sa classe d'actif, sa surface et son loyer.
- Les totaux (surface, loyers) sont calculés automatiquement.
- Le portefeuille reçoit un seul numéro de mandat.
- La désignation du mandat reprend le tableau de l'état locatif (adresse, locataire, surface, loyer) pour chaque bien.
- Les biens apparaissent aussi dans la brochure et la fiche.

## Points techniques
- Modifications dans mandate-template.ts (styles, gras, ancres paraphes \\initmandant\\ et \\initmandataire\\ placées sur chaque page) et dans docusign.functions.ts (onglets initialHere).
- Ajout d'une sous-classe (asset_subclass) et d'une table asset_lots (actif, adresse, classe, surface, loyer) avec les mêmes règles d'accès que les actifs.
- Mise à jour du Manuel du CRM.
