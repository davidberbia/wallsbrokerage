# Évolutions : documents multiples, envoi programmé, copie de fin de campagne

## 1. Plusieurs brochures ou documents par actif

- Dans la fiche d'un actif, remplacer le champ « une seule brochure » par une liste de documents : ajout de plusieurs fichiers (PDF et documents courants), affichage du nom de chacun, ouverture et suppression individuelle.
- Les documents déjà enregistrés sur les actifs existants sont conservés et repris automatiquement dans la nouvelle liste.
- Au lancement d'une commercialisation, tous les documents de l'actif sont joints au mail, et il reste possible d'ajouter des fichiers supplémentaires au moment de l'envoi.
- L'envoi sans aucune pièce jointe reste possible.

## 2. Programmation de l'envoi

- Dans la fenêtre « Lancer la commercialisation », ajouter un choix : envoi immédiat (par défaut) ou envoi programmé avec date et heure.
- Les mails programmés partent automatiquement à l'heure choisie, sans intervention.
- L'écran de confirmation indique clairement la date et l'heure prévues.

## 3. Copie de fin de campagne

- Pour toute nouvelle campagne, un dernier mail identique est systématiquement envoyé à d.berbia@wallsbroker.com, après tous les destinataires.
- Son objet signale la fin de la campagne et le nombre de destinataires, pour servir de repère de clôture.
- Cette copie n'est pas comptée dans les statistiques d'envois, d'ouvertures ni dans le Marketing Report.

## Détails techniques

- Nouvelle table `asset_documents` (actif, chemin de stockage, nom, ordre) avec droits broker, plus reprise des brochures existantes ; `brochure_url` conservé pour compatibilité.
- Colonnes JSON `documents` sur `campaigns` et `attachments` sur `email_queue` pour transporter plusieurs pièces jointes ; les colonnes actuelles restent utilisées en repli.
- `sendBrevoMail` accepte une liste de pièces jointes ; `email-tick` signe chaque document avant l'envoi.
- La programmation utilise `scheduled_at` de `email_queue`, déjà respecté par la tournée d'envoi ; le mail de clôture est mis en file une minute après le dernier destinataire, sans ligne dans `brochure_sends`.

## Limites

- Aucun changement de charte graphique, de base investisseurs, de scraping ni de logique de matching.
- Aucune publication sans votre accord.
