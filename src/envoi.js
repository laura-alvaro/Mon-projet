// Préparation et envoi des messages (SMS, WhatsApp, email).
// En mode "validation", les messages sont préparés et attendent votre clic.
// En mode "auto", ils partent directement si le canal est connecté (Twilio / Gmail).

const { lireReglages } = require('./db');
const { remplir, normaliserTelephone, lienEnvoiManuel } = require('./messages');
const twilio = require('./integrations/twilio');
const google = require('./integrations/google');

const SUJETS = {
  confirmation_rdv: 'Confirmation de notre rendez-vous',
  rappel_rdv: 'Rappel : rendez-vous aujourd\'hui',
  relance: 'Votre projet immobilier',
  suivi_visite: 'Suite à notre visite',
};

function canalAutomatique(db, canal) {
  if (canal === 'email') return google.connecte(db);
  return twilio.configure(canal);
}

/** Choisit le canal : celui demandé, sinon le canal par défaut, en repliant sur ce que le contact permet. */
function choisirCanal(contact, demande, reglages) {
  const ordre = [demande, reglages.canal_defaut, 'whatsapp', 'sms', 'email'].filter(Boolean);
  for (const c of ordre) {
    if ((c === 'whatsapp' || c === 'sms') && contact.telephone) return c;
    if (c === 'email' && contact.email) return c;
  }
  return null;
}

function horodatage(now = new Date()) {
  return now.toISOString();
}

/**
 * Crée un message pour un contact, à partir d'un modèle (cle) ou d'un texte libre (contenu).
 * Retourne le message créé, ou null si le contact n'a ni téléphone ni email.
 */
async function preparerMessage(db, { contactId, rdvId = null, cle = null, contenu = null, canal = null, sujet = null, now = new Date() }) {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
  if (!contact) throw new Error('Contact introuvable');
  const reglages = lireReglages(db);
  const rdv = rdvId ? db.prepare('SELECT * FROM rendezvous WHERE id = ?').get(rdvId) : null;

  const canalChoisi = choisirCanal(contact, canal, reglages);
  if (!canalChoisi) return null;

  let texte = contenu;
  if (!texte && cle) {
    const modele = db.prepare('SELECT contenu FROM modeles WHERE cle = ?').get(cle);
    if (!modele) throw new Error(`Modèle inconnu : ${cle}`);
    texte = remplir(modele.contenu, { contact, rdv, reglages });
  }
  if (!texte) throw new Error('Message vide');

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO messages (contact_id, rendezvous_id, canal, sujet, contenu, statut, created_at)
    VALUES (?, ?, ?, ?, ?, 'a_envoyer', ?)
  `).run(contact.id, rdv ? rdv.id : null, canalChoisi, sujet || SUJETS[cle] || '', texte, horodatage(now));

  const id = Number(lastInsertRowid);
  if (reglages.mode_envoi === 'auto' && canalAutomatique(db, canalChoisi)) {
    await envoyerMessage(db, id, now);
  }
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
}

/** Envoie un message via Twilio ou Gmail. */
async function envoyerMessage(db, id, now = new Date()) {
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  if (!msg) throw new Error('Message introuvable');
  if (msg.statut === 'envoye') return msg;
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(msg.contact_id);

  if (!canalAutomatique(db, msg.canal)) {
    throw new Error(`L'envoi automatique par ${msg.canal} n'est pas connecté. Utilisez le bouton d'envoi manuel.`);
  }
  try {
    if (msg.canal === 'email') {
      await google.envoyerEmail(db, { a: contact.email, sujet: msg.sujet, contenu: msg.contenu });
    } else {
      await twilio.envoyer(msg.canal, normaliserTelephone(contact.telephone), msg.contenu);
    }
    marquerEnvoye(db, id, now);
  } catch (e) {
    db.prepare("UPDATE messages SET statut = 'echec', erreur = ? WHERE id = ?").run(e.message, id);
  }
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
}

/** Marque un message comme envoyé (après un envoi automatique ou manuel) et note l'interaction. */
function marquerEnvoye(db, id, now = new Date()) {
  const ts = horodatage(now);
  db.prepare("UPDATE messages SET statut = 'envoye', erreur = NULL, envoye_at = ? WHERE id = ?").run(ts, id);
  const msg = db.prepare('SELECT contact_id FROM messages WHERE id = ?').get(id);
  if (msg) db.prepare('UPDATE contacts SET derniere_interaction = ? WHERE id = ?').run(ts, msg.contact_id);
}

/** Ajoute le lien d'envoi en un clic (WhatsApp / SMS / mail) et le nom du contact. */
function enrichirMessage(db, msg) {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(msg.contact_id) || {};
  return {
    ...msg,
    contact_nom: `${contact.prenom || ''} ${contact.nom || ''}`.trim(),
    lien_manuel: lienEnvoiManuel(msg.canal, contact, msg.contenu, msg.sujet),
    envoi_auto_possible: canalAutomatique(db, msg.canal),
  };
}

module.exports = { preparerMessage, envoyerMessage, marquerEnvoye, enrichirMessage, choisirCanal };
