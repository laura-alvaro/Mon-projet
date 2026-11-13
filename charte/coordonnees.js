/* ==========================================================
   MES COORDONNÉES — à remplir UNE SEULE FOIS.
   Elles s'affichent automatiquement sur tous les modèles
   (tout élément HTML ayant data-champ="...").
   ========================================================== */
const COORDONNEES = {
  nom:        "Prénom NOM",
  titre:      "Conseillère immobilier iad France",
  telephone:  "06 00 00 00 00",
  email:      "prenom.nom@iadfrance.fr",
  instagram:  "@prenom.immo",
  secteur:    "Ville & alentours",
  site:       "iadfrance.fr/conseiller-immobilier/prenom.nom",
  cta:        "Estimation offerte · Contactez-moi",
  rsac:       "Agent commercial immatriculé au RSAC de [Ville] sous le n° [000 000 000]"
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-champ]").forEach(el => {
    const v = COORDONNEES[el.dataset.champ];
    if (v) el.textContent = v;
  });
  // Initiales de secours si la photo n'est pas encore déposée
  document.querySelectorAll("img.photo").forEach(img => {
    img.onerror = () => {
      const d = document.createElement("div");
      d.className = img.className + " photo-vide";
      d.textContent = COORDONNEES.nom.split(" ").map(m => m[0]).join("").slice(0, 2).toUpperCase();
      img.replaceWith(d);
    };
    if (img.complete && img.naturalWidth === 0) img.onerror();
  });
  document.querySelectorAll("img.logo-iad").forEach(img => {
    img.onerror = () => { const s = document.createElement("span"); s.className = "logo-texte"; s.textContent = "iad"; img.replaceWith(s); };
    if (img.complete && img.naturalWidth === 0) img.onerror();
  });
});
