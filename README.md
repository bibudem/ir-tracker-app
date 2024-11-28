# IRTracker

IRTracker est une application web développée avec Angular et un backend en Express. Ce projet est une application web interne, destinée à un usage administratif pour le suivi des dépôts dans les bases de données Papyrus.

### Frontend (Angular)

L'interface utilisateur permet aux administrateurs de visualiser et d'exporter les soumissions, de filtrer et rechercher des données spécifiques, et d'interagir avec les données stockées dans Papyrus et SuiviTME via une API REST.

### Backend (Express.js)

Le backend gère les requêtes HTTP, récupère les données des bases de données, et fournit une API RESTful. Il assure également la gestion des erreurs et des réponses JSON standardisées.

## Prérequis

- Node.js v18+ ou une version plus récente
- npm (ou yarn) pour la gestion des dépendances
- Angular CLI pour le frontend

## Installation

Clonez le dépôt.

### Frontend

1. Accédez au répertoire racine.

2. Installez les dépendances nécessaires :

   ```bash
   npm install
   ```

3. Configurez les variables d'environnement pour le frontend :
  - **Développement** : `src/environments/environment.ts` contient les configurations pour l'environnement de développement.
  - **Production** : `src/environments/environment.prod.ts` contient les configurations pour l'environnement de production.

   Vous pouvez personnaliser les variables comme `apiUrl`, `urlDSpace`, et `urlApiDspace` selon vos besoins dans ces fichiers.

4. Démarrez le frontend pour le développement :

   ```bash
   ng serve
   ```

   Le frontend sera accessible à l'adresse suivante : `http://localhost:4200`.

   **Note** : Lors du build en mode production, Angular utilisera le fichier `environment.prod.ts` pour configurer l'application avec les variables appropriées.

### Backend

Configurez le fichier `backend/config/config.js` avec les informations appropriées.

1. Accédez au répertoire backend.

2. Installez les dépendances nécessaires :

   ```bash
   npm install
   ```

3. Démarrez le serveur :

   ```bash
   node server.js
   ```

   Le backend sera accessible à l'adresse suivante : `http://localhost:3000`.

## Architecture

### Frontend (Angular)

Le frontend est structuré autour du framework **Angular**. Voici quelques caractéristiques clés :

- **TypeScript** : Langage utilisé pour structurer le projet.
- **Sass (SCSS)** : Préprocesseur CSS pour la gestion des styles.
- **Angular CLI** : Outil en ligne de commande pour la génération de composants et la gestion des builds.

### Backend (Express.js)

Le backend utilise **Express.js** pour gérer les requêtes HTTP et fournir une API RESTful. Il inclut également :

- **CORS** : Middleware pour permettre les requêtes entre le frontend (Angular) et le backend (Express).
- **Gestion des erreurs** : Un middleware dédié pour gérer les erreurs.

**Structure du backend** :
- `routes/` : Contient les fichiers des routes pour l'API.
- `controller/` : Contient les fichiers des controlleur pour l'API.
- `middlewares/` : Contient les middlewares (gestion d'erreurs, etc.).
- `config/` : Contient les fichiers de configuration (comme `config.js`).

## Gestion des environnements

### Fichiers d'environnement

L'application Angular utilise des fichiers d'environnement pour gérer les configurations spécifiques à chaque environnement. Voici les deux principaux fichiers :

- **`environment.ts`** : Fichier de configuration pour l'environnement de développement.
- **`environment.prod.ts`** : Fichier de configuration pour l'environnement de production.

#### Exemple de contenu de `environment.ts` :

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3100',  // URL de l'API pour le développement
  urlDSpace: 'http://localhost:8080',
  urlApiDspace: 'http://localhost:8080/server/api/core'
};
```

#### Exemple de contenu de `environment.prod.ts` :

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.production-domain.com',  // URL de l'API en production
  urlDSpace: 'https://dspace.production-domain.com',
  urlApiDspace: 'https://dspace.production-domain.com/server/api/core'
};
```

### Démarrer l'application avec le bon environnement

1. **Démarrer en mode développement** :

   Utilisez la commande suivante pour démarrer l'application en mode développement (en utilisant `environment.ts`) :

   ```bash
   ng serve
   ```

2. **Démarrer en mode production** :

   Pour construire l'application pour la production et utiliser `environment.prod.ts` :

   ```bash
   ng build --prod
   ```

  
