
import React, { useState, useEffect, useCallback } from 'react';
import { AuthUseCases } from '../../domain/use-cases';
import { Role } from '../../domain/entities';
import LoadingSpinner from '../components/LoadingSpinner';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { LockClosedIcon } from '../components/icons/LockClosedIcon';
import ConfirmModal from '../components/ConfirmModal';
import EditRoleModal from '../components/EditRoleModal';
import { ChevronDownIcon } from '../components/icons/ChevronDownIcon';


const ALL_PERMISSIONS = [
    { id: 'view_reports', label: 'View Reports', description: 'Can view the sales and performance reports page.' },
    { id: 'manage_menu', label: 'Manage Menu', description: 'Can add, edit, and delete products from the menu.' },
    { id: 'manage_categories', label: 'Manage Categories', description: 'Can rename and merge product categories.' },
    { id: 'manage_media', label: 'Manage Media', description: 'Can upload and delete images in the media library.' },
    { id: 'manage_accounts', label: 'Manage Accounts', description: 'Can create, edit, and delete user accounts.' },
    { id: 'manage_roles', label: 'Manage Roles & Permissions', description: 'Can create roles and assign permissions.' },
    { id: 'manage_inventory', label: 'Manage Inventory', description: 'Can add, edit, and delete ingredients.' },
    { id: 'manage_conversions', label: 'Manage Conversions', description: 'Can manage unit conversion rules.' },
];

const PermissionCheckbox: React.FC<{
  permission: typeof ALL_PERMISSIONS[0];
  isChecked: boolean;
  onChange: (id: string, checked: boolean) => void;
  isDisabled: boolean;
}> = ({ permission, isChecked, onChange, isDisabled }) => {
  return (
    <label className={`flex items-start gap-3 p-3 rounded-md transition-colors ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-surface-main/50'}`}>
        <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onChange(permission.id, e.target.checked)}
            disabled={isDisabled}
            className="mt-1 h-4 w-4 rounded border-gray-500 bg-surface-main text-brand-secondary focus:ring-brand-secondary disabled:cursor-not-allowed"
        />
        <div>
            <span className="font-semibold text-text-primary">{permission.label}</span>
            <p className="text-sm text-text-secondary">{permission.description}</p>
        </div>
    </label>
  )
}


