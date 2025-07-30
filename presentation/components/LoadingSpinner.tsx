
import React from 'react';

interface LoadingSpinnerProps {
    message: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
    return (
        <div className="flex flex-col justify-center items-center h-64 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-secondary"></div>
            <p className="mt-4 text-text-secondary">{message}</p>
        </div>
    );
};

export default LoadingSpinner;
