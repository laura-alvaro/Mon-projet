# Hestia – l'outil de la conseillère immobilière, avec son assistante IA

Application pour gérer toute une activité de conseiller·ère immobilier·ère indépendant·e : mandats, vendeurs, acquéreurs, documents, visites, offres, notaires, locations… avec un **copilote** à qui l'on peut tout demander.

Aucune installation : ouvrez `index.html` dans Chrome, Edge ou Safari (ordinateur, tablette, téléphone). Pour l'utiliser en ligne, activez **GitHub Pages** sur ce dépôt.

## Ce que fait l'application

| Domaine | Fonctionnalités |
|---|---|
| **Dossiers / mandats** (sans limite) | Avancement en 5 étapes : Estimation → Mandat signé → Offre acceptée → Sous compromis → Vendu (clic ou glisser-déposer). Caractéristiques, prix, mandat, copropriété, succession. Historique automatique. |
| **Parties** | Vendeurs, co-vendeurs, héritiers, usufruitiers, acquéreurs, notaires, syndic… rattachés à chaque dossier. |
| **Documents** | Liste des pièces attendues générée automatiquement (diagnostics, copropriété, succession, acquéreur…), statut Manquant / Demandé / Reçu / Validé, dépôt des fichiers, rangement automatique (un fichier nommé « DPE.pdf » va dans la case DPE), partage vers WhatsApp sur téléphone. |
| **Photos** | Galerie par bien, photo de couverture, redimensionnement automatique. |
| **Visites** | Rendez-vous, confirmation WhatsApp / SMS en un clic, **bon de visite PDF pré-rempli**, comptes rendus et note d'intérêt. |
| **Offres d'achat** | Suivi des offres, contre-propositions, validité ; acceptation, refus ou contre-proposition préparés par le copilote (courrier PDF + mail). |
| **Recherches acquéreurs** | Critères, rapprochement automatique avec le portefeuille, sélection de biens (portefeuille ou annonces externes), statuts et relances. |
| **Candidatures locatives** | Suivi des candidats, pièces reçues, ratio revenus / loyer, demande de pièces par WhatsApp ou e-mail. |
| **Contacts** | Fiches complètes, anniversaires, dernier échange, relances, **détection des doublons** à la création et **fusion** sécurisée. |
| **Tableau de bord** | Urgences (fins de mandat, conditions suspensives, offres à traiter, pièces bloquantes, tâches en retard), rendez-vous, clients à relancer, anniversaires, commissions. |
| **Notes & mémoire du bien** | Notes datées et « mémoire » durable que le copilote utilise. |
| **Honoraires** | Commission nette HT calculée automatiquement, objectif annuel, graphique mensuel. |

## Apparence

- Cockpit d'accueil : priorités du jour, agenda (jour / semaine / mois), automatisations du jour (bon de visite avant chaque visite, message « suite à votre visite », confirmations de la veille), rappels.
- Mascotte maison « Hestia », 4 palettes de couleurs au choix, mode sombre automatique.
- Le nom de l'application, les couleurs, votre photo et votre logo se changent dans **Paramètres → Apparence**.

## Documents à l'image de votre réseau

