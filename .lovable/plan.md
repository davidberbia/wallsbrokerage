# Super administrateur et vue du chiffre d'affaires par agent

## Ce qui change pour vous
- **d.berbia@wallsbroker.com = super administrateur** : accès à tout (toutes les affaires, mandats, contacts, annuaire complet, paramètres, agents). Cette règle est inscrite de façon permanente.
- **Suivi des affaires** : nouveau menu déroulant en haut de la page
  - « Tous les agents » : chiffre d'affaires global (vous inclus)
  - puis un choix par agent : David, Ladislas, Alexis, Li Wei, Romain
  - Les totaux, objectifs et le tableau suivent le choix.

## Qui voit quoi dans Suivi des affaires
| Compte | Voit |
|---|---|
| David (super admin) | Tous les agents + vue générale |
| Ladislas | Tous les agents sauf David (vue générale sans vos affaires) |
| Alexis, Li Wei, Romain | Uniquement leurs propres affaires, sans menu déroulant |

Le reste (mandats, contacts) ne change pas : chaque agent ne voit que les siens.

## Détails techniques
- Rattacher chaque affaire à un agent (owner_id déjà présent ; affaires sans propriétaire → David).
- Règle d'accès côté serveur pour les affaires : super admin = tout ; Ladislas = toutes sauf celles de David ; autres = les leurs. Filtrage fait par la base, pas seulement à l'écran.
- Menu déroulant dans la page Suivi des affaires, visible seulement pour David et Ladislas.
- Test ajouté pour la règle de visibilité.
