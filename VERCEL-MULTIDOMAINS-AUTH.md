# Configuration de NextAuth pour plusieurs domaines Vercel

Ce guide explique comment configurer NextAuth.js pour qu'il fonctionne correctement avec tous les domaines générés par Vercel pendant le déploiement.

## Problème

Lorsque vous déployez une application Next.js avec NextAuth sur Vercel, plusieurs URLs sont générées :

- URL principale : `https://votre-projet.vercel.app`
- URL de déploiement : `https://votre-projet-commit-hash-username.vercel.app`
- URL de branches git : `https://votre-projet-git-branche-username.vercel.app`

Par défaut, NextAuth ne reconnaîtra que l'URL configurée dans `NEXTAUTH_URL` pour les redirections, ce qui provoque des erreurs d'authentification lorsque vous accédez à l'application via les autres domaines.

## Solution

### 1. Modifier la fonction getBaseUrl()

Dans `app/api/auth/[...nextauth]/route.ts`, utilisez une fonction `getBaseUrl()` qui détecte automatiquement le domaine actuel :

```javascript
const getBaseUrl = () => {
  // Si l'URL de requête est disponible, l'utiliser en priorité
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  // Pour les déploiements Vercel
  if (process.env.VERCEL) {
    // Accepter n'importe quelle URL de déploiement Vercel
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    
    // URL par défaut du projet
    return 'https://votre-projet.vercel.app';
  }
  
  // En développement
  return 'http://localhost:3000';
};
```

### 2. Configurer le callback de redirection

Modifiez le callback de redirection pour accepter toutes les URLs de votre projet :

```javascript
async redirect({ url, baseUrl }) {
  const actualBaseUrl = getBaseUrl();
  
  console.log('Redirect callback:', { url, baseUrl: actualBaseUrl });
  
  // Si l'URL commence par une barre oblique, c'est une URL relative
  if (url.startsWith('/')) {
    return `${actualBaseUrl}${url}`;
  }
  
  // Accepter les redirections vers des sous-domaines Vercel de ce projet
  const vercelDomains = [
    'votre-projet.vercel.app',
    'votre-projet-git-main-username.vercel.app',
    'votre-projet-commit-username.vercel.app'
    // Ajoutez tous les domaines possibles
  ];
  
  if (vercelDomains.some(domain => url.includes(domain))) {
    return url;
  }
  
  // Si l'URL correspond au domaine de base
  if (url.startsWith(actualBaseUrl)) {
    return url;
  }
  
  // Sinon, rediriger vers la page d'accueil
  return actualBaseUrl;
}
```

### 3. Configurer les cookies

Pour que les cookies fonctionnent sur tous les domaines, ne spécifiez pas de domaine :

```javascript
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      domain: undefined // Ne pas spécifier de domaine
    }
  }
}
```

### 4. Configuration Google OAuth

Dans la console Google Cloud, assurez-vous d'ajouter tous les domaines Vercel de votre projet :

#### Origines JavaScript autorisées :
```
http://localhost:3000
https://votre-projet.vercel.app
https://votre-projet-git-main-username.vercel.app
https://votre-projet-commit-username.vercel.app
```

#### URLs de redirection autorisées :
```
http://localhost:3000/api/auth/callback/google
https://votre-projet.vercel.app/api/auth/callback/google
https://votre-projet-git-main-username.vercel.app/api/auth/callback/google
https://votre-projet-commit-username.vercel.app/api/auth/callback/google
```

### 5. Test des domaines

Utilisez le script `test-auth-domains.js` pour vérifier que l'authentification fonctionne sur tous les domaines :

```bash
node test-auth-domains.js
```

## Variables d'environnement Vercel

Dans votre dashboard Vercel, configurez les variables d'environnement suivantes :

- `NEXTAUTH_URL` : URL principale de votre application (ex: https://votre-projet.vercel.app)
- `NEXTAUTH_SECRET` : Une chaîne sécurisée pour le chiffrement
- `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` : Vos identifiants OAuth Google

## Dépannage

Si l'authentification ne fonctionne toujours pas sur certains domaines :

1. Vérifiez les redirections dans les logs Vercel
2. Assurez-vous que tous les domaines sont ajoutés dans la console Google Cloud
3. Videz le cache et les cookies de votre navigateur
4. Testez en navigation privée 