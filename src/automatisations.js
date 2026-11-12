// Les automatisations qui tournent toutes seules en arrière-plan.
//  1. Confirmation de RDV envoyée X heures avant (par défaut 24h)
//  2. Rappel le jour même, X heures avant (par défaut 3h)
//  3. Après une visite : message de suivi préparé ; après une estimation : tâche « avis de valeur »
//  4. Relances : tâche créée quand la date de relance est passée, ou après X jours sans nouvelles

const { lireReglages, ETAPES_FERMEES } = require('./db');
const { preparerMessage } = require('./envoi');

const HEURE = 60 * 60 * 1000;
const JOUR = 24 * HEURE;
const FUSEAU = process.env.TZ_AFFICHAGE || 'Europe/Paris';

/** Date du jour (AAAA-MM-JJ) à l'heure de Paris. */
function dateDuJour(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU }).format(now);
}

function creerTache(db, { contactId, titre, type, echeance, now }) {
  db.prepare('INSERT INTO taches (contact_id, titre, type, echeance, auto, created_at) VALUES (?, ?, ?, ?, 1, ?)')
    .run(contactId, titre, type, echeance, now.toISOString());
}

function nomContact(c) {
  return `${c.prenom} ${c.nom || ''}`.trim();
}

async function executer(db, now = new Date()) {
  const r = lireReglages(db);
  const iso = now.toISOString();
  const aujourdhui = dateDuJour(now);
  const bilan = { confirmations: 0, rappels: 0, suivis: 0, relances: 0, erreurs: [] };

  const confH = Number(r.confirmation_heures_avant) || 24;
  const rappelH = Number(r.rappel_heures_avant) || 3;
  const delaiJ = Number(r.delai_relance_jours) || 14;

  // 1. Confirmations
  const aConfirmer = db.prepare(`
    SELECT * FROM rendezvous
    WHERE statut = 'prevu' AND confirmation_envoyee_at IS NULL AND contact_id IS NOT NULL
      AND debut > ? AND debut <= ?
  `).all(iso, new Date(now.getTime() + confH * HEURE).toISOString());
  for (const rdv of aConfirmer) {
    try {
      await preparerMessage(db, { contactId: rdv.contact_id, rdvId: rdv.id, cle: 'confirmation_rdv', now });
      db.prepare('UPDATE rendezvous SET confirmation_envoyee_at = ? WHERE id = ?').run(iso, rdv.id);
      bilan.confirmations++;
    } catch (e) { bilan.erreurs.push(`Confirmation RDV ${rdv.id} : ${e.message}`); }
  }

  // 2. Rappels (inutile si la confirmation vient tout juste d'être envoyée)
  const aRappeler = db.prepare(`
    SELECT * FROM rendezvous
    WHERE statut IN ('prevu', 'confirme') AND rappel_envoye_at IS NULL AND contact_id IS NOT NULL
      AND debut > ? AND debut <= ?
  `).all(iso, new Date(now.getTime() + rappelH * HEURE).toISOString());
  for (const rdv of aRappeler) {
    try {
      const confirmeRecemment = rdv.confirmation_envoyee_at
        && new Date(rdv.debut) - new Date(rdv.confirmation_envoyee_at) < 2 * rappelH * HEURE;
      if (!confirmeRecemment) {
        await preparerMessage(db, { contactId: rdv.contact_id, rdvId: rdv.id, cle: 'rappel_rdv', now });
        bilan.rappels++;
      }
      db.prepare('UPDATE rendezvous SET rappel_envoye_at = ? WHERE id = ?').run(iso, rdv.id);
    } catch (e) { bilan.erreurs.push(`Rappel RDV ${rdv.id} : ${e.message}`); }
  }

  // 3. Suivi après le rendez-vous (1h après le début)
  const passes = db.prepare(`
    SELECT r.*, c.prenom, c.nom FROM rendezvous r JOIN contacts c ON c.id = r.contact_id
    WHERE r.statut IN ('prevu', 'confirme', 'fait') AND r.suivi_cree_at IS NULL AND r.debut <= ?
  `).all(new Date(now.getTime() - HEURE).toISOString());
  for (const rdv of passes) {
    try {
      // On ne crée pas de suivi pour les vieux RDV saisis après coup (plus de 3 jours).
      if (now - new Date(rdv.debut) < 3 * JOUR) {
        if (rdv.type === 'visite') {
          await preparerMessage(db, { contactId: rdv.contact_id, rdvId: rdv.id, cle: 'suivi_visite', now });
          bilan.suivis++;
        } else if (rdv.type === 'estimation') {
          creerTache(db, { contactId: rdv.contact_id, titre: `Envoyer l'avis de valeur à ${nomContact(rdv)}`, type: 'suivi', echeance: aujourdhui, now });
          bilan.suivis++;
        }
      }
      db.prepare('UPDATE rendezvous SET suivi_cree_at = ? WHERE id = ?').run(iso, rdv.id);
    } catch (e) { bilan.erreurs.push(`Suivi RDV ${rdv.id} : ${e.message}`); }
  }

  // 4. Relances
  const fermees = ETAPES_FERMEES.map(() => '?').join(',');
  const aRelancer = db.prepare(`
    SELECT c.* FROM contacts c
    WHERE c.etape NOT IN (${fermees})
      AND (
        (c.prochaine_relance IS NOT NULL AND c.prochaine_relance <= ?)
        OR (c.prochaine_relance IS NULL AND COALESCE(c.derniere_interaction, c.created_at) <= ?)
      )
      AND NOT EXISTS (
        SELECT 1 FROM taches t WHERE t.contact_id = c.id AND t.type = 'relance' AND t.faite_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM rendezvous r WHERE r.contact_id = c.id AND r.debut > ? AND r.statut != 'annule'
      )
  `).all(...ETAPES_FERMEES, aujourdhui, new Date(now.getTime() - delaiJ * JOUR).toISOString(), iso);
  for (const c of aRelancer) {
    const raison = c.prochaine_relance ? 'relance prévue' : `sans nouvelles depuis ${delaiJ} jours`;
    creerTache(db, { contactId: c.id, titre: `Relancer ${nomContact(c)} (${raison})`, type: 'relance', echeance: aujourdhui, now });
    bilan.relances++;
  }

  return bilan;
}

/** Lance les automatisations toutes les `minutes` minutes. */
function demarrer(db, minutes = 10) {
  const tour = async () => {
    try {
      const b = await executer(db);
      const total = b.confirmations + b.rappels + b.suivis + b.relances;
      if (total || b.erreurs.length) console.log(`[automatisations] ${JSON.stringify(b)}`);
    } catch (e) {
      console.error('[automatisations] erreur :', e);
    }
  };
  tour();
  return setInterval(tour, minutes * 60 * 1000);
}

module.exports = { executer, demarrer, dateDuJour };
