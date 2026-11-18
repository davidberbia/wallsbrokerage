# Roadmap

## Bouton Upgrade (Actif dispo) — 18 novembre, réponse reçue
- [x] Bouton « Upgrade » avec la mention « Actif dispo » en petit sous le titre, dans Traitement rapide et dans les lignes de la liste Leads.
- [x] Bouton visible même quand la fiche est incomplète, et passage en Actif dispo accepté sans condition de complétion (choix « Toujours, sans bloquer ») ; la classe d'actif reste exigée.
- [x] Vérification au doigt sur téléphone : Upgrade sur une fiche incomplète qui passe bien en Actif dispo (message « Transformé en Actif dispo », fenêtre fermée), puis suppression des deux dossiers d'essai.

## Pige via Brevo — 18 novembre, plan approuvé
- [x] Ouverture Outlook et confirmation manuelle retirées uniquement de Pige ; aperçu puis confirmation Brevo vérifiés au toucher sur téléphone, demande préparée relue en base sans mail envoyé.
- [x] Réservation atomique, états accepté/refusé/incertain, aucun nouvel essai aveugle ; événements associés par identifiant exact, 6 tests réussis et aperçu sans erreur.
- [x] Réponses rapprochées dans la boîte professionnelle par références Brevo, sans exiger un message dans les envoyés Outlook ; marketing report conservé et sept jours vérifiés sur acceptation simulée en base, essai nettoyé.
- [ ] Réception et lecture réelles : Brevo renvoie « Webhook record does not exist » aux deux lectures de configuration ; raccordement à activer après publication autorisée, aucun réglage externe modifié.
- [ ] Essai Brevo réel et synchronisation des réponses : attend autorisation spécifique d’envoi et activation du suivi existant ; aucune publication ni mail réel envoyé.

## Demandes de documents et Pige — 18 novembre, plan approuvé
- [x] Adresse de la fiche ou de l’actif liée ajoutée à l’objet des nouvelles demandes ; relance conserve l’objet enregistré ; trois lignes libres à cocher et ajout de lignes vérifiés au toucher.
- [x] Transférer textuel et Pige avant Sans suite dans Traitement rapide ; filtres du bien préremplis, investisseurs sélectionnables sans sélection automatique.
- [x] Messages individuels personnalisés, modifiables et enregistrés avant ouverture Outlook ; aucune pièce jointe ni aucun envoi automatique.
- [x] Passage en Pige après confirmation explicite vérifié au toucher avec dossier temporaire, historique relu et exclusion du traitement rapide constatée.
- [x] Retour dans À traiter et le traitement rapide après sept jours avec marketing report vérifié au toucher en avançant uniquement l’échéance du dossier d’essai ; données temporaires supprimées.
- [x] 23 tests réussis, aperçu sans erreur ; suivi réception/lecture non inventé, confirmations inconnues affichées ; aucune publication ni mail envoyé.
- [ ] Suivi Outlook réel des réponses : attend activation autorisée du contrôle existant et autorisation d’un essai d’envoi réel ; inspection par conversation/destinataire préparée sans nouvel horaire automatique.

## Ajustements Leads et complétion — 18 novembre, plan approuvé
- [x] Boutons bleu/orange fixes, Sans suite encadré, Retour/Suivant vérifiés au toucher ; confirmation d’une demande temporaire ferme la file vide, attente toujours exclue après rechargement, données de test nettoyées sans mail envoyé.
- [x] Bouton Qualifier et filtre Qualifiés supprimés ; anciens qualifiés inclus dans À traiter sans modification des données.
- [x] Proposition Actif disponible conditionnée aux cinq éléments minimum, calcul testé indépendamment du pourcentage ; garde sur le changement manuel vers Disponible.
- [x] Remplissage pondéré affiché dans listes et fiches Leads/Actifs/Affaires ; 69 leads et 342 actifs vérifiés, 21 tests réussis et compilation correcte, aucun débordement mobile ni erreur navigateur.
- [ ] Retour à rappeler après envoi Outlook réel : attend l’autorisation d’envoi et d’activation déjà prévue ; inclusion à rappeler testée par test unitaire, écriture d’un état rappel de test refusée par les protections existantes, non contournées.

