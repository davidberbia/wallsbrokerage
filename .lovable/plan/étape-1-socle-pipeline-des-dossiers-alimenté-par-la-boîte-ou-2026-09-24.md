# Étape 1 — Socle : pipeline des dossiers alimenté par la boîte Outlook

## Ce que vous obtiendrez
- Un nouvel onglet **« Dossiers »** avec une vue en colonnes (tableau type Kanban) :
  Cible → Avis de valeur → Commercialisation → Offre → LOI → Promesse → Acte → Signé / Perdu.
- Chaque dossier est une carte : nom, actif lié (facultatif), société / contact, montant indicatif, date de la dernière activité.
- Déplacement d'une carte d'une étape à l'autre par glisser-déposer sur ordinateur, et par un menu « Changer d'étape » sur smartphone.
- Fiche dossier : informations, notes, et **fil des emails liés** (reçus et envoyés), le plus récent en haut, avec lien pour ouvrir le mail dans Outlook.
- Rattachement automatique des emails : un mail est lié à un dossier quand l'expéditeur ou un destinataire est un contact du dossier, ou quand l'objet contient le nom du dossier/actif. Rattachement manuel possible depuis la fiche.
- Synchronisation depuis le **1er janvier 2026**, puis en continu (nouveaux mails toutes les 15 minutes), en réutilisant la connexion Outlook déjà en place.

## Ce qui ne change pas
Charte, base investisseurs, prospects, campagnes Brevo, scraper CFNews, scraper « Contacts détectés », matching : aucun changement. Pas d'IA à cette étape (elle arrive à l'étape 2). Aucune publication sans votre accord.

## Détails techniques
- Tables : `deals` (nom, étape, actif, société, contact principal, montant, notes, dates), `deal_contacts` (dossier ↔ investisseur/prospect/email), `mail_messages` (id Graph, date, objet, expéditeur, destinataires, aperçu, lien web, dossier), `mail_sync_state` (curseur delta par dossier inbox/sentitems). RLS broker écriture, viewer lecture, GRANT inclus.
- Synchro via Graph delta query (`/me/mailFolders/{inbox|sentitems}/messages/delta`) depuis la route cron existante, planifiée toutes les 15 min ; `$select` restreint, pas de corps complet stocké (aperçu seulement).
- Règles de rattachement exécutées à l'insertion et relancées quand un contact est ajouté à un dossier.
- Nouvelle route `/dossiers` + lien dans le menu ; fiche en panneau latéral (bottom-sheet sur mobile).
