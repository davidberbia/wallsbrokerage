# Enquête infructueuse et suppression d'investisseurs

## 1. « Enquête infructueuse [date] »
- Quand l'enquête IA ne trouve rien de nouveau (aucun champ rempli, bien non identifié), le bouton devient « Enquête infructueuse 18/11/2026 ». Il est grisé, pour éviter de relancer l'enquête par réflexe.
- Un petit lien « Relancer quand même » reste disponible, utile par exemple quand de nouveaux documents arrivent.
- Si l'enquête trouve quelque chose, le bouton reste comme aujourd'hui.

## 2. Supprimer un investisseur depuis la liste
- Dans la liste de la Pige, un bouton « Supprimer » s'affiche à côté de « Modifier », avec une fenêtre de confirmation.
- Le Matching propose déjà la suppression : je garde ce bouton tel quel.
- La suppression est définitive. Les Piges déjà envoyées gardent le nom et l'e-mail dans leur historique.

## Technique
- Colonnes `research_failed_at` sur `deals`, renseignée par l'enquête quand le résultat est vide et effacée quand une enquête aboutit.
- Suppression via les droits existants sur les investisseurs.
- Aucune publication.
