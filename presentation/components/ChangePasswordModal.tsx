
import React, { useState } from 'react';
import { ListedUser } from '../../domain/entities';
import { hashPassword } from '../utils/crypto';

interface ChangePasswordModalProps {
  user: ListedUser;
  onSave: (userId: string, passwordHash: string) => Promise<void>;
  onCancel: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ user, onSave, onCancel }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!password) {
            setError('Password cannot be empty.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setError('');
        setIsSaving(true);
        try {
            const hashedPassword = await hashPassword(password);
            await onSave(user.id, hashedPassword);
        } catch(e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center animate-fade-in">
            <div className="bg-surface-card rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-text-primary mb-2">Change Password</h2>
                <p className="text-text-secondary mb-6">Set a new password for <span className="font-semibold text-text-primary">{user.username}</span>.</p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-text-secondary mb-2">New Password</label>
                        <input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"
                            placeholder="Min. 6 characters" />
                    </div>
                    <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-text-secondary mb-2">Confirm New Password</label>
                        <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"
                            placeholder="Re-enter new password" />
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md mt-4">{error}</p>}
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onCancel} disabled={isSaving} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-text-primary font-semibold transition-colors disabled:opacity-50">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 rounded-md bg-brand-primary hover:bg-brand-secondary text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                        {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;