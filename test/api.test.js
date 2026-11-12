const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

for (const k of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'APP_PASSWORD']) delete process.env[k];

const { ouvrirBase } = require('../src/db');
const { creerApp } = require('../src/server');

let serveur, base;
const appel = async (chemin, method = 'GET', body) => {
  const res = await fetch(base + chemin, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  return { status: res.status, data: res.status === 204 ? null : await res.json() };
};

before(async () => {
  serveur = creerApp(ouvrirBase(':memory:')).listen(0);
  await new Promise((r) => serveur.once('listening', r));
  base = `http://127.0.0.1:${serveur.address().port}/api`;
});
after(() => serveur.close());

test('parcours complet : nouveau client → RDV demain → confirmation prête → envoyée', async () => {
  const { data: c } = await appel('/contacts', 'POST', { prenom: 'Julie', telephone: '0611223344', type: 'vendeur' });
  let { data: tdb } = await appel('/tableau-de-bord');
  assert.equal(tdb.taches.length, 1, 'un premier appel est planifié');
  assert.match(tdb.taches[0].titre, /Premier contact avec Julie/);

  const debut = new Date(Date.now() + 20 * 3600e3).toISOString();
  const { status } = await appel('/rendezvous', 'POST', { contact_id: c.id, titre: 'Estimation', type: 'estimation', debut, lieu: '3 place du Marché' });
  assert.equal(status, 201);

  ({ data: tdb } = await appel('/tableau-de-bord'));
  assert.equal(tdb.messages.length, 1);
  const m = tdb.messages[0];
  assert.equal(m.canal, 'whatsapp');
  assert.match(m.lien_manuel, /^https:\/\/wa\.me\/33611223344\?text=Bonjour%20Julie/);
  assert.equal(m.envoi_auto_possible, false);

  await appel(`/messages/${m.id}/marquer-envoye`, 'POST');
  ({ data: tdb } = await appel('/tableau-de-bord'));
  assert.equal(tdb.messages.length, 0);

  const { data: fiche } = await appel(`/contacts/${c.id}`);
  assert.ok(fiche.derniere_interaction);
  assert.equal(fiche.rendezvous.length, 1);
});

test('tâche de relance faite : prochaine relance enregistrée', async () => {
  const { data: c } = await appel('/contacts', 'POST', { prenom: 'Marc', etape: 'contacte' });
  const { data: t } = await appel('/taches', 'POST', { titre: 'Relancer Marc', type: 'relance', contact_id: c.id });
  await appel(`/taches/${t.id}/faite`, 'POST', { prochaine_relance: '2026-12-01' });
  const { data: fiche } = await appel(`/contacts/${c.id}`);
  assert.equal(fiche.prochaine_relance, '2026-12-01');
});

test('validation : prénom obligatoire', async () => {
  const { status } = await appel('/contacts', 'POST', { nom: 'X' });
  assert.equal(status, 400);
});