## Traitement rapide des Leads — 18 novembre, approuvé
- [x] Pop-up central 1100 px sur ordinateur, plein écran mobile, actions Actif dispo/Sans suite/demande de pièces, filtres Attente de docs/A rappeler vérifiés au toucher.
- [x] Préparation Outlook, confirmation explicite d’envoi, historique, identification des pièces adaptées ; préparation réelle enregistrée et relue après rechargement, demande d’essai supprimée sans envoi.
- [x] Règle trois jours calendaires, jamais le week-end (heure de Paris), report au lundi ; arrêt sur retour et claims atomiques anti-doublons testés. Traitement réutilise les passages Outlook existants (toutes les deux heures de jour et minuit), pas d’envoi garanti à l’heure exacte.
- [x] 19 tests réussis, compilation correcte, mobile au toucher et pop-up chargé sur ordinateur vérifiés ; aucune publication ni mail réel envoyé.
- [ ] Activation et vérification de la relance Outlook réelle : attend publication explicitement autorisée puis activation de lead_followup_control ; aucun schedule existant modifié. Les essais d’envoi et de réception réels attendent une autorisation d’envoi spécifique.

## Leads — 18 novembre, validation reçue
- [x] Renommage Leads, filtres À traiter/Qualifiés/Sans suite, contact/promouvoir/archiver et revue plein écran mobile ; archivage/réouverture et Suivant vérifiés au toucher.
- [x] Transfert sécurisé et journalisé, classe obligatoire contrôlée en base et au toucher.
- [x] Déclencheur corrigé de Cible vers Prospection, attente des pièces jointes avant recherche, résultats structurés sourcés et champs vides seulement ; enquête réelle Pavillon Opéra terminée et 4 sources relues dans la fiche.
- [x] 26 tests ciblés réussis, compilation correcte, écrans mobile/ordinateur sans débordement ; aucune publication.
- [ ] Activation automatique à la réception : attend publication explicitement demandée et activation du schedule existant (deployment_ready=false).
- [ ] Transfert réel vers un collègue : impossible à tester, seul David dispose actuellement d’un compte actif ; aucun compte ni accès créé sans demande.

## Filtre Année — 18 novembre, plan validé
- [x] Année du dossier serveur synchronisée depuis les rattachements NAS et filtre mobile ajouté ; 9 tests réussis, filtre Sans année testé au toucher avec les 67 fiches accessibles ; aucun dossier NAS encore enregistré pour vérifier une année réelle. Aucune publication.

## Honoraires perdus — 17 novembre, validation reçue
- [x] Retirer la remise à zéro au passage en Perdu : 7 tests réussis ; dossier temporaire de 12 500 € passé en Perdu au toucher, enregistré puis relu avec montant conservé et total perdu à 12 500 € ; dossier de test supprimé, sans publication.

## Demandes du 16 novembre — plan approuvé, sans publication
- [ ] Teasers : interface CRM harmonisée et ouverture au toucher vérifiée ; validation visuelle des exports contre références encore à réaliser.
- [x] Acquéreurs : société prioritaire et nouvel acheteur habitation avec critères usuels.
- [x] Envois : vu gris livré, vu vert ouvert selon les événements réels.
- [x] Renommer Prospection en À relancer et Veille en Extractions ; retirer encaissements, nombre de lignes et CA pondéré d'À relancer.
- [ ] Enrichissement : file et déclencheur créés ; recherche réelle Hôtel Pavillon Opéra terminée et résultat lu dans la fiche mobile. Activation automatique bloquée avant publication ; compléter contrôles de reprise/pauses et visibilité des sources structurées.
- [ ] Extractions multi-sites : interface, file globale, règles robots et séparation des requêtes 5–15 min ajoutées ; tâche 34 volontairement en pause. Finaliser reprise propriétaire, tests complets et protection DNS avant activation. Newsletters écrites conservées ; opportunités seulement vers Cible, aucune modification des affaires manuelles.
- [x] Divers : requalification vers Prospects sans doublons ni perte d'informations.
- [ ] Comparables : ratios et frais agence/régime réduit testés, formulaires et taux officiels juin 2026 ajoutés ; périodes hors juin demandent taux confirmé ou total notaire. Compléter l’historique des taux pour les autres dates.
- [ ] Agents Co : écran, données, invitation séparée, signature PDF et archive privée ajoutés. Génération bloquée par modèle David absent ; signature réelle bloquée par connexion DocuSign absente. Session de test broker : refus admin vérifié, parcours admin complet non vérifié.
- [x] Actifs habitation : Appartement/Maison en tête, caractéristiques facultatives et champ Mandat/Référence unique.
- [ ] Vérifications : 19 tests ciblés réussis, six écrans à 390 px sans débordement et formulaire/éditeur/fiches ouverts au toucher. Restent tests desktop, scénario admin, requalification réelle, export référence et signatures autorisées.