const RoleListItem: React.FC<{
    role: Role;
    permissions: string[];
    onSavePermissions: (roleId: string, permissions: string[]) => Promise<void>;
    onEdit: (role: Role) => void;
    onDelete: (role: Role) => void;
}> = ({ role, permissions, onSavePermissions, onEdit, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentPermissions, setCurrentPermissions] = useState(new Set(permissions));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    
    const isProtected = role.name === 'admin';

    const handleCheckboxChange = (permissionId: string, isChecked: boolean) => {
        setCurrentPermissions(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(permissionId);
            } else {
                newSet.delete(permissionId);
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        setError('');
        setIsSaving(true);
        try {
            await onSavePermissions(role.id, Array.from(currentPermissions));
            setIsExpanded(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const hasChanges = new Set(permissions).size !== currentPermissions.size || ![...permissions].every(p => currentPermissions.has(p));

    return (
        <div className="bg-surface-main rounded-lg overflow-hidden transition-all duration-300">
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-text-primary capitalize text-lg">{role.name}</span>
                    {isProtected && (
                        <span title="The 'admin' role is protected and cannot be edited, deleted, or have its permissions changed.">
                            <LockClosedIcon className="w-4 h-4 text-yellow-400" />
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={(e) => {e.stopPropagation(); onEdit(role)}} disabled={isProtected} className="p-2 text-text-secondary hover:text-brand-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Edit Role Name">
                        <EditIcon className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => {e.stopPropagation(); onDelete(role)}} disabled={isProtected} className="p-2 text-text-secondary hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Delete Role">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                    <ChevronDownIcon className={`w-6 h-6 text-text-secondary transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </div>
            {isExpanded && (
                <div className="bg-black/20 p-4 md:p-6 border-t border-gray-700">
                     <h3 className="text-md font-semibold text-text-secondary mb-4">Permissions for '{role.name}' role</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {ALL_PERMISSIONS.map(p => (
                            <PermissionCheckbox 
                                key={p.id}
                                permission={p}
                                isChecked={currentPermissions.has(p.id)}
                                onChange={handleCheckboxChange}
                                isDisabled={isProtected || isSaving}
                            />
                        ))}
                     </div>
                     {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
                     <div className="flex justify-end mt-6">
                        <button 
                            onClick={handleSave}
                            disabled={isProtected || isSaving || !hasChanges}
                            className="px-6 py-2 rounded-md bg-brand-primary hover:bg-brand-secondary text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                             {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                             {isSaving ? 'Saving...' : 'Save Permissions'}
                        </button>
                     </div>
                </div>
            )}
        </div>
    );
};


interface RoleManagementPageProps {
  useCases: AuthUseCases;
}

const RoleManagementPage: React.FC<RoleManagementPageProps> = ({ useCases }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newRoleName, setNewRoleName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [fetchedRoles, fetchedPermissions] = await Promise.all([
          useCases.getRoles(),
          useCases.getAllRolePermissions()
      ]);
      setRoles(fetchedRoles);
      setRolePermissions(fetchedPermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles and permissions.');
    } finally {
      setIsLoading(false);
    }
  }, [useCases]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setIsCreating(true);
    try {
      await useCases.createRole(newRoleName);
      setCreateSuccess(`Successfully created role "${newRoleName}"!`);
      setNewRoleName('');
      await fetchData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveRole = async (updatedRole: Role) => {
    await useCases.updateRole(updatedRole);
    setRoleToEdit(null);
    await fetchData();
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      await useCases.deleteRole(roleToDelete.id);
      setRoleToDelete(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role.');
      setRoleToDelete(null);
    }
  };

  const handleSavePermissions = async (roleId: string, permissions: string[]) => {
      await useCases.updateRolePermissions(roleId, permissions);
      // Optimistically update local state for faster UI feedback
      setRolePermissions(prev => ({...prev, [roleId]: permissions }));
      // No full refetch needed unless there's an error, which the child component handles.
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
      {roleToEdit && <EditRoleModal role={roleToEdit} onSave={handleSaveRole} onCancel={() => setRoleToEdit(null)} />}
      {roleToDelete && (
        <ConfirmModal
          title="Delete Role"
          message={`Are you sure you want to permanently delete the role "${roleToDelete.name}"? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={handleDeleteRole}
          onCancel={() => setRoleToDelete(null)}
        />
      )}

      {/* --- Create Role Form --- */}
      <div className="bg-surface-card rounded-xl shadow-xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-text-primary mb-1">Create New Role</h2>
        <p className="text-text-secondary mb-6">Define a new role for user accounts.</p>
        <form onSubmit={handleCreateSubmit} className="flex items-end gap-4">
          <div className="flex-grow">
            <label htmlFor="new-role-name" className="block text-sm font-medium text-text-secondary mb-2">Role Name</label>
            <input id="new-role-name" type="text" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} disabled={isCreating}
              className="w-full px-4 py-2 bg-surface-main border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none disabled:opacity-50"
              placeholder="e.g., manager" />
          </div>
          <button type="submit" disabled={isCreating || !newRoleName.trim()}
            className="px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-10">
            {isCreating ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Create Role'}
          </button>
        </form>
        {createError && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md mt-4">{createError}</p>}
        {createSuccess && <p className="text-green-400 text-sm text-center bg-green-500/10 p-3 rounded-md mt-4">{createSuccess}</p>}
      </div>

      {/* --- Existing Roles List --- */}
      <div className="bg-surface-card rounded-xl shadow-xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Access Management</h2>
        {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md mb-4">{error}</p>}
        {isLoading ? <LoadingSpinner message="Loading roles..." /> : (
            <div className="space-y-3">
                {roles.map(role => (
                   <RoleListItem 
                      key={role.id}
                      role={role}
                      permissions={rolePermissions[role.id] || []}
                      onSavePermissions={handleSavePermissions}
                      onEdit={setRoleToEdit}
                      onDelete={setRoleToDelete}
                   />
                ))}
            </div>
        )}
        { !isLoading && roles.length === 0 && <p className="text-text-secondary text-center py-4">No roles found.</p> }
      </div>
    </div>
  );
};

export default RoleManagementPage;
