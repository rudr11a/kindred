import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Users, Search, Filter } from 'lucide-react';
import api from '../services/api';
import type { ITeam } from '../types';
import { useAuth } from '../contexts/AuthContext';
import NetworkGraph from '../components/common/NetworkGraph';

const Home: React.FC = () => {
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.query = search;
      if (domainFilter) params.domain = domainFilter;
      
      const res = await api.get('/teams', { params });
      setTeams(res.data.teams);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [domainFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTeams();
  };

  return (
    <div className="flex-1 flex justify-between gap-6 min-w-0">
      {/* Center Feed (Reddit Style Cards) */}
      <div className="flex-1 max-w-2xl min-w-0 flex flex-col gap-4">
        {/* Search & Filter Bar */}
        <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-3 flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-reddit-gray" />
            <input
              type="text"
              placeholder="Search recruiting projects or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 bg-reddit-bg dark:bg-reddit-bgDark border border-transparent hover:border-reddit-border dark:hover:border-reddit-borderDark focus:border-reddit-blue rounded pl-9 pr-4 text-xs outline-none outline-0 transition-colors"
            />
          </form>
          
          <div className="flex gap-2">
            <div className="relative flex items-center bg-reddit-bg dark:bg-reddit-bgDark rounded px-2 text-reddit-gray border border-transparent">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="bg-transparent text-xs text-reddit-text dark:text-reddit-textDark outline-none py-1 border-0 cursor-pointer"
              >
                <option value="">All Domains</option>
                <option value="Healthcare">Healthcare</option>
                <option value="AI/ML">AI / ML</option>
                <option value="Web Development">Web Dev</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Cloud Computing">Cloud Computing</option>
                <option value="IoT">IoT</option>
              </select>
            </div>
            <button
              onClick={() => navigate('/teams/create')}
              className="bg-reddit-orange hover:bg-reddit-orangeHover text-white text-xs font-semibold px-4 py-2 rounded flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Create
            </button>
          </div>
        </div>

        {/* Feed List */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 animate-pulse h-40" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-10 text-center flex flex-col items-center justify-center font-sans">
            <div className="h-14 w-14 rounded-full bg-reddit-orange/10 flex items-center justify-center text-reddit-orange mb-4">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-extrabold text-reddit-text dark:text-reddit-textDark mb-3">Welcome to Kindred</h3>
            <div className="text-xs text-reddit-gray mb-6 space-y-1 font-medium">
              <p>Build teams.</p>
              <p>Find collaborators.</p>
              <p>Turn ideas into projects.</p>
            </div>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate('/teams/create')}
                className="bg-reddit-blue text-white text-xs font-bold px-5 py-2.5 rounded hover:bg-opacity-90 transition-all shadow-sm"
              >
                Create Team
              </button>
              <button
                onClick={() => navigate('/search')}
                className="bg-reddit-orange hover:bg-reddit-orangeHover text-white text-xs font-bold px-5 py-2.5 rounded transition-all shadow-sm"
              >
                Find Teammates
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {teams.map((team) => (
              <div
                key={team._id}
                onClick={() => navigate(`/teams/${team._id}`)}
                className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 hover:border-reddit-gray dark:hover:border-gray-500 cursor-pointer transition-colors flex flex-col gap-2.5"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-reddit-gray">
                    <span>Created by:</span>
                    <span className="font-semibold text-reddit-text dark:text-reddit-textDark hover:underline">
                      {typeof team.creatorId === 'object'
                        ? `${team.creatorId.name} (${team.creatorId.usn})`
                        : 'Kindred Member'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(team.domains || []).map((dom, i) => (
                      <span key={i} className="bg-reddit-orange/10 text-reddit-orange border border-reddit-orange/20 font-bold px-2 py-0.5 rounded text-[8px]">
                        {dom}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Body */}
                <div>
                  <h3 className="text-sm font-bold text-reddit-text dark:text-reddit-textDark hover:text-reddit-blue transition-colors">
                    {team.title}
                  </h3>
                  <p className="text-xs text-reddit-gray mt-1.5 line-clamp-3 leading-relaxed">
                    {team.description}
                  </p>
                </div>

                {/* Required Skills summary */}
                {team.skills && team.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center mt-1">
                    <span className="text-[10px] text-reddit-gray font-bold uppercase tracking-wider mr-1.5">Skills Needed:</span>
                    {team.skills.slice(0, 5).map((skill, index) => (
                      <span
                        key={index}
                        className="bg-reddit-bg dark:bg-reddit-bgDark text-reddit-text dark:text-reddit-textDark text-[9px] px-2 py-0.5 rounded font-bold border border-reddit-border/30 dark:border-reddit-borderDark/30"
                      >
                        {skill}
                      </span>
                    ))}
                    {team.skills.length > 5 && (
                      <span className="text-[9px] text-reddit-gray font-bold">+{team.skills.length - 5} more</span>
                    )}
                  </div>
                )}

                {/* Team Capacity Progress Bar */}
                {(() => {
                  const totalRequired = team.maxMembers;
                  const totalFilled = team.members.length;
                  const fillPercentage = Math.min(100, Math.round((totalFilled / totalRequired) * 100));
                  return (
                    <div className="space-y-1 mt-1 font-sans">
                      <div className="flex justify-between items-center text-[9px] text-reddit-gray font-bold uppercase tracking-wider">
                        <span>Team Capacity</span>
                        <span>{totalFilled} / {totalRequired} Members ({fillPercentage}%)</span>
                      </div>
                      <div className="w-full bg-reddit-bg dark:bg-reddit-bgDark h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-reddit-orange h-full rounded-full transition-all duration-300" 
                          style={{ width: `${fillPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Card Footer */}
                <div className="flex items-center justify-between text-xs mt-2 border-t border-reddit-border/30 dark:border-reddit-borderDark/30 pt-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full animate-pulse ${
                      team.status === 'Completed'
                        ? 'bg-green-500'
                        : team.status === 'In Progress'
                        ? 'bg-reddit-blue'
                        : 'bg-reddit-orange'
                    }`}></span>
                    <span className={`font-bold text-[9px] uppercase tracking-wider ${
                      team.status === 'Completed'
                        ? 'text-green-500'
                        : team.status === 'In Progress'
                        ? 'text-reddit-blue'
                        : 'text-reddit-orange'
                    }`}>{team.status === 'In Progress' ? 'Development' : team.status}</span>
                  </div>
                  <span className="text-reddit-blue font-bold hover:underline text-[10px]">View Collaboration Dashboard →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Utility Panel */}
      <div className="w-80 hidden lg:block flex-shrink-0 flex flex-col gap-4">
        {/* User Card Widget */}
        <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-reddit-orange text-white flex items-center justify-center font-bold uppercase text-lg">
              {user?.name.charAt(0)}
            </div>
            <div>
              <h4 className="text-xs font-bold text-reddit-text dark:text-reddit-textDark truncate">{user?.name}</h4>
              <p className="text-[10px] text-reddit-gray truncate">{user?.usn}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-reddit-border/30 dark:border-reddit-borderDark/30 pt-3 text-center">
            <div className="bg-reddit-bg dark:bg-reddit-bgDark rounded py-1.5">
              <span className="block text-xs font-bold text-reddit-orange">{user?.branch}</span>
              <span className="text-[8px] uppercase tracking-wider text-reddit-gray font-bold">Branch</span>
            </div>
            <div className="bg-reddit-bg dark:bg-reddit-bgDark rounded py-1.5">
              <span className="block text-xs font-bold text-reddit-blue">{user?.year} Year</span>
              <span className="text-[8px] uppercase tracking-wider text-reddit-gray font-bold">Academic Year</span>
            </div>
          </div>
          <Link
            to="/teams/create"
            className="w-full h-8 bg-reddit-blue hover:bg-opacity-95 text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors pt-0.5"
          >
            <Plus className="h-3.5 w-3.5" /> Start New Project
          </Link>
        </div>

        {/* Collaboration Network Graph Visualization */}
        <NetworkGraph />
      </div>
    </div>
  );
};

export default Home;
