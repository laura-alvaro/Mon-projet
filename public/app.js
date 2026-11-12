// Assistant Immo — interface (aucune dépendance, aucun build).

const ETAPES = ['nouveau', 'contacte', 'estimation', 'mandat', 'visite', 'offre', 'compromis', 'vendu', 'perdu'];
const LIB_ETAPE = { nouveau: 'Nouveau', contacte: 'Contacté', estimation: 'Estimation', mandat: 'Mandat', visite: 'Visites', offre: 'Offre', compromis: 'Compromis', vendu: 'Vendu', perdu: 'Perdu' };
const LIB_TYPE_CONTACT = { vendeur: 'Vendeur', acquereur: 'Acquéreur', autre: 'Autre' };
const LIB_TYPE_RDV = { estimation: 'Estimation', visite: 'Visite', signature: 'Signature', autre: 'Autre' };
const LIB_STATUT_RDV = { prevu: 'Prévu', confirme: 'Confirmé', fait: 'Fait', annule: 'Annulé' };
const LIB_CANAL = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email' };

const $vue = document.getElementById('vue');
const $fenetre = document.getElementById('fenetre');
const $fenetreContenu = document.getElementById('fenetre-contenu');

// ---------- Utilitaires ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nom = (o) => `${o.prenom || ''} ${o.nom || ''}`.trim() || 'Sans contact';

