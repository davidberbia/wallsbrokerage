# Pourquoi l'hôtel n'a pas été trouvé, et la correction

## Ce qui s'est passé (lead « Hôtel 5* Paris 8ème », réf. 75_0027)
1. **Le dossier existe en double.** Les mails et les pièces jointes (« 75_0027.pdf » et la lettre d'intérêt) ont bien été téléchargés, mais ils sont rattachés à un **autre lead**, « Produit 75_0027 ». Ce lead a été créé la veille, à partir du mail « Présentation du produit 75_0027 ». Le lead que vous regardez n'a ni mail ni document rattaché.
2. **L'enquête IA ne lit pas le contenu des pièces jointes.** Elle utilise seulement le nom du lead, la description et l'aperçu des mails. Elle n'a donc jamais vu le texte du teaser PDF.
3. **Votre enquête a échoué sur une réponse illisible** (« Résultat de recherche non vérifiable »). Ce n'était pas un vrai « rien trouvé ».

## Correction proposée
- **Fusion des doublons** : regrouper « Hôtel 5* Paris 8ème » et « Produit 75_0027 » en un seul lead, avec les mails et les documents. À l'avenir, un nouveau lead portant la même référence (75_0027, REFBB…) qu'un lead existant sera rattaché à ce lead au lieu d'en créer un second.
- **L'enquête lit les documents** : le texte des PDF et Word rattachés au lead (teaser, plaquette) est joint à la recherche, dans une limite raisonnable, pour garder un coût faible.
- **Échec technique ≠ enquête infructueuse** : une réponse illisible affiche « Enquête interrompue, relancer » et ne grise pas le bouton.

## Technique
- Rapprochement par référence dossier extraite du sujet et de la description (motif `\d{2}_\d{4}` et `REF…`) dans la création de leads ; fusion via la fonction de fusion existante.
- Extraction de texte : réutiliser le texte déjà extrait des documents quand il existe ; sinon, lecture du PDF côté serveur limitée aux premières pages.
- `research_failed_at` n'est posé que sur un résultat valide et vide.
- Aucune publication.
