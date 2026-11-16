import type { FormationModule } from "../types";
export const module: FormationModule = {
  slug: "non-discrimination", title: "Non-discrimination dans l'accès au logement", minutes: 45,
  summary: "Sélectionner les dossiers sur des critères licites, maîtriser les justificatifs et réagir à une demande discriminatoire.",
  steps: [
    { kind: "page", title: "L'égalité d'accès, une obligation", body: [
      "L'article 1er de la loi du 6 juillet 1989 interdit de refuser la location d'un logement pour un motif discriminatoire défini par le code pénal. L'interdiction concerne aussi les pratiques de l'intermédiaire.",
      "La discrimination peut intervenir dès l'annonce, l'appel ou la visite, pas seulement au choix final. Une candidature doit être examinée à partir d'informations pertinentes et de critères licites appliqués de manière cohérente."
    ] },
    { kind: "page", title: "Identifier les critères prohibés", body: [
      "Les articles 225-1 et suivants du code pénal protègent notamment contre les distinctions fondées sur l'origine, le sexe, la situation de famille, la grossesse, l'apparence physique, le patronyme, le lieu de résidence, l'état de santé, le handicap ou l'âge.",
      "Sont également visées notamment l'orientation sexuelle, l'identité de genre, les opinions politiques, les activités syndicales, les convictions religieuses et l'appartenance ou la non-appartenance, vraie ou supposée, à une ethnie, une Nation ou une prétendue race. Cette présentation n'épuise pas la liste légale."
    ] },
    { kind: "page", title: "Discrimination directe et indirecte", body: [
      "Écarter une personne en raison de son origine supposée constitue une discrimination directe. Il n'est pas nécessaire que cette origine soit réelle : un tri sur le nom peut suffire à révéler le critère employé.",
      "Une règle apparemment neutre peut créer un désavantage particulier lié à un critère protégé : c'est le risque de discrimination indirecte. Il faut examiner sa justification objective, son but légitime et le caractère nécessaire et approprié des moyens employés."
    ] },
    { kind: "page", title: "Résister à une consigne du bailleur", body: [
      "Un bailleur demande « pas de familles avec enfants ». Refusez cette consigne fondée sur la situation familiale et expliquez que l'agence sélectionne sur la capacité à respecter les obligations locatives.",
      "Proposez une grille objective, consignez l'incident de façon proportionnée et alertez le responsable. Ne traduisez pas la demande interdite par un code interne ; si elle persiste, refusez de l'exécuter."
    ] },
    { kind: "quiz", questions: [
      { q: "Le tri sur un nom supposé étranger est-il acceptable ?", options: ["Oui, à la demande du bailleur", "Non", "Seulement avant visite"], answer: 1, explain: "Le patronyme et l'origine supposée ne peuvent servir à écarter un candidat." },
      { q: "Une règle neutre en apparence exclut-elle tout risque ?", options: ["Oui", "Si elle est écrite", "Non, une discrimination indirecte est possible"], answer: 2, explain: "Il faut aussi analyser les effets et la justification de la règle." }
    ] },
    { kind: "page", title: "Évaluer la solvabilité sans préjugé", body: [
      "Définissez avant l'examen les éléments utiles : ressources justifiées, garanties licites et cohérence avec le loyer. Il n'existe pas de règle légale générale imposant à tout candidat de gagner trois fois le loyer.",
      "Ne confondez pas la particulière vulnérabilité économique, critère protégé lorsqu'elle est apparente ou connue, avec une analyse objective de la capacité de paiement. Un refus doit reposer sur des éléments pertinents, non sur un jugement social."
    ] },
    { kind: "page", title: "Une liste limitative de justificatifs", body: [
      "Pour les locations relevant de son champ, le décret n° 2015-1437 du 5 novembre 2015 fixe la liste limitative des pièces pouvant être demandées au candidat et à sa caution. L'article 22-2 de la loi de 1989 en constitue le fondement.",
      "Les catégories couvrent notamment identité, domicile, activité professionnelle et ressources. Consultez la liste à jour selon la situation ; une pièce simplement pratique pour l'agence n'est pas exigible si elle n'y figure pas."
    ] },
    { kind: "page", title: "Identité et domicile : ne pas surcollecter", body: [
      "Pour l'identité, demandez une pièce autorisée en cours de validité comportant photographie et signature, et non le cumul de plusieurs titres. Le décret admet notamment des documents étrangers ; une carte d'identité française ne peut être imposée à tous.",
      "Pour le domicile, utilisez l'un des justificatifs autorisés selon la situation du candidat. Ne transformez pas un hébergement chez un tiers en motif automatique de rejet et ne réclamez pas tous les justificatifs possibles à la fois."
    ] },
    { kind: "page", title: "Ressources, caution et documents interdits", body: [
      "Les bulletins de salaire, avis d'imposition ou justificatifs de certaines prestations figurent parmi les pièces autorisées selon les cas. Utilisez la rubrique adaptée au salarié, à l'indépendant, à l'étudiant ou au retraité.",
      "N'exigez ni dossier médical, ni extrait de casier judiciaire, ni relevés de compte bancaire : ils ne figurent pas dans la liste locative. Le cautionnement connaît aussi des limites, notamment en cas d'assurance des obligations locatives, sous réserve de l'exception légale pour l'étudiant ou l'apprenti."
    ] },
    { kind: "quiz", questions: [
      { q: "Peut-on exiger les relevés de compte pour vérifier le sérieux ?", options: ["Non", "Oui, trois mois", "Avec une clause du mandat"], answer: 0, explain: "Les relevés bancaires ne font pas partie des justificatifs locatifs exigibles." },
      { q: "Trois fois le loyer est-il un seuil légal universel ?", options: ["Oui", "Uniquement à Paris", "Non"], answer: 2, explain: "C'est une pratique de sélection, non une exigence légale générale ; elle doit rester licite et pertinente." }
    ] },
    { kind: "page", title: "Organiser une sélection traçable", body: [
      "Utilisez la même grille pour les situations comparables et vérifiez les pièces sans commentaire sur l'origine ou le mode de vie. Toute différence de traitement doit correspondre à un élément licite et pertinent.",
      "Conservez une justification factuelle de la décision avec accès restreint et durée adaptée. Le RGPD interdit de constituer un fichier de critères sensibles pour prouver que l'agence ne discrimine pas."
    ] },
    { kind: "page", title: "Testing et preuve", body: [
      "Le testing compare les réponses apportées à des candidatures comparables ne différant que sur un critère étudié. L'article 225-3-1 du code pénal admet que la sollicitation destinée à démontrer le comportement discriminatoire ne fasse pas obstacle à l'infraction.",
      "En matière civile locative, le candidat présente des éléments laissant supposer une discrimination ; il appartient alors à la partie défenderesse de justifier sa décision par des éléments objectifs étrangers à toute discrimination. Ce mécanisme ne se confond pas avec la preuve pénale."
    ] },
    { kind: "page", title: "Sanctions et responsabilités", body: [
      "Le refus discriminatoire d'un bien ou service est notamment puni, pour une personne physique, de trois ans d'emprisonnement et de 45 000 euros d'amende selon l'article 225-2 du code pénal. Des circonstances aggravantes et des peines complémentaires peuvent s'appliquer.",
      "L'agence personne morale peut également être responsable pénalement dans les conditions légales. La demande de justificatifs non autorisés expose, pour sa part, à une amende administrative pouvant atteindre 3 000 euros pour une personne physique et 15 000 euros pour une personne morale."
    ] },
    { kind: "page", title: "Réagir et orienter vers le Défenseur des droits", body: [
      "Une personne qui s'estime discriminée peut saisir gratuitement le Défenseur des droits. Cette autorité indépendante peut enquêter, proposer un règlement amiable, formuler des recommandations ou présenter des observations en justice selon ses compétences.",
      "La saisine ne remplace pas une plainte pénale et n'interrompt pas à elle seule les délais de recours. Préservez les annonces, messages et éléments utiles de manière licite ; à l'agence, faites corriger immédiatement la pratique en cause."
    ] },
    { kind: "quiz", questions: [
      { q: "Quel est le rôle du testing ?", options: ["Créer un bail automatique", "Mettre en évidence une différence de traitement", "Remplacer tout procès"], answer: 1, explain: "Le testing apporte des éléments de preuve par comparaison de situations." },
      { q: "La saisine du Défenseur des droits suspend-elle automatiquement les délais ?", options: ["Oui", "Pendant un an", "Non"], answer: 2, explain: "Les délais de recours doivent être surveillés indépendamment de cette saisine." }
    ] }
  ],
  final: [
    { q: "Une annonce excluant les familles avec enfants est-elle licite ?", options: ["Non", "Oui pour un studio sans examen", "Si le bailleur le veut"], answer: 0, explain: "L'exclusion générale est fondée sur la situation de famille." },
    { q: "Une origine seulement supposée peut-elle fonder une discrimination ?", options: ["Non", "Oui", "Uniquement après signature"], answer: 1, explain: "La protection couvre aussi l'appartenance vraie ou supposée." },
    { q: "Que faire d'une consigne discriminatoire ?", options: ["La coder", "La transmettre sans agir", "La refuser et alerter"], answer: 2, explain: "L'intermédiaire ne doit pas exécuter une instruction illégale." },
    { q: "Quel critère peut guider une sélection licite ?", options: ["La capacité de paiement objectivement appréciée", "La religion", "Le patronyme"], answer: 0, explain: "La solvabilité s'apprécie sur des données pertinentes et licites." },
    { q: "Quel texte liste les justificatifs locatifs exigibles ?", options: ["Le règlement intérieur", "Le décret 2015-1437", "L'annonce"], answer: 1, explain: "Le décret fixe une liste limitative pour les locations relevant de son champ." },
    { q: "Quel document ne faut-il pas exiger ?", options: ["Un justificatif autorisé de ressources", "Une pièce d'identité autorisée", "Le dossier médical"], answer: 2, explain: "Le dossier médical n'est pas une pièce locative exigible." },
    { q: "Peut-on imposer à tous une carte d'identité française ?", options: ["Non", "Oui", "Seulement sans caution"], answer: 0, explain: "D'autres pièces d'identité, notamment étrangères, sont admises par le décret." },
    { q: "Une grille écrite peut-elle produire une discrimination indirecte ?", options: ["Jamais", "Oui", "Seulement si elle mentionne une religion"], answer: 1, explain: "Une règle apparemment neutre peut avoir un effet défavorable injustifié." },
    { q: "En contentieux civil locatif, que doit d'abord présenter le candidat ?", options: ["Une condamnation pénale préalable", "Un bail signé", "Des éléments laissant supposer une discrimination"], answer: 2, explain: "Le régime probatoire civil aménage ensuite la charge de la justification." },
    { q: "Quelle peine principale prévoit notamment l'article 225-2 pour une personne physique ?", options: ["Trois ans et 45 000 euros", "Une simple lettre", "Seulement 100 euros"], answer: 0, explain: "Il s'agit du quantum prévu pour les faits concernés, sous réserve notamment des aggravations." },
    { q: "Quel plafond administratif pour des pièces indues demandées par une personne morale ?", options: ["150 euros", "15 000 euros", "Aucun"], answer: 1, explain: "L'article 22-2 prévoit ce plafond, distinct de la sanction pénale de discrimination." },
    { q: "Qui peut être saisi gratuitement pour une discrimination ?", options: ["Seulement le syndic", "Seulement le notaire", "Le Défenseur des droits"], answer: 2, explain: "Cette autorité indépendante peut accompagner et instruire une réclamation dans ses compétences." }
  ]
};
