'use strict';
/* =========================================================
   Génération de documents (PDF), partage, WhatsApp, e-mail
   ========================================================= */

/* Numéro au format international pour WhatsApp (France par défaut) */
function waNumber(tel) {
  let n = String(tel || '').replace(/[^\d+]/g, '');
  if (n.startsWith('+')) return n.slice(1);
  if (n.startsWith('00')) return n.slice(2);
  if (n.startsWith('0')) return '33' + n.slice(1);
  return n;
}
const waLink = (tel, text) => `https://wa.me/${waNumber(tel)}?text=${encodeURIComponent(text)}`;
const smsLink = (tel, text) => `sms:${String(tel || '').replace(/\s/g, '')}?&body=${encodeURIComponent(text)}`;
const mailtoLink = (to, subject, body) => `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body || '')}`;

/* Mentions professionnelles reprises en pied de page de tous les documents */
function mentionsPro() {
  const s = db.settings;
  return [
    [s.nom, s.statutPro].filter(Boolean).join(' – '),
    s.mentionReseau || (s.reseau ? `Membre du réseau ${s.reseau}` : ''),
    s.rsac ? `RSAC ${s.rsacVille ? s.rsacVille + ' ' : ''}n° ${s.rsac}` : '',
    s.assurance, s.adressePro, [s.tel, s.email].filter(Boolean).join(' · '),
  ].filter(Boolean);
}
const hexToRgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [14, 147, 132]; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const docColor = () => hexToRgb(db.settings.docColor || (THEMES[db.settings.theme] || THEMES.emeraude).primary);
let logoCache = null;
async function getLogo() {
  if (!db.settings.logoFileId) return null;
  if (logoCache?.id === db.settings.logoFileId) return logoCache;
  const f = await Files.get(db.settings.logoFileId); if (!f) return null;
  const url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f.blob); });
  const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = url; });
  return logoCache = { id: db.settings.logoFileId, url, ratio: img.width / img.height, fmt: f.type.includes('png') ? 'PNG' : 'JPEG' };
}

