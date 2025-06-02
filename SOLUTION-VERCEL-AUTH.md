# Solution pour l'authentification Google sur Vercel

## Problème identifié

Le problème était que NextAuth.js utilisait l'URL automatique de Vercel (`coiniko-e5mtcrlqk-prometeu1s-projects.vercel.app`) au lieu du domaine personnalisé (`coiniko.vercel.app`) pour les redirections après l'authentification.

## Corrections apportées

### 1. Fonction `getBaseUrl()` corrigée
- ✅ Force l'utilisation de `https://coiniko.vercel.app` en production
- ✅ Supprime la dépendance à `process.env.VERCEL_URL` qui pointe vers l'URL automatique

### 2. Configuration des cookies optimisée
- ✅ Supprime la restriction de domaine `.vercel.app` 
- ✅ Permet aux cookies de fonctionner correctement avec votre domaine personnalisé

### 3. Configuration Vercel mise à jour
- ✅ Force `NEXTAUTH_URL=https://coiniko.vercel.app` dans `vercel.json`
- ✅ Évite les conflits entre différentes URLs Vercel

## Étapes à suivre maintenant

### 1. Déployer les changements
```bash
git add .
git commit -m "Fix: Correction authentification Google sur Vercel"
git push
```

### 2. Vérifier les variables d'environnement sur Vercel
Allez dans votre dashboard Vercel > Settings > Environment Variables et assurez-vous que :
- `NEXTAUTH_URL` = `https://coiniko.vercel.app`
- `NEXTAUTH_SECRET` = votre secret (au moins 32 caractères)
- `GOOGLE_CLIENT_ID` = votre client ID Google
- `GOOGLE_CLIENT_SECRET` = votre secret client Google

### 3. Vérifier la configuration Google OAuth
Dans Google Cloud Console, assurez-vous que les URLs de redirection incluent :
- `https://coiniko.vercel.app/api/auth/callback/google`

**⚠️ N'incluez PAS** les URLs automatiques de Vercel comme `coiniko-e5mtcrlqk-prometeu1s-projects.vercel.app`

### 4. Définir le domaine principal sur Vercel
Dans Vercel Dashboard > Settings > Domains :
- Assurez-vous que `coiniko.vercel.app` est défini comme domaine principal
- Retirez ou désactivez les autres domaines automatiques

### 5. Test de la solution
1. Allez sur https://coiniko.vercel.app
2. Cliquez sur "Se connecter"
3. Choisissez votre compte Google
4. Vous devriez être redirigé vers la page d'accueil ET rester connecté

## Pourquoi ces changements fonctionnent

1. **URLs consistantes** : Tous les callbacks utilisent maintenant `coiniko.vercel.app`
2. **Cookies fonctionnels** : Suppression des restrictions de domaine qui causaient des problèmes
3. **Configuration forcée** : Plus de dépendance aux variables automatiques de Vercel
4. **Domaine principal** : Une seule URL canonique pour toute l'application

## Si le problème persiste

1. Vérifiez les logs Vercel pour des erreurs spécifiques
2. Videz le cache de votre navigateur
3. Testez en mode navigation privée
4. Vérifiez que la configuration Google OAuth est exacte

La solution devrait résoudre le problème de connexion où vous étiez redirigé vers la page d'accueil mais sans être connecté. 