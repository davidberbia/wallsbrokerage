# Ajustements du traitement rapide

## Boutons
- **Traitement rapide** : fond bleu permanent, pas seulement au survol.
- **Sans suite** : ajouter un contour visible autour du bouton.
- **Demander les éléments manquants** : fond orange permanent et largeur réduite au contenu, sans dépasser l’écran sur téléphone.
- **Retour** : ajouter ce bouton à côté de « Suivant » pour revenir au lead précédent ; le désactiver sur le premier lead.

## Leads en attente
- Dès que l’envoi de la demande de documents est confirmé, retirer le lead du traitement rapide et afficher le suivant ; fermer le pop-up si aucun lead ne reste.
- Ne jamais inclure les leads « Attente de docs » dans la navigation du traitement rapide, même après réouverture.
- Les réintégrer uniquement lorsqu’ils passent à **« A rappeler »**.
- Conserver leur consultation dans le filtre « Attente de docs », hors traitement rapide.

## Supprimer « Qualifiés »
- Supprimer le bouton « Qualifier » et le filtre « Qualifiés ».
- Rendre les leads déjà qualifiés visibles dans « À traiter », sans perdre leurs informations ni modifier leurs états d’attente ou de rappel.

## Proposition « Actif disponible »
- Proposer le passage en **Actif disponible** lorsque les cinq éléments minimum pour la brochure sont présents :
  1. Une photo principale sélectionnée.
  2. Un prix pour une vente, ou un loyer pour une location ; le type d’opération doit être renseigné.
  3. Une surface.
  4. Un état locatif renseigné ou une pièce jointe identifiée comme état locatif.
  5. Des honoraires renseignés, en montant ou en pourcentage.
- Afficher ce qui manque tant que ces conditions ne sont pas remplies, plutôt que proposer un passage prématuré.
- Le passage reste une décision manuelle : aucune transformation automatique. Conserver le contrôle existant de la classe d’actif.

## Taux de remplissage pendant tout le parcours
- Afficher un pourcentage compact dans les listes et les fiches, des Leads aux Actifs puis aux Affaires.
- Calcul sur **100 %** :
  - Photo principale : **10 %**.
  - Prix de vente ou loyer de location : **10 %**.
  - Surface : **10 %**.
  - État locatif : **10 %**.
  - Honoraires : **10 %**.
  - Plans : **10 %**.
  - Reportage photo : **10 %**, distinct de la seule photo principale.
  - Bail : **10 %**.
  - Mandat : **20 %**.
- Proposer « Actif disponible » dès que les **cinq éléments minimum** sont présents : ils représentent 50 %, mais un total de 50 % obtenu avec d’autres éléments ne suffit pas. Les documents complémentaires portent ensuite le remplissage jusqu’à 100 %.
- Afficher le détail des éléments présents et manquants dans la fiche.
- Actualiser le taux après saisie, réception de documents ou pré-remplissage ; conserver le même calcul à chaque étape, sans inventer d’informations.

## Vérifications
- Vérifier les couleurs fixes, les boutons et la navigation sur ordinateur et au toucher sur téléphone.
- Tester la sortie immédiate d’un lead en attente, son exclusion après réouverture et son retour à l’état « A rappeler ».
- Tester les neuf pondérations, le total de 100 %, la distinction vente/location, la visibilité des anciens leads qualifiés et la proposition uniquement lorsque les cinq éléments minimum sont présents.
- Ne modifier ni les textes des mails ni les règles de relance existantes : trois jours, jamais le week-end.
- Aucune publication ni aucun mail réel envoyé pour les essais.

## Réalisation technique
- Centraliser le calcul du remplissage et de l’éligibilité à la brochure pour garder des résultats identiques dans les listes et les fiches.
- Réutiliser les données et documents liés à l’actif ; ne modifier ni les moteurs d’export ni la lecture Gemini en cours.
- Ajouter des tests ciblés sur les règles de remplissage et la sélection des leads dans le traitement rapide.