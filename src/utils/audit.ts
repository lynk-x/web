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
        const { error } = await supabase.schema('api').rpc('log_audit_event', {
            p_target_type: targetType,
            p_target_id: targetId,
            p_action: action,
            p_details: details,
        });

        if (error) {
            console.error('Failed to write audit log:', error);
        }
    } catch (err) {
        console.error('Audit logging error:', err);
    }
}
