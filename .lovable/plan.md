# Plan de finalisation AgriCapital

Le périmètre est large — je propose de le découper en 3 lots livrables séquentiellement pour garder la qualité. Validez l'ordre (ou ajustez) et je lance le lot 1.

## Lot 1 — Identité visuelle & page publique `/projets/agricapital`

**Assets CDN (upload via lovable-assets)**
- Logo officiel V2 (`Logo_AgriCapital_-V2.png`)
- Poster plantation (`POSTER_AGRICAPITAL_Plantation.jpg`)
- 3 flyers B5 (Verso, Recto promo -25%, Exclusif -35%)
- Photo palmier (`fais_une_plantation_202604101808.png`)
- Captures `agricapital.ci` et `app.agricapital.ci` (via fetch_website)

**Page publique** `/projets/agricapital` (route non authentifiée)
- Hero avec poster + logo + slogan « Investir la terre. Cultiver l'avenir. »
- Section offres : PalmInvest / PalmInvest+ / TerraPalm / TerraPalm+ (tarifs des flyers)
- Galerie flyers cliquables (lightbox)
- Section « État des lieux 2026 » (extrait du PDF : valorisation, traction, pipeline)
- Bloc partition financière (lecture seule des 125 opérations, solde = 0)
- CTA : contact@agricapital.ci · 05 64 55 17 17 · agricapital.ci
- SEO complet (head meta + og:image = poster)

**Publication automatique « site mère »** : la page est servie publiquement à `/projets/agricapital` sur le domaine du projet — aucune action manuelle requise.

## Lot 2 — Formulaire PME/Startup enrichi

Migration table `projects` (ajouts) :
- `logo_url`, `cover_url`, `pitch`, `produit_service`, `commercialisation`, `cible_marche`, `suivi_evaluation`
- Bucket Storage `project-media` (public, RLS owner-write)
- Table `mp_invoices` rattachée à `mp_financial_records` (upload PDF/image facture)

Composants formulaire :
- Onglets : Identité · Pitch · Produit · Marché · Suivi · Documents
- Upload logo + cover (drag & drop, prévisualisation)
- Lien facture sur chaque ligne d'opération financière

## Lot 3 — Recalibrage score AgriCapital (cible 78–83 %)

Lecture du PDF État des Lieux pour extraire les preuves (immatriculation, plantation pilote, contrats, équipe, traction commerciale, brand book, site web actif, app métier).

Ajustement `src/lib/scoring.ts` :
- Juridique 15 % → bonus immatriculation CCI + site `.ci` actif (≈ 95)
- Financier 25 % → 125 opérations équilibrées + valorisation 72 M (≈ 75)
- Technique 20 % → plantation pilote + app métier (≈ 85)
- Marché 20 % → 4 offres produit + flyers + 2 sites live (≈ 80)
- Impact 20 % → emplois ruraux + durabilité (≈ 80)

→ Score consolidé attendu : **~81 %** (cohérent avec 75–83 %).

## Technique
- TanStack Start serverFn pour upload Storage signé
- Route `/projets/$slug` publique (pas sous `_authenticated`)
- Assets via `lovable-assets create` depuis `/mnt/user-uploads/`
- `document--parse_document` sur les 2 PDF pour extraire chiffres réels

## Ordre proposé
1. Lot 1 (identité + page publique) — livrable visuel immédiat
2. Lot 3 (recalibrage score) — court, basé sur lecture PDF
3. Lot 2 (formulaire enrichi + factures) — plus lourd, migration + storage

Confirmez l'ordre (ou dites « 1-2-3 » / « 1-3-2 ») et je lance.
