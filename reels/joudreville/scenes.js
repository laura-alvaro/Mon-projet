// Réel « Avant / Après » — Joudreville
// split : écran partagé haut (aujourd'hui) / bas (projection)
// wipe  : plein écran, rideau qui révèle la projection
// plein : photo plein écran + bandeau info
// tags  : fond bleu, étiquettes qui apparaissent une à une
// final : récap + contact
const SCENES = [
  { type:"split", haut:"sejour-brut", bas:"sejour-projection", duree:5.0,
    tag:"Exclusivité · Joudreville", titre:"Elle est brute…<br>imaginez-la finie." },
  { type:"wipe", avant:"cuisine-brut", apres:"cuisine-projection", duree:7.0, titreAvant:"Cette pièce…", titreApres:"…votre future cuisine ?" },
  { type:"split", haut:"cave-brut", bas:"cave-projection", duree:5.0, tag:"Le sous-sol", titre:"Un coin détente<br>en pierre ?" },
  { type:"plein", photo:"combles",       duree:3.6, tag:"Dernier niveau", titre:"2 chambres possibles" },
  { type:"plein", photo:"charpente",     duree:3.2, tag:"Structure",      titre:"Bois traité" },
  { type:"plein", photo:"facade",        duree:3.2, tag:"Ouvertures",     titre:"Menuiseries neuves" },
  { type:"plein", photo:"stationnement", duree:3.6, tag:"Extérieur",      titre:"Terrain 440 m²<br>+ stationnement" },
  { type:"tags", duree:6.4, titre:"Déjà prêt<br>pour votre projet", items:["Plans & devis","Autorisations d'urbanisme","Tout-à-l'égout raccordé","Gaine borne de recharge","Emplacement poêle à pellets","Matériaux laissés sur place","Garage 25 m² possible"] },
  { type:"final", photo:"stationnement", duree:4.8 },
];
if (typeof module !== "undefined") module.exports = SCENES;
