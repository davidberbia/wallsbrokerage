# Demande d'éléments : 3 questions, prénom, signature

## 1. Trois questions toujours proposées
- Les trois lignes libres sont pré-remplies et cochées par défaut :
  - L'actif est-il toujours à vendre ?
  - Le prix est-il négociable ?
  - Êtes-vous en direct vendeur ?
- On peut toujours les décocher, les modifier ou ajouter d'autres lignes.
- Dans le mail, les documents manquants et ces questions apparaissent dans la même liste à puces.

## 2. Prénom reconstitué
- « Bonjour Bernard, » au lieu de « Bonjour, ».
- Le prénom est pris dans l'ordre suivant : le prénom de l'interlocuteur sur la fiche, puis le premier mot de son nom, puis la partie de l'e-mail placée avant le @ quand elle ressemble à un prénom (bernard@… → Bernard, jean.dupont@… → Jean).
- Le prénom n'est pas deviné pour une adresse générique (contact@, info@, a.dupont@, chiffres…). Le mail commence alors par « Bonjour, ».
- La relance automatique reprend le même prénom.

## 3. Signature Outlook
- Limite : depuis le CRM, il est impossible de lire votre signature Outlook, ni de demander à Outlook de l'insérer quand le mail s'ouvre avec un texte déjà rempli. C'est Outlook qui décide, selon votre réglage « Signature par défaut pour les nouveaux messages ».
- Proposition : ajouter en fin de mail la signature déjà enregistrée dans le CRM pour chaque collaborateur (nom, Wallsbroker, téléphone, e-mail), comme pour la Pige. Le mail sera ainsi toujours signé, y compris pour la relance automatique.
- Si Outlook ajoute aussi sa propre signature, il suffira de supprimer l'une des deux avant l'envoi.

## Technique
- `documentMail` reçoit le prénom et la signature, et `guessFirstName(nom, email)` est ajouté dans `lead-documents.ts`.
- Tests : bernard@ → Bernard ; jean.dupont@ → Jean ; contact@ et a.dupont@ → pas de prénom.
- Aucune publication.
