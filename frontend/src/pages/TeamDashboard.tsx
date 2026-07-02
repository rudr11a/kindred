import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, Users, MessageSquare, Shield, ShieldCheck, ToggleLeft, ToggleRight, ArrowUpRight, Send, AlertTriangle, Trash2, X, Mail } from 'lucide-react';
import api from '../services/api';
import type { ITeam, IDiscussionMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatActivityDate } from '../utils/date';
import { useSocket } from '../contexts/SocketContext';

const TeamDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();

  const [team, setTeam] = useState<ITeam | null>(null);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [messages, setMessages] = useState<IDiscussionMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmTeamName, setConfirmTeamName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Chat Enhancements States
  const typingTimeoutRef = useRef<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: string }>({});
  const [chatAnimations, setChatAnimations] = useState<{ id: string; emoji: string; className: string; style: React.CSSProperties }[]>([]);
  const [prevMemberCount, setPrevMemberCount] = useState<number | null>(null);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const triggerAnimation = (emoji: string, type: 'float' | 'rocket' | 'pop' | 'bounce' | 'wave') => {
    const id = Math.random().toString(36).substring(2, 9);
    let style: React.CSSProperties = {};
    let className = '';

    if (type === 'float') {
      className = 'chat-anim-float';
      style = {
        bottom: '20px',
        left: `${20 + Math.random() * 60}%`,
      };
    } else if (type === 'rocket') {
      className = 'chat-anim-rocket';
      style = {
        bottom: '20px',
        left: '20px',
      };
    } else if (type === 'pop') {
      className = 'chat-anim-pop';
      style = {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    } else if (type === 'bounce') {
      className = 'chat-anim-bounce';
      style = {
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    } else if (type === 'wave') {
      className = 'chat-anim-wave';
      style = {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    setChatAnimations((prev) => [...prev, { id, emoji, className, style }]);
    setTimeout(() => {
      setChatAnimations((prev) => prev.filter((a) => a.id !== id));
    }, 2100);
  };

  // Join request state variables
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [hasPendingInvitation, setHasPendingInvitation] = useState(false);

  const navigate = useNavigate();

  // Team activities state
  interface IActivityLog {
    _id: string;
    entityId: string;
    entityType: 'Team';
    action: string;
    actorId: {
      _id: string;
      name: string;
      usn: string;
    } | null;
    details: string;
    createdAt: string;
  }
  const [activities, setActivities] = useState<IActivityLog[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isLead, setIsLead] = useState(false);
  const [isMember, setIsMember] = useState(false);

  // Edit Team state variables
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDomains, setEditDomains] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchJoinRequests = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/join-requests/team/${id}`);
      setJoinRequests(res.data.requests || []);
    } catch (err) {
      console.error('Failed to fetch join requests:', err);
    }
  };

  const fetchTeamDetails = async () => {
    try {
      const res = await api.get(`/teams/${id}`);
      const currentTeam = res.data.team;
      setTeam(currentTeam);
      setIsLead(res.data.isTeamLead || false);
      setIsMember(res.data.isMember || false);
      setMissingSkills(res.data.missingSkills || []);
      setHasPendingRequest(res.data.hasPendingRequest || false);
      setHasPendingInvitation(res.data.hasPendingInvitation || false);
      setEditTitle(currentTeam.title);
      setEditDescription(currentTeam.description);
      setEditDomains((currentTeam.domains || []).join(', '));
      setEditTags((currentTeam.tags || []).join(', '));
      setEditSkills((currentTeam.skills || []).join(', '));

      // Check access details locally based on current user context
      const leadCheck = res.data.isTeamLead;
      const memberCheck = res.data.isMember;

      if (leadCheck || memberCheck) {
        // Fetch activity
        try {
          const actRes = await api.get(`/teams/${id}/activity`);
          setActivities(actRes.data.logs || []);
        } catch (err) {
          console.error('Failed to retrieve activities:', err);
        }
        if (currentTeam.discussionEnabled) {
          fetchChatHistory();
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to retrieve team details.');
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await api.get(`/teams/${id}/activity`);
      setActivities(res.data.logs || []);
    } catch (err) {
      console.error('Failed to retrieve team activities:', err);
    }
  };

  const fetchChatHistory = async () => {
    try {
      setChatLoading(true);
      const res = await api.get(`/teams/${id}/messages`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setChatLoading(false);
    }
  };

  // Load initial details
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchTeamDetails();
      setLoading(false);
    };
    init();
  }, [id, currentUser]);

  // Fetch join requests if the user is the Team Lead
  useEffect(() => {
    if (team && isLead) {
      fetchJoinRequests();
    }
  }, [team?._id, isLead]);

  // Load chat once discussion becomes enabled
  useEffect(() => {
    if (team?.discussionEnabled) {
      fetchChatHistory();
    } else {
      setMessages([]);
    }
  }, [team?.discussionEnabled]);

  // Socket room connection & listeners
  useEffect(() => {
    if (!socket || !team || (!isLead && !isMember)) return;

    // Join team socket room
    socket.emit('join_team', { teamId: team._id });

    // Listen for incoming messages (deduplicated)
    const handleNewMessage = (msg: IDiscussionMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      // Wave when a new message is received from someone else
      if (currentUser && msg.senderId && msg.senderId._id !== currentUser.id) {
        triggerAnimation('👋', 'wave');
      }
    };

    // Listen for team changes (e.g. new member accepts invitation)
    const handleTeamUpdated = () => {
      fetchTeamDetails();
      fetchActivities();
    };

    // Listen for real-time typing indicators
    const handleUserTyping = ({ userId, userName, isTyping }: { userId: string; userName: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) {
          next[userId] = userName;
        } else {
          delete next[userId];
        }
        return next;
      });
    };

    // Listen for real-time reactions
    const handleMessageReaction = ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg))
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('team_updated', handleTeamUpdated);
    socket.on('user_typing', handleUserTyping);
    socket.on('message_reaction', handleMessageReaction);

    return () => {
      socket.emit('leave_team', { teamId: team._id });
      socket.off('new_message', handleNewMessage);
      socket.off('team_updated', handleTeamUpdated);
      socket.off('user_typing', handleUserTyping);
      socket.off('message_reaction', handleMessageReaction);
    };
  }, [socket, team?._id, isLead, isMember]);

  // Live animations observer on team details changes
  useEffect(() => {
    if (!team) return;

    const currentCount = team.members.length;
    if (prevMemberCount !== null && currentCount > prevMemberCount) {
      triggerAnimation('🎉', 'float');
      triggerAnimation('👋', 'wave');
    }
    setPrevMemberCount(currentCount);

    if (prevStatus !== null && team.status === 'In Progress' && prevStatus !== 'In Progress') {
      triggerAnimation('🚀', 'rocket');
    }
    setPrevStatus(team.status);
  }, [team, prevMemberCount, prevStatus]);

  // Auto-scroll chat feed to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (val: string) => {
    setMessageInput(val);

    if (!socket || !team || !currentUser) return;

    if (!isTyping && val.trim().length > 0) {
      setIsTyping(true);
      socket.emit('typing', {
        teamId: team._id,
        isTyping: true,
        userName: currentUser.name,
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', {
        teamId: team._id,
        isTyping: false,
        userName: currentUser.name,
      });
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !team) return;

    const trimmedMsg = messageInput.trim();
    setMessageInput('');

    // Clear typing timeout and emit typing: false immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);
    if (socket && currentUser) {
      socket.emit('typing', {
        teamId: team._id,
        isTyping: false,
        userName: currentUser.name,
      });
    }

    try {
      const res = await api.post(`/teams/${team._id}/messages`, { message: trimmedMsg });
      const newMsg = res.data.chatMessage;
      setMessages((prev) => {
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to send message.');
      setMessageInput(trimmedMsg);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!team) return;

    // Trigger local animation feedback immediately
    if (emoji === '❤️') {
      triggerAnimation('❤️', 'pop');
    } else if (emoji === '😂') {
      triggerAnimation('😂', 'bounce');
    }

    try {
      const res = await api.put(`/teams/${team._id}/messages/${messageId}/react`, { emoji });
      const updatedReactions = res.data.reactions;
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, reactions: updatedReactions } : msg))
      );
    } catch (err) {
      console.error('[handleToggleReaction error]', err);
    }
  };

  const handleToggleDiscussion = async () => {
    if (!team) return;
    try {
      const updatedEnabled = !team.discussionEnabled;
      const res = await api.put(`/teams/${team._id}/toggle-chat`, {
        discussionEnabled: updatedEnabled,
      });
      setTeam(res.data.team);
    } catch (err) {
      console.error(err);
      alert('Failed to update discussion settings.');
    }
  };

  const handleUpdateStatus = async (newStatus: 'Recruiting' | 'In Progress' | 'Completed') => {
    if (!team) return;
    try {
      const res = await api.put(`/teams/${team._id}/status`, {
        status: newStatus,
      });
      setTeam(res.data.team);
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const handleLeaveTeam = async () => {
    if (!team) return;
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    try {
      await api.post(`/teams/${team._id}/leave`);
      alert('You have successfully left the team.');
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to leave the team.');
    }
  };

  const handleDeleteTeam = async () => {
    if (!team) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/teams/${team._id}`);
      setShowDeleteModal(false);
      alert('Team deleted successfully.');
      navigate('/teams');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete the team.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    try {
      setEditLoading(true);
      const res = await api.put(`/teams/${team._id}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        domains: editDomains.split(',').map((d) => d.trim()).filter(Boolean),
        tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
        skills: editSkills.split(',').map((s) => s.trim()).filter(Boolean),
      });
      alert(res.data.message || 'Team updated successfully.');
      setShowEditModal(false);
      await fetchTeamDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update team.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRespondJoinRequest = async (requestId: string, status: 'Accepted' | 'Rejected') => {
    try {
      const res = await api.put(`/join-requests/${requestId}/respond`, { status });
      alert(res.data.message || `Request ${status.toLowerCase()} successfully.`);
      await fetchTeamDetails();
      await fetchJoinRequests();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to process request.');
    }
  };

  const handleSubmitJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    try {
      setRequestSubmitting(true);
      const res = await api.post('/join-requests', {
        teamId: team._id,
        message: joinMessage,
      });
      alert(res.data.message || 'Request sent successfully!');
      setShowJoinModal(false);
      setJoinMessage('');
      await fetchTeamDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!team || !userId) return;
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return;
    try {
      await api.delete(`/teams/${team._id}/members/${userId}`);
      alert('Member was removed successfully.');
      fetchTeamDetails();
      fetchActivities();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 text-center py-12 animate-pulse text-xs text-reddit-gray">
        Opening team workspace...
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="flex-1 bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
        <h3 className="font-bold text-sm">Failed to Load Dashboard</h3>
        <p className="text-xs text-reddit-gray mt-1">{error || 'Team workspace not found.'}</p>
        <Link to="/" className="text-xs text-reddit-blue hover:underline mt-4 inline-block">Return to Feed</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex justify-between gap-6 min-w-0">
      {/* Central Column: details, timeline, and discussion chat */}
      <div className="flex-1 max-w-2xl min-w-0 flex flex-col gap-4">
        {/* Project Header Card */}
        <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-5 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-base font-extrabold text-reddit-text dark:text-reddit-textDark">{team.title}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap font-sans">
                <p className="text-[10px] text-reddit-gray">
                  Domain: <strong className="text-reddit-orange font-semibold">{(team.domains || []).join(', ')}</strong>
                </p>
                <span className="bg-reddit-bg dark:bg-reddit-bgDark text-reddit-text dark:text-reddit-textDark text-[9.5px] px-2 py-0.5 rounded-full font-bold border border-reddit-border/30 dark:border-reddit-borderDark/30">
                  Members: {team.members.length} / {team.maxMembers}
                </span>
                {team.members.length >= team.maxMembers && (
                  <span className="bg-red-500/10 text-red-500 text-[9.5px] px-2 py-0.5 rounded-full font-bold border border-red-500/30 animate-pulse">
                    Team Full
                  </span>
                )}
              </div>
            </div>
            <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded ${
              team.status === 'Completed'
                ? 'bg-green-500/10 text-green-500'
                : team.status === 'In Progress'
                ? 'bg-reddit-blue/10 text-reddit-blue'
                : 'bg-reddit-orange/10 text-reddit-orange'
            }`}>
              {team.status}
            </span>
          </div>

          <p className="text-xs text-reddit-gray leading-relaxed">{team.description}</p>

          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-reddit-border/20">
            {team.tags.map((t, i) => (
              <span key={i} className="text-[9px] font-bold text-reddit-gray bg-reddit-bg dark:bg-reddit-bgDark px-2 py-0.5 rounded">
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* Activity Timeline Widget */}
        <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-reddit-gray mb-3 flex items-center gap-1.5 font-sans">
            <Calendar className="h-4 w-4" /> Team Activity timeline
          </h3>

          {activities.length === 0 ? (
            <p className="text-xs text-reddit-gray italic pl-2 font-sans">No activity events recorded yet.</p>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-reddit-border dark:before:bg-reddit-borderDark max-h-[300px] overflow-y-auto pr-1">
              {activities.map((act) => {
                const dateStr = formatActivityDate(act.createdAt);
                return (
                  <div key={act._id} className="relative before:absolute before:-left-6 before:top-1.5 before:w-2 before:h-2 before:rounded-full before:bg-reddit-orange before:border-2 before:border-reddit-card dark:before:border-reddit-cardDark font-sans">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-[10px] font-extrabold uppercase text-reddit-text dark:text-reddit-textDark">
                        {act.action}
                      </span>
                      <span className="text-[8.5px] text-reddit-gray whitespace-nowrap">{dateStr}</span>
                    </div>
                    <p className="text-[10px] text-reddit-gray mt-0.5 leading-relaxed">
                      {act.actorId ? (
                        <strong className="text-reddit-text dark:text-reddit-textDark font-semibold">{act.actorId.name} ({act.actorId.usn})</strong>
                      ) : (
                        'System'
                      )}{' '}
                      {act.details}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Discussion Chat Panel */}
        <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 flex flex-col h-[420px] relative">
          {/* Render Active Overlay Animations */}
          {chatAnimations.map((anim) => (
            <div key={anim.id} className={anim.className} style={anim.style}>
              {anim.emoji}
            </div>
          ))}

          <div className="flex justify-between items-center border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-3 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-reddit-gray flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" /> Dev Den
            </h3>

            {isLead && (
              <div className="flex items-center gap-2">
                <button onClick={handleToggleDiscussion} className="text-reddit-orange focus:outline-none">
                  {team.discussionEnabled ? (
                    <ToggleRight className="h-6 w-6 text-reddit-orange" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-reddit-gray" />
                  )}
                </button>
                <span className="text-[10px] font-bold text-reddit-gray">Enable Chat</span>
              </div>
            )}
          </div>

          {/* Chat Feed body */}
          {!isLead && !isMember ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <Shield className="h-10 w-10 text-reddit-gray opacity-40 mb-2" />
              <p className="text-xs font-bold text-reddit-gray">Private Workspace Forum</p>
              <p className="text-[10px] text-reddit-gray mt-0.5 leading-normal max-w-xs font-sans">
                Only approved team members can view or participate in discussions.
              </p>
            </div>
          ) : !team.discussionEnabled ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <Shield className="h-10 w-10 text-reddit-gray opacity-40 mb-2" />
              <p className="text-xs font-bold text-reddit-gray">Discussion disabled</p>
              <p className="text-[10px] text-reddit-gray mt-0.5 leading-normal max-w-xs">
                Only the Team Lead can toggle this forum open.
              </p>
            </div>
          ) : chatLoading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-reddit-gray animate-pulse">
              Loading chat logs...
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-3">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-[10px] text-reddit-gray italic">
                    This forum is empty. Write the first message!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSenderMe = currentUser && msg.senderId && msg.senderId._id === currentUser.id;
                    
                    // Group reactions
                    const reactionGroups: { [emoji: string]: { count: number; userReacted: boolean } } = {};
                    (msg.reactions || []).forEach((r) => {
                      const userReacted = currentUser && r.userId === currentUser.id;
                      if (!reactionGroups[r.emoji]) {
                        reactionGroups[r.emoji] = { count: 0, userReacted: false };
                      }
                      reactionGroups[r.emoji].count += 1;
                      if (userReacted) {
                        reactionGroups[r.emoji].userReacted = true;
                      }
                    });

                    // Initials for avatar
                    const nameParts = (msg.senderId?.name || 'Student').split(' ');
                    const initials = nameParts.map((p) => p[0]).join('').substring(0, 2).toUpperCase();

                    return (
                      <div
                        key={msg._id}
                        className={`flex gap-2 max-w-[85%] ${
                          isSenderMe ? 'self-end flex-row-reverse ml-auto' : 'self-start flex-row mr-auto'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-tr from-reddit-orange to-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm select-none">
                          {initials}
                        </div>

                        <div className={`flex flex-col ${isSenderMe ? 'items-end' : 'items-start'}`}>
                          <span className="text-[9px] text-reddit-gray font-semibold mb-0.5">
                            {msg.senderId?.name} • <span className="font-normal text-[8px]">{formatActivityDate(msg.createdAt)}</span>
                          </span>
                          
                          <div
                            className={`p-2.5 rounded text-xs leading-relaxed break-words max-w-full ${
                              isSenderMe
                                ? 'bg-reddit-orange text-white rounded-br-none'
                                : 'bg-reddit-bg dark:bg-reddit-bgDark text-reddit-text dark:text-reddit-textDark rounded-bl-none'
                            }`}
                          >
                            {msg.message}
                          </div>

                          {/* Reactions container */}
                          <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                            {Object.entries(reactionGroups).map(([emoji, info]) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg._id, emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] transition-all ${
                                  info.userReacted
                                    ? 'bg-reddit-orange/10 border-reddit-orange text-reddit-orange font-bold'
                                    : 'bg-reddit-bg/60 dark:bg-reddit-bgDark/60 border-reddit-border dark:border-reddit-borderDark text-reddit-gray hover:bg-reddit-border/30 dark:hover:bg-reddit-borderDark/30'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span>{info.count}</span>
                              </button>
                            ))}

                            {/* Add reaction hover picker */}
                            <div className="relative group/react">
                              <button className="flex items-center justify-center w-5 h-5 rounded-full border border-reddit-border dark:border-reddit-borderDark text-[9px] text-reddit-gray hover:bg-reddit-bg dark:hover:bg-reddit-bgDark hover:text-reddit-text dark:hover:text-reddit-textDark">
                                +
                              </button>
                              
                              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover/react:flex items-center gap-1 p-1 bg-white dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded shadow-lg z-20">
                                {['👍', '❤️', '😂', '🔥', '🎉', '👀', '💯', '🚀'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleToggleReaction(msg._id, emoji)}
                                    className="w-5 h-5 flex items-center justify-center hover:bg-reddit-bg dark:hover:bg-reddit-bgDark rounded transition-colors text-xs select-none"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Typing indicators */}
              {Object.keys(typingUsers).length > 0 && (
                <div className="px-3 py-1 text-[9px] text-reddit-gray italic animate-pulse font-sans">
                  {Object.keys(typingUsers).length === 1
                    ? `${Object.values(typingUsers)[0]} is typing...`
                    : `${Object.keys(typingUsers).length} people are typing...`}
                </div>
              )}

              {/* Typing Box */}
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center relative">
                {/* Emoji Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="h-9 w-9 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded flex items-center justify-center text-reddit-gray hover:text-reddit-text dark:hover:text-reddit-textDark transition-colors text-sm"
                  >
                    😊
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-full mb-2 left-0 p-2 bg-white dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded shadow-lg grid grid-cols-4 gap-1.5 z-30 w-36">
                      {['👍', '❤️', '😂', '🔥', '🎉', '👀', '💯', '🚀', '👋', '💻', '🙌', '🤔', '👏', '🎯', '🌟', '💖'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setMessageInput((prev) => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="w-7 h-7 flex items-center justify-center hover:bg-reddit-bg dark:hover:bg-reddit-bgDark rounded text-base transition-colors select-none"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Type a text message..."
                  value={messageInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="flex-1 h-9 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none focus:border-reddit-blue"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="h-9 w-9 bg-reddit-blue text-white rounded flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Roles, Member list, and Skill Gap */}
      <div className="w-80 hidden lg:block flex-shrink-0 flex flex-col gap-4">
        {/* Lead controls widget */}
        {isLead && (
          <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-orange/40 rounded-md p-4 flex flex-col gap-2.5 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-reddit-orange flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Lead Workspace
            </h3>

            <div className="space-y-2 mt-1">
              <p className="text-[10px] text-reddit-gray font-semibold leading-normal">Update project phase status:</p>
              
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => handleUpdateStatus('Recruiting')}
                  disabled={team.status === 'Recruiting'}
                  className="h-8 bg-reddit-bg dark:bg-reddit-bgDark hover:bg-reddit-border border border-reddit-border/20 text-xs font-bold rounded disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  Mark as Recruiting
                </button>
                <button
                  onClick={() => handleUpdateStatus('In Progress')}
                  disabled={team.status === 'In Progress'}
                  className="h-8 bg-reddit-blue text-white hover:bg-opacity-95 text-xs font-bold rounded disabled:opacity-40 transition-colors"
                >
                  Mark In Progress
                </button>
                <button
                  onClick={() => handleUpdateStatus('Completed')}
                  disabled={team.status === 'Completed'}
                  className="h-8 bg-green-600 text-white hover:bg-opacity-95 text-xs font-bold rounded disabled:opacity-40 transition-colors"
                >
                  Mark Completed
                </button>
              </div>

              {/* Manage Members (Remove Action) */}
              {team.members.length > 1 && (
                <div className="mt-3 pt-3 border-t border-reddit-border/20 space-y-2">
                  <p className="text-[10px] text-reddit-gray font-semibold leading-normal">Remove Members:</p>
                  <div className="space-y-2">
                    {team.members
                      .filter((m) => {
                        const mId = typeof m.userId === 'object' ? m.userId._id || m.userId.id : m.userId;
                        return mId !== currentUser?.id;
                      })
                      .map((m, i) => (
                        <div key={i} className="flex justify-between items-center text-[10.5px] bg-reddit-bg/40 dark:bg-reddit-bgDark/40 p-2 border border-reddit-border/10 rounded">
                          <span className="font-bold text-reddit-text dark:text-reddit-textDark truncate max-w-[120px]">
                            {m.userId?.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.userId?._id || m.userId?.id)}
                            className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-2 py-0.5 rounded text-[9.5px] font-bold border border-red-500/20 transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {/* Lead Actions */}
              <div className="mt-3 pt-3 border-t border-reddit-border/20 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="w-full h-8 bg-reddit-blue hover:bg-opacity-95 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  Edit Team
                </button>
                <button
                  type="button"
                  disabled={team.members.length >= team.maxMembers}
                  onClick={() => navigate('/search')}
                  className="w-full h-8 bg-reddit-orange hover:bg-reddit-orangeHover disabled:opacity-40 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  Invite Members
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full h-8 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" /> Delete Team
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Collaboration Status / Actions for Non-Leads */}
        {!isLead && (
          <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 flex flex-col gap-3 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-reddit-text dark:text-reddit-textDark border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-2">
              Collaboration Status
            </h3>
            
            {isMember && (
              <div className="bg-green-500/10 border border-green-500/20 rounded p-3 text-[10.5px] text-green-600 dark:text-green-400 leading-relaxed font-bold text-center">
                ✓ You are a member of this team.
              </div>
            )}

            {!isMember && hasPendingInvitation && (
              <div className="bg-reddit-orange/10 border border-reddit-orange/20 rounded p-3 text-[10.5px] text-reddit-orange leading-relaxed font-semibold text-center font-sans">
                ✉️ Invitation Pending
              </div>
            )}

            {!isMember && !hasPendingInvitation && hasPendingRequest && (
              <div className="flex flex-col gap-2">
                <div className="bg-reddit-blue/10 border border-reddit-blue/20 rounded p-3 text-[10.5px] text-reddit-blue leading-relaxed font-semibold text-center font-sans font-sans">
                  ⏳ Join Request Pending
                </div>
                <button
                  type="button"
                  disabled
                  className="w-full h-8.5 bg-reddit-orange opacity-40 text-white text-xs font-bold rounded cursor-not-allowed flex items-center justify-center gap-1.5 font-sans"
                >
                  Request to Join
                </button>
              </div>
            )}

            {!isMember && !hasPendingInvitation && !hasPendingRequest && (
              <div className="flex flex-col gap-2">
                {team.members.length >= team.maxMembers ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-[10.5px] text-red-500 leading-relaxed font-bold text-center">
                    Team Full
                  </div>
                ) : (
                  <>
                    <p className="text-[10.5px] text-reddit-gray leading-normal">
                      Interested in joining this team? Submit a request to get started.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowJoinModal(true)}
                      className="w-full h-8.5 bg-reddit-orange hover:bg-reddit-orangeHover text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-1.5"
                    >
                      Request to Join
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {isLead && joinRequests.length > 0 && (
          <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-orange/40 rounded-md p-4 flex flex-col gap-3 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-reddit-orange border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-2">
              Pending Join Requests
            </h3>
            {team.members.length >= team.maxMembers && (
              <p className="text-[10px] text-red-500 font-bold">⚠️ Team is full. You cannot accept more members.</p>
            )}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {joinRequests.map((req) => (
                <div key={req._id} className="bg-reddit-bg/30 dark:bg-reddit-bgDark/30 border border-reddit-border/10 p-2.5 rounded flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link to={`/profile/${req.studentId?.usn}`} className="font-bold hover:underline text-reddit-text dark:text-reddit-textDark">
                        {req.studentId?.name}
                      </Link>
                      <p className="text-[9px] text-reddit-gray mt-0.5">{req.studentId?.usn}</p>
                    </div>
                  </div>

                  {req.message && (
                    <p className="bg-reddit-card dark:bg-reddit-cardDark p-2 border border-reddit-border/20 rounded text-[10px] text-reddit-gray italic leading-normal">
                      "{req.message}"
                    </p>
                  )}

                  <div className="flex justify-end gap-1.5 pt-1 border-t border-reddit-border/10">
                    <button
                      type="button"
                      onClick={() => handleRespondJoinRequest(req._id, 'Rejected')}
                      className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-2.5 py-1 rounded text-[10px] font-bold border border-red-500/20 transition-all"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={team.members.length >= team.maxMembers}
                      onClick={() => handleRespondJoinRequest(req._id, 'Accepted')}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:hover:bg-green-600 text-white px-2.5 py-1 rounded text-[10px] font-bold transition-colors"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Member Listing Card */}
        <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 flex flex-col gap-3 font-sans">
          <h3 className="text-xs font-bold uppercase tracking-wider text-reddit-gray border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-2 flex items-center gap-1.5">
            <Users className="h-4 w-4" /> Team Members
          </h3>

          <div className="space-y-3">
            {team.members.map((member, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div>
                  <Link
                    to={`/profile/${member.userId?.usn}`}
                    className="font-bold text-reddit-text dark:text-reddit-textDark hover:underline hover:text-reddit-blue flex items-center gap-1"
                  >
                    {member.userId?.name} <ArrowUpRight className="h-3 w-3 opacity-60" />
                  </Link>
                  <span className="text-[9px] text-reddit-gray">{member.userId?.usn}</span>
                </div>
                <span className="bg-reddit-bg dark:bg-reddit-bgDark text-[10px] px-2 py-0.5 rounded font-semibold text-reddit-gray">
                  {member.roleName}
                </span>
              </div>
            ))}
          </div>

          {/* Member exit action */}
          {isMember && !isLead && (
            <button
              onClick={handleLeaveTeam}
              className="w-full mt-2 h-8 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-xs font-bold rounded transition-colors"
            >
              Leave Team
            </button>
          )}
        </div>



        {/* Skill Gap Indicator Widget */}
        <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 flex flex-col gap-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-reddit-gray border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-2">
            Skill Gap Indicator
          </h3>

          <div className="space-y-3 mt-1">
            <div>
              <p className="text-[10px] text-reddit-gray font-semibold mb-1">Required Skills:</p>
              {team.skills.length === 0 ? (
                <span className="text-xs text-reddit-gray italic">None defined</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {team.skills.map((s, i) => (
                    <span key={i} className="bg-reddit-bg dark:bg-reddit-bgDark text-reddit-text dark:text-reddit-textDark text-[8px] px-1.5 py-0.5 rounded font-semibold border border-reddit-border/10">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] text-reddit-orange font-bold mb-1">Missing Skills Gap:</p>
              {missingSkills.length === 0 ? (
                <span className="text-xs text-green-500 font-semibold flex items-center gap-1">✔ Team is fully equipped!</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {missingSkills.map((s, i) => (
                    <span key={i} className="bg-red-500/10 text-red-500 text-[8px] px-1.5 py-0.5 rounded font-extrabold border border-red-500/20">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showDeleteModal && team && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
          <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-lg max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setConfirmTeamName('');
              }}
              className="absolute top-4 right-4 text-reddit-gray hover:text-reddit-text dark:hover:text-reddit-textDark transition-colors focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 pb-2 border-b border-reddit-border/30 dark:border-reddit-borderDark/30">
              <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold text-reddit-text dark:text-reddit-textDark">
                  Delete Team
                </h3>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-3 font-sans">
              <p className="text-xs text-reddit-text dark:text-reddit-textDark">
                Are you sure you want to delete <strong className="text-reddit-orange">{team.title}</strong>?
              </p>

              <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-[11px] text-red-600 dark:text-red-400 leading-relaxed font-semibold flex flex-col gap-1.5">
                <p>⚠️ Warning: This action is permanent and cannot be undone.</p>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  <li>Team members will lose all access to the workspace.</li>
                  <li>Pending invitations and join requests will be deleted.</li>
                  <li>Team references will be removed from member profiles.</li>
                </ul>
              </div>

              <div className="space-y-1.5 mt-2">
                <label className="text-[10px] text-reddit-gray font-semibold leading-normal">
                  To confirm, type the exact team name: <strong className="text-reddit-text dark:text-reddit-textDark select-none">{team.title}</strong>
                </label>
                <input
                  type="text"
                  placeholder="Type team name here"
                  value={confirmTeamName}
                  onChange={(e) => setConfirmTeamName(e.target.value)}
                  className="w-full h-9 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none focus:border-reddit-blue text-reddit-text dark:text-reddit-textDark"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2 border-t border-reddit-border/30 dark:border-reddit-borderDark/30">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmTeamName('');
                }}
                className="px-4 py-2 border border-reddit-border dark:border-reddit-borderDark text-reddit-text dark:text-reddit-textDark rounded text-xs font-bold hover:bg-reddit-bg dark:hover:bg-reddit-bgDark transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmTeamName !== team.title || deleteLoading}
                onClick={handleDeleteTeam}
                className="px-4 py-2 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Team'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showJoinModal && team && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
          <form onSubmit={handleSubmitJoinRequest} className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-lg max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 relative animate-scale-in">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowJoinModal(false);
                setJoinMessage('');
              }}
              className="absolute top-4 right-4 text-reddit-gray hover:text-reddit-text dark:hover:text-reddit-textDark transition-colors focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 pb-2 border-b border-reddit-border/30 dark:border-reddit-borderDark/30">
              <Mail className="h-5 w-5 text-reddit-orange shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold text-reddit-text dark:text-reddit-textDark">
                  Request to Join Team
                </h3>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-3 font-sans">
              <p className="text-xs text-reddit-text dark:text-reddit-textDark">
                Submit a request to join <strong className="text-reddit-orange">{team.title}</strong>.
              </p>

              {/* Message Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-reddit-gray font-semibold leading-normal">
                  Optional Message to Team Lead
                </label>
                <textarea
                  placeholder="Introduce yourself, list relevant skills/experience, or explain how you'd like to contribute..."
                  rows={4}
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  className="w-full p-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none focus:border-reddit-blue text-reddit-text dark:text-reddit-textDark leading-normal resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-reddit-border/30 dark:border-reddit-borderDark/30">
              <button
                type="button"
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinMessage('');
                }}
                className="px-4 py-2 border border-reddit-border dark:border-reddit-borderDark text-reddit-text dark:text-reddit-textDark rounded text-xs font-bold hover:bg-reddit-bg dark:hover:bg-reddit-bgDark transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={requestSubmitting}
                className="px-4 py-2 bg-reddit-orange text-white rounded text-xs font-bold hover:bg-reddit-orangeHover disabled:opacity-40 transition-colors"
              >
                {requestSubmitting ? 'Sending...' : 'Send Join Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditModal && team && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60 font-sans">
          <form onSubmit={handleEditTeam} className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-lg max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 relative animate-scale-in">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-reddit-gray hover:text-reddit-text dark:hover:text-reddit-textDark transition-colors focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 pb-2 border-b border-reddit-border/30 dark:border-reddit-borderDark/30">
              <ShieldCheck className="h-5 w-5 text-reddit-orange shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold text-reddit-text dark:text-reddit-textDark font-sans">
                  Edit Team Details
                </h3>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-3 font-sans text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] text-reddit-gray font-semibold leading-normal font-sans">
                  Team Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Kindred Platform Dev"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full h-9 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none focus:border-reddit-blue text-reddit-text dark:text-reddit-textDark font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-reddit-gray font-semibold leading-normal font-sans">
                  Team Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  placeholder="Describe your project..."
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none focus:border-reddit-blue text-reddit-text dark:text-reddit-textDark leading-normal resize-none font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-reddit-gray font-semibold leading-normal font-sans">
                  Domains (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Healthcare, AI/ML, Web Development"
                  value={editDomains}
                  onChange={(e) => setEditDomains(e.target.value)}
                  className="w-full h-9 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none focus:border-reddit-blue text-reddit-text dark:text-reddit-textDark font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-reddit-gray font-semibold leading-normal font-sans">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="react, nodejs, mongodb"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full h-9 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none focus:border-reddit-blue text-reddit-text dark:text-reddit-textDark font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-reddit-gray font-semibold leading-normal font-sans">
                  Required Skills (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="React, TypeScript, Node.js"
                  value={editSkills}
                  onChange={(e) => setEditSkills(e.target.value)}
                  className="w-full h-9 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none focus:border-reddit-blue text-reddit-text dark:text-reddit-textDark font-sans"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2 border-t border-reddit-border/30 dark:border-reddit-borderDark/30 font-sans">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-reddit-border dark:border-reddit-borderDark text-reddit-text dark:text-reddit-textDark rounded text-xs font-bold hover:bg-reddit-bg dark:hover:bg-reddit-bgDark transition-colors font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading || !editTitle.trim() || !editDescription.trim()}
                className="px-4 py-2 bg-reddit-blue text-white rounded text-xs font-bold hover:bg-opacity-95 disabled:opacity-40 transition-colors font-sans"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CSS style block for chat animations */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(100px) scale(0.5);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(-200px) scale(1.5);
            opacity: 0;
          }
        }
        @keyframes launchRocket {
          0% {
            transform: translate(-100px, 100px) rotate(45deg) scale(0.5);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(300px, -300px) rotate(45deg) scale(2);
            opacity: 0;
          }
        }
        @keyframes popReaction {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.8);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        @keyframes bounceReaction {
          0%, 100% {
            transform: translateY(0);
          }
          25% {
            transform: translateY(-30px) scale(1.3);
          }
          75% {
            transform: translateY(-10px) scale(0.9);
          }
        }
        @keyframes waveHand {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-20deg) scale(1.3);
          }
          75% {
            transform: rotate(20deg) scale(1.3);
          }
        }
        .chat-anim-float {
          position: absolute;
          font-size: 2.5rem;
          animation: floatUp 1.5s ease-out forwards;
          pointer-events: none;
          z-index: 50;
        }
        .chat-anim-rocket {
          position: absolute;
          font-size: 3rem;
          animation: launchRocket 2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          pointer-events: none;
          z-index: 50;
        }
        .chat-anim-pop {
          position: absolute;
          font-size: 2.5rem;
          animation: popReaction 0.8s ease-out forwards;
          pointer-events: none;
          z-index: 50;
        }
        .chat-anim-bounce {
          position: absolute;
          font-size: 2.5rem;
          animation: bounceReaction 1s ease-in-out forwards;
          pointer-events: none;
          z-index: 50;
        }
        .chat-anim-wave {
          position: absolute;
          font-size: 2.5rem;
          animation: waveHand 1.2s ease-in-out forwards;
          pointer-events: none;
          z-index: 50;
        }
      `}</style>
    </div>
  );
};

export default TeamDashboard;
