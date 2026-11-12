// Connexion Google : Gmail (envoi d'emails) et Google Agenda (synchronisation des RDV).
// Variables d'environnement : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL (ex. http://localhost:3000).

const { lireReglages, ecrireReglage } = require('../db');

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

function configure() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri() {
  return `${process.env.APP_URL || 'http://localhost:3000'}/auth/google/callback`;
}

function urlConnexion(state) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function demanderJeton(params) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      ...params,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google OAuth : ${data.error_description || data.error}`);
  return data;
}

async function terminerConnexion(db, code) {
  const jeton = await demanderJeton({ code, grant_type: 'authorization_code', redirect_uri: redirectUri() });
  if (jeton.refresh_token) ecrireReglage(db, 'google_refresh_token', jeton.refresh_token);
  memoriserAcces(db, jeton);
  const info = await appel(db, 'https://www.googleapis.com/oauth2/v2/userinfo');
  ecrireReglage(db, 'google_email', info.email);
  return info.email;
}

function memoriserAcces(db, jeton) {
  ecrireReglage(db, 'google_access_token', jeton.access_token);
  ecrireReglage(db, 'google_expire_at', String(Date.now() + (jeton.expires_in - 60) * 1000));
}

function connecte(db) {
  return configure() && Boolean(lireReglages(db).google_refresh_token);
}

function deconnecter(db) {
  for (const k of ['google_refresh_token', 'google_access_token', 'google_expire_at', 'google_email']) {
    ecrireReglage(db, k, null);
  }
}

async function jetonAcces(db) {
  const r = lireReglages(db);
  if (!r.google_refresh_token) throw new Error('Google non connecté');
  if (r.google_access_token && Number(r.google_expire_at) > Date.now()) return r.google_access_token;
  const jeton = await demanderJeton({ refresh_token: r.google_refresh_token, grant_type: 'refresh_token' });
  memoriserAcces(db, jeton);
  return jeton.access_token;
}

async function appel(db, url, { method = 'GET', body } = {}) {
  const token = await jetonAcces(db);
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google ${res.status} : ${data.error?.message || 'erreur'}`);
  return data;
}

// ---- Google Agenda ----

const AGENDA = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function evenement(rdv, contact) {
  const fin = rdv.fin || new Date(new Date(rdv.debut).getTime() + 60 * 60 * 1000).toISOString();
  const tel = contact?.telephone ? `\nTél : ${contact.telephone}` : '';
  return {
    summary: rdv.titre,
    location: rdv.lieu || undefined,
    description: `${contact ? `Client : ${contact.prenom} ${contact.nom || ''}${tel}\n` : ''}${rdv.notes || ''}`.trim(),
    start: { dateTime: rdv.debut },
    end: { dateTime: fin },
    status: rdv.statut === 'annule' ? 'cancelled' : 'confirmed',
  };
}

async function synchroniserRdv(db, rdv, contact) {
  if (rdv.google_event_id) {
    await appel(db, `${AGENDA}/${encodeURIComponent(rdv.google_event_id)}`, { method: 'PATCH', body: evenement(rdv, contact) });
    return rdv.google_event_id;
  }
  const ev = await appel(db, AGENDA, { method: 'POST', body: evenement(rdv, contact) });
  return ev.id;
}

async function supprimerRdv(db, googleEventId) {
  await appel(db, `${AGENDA}/${encodeURIComponent(googleEventId)}`, { method: 'DELETE' });
}

// ---- Gmail ----

function encoderEntete(texte) {
  return /^[\x20-\x7e]*$/.test(texte) ? texte : `=?UTF-8?B?${Buffer.from(texte).toString('base64')}?=`;
}

async function envoyerEmail(db, { a, sujet, contenu }) {
  const brut = [
    `To: ${a}`,
    `Subject: ${encoderEntete(sujet || 'Votre projet immobilier')}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(contenu).toString('base64'),
  ].join('\r\n');
  const raw = Buffer.from(brut).toString('base64url');
  const res = await appel(db, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', body: { raw } });
  return res.id;
}

module.exports = {
  configure, connecte, urlConnexion, terminerConnexion, deconnecter,
  synchroniserRdv, supprimerRdv, envoyerEmail,
};
