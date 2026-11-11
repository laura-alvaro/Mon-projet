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

/* Crée un PDF texte simple et propre (titre + paragraphes) */
function textPdf(titre, contenu, opts = {}) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 18; let y = 20;
  const s = db.settings;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(90);
  doc.text([s.nom || 'Conseiller immobilier', [s.tel, s.email].filter(Boolean).join(' · ')].filter(Boolean), M, y);
  doc.text(new Date().toLocaleDateString('fr-FR'), W - M, y, { align: 'right' });
  y += 16; doc.setTextColor(20); doc.setFontSize(16); doc.text(titre, M, y); y += 4;
  doc.setDrawColor(31, 94, 255); doc.setLineWidth(0.6); doc.line(M, y, W - M, y); y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  for (const para of String(contenu).split('\n')) {
    const isTitle = /^#{1,3}\s/.test(para);
    const txt = para.replace(/^#{1,3}\s/, '').replace(/\*\*/g, '');
    doc.setFont('helvetica', isTitle ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(txt || ' ', W - 2 * M);
    for (const l of lines) { if (y > 280) { doc.addPage(); y = 20; } doc.text(l, M, y); y += 5.6; }
    if (isTitle) y += 1;
  }
  if (opts.signatures) {
    if (y > 240) { doc.addPage(); y = 20; }
    y += 12; doc.setFont('helvetica', 'bold');
    opts.signatures.forEach((sig, i) => doc.text(sig, M + i * 90, y));
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    opts.signatures.forEach((_, i) => doc.text('Lu et approuvé, date et signature', M + i * 90, y + 5));
  }
  return doc.output('blob');
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
