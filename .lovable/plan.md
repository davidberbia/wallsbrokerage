# Remplacement de Sender par Brevo

## Objectif
Faire de Brevo l’unique solution d’envoi pour les brochures, campagnes et confirmations, sans toucher aux investisseurs, aux brochures ni aux autres fonctions du CRM.

## Mise en œuvre
- Remplacer le module Sender par un module Brevo côté serveur, en conservant `d.berbia@wallsbroker.com` comme expéditeur et adresse de réponse.
- Conserver les objets, textes, destinataires, pièces jointes PDF, envois individuels et campagnes existants.
- Adapter la tournée d’envoi pour enregistrer Brevo comme prestataire, conserver l’identifiant de message et les erreurs détaillées.
- Remplacer le suivi Sender par un point de réception Brevo pour les livraisons, ouvertures, clics, désinscriptions et rebonds.
- Basculer également les confirmations de profil et les rapports automatiques vers Brevo.
- Garder les 49 emails en attente, puis les relancer uniquement après validation d’un envoi test Brevo.
- Supprimer tout appel actif à Sender et empêcher sa remise en route.

## Vérifications
- Vérifier la connexion Brevo et l’expéditeur autorisé.
- Envoyer un seul test contrôlé avant la reprise de la file.
- Confirmer que l’historique et le Marketing Report continuent d’afficher les ouvertures.
- Vérifier la compilation et les erreurs d’exécution, sans publier le site sans votre accord.

## Point hors application
Le domaine ou l’expéditeur devra être validé dans Brevo si Brevo ne le reconnaît pas encore. Aucun DNS ne sera modifié sans vous présenter précisément le changement.