/* Crée un PDF à votre image (logo, couleur, mentions légales) */
async function textPdf(titre, contenu, opts = {}) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 18, color = docColor(), logo = await getLogo();
  const s = db.settings;
  const footer = () => {
    const lines = mentionsPro();
    doc.setDrawColor(...color); doc.setLineWidth(0.3); doc.line(M, 282 - lines.length * 3.6, W - M, 282 - lines.length * 3.6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(110);
    lines.forEach((l, i) => doc.text(doc.splitTextToSize(l, W - 2 * M)[0], W / 2, 286 - (lines.length - i) * 3.6 + 2, { align: 'center' }));
    doc.setTextColor(20);
  };
  const header = () => {
    let y = 14;
    if (logo) { const h = 14, w = Math.min(50, h * logo.ratio); doc.addImage(logo.url, logo.fmt, M, y - 2, w, w / logo.ratio); }
    else { doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...color); doc.text(s.reseau || s.nom || appName(), M, y + 5); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
    doc.text([s.nom, s.tel, s.email].filter(Boolean), W - M, y + 1, { align: 'right' });
    doc.setTextColor(20);
  };
  header(); footer();
  let y = 40;
  doc.setFillColor(...color); doc.roundedRect(M, y - 7, 4, 10, 1, 1, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text(titre, M + 8, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110); doc.text(`Établi le ${new Date().toLocaleDateString('fr-FR')}`, M + 8, y); doc.setTextColor(20); y += 10;
  doc.setFontSize(11);
  const bottom = 268 - mentionsPro().length * 3.6;
  for (const para of String(contenu).split('\n')) {
    const isTitle = /^#{1,3}\s/.test(para);
    const txt = para.replace(/^#{1,3}\s/, '').replace(/\*\*/g, '');
    doc.setFont('helvetica', isTitle ? 'bold' : 'normal');
    if (isTitle) { doc.setTextColor(...color); y += 2; }
    for (const l of doc.splitTextToSize(txt || ' ', W - 2 * M)) { if (y > bottom) { doc.addPage(); header(); footer(); y = 36; } doc.text(l, M, y); y += 5.6; }
    doc.setTextColor(20);
  }
  if (opts.signatures) {
    if (y > bottom - 30) { doc.addPage(); header(); footer(); y = 36; }
    y += 10; doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    opts.signatures.forEach((sig, i) => { doc.text(sig, M + i * 90, y); doc.setDrawColor(200); doc.roundedRect(M + i * 90, y + 3, 80, 26, 2, 2); });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110);
    opts.signatures.forEach((_, i) => doc.text('Date, « lu et approuvé » et signature', M + i * 90 + 2, y + 8));
  }
  return doc.output('blob');
}

/* ---------- Modèles officiels (PDF fournis par votre réseau) ---------- */
const findModele = (type) => db.modeles.find(m => m.type === type);

/* Valeurs connues pour pré-remplir un modèle */
function templateContext({ bien, contact, rdv, offre } = {}) {
  const s = db.settings, d = rdv ? new Date(rdv.date) : new Date();
  const vendeurs = bien ? bien.parties.filter(p => /vendeur|Héritier|Usufruitier/i.test(p.role)).map(p => contactName(p.contactId)).join(', ') : '';
  return {
    conseiller: s.nom, rsac: s.rsac, conseillerTel: s.tel, conseillerEmail: s.email,
    nom: contact?.nom, prenom: contact?.prenom, nomComplet: contact ? [contact.civilite, contact.prenom, contact.nom].filter(Boolean).join(' ') : '',
    adresseClient: contact?.adresse, tel: contact?.tel, email: contact?.email, dateNaissance: contact?.dateNaissance ? new Date(contact.dateNaissance).toLocaleDateString('fr-FR') : '',
    adresseBien: bien ? [bien.adresse, bien.cp, bien.ville].filter(Boolean).join(' ') : '', rue: bien?.adresse, ville: bien?.ville, cp: bien?.cp,
    typeBien: bien?.type, surface: bien?.surface, pieces: bien?.pieces, prix: bien?.prix ? Number(bien.prix).toLocaleString('fr-FR') : '', numMandat: bien?.numMandat,
    honoraires: bien?.honoraires ? Number(bien.honoraires).toLocaleString('fr-FR') : '', vendeurs,
    date: d.toLocaleDateString('fr-FR'), heure: rdv ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
    montantOffre: offre?.montant ? Number(offre.montant).toLocaleString('fr-FR') : '', aujourdhui: new Date().toLocaleDateString('fr-FR'),
  };
}
const FIELD_RULES = [
  [/(signature|paraphe|lu et approuve|cachet)/, null],
  [/rsac/, 'rsac'], [/(conseill|mandataire|agent|negociat)/, 'conseiller'],
  [/(montant|offre|propos)/, 'montantOffre'], [/(mandat)/, 'numMandat'], [/(honorair|commission)/, 'honoraires'], [/(prix)/, 'prix'],
  [/(vendeur|proprietaire)/, 'vendeurs'], [/(naissance)/, 'dateNaissance'],
  [/(adresse|situe|situation).*(bien|immeuble|lot)|(bien|immeuble).*(adresse|situe)/, 'adresseBien'],
  [/(code ?postal|^cp\b|\bcp$)/, 'cp'], [/(ville|commune|localite)/, 'ville'],
  [/(adresse|domicil|demeurant)/, 'adresseClient'], [/(prenom)/, 'prenom'],
  [/(tel|portable|mobile)/, 'tel'], [/(mail|courriel)/, 'email'],
  [/(surface|m2|superficie)/, 'surface'], [/(piece)/, 'pieces'], [/(\btype|\bnature)/, 'typeBien'],
  [/(heure)/, 'heure'], [/(date)/, 'date'], [/(nom|visiteur|acquereur|client|soussigne)/, 'nomComplet'],
];
/* Caractères compatibles avec les polices standard des formulaires PDF */
const pdfSafe = (v) => String(v).replace(/[\u202f\u00a0\u2009]/g, ' ').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7e\u00a1-\u00ff\u20ac\u0152\u0153\n]/g, '');
async function fillTemplate(modele, ctx) {
  const f = await Files.get(modele.fileId); if (!f) throw new Error('Fichier du modèle introuvable');
  const bytes = new Uint8Array(await f.blob.arrayBuffer());
  const pdf = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
  let fields = [];
  try { fields = pdf.getForm().getFields(); } catch { fields = []; }
  const remplis = [], vides = [];
  for (const field of fields) {
    if (!(field instanceof PDFLib.PDFTextField)) continue;
    const name = normTxt(field.getName()).replace(/[_\-.]+/g, ' ');
    const rule = FIELD_RULES.find(([re]) => re.test(name));
    const val = rule && rule[1] && ctx[rule[1]];
    if (val) { try { field.setText(pdfSafe(val)); remplis.push(field.getName()); } catch { vides.push(field.getName()); } }
    else vides.push(field.getName());
  }
  const out = await pdf.save();
  return { blob: new Blob([out], { type: 'application/pdf' }), nbChamps: fields.length, remplis, vides };
}

