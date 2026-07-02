import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  usn: string;
  email: string;
  passwordHash: string;
  branch: string;
  year: number;
  githubProfile?: string;
  skills: string[];
  domains: string[];
  availability: 'Available' | 'Busy';
  openToInvitations: boolean;
  isVerified: boolean;
  otpHash?: string;
  otpExpires?: Date;
  resetOtpHash?: string;
  resetOtpExpiry?: Date;
  otpAttempts?: number;
  otpRequestsCount?: number;
  otpRequestsResetTime?: Date;
  deletedAt?: Date;
  isDeleted?: boolean;
  comparePassword: (password: string) => Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    usn: {
      type: String,
      required: [true, 'USN is required'],
      unique: true,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v: string) {
          // Standard USN format, e.g., 1BM23CS001
          return /^1BM\d{2}[A-Z]{2}\d{3}$/.test(v);
        },
        message: (props: any) => `${props.value} is not a valid USN! Format should be like 1BM23CS001.`,
      },
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v: string) {
          return /^[a-zA-Z0-9._%+-]+@bmsce\.ac\.in$/.test(v);
        },
        message: (props: any) => `${props.value} is not a valid email! Email must end with @bmsce.ac.in.`,
      },
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [1, 'Year must be between 1 and 4'],
      max: [4, 'Year must be between 1 and 4'],
    },
    githubProfile: {
      type: String,
      trim: true,
      default: '',
    },
    skills: {
      type: [String],
      default: [],
    },
    domains: {
      type: [String],
      default: [],
    },
    availability: {
      type: String,
      enum: ['Available', 'Busy'],
      default: 'Available',
    },
    openToInvitations: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpHash: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    resetOtpHash: {
      type: String,
    },
    resetOtpExpiry: {
      type: Date,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpRequestsCount: {
      type: Number,
      default: 0,
    },
    otpRequestsResetTime: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', userSchema);
export default User;
