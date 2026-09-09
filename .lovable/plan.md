# Onglet « Prospects » — base CFNews Immo

## Ce que tu obtiens

Un nouvel onglet **Prospects** dans le back-office, alimenté par les sociétés et collaborateurs récupérés sur CFNews Immo (nom, titre, email, téléphone).

- Un moteur de recherche par **société** et par **nom** de collaborateur.
- La liste s'affiche par société. Un clic sur une société déplie ses collaborateurs juste en dessous.
- À droite de chaque ligne collaborateur : une case à cocher **Envoi**.
- La sélection est conservée pendant toutes tes recherches successives (nombre illimité).
- En bas de page : un menu déroulant pour choisir un **actif**, puis un bouton d'envoi.
- Le bouton ouvre la **même fenêtre** que pour les investisseurs : objet et texte modifiables, brochure jointe, signature, envoi 1 mail/minute depuis ta boîte, accusé de lecture et suivi dans l'onglet Envois.

## Récupération des données

Connexion à CFNews Immo avec tes identifiants, puis parcours des pages de résultats du lien fourni (2 721 acteurs) et de chaque fiche société pour extraire les collaborateurs.

Réserves honnêtes :
- Je ne récupère que ce que ton compte affiche réellement (certains emails/téléphones peuvent être masqués).
- Le volume est important : l'extraction se fait par lots, avec des pauses pour ne pas déclencher de blocage. Prévoir plusieurs passes.
- Si le site impose un anti-robot (captcha), je te le signale et on adapte.

## Détails techniques

- Nouvelle table `prospect_companies` (nom, ville, secteur, source_url) et `prospect_contacts` (société, nom, titre, email, téléphone), accès réservé au broker, lecture pour viewer.
- Extraction via Playwright, session authentifiée, insertion par lots idempotente (clé = URL fiche + nom).
- Nouvelle route `/prospects` : recherche, accordéon société → collaborateurs, sélection persistante, sélecteur d'actif en pied de page.
- Réutilisation du composant d'envoi existant (`CampaignDialog`) : campagne, file d'envoi, pixel de suivi, signature — aucun changement au flux investisseurs existant.
- L'onglet Envois affichera ces envois comme les autres.

## Ce dont j'ai besoin de toi

Tes identifiants CFNews Immo (email + mot de passe) et l'URL exacte de la page de connexion.
