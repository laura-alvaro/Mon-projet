# Assistant Immo

Votre assistant personnel de conseillère immobilière : **suivi client, relances automatiques, confirmations de rendez-vous par SMS / WhatsApp, Gmail et Google Agenda**. Plus aucun oubli.

L'appli s'utilise sur ordinateur et sur téléphone. Sur iPhone : Safari → Partager → « Sur l'écran d'accueil ». Elle s'ouvre alors comme une vraie appli.

## Ce que l'appli fait pour vous

| Automatiquement | Quand |
|---|---|
| **Confirmation de RDV** préparée (WhatsApp, SMS ou email) | 24 h avant le rendez-vous (réglable) |
| **Rappel le jour J** | 3 h avant (réglable), sauf si la confirmation vient de partir |
| **Message de suivi après une visite** | 1 h après la visite |
| **Tâche « envoyer l'avis de valeur »** | après chaque estimation |
| **Tâche « premier contact »** | dès qu'un nouveau client est ajouté |
| **Tâche de relance** | à la date de relance choisie, ou après 14 jours sans nouvelles (réglable) |

Pas de relance en double, et pas de relance pour un client qui a déjà un rendez-vous prévu, ni pour un dossier vendu ou perdu.

**L'écran « Aujourd'hui »** réunit tout : les messages prêts à partir, les tâches du jour, les RDV et vos clients par étape (nouveau → contacté → estimation → mandat → visites → offre → compromis → vendu).

### Comment partent les messages

- **Sans rien configurer :** le message est déjà rédigé. Vous appuyez sur « Ouvrir WhatsApp » (ou SMS), WhatsApp s'ouvre avec le texte, vous envoyez, puis vous touchez « C'est envoyé ».
- **Avec Twilio (option) :** SMS et WhatsApp partent tout seuls depuis l'appli.
- **Avec Google connecté :** les emails partent depuis votre Gmail et chaque RDV est ajouté à votre Google Agenda.
- Le réglage **« Je valide chaque message »** (par défaut) vous laisse relire avant chaque envoi. Passez en **« Envoi automatique »** quand vous êtes en confiance.

Les messages types sont modifiables dans l'onglet **Messages**, avec des variables comme `{prenom}`, `{date}`, `{heure}`, `{lieu}` ou `{conseiller}`.

---

## Installation

Prérequis : [Node.js](https://nodejs.org) version 22.9 ou plus récente.

```bash
npm install
cp .env.example .env     # puis remplissez le fichier .env
npm start
```

Ouvrez ensuite http://localhost:3000.

## Connecter Gmail et Google Agenda

1. Allez sur https://console.cloud.google.com et créez un projet (par exemple « Assistant Immo »).
2. Dans **API et services → Bibliothèque**, activez **Gmail API** et **Google Calendar API**.
3. Dans **Écran de consentement OAuth**, choisissez « Externe » et ajoutez votre adresse Gmail comme **utilisateur test**.
4. Dans **Identifiants → Créer → ID client OAuth**, choisissez « Application Web ».
   Ajoutez l'URI de redirection `http://localhost:3000/auth/google/callback`. Une fois l'appli en ligne, utilisez `https://votre-adresse/auth/google/callback`.
5. Copiez l'ID client et le code secret dans `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), puis redémarrez l'appli.
6. Dans l'appli, allez dans **Réglages → Gmail & Google Agenda → Connecter**.

## Envoi automatique des SMS et WhatsApp (option)

1. Créez un compte sur https://www.twilio.com. Comptez quelques centimes par SMS.
2. Récupérez votre **Account SID** et votre **Auth Token** et mettez-les dans `.env`.
3. **SMS :** achetez un numéro, ou déclarez un nom d'expéditeur, puis indiquez-le dans `TWILIO_SMS_FROM`.
4. **WhatsApp :** activez un expéditeur WhatsApp Business dans Twilio et indiquez son numéro dans `TWILIO_WHATSAPP_FROM`.
   ⚠️ Attention : WhatsApp n'autorise l'envoi automatique d'un premier message que via des **modèles validés par Meta**. Tant que ce n'est pas fait, gardez WhatsApp en « un clic », qui fonctionne parfaitement avec votre WhatsApp habituel.

## Mettre l'appli en ligne (accessible partout)

L'appli tourne sur n'importe quel hébergeur Node.js : Render, Railway, Fly.io, ou un petit serveur VPS.

- Définissez **obligatoirement** `APP_PASSWORD` : l'appli demandera ce mot de passe.
- Définissez `APP_URL` avec l'adresse publique en `https://`.
- Prévoyez un **disque persistant** pour le dossier `data/`, qui contient votre base de clients. Sauvegardez régulièrement le fichier `data/assistant.db`.

## Pour les développeurs

```bash
npm test      # tests automatiques
npm run dev   # redémarrage automatique pendant le développement
```

- `src/server.js` : l'API et les pages
- `src/automatisations.js` : confirmations, rappels, suivis et relances (exécutés toutes les 10 minutes)
- `src/envoi.js` : préparation et envoi des messages
- `src/integrations/` : Google (Gmail, Agenda) et Twilio (SMS, WhatsApp)
- `public/` : l'interface, sans dépendance ni compilation
- Base de données : SQLite, celle intégrée à Node.js

## Prochaines étapes possibles

- Lire les emails de leads (portails, site iad) dans Gmail et créer les fiches clients automatiquement
- Importer les RDV déjà présents dans Google Agenda
- Publier sur les réseaux sociaux (Facebook, Instagram) à partir d'une fiche bien
- Rapport hebdomadaire automatique envoyé aux vendeurs
- Rédaction des annonces et des messages assistée par IA
