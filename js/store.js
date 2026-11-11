'use strict';
/* =========================================================
   Stockage : données (localStorage) + fichiers (IndexedDB)
   ========================================================= */
const STORE_KEY = 'mon-agence-v1';

const ETAPES = ['Estimation', 'Mandat signé', 'Offre acceptée', 'Sous compromis', 'Vendu', 'Retiré'];
const ETAPES_ACTIVES = ['Mandat signé', 'Offre acceptée', 'Sous compromis'];
const ROLES = ['Vendeur', 'Co-vendeur', 'Héritier', 'Usufruitier', 'Mandataire / représentant', 'Acquéreur', 'Co-acquéreur', 'Notaire vendeur', 'Notaire acquéreur', 'Syndic', 'Locataire en place', 'Diagnostiqueur', 'Autre'];
const CONTACT_TYPES = ['Vendeur', 'Acquéreur', 'Prospect', 'Candidat locataire', 'Bailleur', 'Notaire', 'Syndic', 'Partenaire', 'Autre'];
const SOURCES = ['Recommandation', 'Pige', 'Boîtage', 'Site web / mini-site', 'Portail immobilier', 'Réseaux sociaux', 'Ancien client', 'Panneau', 'Autre'];
const BIEN_TYPES = ['Maison', 'Appartement', 'Terrain', 'Immeuble', 'Local commercial', 'Parking', 'Autre'];
const MANDATS = ['Simple', 'Exclusif', 'Semi-exclusif', 'Recherche', 'Location', 'Gestion'];
const RDV_TYPES = ['Visite', 'Estimation', 'Signature mandat', 'Signature compromis', 'Acte authentique', 'Rendez-vous acquéreur', 'Appel', 'Autre'];
const OFFRE_STATUTS = ['Reçue', 'Contre-proposition', 'Acceptée', 'Refusée', 'Retirée'];
const VENTE_STATUTS = ['Offre acceptée', 'Compromis signé', 'Acte signé', 'Honoraires encaissés', 'Annulée'];
const SELECTION_STATUTS = ['À proposer', 'Proposé', 'Intéressé', 'Visite prévue', 'Refusé'];
const CANDIDATURE_STATUTS = ['Nouvelle', 'Pièces demandées', 'Dossier incomplet', 'Dossier complet', 'Retenue', 'Refusée'];
const DOC_STATUTS = ['Manquant', 'Demandé', 'Reçu', 'Validé', 'Non concerné'];
const DPE = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'Vierge'];

/* Liste des pièces attendues selon le type de dossier */
function docChecklist(bien) {
  const base = [
    ['Vendeur', 'Pièce d\'identité vendeur(s)'], ['Vendeur', 'Titre de propriété'], ['Vendeur', 'Mandat signé'],
    ['Vendeur', 'Taxe foncière'], ['Vendeur', 'Situation matrimoniale / livret de famille'],
    ['Diagnostics', 'DPE'], ['Diagnostics', 'Électricité'], ['Diagnostics', 'Gaz'], ['Diagnostics', 'Amiante'],
    ['Diagnostics', 'Plomb (CREP)'], ['Diagnostics', 'Termites'], ['Diagnostics', 'État des risques (ERP)'],
    ['Bien', 'Factures travaux / garanties décennales'], ['Bien', 'Plans'],
  ];
  if (bien.type !== 'Appartement') base.push(['Diagnostics', 'Assainissement']);
  if (bien.copropriete === 'Oui' || bien.type === 'Appartement') base.push(
    ['Diagnostics', 'Mesurage Loi Carrez'],
    ['Copropriété', 'Règlement de copropriété / EDD'], ['Copropriété', 'PV des 3 dernières AG'],
    ['Copropriété', 'Fiche synthétique'], ['Copropriété', 'Carnet d\'entretien'],
    ['Copropriété', 'Appels de charges (3 derniers)'], ['Copropriété', 'Pré-état daté'],
  );
  if (bien.succession === 'Oui') base.push(['Succession', 'Attestation de propriété / acte de notoriété'], ['Succession', 'Accord de tous les héritiers']);
  base.push(['Acquéreur', 'Offre d\'achat signée'], ['Acquéreur', 'Pièce d\'identité acquéreur(s)'], ['Acquéreur', 'Attestation de financement']);
  return base;
}
const DOC_CATEGORIES = ['Vendeur', 'Diagnostics', 'Copropriété', 'Succession', 'Bien', 'Acquéreur', 'Visites', 'Compromis / acte', 'Location', 'Autre'];
const PIECES_CANDIDAT = ['Pièce d\'identité', '3 derniers bulletins de salaire', 'Contrat de travail', 'Dernier avis d\'imposition', 'Justificatif de domicile', 'Dossier garant'];

const DEFAULT_DATA = {
  contacts: [], biens: [], rdv: [], taches: [], ventes: [], offres: [], selections: [], candidatures: [],
  settings: {
    nom: '', email: '', tel: '', signature: '', tauxCommission: 70, tva: 20, objectifAnnuel: 60000,
    apiKey: '', model: 'claude-opus-5-5', googleClientId: '', miniSite: '',
  },
};

