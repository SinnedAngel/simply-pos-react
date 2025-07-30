
import { useState, useEffect, useMemo, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types';

// Repositories
import { ProductRepository } from '../../data/ProductRepository';
import { AuthRepository } from '../../data/AuthRepository';
import { StorageRepository } from '../../data/StorageRepository';
import { SalesRepository } from '../../data/SalesRepository';
import { IngredientRepository } from '../../data/IngredientRepository';
import { ConversionRepository } from '../../data/ConversionRepository';


// Use Cases
import { ProductUseCases, OrderUseCases, AuthUseCases, MediaUseCases, SalesUseCases, InventoryUseCases, ConversionUseCases } from '../../domain/use-cases';

export type InitializationStatus =
  | 'initializing'
  | 'unauthenticated'
  | 'schema_required'
  | 'schema_update_required'
  | 'connection_error'
  | 'ready';

export type StepStatus = 'pending' | 'running' | 'success' | 'error';
export interface InitializationStep {
  id: string;
  name: string;
  status: StepStatus;
}

export type UseCaseBundle = {
  productUseCases: ProductUseCases;
  orderUseCases: OrderUseCases;
  mediaUseCases: MediaUseCases;
  salesUseCases: SalesUseCases;
  inventoryUseCases: InventoryUseCases;
  conversionUseCases: ConversionUseCases;
};

// This constant should be incremented whenever a breaking schema change is made.
const LATEST_SCHEMA_VERSION = 8;

// A helper function to ensure a minimum time passes, for better UX
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const initialSteps: InitializationStep[] = [
    { id: 'connection', name: 'Connecting to Supabase', status: 'pending' },
    { id: 'schema', name: 'Verifying Database Schema', status: 'pending' },
    { id: 'auth', name: 'Checking User Session', status: 'pending' },
];


export const useInitialization = (supabaseClient: SupabaseClient<Database> | null) => {
  const [status, setStatus] = useState<InitializationStatus>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [useCases, setUseCases] = useState<UseCaseBundle | null>(null);
  const [steps, setSteps] = useState<InitializationStep[]>(initialSteps);

  const authUseCases = useMemo(() => {
    if (!supabaseClient) return null;
    const authRepository = new AuthRepository(supabaseClient);
    return new AuthUseCases(authRepository);
  }, [supabaseClient]);

  const updateStep = (id: string, newStatus: StepStatus) => {
    setSteps(currentSteps => currentSteps.map(step => 
      step.id === id ? { ...step, status: newStatus } : step
    ));
  };

  const runInitialization = useCallback(async () => {
    setSteps(initialSteps); // Reset for retries
    setStatus('initializing');
    setError(null);
    
    try {
      if (!supabaseClient || !authUseCases) {
        setStatus('connection_error');
        setError('Supabase client could not be initialized. Please ensure your credentials in data/config.ts are correct.');
        return;
      }
      
      await wait(300); // Small delay to allow fade-in animation

      // --- Step 1: Test Supabase Connection ---
      updateStep('connection', 'running');
      await wait(500);
      const { error: connectionError } = await supabaseClient.storage.listBuckets();
      
      if (connectionError) {
        updateStep('connection', 'error');
        setError(`Original Error: ${connectionError.message || 'A network error occurred.'}`);
        setStatus('connection_error');
        return;
      }
      updateStep('connection', 'success');

      // --- Step 2: Verify Database Schema via Versioning ---
      updateStep('schema', 'running');
      await wait(500);

      const { data: migrationData, error: migrationError } = await (supabaseClient
        .from('schema_migrations') as any)
        .select('version')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (migrationError && migrationError.code === '42P01') {
        // 'schema_migrations' table doesn't exist. This is a fresh install.
        updateStep('schema', 'error');
        setError("Database schema not found. Please follow the setup guide.");
        setStatus('schema_required');
        return;
      } else if (migrationError) {
        // Any other database error during this check is treated as a connection problem.
        updateStep('schema', 'error');
        setError(`Failed to check schema version: ${migrationError.message}`);
        setStatus('connection_error');
        return;
      }

      // If we are here, the `schema_migrations` table exists. Check the version.
      const currentVersion = migrationData?.version ?? 0;

      if (currentVersion < LATEST_SCHEMA_VERSION) {
        // Schema is not the correct version, an update/reset is required.
        updateStep('schema', 'error');
        setError(`Your database schema (v${currentVersion}) needs to be updated to v${LATEST_SCHEMA_VERSION}.`);
        setStatus('schema_update_required');
        return;
      }

      // If we've reached this point, the schema is considered up-to-date.
      updateStep('schema', 'success');

      // --- Step 3: Check Authentication ---
      updateStep('auth', 'running');
      await wait(500);
      const session = authUseCases.getSession();

      if (!session) {
        updateStep('auth', 'success');
        await wait(300);
        setStatus('unauthenticated');
        return;
      }
      updateStep('auth', 'success');

      // --- Step 4: Initialization Successful, Load App ---
      const productRepository = new ProductRepository(supabaseClient);
      const storageRepository = new StorageRepository(supabaseClient);
      const salesRepository = new SalesRepository(supabaseClient);
      const ingredientRepository = new IngredientRepository(supabaseClient);
      const conversionRepository = new ConversionRepository(supabaseClient);
      
      const appUseCases = {
        productUseCases: new ProductUseCases(productRepository),
        orderUseCases: new OrderUseCases(),
        mediaUseCases: new MediaUseCases(storageRepository),
        salesUseCases: new SalesUseCases(salesRepository),
        inventoryUseCases: new InventoryUseCases(ingredientRepository),
        conversionUseCases: new ConversionUseCases(conversionRepository),
      };
      setUseCases(appUseCases);
      
      await wait(500); // Final pause for smooth transition
      setStatus('ready');

    } catch (e: any) {
      // Catch any other synchronous errors or unhandled promise rejections.
      const friendlyError = `An unexpected error occurred: ${e.message || 'Please check the console for details.'}`;
      setError(friendlyError);
      setStatus('connection_error');
      // Mark any running step as failed
      setSteps(currentSteps => currentSteps.map(step => step.status === 'running' ? {...step, status: 'error'} : step));
    }
  }, [supabaseClient, authUseCases]);
  
  // This effect runs the initialization once when the component mounts.
  useEffect(() => {
    runInitialization();
  }, [runInitialization]); // Dependency array ensures it only runs once per client instance.


  return { 
    status, 
    steps,
    error, 
    useCases, 
    authUseCases, 
    retryInitialization: runInitialization 
  };
};
