# Recon map : TALQOR (web)

Périmètre : administration des mandats, suivi des biens et des clients, automatisation (tri des pièces, relances, brouillons de messages avec validation humaine).
Pour : une conseillère immobilière indépendante du réseau iad France, pour son propre usage (solo, pas d'équipe).
Date : 2026-11-12

> **Limites de cette recon, à lire avant le reste.**
> - Les sites talqor.fr et immobil-ia.fr ne sont pas joignables depuis cette session (réseau bloqué, ouverture refusée).
>   Tout ce qui suit vient des **extraits publics remontés par un moteur de recherche** (page d'accueil, blog, annuaire),
>   pas d'une lecture complète des pages. Aucune capture d'écran : `replica/screens/` est vide.
> - Les **écrans sont donc déduits** des fonctionnalités décrites, pas observés. Leurs états (vide, erreur…) sont à
>   confirmer. La colonne « confiance » du modèle de données le dit pour chaque entité.
> - Les **CGU de TALQOR n'ont pas pu être lues**. Si tu ouvres un compte d'essai pour compléter cette recon, vérifie
>   d'abord qu'elles n'interdisent pas d'utiliser le compte pour construire un outil concurrent.
> - Les chiffres (tarifs, « 1 h 30 gagnée par jour », « 360 agents actifs ») sont des annonces de l'éditeur, non vérifiées,
>   et les sources se contredisent sur les prix.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | site / page d'accueil | https://www.talqor.fr/ | positionnement, intégrations, formules Essentiel / Pro, agents IA, FAQ (« rien n'est envoyé sans accord ») |
| 2 | blog : CRM pour mandataire | https://www.talqor.fr/blog/crm-immobilier-independant | « pas un simple CRM », liste des biens en mandat avec visites, offres, documents |
| 3 | blog : relance client | https://www.talqor.fr/blog/relance-client-immobilier | types de relance (ancien client, estimation), brouillon adapté au contexte |
| 4 | blog : dossier notaire | https://www.talqor.fr/blog/preparer-dossier-notaire | bordereau des pièces, validation humaine avant envoi au notaire |
| 5 | blog : documents obligatoires | https://www.talqor.fr/blog/documents-obligatoires-vente-immobiliere | liste des pièces vendeur / bien / diagnostics |
| 6 | blog : pièces syndic | https://www.talqor.fr/blog/pieces-syndic-a-recuperer-pour-un-dossier-de-vente | règlement, 3 derniers PV d'AG, pré-état daté |
| 7 | blog : pré-état daté vs état daté | https://www.talqor.fr/blog/pre-etat-date-vs-etat-date-la-confusion-a-eviter | deux pièces distinctes, demandées à des moments différents |
| 8 | blog : assistant IA ou CRM | https://www.talqor.fr/blog/assistant-ia-immobilier-ou-crm-immobilier | positionnement face aux CRM |
| 9 | blog : suivi des dossiers d'agence | https://www.talqor.fr/blog/quel-assistant-ia-immobilier-aide-une-agence-a-suivre-ses-dossiers | dossiers regroupant emails, documents, RDV et interlocuteurs |
| 10 | blog : logiciels d'agence 2026 | https://www.talqor.fr/blog/quels-sont-les-meilleurs-logiciels-pour-une-agence-immobiliere | offre agence (socle 199 € HT/mois + par agent), alternatives citées |
| 11 | annuaire Immobil-IA | https://www.immobil-ia.fr/fiche-annuaire/talqor-assistant-ia-agent-immobilier/ | résumé : classe les mails, relance, prépare les dossiers, hébergement Europe chiffré |
| 12 | annuaire startups | https://www.startuphub.ai/startups/talqor | plateforme IA, Paris, fondée en 2026 |

Un témoignage public d'un conseiller iad France (LinkedIn, vu seulement en extrait) dit utiliser l'outil pour « préparer ses dossiers, relancer ses acquéreurs et gérer ses rendez-vous ». Il confirme que le cas d'usage iad est visé.

## Core loop

L'IA lit les emails, les messages WhatsApp et l'agenda de la conseillère, range chaque pièce dans le bon dossier de bien, repère ce qui manque et propose les relances et les brouillons de messages. **La conseillère valide, ajuste ou écarte** chaque proposition. Rien ne part sans son accord.

## Screens (déduits, non observés)

| ID | écran | route / accès | rôle | composants clés | états à prévoir |
| --- | --- | --- | --- | --- | --- |
| S01 | Inscription / connexion | `/login` | créer un compte, essai 14 jours | formulaire, connexion Google / Microsoft | vide, erreur, essai expiré |
| S02 | Connexion des comptes | onboarding puis Réglages | brancher Gmail / Outlook, Google / Apple Calendar, WhatsApp, Drive / OneDrive | cartes d'intégration avec statut | non connecté, connecté, jeton expiré, erreur |
| S03 | Réglages d'autonomie de l'IA | Réglages | décider « jusqu'où TALQOR peut aller » par type d'action | interrupteurs par action, niveau (suggérer / préparer / envoyer) | défaut = tout en validation |
| S04 | Tableau de bord / file de validation | `/` | voir et traiter les propositions de l'IA | cartes de proposition (classement, relance, brouillon), boutons Valider / Ajuster / Écarter, compteurs | vide (« rien à valider »), chargement, rempli |
| S05 | Liste des biens en mandat | `/biens` | voir tous les dossiers actifs | tableau ou cartes, filtres par statut, compteur mandats actifs / quota, pastille pièces manquantes | vide, rempli, quota atteint |
| S06 | Fiche bien / dossier | `/biens/:id` | tout le dossier au même endroit | en-tête (adresse, prix, type de mandat, échéance), onglets Infos / Visites / Offres / Documents / Échanges / Interlocuteurs | rempli, mandat expirant, mandat expiré |
| S07 | Documents du dossier | onglet de S06 | pièces classées par famille, liste de ce qui manque | familles vendeur / bien / diagnostics / copropriété, checklist selon le type de bien, dépôt de fichier, aperçu | aucune pièce, partiel, complet |
| S08 | Bordereau notaire | action depuis S07 | générer le récapitulatif des pièces et l'envoyer | liste des pièces cochées, aperçu PDF, validation obligatoire avant envoi | incomplet (envoi bloqué), prêt, envoyé |
| S09 | Liste des contacts | `/contacts` | vendeurs, acquéreurs, anciens clients, estimations | tableau, filtres par rôle et statut de projet, recherche | vide, rempli |
| S10 | Fiche contact | `/contacts/:id` | historique complet d'une personne | timeline (emails, WhatsApp, RDV), dossiers liés, dates clés (anniversaire d'achat), projet | rempli, sans historique |
| S11 | Opportunités de relance | `/relances` | relances détectées par l'IA | liste : anciens vendeurs, acquéreurs, estimations non concrétisées, anniversaires d'acquisition, projets qui reprennent | vide, rempli |
| S12 | Éditeur de brouillon | modale depuis S04 / S11 | relire et envoyer un message préparé | canal (email / WhatsApp), destinataire, texte modifiable, pièces jointes, Envoyer / Écarter | brouillon, envoi, envoyé, échec |
| S13 | Agenda | `/agenda` | RDV et visites synchronisés | vue semaine, événements liés aux dossiers | vide, rempli, synchronisation en échec |
| S14 | Abonnement | Réglages | formule, quota de mandats, usages IA | carte de formule, jauges | essai, actif, quota dépassé |

