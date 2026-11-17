# Reclassement Affaires → Actifs / Suivi

## Ce qui change
1. **Avis de valeur et Commercialisation → Actifs** : les 17 affaires existantes deviennent des fiches actifs (nom, adresse, ville, surface, loyer, prix, société, notes, agent repris). **Aucun numéro de mandat n'est créé.** Elles disparaissent du suivi des affaires.
2. **Changement d'étape à l'avenir** : choisir Avis de valeur ou Commercialisation sur une affaire crée sa fiche actif (sans mandat) et la retire du suivi.
3. **Cibles** : restent toujours dans « À relancer », rien ne bouge.
4. **Offre, LOI, Promesse, Acte** : restent dans le suivi des affaires.
5. **Perdu** : reste dans le suivi, honoraires forcés à 0, toujours placé en fin de tableau.
6. **Mandat facultatif** : on peut créer et compléter un actif sans mandat. Un bouton « Créer le mandat » sur la fiche actif permet de le générer à tout moment ; le numéro (à partir de 202194) n'est attribué qu'à ce moment.

## Détails techniques
- Modification du déclencheur qui crée automatiquement un mandat à l'enregistrement d'un actif : il ne crée plus rien ; création explicite depuis la fiche.
- Reprise des 17 affaires en actifs (status « en commercialisation » / « avis de valeur »), puis retrait de ces affaires de la liste.
- Tri et honoraires à 0 pour Perdu dans le suivi.
- Vérification au doigt sur téléphone. Rien n'est publié.
