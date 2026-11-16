import type { FormationModule } from "../types";

export const module: FormationModule = {
  slug: "bon-agent",
  title: "Devenir un bon agent immobilier",
  summary: "Construire une pratique commerciale efficace, mesurable et loyale, de la prospection au suivi après-vente.",
  minutes: 50,
  steps: [
    { kind: "page", title: "Une promesse de service crédible", body: [
      "Un bon agent ne promet ni un prix certain ni une vente immédiate. Il propose une méthode : vérifier les informations, positionner le bien, qualifier les contacts et rendre compte des actions.",
      "Dès le premier entretien, distinguez les attentes du client des engagements que vous pouvez tenir. Fixez un prochain rendez-vous et confirmez par écrit les décisions importantes."
    ] },
    { kind: "page", title: "Prospecter avec méthode", body: [
      "Choisissez un secteur maîtrisable et combinez présence locale, recommandations, événements et contacts autorisés. Préparez une entrée en relation utile : information de quartier ou analyse documentée plutôt qu'une promesse de surévaluation.",
      "Respectez les règles du canal utilisé et tracez la source des coordonnées. Pour le démarchage téléphonique des consommateurs, le consentement préalable devient le principe le 11 août 2026, sous réserve notamment de l'exception liée à un contrat en cours ; avant cette date, appliquez notamment Bloctel et les restrictions horaires."
    ] },
    { kind: "page", title: "Découvrir le projet réel", body: [
      "Interrogez le vendeur sur son calendrier, les personnes décisionnaires, les contraintes d'occupation et les pièces disponibles. Demandez pourquoi il vend sans transformer l'entretien en enquête intrusive.",
      "Avec l'acquéreur, distinguez critères indispensables et préférences : budget global, financement, mobilité, travaux et échéance. Reformulez les priorités et ne recueillez que les données utiles au projet."
    ] },
    { kind: "page", title: "Estimer sans flatter", body: [
      "Comparez des ventes pertinentes et récentes en ajustant emplacement, surface, état, étage, extérieur et performance énergétique. Les annonces concurrentes décrivent des prix demandés, pas nécessairement des prix réellement obtenus.",
      "Présentez une fourchette argumentée et les limites des données, notamment celles de DVF. Un besoin de trésorerie du vendeur ne crée pas une valeur de marché ; programmez une réévaluation à partir de retours observables."
    ] },
    { kind: "quiz", questions: [
      { q: "Quelle base privilégier pour estimer ?", options: ["Le montant du futur achat du vendeur", "Des ventes comparables ajustées", "Le prix le plus haut du quartier"], answer: 1, explain: "Les ventes comparables doivent être rapprochées des caractéristiques réelles du bien." },
      { q: "Que faire après la découverte client ?", options: ["Promettre une vente en une semaine", "Collecter toutes ses données personnelles", "Reformuler priorités et contraintes"], answer: 2, explain: "La reformulation vérifie la compréhension avant de proposer une stratégie." }
    ] },
    { kind: "page", title: "Obtenir une exclusivité par la preuve", body: [
      "L'exclusivité se défend par un service précis : préparation du dossier, qualité des visuels, diffusion cohérente, qualification et compte rendu. Expliquez aussi les contraintes imposées au vendeur et les modalités de sortie.",
      "Recueillez un mandat écrit avant la négociation. Faites apparaître les engagements de commercialisation et de suivi, sans présenter l'exclusivité comme une obligation légale ou une garantie de résultat."
    ] },
    { kind: "page", title: "Organiser une commercialisation loyale", body: [
      "Contrôlez les informations et les mentions obligatoires avant publication : prix, honoraires, données énergétiques et, lorsque requis, informations de copropriété ou de risques. N'inventez pas une surface ni une possibilité de construire.",
      "Les photographies doivent représenter honnêtement le bien. Signalez les projections d'aménagement et les retouches susceptibles de modifier la perception ; protégez les documents personnels visibles chez l'occupant."
    ] },
    { kind: "page", title: "Faire visiter et qualifier", body: [
      "Préparez le parcours avec l'occupant et anticipez les questions sur les charges, travaux et contraintes connues. Présentez les atouts sans dissimuler un défaut ou improviser une réponse technique non vérifiée.",
      "Après la visite, demandez un retour structuré et vérifiez la cohérence du financement sans prétendre décider à la place de la banque. Un bon de visite trace une présentation ; il ne remplace pas le mandat."
    ] },
    { kind: "page", title: "Négocier sans manipuler", body: [
      "Distinguez prix, calendrier, financement et conditions. Présentez fidèlement les offres au vendeur et faites préciser les engagements par écrit, en sollicitant le notaire lorsque leur portée juridique est incertaine.",
      "Ne fabriquez pas d'offre concurrente et ne divulguez pas inutilement les informations confidentielles d'un candidat. Votre rôle est d'éclairer la décision, pas d'obtenir un accord à n'importe quel prix."
    ] },
    { kind: "quiz", questions: [
      { q: "Quel argument justifie une exclusivité ?", options: ["Une obligation imposée à tous les vendeurs", "Un prix garanti", "Un plan d'actions et de suivi précis"], answer: 2, explain: "L'exclusivité repose sur une valeur de service démontrable et des clauses expliquées." },
      { q: "Une question technique dépasse vos connaissances. Que faire ?", options: ["Vérifier auprès d'un professionnel compétent", "Inventer une réponse rassurante", "Éviter toute trace écrite"], answer: 0, explain: "La transparence et la vérification protègent les parties et la qualité du conseil." }
    ] },
    { kind: "page", title: "Relancer avec une raison utile", body: [
      "Convenez de la date et du canal des relances. Chaque contact doit apporter une information : retour de visite, document manquant, évolution du projet ou proposition argumentée d'ajustement.",
      "Consignez la prochaine action dans le suivi client. Respectez l'opposition à la prospection et distinguez un suivi nécessaire à une mission en cours d'une sollicitation commerciale nouvelle."
    ] },
    { kind: "page", title: "Piloter son temps et son activité", body: [
      "Réservez des créneaux pour la prospection, les rendez-vous, l'étude des dossiers et les comptes rendus. Une liste courte d'actions datées vaut mieux qu'une accumulation de contacts sans responsable ni échéance.",
      "Suivez les transformations : contacts utiles, rendez-vous, mandats, visites, offres et ventes. Analysez les délais et les abandons ; un grand nombre de visites sans offre peut signaler un mauvais ciblage ou un prix inadapté."
    ] },
    { kind: "page", title: "Entretenir un réseau indépendant", body: [
      "Identifiez notaires, diagnostiqueurs, courtiers et artisans compétents. Proposez des interlocuteurs sans garantir leur travail ni imposer un prestataire ; expliquez tout lien d'intérêt pertinent.",
      "Le partage de données nécessite une base légale et une information adaptées. Une recommandation commerciale ne dispense jamais de vérifier les compétences, assurances et limites de mission du partenaire."
    ] },
    { kind: "page", title: "Éthique et outils numériques", body: [
      "Appliquez des critères objectifs et non discriminatoires. Respectez la confidentialité, sécurisez les accès au logiciel client et limitez les habilitations aux besoins de chaque collaborateur.",
      "Une intelligence artificielle peut aider à rédiger ou organiser, mais ne valide ni un titre de propriété ni une règle de droit. Relisez les contenus, vérifiez les faits et n'envoyez pas de documents confidentiels vers un service non autorisé."
    ] },
    { kind: "quiz", questions: [
      { q: "Quel indicateur aide à comprendre une commercialisation bloquée ?", options: ["Le seul nombre d'abonnés", "Le rapport entre visites et offres", "La couleur du logo"], answer: 1, explain: "Ce rapport invite à examiner prix, ciblage et présentation du bien." },
      { q: "Comment utiliser un texte produit par une IA ?", options: ["Le publier sans contrôle", "L'utiliser comme preuve juridique", "Vérifier faits et conformité avant diffusion"], answer: 2, explain: "L'outil ne remplace pas la responsabilité du professionnel." }
    ] }
  ],
  final: [
    { q: "Quel engagement est maîtrisable ?", options: ["Vendre au prix souhaité", "Rendre compte chaque semaine", "Garantir le crédit"], answer: 1, explain: "Le compte rendu relève de l'organisation de l'agent, contrairement au résultat de vente." },
    { q: "À compter du 11 août 2026, quel est le principe du démarchage téléphonique des consommateurs ?", options: ["Consentement préalable, sauf exception légale", "Liberté totale", "Autorisation par simple possession du numéro"], answer: 0, explain: "La réforme instaure le consentement préalable, avec notamment une exception encadrée pour un contrat en cours." },
    { q: "Quel élément relève de la découverte acquéreur ?", options: ["Son origine supposée", "Ses opinions politiques", "Son budget global et ses contraintes"], answer: 2, explain: "La découverte doit rester utile au projet et non discriminatoire." },
    { q: "Que représente généralement un prix d'annonce ?", options: ["Un prix effectivement signé", "Une prétention de commercialisation", "Une expertise judiciaire"], answer: 1, explain: "Le prix demandé peut différer du prix finalement négocié." },
    { q: "Quand obtenir le mandat ?", options: ["Avant toute négociation pour autrui", "Après le compromis", "Au paiement des honoraires"], answer: 0, explain: "Le mandat écrit préalable encadre l'intervention de l'agent." },
    { q: "Une image modifie virtuellement la disposition du logement. Que faire ?", options: ["La présenter comme une photo actuelle", "Masquer la modification", "Signaler clairement la projection"], answer: 2, explain: "Une projection ne doit pas induire le public en erreur sur l'existant." },
    { q: "Que prouve principalement un bon de visite ?", options: ["Un droit de vendre", "La présentation du bien", "L'accord de la banque"], answer: 1, explain: "Il ne constitue ni mandat ni preuve de financement." },
    { q: "Comment traiter une offre reçue ?", options: ["La présenter fidèlement au vendeur", "La modifier sans accord", "Inventer une concurrence"], answer: 0, explain: "La négociation repose sur une information loyale du mandant." },
    { q: "Quelle relance est la plus utile ?", options: ["Un appel quotidien sans objet", "Un message culpabilisant", "Un point convenu avec information nouvelle"], answer: 2, explain: "Une relance pertinente respecte le rythme et les droits du client." },
    { q: "Que faire d'un lien d'intérêt avec un partenaire recommandé ?", options: ["Le nier", "L'expliquer lorsque pertinent", "Le remplacer par une promesse orale"], answer: 1, explain: "La transparence permet au client de décider de façon éclairée." },
    { q: "Comment sécuriser le fichier client ?", options: ["Limiter les accès et protéger les comptes", "Partager un mot de passe unique", "Exporter vers tout outil gratuit"], answer: 0, explain: "Les accès doivent correspondre aux missions et les données être protégées." },
    { q: "Quel objectif donner au suivi des indicateurs ?", options: ["Accumuler des chiffres", "Remplacer le conseil", "Corriger les actions selon les résultats"], answer: 2, explain: "Un tableau de bord n'est utile que s'il guide des décisions concrètes." }
  ]
};