1. **Modèles officiels** (menu de gauche) : déposez les PDF officiels de votre réseau (bon de visite, mandats, offre d'achat, fiches de vigilance LCB-FT…). Ils sont utilisés en priorité ; s'ils contiennent des champs remplissables, ils sont **pré-remplis automatiquement** (client, bien, date, prix, n° de mandat…) et restent modifiables.
2. **Paramètres → Mon identité sur les documents** : statut, réseau, mention légale du réseau, RSAC, assurance, adresse, couleur, logo. Ces informations apparaissent en pied de page de chaque document généré (courriers, bilans, avis…).

L'application n'invente aucune mention légale ni aucun logo : tout vient de vos documents officiels et de ce que vous saisissez.

## L'assistante ✨

Bouton **Copilote** en haut à droite, ou boutons violets ✨ partout dans l'application. Exemples :

- « Fais-moi mon briefing du jour » / « Qui dois-je relancer ? »
- « Analyse les diagnostics du dossier Dupont » / « Analyse les PV d'AG »
- « Lis le compromis et complète ce qu'on sait déjà »
- « Prépare le mail au notaire avec toutes les pièces »
- « Prépare une contre-proposition à 535 000 € »
- « Prépare le bilan de commercialisation pour les vendeurs »
- « Confirme mes visites de demain par WhatsApp et génère les bons de visite »
- « Cherche dans mes mails la pièce jointe du diagnostiqueur et range-la dans le bon dossier »
- « Importe le titre de propriété depuis mon Drive »
- « Crée un rendez-vous d'estimation jeudi 10h chez M. Martin, et ajoute-le à mon agenda »
- « Trouve des annonces pour Sophie Laurent et ajoute-les à sa sélection »
- « Écris le script d'un reel pour la maison d'Écully » / « Rédige l'annonce »
- Joindre un PDF ou une photo (📎) puis « range ce document » ; dictée vocale 🎤

**Sécurité** : le copilote n'envoie jamais rien seul. Il prépare des brouillons (Gmail, WhatsApp, SMS) que vous relisez et envoyez. Les suppressions et fusions demandent toujours votre confirmation.

## Mise en route

### 1. Activer le copilote
1. Créez un compte sur **console.anthropic.com**, ajoutez un moyen de paiement (facturation à l'usage) et créez une **clé API**.
2. Dans l'application : **Paramètres → Clé API Claude**, collez la clé, enregistrez.

La clé reste enregistrée dans votre navigateur. N'utilisez l'application que sur vos propres appareils.

### 2. Connecter Gmail, Google Agenda et Google Drive
Il faut un « identifiant client » Google (gratuit, une seule fois) :
1. Allez sur **console.cloud.google.com**, créez un projet.
2. **API et services → Bibliothèque** : activez *Gmail API*, *Google Calendar API* et *Google Drive API*.
3. **Écran de consentement OAuth** : type « Externe », ajoutez votre adresse e-mail comme utilisateur test.
4. **Identifiants → Créer → ID client OAuth → Application Web**. Dans « Origines JavaScript autorisées », ajoutez l'adresse où vous ouvrez l'application (ex. `https://votre-compte.github.io`).
5. Copiez l'identifiant (`….apps.googleusercontent.com`) dans **Paramètres → Identifiant client OAuth Google**, puis cliquez sur **Connecter Google**.

> La connexion Google exige que l'application soit ouverte depuis une adresse web (GitHub Pages par exemple), pas en double-cliquant sur le fichier.

### 3. WhatsApp et SMS
Rien à configurer : les boutons ouvrent WhatsApp (ou les SMS) avec le message pré-rempli et le bon numéro.

## Ce qui n'est pas possible (et pourquoi)

- **Envoi WhatsApp 100 % automatique** : WhatsApp l'interdit sans abonnement *WhatsApp Business API* (payant, avec serveur). Ici, un clic sur « Envoyer » suffit.
- **Connexion directe au mini-site / outils du réseau** : ils ne proposent pas d'accès ouvert aux applications externes. Le copilote peut en revanche **lire une page publique** de votre mini-site (renseignez son adresse dans Paramètres) ou une annonce dont vous collez le lien, et en créer le dossier.
- **Recherche sur « toutes les annonces »** : le copilote fait des recherches web publiques ; les grands portails bloquent souvent la lecture automatique de leurs pages.
- **Montage vidéo** : le copilote écrit les scripts, storyboards, textes et légendes ; le montage se fait ensuite dans une application vidéo (CapCut, InShot…).
- **Lien de dépôt pour les candidats** : nécessite un serveur ; en attendant, les candidats répondent au message avec leurs pièces, et le copilote les retrouve dans Gmail pour les ranger.
- **Synchronisation entre appareils** : les données restent sur l'appareil utilisé. Faites une **sauvegarde complète** (Paramètres) pour les transférer. Une version avec compte en ligne est la prochaine étape possible.

## Structure du code

- `index.html`, `styles.css` : page et mise en forme
- `js/store.js` : données (navigateur) et fichiers (IndexedDB), doublons, fusion
- `js/app.js` : écrans et navigation
- `js/copilot.js` : copilote (Claude) et ses outils
- `js/google.js` : Gmail, Google Agenda, Google Drive
- `js/documents.js` : PDF (bon de visite, courriers), WhatsApp, SMS, partage
- `js/brand.js` : nom, mascotte, icônes, palettes de couleurs
- `vendor/` : bibliothèques embarquées (SDK Anthropic 1.8.0, jsPDF 2.5.2, pdf-lib 1.17.1)
