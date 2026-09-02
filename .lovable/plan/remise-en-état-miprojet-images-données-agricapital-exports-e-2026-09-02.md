# Remise en état MiPROJET+ : images, données AgriCapital, exports et modules manquants

## 0. Urgence — images et logos cassés (vérifié)

Sur le domaine `plus.ivoireprojet.com`, l'adresse interne utilisée par tous les logos et visuels renvoie une erreur 404 (testé : 404 sur le domaine personnalisé, 200 sur l'URL Lovable). Aucune image ne peut donc s'afficher sur le site public.

Correction : cesser de dépendre de cette adresse interne. Les logos MiPROJET+ et les visuels AgriCapital deviennent de vrais fichiers statiques servis par le site lui-même, avec repli textuel conservé. Vérification faite sur les deux domaines après correction.

## 1. Accès base de données bloqués (vérifié)

Les écrans Cohérence et Accompagnement affichent « permission denied for function is_any_admin » / « mp_rls_test_report ». Les droits d'exécution de ces fonctions ont été retirés aux utilisateurs connectés. Correction par migration : rétablir l'exécution pour les comptes connectés sur les fonctions de lecture (`is_any_admin`, `has_role`, `mp_rls_test_report`, `mp_resync_scoring`), sans rouvrir les fonctions d'écriture privilégiées. Ensuite, passage en revue page par page (Projets, Finances, Documents, Organisation, Maturité, Score, Accompagnement) pour lister et corriger les lectures/écritures encore refusées.

## 2. Nettoyage des associés AgriCapital

Les noms sont aujourd'hui écrits en texte libre dans la description des opérations (« Apport Gérant — … », « Source : Jacques KOUAMÉ », « Apport Lazare — 3e versement »…), d'où les doublons et pourcentages incohérents.

Règles de réaffectation appliquées à toutes les opérations du projet AgriCapital :

| Contient | Réaffecté à |
| --- | --- |
| JACQUES / KOUAME JACQUES (sauf « Mme ») | KOUAKOU KOUAME JACQUES — Associé |
| KOFFI INOCENT, INOCENT, « Gérant » | KOFFI INOCENT — Fondateur |
| KOUADIO JULIEN / JULIEN | KOUAME KOUADIO JULIEN — Associé |
| KOUAME SAMUEL / SAMUEL | YAO KOUAME SAMUEL — Associé |
| KOUAME JULES / JULES | KOUAKOU KOUAME JULES — Associé |
| KONAN ERNEST / ERNEST | KOFFI KONAN ERNEST — Associé |
| KOFFI RAYMOND / RAYMOND | KONSA KOFFI RAYMOND — Associé |
| KOUAME LAZARE / LAZARE | YAO KONAN LAZARE — Associé |

- Les lignes « Mme JACQUES KOUAME » restent inchangées.
- Tout autre nom incomplet ou non identifié est vidé (acteur non renseigné).
- Aucun montant, date ou catégorie n'est modifié : le solde et la comptabilité restent strictement identiques (contrôle avant/après sur le total des entrées, des sorties et du solde).
- Chaque personne officielle est créée une seule fois dans « Acteurs / Parties prenantes » avec son rôle (Associé, sauf KOFFI INOCENT — Fondateur), et toutes ses opérations y sont rattachées.
- Recalcul des apports réels et des pourcentages par personne à partir de ces rattachements uniques.

## 3. Analyse financière et exports

- Regroupements réellement fonctionnels : par associé/acteur, par poste de dépense, par catégorie, par source de financement, par nature/objet et par période, avec filtres combinables.
- Fin des doublons dans « Détail par contributeur » : un contributeur = une ligne = un pourcentage.
- Export Excel (une feuille par axe d'analyse), PDF et image (PNG HD/FHD) réparés et testés.
- Nom de fichier normalisé : `AgriCapital_Analyse-par-associe_2026-09-02.xlsx` (projet + type d'analyse + date).

## 4. Pièces jointes multiples sur les opérations

Jusqu'à 3 fichiers par opération (reçu, référence, photo) : ajout, remplacement, suppression, aperçu et téléchargement sécurisé.

## 5. Import de CV et auto-remplissage membre

Import PDF, Word, PPTX ou image dans « Équipe ». Analyse IA (Lovable AI) qui pré-remplit nom, fonction, formation, expériences, compétences et coordonnées, avec écran de validation avant enregistrement. La photo reste un champ séparé, jamais déduit du CV.

## 6. Gouvernance depuis les statuts

Import des statuts signés, extraction IA de la forme juridique, du capital, des associés et de leurs parts, du gérant et des organes ; pré-remplissage de l'onglet Gouvernance après validation. Les documents joints sont automatiquement déposés dans l'Espace document du projet.

## 7. Synchronisation AgriCapital

Mise à jour de la description, de l'objectif, du pitch, du marché cible, de la traction, du produit/service et du suivi-évaluation, ainsi que des offres PalmInvest, PalmInvest+, TerraPalm, TerraPalm+ et AgriPlan (350 000 F). Recalcul du score et de la maturité, propagation à l'écosystème MiPROJET Invest pour un score de 80 % identique partout (Accueil, Score, Maturité, Accompagnement, Cohérence, page publique).

## 8. Images et actualités agricapital.ci

Récupération des visuels et actualités du site, dédoublonnage et galerie limitée à 25 visuels, avec titres et dates pour les actualités.

## 9. Tests de non-régression

Scénarios exécutés et rapportés : CRUD documents (création, renommage, dossier, suppression), téléchargement par lien signé, recherche globale, et vérification des droits pour les trois profils (administrateur, équipe projet, écosystème en lecture seule).

## Détails techniques

- Assets : abandon des pointeurs `/__l5e/...` pour les visuels critiques au profit de fichiers servis par l'application ; `SmartImage`/`Logo` conservent leur repli.
- Migrations : rétablissement des `GRANT EXECUTE` de lecture ; ajout des colonnes de pièces jointes multiples sur `mp_financial_records` ; index sur `stakeholder_id`.
- Réaffectation des noms via des instructions SQL de mise à jour (`party_name` + `stakeholder_id`), montants intouchés, avec requêtes de contrôle du solde avant/après.
- Analyse/export : refonte des agrégats dans `financial-analytics.ts` (clé = `stakeholder_id` puis `party_name`) et de `financial-export.ts` (feuilles par axe, nommage horodaté, correction html2canvas pour le PNG).
- IA : `createServerFn` côté serveur, extraction de texte du CV/statuts, modèle `google/gemini-3.7-flash`, sortie structurée validée par Zod.
- Ordre d'exécution : 0 → 1 → 2 → 3 → 4 → 5/6 → 7 → 8 → 9.
