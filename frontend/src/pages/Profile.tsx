import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Trash2, Edit3, Save, X, Mail, FolderKanban, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import api from '../services/api';
import type { IUser, IProjectHistory, ITeam } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatActivityDate } from '../utils/date';
import SkillMultiSelect from '../components/common/SkillMultiSelect';
import DomainMultiSelect from '../components/common/DomainMultiSelect';

const Profile: React.FC = () => {
  const { usn } = useParams<{ usn: string }>();
  const { user: currentUser, updateProfile, refreshUser } = useAuth();
  
  // Loaded profile data
  const [profileUser, setProfileUser] = useState<IUser | null>(null);
  const [projects, setProjects] = useState<IProjectHistory[]>([]);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mutual connection connection details
  const [mutualData, setMutualData] = useState<{
    connectionScore: number;
    sharedProjects: Array<{
      projectName: string;
      teamId: string;
      myRole: string;
      theirRole: string;
      completedAt: string;
    }>;
  } | null>(null);

  // Editing Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editAvailability, setEditAvailability] = useState<'Available' | 'Busy'>('Available');
  const [editGithub, setEditGithub] = useState('');
  const [editOpenToInvites, setEditOpenToInvites] = useState(true);

  // Add Project states
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjDomains, setNewProjDomains] = useState<string[]>([]);
  const [newProjRole, setNewProjRole] = useState('');
  const [newProjSkills, setNewProjSkills] = useState<string[]>([]);
  const [newProjStatus, setNewProjStatus] = useState<'In Progress' | 'Completed'>('Completed');

  // Edit Project states
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjName, setEditProjName] = useState('');
  const [editProjDesc, setEditProjDesc] = useState('');
  const [editProjDomains, setEditProjDomains] = useState<string[]>([]);
  const [editProjRole, setEditProjRole] = useState('');
  const [editProjSkills, setEditProjSkills] = useState<string[]>([]);
  const [editProjStatus, setEditProjStatus] = useState<'In Progress' | 'Completed'>('Completed');

  // Invitation widget states (when viewing other profiles)
  const [myLeadTeams, setMyLeadTeams] = useState<ITeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isTeamFull, setIsTeamFull] = useState(false);
  const [teamCapacityInfo, setTeamCapacityInfo] = useState('');
  const [inviteStatusMsg, setInviteStatusMsg] = useState('');

  const isOwnProfile = currentUser && profileUser && currentUser.usn.toUpperCase() === profileUser.usn.toUpperCase();

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const targetUsn = usn || currentUser?.usn;
      if (!targetUsn) return;

      const res = await api.get(`/users/profile/${targetUsn}`);
      setProfileUser(res.data.user);
      setProjects(res.data.projects);
      setActiveProjectsCount(res.data.activeProjectsCount);

      // Populate edit states
      setEditSkills(res.data.user.skills || []);
      setEditAvailability(res.data.user.availability);
      setEditGithub(res.data.user.githubProfile || '');
      setEditOpenToInvites(res.data.user.openToInvitations);

      // Fetch mutual connection score and shared projects list if viewing other user profile
      if (currentUser && currentUser.usn.toUpperCase() !== targetUsn.toUpperCase()) {
        try {
          const mutualRes = await api.get(`/users/profile/${targetUsn}/mutual`);
          setMutualData(mutualRes.data);
        } catch (mutualErr) {
          console.error('Failed to fetch mutual connection details:', mutualErr);
          setMutualData(null);
        }
      } else {
        setMutualData(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyLeadTeams = async () => {
    try {
      const res = await api.get('/teams/led');
      const led = (res.data.teams || []).filter((t: any) => t.isRecruiting);
      setMyLeadTeams(led);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      await refreshUser();
      fetchProfile();
    };
    init();
  }, [usn, currentUser?.usn]);

  useEffect(() => {
    if (profileUser && !isOwnProfile && profileUser.openToInvitations) {
      fetchMyLeadTeams();
    }
  }, [profileUser]);

  useEffect(() => {
    if (myLeadTeams.length === 1) {
      setSelectedTeamId(myLeadTeams[0]._id);
    } else {
      setSelectedTeamId('');
    }
  }, [myLeadTeams]);

  // Handle Team selection changes in invitation panel to check team full capacity
  useEffect(() => {
    if (selectedTeamId) {
      const team = myLeadTeams.find((t) => t._id === selectedTeamId);
      if (team) {
        const full = team.members.length >= team.maxMembers;
        setIsTeamFull(full);
        setTeamCapacityInfo(`${team.members.length} / ${team.maxMembers} members filled.`);
      } else {
        setIsTeamFull(false);
        setTeamCapacityInfo('');
      }
    } else {
      setIsTeamFull(false);
      setTeamCapacityInfo('');
    }
  }, [selectedTeamId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        skills: editSkills,
        availability: editAvailability,
        githubProfile: editGithub,
        openToInvitations: editOpenToInvites,
      });

      setIsEditingProfile(false);
      fetchProfile();
    } catch (err) {
      console.error(err);
      alert('Failed to update profile details.');
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users/projects', {
        projectName: newProjName,
        description: newProjDesc,
        domains: newProjDomains,
        role: newProjRole,
        skillsUsed: newProjSkills,
        completionStatus: newProjStatus,
      });

      // Clear add form states
      setNewProjName('');
      setNewProjDesc('');
      setNewProjDomains([]);
      setNewProjRole('');
      setNewProjSkills([]);
      setNewProjStatus('Completed');
      setIsAddingProject(false);
      fetchProfile();
    } catch (err) {
      console.error(err);
      alert('Failed to add project history item.');
    }
  };

  const handleEditProjectClick = (p: IProjectHistory) => {
    setEditingProjectId(p._id);
    setEditProjName(p.projectName);
    setEditProjDesc(p.description);
    setEditProjDomains(p.domains || []);
    setEditProjRole(p.role);
    setEditProjSkills(p.skillsUsed || []);
    setEditProjStatus(p.completionStatus);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjectId) return;

    try {
      await api.put(`/users/projects/${editingProjectId}`, {
        projectName: editProjName,
        description: editProjDesc,
        domains: editProjDomains,
        role: editProjRole,
        skillsUsed: editProjSkills,
        completionStatus: editProjStatus,
      });

      setEditingProjectId(null);
      fetchProfile();
    } catch (err) {
      console.error(err);
      alert('Failed to update project details.');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Delete this project from your history?')) return;
    try {
      await api.delete(`/users/projects/${id}`);
      fetchProfile();
    } catch (err) {
      console.error(err);
      alert('Failed to delete project.');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || isTeamFull || !profileUser) return;
    setInviteStatusMsg('');

    try {
      await api.post('/invitations', {
        teamId: selectedTeamId,
        receiverId: profileUser.id || profileUser._id,
      });
      setInviteStatusMsg('Invitation sent successfully!');
      setSelectedTeamId('');
    } catch (err: any) {
      setInviteStatusMsg(err.response?.data?.message || 'Failed to send invitation.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 text-center py-12 animate-pulse text-xs text-reddit-gray">
        Retrieving student portfolio...
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="flex-1 bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-6 text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
        <h3 className="font-bold text-sm">Error Loading Profile</h3>
        <p className="text-xs text-reddit-gray mt-1">{error || 'Student profile not found.'}</p>
        <Link to="/" className="text-xs text-reddit-blue hover:underline mt-4 inline-block">Return to Feed</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex justify-between gap-6 min-w-0">
      {/* Left Column: Details & Projects */}
      <div className="flex-1 max-w-2xl min-w-0 flex flex-col gap-4">
        {/* Profile Card Header */}
        <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-5 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-reddit-orange text-white flex items-center justify-center font-bold uppercase text-2xl">
                {profileUser.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-reddit-text dark:text-reddit-textDark">
                  {profileUser.name} <span className="text-xs text-reddit-gray font-normal">({profileUser.usn})</span>
                </h2>
                <p className="text-xs text-reddit-gray mt-0.5">{profileUser.branch} — {profileUser.year} Year</p>
                <div className="flex gap-2 items-center mt-1.5">
                  <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${
                    profileUser.availability === 'Available'
                      ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                      : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {profileUser.availability}
                  </span>
                  
                  {profileUser.githubProfile && (
                    <a
                      href={profileUser.githubProfile.startsWith('http') ? profileUser.githubProfile : `https://github.com/${profileUser.githubProfile}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-reddit-gray hover:text-reddit-text dark:hover:text-reddit-textDark flex items-center gap-1 text-[10px] font-semibold"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg> GitHub Profile
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            {isOwnProfile && !isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="border border-reddit-border dark:border-reddit-borderDark hover:bg-reddit-bg dark:hover:bg-reddit-bgDark text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Edit Profile Form */}
          {isEditingProfile ? (
            <form onSubmit={handleUpdateProfile} className="border-t border-reddit-border/30 dark:border-reddit-borderDark/30 pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Availability</label>
                  <select
                    value={editAvailability}
                    onChange={(e) => setEditAvailability(e.target.value as 'Available' | 'Busy')}
                    className="w-full h-8 px-2 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none"
                  >
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">GitHub Username/URL</label>
                  <input
                    type="text"
                    value={editGithub}
                    onChange={(e) => setEditGithub(e.target.value)}
                    placeholder="https://github.com/my-username"
                    className="w-full h-8 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Skills</label>
                <SkillMultiSelect
                  selectedSkills={editSkills}
                  onChange={setEditSkills}
                  placeholder="Select or add your skills..."
                />
              </div>

              <div className="flex items-center justify-between border-t border-reddit-border/30 dark:border-reddit-borderDark/30 pt-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditOpenToInvites(!editOpenToInvites)}
                    className="text-reddit-orange focus:outline-none"
                  >
                    {editOpenToInvites ? (
                      <ToggleRight className="h-7 w-7 text-reddit-orange" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-reddit-gray" />
                    )}
                  </button>
                  <span className="text-xs font-semibold">Open to Team Invitations</span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="bg-reddit-bg dark:bg-reddit-bgDark hover:opacity-90 text-xs font-semibold px-3 py-1.5 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-reddit-blue text-white text-xs font-semibold px-4 py-1.5 rounded flex items-center gap-1 hover:opacity-90"
                  >
                    <Save className="h-3 w-3" /> Save Changes
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="border-t border-reddit-border/30 dark:border-reddit-borderDark/30 pt-4 flex flex-col gap-3">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-reddit-gray mb-1">Skills Portfolio</h4>
                {profileUser.skills.length === 0 ? (
                  <p className="text-xs text-reddit-gray italic">No skills listed yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {profileUser.skills.map((s, i) => (
                      <span key={i} className="bg-reddit-bg dark:bg-reddit-bgDark text-reddit-text dark:text-reddit-textDark text-[9px] px-2 py-0.5 rounded font-bold border border-reddit-border/20">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-reddit-gray mb-1">Domain Expertise (Auto-compiled)</h4>
                {profileUser.domains.length === 0 ? (
                  <p className="text-xs text-reddit-gray italic">Add completed projects to compile domains.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {profileUser.domains.map((d, i) => (
                      <span key={i} className="bg-reddit-orange/10 text-reddit-orange text-[9px] px-2 py-0.5 rounded font-bold border border-reddit-orange/20">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Completed Projects Section */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-extrabold text-sm text-reddit-text dark:text-reddit-textDark">Completed Projects</h3>
            {isOwnProfile && !isAddingProject && (
              <button
                onClick={() => {
                  setNewProjStatus('Completed');
                  setIsAddingProject(true);
                }}
                className="bg-reddit-orange hover:bg-reddit-orangeHover text-white text-xs font-semibold px-3 py-1 rounded flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Project
              </button>
            )}
          </div>

          {/* Add Project Form Card */}
          {isAddingProject && (
            <form onSubmit={handleAddProject} className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-orange/40 rounded-md p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-2">
                <span className="font-bold text-xs text-reddit-orange">Add Project Experience</span>
                <button type="button" onClick={() => setIsAddingProject(false)} className="text-reddit-gray hover:text-reddit-text">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Project Name</label>
                  <input
                    type="text"
                    required
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    placeholder="E.g., Student Campus Map"
                    className="w-full h-8 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Domain</label>
                  <DomainMultiSelect
                    selectedDomains={newProjDomains}
                    onChange={setNewProjDomains}
                    placeholder="Select or add project domains..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Your Role</label>
                  <input
                    type="text"
                    required
                    value={newProjRole}
                    onChange={(e) => setNewProjRole(e.target.value)}
                    placeholder="E.g., Lead Frontend Dev"
                    className="w-full h-8 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Status</label>
                  <select
                    value={newProjStatus}
                    onChange={(e) => setNewProjStatus(e.target.value as 'In Progress' | 'Completed')}
                    className="w-full h-8 px-2 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none"
                  >
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Skills Used</label>
                <SkillMultiSelect
                  selectedSkills={newProjSkills}
                  onChange={setNewProjSkills}
                  placeholder="Select or add skills used..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Description</label>
                <textarea
                  required
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Detailed description of your contributions..."
                  rows={3}
                  className="w-full p-2 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingProject(false)}
                  className="bg-reddit-bg dark:bg-reddit-bgDark text-xs font-semibold px-3 py-1.5 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-reddit-orange text-white text-xs font-semibold px-4 py-1.5 rounded"
                >
                  Add Project
                </button>
              </div>
            </form>
          )}

          {/* Completed Project Cards List */}
          {projects.filter(p => p.completionStatus === 'Completed').length === 0 ? (
            <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-6 text-center text-xs text-reddit-gray italic">
              No completed projects added to history yet.
            </div>
          ) : (
            projects.filter(p => p.completionStatus === 'Completed').map((project) => {
              const dateStr = formatActivityDate(project.createdAt);
              return (
                <div key={project._id} className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4">
                  {editingProjectId === project._id ? (
                    /* Edit Project Inline Form */
                    <form onSubmit={handleUpdateProject} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Project Name</label>
                          <input
                            type="text"
                            required
                            value={editProjName}
                            onChange={(e) => setEditProjName(e.target.value)}
                            className="w-full h-8 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Domain</label>
                          <DomainMultiSelect
                            selectedDomains={editProjDomains}
                            onChange={setEditProjDomains}
                            placeholder="Select or add project domains..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Role</label>
                          <input
                            type="text"
                            required
                            value={editProjRole}
                            onChange={(e) => setEditProjRole(e.target.value)}
                            className="w-full h-8 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Status</label>
                          <select
                            value={editProjStatus}
                            onChange={(e) => setEditProjStatus(e.target.value as 'In Progress' | 'Completed')}
                            className="w-full h-8 px-2 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none"
                          >
                            <option value="Completed">Completed</option>
                            <option value="In Progress">In Progress</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Skills Used</label>
                        <SkillMultiSelect
                          selectedSkills={editProjSkills}
                          onChange={setEditProjSkills}
                          placeholder="Select or add skills used..."
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Description</label>
                        <textarea
                          required
                          value={editProjDesc}
                          onChange={(e) => setEditProjDesc(e.target.value)}
                          rows={2}
                          className="w-full p-2 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none resize-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingProjectId(null)}
                          className="bg-reddit-bg dark:bg-reddit-bgDark text-xs font-semibold px-3 py-1.5 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-reddit-blue text-white text-xs font-semibold px-4 py-1.5 rounded"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Completed Project Details */
                    <div className="flex flex-col gap-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-reddit-text dark:text-reddit-textDark">{project.projectName}</h4>
                          <div className="text-[10px] text-reddit-gray font-medium mt-1">
                            Role: <span className="font-semibold text-reddit-text dark:text-reddit-textDark">{project.role}</span>
                          </div>
                          <div className="text-[10px] text-reddit-gray font-medium mt-0.5">
                            Completed: <span className="font-semibold text-reddit-text dark:text-reddit-textDark">{dateStr}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="bg-green-500/10 text-green-500 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {project.completionStatus}
                          </span>

                          {isOwnProfile && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleEditProjectClick(project)}
                                className="text-reddit-gray hover:text-reddit-blue p-1 rounded"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProject(project._id)}
                                className="text-reddit-gray hover:text-red-500 p-1 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-reddit-gray leading-normal">{project.description}</p>

                      {project.domains && project.domains.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 items-center">
                          <span className="text-[9px] text-reddit-gray font-bold uppercase mr-1">Domains:</span>
                          {project.domains.map((d, i) => (
                            <span key={i} className="bg-reddit-orange/10 text-reddit-orange text-[8px] px-1.5 py-0.5 rounded font-bold border border-reddit-orange/20">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}

                      {project.skillsUsed && project.skillsUsed.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 items-center">
                          <span className="text-[9px] text-reddit-gray font-bold uppercase mr-1">Skills:</span>
                          {project.skillsUsed.map((s, i) => (
                            <span key={i} className="bg-reddit-bg dark:bg-reddit-bgDark text-reddit-text dark:text-reddit-textDark text-[8px] px-1.5 py-0.5 rounded font-bold border border-reddit-border/20">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Ongoing Projects Section */}
        <div className="flex flex-col gap-3 mt-4">
          <h3 className="font-extrabold text-sm text-reddit-text dark:text-reddit-textDark px-1">Ongoing Projects</h3>
          
          {projects.filter(p => p.completionStatus === 'In Progress').length === 0 ? (
            <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-6 text-center text-xs text-reddit-gray italic">
              No ongoing projects.
            </div>
          ) : (
            projects.filter(p => p.completionStatus === 'In Progress').map((project) => (
              <div key={project._id} className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4">
                {editingProjectId === project._id ? (
                  /* Edit Project Inline Form */
                  <form onSubmit={handleUpdateProject} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Project Name</label>
                        <input
                          type="text"
                          required
                          value={editProjName}
                          onChange={(e) => setEditProjName(e.target.value)}
                          className="w-full h-8 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Domain</label>
                        <DomainMultiSelect
                          selectedDomains={editProjDomains}
                          onChange={setEditProjDomains}
                          placeholder="Select or add project domains..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Role</label>
                        <input
                          type="text"
                          required
                          value={editProjRole}
                          onChange={(e) => setEditProjRole(e.target.value)}
                          className="w-full h-8 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Status</label>
                        <select
                          value={editProjStatus}
                          onChange={(e) => setEditProjStatus(e.target.value as 'In Progress' | 'Completed')}
                          className="w-full h-8 px-2 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none"
                        >
                          <option value="Completed">Completed</option>
                          <option value="In Progress">In Progress</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Skills Used</label>
                      <SkillMultiSelect
                        selectedSkills={editProjSkills}
                        onChange={setEditProjSkills}
                        placeholder="Select or add skills used..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Description</label>
                      <textarea
                        required
                        value={editProjDesc}
                        onChange={(e) => setEditProjDesc(e.target.value)}
                        rows={2}
                        className="w-full p-2 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingProjectId(null)}
                        className="bg-reddit-bg dark:bg-reddit-bgDark text-xs font-semibold px-3 py-1.5 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-reddit-blue text-white text-xs font-semibold px-4 py-1.5 rounded"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Standard Read-Only Project Details */
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-reddit-text dark:text-reddit-textDark">{project.projectName}</h4>
                        <p className="text-[10px] text-reddit-gray font-medium mt-0.5">
                          Domain: <span className="text-reddit-orange font-semibold">{(project.domains || []).join(', ')}</span> | Role: <span className="font-semibold">{project.role}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="bg-reddit-orange/10 text-reddit-orange text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {project.completionStatus}
                        </span>

                        {isOwnProfile && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleEditProjectClick(project)}
                              className="text-reddit-gray hover:text-reddit-blue p-1 rounded"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProject(project._id)}
                              className="text-reddit-gray hover:text-red-500 p-1 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-reddit-gray leading-normal">{project.description}</p>

                    {project.skillsUsed && project.skillsUsed.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.skillsUsed.map((s, i) => (
                          <span key={i} className="bg-reddit-bg dark:bg-reddit-bgDark text-reddit-text dark:text-reddit-textDark text-[9px] px-1.5 py-0.2 rounded font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column Widget: Invites & Stats */}
      <div className="w-80 hidden lg:block flex-shrink-0 flex flex-col gap-4">
        {/* Mutual Connections Widget */}
        {!isOwnProfile && mutualData && (
          <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 flex flex-col gap-3 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-reddit-orange border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-2">
              Mutual Connections
            </h3>
            <div className="flex justify-between items-center text-xs">
              <span className="text-reddit-gray font-medium">Connection Strength</span>
              <span className="font-extrabold bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded text-[10px]">
                {mutualData.connectionScore} Worked Together
              </span>
            </div>
            
            {mutualData.sharedProjects.length > 0 ? (
              <div className="flex flex-col gap-2 border-t border-reddit-border/30 dark:border-reddit-borderDark/30 pt-2">
                <span className="text-[9px] text-reddit-gray font-bold uppercase tracking-wider">Shared Completed Projects:</span>
                <div className="flex flex-col gap-2">
                  {mutualData.sharedProjects.map((p, idx) => (
                    <div key={idx} className="p-2 rounded bg-reddit-bg/60 dark:bg-reddit-bgDark/60 border border-reddit-border/20 text-[11px] flex flex-col gap-1">
                      <span className="font-bold text-reddit-text dark:text-reddit-textDark truncate">{p.projectName}</span>
                      <div className="text-[9.5px] text-reddit-gray leading-tight">
                        Roles: <span className="font-semibold text-reddit-text dark:text-reddit-textDark">{p.myRole}</span> (You) & <span className="font-semibold text-reddit-text dark:text-reddit-textDark">{p.theirRole}</span> (Them)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-reddit-gray italic mt-1 border-t border-reddit-border/30 dark:border-reddit-borderDark/30 pt-2">
                No previous shared project experience on Kindred.
              </p>
            )}
          </div>
        )}

        {/* Profile Metrics Widget */}
        <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-reddit-gray border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-2">Student Metrics</h3>
          
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-reddit-gray flex items-center gap-1.5"><FolderKanban className="h-3.5 w-3.5" /> Active Projects</span>
            <span className="text-xs font-bold bg-reddit-bg dark:bg-reddit-bgDark px-2 py-0.5 rounded">{activeProjectsCount}</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-reddit-gray flex items-center gap-1.5"><Save className="h-3.5 w-3.5" /> Total Portfolios</span>
            <span className="text-xs font-bold bg-reddit-bg dark:bg-reddit-bgDark px-2 py-0.5 rounded">{projects.length}</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-reddit-gray flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Invitations State</span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
              profileUser.openToInvitations
                ? 'text-green-500 bg-green-500/10'
                : 'text-reddit-gray bg-reddit-bg dark:bg-reddit-bgDark'
            }`}>
              {profileUser.openToInvitations ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>

        {/* Invite to Team Widget (Only shown on other profiles when open) */}
        {!isOwnProfile && profileUser.openToInvitations && (
          <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-reddit-orange border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-2">
              Invite to Team
            </h3>

            {myLeadTeams.length === 0 ? (
              <p className="text-xs text-reddit-gray italic">
                You must be the Team Lead of a recruiting team to send invitations.
              </p>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-3">
                {inviteStatusMsg && (
                  <div className={`p-2 rounded text-[10px] font-semibold border ${
                    inviteStatusMsg.includes('success')
                      ? 'bg-green-500/10 text-green-500 border-green-500/20'
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {inviteStatusMsg}
                  </div>
                )}

                {myLeadTeams.length > 1 ? (
                  <div>
                    <label className="block text-[9px] font-bold text-reddit-gray uppercase mb-1">Select Team</label>
                    <select
                      required
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full h-8 px-2 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none"
                    >
                      <option value="">-- Choose Team --</option>
                      {myLeadTeams.map((t) => (
                        <option key={t._id} value={t._id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="bg-reddit-bg dark:bg-reddit-bgDark p-2 border border-reddit-border/20 rounded font-sans text-xs">
                    <p className="text-[10px] text-reddit-gray font-bold uppercase mb-0.5">Inviting to Team</p>
                    <p className="text-xs font-bold text-reddit-text dark:text-reddit-textDark">{myLeadTeams[0].title}</p>
                  </div>
                )}

                {selectedTeamId && (
                  <div>
                    {isTeamFull ? (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">This team has reached its maximum capacity.</p>
                    ) : (
                      <p className="text-[10px] text-green-500 font-semibold mt-1">Capacity: {teamCapacityInfo}</p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedTeamId || isTeamFull}
                  className="w-full h-8 bg-reddit-orange hover:bg-reddit-orangeHover disabled:opacity-55 text-white text-xs font-semibold rounded flex items-center justify-center gap-1 pt-0.5"
                >
                  <Mail className="h-3.5 w-3.5" /> Send Invitation
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