/* Produit un document à partir du modèle officiel s'il existe, sinon d'un document généré à votre image */
async function makeOfficialDoc(type, { bienId, rdv, contactId, offre, titre, contenu, signatures } = {}) {
  const bien = getBien(bienId), contact = getContact(contactId || rdv?.contactId || offre?.acquereurId);
  const modele = findModele(type);
  if (modele) {
    const r = await fillTemplate(modele, templateContext({ bien, contact, rdv, offre }));
    return { ...r, officiel: true, nom: `${type} - ${contact ? contactName(contact.id) : bien ? bienName(bien.id) : ''} - ${todayISO()}.pdf` };
  }
  if (type === 'Bon de visite' && rdv) return { blob: await bonDeVisitePdf(rdv), officiel: false, nom: `Bon de visite - ${contactName(rdv.contactId) || 'visiteur'} - ${rdv.date.slice(0, 10)}.pdf` };
  return { blob: await textPdf(titre || type, contenu || '', { signatures }), officiel: false, nom: `${titre || type}.pdf` };
}

/* Bon de visite pré-rempli pour un rendez-vous */
function bonDeVisitePdf(rdv) {
  const b = getBien(rdv.bienId) || {}, c = getContact(rdv.contactId) || {};
  const d = new Date(rdv.date);
  const contenu = [
    `Je soussigné(e) ${[c.civilite, c.prenom, c.nom].filter(Boolean).join(' ') || '…………………………'},`,
    `demeurant ${c.adresse || '……………………………………………………'},`,
    `téléphone : ${c.tel || '…………………'}   e-mail : ${c.email || '…………………'}`,
    '',
    `reconnais avoir visité le ${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}, par l'intermédiaire de ${db.settings.nom || 'mon conseiller immobilier'}, le bien suivant :`,
    '',
    `## ${b.titre || [b.type, b.pieces ? b.pieces + ' pièces' : '', b.surface ? b.surface + ' m²' : ''].filter(Boolean).join(' – ')}`,
    `Adresse : ${[b.adresse, b.cp, b.ville].filter(Boolean).join(' ')}`,
    b.prix ? `Prix de présentation : ${Number(b.prix).toLocaleString('fr-FR')} € honoraires inclus` : '',
    b.numMandat ? `Mandat n° ${b.numMandat}` : '',
    '',
    'Je m\'engage à ne traiter l\'acquisition de ce bien que par l\'intermédiaire de ce conseiller, et à ne pas communiquer les informations le concernant à des tiers. Les informations transmises au moment de la visite m\'ont été données à titre indicatif.',
  ].filter(x => x !== false).join('\n');
  return textPdf('Bon de visite', contenu, { signatures: ['Le visiteur', 'Le conseiller'] });
}