Hors de ton périmètre, mais présents chez TALQOR : agent Photo (retouche), agent diffusion, permanence téléphonique IA, outils agence (boîte commune, agenda partagé, rapports). Ils figurent dans `features.csv` en `could` ou `skip`.

## Flows

```
F01 Prendre un nouveau mandat et ouvrir son dossier
    S05 -> "Nouveau bien" -> S06 (infos bien + mandat : type, date de signature, durée, prix, honoraires) -> S07 (checklist générée selon le type de bien)
    happy path clicks: ~5
    edge: mandat signé ailleurs (outils du réseau iad), saisi après coup ; copropriété ou maison (checklist différente) ; plusieurs vendeurs

F02 Une pièce arrive par email ou WhatsApp et se range toute seule
    (email entrant) -> S04 proposition "classer DPE dans dossier 12 rue X / famille Diagnostics" -> Valider -> S07 mise à jour
    happy path clicks: 1
    edge: dossier ambigu (deux biens du même vendeur), pièce illisible, doublon, pièce périmée (diagnostic expiré)

F03 Relancer pour les pièces manquantes
    S07 (pastille "3 pièces manquantes") -> S12 brouillon au vendeur ou au syndic -> Envoyer
    happy path clicks: 2
    edge: pas d'email connu pour le syndic ; pré-état daté demandé au lieu de l'état daté ; relance déjà envoyée il y a 2 jours

F04 Suivre une visite et une offre
    S13 (visite) -> S06 onglet Visites (compte rendu) -> S06 onglet Offres (montant, acquéreur, statut) -> S12 réponse au vendeur
    happy path clicks: ~6
    edge: offre sans réponse depuis plus de 48 h ; plusieurs offres concurrentes ; offre retirée

F05 Préparer et envoyer le dossier au notaire
    S07 (complet) -> S08 bordereau -> validation -> envoi
    happy path clicks: 3
    edge: dossier incomplet (envoi bloqué) ; notaires différents côté vendeur et côté acquéreur

F06 Traiter les relances proposées par l'IA
    S04 ou S11 -> carte "estimation non concrétisée il y a 6 mois : Mme Y" -> S12 -> Ajuster -> Envoyer
    happy path clicks: 3
    edge: contact qui a demandé à ne plus être relancé (RGPD) ; bien déjà vendu par un concurrent

F07 Échéance de mandat
    alerte S04 "mandat exclusif : fin dans 15 jours" -> S06 -> S12 message au vendeur (renouvellement ou avenant de prix)
    happy path clicks: 2
    edge: tacite reconduction ; résiliation du mandat exclusif par le vendeur (à vérifier : possible après 3 mois avec un préavis de 15 jours, loi Hoguet)
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Carte de proposition IA | classement, relance, brouillon, alerte | en attente, validée, ajustée, écartée | S04, S11 |
| Bouton | primaire, secondaire, fantôme, danger | défaut, survol, focus, désactivé, chargement | partout |
| Pastille de statut | mandat (actif / sous offre / compromis / vendu / expiré), pièce (reçue / manquante / à valider) | — | S05, S06, S07 |
| Checklist de pièces | par famille, avec compteur | vide, partielle, complète | S07, S08 |
| Zone de dépôt de fichier | — | repos, glisser, envoi, erreur | S07 |
| Timeline d'échanges | email, WhatsApp, RDV, note | — | S06, S10 |
| Tableau filtrable | biens, contacts | vide, chargement, rempli | S05, S09 |
| Onglets | — | actif, inactif | S06 |
| Modale d'édition de message | email, WhatsApp | brouillon, envoi, erreur | S12 |
| Carte d'intégration | Google, Microsoft, WhatsApp, Apple | non connecté, connecté, erreur | S02 |
| Jauge de quota | mandats, usages IA | normal, proche, atteint | S05, S14 |
| Toast | succès, erreur, info | — | partout |
| Sélecteur de date | — | — | S06, S13 |

## Inferred data model

```
Conseiller      id, nom, email, réseau (iad), formule, quota_mandats, réglages_autonomie (json)
                evidence: formules (source 1), FAQ autonomie (source 1)
                confidence: high

