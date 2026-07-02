export interface IUser {
  id: string;
  _id?: string;
  name: string;
  usn: string;
  email: string;
  branch: string;
  year: number;
  githubProfile?: string;
  skills: string[];
  domains: string[];
  availability: 'Available' | 'Busy';
  openToInvitations: boolean;
  isVerified: boolean;
  workedTogether?: boolean;
  connectionScore?: number;
}

export interface IProjectHistory {
  _id: string;
  userId: string | IUser;
  teamId?: string;
  projectName: string;
  description: string;
  domains: string[];
  role: string;
  skillsUsed: string[];
  completionStatus: 'In Progress' | 'Completed';
  createdAt?: string;
  updatedAt?: string;
}

export interface ITeamMember {
  userId: IUser;
  roleName: string;
}

export interface IStatusTimeline {
  status: 'Recruiting' | 'In Progress' | 'Completed';
  timestamp: string;
}

export interface ITeam {
  _id: string;
  title: string;
  description: string;
  domains: string[];
  tags: string[];
  skills: string[];
  creatorId: IUser | string;
  status: 'Recruiting' | 'In Progress' | 'Completed';
  statusTimeline: IStatusTimeline[];
  maxMembers: number;
  members: ITeamMember[];
  discussionEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IInvitation {
  _id: string;
  teamId: ITeam;
  senderId: IUser;
  receiverId: string | IUser;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: string;
  updatedAt?: string;
}

export interface INotification {
  _id: string;
  userId: string;
  type: 'New Invitation' | 'Invitation Accepted' | 'Invitation Rejected' | 'Team Update';
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface IDiscussionMessage {
  _id: string;
  teamId: string;
  senderId: IUser;
  message: string;
  reactions?: { userId: string; emoji: string }[];
  createdAt: string;
}
