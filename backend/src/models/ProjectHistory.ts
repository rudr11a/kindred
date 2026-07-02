import { Schema, model, Document, Types } from 'mongoose';

export interface IProjectHistory extends Document {
  userId: Types.ObjectId;
  teamId?: Types.ObjectId;
  projectName: string;
  description: string;
  domains: string[];
  role: string;
  skillsUsed: string[];
  completionStatus: 'In Progress' | 'Completed';
  createdAt: Date;
  updatedAt: Date;
}

const projectHistorySchema = new Schema<IProjectHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
    },
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    domains: {
      type: [String],
      default: [],
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },
    skillsUsed: {
      type: [String],
      default: [],
    },
    completionStatus: {
      type: String,
      enum: ['In Progress', 'Completed'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Post-save hook to compile domains list on user model when projects are updated/added
projectHistorySchema.post('save', async function (doc) {
  try {
    const ProjectHistory = doc.constructor as any;
    const User = model('User');
    
    // Find all domains this user has worked on
    const userProjects = await ProjectHistory.find({ userId: doc.userId });
    const uniqueDomains = Array.from(new Set(userProjects.flatMap((p: any) => p.domains || []).filter(Boolean)));
    
    // Update User model's domains list
    await User.findByIdAndUpdate(doc.userId, { domains: uniqueDomains });
  } catch (error) {
    console.error('Error updating user domains list:', error);
  }
});

// Post-delete hook to update domains list on user model when project is deleted
projectHistorySchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    try {
      const ProjectHistory = model('ProjectHistory');
      const User = model('User');
      
      const userProjects = await ProjectHistory.find({ userId: doc.userId });
      const uniqueDomains = Array.from(new Set(userProjects.flatMap((p: any) => p.domains || []).filter(Boolean)));
      
      await User.findByIdAndUpdate(doc.userId, { domains: uniqueDomains });
    } catch (error) {
      console.error('Error updating user domains list after delete:', error);
    }
  }
});

export const ProjectHistory = model<IProjectHistory>('ProjectHistory', projectHistorySchema);
export default ProjectHistory;
