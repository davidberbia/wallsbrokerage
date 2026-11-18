# Notoriété LinkedIn : préparation automatique du mois

## Ce que le collaborateur verra
- **Connexion LinkedIn** dans Réglages : un bouton « Connecter mon LinkedIn » (son propre compte, connexion officielle).
- **Planning du mois** préparé tout seul le 1er de chaque mois (et dès l'enregistrement des réglages) :
  - chaque lundi : 3 actifs disponibles anonymisés ;
  - chaque mercredi : un article sur sa spécialité ;
  - le jour choisi : le point marché avec graphique.
- Onglet Posts : la liste du mois, il relit, corrige, coche « Valider ». Un post validé part seul à sa date (9 h).
- **Mode tout automatique** (option) : les posts partent à leur date sans validation.
- **Invitations** : maximum 10 par jour (réglage verrouillé), du plus récent au plus ancien. Après chaque invitation cochée, la suivante n'apparaît qu'après une attente aléatoire entre 50 min et 2 h (compte à rebours affiché). Toujours un clic de sa part : LinkedIn interdit l'envoi automatique d'invitations et bannit les comptes.

## Conditions et limites
- La connexion LinkedIn nécessite une application LinkedIn de l'entreprise (créée une fois par un administrateur sur linkedin.com/developers) ; je vous guiderai.
- Coût : rédaction Gemini plafonnée à 10 €/mois (environ 9 posts/mois/collaborateur).
- Les envois automatiques restent **en pause jusqu'à la publication du site**, comme les autres tâches planifiées.

## Détails techniques
- Table de connexion chiffrée par collaborateur ; posts : statuts brouillon / validé / publié / échec, date + heure.
- Une tâche planifiée unique (bornée, verrou, pause sur erreur de crédit/LinkedIn) : génère le mois manquant, publie les posts dus.
- Invitations : `next_invite_at` = dernière + aléatoire(50–120 min), plafond 10/jour, tests dédiés.
