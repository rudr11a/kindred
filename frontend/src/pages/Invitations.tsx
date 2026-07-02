import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Check, X } from 'lucide-react';
import api from '../services/api';
import type { IInvitation } from '../types';
import { useNotifications } from '../contexts/NotificationContext';
import { formatActivityDate } from '../utils/date';

const Invitations: React.FC = () => {
  const [invitations, setInvitations] = useState<IInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { refreshBadgeCounts } = useNotifications();
  const navigate = useNavigate();

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/invitations');
      setInvitations(res.data.invitations || []);
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleResponse = async (id: string, responseStatus: 'Accepted' | 'Rejected') => {
    try {
      setProcessingId(id);
      await api.put(`/invitations/${id}/respond`, { status: responseStatus });
      await refreshBadgeCounts();
      
      // Update local state list
      setInvitations((prev) => prev.filter((i) => i._id !== id));
      
      if (responseStatus === 'Accepted') {
        const acceptedInv = invitations.find((i) => i._id === id);
        if (acceptedInv?.teamId?._id) {
          navigate(`/teams/${acceptedInv.teamId._id}`);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to respond to invitation.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex-1 max-w-2xl mx-auto min-w-0">
      <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-5">
        <h2 className="text-base font-extrabold text-reddit-text dark:text-reddit-textDark border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-3 mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-reddit-orange" /> Team Invitation Inbox
        </h2>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((n) => (
              <div key={n} className="bg-reddit-bg dark:bg-reddit-bgDark h-28 rounded" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-12 text-xs text-reddit-gray italic">
            Your invitation inbox is currently empty.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {invitations.map((inv) => (
              <div
                key={inv._id}
                className="border border-reddit-border/50 dark:border-reddit-borderDark/50 rounded-md p-4 bg-reddit-bg/15 dark:bg-reddit-bgDark/15 flex flex-col gap-3"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-xs font-bold text-reddit-text dark:text-reddit-textDark">
                      {inv.teamId?.title || 'Team Project'}
                    </h3>
                    <span className="text-[10px] text-reddit-orange bg-reddit-orange/10 font-bold px-2 py-0.5 rounded border border-reddit-orange/20">
                      {(inv.teamId?.domains || []).join(', ')}
                    </span>
                  </div>

                  <p className="text-[10px] text-reddit-gray mt-1 font-medium font-sans">
                    Invited by: <span className="font-semibold text-reddit-text dark:text-reddit-textDark">{inv.senderId?.name} ({inv.senderId?.usn})</span> • <span className="text-[9px] text-reddit-gray font-normal">{formatActivityDate(inv.createdAt)}</span>
                  </p>
                </div>

                <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border/30 dark:border-reddit-borderDark/30 p-3 rounded text-xs">
                  <p className="text-reddit-gray leading-normal text-[11px] line-clamp-3">{inv.teamId?.description}</p>
                </div>

                {(() => {
                  const isTeamFull = !!(inv.teamId?.members && inv.teamId?.maxMembers && inv.teamId.members.length >= inv.teamId.maxMembers);
                  return (
                    <div className="flex justify-end gap-2 border-t border-reddit-border/20 dark:border-reddit-borderDark/20 pt-3">
                      {isTeamFull && (
                        <span className="text-[10px] text-red-500 font-bold self-center mr-2">⚠️ Team Full</span>
                      )}
                      <button
                        onClick={() => handleResponse(inv._id, 'Rejected')}
                        disabled={processingId !== null}
                        className="bg-transparent hover:bg-red-500/10 text-red-500 text-xs font-bold px-4 py-1.5 rounded flex items-center gap-1 border border-red-500/35 transition-colors disabled:opacity-40"
                      >
                        <X className="h-3.5 w-3.5" /> Decline
                      </button>
                      <button
                        onClick={() => handleResponse(inv._id, 'Accepted')}
                        disabled={processingId !== null || isTeamFull}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-1.5 rounded flex items-center gap-1 transition-colors disabled:opacity-40"
                      >
                        <Check className="h-3.5 w-3.5" /> Accept
                      </button>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Invitations;
