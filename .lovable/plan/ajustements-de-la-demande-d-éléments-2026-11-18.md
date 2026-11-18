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

Un confrère m’indique qu'un [actif] situé à [ville] et disposant de [nombre de chambres] serait à vendre au prix de [prix].

Est-ce que ce dossier pourrait t’intéresser ?

Dans l’affirmative, n’hésite pas à revenir vers moi pour approfondir le sujet.

Bien à toi,

[Signature professionnelle]

## Suivi des Piges et retour dans les Leads

- Après les envois confirmés, placer le dossier dans l’état **Pige**, accessible par un filtre dédié, et le sortir du traitement rapide pendant la semaine d’interrogation.
- Conserver pour chaque investisseur le message préparé, la date d’envoi et les événements disponibles : **Contacté**, **Réception confirmée**, **Lecture signalée**, **Répondu**. L’ouverture d’Outlook seule ne vaut jamais un envoi.
- Confirmer les envois depuis les messages envoyés de la boîte professionnelle lorsqu’elle est accessible ; prévoir une confirmation manuelle explicite si la vérification n’est pas disponible.
- Avec un mail ouvert dans Outlook, réception et lecture ne sont pas systématiquement connues : afficher **Non confirmé** en l’absence d’accusé, sans déduire la livraison de l’envoi ni prétendre connaître une lecture. Une réponse constitue une preuve de retour ; les accusés automatiques ne comptent pas comme une réponse commerciale.
- **Sept jours calendaires après le premier envoi confirmé**, remettre le dossier dans **À traiter** et dans le traitement rapide, sans effacer son historique de Pige ni renvoyer de message automatiquement.
- Afficher dans la fiche un **marketing report** : investisseurs interrogés, envois confirmés, réceptions et lectures connues, réponses reçues et extraits, absences de réponse et informations de suivi inconnues. Présenter des indicateurs factuels, sans classification IA payante ni décision automatique.
- Ce rapport accompagne la décision manuelle : demander des précisions, reprendre une Pige, passer en Actif disponible si les éléments minimum sont réunis, ou classer Sans suite.
- Réutiliser le suivi périodique Outlook existant ; les retours apparaissent au passage suivant, pas nécessairement à la minute exacte. Aucune activation avant l’autorisation prévue, aucune publication.

## Vérifications

- Vérifier l’objet et le contenu préparés pour Outlook avec une adresse réelle et des éléments complémentaires.
- Vérifier les cases et les champs par toucher sur un écran de téléphone.
- Vérifier l’ordre Transférer / Pige / Sans suite, les filtres préremplis et la sélection d’investisseurs au toucher sur téléphone.
- Vérifier les messages personnalisés sans déclencher de véritable envoi ; ouvrir Outlook ne vaut pas confirmation d’envoi.
- Tester le passage en Pige après confirmation, la sortie du traitement rapide et le retour avec rapport après sept jours, sans réel envoi de test.
- Aucune publication ni aucun envoi de mail pendant les tests.

## Détails techniques

- Récupérer l’adresse depuis les données accessibles de la fiche et de l’actif lié lors de la préparation côté serveur.
- Remplacer le champ complémentaire unique par des lignes sélectionnables et appliquer la même sélection à la préparation du message et à son historique.
- Réutiliser la logique de matching existante avec un mode Pige pour les leads, sans transformer le lead en Actif disponible et sans passer par la campagne de brochures.
- Stocker un historique Pige par dossier et destinataire avec accès limité aux personnes autorisées à voir le dossier ; rattacher les réponses par conversation Outlook et destinataire plutôt que par le seul objet.
- Calculer les échéances à partir des envois confirmés et rendre le retour à traiter idempotent, en conservant les cycles de Pige précédents.