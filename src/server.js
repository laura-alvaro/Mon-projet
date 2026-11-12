const express = require('express');
const path = require('node:path');
const crypto = require('node:crypto');

const { ouvrirBase, lireReglages, ecrireReglage, ETAPES } = require('./db');
const { preparerMessage, envoyerMessage, marquerEnvoye, enrichirMessage } = require('./envoi');
const { executer, demarrer, dateDuJour } = require('./automatisations');
const google = require('./integrations/google');
const twilio = require('./integrations/twilio');

function creerApp(db) {
  const app = express();
  app.use(express.json());

  // Protection par mot de passe (indispensable dès que l'appli est en ligne).
  const motDePasse = process.env.APP_PASSWORD;
  if (motDePasse) {
    app.use((req, res, next) => {
      const [type, valeur] = (req.headers.authorization || '').split(' ');
      const mdp = type === 'Basic' ? Buffer.from(valeur || '', 'base64').toString().split(':').slice(1).join(':') : '';
      const a = Buffer.from(mdp), b = Buffer.from(motDePasse);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
      res.set('WWW-Authenticate', 'Basic realm="Assistant Immo", charset="UTF-8"').status(401).send('Mot de passe requis');
    });
  }

  app.use(express.static(path.join(__dirname, '..', 'public')));

  const api = express.Router();
  const champs = (obj, liste) => Object.fromEntries(liste.filter((k) => k in obj).map((k) => [k, obj[k] === '' ? null : obj[k]]));
  const maj = (table, id, valeurs) => {
    const cles = Object.keys(valeurs);
    if (!cles.length) return;
    db.prepare(`UPDATE ${table} SET ${cles.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...cles.map((k) => valeurs[k]), id);
  };
  const asyncRoute = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => res.status(400).json({ erreur: e.message }));

  // ---------- Tableau de bord ----------
  api.get('/tableau-de-bord', (req, res) => {
    const now = new Date();
    const aujourdhui = dateDuJour(now);
    const taches = db.prepare(`
      SELECT t.*, c.prenom, c.nom, c.telephone FROM taches t LEFT JOIN contacts c ON c.id = t.contact_id
      WHERE t.faite_at IS NULL AND t.echeance <= ? ORDER BY t.echeance, t.id
    `).all(aujourdhui);
    const rdv = db.prepare(`
      SELECT r.*, c.prenom, c.nom, c.telephone FROM rendezvous r LEFT JOIN contacts c ON c.id = r.contact_id
      WHERE r.debut >= ? AND r.debut <= ? AND r.statut != 'annule' ORDER BY r.debut
    `).all(new Date(now.getTime() - 2 * 3600e3).toISOString(), new Date(now.getTime() + 7 * 86400e3).toISOString());
    const messages = db.prepare("SELECT * FROM messages WHERE statut IN ('a_envoyer', 'echec') ORDER BY created_at")
      .all().map((m) => enrichirMessage(db, m));
    const pipeline = Object.fromEntries(ETAPES.map((e) => [e, 0]));
    for (const l of db.prepare('SELECT etape, COUNT(*) n FROM contacts GROUP BY etape').all()) pipeline[l.etape] = l.n;
    res.json({ aujourdhui, taches, rdv, messages, pipeline });
  });

  // ---------- Contacts ----------
  const CHAMPS_CONTACT = ['prenom', 'nom', 'telephone', 'email', 'type', 'etape', 'source', 'notes', 'prochaine_relance'];

  api.get('/contacts', (req, res) => {
    const q = `%${(req.query.q || '').trim()}%`;
    res.json(db.prepare(`
      SELECT * FROM contacts
      WHERE prenom LIKE ? OR nom LIKE ? OR telephone LIKE ? OR email LIKE ? OR notes LIKE ?
      ORDER BY COALESCE(derniere_interaction, created_at) DESC
    `).all(q, q, q, q, q));
  });

  api.get('/contacts/:id', (req, res) => {
    const c = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ erreur: 'Contact introuvable' });
    c.rendezvous = db.prepare('SELECT * FROM rendezvous WHERE contact_id = ? ORDER BY debut DESC').all(c.id);
    c.taches = db.prepare('SELECT * FROM taches WHERE contact_id = ? ORDER BY faite_at IS NOT NULL, echeance').all(c.id);
    c.messages = db.prepare('SELECT * FROM messages WHERE contact_id = ? ORDER BY created_at DESC').all(c.id).map((m) => enrichirMessage(db, m));
    res.json(c);
  });

  api.post('/contacts', (req, res) => {
    const v = champs(req.body, CHAMPS_CONTACT);
    if (!v.prenom) return res.status(400).json({ erreur: 'Le prénom est obligatoire' });
    const cles = Object.keys(v);
    const { lastInsertRowid } = db.prepare(`INSERT INTO contacts (${cles.join(', ')}) VALUES (${cles.map(() => '?').join(', ')})`)
      .run(...cles.map((k) => v[k]));
    const id = Number(lastInsertRowid);
    // Un nouveau contact = un appel à passer aujourd'hui, pour ne jamais le laisser filer.
    if (!v.etape || v.etape === 'nouveau') {
      db.prepare("INSERT INTO taches (contact_id, titre, type, echeance, auto) VALUES (?, ?, 'appel', ?, 1)")
        .run(id, `Premier contact avec ${`${v.prenom} ${v.nom || ''}`.trim()}`, dateDuJour());
    }
    res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(id));
  });

  api.put('/contacts/:id', (req, res) => {
    maj('contacts', req.params.id, champs(req.body, CHAMPS_CONTACT));
    res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id));
  });

  api.delete('/contacts/:id', (req, res) => {
    db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  // Noter une interaction (appel, rencontre...) : remet le compteur de relance à zéro.
  api.post('/contacts/:id/interaction', (req, res) => {
    const now = new Date().toISOString();
    db.prepare('UPDATE contacts SET derniere_interaction = ?, prochaine_relance = ? WHERE id = ?')
      .run(now, req.body.prochaine_relance || null, req.params.id);
    if (req.body.note) {
      const c = db.prepare('SELECT notes FROM contacts WHERE id = ?').get(req.params.id);
      const ligne = `[${dateDuJour()}] ${req.body.note}`;
      db.prepare('UPDATE contacts SET notes = ? WHERE id = ?').run(c.notes ? `${ligne}\n${c.notes}` : ligne, req.params.id);
    }
    db.prepare("UPDATE taches SET faite_at = ? WHERE contact_id = ? AND type IN ('relance', 'appel') AND faite_at IS NULL")
      .run(now, req.params.id);
    res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id));
  });

  // ---------- Rendez-vous ----------
  const CHAMPS_RDV = ['contact_id', 'titre', 'type', 'debut', 'fin', 'lieu', 'notes', 'statut'];

  async function syncGoogle(id) {
    if (!google.connecte(db)) return null;
    const rdv = db.prepare('SELECT * FROM rendezvous WHERE id = ?').get(id);
    const contact = rdv.contact_id ? db.prepare('SELECT * FROM contacts WHERE id = ?').get(rdv.contact_id) : null;
    try {
      const evId = await google.synchroniserRdv(db, rdv, contact);
      db.prepare('UPDATE rendezvous SET google_event_id = ? WHERE id = ?').run(evId, id);
      return null;
    } catch (e) {
      return `RDV enregistré, mais pas synchronisé avec Google Agenda : ${e.message}`;
    }
  }

  api.get('/rendezvous', (req, res) => {
    const depuis = req.query.depuis || new Date(Date.now() - 30 * 86400e3).toISOString();
    res.json(db.prepare(`
      SELECT r.*, c.prenom, c.nom FROM rendezvous r LEFT JOIN contacts c ON c.id = r.contact_id
      WHERE r.debut >= ? ORDER BY r.debut
    `).all(depuis));
  });

  api.get('/rendezvous/:id', (req, res) => {
    const r = db.prepare('SELECT * FROM rendezvous WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ erreur: 'RDV introuvable' });
    res.json(r);
  });

  api.post('/rendezvous', asyncRoute(async (req, res) => {
    const v = champs(req.body, CHAMPS_RDV);
    if (!v.titre || !v.debut) return res.status(400).json({ erreur: 'Titre et date obligatoires' });
    v.debut = new Date(v.debut).toISOString();
    if (v.fin) v.fin = new Date(v.fin).toISOString();
    const cles = Object.keys(v);
    const { lastInsertRowid } = db.prepare(`INSERT INTO rendezvous (${cles.join(', ')}) VALUES (${cles.map(() => '?').join(', ')})`)
      .run(...cles.map((k) => v[k]));
    const id = Number(lastInsertRowid);
    const avertissement = await syncGoogle(id);
    await executer(db); // la confirmation part tout de suite si le RDV est proche
    res.status(201).json({ ...db.prepare('SELECT * FROM rendezvous WHERE id = ?').get(id), avertissement });
  }));

  api.put('/rendezvous/:id', asyncRoute(async (req, res) => {
    const v = champs(req.body, CHAMPS_RDV);
    const avant = db.prepare('SELECT * FROM rendezvous WHERE id = ?').get(req.params.id);
    if (!avant) return res.status(404).json({ erreur: 'RDV introuvable' });
    if (v.debut) v.debut = new Date(v.debut).toISOString();
    if (v.fin) v.fin = new Date(v.fin).toISOString();
    // RDV déplacé : on renverra confirmation et rappel pour la nouvelle date.
    if (v.debut && v.debut !== avant.debut) Object.assign(v, { confirmation_envoyee_at: null, rappel_envoye_at: null, suivi_cree_at: null });
    maj('rendezvous', req.params.id, v);
    const avertissement = await syncGoogle(req.params.id);
    res.json({ ...db.prepare('SELECT * FROM rendezvous WHERE id = ?').get(req.params.id), avertissement });
  }));

  api.delete('/rendezvous/:id', asyncRoute(async (req, res) => {
    const rdv = db.prepare('SELECT * FROM rendezvous WHERE id = ?').get(req.params.id);
    if (rdv?.google_event_id && google.connecte(db)) await google.supprimerRdv(db, rdv.google_event_id).catch(() => {});
    db.prepare('DELETE FROM rendezvous WHERE id = ?').run(req.params.id);
    res.status(204).end();
  }));

  // ---------- Tâches ----------
  api.get('/taches', (req, res) => {
    res.json(db.prepare(`
      SELECT t.*, c.prenom, c.nom FROM taches t LEFT JOIN contacts c ON c.id = t.contact_id
      WHERE t.faite_at IS NULL ORDER BY t.echeance
    `).all());
  });

  api.post('/taches', (req, res) => {
    const { titre, echeance, contact_id = null, type = 'autre' } = req.body;
    if (!titre) return res.status(400).json({ erreur: 'Titre obligatoire' });
    const { lastInsertRowid } = db.prepare('INSERT INTO taches (contact_id, titre, type, echeance) VALUES (?, ?, ?, ?)')
      .run(contact_id || null, titre, type, echeance || dateDuJour());
    res.status(201).json(db.prepare('SELECT * FROM taches WHERE id = ?').get(Number(lastInsertRowid)));
  });

  api.post('/taches/:id/faite', (req, res) => {
    const now = new Date().toISOString();
    const t = db.prepare('SELECT * FROM taches WHERE id = ?').get(req.params.id);
    if (!t) return res.status(404).json({ erreur: 'Tâche introuvable' });
    db.prepare('UPDATE taches SET faite_at = ? WHERE id = ?').run(now, t.id);
    if (t.contact_id && ['relance', 'appel'].includes(t.type)) {
      db.prepare('UPDATE contacts SET derniere_interaction = ?, prochaine_relance = ? WHERE id = ?')
        .run(now, req.body.prochaine_relance || null, t.contact_id);
    }
    res.json({ ok: true });
  });

  api.post('/taches/:id/reporter', (req, res) => {
    db.prepare('UPDATE taches SET echeance = ? WHERE id = ?').run(req.body.echeance, req.params.id);
    res.json({ ok: true });
  });

  api.delete('/taches/:id', (req, res) => {
    db.prepare('DELETE FROM taches WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  // ---------- Messages ----------
  api.post('/messages', asyncRoute(async (req, res) => {
    const { contact_id, rendezvous_id, cle, contenu, canal, sujet } = req.body;
    const msg = await preparerMessage(db, { contactId: contact_id, rdvId: rendezvous_id, cle, contenu, canal, sujet });
    if (!msg) return res.status(400).json({ erreur: 'Ce contact n\'a ni téléphone ni email' });
    res.status(201).json(enrichirMessage(db, msg));
  }));

  api.put('/messages/:id', (req, res) => {
    maj('messages', req.params.id, champs(req.body, ['contenu', 'canal', 'sujet']));
    res.json(enrichirMessage(db, db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id)));
  });

  api.post('/messages/:id/envoyer', asyncRoute(async (req, res) => {
    const msg = await envoyerMessage(db, req.params.id);
    if (msg.statut === 'echec') return res.status(502).json({ erreur: msg.erreur });
    res.json(enrichirMessage(db, msg));
  }));

  api.post('/messages/:id/marquer-envoye', (req, res) => {
    marquerEnvoye(db, req.params.id);
    res.json({ ok: true });
  });

  api.delete('/messages/:id', (req, res) => {
    db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  // ---------- Modèles & réglages ----------
  api.get('/modeles', (req, res) => res.json(db.prepare('SELECT * FROM modeles ORDER BY titre').all()));
  api.put('/modeles/:cle', (req, res) => {
    db.prepare('UPDATE modeles SET contenu = ? WHERE cle = ?').run(req.body.contenu, req.params.cle);
    res.json({ ok: true });
  });

  const REGLAGES_MODIFIABLES = ['conseiller_nom', 'conseiller_telephone', 'canal_defaut', 'mode_envoi',
    'delai_relance_jours', 'confirmation_heures_avant', 'rappel_heures_avant'];

  api.get('/reglages', (req, res) => {
    const r = lireReglages(db);
    res.json({
      ...champs(r, REGLAGES_MODIFIABLES),
      integrations: {
        google: { configure: google.configure(), connecte: google.connecte(db), email: r.google_email || null },
        sms: twilio.configure('sms'),
        whatsapp: twilio.configure('whatsapp'),
      },
    });
  });

  api.put('/reglages', (req, res) => {
    for (const k of REGLAGES_MODIFIABLES) if (k in req.body) ecrireReglage(db, k, req.body[k]);
    res.json({ ok: true });
  });

  api.post('/automatisations/executer', asyncRoute(async (req, res) => res.json(await executer(db))));

  app.use('/api', api);

  // ---------- Connexion Google ----------
  const etatsOAuth = new Set();
  app.get('/auth/google', (req, res) => {
    if (!google.configure()) return res.status(400).send('GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET manquants (voir README).');
    const etat = crypto.randomBytes(16).toString('hex');
    etatsOAuth.add(etat);
    res.redirect(google.urlConnexion(etat));
  });
  app.get('/auth/google/callback', asyncRoute(async (req, res) => {
    if (!etatsOAuth.delete(req.query.state)) return res.status(400).send('Lien de connexion expiré, recommencez.');
    if (req.query.error) return res.redirect('/#reglages');
    await google.terminerConnexion(db, req.query.code);
    res.redirect('/#reglages');
  }));
  app.post('/auth/google/deconnexion', (req, res) => { google.deconnecter(db); res.json({ ok: true }); });

  return app;
}

if (require.main === module) {
  const db = ouvrirBase();
  const port = Number(process.env.PORT) || 3000;
  creerApp(db).listen(port, () => {
    console.log(`Assistant Immo prêt sur http://localhost:${port}`);
    if (!process.env.APP_PASSWORD) console.log('⚠  APP_PASSWORD non défini : ne mettez pas l\'appli en ligne sans mot de passe.');
  });
  demarrer(db, Number(process.env.AUTOMATISATIONS_MINUTES) || 10);
}

module.exports = { creerApp };
