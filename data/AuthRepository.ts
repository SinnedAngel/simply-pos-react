
import { IAuthRepository } from '../domain/ports';
import { UserSession, Role, ListedUser } from '../domain/entities';
import { SupabaseClient } from '@supabase/js';
import { Database } from '../types';

const SESSION_STORAGE_KEY = 'gemini_pos_session';

// --- ADAPTER: Auth Repository ---
// This class implements the IAuthRepository port. It adapts our custom authentication
// flow (using a Supabase RPC and localStorage) to the interface required by our use cases.
export class AuthRepository implements IAuthRepository {
  private session: UserSession | null = null;

  constructor(private supabase: SupabaseClient<Database>) {
    this.session = this.getSession();
  }

  async login(username: string, passwordHash: string): Promise<UserSession> {
    const { data, error } = await this.supabase.rpc('login', {
      p_username: username,
      p_password_hash: passwordHash,
    });

    if (error) {
      throw new Error(`RPC Error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Authentication failed: Invalid username or password.');
    }

    const userSession = data as unknown as UserSession;

    // Persist session to localStorage
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userSession));
      this.session = userSession;
    } catch (e) {
      console.error('Failed to save session to localStorage', e);
    }

    return userSession;
  }

  logout(): void {
    this.session = null;
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to remove session from localStorage', e);
    }
  }

  getSession(): UserSession | null {
    if (this.session) {
      return this.session;
    }
    try {
      const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSession) {
        this.session = JSON.parse(storedSession);
        // Add permissions array if it's missing from an old session
        if (!this.session?.permissions) {
          this.session!.permissions = [];
        }
        return this.session;
      }
    } catch (e) {
      console.error('Failed to retrieve session from localStorage', e);
      // Clear potentially corrupted data
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    return null;
  }

  async createUser(username: string, passwordHash: string, role: string): Promise<void> {
    const { error } = await this.supabase.rpc('create_user', {
      p_username: username,
      p_password_hash: passwordHash,
      p_role_name: role,
    });

    if (error) {
       // Provide more specific feedback for unique constraint violation
      if (error.message.includes('duplicate key value violates unique constraint "users_username_key"')) {
        throw new Error(`Username "${username}" already exists.`);
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async getUsers(): Promise<ListedUser[]> {
    const { data, error } = await this.supabase.rpc('get_all_users');
    if (error) {
      console.error("Error fetching users:", error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
    return (data as unknown as ListedUser[]) || [];
  }

  async updateUser(user: Pick<ListedUser, 'id' | 'username' | 'role'>): Promise<void> {
    const { error } = await this.supabase.rpc('update_user', {
      p_user_id: user.id,
      p_username: user.username,
      p_role_name: user.role,
    });

    if (error) {
      if (error.message.includes('duplicate key value violates unique constraint "users_username_key"')) {
        throw new Error(`Username "${user.username}" already exists.`);
      }
      console.error("Error updating user:", error);
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    const { error } = await this.supabase.rpc('update_user_password', {
      p_user_id: userId,
      p_new_password_hash: newPasswordHash,
    });

    if (error) {
      console.error("Error updating password:", error);
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await this.supabase.rpc('delete_user', {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error deleting user:", error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  // Role Management
  async getRoles(): Promise<Role[]> {
    const { data, error } = await this.supabase.rpc('get_all_roles');
    if (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }
    return (data as Role[]) || [];
  }

  async createRole(name: string): Promise<void> {
    const { error } = await this.supabase.rpc('create_role', { p_role_name: name });
    if (error) {
      if (error.message.includes('duplicate key value violates unique constraint "roles_name_key"')) {
        throw new Error(`Role "${name}" already exists.`);
      }
      throw new Error(`Failed to create role: ${error.message}`);
    }
  }

  async updateRole(role: Role): Promise<void> {
    const { error } = await this.supabase.rpc('update_role', {
      p_role_id: role.id,
      p_role_name: role.name,
    });
    if (error) {
       if (error.message.includes('duplicate key value violates unique constraint "roles_name_key"')) {
        throw new Error(`Role "${role.name}" already exists.`);
      }
      throw new Error(`Failed to update role: ${error.message}`);
    }
  }

  async deleteRole(roleId: string): Promise<void> {
    const { error } = await this.supabase.rpc('delete_role', { p_role_id: roleId });
    if (error) {
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  }

  // Permission Management
  async getAllRolePermissions(): Promise<Record<string, string[]>> {
    const { data, error } = await this.supabase.rpc('get_all_role_permissions');
    if (error) {
      throw new Error(`Failed to fetch role permissions: ${error.message}`);
    }
    return data || {};
  }
  
  async updateRolePermissions(roleId: string, permissions: string[]): Promise<void> {
    const { error } = await this.supabase.rpc('set_role_permissions', {
      p_role_id: roleId,
      p_permissions: permissions,
    });
    if (error) {
      throw new Error(`Failed to update permissions: ${error.message}`);
    }
  }
}
