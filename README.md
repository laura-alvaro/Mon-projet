# 🏡 Mon bureau immobilier IAD — avec une équipe d'agents IA

Un bureau numérique organisé + **12 agents spécialisés** (Claude Code) qui travaillent pour moi :
dossiers clients complets, suivi et relances, conformité, annonces, réseaux sociaux, vidéos et retouche photo.

## 👩‍💼 Mon équipe d'agents

| Agent | Ce qu'il fait pour moi | Exemple de demande |
|---|---|---|
| **assistante-direction** | Brief du jour, priorités, bilan de la semaine, répartit le travail | « Qu'est-ce que je dois faire aujourd'hui ? » |
| **gestionnaire-dossiers** | Crée les dossiers clients, classe les documents, liste les pièces manquantes | « Nouveau vendeur : M. Martin, maison à Nantes » |
| **controleur-conformite** | Mandat, diagnostics, mentions des annonces, copropriété, Tracfin | « Le dossier Martin est-il prêt pour le compromis ? » |
| **suivi-clients** | Pipeline, relances, comptes-rendus de visite, après-vente | « Qui dois-je relancer cette semaine ? » |
| **prospection-estimation** | Avis de valeur, étude de marché DVF, plan de prospection | « Prépare mon RDV d'estimation de demain » |
| **redacteur-annonces** | Annonces percutantes et conformes | « Écris l'annonce du bien Martin » |
| **coordinateur-transaction** | De l'offre à l'acte : notaire, banque, délais | « Offre acceptée sur Martin, lance la suite » |
| **community-manager** | Calendrier éditorial, posts Instagram/Facebook/LinkedIn/TikTok | « Prépare mes posts de la semaine » |
| **monteur-video** | Reels automatiques à partir des photos, scripts de tournage | « Fais un Reel avec les photos du bien Martin » |
| **retoucheur-photo** | Ciel bleu, photos plus lumineuses, conseils de prise de vue | « Mets un beau ciel sur les photos extérieures » |
| **gestion-commissions** | CA, honoraires, objectifs, préparation comptable | « Où en suis-je de mon objectif annuel ? » |
| **automatisations** | Connecte Gmail, Agenda, Drive, Canva, Meta, Make/Zapier | « Automatise la confirmation de mes visites » |

Il suffit d'écrire sa demande normalement : Claude choisit le bon agent. On peut aussi le nommer :
« Utilise l'agent community-manager pour… ».

## 📁 Organisation
```
clients/            un dossier par client (modèles vendeur / acquéreur avec checklist + fiche client)
suivi/              pipeline.csv (suivi clients), commissions.csv, mes-parametres.md
modeles/            checklists des pièces, messages types (mails/SMS), modèles CSV, signature
reseaux-sociaux/    calendrier éditorial + publications prêtes à poster
a-traiter/          je dépose ici les photos / vidéos brutes
outils/             nouveau-dossier.sh · photo/ciel.py · video/reel.py
```

## 🛠️ Les outils
**Créer un dossier client**
`bash outils/nouveau-dossier.sh vendeur DUPONT Lyon` · `bash outils/nouveau-dossier.sh acquereur MARTIN`

**Espace photo — ciel bleu et photos lumineuses**
`python3 outils/photo/ciel.py a-traiter/photos -o a-traiter/photos/retouchees`
- `--sans-ciel` pour les photos intérieures, `--ciel coucher` ou `--ciel clair` pour changer de style,
  `--masque` pour contrôler la zone détectée, `--seuil 0.65` si le ciel « déborde ».
- Les données GPS des photos sont supprimées (l'adresse du vendeur reste privée).

**Reel vidéo automatique (format vertical Instagram / TikTok)**
`python3 outils/video/reel.py clients/<dossier>/06_photos/retouchees --titre "Maison 5 pièces" --sous-titre "Ville · 320 000 €" --contact "Prénom Nom · IAD France" --musique musique.mp3 --sortie reel.mp4`

Outils requis sur l'ordinateur : Python 3 (`pip install pillow numpy`) et ffmpeg.

## 🚀 Pour démarrer (15 minutes)
1. Compléter `modeles/ma-signature.md` et `suivi/mes-parametres.md` (secteur, objectif, taux IAD, réseaux).
2. Copier `modeles/pipeline-modele.csv` en `suivi/pipeline.csv` et y lister les clients en cours.
3. Connecter Gmail, Google Agenda, Google Drive et Canva dans claude.ai › Paramètres › Connecteurs.
4. Demander : « Brief du jour » 🎯

## 🔒 Confidentialité (RGPD)
Les dossiers clients, le suivi et les médias **ne sont jamais envoyés sur GitHub** (`.gitignore`).
Seuls les modèles, agents et outils sont versionnés. Sauvegarder les dossiers clients sur un espace sécurisé
(Google Drive pro, disque chiffré) et respecter les outils et procédures IAD.
