import type { FormationModule } from "../types";

export const module: FormationModule = {
  slug: "loi-hoguet-carte", title: "Loi Hoguet et carte professionnelle", minutes: 55,
  summary: "Identifier les habilitations, garanties et obligations nécessaires à un exercice régulier des métiers immobiliers.",
  steps: [
    { kind: "page", title: "Une activité réglementée", body: [
      "La loi du 2 janvier 1970, dite loi Hoguet, et son décret du 20 juillet 1972 encadrent notamment l'intermédiation habituelle sur les biens d'autrui. La transaction, la gestion immobilière et le syndic ne sont pas de simples activités de mise en relation libres de tout statut.",
      "Le statut commercial de l'entreprise ne suffit pas à autoriser l'exercice. Avant de démarrer, identifiez l'activité réellement pratiquée, son champ réglementaire et la personne qui portera la carte professionnelle."
    ] },
    { kind: "page", title: "Comprendre les mentions T, G et S", body: [
      "La mention T correspond aux transactions sur immeubles et fonds de commerce. La mention G concerne la gestion immobilière ; la mention S concerne le syndic de copropriété.",
      "Une carte T seule n'autorise pas à assurer la gestion locative ou à exercer comme syndic. Une entreprise peut demander plusieurs mentions si elle satisfait aux conditions propres à chacune ; vérifiez les activités inscrites plutôt que la seule existence d'une carte."
    ] },
    { kind: "page", title: "Le rôle de la CCI", body: [
      "La chambre de commerce et d'industrie territorialement compétente délivre la carte, après examen du dossier. Elle vérifie notamment aptitude professionnelle, absence d'incapacité, assurance et garantie financière lorsque celle-ci est requise.",
      "Le fichier national des professionnels de l'immobilier permet de vérifier les informations publiées sur une carte. Un numéro SIREN, une inscription au RSAC ou l'adhésion à un réseau ne remplacent pas cette autorisation professionnelle."
    ] },
    { kind: "page", title: "Aptitude et honorabilité", body: [
      "L'aptitude professionnelle peut résulter de diplômes admissibles ou de voies combinant études et expérience salariée pertinente. Les durées et justificatifs dépendent du parcours : faites instruire votre situation par la CCI plutôt que de généraliser un cas particulier.",
      "Certaines condamnations et incapacités interdisent l'exercice. Pour une société, les représentants légaux et statutaires concernés doivent satisfaire aux exigences applicables ; créer une structure ne permet pas de contourner une interdiction."
    ] },
    { kind: "quiz", questions: [
      { q: "Quelle mention correspond au syndic ?", options: ["T", "S", "G uniquement"], answer: 1, explain: "La mention S vise l'activité de syndic de copropriété." },
      { q: "L'inscription au RSAC suffit-elle à détenir une carte T ?", options: ["Oui", "Oui, avec un site internet", "Non"], answer: 2, explain: "L'immatriculation commerciale ne remplace pas la carte délivrée par la CCI." }
    ] },
    { kind: "page", title: "La responsabilité civile professionnelle", body: [
      "La RCP couvre, dans les limites du contrat, les conséquences pécuniaires de la responsabilité professionnelle : faute de conseil, omission ou erreur dans l'exercice assuré. Elle ne donne pas le droit de pratiquer une activité non autorisée.",
      "Vérifiez les activités garanties, plafonds, franchises, exclusions et périodes de couverture. La RCP du titulaire ne dispense pas l'agent commercial immobilier de souscrire sa propre assurance professionnelle obligatoire."
    ] },
    { kind: "page", title: "La garantie financière", body: [
      "La garantie financière protège les fonds, effets ou valeurs confiés par les clients en permettant leur remboursement dans le cadre garanti. Elle ne se confond ni avec la RCP ni avec la trésorerie personnelle de l'entreprise.",
      "Elle est requise pour la gestion et le syndic. En transaction, une dispense est possible sous le régime de non-détention de fonds, hors sommes représentatives de rémunération ou commission ; cette déclaration interdit de recevoir un dépôt client, même temporairement.",
      "Le minimum est en principe de 110 000 euros, avec une réduction possible à 30 000 euros pour les deux premières années sous conditions. La garantie doit aussi être adaptée au montant maximal des fonds détenus : le seul minimum peut être insuffisant."
    ] },
    { kind: "page", title: "Sécuriser les fonds et l'information", body: [
      "Avant toute remise de fonds, contrôlez mandat, habilitation, garantie et procédure comptable. Appliquez les obligations de compte dédié, de reçus et de traçabilité correspondant à l'activité ; un compte personnel n'est jamais une solution de dépannage.",
      "Affichez et faites figurer les informations professionnelles obligatoires sur les supports concernés : carte, CCI, assurance ou garantie selon les textes, et situation de non-détention lorsqu'elle s'applique. Les honoraires doivent être présentés de façon transparente."
    ] },
    { kind: "page", title: "Une carte valable trois ans", body: [
      "La carte professionnelle est délivrée pour trois ans. Anticipez son renouvellement : la demande doit être présentée deux mois avant son expiration avec les justificatifs requis.",
      "La poursuite de l'activité n'est pas automatiquement autorisée parce qu'un dossier tardif est en préparation. Suivez aussi les changements de représentant, d'adresse ou d'activité et les formalités propres aux établissements secondaires."
    ] },
    { kind: "quiz", questions: [
      { q: "Que protège principalement la garantie financière ?", options: ["Le remboursement des fonds confiés", "Le chiffre d'affaires prévu", "La valeur de marché des biens"], answer: 0, explain: "La garantie vise les fonds clients ; la responsabilité professionnelle relève d'une assurance distincte." },
      { q: "Une agence T déclarée sans détention peut-elle conserver un acompte client une nuit ?", options: ["Oui, sous enveloppe", "Non", "Oui, si le vendeur accepte"], answer: 1, explain: "Une détention temporaire reste une détention incompatible avec ce régime." },
      { q: "Quelle est la durée de validité de la carte ?", options: ["Un an", "À vie", "Trois ans"], answer: 2, explain: "Le renouvellement doit être préparé avant l'échéance triennale." }
    ] },
    { kind: "page", title: "Formation continue : 42 heures", body: [
      "L'obligation de formation continue correspond à quatorze heures par an ou quarante-deux heures au cours de trois années consécutives d'exercice. Sur trois ans, elle comprend au moins deux heures de déontologie et deux heures de non-discrimination dans l'accès au logement.",
      "Elle concerne notamment les titulaires, les dirigeants concernés, les directeurs d'établissement et les collaborateurs habilités. Vérifiez que les actions et organismes répondent aux exigences réglementaires ; conservez les attestations précisant contenu, durée et participation."
    ] },
    { kind: "page", title: "L'attestation du collaborateur", body: [
      "Le salarié négociateur ou l'agent commercial intervient sous la responsabilité du titulaire et dans les limites d'une attestation d'habilitation demandée par celui-ci à la CCI. Cette attestation précise l'étendue des pouvoirs : négocier ne signifie pas pouvoir tout signer ou recevoir des fonds.",
      "L'agent commercial ne peut pas recevoir ou détenir des fonds clients, donner des consultations juridiques ni rédiger des actes sous signature privée, sauf les mandats conclus au profit du titulaire de la carte. Le statut indépendant n'efface pas ces restrictions.",
      "Vérifiez la validité de l'habilitation avant l'entrée en fonction et organisez sa restitution à la fin de la collaboration. Un accord interne ou une carte de visite ne remplace pas ce document."
    ] },
    { kind: "page", title: "Mandats : écrire, numéroter, conserver", body: [
      "Un mandat écrit préalable détermine notamment la mission, la durée, les pouvoirs et les conditions de rémunération. Le bon de visite et les échanges oraux ne constituent pas un substitut au mandat requis.",
      "Les mandats sont inscrits chronologiquement au registre ; le numéro est reporté sur l'exemplaire remis au mandant. Pour les mandats de transaction, le registre et les mandats sont conservés dix ans ; un registre électronique doit garantir intégrité et traçabilité."
    ] },
    { kind: "page", title: "Contrôles, sanctions et réflexes", body: [
      "Exercer habituellement sans carte valable ou sans habilitation requise expose notamment à six mois d'emprisonnement et 7 500 euros d'amende. Certaines perceptions ou détentions illicites de fonds sont punies de deux ans d'emprisonnement et 30 000 euros d'amende.",
      "Les conséquences peuvent aussi être civiles, comme la perte du droit à rémunération selon l'irrégularité, et relever de contrôles administratifs ou de poursuites pour d'autres infractions. Ne réduisez pas tout manquement à une amende unique.",
      "Mettez en place un contrôle périodique : échéances de carte, assurance et garantie, pouvoirs des collaborateurs, formation, mandats et fonds. En cas de doute sérieux, suspendez l'acte concerné et sollicitez la CCI ou un conseil juridique compétent."
    ] },
    { kind: "quiz", questions: [
      { q: "Quel contenu minimal doit figurer dans les 42 heures sur trois ans ?", options: ["Uniquement de la prospection", "Deux heures de déontologie et deux de non-discrimination", "Quarante-deux heures de comptabilité"], answer: 1, explain: "Ces deux thèmes disposent chacun d'un minimum de deux heures sur le cycle." },
      { q: "Un agent commercial habilité peut-il recevoir le séquestre d'un acquéreur ?", options: ["Non", "Oui, sur son compte professionnel", "Oui, si l'agence est fermée"], answer: 0, explain: "L'interdiction de recevoir des fonds clients s'applique à l'agent commercial immobilier." }
    ] }
  ],
  final: [
    { q: "Quelle mention couvre la gestion immobilière ?", options: ["S uniquement", "G", "T uniquement"], answer: 1, explain: "La gestion immobilière relève de la mention G." },
    { q: "Qui délivre la carte dans le régime courant ?", options: ["La CCI compétente", "Le réseau commercial", "La banque"], answer: 0, explain: "La CCI instruit la demande et contrôle les conditions réglementaires." },
    { q: "Une carte T autorise-t-elle à devenir syndic sans autre mention ?", options: ["Oui", "Oui, pour une petite copropriété", "Non"], answer: 2, explain: "Le syndic relève de la mention S et de ses conditions d'exercice." },
    { q: "Quelle protection vise principalement une faute de conseil assurée ?", options: ["La garantie financière", "La RCP", "Le dépôt de garantie de l'acquéreur"], answer: 1, explain: "La RCP traite les conséquences de la responsabilité professionnelle dans son périmètre contractuel." },
    { q: "La non-détention dispense-t-elle un gestionnaire de garantie financière ?", options: ["Non", "Oui, automatiquement", "Oui, pendant trois ans"], answer: 0, explain: "La dispense étudiée concerne la transaction, pas la gestion ou le syndic." },
    { q: "Un minimum de garantie suffit-il si les fonds détenus sont supérieurs à la couverture ?", options: ["Oui", "Oui, avec accord oral du client", "Non"], answer: 2, explain: "La couverture doit être adaptée au niveau des fonds détenus." },
    { q: "Quand présenter la demande de renouvellement ?", options: ["Après l'expiration", "Deux mois avant l'expiration", "Tous les dix ans"], answer: 1, explain: "Le renouvellement s'anticipe pour éviter une rupture d'autorisation." },
    { q: "Quelle durée globale de formation est admise sur trois années consécutives ?", options: ["Quarante-deux heures", "Deux heures", "Dix heures"], answer: 0, explain: "L'obligation est de quatorze heures annuelles ou quarante-deux heures sur trois années consécutives." },
    { q: "Combien d'heures minimales de non-discrimination sont requises sur le cycle de trois ans ?", options: ["Aucune", "Quatorze", "Deux"], answer: 2, explain: "Ces deux heures s'ajoutent, dans le volume total, au minimum de déontologie." },
    { q: "Quel acte un agent commercial peut-il rédiger dans l'exception légale étudiée ?", options: ["Tout compromis", "Un mandat au profit du titulaire de la carte", "Un acte authentique"], answer: 1, explain: "L'exception ne lui confère pas un pouvoir général de rédaction juridique." },
    { q: "Où reporter le numéro chronologique du mandat ?", options: ["Sur l'exemplaire remis au mandant", "Sur le seul agenda interne", "Uniquement sur le DPE"], answer: 0, explain: "Le registre et l'exemplaire du mandant doivent être reliés par ce numéro." },
    { q: "Quelle sanction pénale vise notamment l'exercice habituel sans carte requise ?", options: ["Un simple avertissement obligatoire", "Aucune si le client est satisfait", "Six mois d'emprisonnement et 7 500 euros d'amende"], answer: 2, explain: "La loi Hoguet prévoit cette peine, indépendamment d'autres conséquences possibles." }
  ]
};
