# Notoriété LinkedIn des collaborateurs

## Dans Paramètres (chaque collaborateur)
- Bouton « Connecter mon LinkedIn » (connexion officielle).
- Jour du mois pour le point marché (1 à 28).
- Liste libre de sites sources pour son marché (ajout / suppression).
- Sa spécialité (ex. habitation, commerces, hôtellerie).

## Calendrier automatique
- **Lundi** : post « 3 actifs à vendre », choisis parmi ses actifs dispo, anonymisés : type, surface, arrondissement ou ville, prix (« Hôtel particulier de 450 m² à vendre dans le 17e à 6,5 M€ NV »). Jamais d'adresse, d'enseigne ni de propriétaire.
- **Mercredi** : article sur sa spécialité, écrit par Gemini.
- **Jour mensuel choisi** : évolution de son marché, résumé des sites indiqués + un graphique (image jointe au post).

## Page « Notoriété » (accessible au téléphone)
- Brouillons à venir, aperçu du graphique, bouton Publier / Modifier / Ignorer.
- Historique des publications.

## Invitations
- File quotidienne triée du contact le plus récent au plus ancien, plafond par jour, rien le week-end.

## Coût
- Gemini : environ 6 textes par mois et par collaborateur, plafond mensuel dédié comme le manuel.

## Détails techniques
- Tables : linkedin_settings, linkedin_sources, linkedin_posts (RLS par propriétaire).
- Publication via connexion LinkedIn officielle (posts + image) ; tâche planifiée unique avec verrou.
- Graphique généré côté serveur en image SVG/PNG à partir des chiffres extraits.
