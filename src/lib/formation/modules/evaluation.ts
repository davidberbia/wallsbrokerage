import type { FormationModule } from "../types";

export const module: FormationModule = {
  "slug": "evaluation",
  "title": "Évaluation d’un bien et d’un actif",
  "summary": "Construire une estimation documentée, comparer les méthodes et expliciter les hypothèses.",
  "minutes": 55,
  "steps": [
    {
      "kind": "page",
      "title": "Définir la mission",
      "body": [
        "Commencez par identifier le bien, les droits évalués, la date de valeur et la finalité : vente, succession, financement ou arbitrage. La valeur de marché n’est ni le prix souhaité par le propriétaire ni le montant de son crédit restant.",
        "Précisez si le bien est libre ou occupé et si l’estimation porte sur la pleine propriété, un usufruit ou des parts. Une visite, les titres et les documents techniques réduisent l’incertitude ; les pièces manquantes doivent être signalées."
      ]
    },
    {
      "kind": "page",
      "title": "Décrire avant de chiffrer",
      "body": [
        "Relevez localisation, étage, orientation, état, distribution, extérieur, nuisances et performance énergétique. Contrôlez l’urbanisme, la copropriété, les travaux votés et les servitudes à partir des documents accessibles. Une surface déclarée ne remplace pas un mesurage adapté.",
        "La surface habitable et la superficie privative Carrez répondent à des définitions différentes. Pour un commerce, la surface utile ou pondérée doit être définie ; un sous-sol ne vaut pas nécessairement un espace de vente sur rue."
      ]
    },
    {
      "kind": "page",
      "title": "Comparer des ventes",
      "body": [
        "La comparaison rapproche le bien de transactions récentes réellement comparables. Sélectionnez plusieurs références dans un secteur cohérent, puis expliquez les ajustements de date, d’état, de surface, d’étage ou d’occupation.",
        "Évitez une moyenne aveugle de biens hétérogènes. Un prix affiché est une prétention, un prix signé est un résultat. Les ventes atypiques, familiales ou comprenant plusieurs lots peuvent fausser l’échantillon."
      ]
    },
    {
      "kind": "page",
      "title": "Lire DVF",
      "body": [
        "DVF diffuse des données de mutations issues des actes et du cadastre, avec un décalage de publication. La base n’offre pas une couverture intégrale du territoire : l’Alsace-Moselle et Mayotte demandent notamment d’autres sources.",
        "Une mutation peut regrouper plusieurs parcelles, locaux ou dépendances pour une valeur globale. Les lignes ne correspondent pas toujours à des ventes indépendantes. DVF ne décrit pas suffisamment l’état intérieur, l’occupation ou les travaux : recoupez avec d’autres sources."
      ]
    },
    {
      "kind": "quiz",
      "questions": [
        {
          "q": "Quelle information faut-il fixer dès la mission ?",
          "options": [
            "La date de valeur et les droits évalués",
            "Le seul prix rêvé du vendeur",
            "Le taux du crédit du voisin",
            "Le futur bénéfice garanti"
          ],
          "answer": 0,
          "explain": "La date de valeur et les droits évalués."
        },
        {
          "q": "Une ligne DVF correspond-elle toujours à un logement vendu seul ?",
          "options": [
            "Oui, sans exception",
            "Non, la mutation peut regrouper plusieurs éléments",
            "Oui, si le prix est élevé",
            "Oui, hors copropriété"
          ],
          "answer": 1,
          "explain": "Non, la mutation peut regrouper plusieurs éléments."
        }
      ]
    },
    {
      "kind": "page",
      "title": "Maîtriser le prix au m²",
      "body": [
        "Un prix au mètre carré n’a de sens qu’avec une surface et un périmètre de prix définis. Distinguez appartement, parking, cave et terrain ; ne divisez pas le prix global par une surface partielle sans correction.",
        "Exemple : un appartement seul vaut 240 000 € pour 60 m², soit 4 000 €/m². Si le prix inclut aussi un parking valorisé 20 000 €, isolez cette composante avant de comparer l’appartement à des références sans stationnement."
      ]
    },
    {
      "kind": "page",
      "title": "Clarifier le prix retenu",
      "body": [
        "Distinguez prix net vendeur, honoraires de commercialisation, droits et frais d’acquisition. « Acte en main » vise usuellement un coût intégrant les frais d’acquisition ; il faut néanmoins détailler contractuellement les postes inclus.",
        "« Droits inclus » ne garantit pas que les honoraires d’agence, frais bancaires et travaux soient compris. Présentez un tableau de passage entre prix et coût total plutôt que d’utiliser ces expressions sans définition."
      ]
    },
    {
      "kind": "page",
      "title": "Estimer la valeur locative",
      "body": [
        "La valeur locative de marché est le loyer qu’un bien pourrait raisonnablement obtenir à une date donnée sous des conditions de bail définies. Elle peut différer du loyer en place, trop ancien, plafonné ou temporairement réduit.",
        "Comparez des loyers homogènes : hors charges ou charges comprises, hors taxes ou taxes comprises, au mois ou à l’année. Pour un commerce, intégrez destination, emplacement, surface pondérée et répartition des travaux entre bailleur et preneur."
      ]
    },
    {
      "kind": "page",
      "title": "Le rendement brut",
      "body": [
        "Le rendement brut rapporte le loyer annuel hors charges au prix retenu. Précisez toujours le dénominateur : prix seul ou coût total d’acquisition. Le calcul ignore notamment vacance, entretien, impôts du propriétaire et financement.",
        "Avec 12 000 € de loyer annuel et un prix de 240 000 €, le rendement brut sur prix est de 5 %. Si le coût total atteint 260 000 €, il n’est plus que d’environ 4,62 % sur ce coût."
      ]
    },
    {
      "kind": "quiz",
      "questions": [
        {
          "q": "Que faut-il préciser avec un rendement brut ?",
          "options": [
            "Seulement le nom du propriétaire",
            "Seulement la mensualité",
            "Le loyer et le périmètre du prix utilisé",
            "La couleur de la façade"
          ],
          "answer": 2,
          "explain": "Le loyer et le périmètre du prix utilisé."
        },
        {
          "q": "La valeur locative est-elle toujours le loyer actuel ?",
          "options": [
            "Oui, par définition",
            "Oui, après un mois de bail",
            "Oui, si le locataire paie",
            "Non, elle vise un loyer de marché sous hypothèses"
          ],
          "answer": 3,
          "explain": "Non, elle vise un loyer de marché sous hypothèses."
        }
      ]
    },
    {
      "kind": "page",
      "title": "Passer au revenu net",
      "body": [
        "Le revenu net immobilier retranche du loyer les charges restant au propriétaire : taxe foncière non récupérable, assurance, gestion, entretien et provision réaliste de vacance selon la convention annoncée. Évitez de compter deux fois une même dépense.",
        "Le rendement net avant financement et fiscalité personnelle n’est pas le flux de trésorerie après crédit. Présentez séparément service de la dette, impôt sur les revenus et travaux exceptionnels pour ne pas mélanger performance de l’actif et situation de l’investisseur."
      ]
    },
    {
      "kind": "page",
      "title": "Capitaliser le revenu",
      "body": [
        "La capitalisation estime une valeur par V = revenu annuel stabilisé / taux de capitalisation. Le revenu et le taux doivent partager la même convention : net avec net, brut avec brut. Le taux résulte du marché et du risque, pas du rendement souhaité.",
        "Un revenu net de 18 000 € capitalisé à 6 % donne 300 000 €. À revenu constant, une hausse du taux diminue la valeur. Qualité du locataire, durée du bail, liquidité et travaux influencent l’analyse du risque."
      ]
    },
    {
      "kind": "page",
      "title": "Tester les hypothèses",
      "body": [
        "Confrontez comparaison et capitalisation sans les moyenner mécaniquement. Un écart peut révéler un loyer surévalué, un bail défavorable, des références mal choisies ou un programme de travaux oublié.",
        "Testez plusieurs loyers, taux et scénarios de vacance. Un taux de rendement interne exige des flux datés et une hypothèse de revente ; il ne se confond pas avec un rendement annuel simple. Présentez l’incertitude sous forme de fourchette."
      ]
    },
    {
      "kind": "page",
      "title": "Rédiger l’avis de valeur",
      "body": [
        "Un avis de valeur argumenté expose mission, date, description, sources, références, méthodes, ajustements et conclusion. Il indique la fourchette puis, si utile, une valeur centrale, ainsi que les réserves et documents non obtenus.",
        "Un avis commercial ne doit pas être présenté abusivement comme une expertise indépendante certifiée. Expliquez les limites et les conflits d’intérêts éventuels. Actualisez l’analyse si le marché, l’état du bien ou la situation locative évolue."
      ]
    },
    {
      "kind": "quiz",
      "questions": [
        {
          "q": "Quelle formule décrit la capitalisation simple ?",
          "options": [
            "Revenu annuel stabilisé divisé par le taux",
            "Prix divisé par la surface seulement",
            "Loyer mensuel multiplié par le taux",
            "Prix plus capital emprunté"
          ],
          "answer": 0,
          "explain": "Revenu annuel stabilisé divisé par le taux."
        },
        {
          "q": "Que faire si deux méthodes donnent des résultats éloignés ?",
          "options": [
            "Faire obligatoirement la moyenne",
            "Rechercher les causes et revoir les hypothèses",
            "Retenir toujours la plus haute",
            "Effacer les références"
          ],
          "answer": 1,
          "explain": "Rechercher les causes et revoir les hypothèses."
        }
      ]
    }
  ],
  "final": [
    {
      "q": "Quel prix ne constitue pas à lui seul une valeur de marché ?",
      "options": [
        "Un prix issu de comparables ajustés",
        "Le montant du crédit restant à rembourser",
        "Une conclusion justifiée à date",
        "Une valeur fondée sur les droits transmis"
      ],
      "answer": 1,
      "explain": "Le montant du crédit restant à rembourser."
    },
    {
      "q": "Quelle confusion de surface faut-il éviter ?",
      "options": [
        "Mentionner le mesurage utilisé",
        "Décrire les annexes séparément",
        "Assimiler automatiquement Carrez et surface habitable",
        "Identifier la surface pondérée"
      ],
      "answer": 2,
      "explain": "Assimiler automatiquement Carrez et surface habitable."
    },
    {
      "q": "Quelle référence exige un ajustement particulier ?",
      "options": [
        "Une vente récente identique documentée",
        "Un lot de même état au même étage",
        "Un prix signé de même périmètre",
        "Une vente ancienne dans un marché ayant changé"
      ],
      "answer": 3,
      "explain": "Une vente ancienne dans un marché ayant changé."
    },
    {
      "q": "Quelle limite de DVF impose des vérifications ?",
      "options": [
        "La description insuffisante de l’état intérieur",
        "La présence de photos certifiées systématiques",
        "La garantie du loyer futur",
        "L’expertise technique automatique"
      ],
      "answer": 0,
      "explain": "La description insuffisante de l’état intérieur."
    },
    {
      "q": "Un prix de 300 000 € inclut un parking de 30 000 € ; quelle base pour le logement ?",
      "options": [
        "330 000 €",
        "270 000 € avant division par sa surface",
        "300 000 € obligatoirement",
        "30 000 €"
      ],
      "answer": 1,
      "explain": "270 000 € avant division par sa surface."
    },
    {
      "q": "Que faire d’un prix annoncé droits inclus ?",
      "options": [
        "Supposer tous les travaux compris",
        "Supprimer les frais bancaires du budget",
        "Demander la liste exacte des coûts compris",
        "Le traiter comme net vendeur"
      ],
      "answer": 2,
      "explain": "Demander la liste exacte des coûts compris."
    },
    {
      "q": "Comment comparer deux loyers commerciaux ?",
      "options": [
        "Comparer uniquement les montants mensuels",
        "Ignorer la destination",
        "Retenir seulement le plus élevé",
        "Harmoniser taxes, charges, surfaces et conditions de bail"
      ],
      "answer": 3,
      "explain": "Harmoniser taxes, charges, surfaces et conditions de bail."
    },
    {
      "q": "Quel rendement brut pour 9 000 € annuels et 180 000 € de prix ?",
      "options": [
        "5 %",
        "2 %",
        "20 %",
        "0,5 %"
      ],
      "answer": 0,
      "explain": "5 %."
    },
    {
      "q": "Quel poste réduit normalement le revenu net du bailleur ?",
      "options": [
        "Le dépôt de garantie conservé en compte",
        "Une charge de gestion restant à sa charge",
        "Le capital emprunté à l’origine",
        "Une charge intégralement récupérée sans coût résiduel"
      ],
      "answer": 1,
      "explain": "Une charge de gestion restant à sa charge."
    },
    {
      "q": "Quelle valeur pour 24 000 € nets capitalisés à 8 % ?",
      "options": [
        "192 000 €",
        "3 000 000 €",
        "300 000 €",
        "30 000 €"
      ],
      "answer": 2,
      "explain": "300 000 €."
    },
    {
      "q": "À revenu constant, que produit une hausse du taux de capitalisation ?",
      "options": [
        "Une hausse mécanique de valeur",
        "Aucun effet possible",
        "Une hausse automatique du loyer",
        "Une baisse de la valeur calculée"
      ],
      "answer": 3,
      "explain": "Une baisse de la valeur calculée."
    },
    {
      "q": "Quel élément doit figurer dans une conclusion professionnelle ?",
      "options": [
        "Les réserves et les principales hypothèses",
        "Une garantie de revente au prix exact",
        "Une promesse de rendement certain",
        "La suppression de toute incertitude"
      ],
      "answer": 0,
      "explain": "Les réserves et les principales hypothèses."
    }
  ]
};
