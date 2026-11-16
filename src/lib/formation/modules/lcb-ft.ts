import type { FormationModule } from "../types";
export const module: FormationModule = {
  slug: "lcb-ft", title: "Lutte anti-blanchiment", minutes: 50,
  summary: "Organiser la vigilance immobilière, identifier les bénéficiaires effectifs et traiter les soupçons sans alerter le client.",
  steps: [
    { kind: "page", title: "Pourquoi l'immobilier est exposé", body: [
      "Le blanchiment consiste à donner une apparence licite à des fonds issus d'une infraction. Un achat immobilier, une revente rapide ou un montage sociétaire opaque peuvent servir à dissimuler leur origine.",
      "Le financement du terrorisme peut utiliser des fonds d'origine licite ou illicite. La vigilance ne se limite donc pas aux clients fortunés, aux espèces ou aux opérations qui paraissent rentables pour un fraudeur."
    ] },
    { kind: "page", title: "Déterminer le champ d'assujettissement", body: [
      "Les articles L. 561-1 et suivants du code monétaire et financier organisent le dispositif. L'article L. 561-2, 8°, vise certaines activités de la loi Hoguet, notamment la transaction immobilière ; la vigilance ne dépend pas de l'encaissement des fonds par l'agence.",
      "Pour la location, le texte vise l'activité exercée en exécution d'un mandat de transaction de biens immeubles dont le loyer mensuel est supérieur ou égal à 10 000 euros. N'étendez pas automatiquement ce régime à toute gestion locative ou activité de syndic ; qualifiez la mission réellement exercée."
    ] },
    { kind: "page", title: "Installer une organisation opérationnelle", body: [
      "L'agence formalise ses procédures, désigne les personnes chargées des fonctions de déclarant et de correspondant TRACFIN selon les règles applicables, et organise le contrôle interne. Le négociateur doit savoir à qui transmettre une alerte sans délai.",
      "Formez les collaborateurs à l'entrée dans la fonction puis régulièrement. Une procédure téléchargée mais inconnue de l'équipe ne démontre pas une maîtrise effective des risques."
    ] },
    { kind: "page", title: "Classer les risques", body: [
      "La classification des risques prend en compte clients, activités, opérations, produits, canaux de distribution et zones géographiques. Elle s'appuie sur les analyses nationales et sectorielles ainsi que sur l'expérience de l'agence.",
      "Déclinez-la dans chaque dossier : société complexe, représentation à distance, fonds de tiers ou incohérence économique appellent une analyse adaptée. Un indice n'est pas une preuve ; aucune nationalité ou origine supposée ne justifie un automatisme discriminatoire."
    ] },
    { kind: "quiz", questions: [
      { q: "L'absence de maniement de fonds dispense-t-elle une agence assujettie ?", options: ["Oui", "Non", "Si le notaire intervient"], answer: 1, explain: "L'assujettissement résulte de l'activité, pas seulement du passage des fonds." },
      { q: "Quel est le seuil mensuel visé pour la location dans le champ décrit ?", options: ["1 000 euros", "5 000 euros", "10 000 euros, seuil inclus"], answer: 2, explain: "Le texte retient un loyer mensuel supérieur ou égal à 10 000 euros dans le cadre concerné." }
    ] },
    { kind: "page", title: "Identifier le client et vérifier son identité", body: [
      "Avant l'entrée en relation d'affaires, identifiez le client et vérifiez son identité à partir d'éléments probants, selon les modalités réglementaires. Appliquez les diligences aux parties concernées par l'opération sans considérer que le dossier du seul mandant suffit toujours.",
      "Pour une personne morale, vérifiez l'existence de la structure, ses caractéristiques et l'identité du représentant ainsi que ses pouvoirs. Un simple nom commercial ou un courriel affirmant une qualité de dirigeant ne suffit pas."
    ] },
    { kind: "page", title: "Rechercher le bénéficiaire effectif", body: [
      "Le bénéficiaire effectif est la personne physique qui contrôle en dernier lieu le client ou pour laquelle l'opération est réalisée. Pour une société, recherchez notamment la détention directe ou indirecte de plus de 25 % du capital ou des droits de vote, ou un contrôle par un autre moyen.",
      "Remontez les chaînes de détention et vérifiez les informations par des moyens adaptés au risque. À défaut de personne identifiée selon les critères et dans les conditions réglementaires, le représentant légal peut constituer le recours prévu ; ce n'est pas un raccourci pour éviter les recherches."
    ] },
    { kind: "page", title: "Comprendre la relation et suivre les flux", body: [
      "Recueillez l'objet et la nature de la relation : motivation de l'opération, situation économique et financement envisagé. Pendant la relation, vérifiez la cohérence des opérations avec les informations connues et actualisez le dossier.",
      "Un prix inhabituel, un payeur tiers inexpliqué ou une revente rapide sans logique économique doivent être examinés. Demandez des explications et justificatifs proportionnés ; une réponse incohérente ne se règle pas par une case cochée."
    ] },
    { kind: "page", title: "PPE et vigilance accrue", body: [
      "Une personne politiquement exposée, ou PPE, exerce ou a exercé des fonctions publiques importantes au sens des textes ; certains proches et personnes étroitement associées sont aussi concernés. Ce statut n'est ni une culpabilité ni un motif automatique de refus.",
      "Appliquez les mesures complémentaires : décision au niveau hiérarchique requis, recherche de l'origine du patrimoine et des fonds, suivi renforcé. Après la cessation des fonctions, les mesures liées à la qualité d'ancienne PPE restent notamment applicables pendant au moins douze mois, selon le risque et les textes."
    ] },
    { kind: "quiz", questions: [
      { q: "Un bénéficiaire effectif est en dernier lieu…", options: ["Une personne physique", "Toujours une holding", "Toujours le notaire"], answer: 0, explain: "Il faut rechercher les personnes physiques derrière les structures et le contrôle." },
      { q: "Un client PPE doit-il être automatiquement refusé ?", options: ["Oui", "Seulement s'il est étranger", "Non, des mesures complémentaires sont requises"], answer: 2, explain: "Le statut impose une vigilance adaptée, non une présomption de blanchiment." }
    ] },
    { kind: "page", title: "Approfondir ou ne pas poursuivre", body: [
      "Une opération particulièrement complexe, d'un montant inhabituellement élevé ou sans justification économique ou objet licite apparent appelle un examen renforcé : origine et destination des fonds, objet et bénéficiaire de l'opération.",
      "Lorsque les obligations d'identification ou de connaissance de la relation ne peuvent être satisfaites, n'entrez pas en relation ou n'exécutez pas l'opération, et mettez fin à la relation dans les conditions légales. Examinez aussi l'opportunité d'une déclaration de soupçon ; le refus seul ne la remplace pas."
    ] },
    { kind: "page", title: "Déclarer à TRACFIN", body: [
      "L'article L. 561-15 impose une déclaration lorsque le professionnel sait, soupçonne ou a de bonnes raisons de soupçonner que les sommes proviennent d'une infraction passible de plus d'un an d'emprisonnement ou sont liées au financement du terrorisme. La fraude fiscale obéit aux critères réglementaires spécifiques.",
      "La déclaration expose des faits, l'analyse et les pièces utiles, sans exiger de prouver l'infraction. Elle est en principe adressée avant l'exécution de l'opération suspecte ; les cas légaux de déclaration après exécution imposent d'agir sans délai. Suivez toute opposition de TRACFIN et ne prévenez pas le client."
    ] },
    { kind: "page", title: "Confidentialité et conservation", body: [
      "La déclaration et ses suites sont confidentielles. N'informez ni le client ni un tiers non autorisé de son existence ; les échanges permis entre professionnels sont strictement encadrés. L'intervention du notaire ne transfère pas les obligations propres de l'agence.",
      "L'article L. 561-12 prévoit notamment cinq ans de conservation après la fin de la relation pour les documents d'identité et de connaissance de celle-ci, et cinq ans à compter de leur exécution pour les documents relatifs aux opérations. Sécurisez l'accès et articulez archivage, obligations spéciales et RGPD."
    ] },
    { kind: "page", title: "Contrôles et sanctions", body: [
      "La DGCCRF contrôle le respect des obligations des professionnels immobiliers relevant de son champ. Elle examine notamment procédures, formation, classification des risques et dossiers ; une conformité de façade ne suffit pas.",
      "La Commission nationale des sanctions peut prononcer notamment avertissement, blâme, interdiction temporaire d'exercice et sanction pécuniaire pouvant atteindre cinq millions d'euros, selon les conditions légales. Les poursuites pénales pour blanchiment ou d'autres infractions restent distinctes ; un défaut de vigilance n'est pas automatiquement une condamnation pour blanchiment."
    ] },
    { kind: "quiz", questions: [
      { q: "Faut-il prouver le blanchiment avant une déclaration ?", options: ["Oui", "Non, un soupçon analysé peut la justifier", "Seulement à l'étranger"], answer: 1, explain: "La déclaration transmet un soupçon étayé, sans se substituer à l'enquête." },
      { q: "Peut-on annoncer au client qu'il a été déclaré ?", options: ["Oui, par transparence", "Avec son accord", "Non"], answer: 2, explain: "La confidentialité interdit de révéler au client l'existence de la déclaration." }
    ] }
  ],
  final: [
    { q: "Quel code organise la LCB-FT ?", options: ["Le code monétaire et financier", "Le seul code de l'urbanisme", "Le règlement de l'agence"], answer: 0, explain: "Les obligations sont notamment définies aux articles L. 561 et suivants du CMF." },
    { q: "Qui reste tenu de ses obligations malgré l'intervention du notaire ?", options: ["Personne", "L'agence assujettie", "Seulement la banque"], answer: 1, explain: "Chaque professionnel assujetti assume ses propres obligations." },
    { q: "Que doit refléter une classification des risques ?", options: ["Uniquement le chiffre d'affaires", "Des préjugés nationaux", "Clients, opérations, canaux et géographies notamment"], answer: 2, explain: "L'approche par les risques est multidimensionnelle et documentée." },
    { q: "Quand réaliser en principe identification et vérification ?", options: ["Avant l'entrée en relation", "Après toute vente", "Seulement sur contrôle"], answer: 0, explain: "Les diligences initiales précèdent en principe l'entrée en relation d'affaires." },
    { q: "Quel seuil de détention est notamment un critère du bénéficiaire effectif ?", options: ["Exactement 1 %", "Plus de 25 %", "Toujours 100 %"], answer: 1, explain: "Ce critère n'exclut pas le contrôle par d'autres moyens." },
    { q: "Une chaîne de sociétés autorise-t-elle à arrêter la recherche à la première holding ?", options: ["Oui", "Si elle est française", "Non"], answer: 2, explain: "La recherche doit aboutir aux personnes physiques exerçant le contrôle en dernier lieu." },
    { q: "Une PPE impose notamment quelle mesure ?", options: ["Rechercher l'origine du patrimoine et des fonds", "Refuser sans examen", "Omettre le contrôle d'identité"], answer: 0, explain: "Les PPE appellent des mesures complémentaires de vigilance." },
    { q: "Un payeur tiers inexpliqué appelle quoi ?", options: ["Une validation automatique", "Une analyse et des justificatifs adaptés", "La suppression du dossier"], answer: 1, explain: "L'incohérence doit être comprise et son risque évalué." },
    { q: "Si les diligences obligatoires sont impossibles, que faire ?", options: ["Signer quand même", "Attendre l'acte sans rien faire", "Ne pas poursuivre et examiner une déclaration"], answer: 2, explain: "L'abstention et l'analyse déclarative répondent à des obligations distinctes." },
    { q: "Quel organisme reçoit la déclaration de soupçon ?", options: ["TRACFIN", "La CCI uniquement", "Le bailleur"], answer: 0, explain: "TRACFIN est le service destinataire des déclarations prévues par le CMF." },
    { q: "Quel délai de base pour conserver les documents d'identité après la relation ?", options: ["Six mois", "Cinq ans", "Sans limite"], answer: 1, explain: "Le point de départ est la fin de la relation, sous réserve des autres obligations applicables." },
    { q: "Quel couple d'autorités correspond au contrôle et aux sanctions du dispositif décrit ?", options: ["CNTGI et syndic", "CCI et médiateur", "DGCCRF et Commission nationale des sanctions"], answer: 2, explain: "La DGCCRF contrôle et la CNS exerce le pouvoir de sanction prévu pour les professionnels concernés." }
  ]
};
