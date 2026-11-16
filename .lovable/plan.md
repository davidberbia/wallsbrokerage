# Règle de visibilité unique sur tous les onglets

## Règle
- **David (super admin)** : voit tout ; personne ne voit ce qu'il a saisi.
- **Ladislas** : voit tout ce que les agents ont saisi, **sauf David et Alexis**.
- **Autres agents** : ne voient que ce qu'ils ont saisi.
- Une fiche sans propriétaire appartient à David (donc invisible pour les agents).

## Actions
1. Rattacher à David toutes les fiches sans propriétaire : Annuaire (contacts), prospects (sociétés et contacts), contacts « À qualifier », et tout autre onglet concerné (actifs, envois, affaires…).
2. Remplir automatiquement le propriétaire = la personne connectée à chaque nouvelle saisie, pour qu'aucune fiche ne reste orpheline.
3. Appliquer la même règle dans la base pour tous les onglets (Suivi des affaires, Actifs, Teasers, Matching, Envois, Contacts, À relancer, Mandats, Annuaire, Prospects). Seule exception maintenue : les Comparables restent visibles par tous.
4. Ajouter Alexis à la liste des agents cachés à Ladislas, réglable depuis la fiche agent (case « masqué au responsable d'équipe »).

## Vérification
Contrôle des fiches visibles pour chaque profil (David, Ladislas, un agent) sur écran de téléphone.

## Détails techniques
- Aujourd'hui `can_see_owner` laisse voir les fiches sans propriétaire à tous les agents : à corriger (owner NULL = admin).
- Nouvelle colonne `commercial_agents.hidden_from_team` (Alexis = vrai) ; `can_see_owner` et `can_see_deal` excluent les propriétaires admin ou `hidden_from_team`.
- Backfill `owner_id` = id de David sur les tables à propriétaire, puis valeur par défaut `auth.uid()`.
