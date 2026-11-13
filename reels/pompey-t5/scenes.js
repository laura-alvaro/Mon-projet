// Scénario du Réel — modifier ici les textes / durées puis relancer build.py
const SCENES = [
  { photo: "01-salon",    duree: 3.6, type: "accroche", badge: "À vendre · Pompey", titre: "Maison T5<br>134 m²", sous: "4 chambres", signature: "Suivez la visite…" },
  { photo: "02-cuisine",  duree: 2.6, badge: "Cuisine",          titre: "Équipée & moderne" },
  { photo: "03-chambre1", duree: 2.4, badge: "Chambre 1",        titre: "Chambre parentale" },
  { photo: "04-dressing", duree: 2.4, badge: "Espace dressing",  titre: "Avec salle d'eau" },
  { photo: "05-chambre2", duree: 1.9, badge: "Chambre 2",        titre: "Lumineuse" },
  { photo: "06-chambre3", duree: 1.9, badge: "Chambre 3",        titre: "Puits de lumière" },
  { photo: "07-chambre4", duree: 1.9, badge: "Chambre 4",        titre: "Spacieuse" },
  { photo: "08-sdb",      duree: 2.6, badge: "Salle de bain",    titre: "Baignoire + douche<br>double vasque" },
  { photo: "09-terrasse", duree: 2.4, badge: "Extérieur",        titre: "Terrasse en bois" },
  { photo: "10-sous-sol", duree: 2.4, badge: "Sous-sol",         titre: "De l'espace en plus" },
  { photo: "11-facade",   duree: 3.2, type: "recap", badge: "Pompey", titre: "T5 · 134 m²<br>4 chambres" },
];
if (typeof module !== "undefined") module.exports = SCENES;
