# Fusion du Générateur de brochures dans le CRM

## Ce que vous verrez
Deux entrées séparées dans le menu latéral :

**Actif** — création d'un bien par étapes (Suivant / Retour, tout est enregistré à chaque étape) :
1. Type de bien (local commercial, hôtel, logistique, bureau, appartement, maison…) + vente ou location
2. Infos de base : adresse, surface, prix, loyer (+ pré-remplissage depuis un document, déjà en place) + documents du bien (charges, titre, taxe foncière, bail…)
3. Photos : photo principale obligatoire, le reste facultatif
4. Mandat : propriétaire, coordonnées, exclusif / non exclusif, vente / location, début et fin
5. Fin : « Votre bien est créé. Souhaitez-vous générer la brochure ? » → Générer maintenant / Plus tard

Les actifs existants restent intacts et éditables.

**Présentation** — choix d'un actif, puis génération de la brochure PowerPoint par étapes, reprises du générateur actuel :
Points clés → Localisation → Zone de chalandise et revenus → Environnement commercial → Accessibilité → État locatif → Reportage photos → Plan de masse → Plans → Perspectives → Générer.
Les brochures générées sont gardées dans l'onglet (date, téléchargement, suppression) et jointes à l'actif, donc utilisables dans vos campagnes Brevo actuelles.
Les réglages fixes (pages Confidentialité / À propos, carte de France, pictos) vont dans Paramètres.

## Reprise à l'identique
Rendu de la brochure (Calibri, dégradés, lignes orange, mises en page validées) copié tel quel, sans retouche du design. Comparables : ceux du CRM sont utilisés.

## Pas inclus dans ce lot (plus tard)
- Champs différents selon le type de bien et étapes réduites pour un appartement : vous me donnerez les règles, je vous les redemanderai.
- Envoi du mandat par DocuSign, registre des mandats (à partir du n° 202193), onglet Mandat.
- Partage de documents par lien 15 jours.
- Espaces étanches par commercial.

## Points à valider
- **Cartes** : votre règle du CRM impose OpenStreetMap sans clé. Le générateur utilise Google Maps. Je passe toutes ses cartes sur OpenStreetMap (le générateur a déjà ce mode).
- **Logos d'enseignes (Brandfetch) et temps de trajet (OpenRouteService)** : ils demandent leurs propres clés. Je reprends les clés du générateur si elles sont disponibles, sinon ces deux options restent désactivées.
- **Brochures, comparables et pictos déjà enregistrés dans le générateur** : ils ne se transfèrent pas tout seuls ; les pictos et images fixes seront repris, le reste sur demande.
- Aucun nouveau coût IA récurrent : l'IA n'est appelée que quand vous cliquez.

## Vérification
Test complet au doigt sur écran de téléphone puis sur ordinateur : création d'un actif en 5 étapes, génération d'une brochure, comparaison visuelle avec une brochure du générateur actuel. Aucune mise en ligne avant votre accord.
