# Occupant dans la liste, contacts en erreur, correction des fiches avant envoi

## 1. Occupant dans le résumé de la liste des Leads
- Sur chaque ligne (ex. « Hôtel 5* Paris 17ème »), afficher l'occupant quand il est connu, sur la ligne grise : « Hôtel · Hilton · bernard@… ».
- Rien ne s'affiche s'il est vide.

## 2. Adresse e-mail en erreur = contact rouge, non sélectionnable
- Quand Brevo signale qu'un mail est revenu en erreur (adresse invalide, boîte inexistante), la fiche investisseur est marquée « E-mail en erreur ».
- Dans toutes les listes de choix avant envoi (Pige, campagnes du Matching, envoi de brochures) : le contact s'affiche en rouge avec « E-mail en erreur », case à cocher désactivée.
- Dès que l'e-mail est corrigé sur la fiche, le marquage disparaît et le contact redevient sélectionnable.

## 3. Modifier la fiche directement depuis la liste
- Sur chaque contact de ces listes, un petit bouton « Modifier » ouvre la fiche investisseur par-dessus, sans quitter la sélection.
- Les cases déjà cochées et les filtres sont conservés ; la liste se met à jour à l'enregistrement.

## Points techniques
- Colonne `email_bounced_at` sur `investors`, remplie par le récepteur d'événements Brevo existant (bounce dur uniquement), effacée par un déclencheur quand l'e-mail change.
- Composant de ligne partagé entre Pige.tsx, CampaignDialog et l'envoi de brochures ; réutilisation du formulaire investisseur existant en dialogue.
- Test : un contact en erreur ne peut pas être sélectionné ; changer l'e-mail lève le marquage.
- Aucune publication, aucun mail réel envoyé.
