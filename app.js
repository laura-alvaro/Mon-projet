'use strict';

/* ================= Stockage ================= */
const STORE_KEY = 'mon-agence-v1';
const DEFAULT_DATA = {
  contacts: [], biens: [], rdv: [], taches: [], ventes: [],
  settings: { nom: '', tauxCommission: 70, tva: 20, objectifAnnuel: 60000 },
};

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(structuredClone(DEFAULT_DATA), JSON.parse(raw));
  } catch (e) { console.warn('Lecture impossible', e); }
  return structuredClone(DEFAULT_DATA);
}
let db = load();
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
  catch (e) { alert('Sauvegarde impossible : ' + e.message); }
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ================= Utilitaires ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (n) => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num = (n) => (Number(n) || 0).toLocaleString('fr-FR');
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const daysUntil = (d) => Math.ceil((new Date(d) - new Date(todayISO())) / 86400000);
const contactName = (id) => { const c = db.contacts.find(x => x.id === id); return c ? `${c.prenom || ''} ${c.nom || ''}`.trim() : ''; };
const bienName = (id) => { const b = db.biens.find(x => x.id === id); return b ? `${b.type || 'Bien'} – ${b.ville || ''}`.trim() : ''; };

/* ================= Schémas ================= */
const CONTACT_TYPES = ['Vendeur', 'Acquéreur', 'Prospect', 'Locataire', 'Bailleur', 'Notaire', 'Partenaire', 'Autre'];
const SOURCES = ['Recommandation', 'Pige', 'Boîtage', 'Site web', 'Portail immobilier', 'Réseaux sociaux', 'Ancien client', 'Panneau', 'Autre'];
const BIEN_TYPES = ['Maison', 'Appartement', 'Terrain', 'Immeuble', 'Local commercial', 'Parking', 'Autre'];
const BIEN_STATUTS = ['Estimation', 'Mandat actif', 'Sous offre', 'Compromis', 'Vendu', 'Expiré / retiré'];
const MANDATS = ['Simple', 'Exclusif', 'Semi-exclusif', 'Recherche'];
const RDV_TYPES = ['Estimation', 'Visite', 'Signature mandat', 'Signature compromis', 'Acte authentique', 'Rendez-vous acquéreur', 'Appel', 'Autre'];
const VENTE_STATUTS = ['Offre acceptée', 'Compromis signé', 'Acte signé', 'Honoraires encaissés', 'Annulée'];
const DPE = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'Vierge'];

const contactOpts = () => [['', '—'], ...db.contacts.map(c => [c.id, contactName(c.id) + (c.type ? ` (${c.type})` : '')])];
const bienOpts = () => [['', '—'], ...db.biens.map(b => [b.id, bienName(b.id) + (b.prix ? ` · ${eur(b.prix)}` : '')])];