function migrate(d) {
  const etapeMap = { 'Mandat actif': 'Mandat signé', 'Sous offre': 'Offre acceptée', 'Compromis': 'Sous compromis', 'Expiré / retiré': 'Retiré' };
  for (const b of d.biens) {
    if (!b.etape) b.etape = etapeMap[b.statut] || b.statut || 'Estimation';
    delete b.statut;
    b.transaction ||= 'Vente';
    b.parties ||= b.vendeurId ? [{ contactId: b.vendeurId, role: 'Vendeur' }] : [];
    b.documents ||= []; b.photos ||= []; b.notes ||= []; b.historique ||= [];
    b.memoire ??= '';
  }
  for (const c of d.contacts) c.notesListe ||= [];
  return d;
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      const out = Object.assign(structuredClone(DEFAULT_DATA), d);
      out.settings = Object.assign(structuredClone(DEFAULT_DATA.settings), d.settings || {});
      return migrate(out);
    }
  } catch (e) { console.warn('Lecture impossible', e); }
  return structuredClone(DEFAULT_DATA);
}
let db = load();
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
  catch (e) { alert('Sauvegarde impossible : ' + e.message); }
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const nowISO = () => new Date().toISOString();

/* ---------- Fichiers (documents, photos) dans IndexedDB ---------- */
const Files = (() => {
  let dbp;
  const open = () => dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('mon-agence-fichiers', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const tx = async (mode, fn) => {
    const idb = await open();
    return new Promise((res, rej) => {
      const t = idb.transaction('files', mode); const req = fn(t.objectStore('files'));
      t.oncomplete = () => res(req?.result); t.onerror = () => rej(t.error);
    });
  };
  return {
    put: async (blob, name) => { const id = uid(); await tx('readwrite', s => s.put({ id, name, type: blob.type, blob })); return id; },
    get: (id) => tx('readonly', s => s.get(id)),
    del: (id) => tx('readwrite', s => s.delete(id)),
    all: () => tx('readonly', s => s.getAll()),
    clear: () => tx('readwrite', s => s.clear()),
  };
})();

const blobToBase64 = (blob) => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(blob);
});

/* ---------- Accès pratiques ---------- */
const getContact = (id) => db.contacts.find(x => x.id === id);
const getBien = (id) => db.biens.find(x => x.id === id);
const contactName = (id) => { const c = getContact(id); return c ? `${c.prenom || ''} ${c.nom || ''}`.trim() || c.email || 'Sans nom' : ''; };
const bienName = (id) => { const b = getBien(id); return b ? (b.titre || `${b.type || 'Bien'} – ${b.ville || ''}`).trim() : ''; };
const normTel = (t) => String(t || '').replace(/\D/g, '').replace(/^33/, '0');
const normTxt = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/* Détection de doublons : même e-mail, même téléphone, ou même nom + prénom */
function findDuplicates(c, excludeId) {
  return db.contacts.filter(x => x.id !== excludeId && (
    (c.email && x.email && normTxt(c.email) === normTxt(x.email)) ||
    (c.tel && x.tel && normTel(c.tel).length >= 9 && normTel(c.tel) === normTel(x.tel)) ||
    (c.nom && x.nom && normTxt(c.nom) === normTxt(x.nom) && normTxt(c.prenom) === normTxt(x.prenom))
  ));
}

/* Fusion : on garde `keepId`, on complète ses champs vides et on redirige toutes les références */
function mergeContacts(keepId, mergeId) {
  const keep = getContact(keepId), other = getContact(mergeId);
  if (!keep || !other || keepId === mergeId) throw new Error('Contacts introuvables');
  for (const [k, v] of Object.entries(other)) {
    if (['id', 'cree', 'notesListe'].includes(k)) continue;
    if ((keep[k] === undefined || keep[k] === '') && v !== '') keep[k] = v;
  }
  if (other.notes && keep.notes !== other.notes && !String(keep.notes || '').includes(other.notes)) keep.notes = [keep.notes, other.notes].filter(Boolean).join('\n---\n');
  keep.notesListe = [...(keep.notesListe || []), ...(other.notesListe || [])];
  const swap = (o, k) => { if (o[k] === mergeId) o[k] = keepId; };
  db.biens.forEach(b => { swap(b, 'vendeurId'); b.parties.forEach(p => swap(p, 'contactId')); });
  db.rdv.forEach(r => swap(r, 'contactId'));
  db.taches.forEach(t => swap(t, 'contactId'));
  db.ventes.forEach(v => swap(v, 'acquereurId'));
  db.offres.forEach(o => swap(o, 'acquereurId'));
  db.selections.forEach(s => swap(s, 'contactId'));
  db.candidatures.forEach(s => swap(s, 'contactId'));
  db.contacts = db.contacts.filter(x => x.id !== mergeId);
  keep.maj = nowISO();
  save();
  return keep;
}

/* Initialise la checklist documentaire d'un dossier (sans écraser l'existant) */
function ensureChecklist(b) {
  b.documents ||= [];
  for (const [categorie, nom] of docChecklist(b)) {
    if (!b.documents.some(d => d.nom === nom)) b.documents.push({ id: uid(), categorie, nom, statut: 'Manquant' });
  }
}

function addHistorique(b, texte) { (b.historique ||= []).unshift({ date: nowISO(), texte }); }

/* Commission nette du conseiller (HT) */
function commission(v) {
  const ttc = Number(v.honorairesTTC) || 0;
  const ht = ttc / (1 + (Number(db.settings.tva) || 0) / 100);
  const taux = v.taux !== '' && v.taux != null ? Number(v.taux) : Number(db.settings.tauxCommission);
  return { ht, net: ht * (taux || 0) / 100, taux };
}
