import type { FaqItem, ManualTab } from "./types";

/** Manuel écrit du CRM. Les paragraphes ajoutés suite aux questions viennent de la base. */
export const MANUAL_TABS: ManualTab[] = [
  {
    slug: "dossiers",
    label: "Suivi des affaires",
    routes: ["/dossiers"],
    intro: "Votre pipeline : chaque affaire, son étape, ses honoraires pondérés et votre chiffre d'affaires de l'année.",
    narration:
      "Le Suivi des affaires est votre page d'accueil. Chaque ligne est une affaire, de l'avis de valeur jusqu'à l'acte. En haut, les compteurs donnent le chiffre encaissé, le global pondéré et votre avancement par rapport à l'objectif. Le bouton Nouveau dossier crée une affaire, et Import Excel reprend un fichier existant sans créer de doublons. Ouvrez une ligne pour changer son étape : les honoraires pondérés se recalculent tout seuls.",
    marks: ["Import Excel", "Nouveau dossier", "Encaissé", "Global pondéré", "Réalisé / objectif"],
    sections: [
      { id: "principe", title: "À quoi sert cet onglet", body: ["Le Suivi des affaires regroupe toutes vos affaires en cours et passées, année par année. C'est la page qui s'ouvre quand vous vous connectez.", "Chaque agent ne voit que ses propres affaires ; le responsable d'équipe voit celles des agents de son équipe."] },
      { id: "etapes", title: "Les étapes et leur pondération", body: ["Chaque affaire avance par étapes. Le pourcentage sert à calculer le chiffre d'affaires pondéré :", "- Avis de valeur : 10 %", "- Disponible : 20 %", "- Offre : 30 %", "- LOI acceptée : 50 %", "- Promesse : 75 %", "- Vendu : 100 %", "- Perdu : 0 %"] },
      { id: "creer", title: "Créer une affaire", body: ["Touchez « Nouveau dossier », puis renseignez le nom, l'étape, le prix, les honoraires, la surface et le loyer. Les honoraires peuvent être un montant fixe ou un pourcentage du prix."] },
      { id: "fiche", title: "La fiche d'une affaire", body: ["Ouvrez une ligne pour voir la fiche complète : actif lié, négociateurs, vendeur, acquéreur, nature de l'opération, dates d'encaissement prévue et réalisée, notes.", "Vous pouvez y associer des contacts par email et retrouver les mails Outlook liés à l'affaire (tapez au moins 3 lettres de l'objet ou de l'expéditeur), puis « Ouvrir dans Outlook ».", "Pensez à toucher « Enregistrer » avant de fermer."] },
      { id: "statut", title: "Encaissé, facturé, en cours", body: ["- Vendu avec date d'encaissement : Encaissé.", "- Vendu sans date d'encaissement : Facturé, reste à encaisser.", "- Perdu : Annulé.", "- Toutes les autres étapes : En cours.", "Une affaire non soldée est reportée automatiquement sur l'année suivante."] },
      { id: "objectif", title: "Objectif annuel et filtre agent", body: ["Saisissez votre objectif dans le champ « Objectif » : il est enregistré dès que vous quittez le champ et sert au compteur « Réalisé / objectif ».", "Si vous voyez plusieurs agents, le menu « Tous les agents » permet d'afficher le chiffre d'un seul agent."] },
      { id: "import", title: "Importer un fichier Excel", body: ["« Import Excel » accepte les fichiers .xlsx, .xls et .csv. Les affaires déjà présentes sont reconnues et ne sont pas créées en double."] },
    ],
  },
  {
    slug: "actifs",
    label: "Actifs",
    routes: ["/actifs"],
    intro: "Les biens que vous avez à placer : création guidée, photos, mandat et publication sur le site.",
    narration:
      "L'onglet Actifs contient les biens que vous avez à placer. Le bouton Nouvel actif lance une création guidée en quatre étapes : type de bien, informations de base, photos, puis mandat. Vous pouvez importer un document pour pré-remplir la fiche automatiquement. La barre de recherche retrouve un actif par ville, rue, nom ou référence. À la fin, le CRM vous propose de générer le teaser tout de suite.",
    marks: ["Nouvel actif", "Ville, rue, nom, référence ou code postal…"],
    sections: [
      { id: "principe", title: "À quoi sert cet onglet", body: ["Les Actifs sont les biens à vendre ou à louer dont vous avez la charge. Chaque actif peut avoir des photos, des documents, un mandat et un teaser."] },
      { id: "creer", title: "Créer un actif en 4 étapes", body: ["Touchez « Nouvel actif » :", "- Type de bien, classé par rubriques dans le menu (pour Bureaux, choisissez Immeuble(s), Plateau(x) ou Lot(s)) et Vente ou Location.", "- Cochez « Portefeuille » pour réunir plusieurs biens à des adresses différentes : chaque bien a sa ligne d'état locatif, et les surfaces et loyers totaux se calculent seuls.", "- Infos de base : adresse, prix, surface, loyer, description.", "- Photos : la photo principale est obligatoire.", "- Mandat : propriétaire, exclusif ou non, dates. Le numéro de mandat est attribué automatiquement."] },
      { id: "preremplir", title: "Pré-remplir depuis un document", body: ["« Importer un document pour pré-remplir » lit un PDF ou une plaquette (30 Mo maximum) et complète uniquement les champs encore vides. Vérifiez toujours le résultat."] },
      { id: "publication", title: "Publication sur le site", body: ["Cochez « Publier sur le site Wallsbroker » pour afficher l'actif dans le catalogue public. Vous pouvez masquer le numéro ou le nom de la rue ; masquer le nom masque aussi le numéro."] },
      { id: "statuts", title: "Statuts d'un actif", body: ["- disponible", "- sous offre", "- vendu", "- retiré"] },
      { id: "documents", title: "Documents de l'actif", body: ["Ajoutez les documents utiles (9 Mo maximum par fichier). Ils seront joints automatiquement lors des envois de brochure depuis Matching ou Prospects."] },
    ],
  },
  {
    slug: "teasers",
    label: "Teasers",
    routes: ["/presentation"],
    intro: "Le générateur de brochures : à partir d'un actif, créez un teaser PowerPoint complet.",
    narration:
      "Teasers est le générateur de brochures. Choisissez d'abord un actif : ses informations remplissent l'éditeur. Importer permet de reprendre un PDF, un PowerPoint ou un Word existant. Complétez ensuite les sections : le bien, les points clés, la localisation, la zone de chalandise, l'environnement commercial, l'état locatif et les photos. Générer PPTX produit le teaser prêt à envoyer. Effacer remet l'éditeur à zéro.",
    marks: ["Générateur", "Importer", "Effacer", "Générer PPTX"],
    sections: [
      { id: "principe", title: "À quoi sert cet onglet", body: ["Teasers crée la brochure commerciale d'un actif au format PowerPoint, avec la charte Wallsbrokerage."] },
      { id: "choisir", title: "Choisir un actif", body: ["Commencez par « Choisir un actif ». Les documents déjà créés pour cet actif apparaissent et peuvent être téléchargés."] },
      { id: "importer", title: "Importer un document existant", body: ["« Importer » accepte plusieurs fichiers PDF, PPTX ou DOCX pour pré-remplir les sections."] },
      { id: "sections", title: "Les sections de la brochure", body: ["- Le bien : adresse, surfaces, loyer, prix, honoraires, photo de couverture.", "- Points clés : 3 au minimum, 6 au maximum.", "- Localisation et cartes.", "- Zone de chalandise et revenus.", "- Environnement commercial : enseignes, flux, projets.", "- Accessibilité immédiate.", "- État locatif : une ligne par locataire.", "- Reportage photos (6 au maximum), plan de masse, plans et perspectives."] },
      { id: "portefeuille", title: "Plusieurs actifs dans une brochure", body: ["Pour un portefeuille, touchez « ➕ Ajouter un actif » ; chaque actif a ses propres sections."] },
      { id: "generer", title: "Générer et sauvegarder", body: ["« Générer PPTX » télécharge la brochure. « 💾 Sauvegarder sur le serveur » garde votre travail ; « ⤵ Restaurer la sauvegarde serveur » le reprend. « Effacer » vide l'éditeur sans toucher aux paramètres."] },
    ],
  },
  {
    slug: "mandats",
    label: "Mandats",
    routes: ["/mandats"],
    intro: "Le registre légal des mandats : numéros, dates, envoi en signature DocuSign et export Word ou PDF.",
    narration:
      "Mandats est le registre légal de vos mandats. Chaque ligne indique le numéro, l'adresse, l'agent, et les dates de début, de signature et de fin. Le bouton Statuts DocuSign met à jour les signatures, et Export Excel télécharge le registre. Dans une fiche, un seul bouton « Envoyer en signature » prépare le mandat depuis le modèle, vous le vérifiez en PDF, puis il part au Mandant et au Mandataire. Un nouveau mandat se crée à l'étape Mandat d'un nouvel actif.",
    marks: ["Statuts DocuSign", "Export Excel"],
    sections: [
      { id: "principe", title: "À quoi sert cet onglet", body: ["Le registre des mandats est obligatoire. Les numéros se suivent et ne sont jamais réutilisés, même si l'actif est supprimé."] },
      { id: "numero", title: "Obtenir un numéro de mandat", body: ["Il n'y a pas de bouton « Nouveau mandat » : le numéro est attribué automatiquement à l'étape « Mandat » quand vous créez un actif (onglet Actifs)."] },
      { id: "dates", title: "Dates du mandat", body: ["Vous choisissez librement la date de début ; la fin est toujours fixée à un an plus tard. La date de signature se met à jour avec DocuSign."] },
      { id: "agent", title: "Changer l'agent d'un mandat", body: ["Ouvrez le mandat dans le registre, puis choisissez l'agent dans le menu « Agent concerné ». Le changement est enregistré immédiatement."] },
      { id: "modele", title: "Préparer le mandat et l'envoyer en signature", body: ["Dans la fiche, « Envoyer en signature » ouvre la préparation : le modèle est choisi selon le type de mandat et l'exclusivité de l'actif, vous pouvez le changer ; la date de début est modifiable (fin = + 1 an) ; les champs vides vous sont proposés et les champs déjà renseignés restent modifiables par « Modifier un champ renseigné ».", "« Générer le PDF pour vérification » affiche le mandat exactement comme il sera envoyé. « Corriger » y ramène, « Envoi aux parties » lance la signature DocuSign.", "« Export Word » et « Export PDF » téléchargent le même mandat sans l'envoyer."] },
      { id: "signature", title: "Suivre les signatures", body: ["« Statuts DocuSign » actualise l'état des signatures. La date de signature s'inscrit quand les deux parties ont signé."] },
      { id: "export", title: "Exporter le registre", body: ["« Export Excel » télécharge le registre complet de vos mandats."] },
    ],
  },
  {
    slug: "matching",
    label: "Matching",
    routes: ["/matching"],
    intro: "Trouvez les acquéreurs qui correspondent à un actif et envoyez-leur la brochure.",
    narration:
      "Matching trouve les acquéreurs qui correspondent à un actif. Choisissez un dossier, ou indiquez le prix, la classe d'actif, la stratégie et la région. La liste des investisseurs correspondants s'affiche. Tout cocher sélectionne toute la liste, puis Envoyer la brochure prépare l'envoi par mail, avec suivi des ouvertures. Réinitialiser efface les critères.",
    marks: ["Choisir un dossier", "Prix (€)", "Réinitialiser", "Envoyer la brochure"],
    sections: [
      { id: "principe", title: "À quoi sert cet onglet", body: ["Matching rapproche un actif des critères de vos acquéreurs : prix, type d'actif, stratégie et région."] },
      { id: "criteres", title: "Définir les critères", body: ["« Choisir un dossier » remplit les critères depuis un actif. Vous pouvez aussi saisir « Prix (€) », « Classe d'actif », « Stratégie investisseur » et « Région ». « Réinitialiser » efface tout."] },
      { id: "strict", title: "Correspondances strictes ou partielles", body: ["Par défaut, seuls les acquéreurs qui correspondent à tous les critères s'affichent. « Voir aussi les correspondances partielles » élargit la liste."] },
      { id: "envoyer", title: "Envoyer la brochure", body: ["Cochez les acquéreurs (ou « Tout cocher »), puis « Envoyer la brochure ». Vérifiez l'objet et le message ; les documents de l'actif sont joints automatiquement. Vous pouvez lancer l'envoi tout de suite ou le programmer.", "« Copier les emails » copie les adresses ; « Tracer un envoi manuel » enregistre un envoi fait hors du CRM."] },
      { id: "brochure", title: "Ajouter une brochure", body: ["« Upload brochure (PDF, 9 Mo max.) » ajoute un document ; si un actif est choisi, il est rangé dans ses documents."] },
    ],
  },
  {
    slug: "envois",
    label: "Envois",
    routes: ["/envois"],
    intro: "L'historique de vos envois de brochures, avec les ouvertures et les relances.",
    narration:
      "Envois garde l'historique de toutes vos brochures envoyées. Les compteurs indiquent le nombre d'envois et d'ouvertures : cela prouve qui a reçu le bien, et quand. Filtrez par actif avec le menu Tous les actifs. Chaque ligne peut être renvoyée en un geste. Générer Marketing Report produit le compte rendu de commercialisation à remettre au propriétaire.",
    marks: ["Tous les actifs", "Générer Marketing Report", "Envois", "Ouverts"],
    sections: [
      { id: "principe", title: "À quoi sert cet onglet", body: ["Chaque envoi de brochure est enregistré : destinataire, actif, date et statut. Les accusés d'ouverture prouvent votre antériorité sur un acquéreur."] },
      { id: "statuts", title: "Lire les statuts", body: ["- Reçu : le mail est arrivé.", "- Ouvert : le destinataire l'a ouvert.", "- En cas de rebond (adresse invalide), aucun de ces indicateurs n'apparaît."] },
      { id: "renvoyer", title: "Renvoyer un envoi", body: ["Touchez la flèche de renvoi d'une ligne, ou ouvrez le détail puis « Renvoyer »."] },
      { id: "report", title: "Marketing Report", body: ["Choisissez un actif puis « Générer Marketing Report » pour obtenir le bilan de commercialisation à présenter au propriétaire."] },
    ],
  },
  {
    slug: "cibles",
    label: "À relancer",
    routes: ["/cibles"],
    intro: "Les opportunités repérées (étape Prospection) à transformer en affaires.",
    narration:
      "À relancer regroupe les opportunités repérées, à l'étape Prospection : elles viennent de vos mails, de pièces jointes, de liens analysés ou de votre saisie. Ouvrez une ligne pour la qualifier ; le bouton Rechercher les informations publiques complète la fiche. Dès que vous passez l'opportunité à une autre étape, elle rejoint le Suivi des affaires.",
    marks: ["Import Excel", "Nouveau dossier"],
    sections: [
      { id: "principe", title: "À quoi sert cet onglet", body: ["Les opportunités à l'étape « Prospection » sont rangées ici, sans les montants financiers du pipeline."] },
      { id: "origine", title: "D'où viennent les opportunités", body: ["Elles proviennent des mails et pièces jointes analysés, des liens partagés dans Extractions, d'un import Excel ou d'une saisie avec « Nouveau dossier ». Les mails ne créent que des lignes en Prospection : rien n'est modifié automatiquement dans vos affaires actives."] },
      { id: "qualifier", title: "Qualifier et relancer", body: ["Ouvrez la ligne, complétez la fiche et utilisez « Rechercher les informations publiques » pour trouver les éléments utiles sur la société."] },
      { id: "transformer", title: "Transformer en affaire", body: ["Changez l'étape (par exemple Avis de valeur) et enregistrez : l'opportunité quitte « À relancer » et apparaît dans le Suivi des affaires."] },
    ],
  },
  {
    slug: "contacts",
    label: "Contacts",
    routes: ["/investisseurs", "/prospects", "/brokers", "/notaires", "/contacts", "/a-qualifier"],
    intro: "Vos annuaires : acquéreurs, prospects, brokers, notaires, divers et contacts à qualifier.",
    narration:
      "Contacts regroupe tous vos annuaires, accessibles par les boutons en haut de la page : Acquéreurs, Prospects, Brokers, Notaires, Divers et À qualifier. Chez les Acquéreurs, Nouvel investisseur crée une fiche avec ses critères d'investissement, qui servent au Matching. Chaque agent ne voit que ses propres contacts. Un contact n'existe qu'une seule fois : un acquéreur prime sur un prospect.",
    marks: ["Acquéreurs", "Prospects", "Rechercher…", "Nouvel investisseur"],
    sections: [
      { id: "principe", title: "Les annuaires", body: ["- Acquéreurs : investisseurs et acheteurs, avec leurs critères.", "- Prospects : sociétés et leurs collaborateurs à démarcher.", "- Brokers, Notaires, Divers : annuaires simples.", "- À qualifier : contacts trouvés dans les mails, à trier.", "Chaque agent ne voit que les contacts qu'il a saisis."] },
      { id: "doublons", title: "Pas de doublons", body: ["Un même contact n'apparaît qu'une fois. Priorité : Acquéreurs, puis Prospects, puis À qualifier."] },
      { id: "acquereur", title: "Créer un acquéreur", body: ["Touchez « Nouvel investisseur » (ou « Nouvel acheteur (habitation) »), saisissez l'identité puis les critères : types d'actifs, montants, stratégies et régions. Ces critères alimentent Matching.", "Statuts possibles : actif, à qualifier, en veille, inactif, black listé."] },
      { id: "prospects", title: "Prospects et envoi groupé", body: ["« Ajouter une société » crée une société, puis ajoutez ses collaborateurs. Vous pouvez importer une base CSV ou Excel (Société, Nom, Titre, Email, Téléphone).", "Choisissez un « Actif / dossier à envoyer », cochez des collaborateurs, puis « Envoyer la brochure » ou « Copier les emails »."] },
      { id: "annuaires", title: "Brokers, Notaires, Divers", body: ["« Ajouter » crée une fiche (il faut au moins un nom, une société ou un email). Une fiche peut être déplacée vers une autre catégorie. Un email déjà présent est refusé."] },
      { id: "qualifier", title: "À qualifier", body: ["Cochez des contacts puis classez-les en un geste : Contacts, Brokers, Notaires ou Prospects. « Supprimer » est définitif : le contact ne sera plus jamais réimporté."] },
    ],
  },
  {
    slug: "extractions",
    label: "Extractions",
    routes: ["/partager"],
    intro: "Collez un lien (article, vidéo) : le CRM en extrait les contacts et les opportunités.",
    narration:
      "Extractions analyse un lien pour vous : article de presse, vidéo YouTube, Instagram ou TikTok. Collez l'adresse, ajoutez une remarque si besoin, puis touchez Analyser le lien. Le CRM en tire les contacts, l'actualité et une opportunité à relancer. Sur téléphone, vous pouvez aussi partager un lien directement vers Wallsbroker.",
    marks: ["https://…", "Remarque (facultatif)", "Analyser le lien"],
    sections: [
      { id: "principe", title: "À quoi sert cet onglet", body: ["Extractions transforme un article ou une vidéo en informations utiles : contacts, actualité de la société et opportunité, rangée dans « À relancer »."] },
      { id: "analyser", title: "Analyser un lien", body: ["Collez l'adresse dans le champ « https://… », ajoutez une « Remarque (facultatif) », puis « Analyser le lien ». Pendant le traitement, « Analyse en cours… » s'affiche."] },
      { id: "historique", title: "Historique et relance", body: ["Les analyses précédentes restent listées avec leur résultat. « Relancer l'analyse » recommence une analyse ; vous pouvez modifier le titre et la remarque puis « Enregistrer »."] },
      { id: "telephone", title: "Depuis votre téléphone", body: ["Depuis une application (navigateur, YouTube…), utilisez Partager puis Wallsbroker : le lien arrive directement ici."] },
    ],
  },
  {
    slug: "comparables",
    label: "Comparables",
    routes: ["/comparables"],
    intro: "Les références de loyers et de prix de toute l'entreprise, pour estimer un bien.",
    narration:
      "Comparables rassemble les références de loyers et de prix de toute l'entreprise, accessibles à tous les agents. Choisissez Comparables locatifs ou Comparables de prix, puis cherchez par département, code postal ou ville. Les champs minimum et maximum filtrent par surface ou par prix. Le bouton Ajouter enregistre une nouvelle référence.",
    marks: ["Comparables locatifs", "Comparables de prix", "Département (2 chiffres), code postal ou ville…", "Ajouter"],
    sections: [
      { id: "principe", title: "À quoi sert cet onglet", body: ["Les comparables servent à estimer un loyer ou un prix. Ils sont partagés par toute l'équipe."] },
      { id: "chercher", title: "Chercher une référence", body: ["Choisissez « Comparables locatifs » ou « Comparables de prix », puis tapez un département (2 chiffres), un code postal ou une ville. Les bornes min et max filtrent la surface (locatif) ou le prix (vente)."] },
      { id: "fiche", title: "La fiche d'un comparable", body: ["Elle donne la date, le type, l'enseigne, l'adresse, les surfaces réelle et pondérée, le loyer, les prix au m², le rendement et la source. Les loyers au m² se calculent automatiquement s'ils manquent. Les modifications s'enregistrent dès que vous quittez un champ."] },
      { id: "ajouter", title: "Ajouter ou importer", body: ["« Ajouter » crée une référence. « Importer (Générateur) » reprend les comparables du générateur de brochures, sans doublons."] },
    ],
  },
  {
    slug: "mon-contrat",
    label: "Mon contrat",
    routes: ["/mon-contrat"],
    intro: "Votre contrat d'agent commercial : informations, signature en ligne et téléchargement.",
    narration:
      "Mon contrat contient votre contrat d'agent commercial avec Wallsbrokerage. Complétez vos informations : société, adresse, SIREN, RSAC et assurance de responsabilité civile professionnelle, puis touchez Générer et signer mon contrat. Vous signez en ligne par DocuSign. Une fois signé par les deux parties, vous pouvez le consulter et le télécharger à tout moment, sans pouvoir le modifier.",
    marks: ["Mon contrat"],
    sections: [
      { id: "principe", title: "À quoi sert cet onglet", body: ["Chaque agent y retrouve son contrat de collaboration, consultable et téléchargeable à tout moment, mais non modifiable."] },
      { id: "infos", title: "Compléter vos informations", body: ["Renseignez nom ou société, adresse ou siège, SIREN, RSAC, assureur, numéro et échéance de la RC professionnelle, date d'effet, puis « Enregistrer »."] },
      { id: "signer", title: "Signer en ligne", body: ["« Générer et signer mon contrat » prépare le contrat et l'envoie pour signature électronique DocuSign. Le statut indique s'il attend une signature ou s'il est signé par les deux parties."] },
      { id: "telecharger", title: "Télécharger", body: ["« Voir et télécharger (PDF) » apparaît dès que le document est disponible."] },
    ],
  },
  {
    slug: "formation",
    label: "Formation immo",
    routes: ["/formation"],
    intro: "Des modules de formation immobilière avec petits quiz et questionnaire final validé à 80 %.",
    narration:
      "Formation immo propose des modules sur l'immobilier : le métier d'agent, la loi Hoguet, le mandat, la vente d'habitation, l'immobilier commercial et bien d'autres. Avancez page par page avec le bouton Suivant : le pourcentage d'avancement s'affiche en haut. De petites questions vous aident à mémoriser, et le questionnaire final valide le module à partir de quatre-vingts pour cent de bonnes réponses.",
    marks: ["Formation immo"],
    sections: [
      { id: "principe", title: "À quoi sert cet onglet", body: ["Des cours courts et agréables pour se former ou réviser les bases juridiques et commerciales de l'immobilier."] },
      { id: "avancer", title: "Avancer dans un module", body: ["Touchez un module, puis « Suivant » et « Précédent ». La barre en haut indique le pourcentage d'avancement. Vous reprenez là où vous vous étiez arrêté."] },
      { id: "quiz", title: "Petits points mémoire", body: ["Toutes les 3 ou 4 pages, 2 ou 3 questions s'affichent. La correction est immédiate, avec une explication."] },
      { id: "valider", title: "Questionnaire final", body: ["Chaque module se termine par 10 à 20 questions. Il est validé à partir de 80 % de bonnes réponses. Sinon, « Recommencer » vous ramène au début du module. Votre meilleur score est conservé."] },
    ],
  },
  {
    slug: "manuel",
    label: "Manuel du CRM",
    routes: ["/manuel"],
    intro: "Ce manuel : présentation commentée, modules par onglet, FAQ et questions libres.",
    narration:
      "Vous êtes dans le Manuel du CRM. La présentation générale passe en revue chaque onglet, avec la voix et les boutons encadrés. Les modules par onglet détaillent chaque fonction. La FAQ répond aux questions fréquentes, et vous pouvez poser une question libre. Sur toutes les pages du CRM, le bouton Besoin d'aide explique la page et répond à vos questions.",
    marks: ["FAQ"],
    sections: [
      { id: "principe", title: "Comment utiliser le Manuel", body: ["La présentation générale se lit avec « Suivant » ; chaque étape a sa voix et une capture où les boutons sont encadrés et numérotés.", "Les modules par onglet détaillent chaque fonction, paragraphe par paragraphe."] },
      { id: "aide", title: "Le bouton Besoin d'aide", body: ["Présent sur toutes les pages (bouée en haut de l'écran), il résume ce que l'on peut faire sur la page et répond à vos questions à partir du Manuel."] },
      { id: "questions", title: "Poser une question libre", body: ["Tapez votre question dans la FAQ ou dans la fenêtre d'aide. La réponse renvoie au bon paragraphe. Si le Manuel ne contient pas encore la réponse, un nouveau paragraphe est rédigé et ajouté automatiquement (repéré par une petite étoile).", "Ces réponses utilisent l'IA dans la limite de 5 € par mois ; au-delà, une recherche simple dans le Manuel prend le relais."] },
    ],
  },
  {
    slug: "assistante",
    label: "Assistante IA",
    routes: [],
    intro: "La barre Assistante IA en haut de chaque page : questions, rédaction de mails, mails à valider.",
    narration:
      "L'Assistante IA est la barre située en haut de chaque page. Touchez-la pour l'ouvrir. Elle répond à vos questions d'immobilier commercial, rédige des mails et connaît la page affichée. Le badge en attente signale les mails préparés automatiquement qui attendent votre validation.",
    marks: ["Assistante IA"],
    sections: [
      { id: "principe", title: "À quoi sert l'assistante", body: ["Elle aide au quotidien : questions sur les baux, la fiscalité ou le marché, rédaction de mails, lecture des données du CRM."] },
      { id: "utiliser", title: "L'utiliser", body: ["Touchez « Assistante IA », tapez votre instruction puis Envoyer (Entrée). Maj + Entrée ajoute une ligne. Elle garde l'historique de vos derniers échanges."] },
      { id: "valider", title: "Mails à valider", body: ["« Mails à valider » liste les brouillons préparés automatiquement ; rien n'est envoyé sans votre accord. « Activer les notifications » vous prévient quand un nouveau brouillon arrive."] },
      { id: "plafond", title: "Coût et plafond", body: ["Le coût du jour est affiché. Au plafond mensuel, l'assistante se met en pause jusqu'au mois suivant."] },
    ],
  },
  {
    slug: "agents-co",
    label: "Agents Co",
    routes: ["/agents-co"],
    admin: true,
    intro: "Réservé à l'administrateur : créer un agent, préparer son contrat et l'envoyer en signature.",
    narration:
      "Agents Co est réservé à l'administrateur. Le bouton Créer lance un parcours en six étapes : identité, statut et société, assurance, rémunération, prise d'effet, puis contrat. Préparer le contrat ne l'envoie pas : l'envoi DocuSign se fait ensuite, avec confirmation. Inviter au compte vierge envoie à l'agent l'accès au CRM.",
    marks: ["Créer"],
    sections: [
      { id: "creer", title: "Créer un agent", body: ["« Créer » ouvre le parcours : identité, statut et société, assurance RC professionnelle, rémunération (quote-part), prise d'effet, contrat. Touchez « Suivant » à chaque étape."] },
      { id: "contrat", title: "Préparer et envoyer le contrat", body: ["« Préparer le contrat » génère le document sans rien envoyer. « Envoyer pour signature DocuSign » l'envoie, signé d'abord par l'administrateur puis par l'agent. « Actualiser les signatures » met à jour les statuts."] },
      { id: "inviter", title: "Inviter l'agent", body: ["« Inviter au compte vierge » crée l'accès de l'agent ; le bouton devient « Compte créé » ensuite."] },
    ],
  },
  {
    slug: "parametres",
    label: "Paramètres",
    routes: ["/parametres"],
    admin: true,
    intro: "Réservé à l'administrateur : utilisateurs, boîte mail, listes de référence et modèles de mandats.",
    narration:
      "Paramètres est réservé à l'administrateur. Quatre onglets : Utilisateurs, pour DocuSign et les comptes ; Boîte mail, pour l'analyse automatique des mails ; Listes de référence, pour les types d'actifs, profils et tranches de montant ; et Modèles de mandats, pour gérer les dix modèles.",
    marks: ["Utilisateurs", "Boîte mail", "Listes de référence", "Modèles de mandats"],
    sections: [
      { id: "utilisateurs", title: "Utilisateurs", body: ["Connexion DocuSign, création de comptes en lecture seule (mot de passe provisoire de 8 caractères minimum) et liste des comptes back-office."] },
      { id: "mail", title: "Boîte mail", body: ["Réglages de l'analyse des mails : extraction des contacts et opportunités."] },
      { id: "listes", title: "Listes de référence", body: ["Types d'actifs, profils investisseurs, pays et tranches de montant : ajout, renommage et suppression."] },
      { id: "modeles", title: "Modèles de mandats", body: ["Les modèles de mandats peuvent être exportés, modifiés, remplacés ou supprimés."] },
    ],
  },
];

