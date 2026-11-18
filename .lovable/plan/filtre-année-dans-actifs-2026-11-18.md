# Filtre Année dans Actifs

## Changements proposés
- Ajouter un filtre **Année**, à côté du filtre **Famille**, utilisable sur téléphone.
- Utiliser exclusivement l’année indiquée dans le dossier serveur (2023, 2024, etc.), jamais la date de création ou de modification.
- Enregistrer cette année sur les fiches lors de l’aspiration, y compris lorsqu’un dossier est rattaché à une fiche existante.
- Reprendre les années déjà connues dans le suivi d’aspiration, sans relancer les transferts de documents.
- Laisser les fiches sans année connue inchangées et proposer **Sans année** dans le filtre. Si plusieurs années sont associées à une même fiche, ne pas en choisir une arbitrairement.
- Conserver les règles d’import actuelles et l’alimentation automatique des comparables. Aucune publication dans ce lot.

## Détails techniques
- Ajouter un champ nullable sur `assets` et une migration de reprise depuis `nas_folders.year`, limitée aux rattachements non ambigus.
- Propager l’année dans les chemins de création, de rapprochement et de rattachement manuel du NAS.
- Ajouter des tests pour la source de l’année, les valeurs absentes et le filtrage ; vérifier le filtre avec des fiches réelles sur un écran de téléphone.