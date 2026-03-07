import pool from '../db.js';

export const logActivity = async (userId, action, details = '', req = null, entityType = null, entityId = null) => {
    try {
        const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;

        // Ensure details is a string if it's an object
        const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;

        await pool.query(
            `INSERT INTO activity_logs (user_id, action, details, ip_address, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, action, detailsStr, ipAddress, entityType, entityId]
        );
        console.log(`📝 Activity Logged: [${action}] User: ${userId}`);
    } catch (error) {
        console.error('❌ Failed to log activity:', error.message);
        // Don't throw error to avoid blocking the main action
    }
};
