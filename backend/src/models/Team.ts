import { Schema, model, Document, Types } from 'mongoose';

export interface ITeamMember {
  userId: Types.ObjectId;
  roleName: string; // "Team Lead" or "Member"
}

export interface IStatusTimeline {
  status: 'Recruiting' | 'In Progress' | 'Completed';
  timestamp: Date;
}

export interface ITeam extends Document {
  title: string;
  description: string;
  domains: string[];
  tags: string[];
  skills: string[]; // Required skills list
  creatorId: Types.ObjectId;
  status: 'Recruiting' | 'In Progress' | 'Completed';
  statusTimeline: IStatusTimeline[];
  maxMembers: number;
  members: ITeamMember[];
  discussionEnabled: boolean;
  isDeleted?: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
  {
    title: {
      type: String,
      required: [true, 'Team/Project title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Team/Project description is required'],
      trim: true,
    },
    domains: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    skills: {
      type: [String],
      default: [],
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Recruiting', 'In Progress', 'Completed'],
      default: 'Recruiting',
    },
    statusTimeline: [
      {
        status: {
          type: String,
          enum: ['Recruiting', 'In Progress', 'Completed'],
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    maxMembers: {
      type: Number,
      required: [true, 'Maximum team size is required'],
      min: [2, 'Maximum team size must be at least 2'],
      max: [5, 'Maximum team size cannot exceed 5'],
    },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        roleName: { type: String, required: true },
      },
    ],
    discussionEnabled: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-push the first status timeline element on creation
teamSchema.pre('save', function (next) {
  if (this.isNew) {
    this.statusTimeline = [{ status: 'Recruiting', timestamp: new Date() }];
  }
  next();
});

export const Team = model<ITeam>('Team', teamSchema);
export default Team;
