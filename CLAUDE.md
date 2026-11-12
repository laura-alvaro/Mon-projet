# Mon bureau immobilier — instructions pour Claude

Je suis conseillère en immobilier indépendante, réseau **IAD France** (agent commercial, mandataire).
Ce dossier est mon bureau numérique : dossiers clients, suivi, documents, réseaux sociaux, photos et vidéos.

## Règles générales
- Toujours répondre et rédiger **en français**, ton professionnel, chaleureux, vouvoiement avec les clients.
- Je signe : « [Prénom Nom] — Conseillère immobilier IAD France » (à compléter dans `modeles/ma-signature.md`).
- Rappeler mon statut quand c'est requis : agent commercial indépendant, mandataire de la société IAD France,
  numéro RSAC et carte professionnelle de IAD France (mentions obligatoires sur annonces et documents).
- **RGPD** : les données clients restent dans `clients/` et `suivi/`, qui ne sont **jamais** poussés sur GitHub
  (voir `.gitignore`). Ne jamais envoyer de données clients à un service externe sans mon accord.
- Ne jamais inventer un prix, une surface, un diagnostic ou une information juridique : demander ou signaler « à vérifier ».
- Les questions juridiques complexes → renvoyer vers le notaire, le juridique IAD ou un avocat.

## Organisation des dossiers
| Dossier | Contenu |
|---|---|
| `clients/` | Un dossier par client : `AAAA-MM_NOM_Ville_vendeur` ou `AAAA-MM_NOM_acquereur` (copie de `_MODELE_VENDEUR` / `_MODELE_ACQUEREUR`) |
| `suivi/pipeline.csv` | Tableau de suivi de tous les clients (statut, prochaine action, date de relance) |
| `suivi/commissions.csv` | Ventes signées, honoraires, part reversée, date d'encaissement |
| `modeles/` | Checklists de documents, modèles de mails/SMS, trames d'annonces |
| `reseaux-sociaux/` | Calendrier éditorial et publications prêtes à poster |
| `a-traiter/photos` / `a-traiter/videos` | Je dépose ici les photos/vidéos brutes à retoucher ou monter |
| `outils/` | Scripts : retouche photo (ciel), création de Reels vidéo, création de dossier client |

## Mes agents (dans `.claude/agents/`)
- `assistante-direction` — point d'entrée : brief du jour, répartit le travail entre les autres agents.
- `gestionnaire-dossiers` — crée et tient à jour les dossiers clients complets.
- `controleur-conformite` — vérifie pièces, diagnostics, mandat, loi Alur, Hoguet, LCB-FT (Tracfin).
- `suivi-clients` — pipeline, relances, mails/SMS de suivi, compte-rendus de visite.
- `prospection-estimation` — avis de valeur, étude de marché (DVF), prospection, piges.
- `redacteur-annonces` — annonces percutantes et conformes.
- `coordinateur-transaction` — de l'offre jusqu'à l'acte authentique (notaire, banque, délais).
- `community-manager` — réseaux sociaux : calendrier, posts, légendes, hashtags, Reels.
- `monteur-video` — scripts de tournage, montage de Reels/visites, sous-titres.
- `retoucheur-photo` — ciel bleu, luminosité, redressement, sélection des photos.
- `gestion-commissions` — chiffre d'affaires, honoraires, objectifs, préparation compta / URSSAF.
- `automatisations` — connecte les outils (Google, Gmail, Agenda, Canva, Meta, Make/Zapier…).
