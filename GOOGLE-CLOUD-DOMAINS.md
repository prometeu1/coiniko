# Domaines Vercel à ajouter à Google Cloud Console

Pour que l'authentification Google fonctionne sur tous les domaines Vercel, vous devez ajouter les URLs suivantes à votre configuration OAuth dans Google Cloud Console.

## Origines JavaScript autorisées
Ajoutez tous ces domaines comme origines JavaScript autorisées :

```
http://localhost:3000
https://coiniko.vercel.app
https://coiniko-git-main-prometeu1s-projects.vercel.app
https://coiniko-e5mtcrlqk-prometeu1s-projects.vercel.app
https://coiniko-prometeu1s-projects.vercel.app
```

## URLs de redirection autorisées
Ajoutez toutes ces URLs comme redirections autorisées :

```
http://localhost:3000/api/auth/callback/google
https://coiniko.vercel.app/api/auth/callback/google
https://coiniko-git-main-prometeu1s-projects.vercel.app/api/auth/callback/google
https://coiniko-e5mtcrlqk-prometeu1s-projects.vercel.app/api/auth/callback/google
https://coiniko-prometeu1s-projects.vercel.app/api/auth/callback/google
```

## Instructions pour ajouter ces domaines

1. Accédez à la [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans "APIs & Services" > "Credentials"
4. Modifiez votre client OAuth 2.0
5. Ajoutez les origines JavaScript autorisées
6. Ajoutez les URLs de redirection autorisées
7. Cliquez sur "Enregistrer"

## Vérification

Après le déploiement, vérifiez que l'authentification fonctionne en visitant chacun de ces domaines et en vous connectant avec Google.

Si vous rencontrez toujours des problèmes :
1. Videz les cookies et le cache de votre navigateur
2. Vérifiez que les domaines ont été correctement ajoutés 
3. Attendez quelques minutes pour que les modifications prennent effet (parfois Google Cloud met du temps à propager les changements) 