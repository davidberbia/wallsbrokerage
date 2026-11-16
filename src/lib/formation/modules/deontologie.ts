import type { FormationModule } from "../types";
export const module: FormationModule = {
  slug: "deontologie", title: "Déontologie", minutes: 45,
  summary: "Appliquer le code de déontologie immobilier et décider avec probité, compétence et transparence.",
  steps: [
    { kind: "page", title: "Un cadre professionnel obligatoire", body: [
      "Le décret n° 2015-1090 du 28 août 2015 fixe le code de déontologie des professionnels relevant de la loi Hoguet. Ce n'est pas une simple charte commerciale : il encadre leur conduite dans leurs activités immobilières.",
      "Le titulaire de la carte organise le respect de ces exigences dans son équipe. Un objectif de chiffre d'affaires ou une instruction du mandant ne justifie jamais une pratique contraire au droit."
    ] },
    { kind: "page", title: "Éthique et probité", body: [
      "Exercez avec conscience, dignité, loyauté, sincérité et probité. Une présentation volontairement trompeuse du bien ou une fausse offre destinée à faire monter le prix contredit ces exigences.",
      "Distinguez les faits vérifiés, les déclarations du vendeur et les points restant à confirmer. Si une erreur a été diffusée, corrigez-la rapidement auprès des personnes concernées et conservez une trace de la correction."
    ] },
    { kind: "page", title: "Respecter le droit et les personnes", body: [
      "Le professionnel agit dans le respect des lois et règlements, notamment des règles contre la discrimination. Il ne participe pas à une sélection fondée sur l'origine, la religion ou un autre critère prohibé.",
      "Face à une consigne illégale, expliquez le refus, proposez une méthode licite et alertez le responsable. Si le client persiste, ne poursuivez pas la mission dans ces conditions."
    ] },
    { kind: "page", title: "Compétence et limites de mission", body: [
      "Entretenez les connaissances juridiques, économiques et techniques nécessaires. La formation continue conditionne le renouvellement de la carte ; elle représente en principe 14 heures par an ou 42 heures sur trois années consécutives.",
      "Sur ces trois années, les formations incluent au moins deux heures de déontologie et deux heures de non-discrimination dans l'accès au logement. Si une question dépasse vos compétences, sollicitez le spécialiste approprié plutôt que d'improviser une réponse."
    ] },
    { kind: "quiz", questions: [
      { q: "Une instruction du vendeur autorise-t-elle une fausse information ?", options: ["Oui, par écrit", "Non", "Oui, en exclusivité"], answer: 1, explain: "La loyauté et le respect de la loi s'imposent malgré la demande du mandant." },
      { q: "Un point technique dépasse vos compétences : que faire ?", options: ["Garantir sans vérifier", "Le cacher", "Recourir à un spécialiste"], answer: 2, explain: "Le devoir de compétence implique de reconnaître ses limites et d'obtenir un avis adapté." }
    ] },
    { kind: "page", title: "Rendre l'intervention transparente", body: [
      "Le public doit comprendre qui intervient, avec quelle qualité et pour quelle mission. Présentez clairement l'agence, le statut de l'intervenant et les informations professionnelles obligatoires sur les supports concernés.",
      "Expliquez les prestations, leurs limites, le calcul des honoraires et leur débiteur. Une explication orale approximative ne remplace ni les affichages requis ni les stipulations du mandat."
    ] },
    { kind: "page", title: "Informer sans promettre l'impossible", body: [
      "Donnez une information exacte, intelligible et utile à la décision. Une estimation n'est pas une garantie de vente ; une possibilité d'urbanisme ne doit pas être présentée comme un droit acquis sans vérification.",
      "Signalez les incertitudes et transmettez les documents pertinents dans les délais utiles. N'attendez pas la signature pour révéler un élément connu qui peut modifier le consentement d'une partie."
    ] },
    { kind: "page", title: "Confidentialité et discrétion", body: [
      "Le code impose prudence et discrétion dans l'utilisation des informations relatives aux mandants et aux autres parties. Le divorce d'un vendeur ou les revenus d'un acquéreur ne sont pas des arguments à diffuser librement.",
      "Limitez l'accès aux dossiers aux personnes habilitées et sécurisez les échanges. La discrétion ne permet toutefois pas de dissimuler une information légalement due ni de faire obstacle aux obligations de déclaration, notamment en matière de LCB-FT."
    ] },
    { kind: "page", title: "Repérer un conflit d'intérêts", body: [
      "Un intérêt personnel, familial ou économique peut compromettre l'indépendance du conseil. L'achat envisagé par un proche ou un avantage obtenu d'un prestataire doivent déclencher une analyse avant de poursuivre.",
      "Informez les personnes concernées dans les conditions requises et formalisez les mesures prises. Lorsque le conflit ne peut être maîtrisé licitement, renoncez à intervenir ; une signature ne régularise pas une opération interdite."
    ] },
    { kind: "quiz", questions: [
      { q: "Le frère du négociateur souhaite acheter le bien suivi : quel réflexe ?", options: ["Analyser et traiter le conflit avant de poursuivre", "Le taire", "Doubler les honoraires"], answer: 0, explain: "Le lien familial crée un risque de conflit à analyser et à rendre transparent." },
      { q: "La confidentialité interdit-elle une déclaration légalement obligatoire ?", options: ["Oui", "Seulement en mandat simple", "Non"], answer: 2, explain: "Le devoir de discrétion s'articule avec les obligations légales, dont la LCB-FT." }
    ] },
    { kind: "page", title: "Défendre les intérêts confiés", body: [
      "Défendez les intérêts légitimes du mandant dans le respect des droits des autres parties. Transmettez les propositions utiles, conseillez sans pression abusive et rendez compte de la mission.",
      "Un prix plus élevé ne justifie pas de masquer un risque sérieux. Le conseil porte aussi sur la solidité du financement, les conditions de l'offre et les conséquences prévisibles de l'engagement."
    ] },
    { kind: "page", title: "Relations professionnelles et réclamations", body: [
      "Entretenez des rapports loyaux avec les confrères : pas de dénigrement ni de captation déloyale d'un dossier. La concurrence se joue sur la qualité du service, non sur des affirmations invérifiables.",
      "Recevez les réclamations, recherchez les faits et apportez une réponse motivée. Informez le consommateur du médiateur compétent selon les règles applicables ; la médiation ne supprime pas son droit de saisir le juge."
    ] },
    { kind: "page", title: "Le rôle du CNTGI", body: [
      "Le Conseil national de la transaction et de la gestion immobilières, ou CNTGI, est une instance consultative du secteur. Il contribue notamment aux réflexions sur la déontologie, les compétences et la formation.",
      "Ne le présentez pas comme un ordre professionnel délivrant les cartes ou comme le juge de tout litige d'honoraires. La carte relève de la CCI ; contrôles, contentieux et sanctions relèvent des autorités compétentes selon le manquement."
    ] },
    { kind: "page", title: "Sanctions et prévention", body: [
      "Un comportement déloyal peut engager la responsabilité civile du professionnel. Si les faits constituent une infraction, des sanctions pénales peuvent aussi s'appliquer ; certains manquements relèvent de sanctions administratives prévues par leurs textes.",
      "Il n'existe pas une amende pénale unique attachée à tout écart déontologique. Identifiez le fondement applicable et prévenez les risques par des procédures, des contrôles de dossiers et une formation suivie de l'équipe."
    ] },
    { kind: "quiz", questions: [
      { q: "Qui délivre la carte professionnelle immobilière ?", options: ["Le CNTGI", "La CCI compétente", "Le médiateur"], answer: 1, explain: "Le CNTGI est consultatif ; la délivrance de la carte relève de la CCI." },
      { q: "Tout écart déontologique entraîne-t-il la même amende ?", options: ["Oui", "Oui, si récidive", "Non, il faut identifier le fondement"], answer: 2, explain: "Les conséquences varient selon les faits et les textes applicables." }
    ] }
  ],
  final: [
    { q: "Quel texte fixe le code de déontologie immobilier ?", options: ["Le décret 2015-1090", "Le règlement de copropriété", "Le seul mandat"], answer: 0, explain: "Le décret du 28 août 2015 fixe ce code." },
    { q: "Une fausse offre pour stimuler les enchères respecte-t-elle la probité ?", options: ["Oui", "Non", "Avec accord du vendeur"], answer: 1, explain: "Une offre fictive est contraire à la sincérité et à la loyauté." },
    { q: "Quel volume de formation constitue une voie de conformité ?", options: ["Deux heures tous les cinq ans", "Aucune après la carte", "42 heures sur trois années consécutives"], answer: 2, explain: "Le régime prévoit 14 heures annuelles ou 42 heures sur trois années consécutives." },
    { q: "Quelle conduite face à une règle d'urbanisme incertaine ?", options: ["Vérifier et signaler l'incertitude", "Garantir la constructibilité", "Éviter toute trace"], answer: 0, explain: "Le conseil exige de distinguer hypothèse et information vérifiée." },
    { q: "Quand clarifier les honoraires ?", options: ["Après le paiement", "Dès l'information et la contractualisation requises", "Seulement sur plainte"], answer: 1, explain: "La rémunération doit être transparente avant l'engagement concerné." },
    { q: "Peut-on divulguer les revenus d'un candidat à tous les visiteurs ?", options: ["Oui", "Si le dossier est bon", "Non"], answer: 2, explain: "Ces informations doivent rester accessibles aux seuls destinataires habilités." },
    { q: "Une acquisition par un proche appelle quoi ?", options: ["Une analyse du conflit d'intérêts", "Une dispense de contrôle", "Le silence"], answer: 0, explain: "Le lien personnel peut compromettre l'indépendance du professionnel." },
    { q: "Défendre le vendeur permet-il de tromper l'acheteur ?", options: ["Si le prix est atteint", "Non", "Sur demande écrite"], answer: 1, explain: "La défense des intérêts reste subordonnée aux droits des autres parties." },
    { q: "Comment traiter une réclamation ?", options: ["L'effacer", "La publier intégralement", "Examiner les faits et répondre"], answer: 2, explain: "Une réponse traçable et motivée permet un traitement loyal du différend." },
    { q: "Quelle est la nature du CNTGI ?", options: ["Une instance consultative", "Une juridiction pénale", "Une CCI"], answer: 0, explain: "Le CNTGI contribue à l'encadrement professionnel sans juger tous les litiges." },
    { q: "Un préjudice causé par un conseil fautif peut engager quelle responsabilité ?", options: ["Aucune", "La responsabilité civile", "Seulement celle du client"], answer: 1, explain: "Une faute causant un dommage peut engager la responsabilité civile selon ses conditions." },
    { q: "Quel dispositif réduit durablement les écarts ?", options: ["Des consignes orales seules", "Un objectif commercial unique", "Formation, procédures et contrôles"], answer: 2, explain: "La prévention repose sur des pratiques comprises, documentées et vérifiées." }
  ]
};