async function api(chemin, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${chemin}`, {
    method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erreur || `Erreur ${res.status}`);
  return data;
}

function notifier(texte) {
  const n = document.getElementById('notification');
  n.textContent = texte;
  n.classList.add('visible');
  clearTimeout(notifier.t);
  notifier.t = setTimeout(() => n.classList.remove('visible'), 3200);
}

function dateLocale(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function versInputDatetime(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${dateLocale(d)}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const fmtHeure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
const fmtJour = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtDateCourte = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
function fmtEcheance(jour) {
  const auj = dateLocale();
  if (jour === auj) return "aujourd'hui";
  if (jour < auj) return `en retard (${fmtDateCourte(jour + 'T12:00')})`;
  return fmtDateCourte(jour + 'T12:00');
}
function dansNJours(n) { const d = new Date(); d.setDate(d.getDate() + n); return dateLocale(d); }

function ouvrir(html, apresRendu) {
  $fenetreContenu.innerHTML = html;
  if (!$fenetre.open) $fenetre.showModal();
  apresRendu?.($fenetreContenu);
}
function fermer() { $fenetre.close(); }
$fenetre.addEventListener('click', (e) => { if (e.target === $fenetre) fermer(); });

function formulaire(form) {
  return Object.fromEntries(new FormData(form).entries());
}

// ---------- Routeur ----------
const VUES = { aujourdhui: vueAujourdhui, contacts: vueContacts, agenda: vueAgenda, modeles: vueModeles, reglages: vueReglages };

async function afficher() {
  const [nomVue, param] = (location.hash.slice(1) || 'aujourdhui').split('/');
  const vue = VUES[nomVue] ? nomVue : 'aujourdhui';
  document.querySelectorAll('.navigation a').forEach((a) => a.classList.toggle('actif', a.dataset.vue === vue));
  try {
    await VUES[vue](param);
  } catch (e) {
    $vue.innerHTML = `<div class="vide">Erreur : ${esc(e.message)}</div>`;
  }
}
window.addEventListener('hashchange', afficher);

document.getElementById('btn-actualiser').addEventListener('click', async () => {
  const b = await api('/automatisations/executer', { method: 'POST' });
  const total = b.confirmations + b.rappels + b.suivis + b.relances;
  notifier(total ? `${total} nouvelle(s) action(s) préparée(s)` : 'Tout est à jour ✓');
  afficher();
});

// ---------- Composants partagés ----------
function carteMessage(m) {
  const canal = `<span class="badge ${m.canal === 'whatsapp' ? 'whatsapp' : ''}">${LIB_CANAL[m.canal]}</span>`;
  const echec = m.statut === 'echec' ? `<div class="meta" style="color:var(--rouge)">Échec : ${esc(m.erreur)}</div>` : '';
  const envoyer = m.envoi_auto_possible
    ? `<button class="btn-principal" data-action="envoyer-msg" data-id="${m.id}">Envoyer</button>`
    : m.lien_manuel
      ? `<a class="btn ${m.canal === 'whatsapp' ? 'btn-whatsapp' : 'btn-principal'}" href="${esc(m.lien_manuel)}" target="_blank" rel="noopener" data-action="ouvrir-lien" data-id="${m.id}">Ouvrir ${LIB_CANAL[m.canal]}</a>`
      : '';
  return `
    <div class="carte" data-msg="${m.id}">
      <div class="ligne"><strong class="grandit">${esc(m.contact_nom)}</strong>${canal}</div>
      <div class="texte-message">${esc(m.contenu)}</div>
      ${echec}
      <div class="actions">
        ${envoyer}
        ${m.envoi_auto_possible ? '' : `<button data-action="msg-envoye" data-id="${m.id}">✓ C'est envoyé</button>`}
        <button data-action="modifier-msg" data-id="${m.id}">Modifier</button>
        <button class="btn-danger" data-action="supprimer-msg" data-id="${m.id}">Ignorer</button>
      </div>
    </div>`;
}

function carteTache(t) {
  const retard = t.echeance < dateLocale();
  const tel = t.telephone ? `<a class="btn btn-petit" href="tel:${esc(t.telephone)}">📞 Appeler</a>` : '';
  return `
    <div class="carte">
      <div class="ligne">
        <button class="case" title="Marquer comme fait" data-action="tache-faite" data-id="${t.id}" data-type="${esc(t.type)}"></button>
        <div class="grandit">
          <div>${esc(t.titre)}</div>
          <div class="meta">${retard ? `<span class="badge rouge">${fmtEcheance(t.echeance)}</span>` : fmtEcheance(t.echeance)}
            ${t.contact_id ? ` · <a href="#contacts/${t.contact_id}">fiche</a>` : ''}</div>
        </div>
      </div>
      <div class="actions">${tel}
        ${t.contact_id && t.type === 'relance' ? `<button class="btn-petit" data-action="relancer" data-contact="${t.contact_id}">✉︎ Message de relance</button>` : ''}
        <button class="btn-petit" data-action="reporter" data-id="${t.id}">Demain</button>
      </div>
    </div>`;
}

function carteRdv(r, { avecJour = false } = {}) {
  const couleur = { confirme: 'vert', annule: 'rouge', fait: '' }[r.statut] ?? 'orange';
  return `
    <div class="carte cliquable" data-action="modifier-rdv" data-id="${r.id}">
      <div class="ligne">
        <div class="heure">${fmtHeure(r.debut)}</div>
        <div class="grandit">
          <div><strong>${esc(r.titre)}</strong></div>
          <div class="meta">${avecJour ? `${fmtJour(r.debut)} · ` : ''}${esc(nom(r))}${r.lieu ? ` · ${esc(r.lieu)}` : ''}</div>
        </div>
        <span class="badge ${couleur}">${LIB_STATUT_RDV[r.statut] || r.statut}</span>
      </div>
    </div>`;
}

// Gestion centralisée des clics sur les actions
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, id } = el.dataset;
  try {
    switch (action) {
      case 'envoyer-msg':
        el.disabled = true;
        await api(`/messages/${id}/envoyer`, { method: 'POST' });
        notifier('Message envoyé ✓');
        return rafraichir();
      case 'ouvrir-lien':
        // Le lien s'ouvre ; on propose ensuite de confirmer l'envoi.
        setTimeout(() => el.closest('.carte')?.querySelector('[data-action="msg-envoye"]')?.classList.add('btn-principal'), 300);
        return;
      case 'msg-envoye':
        await api(`/messages/${id}/marquer-envoye`, { method: 'POST' });
        notifier('Noté comme envoyé ✓');
        return rafraichir();
      case 'supprimer-msg':
        await api(`/messages/${id}`, { method: 'DELETE' });
        return rafraichir();
      case 'modifier-msg':
        return fenetreModifierMessage(id);
      case 'tache-faite':
        if (el.dataset.type === 'relance' || el.dataset.type === 'appel') return fenetreTacheFaite(id);
        await api(`/taches/${id}/faite`, { method: 'POST', body: {} });
        notifier('Bravo, une de moins ✓');
        return rafraichir();
      case 'reporter':
        await api(`/taches/${id}/reporter`, { method: 'POST', body: { echeance: dansNJours(1) } });
        notifier('Reporté à demain');
        return rafraichir();
      case 'relancer':
        return fenetreNouveauMessage(el.dataset.contact, 'relance');
      case 'modifier-rdv':
        return fenetreRdv(id);
      case 'fermer':
        return fermer();
    }
  } catch (err) {
    el.disabled = false;
    notifier(err.message);
  }
});

function rafraichir() {
  const contactOuvert = $fenetre.open && $fenetreContenu.querySelector('[data-fiche]');
  if (contactOuvert) ficheContact(contactOuvert.dataset.fiche, contactOuvert.dataset.onglet);
  return afficher();
}

// ---------- Vue : Aujourd'hui ----------
async function vueAujourdhui() {
  const d = await api('/tableau-de-bord');
  const rdvJour = d.rdv.filter((r) => dateLocale(new Date(r.debut)) === dateLocale());
  const rdvApres = d.rdv.filter((r) => dateLocale(new Date(r.debut)) !== dateLocale());
  const actifs = ETAPES.filter((e) => !['vendu', 'perdu'].includes(e));
  $vue.innerHTML = `
    <div class="titre-page"><h2>Bonjour 👋</h2></div>
    <p class="sous-titre">${fmtJour(new Date())}</p>

    <section>
      <h3>Messages à envoyer ${d.messages.length ? `<span class="compteur">${d.messages.length}</span>` : ''}</h3>
      ${d.messages.map(carteMessage).join('') || '<div class="vide">Aucun message en attente ✓</div>'}
    </section>

    <section>
      <h3>À faire ${d.taches.length ? `<span class="compteur">${d.taches.length}</span>` : ''}</h3>
      ${d.taches.map(carteTache).join('') || '<div class="vide">Rien à faire aujourd\'hui ✓</div>'}
      <button data-action="nouvelle-tache-ui">+ Ajouter une tâche</button>
    </section>

    <section>
      <h3>Rendez-vous du jour</h3>
      ${rdvJour.map((r) => carteRdv(r)).join('') || '<div class="vide">Pas de rendez-vous aujourd\'hui</div>'}
    </section>

    ${rdvApres.length ? `<section><h3>Cette semaine</h3>${rdvApres.map((r) => carteRdv(r, { avecJour: true })).join('')}</section>` : ''}

    <section>
      <h3>Mes clients en cours</h3>
      <div class="pipeline">${actifs.map((e) => `<div><strong>${d.pipeline[e] || 0}</strong><span>${LIB_ETAPE[e]}</span></div>`).join('')}</div>
    </section>`;
  $vue.querySelector('[data-action="nouvelle-tache-ui"]').onclick = () => fenetreNouvelleTache();
}

// ---------- Vue : Contacts ----------
async function vueContacts(id) {
  $vue.innerHTML = `
    <div class="titre-page"><h2>Mes clients</h2><button class="btn-principal" id="btn-nouveau-contact">+ Nouveau</button></div>
    <input class="recherche" type="search" id="recherche" placeholder="Rechercher un nom, un téléphone, une note…">
    <div id="liste-contacts"></div>`;
  const charger = async (q = '') => {
    const contacts = await api(`/contacts?q=${encodeURIComponent(q)}`);
    document.getElementById('liste-contacts').innerHTML = contacts.map((c) => `
      <div class="carte cliquable" data-contact="${c.id}">
        <div class="ligne">
          <div class="grandit">
            <strong>${esc(nom(c))}</strong>
            <div class="meta">${LIB_TYPE_CONTACT[c.type] || ''}${c.telephone ? ` · ${esc(c.telephone)}` : ''}${c.prochaine_relance ? ` · relance ${fmtDateCourte(c.prochaine_relance + 'T12:00')}` : ''}</div>
          </div>
          <span class="badge ${c.etape === 'vendu' ? 'vert' : c.etape === 'perdu' ? 'rouge' : ''}">${LIB_ETAPE[c.etape] || c.etape}</span>
        </div>
      </div>`).join('') || '<div class="vide">Aucun client pour l\'instant. Ajoutez le premier !</div>';
  };
  document.getElementById('btn-nouveau-contact').onclick = () => fenetreContact();
  let t;
  document.getElementById('recherche').oninput = (e) => { clearTimeout(t); t = setTimeout(() => charger(e.target.value), 200); };
  document.getElementById('liste-contacts').onclick = (e) => {
    const c = e.target.closest('[data-contact]');
    if (c) ficheContact(c.dataset.contact);
  };
  await charger();
  if (id) ficheContact(id);
}

function champsContact(c = {}) {
  return `
    <div class="grille">
      <label>Prénom *<input name="prenom" required value="${esc(c.prenom)}"></label>
      <label>Nom<input name="nom" value="${esc(c.nom)}"></label>
      <label>Téléphone<input name="telephone" type="tel" value="${esc(c.telephone)}" placeholder="06 12 34 56 78"></label>
      <label>Email<input name="email" type="email" value="${esc(c.email)}"></label>
      <label>Type<select name="type">${Object.entries(LIB_TYPE_CONTACT).map(([k, v]) => `<option value="${k}" ${c.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>Étape<select name="etape">${ETAPES.map((e) => `<option value="${e}" ${c.etape === e ? 'selected' : ''}>${LIB_ETAPE[e]}</option>`).join('')}</select></label>
      <label>Source<input name="source" value="${esc(c.source)}" placeholder="Leboncoin, recommandation, boîtage…"></label>
      <label>Prochaine relance<input name="prochaine_relance" type="date" value="${esc(c.prochaine_relance)}"></label>
    </div>
    <label>Notes<textarea name="notes" placeholder="Budget, critères, situation…">${esc(c.notes)}</textarea></label>`;
}

function fenetreContact() {
  ouvrir(`
    <h2>Nouveau client</h2>
    <form id="f">${champsContact({ type: 'acquereur', etape: 'nouveau' })}
      <div class="pied-fenetre"><button type="button" data-action="fermer">Annuler</button><button class="btn-principal">Enregistrer</button></div>
    </form>`, (el) => {
    el.querySelector('#f').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const c = await api('/contacts', { method: 'POST', body: formulaire(e.target) });
        notifier('Client ajouté ✓ — un premier appel est prévu aujourd\'hui');
        afficher();
        ficheContact(c.id);
      } catch (err) { notifier(err.message); }
    };
  });
}

