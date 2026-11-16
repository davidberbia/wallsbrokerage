import type { FormationModule } from "../types";

export const module: FormationModule = {
  slug: "vente-habitation-droit", title: "Règles juridiques de base de la vente d'habitation", minutes: 60,
  summary: "Comprendre les engagements, les protections de l'acquéreur et les pièces qui sécurisent une vente d'habitation.",
  steps: [
    { kind: "page", title: "Préparer avant de promettre", body: [
      "Vérifiez l'identité, la capacité et les pouvoirs des vendeurs, puis le titre de propriété et la désignation du bien. Une succession, une indivision ou une protection juridique peut nécessiter des vérifications spécifiques.",
      "Identifiez occupation, servitudes, travaux et droits annexes. Transmettez rapidement les difficultés au notaire : une annonce ou une visite ne suffit pas à sécuriser juridiquement l'opération."
    ] },
    { kind: "page", title: "Promesse ou compromis", body: [
      "Dans une promesse unilatérale, le promettant accorde au bénéficiaire une option pendant un délai défini. Le compromis engage réciproquement vendeur et acquéreur, sous réserve des conditions et protections prévues.",
      "Le titre du document ne suffit pas : il faut lire ses clauses. Une promesse unilatérale immobilière sous signature privée doit être enregistrée dans les dix jours de son acceptation par le bénéficiaire, sous peine de nullité ; le notaire sécurise ce formalisme."
    ] },
    { kind: "page", title: "La protection SRU : dix jours", body: [
      "L'acquéreur non professionnel d'un immeuble à usage d'habitation bénéficie en principe de dix jours pour se rétracter de l'avant-contrat. Le délai court le lendemain de la première présentation de la lettre de notification ou de la remise régulière prévue par les textes.",
      "Il n'a pas à justifier sa décision ni à payer de pénalité. Si le dernier jour est un samedi, un dimanche ou un jour férié ou chômé, l'échéance est reportée au premier jour ouvrable suivant ; conservez les preuves de notification à chaque bénéficiaire."
    ] },
    { kind: "page", title: "Ne pas confondre réflexion et rétractation", body: [
      "Si l'acte authentique de vente n'est précédé d'aucun avant-contrat, le projet est notifié à l'acquéreur protégé, qui dispose d'un délai de réflexion de dix jours. L'acte ne peut pas être signé pendant ce délai.",
      "Ces protections ne sont pas le délai de quatorze jours applicable à certains mandats conclus à distance ou hors établissement. Elles ne donnent pas non plus au vendeur un droit symétrique de changer librement d'avis."
    ] },
    { kind: "quiz", questions: [
      { q: "Qui bénéficie de la rétractation SRU étudiée ici ?", options: ["Tout vendeur", "L'acquéreur non professionnel d'une habitation", "Uniquement l'agence"], answer: 1, explain: "La protection vise l'acquéreur non professionnel dans le champ légal de l'habitation." },
      { q: "Que caractérise une promesse unilatérale ?", options: ["Une option accordée au bénéficiaire", "Une absence totale d'engagement", "Un transfert immédiat des clés"], answer: 0, explain: "Le bénéficiaire peut lever l'option dans les conditions et le délai convenus." }
    ] },
    { kind: "page", title: "La condition suspensive de prêt", body: [
      "Lorsque l'acquisition entre dans le régime du crédit immobilier et que l'acte prévoit un financement par prêt, la vente est conclue sous condition suspensive de son obtention. Sa durée ne peut être inférieure à un mois ; un délai de quarante-cinq à soixante jours est souvent négocié.",
      "Précisez montant, durée et taux maximal puis les démarches et justificatifs attendus. L'acquéreur doit agir loyalement : une demande volontairement non conforme n'est pas une méthode pour sortir sans risque de la vente."
    ] },
    { kind: "page", title: "Dépôt de garantie et séquestre", body: [
      "Un dépôt de cinq à dix pour cent est fréquent mais ce n'est pas un montant légal obligatoire pour toute vente ordinaire. Distinguez dépôt du compromis, indemnité d'immobilisation d'une promesse et clause pénale : leur fonction dépend de l'acte.",
      "Pendant le délai SRU, les versements sont en principe interdits, avec notamment une exception encadrée pour le professionnel mandaté disposant d'une garantie de remboursement. En cas de rétractation régulière, le dépositaire professionnel restitue les fonds sous vingt et un jours à compter du lendemain de celle-ci."
    ] },
    { kind: "page", title: "La superficie Carrez", body: [
      "La vente d'un lot ou d'une fraction de lot de copropriété entrant dans le champ légal doit mentionner sa superficie privative Carrez. Les caves, garages, stationnements et certains lots de moins de huit mètres carrés sont exclus de cette obligation.",
      "La mesure exclut notamment les surfaces d'une hauteur inférieure à 1,80 mètre. Si la surface réelle est inférieure de plus d'un vingtième à celle annoncée, l'acquéreur peut demander une diminution proportionnelle du prix dans l'année de l'acte authentique ; l'absence de mention obéit à un recours distinct."
    ] },
    { kind: "page", title: "Les diagnostics essentiels", body: [
      "Le dossier de diagnostic technique dépend du bien, de son âge et de sa localisation : DPE, plomb avant 1949, amiante selon le permis de construire, gaz et électricité de plus de quinze ans, termites et état des risques lorsque requis, notamment. Vérifiez validité et périmètre de chaque document.",
      "Pour les maisons et immeubles d'habitation en monopropriété classés E, F ou G, un audit énergétique est requis à la vente en métropole en 2026. D'autres pièces peuvent être nécessaires, comme le contrôle d'assainissement non collectif ; ne présentez pas cette liste comme universelle ni exhaustive.",
      "Depuis le 1er janvier 2026, le coefficient de conversion de l'électricité utilisé par le DPE est fixé à 1,9. Un DPE antérieur encore valable peut bénéficier d'une attestation actualisée officielle ; ne recalculez jamais vous-même sa classe."
    ] },
    { kind: "quiz", questions: [
      { q: "Quel est le minimum légal de durée de la condition suspensive de prêt concernée ?", options: ["Dix jours", "Un mois", "Six mois"], answer: 1, explain: "Le régime protecteur prévoit au moins un mois à compter de la signature de l'acte." },
      { q: "Un dépôt de dix pour cent est-il toujours imposé par la loi ?", options: ["Oui", "Seulement en copropriété", "Non"], answer: 2, explain: "Pour une vente ordinaire, le montant dépend de l'accord et du cadre contractuel." },
      { q: "Quel écart Carrez ouvre le recours en diminution étudié ?", options: ["Une surface réelle inférieure de plus de 5 %", "Un mètre carré dans tous les cas", "Tout écart même positif"], answer: 0, explain: "L'insuffisance doit dépasser un vingtième de la superficie indiquée." }
    ] },
    { kind: "page", title: "Copropriété : informer avant l'engagement", body: [
      "L'article L721-2 du Code de la construction et de l'habitation prévoit la remise de documents et informations à l'acquéreur d'un lot d'habitation : notamment règlement et état descriptif, procès-verbaux des trois dernières assemblées disponibles, données financières et documents techniques selon le cas.",
      "Le « pré-état daté » désigne en pratique un ensemble d'informations, pas un formulaire légal que seul le syndic pourrait établir. Vérifiez les pièces réellement exigibles et leur actualité ; leur absence, pour celles visées par L721-3, reporte le départ du délai SRU jusqu'à leur communication régulière.",
      "L'état daté préparé par le syndic pour la vente authentique est un document distinct. Faites vérifier les exceptions liées au lot ou à la situation de l'acquéreur et les obligations techniques progressivement applicables à la copropriété."
    ] },
    { kind: "page", title: "Préemption urbaine et calendrier", body: [
      "Dans un périmètre soumis au droit de préemption urbain, une déclaration d'intention d'aliéner est adressée à la collectivité compétente avant la vente concernée. Le notaire organise généralement cette formalité et vérifie les éventuelles exemptions.",
      "Le délai de réponse est en principe de deux mois à compter de la réception de la déclaration. Une demande légale de pièces ou de visite peut suspendre ce délai : n'annoncez pas une date de signature définitive sans vérification de sa purge."
    ] },
    { kind: "page", title: "Vices cachés et information loyale", body: [
      "Un vice caché est un défaut non apparent, antérieur à la vente, suffisamment grave pour rendre le bien impropre à son usage ou en diminuer fortement l'usage. L'action doit être engagée dans les deux ans de sa découverte, sous réserve notamment du délai butoir applicable.",
      "Une clause d'exclusion peut protéger un vendeur non professionnel de bonne foi, mais ne couvre pas un défaut qu'il connaissait et a dissimulé. L'agent transmet les informations connues et recommande une expertise lorsqu'un indice sérieux l'exige."
    ] },
    { kind: "page", title: "Acte authentique, délais et frais", body: [
      "Deux à trois mois entre avant-contrat et acte est un ordre de grandeur, pas une garantie légale. Financement, préemption, pièces et situation des parties commandent le calendrier ; une échéance dépassée ne rend pas toujours automatiquement l'accord caduc.",
      "Les frais dits « de notaire » comprennent surtout taxes et droits, puis débours et rémunération réglementée. Le total dépend notamment du prix, du département et du régime fiscal ; dans l'ancien, les hausses départementales possibles depuis 2025 rendent un calcul actualisé indispensable.",
      "Avant la signature, contrôlez fonds disponibles, assurance, état d'occupation et relevés utiles. La remise des clés suit l'accord sécurisé par le notaire, généralement lors de l'acte et du paiement, pas une simple promesse de virement."
    ] },
    { kind: "quiz", questions: [
      { q: "Le pré-état daté est-il un formulaire légal exclusivement établi par le syndic ?", options: ["Oui", "Non", "Oui, pour toutes les maisons"], answer: 1, explain: "Il s'agit d'une appellation pratique des informations à réunir, distincte de l'état daté." },
      { q: "Quel est le délai de réponse de principe en préemption urbaine ?", options: ["Dix jours", "Un an", "Deux mois"], answer: 2, explain: "Ce délai peut notamment être suspendu par certaines demandes prévues par les textes." }
    ] }
  ],
  final: [
    { q: "Dans un compromis, qui s'engage en principe à vendre et acheter ?", options: ["Les deux parties", "Le vendeur seul", "Le notaire"], answer: 0, explain: "L'engagement est réciproque, sous réserve des clauses et protections applicables." },
    { q: "Quel délai d'enregistrement vise la promesse unilatérale sous signature privée ?", options: ["Trois mois", "Dix jours à compter de l'acceptation par le bénéficiaire", "Un an"], answer: 1, explain: "Le défaut d'enregistrement dans ce délai entraîne la nullité prévue par le texte." },
    { q: "Quand débute en principe le délai SRU après notification postale régulière ?", options: ["À la rédaction", "À l'acte authentique", "Le lendemain de la première présentation"], answer: 2, explain: "La date de première présentation est le point de référence, non le retrait effectif choisi par le destinataire." },
    { q: "Un délai SRU finit un dimanche. Que devient son terme ?", options: ["Il est reporté au premier jour ouvrable suivant", "Il expire le samedi", "Il disparaît"], answer: 0, explain: "La règle de prorogation s'applique au dernier jour non ouvrable concerné." },
    { q: "Quel comportement sécurise la condition de prêt ?", options: ["Ne déposer aucun dossier", "Déposer des demandes conformes et conserver les preuves", "Demander exprès un autre financement"], answer: 1, explain: "L'acquéreur doit accomplir loyalement les démarches prévues." },
    { q: "Après rétractation régulière, quel délai vise la restitution par le dépositaire professionnel ?", options: ["Six mois", "Quatre-vingt-dix jours", "Vingt et un jours à compter du lendemain de la rétractation"], answer: 2, explain: "Ce délai concerne la restitution des fonds dans le cadre légal de la rétractation." },
    { q: "Quel délai vise l'action en diminution du prix pour insuffisance Carrez ?", options: ["Un an après l'acte authentique", "Dix ans après la visite", "Quarante-huit heures"], answer: 0, explain: "Le recours pour une insuffisance de plus de 5 % doit être engagé dans l'année de l'acte authentique." },
    { q: "En métropole en 2026, quelle maison entre notamment dans l'audit énergétique obligatoire à la vente ?", options: ["Une maison classée B", "Une maison classée E", "Toute maison sans distinction"], answer: 1, explain: "Les maisons classées E, F ou G entrent dans le calendrier applicable en 2026." },
    { q: "Quel effet peut avoir l'absence de pièces visées par L721-3 ?", options: ["Aucun dans tous les cas", "Un transfert immédiat de propriété", "Le report du point de départ du délai SRU"], answer: 2, explain: "Le point de départ dépend alors de la communication régulière des pièces concernées." },
    { q: "Qui organise généralement la déclaration d'intention d'aliéner ?", options: ["Le notaire chargé de la vente", "La banque seule", "Le voisin"], answer: 0, explain: "Le notaire vérifie le droit applicable et la purge avant la vente." },
    { q: "Une clause d'exclusion protège-t-elle le vendeur qui dissimule sciemment un vice ?", options: ["Toujours", "Non", "Après dix jours"], answer: 1, explain: "Le vendeur de mauvaise foi ne peut se prévaloir de cette protection." },
    { q: "Les frais dits de notaire correspondent-ils uniquement à ses honoraires ?", options: ["Oui", "Oui, dans l'ancien", "Non, ils comprennent surtout taxes et droits"], answer: 2, explain: "Les émoluments ne constituent qu'une composante du coût total d'acquisition." }
  ]
};
