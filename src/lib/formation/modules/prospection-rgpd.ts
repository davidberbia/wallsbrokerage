import type { FormationModule } from "../types";

export const module: FormationModule = {
  "slug": "prospection-rgpd",
  "title": "Prospection, RGPD et démarchage",
  "summary": "Organiser une prospection licite et publier des annonces immobilières transparentes.",
  "minutes": 60,
  "steps": [
    {
      "kind": "page",
      "title": "Cartographier les données",
      "body": [
        "Un nom, un téléphone, une adresse électronique ou un identifiant de réseau social peut être une donnée personnelle. Une agence doit identifier ses traitements : prospects, clients, mandats, visites, candidatures et prestataires, avec des finalités précises.",
        "Collectez uniquement ce qui est utile, limitez les accès et documentez les traitements dans un registre adapté. Une donnée accessible publiquement ne devient pas librement réutilisable pour toute prospection."
      ]
    },
    {
      "kind": "page",
      "title": "Choisir la base légale",
      "body": [
        "Chaque traitement doit reposer sur une base légale : mesures précontractuelles demandées, contrat, obligation légale, intérêt légitime ou consentement selon le cas. L’intérêt légitime exige une analyse de nécessité et de mise en balance des droits.",
        "La base RGPD ne dispense jamais de respecter les règles propres au canal de prospection. Une agence ne peut pas invoquer son intérêt commercial pour contourner un consentement préalable imposé pour un appel ou un courriel."
      ]
    },
    {
      "kind": "page",
      "title": "Informer et prouver",
      "body": [
        "Au moment de la collecte directe, expliquez identité du responsable, finalités, base légale, destinataires, durée, droits et réclamation auprès de la CNIL. Si la donnée vient d’un tiers, l’information intervient dans les délais RGPD, au plus tard au premier contact si celui-ci intervient avant un mois.",
        "Un consentement doit être libre, spécifique, éclairé et univoque ; le retrait doit être simple. Conservez la preuve : date, formulaire, texte accepté, canal et périmètre des entreprises concernées. Une case précochée ou le silence ne suffit pas."
      ]
    },
    {
      "kind": "page",
      "title": "Conserver avec mesure",
      "body": [
        "La CNIL recommande généralement trois ans pour les données de prospects à compter de la collecte ou du dernier contact émanant du prospect. Une relance unilatérale de l’agence ne réinitialise pas ce délai. Les justificatifs contractuels ou légaux suivent d’autres durées.",
        "Traitez les demandes de droits en principe sous un mois, avec prolongation motivée possible pour les cas complexes. L’opposition à la prospection doit être respectée ; une liste repoussoir minimale évite de recontacter la personne sans conserver tout son dossier."
      ]
    },
    {
      "kind": "quiz",
      "questions": [
        {
          "q": "Une donnée publique peut-elle être réutilisée sans limite ?",
          "options": [
            "Non, RGPD et règles du canal restent applicables",
            "Oui, si elle est sur internet",
            "Oui, pour tout agent immobilier",
            "Oui, sans information"
          ],
          "answer": 0,
          "explain": "Non, RGPD et règles du canal restent applicables."
        },
        {
          "q": "Une case précochée vaut-elle consentement valable ?",
          "options": [
            "Oui, dans tous les formulaires",
            "Non, un acte positif est nécessaire",
            "Oui, après trois jours",
            "Oui, avec un logo"
          ],
          "answer": 1,
          "explain": "Non, un acte positif est nécessaire."
        }
      ]
    },
    {
      "kind": "page",
      "title": "Téléphoner avant août 2026",
      "body": [
        "Jusqu’au 10 août 2026, le régime général de prospection téléphonique des consommateurs repose notamment sur Bloctel et ses exceptions. Contrôlez les fichiers selon la fréquence réglementaire avant campagne ; un numéro publié dans une annonce n’écarte pas la protection.",
        "Les appels non sollicités autorisés sont encadrés : du lundi au vendredi, de 10 h à 13 h et de 14 h à 20 h, hors jours fériés ; au plus quatre sollicitations sur trente jours et, après refus, pas de nouveau contact pendant soixante jours. Vérifiez les exceptions applicables et les interdictions sectorielles."
      ]
    },
    {
      "kind": "page",
      "title": "Depuis le 11 août 2026",
      "body": [
        "À compter du 11 août 2026, le démarchage téléphonique commercial des consommateurs exige en principe leur consentement préalable. L’absence d’inscription à Bloctel ne suffit donc plus à autoriser un appel ; la preuve du consentement incombe au professionnel.",
        "Une exception vise notamment les sollicitations liées à l’exécution d’un contrat en cours et en rapport avec son objet, y compris des offres complémentaires pertinentes. Un ancien mandat terminé ou une simple visite ne constitue pas automatiquement un contrat en cours permettant toute prospection."
      ]
    },
    {
      "kind": "page",
      "title": "Courriels aux particuliers",
      "body": [
        "La prospection commerciale par courriel ou SMS auprès des particuliers exige en principe un consentement préalable. L’exception client existant concerne les coordonnées recueillies directement lors d’une vente ou prestation et des produits ou services analogues fournis par la même entreprise, avec opposition simple.",
        "Une demande d’estimation ou une création de compte ne suffit pas automatiquement à établir cette exception. Identifiez l’expéditeur, évitez les objets trompeurs et proposez un désabonnement simple et gratuit dans chaque message."
      ]
    },
    {
      "kind": "page",
      "title": "Courriels professionnels",
      "body": [
        "En B2B, une prospection vers une adresse professionnelle nominative peut reposer sur l’intérêt légitime si le message concerne la fonction de la personne. Informez-la et permettez une opposition simple dès la collecte et dans chaque sollicitation.",
        "Ne transformez pas une adresse professionnelle en permission pour une offre privée sans lien avec la fonction. Pour une liste achetée, auditez provenance, information, consentements lorsqu’ils sont requis et gestion des oppositions ; la facture du fournisseur ne prouve pas la conformité."
      ]
    },
    {
      "kind": "quiz",
      "questions": [
        {
          "q": "Quel principe vaut pour appeler un consommateur depuis le 11 août 2026 ?",
          "options": [
            "La seule absence sur Bloctel",
            "La publication de son numéro suffit",
            "Le consentement préalable, sauf exception légale",
            "Tout appel immobilier est libre"
          ],
          "answer": 2,
          "explain": "Le consentement préalable, sauf exception légale."
        },
        {
          "q": "Quelle prospection B2B peut relever de l’intérêt légitime ?",
          "options": [
            "Tout message privé sans rapport",
            "Toute campagne anonyme",
            "Toute offre malgré une opposition",
            "Un courriel professionnel lié à la fonction avec opposition simple"
          ],
          "answer": 3,
          "explain": "Un courriel professionnel lié à la fonction avec opposition simple."
        }
      ]
    },
    {
      "kind": "page",
      "title": "Boîtage et terrain",
      "body": [
        "Pour les imprimés publicitaires non adressés, respectez les mentions de refus de publicité telles que Stop Pub. Une distribution papier ne justifie ni dépôt sauvage ni collecte clandestine de renseignements sur les occupants.",
        "Un courrier nominatif mobilise des données personnelles et exige information et droit d’opposition. Le démarchage au domicile peut relever des contrats hors établissement : information préalable, rétractation de quatorze jours en principe et règles particulières sur les paiements doivent être vérifiées avant de faire signer un mandat."
      ]
    },
    {
      "kind": "page",
      "title": "Réseaux sociaux",
      "body": [
        "Séparez publication publique et message privé commercial. Les messageries sociales ne constituent pas un moyen de contourner les règles de prospection électronique ; appliquez les exigences correspondant au destinataire et au canal.",
        "Le moissonnage de profils publics nécessite une analyse juridique et une information adaptée. Évitez de déduire des données sensibles et contrôlez les paramétrages de ciblage. Obtenez les droits nécessaires pour publier des photos, témoignages ou images de personnes identifiables."
      ]
    },
    {
      "kind": "page",
      "title": "Une annonce transparente",
      "body": [
        "Une annonce professionnelle doit être loyale et identifier l’agence ; les annonces en ligne doivent permettre l’accès au barème. Pour une vente avec honoraires à la charge de l’acquéreur, affichez notamment les prix avec et sans honoraires, leur pourcentage TTC et le payeur.",
        "En copropriété, précisez notamment le statut, le nombre de lots, la quote-part annuelle du budget prévisionnel et les procédures légalement visées lorsqu’elles existent. Pour une location d’habitation, contrôlez loyer, charges, dépôt, honoraires, surface, commune et mentions propres à un éventuel encadrement local."
      ]
    },
    {
      "kind": "page",
      "title": "DPE et risques",
      "body": [
        "Pour les logements soumis au DPE, l’annonce indique les classes énergie et climat ainsi que l’estimation des dépenses annuelles d’énergie et les années de référence. Les logements F ou G portent la mention « logement à consommation énergétique excessive » ; respectez les présentations propres au support.",
        "Lorsque le bien relève de l’obligation d’information sur les risques, l’annonce comporte la mention d’accès à Géorisques. Vérifiez la validité du DPE et les obligations d’audit avant commercialisation ; une bonne note ne garantit pas l’absence de travaux. En métropole, un logement G est en principe non décent énergétiquement depuis 2025 pour les locations concernées."
      ]
    },
    {
      "kind": "quiz",
      "questions": [
        {
          "q": "Que faire face à Stop Pub pour un imprimé non adressé ?",
          "options": [
            "Respecter le refus de publicité",
            "Distribuer deux exemplaires",
            "Le masquer avec le prospectus",
            "Ignorer la mention pour les agences"
          ],
          "answer": 0,
          "explain": "Respecter le refus de publicité."
        },
        {
          "q": "Quelles classes doivent figurer pour un logement soumis au DPE ?",
          "options": [
            "Seulement le chauffage",
            "Énergie et climat",
            "Uniquement la surface",
            "Uniquement le montant des charges"
          ],
          "answer": 1,
          "explain": "Énergie et climat."
        }
      ]
    }
  ],
  "final": [
    {
      "q": "Quel outil structure les traitements de données de l’agence ?",
      "options": [
        "Une liste de mots de passe publique",
        "Un registre des traitements adapté",
        "Un fichier sans finalité",
        "Le seul agenda commercial"
      ],
      "answer": 1,
      "explain": "Un registre des traitements adapté."
    },
    {
      "q": "L’intérêt légitime écarte-t-il une obligation de consentement propre au canal ?",
      "options": [
        "Oui, toujours",
        "Oui, si la campagne est locale",
        "Non, les deux niveaux de règles doivent être respectés",
        "Oui, si la donnée est gratuite"
      ],
      "answer": 2,
      "explain": "Non, les deux niveaux de règles doivent être respectés."
    },
    {
      "q": "Quelle preuve est utile pour le consentement ?",
      "options": [
        "La seule affirmation du vendeur de fichiers",
        "Un numéro trouvé en ligne",
        "Une absence de plainte",
        "La date et le texte accepté avec son périmètre"
      ],
      "answer": 3,
      "explain": "La date et le texte accepté avec son périmètre."
    },
    {
      "q": "Quel événement peut réactualiser le délai recommandé d’un prospect ?",
      "options": [
        "Un nouveau contact émanant de lui",
        "Une relance automatique restée sans réponse",
        "Une exportation du fichier",
        "Un changement de logiciel"
      ],
      "answer": 0,
      "explain": "Un nouveau contact émanant de lui."
    },
    {
      "q": "Quel délai de principe s’applique à une demande de droits RGPD ?",
      "options": [
        "Trois ans",
        "Un mois",
        "Six mois sans justification",
        "Aucun délai"
      ],
      "answer": 1,
      "explain": "Un mois."
    },
    {
      "q": "Avant août 2026, quelle plage appartient aux horaires généraux autorisés ?",
      "options": [
        "Dimanche matin",
        "Samedi soir",
        "Mardi de 14 h à 20 h hors jour férié",
        "Lundi à 22 h"
      ],
      "answer": 2,
      "explain": "Mardi de 14 h à 20 h hors jour férié."
    },
    {
      "q": "Un mandat terminé autorise-t-il toutes les relances téléphoniques après la réforme ?",
      "options": [
        "Oui, sans limite",
        "Oui, pendant dix ans",
        "Oui, si le numéro est conservé",
        "Non, il ne suffit pas à établir l’exception du contrat en cours"
      ],
      "answer": 3,
      "explain": "Non, il ne suffit pas à établir l’exception du contrat en cours."
    },
    {
      "q": "Quelle condition accompagne l’exception client pour les courriels B2C ?",
      "options": [
        "Des services analogues de la même entreprise avec opposition simple",
        "Une simple visite du site",
        "Un achat de fichier sans contrôle",
        "Un message sans désabonnement"
      ],
      "answer": 0,
      "explain": "Des services analogues de la même entreprise avec opposition simple."
    },
    {
      "q": "Que vérifier sur une liste de prospects achetée ?",
      "options": [
        "Uniquement le prix par contact",
        "La provenance et les preuves de conformité du canal",
        "Uniquement le nombre de lignes",
        "Seulement le format du fichier"
      ],
      "answer": 1,
      "explain": "La provenance et les preuves de conformité du canal."
    },
    {
      "q": "Quel risque accompagne la signature d’un mandat au domicile ?",
      "options": [
        "L’absence automatique de toute rétractation",
        "La suppression de toute information",
        "L’application des règles des contrats hors établissement",
        "Une liberté absolue de paiement immédiat"
      ],
      "answer": 2,
      "explain": "L’application des règles des contrats hors établissement."
    },
    {
      "q": "Avec honoraires acquéreur, quelle information de prix est notamment requise ?",
      "options": [
        "Seulement le net vendeur",
        "Seulement la mensualité de prêt",
        "Seulement une fourchette orale",
        "Prix avec et sans honoraires et pourcentage TTC"
      ],
      "answer": 3,
      "explain": "Prix avec et sans honoraires et pourcentage TTC."
    },
    {
      "q": "Quelle mention vise un logement classé F ou G dans l’annonce ?",
      "options": [
        "Logement à consommation énergétique excessive",
        "Logement garanti sans travaux",
        "Logement nécessairement exempt d’audit",
        "Logement automatiquement interdit à la vente"
      ],
      "answer": 0,
      "explain": "Logement à consommation énergétique excessive."
    }
  ]
};
