import { Role, Screen } from '../types';

// Always-required screens that cannot be removed from any role
export const ALWAYS_ALLOWED: Screen[] = [Screen.Login, Screen.Dashboard];

// Admin/protected screens that should not be assignable to non-admin roles via UI
export const ADMIN_ONLY_SCREENS: Screen[] = [Screen.Admin, Screen.ActivityLog];

const DEFAULT_ROLE_PERMISSIONS: Record<string, Screen[]> = {
    [Role.Admin]: Object.values(Screen),    // All screens
    [Role.Manager]: Object.values(Screen),  // All screens for now

    [Role.Cashier]: [
        Screen.Dashboard,
        Screen.POS,
        Screen.Orders,
        Screen.Customers,
        Screen.Delivery,
        Screen.Closing,
        Screen.DayClosing,
        Screen.About,
        Screen.Login,
    ],

    [Role.Waiter]: [
        Screen.Dashboard,
        Screen.POS,
        Screen.Orders,
        Screen.About,
        Screen.Login,
    ],

    [Role.Kitchen]: [
        Screen.Dashboard,
        Screen.Orders,
        Screen.Inventory,
        Screen.Menu,
        Screen.About,
        Screen.Login,
    ],

    [Role.Driver]: [
        Screen.Dashboard,
        Screen.Delivery,
        Screen.Orders,
        Screen.About,
        Screen.Login,
    ],

    // Default fallback for unknown roles
    'default': [Screen.Login],
};

// Mutable runtime permissions — starts as the defaults, can be overridden from backend
export let ROLE_PERMISSIONS: Record<string, Screen[]> = { ...DEFAULT_ROLE_PERMISSIONS };

/** Returns a deep copy of the hardcoded defaults (used as baseline in Settings UI) */
export const getDefaultPermissions = (): Record<string, Screen[]> =>
    JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS));

/**
 * Overrides ROLE_PERMISSIONS with data loaded from the backend settings.
 * Admin and 'default' entries are always kept intact.
 */
export const loadRolePermissions = (data: Record<string, string[]>): void => {
    const updated: Record<string, Screen[]> = { ...DEFAULT_ROLE_PERMISSIONS };
    for (const [role, screens] of Object.entries(data)) {
        if (role === Role.Admin || role === 'default') continue; // never override admin
        // Ensure always-allowed screens are present
        const merged = Array.from(new Set([...ALWAYS_ALLOWED, ...(screens as Screen[])]));
        updated[role] = merged;
    }
    ROLE_PERMISSIONS = updated;
};

export const hasPermission = (userRole: string, screen: Screen): boolean => {
    const allowedScreens = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS['default'];
    return allowedScreens.includes(screen);
};
