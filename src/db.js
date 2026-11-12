const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const ETAPES = [
  'nouveau', 'contacte', 'estimation', 'mandat', 'visite', 'offre', 'compromis', 'vendu', 'perdu',
];
const ETAPES_FERMEES = ['vendu', 'perdu'];

const MODELES_DEFAUT = [
  {
    cle: 'confirmation_rdv',
    titre: 'Confirmation de rendez-vous',
    contenu: 'Bonjour {prenom}, je vous confirme notre rendez-vous ({type}) le {date} à {heure} - {lieu}. Merci de me répondre OUI pour confirmer. {conseiller}',
  },
  {
    cle: 'rappel_rdv',
    titre: 'Rappel le jour du rendez-vous',
    contenu: 'Bonjour {prenom}, petit rappel : nous avons rendez-vous aujourd\'hui à {heure} - {lieu}. À tout à l\'heure ! {conseiller}',
  },
  {
    cle: 'relance',
    titre: 'Relance client',
    contenu: 'Bonjour {prenom}, je reviens vers vous concernant votre projet immobilier. Avez-vous un moment pour en parler cette semaine ? {conseiller}',
  },
  {
    cle: 'suivi_visite',
    titre: 'Suivi après visite',
    contenu: 'Bonjour {prenom}, merci pour la visite d\'aujourd\'hui. Qu\'en avez-vous pensé ? Je reste disponible pour toute question. {conseiller}',
  },
];

const REGLAGES_DEFAUT = {
  conseiller_nom: 'Votre conseillère IAD',
  conseiller_telephone: '',
  canal_defaut: 'whatsapp',           // whatsapp | sms | email
  mode_envoi: 'validation',            // validation (vous validez chaque envoi) | auto
  delai_relance_jours: '14',           // relance auto si aucune interaction depuis X jours
  confirmation_heures_avant: '24',     // confirmation envoyée X heures avant le RDV
  rappel_heures_avant: '3',            // rappel envoyé X heures avant le RDV
};

function ouvrirBase(fichier = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'assistant.db')) {
  if (fichier !== ':memory:') fs.mkdirSync(path.dirname(fichier), { recursive: true });
  const db = new DatabaseSync(fichier);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prenom TEXT NOT NULL,
      nom TEXT DEFAULT '',
      telephone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      type TEXT DEFAULT 'acquereur',
      etape TEXT DEFAULT 'nouveau',
      source TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      prochaine_relance TEXT,
      derniere_interaction TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS rendezvous (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
      titre TEXT NOT NULL,
      type TEXT DEFAULT 'visite',
      debut TEXT NOT NULL,
      fin TEXT,
      lieu TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      statut TEXT DEFAULT 'prevu',
      confirmation_envoyee_at TEXT,
      rappel_envoye_at TEXT,
      suivi_cree_at TEXT,
      google_event_id TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS taches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
      titre TEXT NOT NULL,
      type TEXT DEFAULT 'autre',
      echeance TEXT NOT NULL,
      auto INTEGER DEFAULT 0,
      faite_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
      rendezvous_id INTEGER REFERENCES rendezvous(id) ON DELETE SET NULL,
      canal TEXT NOT NULL,
      sujet TEXT DEFAULT '',
      contenu TEXT NOT NULL,
      statut TEXT NOT NULL DEFAULT 'a_envoyer',
      erreur TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      envoye_at TEXT
    );
    CREATE TABLE IF NOT EXISTS modeles (
      cle TEXT PRIMARY KEY,
      titre TEXT NOT NULL,
      contenu TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reglages (
      cle TEXT PRIMARY KEY,
      valeur TEXT
    );
  `);

  const insModele = db.prepare('INSERT OR IGNORE INTO modeles (cle, titre, contenu) VALUES (?, ?, ?)');
  for (const m of MODELES_DEFAUT) insModele.run(m.cle, m.titre, m.contenu);
  const insReglage = db.prepare('INSERT OR IGNORE INTO reglages (cle, valeur) VALUES (?, ?)');
  for (const [k, v] of Object.entries(REGLAGES_DEFAUT)) insReglage.run(k, v);

  return db;
}

function lireReglages(db) {
  const out = {};
  for (const r of db.prepare('SELECT cle, valeur FROM reglages').all()) out[r.cle] = r.valeur;
  return out;
}

function ecrireReglage(db, cle, valeur) {
  db.prepare('INSERT INTO reglages (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur')
    .run(cle, valeur == null ? null : String(valeur));
}

module.exports = { ouvrirBase, lireReglages, ecrireReglage, ETAPES, ETAPES_FERMEES };
