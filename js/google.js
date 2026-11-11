'use strict';
/* =========================================================
   Connexion Google : Gmail, Google Agenda, Google Drive
   (OAuth dans le navigateur via Google Identity Services)
   ========================================================= */
const Google = (() => {
  const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive.readonly',
  ].join(' ');
  let token = null, expires = 0, client = null, pending = null;
  try { const t = JSON.parse(sessionStorage.getItem('g-token') || 'null'); if (t && t.expires > Date.now()) ({ token, expires } = t); } catch { }

  function loadGis() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.onload = res; s.onerror = () => rej(new Error('Impossible de charger Google'));
      document.head.appendChild(s);
    });
  }

  async function connect(interactive = true) {
    const clientId = db.settings.googleClientId;
    if (!clientId) throw new Error('Renseignez d\'abord l\'identifiant client Google dans Paramètres.');
    await loadGis();
    if (!client) {
      client = google.accounts.oauth2.initTokenClient({
        client_id: clientId, scope: SCOPES,
        callback: (r) => {
          if (r.error) { pending?.rej(new Error(r.error_description || r.error)); }
          else {
            token = r.access_token; expires = Date.now() + (r.expires_in - 60) * 1000;
            try { sessionStorage.setItem('g-token', JSON.stringify({ token, expires })); } catch { }
            pending?.res(token);
          }
          pending = null;
        },
      });
    }
    return new Promise((res, rej) => { pending = { res, rej }; client.requestAccessToken({ prompt: interactive ? '' : 'none' }); });
  }
  const isConnected = () => !!token && expires > Date.now();
  function disconnect() {
    if (token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token);
    token = null; expires = 0; sessionStorage.removeItem('g-token');
  }

  async function api(url, opts = {}) {
    if (!isConnected()) await connect(true);
    const r = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + token, ...(opts.headers || {}) } });
    if (r.status === 401) { token = null; throw new Error('Session Google expirée, reconnectez-vous.'); }
    if (!r.ok) throw new Error(`Google ${r.status} : ${(await r.text()).slice(0, 300)}`);
    return r.headers.get('content-type')?.includes('json') ? r.json() : r;
  }

  /* ---------------- Gmail ---------------- */
  const GM = 'https://gmail.googleapis.com/gmail/v1/users/me';
  const b64urlDecode = (s) => { const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))); };
  const b64urlToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const header = (m, n) => m.payload?.headers?.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || '';

  function walkParts(part, out = { text: '', html: '', attachments: [] }) {
    if (!part) return out;
    if (part.filename && part.body?.attachmentId) out.attachments.push({ filename: part.filename, mimeType: part.mimeType, attachmentId: part.body.attachmentId, size: part.body.size });
    else if (part.mimeType === 'text/plain' && part.body?.data) out.text += b64urlDecode(part.body.data);
    else if (part.mimeType === 'text/html' && part.body?.data) out.html += b64urlDecode(part.body.data);
    (part.parts || []).forEach(p => walkParts(p, out));
    return out;
  }
  const htmlToText = (h) => { const d = document.createElement('div'); d.innerHTML = h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ''); return d.textContent.replace(/\n{3,}/g, '\n\n'); };

  async function searchMessages(q, max = 15) {
    const list = await api(`${GM}/messages?maxResults=${max}&q=${encodeURIComponent(q)}`);
    const ids = (list.messages || []);
    return Promise.all(ids.map(async ({ id, threadId }) => {
      const m = await api(`${GM}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`);
      return { id, threadId, de: header(m, 'From'), a: header(m, 'To'), objet: header(m, 'Subject'), date: header(m, 'Date'), extrait: m.snippet };
    }));
  }

  async function readThread(threadId) {
    const t = await api(`${GM}/threads/${threadId}?format=full`);
    return t.messages.map(m => {
      const p = walkParts(m.payload);
      return { id: m.id, de: header(m, 'From'), a: header(m, 'To'), date: header(m, 'Date'), objet: header(m, 'Subject'),
        texte: (p.text || htmlToText(p.html)).slice(0, 8000), piecesJointes: p.attachments };
    });
  }

  async function getAttachment(messageId, attachmentId) {
    const a = await api(`${GM}/messages/${messageId}/attachments/${attachmentId}`);
    return b64urlToBytes(a.data);
  }

  /* Construit un message MIME (avec pièces jointes) */
  async function buildMime({ to, cc, subject, body, attachments = [] }) {
    const enc = (s) => '=?UTF-8?B?' + btoa(unescape(encodeURIComponent(s))) + '?=';
    const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/.{76}/g, '$&\r\n');
    const boundary = 'b' + uid();
    let mime = `To: ${to}\r\n${cc ? `Cc: ${cc}\r\n` : ''}Subject: ${enc(subject || '')}\r\nMIME-Version: 1.0\r\n`;
    mime += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    mime += `--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(body || '')}\r\n`;
    for (const a of attachments) {
      const data = (await blobToBase64(a.blob)).replace(/.{76}/g, '$&\r\n');
      mime += `--${boundary}\r\nContent-Type: ${a.type || 'application/octet-stream'}; name="${enc(a.name)}"\r\nContent-Disposition: attachment; filename="${enc(a.name)}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${data}\r\n`;
    }
    mime += `--${boundary}--`;
    const bytes = new TextEncoder().encode(mime);
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function createDraft(msg) {
    const raw = await buildMime(msg);
    const d = await api(`${GM}/drafts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: { raw } }) });
    return d;
  }
  async function sendDraft(draftId) {
    return api(`${GM}/drafts/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draftId }) });
  }

  /* ---------------- Agenda ---------------- */
  const CAL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  async function listEvents(timeMin, timeMax) {
    const r = await api(`${CAL}?singleEvents=true&orderBy=startTime&maxResults=50&timeMin=${encodeURIComponent(new Date(timeMin).toISOString())}&timeMax=${encodeURIComponent(new Date(timeMax).toISOString())}`);
    return (r.items || []).map(e => ({ id: e.id, titre: e.summary, debut: e.start?.dateTime || e.start?.date, fin: e.end?.dateTime || e.end?.date, lieu: e.location, description: (e.description || '').slice(0, 500) }));
  }
  async function createEvent({ titre, debut, dureeMin = 60, lieu, description, invites = [] }) {
    const start = new Date(debut), end = new Date(start.getTime() + dureeMin * 60000);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return api(CAL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      summary: titre, location: lieu, description,
      start: { dateTime: start.toISOString(), timeZone: tz }, end: { dateTime: end.toISOString(), timeZone: tz },
      attendees: invites.filter(Boolean).map(email => ({ email })),
    }) });
  }

  /* ---------------- Drive ---------------- */
  const DR = 'https://www.googleapis.com/drive/v3/files';
  async function driveSearch(q) {
    const query = `name contains '${q.replace(/'/g, "\\'")}' and trashed = false`;
    const r = await api(`${DR}?pageSize=20&fields=files(id,name,mimeType,modifiedTime,size)&q=${encodeURIComponent(query)}`);
    return r.files || [];
  }
  async function driveDownload(fileId) {
    const meta = await api(`${DR}/${fileId}?fields=id,name,mimeType`);
    let res, name = meta.name, type = meta.mimeType;
    if (type.startsWith('application/vnd.google-apps')) {
      res = await api(`${DR}/${fileId}/export?mimeType=application/pdf`); type = 'application/pdf'; name += '.pdf';
    } else res = await api(`${DR}/${fileId}?alt=media`);
    const blob = new Blob([await res.arrayBuffer()], { type });
    return { blob, name, type };
  }

  return { connect, disconnect, isConnected, searchMessages, readThread, getAttachment, createDraft, sendDraft, listEvents, createEvent, driveSearch, driveDownload };
})();
