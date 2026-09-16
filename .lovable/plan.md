# Correction des erreurs 404 du scraper CFNews

## Résultat attendu

- Un retour HTTP 404 ne bloquera plus tout l’import.
- L’URL concernée sera conservée dans un journal avec son type (pagination, société ou collaborateur), son nombre de tentatives et la dernière erreur.
- Pour les pages de résultats, le scraper passera automatiquement à la page suivante. Après trois pages 404 consécutives, il terminera proprement le recensement des sociétés puis poursuivra la collecte des collaborateurs et des coordonnées.
- Les sociétés et collaborateurs déjà importés ne seront ni modifiés ni supprimés.
- Le panneau CFNews affichera le nombre de sociétés récupérées et le nombre d’URLs ignorées.
- Un bouton permettra de remettre en attente uniquement les URLs en erreur, sans recommencer les pages réussies.

## Mise en œuvre

1. Ajouter une table technique dédiée aux URLs ignorées, inaccessible directement aux utilisateurs et réservée au traitement serveur.
2. Faire remonter le statut HTTP des requêtes CFNews afin de distinguer précisément un 404 des autres incidents.
3. Adapter la tâche d’import pour journaliser et ignorer les 404 selon leur contexte, sans toucher à la logique d’extraction existante.
4. Ajouter une action protégée réservée au broker pour relancer uniquement les URLs journalisées.
5. Mettre à jour le panneau de suivi avec le compteur et le bouton de relance.
6. Vérifier la compilation et le comportement visible du panneau.

## Détails techniques

- Les erreurs seront enregistrées de façon idempotente par URL, avec `kind`, `attempts`, `last_status`, `last_error`, `resolved_at` et les identifiants utiles pour reprendre le bon traitement.
- La relance réinitialisera uniquement les marqueurs de traitement des sociétés/collaborateurs concernés et replacera les pages de pagination dans une file ciblée prioritaire.
- Une URL réussie lors d’une relance sera marquée comme résolue ; les données déjà présentes resteront protégées par les opérations idempotentes actuelles.
