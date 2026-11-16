# Roadmap

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
