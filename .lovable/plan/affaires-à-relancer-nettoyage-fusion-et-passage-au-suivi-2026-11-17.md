# Affaires à relancer : nettoyage, fusion et passage au Suivi

## 1. Supprimer les appels téléphoniques
- Supprimer les 27 affaires à relancer créées depuis des appels.
- Supprimer aussi tout le reste créé par les appels : les 8 actualités, les contacts « À qualifier » ajoutés pendant l'analyse des appels et les 266 enregistrements analysés.
- Supprimer la fonction elle-même : analyse automatique, écran et passage dans le Manuel.

## 2. Fusionner les doublons d'un même actif
- Sur chaque ligne, un bouton « Fusionner » ouvre la liste des autres affaires à relancer de la même ville (Dammarie-les-Lys : 6 lignes aujourd'hui). Je coche celles qui parlent du même actif.
- La ligne gardée reçoit les informations manquantes des autres (adresse la plus précise, surface, loyer, prix, notes et sources réunies). Les e-mails et contacts liés y sont rattachés, puis les doublons sont supprimés.
- Rien n'est fusionné automatiquement.

## 3. Passer la ligne dans le Suivi des affaires
- Un bouton « Passer au suivi » ouvre un menu pour choisir l'étape (Avis de valeur, Commercialisation, etc.) et déplace l'affaire dans le pipeline avec toutes ses informations.

## Technique
- Suppression des lignes deals où source = 'appel' et stage = 'Cible' ; arrêt de la tâche planifiée calls-tick.
- Fusion par une fonction serveur sous contrôle des droits (can_see_deal) : réunion des champs, réaffectation de mail_messages et de deal_contacts, puis suppression.
- Passage au suivi : modification de stage, faite à la main seulement (conforme à la règle Cible).
