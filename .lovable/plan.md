# Ajustements de la demande d’éléments

- Ajouter l’adresse du bien dans l’objet : **Votre dossier : [nom du lead] — [adresse] — Éléments complémentaires**. Utiliser l’adresse renseignée dans la fiche ou l’actif lié, sans en inventer si elle manque.
- Sous les éléments déjà proposés, afficher **trois lignes vides**, chacune avec une case à cocher et un champ libre. Permettre d’ajouter d’autres lignes si nécessaire.
- Inclure dans le mail uniquement les éléments cochés et renseignés ; ignorer les lignes vides et éviter les doublons.
- Conserver l’objet contenant l’adresse dans l’historique et lors des relances, sans modifier les demandes déjà envoyées ni le délai actuel.

## Transférer et Pige dans Traitement rapide
- Remplacer le pictogramme de transfert par un bouton textuel **Transférer**, en conservant son fonctionnement actuel.
- Placer le bouton **Pige** entre **Transférer** et **Sans suite**.
- Pige ouvre la liste des investisseurs avec les filtres déjà renseignés à partir des informations connues du lead : type de bien, prix, région, stratégie et rendement si disponibles. Les filtres restent modifiables, sans inventer de données manquantes.
- Permettre de cocher les investisseurs à interroger, puis de valider la sélection.
- **Envoi** prépare un message dans Outlook professionnel, sans l’envoyer automatiquement. Prévoir un message distinct par investisseur pour personnaliser le prénom et ne pas exposer les autres destinataires ; ouvrir les messages successivement plutôt que plusieurs fenêtres d’un coup.
- Utiliser l’objet de l’actif et le texte ci-dessous, modifiable avant l’envoi. Renseigner uniquement les informations présentes ; adapter le type de bien si ce n’est pas un hôtel. Aucune brochure ni autre pièce jointe ajoutée automatiquement à cette simple prise de contact.

### Message préparé
Bonjour [prénom],

Un confrère m’indique qu’un hôtel de [description de l’actif] situé à [ville] et disposant de [nombre de chambres] serait à vendre au prix de [prix].

Est-ce que ce dossier pourrait t’intéresser ?

Dans l’affirmative, n’hésite pas à revenir vers moi pour approfondir le sujet.

Bien à toi,

[Signature professionnelle]

## Vérifications
- Vérifier l’objet et le contenu préparés pour Outlook avec une adresse réelle et des éléments complémentaires.
- Vérifier les cases et les champs par toucher sur un écran de téléphone.
- Vérifier l’ordre Transférer / Pige / Sans suite, les filtres préremplis et la sélection d’investisseurs au toucher sur téléphone.
- Vérifier les messages personnalisés sans déclencher de véritable envoi ; ouvrir Outlook ne vaut pas confirmation d’envoi.
- Aucune publication ni aucun envoi de mail pendant les tests.

## Détails techniques
- Récupérer l’adresse depuis les données accessibles de la fiche et de l’actif lié lors de la préparation côté serveur.
- Remplacer le champ complémentaire unique par des lignes sélectionnables et appliquer la même sélection à la préparation du message et à son historique.
- Réutiliser la logique de matching existante avec un mode Pige pour les leads, sans transformer le lead en Actif disponible et sans passer par la campagne de brochures.