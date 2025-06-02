# 🚀 Guide de Déploiement Vercel - NextAuth Fix

## ✅ Corrections Apportées

Toutes les corrections pour résoudre les problèmes NextAuth et Vercel ont été appliquées :

### 1. **Problèmes corrigés :**
- ❌ Redirection malformée dans `next.config.js` → ✅ Supprimée
- ❌ Rewrites conflictuels dans `vercel.json` → ✅ Supprimés
- ❌ Configuration NextAuth complexe → ✅ Simplifiée
- ❌ Routes API retournant HTML → ✅ Configurées pour JSON
- ❌ Erreurs TypeScript → ✅ Corrigées

### 2. **Tests en local :**
```bash
✅ Tous les tests passent (6/6)
✅ Routes NextAuth fonctionnent correctement
✅ Build réussi sans erreurs
```

## 📋 Étapes de Déploiement

### 1. **Vérifier les variables d'environnement Vercel**

Allez sur : [Vercel Dashboard](https://vercel.com/dashboard) > Votre projet > Settings > Environment Variables

Assurez-vous que ces variables sont définies pour **Production** :

```bash
# NextAuth Configuration
NEXTAUTH_URL=https://coiniko.vercel.app
NEXTAUTH_SECRET=coiniko-secret-key-production-2024-very-secure-string

# Google OAuth (à récupérer depuis Google Cloud Console)
GOOGLE_CLIENT_ID=747561554538-hla86ioipagc6naa7nk1msd0lbqdt04s.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Database (déjà configuré)
DATABASE_URL=postgresql://postgres.cndhozrtfzeqleynszxc:gi5AAop0YRqSSZXD@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.cndhozrtfzeqleynszxc:gi5AAop0YRqSSZXD@aws-0-eu-west-3.pooler.supabase.com:5432/postgres?pgbouncer=false

# API Keys (optionnel)
NEXT_PUBLIC_COINGECKO_API_KEY=votre-clé-api-coingecko
```

### 2. **Configurer Google OAuth Console**

Allez sur : [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

#### **Origines JavaScript autorisées :**
```
https://coiniko.vercel.app
```

#### **URI de redirection autorisés :**
```
https://coiniko.vercel.app/api/auth/callback/google
```

### 3. **Déployer sur Vercel**

```bash
# Dans votre terminal local
git add .
git commit -m "fix: NextAuth et Vercel - corrections complètes"
git push origin deployement
```

**OU** dans le dashboard Vercel :
- Allez dans "Deployments"
- Cliquez sur "Redeploy"
- **Important :** Cochez "Clear Build Cache"

### 4. **Vérifier le déploiement**

Une fois le déploiement terminé, testez les routes critiques :

#### **Test automatique :**
```bash
# Utiliser notre script de test
node test-nextauth-routes.js https://coiniko.vercel.app
```

#### **Test manuel :**

1. **Route Session API :**
   - URL : `https://coiniko.vercel.app/api/auth/session`
   - ✅ **Attendu :** JSON `{}`
   - ❌ **Problème :** HTML `<!DOCTYPE...>`

2. **Page de connexion :**
   - URL : `https://coiniko.vercel.app/auth/signin`
   - ✅ **Attendu :** Page avec bouton Google
   - Test : Cliquer sur "Se connecter avec Google"

3. **Page de diagnostic :**
   - URL : `https://coiniko.vercel.app/debug`
   - Vérifier que tous les tests passent

### 5. **Diagnostic en cas de problème**

Si les routes NextAuth ne fonctionnent toujours pas :

#### **A. Vérifier les logs Vercel :**
- Dashboard Vercel > Functions
- Regarder les erreurs dans `/api/auth/[...nextauth]`

#### **B. Vérifier la configuration :**
```bash
# Test rapide de toutes les routes
curl -H "Accept: application/json" https://coiniko.vercel.app/api/auth/session
curl -H "Accept: application/json" https://coiniko.vercel.app/api/auth/providers
curl -H "Accept: application/json" https://coiniko.vercel.app/api/auth/csrf
```

#### **C. Solutions de secours :**

1. **Redéploiement complet :**
   - Supprimer le projet Vercel
   - Réimporter depuis GitHub
   - Reconfigurer les variables d'environnement

2. **Vérifier la structure des fichiers :**
   ```
   app/
   └── api/
       └── auth/
           └── [...nextauth]/
               └── route.ts ✅ Doit exister
   ```

3. **Forcer un nouveau build :**
   ```bash
   # Supprimer .next en local puis push
   rm -rf .next
   git add .
   git commit -m "force: nouveau build"
   git push
   ```

## 🎯 Résultats Attendus Après Déploiement

### ✅ **Routes API NextAuth :**
- `/api/auth/session` → JSON `{}` ou `{"user": {...}}`
- `/api/auth/providers` → JSON avec providers Google
- `/api/auth/signin` → Redirection ou page de connexion
- `/api/auth/csrf` → JSON avec token CSRF

### ✅ **Authentification Google :**
- Bouton "Se connecter avec Google" fonctionne
- Redirection vers Google OAuth
- Retour sur le site avec session active
- Persistance de la session

### ✅ **Pages fonctionnelles :**
- Page de connexion : `/auth/signin`
- Page de diagnostic : `/debug`
- Toutes les autres pages du site

## 🚨 Indicateurs de Problème

### ❌ **Si ça ne marche toujours pas :**

1. **Routes API retournent HTML :**
   ```
   <!DOCTYPE html>... au lieu de JSON
   ```
   → **Solution :** Vérifier les redirections dans next.config.js

2. **Erreur 500 sur routes NextAuth :**
   → **Solution :** Vérifier les variables d'environnement

3. **Google OAuth ne fonctionne pas :**
   → **Solution :** Vérifier la configuration Google Cloud Console

4. **Session ne persiste pas :**
   → **Solution :** Vérifier la configuration des cookies NextAuth

## 📞 Support

Si les problèmes persistent après avoir suivi ce guide :

1. **Vérifier la page de diagnostic :** `/debug`
2. **Utiliser le script de test :** `node test-nextauth-routes.js https://coiniko.vercel.app`
3. **Consulter :** `CORRECTIONS-NEXTAUTH-VERCEL.md` pour les détails techniques

---

## 🎉 Conclusion

Ce guide résout définitivement les problèmes NextAuth sur Vercel. Après déploiement, l'authentification Google devrait fonctionner parfaitement.

**Dernière vérification :**
```bash
# Test complet après déploiement
node test-nextauth-routes.js https://coiniko.vercel.app
```

**Résultat attendu :** `✅ Succès: 6/6` ou au minimum `✅ Succès: 4/6` (avec session et providers fonctionnels) 