/* Ajoute un fichier (Blob) au dossier d'un bien */
async function attachToBien(bienId, blob, nom, categorie = 'Autre', docNom) {
  const b = getBien(bienId); if (!b) throw new Error('Dossier introuvable');
  const fileId = await Files.put(blob, nom);
  let doc = docNom && b.documents.find(d => d.nom === docNom);
  if (doc) { if (doc.fileId) await Files.del(doc.fileId).catch(() => { }); Object.assign(doc, { fileId, fichier: nom, mime: blob.type, statut: 'Reçu', date: nowISO() }); }
  else { doc = { id: uid(), categorie, nom: docNom || nom, fichier: nom, fileId, mime: blob.type, statut: 'Reçu', date: nowISO() }; b.documents.push(doc); }
  addHistorique(b, `Document ajouté : ${doc.nom}`);
  save();
  return doc;
}

async function openFile(fileId) {
  const f = await Files.get(fileId); if (!f) return alert('Fichier introuvable');
  const url = URL.createObjectURL(f.blob); window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* Partage natif (WhatsApp, Mail, AirDrop…) — surtout sur téléphone */
async function shareFiles(fileIds, text) {
  const files = [];
  for (const id of fileIds) { const f = await Files.get(id); if (f) files.push(new File([f.blob], f.name, { type: f.type })); }
  if (navigator.canShare?.({ files })) { await navigator.share({ files, text }); return true; }
  alert('Le partage de fichiers n\'est pas disponible sur cet appareil. Utilisez plutôt un brouillon Gmail.');
  return false;
}

function downloadBlob(name, blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/* Réduit une image avant stockage (photos de biens) */
async function resizeImage(file, max = 1800) {
  if (!file.type.startsWith('image/')) return file;
  const img = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 1.5e6) return file;
  const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(b => res(new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.85));
}

/* Messages types */
function confirmationVisiteTexte(rdv) {
  const b = getBien(rdv.bienId) || {}, c = getContact(rdv.contactId) || {};
  const d = new Date(rdv.date);
  return `Bonjour ${c.prenom || ''},\nJe vous confirme notre rendez-vous ${rdv.type === 'Visite' ? 'de visite' : ''} le ${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}${rdv.lieu || b.adresse ? ` au ${rdv.lieu || [b.adresse, b.ville].filter(Boolean).join(', ')}` : ''}.\nMerci de me prévenir en cas d'empêchement.\nBelle journée,\n${db.settings.nom || ''}`.replace(/ +/g, ' ');
}
function demandePiecesTexte(b, contact, docs) {
  return `Bonjour ${contact?.prenom || ''},\nAfin d'avancer sur le dossier de vente${b.ville ? ` de votre bien à ${b.ville}` : ''}, pourriez-vous me transmettre les documents suivants :\n${docs.map(d => '• ' + d.nom).join('\n')}\n\nVous pouvez simplement répondre à ce message avec les documents en pièce jointe (photo ou PDF).\nMerci beaucoup,\n${db.settings.nom || ''}`.replace(/ +/g, ' ');
}
function demandePiecesCandidatTexte(cand) {
  const b = getBien(cand.bienId) || {}, c = getContact(cand.contactId) || {};
  const manquantes = PIECES_CANDIDAT.filter(p => !(cand.pieces || {})[p]);
  return `Bonjour ${c.prenom || ''},\nMerci pour votre intérêt pour le logement${b.ville ? ` à ${b.ville}` : ''}. Pour étudier votre candidature, merci de m'envoyer :\n${manquantes.map(p => '• ' + p).join('\n')}\n\nVous pouvez répondre directement à ce message avec les pièces jointes${db.settings.depotUrl ? ` ou les déposer ici : ${db.settings.depotUrl}` : ''}.\nCordialement,\n${db.settings.nom || ''}`.replace(/ +/g, ' ');
}
