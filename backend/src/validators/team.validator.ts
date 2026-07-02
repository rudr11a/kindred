import { z } from 'zod';

export const updateProfileSchema = z.object({
  skills: z.array(z.string()).default([]),
  availability: z.enum(['Available', 'Busy']),
  githubProfile: z.string().url().or(z.string().regex(/^https:\/\/github\.com\/[a-zA-Z0-9-]+$/).or(z.literal(''))).optional(),
  openToInvitations: z.boolean(),
});

export const addProjectSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  description: z.string().min(1, 'Description is required'),
  domains: z.array(z.string()).default([]),
  role: z.string().min(1, 'Role is required'),
  skillsUsed: z.array(z.string()).default([]),
  completionStatus: z.enum(['In Progress', 'Completed']),
});

export const createTeamSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  domains: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]), // required skills
  maxMembers: z.number().int().min(2, 'Maximum team size must be at least 2').max(5, 'Maximum team size cannot exceed 5'),
});

export const sendInvitationSchema = z.object({
  teamId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid team ID format'),
  receiverId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid receiver ID format'),
});

export const respondInvitationSchema = z.object({
  status: z.enum(['Accepted', 'Rejected']),
});

export const mongoIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});

export const usnParamSchema = z.object({
  usn: z.string().toUpperCase().regex(/^1BM\d{2}[A-Z]{2}\d{3}$/, 'Invalid USN format. Must be like 1BM23CS001'),
});

export const searchQuerySchema = z.object({
  query: z.string().max(100).optional(),
  branch: z.string().max(20).optional(),
  year: z.string().regex(/^[1-4]$/).optional(),
  availability: z.enum(['Available', 'Busy', '']).optional(),
  skill: z.union([z.string(), z.array(z.string())]).optional(),
  domain: z.union([z.string(), z.array(z.string())]).optional(),
});

export const teamStatusSchema = z.object({
  status: z.enum(['Recruiting', 'In Progress', 'Completed']),
});

// Removed teamRolesSchema

export const teamToggleChatSchema = z.object({
  discussionEnabled: z.boolean(),
});

export const removeMemberParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Team ID format'),
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID format'),
});

export const sendJoinRequestSchema = z.object({
  teamId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid team ID format'),
  message: z.string().optional(),
});

export const editTeamSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  domains: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
});