const SCHEMAS = {
  contacts: { title: 'Contact', fields: [
    { k: 'type', l: 'Type', t: 'select', o: CONTACT_TYPES },
    { k: 'source', l: 'Source', t: 'select', o: ['', ...SOURCES] },
    { k: 'prenom', l: 'Prénom' }, { k: 'nom', l: 'Nom', req: true },
    { k: 'tel', l: 'Téléphone', t: 'tel' }, { k: 'email', l: 'E-mail', t: 'email' },
    { k: 'adresse', l: 'Adresse', full: true },
    { section: 'Projet d\'achat (acquéreurs)' },
    { k: 'budgetMax', l: 'Budget max (€)', t: 'number' },
    { k: 'villes', l: 'Villes / secteurs recherchés', ph: 'ex : Lyon, Villeurbanne' },
    { k: 'typeRecherche', l: 'Type recherché', t: 'select', o: ['', ...BIEN_TYPES] },
    { k: 'surfaceMin', l: 'Surface min (m²)', t: 'number' },
    { k: 'piecesMin', l: 'Pièces min', t: 'number' },
    { k: 'financement', l: 'Financement', t: 'select', o: ['', 'Comptant', 'Prêt accordé', 'Prêt en cours', 'Non étudié'] },
    { k: 'notes', l: 'Notes', t: 'textarea', full: true },
  ]},
  biens: { title: 'Bien', fields: [
    { k: 'statut', l: 'Statut', t: 'select', o: BIEN_STATUTS },
    { k: 'type', l: 'Type', t: 'select', o: BIEN_TYPES },
    { k: 'vendeurId', l: 'Vendeur', t: 'select', o: contactOpts },
    { k: 'adresse', l: 'Adresse', full: true },
    { k: 'cp', l: 'Code postal' }, { k: 'ville', l: 'Ville', req: true },
    { k: 'surface', l: 'Surface (m²)', t: 'number' }, { k: 'terrain', l: 'Terrain (m²)', t: 'number' },
    { k: 'pieces', l: 'Pièces', t: 'number' }, { k: 'chambres', l: 'Chambres', t: 'number' },
    { k: 'dpe', l: 'DPE', t: 'select', o: DPE }, { k: 'annee', l: 'Année de construction', t: 'number' },
    { section: 'Prix & mandat' },
    { k: 'estimation', l: 'Estimation (€)', t: 'number' },
    { k: 'prix', l: 'Prix de vente FAI (€)', t: 'number' },
    { k: 'honoraires', l: 'Honoraires TTC (€)', t: 'number' },
    { k: 'mandat', l: 'Type de mandat', t: 'select', o: ['', ...MANDATS] },
    { k: 'numMandat', l: 'N° de mandat' },
    { k: 'debutMandat', l: 'Début du mandat', t: 'date' },
    { k: 'finMandat', l: 'Fin du mandat', t: 'date' },
    { k: 'description', l: 'Description / points forts', t: 'textarea', full: true },
  ]},
  rdv: { title: 'Rendez-vous', fields: [
    { k: 'type', l: 'Type', t: 'select', o: RDV_TYPES },
    { k: 'date', l: 'Date & heure', t: 'datetime-local', req: true },
    { k: 'contactId', l: 'Contact', t: 'select', o: contactOpts },
    { k: 'bienId', l: 'Bien', t: 'select', o: bienOpts },
    { k: 'lieu', l: 'Lieu', full: true },
    { k: 'compteRendu', l: 'Compte rendu / retour visite', t: 'textarea', full: true },
  ]},
  taches: { title: 'Tâche', fields: [
    { k: 'titre', l: 'Tâche', req: true, full: true },
    { k: 'echeance', l: 'Échéance', t: 'date' },
    { k: 'priorite', l: 'Priorité', t: 'select', o: ['Normale', 'Haute', 'Basse'] },
    { k: 'contactId', l: 'Contact', t: 'select', o: contactOpts },
    { k: 'bienId', l: 'Bien', t: 'select', o: bienOpts },
    { k: 'fait', l: 'Terminée', t: 'checkbox' },
    { k: 'notes', l: 'Notes', t: 'textarea', full: true },
  ]},
  ventes: { title: 'Vente', fields: [
    { k: 'statut', l: 'Statut', t: 'select', o: VENTE_STATUTS },
    { k: 'bienId', l: 'Bien', t: 'select', o: bienOpts, req: true },
    { k: 'acquereurId', l: 'Acquéreur', t: 'select', o: contactOpts },
    { k: 'notaire', l: 'Notaire(s)' },
    { k: 'prixVente', l: 'Prix de vente net vendeur (€)', t: 'number' },
    { k: 'honorairesTTC', l: 'Honoraires TTC (€)', t: 'number' },
    { k: 'taux', l: 'Taux de commission (%)', t: 'number', ph: 'par défaut : paramètres' },
    { k: 'dateOffre', l: 'Date offre', t: 'date' },
    { k: 'dateCompromis', l: 'Date compromis', t: 'date' },
    { k: 'finCondSusp', l: 'Fin conditions suspensives', t: 'date' },
    { k: 'dateActe', l: 'Date acte (prévue/réelle)', t: 'date' },
    { k: 'dateEncaissement', l: 'Date d\'encaissement', t: 'date' },
    { k: 'notes', l: 'Notes', t: 'textarea', full: true },
  ]},
};

/* Calcul de la commission nette du conseiller (HT) */
function commission(v) {
  const ttc = Number(v.honorairesTTC) || 0;
  const ht = ttc / (1 + (Number(db.settings.tva) || 0) / 100);
  const taux = v.taux !== '' && v.taux != null ? Number(v.taux) : Number(db.settings.tauxCommission);
  return { ht, net: ht * (taux || 0) / 100, taux };
}

