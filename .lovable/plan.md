# Zéro doublon entre Investisseurs, Prospects et Contacts + annuaire Notaires

## Constat actuel (vérifié en base)
- 315 investisseurs.
- Doublons avec le même email : 4 prospects sont déjà investisseurs, 4 emails apparaissent deux fois dans Prospects, 2 emails apparaissent deux fois dans Investisseurs.
- Doublons avec le même prénom + nom (emails différents) : 37 prospects portent le nom d'un investisseur, et 70 contacts « À qualifier » portent le nom d'un investisseur ou d'un prospect.

## Règle de doublon
Une personne est un doublon si l'une de ces conditions est vraie :
- elle a le **même email** (majuscules et espaces ignorés) ;
- ou elle a le **même prénom + nom**.

Ordre de priorité : **Investisseurs > Prospects > À qualifier / Contacts / Brokers / Notaires**. C'est toujours la fiche de rang inférieur qui est supprimée.

## 1. Nettoyage unique
- Les 315 investisseurs ne sont jamais supprimés. Les 2 doublons internes aux investisseurs vous seront seulement signalés, pour que vous choisissiez.
- Les prospects en doublon avec un investisseur sont supprimés, ainsi que les doublons internes aux prospects (je garde la fiche la plus complète).
- Les contacts « À qualifier » en doublon avec un investisseur ou un prospect sont retirés.
- Les fiches Contacts / Brokers en doublon sont également retirées.
- Avant de supprimer, je vous donne la liste exacte avec les chiffres pour validation.

## 2. Blocage permanent
- L'analyse de la boîte mail et des pièces jointes n'ajoute plus dans « À qualifier » une personne déjà présente dans Investisseurs ou Prospects.
- Les imports Excel/CSV de prospects ignorent les personnes déjà investisseurs.
- L'ajout manuel dans Contacts / Brokers / Notaires refuse un doublon, avec un message clair.

## 3. Annuaire Notaires
- Nouvel onglet « Notaires » dans le menu, placé sous Contacts, soit l'ordre Brokers → Contacts → Notaires → À qualifier. Il reprend la même présentation que Brokers et Contacts : recherche, ajout, suppression, déplacement.
- Nouveau bouton **[Notaires]** sur chaque fiche « À qualifier » et dans le classement groupé.
- Testé au doigt sur un écran de téléphone, puis sur ordinateur, avant publication.

## Détails techniques
- `directory_contacts.kind` accepte `notary`. Nouvelle route `/notaires`, avec `DirectoryPage kind="notary"`, un compteur dans le menu et `classifyMailscanCandidates` étendu.
- Contrôle des doublons côté serveur, dans la création des candidats de l'analyse mail et dans les imports.
