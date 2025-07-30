
import React from 'react';
import { InitializationStep, StepStatus } from '../hooks/useInitialization';

// Icon components for different statuses
const StatusIcon: React.FC<{ status: StepStatus }> = ({ status }) => {
  switch (status) {
    case 'running':
      return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-secondary"></div>;
    case 'success':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'error':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'pending':
    default:
      return <div className="h-5 w-5 rounded-full border-2 border-gray-500"></div>;
  }
};

interface SplashScreenProps {
  steps: InitializationStep[];
}

const SplashScreen: React.FC<SplashScreenProps> = ({ steps }) => {
  return (
    <div className="fixed inset-0 bg-surface-main flex flex-col justify-center items-center z-50 animate-fade-in text-center">
        <h1 className="text-5xl font-bold text-text-primary animate-title-pulse">Gemini POS</h1>
        <div className="mt-8 w-full max-w-sm">
          <ul className="space-y-4">
            {steps.map((step, index) => (
              <li 
                key={step.id}
                className="flex items-center gap-4 text-left animate-fade-in-up"
                style={{ animationDelay: `${index * 150}ms`, opacity: 0 }}
              >
                <StatusIcon status={step.status} />
                <span className={`transition-colors duration-300 ${step.status === 'pending' ? 'text-text-secondary' : 'text-text-primary'}`}>
                  {step.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
    </div>
  );
};

export default SplashScreen;