CompteConnecté  id, conseiller_id, fournisseur (gmail | outlook | google_cal | apple_cal | whatsapp | drive | onedrive), statut, jetons (chiffrés)
                evidence: liste des intégrations (sources 1, 11)
                confidence: high

Bien            id, adresse, type (appartement | maison | terrain | …), copropriété (bool), surface, surface_carrez, pièces, caractéristiques (json)
                evidence: « liste des biens en mandat avec leurs caractéristiques » (source 2)
                confidence: high

Mandat          id, bien_id, conseiller_id, type (simple | exclusif | semi-exclusif ?), numéro_registre, date_signature, durée_mois,
                date_fin, tacite_reconduction, prix_affiché, honoraires, charge_honoraires (vendeur | acquéreur), statut, avenants[]
                evidence: suivi de N mandats actifs (source 1) ; champs = règles légales de la loi Hoguet, pas vus chez TALQOR
                confidence: medium (structure) / guess (champs exacts)

Dossier         id, bien_id, mandat_id, étape (mandat | commercialisation | offre | compromis | acte | clos)
                evidence: « dossier » regroupant emails, documents, RDV, interlocuteurs (sources 9, 11)
                confidence: medium (Dossier et Mandat peuvent ne faire qu'un chez TALQOR)

Contact         id, nom, emails[], téléphones[], whatsapp, projet (vente | achat | estimation), statut_projet, dates_clés (json), consentement_relance
                evidence: anciens vendeurs, acquéreurs, estimations, anniversaires d'acquisition (source 3, résultats de recherche)
                confidence: high

RôleDossier     dossier_id, contact_id, rôle (vendeur | acquéreur | notaire_vendeur | notaire_acquéreur | syndic | diagnostiqueur)
                evidence: « interlocuteurs » du dossier (source 9), envoi au notaire (source 4), pièces syndic (source 6)
                confidence: medium

Document        id, dossier_id, famille (vendeur | bien | diagnostics | copropriété), type_pièce, fichier, source (email | whatsapp | dépôt),
                message_id, statut (à_valider | classé | rejeté), date_validité
                evidence: classement par famille, pièces reçues par mail ou messagerie (sources 1, 2)
                confidence: high

PièceRequise    type_bien, copropriété, famille, type_pièce, obligatoire (bool)
                evidence: « alerte sur les pièces manquantes selon le type de bien » (source 1), listes (sources 5, 6, 7)
                confidence: high (fonction) / medium (contenu exact de la liste)

Message         id, conseiller_id, canal (email | whatsapp), direction, fil_id, de, à, sujet, corps, reçu_le, dossier_id?, contact_id?
                evidence: lecture des messageries existantes « sans migration » (source 11)
                confidence: high

Visite          id, dossier_id, contact_id, date, compte_rendu, évènement_agenda_id
                evidence: « historique de visites » (source 2)
                confidence: high

Offre           id, dossier_id, contact_id, montant, conditions, date, statut (reçue | acceptée | refusée | retirée)
                evidence: « offres reçues » (source 2)
                confidence: high

PropositionIA   id, conseiller_id, type (classement | relance | brouillon | alerte), cible (document | contact | dossier), contenu (json),
                statut (en_attente | validée | ajustée | écartée), créée_le, traitée_le
                evidence: « l'IA propose… l'agent valide, ajuste ou écarte » (source 1)
                confidence: high

Évènement       id, compte_connecté_id, début, fin, titre, dossier_id?, contact_id?
                evidence: synchronisation des agendas (sources 1, 11)
                confidence: high
```

Relationships: Conseiller 1-n CompteConnecté, Conseiller 1-n Mandat, Bien 1-n Mandat (renouvellements), Mandat 1-1 Dossier, Dossier n-n Contact (via RôleDossier), Dossier 1-n Document / Visite / Offre, Message n-1 Dossier (optionnel), PropositionIA n-1 Conseiller.

## Feature matrix

See `features.csv`. Must: 21, should: 12, could: 6, skip: 5.

## Out of scope (cannot or should not be cloned)

- **Le registre légal des mandats.** Chez iad, il est tenu par le réseau, titulaire de la carte professionnelle. Ton outil peut en garder une copie de suivi (numéro, dates), mais ne le remplace pas. Les mandats se signent dans les outils du réseau.
- **L'intégration aux outils internes d'iad** (back-office, diffusion sur les portails) : rien de public, aucune API documentée.
- **WhatsApp personnel.** Il n'existe pas d'API officielle pour lire un compte WhatsApp personnel. Seule l'API WhatsApp Business (Meta) est officielle, avec un numéro dédié et des modèles de messages approuvés. Contourner ça (WhatsApp Web automatisé) viole les conditions de WhatsApp et peut faire bannir le numéro.
- **La permanence téléphonique IA** : hors périmètre, téléphonie et coûts spécifiques.
- **Les outils agence** (boîte commune, rapports d'équipe) : inutiles en solo.
- **Les textes, le nom, le logo et les visuels de TALQOR**, et les contenus de son blog : on reproduit les fonctions, pas les contenus.

## Size

Écrans 14, flows 7, entités 13.

Parties difficiles :
1. **Lecture des emails (Gmail / Outlook).** L'OAuth est simple pour un usage perso. Pour un produit vendu à d'autres, les accès Gmail en lecture sont des « scopes restreints » chez Google, avec un audit de sécurité annuel payant. Pour un MVP perso, une adresse de transfert ou le dépôt manuel suffisent.
2. **Classement IA fiable avec validation humaine.** Rattacher la bonne pièce au bon dossier, reconnaître le type de pièce et sa date de validité, sans jamais envoyer seul.
3. **WhatsApp** : API Business seulement (voir plus haut), donc une fonction plus limitée que chez TALQOR.

Autres points : RGPD (données de clients tiers, consentement aux relances, hébergement en UE), synchronisation des agendas, génération du bordereau PDF.

Taille : **M en usage perso** (quelques semaines : biens, mandats, contacts, documents avec checklist, relances proposées, connexion à une seule boîte mail). **L** si tu veux le vendre à d'autres conseillers (audit Google, WhatsApp Business, multi-comptes, facturation).
