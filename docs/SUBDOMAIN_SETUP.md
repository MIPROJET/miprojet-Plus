# Connecter le sous-domaine `miprojet.ivoireprojet.com`

> La création/édition d'enregistrement DNS se fait **chez le registrar** du domaine `ivoireprojet.com` (Namecheap, OVH, GoDaddy, Cloudflare, LWS, etc.). Lovable ne peut pas la déclencher à distance.

---

## 1) Publier l'app

1. Ouvrir le projet dans Lovable.
2. Cliquer **Publish** (en haut à droite).
3. Attendre que l'URL `miprojetplus1.lovable.app` soit active (statut **Active**).

## 2) Déclarer le sous-domaine côté Lovable

1. **Project Settings → Project → Domains**.
2. Cliquer **Connect Domain**.
3. Saisir exactement : `miprojet.ivoireprojet.com`
4. Lovable affiche les enregistrements DNS à créer. Garder cette page ouverte.

> Astuce : si vous utilisez **Cloudflare** (ou un autre proxy), cocher la case **"Domain uses Cloudflare or a similar proxy"** dans la section **Advanced** — cela bascule sur une vérification CNAME compatible proxy.

## 3) Créer les enregistrements DNS chez le registrar de `ivoireprojet.com`

Se connecter au tableau DNS de `ivoireprojet.com` et ajouter :

### Mode standard (sans proxy)

| Type | Nom (Host) | Valeur                    | TTL  |
|------|------------|---------------------------|------|
| A    | `miprojet` | `185.158.133.1`           | Auto |
| TXT  | `_lovable.miprojet` | `lovable_verify=XXXX` (valeur exacte affichée par Lovable) | Auto |

### Mode proxy (Cloudflare / similaire)

| Type  | Nom         | Valeur                    | Proxy |
|-------|-------------|---------------------------|-------|
| CNAME | `miprojet`  | `cname.lovable.app` (valeur exacte affichée par Lovable) | ON    |
| TXT   | `_lovable.miprojet` | `lovable_verify=XXXX`           | OFF   |

> Le champ **Nom** est relatif au domaine — saisir `miprojet`, **pas** `miprojet.ivoireprojet.com` (le registrar ajoute le suffixe automatiquement).

## 4) Vérifier la propagation

- Outil : <https://dnschecker.org> → entrer `miprojet.ivoireprojet.com`, type **A** (ou **CNAME**).
- Délai : 5–30 min en général, jusqu'à 72 h dans le pire cas.
- Vérifier qu'**aucun autre A/CNAME** ne pointe sur `miprojet` (supprimer les anciens enregistrements résiduels).

## 5) Valider dans Lovable

1. Retourner sur **Project Settings → Domains**.
2. Le statut passe par : `Verifying` → `Setting up` → `Active`.
3. Une fois **Active**, l'app est servie sur `https://miprojet.ivoireprojet.com` avec SSL automatique.

## 6) Définir le domaine principal (optionnel)

Dans la liste des domaines, cliquer **⋯ → Set as Primary** sur `miprojet.ivoireprojet.com` si vous voulez que ce sous-domaine soit l'URL canonique (les autres redirigeront vers lui).

---

## Dépannage

| Symptôme | Cause probable | Action |
|---|---|---|
| Statut bloqué sur `Verifying` > 1h | TXT `_lovable.miprojet` absent ou mauvaise valeur | Recopier la valeur exacte depuis Lovable |
| `Failed` après `Setting up` | Enregistrement CAA bloquant Let's Encrypt | Ajouter `0 issue "letsencrypt.org"` ou retirer la CAA restrictive |
| Page Cloudflare au lieu de l'app | Proxy activé mais option "Domain uses Cloudflare" pas cochée dans Lovable | Réouvrir la config et cocher l'option proxy |
| Ancien site qui s'affiche | Cache navigateur / DNS local | Vider le cache, tester en navigation privée, `dnschecker.org` |

## Quand changer de domaine principal plus tard

- Il faut **republier** après changement de Primary pour que les redirects 301 prennent effet.
- Mettre à jour `VITE_PUBLIC_SITE_URL` (si utilisé) et les `canonical`/`og:url` dans le code.