- [x] Arrivée sur Affaires en cours, recherche ville/rue et listes compactes avec fiches et pictogrammes ; parcours testés au toucher avec données réelles sur téléphone et sur ordinateur, sans publication. Registre Mandats vide : rendu sans données vérifié, signature non testée.

- [x] Regrouper les six annuaires sous Contacts et vérifier la navigation au toucher sur téléphone et sur ordinateur, sans publication.

- [x] Journaliser les URLs CFNews renvoyant une erreur 404.
- [x] Continuer le scraping après un 404 sans perdre les données importées.
- [x] Arrêter proprement la pagination après trois 404 consécutives.
- [x] Afficher le nombre d’URLs ignorées.
- [x] Permettre une relance ciblée des seules URLs ignorées.
- [x] Vérifier la compilation et le panneau dans l’aperçu.
- [x] Arrêter définitivement les envois via Sender et conserver les 49 emails sans nouvel essai.
- [x] Choisir puis intégrer Brevo sans modifier les autres fonctionnalités.
- [ ] Publier Brevo, configurer le suivi et relancer les 49 emails après validation du test.
- [x] Rendre tous les écrans du CRM entièrement utilisables sur smartphone.
- [x] Vérifier les parcours à 360 px, 390 px et sur ordinateur sans régression.
- [x] Plusieurs documents par actif (joints automatiquement aux campagnes)
- [x] Programmation de la date et heure d envoi du publipostage
- [x] Copie de fin de campagne envoyee a d.berbia@wallsbroker.com en dernier

- [x] Analyse automatique de la boite mail Outlook (detection de contacts a valider)

- [x] Étape 1 socle : pipeline Dossiers + synchro Outlook depuis 01/2026
- [x] Étape 2 : extraction automatique (montants, adresses, telephones) par regles + rattachement par domaine
- [x] Étape 3 : sourcing newsletters + PDF (prospects, clients, actualités, comparables location/vente)
- [x] Étape 4 : rappels mails sans réponse 3/7/15 j, prospects à relancer, appels suggérés selon actualité
- [x] Étape 5a : alertes dossiers inactifs (14 j)
- [x] Étape 5b : synthèse QUOTIDIENNE 9h05 par email + récap financier + bouton audio Jarvis (voix navigateur gratuite)
- [ ] Refonte complète du résumé journalier : envoi arrêté (cron supprimé), en attente des consignes de David sur le nouveau contenu
- [x] Corriger la lecture des longues synthèses sur mobile par lecture découpée
- [x] Ouvrir automatiquement un lecteur vocal rond façon Jarvis sur la page de synthèse
- [ ] Publier uniquement quand le projet est totalement termine (accord de David)
- [x] IA Gemini (clé Google, plafond 30 €/mois) : assistante sous le bandeau + demandes de documents avec validation (écran vert)
- [ ] IA Gemini phase 2 : newsletters/PDF, fusion des doublons, synthèse quotidienne rédigée, apprentissage du ciblage
- [ ] Plus tard : serveur pro, WhatsApp, appels (sur demande de David)

