import type { FormationModule } from "../types";

export const module: FormationModule = {
  "slug": "fiscalite",
  "title": "Fiscalité de base",
  "summary": "Identifier les principaux impôts immobiliers et distinguer calcul pédagogique et conseil personnalisé.",
  "minutes": 65,
  "steps": [
    {
      "kind": "page",
      "title": "Raisonner par opération",
      "body": [
        "La fiscalité dépend du bien, du vendeur, de l’acquéreur et de l’usage. Distinguez acquisition, détention, location et revente avant de choisir un régime. Ce module vise les situations courantes des particuliers, hors montages sociétaires spécifiques.",
        "Les taux locaux, seuils annuels et exceptions doivent être vérifiés à la date de l’opération. Une simulation n’est pas un rescrit : faites valider les situations complexes par le notaire ou un conseil fiscal."
      ]
    },
    {
      "kind": "page",
      "title": "Les droits de mutation",
      "body": [
        "Dans l’ancien, les droits de mutation comprennent notamment une part départementale, une part communale et des frais d’assiette. Le taux départemental ordinaire est généralement de 4,50 %, mais les départements peuvent temporairement le relever jusqu’à 5 % pour les actes concernés entre avril 2025 et mars 2028.",
        "La majoration ne s’applique pas aux primo-accédants remplissant les conditions légales pour leur résidence principale. Le taux départemental n’est pas le taux total des frais d’acquisition ; vérifiez la délibération locale et la situation exacte de l’acquéreur."
      ]
    },
    {
      "kind": "page",
      "title": "Les frais d’acquisition",
      "body": [
        "Les « frais de notaire » regroupent surtout des taxes, auxquelles s’ajoutent émoluments réglementés, formalités et débours. Ils ne constituent donc pas intégralement la rémunération du notaire. La contribution de sécurité immobilière est également à prendre en compte.",
        "Les ordres de grandeur diffèrent entre ancien et neuf soumis à TVA. Demandez un décompte adapté : prix, fiscalité de l’opération, honoraires éventuels, sûretés et financement peuvent modifier le coût total."
      ]
    },
    {
      "kind": "page",
      "title": "La TVA immobilière",
      "body": [
        "La vente par un assujetti agissant comme tel d’un immeuble achevé depuis cinq ans au plus relève en principe de la TVA immobilière. Le taux normal est de 20 %, sauf dispositif particulier à taux réduit et conditions spécifiques.",
        "La revente par un simple particulier n’est pas soumise automatiquement à TVA parce que le logement a moins de cinq ans. Vérifiez la qualité du vendeur et l’opération ; des droits d’acquisition réduits accompagnent généralement les ventes de neuf effectivement soumises à TVA sur le prix total."
      ]
    },
    {
      "kind": "quiz",
      "questions": [
        {
          "q": "Le taux départemental de 5 % représente-t-il tous les frais d’acquisition ?",
          "options": [
            "Non, il ne constitue qu’une composante",
            "Oui, tous frais compris",
            "Oui, hors crédit seulement",
            "Oui, dans tout le neuf"
          ],
          "answer": 0,
          "explain": "Non, il ne constitue qu’une composante."
        },
        {
          "q": "Une revente par un particulier est-elle soumise à TVA du seul fait de son âge récent ?",
          "options": [
            "Oui, systématiquement",
            "Non, la qualité du vendeur et l’opération comptent",
            "Oui, pendant dix ans",
            "Oui, si un agent intervient"
          ],
          "answer": 1,
          "explain": "Non, la qualité du vendeur et l’opération comptent."
        }
      ]
    },
    {
      "kind": "page",
      "title": "Calculer la plus-value",
      "body": [
        "Pour un particulier relevant du régime immobilier privé, la plus-value brute correspond au prix de cession corrigé diminué du prix d’acquisition majoré selon les règles admises. Certains frais et travaux justifiés peuvent être retenus, sans double déduction.",
        "Pour une acquisition à titre onéreux, un forfait de frais d’acquisition de 7,5 % est possible dans les conditions légales. Pour un immeuble bâti détenu depuis plus de cinq ans, le forfait travaux de 15 % peut s’appliquer ; il ne faut pas le confondre avec une déduction annuelle de loyers."
      ]
    },
    {
      "kind": "page",
      "title": "La résidence principale",
      "body": [
        "La cession de la résidence principale effective et habituelle du vendeur est en principe exonérée de plus-value. Une adresse administrative ou une occupation fictive ne suffit pas. Les dépendances immédiates et nécessaires suivent des conditions propres.",
        "Un logement libéré avant la vente peut conserver l’exonération sous conditions, notamment de délai normal de vente et d’absence de location ou d’occupation intermédiaire incompatible. Les autres exonérations répondent à des critères précis : ne les promettez pas sans vérification."
      ]
    },
    {
      "kind": "page",
      "title": "Les abattements",
      "body": [
        "Pour l’impôt sur le revenu, l’abattement est de 6 % par année de la sixième à la vingt-et-unième, puis de 4 % la vingt-deuxième. L’exonération totale est donc acquise après vingt-deux ans de détention.",
        "Pour les prélèvements sociaux, l’abattement est de 1,65 % par année de la sixième à la vingt-et-unième, de 1,60 % la vingt-deuxième, puis de 9 % par année de la vingt-troisième à la trentième. L’exonération totale intervient après trente ans."
      ]
    },
    {
      "kind": "page",
      "title": "Les taux de plus-value",
      "body": [
        "La plus-value imposable relève en principe d’un impôt de 19 % et de prélèvements sociaux de 17,2 %, appliqués après leurs abattements respectifs. Des règles particulières concernent notamment certains non-résidents.",
        "Une surtaxe progressive de 2 % à 6 % peut frapper les plus-values immobilières imposables supérieures à 50 000 €, selon ses règles d’assiette et de lissage. Le notaire calcule et acquitte habituellement l’impôt lors de la vente ; ne raisonnez pas uniquement sur 36,2 % de la plus-value brute."
      ]
    },
    {
      "kind": "quiz",
      "questions": [
        {
          "q": "Quelle occupation peut ouvrir l’exonération de résidence principale ?",
          "options": [
            "Une adresse purement fictive",
            "Un logement loué à l’année à un tiers",
            "Une occupation effective et habituelle",
            "Un simple projet d’emménagement"
          ],
          "answer": 2,
          "explain": "Une occupation effective et habituelle."
        },
        {
          "q": "Après combien de temps l’exonération de prélèvements sociaux est-elle totale ?",
          "options": [
            "Vingt-deux ans",
            "Cinq ans",
            "Quinze ans",
            "Trente ans"
          ],
          "answer": 3,
          "explain": "Trente ans."
        }
      ]
    },
    {
      "kind": "page",
      "title": "Détenir et déclarer l’IFI",
      "body": [
        "L’IFI concerne les foyers dont le patrimoine immobilier net taxable dépasse 1,3 million d’euros au 1er janvier. Le barème commence à 800 000 € une fois le seuil d’assujettissement franchi. Les parts de sociétés peuvent entrer dans l’assiette pour leur fraction immobilière taxable.",
        "La résidence principale détenue directement bénéficie en principe d’un abattement de 30 %. Les dettes ne sont déductibles que sous conditions et certains actifs professionnels peuvent être exonérés. Ne déduisez pas automatiquement tous les emprunts personnels."
      ]
    },
    {
      "kind": "page",
      "title": "Les revenus fonciers",
      "body": [
        "La location nue relève généralement des revenus fonciers. Le micro-foncier est en principe accessible jusqu’à 15 000 € de recettes brutes annuelles du foyer, sous réserve d’exclusions ; il applique un abattement de 30 % sans déduction supplémentaire des charges réelles.",
        "Au réel, les charges admises et justifiées sont déduites : intérêts, certaines dépenses d’entretien ou de réparation, assurances et impôts éligibles. Les travaux de construction, reconstruction ou agrandissement ne sont pas des charges foncières ordinaires déductibles."
      ]
    },
    {
      "kind": "page",
      "title": "Choisir le régime réel",
      "body": [
        "L’option pour le réel engage en principe pour trois ans. Comparez les charges admissibles à l’abattement micro, sans supposer que tout paiement constitue une charge. Le remboursement du capital d’emprunt n’est pas déductible des revenus fonciers.",
        "Le déficit foncier hors intérêts peut, en principe, s’imputer sur le revenu global dans la limite de 10 700 € par an, sous conditions de location ; des dispositifs temporaires particuliers existent. Les intérêts et surplus obéissent à des règles de report distinctes."
      ]
    },
    {
      "kind": "page",
      "title": "Le LMNP en bref",
      "body": [
        "La location meublée relève des BIC, non des revenus fonciers. Le caractère professionnel suppose notamment des recettes annuelles supérieures à 23 000 € et supérieures aux autres revenus d’activité du foyer retenus légalement ; à défaut, l’activité est en principe non professionnelle.",
        "Au réel, charges et amortissements suivent des règles spécifiques. Depuis les cessions du 15 février 2025, les amortissements fiscalement déduits minorent en principe le prix d’acquisition pour la plus-value LMNP, avec exceptions légales pour certaines résidences. Les meublés touristiques ont des règles micro distinctes : vérifiez activité et année."
      ]
    },
    {
      "kind": "quiz",
      "questions": [
        {
          "q": "Quelle catégorie fiscale concerne la location meublée ?",
          "options": [
            "Les bénéfices industriels et commerciaux",
            "Les revenus fonciers systématiquement",
            "Les salaires",
            "Les plus-values mobilières"
          ],
          "answer": 0,
          "explain": "Les bénéfices industriels et commerciaux."
        },
        {
          "q": "Le capital remboursé à la banque est-il une charge foncière déductible ?",
          "options": [
            "Oui, intégralement",
            "Non, contrairement aux intérêts admissibles",
            "Oui, en micro en plus des 30 %",
            "Oui, seulement la première année"
          ],
          "answer": 1,
          "explain": "Non, contrairement aux intérêts admissibles."
        }
      ]
    }
  ],
  "final": [
    {
      "q": "Que doit vérifier un acquéreur face à une hausse des droits départementaux ?",
      "options": [
        "Uniquement le taux national de TVA",
        "Le taux local et les éventuelles conditions d’exclusion",
        "La profession du voisin",
        "Le nombre de visites"
      ],
      "answer": 1,
      "explain": "Le taux local et les éventuelles conditions d’exclusion."
    },
    {
      "q": "Que recouvrent les débours du notaire ?",
      "options": [
        "Uniquement son bénéfice",
        "Les intérêts du prêt sur vingt ans",
        "Des sommes avancées pour les démarches et intervenants du dossier",
        "Le prix du mobilier"
      ],
      "answer": 2,
      "explain": "Des sommes avancées pour les démarches et intervenants du dossier."
    },
    {
      "q": "Quel taux normal concerne le neuf soumis à TVA sans régime réduit ?",
      "options": [
        "5 %",
        "7,5 %",
        "30 %",
        "20 %"
      ],
      "answer": 3,
      "explain": "20 %."
    },
    {
      "q": "Quel forfait de frais d’acquisition peut être utilisé pour une acquisition à titre onéreux ?",
      "options": [
        "7,5 % sous conditions",
        "30 % systématiquement",
        "50 % après cinq ans",
        "1,3 %"
      ],
      "answer": 0,
      "explain": "7,5 % sous conditions."
    },
    {
      "q": "Quel forfait travaux peut concerner un bâti détenu depuis plus de cinq ans ?",
      "options": [
        "6 % chaque année",
        "15 % sous les conditions légales",
        "30 % du loyer",
        "20 % du prix de vente sans condition"
      ],
      "answer": 1,
      "explain": "15 % sous les conditions légales."
    },
    {
      "q": "L’exonération de résidence principale repose-t-elle sur la seule domiciliation postale ?",
      "options": [
        "Oui, sans contrôle",
        "Oui, après une semaine",
        "Non, la réalité de l’occupation est déterminante",
        "Oui, si le crédit est remboursé"
      ],
      "answer": 2,
      "explain": "Non, la réalité de l’occupation est déterminante."
    },
    {
      "q": "Quel abattement annuel IR s’applique de la sixième à la vingt-et-unième année ?",
      "options": [
        "9 %",
        "1,65 %",
        "30 %",
        "6 %"
      ],
      "answer": 3,
      "explain": "6 %."
    },
    {
      "q": "À quelle échéance l’exonération totale d’IR pour durée de détention est-elle acquise ?",
      "options": [
        "Vingt-deux ans",
        "Trente ans",
        "Dix ans",
        "Cinquante ans"
      ],
      "answer": 0,
      "explain": "Vingt-deux ans."
    },
    {
      "q": "Quel risque existe au-delà de 50 000 € de plus-value imposable ?",
      "options": [
        "Une exonération automatique",
        "Une surtaxe immobilière selon ses conditions",
        "Une TVA obligatoire du particulier",
        "Un IFI sur le prix de vente seul"
      ],
      "answer": 1,
      "explain": "Une surtaxe immobilière selon ses conditions."
    },
    {
      "q": "Quel seuil net taxable déclenche en principe l’IFI ?",
      "options": [
        "800 000 € dans tous les cas",
        "150 000 €",
        "Plus de 1,3 million d’euros",
        "23 000 €"
      ],
      "answer": 2,
      "explain": "Plus de 1,3 million d’euros."
    },
    {
      "q": "Quel abattement caractérise le micro-foncier ?",
      "options": [
        "50 % pour toute location nue",
        "15 % plus tous les travaux",
        "Aucun abattement",
        "30 % sans déduction des charges réelles en plus"
      ],
      "answer": 3,
      "explain": "30 % sans déduction des charges réelles en plus."
    },
    {
      "q": "Quel changement affecte en principe la revente LMNP au réel depuis février 2025 ?",
      "options": [
        "Les amortissements déduits augmentent la plus-value via le prix d’acquisition corrigé",
        "Toute plus-value est exonérée",
        "La vente relève toujours de la TVA",
        "La détention ne procure plus aucun abattement"
      ],
      "answer": 0,
      "explain": "Les amortissements déduits augmentent la plus-value via le prix d’acquisition corrigé."
    }
  ]
};
