# Mandats : registre clarifié et modèles de mandats

## 1. Registre des mandats
- Chaque ligne n'affiche plus le nom de l'actif. Elle montre : N°, Adresse, Ville, Agent, Début mandat, Signature mandat, Fin, Statut.
- **Début mandat** : la date de prise d'effet écrite dans le mandat. Pour les 54 mandats importés, je la lis dans le PDF. Si elle n'y figure pas, je reprends la date de signature.
- **Signature mandat** : la date de signature sur DocuSign.
- Sur téléphone, la ligne reste unique : adresse et ville, puis les dates en petit en dessous.
- L'export Excel reprend ces colonnes.

## 2. Création d'un mandat
- Le champ « Début du mandat » accepte n'importe quelle date.
- La fin est calculée automatiquement à début + 1 an. Elle reste modifiable.

## 3. Les 10 modèles de mandats
J'ai trouvé dans vos documents DocuSign : 35 ventes non exclusives, des locations non exclusives, des recherches simples et exclusives et 1 cession. Je bâtis ainsi les 10 modèles :
- Vente non exclusif / exclusif
- Recherche non exclusif / exclusif
- Location non exclusif / exclusif
- Cession de bail non exclusif / exclusif
- Cession de fonds de commerce non exclusif / exclusif

Quand un modèle n'existe pas dans vos mandats (vente exclusive, location exclusive, cessions), je le crée à partir de vos mandats existants. Je le complète avec les clauses usuelles trouvées sur internet.

**Mise en conformité** (loi Hoguet, décret de 1972, Code de la consommation), ajoutée si elle manque :
- numéro au registre ;
- carte professionnelle et garantie financière ;
- durée et période irrévocable de 3 mois pour l'exclusif ;
- honoraires et qui les paie ;
- délai de rétractation de 14 jours si le mandat est signé hors agence ;
- médiateur de la consommation ;
- données personnelles ;
- clause pénale en caractères apparents.

Je vous liste chaque correction apportée.

## 4. Paramètres → « Modèles de mandats »
Pour chaque modèle, vous pouvez :
- le voir ;
- l'exporter en Word ou en PDF ;
- le modifier, avec des champs à remplir (mandant, adresse, prix, honoraires, dates…) ;
- le supprimer ;
- le remplacer par votre propre fichier Word.

Lors de la création d'un mandat, vous choisissez le modèle. Le CRM pré-remplit le document, puis il peut partir en signature DocuSign.

## Points à confirmer
- Ces modèles sont des bases de travail : je ne remplace pas la relecture d'un juriste.
- Les agents co utilisent les mêmes modèles ; seuls vous (administrateur) pouvez les modifier.

## Détails techniques
- Nouvelles colonnes de mandat : date de début, modèle utilisé.
- Nouvelle table pour les modèles (titre, type, exclusivité, contenu, fichier), accessible aux équipes. Seul l'administrateur peut la modifier.
- Le fichier Word est stocké dans un espace privé.
- Le texte des PDF existants a été extrait sans IA payante.
