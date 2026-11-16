# Registre des mandats, agents et boîtes mail des agents

## 1. Reconnexion DocuSign en réel (à faire par vous, 2 minutes)
Le passage en réel crée un nouveau compte côté DocuSign. Il me faudra :
- une **nouvelle clé secrète** créée sur le compte réel (Apps and Keys → WALLSBROKERAGE → Add Secret Key) ;
- l'**API Account ID** et le **User ID** du compte réel ;
- puis un clic sur « Connecter DocuSign » dans Paramètres.

## 2. Import de tous les mandats dans le Registre
- Lecture de toutes les enveloppes DocuSign signées (réel, et test si utile).
- Pour chaque mandat : **numéro, adresse, date de signature, date d'expiration** (lues dans le document du mandat).
- Ajout ou complément dans le registre existant, **sans jamais renuméroter** les mandats déjà présents. En cas de doublon, une seule ligne.
- Les mandats dont il manque une information sont signalés « à compléter ».

## 3. Agent concerné
- Nouvelle colonne **Agent** dans le Registre, avec un **menu déroulant** modifiable : David Berbia, Ladislas Crausz, Alexis Capro, Li Wei Bono, Romain Carini.
- Proposition automatique faite **uniquement à partir des échanges de votre boîte Outlook** (mails qui citent le numéro, l'adresse ou le propriétaire du mandat). S'il n'y a aucun indice clair, je laisse le champ vide.

## 4. Fiches des 4 agents dans Paramètres (Agents Co)
- Ladislas Crausz, Alexis Capro, Li Wei Bono, Romain Carini.
- Mail, téléphone, adresse, SIREN etc. retrouvés dans les signatures de vos mails Outlook ; ce qui n'est pas trouvé reste vide.
- Aucun accès au CRM ni aucune invitation envoyée sans votre accord.

## 5. Connexion des boîtes mail des agents
Chaque agent connecte sa propre boîte depuis le CRM :
- **Gmail** : bouton « Connecter Gmail » (autorisation Google).
- **Hotmail / Outlook.com / Live** : bouton « Connecter Outlook » (autorisation Microsoft).
- **Yahoo, Orange, Free, SFR et autres** : adresse + « mot de passe d'application » fourni par leur messagerie. Je dois d'abord vérifier que ce mode fonctionne techniquement sur l'hébergement ; sinon je vous le dis avant de construire.
- Chaque agent ne voit que ses propres mails ; vous (admin) voyez tout.
- Pour Gmail et Outlook, il faudra créer une fois une application Google et une application Microsoft (gratuites) ; je vous guiderai pas à pas le moment venu.

## Ce qui ne change pas
Design, menu, numérotation des mandats, Suivi des affaires (toujours manuel), Brevo, aucune publication.

## Détails techniques
- mandates : ajout agent_id (référence commercial_agents) + address, expires_at, source_envelope_id ; import par listing envelopes status=completed + téléchargement du PDF combiné, extraction texte par règles (pas d'IA en continu ; Gemini ponctuel seulement si texte illisible, dans le plafond 50 €).
- Attribution agent : recherche dans mail_messages (participants/sujet/aperçu) des agents par email.
- Boîtes agents : connecteurs par utilisateur google_mail et microsoft_outlook ; IMAP via sockets TCP du runtime à valider par un essai.
