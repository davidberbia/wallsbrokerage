# Manuel du CRM, FAQ et « Besoin d'aide »

## 1. Onglet « Manuel du CRM » (au-dessus de Formation immo)
- **Présentation générale** : une page par onglet du CRM. Chaque page montre une capture de l'écran avec les boutons concernés encadrés et numérotés, un court texte d'appui et un lecteur audio.
- **Voix** : voix française de qualité, générée une seule fois par page (coût ponctuel de quelques euros), sans coût à l'écoute.
- **Un module détaillé par onglet** : Suivi des affaires, Actifs, Teasers, Mandats, Matching, Envois, À relancer, Contacts, Extractions, Comparables, Mon contrat, Formation immo, Paramètres (réservé à l'admin).
- **Manuel écrit** : sommaire et paragraphes numérotés, chacun avec un lien direct.

## 2. FAQ
- Questions fréquentes déjà rédigées, renvoyant au bon paragraphe.
- Champ libre : l'IA répond uniquement à partir du Manuel et donne le lien vers le paragraphe.
- Si le Manuel ne contient pas la réponse, l'IA rédige un nouveau paragraphe, l'ajoute directement au Manuel (sans validation, comme demandé) et répond.

## 3. Bouton « Besoin d'aide » sur chaque page
- Bouton discret toujours accessible, au pouce sur téléphone.
- Fenêtre qui résume ce qu'on peut faire sur la page, avec un lien vers la partie du Manuel et un champ de question (même fonctionnement que la FAQ).

## 4. Coûts
- Plafond IA de 5 € par mois pour les réponses. Une fois atteint, les questions libres sont mises en pause et la recherche simple dans le Manuel prend le relais. Le compteur est visible par vous dans Paramètres.
- Aucun traitement automatique en continu : l'IA ne travaille que quand quelqu'un pose une question.

## 5. Vérifications
- Test au doigt sur téléphone : lecture d'une page avec voix, FAQ, fenêtre d'aide, question absente du Manuel qui l'enrichit.

## Détails techniques
- Paragraphes du Manuel en base (table manual_sections : slug, onglet, titre, texte, source auto/manuel) lisibles par le personnel, écriture serveur uniquement.
- Captures prises automatiquement sur l'application (navigateur de test), cadres dessinés par-dessus, puis stockées dans le projet.
- Voix : synthèse Lovable AI, fichiers audio stockés une fois.
- Réponses : fonction serveur réservée au personnel, modèle par défaut, contexte = sections du Manuel, journal de coût mensuel avec blocage au plafond.