/* ================= Modale générique ================= */
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
    } else if (f.t === 'textarea') {
      input = `<textarea name="${f.k}">${esc(v)}</textarea>`;
    } else if (f.t === 'checkbox') {
      return `<label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="${f.k}"${v ? ' checked' : ''}> ${esc(f.l)}</label>`;
    } else {
      input = `<input type="${f.t || 'text'}" name="${f.k}" value="${esc(v)}"${f.req ? ' required' : ''}${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}>`;
    }
    return `<label${cls}>${esc(f.l)}${f.req ? ' *' : ''}${input}</label>`;
  }).join('');
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
  if (id) Object.assign(db[coll].find(x => x.id === id), data, { maj: new Date().toISOString() });
  else db[coll].push({ id: uid(), cree: new Date().toISOString(), ...data });
  save(); modal.close(); render();
});
$('#modalCancel').onclick = () => modal.close();
$('#modalDelete').onclick = () => {
  const { coll, id } = modalCtx;
  if (!confirm('Supprimer définitivement cet élément ?')) return;
  db[coll] = db[coll].filter(x => x.id !== id);
  save(); modal.close(); render();
};

/* ================= Vues ================= */
const statusBadge = (s) => {
  const map = { 'Mandat actif': '', 'Sous offre': 'warn', 'Compromis': 'warn', 'Vendu': 'ok', 'Expiré / retiré': 'grey',
    'Estimation': 'grey', 'Offre acceptée': 'warn', 'Compromis signé': 'warn', 'Acte signé': 'ok', 'Honoraires encaissés': 'ok', 'Annulée': 'danger' };
  return s ? `<span class="badge ${map[s] ?? ''}">${esc(s)}</span>` : '';
};

