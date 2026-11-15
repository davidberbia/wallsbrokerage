# Harmonisation et enrichissement de Wallsbrokerage

## Interface et navigation
- Remplacer l'interface sombre du Générateur dans Teasers par les formulaires, couleurs, lignes compactes et étapes de Wallsbrokerage, comme sur vos captures. Conserver le contenu et le rendu des brochures exportées.
- Renommer **Prospection → À relancer** et **Veille → Extractions**, sans casser les liens existants.
- Acquéreurs : société en titre lorsqu'elle existe, sinon prénom et nom ; conserver l'accès à la personne et à ses coordonnées dans la fiche.
- Envois : pictogramme « vu » gris après confirmation de livraison, vert après confirmation d'ouverture. Aucun « reçu » déduit du simple envoi ; erreurs et rebonds restent visibles. Les confirmations d'ouverture dépendent du suivi disponible.
- Divers : ajouter la requalification vers Prospects, avec rattachement à une société, conservation des coordonnées et contrôle des doublons entre annuaires.

## À relancer : informations utiles à la prise de contact
- Supprimer de cette section les encaissements, le nombre de lignes et le CA pondéré, sans supprimer les données financières d'Affaires en cours.
- Pour chaque actif, rechercher automatiquement une première fois les informations publiques manquantes : adresse exacte, surface, chambres, parkings, occupant et chiffre d'affaires publié, propriétaire déclaré lorsqu'il s'agit d'une société, dirigeant et autres sociétés dirigées.
- Rechercher ensuite les sites et coordonnées professionnels publics de ces sociétés ; en l'absence de résultat, annuaires puis profils publics pertinents du dirigeant (LinkedIn, Facebook, Instagram). Ne pas inventer de contacts ni déduire des coordonnées privées.
- Chaque renseignement conserve sa source, sa date et son niveau de certitude. Les homonymes et propriétaires non confirmés restent signalés ; les données saisies ne sont pas écrasées.
- Conserver Gemini et le plafond existant de **50 €/mois**, partager ce plafond avec les autres analyses, éviter les analyses répétées et afficher les pauses/erreurs. Relance manuelle possible, pas de recherche à chaque ouverture de page.
- Ne pas recréer ni faire évoluer automatiquement les Affaires en cours depuis ces résultats.

## Extractions multi-sites et newsletters
- Permettre de saisir plusieurs adresses de sites publics et lancer plusieurs files d'extraction, avec suivi distinct, pause et arrêt.
- Espacer les requêtes d'un délai aléatoire de **5 à 15 minutes**, avec un plafond global pour éviter que les sites lancés simultanément multiplient la cadence.
- Ce rythme limite la charge ; il ne garantit pas de rester invisible. Respecter les restrictions des sites, les limitations et les conditions applicables ; arrêter sur refus d'accès ou demande d'authentification. Aucun contournement de blocage, CAPTCHA ou accès payant, aucun usage de vos identifiants CFNews/Lettre M²/LSA.
- Continuer les extractions des newsletters reçues dans Outlook, notamment CFNews et LSA : comparables issus de documents écrits, opportunités et coordonnées d'investisseurs. Conserver les règles anti-doublons et de non-réimport des contacts supprimés.
- L'arrivée d'opportunités dans À relancer reste distincte de la création manuelle des Affaires en cours.

## Comparables
- Location : **loyer annuel/m²**.
- Vente commerce, logistique, activité ou bureaux : **rendement acte en main** = loyer annuel ÷ coût total d'acquisition.
- Hôtel : **prix/clé**, à partir du nombre de chambres connu.
- Appartement : **prix/m²** ; aucune division si la surface ou le nombre de clés manque.
- Coût d'acquisition : prix + droits de mutation applicables au département et à la date de vente + frais de notaire + honoraires d'agence, sans double comptage si déjà inclus.
- Honoraires non renseignés : **3 % HT** par défaut, explicitement identifiés comme estimation ; gérer la TVA selon la base du calcul.
- Retenir votre estimation de **1,8 %** pour une acquisition éligible au régime réduit (VEFA/neuf). Un bien de moins de cinq ans n'y est pas automatiquement éligible, notamment lors d'une revente entre particuliers : vérifier le régime de la transaction et laisser une correction manuelle.
- Vérifier les barèmes officiels par département avant implémentation et ne pas présenter un rendement comme exact lorsque les frais ou le régime fiscal sont inconnus.

## Acquéreurs et actifs habitation
- Bouton **Nouvel acheteur (habitation)** : coordonnées, appartement/maison, secteurs et rues recherchés, budget, surface, pièces/chambres, étage, ascenseur, extérieur, parking et contraintes usuelles ; critères facultatifs et modifiables.
- Dans Nouvel Actif, placer **Appartement** puis **Maison** en tête.
- Ajouter des champs facultatifs adaptés : chambres, surface Carrez, salles de bain, WC, cuisine ouverte/fermée, étage, ascenseur, climatisation, chauffage, sol, cheminée, balcon et surface, terrasse et surface, stationnement. Ne pas imposer ces champs aux actifs commerciaux.
- Présenter **Mandat / Référence** une seule fois en haut de la fiche. Préserver les numéros légaux et les valeurs existantes ; ne pas renuméroter les mandats.

## Agents Co — super administrateur uniquement
- Ajouter l'onglet **Agents Co**, réservé au super administrateur, pour créer un compte vierge avec prénom, nom, téléphone, email, adresse, SIREN éventuel, date de naissance et champs requis par le contrat.
- Envoyer une invitation sécurisée ; ne recopier aucune donnée d'un autre commercial et conserver les espaces séparés.
- Utiliser **votre modèle de contrat à fournir** : préremplissage, contrôle avant envoi, signature DocuSign par vous et l'agent, suivi et archivage du contrat signé.
- Le registre et les fiches peuvent être réalisés avant réception du modèle ; la génération exacte et son test de signature attendront ce document et une connexion DocuSign opérationnelle.

## Réalisation et vérification
- Réaliser l'ensemble des points après votre validation, sans publication.
- Ajouter des tests concrets pour les calculs, frais par défaut, ratios, permissions, doublons et cadences.
- Vérifier les listes et formulaires au toucher sur téléphone et sur ordinateur, avec des données réelles autorisées ; comparer les brochures exportées aux références.
- Tester les confirmations Brevo et le parcours DocuSign lorsque les événements, la connexion et le modèle sont disponibles ; signaler précisément ce qui reste non vérifié.

## Organisation technique
- Réutiliser les formulaires et éléments du CRM ; séparer la présentation de Teasers des moteurs d'export conservés.
- Conserver les adresses de pages actuelles, les contrôles d'accès serveur et les espaces de commerciaux existants.
- Ajouter uniquement les champs et tables nécessaires, avec droits d'accès explicites et protections pour les données personnelles et contrats.
- Enrichissements et extractions : files persistantes bornées, verrou anti-exécution simultanée, déduplication, progression et pauses durables ; pas de traitements lancés à chaque affichage.
- Utiliser des déclenchements liés aux nouveaux éléments et des reprises uniquement tant qu'une file contient du travail ; la cadence lente implique un délai avant disponibilité des résultats et peut entraîner des coûts Cloud récurrents.