"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function DebugPage() {
  const { data: session, status } = useSession();
  const [apiTests, setApiTests] = useState<Record<string, any>>({});

  const testAPI = async (path: string, expectJson: boolean = true) => {
    try {
      const response = await fetch(path);
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      
      let data;
      if (isJson) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text.substring(0, 200) + '...';
      }

      return {
        status: response.status,
        contentType,
        isJson,
        expectJson,
        success: expectJson ? isJson : !isJson,
        data
      };
    } catch (error) {
      return {
        status: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  };

  useEffect(() => {
    const runTests = async () => {
      const tests = {
        session: await testAPI('/api/auth/session'),
        providers: await testAPI('/api/auth/providers'),
        csrf: await testAPI('/api/auth/csrf'),
        coinmarketcap: await testAPI('/api/coinmarketcap')
      };
      setApiTests(tests);
    };

    runTests();
  }, []);

  const getStatusIcon = (success: boolean) => success ? '✅' : '❌';
  const getSessionIcon = (status: string) => {
    switch (status) {
      case 'authenticated': return '✅';
      case 'unauthenticated': return '🔒';
      case 'loading': return '⏳';
      default: return '❓';
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="bg-card rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-6">🔍 Page de Diagnostic NextAuth</h1>
        
        {/* Session Status */}
        <div className="mb-8 p-4 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-4">
            {getSessionIcon(status)} État de la Session
          </h2>
          <div className="space-y-2">
            <p><strong>Status:</strong> {status}</p>
            {session ? (
              <>
                <p><strong>User ID:</strong> {session.user?.id || 'Non défini'}</p>
                <p><strong>Email:</strong> {session.user?.email || 'Non défini'}</p>
                <p><strong>Name:</strong> {session.user?.name || 'Non défini'}</p>
              </>
            ) : (
              <p>Aucune session active</p>
            )}
          </div>
        </div>

        {/* Environment Info */}
        <div className="mb-8 p-4 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-4">🌍 Informations d'Environnement</h2>
          <div className="space-y-2">
            <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV || 'Non défini'}</p>
            <p><strong>URL actuelle:</strong> {typeof window !== 'undefined' ? window.location.origin : 'SSR'}</p>
            <p><strong>User Agent:</strong> {typeof window !== 'undefined' ? navigator.userAgent.substring(0, 100) + '...' : 'SSR'}</p>
          </div>
        </div>

        {/* API Tests */}
        <div className="mb-8 p-4 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-4">🧪 Tests des Routes API</h2>
          <div className="space-y-4">
            {Object.entries(apiTests).map(([name, test]) => (
              <div key={name} className="p-3 bg-background rounded border">
                <h3 className="font-medium flex items-center gap-2">
                  {getStatusIcon(test.success)} {name.toUpperCase()}
                  <span className="text-sm text-muted-foreground">
                    (Status: {test.status})
                  </span>
                </h3>
                <div className="mt-2 text-sm space-y-1">
                  <p><strong>Content-Type:</strong> {test.contentType || test.error}</p>
                  <p><strong>Attendu JSON:</strong> {test.expectJson ? 'Oui' : 'Non'}</p>
                  <p><strong>Est JSON:</strong> {test.isJson ? 'Oui' : 'Non'}</p>
                  {test.error && <p className="text-red-500"><strong>Erreur:</strong> {test.error}</p>}
                  {test.data && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-blue-500">Voir les données</summary>
                      <pre className="mt-2 p-2 bg-muted text-xs overflow-auto">
                        {typeof test.data === 'string' ? test.data : JSON.stringify(test.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-4">⚡ Actions Rapides</h2>
          <div className="space-y-2">
            <a 
              href="/api/auth/session" 
              target="_blank" 
              className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Tester /api/auth/session
            </a>
            <a 
              href="/api/auth/signin" 
              target="_blank" 
              className="inline-block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-2"
            >
              Tester /api/auth/signin
            </a>
            <a 
              href="/auth/signin" 
              className="inline-block bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 ml-2"
            >
              Page de connexion
            </a>
            <button 
              onClick={() => window.location.reload()} 
              className="inline-block bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 ml-2"
            >
              Actualiser les tests
            </button>
          </div>
        </div>

        {/* Diagnostic Summary */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">📋 Résumé Diagnostic</h2>
          <div className="text-sm text-yellow-700 space-y-2">
            {status === 'authenticated' ? (
              <p>✅ L'authentification fonctionne correctement</p>
            ) : (
              <p>⚠️ Aucune session active - utilisez la page de connexion</p>
            )}
            
            {apiTests.session?.success ? (
              <p>✅ Route /api/auth/session fonctionne (retourne JSON)</p>
            ) : (
              <p>❌ Route /api/auth/session ne fonctionne pas (retourne HTML au lieu de JSON)</p>
            )}
            
            {apiTests.providers?.success ? (
              <p>✅ Route /api/auth/providers fonctionne</p>
            ) : (
              <p>❌ Route /api/auth/providers ne fonctionne pas</p>
            )}
            
            {apiTests.coinmarketcap?.success ? (
              <p>✅ Autres routes API fonctionnent correctement</p>
            ) : (
              <p>❌ Problème général avec les routes API</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 