// Préparation des messages : modèles, numéros, liens d'envoi en un clic.

const FUSEAU = process.env.TZ_AFFICHAGE || 'Europe/Paris';

const LIBELLES_RDV = {
  estimation: 'estimation',
  visite: 'visite',
  signature: 'signature',
  autre: 'rendez-vous',
};

function formaterDate(iso) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: FUSEAU,
  }).format(new Date(iso));
}

function formaterHeure(iso) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: FUSEAU,
  }).format(new Date(iso)).replace(':', 'h');
}

/** Remplace {prenom}, {date}, {heure}, {lieu}, {type}, {conseiller}... dans un modèle. */
function remplir(modele, { contact = {}, rdv = null, reglages = {} } = {}) {
  const valeurs = {
    prenom: contact.prenom || '',
    nom: contact.nom || '',
    conseiller: reglages.conseiller_nom || '',
    telephone_conseiller: reglages.conseiller_telephone || '',
    date: rdv ? formaterDate(rdv.debut) : '',
    heure: rdv ? formaterHeure(rdv.debut) : '',
    lieu: rdv && rdv.lieu ? rdv.lieu : '',
    type: rdv ? (LIBELLES_RDV[rdv.type] || 'rendez-vous') : '',
  };
  return modele
    .replace(/\{(\w+)\}/g, (m, k) => (k in valeurs ? valeurs[k] : m))
    .replace(/\s+-\s*(?=[.,!]|$)/g, '')   // lieu vide : supprime le tiret orphelin
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Normalise un numéro français au format international (+33...). */
function normaliserTelephone(tel) {
  if (!tel) return '';
  let t = String(tel).replace(/[^\d+]/g, '');
  if (t.startsWith('00')) t = '+' + t.slice(2);
  if (/^0\d{9}$/.test(t)) t = '+33' + t.slice(1);
  if (/^\d{9}$/.test(t)) t = '+33' + t;
  return t;
}

/** Lien qui ouvre WhatsApp / l'app SMS / le mail avec le message déjà rédigé. */
function lienEnvoiManuel(canal, contact, contenu, sujet = '') {
  const tel = normaliserTelephone(contact.telephone);
  const texte = encodeURIComponent(contenu);
  if (canal === 'whatsapp' && tel) return `https://wa.me/${tel.replace('+', '')}?text=${texte}`;
  if (canal === 'sms' && tel) return `sms:${tel}?body=${texte}`;
  if (canal === 'email' && contact.email) {
    return `mailto:${contact.email}?subject=${encodeURIComponent(sujet)}&body=${texte}`;
  }
  return null;
}

module.exports = { remplir, normaliserTelephone, lienEnvoiManuel, formaterDate, formaterHeure };
