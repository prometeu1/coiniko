# Configuration Google OAuth pour Coiniko sur Vercel

## URLs de redirection autorisées dans Google Cloud Console

Pour que l'authentification Google fonctionne correctement sur Vercel, vous devez configurer les URLs de redirection suivantes dans votre projet Google Cloud Console :

### 1. Accédez à Google Cloud Console
- Allez sur [Google Cloud Console](https://console.cloud.google.com/)
- Sélectionnez votre projet (ou créez-en un nouveau)

### 2. Activez l'API Google+ 
- Dans le menu de navigation, allez dans "APIs & Services" > "Library"
- Recherchez "Google+ API" et activez-la

### 3. Configurez l'écran de consentement OAuth
- Allez dans "APIs & Services" > "OAuth consent screen"
- Configurez les informations de votre application

### 4. Créez des identifiants OAuth 2.0
- Allez dans "APIs & Services" > "Credentials"
- Cliquez sur "Create Credentials" > "OAuth 2.0 Client ID"
- Choisissez "Web application"

### 5. Configurez les URLs autorisées

#### Origines JavaScript autorisées :
```
http://localhost:3000
https://coiniko.vercel.app
```

#### URLs de redirection autorisées :
```
http://localhost:3000/api/auth/callback/google
https://coiniko.vercel.app/api/auth/callback/google
```

⚠️ **IMPORTANT** : N'incluez PAS les URLs automatiques de Vercel (comme `coiniko-e5mtcrlqk-prometeu1s-projects.vercel.app`) car elles changent à chaque déploiement.

### 6. Variables d'environnement à configurer sur Vercel

Dans votre dashboard Vercel, allez dans Settings > Environment Variables et ajoutez :

```
NEXTAUTH_URL=https://coiniko.vercel.app
NEXTAUTH_SECRET=votre-secret-tres-long-et-securise
GOOGLE_CLIENT_ID=votre-client-id-google.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-votre-client-secret-google
DATABASE_URL=votre-url-de-base-de-donnees
```

### 7. Configuration du domaine personnalisé Vercel

1. Dans votre dashboard Vercel, allez dans Settings > Domains
2. Ajoutez `coiniko.vercel.app` comme domaine personnalisé
3. Définissez-le comme domaine principal

### Dépannage

Si l'authentification ne fonctionne toujours pas :

1. Vérifiez que les URLs dans Google Cloud Console correspondent exactement
2. Assurez-vous que `NEXTAUTH_URL` est défini sur `https://coiniko.vercel.app`
3. Videz le cache de votre navigateur
4. Vérifiez les logs Vercel pour des erreurs spécifiques

### Test de la configuration

Pour tester que tout fonctionne :

1. Allez sur https://coiniko.vercel.app
2. Cliquez sur "Se connecter"
3. Choisissez Google
4. Après l'authentification, vous devriez être redirigé vers la page d'accueil ET être connecté 