# Pré-remplissage 100 % automatique depuis la boîte mail

## Ce qui se passera, sans aucune intervention
1. Quand un mail est rattaché à un dossier ou à un actif, ses pièces jointes sont récupérées automatiquement depuis Outlook et rangées dans l'actif (Baux, Images, Plans, racine). Les doublons (même fichier déjà présent) sont ignorés.
2. Chaque document est lu automatiquement : bail, avenant, état locatif, taxe foncière, décompte de charges, mandat, brochure, teaser, Kbis, Excel…
3. La fiche se remplit seule : adresse, code postal, ville, surface, loyer, prix, parkings, rendement, taxe foncière, charges, WALB, WALT, dates de baux, état locatif lot par lot. Une valeur déjà saisie n'est jamais écrasée.
4. Images : les photos jointes, celles contenues dans les présentations PDF et les plans PDF transformés en images sont ajoutées à l'actif et disponibles dans le générateur de brochures, sans doublon.
5. La photo principale est choisie seule s'il n'y en a pas : photo en largeur, la plus nette.
6. Un petit encart « Rempli automatiquement depuis : bail.pdf, TF 2025.pdf… » apparaît sur la fiche pour savoir d'où vient chaque information.

## Fréquence et coût
- Traitement en tâche de fond, par petits lots, à la suite de l'analyse des mails déjà en place (pas de nouveau passage en continu à vide).
- Chaque document n'est lu qu'une seule fois, jamais relu.
- Lecture par Gemini, dans votre plafond de 50 €/mois ; si le plafond est atteint, tout se met en pause et reprend le mois suivant.
- Les fichiers de plus de 20 Mo et les signatures/logos de mail sont ignorés.

## Point à valider
- Cela consomme des crédits IA à chaque nouveau document reçu (dans le plafond de 50 €/mois). Confirmez-vous ?

## Détails techniques
- Nouvelle file `mail_attachment_jobs` (unique par message + pièce jointe), verrou global et lots bornés, comme les extractions existantes.
- Récupération Graph `/messages/{id}/attachments`, stockage dans le bucket des documents d'actif, hash SHA-256 pour dédoublonner.
- Extraction structurée Gemini réutilisant `asset-extract`, fusion « champs vides uniquement ».
- Images de PDF : conversion des pages plan/photo en JPEG côté serveur compatible Worker (pdf.js) ; si impossible pour un fichier, il reste en PDF sans bloquer la file.
