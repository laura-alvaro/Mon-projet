'use strict';
/* =========================================================
   Interface : vues, formulaires, navigation
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (n) => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num = (n) => (Number(n) || 0).toLocaleString('fr-FR');
const todayISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const daysUntil = (d) => Math.round((new Date(String(d).slice(0, 10)) - new Date(todayISO())) / 86400000);

/* ---------------- Options de listes ---------------- */
const contactOpts = () => [['', '—'], ...[...db.contacts].sort((a, b) => contactName(a.id).localeCompare(contactName(b.id))).map(c => [c.id, contactName(c.id) + (c.type ? ` (${c.type})` : '')])];
const bienOpts = () => [['', '—'], ...db.biens.map(b => [b.id, bienName(b.id) + (b.prix ? ` · ${eur(b.prix)}` : '')])];

/* ---------------- Schémas de formulaires ---------------- */
const SCHEMAS = {
  contacts: { title: 'Contact', fields: [
    { k: 'type', l: 'Type', t: 'select', o: CONTACT_TYPES },
    { k: 'source', l: 'Source', t: 'select', o: ['', ...SOURCES] },
    { k: 'civilite', l: 'Civilité', t: 'select', o: ['', 'Mme', 'M.', 'Mme et M.'] },
    { k: 'prenom', l: 'Prénom' }, { k: 'nom', l: 'Nom', req: true },
    { k: 'tel', l: 'Téléphone', t: 'tel' }, { k: 'email', l: 'E-mail', t: 'email' },
    { k: 'dateNaissance', l: 'Date de naissance', t: 'date' },
    { k: 'adresse', l: 'Adresse', full: true },
    { section: 'Projet d\'achat (acquéreurs)' },
    { k: 'budgetMax', l: 'Budget max (€)', t: 'number' },
    { k: 'villes', l: 'Villes / codes postaux', ph: 'ex : Lyon, 69130' },
    { k: 'typeRecherche', l: 'Type recherché', t: 'select', o: ['', ...BIEN_TYPES] },
    { k: 'surfaceMin', l: 'Surface min (m²)', t: 'number' },
    { k: 'piecesMin', l: 'Pièces min', t: 'number' },
    { k: 'financement', l: 'Financement', t: 'select', o: ['', 'Comptant', 'Prêt accordé', 'Prêt en cours', 'Non étudié'] },
    { k: 'criteres', l: 'Autres critères (jardin, étage, travaux…)', full: true },
    { section: 'Suivi' },
    { k: 'prochaineRelance', l: 'Prochaine relance', t: 'date' },
    { k: 'derniereInteraction', l: 'Dernier échange', t: 'date' },
    { k: 'notes', l: 'Notes', t: 'textarea', full: true },
  ]},
  biens: { title: 'Dossier', fields: [
    { k: 'titre', l: 'Nom du dossier', ph: 'ex : Maison Dupont – Écully', full: true },
    { k: 'transaction', l: 'Transaction', t: 'select', o: ['Vente', 'Location'] },
    { k: 'etape', l: 'Étape', t: 'select', o: ETAPES },
    { k: 'type', l: 'Type de bien', t: 'select', o: BIEN_TYPES },
    { k: 'adresse', l: 'Adresse', full: true },
    { k: 'cp', l: 'Code postal' }, { k: 'ville', l: 'Ville', req: true },
    { k: 'surface', l: 'Surface (m²)', t: 'number' }, { k: 'terrain', l: 'Terrain (m²)', t: 'number' },
    { k: 'pieces', l: 'Pièces', t: 'number' }, { k: 'chambres', l: 'Chambres', t: 'number' },
    { k: 'dpe', l: 'DPE', t: 'select', o: DPE }, { k: 'ges', l: 'GES', t: 'select', o: DPE },
    { k: 'annee', l: 'Année de construction', t: 'number' },
    { k: 'copropriete', l: 'Copropriété', t: 'select', o: ['Non', 'Oui'] },
    { k: 'lots', l: 'Nombre de lots', t: 'number' }, { k: 'charges', l: 'Charges annuelles (€)', t: 'number' },
    { k: 'succession', l: 'Succession / indivision', t: 'select', o: ['Non', 'Oui'] },
    { section: 'Prix & mandat' },
    { k: 'estimation', l: 'Estimation (€)', t: 'number' },
    { k: 'prix', l: 'Prix FAI (€)', t: 'number' }, { k: 'loyer', l: 'Loyer CC (€) – location', t: 'number' },
    { k: 'honoraires', l: 'Honoraires TTC (€)', t: 'number' },
    { k: 'mandat', l: 'Type de mandat', t: 'select', o: ['', ...MANDATS] },
    { k: 'numMandat', l: 'N° de mandat' },
    { k: 'debutMandat', l: 'Début du mandat', t: 'date' }, { k: 'finMandat', l: 'Fin du mandat', t: 'date' },
    { k: 'lienAnnonce', l: 'Lien de l\'annonce', t: 'url', full: true },
    { k: 'description', l: 'Description / points forts', t: 'textarea', full: true },
  ]},
  rdv: { title: 'Rendez-vous', fields: [
    { k: 'type', l: 'Type', t: 'select', o: RDV_TYPES },
    { k: 'date', l: 'Date & heure', t: 'datetime-local', req: true },
    { k: 'duree', l: 'Durée (min)', t: 'number' },
    { k: 'contactId', l: 'Contact', t: 'select', o: contactOpts },
    { k: 'bienId', l: 'Dossier', t: 'select', o: bienOpts },
    { k: 'lieu', l: 'Lieu', full: true },
    { section: 'Après le rendez-vous' },
    { k: 'interet', l: 'Intérêt du visiteur (1 à 5)', t: 'number' },
    { k: 'bonSigne', l: 'Bon de visite signé', t: 'checkbox' },
    { k: 'compteRendu', l: 'Compte rendu / retour visite', t: 'textarea', full: true },
  ]},
  taches: { title: 'Tâche', fields: [
    { k: 'titre', l: 'Tâche', req: true, full: true },
    { k: 'echeance', l: 'Échéance', t: 'date' },
    { k: 'priorite', l: 'Priorité', t: 'select', o: ['Normale', 'Haute', 'Basse'] },
    { k: 'contactId', l: 'Contact', t: 'select', o: contactOpts },
    { k: 'bienId', l: 'Dossier', t: 'select', o: bienOpts },
    { k: 'fait', l: 'Terminée', t: 'checkbox' },
    { k: 'notes', l: 'Notes', t: 'textarea', full: true },
  ]},
  offres: { title: 'Offre d\'achat', fields: [
    { k: 'bienId', l: 'Dossier', t: 'select', o: bienOpts, req: true },
    { k: 'acquereurId', l: 'Acquéreur', t: 'select', o: contactOpts },
    { k: 'statut', l: 'Statut', t: 'select', o: OFFRE_STATUTS },
    { k: 'montant', l: 'Montant proposé (€)', t: 'number' },
    { k: 'contreMontant', l: 'Contre-proposition (€)', t: 'number' },
    { k: 'dateOffre', l: 'Date de l\'offre', t: 'date' }, { k: 'dateValidite', l: 'Valable jusqu\'au', t: 'date' },
    { k: 'financement', l: 'Financement (apport, prêt…)', full: true },
    { k: 'conditions', l: 'Conditions suspensives / remarques', t: 'textarea', full: true },
  ]},
  ventes: { title: 'Vente (honoraires)', fields: [
    { k: 'statut', l: 'Statut', t: 'select', o: VENTE_STATUTS },
    { k: 'bienId', l: 'Dossier', t: 'select', o: bienOpts, req: true },
    { k: 'acquereurId', l: 'Acquéreur', t: 'select', o: contactOpts },
    { k: 'notaire', l: 'Notaire(s)' },
    { k: 'prixVente', l: 'Prix net vendeur (€)', t: 'number' },
    { k: 'honorairesTTC', l: 'Honoraires TTC (€)', t: 'number' },
    { k: 'taux', l: 'Taux de commission (%)', t: 'number', ph: 'par défaut : paramètres' },
    { k: 'dateCompromis', l: 'Date compromis', t: 'date' },
    { k: 'finCondSusp', l: 'Fin conditions suspensives', t: 'date' },
    { k: 'dateActe', l: 'Date acte', t: 'date' },
    { k: 'dateEncaissement', l: 'Date d\'encaissement', t: 'date' },
    { k: 'notes', l: 'Notes', t: 'textarea', full: true },
  ]},
  selections: { title: 'Bien proposé à un acquéreur', fields: [
    { k: 'contactId', l: 'Acquéreur', t: 'select', o: contactOpts, req: true },
    { k: 'bienId', l: 'Bien du portefeuille', t: 'select', o: bienOpts },
    { k: 'externeTitre', l: 'Ou annonce externe : titre' }, { k: 'externePrix', l: 'Prix (€)', t: 'number' },
    { k: 'externeUrl', l: 'Lien de l\'annonce', t: 'url', full: true },
    { k: 'statut', l: 'Statut', t: 'select', o: SELECTION_STATUTS },
    { k: 'relance', l: 'Relance le', t: 'date' },
    { k: 'commentaire', l: 'Commentaire', t: 'textarea', full: true },
  ]},
  candidatures: { title: 'Candidature locative', fields: [
    { k: 'bienId', l: 'Logement', t: 'select', o: bienOpts, req: true },
    { k: 'contactId', l: 'Candidat', t: 'select', o: contactOpts, req: true },
    { k: 'statut', l: 'Statut', t: 'select', o: CANDIDATURE_STATUTS },
    { k: 'revenus', l: 'Revenus nets mensuels (€)', t: 'number' },
    { k: 'garant', l: 'Garant (type, revenus…)' },
    { k: 'notes', l: 'Notes', t: 'textarea', full: true },
  ]},
};

/* ---------------- Modale générique ---------------- */
const modal = $('#modal');
let modalCtx = null;
function openForm(coll, id, preset = {}) {
  const schema = SCHEMAS[coll];
  const item = id ? db[coll].find(x => x.id === id) : { ...preset };
  modalCtx = { coll, id };
  $('#modalTitle').textContent = (id ? 'Modifier : ' : 'Nouveau : ') + schema.title.toLowerCase();
  $('#modalDelete').style.display = id ? '' : 'none';
  $('#modalBody').innerHTML = schema.fields.map(f => {
    if (f.section) return `<div class="section">${esc(f.section)}</div>`;
    const v = item[f.k] ?? '';
    const cls = f.full || f.t === 'textarea' ? ' class="full"' : '';
    let input;
    if (f.t === 'select') {
      const opts = typeof f.o === 'function' ? f.o() : f.o.map(o => [o, o || '—']);
      input = `<select name="${f.k}">${opts.map(([val, lab]) => `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
    } else if (f.t === 'textarea') input = `<textarea name="${f.k}">${esc(v)}</textarea>`;
    else if (f.t === 'checkbox') return `<label class="check"><input type="checkbox" name="${f.k}"${v ? ' checked' : ''}> ${esc(f.l)}</label>`;
    else input = `<input type="${f.t || 'text'}" name="${f.k}" value="${esc(v)}"${f.req ? ' required' : ''}${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}>`;
    return `<label${cls}>${esc(f.l)}${f.req ? ' *' : ''}${input}</label>`;
  }).join('') + '<div id="dupWarn" class="full"></div>';
  modal.showModal();
}
$('#modalForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const { coll, id } = modalCtx;
  const data = {};
  for (const f of SCHEMAS[coll].fields) {
    if (!f.k) continue;
    const el = $(`[name="${f.k}"]`, modal);
    data[f.k] = f.t === 'checkbox' ? el.checked : el.value.trim();
  }
  // Anti-doublons à la création d'un contact
  if (coll === 'contacts' && !id && !modalCtx.force) {
    const dups = findDuplicates(data);
    if (dups.length) {
      modalCtx.force = true;
      $('#dupWarn').innerHTML = `<div class="warn-box">⚠️ Contact(s) similaire(s) déjà enregistré(s) :<ul>${dups.map(d => `<li><a href="#contact/${d.id}" data-close>${esc(contactName(d.id))}</a> ${esc(d.tel || '')} ${esc(d.email || '')}</li>`).join('')}</ul>Cliquez de nouveau sur « Enregistrer » pour créer quand même la fiche, ou ouvrez la fiche existante.</div>`;
      return;
    }
  }
  let item;
  if (id) { item = db[coll].find(x => x.id === id); Object.assign(item, data, { maj: nowISO() }); }
  else {
    item = { id: uid(), cree: nowISO(), ...data };
    if (coll === 'biens') { migrate({ biens: [item], contacts: [] }); ensureChecklist(item); addHistorique(item, 'Dossier créé'); }
    if (coll === 'contacts') item.notesListe = [];
    if (coll === 'candidatures') item.pieces = {};
    if (modalCtx.after) modalCtx.after(item);
    db[coll].push(item);
  }
  if (coll === 'biens' && id) ensureChecklist(item);
  if (coll === 'offres') syncOffre(item);
  save(); modal.close(); render();
});
modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) modal.close(); });
$('#modalCancel').onclick = () => modal.close();
$('#modalDelete').onclick = async () => {
  const { coll, id } = modalCtx;
  if (!confirm('Supprimer définitivement cet élément ?')) return;
  if (coll === 'biens') { const b = getBien(id); for (const fid of [...b.photos, ...b.documents.map(d => d.fileId).filter(Boolean)]) await Files.del(fid).catch(() => { }); }
  db[coll] = db[coll].filter(x => x.id !== id);
  save(); modal.close();
  if (coll === 'biens' && location.hash.startsWith('#dossier/')) location.hash = 'dossiers'; else if (coll === 'contacts' && location.hash.startsWith('#contact/')) location.hash = 'contacts'; else render();
};

