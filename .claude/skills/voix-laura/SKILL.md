---
name: voix-laura
description: Nettoie tout texte en français écrit pour Laura (légende Instagram, script de reel, story, DM, annonce immobilière, post Facebook/LinkedIn, mail client) pour qu'il sonne comme elle parle, pro mais humain, sans tics d'IA ni clichés d'annonce. À utiliser automatiquement avant de montrer à Laura n'importe quel texte destiné à être publié ou envoyé, y compris ceux produits par les skills ig-* (à la place de ig-human, dont le lexique est en anglais). Aussi quand elle dit « ça fait IA », « humanise », « mets-le à ma façon », « enlève les mots IA ».
---

# voix-laura

Deux fichiers comptent :

- `voix.md` : comment Laura parle vraiment. **Lis-le avant d'écrire ou de réécrire quoi que ce soit.**
- `mots-ia-fr.json` : le lexique des tics d'IA et des clichés d'annonce immo, utilisé par le script.

## Étapes, dans l'ordre

1. **Écris le brouillon en suivant `voix.md`** (tutoiement ou vouvoiement, longueur des phrases, expressions à elle, mots interdits).
2. **Passe le script** sur le brouillon :
   ```bash
   python3 .claude/skills/voix-laura/nettoyer.py brouillon.txt -o propre.txt --report
   ```
   Il retire automatiquement :
   - les caractères invisibles et les tirets longs (—), signature typique de l'IA ;
   - les mots et tournures IA (« il est important de noter que », « en effet », « crucial », « véritable »…) ;
   - les clichés d'annonce (« havre de paix », « idéalement situé », « à couper le souffle », « laissez-vous séduire »…).
3. **Réécris toi-même les lignes signalées** dans la section *STRUCTURAL TELLS* du rapport : le script les repère mais ne les corrige pas, parce que ça demande du jugement. Les plus fréquentes :
   - « Ce n'est pas seulement X, c'est Y » : dire Y directement ;
   - les listes de 3 adjectifs : en garder 2, ou mettre un chiffre ;
   - « Le résultat ? » seul sur une ligne : donner l'info directement ;
   - les adjectifs creux (sublime, exceptionnel, pépite, au cœur de…) : les remplacer par un **fait** (m², exposition, vue, distance à pied, année, DPE) ;
   - « N'hésitez pas à… » : donner l'action exacte (« Écrivez-moi VISITE »).
4. **Relis à voix haute dans ta tête comme Laura** : si une phrase ne passerait pas au téléphone avec un client, réécris-la. Vérifie aussi qu'il ne reste pas de répétition ou de phrase bancale laissée par le remplacement automatique.
5. Montre à Laura **le texte final propre**, pas le rapport. Signale en une ligne ce que tu as changé de notable si c'est utile.

## Ce qui doit rester (pro)

- Les vrais termes métier : mandat, compromis, DPE, frais de notaire, estimation, honoraires, diagnostics, loi Carrez.
- Les chiffres exacts et les mentions légales (honoraires, DPE/GES, numéro RSAC) quand ils sont nécessaires.
- La politesse : on enlève le jargon de brochure, pas le respect.

## Honnêteté

Ce script applique des règles locales. Ce n'est pas un détecteur d'IA officiel et il ne garantit pas qu'un outil ne détectera rien. Le but est que le texte sonne comme Laura, pas de tromper un détecteur.

## Faire évoluer le skill

- Si Laura utilise un mot que le script supprime : retirer sa ligne de `mots-ia-fr.json`.
- Si elle repère un nouveau tic : l'ajouter dans `words` ou `phrases` (`find` → `replace`), ou dans `structures` pour un simple signalement.
- Chaque fois qu'elle corrige un texte à sa façon, ajouter l'exemple dans `voix.md`.