- [x] Flux liens : partage depuis le téléphone (articles, vidéos, reels) → extraction Gemini dans le CRM
- [x] Nouveau logo net + raccourci écran d'accueil du téléphone
- [ ] WhatsApp : connexion du numéro (attente David / validation Meta), dialogue avec l'assistante, lecture des messages
- [x] Appels Cube ACR : récupération Drive toutes les 30 min (8h-22h), transcription + résumé + actions, onglet « Appels »
- [ ] Appels : analyse bloquée tant que le crédit Google Gemini est épuisé (attente recharge David)
- [x] Vidéos Instagram/TikTok via Cobalt en meilleur effort (retour légende si indisponible)
- [ ] Cobalt : l'instance publique exige désormais une autorisation → héberger sa propre instance si David le souhaite

## Évolutions du 27/09 (prompt David)
- [ ] 1. Résumé : dossiers rejetés gelés (jamais de relance), focus actionnable
- [ ] 2. Voix Jarvis : voix du téléphone fiabilisée, vrai bouton Play, aucun crédit
- [ ] 3. Aucun comparable créé depuis les appels
- [ ] 4. Appels : filtrer (contact connu OU contenu immo pro), sinon ignorés
- [ ] 5. Honoraires/factures 2026 → CA ; ingestion auto des Cibles ; rattrapage 2026 (Enedis)
- [ ] 6. Onglets Cibles + Affaires en cours (tableaux, pondération, millésimes, import Excel, bouton Créer)
- [ ] 7. Brokers / Contacts / À qualifier + boutons de classement
- [ ] 8. Liens en bas du menu ; Cobalt gratuit ou autre outil gratuit ; lien → Cible → recherche web → résumé
- [x] Actifs : champ d'upload dans le 1er formulaire (caractéristiques) → extraction IA → pré-remplissage des champs avant validation
- [x] Compression automatique des fichiers à l'upload (images via canvas, PDF via pdf-lib, point unique uploadDocument)
- [x] Fusion Générateur de brochures : menus Actif (étapes) et Présentation (génération par étapes)
- [ ] Règles par type de bien (champs étape 1, étapes de brochure appartement/maison) — attend les règles de David
- [x] Registre des mandats (dès 202193), partage docs 15 j, espaces par commercial
- [ ] Signature DocuSign — en attente du compte DocuSign de David
- [x] Objet email sans ville en double ; Modifier/Supprimer dans la sélection
- [x] Doublons des comparables fusionnés (1 138 → 1 031) ; brochure lit la liste unique du CRM
- [x] Comparables du fichier Comparables_Wallsbroker.xlsx fusionnés : 100 nouvelles lignes et 28 lignes rapprochées ; sources et différences conservées.
- [ ] DocuSign : raccorder le compte et envoyer les mandats en signature (propriétaire + David, ordre libre) — modèles fournis plus tard
- [x] Menu latéral réordonné : Affaires en cours, Actifs, Teasers, Mandats, Matching, Envois, Prospection, Acquéreurs, Prospects, Brokers, Notaires, Contacts divers, À qualifier, Veille, Comparables, Paramètres ; onglet Appels supprimé

## Mandats & agents (16/11)
- [x] Registre : agent (menu déroulant), adresse, signature, expiration.
- [x] Fiches agents créées (Ladislas Crausaz, Alexis Capron, Li Wei de Bono, Romain Carini).
- [x] Agents : uniquement leurs mandats et leurs contacts ; base générale réservée à l'admin.
- [ ] Import des mandats depuis DocuSign réel — bloqué : clé secrète, API Account ID et User ID du compte réel.
- [ ] Attribution des agents d'après Outlook — après l'import.
- [ ] Boîtes mail des agents (Gmail, Outlook.com, Yahoo…) alimentant la base générale — à construire.

