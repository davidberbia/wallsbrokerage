# Analyse Gemini de toute la boîte mail et de toutes les pièces jointes

Objectif : parcourir la boîte `d.berbia@wallsbroker.com` du plus vieux mail au plus récent
(reçus et envoyés) et faire lire à Gemini le texte des mails et **toutes** les pièces jointes, chacune
**une seule fois**, pour récupérer un maximum de contacts, actifs, comparables et opportunités.

## Ce que fera l'outil

1. **Ordre chronologique** : départ au plus vieux mail de la boîte principale, reçus puis envoyés,
   avec reprise automatique là où il s'est arrêté. (Rappel : l'Archive en ligne Microsoft 365 reste
   inaccessible par la connexion officielle.)
2. **Pièces jointes sans doublon** : chaque fichier reçoit une empreinte (nom + taille + contenu).
   Si la même brochure apparaît dans 40 mails envoyés, elle n'est lue et facturée qu'une fois.
3. **Fichiers lus** : PDF, images (plans, scans), Excel, Word, CSV. Les logos de signature,
   pictos et fichiers minuscules sont ignorés automatiquement.
4. **Ce que Gemini extrait** : contacts (nom, fonction, société, email, téléphone),
   comparables location et vente (mêmes champs que l'onglet Comparables), actifs et
   opportunités (adresse, surface, prix, loyer, vendeur).
5. **Où ça arrive** :
   - contacts → onglet **Contacts** (à valider, jamais les supprimés, jamais de doublon) ;
   - comparables → onglet **Comparables**, marqués « source : IA », sans doublon ;
   - opportunités et actualités → synthèse de 9h05 et appels suggérés.
6. **Suivi** dans Paramètres › Boîte mail : mails lus, pièces jointes lues, doublons évités,
   éléments trouvés, coût IA du mois, bouton pause.

## Coût (à valider)

- Environ 15 800 mails et, à vue de nez, 3 000 à 6 000 pièces jointes uniques.
- Estimation : **10 à 25 €** pour tout l'historique, puis quelques euros par mois.
- Le **plafond de 30 €/mois** reste actif : s'il est atteint, l'analyse se met en pause
  toute seule et reprend le mois suivant (ou plus tôt si vous relevez le plafond).
- La lecture de la boîte elle-même reste gratuite ; seul Gemini coûte.

## Durée

Plusieurs jours en tâche de fond (quelques dizaines de mails par minute pour ne pas saturer Microsoft).

## Ce qui ne change pas

Charte, base investisseurs, prospects, campagnes Brevo, matching, scraper actuel des contacts.
Aucun identifiant CFNews / LettreM² / Business Immo / LSA. Aucune publication.

## Détails techniques

- Nouvelle table `mail_attachments_seen` (empreinte sha256 unique, nom, type, taille, statut,
  résultat JSON, coût) + `ai_scan_state` (dossier, curseur `@odata.nextLink`, compteurs, verrou).
  RLS broker/viewer + GRANT.
- Graph : `messages?$orderby=receivedDateTime asc&$filter=hasAttachments eq true or ...`,
  puis `messages/{id}/attachments` (fileAttachment, `contentBytes`), ignore `isInline` < 20 Ko.
- Gemini `gemini-3.5-flash` via `callGeminiJson` : PDF/images envoyés en `inlineData`
  (≤ 15 Mo), Excel/CSV convertis en texte via `xlsx`, Word via extraction XML du .docx.
- Cron `walls-aiscan-tick` chaque minute, lot de ~20 mails, verrou 4 min, arrêt auto à la fin
  ou sur `BudgetReachedError`. Insertion via les mêmes règles anti-doublon que `sourcing.server.ts`.
