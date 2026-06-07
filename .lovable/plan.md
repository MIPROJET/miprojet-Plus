
# Plan de finalisation MiProjet+

Le périmètre demandé est très large. Je propose **5 lots livrables séquentiellement** pour garder qualité et stabilité.

## Lot A — Correction images (URGENT, rapide)

**Problème** : logo/cover/galerie cassés dans les cartes et le formulaire (cf. captures).

- Vérifier/créer le bucket `project-media` (public, 250 Mo) — migration déjà proposée, à confirmer ou recréer.
- Composant `<SmartImage>` réutilisable : fallback élégant (initiales projet) si URL cassée, lazy loading, `object-cover`.
- Brancher dans `MiProjetCard` (cover + logo) et dans le formulaire Visuels (preview logo, cover, galerie, vidéo).
- Tester avec le projet AgriCapital existant.

## Lot B — Refonte formulaire « Nouveau projet » (parcours adaptatifs)

Avant le formulaire complet, **étape 0 = choix du parcours** (modal/wizard) :

1. **Type d'activité** — liste déroulante :
   - Micro-activité (vente au marché, vente ambulante, mototaxi, petit commerce…) → formulaire **léger** (5 champs)
   - PME / Commerce / Coopérative / Association / Agriculteur → **Parcours 1** (formulaire complet, activité existante)
   - Startup / Porteur de projet / Entrepreneur en création → **Parcours 2** (focus pitch + projet)

2. **Auto-détection** selon §3 du cahier des charges → active le bon `profile_kind` + `journey` en BDD.

3. **Champs conditionnels** :
   - Micro : nom, secteur, ville, description courte, photo
   - PME (existant) : tous les champs actuels + suivi financier au cœur
   - Startup (projet) : pitch, problème, solution, marché, BMC, équipe — pas de suivi financier obligatoire

**Réorganiser onglet Visuels** : grille 2 colonnes (logo+cover à gauche, galerie+vidéo à droite) pour supprimer l'espace vide rouge signalé.

Migration : ajouter colonnes `profile_kind` (`micro|pme|startup`), `journey` (`existing|project`), `complexity_level` (`simple|intermediate|advanced`) sur `mp_projects`.

## Lot C — Module suivi financier (3 niveaux + indicateurs auto)

§4 du cahier :
- 3 niveaux : **Simple** (recettes/dépenses), **Intermédiaire** (catégories, produits), **Avancé** (multi-produits, rentabilité par produit).
- Indicateurs auto-calculés : CA, marge, bénéfice net, top/flop produit, capacité de remboursement.
- Tableau de bord par projet : graphes mensuels + alertes.

## Lot D — Score, Accompagnement, Certification, Écosystème

- **§5 Score** : recalibrer barème (4 niveaux : Démarrage / En structuration / Solide / Excellent) avec couleurs Rouge/Orange/Bleu/Vert.
- **§6 Accompagnement** : enrichir la page `/support` selon modèle hybride + 5 niveaux d'intervention (auto, guidé, expert, premium, partenaire).
- **§7 Documents & Certification** : génération auto (fiche projet PDF, bilan simplifié, attestation MiProjet), conditions de certification, palier payant.
- **§8 Écosystème** : Supabase partagée (déjà OK), visibilité auto au catalogue, profil économique public, matching investisseurs.

## Lot E — CRUD complet & polish

- Audit toutes les entités (projets, médias, opérations financières, tickets) → vérifier Create/Read/Update/**Delete** présents partout avec confirmation.
- Cohérence UI, suppression espaces vides, responsive.

---

## Ordre proposé

**A → B → C → D → E**

Je commence par le **Lot A** dès validation (fix images, ~10 min) puis enchaîne sur le **Lot B** (refonte formulaire avec choix du parcours, ~30 min). Les lots C/D/E sont plus lourds et chacun mérite une validation intermédiaire.

**Confirmez** : « go A+B » pour démarrer les deux premiers lots, ou ajustez l'ordre / le périmètre.
