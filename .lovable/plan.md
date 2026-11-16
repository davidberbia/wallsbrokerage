# Formulaire de création d'actif : réorganisation

## Étape 2 « Infos de base »
- Ordre cohérent : Adresse (pleine largeur) → Code postal + Ville côte à côte → Région.
- Puis : Surface (m²) + Surface extérieure (m²) ; Nombre de parkings ; Prix + Loyer annuel ; Rendement + Statut ; Stratégie.
- « Stratégie (facultatif) » : icône « ? » qui ouvre une bulle (survol sur ordinateur, toucher sur téléphone) expliquant les 4 stratégies, textes repris de wallsbroker.com.
- Un seul champ de dépôt de fichier : le document déposé pré-remplit les champs vides ET est joint à l'actif (fusion des deux champs actuels).

## Appartement / Maison
- Déjà en place : quand le type est Appartement ou Maison, un bloc dédié s'affiche (pièces, chambres, Carrez, salles de bain, WC, étage, ascenseur, cuisine ouverte/fermée, cheminée, balcon, terrasse et surfaces, climatisation, chauffage, type de sol, stationnements).
- Ajout proposé : année de construction, DPE/GES, exposition, cave, gardien, charges annuelles. Le champ parkings général reprend « Stationnements » pour éviter un doublon.

## Étape 3 « Photos »
- Aucune photo obligatoire pour créer l'actif.
- La photo principale reste exigée uniquement au moment de générer la brochure (message clair si elle manque).

## Diffusion sur le site
- « Publier sur le site Wallsbroker » grisé tant qu'aucune photo n'est enregistrée (« Ajoutez une photo pour publier »).
- « Masquer le n° » et « Masquer la rue » n'apparaissent que si la publication est cochée.
- Sécurité serveur : un actif sans photo n'apparaît jamais dans le catalogue public.

## Étape 4 « Mandat » : type de propriétaire
- Choix « Personne physique » / « Personne morale ».
- Personne physique : civilité, prénom, nom, adresse, email, téléphone.
- Personne morale : SIREN obligatoire (9 chiffres) → récupération automatique gratuite (annuaire public des entreprises, sans clé) de la raison sociale, forme, capital, siège, RCS, représentant légal ; puis champs restants à compléter (qualité du signataire, email, téléphone).
- Représentant légal pré-rempli avec son rôle (Président, Gérant…) tel qu'indiqué au registre ; nom et rôle modifiables, avec option « Signataire par procuration » pour indiquer une autre personne.
- Ces informations alimentent les champs des modèles de mandat générés.

## Technique
- Nouvelles colonnes facultatives sur les actifs : parking_count, outdoor_surface, owner_kind, owner_siren et détails propriétaire (jsonb). Aucun changement destructif.
- Recherche SIREN via recherche-entreprises.api.gouv.fr côté serveur.
