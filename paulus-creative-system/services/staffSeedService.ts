
import { User } from '../types';
import staffData from '../data/staff_data.json';

/**
 * PAULUS.AI — STAFF RECOVERY ENGINE
 * staffSeedService.ts
 * 
 * Provides centralized access to the restored 24-member dataset.
 * NOW LOADED FROM EXTERNAL JSON FOR PERSISTENCE.
 */

const STAFF_DATA = staffData as unknown as User[];

export class StaffSeedService {
  /**
   * Returns all 24 staff members.
   */
  public static getAllStaff(): User[] {
    return STAFF_DATA;
  }

  /**
   * Returns only ADMIN level staff (Saffaan, Suhyeon, Chloe, Olivia).
   */
  public static getAdminStaff(): User[] {
    return STAFF_DATA.filter(u => u.permissionLevel === 'ADMIN');
  }

  /**
   * Lookup by ID.
   */
  public static getStaffById(id: string): User | undefined {
    return STAFF_DATA.find(u => u.id === id);
  }

  /**
   * Returns team members grouped by department.
   */
  public static getStaffByTeam(team: string): User[] {
    return STAFF_DATA.filter(u => u.team === team);
  }
}
