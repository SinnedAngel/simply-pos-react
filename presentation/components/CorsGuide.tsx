
import React, { useState, useEffect } from 'react';

interface ConnectionGuideProps {
  errorDetail: string | null;
  onRetry: () => void;
}

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-surface-main rounded-md p-4 relative font-mono text-sm text-gray-300">
      <pre><code>{code}</code></pre>
      <button 
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
};

const ConnectionGuide: React.FC<ConnectionGuideProps> = ({ errorDetail, onRetry }) => {
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);

    const supabaseDashboardUrl = "https://supabase.com/dashboard";
    const supabaseApiUrl = "https://supabase.com/dashboard/project/_/settings/api";

    return (
        <div className="bg-surface-card rounded-xl shadow-2xl p-8 w-full max-w-3xl mx-4 animate-fade-in">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-red-500">Connection Error</h1>
                <p className="text-text-secondary mt-2">
                    The application could not connect to the Supabase backend.
                </p>
            </div>
            
            <div className="space-y-8 text-left">
                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">Troubleshooting Steps</h2>
                    <ol className="list-decimal list-inside space-y-6 text-text-secondary">
                        <li>
                            <span className="font-semibold text-text-primary">Check Supabase Project Status:</span> Ensure your Supabase project is running and not paused due to inactivity.
                             <a href={supabaseDashboardUrl} target="_blank" rel="noopener noreferrer" className="block mt-2 px-4 py-2 rounded-md bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors text-center">
                                Open Supabase Dashboard
                            </a>
                        </li>
                        <li>
                            <span className="font-semibold text-text-primary">Verify Credentials:</span> Double-check that the <code className="bg-surface-main px-1 py-0.5 rounded mx-1">URL</code> and <code className="bg-surface-main px-1 py-0.5 rounded mx-1">ANON_KEY</code> in your <code className="bg-surface-main px-1 py-0.5 rounded mx-1">data/config.ts</code> file are correct.
                        </li>
                        <li>
                           <span className="font-semibold text-text-primary">Check CORS Settings:</span> If the project is running and credentials are correct, the issue may be security-related. Your browser requires Supabase to trust your application's URL.
                           <div className="mt-3 pl-4 border-l-2 border-gray-700">
                                <p className="mb-2">Copy your application's URL below:</p>
                                {origin ? <CodeBlock code={origin} /> : <p className="text-text-secondary">Detecting URL...</p>}
                                <p className="mt-3 mb-2">Then, go to your Supabase API settings and add it to the "CORS origins" list.</p>
                                <a href={supabaseApiUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">
                                    Open Supabase API Settings
                                </a>
                           </div>
                        </li>
                    </ol>
                </div>
                 {errorDetail && (
                    <div>
                        <h3 className="font-semibold text-text-primary mb-2">Original Error Details:</h3>
                        <div className="bg-surface-main rounded-md p-3 text-xs text-red-400 font-mono max-h-24 overflow-y-auto">
                            <pre>{errorDetail}</pre>
                        </div>
                    </div>
                )}
            </div>

            <div className="text-center mt-10">
                <button
                    onClick={onRetry}
                    className="w-full max-w-xs py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg transition-colors duration-300"
                >
                    I've checked everything, Try Again
                </button>
            </div>
        </div>
    );
};

export default ConnectionGuide;