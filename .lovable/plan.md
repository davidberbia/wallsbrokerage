# Traitement rapide des Leads

## Présentation et filtres
- Remplacer « Traiter les leads » par **« Traitement rapide »**.
- Afficher un grand pop-up **central**, jamais un panneau latéral ; plein écran sur téléphone, avec navigation « Suivant ».
- Conserver les filtres existants et ajouter **« Attente de docs »** et **« A rappeler »**, avec leurs compteurs.
- Donner au bouton « Traitement rapide » un fond bleu permanent.
- Ajouter « Retour » à côté de « Suivant », désactivé sur le premier lead.
- Exclure les leads en attente du traitement rapide dès la confirmation d’envoi ; ils ne réintègrent cette file qu’à l’état « A rappeler ». Le filtre « Attente de docs » reste consultable hors traitement rapide.
- Afficher l’état « En attente de documents » en orange sur les leads concernés et « A rappeler » en rouge.

## Actions du pop-up
- **Transformer en Actif dispo** : déplacer le dossier dans les actifs disponibles, avec contrôle de la classe d’actif obligatoire ; ne pas le transformer en affaire d’estimation.
- **Sans suite** : archiver le lead, sans relance ultérieure.
- Encadrer « Sans suite » avec un bouton visible ; réduire la largeur de « Demander les éléments manquants » et lui donner un fond orange permanent, adapté au téléphone.
- Conserver « Qualifier » : ce bouton classe le lead dans « Qualifiés », sans le transformer en actif disponible.
- **Demander les éléments manquants** : vérifier les données et documents déjà présents, adapter les pièces nécessaires au type et à l’occupation du bien, puis préparer un mail dans Outlook professionnel. Liste possible : plans, bail, état locatif, décompte de charges, taxe foncière, photos, prix, surface, loyer et caractéristiques hôtelières lorsque pertinentes. Ne pas demander systématiquement des pièces inapplicables.
- Objet : « Votre dossier : [nom du lead] — Éléments complémentaires » ; corps avec salutation, liste des éléments manquants et formule de politesse.
- L’ouverture d’Outlook sera enregistrée comme **préparation**, pas comme envoi. La fiche proposera **« Confirmer l’envoi »** après envoi dans Outlook, pour dater la demande et passer en attente de documents.

## Relance à trois jours, hors week-end
- À partir de l’envoi confirmé, prévoir **une relance automatique après trois jours calendaires**, seulement si aucun retour concernant ce dossier n’a été reçu ; pas une simple proposition de relance manuelle.
- **Aucune relance le samedi ou le dimanche**, selon l’heure de Paris ; si l’échéance tombe le week-end, reporter au lundi.
- Rechercher le retour dans le fil et les messages correspondants ; ne pas considérer un autre mail du même expéditeur comme une réponse à ce dossier.
- Envoyer via la connexion Outlook professionnelle existante et journaliser le résultat ; après acceptation de l’envoi par Outlook, passer à **« A rappeler »**.
- Objet : « [Relancé auto] Votre dossier : [nom du lead] ». **La couleur d’un objet de mail n’est pas contrôlable** ; la mention sera rouge dans le suivi du CRM et dans le corps du message.
- Éviter les doublons et arrêter les relances lorsqu’un retour arrive, que le lead est archivé ou qu’il devient un actif disponible.

## Vérifications et limites
- Tester les trois jours, le report au lundi, l’interdiction de relance le week-end, l’arrêt sur réponse et la prévention des doublons ; vérifier les filtres et le pop-up au toucher sur téléphone et sur ordinateur.
- Ne pas envoyer de mail réel à un contact pour les essais sans autorisation spécifique.
- **Aucune publication** ; l’envoi automatique sera activé après déploiement autorisé. Les filtres et actions seront vérifiables dans l’aperçu auparavant.

## Réalisation technique
- Conserver `/cibles`, les contrôles d’accès actuels et la messagerie Outlook connectée.
- Stocker les demandes et leur historique avec des accès limités aux personnes autorisées à voir le lead ; déduire les états de suivi depuis cet historique.
- Réutiliser le traitement de synchronisation Outlook pour le rapprochement des réponses et les relances, sans ajouter de surveillance payante continue ni modifier les schedules existants sans classification préalable.