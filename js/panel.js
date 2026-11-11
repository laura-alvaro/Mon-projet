'use strict';
/* Panneau du copilote : ouverture, saisie, pièces jointes, dictée */
(() => {
  let pending = [];
  const input = $('#cpInput');
  const showFiles = () => { $('#cpFiles').textContent = pending.length ? '📎 ' + pending.map(f => f.name).join(', ') : ''; };
  $('#cpToggle').onclick = () => document.body.classList.contains('cp-open') ? document.body.classList.remove('cp-open') : Copilot.open();
  $('#cpClose').onclick = () => document.body.classList.remove('cp-open');
  $('#cpReset').onclick = () => { if (confirm('Commencer une nouvelle conversation ?')) Copilot.reset(); };
  $('#cpAttach').onchange = (e) => { pending.push(...e.target.files); e.target.value = ''; showFiles(); };
  $('#cpForm').onsubmit = (e) => {
    e.preventDefault();
    const text = input.value.trim(); if (!text && !pending.length) return;
    if (Copilot.isBusy()) return;
    const files = pending; pending = []; showFiles(); input.value = '';
    Copilot.send(text || 'Voici des fichiers : analyse-les et propose où les ranger.', files);
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#cpForm').requestSubmit(); } });
  // Dictée vocale (si le navigateur la propose)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) $('#cpMic').style.display = 'none';
  else $('#cpMic').onclick = () => {
    const r = new SR(); r.lang = 'fr-FR'; r.interimResults = false;
    $('#cpMic').classList.add('primary');
    r.onresult = (ev) => { input.value = (input.value + ' ' + ev.results[0][0].transcript).trim(); };
    r.onend = () => $('#cpMic').classList.remove('primary');
    r.start();
  };
  Copilot.render();
})();
