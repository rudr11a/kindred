import { Schema, model, Document, Types } from 'mongoose';

export interface IActivityLog extends Document {
  actorId: Types.ObjectId;
  action: string;
  entityType?: string;
  entityId?: string;
  timestamp: Date;
  metadata?: any;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
    },
    entityId: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: false,
  }
);

export const ActivityLog = model<IActivityLog>('ActivityLog', activityLogSchema);
export default ActivityLog;
