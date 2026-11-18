# Pige : un seul mail pour tous les investisseurs

## Ce qui change
- Après « Valider la sélection », un **seul** écran : la liste des destinataires (ex. 17), puis un seul objet et un seul message modifiables.
- Le message commence par **« Bonjour [Prénom] »**. Le reste du texte (description de l'actif, signature) est commun.
- Au moment de l'envoi, [Prénom] est remplacé par le prénom de chaque investisseur. S'il n'a pas de prénom, ce sera « Bonjour, ».
- Un seul bouton **« Envoyer à 17 investisseurs via Brevo »**, avec une fenêtre de confirmation (nombre de destinataires + objet).
- Chaque investisseur reçoit quand même **son propre mail**, sans voir les autres destinataires. Le suivi par personne (reçu, lu, répondu) et le marketing report ne changent pas.
- Le passage « 1 / 17 » avec les boutons Retour/Suivant disparaît.

## Sécurité des envois
- Un mail déjà parti ou dont le résultat est incertain n'est jamais renvoyé, même si on reclique.
- À la fin de l'envoi, un résumé indique combien de mails sont partis, combien ont été refusés et combien sont à vérifier.

## Technique
- Modèle commun : le texte modifié est enregistré pour tous les contacts du cycle encore « préparés », avec [Prénom] remplacé côté serveur pour chacun.
- Envoi séquentiel côté serveur, avec la même réservation atomique par contact qu'aujourd'hui.
- Test : [Prénom] est bien remplacé, et l'absence de prénom donne « Bonjour, ».
- Aucune publication, aucun vrai mail envoyé pendant les tests.