function syncOffre(o) {
  const b = getBien(o.bienId); if (!b) return;
  if (o.acquereurId && !b.parties.some(p => p.contactId === o.acquereurId)) b.parties.push({ contactId: o.acquereurId, role: 'Acquéreur' });
  if (o.statut === 'Acceptée' && ['Estimation', 'Mandat signé'].includes(b.etape)) { b.etape = 'Offre acceptée'; addHistorique(b, 'Étape : Offre acceptée'); }
}

/* ---------------- Métier ---------------- */
function matches(b) {
  return db.contacts.filter(c => c.type === 'Acquéreur' && c.budgetMax).filter(c => {
    const prix = Number(b.prix) || 0;
    if (prix && prix > Number(c.budgetMax) * 1.05) return false;
    if (c.typeRecherche && b.type && c.typeRecherche !== b.type) return false;
    if (c.surfaceMin && Number(b.surface) < Number(c.surfaceMin)) return false;
    if (c.piecesMin && Number(b.pieces) < Number(c.piecesMin)) return false;
    if (c.villes && b.ville) {
      const villes = normTxt(c.villes).split(/[,;]/).map(s => s.trim()).filter(Boolean);
      if (villes.length && !villes.some(v => normTxt(b.ville).includes(v) || (b.cp || '').startsWith(v))) return false;
    }
    return true;
  });
}

function relances(jours = 21) {
  const limite = new Date(Date.now() - jours * 86400000).toISOString().slice(0, 10);
  return db.contacts.filter(c => (c.prochaineRelance && c.prochaineRelance <= todayISO()) ||
    (['Acquéreur', 'Vendeur', 'Prospect'].includes(c.type) && (c.derniereInteraction || (c.cree || '').slice(0, 10) || '0') < limite))
    .map(c => ({ id: c.id, nom: contactName(c.id), type: c.type, tel: c.tel, dernierEchange: c.derniereInteraction || null, relancePrevue: c.prochaineRelance || null }));
}

function anniversaires(jours = 7) {
  const out = [];
  for (const c of db.contacts) {
    if (!c.dateNaissance) continue;
    const [, m, d] = c.dateNaissance.split('-').map(Number);
    const now = new Date(todayISO()); let next = new Date(now.getFullYear(), m - 1, d);
    if (next < now) next = new Date(now.getFullYear() + 1, m - 1, d);
    const diff = Math.round((next - now) / 86400000);
    if (diff <= jours) out.push({ id: c.id, nom: contactName(c.id), tel: c.tel, dans: diff, date: next.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) });
  }
  return out.sort((a, b) => a.dans - b.dans);
}

