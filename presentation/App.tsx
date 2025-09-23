
import React, { useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

// Hooks
import { useInitialization } from './hooks/useInitialization';

// Config
import { SUPABASE_CONFIG } from '../data/config';

// Components
import PosApp from './PosApp';
import LoginPage from './pages/LoginPage';
import SchemaInitializationGuide from './components/SchemaInitializationGuide';
import SchemaUpdateGuide from './components/SchemaUpdateGuide';
import ConnectionGuide from './components/CorsGuide'; // Renamed internally to ConnectionGuide
import SplashScreen from './pages/SplashScreen';
import LoadingSpinner from './components/LoadingSpinner';


function App() {
  // Memoize Supabase client to prevent re-creation on re-renders
  const supabaseClient = useMemo(() => {
    const { URL, ANON_KEY } = SUPABASE_CONFIG;
    if (!URL || !ANON_KEY || URL.startsWith('YOUR_')) {
      return null;
    }
    return createClient<Database>(URL, ANON_KEY);
  }, []);
  
  const { status, steps, error, useCases, authUseCases, retryInitialization } = useInitialization(supabaseClient);

  const handleLogin = async (username: string, passwordHash: string) => {
    if (!authUseCases) throw new Error("Authentication service is not available.");
    await authUseCases.login(username, passwordHash);
    // After a successful login, we re-run initialization to transition to the main app.
    retryInitialization();
  };

  const handleRetryAfterUpdate = () => {
    // After a schema update, the user's permissions may have changed.
    // The safest way to ensure they get the new permissions is to log them out,
    // which clears the stale session from local storage, and have them log back in.
    if (authUseCases) {
      authUseCases.logout();
    }
    retryInitialization();
  };
  
  const renderContent = () => {
     if (!supabaseClient) {
      return (
        <div className="bg-surface-card rounded-xl shadow-2xl p-8 w-full max-w-lg mx-4 text-center">
             <h1 className="text-3xl font-bold text-red-500">Configuration Error</h1>
             <p className="text-text-secondary mt-4">
               Supabase credentials are missing. Please add your Project URL and Anon Key to the 
               <code className="bg-surface-main px-1 py-0.5 rounded mx-1">data/config.ts</code> file.
             </p>
        </div>
      );
    }
    
    switch (status) {
      case 'initializing':
        return <SplashScreen steps={steps} />;
      
      case 'unauthenticated':
        return <LoginPage onLogin={handleLogin} />;
        
      case 'schema_required':
        return <SchemaInitializationGuide onRetry={retryInitialization} />;

      case 'schema_update_required':
        return <SchemaUpdateGuide onRetry={handleRetryAfterUpdate} />;

      case 'connection_error':
         return <ConnectionGuide errorDetail={error} onRetry={retryInitialization} />;
      
      case 'ready':
        if (!useCases || !authUseCases) return <LoadingSpinner message="Finalizing..." />;
        const readyProps = { ...useCases, authUseCases };
        return <PosApp {...readyProps} onSessionEnd={retryInitialization} />;
        
      default:
        return <SplashScreen steps={steps} />;
    }
  };

  return (
    <div className="min-h-screen font-sans bg-surface-main text-text-primary flex items-center justify-center">
      {renderContent()}
    </div>
  );
}

export default App;