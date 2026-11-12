const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Aucun envoi réel pendant les tests.
for (const k of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) delete process.env[k];

const { ouvrirBase, ecrireReglage } = require('../src/db');
const { executer } = require('../src/automatisations');
const { remplir, normaliserTelephone, lienEnvoiManuel } = require('../src/messages');

const H = 3600e3;
const NOW = new Date('2026-11-12T09:00:00Z');
let db;

function contact(champs = {}) {
  const c = { prenom: 'Sophie', nom: 'Martin', telephone: '06 12 34 56 78', created_at: NOW.toISOString(), ...champs };
  const cles = Object.keys(c);
  return Number(db.prepare(`INSERT INTO contacts (${cles}) VALUES (${cles.map(() => '?')})`).run(...cles.map((k) => c[k])).lastInsertRowid);
}
function rdv(contactId, debut, champs = {}) {
  const r = { contact_id: contactId, titre: 'Visite', type: 'visite', debut: debut.toISOString(), lieu: '12 rue des Lilas', ...champs };
  const cles = Object.keys(r);
  return Number(db.prepare(`INSERT INTO rendezvous (${cles}) VALUES (${cles.map(() => '?')})`).run(...cles.map((k) => r[k])).lastInsertRowid);
}
const messages = () => db.prepare('SELECT * FROM messages ORDER BY id').all();
const taches = () => db.prepare('SELECT * FROM taches ORDER BY id').all();

beforeEach(() => {
  db = ouvrirBase(':memory:');
  ecrireReglage(db, 'conseiller_nom', 'Laura - IAD');
});

test('prépare la confirmation 24h avant le RDV, une seule fois', async () => {
  const c = contact();
  rdv(c, new Date(NOW.getTime() + 20 * H));
  rdv(c, new Date(NOW.getTime() + 30 * H)); // trop loin
  const b = await executer(db, NOW);
  assert.equal(b.confirmations, 1);
  const [m] = messages();
  assert.equal(m.canal, 'whatsapp');
  assert.equal(m.statut, 'a_envoyer');
  assert.match(m.contenu, /^Bonjour Sophie, je vous confirme notre rendez-vous \(visite\) le vendredi 13 novembre à 06h00 - 12 rue des Lilas/);
  assert.match(m.contenu, /Laura - IAD$/);

  const b2 = await executer(db, new Date(NOW.getTime() + H));
  assert.equal(b2.confirmations, 0);
  assert.equal(messages().length, 1);
});

test('rappel le jour J, mais pas juste après une confirmation', async () => {
  const c = contact();
  rdv(c, new Date(NOW.getTime() + 2 * H), { confirmation_envoyee_at: new Date(NOW.getTime() - 20 * H).toISOString(), statut: 'confirme' });
  rdv(c, new Date(NOW.getTime() + 2 * H)); // créé à la dernière minute : confirmation seule
  const b = await executer(db, NOW);
  assert.equal(b.confirmations, 1);
  assert.equal(b.rappels, 1);
  assert.equal(messages().length, 2);
});

test('RDV annulé : aucun message', async () => {
  rdv(contact(), new Date(NOW.getTime() + 5 * H), { statut: 'annule' });
  const b = await executer(db, NOW);
  assert.equal(b.confirmations + b.rappels, 0);
});

test('après une visite : message de suivi ; après une estimation : tâche avis de valeur', async () => {
  const c = contact();
  rdv(c, new Date(NOW.getTime() - 2 * H), { confirmation_envoyee_at: 'x', rappel_envoye_at: 'x' });
  rdv(c, new Date(NOW.getTime() - 2 * H), { type: 'estimation', confirmation_envoyee_at: 'x', rappel_envoye_at: 'x' });
  rdv(c, new Date(NOW.getTime() - 10 * 24 * H), { confirmation_envoyee_at: 'x', rappel_envoye_at: 'x' }); // ancien : ignoré
  const b = await executer(db, NOW);
  assert.equal(b.suivis, 2);
  assert.match(messages()[0].contenu, /merci pour la visite/);
  assert.match(taches()[0].titre, /avis de valeur à Sophie Martin/);
  assert.equal((await executer(db, NOW)).suivis, 0);
});

test('relance après 14 jours sans nouvelles, sans doublon', async () => {
  contact({ derniere_interaction: new Date(NOW.getTime() - 15 * 24 * H).toISOString() });
  contact({ prenom: 'Récent', derniere_interaction: new Date(NOW.getTime() - 3 * 24 * H).toISOString() });
  contact({ prenom: 'Vendu', etape: 'vendu', derniere_interaction: '2025-01-01T00:00:00Z' });
  contact({ prenom: 'Prévu', prochaine_relance: '2026-11-12' });
  contact({ prenom: 'PasEncore', prochaine_relance: '2026-11-20', derniere_interaction: '2025-01-01T00:00:00Z' });
  const b = await executer(db, NOW);
  assert.equal(b.relances, 2);
  assert.deepEqual(taches().map((t) => t.titre), [
    'Relancer Sophie Martin (sans nouvelles depuis 14 jours)',
    'Relancer Prévu Martin (relance prévue)',
  ]);
  assert.equal((await executer(db, NOW)).relances, 0);
});

test('pas de relance si un RDV est déjà prévu', async () => {
  const c = contact({ derniere_interaction: '2025-01-01T00:00:00Z' });
  rdv(c, new Date(NOW.getTime() + 5 * 24 * H));
  assert.equal((await executer(db, NOW)).relances, 0);
});

test('contact sans téléphone : bascule sur email, sinon rien', async () => {
  const c1 = contact({ telephone: '', email: 'a@b.fr' });
  const c2 = contact({ telephone: '', email: '' });
  rdv(c1, new Date(NOW.getTime() + 5 * H));
  rdv(c2, new Date(NOW.getTime() + 5 * H));
  await executer(db, NOW);
  assert.deepEqual(messages().map((m) => m.canal), ['email']);
});

test('outils de message', () => {
  assert.equal(normaliserTelephone('06 12 34 56 78'), '+33612345678');
  assert.equal(normaliserTelephone('0033 6 12 34 56 78'), '+33612345678');
  assert.equal(lienEnvoiManuel('whatsapp', { telephone: '0612345678' }, 'Salut !'), 'https://wa.me/33612345678?text=Salut%20!');
  assert.equal(remplir('Bonjour {prenom}, RDV à {heure} - {lieu}. {conseiller}', {
    contact: { prenom: 'Paul' }, rdv: { debut: '2026-11-13T13:30:00Z', lieu: '' }, reglages: { conseiller_nom: 'Laura' },
  }), 'Bonjour Paul, RDV à 14h30. Laura');
});
