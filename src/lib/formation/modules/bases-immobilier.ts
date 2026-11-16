import type { FormationModule } from "../types";

export const module: FormationModule = {
  "slug": "bases-immobilier",
  "title": "Les bases de l'immobilier",
  "summary": "Identifier les acteurs, les biens et les droits, comprendre le marché et suivre les étapes d’une vente.",
  "minutes": 60,
  "steps": [
    {
      "kind": "page",
      "title": "Un projet, plusieurs acteurs",
      "body": [
        "Une transaction rapproche un vendeur et un acquéreur autour d’un bien, d’un prix et de conditions. Le vendeur doit pouvoir disposer du bien et transmettre les informations nécessaires ; l’acquéreur précise son projet, son budget et son financement.",
        "L’agent immobilier facilite cette rencontre dans les limites de son mandat. Il vérifie les informations utiles, conseille et coordonne, sans remplacer le notaire, la banque ni les spécialistes techniques."
      ]
    },
    {
      "kind": "page",
      "title": "Notaire et financement",
      "body": [
        "Le notaire est un officier public : il sécurise juridiquement la vente, vérifie notamment les droits du vendeur, établit l’acte authentique et accomplit les formalités de publicité foncière. Chaque partie peut choisir son notaire ; l’intervention de deux notaires ne double pas les émoluments réglementés de l’acte.",
        "La banque étudie la solvabilité et décide d’accorder ou non un prêt. Une simulation ou un accord de principe ne garantit pas une offre de prêt. Le budget doit inclure les frais d’acquisition, les travaux, les garanties du crédit et une marge de sécurité."
      ]
    },
    {
      "kind": "page",
      "title": "Experts et copropriété",
      "body": [
        "Le diagnostiqueur réalise les diagnostics relevant de ses compétences, avec les certifications et assurances requises. Ses constats informent sur certains risques ou performances : ils ne constituent pas une expertise exhaustive du bâtiment.",
        "En copropriété, le syndic administre l’immeuble et exécute les décisions d’assemblée générale. Le syndicat des copropriétaires réunit les copropriétaires ; le conseil syndical assiste et contrôle le syndic. Ces trois acteurs ne se confondent pas."
      ]
    },
    {
      "kind": "quiz",
      "questions": [
        {
          "q": "Qui authentifie la vente immobilière ?",
          "options": [
            "La banque",
            "Le notaire",
            "Le diagnostiqueur",
            "Le conseil syndical"
          ],
          "answer": 1,
          "explain": "Le notaire reçoit l’acte authentique et assure les formalités de la vente."
        },
        {
          "q": "Quel rôle appartient au syndic ?",
          "options": [
            "Fixer les taux de crédit",
            "Certifier tous les diagnostics",
            "Acheter les lots invendus",
            "Administrer la copropriété et exécuter ses décisions"
          ],
          "answer": 3,
          "explain": "Le syndic assure la gestion de la copropriété et met en œuvre les décisions collectives."
        }
      ]
    },
    {
      "kind": "page",
      "title": "Reconnaître les biens",
      "body": [
        "Une maison, un appartement, un terrain ou un local professionnel répondent à des usages différents. Un appartement peut être vendu avec une cave et un stationnement constituant des lots distincts. Vérifier la désignation au titre évite d’attribuer au vendeur un espace qui ne lui appartient pas.",
        "Pour un terrain, la constructibilité se vérifie notamment dans les règles d’urbanisme et les servitudes. La présence de réseaux à proximité ne garantit ni la viabilisation ni le droit de construire le projet souhaité."
      ]
    },
    {
      "kind": "page",
      "title": "Ancien, neuf et occupation",
      "body": [
        "Un bien ancien et une vente en l’état futur d’achèvement ne suivent pas exactement les mêmes règles. En VEFA, l’acquéreur achète un bien à construire, avec un contrat, des garanties et des paiements réglementés liés à l’avancement.",
        "Un logement peut être libre, occupé par son propriétaire ou loué. Acheter un logement loué ne met pas automatiquement fin au bail. L’occupation influence la disponibilité, les droits du locataire et parfois le prix ; elle doit être étudiée avant toute promesse."
      ]
    },
    {
      "kind": "page",
      "title": "Lire le marché local",
      "body": [
        "Le prix se construit à l’échelle d’un secteur et d’un segment : emplacement, surface, état, étage, extérieur, énergie et copropriété comptent. Une moyenne communale ne suffit pas pour estimer un appartement précis.",
        "Comparer les transactions effectivement réalisées, notamment grâce aux données de mutations disponibles, puis les rapprocher des biens concurrents. Les annonces indiquent des prix demandés, pas nécessairement les prix signés ; les données de vente ont aussi leurs délais et limites."
      ]
    },
    {
      "kind": "quiz",
      "questions": [
        {
          "q": "Que représente généralement un prix d’annonce ?",
          "options": [
            "Un prix demandé",
            "Un prix authentifié",
            "Une valeur fiscale obligatoire",
            "Un financement accordé"
          ],
          "answer": 0,
          "explain": "Le prix demandé peut différer du prix finalement négocié et signé."
        },
        {
          "q": "Un terrain proche des réseaux est-il nécessairement constructible ?",
          "options": [
            "Oui, sans formalité",
            "Oui, si le vendeur le dit",
            "Non, les règles et contraintes doivent être vérifiées",
            "Oui, dès qu’il est cadastré"
          ],
          "answer": 2,
          "explain": "La proximité des réseaux ne remplace pas l’examen des règles d’urbanisme et des servitudes."
        }
      ]
    },
    {
      "kind": "page",
      "title": "La pleine propriété",
      "body": [
        "La propriété permet d’utiliser un bien, d’en percevoir les revenus et d’en disposer, dans les limites légales. Les règles d’urbanisme, les servitudes, le voisinage ou un bail peuvent restreindre son usage sans supprimer le droit de propriété.",
        "Le titre et les vérifications notariales permettent d’identifier les droits transmis. Le cadastre sert principalement à l’identification parcellaire et à la fiscalité : il ne suffit pas, à lui seul, à prouver la propriété ou fixer une limite contestée."
      ]
    },
    {
      "kind": "page",
      "title": "Comprendre la copropriété",
      "body": [
        "Un lot de copropriété associe une partie privative et une quote-part de parties communes. Le règlement de copropriété précise la destination de l’immeuble, les conditions d’usage et la répartition des charges ; l’état descriptif de division identifie les lots.",
        "Les décisions collectives sont prises en assemblée générale selon les majorités applicables. Avant d’acheter, examiner les charges, travaux et procédures : un prix attractif peut masquer des dépenses collectives importantes."
      ]
    },
    {
      "kind": "page",
      "title": "Usufruit et indivision",
      "body": [
        "L’usufruitier peut utiliser le bien et en percevoir les revenus ; le nu-propriétaire détient la propriété privée de ces prérogatives. Pour vendre ensemble la pleine propriété, leurs accords sont en principe nécessaires. La répartition des frais dépend des règles et conventions applicables.",
        "En indivision, plusieurs personnes détiennent des quotes-parts d’un même bien, sans division matérielle automatique. La vente amiable du bien entier exige en principe l’accord de tous, sous réserve des mécanismes légaux et judiciaires : une majorité de quotes-parts ne suffit pas toujours."
      ]
    },
    {
      "kind": "quiz",
      "questions": [
        {
          "q": "Que détient un copropriétaire avec son lot ?",
          "options": [
            "Tout l’immeuble",
            "Une simple autorisation d’occuper",
            "Une partie privative et une quote-part de parties communes",
            "Seulement des parties communes"
          ],
          "answer": 2,
          "explain": "Un lot comprend une partie privative et une quote-part de parties communes."
        },
        {
          "q": "Qui perçoit normalement les loyers d’un bien démembré ?",
          "options": [
            "Le nu-propriétaire seul",
            "L’usufruitier",
            "Le géomètre",
            "Le syndic"
          ],
          "answer": 1,
          "explain": "L’usufruit comprend le droit de percevoir les revenus du bien."
        }
      ]
    },
    {
      "kind": "page",
      "title": "Préparer et commercialiser",
      "body": [
        "Le cycle commence par la clarification du projet, l’analyse du titre, l’estimation et la collecte des pièces. L’agent reçoit un mandat écrit avant d’agir pour son client. Les diagnostics et informations utiles doivent être anticipés, pas découverts à la signature.",
        "Viennent ensuite l’annonce exacte, les demandes, les visites et les retours. Une offre d’achat précise notamment le bien, le prix et sa durée ; sa portée juridique dépend de son contenu et de son acceptation, ce qui impose de ne pas traiter ce document comme une simple réservation."
      ]
    },
    {
      "kind": "page",
      "title": "De l’accord à l’acte",
      "body": [
        "L’avant-contrat organise les engagements, les délais et les conditions suspensives. Pour l’acquéreur non professionnel d’un logement, un délai légal de rétractation s’applique dans les conditions prévues par les textes. Le financement et les vérifications notariales se poursuivent ensuite.",
        "À l’acte authentique, le prix est payé selon les modalités prévues et la remise des clés intervient généralement. Le transfert de propriété, l’entrée en jouissance et les éventuels différés doivent être lus dans les actes plutôt que supposés."
      ]
    },
    {
      "kind": "page",
      "title": "Raisonner en coût global",
      "body": [
        "Le coût d’achat ne se limite pas au prix affiché : frais d’acquisition, honoraires selon leur répartition, crédit, déménagement et travaux peuvent s’ajouter. Après l’achat, intégrer les charges, assurances, impôts et dépenses d’entretien.",
        "Un bon réflexe consiste à relier chaque question au bon interlocuteur : le notaire pour les droits et l’acte, la banque pour le crédit, le diagnostiqueur pour ses constats et le syndic pour les informations de copropriété. L’agent organise leur circulation sans garantir ce qu’il ne maîtrise pas."
      ]
    },
    {
      "kind": "quiz",
      "questions": [
        {
          "q": "Quand l’agent doit-il disposer d’un mandat écrit pour agir ?",
          "options": [
            "Seulement après la vente",
            "À la remise des clés",
            "Uniquement si un prêt est demandé",
            "Avant d’entreprendre sa mission"
          ],
          "answer": 3,
          "explain": "Le mandat écrit préalable encadre les pouvoirs et la rémunération de l’agent."
        },
        {
          "q": "Quel budget est le plus prudent ?",
          "options": [
            "Prix et frais annexes prévisibles",
            "Prix affiché seul",
            "Apport seul",
            "Mensualité du premier mois seule"
          ],
          "answer": 0,
          "explain": "Le financement doit intégrer l’ensemble des coûts prévisibles de l’opération."
        }
      ]
    }
  ],
  "final": [
    {
      "q": "Un acquéreur pense que le conseiller bancaire garantit la légalité du titre : que préciser ?",
      "options": [
        "C’est toujours exact",
        "Le syndic le garantit",
        "Cette vérification relève notamment du notaire",
        "Aucune vérification n’existe"
      ],
      "answer": 2,
      "explain": "Le notaire vérifie les droits transmis tandis que la banque étudie le financement."
    },
    {
      "q": "Le vendeur présente une simulation de prêt de son acheteur : quelle conclusion tirer ?",
      "options": [
        "La vente est financée définitivement",
        "Le financement reste à confirmer par la banque",
        "Le prix est déjà payé",
        "La rétractation disparaît"
      ],
      "answer": 1,
      "explain": "Une simulation ne constitue pas une offre de prêt ferme."
    },
    {
      "q": "Que permet principalement un diagnostic immobilier ?",
      "options": [
        "Informer sur son périmètre précis",
        "Garantir tout le gros œuvre",
        "Assurer la hausse du prix",
        "Dispenser de visiter"
      ],
      "answer": 0,
      "explain": "Chaque diagnostic répond à un objet limité et ne remplace pas une expertise générale."
    },
    {
      "q": "À qui appartient le syndicat des copropriétaires ?",
      "options": [
        "Au notaire",
        "À la banque",
        "Au syndic seul",
        "Il réunit l’ensemble des copropriétaires"
      ],
      "answer": 3,
      "explain": "Le syndicat est la collectivité des copropriétaires, distincte de son syndic."
    },
    {
      "q": "Une cave utilisée par le vendeur est proposée avec le logement : que vérifier ?",
      "options": [
        "Sa décoration",
        "Sa désignation et les droits au titre",
        "Le seul souvenir du voisin",
        "Uniquement la serrure"
      ],
      "answer": 1,
      "explain": "L’usage matériel d’une cave ne prouve pas qu’elle appartient au vendeur."
    },
    {
      "q": "L’acquéreur d’un logement loué souhaite entrer dès la vente : quel réflexe ?",
      "options": [
        "Promettre le départ du locataire",
        "Changer les serrures",
        "Étudier le bail et les droits du locataire",
        "Supprimer le bail dans l’annonce"
      ],
      "answer": 2,
      "explain": "La vente d’un logement occupé ne met pas automatiquement fin au bail."
    },
    {
      "q": "Quelle comparaison est la plus pertinente pour estimer ?",
      "options": [
        "Des ventes récentes de biens comparables du secteur",
        "Le bien le plus cher du département",
        "Une moyenne nationale seule",
        "Le besoin financier du vendeur seul"
      ],
      "answer": 0,
      "explain": "Les références locales comparables permettent une estimation argumentée."
    },
    {
      "q": "Le plan cadastral suffit-il pour régler une limite litigieuse ?",
      "options": [
        "Oui dans tous les cas",
        "Oui si imprimé en couleur",
        "Oui avec une annonce",
        "Non, il faut examiner les titres et, si nécessaire, un bornage"
      ],
      "answer": 3,
      "explain": "Le cadastre ne fixe pas à lui seul une limite de propriété contestée."
    },
    {
      "q": "Quel document précise les conditions d’usage en copropriété ?",
      "options": [
        "Le relevé bancaire du vendeur",
        "Le règlement de copropriété",
        "Le catalogue de l’agence",
        "Le contrat internet"
      ],
      "answer": 1,
      "explain": "Le règlement de copropriété encadre la destination et l’usage des parties de l’immeuble."
    },
    {
      "q": "Deux personnes ont chacune la moitié indivise : que possèdent-elles ?",
      "options": [
        "Chacune un étage déterminé automatiquement",
        "Chacune une seule pièce",
        "Des quotes-parts de droits sur le même bien",
        "Uniquement le droit de louer"
      ],
      "answer": 2,
      "explain": "Une quote-part indivise ne correspond pas automatiquement à une partie matérielle du bien."
    },
    {
      "q": "Pour vendre la pleine propriété démembrée, quel accord rechercher en principe ?",
      "options": [
        "Celui du seul syndic",
        "Celui de la banque uniquement",
        "Celui d’un voisin",
        "Celui de l’usufruitier et du nu-propriétaire"
      ],
      "answer": 3,
      "explain": "La cession de la pleine propriété implique en principe l’accord des titulaires des droits réunis."
    },
    {
      "q": "À quoi sert principalement l’avant-contrat ?",
      "options": [
        "Organiser les engagements et conditions de la vente",
        "Remplacer tous les diagnostics",
        "Supprimer le financement",
        "Éviter toute intervention notariale"
      ],
      "answer": 0,
      "explain": "L’avant-contrat fixe les engagements et le cadre de réalisation de la vente."
    }
  ]
};
