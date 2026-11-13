/* ==========================================================
   MES COORDONNÉES — remplies une seule fois, affichées partout
   (tout élément ayant data-champ="...").
   ========================================================== */
const COORDONNEES = {
  nom:        "Laura ALVARO",
  titre:      "Conseillère immobilier iAD France",
  telephone:  "07 50 40 80 37",
  whatsapp:   "07 50 40 80 37",
  lienWhatsapp: "https://wa.me/33750408037",
  email:      "laura.alvaro@iadfrance.fr",
  secteur:    "Hussigny-Godbrange et alentours",
  cta:        "Écrivez-moi sur WhatsApp",
  rsac:       "Agent commercial immatriculé au RSAC de Val de Briey sous le n° 892 205 287"
};

const ICONE_WHATSAPP = `<svg class="wa-icone" viewBox="0 0 32 32" aria-label="WhatsApp">
  <circle cx="16" cy="16" r="16" fill="#25D366"/>
  <path d="M16 6.5c-5.3 0-9.6 4.2-9.6 9.4 0 1.8.5 3.5 1.5 5L7 25.5l4.7-1.2c1.3.7 2.8 1.1 4.3 1.1 5.3 0 9.6-4.2 9.6-9.4S21.3 6.5 16 6.5z" fill="none" stroke="#fff" stroke-width="1.8"/>
  <path d="M12.9 11.4c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 3 4.6 4.1 2.3.9 2.7.7 3.2.7.5 0 1.6-.6 1.8-1.3.2-.6.2-1.2.1-1.3-.1-.1-.3-.2-.5-.3s-1.6-.8-1.8-.9c-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.5l.4-.5c.1-.1.2-.3.3-.4.1-.2 0-.3 0-.5l-.9-1.8z" fill="#fff"/>
</svg>`;

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-champ]").forEach(el => {
    const v = COORDONNEES[el.dataset.champ];
    if (v) el.textContent = v;
  });
  document.querySelectorAll("[data-icone=whatsapp]").forEach(el => el.insertAdjacentHTML("afterbegin", ICONE_WHATSAPP));
  // Secours tant que photo / logo officiel ne sont pas dans /assets
  document.querySelectorAll("img.photo").forEach(img => {
    const f = () => { const d = document.createElement("div"); d.className = img.className + " photo-vide";
      d.textContent = COORDONNEES.nom.split(" ").map(m => m[0]).join("").slice(0,2).toUpperCase(); img.replaceWith(d); };
    img.onerror = f; if (img.complete && img.naturalWidth === 0) f();
  });
  document.querySelectorAll("img.logo-iad").forEach(img => {
    const f = () => { const s = document.createElement("span"); s.className = "logo-texte";
      s.innerHTML = "<b>iAD</b><small>IMMOBILIER</small>"; img.replaceWith(s); };
    img.onerror = f; if (img.complete && img.naturalWidth === 0) f();
  });
});