export const FAQ: FaqItem[] = [
  { q: "Comment créer une nouvelle affaire ?", tab: "dossiers", section: "creer" },
  { q: "Comment est calculé le chiffre d'affaires pondéré ?", tab: "dossiers", section: "etapes" },
  { q: "Pourquoi une affaire apparaît-elle sur l'année suivante ?", tab: "dossiers", section: "statut" },
  { q: "Comment obtenir un numéro de mandat ?", tab: "mandats", section: "numero" },
  { q: "Comment envoyer un mandat en signature ?", tab: "mandats", section: "signature" },
  { q: "Comment créer un actif ?", tab: "actifs", section: "creer" },
  { q: "Comment publier un actif sur le site ?", tab: "actifs", section: "publication" },
  { q: "Comment générer un teaser ?", tab: "teasers", section: "generer" },
  { q: "Comment trouver les acquéreurs pour un actif ?", tab: "matching", section: "criteres" },
  { q: "Comment envoyer une brochure à plusieurs contacts ?", tab: "matching", section: "envoyer" },
  { q: "Comment savoir si un acquéreur a ouvert mon mail ?", tab: "envois", section: "statuts" },
  { q: "Comment transformer une opportunité en affaire ?", tab: "cibles", section: "transformer" },
  { q: "Qui peut voir mes contacts ?", tab: "contacts", section: "principe" },
  { q: "Que se passe-t-il si je supprime un contact à qualifier ?", tab: "contacts", section: "qualifier" },
  { q: "Comment analyser un article ou une vidéo ?", tab: "extractions", section: "analyser" },
  { q: "Comment trouver des loyers de référence ?", tab: "comparables", section: "chercher" },
  { q: "Où télécharger mon contrat ?", tab: "mon-contrat", section: "telecharger" },
  { q: "Comment valider un module de formation ?", tab: "formation", section: "valider" },
];
