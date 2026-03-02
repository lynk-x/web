import { createClient } from './supabase/client';

/**
 * Log an action to the central audit_logs table.
 * Used for tracking administrative and organizational changes.
 */
export async function logAuditAction(
    targetType: string,
    targetId: string,
    action: string,
    details: any = {}
) {
    const supabase = createClient();

    try {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                target_type: targetType,
                target_id: targetId,
                action: action,
                details: details
            });

        if (error) {
            console.error('Failed to write audit log:', error);
        }
    } catch (err) {
        console.error('Audit logging error:', err);
    }
}
