'use strict';
/* =========================================================
   Copilote : assistant IA (Claude) qui agit sur vos dossiers
   ========================================================= */
const Copilot = (() => {
  let messages = [];          // historique envoyé à l'API
  let transcript = [];        // ce qui est affiché { role, html }
  let chatFiles = {};         // fichiers joints dans le chat : ref -> fileId
  let busy = false;

  const SYSTEM = `Tu es le copilote d'une conseillère immobilière indépendante en France (réseau de mandataires). Tu l'aides à gérer toute son activité : mandats, vendeurs, co-vendeurs, héritiers, acquéreurs, candidats locataires, documents, visites, offres, compromis, notaires, relances et communication.

Règles de travail :
- Réponds en français, de façon concise, concrète et chaleureuse. Utilise des listes courtes.
- Appuie-toi sur les données de l'application via les outils (ne devine jamais un nom, un prix, une date ou un numéro de mandat). Si une information manque, dis-le et propose de la demander.
- Les identifiants (id) internes ne doivent pas apparaître dans tes réponses : parle des personnes et des biens par leur nom.
- Avant de créer un contact, l'outil vérifie les doublons : s'il en signale, montre-les et demande quoi faire (compléter la fiche existante, fusionner ou créer quand même).
- Tu ne peux jamais envoyer un e-mail ou un message toi-même : tu prépares des brouillons que la conseillère relit et envoie. Dis-le clairement.
- Pour les suppressions et fusions, l'application demande une confirmation à la conseillère.
- Enregistre ce qui est utile : notes, comptes rendus de visite, statut des documents, offres, analyses de documents.
- Analyse de diagnostics : résume DPE (classe énergie/GES, consommation, estimation des coûts, date de validité, interdictions de location pour G/F selon le calendrier loi Climat), amiante, plomb, électricité, gaz (anomalies et niveau de gravité), termites, ERP, assainissement (conformité), Carrez. Signale ce qui doit être dit aux acquéreurs et les points de vigilance.
- Analyse de PV d'AG / copropriété : travaux votés ou envisagés et montants, appels de fonds, procédures, impayés, ravalement, ascenseur, toiture, fonds travaux, ambiance de la copropriété.
- Offres d'achat : vérifie montant, conditions suspensives (prêt, montant, taux, durée), apport, délai de validité, date de signature souhaitée ; prépare acceptation, refus ou contre-proposition sous forme de courrier PDF et/ou de mail.
- Compromis : lis le document, liste les informations déjà connues dans le dossier pour compléter les blancs, et signale les incohérences et les pièces manquantes.
- Dossier notaire : rassemble les pièces reçues, liste ce qui manque, prépare le mail au notaire avec les pièces jointes du dossier.
- Contenus de diffusion (annonces, posts, reels, scripts vidéo, stories) : appuie-toi sur les caractéristiques et les photos du bien ; propose accroche, texte, hashtags, plan de tournage plan par plan. Respecte les mentions obligatoires d'une annonce (prix honoraires inclus, part d'honoraires à la charge de l'acquéreur le cas échéant, DPE/GES, copropriété : nombre de lots et charges annuelles, procédures).
- Recherche acquéreur : utilise les critères des fiches, rapproche avec les biens du portefeuille et, si demandé, cherche sur le web des annonces publiques correspondantes ; enregistre les biens retenus dans la sélection de l'acquéreur.
- Le briefing quotidien priorise : urgences du jour, rendez-vous, échéances (fin de mandat, conditions suspensives, actes), offres en attente, pièces manquantes bloquantes, relances, anniversaires.`;

  /* ---------- Définition des outils ---------- */
  const obj = (properties, required = []) => ({ type: 'object', properties, required });
  const S = { type: 'string' }, N = { type: 'number' }, B = { type: 'boolean' };
  const d = (description, t = S) => ({ ...t, description });
  const TOOLS = [
    { name: 'rechercher', description: 'Recherche plein texte dans contacts, dossiers (biens), rendez-vous, tâches, offres. Point de départ pour retrouver une personne ou un bien.', input_schema: obj({ texte: S }, ['texte']) },
    { name: 'lister_dossiers', description: 'Liste les dossiers (biens) avec étape, prix, ville, mandat. Filtre optionnel par étape.', input_schema: obj({ etape: d('Une des étapes : ' + ETAPES.join(', ')) }) },
    { name: 'lire_dossier', description: 'Détail complet d\'un dossier : caractéristiques, parties (vendeurs, co-vendeurs, héritiers, acquéreurs…), documents et leur statut, visites et retours, offres, candidatures, notes, mémoire, historique.', input_schema: obj({ bien_id: S }, ['bien_id']) },
    { name: 'creer_ou_modifier_dossier', description: 'Crée un dossier (sans bien_id) ou modifie un dossier existant. Champs possibles : titre, transaction (Vente/Location), etape, type, adresse, cp, ville, surface, terrain, pieces, chambres, dpe, ges, annee, copropriete (Oui/Non), lots, charges, succession (Oui/Non), estimation, prix, honoraires, mandat, numMandat, debutMandat, finMandat (AAAA-MM-JJ), description, loyer.', input_schema: obj({ bien_id: S, champs: { type: 'object' } }, ['champs']) },
    { name: 'ajouter_partie', description: 'Rattache un contact à un dossier avec un rôle : ' + ROLES.join(', '), input_schema: obj({ bien_id: S, contact_id: S, role: S }, ['bien_id', 'contact_id', 'role']) },
    { name: 'lire_contact', description: 'Fiche complète d\'un contact : coordonnées, critères de recherche, dossiers liés, sélections de biens, visites, notes.', input_schema: obj({ contact_id: S }, ['contact_id']) },
    { name: 'creer_ou_modifier_contact', description: 'Crée ou complète une fiche contact. Champs : civilite, prenom, nom, tel, email, adresse, type (' + CONTACT_TYPES.join('/') + '), source, dateNaissance (AAAA-MM-JJ), budgetMax, villes, typeRecherche, surfaceMin, piecesMin, financement, criteres (texte libre), prochaineRelance (AAAA-MM-JJ), notes. À la création, renvoie les doublons potentiels sans rien créer, sauf si ignorer_doublons=true (uniquement après accord explicite).', input_schema: obj({ contact_id: S, champs: { type: 'object' }, ignorer_doublons: B }, ['champs']) },
    { name: 'fusionner_contacts', description: 'Fusionne deux fiches contact (doublons). La fiche garder_id est conservée et complétée. Demande confirmation à l\'utilisatrice.', input_schema: obj({ garder_id: S, fusionner_id: S }, ['garder_id', 'fusionner_id']) },
    { name: 'supprimer', description: 'Supprime un élément après confirmation de l\'utilisatrice. type : contact, dossier, rdv, tache, offre, selection, candidature, document.', input_schema: obj({ type: S, id: S, bien_id: d('Requis pour supprimer un document') }, ['type', 'id']) },
    { name: 'ajouter_note', description: 'Enregistre une note datée sur un dossier ou un contact. memoire=true ajoute l\'information à la « mémoire du bien » (faits durables : particularités, motivations du vendeur, historique des prix…).', input_schema: obj({ bien_id: S, contact_id: S, texte: S, memoire: B }, ['texte']) },
    { name: 'maj_document', description: 'Met à jour le statut d\'une pièce du dossier (' + DOC_STATUTS.join(', ') + ') ou ajoute une pièce attendue (donner nom et categorie sans document_id).', input_schema: obj({ bien_id: S, document_id: S, nom: S, categorie: S, statut: S, commentaire: S }, ['bien_id']) },
    { name: 'lire_document', description: 'Ouvre un document du dossier (PDF ou image) pour le lire : diagnostics, PV d\'AG, compromis, offre, titre de propriété…', input_schema: obj({ bien_id: S, document_id: S }, ['bien_id', 'document_id']) },
    { name: 'enregistrer_analyse_document', description: 'Enregistre la synthèse d\'analyse d\'un document dans le dossier (visible par l\'utilisatrice).', input_schema: obj({ bien_id: S, document_id: S, analyse: S }, ['bien_id', 'document_id', 'analyse']) },
    { name: 'voir_photos', description: 'Affiche les photos d\'un bien (pour rédiger une annonce, un post, un script de reel…).', input_schema: obj({ bien_id: S, max: N }, ['bien_id']) },
    { name: 'enregistrer_offre', description: 'Crée ou met à jour une offre d\'achat. statut : ' + OFFRE_STATUTS.join(', ') + '. Passer une offre à Acceptée fait avancer le dossier à « Offre acceptée ».', input_schema: obj({ offre_id: S, bien_id: S, acquereur_id: S, montant: N, contre_montant: N, statut: S, date_offre: S, date_validite: S, conditions: S, financement: S }, []) },
    { name: 'creer_rdv', description: 'Crée un rendez-vous dans l\'application et, si demandé et connecté, dans Google Agenda.', input_schema: obj({ type: d(RDV_TYPES.join(', ')), date: d('AAAA-MM-JJTHH:MM (heure locale)'), duree_min: N, contact_id: S, bien_id: S, lieu: S, notes: S, ajouter_google_agenda: B }, ['type', 'date']) },
    { name: 'maj_rdv', description: 'Enregistre le compte rendu d\'un rendez-vous / retour de visite (avis du visiteur, note d\'intérêt 1 à 5, points positifs/négatifs, prix ressenti).', input_schema: obj({ rdv_id: S, compte_rendu: S, interet: N, bon_signe: B }, ['rdv_id']) },
    { name: 'creer_tache', description: 'Crée une tâche / relance.', input_schema: obj({ titre: S, echeance: d('AAAA-MM-JJ'), priorite: d('Haute, Normale ou Basse'), contact_id: S, bien_id: S }, ['titre']) },
    { name: 'briefing', description: 'Données pour le briefing du jour : rendez-vous, tâches en retard et du jour, mandats qui expirent, conditions suspensives, actes, offres en attente, pièces manquantes, relances dues, anniversaires, candidatures à traiter.', input_schema: obj({}) },
    { name: 'clients_a_relancer', description: 'Contacts sans interaction depuis N jours ou dont la date de relance est passée, acquéreurs actifs sans proposition récente.', input_schema: obj({ jours: N }) },
    { name: 'preparer_email', description: 'Prépare un e-mail (jamais envoyé automatiquement). Si Gmail est connecté et creer_brouillon_gmail=true, crée un brouillon Gmail avec les pièces jointes du dossier ; sinon affiche le brouillon avec des boutons.', input_schema: obj({ a: S, cc: S, objet: S, corps: S, pieces_jointes: { type: 'array', items: obj({ bien_id: S, document_id: S }, ['bien_id', 'document_id']) }, creer_brouillon_gmail: B }, ['objet', 'corps']) },
    { name: 'preparer_message', description: 'Prépare un message WhatsApp ou SMS (confirmation de visite, relance, demande de pièces…) avec un bouton d\'envoi en un clic.', input_schema: obj({ contact_id: S, tel: S, texte: S, canal: d('whatsapp ou sms') }, ['texte']) },
    { name: 'generer_bon_de_visite', description: 'Génère le bon de visite PDF pré-rempli d\'un rendez-vous et le range dans le dossier du bien.', input_schema: obj({ rdv_id: S }, ['rdv_id']) },
    { name: 'generer_document_pdf', description: 'Crée un document PDF (courrier d\'acceptation/refus/contre-proposition, bilan de commercialisation, avis de valeur, récapitulatif notaire…) et le range dans le dossier. Le contenu accepte des titres "## ".', input_schema: obj({ bien_id: S, titre: S, contenu: S, categorie: S, signatures: { type: 'array', items: S } }, ['bien_id', 'titre', 'contenu']) },
    { name: 'gerer_selection', description: 'Gère la sélection de biens d\'un acquéreur : ajouter un bien du portefeuille (bien_id) ou une annonce externe (externe_titre, externe_url, externe_prix), changer le statut (' + SELECTION_STATUTS.join(', ') + '), date de relance.', input_schema: obj({ selection_id: S, contact_id: S, bien_id: S, externe_titre: S, externe_url: S, externe_prix: N, statut: S, relance: S, commentaire: S }) },
    { name: 'gerer_candidature', description: 'Crée ou met à jour une candidature locative. statut : ' + CANDIDATURE_STATUTS.join(', ') + '. pieces_recues : liste parmi ' + PIECES_CANDIDAT.join(', ') + '.', input_schema: obj({ candidature_id: S, bien_id: S, contact_id: S, statut: S, revenus: N, garant: S, pieces_recues: { type: 'array', items: S }, notes: S }) },
    { name: 'gmail_rechercher', description: 'Recherche des e-mails dans Gmail (syntaxe Gmail : from:, to:, subject:, has:attachment, newer_than:7d…).', input_schema: obj({ requete: S }, ['requete']) },
    { name: 'gmail_lire_fil', description: 'Lit un fil de discussion Gmail complet avec la liste des pièces jointes.', input_schema: obj({ thread_id: S }, ['thread_id']) },
    { name: 'gmail_classer_piece_jointe', description: 'Télécharge une pièce jointe Gmail et la range dans le dossier d\'un bien (document_nom = nom de la pièce attendue dans la checklist si elle correspond, ex : "DPE").', input_schema: obj({ message_id: S, attachment_id: S, nom_fichier: S, bien_id: S, categorie: S, document_nom: S }, ['message_id', 'attachment_id', 'nom_fichier', 'bien_id']) },
    { name: 'agenda_lister', description: 'Liste les événements Google Agenda entre deux dates.', input_schema: obj({ debut: S, fin: S }, ['debut', 'fin']) },
    { name: 'drive_rechercher', description: 'Recherche des fichiers dans Google Drive par nom.', input_schema: obj({ texte: S }, ['texte']) },
    { name: 'drive_importer', description: 'Importe un fichier Google Drive dans le dossier d\'un bien.', input_schema: obj({ file_id: S, bien_id: S, categorie: S, document_nom: S }, ['file_id', 'bien_id']) },
    { name: 'classer_fichier_joint', description: 'Range dans un dossier un fichier que l\'utilisatrice a joint dans la conversation (ref fournie dans son message).', input_schema: obj({ ref: S, bien_id: S, categorie: S, document_nom: S }, ['ref', 'bien_id']) },
  ];
  const SERVER_TOOLS = [
    { type: 'web_search_20260209', name: 'web_search', max_uses: 5, user_location: { type: 'approximate', country: 'FR' } },
    { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 5 },
  ];

  /* ---------- Représentations compactes pour le modèle ---------- */
  const cContact = (c) => c && ({ id: c.id, nom: contactName(c.id), type: c.type, tel: c.tel, email: c.email });
  const cBien = (b) => b && ({ id: b.id, titre: bienName(b.id), etape: b.etape, transaction: b.transaction, ville: b.ville, prix: b.prix, mandat: b.mandat, numMandat: b.numMandat, finMandat: b.finMandat });
  const visitesDe = (bienId) => db.rdv.filter(r => r.bienId === bienId).map(r => ({ id: r.id, type: r.type, date: r.date, visiteur: contactName(r.contactId), compteRendu: r.compteRendu, interet: r.interet, bonSigne: !!r.bonSigne }));

  /* ---------- Cartes affichées dans le chat ---------- */
  let cards = [];
  const card = (html) => cards.push(html);

  async function confirmAction(text) { return window.confirm(text); }

  /* ---------- Exécution des outils ---------- */
  const handlers = {
    rechercher: ({ texte }) => {
      const q = normTxt(texte); const m = (o) => normTxt(JSON.stringify(o)).includes(q);
      return {
        contacts: db.contacts.filter(m).slice(0, 15).map(cContact),
        dossiers: db.biens.filter(b => m({ ...b, documents: undefined, photos: undefined })).slice(0, 15).map(cBien),
        rdv: db.rdv.filter(m).slice(0, 10).map(r => ({ id: r.id, type: r.type, date: r.date, contact: contactName(r.contactId), bien: bienName(r.bienId) })),
        taches: db.taches.filter(m).slice(0, 10),
        offres: db.offres.filter(m).slice(0, 10),
      };
    },
    lister_dossiers: ({ etape }) => db.biens.filter(b => !etape || b.etape === etape).map(b => ({ ...cBien(b), vendeurs: b.parties.filter(p => /vendeur|Héritier/i.test(p.role)).map(p => contactName(p.contactId)), piecesManquantes: b.documents.filter(x => x.statut === 'Manquant' || x.statut === 'Demandé').length })),
    lire_dossier: ({ bien_id }) => {
      const b = getBien(bien_id); if (!b) throw new Error('Dossier introuvable');
      const { photos, documents, parties, ...rest } = b;
      return {
        ...rest, nbPhotos: photos.length,
        parties: parties.map(p => ({ role: p.role, ...cContact(getContact(p.contactId)) })),
        documents: documents.map(x => ({ id: x.id, categorie: x.categorie, nom: x.nom, statut: x.statut, fichier: x.fileId ? (x.fichier || 'oui') : null, analyse: x.analyse, commentaire: x.commentaire })),
        visites: visitesDe(b.id),
        offres: db.offres.filter(o => o.bienId === b.id).map(o => ({ ...o, acquereur: contactName(o.acquereurId) })),
        candidatures: db.candidatures.filter(c => c.bienId === b.id).map(c => ({ ...c, candidat: contactName(c.contactId) })),
        vente: db.ventes.filter(v => v.bienId === b.id),
        acquereursCorrespondants: matches(b).map(cContact),
        historique: (b.historique || []).slice(0, 30),
      };
    },
    creer_ou_modifier_dossier: ({ bien_id, champs }) => {
      let b = bien_id && getBien(bien_id);
      if (bien_id && !b) throw new Error('Dossier introuvable');
      if (!b) { b = migrate({ biens: [{ id: uid(), cree: nowISO(), etape: 'Estimation', transaction: 'Vente', ...champs }], contacts: [] }).biens[0]; ensureChecklist(b); db.biens.push(b); addHistorique(b, 'Dossier créé par le copilote'); }
      else { Object.assign(b, champs, { maj: nowISO() }); addHistorique(b, 'Dossier modifié : ' + Object.keys(champs).join(', ')); }
      save(); return cBien(b);
    },
    ajouter_partie: ({ bien_id, contact_id, role }) => {
      const b = getBien(bien_id); if (!b || !getContact(contact_id)) throw new Error('Dossier ou contact introuvable');
      if (!b.parties.some(p => p.contactId === contact_id && p.role === role)) b.parties.push({ contactId: contact_id, role });
      addHistorique(b, `${contactName(contact_id)} ajouté(e) comme ${role}`); save(); return { ok: true };
    },
    lire_contact: ({ contact_id }) => {
      const c = getContact(contact_id); if (!c) throw new Error('Contact introuvable');
      return {
        ...c,
        dossiers: db.biens.filter(b => b.parties.some(p => p.contactId === c.id)).map(b => ({ ...cBien(b), role: b.parties.find(p => p.contactId === c.id).role })),
        selections: db.selections.filter(s => s.contactId === c.id).map(s => ({ ...s, bien: s.bienId ? bienName(s.bienId) : s.externeTitre })),
        visites: db.rdv.filter(r => r.contactId === c.id).map(r => ({ id: r.id, type: r.type, date: r.date, bien: bienName(r.bienId), compteRendu: r.compteRendu })),
        offres: db.offres.filter(o => o.acquereurId === c.id), candidatures: db.candidatures.filter(x => x.contactId === c.id),
        biensCorrespondants: c.type === 'Acquéreur' ? db.biens.filter(b => ETAPES_ACTIVES.includes(b.etape) && matches(b).some(x => x.id === c.id)).map(cBien) : undefined,
      };
    },
    creer_ou_modifier_contact: ({ contact_id, champs, ignorer_doublons }) => {
      if (contact_id) {
        const c = getContact(contact_id); if (!c) throw new Error('Contact introuvable');
        Object.assign(c, champs, { maj: nowISO() }); save(); return { ok: true, contact: cContact(c) };
      }
      const dups = findDuplicates(champs);
      if (dups.length && !ignorer_doublons) return { cree: false, doublonsPotentiels: dups.map(cContact), conseil: 'Demander à l\'utilisatrice : compléter une fiche existante, fusionner, ou créer quand même.' };
      const c = { id: uid(), cree: nowISO(), type: 'Prospect', notesListe: [], ...champs };
      db.contacts.push(c); save(); return { cree: true, contact: cContact(c) };
    },
    fusionner_contacts: async ({ garder_id, fusionner_id }) => {
      const a = getContact(garder_id), b = getContact(fusionner_id); if (!a || !b) throw new Error('Contact introuvable');
      if (!await confirmAction(`Fusionner « ${contactName(fusionner_id)} » dans « ${contactName(garder_id)} » ?\nToutes les références (dossiers, visites, offres…) seront rattachées à la fiche conservée.`)) return { annule: true, raison: 'Refusé par l\'utilisatrice' };
      return { ok: true, contact: cContact(mergeContacts(garder_id, fusionner_id)) };
    },
    supprimer: async ({ type, id, bien_id }) => {
      const map = { contact: 'contacts', dossier: 'biens', rdv: 'rdv', tache: 'taches', offre: 'offres', selection: 'selections', candidature: 'candidatures' };
      if (type === 'document') {
        const b = getBien(bien_id); const doc = b?.documents.find(x => x.id === id); if (!doc) throw new Error('Document introuvable');
        if (!await confirmAction(`Supprimer le document « ${doc.nom} » du dossier ${bienName(b.id)} ?`)) return { annule: true };
        if (doc.fileId) await Files.del(doc.fileId); b.documents = b.documents.filter(x => x !== doc); save(); return { ok: true };
      }
      const coll = map[type]; if (!coll) throw new Error('Type inconnu');
      const item = db[coll].find(x => x.id === id); if (!item) throw new Error('Élément introuvable');
      const label = type === 'contact' ? contactName(id) : type === 'dossier' ? bienName(id) : (item.titre || item.type || type);
      if (!await confirmAction(`Supprimer définitivement : ${type} « ${label} » ?`)) return { annule: true };
      db[coll] = db[coll].filter(x => x.id !== id); save(); return { ok: true };
    },
    ajouter_note: ({ bien_id, contact_id, texte, memoire }) => {
      const note = { id: uid(), date: nowISO(), texte };
      if (bien_id) { const b = getBien(bien_id); if (!b) throw new Error('Dossier introuvable'); if (memoire) b.memoire = [b.memoire, texte].filter(Boolean).join('\n'); else b.notes.unshift(note); }
      else if (contact_id) { const c = getContact(contact_id); if (!c) throw new Error('Contact introuvable'); (c.notesListe ||= []).unshift(note); c.derniereInteraction = todayISO(); }
      else throw new Error('Préciser bien_id ou contact_id');
      save(); return { ok: true };
    },
    maj_document: ({ bien_id, document_id, nom, categorie, statut, commentaire }) => {
      const b = getBien(bien_id); if (!b) throw new Error('Dossier introuvable');
      let doc = document_id ? b.documents.find(x => x.id === document_id) : b.documents.find(x => x.nom === nom);
      if (!doc) { doc = { id: uid(), nom: nom || 'Document', categorie: categorie || 'Autre', statut: 'Manquant' }; b.documents.push(doc); }
      if (statut) doc.statut = statut; if (commentaire) doc.commentaire = commentaire;
      addHistorique(b, `Pièce « ${doc.nom} » : ${doc.statut}`); save(); return { ok: true, document: { id: doc.id, nom: doc.nom, statut: doc.statut } };
    },
    lire_document: async ({ bien_id, document_id }) => {
      const doc = getBien(bien_id)?.documents.find(x => x.id === document_id);
      if (!doc?.fileId) throw new Error('Aucun fichier pour ce document');
      return fileToBlocks(doc.fileId, `Document « ${doc.nom} » (${doc.fichier || ''})`);
    },
    enregistrer_analyse_document: ({ bien_id, document_id, analyse }) => {
      const doc = getBien(bien_id)?.documents.find(x => x.id === document_id); if (!doc) throw new Error('Document introuvable');
      doc.analyse = analyse; doc.dateAnalyse = nowISO(); save(); return { ok: true };
    },
    voir_photos: async ({ bien_id, max = 6 }) => {
      const b = getBien(bien_id); if (!b) throw new Error('Dossier introuvable');
      if (!b.photos.length) return 'Aucune photo dans ce dossier.';
      const blocks = [{ type: 'text', text: `${Math.min(max, b.photos.length)} photo(s) sur ${b.photos.length} :` }];
      for (const id of b.photos.slice(0, Math.min(max, 10))) { const f = await Files.get(id); if (f) blocks.push({ type: 'image', source: { type: 'base64', media_type: f.type || 'image/jpeg', data: await blobToBase64(f.blob) } }); }
      return blocks;
    },
    enregistrer_offre: ({ offre_id, bien_id, acquereur_id, montant, contre_montant, statut, date_offre, date_validite, conditions, financement }) => {
      let o = offre_id && db.offres.find(x => x.id === offre_id);
      const champs = Object.fromEntries(Object.entries({ bienId: bien_id, acquereurId: acquereur_id, montant, contreMontant: contre_montant, statut, dateOffre: date_offre, dateValidite: date_validite, conditions, financement }).filter(([, v]) => v !== undefined));
      if (!o) { o = { id: uid(), statut: 'Reçue', dateOffre: todayISO(), ...champs }; db.offres.push(o); } else Object.assign(o, champs);
      const b = getBien(o.bienId);
      if (b) {
        addHistorique(b, `Offre ${contactName(o.acquereurId)} : ${Number(o.montant || 0).toLocaleString('fr-FR')} € – ${o.statut}`);
        if (o.statut === 'Acceptée' && ['Estimation', 'Mandat signé'].includes(b.etape)) { b.etape = 'Offre acceptée'; addHistorique(b, 'Étape : Offre acceptée'); }
        if (o.acquereurId && !b.parties.some(p => p.contactId === o.acquereurId)) b.parties.push({ contactId: o.acquereurId, role: 'Acquéreur' });
      }
      save(); return { ok: true, offre_id: o.id };
    },
    creer_rdv: async ({ type, date, duree_min, contact_id, bien_id, lieu, notes, ajouter_google_agenda }) => {
      const b = getBien(bien_id);
      const r = { id: uid(), cree: nowISO(), type, date: date.slice(0, 16), duree: duree_min || 60, contactId: contact_id || '', bienId: bien_id || '', lieu: lieu || (b ? [b.adresse, b.cp, b.ville].filter(Boolean).join(' ') : ''), notes };
      db.rdv.push(r); save();
      let google = 'non demandé';
      if (ajouter_google_agenda) {
        if (!Google.isConnected()) google = 'Google non connecté';
        else { const ev = await Google.createEvent({ titre: `${type}${contact_id ? ' – ' + contactName(contact_id) : ''}${b ? ' – ' + bienName(b.id) : ''}`, debut: r.date, dureeMin: r.duree, lieu: r.lieu, description: notes || '' }); r.googleId = ev.id; save(); google = 'ajouté'; }
      }
      const c = getContact(contact_id);
      if (c?.tel) card(`<div class="cp-card"><strong>📅 ${esc(type)} – ${esc(fmtDateTime(r.date))}</strong><div class="cp-actions"><a class="btn small" target="_blank" href="${waLink(c.tel, confirmationVisiteTexte(r))}">WhatsApp de confirmation</a><a class="btn small" href="${smsLink(c.tel, confirmationVisiteTexte(r))}">SMS</a></div></div>`);
      return { ok: true, rdv_id: r.id, googleAgenda: google };
    },
    maj_rdv: ({ rdv_id, compte_rendu, interet, bon_signe }) => {
      const r = db.rdv.find(x => x.id === rdv_id); if (!r) throw new Error('Rendez-vous introuvable');
      if (compte_rendu !== undefined) r.compteRendu = compte_rendu; if (interet !== undefined) r.interet = interet; if (bon_signe !== undefined) r.bonSigne = bon_signe;
      const c = getContact(r.contactId); if (c) c.derniereInteraction = todayISO();
      save(); return { ok: true };
    },
    creer_tache: ({ titre, echeance, priorite, contact_id, bien_id }) => {
      const t = { id: uid(), cree: nowISO(), titre, echeance: echeance || '', priorite: priorite || 'Normale', contactId: contact_id || '', bienId: bien_id || '', fait: false };
      db.taches.push(t); save(); return { ok: true, tache_id: t.id };
    },
    briefing: () => briefingData(),
    clients_a_relancer: ({ jours = 21 }) => relances(jours),
    preparer_email: async ({ a, cc, objet, corps, pieces_jointes = [], creer_brouillon_gmail }) => {
      const atts = [];
      for (const pj of pieces_jointes) {
        const doc = getBien(pj.bien_id)?.documents.find(x => x.id === pj.document_id);
        if (doc?.fileId) { const f = await Files.get(doc.fileId); if (f) atts.push({ blob: f.blob, name: f.name || doc.nom, type: f.type, label: doc.nom }); }
      }
      const corpsSigne = corps + (db.settings.signature && !corps.includes(db.settings.signature) ? '\n\n' + db.settings.signature : '');
      let gmail = null;
      if (creer_brouillon_gmail && Google.isConnected()) {
        const dr = await Google.createDraft({ to: a || '', cc, subject: objet, body: corpsSigne, attachments: atts });
        gmail = dr.id;
      }
      const key = uid(); pendingEmails[key] = { a, cc, objet, corps: corpsSigne, atts, draftId: gmail };
      card(`<div class="cp-card"><div class="muted">✉️ Brouillon d'e-mail${gmail ? ' <span class="badge ok">enregistré dans Gmail</span>' : ''}</div>
        <div><strong>À :</strong> ${esc(a || '—')}${cc ? ` · <strong>Cc :</strong> ${esc(cc)}` : ''}</div><div><strong>Objet :</strong> ${esc(objet)}</div>
        <pre class="cp-pre">${esc(corpsSigne)}</pre>${atts.length ? `<div class="muted">📎 ${atts.map(x => esc(x.label)).join(', ')}</div>` : ''}
        <div class="cp-actions">${gmail ? `<button class="btn small primary" data-send-draft="${key}">Envoyer maintenant</button><a class="btn small" target="_blank" href="https://mail.google.com/mail/#drafts">Ouvrir dans Gmail</a>` :
          `<button class="btn small primary" data-gmail-draft="${key}">Créer le brouillon Gmail</button>`}
        <a class="btn small" href="${mailtoLink(a, objet, corpsSigne)}">Ouvrir dans ma messagerie</a><button class="btn small" data-copy="${key}">Copier</button></div></div>`);
      return { ok: true, brouillonGmail: gmail ? 'créé (non envoyé)' : (creer_brouillon_gmail ? 'Gmail non connecté : brouillon affiché' : 'affiché'), piecesJointes: atts.map(x => x.label) };
    },
    preparer_message: ({ contact_id, tel, texte, canal = 'whatsapp' }) => {
      const c = getContact(contact_id); const num = tel || c?.tel;
      if (!num) throw new Error('Aucun numéro de téléphone');
      const link = canal === 'sms' ? smsLink(num, texte) : waLink(num, texte);
      card(`<div class="cp-card"><div class="muted">${canal === 'sms' ? '💬 SMS' : '🟢 WhatsApp'} pour ${esc(c ? contactName(c.id) : num)}</div><pre class="cp-pre">${esc(texte)}</pre>
        <div class="cp-actions"><a class="btn small primary" target="_blank" href="${link}">Ouvrir ${canal === 'sms' ? 'les SMS' : 'WhatsApp'} et envoyer</a></div></div>`);
      if (c) { c.derniereInteraction = todayISO(); save(); }
      return { ok: true, info: 'Bouton d\'envoi affiché ; l\'utilisatrice valide l\'envoi.' };
    },
    generer_bon_de_visite: async ({ rdv_id }) => {
      const r = db.rdv.find(x => x.id === rdv_id); if (!r) throw new Error('Rendez-vous introuvable'); if (!r.bienId) throw new Error('Ce rendez-vous n\'est lié à aucun bien');
      const nom = `Bon de visite - ${contactName(r.contactId) || 'visiteur'} - ${r.date.slice(0, 10)}.pdf`;
      const doc = await attachToBien(r.bienId, bonDeVisitePdf(r), nom, 'Visites');
      r.bonDocId = doc.id; save();
      card(fileCard(doc));
      return { ok: true, bien_id: r.bienId, document_id: doc.id };
    },
    generer_document_pdf: async ({ bien_id, titre, contenu, categorie, signatures }) => {
      const doc = await attachToBien(bien_id, textPdf(titre, contenu, { signatures }), `${titre}.pdf`, categorie || 'Autre');
      card(fileCard(doc)); return { ok: true, document_id: doc.id };
    },
    gerer_selection: ({ selection_id, contact_id, bien_id, externe_titre, externe_url, externe_prix, statut, relance, commentaire }) => {
      let s = selection_id && db.selections.find(x => x.id === selection_id);
      const champs = Object.fromEntries(Object.entries({ contactId: contact_id, bienId: bien_id, externeTitre: externe_titre, externeUrl: externe_url, externePrix: externe_prix, statut, relance, commentaire }).filter(([, v]) => v !== undefined));
      if (!s) { if (!contact_id) throw new Error('contact_id requis'); s = { id: uid(), date: todayISO(), statut: 'À proposer', ...champs }; db.selections.push(s); } else Object.assign(s, champs);
      save(); return { ok: true, selection_id: s.id };
    },
    gerer_candidature: ({ candidature_id, bien_id, contact_id, statut, revenus, garant, pieces_recues, notes }) => {
      let c = candidature_id && db.candidatures.find(x => x.id === candidature_id);
      if (!c) { c = { id: uid(), date: todayISO(), statut: 'Nouvelle', pieces: {}, bienId: bien_id, contactId: contact_id }; db.candidatures.push(c); }
      Object.assign(c, Object.fromEntries(Object.entries({ bienId: bien_id, contactId: contact_id, statut, revenus, garant, notes }).filter(([, v]) => v !== undefined)));
      (pieces_recues || []).forEach(p => c.pieces[p] = true);
      save(); return { ok: true, candidature_id: c.id, piecesManquantes: PIECES_CANDIDAT.filter(p => !c.pieces[p]) };
    },
    gmail_rechercher: async ({ requete }) => { needGoogle(); return Google.searchMessages(requete); },
    gmail_lire_fil: async ({ thread_id }) => { needGoogle(); return Google.readThread(thread_id); },
    gmail_classer_piece_jointe: async ({ message_id, attachment_id, nom_fichier, bien_id, categorie, document_nom }) => {
      needGoogle();
      const bytes = await Google.getAttachment(message_id, attachment_id);
      const blob = new Blob([bytes], { type: mimeFromName(nom_fichier) });
      const doc = await attachToBien(bien_id, blob, nom_fichier, categorie || 'Autre', document_nom);
      card(fileCard(doc)); return { ok: true, document_id: doc.id };
    },
    agenda_lister: async ({ debut, fin }) => { needGoogle(); return Google.listEvents(debut, fin); },
    drive_rechercher: async ({ texte }) => { needGoogle(); return Google.driveSearch(texte); },
    drive_importer: async ({ file_id, bien_id, categorie, document_nom }) => {
      needGoogle(); const f = await Google.driveDownload(file_id);
      const doc = await attachToBien(bien_id, f.blob, f.name, categorie || 'Autre', document_nom);
      card(fileCard(doc)); return { ok: true, document_id: doc.id };
    },
    classer_fichier_joint: async ({ ref, bien_id, categorie, document_nom }) => {
      const fid = chatFiles[ref]; if (!fid) throw new Error('Fichier joint introuvable');
      const f = await Files.get(fid);
      const doc = await attachToBien(bien_id, f.blob, f.name, categorie || 'Autre', document_nom);
      card(fileCard(doc)); return { ok: true, document_id: doc.id };
    },
  };
  const pendingEmails = {};
  function needGoogle() { if (!Google.isConnected()) throw new Error('Google n\'est pas connecté. L\'utilisatrice doit cliquer sur « Connecter Google » dans Paramètres.'); }
  const mimeFromName = (n) => ({ pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', txt: 'text/plain', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })[String(n).split('.').pop().toLowerCase()] || 'application/octet-stream';
  const fileCard = (doc) => `<div class="cp-card">📄 <strong>${esc(doc.nom)}</strong> <span class="muted">rangé dans le dossier</span><div class="cp-actions"><button class="btn small" data-open-file="${doc.fileId}">Ouvrir</button><button class="btn small" data-share-file="${doc.fileId}">Partager</button></div></div>`;

  async function fileToBlocks(fileId, label) {
    const f = await Files.get(fileId); if (!f) throw new Error('Fichier introuvable');
    const type = f.type || mimeFromName(f.name);
    const data = await blobToBase64(f.blob);
    if (type === 'application/pdf') return [{ type: 'text', text: label }, { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data }, title: f.name }];
    if (/^image\/(jpeg|png|gif|webp)$/.test(type)) return [{ type: 'text', text: label }, { type: 'image', source: { type: 'base64', media_type: type, data } }];
    if (type.startsWith('text/')) return `${label}\n\n${(await f.blob.text()).slice(0, 100000)}`;
    throw new Error(`Format non lisible par le copilote (${type}). Convertissez-le en PDF.`);
  }

  /* ---------- Boucle d'agent ---------- */
  let client = null, clientKey = '';
  function getClient() {
    const key = db.settings.apiKey;
    if (!key) throw new Error('NO_KEY');
    if (!client || clientKey !== key) { client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true }); clientKey = key; }
    return client;
  }

  function contextBlock() {
    return `Contexte : nous sommes le ${new Date().toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}. Conseillère : ${db.settings.nom || 'non renseigné'} (${db.settings.email || 'e-mail non renseigné'}). Google : ${Google.isConnected() ? 'connecté (Gmail, Agenda, Drive)' : 'non connecté'}.${db.settings.miniSite ? ` Mini-site / annonces : ${db.settings.miniSite}` : ''} Portefeuille : ${db.biens.length} dossiers, ${db.contacts.length} contacts.`;
  }

  async function runTool(block) {
    const h = handlers[block.name];
    try {
      if (!h) throw new Error('Outil inconnu');
      if (typeof block.input !== 'object' || block.input === null) throw new Error('Paramètres invalides');
      let out = await h(block.input);
      if (typeof out !== 'string' && !(Array.isArray(out) && out[0]?.type)) out = JSON.stringify(out ?? { ok: true }).slice(0, 60000);
      return { type: 'tool_result', tool_use_id: block.id, content: out };
    } catch (e) {
      return { type: 'tool_result', tool_use_id: block.id, content: 'Erreur : ' + e.message, is_error: true };
    }
  }

  const TOOL_LABELS = { rechercher: 'Recherche', lire_dossier: 'Lecture du dossier', lire_contact: 'Lecture de la fiche', lire_document: 'Lecture du document', briefing: 'Préparation du briefing', gmail_rechercher: 'Recherche dans Gmail', gmail_lire_fil: 'Lecture du fil', preparer_email: 'Rédaction de l\'e-mail', voir_photos: 'Analyse des photos', web_search: 'Recherche web', web_fetch: 'Lecture de page web' };

  async function send(text, files = []) {
    if (busy) return;
    let api;
    try { api = getClient(); } catch {
      addBubble('assistant', `<p>Pour activer le copilote, ajoutez votre clé API Claude dans <a href="#parametres">Paramètres</a>.</p>`); render(); return;
    }
    busy = true;
    const content = [];
    const refs = [];
    for (const f of files) {
      const blob = f.type.startsWith('image/') ? await resizeImage(f) : f;
      const fid = await Files.put(blob, f.name);
      const ref = 'fichier-' + (Object.keys(chatFiles).length + 1); chatFiles[ref] = fid; refs.push(`${ref} = ${f.name}`);
      try { const blocks = await fileToBlocks(fid, `Fichier joint ${ref} : ${f.name}`); if (Array.isArray(blocks)) content.push(...blocks); else content.push({ type: 'text', text: blocks }); }
      catch (e) { content.push({ type: 'text', text: `Fichier joint ${ref} : ${f.name} (non lisible : ${e.message})` }); }
    }
    const page = currentPageContext();
    content.push({ type: 'text', text: text + (page ? `\n\n(Page ouverte : ${page})` : '') });
    messages.push({ role: 'user', content });
    addBubble('user', `<p>${esc(text).replace(/\n/g, '<br>')}</p>${refs.length ? `<div class="muted">📎 ${esc(refs.map(r => r.split(' = ')[1]).join(', '))}</div>` : ''}`);
    const status = addBubble('assistant', '<p class="muted cp-typing">Le copilote réfléchit…</p>');
    render();
    cards = [];
    try {
      for (let i = 0; i < 25; i++) {
        const resp = await api.beta.messages.create({
          model: db.settings.model || 'claude-opus-5-5',
          max_tokens: 16000,
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }, { type: 'text', text: contextBlock() }],
          tools: [...TOOLS, ...SERVER_TOOLS],
          messages,
          cache_control: { type: 'ephemeral' },
        });
        messages.push({ role: 'assistant', content: resp.content });
        const textOut = resp.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
        if (resp.stop_reason === 'refusal') { status.html = '<p>Je ne peux pas traiter cette demande. Reformulez-la ou découpez-la.</p>'; break; }
        if (resp.stop_reason === 'pause_turn') { status.html = `<p class="muted cp-typing">Recherche en cours…</p>`; render(); continue; }
        const uses = resp.content.filter(b => b.type === 'tool_use');
        if (!uses.length || resp.stop_reason === 'end_turn') {
          status.html = md(textOut || '(pas de réponse)') + cards.join(''); break;
        }
        if (resp.stop_reason === 'max_tokens') { status.html = md(textOut) + '<p class="muted">Réponse interrompue (trop longue).</p>'; break; }
        status.html = (textOut ? md(textOut) : '') + cards.join('') + `<p class="muted cp-typing">${esc(uses.map(u => TOOL_LABELS[u.name] || u.name.replace(/_/g, ' ')).join(' · '))}…</p>`;
        render();
        const results = await Promise.all(uses.map(runTool));
        messages.push({ role: 'user', content: results });
      }
    } catch (e) {
      console.error(e);
      let msg = e.message;
      if (e instanceof Anthropic.AuthenticationError) msg = 'Clé API invalide. Vérifiez-la dans Paramètres.';
      else if (e instanceof Anthropic.RateLimitError) msg = 'Trop de demandes en même temps, réessayez dans un instant.';
      else if (e instanceof Anthropic.APIConnectionError) msg = 'Connexion impossible au service. Vérifiez votre connexion internet.';
      status.html = (cards.join('')) + `<p class="cp-error">Erreur : ${esc(msg)}</p>`;
      // Retire le dernier tour incomplet pour pouvoir réessayer proprement
      while (messages.length && messages[messages.length - 1].role === 'user' && Array.isArray(messages[messages.length - 1].content) && messages[messages.length - 1].content[0]?.type === 'tool_result') messages.pop();
      if (messages.at(-1)?.role === 'assistant' && messages.at(-1).content.some(b => b.type === 'tool_use')) messages.pop();
      if (messages.at(-1)?.role === 'user') messages.pop();
    }
    busy = false;
    render();
    if (typeof refreshMain === 'function') refreshMain();
  }

  /* ---------- Rendu du panneau ---------- */
  function addBubble(role, html) { const b = { role, html }; transcript.push(b); return b; }
  function md(t) {
    let h = esc(t);
    h = h.replace(/^### (.*)$/gm, '<h4>$1</h4>').replace(/^## (.*)$/gm, '<h4>$1</h4>').replace(/^# (.*)$/gm, '<h4>$1</h4>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|\W)\*(?!\s)(.+?)\*(?=\W|$)/g, '$1<em>$2</em>');
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/^(?:[-•*]) (.*)$/gm, '<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
    h = h.replace(/^\d+\. (.*)$/gm, '<li class="ol">$1</li>');
    return h.split(/\n{2,}/).map(p => /^<(ul|h4|li)/.test(p) ? p : `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  }

  const SUGGESTIONS = [
    'Fais-moi mon briefing du jour',
    'Quels clients dois-je relancer cette semaine ?',
    'Quelles pièces manquent dans mes dossiers en cours ?',
    'Prépare les confirmations WhatsApp de mes visites de demain',
  ];

  function render() {
    const box = document.getElementById('cpMessages'); if (!box) return;
    box.innerHTML = transcript.length ? transcript.map(b => `<div class="cp-msg ${b.role}">${b.html}</div>`).join('')
      : `<div class="cp-welcome"><p><strong>Bonjour ! Je suis votre copilote.</strong></p><p class="muted">Posez-moi vos questions sur vos dossiers, demandez-moi un mail, une analyse de diagnostics, un post Instagram…</p>
        <div class="cp-suggestions">${SUGGESTIONS.map(s => `<button class="btn small" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`;
    box.scrollTop = box.scrollHeight;
    document.getElementById('cpSend').disabled = busy;
  }

  function reset() { messages = []; transcript = []; chatFiles = {}; render(); }

  /* Actions des cartes */
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-gmail-draft],[data-send-draft],[data-copy],[data-open-file],[data-share-file],[data-suggest]'); if (!t) return;
    try {
      if (t.dataset.suggest) { open(t.dataset.suggest); return; }
      if (t.dataset.openFile) return openFile(t.dataset.openFile);
      if (t.dataset.shareFile) return shareFiles([t.dataset.shareFile]);
      const m = pendingEmails[t.dataset.gmailDraft || t.dataset.sendDraft || t.dataset.copy];
      if (!m) return;
      if (t.dataset.copy) { await navigator.clipboard.writeText(`Objet : ${m.objet}\n\n${m.corps}`); t.textContent = 'Copié ✓'; return; }
      if (t.dataset.gmailDraft) {
        if (!Google.isConnected()) await Google.connect(true);
        const dr = await Google.createDraft({ to: m.a || '', cc: m.cc, subject: m.objet, body: m.corps, attachments: m.atts });
        m.draftId = dr.id; t.outerHTML = `<button class="btn small primary" data-send-draft="${t.dataset.gmailDraft}">Envoyer maintenant</button><span class="badge ok">Brouillon Gmail créé</span>`;
      } else if (t.dataset.sendDraft) {
        if (!m.a) return alert('Ajoutez un destinataire dans Gmail avant l\'envoi.');
        if (!confirm(`Envoyer maintenant cet e-mail à ${m.a} ?`)) return;
        await Google.sendDraft(m.draftId); t.outerHTML = '<span class="badge ok">Envoyé ✓</span>';
      }
    } catch (err) { alert(err.message); }
  });

  function open(prefill, autoSend = true) {
    document.body.classList.add('cp-open');
    render();
    const input = document.getElementById('cpInput');
    if (prefill && autoSend) send(prefill);
    else if (prefill) { input.value = prefill; }
    input.focus();
  }

  return { send, open, reset, render, isBusy: () => busy };
})();