function alertes() {
  const out = [];
  for (const b of db.biens) {
    if (b.finMandat && ETAPES_ACTIVES.includes(b.etape) && daysUntil(b.finMandat) <= 30) out.push({ niveau: daysUntil(b.finMandat) < 0 ? 'danger' : 'warn', txt: `Mandat ${b.numMandat ? 'n°' + b.numMandat + ' ' : ''}${bienName(b.id)} : ${daysUntil(b.finMandat) < 0 ? 'expiré depuis le' : 'expire le'} ${fmtDate(b.finMandat)}`, href: `#dossier/${b.id}` });
    const bloquants = b.documents.filter(d => d.statut === 'Manquant' && ['Diagnostics', 'Copropriété'].includes(d.categorie));
    if (['Offre acceptée', 'Sous compromis'].includes(b.etape) && bloquants.length) out.push({ niveau: 'warn', txt: `${bienName(b.id)} : ${bloquants.length} pièce(s) manquante(s) avant compromis`, href: `#dossier/${b.id}/documents` });
  }
  for (const v of db.ventes) {
    if (v.finCondSusp && v.statut === 'Compromis signé' && daysUntil(v.finCondSusp) >= 0 && daysUntil(v.finCondSusp) <= 15) out.push({ niveau: 'warn', txt: `Fin des conditions suspensives le ${fmtDate(v.finCondSusp)} – ${bienName(v.bienId)}`, href: '#ventes' });
    if (v.dateActe && ['Compromis signé', 'Offre acceptée'].includes(v.statut) && daysUntil(v.dateActe) >= 0 && daysUntil(v.dateActe) <= 15) out.push({ niveau: '', txt: `Acte prévu le ${fmtDate(v.dateActe)} – ${bienName(v.bienId)}`, href: '#ventes' });
  }
  for (const o of db.offres) if (['Reçue', 'Contre-proposition'].includes(o.statut)) out.push({ niveau: o.dateValidite && daysUntil(o.dateValidite) <= 1 ? 'danger' : 'warn', txt: `Offre ${o.statut === 'Reçue' ? 'à traiter' : 'en contre-proposition'} : ${contactName(o.acquereurId)} – ${eur(o.montant)} sur ${bienName(o.bienId)}${o.dateValidite ? ` (valable jusqu'au ${fmtDate(o.dateValidite)})` : ''}`, href: `#dossier/${o.bienId}/offres` });
  for (const t of db.taches) if (!t.fait && t.echeance && daysUntil(t.echeance) < 0) out.push({ niveau: 'danger', txt: `Tâche en retard : ${t.titre}`, href: '#taches' });
  for (const c of db.candidatures) if (['Nouvelle', 'Dossier complet'].includes(c.statut)) out.push({ niveau: '', txt: `Candidature ${c.statut.toLowerCase()} : ${contactName(c.contactId)} – ${bienName(c.bienId)}`, href: '#locations' });
  return out;
}

function briefingData() {
  const today = todayISO();
  return {
    date: today,
    rendezVousAujourdhui: db.rdv.filter(r => r.date.startsWith(today)).sort((a, b) => a.date.localeCompare(b.date)).map(r => ({ id: r.id, heure: r.date.slice(11), type: r.type, contact: contactName(r.contactId), tel: getContact(r.contactId)?.tel, bien: bienName(r.bienId), bonSigne: !!r.bonSigne })),
    rendezVous7Jours: db.rdv.filter(r => r.date.slice(0, 10) > today && daysUntil(r.date) <= 7).map(r => ({ id: r.id, date: r.date, type: r.type, contact: contactName(r.contactId), bien: bienName(r.bienId) })),
    tachesDuJourEtEnRetard: db.taches.filter(t => !t.fait && t.echeance && t.echeance <= today).map(t => ({ id: t.id, titre: t.titre, echeance: t.echeance, priorite: t.priorite })),
    alertes: alertes().map(a => a.txt),
    visitesSansCompteRendu: db.rdv.filter(r => r.type === 'Visite' && r.date.slice(0, 10) < today && !r.compteRendu).map(r => ({ id: r.id, date: r.date, contact: contactName(r.contactId), bien: bienName(r.bienId) })),
    piecesManquantesParDossier: db.biens.filter(b => ETAPES_ACTIVES.includes(b.etape)).map(b => ({ dossier: bienName(b.id), etape: b.etape, manquantes: b.documents.filter(d => d.statut === 'Manquant').map(d => d.nom) })).filter(x => x.manquantes.length),
    relances: relances(21).slice(0, 15),
    selectionsARelancer: db.selections.filter(s => s.relance && s.relance <= today && s.statut !== 'Refusé').map(s => ({ acquereur: contactName(s.contactId), bien: s.bienId ? bienName(s.bienId) : s.externeTitre })),
    anniversaires: anniversaires(7),
  };
}

/* ---------------- Rendu commun ---------------- */
const BADGE = { 'Estimation': 'grey', 'Mandat signé': '', 'Offre acceptée': 'warn', 'Sous compromis': 'warn', 'Vendu': 'ok', 'Retiré': 'grey',
  'Offre acceptée ': 'warn', 'Compromis signé': 'warn', 'Acte signé': 'ok', 'Honoraires encaissés': 'ok', 'Annulée': 'danger',
  'Reçue': 'warn', 'Contre-proposition': 'warn', 'Acceptée': 'ok', 'Refusée': 'danger', 'Retirée': 'grey',
  'Manquant': 'danger', 'Demandé': 'warn', 'Reçu': '', 'Validé': 'ok', 'Non concerné': 'grey',
  'À proposer': 'grey', 'Proposé': '', 'Intéressé': 'ok', 'Visite prévue': 'warn', 'Refusé': 'danger',
  'Nouvelle': 'warn', 'Pièces demandées': '', 'Dossier incomplet': 'warn', 'Dossier complet': 'ok', 'Retenue': 'ok' };
const badge = (s) => s ? `<span class="badge ${BADGE[s] ?? ''}">${esc(s)}</span>` : '';

function table(coll, cols, rows, opts = {}) {
  if (!rows.length) return `<div class="table-wrap"><div class="empty">${opts.empty || 'Aucun élément pour le moment.'}</div></div>`;
  return `<div class="table-wrap"><table><thead><tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(r => `<tr ${opts.href ? `data-href="${opts.href(r)}"` : `data-coll="${coll}" data-id="${r.id}"`}>${cols.map(c => `<td>${c[1](r)}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>`;
}
const telLink = (t) => t ? `<a href="tel:${esc(t)}" data-stop>${esc(t)}</a>` : '';
const askBtn = (label, prompt) => `<button class="btn small ai" data-ask="${esc(prompt)}">✨ ${esc(label)}</button>`;

const filters = { contacts: '', dossiers: '', ventes: '', dossiersVue: 'liste' };
function filterSelect(key, options) {
  return `<select data-filter="${key}"><option value="">Tous</option>${options.map(o => `<option${filters[key] === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
}
function matchSearch(obj) {
  const q = normTxt($('#globalSearch').value);
  return !q || normTxt(JSON.stringify(obj)).includes(q);
}

/* =========================================================
   Vues
   ========================================================= */
const views = {};

views.dashboard = () => {
  const year = new Date().getFullYear();
  const actifs = db.biens.filter(b => ETAPES_ACTIVES.includes(b.etape));
  const encaisse = db.ventes.filter(v => v.statut === 'Honoraires encaissés' && (v.dateEncaissement || v.dateActe || '').startsWith(year)).reduce((s, v) => s + commission(v).net, 0);
  const previsionnel = db.ventes.filter(v => ['Offre acceptée', 'Compromis signé', 'Acte signé'].includes(v.statut)).reduce((s, v) => s + commission(v).net, 0);
  const objectif = Number(db.settings.objectifAnnuel) || 0;
  const pct = objectif ? Math.min(100, Math.round(encaisse / objectif * 100)) : 0;
  const prochainsRdv = db.rdv.filter(r => r.date.slice(0, 10) >= todayISO()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  const taches = db.taches.filter(t => !t.fait).sort((a, b) => (a.echeance || '9999').localeCompare(b.echeance || '9999')).slice(0, 6);
  const al = alertes(), anniv = anniversaires(7), rel = relances(21);
  return `
  <div class="toolbar"><h2>Bonjour${db.settings.nom ? ' ' + esc(db.settings.nom.split(' ')[0]) : ''} 👋</h2>${askBtn('Mon briefing du jour', 'Fais-moi mon briefing du jour, priorisé par urgence, avec les actions concrètes à mener.')}</div>
  <div class="grid kpis">
    <a class="card kpi" href="#dossiers"><div class="label">Mandats en cours</div><div class="value">${actifs.length}</div><div class="muted">${actifs.filter(b => b.mandat === 'Exclusif').length} exclusif(s) · ${db.biens.filter(b => b.etape === 'Estimation').length} estimation(s)</div></a>
    <a class="card kpi" href="#offres"><div class="label">Offres à traiter</div><div class="value">${db.offres.filter(o => ['Reçue', 'Contre-proposition'].includes(o.statut)).length}</div><div class="muted">${db.biens.filter(b => b.etape === 'Sous compromis').length} dossier(s) sous compromis</div></a>
    <a class="card kpi" href="#ventes"><div class="label">Commissions encaissées ${year}</div><div class="value">${eur(encaisse)}</div>${objectif ? `<div class="bar"><span style="width:${pct}%"></span></div><div class="muted">${pct}% de l'objectif</div>` : ''}</a>
    <a class="card kpi" href="#ventes"><div class="label">Commissions à venir</div><div class="value">${eur(previsionnel)}</div><div class="muted">offres & compromis</div></a>
  </div>
  ${al.length ? `<div class="card mb"><h3>⚠️ Urgences & échéances</h3><ul class="list">${al.map(a => `<li><span class="dot ${a.niveau}"></span><a href="${a.href}">${esc(a.txt)}</a></li>`).join('')}</ul></div>` : ''}
  <div class="grid two-cols">
    <div class="card"><h3>📅 Prochains rendez-vous</h3>
      ${prochainsRdv.length ? `<ul class="list">${prochainsRdv.map(r => rdvLi(r)).join('')}</ul>` : '<div class="empty">Aucun rendez-vous prévu.</div>'}
      <button class="btn small" data-new="rdv">+ Rendez-vous</button></div>
    <div class="card"><h3>✅ Tâches</h3>
      ${taches.length ? `<ul class="list">${taches.map(t => tacheLi(t)).join('')}</ul>` : '<div class="empty">Rien à faire, bravo !</div>'}
      <button class="btn small" data-new="taches">+ Tâche</button></div>
    <div class="card"><h3>📞 À relancer</h3>
      ${rel.length ? `<ul class="list">${rel.slice(0, 6).map(c => `<li><a href="#contact/${c.id}" style="flex:1">${esc(c.nom)} <span class="muted">${esc(c.type || '')} · ${c.dernierEchange ? 'dernier échange ' + fmtDate(c.dernierEchange) : 'jamais relancé'}</span></a>${c.tel ? `<a class="btn small" target="_blank" href="${waLink(c.tel, `Bonjour ${getContact(c.id).prenom || ''}, `)}">WhatsApp</a>` : ''}</li>`).join('')}</ul>` : '<div class="empty">Personne à relancer.</div>'}
      ${rel.length ? askBtn('Préparer les relances', 'Identifie les clients à relancer et prépare pour chacun un message WhatsApp personnalisé selon son dossier.') : ''}</div>
    <div class="card"><h3>🎂 Anniversaires (7 jours)</h3>
      ${anniv.length ? `<ul class="list">${anniv.map(a => `<li><span style="flex:1"><a href="#contact/${a.id}">${esc(a.nom)}</a> <span class="muted">${a.dans === 0 ? "aujourd'hui" : a.date}</span></span>${a.tel ? `<a class="btn small" target="_blank" href="${waLink(a.tel, `Joyeux anniversaire ${getContact(a.id).prenom || ''} ! 🎉 Je vous souhaite une très belle journée. ${db.settings.nom || ''}`)}">Souhaiter</a>` : ''}</li>`).join('')}</ul>` : '<div class="empty">Aucun anniversaire cette semaine.</div>'}</div>
  </div>
  <h3 class="mt">Avancement des dossiers</h3>${pipeline()}`;
};

const rdvLi = (r) => `<li data-coll="rdv" data-id="${r.id}" class="clickable"><span class="badge">${esc(r.type)}</span><div style="flex:1"><div>${esc(contactName(r.contactId) || bienName(r.bienId) || r.lieu || '—')}${r.bienId && r.contactId ? ` <span class="muted">· ${esc(bienName(r.bienId))}</span>` : ''}</div><div class="muted">${fmtDateTime(r.date)}</div></div>${getContact(r.contactId)?.tel ? `<a class="btn small" data-stop target="_blank" href="${waLink(getContact(r.contactId).tel, confirmationVisiteTexte(r))}" title="Confirmer par WhatsApp">🟢</a>` : ''}</li>`;
const tacheLi = (t) => `<li><input type="checkbox" data-toggle="${t.id}"${t.fait ? ' checked' : ''}><div data-coll="taches" data-id="${t.id}" class="clickable" style="flex:1${t.fait ? ';text-decoration:line-through;opacity:.6' : ''}"><div>${esc(t.titre)} ${t.priorite === 'Haute' ? badge('Haute').replace('badge ', 'badge danger ') : ''}</div><div class="muted">${t.echeance ? fmtDate(t.echeance) : 'Sans échéance'}${!t.fait && t.echeance && daysUntil(t.echeance) < 0 ? ' · en retard' : ''}${t.contactId ? ' · ' + esc(contactName(t.contactId)) : ''}${t.bienId ? ' · ' + esc(bienName(t.bienId)) : ''}</div></div></li>`;

function pipeline() {
  return `<div class="pipeline">${ETAPES.filter(s => s !== 'Retiré').map(s => {
    const items = db.biens.filter(b => b.etape === s);
    return `<div class="col" data-drop="${esc(s)}"><h4>${esc(s)} <span class="badge grey">${items.length}</span></h4>
      ${items.map(b => `<a class="item" draggable="true" data-drag="${b.id}" href="#dossier/${b.id}"><strong>${esc(bienName(b.id))}</strong><br><span class="muted">${b.prix ? eur(b.prix) : b.estimation ? 'Estim. ' + eur(b.estimation) : ''} ${b.surface ? '· ' + num(b.surface) + ' m²' : ''}</span>${progressBar(b)}</a>`).join('')}</div>`;
  }).join('')}</div>`;
}
function progressBar(b) {
  const docs = b.documents.filter(d => d.statut !== 'Non concerné');
  if (!docs.length) return '';
  const ok = docs.filter(d => ['Reçu', 'Validé'].includes(d.statut)).length;
  return `<div class="bar small" title="${ok}/${docs.length} pièces"><span style="width:${Math.round(ok / docs.length * 100)}%"></span></div>`;
}

views.dossiers = () => {
  const rows = db.biens.filter(b => (!filters.dossiers || b.etape === filters.dossiers) && matchSearch({ ...b, documents: '', photos: '' }));
  return `<div class="toolbar"><h2>Dossiers & mandats</h2>
    <div class="seg"><button class="btn small ${filters.dossiersVue === 'liste' ? 'primary' : ''}" data-vue="liste">Liste</button><button class="btn small ${filters.dossiersVue === 'kanban' ? 'primary' : ''}" data-vue="kanban">Avancement</button></div>
    ${filterSelect('dossiers', ETAPES)}<button class="btn primary" data-new="biens">+ Nouveau dossier</button></div>
  ${filters.dossiersVue === 'kanban' ? pipeline() + '<p class="muted">Astuce : glissez une carte pour changer d\'étape.</p>' : table('biens', [
    ['Dossier', b => `<strong>${esc(bienName(b.id))}</strong><div class="muted">${esc(b.type || '')} ${b.pieces ? esc(b.pieces) + 'p' : ''} ${b.surface ? num(b.surface) + ' m²' : ''}</div>`],
    ['Étape', b => badge(b.etape)],
    ['Prix', b => b.prix ? eur(b.prix) : b.estimation ? `<span class="muted">estim. ${eur(b.estimation)}</span>` : ''],
    ['Vendeur(s)', b => esc(b.parties.filter(p => /vendeur|Héritier|Usufruitier/i.test(p.role)).map(p => contactName(p.contactId)).join(', '))],
    ['Mandat', b => esc(`${b.mandat || ''} ${b.numMandat ? 'n°' + b.numMandat : ''}`) + (b.finMandat ? `<div class="muted">fin ${fmtDate(b.finMandat)}${daysUntil(b.finMandat) <= 30 && ETAPES_ACTIVES.includes(b.etape) ? ' ⚠️' : ''}</div>` : '')],
    ['Pièces', b => { const m = b.documents.filter(d => d.statut === 'Manquant').length; return m ? `<span class="badge danger">${m} manquante(s)</span>` : '<span class="badge ok">complet</span>'; }],
    ['Acquéreurs', b => { const n = matches(b).length; return n ? `<span class="badge">${n} correspondant(s)</span>` : '<span class="muted">0</span>'; }],
  ], rows, { href: b => `#dossier/${b.id}`, empty: 'Aucun dossier. Créez votre premier mandat ou chargez les données d\'exemple dans Paramètres.' })}`;
};

/* ---------- Fiche dossier ---------- */
const DOSSIER_TABS = [['infos', 'Infos'], ['parties', 'Parties'], ['documents', 'Documents'], ['photos', 'Photos'], ['visites', 'Visites'], ['offres', 'Offres'], ['acquereurs', 'Acquéreurs'], ['location', 'Candidatures'], ['notes', 'Notes & mémoire'], ['diffusion', 'Diffusion']];
let photoUrls = [];
function viewDossier(id, tab = 'infos') {
  const b = getBien(id); if (!b) return '<div class="empty">Dossier introuvable.</div>';
  const tabs = DOSSIER_TABS.filter(([k]) => k !== 'location' || b.transaction === 'Location');
  const idx = ETAPES.indexOf(b.etape);
  const vendeurs = b.parties.filter(p => /vendeur|Héritier|Usufruitier/i.test(p.role));
  return `<div class="toolbar"><a class="btn small" href="#dossiers">←</a><h2>${esc(bienName(id))}</h2>
    <button class="btn" data-coll="biens" data-id="${id}">Modifier</button>
    ${askBtn('Demander au copilote', `Fais le point complet sur le dossier « ${bienName(id)} » : où en est-on, ce qui bloque, les prochaines actions.`)}</div>
  <div class="steps">${ETAPES.filter(e => e !== 'Retiré').map((e, i) => `<button class="step ${i < idx ? 'done' : ''} ${e === b.etape ? 'current' : ''}" data-etape="${esc(e)}" data-bien="${id}">${i < idx ? '✓ ' : ''}${esc(e)}</button>`).join('')}</div>
  <div class="muted mb">${esc(b.transaction)} · ${esc([b.adresse, b.cp, b.ville].filter(Boolean).join(' '))} ${b.prix ? '· <strong>' + eur(b.prix) + '</strong>' : ''} ${vendeurs.length ? '· ' + vendeurs.map(p => `<a href="#contact/${p.contactId}">${esc(contactName(p.contactId))}</a>`).join(', ') : ''}</div>
  <div class="tabs">${tabs.map(([k, l]) => `<a href="#dossier/${id}/${k}" class="${k === tab ? 'active' : ''}">${l}${k === 'documents' ? ` <span class="badge ${b.documents.some(d => d.statut === 'Manquant') ? 'danger' : 'ok'}">${b.documents.filter(d => ['Reçu', 'Validé'].includes(d.statut)).length}/${b.documents.filter(d => d.statut !== 'Non concerné').length}</span>` : ''}</a>`).join('')}</div>
  <div class="tab-body">${(DOSSIER_VIEWS[tab] || DOSSIER_VIEWS.infos)(b)}</div>`;
}

const DOSSIER_VIEWS = {
  infos: (b) => {
    const f = (l, v) => v ? `<div><div class="muted">${l}</div><div>${v}</div></div>` : '';
    return `<div class="grid two-cols"><div class="card"><h3>Caractéristiques</h3><div class="facts">
      ${f('Type', esc(b.type))}${f('Surface', b.surface && num(b.surface) + ' m²')}${f('Terrain', b.terrain && num(b.terrain) + ' m²')}${f('Pièces', esc(b.pieces))}${f('Chambres', esc(b.chambres))}
      ${f('DPE / GES', esc([b.dpe, b.ges].filter(Boolean).join(' / ')))}${f('Année', esc(b.annee))}${f('Copropriété', b.copropriete === 'Oui' ? `Oui${b.lots ? ` · ${esc(b.lots)} lots` : ''}${b.charges ? ` · ${eur(b.charges)}/an` : ''}` : '')}${f('Succession', b.succession === 'Oui' ? 'Oui' : '')}
    </div>${b.description ? `<p class="pre">${esc(b.description)}</p>` : ''}</div>
    <div class="card"><h3>Mandat & prix</h3><div class="facts">
      ${f('Estimation', b.estimation && eur(b.estimation))}${f('Prix FAI', b.prix && eur(b.prix))}${f('Loyer', b.loyer && eur(b.loyer))}${f('Honoraires TTC', b.honoraires && eur(b.honoraires))}
      ${f('Mandat', esc([b.mandat, b.numMandat && 'n°' + b.numMandat].filter(Boolean).join(' ')))}${f('Début', fmtDate(b.debutMandat))}${f('Fin', fmtDate(b.finMandat))}
      ${f('Annonce', b.lienAnnonce && `<a href="${esc(b.lienAnnonce)}" target="_blank" rel="noopener">voir l'annonce</a>`)}
    </div></div></div>
    <div class="card mt"><h3>Actions rapides</h3><div class="actions-wrap">
      ${askBtn('Bilan de commercialisation', `Prépare le bilan de commercialisation pour les vendeurs du dossier « ${b.titre || bienName(b.id)} » à partir des visites, des retours et des offres, enregistre-le en PDF dans le dossier et prépare le mail d'envoi aux vendeurs.`)}
      ${askBtn('Préparer le dossier notaire', `Prépare le dossier notaire pour « ${bienName(b.id)} » : liste les pièces reçues et manquantes, puis prépare le mail au notaire avec toutes les pièces disponibles en pièces jointes (brouillon Gmail si connecté).`)}
      ${askBtn('Demander les pièces manquantes', `Prépare la demande des pièces manquantes du dossier « ${bienName(b.id)} » aux vendeurs (e-mail et WhatsApp), et passe ces pièces au statut « Demandé ».`)}
      ${askBtn('Lire le compromis', `Lis le compromis (ou projet de compromis) du dossier « ${bienName(b.id)} », vérifie la cohérence avec les informations du dossier, liste ce qui peut être complété avec ce que l'on sait et ce qui manque.`)}
      ${askBtn('Chercher les mails du dossier', `Recherche dans Gmail les e-mails liés au dossier « ${bienName(b.id)} » (vendeurs, adresse, notaire), résume les échanges récents et range les pièces jointes utiles dans le dossier.`)}
    </div></div>
    <div class="card mt"><h3>Historique</h3>${(b.historique || []).length ? `<ul class="list">${b.historique.slice(0, 20).map(h => `<li><span class="muted" style="min-width:110px">${fmtDate(h.date)}</span>${esc(h.texte)}</li>`).join('')}</ul>` : '<div class="empty">—</div>'}</div>`;
  },
  parties: (b) => `<div class="card"><h3>Parties au dossier</h3>
    ${b.parties.length ? `<ul class="list">${b.parties.map((p, i) => { const c = getContact(p.contactId); return `<li><span class="badge">${esc(p.role)}</span><a href="#contact/${p.contactId}" style="flex:1">${esc(contactName(p.contactId))}</a><span class="muted">${esc(c?.tel || '')} ${esc(c?.email || '')}</span><button class="btn small" data-rm-partie="${i}" data-bien="${b.id}">Retirer</button></li>`; }).join('')}</ul>` : '<div class="empty">Aucune partie. Ajoutez vendeurs, co-vendeurs, héritiers, acquéreurs, notaires…</div>'}
    <form class="inline-form" data-add-partie="${b.id}"><select name="contactId" required>${contactOpts().map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>
      <select name="role">${ROLES.map(r => `<option>${esc(r)}</option>`).join('')}</select><button class="btn primary">Ajouter</button>
      <button type="button" class="btn" data-new-contact-partie="${b.id}">+ Nouveau contact</button></form></div>`,
  documents: (b) => {
    const cats = [...new Set(b.documents.map(d => d.categorie))].sort((x, y) => DOC_CATEGORIES.indexOf(x) - DOC_CATEGORIES.indexOf(y));
    const manquants = b.documents.filter(d => d.statut === 'Manquant');
    return `<div class="toolbar"><span class="muted">${b.documents.filter(d => ['Reçu', 'Validé'].includes(d.statut)).length} pièce(s) reçue(s) · ${manquants.length} manquante(s)</span><span class="spacer"></span>
      <label class="btn">📎 Ajouter des fichiers<input type="file" multiple hidden data-upload-doc="${b.id}"></label>
      ${askBtn('Analyser les diagnostics', `Analyse tous les diagnostics disponibles du dossier « ${bienName(b.id)} » (DPE, amiante, plomb, électricité, gaz, termites, ERP, assainissement, Carrez) : synthèse, points de vigilance, ce qu'il faut dire aux acquéreurs. Enregistre l'analyse sur chaque document.`)}
      ${b.copropriete === 'Oui' || b.type === 'Appartement' ? askBtn('Analyser la copropriété', `Analyse les documents de copropriété du dossier « ${bienName(b.id)} » (PV d'AG, règlement, fiche synthétique, appels de charges, pré-état daté) : travaux votés et à venir, montants, procédures, impayés, points de vigilance.`) : ''}
      ${manquants.length ? askBtn('Demander les pièces', `Prépare la demande des pièces manquantes du dossier « ${bienName(b.id)} » aux vendeurs (e-mail et WhatsApp), et passe ces pièces au statut « Demandé ».`) : ''}</div>
    ${cats.map(cat => `<div class="card mb"><h3>${esc(cat)}</h3><ul class="list">${b.documents.filter(d => d.categorie === cat).map(d => `<li class="doc-row">
      <span style="flex:1;min-width:180px">${esc(d.nom)}${d.fichier && d.fichier !== d.nom ? `<div class="muted">${esc(d.fichier)}</div>` : ''}${d.commentaire ? `<div class="muted">${esc(d.commentaire)}</div>` : ''}</span>
      <select data-doc-statut="${d.id}" data-bien="${b.id}" class="doc-select">${DOC_STATUTS.map(s => `<option${s === d.statut ? ' selected' : ''}>${s}</option>`).join('')}</select>
      ${d.fileId ? `<button class="btn small" data-open-file="${d.fileId}">Ouvrir</button><button class="btn small" data-share-file="${d.fileId}" title="Partager (WhatsApp, mail…)">↗</button>${askBtn('Analyser', `Analyse le document « ${d.nom} » du dossier « ${bienName(b.id)} » et enregistre la synthèse.`)}`
        : `<label class="btn small">Déposer<input type="file" hidden data-upload-doc="${b.id}" data-doc-nom="${esc(d.nom)}"></label>`}
      <button class="btn small ghost" data-rm-doc="${d.id}" data-bien="${b.id}" title="Retirer">✕</button>
      ${d.analyse ? `<details class="analyse"><summary>Analyse du copilote</summary><div>${Copilot && typeof d.analyse === 'string' ? esc(d.analyse).replace(/\n/g, '<br>') : ''}</div></details>` : ''}
    </li>`).join('')}</ul></div>`).join('')}
    <form class="inline-form" data-add-doc="${b.id}"><input name="nom" placeholder="Ajouter une pièce attendue…" required><select name="categorie">${DOC_CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select><button class="btn">Ajouter</button></form>`;
  },
  photos: (b) => `<div class="toolbar"><span class="muted">${b.photos.length} photo(s)</span><span class="spacer"></span>
      <label class="btn primary">📷 Ajouter des photos<input type="file" accept="image/*" multiple hidden data-upload-photo="${b.id}"></label>
      ${b.photos.length ? askBtn('Rédiger l\'annonce', `Rédige l'annonce du bien « ${bienName(b.id)} » à partir de ses caractéristiques et de ses photos, avec les mentions obligatoires.`) : ''}</div>
    <div class="gallery" id="gallery" data-bien="${b.id}">${b.photos.map((id, i) => `<figure data-photo="${id}"><img alt="Photo ${i + 1}" data-img="${id}"><figcaption>${i === 0 ? '<span class="badge">Couverture</span>' : `<button class="btn small" data-photo-first="${id}">En couverture</button>`}<button class="btn small" data-share-file="${id}">↗</button><button class="btn small ghost" data-rm-photo="${id}">✕</button></figcaption></figure>`).join('') || '<div class="empty">Aucune photo.</div>'}</div>`,
  visites: (b) => {
    const vis = db.rdv.filter(r => r.bienId === b.id).sort((x, y) => y.date.localeCompare(x.date));
    return `<div class="toolbar"><span class="muted">${vis.filter(r => r.type === 'Visite').length} visite(s)</span><span class="spacer"></span>
      <button class="btn primary" data-new="rdv" data-preset='${esc(JSON.stringify({ bienId: b.id, type: 'Visite', lieu: [b.adresse, b.cp, b.ville].filter(Boolean).join(' ') }))}'>+ Visite</button>
      ${askBtn('Bilan de commercialisation', `Prépare le bilan de commercialisation pour les vendeurs du dossier « ${bienName(b.id)} » à partir des visites et retours, enregistre-le en PDF et prépare le mail aux vendeurs.`)}</div>
    ${table('rdv', [
      ['Date', r => fmtDateTime(r.date)], ['Type', r => esc(r.type)], ['Visiteur', r => esc(contactName(r.contactId))],
      ['Intérêt', r => r.interet ? '★'.repeat(Number(r.interet)) : ''], ['Bon de visite', r => r.bonSigne ? badge('Validé').replace('Validé', 'signé') : (r.bonDocId ? '<span class="badge">généré</span>' : '')],
      ['Retour', r => `<span class="truncate">${esc(r.compteRendu || '')}</span>`],
      ['', r => `<button class="btn small" data-bon="${r.id}">Bon de visite</button>${getContact(r.contactId)?.tel ? `<a class="btn small" data-stop target="_blank" href="${waLink(getContact(r.contactId).tel, confirmationVisiteTexte(r))}">🟢 Confirmer</a>` : ''}${askBtn('Envoyer bon + docs', `Pour la visite de ${contactName(r.contactId)} le ${fmtDateTime(r.date)} sur « ${bienName(b.id)} » : génère le bon de visite, puis prépare l'e-mail au visiteur avec le bon de visite et les documents utiles (DPE, diagnostics, plaquette) en pièces jointes, et un WhatsApp de confirmation.`)}`],
    ], vis, { empty: 'Aucune visite enregistrée.' })}`;
  },
  offres: (b) => {
    const offs = db.offres.filter(o => o.bienId === b.id).sort((x, y) => (y.dateOffre || '').localeCompare(x.dateOffre || ''));
    return `<div class="toolbar"><span class="spacer"></span><button class="btn primary" data-new="offres" data-preset='${esc(JSON.stringify({ bienId: b.id, statut: 'Reçue', dateOffre: todayISO() }))}'>+ Offre reçue</button></div>
    ${offs.length ? offs.map(o => `<div class="card mb"><div class="toolbar"><h3 style="margin:0 auto 0 0">${esc(contactName(o.acquereurId) || 'Acquéreur')} – ${eur(o.montant)} ${o.contreMontant ? `<span class="muted">(contre-proposition ${eur(o.contreMontant)})</span>` : ''}</h3>${badge(o.statut)}<button class="btn small" data-coll="offres" data-id="${o.id}">Modifier</button></div>
      <div class="muted">Reçue le ${fmtDate(o.dateOffre)}${o.dateValidite ? ` · valable jusqu'au ${fmtDate(o.dateValidite)}` : ''}${b.prix ? ` · ${Math.round((o.montant / b.prix - 1) * 1000) / 10}% vs prix affiché` : ''}</div>
      ${o.financement ? `<div>💶 ${esc(o.financement)}</div>` : ''}${o.conditions ? `<div class="pre">${esc(o.conditions)}</div>` : ''}
      ${['Reçue', 'Contre-proposition'].includes(o.statut) ? `<div class="actions-wrap mt">
        ${askBtn('Préparer l\'acceptation', `Prépare l'acceptation de l'offre de ${contactName(o.acquereurId)} (${eur(o.montant)}) sur « ${bienName(b.id)} » : courrier PDF d'acceptation à signer par les vendeurs, mail à l'acquéreur, mise à jour du statut après mon accord.`)}
        ${askBtn('Préparer un refus', `Prépare un refus courtois de l'offre de ${contactName(o.acquereurId)} (${eur(o.montant)}) sur « ${bienName(b.id)} » : mail à l'acquéreur, sans mettre à jour le statut avant mon accord.`)}
        ${askBtn('Contre-proposition', `Prépare une contre-proposition à l'offre de ${contactName(o.acquereurId)} (${eur(o.montant)}) sur « ${bienName(b.id)} ». Demande-moi le montant si je ne l'ai pas indiqué, puis prépare le courrier PDF et le mail.`)}
      </div>` : ''}</div>`).join('') : '<div class="card empty">Aucune offre pour ce dossier.</div>'}`;
  },
  acquereurs: (b) => {
    const m = matches(b);
    const sel = db.selections.filter(s => s.bienId === b.id);
    return `<div class="toolbar"><h3 style="margin:0 auto 0 0">Acquéreurs correspondants (${m.length})</h3>${askBtn('Proposer le bien', `Pour « ${bienName(b.id)} », vérifie les acquéreurs correspondants, ajoute le bien à leur sélection et prépare un message WhatsApp personnalisé pour chacun.`)}</div>
    ${table('contacts', [
      ['Nom', c => `<strong>${esc(contactName(c.id))}</strong>`], ['Téléphone', c => telLink(c.tel)], ['Budget', c => eur(c.budgetMax)], ['Secteur', c => esc(c.villes)], ['Financement', c => esc(c.financement)],
      ['Statut', c => { const s = sel.find(x => x.contactId === c.id); return s ? badge(s.statut) : `<button class="btn small" data-add-sel="${c.id}" data-bien="${b.id}">Ajouter à sa sélection</button>`; }],
    ], m, { href: c => `#contact/${c.id}`, empty: 'Aucun acquéreur ne correspond (budget, type, surface, pièces, secteur).' })}`;
  },
  location: (b) => {
    const cands = db.candidatures.filter(c => c.bienId === b.id);
    return `<div class="toolbar"><span class="spacer"></span><button class="btn primary" data-new="candidatures" data-preset='${esc(JSON.stringify({ bienId: b.id, statut: 'Nouvelle' }))}'>+ Candidature</button></div>${candidaturesTable(cands)}`;
  },
  notes: (b) => `<div class="grid two-cols"><div class="card"><h3>🧠 Mémoire du bien</h3><p class="muted">Faits durables : particularités, motivations du vendeur, historique de prix, voisinage… Le copilote s'en sert.</p>
      <textarea data-memoire="${b.id}" rows="10">${esc(b.memoire || '')}</textarea><button class="btn small mt" data-save-memoire="${b.id}">Enregistrer</button></div>
    <div class="card"><h3>📝 Notes</h3><form class="inline-form" data-add-note="${b.id}"><textarea name="texte" placeholder="Nouvelle note…" required></textarea><button class="btn primary">Ajouter</button></form>
      <ul class="list">${b.notes.map(n => `<li><div style="flex:1"><div class="muted">${fmtDateTime(n.date)}</div><div class="pre">${esc(n.texte)}</div></div><button class="btn small ghost" data-rm-note="${n.id}" data-bien="${b.id}">✕</button></li>`).join('')}</ul></div></div>`,
  diffusion: (b) => `<div class="card"><h3>Contenus de diffusion</h3><p class="muted">Le copilote s'appuie sur les caractéristiques et les photos du bien.</p><div class="actions-wrap">
    ${askBtn('Annonce', `Rédige l'annonce immobilière du bien « ${bienName(b.id)} » (titre accrocheur, texte, mentions obligatoires), en regardant les photos.`)}
    ${askBtn('Post Instagram / Facebook', `Rédige un post Instagram et un post Facebook pour le bien « ${bienName(b.id)} » avec hashtags locaux, en regardant les photos.`)}
    ${askBtn('Script de reel', `Écris le script d'un reel de 30 secondes pour le bien « ${bienName(b.id)} » : accroche des 3 premières secondes, plan par plan (quelle photo/pièce filmer, mouvement de caméra), texte à l'écran, voix off, musique conseillée, légende et hashtags.`)}
    ${askBtn('Film de présentation', `Écris le storyboard d'une vidéo de visite de 90 secondes pour « ${bienName(b.id)} » : séquences, ordre des pièces, plans, textes, voix off et appel à l'action.`)}
    ${askBtn('Story « Vendu »', `Prépare un texte de story et un post « Vendu » pour « ${bienName(b.id)} » qui valorise le travail réalisé, sans donner le prix.`)}
    ${askBtn('Mail aux acquéreurs', `Rédige un mail de présentation de « ${bienName(b.id)} » à envoyer aux acquéreurs correspondants.`)}
  </div></div>`,
};

function candidaturesTable(cands) {
  return table('candidatures', [
    ['Candidat', c => `<strong>${esc(contactName(c.contactId))}</strong>`], ['Logement', c => esc(bienName(c.bienId))], ['Statut', c => badge(c.statut)],
    ['Revenus', c => c.revenus ? eur(c.revenus) + (getBien(c.bienId)?.loyer ? ` <span class="muted">(${Math.round(c.revenus / getBien(c.bienId).loyer * 10) / 10}× le loyer)</span>` : '') : ''],
    ['Pièces', c => { const n = PIECES_CANDIDAT.filter(p => (c.pieces || {})[p]).length; return `<span class="badge ${n === PIECES_CANDIDAT.length ? 'ok' : 'warn'}">${n}/${PIECES_CANDIDAT.length}</span>`; }],
    ['', c => { const ct = getContact(c.contactId); return `${ct?.tel ? `<a class="btn small" data-stop target="_blank" href="${waLink(ct.tel, demandePiecesCandidatTexte(c))}">Demander les pièces</a>` : ''}${ct?.email ? `<a class="btn small" data-stop href="${mailtoLink(ct.email, 'Votre dossier de candidature', demandePiecesCandidatTexte(c))}">✉️</a>` : ''}<button class="btn small" data-pieces="${c.id}">Pièces reçues</button>`; }],
  ], cands, { empty: 'Aucune candidature.' });
}

/* ---------- Contacts ---------- */
views.contacts = () => {
  const rows = db.contacts.filter(c => (!filters.contacts || c.type === filters.contacts) && matchSearch(c)).sort((a, b) => contactName(a.id).localeCompare(contactName(b.id)));
  const dupCount = db.contacts.filter(c => findDuplicates(c, c.id).length).length;
  return `<div class="toolbar"><h2>Contacts</h2>${filterSelect('contacts', CONTACT_TYPES)}<button class="btn primary" data-new="contacts">+ Nouveau contact</button></div>
  ${dupCount ? `<div class="warn-box mb">⚠️ ${dupCount} fiche(s) semblent en double. ${askBtn('Vérifier les doublons', 'Repère les fiches contacts en double, montre-les-moi et propose les fusions (sans rien fusionner sans mon accord).')}</div>` : ''}
  ${table('contacts', [
    ['Nom', c => `<strong>${esc(contactName(c.id))}</strong>`], ['Type', c => `<span class="badge">${esc(c.type)}</span>`],
    ['Téléphone', c => telLink(c.tel)], ['E-mail', c => c.email ? `<a href="mailto:${esc(c.email)}" data-stop>${esc(c.email)}</a>` : ''],
    ['Recherche', c => c.budgetMax ? `${esc(c.typeRecherche || '')} ≤ ${eur(c.budgetMax)} ${esc(c.villes || '')}` : ''],
    ['Dernier échange', c => c.derniereInteraction ? fmtDate(c.derniereInteraction) : '<span class="muted">—</span>'],
  ], rows, { href: c => `#contact/${c.id}` })}`;
};

function viewContact(id) {
  const c = getContact(id); if (!c) return '<div class="empty">Contact introuvable.</div>';
  const dossiers = db.biens.filter(b => b.parties.some(p => p.contactId === id));
  const sel = db.selections.filter(s => s.contactId === id);
  const vis = db.rdv.filter(r => r.contactId === id).sort((a, b) => b.date.localeCompare(a.date));
  const dups = findDuplicates(c, id);
  const biensOk = c.type === 'Acquéreur' ? db.biens.filter(b => ETAPES_ACTIVES.includes(b.etape) && matches(b).some(x => x.id === id)) : [];
  return `<div class="toolbar"><a class="btn small" href="#contacts">←</a><h2>${esc(contactName(id))} <span class="badge">${esc(c.type)}</span></h2>
    <button class="btn" data-coll="contacts" data-id="${id}">Modifier</button>${askBtn('Demander au copilote', `Fais le point sur ${contactName(id)} : historique, dossiers, prochaines actions, et propose un message de relance.`)}</div>
  ${dups.length ? `<div class="warn-box mb">⚠️ Doublon possible : ${dups.map(d => `<a href="#contact/${d.id}">${esc(contactName(d.id))}</a> <button class="btn small" data-merge="${d.id}" data-keep="${id}">Fusionner dans cette fiche</button>`).join(' ')}</div>` : ''}
  <div class="grid two-cols">
    <div class="card"><h3>Coordonnées</h3><div class="facts">
      <div><div class="muted">Téléphone</div>${telLink(c.tel) || '—'}</div><div><div class="muted">E-mail</div>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</div>
      <div><div class="muted">Adresse</div>${esc(c.adresse || '—')}</div><div><div class="muted">Anniversaire</div>${c.dateNaissance ? new Date(c.dateNaissance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '—'}</div>
      <div><div class="muted">Source</div>${esc(c.source || '—')}</div><div><div class="muted">Prochaine relance</div>${c.prochaineRelance ? fmtDate(c.prochaineRelance) : '—'}</div></div>
      <div class="actions-wrap mt">${c.tel ? `<a class="btn small" target="_blank" href="${waLink(c.tel, `Bonjour ${c.prenom || ''}, `)}">🟢 WhatsApp</a><a class="btn small" href="${smsLink(c.tel, '')}">💬 SMS</a><a class="btn small" href="tel:${esc(c.tel)}">📞 Appeler</a>` : ''}
        ${askBtn('Rédiger un mail', `Rédige un e-mail à ${contactName(id)} adapté à sa situation actuelle (dossiers, recherche, dernières visites).`)}
        ${askBtn('Ses derniers mails', `Recherche dans Gmail mes derniers échanges avec ${contactName(id)}${c.email ? ' (' + c.email + ')' : ''} et résume-les.`)}
        <button class="btn small" data-touch="${id}">✓ Marquer « contacté aujourd'hui »</button></div>
      ${c.notes ? `<p class="pre mt">${esc(c.notes)}</p>` : ''}</div>
    ${c.type === 'Acquéreur' || c.budgetMax ? `<div class="card"><h3>🔎 Recherche</h3><div class="facts">
      <div><div class="muted">Budget</div>${c.budgetMax ? eur(c.budgetMax) : '—'}</div><div><div class="muted">Type</div>${esc(c.typeRecherche || '—')}</div>
      <div><div class="muted">Secteur</div>${esc(c.villes || '—')}</div><div><div class="muted">Surface / pièces</div>${esc([c.surfaceMin && c.surfaceMin + ' m²', c.piecesMin && c.piecesMin + ' p.'].filter(Boolean).join(' · ') || '—')}</div>
      <div><div class="muted">Financement</div>${esc(c.financement || '—')}</div><div><div class="muted">Autres critères</div>${esc(c.criteres || '—')}</div></div>
      <div class="actions-wrap mt">${askBtn('Chercher des annonces', `Cherche sur le web des annonces publiques qui correspondent à la recherche de ${contactName(id)}, compare avec mon portefeuille, et ajoute les meilleures à sa sélection.`)}
      ${askBtn('Relancer sur la sélection', `Prépare une relance WhatsApp pour ${contactName(id)} sur les biens de sa sélection, et demande-lui son avis.`)}</div>
      ${biensOk.length ? `<h4>Biens du portefeuille qui correspondent</h4><ul class="list">${biensOk.map(b => `<li><a href="#dossier/${b.id}" style="flex:1">${esc(bienName(b.id))} · ${eur(b.prix)}</a>${sel.some(s => s.bienId === b.id) ? badge(sel.find(s => s.bienId === b.id).statut) : `<button class="btn small" data-add-sel="${id}" data-bien="${b.id}">Ajouter à la sélection</button>`}</li>`).join('')}</ul>` : ''}</div>` : ''}
  </div>
  <div class="card mt"><div class="toolbar"><h3 style="margin:0 auto 0 0">Sélection de biens</h3><button class="btn small" data-new="selections" data-preset='${esc(JSON.stringify({ contactId: id, statut: 'À proposer' }))}'>+ Ajouter</button></div>
    ${sel.length ? table('selections', [['Bien', s => s.bienId ? `<a href="#dossier/${s.bienId}" data-stop>${esc(bienName(s.bienId))}</a>` : (s.externeUrl ? `<a href="${esc(s.externeUrl)}" target="_blank" data-stop>${esc(s.externeTitre || 'Annonce')}</a>` : esc(s.externeTitre))],
      ['Prix', s => eur(s.bienId ? getBien(s.bienId)?.prix : s.externePrix)], ['Statut', s => badge(s.statut)], ['Relance', s => fmtDate(s.relance)], ['Commentaire', s => esc(s.commentaire || '')]], sel) : '<div class="empty">Aucun bien proposé.</div>'}</div>
  <div class="grid two-cols mt">
    <div class="card"><h3>Dossiers</h3>${dossiers.length ? `<ul class="list">${dossiers.map(b => `<li><span class="badge">${esc(b.parties.find(p => p.contactId === id).role)}</span><a href="#dossier/${b.id}" style="flex:1">${esc(bienName(b.id))}</a>${badge(b.etape)}</li>`).join('')}</ul>` : '<div class="empty">—</div>'}</div>
    <div class="card"><h3>Rendez-vous & visites</h3>${vis.length ? `<ul class="list">${vis.map(rdvLi).join('')}</ul>` : '<div class="empty">—</div>'}</div>
  </div>
  <div class="card mt"><h3>📝 Notes</h3><form class="inline-form" data-add-cnote="${id}"><textarea name="texte" placeholder="Compte rendu d'appel, information utile…" required></textarea><button class="btn primary">Ajouter</button></form>
    <ul class="list">${(c.notesListe || []).map(n => `<li><div><div class="muted">${fmtDateTime(n.date)}</div><div class="pre">${esc(n.texte)}</div></div></li>`).join('')}</ul></div>`;
}

/* ---------- Agenda / tâches / offres / recherches / locations / ventes ---------- */
views.agenda = () => {
  const past = filters.agendaPast;
  const rows = db.rdv.filter(r => (past || r.date.slice(0, 10) >= todayISO()) && matchSearch(r)).sort((a, b) => past ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  const groups = {}; rows.forEach(r => (groups[r.date.slice(0, 10)] ||= []).push(r));
  return `<div class="toolbar"><h2>Agenda</h2><label class="muted"><input type="checkbox" id="pastToggle"${past ? ' checked' : ''}> Historique</label>
    ${Google.isConnected() ? `<button class="btn" id="syncAgenda">Voir mon Google Agenda</button>` : ''}
    ${askBtn('Confirmer les visites de demain', 'Prépare les messages WhatsApp de confirmation pour tous mes rendez-vous de demain, et génère les bons de visite manquants.')}
    <button class="btn primary" data-new="rdv">+ Rendez-vous</button></div>
  <div id="gcal"></div>
  ${rows.length ? Object.entries(groups).map(([day, items]) => `<div class="card mb"><h3 class="cap">${new Date(day).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3><ul class="list">${items.map(rdvLi).join('')}</ul></div>`).join('') : '<div class="card empty">Aucun rendez-vous.</div>'}`;
};

views.taches = () => {
  const done = filters.tachesDone;
  const rows = db.taches.filter(t => (done || !t.fait) && matchSearch(t)).sort((a, b) => (a.fait - b.fait) || (a.echeance || '9999').localeCompare(b.echeance || '9999'));
  return `<div class="toolbar"><h2>Tâches & relances</h2><label class="muted"><input type="checkbox" id="doneToggle"${done ? ' checked' : ''}> Terminées</label><button class="btn primary" data-new="taches">+ Tâche</button></div>
  <div class="card">${rows.length ? `<ul class="list">${rows.map(tacheLi).join('')}</ul>` : '<div class="empty">Aucune tâche.</div>'}</div>`;
};

views.offres = () => {
  const rows = db.offres.filter(matchSearch).sort((a, b) => (b.dateOffre || '').localeCompare(a.dateOffre || ''));
  return `<div class="toolbar"><h2>Offres d'achat</h2><button class="btn primary" data-new="offres" data-preset='${esc(JSON.stringify({ statut: 'Reçue', dateOffre: todayISO() }))}'>+ Offre reçue</button></div>
  ${table('offres', [['Date', o => fmtDate(o.dateOffre)], ['Dossier', o => esc(bienName(o.bienId))], ['Acquéreur', o => esc(contactName(o.acquereurId))], ['Montant', o => eur(o.montant) + (o.contreMontant ? ` <span class="muted">→ ${eur(o.contreMontant)}</span>` : '')],
    ['Statut', o => badge(o.statut)], ['Validité', o => fmtDate(o.dateValidite)]], rows, { href: o => `#dossier/${o.bienId}/offres` })}`;
};

views.recherches = () => {
  const acq = db.contacts.filter(c => c.type === 'Acquéreur' && matchSearch(c));
  return `<div class="toolbar"><h2>Recherches acquéreurs</h2>${askBtn('Rapprochement global', 'Pour chaque acquéreur actif, trouve les biens de mon portefeuille qui correspondent, mets à jour leurs sélections et dis-moi qui relancer en priorité.')}<button class="btn primary" data-new="contacts" data-preset='${esc(JSON.stringify({ type: 'Acquéreur' }))}'>+ Acquéreur</button></div>
  ${table('contacts', [['Acquéreur', c => `<strong>${esc(contactName(c.id))}</strong>`], ['Budget', c => c.budgetMax ? eur(c.budgetMax) : ''], ['Recherche', c => esc([c.typeRecherche, c.villes, c.surfaceMin && c.surfaceMin + ' m²'].filter(Boolean).join(' · '))],
    ['Financement', c => esc(c.financement || '')], ['Biens correspondants', c => { const n = db.biens.filter(b => ETAPES_ACTIVES.includes(b.etape) && matches(b).some(x => x.id === c.id)).length; return n ? `<span class="badge ok">${n}</span>` : '0'; }],
    ['Sélection', c => { const s = db.selections.filter(x => x.contactId === c.id); return s.length ? `${s.length} bien(s) · ${s.filter(x => x.statut === 'Intéressé').length} intéressé(s)` : '—'; }],
    ['À relancer', c => { const s = db.selections.filter(x => x.contactId === c.id && x.relance && x.relance <= todayISO() && x.statut !== 'Refusé').length; return s ? `<span class="badge warn">${s}</span>` : ''; }]], acq, { href: c => `#contact/${c.id}`, empty: 'Aucun acquéreur enregistré.' })}`;
};

views.locations = () => `<div class="toolbar"><h2>Candidatures locatives</h2>${askBtn('Analyser les candidatures', 'Analyse toutes mes candidatures locatives en cours : solvabilité (revenus/loyer, garant), pièces manquantes, et classe-les par ordre de solidité.')}<button class="btn primary" data-new="candidatures" data-preset='${esc(JSON.stringify({ statut: 'Nouvelle' }))}'>+ Candidature</button></div>
  ${candidaturesTable(db.candidatures.filter(matchSearch))}
  <p class="muted">Les candidats peuvent répondre au message de demande de pièces avec leurs documents ; le copilote les retrouve ensuite dans Gmail et les range dans le dossier.</p>`;

views.ventes = () => {
  const rows = db.ventes.filter(v => (!filters.ventes || v.statut === filters.ventes) && matchSearch(v)).sort((a, b) => (b.dateCompromis || '').localeCompare(a.dateCompromis || ''));
  const year = new Date().getFullYear();
  const yr = db.ventes.filter(v => v.statut !== 'Annulée' && (v.dateActe || v.dateCompromis || '').startsWith(year));
  const months = Array.from({ length: 12 }, (_, m) => yr.filter(v => v.statut === 'Honoraires encaissés' && new Date(v.dateEncaissement || v.dateActe).getMonth() === m).reduce((s, v) => s + commission(v).net, 0));
  const max = Math.max(1, ...months);
  return `<div class="toolbar"><h2>Ventes & honoraires</h2>${filterSelect('ventes', VENTE_STATUTS)}<button class="btn primary" data-new="ventes">+ Vente</button></div>
  <div class="grid kpis">
    <div class="card kpi"><div class="label">Ventes ${year}</div><div class="value">${yr.length}</div></div>
    <div class="card kpi"><div class="label">Volume ${year}</div><div class="value">${eur(yr.reduce((s, v) => s + (Number(v.prixVente) || 0), 0))}</div></div>
    <div class="card kpi"><div class="label">Honoraires TTC ${year}</div><div class="value">${eur(yr.reduce((s, v) => s + (Number(v.honorairesTTC) || 0), 0))}</div></div>
    <div class="card kpi"><div class="label">Ma commission HT ${year}</div><div class="value">${eur(yr.reduce((s, v) => s + commission(v).net, 0))}</div></div></div>
  <div class="card mb"><h3>Commissions encaissées par mois</h3><div class="chart">${months.map((m, i) => `<div title="${eur(m)}"><div class="col-bar" style="height:${Math.round(m / max * 110)}px"></div><div class="muted">${new Date(2000, i).toLocaleDateString('fr-FR', { month: 'narrow' })}</div></div>`).join('')}</div></div>
  ${table('ventes', [['Dossier', v => `<strong>${esc(bienName(v.bienId))}</strong>`], ['Acquéreur', v => esc(contactName(v.acquereurId))], ['Statut', v => badge(v.statut)], ['Prix', v => v.prixVente ? eur(v.prixVente) : ''],
    ['Honoraires TTC', v => v.honorairesTTC ? eur(v.honorairesTTC) : ''], ['Ma commission HT', v => `${eur(commission(v).net)} <span class="muted">(${commission(v).taux}%)</span>`], ['Compromis', v => fmtDate(v.dateCompromis)], ['Acte', v => fmtDate(v.dateActe)]], rows)}`;
};

views.copilote = () => { setTimeout(() => Copilot.open(), 0); return views.dashboard(); };

views.parametres = () => {
  const s = db.settings;
  return `<h2>Paramètres</h2><div class="grid two-cols">
  <form class="card form-grid" id="settingsForm">
    <div class="section">Mon profil</div>
    <label class="full">Prénom et nom<input name="nom" value="${esc(s.nom)}"></label>
    <label>E-mail professionnel<input type="email" name="email" value="${esc(s.email)}"></label>
    <label>Téléphone<input name="tel" value="${esc(s.tel)}"></label>
    <label class="full">Signature des e-mails<textarea name="signature" rows="3">${esc(s.signature)}</textarea></label>
    <label class="full">Adresse de mon mini-site / page d'annonces<input type="url" name="miniSite" value="${esc(s.miniSite)}" placeholder="https://…"></label>
    <label>Taux de commission (%)<input type="number" step="0.1" name="tauxCommission" value="${esc(s.tauxCommission)}"></label>
    <label>TVA (%)<input type="number" step="0.1" name="tva" value="${esc(s.tva)}"></label>
    <label class="full">Objectif annuel de commissions (€ HT)<input type="number" name="objectifAnnuel" value="${esc(s.objectifAnnuel)}"></label>
    <div class="section">Copilote (Claude)</div>
    <label class="full">Clé API Claude<input type="password" name="apiKey" value="${esc(s.apiKey)}" placeholder="sk-ant-…" autocomplete="off"></label>
    <p class="muted full">Créez une clé sur console.anthropic.com (facturation à l'usage). Elle reste enregistrée dans ce navigateur uniquement.</p>
    <div class="section">Google (Gmail, Agenda, Drive)</div>
    <label class="full">Identifiant client OAuth Google<input name="googleClientId" value="${esc(s.googleClientId)}" placeholder="xxxx.apps.googleusercontent.com"></label>
    <div class="full"><button class="btn primary">Enregistrer</button></div>
  </form>
  <div>
    <div class="card mb"><h3>Connexions</h3>
      <ul class="list">
        <li><span style="flex:1">✨ Copilote</span>${s.apiKey ? '<span class="badge ok">Activé</span>' : '<span class="badge grey">Clé manquante</span>'}</li>
        <li><span style="flex:1">📧 Gmail · 📅 Agenda · 📁 Drive</span>${Google.isConnected() ? '<span class="badge ok">Connecté</span> <button class="btn small" id="gDisconnect">Déconnecter</button>' : `<button class="btn small primary" id="gConnect"${s.googleClientId ? '' : ' disabled title="Renseignez d\'abord l\'identifiant client"'}>Connecter Google</button>`}</li>
        <li><span style="flex:1">🟢 WhatsApp / SMS</span><span class="badge ok">Prêt</span></li>
      </ul>
      <p class="muted">WhatsApp et SMS s'ouvrent avec le message pré-rempli : vous n'avez plus qu'à appuyer sur Envoyer. Sur téléphone, le bouton ↗ partage les PDF directement dans WhatsApp.</p></div>
    <div class="card"><h3>Sauvegarde</h3>
      <p class="muted">Données enregistrées sur cet appareil. Exportez régulièrement une sauvegarde complète (documents et photos inclus).</p>
      <div class="actions-wrap"><button class="btn primary" id="exportBtn">⬇️ Sauvegarde complète</button><button class="btn" id="exportCsvBtn">⬇️ Contacts (CSV)</button>
        <label class="btn">⬆️ Restaurer<input type="file" id="importInput" accept="application/json" hidden></label></div>
      <div class="actions-wrap mt"><button class="btn" id="demoBtn">Charger des données d'exemple</button><button class="btn danger" id="resetBtn">Tout effacer</button></div>
      <p class="muted" id="storageInfo"></p></div>
  </div></div>`;
};

/* =========================================================
   Navigation & rendu
   ========================================================= */
function route() { const [v, id, tab] = (location.hash.slice(1) || 'dashboard').split('/'); return { v, id, tab }; }
function currentPageContext() {
  const { v, id } = route();
  if (v === 'dossier' && getBien(id)) return `fiche du dossier « ${bienName(id)} » (bien_id ${id})`;
  if (v === 'contact' && getContact(id)) return `fiche contact de ${contactName(id)} (contact_id ${id})`;
  return '';
}
function render() {
  const { v, id, tab } = route();
  photoUrls.forEach(URL.revokeObjectURL); photoUrls = [];
  $('#main').innerHTML = v === 'dossier' ? viewDossier(id, tab) : v === 'contact' ? viewContact(id) : (views[v] || views.dashboard)();
  const navKey = v === 'dossier' ? 'dossiers' : v === 'contact' ? 'contacts' : v;
  document.querySelectorAll('.sidebar a').forEach(a => a.classList.toggle('active', a.dataset.view === navKey));
  $('#sidebar').classList.remove('open');
  loadImages();
  if (v === 'parametres') storageInfo();
}
const refreshMain = () => { if (!modal.open) render(); };
async function loadImages() {
  for (const img of document.querySelectorAll('img[data-img]')) {
    const f = await Files.get(img.dataset.img); if (!f) continue;
    const u = URL.createObjectURL(f.blob); photoUrls.push(u); img.src = u;
  }
}
async function storageInfo() {
  const el = $('#storageInfo'); if (!el || !navigator.storage?.estimate) return;
  const e = await navigator.storage.estimate();
  el.textContent = `Espace utilisé : ${(e.usage / 1e6).toFixed(1)} Mo sur ${(e.quota / 1e9).toFixed(1)} Go disponibles.`;
  navigator.storage.persist?.();
}
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
$('#globalSearch').addEventListener('input', () => { if (!['contacts', 'dossiers', 'agenda', 'taches', 'offres', 'ventes', 'recherches', 'locations'].includes(route().v)) location.hash = 'contacts'; else render(); });

/* ---------- Événements ---------- */
document.addEventListener('click', async (e) => {
  const t = e.target;
  if (t.closest('[data-stop]')) { e.stopPropagation(); return; }
  const ask = t.closest('[data-ask]'); if (ask) { e.preventDefault(); e.stopPropagation(); Copilot.open(ask.dataset.ask); return; }
  if (!t.closest('#main')) return;
  const tg = t.closest('[data-toggle]'); if (tg) { const task = db.taches.find(x => x.id === tg.dataset.toggle); task.fait = tg.checked; save(); render(); return; }
  const n = t.closest('[data-new]'); if (n) { openForm(n.dataset.new, null, n.dataset.preset ? JSON.parse(n.dataset.preset) : {}); return; }
  const vue = t.closest('[data-vue]'); if (vue) { filters.dossiersVue = vue.dataset.vue; render(); return; }
  const et = t.closest('[data-etape]'); if (et) { const b = getBien(et.dataset.bien); b.etape = et.dataset.etape; addHistorique(b, 'Étape : ' + b.etape); save(); render(); return; }
  const rmp = t.closest('[data-rm-partie]'); if (rmp) { const b = getBien(rmp.dataset.bien); b.parties.splice(Number(rmp.dataset.rmPartie), 1); save(); render(); return; }
  const ncp = t.closest('[data-new-contact-partie]'); if (ncp) { const bid = ncp.dataset.newContactPartie; openForm('contacts'); modalCtx.after = (c) => getBien(bid).parties.push({ contactId: c.id, role: 'Vendeur' }); return; }
  const rmd = t.closest('[data-rm-doc]'); if (rmd) { const b = getBien(rmd.dataset.bien); const d = b.documents.find(x => x.id === rmd.dataset.rmDoc); if (!confirm(`Retirer « ${d.nom} » du dossier ?`)) return; if (d.fileId) await Files.del(d.fileId); b.documents = b.documents.filter(x => x !== d); save(); render(); return; }
  const rmph = t.closest('[data-rm-photo]'); if (rmph) { if (!confirm('Supprimer cette photo ?')) return; const b = getBien($('#gallery').dataset.bien); b.photos = b.photos.filter(x => x !== rmph.dataset.rmPhoto); await Files.del(rmph.dataset.rmPhoto); save(); render(); return; }
  const pf = t.closest('[data-photo-first]'); if (pf) { const b = getBien($('#gallery').dataset.bien); b.photos = [pf.dataset.photoFirst, ...b.photos.filter(x => x !== pf.dataset.photoFirst)]; save(); render(); return; }
  const rmn = t.closest('[data-rm-note]'); if (rmn) { const b = getBien(rmn.dataset.bien); b.notes = b.notes.filter(x => x.id !== rmn.dataset.rmNote); save(); render(); return; }
  const sm = t.closest('[data-save-memoire]'); if (sm) { getBien(sm.dataset.saveMemoire).memoire = $(`[data-memoire="${sm.dataset.saveMemoire}"]`).value; save(); sm.textContent = 'Enregistré ✓'; return; }
  const bon = t.closest('[data-bon]'); if (bon) { e.stopPropagation(); const r = db.rdv.find(x => x.id === bon.dataset.bon); const doc = await attachToBien(r.bienId, bonDeVisitePdf(r), `Bon de visite - ${contactName(r.contactId) || 'visiteur'} - ${r.date.slice(0, 10)}.pdf`, 'Visites'); r.bonDocId = doc.id; save(); openFile(doc.fileId); render(); return; }
  const as = t.closest('[data-add-sel]'); if (as) { e.stopPropagation(); db.selections.push({ id: uid(), date: todayISO(), contactId: as.dataset.addSel, bienId: as.dataset.bien, statut: 'À proposer' }); save(); render(); return; }
  const pc = t.closest('[data-pieces]'); if (pc) { e.stopPropagation(); editPieces(pc.dataset.pieces); return; }
  const mg = t.closest('[data-merge]'); if (mg) { if (!confirm(`Fusionner « ${contactName(mg.dataset.merge)} » dans « ${contactName(mg.dataset.keep)} » ? Les dossiers, visites et offres seront rattachés à cette fiche.`)) return; mergeContacts(mg.dataset.keep, mg.dataset.merge); render(); return; }
  const tc = t.closest('[data-touch]'); if (tc) { getContact(tc.dataset.touch).derniereInteraction = todayISO(); save(); render(); return; }
  const href = t.closest('tr[data-href]'); if (href && !t.closest('a,button,select,input,label')) { location.hash = href.dataset.href; return; }
  const row = t.closest('[data-coll][data-id]'); if (row && !t.closest('a') && !t.closest('input[type=checkbox]')) { openForm(row.dataset.coll, row.dataset.id); return; }
  if (t.id === 'gConnect') { try { await Google.connect(true); render(); } catch (err) { alert(err.message); } }
  if (t.id === 'gDisconnect') { Google.disconnect(); render(); }
  if (t.id === 'syncAgenda') { try { const ev = await Google.listEvents(new Date(), Date.now() + 14 * 86400000); $('#gcal').innerHTML = `<div class="card mb"><h3>Google Agenda (14 jours)</h3><ul class="list">${ev.map(x => `<li><span class="muted" style="min-width:150px">${fmtDateTime(x.debut)}</span>${esc(x.titre || '(sans titre)')} <span class="muted">${esc(x.lieu || '')}</span></li>`).join('') || '<li>Aucun événement</li>'}</ul></div>`; } catch (err) { alert(err.message); } }
  if (t.id === 'exportBtn') exportAll();
  if (t.id === 'exportCsvBtn') exportCsv();
  if (t.id === 'resetBtn' && confirm('Effacer toutes les données, documents et photos ? Cette action est irréversible.')) { db = structuredClone(DEFAULT_DATA); await Files.clear(); save(); Copilot.reset(); render(); }
  if (t.id === 'demoBtn' && (!db.contacts.length || confirm('Ajouter des données d\'exemple à vos données actuelles ?'))) { loadDemo(); save(); location.hash = 'dashboard'; render(); }
});

document.addEventListener('change', async (e) => {
  const t = e.target; if (!t.closest('#main')) return;
  if (t.dataset.filter) { filters[t.dataset.filter] = t.value; render(); }
  if (t.id === 'pastToggle') { filters.agendaPast = t.checked; render(); }
  if (t.id === 'doneToggle') { filters.tachesDone = t.checked; render(); }
  if (t.dataset.docStatut) { const b = getBien(t.dataset.bien); const d = b.documents.find(x => x.id === t.dataset.docStatut); d.statut = t.value; addHistorique(b, `Pièce « ${d.nom} » : ${d.statut}`); save(); render(); }
  if (t.dataset.uploadDoc && t.files.length) {
    const bid = t.dataset.uploadDoc;
    for (const f of t.files) await attachToBien(bid, f, f.name, guessCategory(f.name), t.dataset.docNom || matchDocName(getBien(bid), f.name));
    render();
  }
  if (t.dataset.uploadPhoto && t.files.length) {
    const b = getBien(t.dataset.uploadPhoto);
    for (const f of t.files) b.photos.push(await Files.put(await resizeImage(f), f.name));
    addHistorique(b, `${t.files.length} photo(s) ajoutée(s)`); save(); render();
  }
  if (t.id === 'importInput' && t.files[0]) importAll(t.files[0]);
});

document.addEventListener('submit', (e) => {
  const f = e.target; if (!f.closest('#main')) return;
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(f));
  if (f.id === 'settingsForm') { db.settings = { ...db.settings, ...fd }; save(); alert('Paramètres enregistrés'); render(); return; }
  if (f.dataset.addPartie) { const b = getBien(f.dataset.addPartie); if (!fd.contactId) return; b.parties.push({ contactId: fd.contactId, role: fd.role }); addHistorique(b, `${contactName(fd.contactId)} ajouté(e) : ${fd.role}`); }
  if (f.dataset.addDoc) getBien(f.dataset.addDoc).documents.push({ id: uid(), nom: fd.nom, categorie: fd.categorie, statut: 'Manquant' });
  if (f.dataset.addNote) getBien(f.dataset.addNote).notes.unshift({ id: uid(), date: nowISO(), texte: fd.texte });
  if (f.dataset.addCnote) { const c = getContact(f.dataset.addCnote); (c.notesListe ||= []).unshift({ id: uid(), date: nowISO(), texte: fd.texte }); c.derniereInteraction = todayISO(); }
  save(); render();
});

/* Glisser-déposer dans le tableau d'avancement */
document.addEventListener('dragstart', (e) => { const d = e.target.closest?.('[data-drag]'); if (d) e.dataTransfer.setData('text/plain', d.dataset.drag); });
document.addEventListener('dragover', (e) => { if (e.target.closest?.('[data-drop]')) e.preventDefault(); });
document.addEventListener('drop', (e) => {
  const col = e.target.closest?.('[data-drop]'); if (!col) return; e.preventDefault();
  const b = getBien(e.dataTransfer.getData('text/plain')); if (!b) return;
  b.etape = col.dataset.drop; addHistorique(b, 'Étape : ' + b.etape); save(); render();
});

function guessCategory(name) {
  const n = normTxt(name);
  if (/dpe|amiante|plomb|crep|electri|gaz|termite|erp|risque|assainissement|carrez|diagnostic/.test(n)) return 'Diagnostics';
  if (/ag\b|assemblee|copro|reglement|syndic|charges|pre-etat|carnet/.test(n)) return 'Copropriété';
  if (/compromis|promesse|acte/.test(n)) return 'Compromis / acte';
  if (/offre/.test(n)) return 'Acquéreur';
  if (/bon de visite/.test(n)) return 'Visites';
  return 'Autre';
}
function matchDocName(b, name) {
  const n = normTxt(name);
  const rules = [[/dpe/, 'DPE'], [/amiante/, 'Amiante'], [/plomb|crep/, 'Plomb (CREP)'], [/electri/, 'Électricité'], [/gaz/, 'Gaz'], [/termite/, 'Termites'], [/erp|risque/, 'État des risques (ERP)'], [/assainissement/, 'Assainissement'], [/carrez/, 'Mesurage Loi Carrez'], [/taxe fonciere/, 'Taxe foncière'], [/titre de propriete|acte de vente/, 'Titre de propriété'], [/mandat/, 'Mandat signé'], [/pv|proces.verbal|assemblee/, 'PV des 3 dernières AG'], [/pre-etat|pre etat/, 'Pré-état daté'], [/reglement/, 'Règlement de copropriété / EDD'], [/fiche synthetique/, 'Fiche synthétique'], [/offre/, 'Offre d\'achat signée']];
  const r = rules.find(([re]) => re.test(n));
  return r && b.documents.some(d => d.nom === r[1] && !d.fileId) ? r[1] : undefined;
}

function editPieces(candId) {
  const c = db.candidatures.find(x => x.id === candId);
  modalCtx = { coll: 'candidatures', id: candId };
  $('#modalTitle').textContent = `Pièces reçues – ${contactName(c.contactId)}`;
  $('#modalDelete').style.display = 'none';
  $('#modalBody').innerHTML = PIECES_CANDIDAT.map(p => `<label class="check full"><input type="checkbox" data-piece="${esc(p)}"${(c.pieces || {})[p] ? ' checked' : ''}> ${esc(p)}</label>`).join('');
  modal.showModal();
  const handler = (ev) => {
    ev.preventDefault(); ev.stopImmediatePropagation();
    c.pieces = {}; modal.querySelectorAll('[data-piece]').forEach(i => { if (i.checked) c.pieces[i.dataset.piece] = true; });
    const n = Object.keys(c.pieces).length;
    if (['Nouvelle', 'Pièces demandées', 'Dossier incomplet', 'Dossier complet'].includes(c.statut)) c.statut = n === PIECES_CANDIDAT.length ? 'Dossier complet' : n ? 'Dossier incomplet' : c.statut;
    save(); modal.close(); render();
  };
  $('#modalForm').addEventListener('submit', handler, { capture: true, once: true });
  modal.addEventListener('close', () => $('#modalForm').removeEventListener('submit', handler, { capture: true }), { once: true });
}

/* ---------- Sauvegarde complète (données + fichiers) ---------- */
async function exportAll() {
  const files = await Files.all();
  const packed = await Promise.all(files.map(async f => ({ id: f.id, name: f.name, type: f.type, data: await blobToBase64(f.blob) })));
  const { apiKey, ...settings } = db.settings;
  downloadBlob(`sauvegarde-mon-agence-${todayISO()}.json`, new Blob([JSON.stringify({ version: 2, data: { ...db, settings }, files: packed })], { type: 'application/json' }));
}
async function importAll(file) {
  try {
    const json = JSON.parse(await file.text());
    const data = json.version === 2 ? json.data : json;
    if (!Array.isArray(data.contacts)) throw new Error('Fichier non reconnu');
    if (!confirm('Remplacer toutes les données actuelles par celles de la sauvegarde ?')) return;
    const apiKey = db.settings.apiKey;
    db = migrate(Object.assign(structuredClone(DEFAULT_DATA), data)); db.settings = { ...DEFAULT_DATA.settings, ...data.settings, apiKey };
    if (json.files) { await Files.clear(); for (const f of json.files) { const blob = await (await fetch(`data:${f.type};base64,${f.data}`)).blob(); const idb = await new Promise((res, rej) => { const r = indexedDB.open('mon-agence-fichiers', 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); await new Promise((res, rej) => { const tx = idb.transaction('files', 'readwrite'); tx.objectStore('files').put({ id: f.id, name: f.name, type: f.type, blob }); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); } }
    save(); render(); alert('Sauvegarde restaurée.');
  } catch (err) { alert('Restauration impossible : ' + err.message); }
}
function exportCsv() {
  const keys = ['type', 'civilite', 'prenom', 'nom', 'tel', 'email', 'adresse', 'dateNaissance', 'source', 'budgetMax', 'villes', 'notes'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  downloadBlob(`contacts-${todayISO()}.csv`, new Blob(['﻿' + [keys.join(';'), ...db.contacts.map(c => keys.map(k => q(c[k])).join(';'))].join('\n')], { type: 'text/csv' }));
}

/* ---------- Données d'exemple ---------- */
function loadDemo() {
  const d = (offset, h = 10) => { const x = new Date(); x.setDate(x.getDate() + offset); x.setHours(h, 0, 0, 0); return new Date(x - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const day = (o) => d(o).slice(0, 10);
  const [c1, c2, c3, c4, c5, c6, c7] = Array.from({ length: 7 }, uid); const [b1, b2, b3, b4] = Array.from({ length: 4 }, uid); const v1 = uid();
  const anniv = new Date(); anniv.setDate(anniv.getDate() + 3);
  db.contacts.push(
    { id: c1, type: 'Vendeur', source: 'Recommandation', civilite: 'Mme', prenom: 'Martine', nom: 'Dupont', tel: '06 12 34 56 78', email: 'martine.dupont@exemple.fr', adresse: '12 rue des Lilas, 69003 Lyon', dateNaissance: `1962-${String(anniv.getMonth() + 1).padStart(2, '0')}-${String(anniv.getDate()).padStart(2, '0')}`, derniereInteraction: day(-4), notesListe: [] },
    { id: c2, type: 'Acquéreur', source: 'Portail immobilier', civilite: 'M.', prenom: 'Karim', nom: 'Benali', tel: '06 98 76 54 32', email: 'k.benali@exemple.fr', budgetMax: '350000', villes: 'Lyon, Villeurbanne', typeRecherche: 'Appartement', surfaceMin: '60', piecesMin: '3', financement: 'Prêt accordé', derniereInteraction: day(-30), notesListe: [] },
    { id: c3, type: 'Vendeur', source: 'Pige', civilite: 'M.', prenom: 'Jean', nom: 'Moreau', tel: '07 11 22 33 44', email: 'jean.moreau@exemple.fr', derniereInteraction: day(-2), notesListe: [] },
    { id: c4, type: 'Acquéreur', source: 'Site web / mini-site', civilite: 'Mme', prenom: 'Sophie', nom: 'Laurent', tel: '06 55 44 33 22', email: 'sophie.laurent@exemple.fr', budgetMax: '560000', villes: 'Écully, Tassin', typeRecherche: 'Maison', surfaceMin: '110', financement: 'Prêt en cours', derniereInteraction: day(-6), notesListe: [] },
    { id: c5, type: 'Vendeur', source: 'Ancien client', civilite: 'M.', prenom: 'Paul', nom: 'Moreau', tel: '06 01 02 03 04', notesListe: [], derniereInteraction: day(-2) },
    { id: c6, type: 'Notaire', prenom: 'Claire', nom: 'Martin', email: 'etude.martin@exemple.fr', tel: '04 78 00 00 00', notesListe: [] },
    { id: c7, type: 'Candidat locataire', prenom: 'Léa', nom: 'Garcia', tel: '06 77 88 99 00', email: 'lea.garcia@exemple.fr', notesListe: [] },
  );
  const mk = (o) => { const b = migrate({ biens: [o], contacts: [] }).biens[0]; ensureChecklist(b); return b; };
  const B1 = mk({ id: b1, titre: 'Appartement Dupont – Lyon 3e', etape: 'Mandat signé', transaction: 'Vente', type: 'Appartement', parties: [{ contactId: c1, role: 'Vendeur' }], adresse: '12 rue des Lilas', cp: '69003', ville: 'Lyon', surface: '72', pieces: '3', chambres: '2', dpe: 'C', ges: 'C', copropriete: 'Oui', lots: '24', charges: '1800', prix: '329000', honoraires: '14000', mandat: 'Exclusif', numMandat: '1024', debutMandat: day(-60), finMandat: day(20), description: 'Lumineux, balcon plein sud, proche métro, cave.', memoire: 'Vendeuse en retraite, part rejoindre sa fille à Bordeaux. Souhaite vendre avant l\'été. Prix initial 345 000 €, baissé à 329 000 €.' });
  B1.documents.forEach(x => { if (['Pièce d\'identité vendeur(s)', 'Titre de propriété', 'Mandat signé', 'DPE', 'Électricité'].includes(x.nom)) x.statut = 'Reçu'; });
  const B2 = mk({ id: b2, titre: 'Maison Moreau – Écully', etape: 'Sous compromis', transaction: 'Vente', type: 'Maison', parties: [{ contactId: c3, role: 'Héritier' }, { contactId: c5, role: 'Héritier' }, { contactId: c4, role: 'Acquéreur' }, { contactId: c6, role: 'Notaire vendeur' }], succession: 'Oui', cp: '69130', ville: 'Écully', surface: '140', terrain: '600', pieces: '6', chambres: '4', dpe: 'D', prix: '545000', honoraires: '22000', mandat: 'Simple', numMandat: '1019', debutMandat: day(-120), finMandat: day(60) });
  B2.documents.forEach(x => { if (x.categorie !== 'Copropriété' && !['Assainissement', 'Accord de tous les héritiers'].includes(x.nom)) x.statut = 'Reçu'; });
  const B3 = mk({ id: b3, titre: 'T2 Villeurbanne (estimation)', etape: 'Estimation', transaction: 'Vente', type: 'Appartement', cp: '69100', ville: 'Villeurbanne', surface: '55', pieces: '2', estimation: '210000' });
  const B4 = mk({ id: b4, titre: 'Studio à louer – Lyon 7e', etape: 'Mandat signé', transaction: 'Location', type: 'Appartement', cp: '69007', ville: 'Lyon', surface: '28', pieces: '1', loyer: '650', mandat: 'Location' });
  db.biens.push(B1, B2, B3, B4);
  db.rdv.push(
    { id: uid(), type: 'Visite', date: d(1, 18), duree: 45, contactId: c2, bienId: b1, lieu: '12 rue des Lilas, 69003 Lyon' },
    { id: uid(), type: 'Visite', date: d(-5, 17), duree: 45, contactId: c2, bienId: b1, lieu: '12 rue des Lilas, 69003 Lyon', interet: 3, bonSigne: true, compteRendu: 'Aime la luminosité et le balcon. Trouve la cuisine à refaire. Prix jugé un peu élevé.' },
    { id: uid(), type: 'Estimation', date: d(2, 10), bienId: b3, lieu: 'Villeurbanne' },
    { id: uid(), type: 'Acte authentique', date: d(25, 14), contactId: c3, bienId: b2, lieu: 'Étude Me Martin' },
  );
  db.taches.push(
    { id: uid(), titre: 'Relancer Mme Dupont pour ajustement du prix', echeance: day(0), priorite: 'Haute', contactId: c1, bienId: b1, fait: false },
    { id: uid(), titre: 'Envoyer avis de valeur Villeurbanne', echeance: day(3), priorite: 'Normale', bienId: b3, fait: false },
    { id: uid(), titre: 'Faire les photos du bien', echeance: day(-1), priorite: 'Normale', bienId: b1, fait: false },
  );
  db.offres.push({ id: uid(), bienId: b2, acquereurId: c4, montant: 523000, statut: 'Acceptée', dateOffre: day(-30), dateValidite: day(-23), financement: 'Apport 120 000 €, prêt 403 000 € sur 25 ans', conditions: 'Condition suspensive d\'obtention de prêt.' });
  db.ventes.push(
    { id: v1, statut: 'Compromis signé', bienId: b2, acquereurId: c4, notaire: 'Me Martin', prixVente: '523000', honorairesTTC: '22000', taux: '', dateCompromis: day(-15), finCondSusp: day(10), dateActe: day(25) },
    { id: uid(), statut: 'Honoraires encaissés', bienId: b1, acquereurId: c2, prixVente: '280000', honorairesTTC: '12000', taux: '', dateCompromis: day(-150), dateActe: day(-60), dateEncaissement: day(-55), notes: 'Vente précédente (exemple)' },
  );
  db.selections.push({ id: uid(), date: day(-6), contactId: c2, bienId: b1, statut: 'Visite prévue', relance: day(2) });
  db.candidatures.push({ id: uid(), date: day(-1), bienId: b4, contactId: c7, statut: 'Dossier incomplet', revenus: 2100, garant: 'Parents', pieces: { 'Pièce d\'identité': true, '3 derniers bulletins de salaire': true } });
}

render();
