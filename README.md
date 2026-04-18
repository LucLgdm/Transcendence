# Transcendance

Application web multijoueur permettant de jouer à Pong et aux échecs en temps réel, avec des fonctionnalités sociales avancées.

---

## Table des matières

* [Description](#description)
* [Fonctionnalités](#fonctionnalités)
* [Stack technique](#stack-technique)
* [Architecture](#architecture)
* [Installation](#installation)
* [Auteurs](#auteurs)
* [Organisation de l’équipe](#organisation-de-léquipe)
* [Documentation](#documentation)
* [Utilisation de l’IA](#utilisation-de-l-ia)

---

## Description

Ce projet est une application web qui propose une plateforme de jeu en ligne intégrant Pong et les échecs, avec des fonctionnalités en temps réel et une dimension sociale.

---

## Fonctionnalités

* Authentification via API 42 (OAuth)
* Pong en temps réel
* Échecs en temps réel
* Mode spectateur
* Historique des parties
* Chat en ligne
* Système d’expérience
* Personnalisation du profil
* Authentification à deux facteurs (2FA)

---

## Stack technique

### Frontend

* TypeScript
* Bootstrap
* CSS

### Backend

* TypeScript

### Base de données

* PostgreSQL

### Infrastructure

* Docker
* Nginx
* ModSecurity
* HashiCorp Vault

---

## Architecture

Le projet est divisé en deux parties principales :

### Frontend

* Interface utilisateur et expérience utilisateur
* Implémentation du jeu Pong
* Design global de l’application
* Gestion de l’internationalisation

### Backend

* Logique du jeu d’échecs
* Couche de sécurité (ModSecurity)
* Gestion des secrets (HashiCorp Vault)
* Reverse proxy (Nginx)
* Orchestration des services (Docker Compose)

---

## Installation

### Prérequis

* Docker
* Make

### Lancement

```
git clone <repository_url>
cd transcendance
make
```

### Accès

Une fois le projet lancé, l’application est accessible à l’adresse suivante :

```
https://localhost:8080
```

---

## Auteurs

* ade-rese
* gpichon
* lde-merc
* safuente

---

## Organisation de l’équipe

Tous les membres du projet ont participé au développement de l’application.
En complément, les rôles suivants ont été attribués :

* ade-rese : Scrum Master + Dev
* gpichon : Product Owner + Dev
* lde-merc : Tech Lead + Dev
* safuente : Dev

---

## Documentation

https://blog.getbootstrap.com/2024/02/20/bootstrap-5-3-3/

https://getbootstrap.com/docs/5.3/getting-started/introduction/

https://www.typescriptlang.org/docs/

https://expressjs.com/

https://nodejs.org/docs/latest/api/

https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/script/type/importmap

https://www.typescriptlang.org/docs/handbook/2/typeof-types.html

https://www.typescriptlang.org/docs/handbook/2/conditional-types.html

https://www.chess.com/learn-how-to-play-chess

https://www.cs.toronto.edu/~guerzhoy/niftypong/

https://threejs.org/manual/

https://developer.mozilla.org/en-US/docs/Games/Anatomy

https://natureofcode.com/vectors/

https://mathworld.wolfram.com/Reflection.html

https://github.com/owasp-modsecurity/ModSecurity

https://github.com/owasp-modsecurity/ModSecurity/wiki

https://coreruleset.org/docs/

https://hub.docker.com/r/owasp/modsecurity-crs

https://owasp.org/www-project-top-ten/

https://developer.hashicorp.com/vault/docs

https://developer.hashicorp.com/vault/tutorials

https://github.com/hashicorp/vault

https://fr.wikipedia.org/wiki/Internationalisation_(informatique)

https://www.npmjs.com/package/i18n

---

## Utilisation de l’IA

Des outils d’intelligence artificielle ont été utilisés dans ce projet pour :

* corriger certaines fautes de typographie
* servir de support pédagogique afin de valider la compréhension de certains concepts
