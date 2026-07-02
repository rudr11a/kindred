import { Schema, model, Document, Types } from 'mongoose';

export interface IJoinRequest extends Document {
  teamId: Types.ObjectId;
  studentId: Types.ObjectId;
  message?: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: Date;
  updatedAt: Date;
}

const joinRequestSchema = new Schema<IJoinRequest>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

export const JoinRequest = model<IJoinRequest>('JoinRequest', joinRequestSchema);
export default JoinRequest;
