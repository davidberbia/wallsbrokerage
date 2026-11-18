# Aspiration du NAS Synology vers le CRM

## Ce que vous aurez
Un seul programme à lancer depuis un ordinateur branché sur le même réseau que le NAS, avec deux modes :
- **Actifs** : parcourt `Investissement / Année / Ville / Actif`, rattache chaque dossier à la fiche actif existante (ou la crée), range photos, plans et documents dans le dossier documentaire.
- **Comparables** : lit les fichiers Excel et alimente la base Comparables (6 classes, pondération 65 %, sans doublon).

Les baux, états locatifs et brochures remontés en mode Actifs alimentent aussi automatiquement les Comparables (lecture par règles, zéro crédit IA).

## Fonctionnement
1. Paramètres > nouvel onglet « Serveur NAS » : génération d'une clé privée (vous seul, super admin), affichage de la dernière synchronisation et du nombre de fichiers reçus.
2. Le programme envoie 10 fichiers en parallèle, saute ce qui est déjà monté (empreinte du fichier), reprend où il s'est arrêté après une coupure.
3. Rattachement : ville + adresse/nom du dossier comparés aux fiches existantes ; en cas de doute, la fiche n'est pas fusionnée et le dossier apparaît dans une liste « À rattacher » pour que vous choisissiez.
4. Photo principale : jamais remplacée si elle existe déjà ; aucun champ rempli n'est écrasé.

## Limites
- Volume : les fichiers sont stockés dans le CRM ; au-delà de quelques dizaines de Go, le stockage peut devenir payant.
- Le PC doit rester allumé pendant le premier envoi.

## Détails techniques
- Point d'entrée `/api/public/nas-ingest` vérifiant la clé (hash en base), envoi direct vers le stockage par URL signée.
- Tables `nas_ingest_keys`, `nas_files` (hash SHA-256 unique, chemin, actif lié, statut).
- Script Python autonome (dépendance `requests`, `openpyxl`), mode `--actifs` / `--comparables`, journal local de reprise.
- Lecture des PDF/Word des actifs pour les comparables par règles (regex), comme pour l'existant.
