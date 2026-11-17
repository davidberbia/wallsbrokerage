# Renommage des étapes des affaires

## Objectif
Renommer trois étapes partout dans l'outil :
- « Cible » → « Prospection »
- « Commercialisation » → « Disponible »
- « Acte » → « Vendu »

## Ce qui change

### 1. Base de données (migration)
- Mise à jour des lignes existantes : toutes les affaires en « Cible » passent en « Prospection », « Commercialisation » en « Disponible », « Acte » en « Vendu » (tables `deals` et `prospect_pipeline`).
- Les pondérations en base suivent les nouveaux libellés : Prospection 0 %, Avis de valeur 10 %, Disponible 20 %, Offre 30 %, LOI acceptée 50 %, Promesse 75 %, Vendu 100 %, Perdu 0 %.

### 2. Code
- `src/lib/deal-stages.ts` : nouveaux libellés affichés ; `ASSET_STAGES` devient `["Avis de valeur", "Disponible"]`.
- Les identifiants techniques internes restent stables (pas de renommage de clés qui casserait les liens existants).
- Tous les écrans qui affichent ou filtrent ces étapes : « À relancer », Suivi des affaires, fiche affaire (menu Étape), Actifs, statistiques/pondérations.

### 3. Comportement inchangé
- Prospection (ex-Cible) reste dans « À relancer ».
- Avis de valeur et Disponible (ex-Commercialisation) créent une fiche actif et sortent du suivi.
- Offre, LOI acceptée, Promesse, Vendu (ex-Acte) et Perdu restent dans le suivi ; Perdu à 0 € en fin de tableau.

### 4. Vérification
- Tests des pondérations mis à jour et relancés.
- Vérification visuelle sur téléphone : menu Étape d'une fiche affaire, « À relancer », Suivi, Actifs.
- Rien n'est publié.