async function ficheContact(id, onglet = 'historique') {
  const c = await api(`/contacts/${id}`);
  const wa = c.telephone ? `https://wa.me/${c.telephone.replace(/[^\d]/g, '').replace(/^0/, '33')}` : null;
  const historique = [
    ...c.rendezvous.map((r) => ({ date: r.debut, html: carteRdv({ ...r, prenom: c.prenom, nom: c.nom }, { avecJour: true }) })),
    ...c.messages.map((m) => ({ date: m.created_at, html: m.statut === 'envoye'
      ? `<div class="carte"><div class="ligne"><span class="badge vert">${LIB_CANAL[m.canal]} envoyé</span><span class="meta grandit">${fmtDateCourte(m.envoye_at)}</span></div><div class="texte-message">${esc(m.contenu)}</div></div>`
      : carteMessage(m) })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const tachesOuvertes = c.taches.filter((t) => !t.faite_at);

  ouvrir(`
    <div data-fiche="${c.id}" data-onglet="${onglet}">
      <div class="ligne"><h2 class="grandit" style="margin:0">${esc(nom(c))}</h2><span class="badge">${LIB_ETAPE[c.etape]}</span></div>
      <div class="meta">${LIB_TYPE_CONTACT[c.type] || ''}${c.source ? ` · ${esc(c.source)}` : ''}</div>
      <div class="actions" style="margin-top:12px">
        ${c.telephone ? `<a class="btn" href="tel:${esc(c.telephone)}">📞 Appeler</a>` : ''}
        ${wa ? `<a class="btn btn-whatsapp" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        <button id="btn-msg">✉︎ Message</button>
        <button id="btn-rdv">📅 RDV</button>
        <button id="btn-echange">✓ Noter un échange</button>
      </div>
      <div class="onglets-fiche">
        <button data-onglet="historique" class="${onglet === 'historique' ? 'actif' : ''}">Historique</button>
        <button data-onglet="taches" class="${onglet === 'taches' ? 'actif' : ''}">Tâches (${tachesOuvertes.length})</button>
        <button data-onglet="infos" class="${onglet === 'infos' ? 'actif' : ''}">Infos</button>
      </div>
      <div id="contenu-onglet">
        ${onglet === 'historique' ? (historique.map((h) => h.html).join('') || '<div class="vide">Rien pour l\'instant</div>') : ''}
        ${onglet === 'taches' ? (tachesOuvertes.map((t) => carteTache({ ...t, telephone: c.telephone })).join('') || '<div class="vide">Aucune tâche</div>') + `<button id="btn-tache">+ Tâche</button>` : ''}
        ${onglet === 'infos' ? `<form id="f-infos">${champsContact(c)}
          <div class="pied-fenetre"><button type="button" class="btn-danger" id="btn-suppr">Supprimer</button><button class="btn-principal">Enregistrer</button></div></form>` : ''}
      </div>
      <div class="pied-fenetre"><button data-action="fermer">Fermer</button></div>
    </div>`, (el) => {
    el.querySelectorAll('[data-onglet]').forEach((b) => { if (b.tagName === 'BUTTON') b.onclick = () => ficheContact(id, b.dataset.onglet); });
    el.querySelector('#btn-msg').onclick = () => fenetreNouveauMessage(c.id);
    el.querySelector('#btn-rdv').onclick = () => fenetreRdv(null, c.id);
    el.querySelector('#btn-echange').onclick = () => fenetreEchange(c);
    el.querySelector('#btn-tache')?.addEventListener('click', () => fenetreNouvelleTache(c.id));
    el.querySelector('#f-infos')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await api(`/contacts/${id}`, { method: 'PUT', body: formulaire(e.target) });
      notifier('Enregistré ✓');
      afficher();
      ficheContact(id, 'infos');
    });
    el.querySelector('#btn-suppr')?.addEventListener('click', async () => {
      if (!confirm(`Supprimer ${nom(c)} et tout son historique ?`)) return;
      await api(`/contacts/${id}`, { method: 'DELETE' });
      fermer();
      afficher();
    });
  });
}

function fenetreEchange(c) {
  ouvrir(`
    <h2>Échange avec ${esc(nom(c))}</h2>
    <form id="f">
      <label>Ce qui s'est dit (optionnel)<textarea name="note" placeholder="Ex. : rappeler après les vacances, budget revu à 320 k€…"></textarea></label>
      <label>Prochaine relance
        <select name="delai">
          <option value="">Automatique (selon vos réglages)</option>
          <option value="2">Dans 2 jours</option><option value="7">Dans 1 semaine</option>
          <option value="14">Dans 2 semaines</option><option value="30">Dans 1 mois</option><option value="90">Dans 3 mois</option>
        </select>
      </label>
      <div class="pied-fenetre"><button type="button" id="retour">Retour</button><button class="btn-principal">Enregistrer</button></div>
    </form>`, (el) => {
    el.querySelector('#retour').onclick = () => ficheContact(c.id);
    el.querySelector('#f').onsubmit = async (e) => {
      e.preventDefault();
      const v = formulaire(e.target);
      await api(`/contacts/${c.id}/interaction`, { method: 'POST', body: { note: v.note, prochaine_relance: v.delai ? dansNJours(Number(v.delai)) : null } });
      notifier('Échange noté ✓');
      afficher();
      ficheContact(c.id);
    };
  });
}

function fenetreTacheFaite(id) {
  ouvrir(`
    <h2>C'est fait 👍</h2>
    <form id="f">
      <label>Quand relancer ce client la prochaine fois ?
        <select name="delai">
          <option value="">Automatique (selon vos réglages)</option>
          <option value="2">Dans 2 jours</option><option value="7">Dans 1 semaine</option>
          <option value="14">Dans 2 semaines</option><option value="30">Dans 1 mois</option><option value="90">Dans 3 mois</option>
        </select>
      </label>
      <div class="pied-fenetre"><button type="button" data-action="fermer">Annuler</button><button class="btn-principal">Valider</button></div>
    </form>`, (el) => {
    el.querySelector('#f').onsubmit = async (e) => {
      e.preventDefault();
      const { delai } = formulaire(e.target);
      await api(`/taches/${id}/faite`, { method: 'POST', body: { prochaine_relance: delai ? dansNJours(Number(delai)) : null } });
      fermer();
      notifier('Bravo, une de moins ✓');
      afficher();
    };
  });
}

function fenetreNouvelleTache(contactId = null) {
  ouvrir(`
    <h2>Nouvelle tâche</h2>
    <form id="f">
      <label>Quoi ?<input name="titre" required placeholder="Ex. : envoyer le dossier diagnostics"></label>
      <label>Pour quand ?<input name="echeance" type="date" value="${dateLocale()}"></label>
      <div class="pied-fenetre"><button type="button" data-action="fermer">Annuler</button><button class="btn-principal">Ajouter</button></div>
    </form>`, (el) => {
    el.querySelector('#f').onsubmit = async (e) => {
      e.preventDefault();
      await api('/taches', { method: 'POST', body: { ...formulaire(e.target), contact_id: contactId } });
      notifier('Tâche ajoutée ✓');
      if (contactId) ficheContact(contactId, 'taches'); else fermer();
      afficher();
    };
  });
}

async function fenetreNouveauMessage(contactId, cleInitiale = '') {
  const [modeles, c, reglages] = await Promise.all([api('/modeles'), api(`/contacts/${contactId}`), api('/reglages')]);
  const preRemplir = (t) => t.replace(/\{prenom\}/g, c.prenom).replace(/\{nom\}/g, c.nom || '')
    .replace(/\{conseiller\}/g, reglages.conseiller_nom || '').replace(/\{telephone_conseiller\}/g, reglages.conseiller_telephone || '');
  ouvrir(`
    <h2>Message à ${esc(nom(c))}</h2>
    <form id="f">
      <div class="grille">
        <label>Modèle<select name="cle"><option value="">— Message libre —</option>
          ${modeles.map((m) => `<option value="${m.cle}" ${m.cle === cleInitiale ? 'selected' : ''}>${esc(m.titre)}</option>`).join('')}</select></label>
        <label>Canal<select name="canal">
          ${c.telephone ? '<option value="whatsapp">WhatsApp</option><option value="sms">SMS</option>' : ''}
          ${c.email ? '<option value="email">Email</option>' : ''}</select></label>
      </div>
      <label>Message<textarea name="contenu" placeholder="Choisissez un modèle ou écrivez librement"></textarea></label>
      <p class="aide">Le message sera ajouté à vos « Messages à envoyer », prêt à partir en un clic.</p>
      <div class="pied-fenetre"><button type="button" id="retour">Retour</button><button class="btn-principal">Préparer</button></div>
    </form>`, (el) => {
    const f = el.querySelector('#f');
    const apercu = () => {
      const m = modeles.find((x) => x.cle === f.cle.value);
      if (m) f.contenu.value = preRemplir(m.contenu);
    };
    f.cle.onchange = apercu;
    apercu();
    el.querySelector('#retour').onclick = () => ficheContact(contactId);
    f.onsubmit = async (e) => {
      e.preventDefault();
      const v = formulaire(f);
      try {
        // On renvoie le modèle au serveur pour qu'il remplisse aussi {conseiller}, {date}…
        const modele = modeles.find((x) => x.cle === v.cle);
        const modifie = !modele || f.contenu.value !== preRemplir(modele.contenu);
        await api('/messages', { method: 'POST', body: { contact_id: contactId, canal: v.canal, cle: modifie ? null : v.cle, contenu: modifie ? v.contenu : null } });
        notifier('Message prêt ✓');
        ficheContact(contactId);
        afficher();
      } catch (err) { notifier(err.message); }
    };
  });
}

async function fenetreModifierMessage(id) {
  const carte = document.querySelector(`[data-msg="${id}"] .texte-message`);
  ouvrir(`
    <h2>Modifier le message</h2>
    <form id="f">
      <label>Message<textarea name="contenu" style="min-height:140px">${esc(carte?.textContent || '')}</textarea></label>
      <div class="pied-fenetre"><button type="button" data-action="fermer">Annuler</button><button class="btn-principal">Enregistrer</button></div>
    </form>`, (el) => {
    el.querySelector('#f').onsubmit = async (e) => {
      e.preventDefault();
      await api(`/messages/${id}`, { method: 'PUT', body: formulaire(e.target) });
      fermer();
      afficher();
    };
  });
}

// ---------- Vue : Agenda ----------
async function vueAgenda() {
  const rdvs = await api(`/rendezvous?depuis=${encodeURIComponent(new Date(Date.now() - 86400e3).toISOString())}`);
  const parJour = {};
  for (const r of rdvs) (parJour[dateLocale(new Date(r.debut))] ||= []).push(r);
  $vue.innerHTML = `
    <div class="titre-page"><h2>Agenda</h2><button class="btn-principal" id="btn-rdv">+ Rendez-vous</button></div>
    ${Object.entries(parJour).map(([jour, liste]) => `
      <section><h3>${fmtJour(jour + 'T12:00')}</h3>${liste.map((r) => carteRdv(r)).join('')}</section>`).join('')
      || '<div class="vide">Aucun rendez-vous à venir</div>'}`;
  document.getElementById('btn-rdv').onclick = () => fenetreRdv();
}

async function fenetreRdv(id = null, contactId = null) {
  const contacts = await api('/contacts');
  let r = { type: 'visite', statut: 'prevu', contact_id: contactId };
  if (id) r = await api(`/rendezvous/${id}`);
  const debut = r.debut ? versInputDatetime(r.debut) : `${dansNJours(1)}T10:00`;
  const duree = r.fin && r.debut ? Math.round((new Date(r.fin) - new Date(r.debut)) / 60000) : 60;
  ouvrir(`
    <h2>${id ? 'Rendez-vous' : 'Nouveau rendez-vous'}</h2>
    <form id="f">
      <label>Client<select name="contact_id"><option value="">— Aucun —</option>
        ${contacts.map((c) => `<option value="${c.id}" ${String(c.id) === String(r.contact_id) ? 'selected' : ''}>${esc(nom(c))}</option>`).join('')}</select></label>
      <div class="grille">
        <label>Type<select name="type">${Object.entries(LIB_TYPE_RDV).map(([k, v]) => `<option value="${k}" ${r.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label>Statut<select name="statut">${Object.entries(LIB_STATUT_RDV).map(([k, v]) => `<option value="${k}" ${r.statut === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label>Date et heure<input name="debut" type="datetime-local" required value="${debut}"></label>
        <label>Durée<select name="duree">${[30, 45, 60, 90, 120].map((m) => `<option value="${m}" ${m === duree ? 'selected' : ''}>${m < 60 ? `${m} min` : `${m / 60} h`.replace('.5', ' h 30').replace(' h h', ' h')}</option>`).join('')}</select></label>
      </div>
      <label>Titre<input name="titre" value="${esc(r.titre)}" placeholder="Ex. : Visite T3 rue des Lilas"></label>
      <label>Adresse<input name="lieu" value="${esc(r.lieu)}"></label>
      <label>Notes<textarea name="notes">${esc(r.notes)}</textarea></label>
      ${id ? `<p class="aide">${r.confirmation_envoyee_at ? '✓ Confirmation préparée' : 'Confirmation : préparée automatiquement avant le RDV'}${r.google_event_id ? ' · ✓ Dans Google Agenda' : ''}</p>` : '<p class="aide">La confirmation SMS/WhatsApp sera préparée automatiquement avant le rendez-vous.</p>'}
      <div class="pied-fenetre">
        ${id ? '<button type="button" class="btn-danger" id="btn-suppr">Supprimer</button>' : ''}
        <button type="button" data-action="fermer">Annuler</button><button class="btn-principal">Enregistrer</button>
      </div>
    </form>`, (el) => {
    const f = el.querySelector('#f');
    f.onsubmit = async (e) => {
      e.preventDefault();
      const v = formulaire(f);
      const d = new Date(v.debut);
      const contact = contacts.find((c) => String(c.id) === v.contact_id);
      const body = {
        contact_id: v.contact_id || null, type: v.type, statut: v.statut, lieu: v.lieu, notes: v.notes,
        titre: v.titre || `${LIB_TYPE_RDV[v.type]}${contact ? ` – ${nom(contact)}` : ''}`,
        debut: d.toISOString(), fin: new Date(d.getTime() + Number(v.duree) * 60000).toISOString(),
      };
      try {
        const res = await api(id ? `/rendezvous/${id}` : '/rendezvous', { method: id ? 'PUT' : 'POST', body });
        notifier(res.avertissement || 'Rendez-vous enregistré ✓');
        fermer();
        afficher();
      } catch (err) { notifier(err.message); }
    };
    el.querySelector('#btn-suppr')?.addEventListener('click', async () => {
      if (!confirm('Supprimer ce rendez-vous ?')) return;
      await api(`/rendezvous/${id}`, { method: 'DELETE' });
      fermer();
      afficher();
    });
  });
}

// ---------- Vue : Modèles ----------
async function vueModeles() {
  const modeles = await api('/modeles');
  $vue.innerHTML = `
    <div class="titre-page"><h2>Mes messages types</h2></div>
    <p class="aide" style="margin:-6px 0 14px">Variables disponibles : <code>{prenom}</code> <code>{nom}</code> <code>{date}</code> <code>{heure}</code> <code>{lieu}</code> <code>{type}</code> <code>{conseiller}</code> <code>{telephone_conseiller}</code></p>
    ${modeles.map((m) => `
      <form class="carte" data-cle="${m.cle}">
        <strong>${esc(m.titre)}</strong>
        <textarea name="contenu" style="margin-top:8px">${esc(m.contenu)}</textarea>
        <div class="actions"><button class="btn-principal btn-petit">Enregistrer</button></div>
      </form>`).join('')}`;
  $vue.querySelectorAll('form[data-cle]').forEach((f) => {
    f.onsubmit = async (e) => {
      e.preventDefault();
      await api(`/modeles/${f.dataset.cle}`, { method: 'PUT', body: formulaire(f) });
      notifier('Modèle enregistré ✓');
    };
  });
}

// ---------- Vue : Réglages ----------
async function vueReglages() {
  const r = await api('/reglages');
  const g = r.integrations.google;
  const etat = (ok, txt) => `<span class="badge ${ok ? 'vert' : 'orange'}">${ok ? 'Connecté' : txt}</span>`;
  $vue.innerHTML = `
    <div class="titre-page"><h2>Réglages</h2></div>

    <section><h3>Mes outils</h3>
      <div class="carte integration">
        <div class="grandit"><strong>Gmail & Google Agenda</strong>
          <div class="aide">${g.connecte ? `Connecté avec ${esc(g.email)}. Vos RDV sont ajoutés à votre agenda, les emails partent depuis votre Gmail.` : g.configure ? 'Ajoute vos RDV à votre agenda et envoie les emails depuis votre Gmail.' : 'À configurer : voir le guide (README, étape Google).'}</div></div>
        ${g.connecte ? '<button id="btn-google-off" class="btn-petit">Déconnecter</button>' : g.configure ? '<a class="btn btn-principal btn-petit" href="/auth/google">Connecter</a>' : etat(false, 'À configurer')}
      </div>
      <div class="carte integration">
        <div class="grandit"><strong>WhatsApp</strong>
          <div class="aide">${r.integrations.whatsapp ? 'Envoi automatique activé.' : 'Envoi en un clic depuis votre WhatsApp (le message est pré-rédigé). Pour l\'envoi 100 % automatique : voir le guide.'}</div></div>
        ${etat(r.integrations.whatsapp, 'En un clic')}
      </div>
      <div class="carte integration">
        <div class="grandit"><strong>SMS</strong>
          <div class="aide">${r.integrations.sms ? 'Envoi automatique activé.' : 'Envoi en un clic depuis votre téléphone. Pour l\'envoi 100 % automatique : voir le guide.'}</div></div>
        ${etat(r.integrations.sms, 'En un clic')}
      </div>
    </section>

    <section><h3>Mes préférences</h3>
      <form class="carte" id="f">
        <div class="grille">
          <label>Signature des messages<input name="conseiller_nom" value="${esc(r.conseiller_nom)}"></label>
          <label>Mon téléphone<input name="conseiller_telephone" value="${esc(r.conseiller_telephone)}"></label>
          <label>Canal préféré<select name="canal_defaut">${Object.entries(LIB_CANAL).map(([k, v]) => `<option value="${k}" ${r.canal_defaut === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label>Envoi des messages automatiques<select name="mode_envoi">
            <option value="validation" ${r.mode_envoi === 'validation' ? 'selected' : ''}>Je valide chaque message</option>
            <option value="auto" ${r.mode_envoi === 'auto' ? 'selected' : ''}>Envoi automatique</option></select></label>
          <label>Confirmation de RDV envoyée<select name="confirmation_heures_avant">${[12, 24, 48].map((h) => `<option value="${h}" ${Number(r.confirmation_heures_avant) === h ? 'selected' : ''}>${h} h avant</option>`).join('')}</select></label>
          <label>Rappel le jour J<select name="rappel_heures_avant">${[1, 2, 3, 4].map((h) => `<option value="${h}" ${Number(r.rappel_heures_avant) === h ? 'selected' : ''}>${h} h avant</option>`).join('')}</select></label>
          <label>Relancer un client sans nouvelles après<select name="delai_relance_jours">${[7, 10, 14, 21, 30].map((j) => `<option value="${j}" ${Number(r.delai_relance_jours) === j ? 'selected' : ''}>${j} jours</option>`).join('')}</select></label>
        </div>
        <div class="actions"><button class="btn-principal">Enregistrer</button></div>
      </form>
    </section>`;
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    await api('/reglages', { method: 'PUT', body: formulaire(e.target) });
    notifier('Réglages enregistrés ✓');
  };
  document.getElementById('btn-google-off')?.addEventListener('click', async () => {
    await fetch('/auth/google/deconnexion', { method: 'POST' });
    afficher();
  });
}

afficher();
// Rafraîchit l'écran « Aujourd'hui » toutes les 5 minutes.
setInterval(() => { if (!$fenetre.open && (location.hash || '#aujourdhui') === '#aujourdhui') afficher(); }, 5 * 60 * 1000);
