import React, { useState } from 'react';

interface EditCategoryModalProps {
  categoryName: string;
  onSave: (oldName: string, newName: string) => Promise<void>;
  onCancel: () => void;
}

const EditCategoryModal: React.FC<EditCategoryModalProps> = ({ categoryName, onSave, onCancel }) => {
    const [newName, setNewName] = useState(categoryName);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!newName.trim()) {
            setError('Category name cannot be empty.');
            return;
        }
        setError('');
        setIsSaving(true);
        try {
            await onSave(categoryName, newName);
        } catch(e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setIsSaving(false);
        }
        // On success, the parent will close the modal, which will unmount this component.
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center animate-fade-in">
              <div className="bg-surface-card rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
                 <h2 className="text-2xl font-bold text-text-primary mb-6">Rename Category</h2>
                 <div className="space-y-4">
                     <div>
                        <label htmlFor="edit-category-name" className="block text-sm font-medium text-text-secondary mb-2">Category Name</label>
                        <input id="edit-category-name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"/>
                     </div>
                 </div>
                 {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md mt-4">{error}</p>}
                 <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onCancel} disabled={isSaving} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-text-primary font-semibold transition-colors disabled:opacity-50">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving || newName === categoryName} className="px-4 py-2 rounded-md bg-brand-primary hover:bg-brand-secondary text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                        {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                 </div>
              </div>
         </div>
    );
};

export default EditCategoryModal;