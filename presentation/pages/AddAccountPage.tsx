
import React, { useState, useEffect, useCallback } from 'react';
import { AuthUseCases } from '../../domain/use-cases';
import { ListedUser, Role } from '../../domain/entities';
import LoadingSpinner from '../components/LoadingSpinner';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import ConfirmModal from '../components/ConfirmModal';
import { hashPassword } from '../utils/crypto';
import EditUserModal from '../components/EditUserModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { KeyIcon } from '../components/icons/KeyIcon';


interface AccountManagementPageProps {
  useCases: AuthUseCases;
}

const AccountManagementPage: React.FC<AccountManagementPageProps> = ({ useCases }) => {
  // State for data lists
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listMessage, setListMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // State for the create form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // State for modals
  const [userToEdit, setUserToEdit] = useState<ListedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<ListedUser | null>(null);
  const [userToChangePassword, setUserToChangePassword] = useState<ListedUser | null>(null);
  const session = useCases.getSession();


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setListMessage(null);
    try {
      const [fetchedUsers, fetchedRoles] = await Promise.all([
          useCases.getUsers(),
          useCases.getRoles()
      ]);
      setUsers(fetchedUsers);
      setRoles(fetchedRoles);
      // Set default role for the creation form
      if (fetchedRoles.length > 0) {
          const defaultRole = fetchedRoles.find(r => r.name === 'cashier') || fetchedRoles[0];
          setNewRole(defaultRole.name);
      }

    } catch (err) {
      setListMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load page data.' });
    } finally {
      setIsLoading(false);
    }
  }, [useCases]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setCreateError('Username and password cannot be empty.');
      setCreateSuccess('');
      return;
    }
    if (newPassword.length < 6) {
      setCreateError('Password must be at least 6 characters long.');
      setCreateSuccess('');
      return;
    }

    setCreateError('');
    setCreateSuccess('');
    setIsCreating(true);

    try {
      const hashedPassword = await hashPassword(newPassword);
      await useCases.createUser(newUsername, hashedPassword, newRole);
      setCreateSuccess(`Successfully created account for "${newUsername}"!`);
      // Clear form and refetch list
      setNewUsername('');
      setNewPassword('');
      await fetchData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveUser = async (updatedUser: Pick<ListedUser, 'id' | 'username' | 'role'>) => {
    try {
        await useCases.updateUser(updatedUser);
        await fetchData(); // Refresh list before closing modal
        setUserToEdit(null);
        setListMessage({type: 'success', text: `Successfully updated user "${updatedUser.username}"!`});
        setTimeout(() => setListMessage(null), 4000);
    } catch (err) {
        // Re-throw so the modal can catch it and display it.
        throw err;
    }
  };

  const handleSavePassword = async (userId: string, passwordHash: string) => {
    try {
        await useCases.updatePassword(userId, passwordHash);
        const updatedUsername = userToChangePassword?.username;
        setUserToChangePassword(null);
        setListMessage({ type: 'success', text: `Password for "${updatedUsername}" updated successfully!` });
        setTimeout(() => setListMessage(null), 4000);
    } catch (err) {
        // Re-throw so the modal can display it
        throw err;
    }
  };
  
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    const deletedUserName = userToDelete.username;
    try {
        await useCases.deleteUser(userToDelete.id);
        await fetchData(); // Refresh list before closing modal
        setUserToDelete(null);
        setListMessage({ type: 'success', text: `User "${deletedUserName}" was deleted.`});
        setTimeout(() => setListMessage(null), 4000);
    } catch(err) {
        setListMessage({ type: 'error', text: err instanceof Error ? err.message : "Failed to delete user."});
        setUserToDelete(null); // Close modal even on error
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
      {userToEdit && <EditUserModal user={userToEdit} roles={roles} onSave={handleSaveUser} onCancel={() => setUserToEdit(null)} />}
      {userToChangePassword && <ChangePasswordModal user={userToChangePassword} onSave={handleSavePassword} onCancel={() => setUserToChangePassword(null)} />}
      {userToDelete && (
        <ConfirmModal
          title="Delete User"
          message={`Are you sure you want to permanently delete the user "${userToDelete.username}"? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={handleDeleteUser}
          onCancel={() => setUserToDelete(null)}
        />
      )}

      {/* --- Create User Form --- */}
      <div className="bg-surface-card rounded-xl shadow-xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-text-primary mb-1">Create New Account</h2>
        <p className="text-text-secondary mb-6">Create a new user or admin account for the POS system.</p>
        <form onSubmit={handleCreateSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <label htmlFor="new-username" className="block text-sm font-medium text-text-secondary mb-2">Username</label>
              <input id="new-username" type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} disabled={isCreating}
                className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none disabled:opacity-50"
                placeholder="e.g., jane.doe" />
            </div>
            <div className="md:col-span-1">
              <label htmlFor="new-password" className="block text-sm font-medium text-text-secondary mb-2">Password</label>
              <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isCreating}
                className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none disabled:opacity-50"
                placeholder="Min. 6 characters" />
            </div>
            <div className="md:col-span-1">
               <label htmlFor="role" className="block text-sm font-medium text-text-secondary mb-2">Role</label>
                <select id="role" value={newRole} onChange={(e) => setNewRole(e.target.value)} disabled={isCreating || isLoading}
                className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none disabled:opacity-50 capitalize">
                    {roles.map(role => (
                        <option key={role.id} value={role.name} className="capitalize">{role.name}</option>
                    ))}
                </select>
            </div>
          </div>
          {createError && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md">{createError}</p>}
          {createSuccess && <p className="text-green-400 text-sm text-center bg-green-500/10 p-3 rounded-md">{createSuccess}</p>}
          <div className="pt-2">
            <button type="submit" disabled={isCreating || isLoading}
              className="w-full mt-2 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isCreating && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>}
              {isCreating ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>

      {/* --- Existing Users List --- */}
      <div className="bg-surface-card rounded-xl shadow-xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Existing Accounts</h2>
        {listMessage && <p className={`text-sm text-center p-3 rounded-md mb-4 ${listMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{listMessage.text}</p>}
        {isLoading ? <LoadingSpinner message="Loading accounts..." /> : (
            <div className="space-y-3">
                {users.map(user => (
                    <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-surface-main p-4 sm:p-3 rounded-lg gap-4 sm:gap-2">
                        <div>
                            <span className="font-semibold text-text-primary">{user.username}</span>
                            <span className={`ml-0 sm:ml-3 mt-1 sm:mt-0 block sm:inline-block px-2 py-0.5 text-xs rounded-full capitalize ${user.role === 'admin' ? 'bg-brand-accent/20 text-brand-accent' : 'bg-gray-600 text-text-secondary'}`}>
                                {user.role}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                            <button onClick={() => setUserToChangePassword(user)} className="p-2 text-text-secondary hover:text-brand-accent transition-colors" title="Change Password">
                                <KeyIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setUserToEdit(user)} className="p-2 text-text-secondary hover:text-brand-accent transition-colors" title="Edit User">
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setUserToDelete(user)} disabled={user.id === session?.id} className="p-2 text-text-secondary hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Delete User">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
        { !isLoading && users.length === 0 && <p className="text-text-secondary text-center py-4">No other user accounts found.</p> }
      </div>
    </div>
  );
};

export default AccountManagementPage;
