import React, { useState } from 'react';

interface MergeCategoryModalProps {
  sourceCategory: string;
  allCategories: string[];
  onMerge: (source: string, destination: string) => Promise<void>;
  onCancel: () => void;
}

const MergeCategoryModal: React.FC<MergeCategoryModalProps> = ({ sourceCategory, allCategories, onMerge, onCancel }) => {
    const destinationOptions = allCategories.filter(c => c !== sourceCategory);
    const [destinationCategory, setDestinationCategory] = useState(destinationOptions[0] || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleMerge = async () => {
        if (!destinationCategory) {
            setError('You must select a destination category.');
            return;
        }
        setError('');
        setIsSaving(true);
        try {
            await onMerge(sourceCategory, destinationCategory);
        } catch(e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setIsSaving(false);
        }
        // On success, parent handles closing.
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center animate-fade-in">
            <div className="bg-surface-card rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-text-primary mb-2">Merge '{sourceCategory}'</h2>
                <p className="text-text-secondary mb-6">
                    To delete a category, all of its products must be moved to another category. Select a destination below.
                </p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="destination-category" className="block text-sm font-medium text-text-secondary mb-2">
                            Move all products from '{sourceCategory}' into:
                        </label>
                        <select
                            id="destination-category"
                            value={destinationCategory}
                            onChange={(e) => setDestinationCategory(e.target.value)}
                            className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"
                            disabled={destinationOptions.length === 0}
                        >
                            {destinationOptions.length > 0 ? (
                                destinationOptions.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))
                            ) : (
                                <option value="">No other categories available</option>
                            )}
                        </select>
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md mt-4">{error}</p>}
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onCancel} disabled={isSaving} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-text-primary font-semibold transition-colors disabled:opacity-50">Cancel</button>
                    <button
                        onClick={handleMerge}
                        disabled={isSaving || !destinationCategory}
                        className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                        {isSaving ? 'Merging...' : 'Merge & Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MergeCategoryModal;