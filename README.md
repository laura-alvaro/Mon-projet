# Mon Agence – gestion d'activité pour conseiller·ère immobilier·ère

Application web légère pour gérer au quotidien une activité de conseiller·ère immobilier·ère indépendant·e (mandataire en réseau).

## Fonctionnalités

- **Tableau de bord** : mandats actifs, commissions encaissées et à venir, progression vers l'objectif annuel, prochains rendez-vous, tâches, alertes (fins de mandat, fins de conditions suspensives, tâches en retard) et portefeuille des biens par étape.
- **Contacts** : vendeurs, acquéreurs, prospects, notaires, partenaires… avec source du contact et critères de recherche des acquéreurs.
- **Biens & mandats** : caractéristiques, DPE, prix, honoraires, type et numéro de mandat, dates de début et de fin, statut (estimation → mandat → offre → compromis → vendu).
- **Rapprochement** : pour chaque bien, la liste des acquéreurs dont les critères correspondent (budget, type, surface, pièces, secteur).
- **Agenda** : estimations, visites, signatures, avec comptes rendus.
- **Tâches** : relances et actions avec échéance et priorité.
- **Ventes & honoraires** : suivi de l'offre jusqu'à l'encaissement, calcul automatique de la commission nette HT (taux de commission et TVA réglables), statistiques annuelles et graphique mensuel.
- **Sauvegarde** : export/import JSON, export des contacts en CSV (compatible Excel).

## Utilisation

Aucune installation requise : ouvrez `index.html` dans un navigateur (ordinateur, tablette ou téléphone).
Pour l'utiliser en ligne, vous pouvez activer **GitHub Pages** sur ce dépôt (Settings → Pages → branche `main`).

Pour découvrir l'application, allez dans **Paramètres → Charger des données d'exemple**.

> ⚠️ Les données sont stockées dans le navigateur (localStorage). Pensez à exporter régulièrement une sauvegarde depuis **Paramètres**.

## Évolutions possibles

- Synchronisation multi-appareils (compte utilisateur + base de données en ligne)
- Génération de documents (avis de valeur, bon de visite, fiche bien en PDF)
- Photos des biens
- Synchronisation avec Google Agenda