## Mandats (16/11/2026)
- [x] Registre : Adresse, Ville, Début mandat, Signature mandat (sans nom d'actif)
- [x] Création : début libre, fin = début + 1 an
- [x] 10 modèles de mandats conformes (+ clause demande d'exécution immédiate avant 14 jours)
- [x] Paramètres : modèles exportables, modifiables, supprimables, remplaçables

## Contrat agents co (16/11/2026)
- [x] Modèle Word (62 rue Pierre Charron, J+1 max J+5, carte identique aux mandats)
- [ ] Contrat pré-rempli par agent, mention « à signer par David puis l'agent », rien envoyé
- [x] Parcours de création d'agent avec tous les champs + envoi DocuSign final
- [x] L'agent voit et télécharge son contrat dans son CRM, sans le modifier
- [x] Modèles de mandats : siège 61 → 62 rue Pierre Charron

## Agents (16/11)
- [ ] Ladislas : import contacts, comparables, prospects à relancer
- [x] Comparables visibles par tout le staff ; Paramètres réservés au super admin
- [x] Menu déroulant par agent : À relancer, Actifs, Teasers, Matching, Envois, Contacts, Mon contrat
- [x] E-mail d'invitation agent (signature contrat + mandats via CRM)
- [x] 1re connexion : champs manquants obligatoires avant contrat
- [x] Quotes-parts fixes pré-remplies
- [ ] Connexion boîte mail facultative par agent dans le parcours
- [ ] Connexion boîtes grand public (Gmail, Hotmail, Yahoo…) avec mêmes accès
- [x] Textes invitation + étape boîte mail : ton vendeur, bénéfices agent
- [x] Avantage ajouté : accès aux comparables de toute l'entreprise

## Formation et manuel (16 novembre)
- [x] Formation immo : 16 modules écrits, Suivant + %, quiz toutes les 3-4 pages, final 12-15 questions, validation 80 %.
- [x] Manuel du CRM : présentation commentée (voix, captures encadrées), modules par onglet, FAQ, bouton « Besoin d'aide » sur chaque page, ajout automatique des réponses manquantes.

- Formulaire actif : réorganisation, stratégies (?), 1 seul dépôt, parkings/surface ext., photos, diffusion, propriétaire physique/moral + SIREN (gérant modifiable), champs appartement
- Surface pondérée pour immobilier d entreprise
- [x] Plan mandats/classes/portefeuille

## Lot du 17 novembre — validé
- [x] Fermeture des fiches à chaque « Enregistrer » (dossier, mandat, prospect, à qualifier ; les autres le faisaient déjà).
- [x] Seule l'adresse de l'utilisateur connecté est masquée ; interlocuteur et collègues en haut de la fiche.
- [x] Documents d'actif en dossiers Images (défilement), Plans, Baux ; présentations à la racine.
- [x] Partager : ouverture de la messagerie avec le lien 15 jours, téléchargement des pièces pour les joindre.
- [ ] Pré-remplissage automatique de la fiche depuis les pièces jointes des mails (adresse, loyers, WALB/WALT…) : à faire au prochain lot.
- [ ] Photo principale choisie automatiquement (meilleure résolution, paysage) : à faire au prochain lot.

## Pré-remplissage automatique depuis la boîte mail (validé 17/11)
- [x] Pièces jointes des mails rattachés → actif, lecture auto, fiche remplie (champs vides seulement)
- [x] Images/plans PDF → images ; plans nommés par niveau (Plan rez-de-chaussée, Plan 1er étage…), plans de masse séparés

## Serveur NAS — 18 novembre
- [x] Clé privée, onglet Paramètres, programme Windows (actifs + comparables) ; essai réel réussi puis nettoyé. Premier envoi réel à lancer par David.
- [ ] Enregistrement auto des champs de la fiche lead (blur/Tab/Entrée)
- [ ] Enquête IA : toute la fiche + texte des pièces jointes
- [ ] Doublons de leads par référence (75_0027)

- [x] Notoriété LinkedIn (v1 : brouillons à la demande, publication par copier-ouvrir) — reste : connexion LinkedIn officielle pour publication auto + préparation planifiée

## Notoriété LinkedIn automatique — 18 novembre, plan en attente
- [ ] Planning mensuel auto, validation puis option tout automatique, connexion LinkedIn par collaborateur
- [ ] Invitations 10/jour max, attente aléatoire 50 min–2 h, sans message personnalisé