function table(coll, cols, rows) {
  if (!rows.length) return `<div class="table-wrap"><div class="empty">Aucun élément pour le moment.</div></div>`;
  return `<div class="table-wrap"><table><thead><tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(r => `<tr data-coll="${coll}" data-id="${r.id}">${cols.map(c => `<td>${c[1](r)}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>`;
}

const views = {};

views.dashboard = () => {
  const year = new Date().getFullYear();
  const actifs = db.biens.filter(b => ['Mandat actif', 'Sous offre'].includes(b.statut));
  const exclusifs = actifs.filter(b => b.mandat === 'Exclusif').length;
  const encaisse = db.ventes.filter(v => v.statut === 'Honoraires encaissés' && (v.dateEncaissement || v.dateActe || '').startsWith(year))
    .reduce((s, v) => s + commission(v).net, 0);
  const previsionnel = db.ventes.filter(v => ['Offre acceptée', 'Compromis signé', 'Acte signé'].includes(v.statut))
    .reduce((s, v) => s + commission(v).net, 0);
  const objectif = Number(db.settings.objectifAnnuel) || 0;
  const pct = objectif ? Math.min(100, Math.round(encaisse / objectif * 100)) : 0;
  const now = new Date();
  const prochainsRdv = db.rdv.filter(r => new Date(r.date) >= new Date(now.toDateString())).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  const taches = db.taches.filter(t => !t.fait).sort((a, b) => (a.echeance || '9999').localeCompare(b.echeance || '9999')).slice(0, 6);
  const alertes = [
    ...db.biens.filter(b => b.finMandat && ['Mandat actif', 'Sous offre'].includes(b.statut) && daysUntil(b.finMandat) <= 30)
      .map(b => ({ txt: `Mandat ${b.numMandat || ''} (${bienName(b.id)}) expire ${daysUntil(b.finMandat) < 0 ? 'est expiré depuis le' : 'le'} ${fmtDate(b.finMandat)}`, coll: 'biens', id: b.id })),
    ...db.ventes.filter(v => v.finCondSusp && v.statut === 'Compromis signé' && daysUntil(v.finCondSusp) <= 15 && daysUntil(v.finCondSusp) >= 0)
      .map(v => ({ txt: `Fin des conditions suspensives le ${fmtDate(v.finCondSusp)} – ${bienName(v.bienId)}`, coll: 'ventes', id: v.id })),
    ...db.taches.filter(t => !t.fait && t.echeance && daysUntil(t.echeance) < 0)
      .map(t => ({ txt: `Tâche en retard : ${t.titre}`, coll: 'taches', id: t.id })),
  ];

  return `
  <h2>Bonjour${db.settings.nom ? ' ' + esc(db.settings.nom) : ''} 👋</h2>
  <div class="grid kpis">
    <div class="card kpi"><div class="label">Mandats actifs</div><div class="value">${actifs.length}</div><div class="muted">dont ${exclusifs} exclusif(s)</div></div>
    <div class="card kpi"><div class="label">Contacts</div><div class="value">${db.contacts.length}</div><div class="muted">${db.contacts.filter(c => c.type === 'Acquéreur').length} acquéreur(s)</div></div>
    <div class="card kpi"><div class="label">Commissions encaissées ${year}</div><div class="value">${eur(encaisse)}</div>
      ${objectif ? `<div class="bar"><span style="width:${pct}%"></span></div><div class="muted">${pct}% de l'objectif (${eur(objectif)})</div>` : ''}</div>
    <div class="card kpi"><div class="label">Commissions à venir</div><div class="value">${eur(previsionnel)}</div><div class="muted">offres & compromis en cours</div></div>
  </div>
  ${alertes.length ? `<div class="card" style="margin-bottom:16px"><h3>⚠️ À surveiller</h3><ul class="list">${alertes.map(a => `<li data-coll="${a.coll}" data-id="${a.id}" style="cursor:pointer">${esc(a.txt)}</li>`).join('')}</ul></div>` : ''}
  <div class="grid two-cols">
    <div class="card"><h3>📅 Prochains rendez-vous</h3>
      ${prochainsRdv.length ? `<ul class="list">${prochainsRdv.map(r => `<li data-coll="rdv" data-id="${r.id}" style="cursor:pointer">
        <span class="badge">${esc(r.type)}</span><div><div>${esc(contactName(r.contactId) || bienName(r.bienId) || r.lieu || '—')}</div><div class="muted">${fmtDateTime(r.date)}</div></div></li>`).join('')}</ul>`
        : '<div class="empty">Aucun rendez-vous prévu.</div>'}
      <button class="btn small" data-new="rdv">+ Rendez-vous</button></div>
    <div class="card"><h3>✅ Tâches à faire</h3>
      ${taches.length ? `<ul class="list">${taches.map(t => `<li><input type="checkbox" data-toggle="${t.id}">
        <div data-coll="taches" data-id="${t.id}" style="cursor:pointer;flex:1"><div>${esc(t.titre)}</div><div class="muted">${t.echeance ? fmtDate(t.echeance) : 'Sans échéance'}${t.priorite === 'Haute' ? ' · <span class="badge danger">Haute</span>' : ''}</div></div></li>`).join('')}</ul>`
        : '<div class="empty">Rien à faire, bravo !</div>'}
      <button class="btn small" data-new="taches">+ Tâche</button></div>
  </div>
  <h3 style="margin-top:20px">Portefeuille de biens</h3>
  ${pipeline()}`;
};

function pipeline() {
  return `<div class="pipeline">${BIEN_STATUTS.filter(s => s !== 'Expiré / retiré').map(s => {
    const items = db.biens.filter(b => b.statut === s);
    return `<div class="col"><h4>${esc(s)} <span class="badge grey">${items.length}</span></h4>
      ${items.map(b => `<div class="item" data-coll="biens" data-id="${b.id}"><strong>${esc(bienName(b.id))}</strong><br><span class="muted">${b.prix ? eur(b.prix) : ''} ${b.surface ? '· ' + num(b.surface) + ' m²' : ''}</span></div>`).join('')}</div>`;
  }).join('')}</div>`;
}

const filters = { contacts: '', biens: '', ventes: '' };
function filterSelect(key, options) {
  return `<select data-filter="${key}"><option value="">Tous</option>${options.map(o => `<option${filters[key] === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
}
function matchSearch(obj) {
  const q = $('#globalSearch').value.trim().toLowerCase();
  return !q || Object.values(obj).some(v => String(v).toLowerCase().includes(q));
}

views.contacts = () => {
  const rows = db.contacts.filter(c => (!filters.contacts || c.type === filters.contacts) && matchSearch(c))
    .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  return `<div class="toolbar"><h2>Contacts</h2>${filterSelect('contacts', CONTACT_TYPES)}<button class="btn primary" data-new="contacts">+ Nouveau contact</button></div>
  ${table('contacts', [
    ['Nom', c => `<strong>${esc(contactName(c.id))}</strong>`],
    ['Type', c => `<span class="badge">${esc(c.type)}</span>`],
    ['Téléphone', c => c.tel ? `<a href="tel:${esc(c.tel)}" onclick="event.stopPropagation()">${esc(c.tel)}</a>` : ''],
    ['E-mail', c => c.email ? `<a href="mailto:${esc(c.email)}" onclick="event.stopPropagation()">${esc(c.email)}</a>` : ''],
    ['Recherche', c => c.budgetMax ? `${esc(c.typeRecherche || '')} ≤ ${eur(c.budgetMax)} ${esc(c.villes || '')}` : ''],
    ['Source', c => esc(c.source)],
  ], rows)}`;
};

views.biens = () => {
  const rows = db.biens.filter(b => (!filters.biens || b.statut === filters.biens) && matchSearch(b));
  return `<div class="toolbar"><h2>Biens & mandats</h2>${filterSelect('biens', BIEN_STATUTS)}<button class="btn primary" data-new="biens">+ Nouveau bien</button></div>
  ${table('biens', [
    ['Bien', b => `<strong>${esc(b.type)}</strong> ${b.pieces ? esc(b.pieces) + 'p' : ''} ${b.surface ? num(b.surface) + ' m²' : ''}`],
    ['Ville', b => esc(`${b.cp || ''} ${b.ville || ''}`)],
    ['Prix', b => b.prix ? eur(b.prix) : ''],
    ['Statut', b => statusBadge(b.statut)],
    ['Mandat', b => esc(`${b.mandat || ''} ${b.numMandat ? '#' + b.numMandat : ''}`)],
    ['Fin mandat', b => b.finMandat ? `${fmtDate(b.finMandat)}${daysUntil(b.finMandat) <= 30 && ['Mandat actif', 'Sous offre'].includes(b.statut) ? ' <span class="badge danger">!</span>' : ''}` : ''],
    ['Vendeur', b => esc(contactName(b.vendeurId))],
    ['Acquéreurs', b => { const n = matches(b).length; return n ? `<button class="btn small" data-match="${b.id}">${n} correspondant(s)</button>` : '<span class="muted">0</span>'; }],
  ], rows)}`;
};

/* Rapprochement bien ↔ acquéreurs */
function matches(b) {
  return db.contacts.filter(c => c.type === 'Acquéreur' && c.budgetMax).filter(c => {
    const prix = Number(b.prix) || 0;
    if (prix && prix > Number(c.budgetMax) * 1.05) return false;
    if (c.typeRecherche && b.type && c.typeRecherche !== b.type) return false;
    if (c.surfaceMin && Number(b.surface) < Number(c.surfaceMin)) return false;
    if (c.piecesMin && Number(b.pieces) < Number(c.piecesMin)) return false;
    if (c.villes && b.ville) {
      const villes = c.villes.toLowerCase().split(/[,;]/).map(s => s.trim()).filter(Boolean);
      if (villes.length && !villes.some(v => b.ville.toLowerCase().includes(v) || (b.cp || '').startsWith(v))) return false;
    }
    return true;
  });
}
function showMatches(id) {
  const b = db.biens.find(x => x.id === id);
  const list = matches(b);
  $('#main').innerHTML = `<div class="toolbar"><h2>Acquéreurs pour : ${esc(bienName(id))}</h2><a class="btn" href="#biens">← Retour</a></div>
  ${table('contacts', [
    ['Nom', c => `<strong>${esc(contactName(c.id))}</strong>`],
    ['Téléphone', c => c.tel ? `<a href="tel:${esc(c.tel)}" onclick="event.stopPropagation()">${esc(c.tel)}</a>` : ''],
    ['Budget', c => eur(c.budgetMax)], ['Secteur', c => esc(c.villes)], ['Financement', c => esc(c.financement)],
  ], list)}
  <p class="muted">Critères : budget (tolérance 5 %), type de bien, surface, pièces et ville/code postal.</p>`;
}

views.agenda = () => {
  const showPast = filters.agendaPast;
  const start = new Date(new Date().toDateString());
  const rows = db.rdv.filter(r => (showPast ? true : new Date(r.date) >= start) && matchSearch(r))
    .sort((a, b) => showPast ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  const groups = {};
  rows.forEach(r => { const k = r.date.slice(0, 10); (groups[k] ||= []).push(r); });
  return `<div class="toolbar"><h2>Agenda</h2>
    <label class="muted"><input type="checkbox" id="pastToggle"${showPast ? ' checked' : ''}> Afficher l'historique</label>
    <button class="btn primary" data-new="rdv">+ Rendez-vous</button></div>
  ${rows.length ? Object.entries(groups).map(([day, items]) => `<div class="day-group card">
    <h3>${new Date(day).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
    <ul class="list">${items.map(r => `<li data-coll="rdv" data-id="${r.id}" style="cursor:pointer">
      <strong>${r.date.slice(11, 16)}</strong><span class="badge">${esc(r.type)}</span>
      <div><div>${esc(contactName(r.contactId))}${r.bienId ? ' · ' + esc(bienName(r.bienId)) : ''}</div><div class="muted">${esc(r.lieu || '')}</div></div></li>`).join('')}</ul></div>`).join('')
    : '<div class="card empty">Aucun rendez-vous.</div>'}`;
};

views.taches = () => {
  const showDone = filters.tachesDone;
  const rows = db.taches.filter(t => (showDone || !t.fait) && matchSearch(t))
    .sort((a, b) => (a.fait - b.fait) || (a.echeance || '9999').localeCompare(b.echeance || '9999'));
  return `<div class="toolbar"><h2>Tâches</h2>
    <label class="muted"><input type="checkbox" id="doneToggle"${showDone ? ' checked' : ''}> Afficher les tâches terminées</label>
    <button class="btn primary" data-new="taches">+ Tâche</button></div>
  <div class="card">${rows.length ? `<ul class="list">${rows.map(t => `<li><input type="checkbox" data-toggle="${t.id}"${t.fait ? ' checked' : ''}>
    <div data-coll="taches" data-id="${t.id}" style="cursor:pointer;flex:1${t.fait ? ';text-decoration:line-through;opacity:.6' : ''}">
      <div>${esc(t.titre)} ${t.priorite === 'Haute' ? '<span class="badge danger">Haute</span>' : ''}</div>
      <div class="muted">${t.echeance ? fmtDate(t.echeance) : 'Sans échéance'}${!t.fait && t.echeance && daysUntil(t.echeance) < 0 ? ' · <span class="badge danger">En retard</span>' : ''}
      ${t.contactId ? ' · ' + esc(contactName(t.contactId)) : ''}${t.bienId ? ' · ' + esc(bienName(t.bienId)) : ''}</div></div></li>`).join('')}</ul>`
    : '<div class="empty">Aucune tâche.</div>'}</div>`;
};

views.ventes = () => {
  const rows = db.ventes.filter(v => (!filters.ventes || v.statut === filters.ventes) && matchSearch(v))
    .sort((a, b) => (b.dateCompromis || '').localeCompare(a.dateCompromis || ''));
  const year = new Date().getFullYear();
  const yr = db.ventes.filter(v => v.statut !== 'Annulée' && (v.dateActe || v.dateCompromis || '').startsWith(year));
  const months = Array.from({ length: 12 }, (_, m) => yr.filter(v => v.statut === 'Honoraires encaissés' && new Date(v.dateEncaissement || v.dateActe).getMonth() === m).reduce((s, v) => s + commission(v).net, 0));
  const max = Math.max(1, ...months);
  return `<div class="toolbar"><h2>Ventes & honoraires</h2>${filterSelect('ventes', VENTE_STATUTS)}<button class="btn primary" data-new="ventes">+ Nouvelle vente</button></div>
  <div class="grid kpis">
    <div class="card kpi"><div class="label">Ventes ${year}</div><div class="value">${yr.length}</div></div>
    <div class="card kpi"><div class="label">Volume de ventes ${year}</div><div class="value">${eur(yr.reduce((s, v) => s + (Number(v.prixVente) || 0), 0))}</div></div>
    <div class="card kpi"><div class="label">Honoraires TTC ${year}</div><div class="value">${eur(yr.reduce((s, v) => s + (Number(v.honorairesTTC) || 0), 0))}</div></div>
    <div class="card kpi"><div class="label">Ma commission nette HT ${year}</div><div class="value">${eur(yr.reduce((s, v) => s + commission(v).net, 0))}</div></div>
  </div>
  <div class="card" style="margin-bottom:16px"><h3>Commissions encaissées par mois (${year})</h3>
    <div style="display:flex;align-items:flex-end;gap:6px;height:140px">${months.map((m, i) => `<div style="flex:1;text-align:center" title="${eur(m)}">
      <div style="height:${Math.round(m / max * 110)}px;background:var(--primary);border-radius:4px 4px 0 0;min-height:${m ? 3 : 0}px"></div>
      <div class="muted">${new Date(2000, i).toLocaleDateString('fr-FR', { month: 'narrow' })}</div></div>`).join('')}</div></div>
  ${table('ventes', [
    ['Bien', v => `<strong>${esc(bienName(v.bienId))}</strong>`],
    ['Acquéreur', v => esc(contactName(v.acquereurId))],
    ['Statut', v => statusBadge(v.statut)],
    ['Prix', v => v.prixVente ? eur(v.prixVente) : ''],
    ['Honoraires TTC', v => v.honorairesTTC ? eur(v.honorairesTTC) : ''],
    ['Ma commission HT', v => `${eur(commission(v).net)} <span class="muted">(${commission(v).taux}%)</span>`],
    ['Compromis', v => fmtDate(v.dateCompromis)],
    ['Acte', v => fmtDate(v.dateActe)],
  ], rows)}`;
};

views.parametres = () => `<h2>Paramètres</h2>
  <div class="grid two-cols">
    <form class="card form-grid" id="settingsForm">
      <h3 class="section">Mon profil</h3>
      <label class="full">Prénom affiché<input name="nom" value="${esc(db.settings.nom)}"></label>
      <label>Taux de commission par défaut (%)<input type="number" step="0.1" name="tauxCommission" value="${esc(db.settings.tauxCommission)}"></label>
      <label>TVA (%)<input type="number" step="0.1" name="tva" value="${esc(db.settings.tva)}"></label>
      <label class="full">Objectif annuel de commissions (€ HT)<input type="number" name="objectifAnnuel" value="${esc(db.settings.objectifAnnuel)}"></label>
      <div class="full"><button class="btn primary">Enregistrer</button></div>
    </form>
    <div class="card">
      <h3>Sauvegarde des données</h3>
      <p class="muted">Vos données sont enregistrées uniquement dans ce navigateur. Exportez-les régulièrement pour ne rien perdre ou pour les transférer sur un autre appareil.</p>
      <div class="toolbar">
        <button class="btn primary" id="exportBtn">⬇️ Exporter (JSON)</button>
        <button class="btn" id="exportCsvBtn">⬇️ Contacts (CSV)</button>
        <label class="btn">⬆️ Importer<input type="file" id="importInput" accept="application/json" hidden></label>
      </div>
      <div class="toolbar">
        <button class="btn" id="demoBtn">Charger des données d'exemple</button>
        <button class="btn danger" id="resetBtn">Tout effacer</button>
      </div>
    </div>
  </div>`;

/* ================= Rendu & navigation ================= */
function currentView() { return (location.hash.slice(1) || 'dashboard'); }
function render() {
  const v = currentView();
  $('#main').innerHTML = (views[v] || views.dashboard)();
  document.querySelectorAll('.sidebar a').forEach(a => a.classList.toggle('active', a.dataset.view === v));
  $('#sidebar').classList.remove('open');
}
window.addEventListener('hashchange', render);
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
$('#globalSearch').addEventListener('input', () => {
  if (['dashboard', 'parametres'].includes(currentView())) location.hash = 'contacts'; else render();
});

$('#main').addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-toggle]')) {
    const task = db.taches.find(x => x.id === t.closest('[data-toggle]').dataset.toggle);
    task.fait = t.checked; save(); render(); return;
  }
  const m = t.closest('[data-match]'); if (m) { e.stopPropagation(); showMatches(m.dataset.match); return; }
  const n = t.closest('[data-new]'); if (n) { openForm(n.dataset.new); return; }
  const row = t.closest('[data-coll][data-id]'); if (row && !t.closest('a')) { openForm(row.dataset.coll, row.dataset.id); return; }
  if (t.id === 'exportBtn') download(`mon-agence-${todayISO()}.json`, JSON.stringify(db, null, 2), 'application/json');
  if (t.id === 'exportCsvBtn') exportCsv();
  if (t.id === 'resetBtn' && confirm('Effacer toutes les données ? Cette action est irréversible.')) { db = structuredClone(DEFAULT_DATA); save(); render(); }
  if (t.id === 'demoBtn' && (!db.contacts.length || confirm('Ajouter des données d\'exemple à vos données actuelles ?'))) { loadDemo(); save(); location.hash = 'dashboard'; render(); }
});
$('#main').addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.filter) { filters[t.dataset.filter] = t.value; render(); }
  if (t.id === 'pastToggle') { filters.agendaPast = t.checked; render(); }
  if (t.id === 'doneToggle') { filters.tachesDone = t.checked; render(); }
  if (t.id === 'importInput' && t.files[0]) {
    t.files[0].text().then(txt => {
      const data = JSON.parse(txt);
      if (!Array.isArray(data.contacts)) throw new Error('Fichier non reconnu');
      if (confirm('Remplacer toutes les données actuelles par celles du fichier ?')) { db = Object.assign(structuredClone(DEFAULT_DATA), data); save(); render(); }
    }).catch(err => alert('Import impossible : ' + err.message));
  }
});
$('#main').addEventListener('submit', (e) => {
  if (e.target.id !== 'settingsForm') return;
  e.preventDefault();
  const fd = new FormData(e.target);
  db.settings = { ...db.settings, ...Object.fromEntries(fd) };
  save(); alert('Paramètres enregistrés'); render();
});

function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
function exportCsv() {
  const keys = ['type', 'prenom', 'nom', 'tel', 'email', 'adresse', 'source', 'budgetMax', 'villes', 'notes'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [keys.join(';'), ...db.contacts.map(c => keys.map(k => q(c[k])).join(';'))].join('\n');
  download(`contacts-${todayISO()}.csv`, '﻿' + csv, 'text/csv');
}

/* ================= Données d'exemple ================= */
function loadDemo() {
  const d = (offset, h = 10) => { const x = new Date(); x.setDate(x.getDate() + offset); x.setHours(h, 0, 0, 0);
    return new Date(x - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const day = (o) => d(o).slice(0, 10);
  const c1 = uid(), c2 = uid(), c3 = uid(), c4 = uid(), b1 = uid(), b2 = uid(), b3 = uid();
  db.contacts.push(
    { id: c1, type: 'Vendeur', source: 'Recommandation', prenom: 'Martine', nom: 'Dupont', tel: '06 12 34 56 78', email: 'martine.dupont@exemple.fr', adresse: '12 rue des Lilas, 69003 Lyon' },
    { id: c2, type: 'Acquéreur', source: 'Portail immobilier', prenom: 'Karim', nom: 'Benali', tel: '06 98 76 54 32', email: 'k.benali@exemple.fr', budgetMax: '350000', villes: 'Lyon, Villeurbanne', typeRecherche: 'Appartement', surfaceMin: '60', piecesMin: '3', financement: 'Prêt accordé' },
    { id: c3, type: 'Vendeur', source: 'Pige', prenom: 'Jean', nom: 'Moreau', tel: '07 11 22 33 44' },
    { id: c4, type: 'Acquéreur', source: 'Site web', prenom: 'Sophie', nom: 'Laurent', tel: '06 55 44 33 22', budgetMax: '480000', villes: 'Écully, Tassin', typeRecherche: 'Maison', surfaceMin: '110', financement: 'Prêt en cours' },
  );
  db.biens.push(
    { id: b1, statut: 'Mandat actif', type: 'Appartement', vendeurId: c1, adresse: '12 rue des Lilas', cp: '69003', ville: 'Lyon', surface: '72', pieces: '3', chambres: '2', dpe: 'C', prix: '329000', honoraires: '14000', mandat: 'Exclusif', numMandat: '1024', debutMandat: day(-60), finMandat: day(20), description: 'Lumineux, balcon, proche métro.' },
    { id: b2, statut: 'Compromis', type: 'Maison', vendeurId: c3, cp: '69130', ville: 'Écully', surface: '140', terrain: '600', pieces: '6', chambres: '4', dpe: 'D', prix: '545000', honoraires: '22000', mandat: 'Simple', numMandat: '1019', debutMandat: day(-120), finMandat: day(60) },
    { id: b3, statut: 'Estimation', type: 'Appartement', cp: '69100', ville: 'Villeurbanne', surface: '55', pieces: '2', estimation: '210000' },
  );
  db.rdv.push(
    { id: uid(), type: 'Visite', date: d(1, 18), contactId: c2, bienId: b1, lieu: '12 rue des Lilas, Lyon' },
    { id: uid(), type: 'Estimation', date: d(2, 10), bienId: b3, lieu: 'Villeurbanne' },
    { id: uid(), type: 'Acte authentique', date: d(25, 14), contactId: c3, bienId: b2, lieu: 'Étude notariale' },
  );
  db.taches.push(
    { id: uid(), titre: 'Relancer Mme Dupont pour baisse de prix', echeance: day(0), priorite: 'Haute', contactId: c1, bienId: b1 },
    { id: uid(), titre: 'Envoyer avis de valeur Villeurbanne', echeance: day(3), priorite: 'Normale', bienId: b3 },
    { id: uid(), titre: 'Faire les photos du bien', echeance: day(-1), priorite: 'Normale', bienId: b1 },
  );
  db.ventes.push(
    { id: uid(), statut: 'Compromis signé', bienId: b2, acquereurId: c4, notaire: 'Me Martin', prixVente: '523000', honorairesTTC: '22000', taux: '', dateOffre: day(-30), dateCompromis: day(-15), finCondSusp: day(10), dateActe: day(25) },
    { id: uid(), statut: 'Honoraires encaissés', bienId: b1, acquereurId: c2, prixVente: '280000', honorairesTTC: '12000', taux: '', dateCompromis: day(-150), dateActe: day(-60), dateEncaissement: day(-55), notes: 'Vente précédente (exemple)' },
  );
}

render();
