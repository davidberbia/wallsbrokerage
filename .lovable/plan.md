# Synthèse quotidienne 9h05 + sourcing newsletters/PDF + assistant de relance

Tout fonctionne par règles (aucune IA payante), envoi via Brevo, rien n'est publié sans votre accord.

## 1. Sourcing : newsletters et pièces jointes (étape 3)
- Après chaque synchro, l'outil lit le contenu des newsletters immobilières reçues (CFNews, Business Immo, etc.) et le texte des PDF joints.
- Il en extrait par règles (mots-clés et motifs) :
  - **Prospects et clients** : sociétés et personnes citées ; celles qui ne sont pas encore dans la base sont proposées dans « Contacts détectés » (validation par vous, comme aujourd'hui).
  - **Actualités** : une société de votre base citée dans une newsletter (acquisition, levée de fonds, nomination…) est notée comme actualité récente.
  - **Comparables location et vente** : adresse ou ville, surface, prix ou loyer, prix au m², type d'actif, date, source. Ils sont rangés dans un nouvel onglet « Comparables » avec recherche et filtres.

## 2. Assistant de relance (étape 4)
- **Mails sans réponse** : un mail reçu d'un contact lié à un dossier en cours, auquel vous n'avez pas répondu, génère un rappel à 3 jours, puis 7 jours, puis 15 jours. Après, plus de relance.
- **Prospects à relancer** : contacts à qui vous avez écrit (brochure ou mail) et qui n'ont pas répondu.
- **Appels suggérés** : prospects ou investisseurs dont la société apparaît dans une actualité récente, avec le titre de l'actualité comme accroche.

## 3. Récap financier
- Nouveaux champs sur chaque dossier : honoraires prévus (montant ou %), probabilité, date prévue d'encaissement, statut encaissé / non encaissé.
- Récap : total du pipeline par étape, honoraires attendus, prochaines échéances d'encaissement (30 / 60 / 90 jours).

## 4. Synthèse quotidienne à 9h05 (heure de Paris)
Un seul mail structuré, envoyé chaque jour à d.berbia@wallsbroker.com juste après la synchro de 9h :
1. Mails importants sans réponse (3 j / 7 j / 15 j)
2. Prospects à relancer
3. Appels suggérés selon l'actualité
4. Dossiers inactifs depuis 14 jours
5. Récap financier et prochains encaissements
6. Nouveaux comparables et nouveaux contacts détectés
Le format permet d'ajouter facilement d'autres rubriques plus tard.

## 5. Bouton audio « Jarvis »
- Un bouton « Écouter la synthèse » dans le mail ouvre une page du CRM qui lit la synthèse à voix haute, avec un texte rédigé comme un majordome (« Bonjour David. Trois mails attendent votre réponse… »).
- La voix est celle du téléphone ou de l'ordinateur : **gratuit**, aucun crédit consommé. Une voix de synthèse IA plus réaliste existe mais serait payante à chaque écoute : non prévue sauf accord de votre part.
- Un mail ne peut pas jouer de son directement (Outlook le bloque) ; le bouton ouvre donc la page.

## Détails techniques
- Tables : `mail_attachments_scanned`, `news_items` (société, titre, date, source, lien vers investisseur/prospect), `comparables` (type location/vente, adresse, ville, surface, prix, loyer, prix_m2, classe d'actif, date, mail source), `followup_reminders` (message, dossier, palier 3/7/15, envoyé le). Colonnes `deals` : `fee_amount`, `fee_pct`, `probability`, `expected_payment_at`, `paid_at`. RLS broker/viewer + GRANT.
- Détection « sans réponse » : message inbox lié à un dossier actif sans message sentitems dans le même `conversationId` postérieur (ajout de `conversationId` au `$select` de la synchro).
- PDF : texte extrait côté serveur avec une bibliothèque JS compatible Workers (unpdf), limité en taille et en nombre par passage, traitement mémorisé pour ne jamais relire un PDF.
- Cron `walls-daily-digest` à 7h05 UTC (9h05 Paris été) via `trigger_automation`, 1 fois/jour. Route `/api/public/cron/daily-digest`, page `/synthese/$date` protégée par lien signé, lecture via `speechSynthesis` du navigateur.
