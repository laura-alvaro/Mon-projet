// Réel « 3 surprises » — style CARTE (photo encadrée sur fond bleu iAD + vague blanche)
// type: "carte" (photo dans la carte) | "liste" (check-list animée)
const SCENES = [
  { type:"carte", photo:"facade",          duree:4.0, pastille:"Maison 8 pièces", tag:"À vendre",            titre:"Elle cache<br>3 surprises…" },
  { type:"carte", photo:"cinema",          duree:3.8, numero:1, tag:"Surprise n°1",      titre:"Une vraie salle<br>de cinéma" },
  { type:"carte", photo:"studio-cuisine",  duree:3.8, numero:2, tag:"Surprise n°2",      titre:"Un studio aménagé<br>sous les combles" },
  { type:"carte", photo:"studio-piece",    duree:3.0, numero:2, tag:"Le studio",         titre:"Un espace à part" },
  { type:"carte", photo:"piscine",         duree:3.8, numero:3, tag:"Surprise n°3",      titre:"Une piscine creusée<br>au jardin" },
  { type:"carte", photo:"cuisine",         duree:3.2, pastille:"La visite", tag:"Cuisine",  titre:"Grande cuisine<br>équipée" },
  { type:"carte", photo:"cheminee",        duree:3.2, pastille:"La visite", tag:"Séjour",   titre:"Avec cheminée" },
  { type:"carte", photo:"chambre-parquet", duree:3.2, pastille:"La visite", tag:"Chambres", titre:"4 chambres" },
  { type:"carte", photo:"chambre-rouge",   duree:2.8, pastille:"La visite", tag:"Chambres", titre:"De beaux volumes" },
  { type:"carte", photo:"douche",          duree:3.0, pastille:"La visite", tag:"Salle d'eau", titre:"Grande douche" },
  { type:"carte", photo:"garage",          duree:3.2, pastille:"La visite", tag:"Garage",   titre:"2 voitures<br>en enfilade" },
  { type:"liste", duree:5.6, titre:"Les + de la maison", items:["Toiture & isolation<br>refaites en 2025","Garage 2 voitures","Jardin & terrasse","Piscine creusée"] },
  { type:"carte", photo:"facade",          duree:4.4, wa:true, tag:"DPE D · GES D", titre:"325 000 € FAI" },
];
if (typeof module !== "undefined") module.exports = SCENES;
