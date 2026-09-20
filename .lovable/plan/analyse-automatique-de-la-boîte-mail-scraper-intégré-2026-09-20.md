# Analyse automatique de la boîte mail (scraper intégré)

Objectif : au lieu que je parcoure vos 15 700 emails à la main (coûteux en crédits),
l'application lit elle-même votre boîte `d.berbia@wallsbroker.com` en arrière-plan,
en extrait les contacts professionnels et alimente vos bases Prospects / Investisseurs.

## Ce que fera l'outil

1. **Lecture de la boîte** : parcours des emails reçus et envoyés, par lots, du plus
   récent au plus ancien, avec reprise automatique là où il s'est arrêté.
2. **Tri des adresses** : on ignore les adresses personnelles (gmail, orange, free…),
   vos propres adresses, les expéditeurs automatiques (noreply, notifications,
   newsletters, plateformes) et les emails déjà connus dans vos bases.
3. **Identification de la société** : à partir du domaine de l'adresse
   (`@societe.com`), regroupement de tous les contacts d'une même société.
4. **Vérification immobilier** : consultation du site du domaine et recherche de
   mots-clés métier (immobilier, foncière, investissement, asset management,
   SCPI, promotion…). Pas de Pappers pour l'instant : cela nécessiterait un compte
   payant. On pourra l'ajouter plus tard si la détection par site ne suffit pas.
5. **Récupération de la signature** : nom, prénom, fonction, téléphone, société et
   adresse sont extraits du bas des emails quand ils y figurent.
6. **Alimentation des bases**, selon vos règles :
   - contact inconnu → nouvelle fiche prospect (société + collaborateur) ;
   - contact déjà présent en prospect ou investisseur → rien, pas de doublon ;
   - société déjà présente chez les investisseurs mais personne inconnue →
     création d'un investisseur reprenant exactement la stratégie, les classes
     d'actifs, les tranches et les régions d'un collègue de la même société.

## Où ça se pilote

Un bloc **« Boîte mail »** dans l'onglet Paramètres, sur le modèle du scraper CFNews :
bouton Lancer / Mettre en pause, avancement (emails analysés, restants), compteurs
(adresses pro trouvées, sociétés retenues, fiches créées, doublons ignorés,
domaines écartés) et un bouton pour relancer les domaines en erreur.

Une page **« À valider »** liste les contacts trouvés avant intégration : vous
cochez ce que vous gardez, l'ajout en base se fait ensuite. Rien n'est écrit dans
vos bases sans votre validation.

## Détails techniques

- Connexion Microsoft Outlook déjà autorisée ; elle sera rattachée au projet pour
  que le serveur puisse appeler Microsoft Graph (lecture seule des messages).
- Nouvelles tables : `mailscan_state` (curseur, phase, compteurs, verrou),
  `mailscan_domains` (domaine, société, verdict immobilier, motif) et
  `mailscan_candidates` (email, nom, fonction, téléphone, société, statut
  `à valider` / `intégré` / `ignoré`, lien vers la fiche créée). RLS broker en
  écriture, viewer en lecture, plus les GRANT requis.
- Traitement par tranches via une route cron `/api/public/cron/mailscan-tick`
  (même mécanique et même jeton que CFNews) : ~200 emails par passage, en
  `$select` restreint pour rester rapide, avec `@odata.nextLink` conservé.
- Extraction des signatures par règles de texte (regex téléphone, fonction, nom) :
  aucun appel à un modèle d'IA, donc aucun coût par email.
- Vérification du domaine faite **une seule fois par société**, puis mise en cache
  dans `mailscan_domains`.

## Ce qui ne change pas

Aucune modification de la charte graphique, de la base investisseurs existante,
des campagnes Brevo, du scraper CFNews ni du matching. Aucune publication sans
votre accord.
