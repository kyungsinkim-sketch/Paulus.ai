import { User } from '../types';

/**
 * PAULUS.AI — RESTORE ADM-CORE
 * useAdminAccess.ts
 * 
 * Provides centralized logic for determining administrative access rights.
 * Fulfills Spec 2: Visibility & Access Rules.
 */
export const useAdminAccess = (user: User | null) => {
  const isAdmin = user?.permissionLevel === 'ADMIN';
  const isCoreOps = user?.permissionLevel === 'CORE_OPERATIONS';
  const hasRestrictedAccess = user?.permissionLevel === 'LIMITED_ACCESS';

  return {
    isAdmin,
    isCoreOps,
    hasRestrictedAccess,
    canAccessAdminPanel: isAdmin,
    roleLabel: user?.permissionLevel?.replace('_', ' ') || 'GUEST'
  };
};
