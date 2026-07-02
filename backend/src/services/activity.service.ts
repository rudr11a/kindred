import ActivityLog from '../models/ActivityLog';

/**
 * Creates an audit log entry for security and activity tracking
 * @param actorId The ID of the user performing the action
 * @param action The action type (e.g. 'User Registration', 'Login')
 * @param entityType The model type affected (optional)
 * @param entityId The ID of the affected model (optional)
 * @param metadata Additional JSON context (optional)
 */
export const logActivity = async (
  actorId: any,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: any
) => {
  try {
    await ActivityLog.create({
      actorId,
      action,
      entityType,
      entityId: entityId ? entityId.toString() : undefined,
      metadata,
    });
  } catch (error) {
    console.error('[logActivity error]', error);
  }
};
