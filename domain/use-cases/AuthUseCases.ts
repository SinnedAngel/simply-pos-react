
import { UserSession, Role, ListedUser } from '../entities';
import { IAuthRepository } from '../ports';

// --- USE CASE: Managing Authentication ---
// This use case orchestrates all authentication-related logic.
export class AuthUseCases {
  constructor(private authRepository: IAuthRepository) {}

  async login(username: string, passwordHash: string): Promise<UserSession> {
    return this.authRepository.login(username, passwordHash);
  }

  logout(): void {
    return this.authRepository.logout();
  }
  
  getSession(): UserSession | null {
    return this.authRepository.getSession();
  }

  async createUser(username: string, passwordHash: string, role: string): Promise<void> {
    if (!username || !passwordHash || !role) {
      throw new Error('Username, password, and role are required to create a user.');
    }
    return this.authRepository.createUser(username, passwordHash, role);
  }

  async getUsers(): Promise<ListedUser[]> {
    return this.authRepository.getUsers();
  }

  async updateUser(user: Pick<ListedUser, 'id' | 'username' | 'role'>): Promise<void> {
    if (!user.username || !user.role) {
      throw new Error('Username and role are required for an update.');
    }
    return this.authRepository.updateUser(user);
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    if (!userId || !newPasswordHash) {
      throw new Error('User ID and a new password hash are required.');
    }
    return this.authRepository.updatePassword(userId, newPasswordHash);
  }

  async deleteUser(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required for deletion.');
    }
    return this.authRepository.deleteUser(userId);
  }

  // Role Management Use Cases
  async getRoles(): Promise<Role[]> {
    return this.authRepository.getRoles();
  }

  async createRole(name: string): Promise<void> {
    if (!name || name.trim().length === 0) {
      throw new Error('Role name cannot be empty.');
    }
    return this.authRepository.createRole(name);
  }

  async updateRole(role: Role): Promise<void> {
    if (!role.name || role.name.trim().length === 0) {
      throw new Error('Role name cannot be empty.');
    }
    return this.authRepository.updateRole(role);
  }

  async deleteRole(roleId: string): Promise<void> {
    if (!roleId) {
      throw new Error('Role ID is required for deletion.');
    }
    return this.authRepository.deleteRole(roleId);
  }

  // Permission Management Use Cases
  async getAllRolePermissions(): Promise<Record<string, string[]>> {
    return this.authRepository.getAllRolePermissions();
  }
  
  async updateRolePermissions(roleId: string, permissions: string[]): Promise<void> {
    if (!roleId) {
      throw new Error('Role ID is required to update permissions.');
    }
    return this.authRepository.updateRolePermissions(roleId, permissions);
  }
}