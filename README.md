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
* [Utilisation de l’IA](#utilisation-de-lia)
* [Notes](#notes)

---

## Description

**Transcendance** est une application web développée dans le cadre du cursus de 42.
Elle propose une plateforme de jeu en ligne intégrant Pong et les échecs, avec des fonctionnalités en temps réel et une dimension sociale.

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

Soon

---

## Utilisation de l’IA

Des outils d’intelligence artificielle ont été utilisés dans ce projet pour :

* corriger certaines fautes de typographie
* servir de support pédagogique afin de valider la compréhension de certains concepts
