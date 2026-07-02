import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Shield, ArrowRight } from 'lucide-react';
import api from '../services/api';
import type { ITeam } from '../types';
import { useAuth } from '../contexts/AuthContext';

const MyTeams: React.FC = () => {
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyTeams = async () => {
      try {
        setLoading(true);
        const res = await api.get('/teams');
        // Filter teams where user is a member
        const myTeams = res.data.teams.filter((t: ITeam) =>
          t.members.some((m) => m.userId?._id === user?.id || (m.userId as any) === user?.id)
        );
        setTeams(myTeams);
      } catch (err) {
        console.error('Failed to fetch my teams:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchMyTeams();
    }
  }, [user]);

  return (
    <div className="flex-1 max-w-2xl mx-auto min-w-0">
      <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-5">
        <h2 className="text-base font-extrabold text-reddit-text dark:text-reddit-textDark border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-3 mb-4 flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-reddit-blue" /> Collaborative Projects
        </h2>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((n) => (
              <div key={n} className="bg-reddit-bg dark:bg-reddit-bgDark h-20 rounded" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12 text-xs text-reddit-gray">
            <p className="font-semibold mb-1">No Project Memberships Found</p>
            <p className="mb-4">You are not part of any collaboration teams yet.</p>
            <button
              onClick={() => navigate('/')}
              className="bg-reddit-blue text-white text-xs font-semibold px-4 py-2 rounded"
            >
              Explore Home Feed
            </button>
          </div>
        ) : (
          <div className="divide-y divide-reddit-border/30 dark:divide-reddit-borderDark/30">
            {teams.map((t) => {
              const isLead = (typeof t.creatorId === 'object' ? t.creatorId._id : t.creatorId) === user?.id;
              const myRole = t.members.find((m) => m.userId?._id === user?.id || (m.userId as any) === user?.id)?.roleName || 'Member';
              
              return (
                <div
                  key={t._id}
                  onClick={() => navigate(`/teams/${t._id}`)}
                  className="py-4 first:pt-0 last:pb-0 hover:bg-reddit-bg/20 dark:hover:bg-reddit-bgDark/20 cursor-pointer flex justify-between items-center transition-colors px-2 rounded"
                >
                  <div>
                    <h3 className="text-xs font-bold text-reddit-text dark:text-reddit-textDark flex items-center gap-1.5">
                      {t.title}
                      {isLead && (
                        <span className="text-[8px] bg-reddit-orange/15 text-reddit-orange px-1 rounded flex items-center gap-0.5 border border-reddit-orange/20 font-bold uppercase">
                          <Shield className="h-2 w-2" /> Lead
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-reddit-gray mt-1 font-medium">
                      Domain: <span className="text-reddit-orange font-semibold">{(t.domains || []).join(', ')}</span> | Assigned Role: <span className="font-semibold text-reddit-text dark:text-reddit-textDark">{myRole}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded ${
                      t.status === 'Completed'
                        ? 'bg-green-500/10 text-green-500'
                        : t.status === 'In Progress'
                        ? 'bg-reddit-blue/10 text-reddit-blue'
                        : 'bg-reddit-orange/10 text-reddit-orange'
                    }`}>
                      {t.status}
                    </span>
                    <ArrowRight className="h-4 w-4 text-reddit-gray" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTeams;
