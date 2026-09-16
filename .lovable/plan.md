# Import CFNews par l'API officielle (fin du scraping)

## Ce que ça change pour toi

L'import des acteurs CFNews ne passera plus par les pages du site (lent, bloqué par Cloudflare, 404/520). Il utilisera l'API officielle CFNews, bien plus rapide et fiable.

Dans l'onglet Prospects, le bloc d'import affichera :

- un bouton **Prévisualiser** qui indique combien d'acteurs correspondent aux filtres, sans consommer de quota ;
- la progression **page X / Y**, le nombre d'acteurs récupérés, ajoutés, mis à jour, doublons ignorés et erreurs ;
- un bouton **Reprendre l'import** qui repart exactement là où il s'est arrêté ;
- les messages d'erreur en clair : jeton invalide, trop de requêtes, recherche trop large, panne temporaire.

Les 537 sociétés et tous les contacts déjà en base sont conservés : l'import complète et met à jour, il ne supprime rien.

L'import de fichiers Excel/CSV CFNews reste disponible, avec en plus un écran de correspondance des colonnes si les intitulés diffèrent, et une détection des doublons par identifiant CFNews puis par nom normalisé.

## Ce dont j'ai besoin de toi

Le **jeton d'accès (Bearer token) de l'API CFNews**. Je le stockerai côté serveur uniquement, jamais visible dans le site. Sans lui je ne peux ni tester ni brancher l'API.

## Détails techniques

- Nouveau `src/lib/cfnews-api.server.ts` : client `GET https://api.cfnewsimmo.net/v1/acteur` (`Authorization: Bearer $CFNEWS_API_TOKEN`, `Accept: application/json`), pagination native (`page`, `nb_pages`, `items`), `ping=true` pour le total, délai entre appels, retry avec backoff exponentiel sur 429/5xx, erreurs typées 401/403/422.
- Mapping réel inspecté sur une première réponse avant d'écrire le normaliseur ; champs conservés : nom, domaine, sous-domaine, type d'investissement, zone, région, département, AUM, types d'actifs, tranche, URL et identifiant CFNews, date de synchronisation, `source = 'CFNEWS_API'`.
- Migration : colonnes `cfnews_id` (unique), `source`, `synced_at` et les champs ci-dessus sur `prospect_companies` ; upsert `onConflict: cfnews_id`.
- Nouvelle table d'état `cfnews_api_import` (page courante, nb_pages, compteurs récupérés/ajoutés/mis à jour/ignorés/erreurs, statut, dernière erreur) pour la reprise ; le cron minute existant appelle le nouveau tick API.
- Suppression du scraping HTML : `cfnews.server.ts` (ZenRows, login, parseurs de listing), `cfnews-tick.ts` et les états liés. Les parseurs de fiche société/contact ne sont conservés que si l'API ne renvoie pas les collaborateurs — vérifié avec le jeton.
- Import Excel : lecture locale (xlsx déjà installé), détection des colonnes, écran de correspondance, dédoublonnage identifiant CFNews puis nom normalisé.
