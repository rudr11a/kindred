import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, UserCheck, Filter, RotateCcw } from 'lucide-react';
import api from '../services/api';
import type { IUser } from '../types';
import SkillMultiSelect from '../components/common/SkillMultiSelect';
import DomainMultiSelect from '../components/common/DomainMultiSelect';

const SearchStudents: React.FC = () => {
  const [students, setStudents] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Suggestions state
  interface ISuggestion {
    user: IUser;
    score: number;
    reasons: {
      sharedProjects: number;
      mutualTeammates: number;
      sharedSkills: number;
    };
  }
  const [suggestions, setSuggestions] = useState<ISuggestion[]>([]);

  // Search filter states
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [skills, setSkills] = useState<string[]>(() => searchParams.getAll('skill'));
  const [domains, setDomains] = useState<string[]>(() => searchParams.getAll('domain'));
  const [branch, setBranch] = useState(searchParams.get('branch') || '');
  const [year, setYear] = useState(searchParams.get('year') || '');
  const [availability, setAvailability] = useState(searchParams.get('availability') || '');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (query) params.query = query;
      if (skills && skills.length > 0) params.skill = skills;
      if (domains && domains.length > 0) params.domain = domains;
      if (branch) params.branch = branch;
      if (year) params.year = year;
      if (availability) params.availability = availability;

      const res = await api.get('/users/search', { params });
      setStudents(res.data.users || []);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Keep local states synchronized with URL changes (for back/forward navigation)
    setQuery(searchParams.get('query') || '');
    setSkills(searchParams.getAll('skill'));
    setDomains(searchParams.getAll('domain'));
    setBranch(searchParams.get('branch') || '');
    setYear(searchParams.get('year') || '');
    setAvailability(searchParams.get('availability') || '');
    
    fetchStudents();
  }, [searchParams]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await api.get('/users/suggestions');
        setSuggestions(res.data.suggestions || []);
      } catch (err) {
        console.error('Failed to fetch collaborator suggestions:', err);
      }
    };
    fetchSuggestions();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams();
    if (query) newParams.set('query', query);
    if (branch) newParams.set('branch', branch);
    if (year) newParams.set('year', year);
    if (availability) newParams.set('availability', availability);

    skills.forEach((s) => newParams.append('skill', s));
    domains.forEach((d) => newParams.append('domain', d));

    setSearchParams(newParams);
  };

  const handleReset = () => {
    setQuery('');
    setSkills([]);
    setDomains([]);
    setBranch('');
    setYear('');
    setAvailability('');
    setSearchParams({});
  };

  return (
    <div className="flex-1 flex justify-between gap-6 min-w-0">
      {/* Central List Feed */}
      <div className="flex-1 max-w-2xl min-w-0 flex flex-col gap-4">
        {/* Mobile Search Form (shown when sidebar is hidden) */}
        <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-3 md:hidden">
          <form onSubmit={handleFilterSubmit} className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-reddit-gray" />
            <input
              type="text"
              placeholder="Search Name or USN..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-9 bg-reddit-bg dark:bg-reddit-bgDark border border-transparent focus:border-reddit-blue rounded pl-9 pr-4 text-xs outline-none"
            />
          </form>
        </div>

        {/* Results List */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 animate-pulse h-28" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-8 text-center text-xs text-reddit-gray">
            No students matching the criteria were found.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {students.map((student) => (
              <div
                key={student._id || student.id}
                onClick={() => navigate(`/profile/${student.usn}`)}
                className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 hover:border-reddit-gray dark:hover:border-gray-500 cursor-pointer transition-colors flex justify-between items-start gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-reddit-blue text-white flex items-center justify-center font-bold text-sm uppercase flex-shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-reddit-text dark:text-reddit-textDark truncate">
                      {student.name} <span className="font-medium text-reddit-gray">({student.usn})</span>
                    </h3>
                    <p className="text-[10px] text-reddit-gray mt-0.5">{student.branch} — {student.year} Year</p>
                    
                    {/* Collaboration badge */}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {student.workedTogether ? (
                        <span className="bg-green-500/10 text-green-500 border border-green-500/20 font-bold px-2 py-0.5 rounded text-[8px]">
                          Worked Together Before ({student.connectionScore} {student.connectionScore === 1 ? 'Project' : 'Projects'})
                        </span>
                      ) : (
                        <span className="bg-reddit-bg dark:bg-reddit-bgDark text-reddit-gray border border-reddit-border/30 dark:border-reddit-borderDark/30 font-bold px-2 py-0.5 rounded text-[8px]">
                          No Previous Collaboration
                        </span>
                      )}
                    </div>

                    {/* Student capabilities badges */}
                    {student.skills && student.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {student.skills.slice(0, 4).map((s, i) => (
                          <span key={i} className="bg-reddit-bg dark:bg-reddit-bgDark text-reddit-text dark:text-reddit-textDark text-[8px] px-1.5 py-0.5 rounded font-bold border border-reddit-border/20">
                            {s}
                          </span>
                        ))}
                        {student.skills.length > 4 && (
                          <span className="text-[8px] text-reddit-gray font-bold pl-0.5">+{student.skills.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between h-full gap-4 flex-shrink-0">
                  <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${
                    student.availability === 'Available'
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {student.availability}
                  </span>
                  
                  {student.openToInvitations && (
                    <span className="text-[8px] text-reddit-blue font-bold flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-reddit-blue" /> Invitable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Sidebar Utility Filters Panel */}
      <div className="w-80 hidden md:block flex-shrink-0">
        <div className="sticky top-18 flex flex-col gap-4">
          {/* Discovery Filters Card */}
          <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-reddit-gray flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Discovery Filters
              </h3>
              <button onClick={handleReset} className="text-reddit-blue hover:underline flex items-center gap-1 text-[10px] font-semibold">
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>

            <form onSubmit={handleFilterSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-reddit-gray uppercase mb-1">Name / USN</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="E.g., Rudraksh"
                  className="w-full h-8 px-2.5 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-reddit-gray uppercase mb-1">Skills</label>
                <SkillMultiSelect
                  selectedSkills={skills}
                  onChange={setSkills}
                  placeholder="Filter by skills..."
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-reddit-gray uppercase mb-1">Domain</label>
                <DomainMultiSelect
                  selectedDomains={domains}
                  onChange={setDomains}
                  placeholder="Filter by domains..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-reddit-gray uppercase mb-1">Academic Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full h-8 px-1.5 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none cursor-pointer"
                  >
                    <option value="">All Years</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-reddit-gray uppercase mb-1">Availability</label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full h-8 px-1.5 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none cursor-pointer"
                  >
                    <option value="">Any State</option>
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-reddit-gray uppercase mb-1">Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full h-8 px-1.5 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none cursor-pointer"
                >
                  <option value="">All Branches</option>
                  <option value="Computer Science (CS)">Computer Science (CS)</option>
                  <option value="Information Science (IS)">Information Science (IS)</option>
                  <option value="Electronics & Communication (EC)">Electronics & Communication (EC)</option>
                  <option value="Mechanical Engineering (ME)">Mechanical Engineering (ME)</option>
                  <option value="Electrical & Electronics (EE)">Electrical & Electronics (EE)</option>
                  <option value="Civil Engineering (CV)">Civil Engineering (CV)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full h-8 bg-reddit-blue text-white text-xs font-semibold rounded hover:bg-opacity-95 transition-colors pt-0.5 mt-2"
              >
                Apply Filter Search
              </button>
            </form>
          </div>

          {/* Suggested Collaborators Card */}
          {suggestions.length > 0 && (
            <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4 flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-reddit-orange border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-2">
                Suggested Collaborators
              </h3>
              <div className="flex flex-col gap-2.5">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.user._id || suggestion.user.id}
                    onClick={() => navigate(`/profile/${suggestion.user.usn}`)}
                    className="p-2.5 rounded bg-reddit-bg/60 dark:bg-reddit-bgDark/60 border border-reddit-border/20 hover:border-reddit-orange/40 cursor-pointer transition-all flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-reddit-text dark:text-reddit-textDark truncate hover:underline">
                        {suggestion.user.name}
                      </span>
                      <span className="text-[9px] bg-reddit-orange/10 text-reddit-orange px-1.5 py-0.5 rounded font-extrabold">
                        Score: {suggestion.score}
                      </span>
                    </div>
                    <div className="text-[10px] text-reddit-gray font-medium">
                      {suggestion.user.branch} • {suggestion.user.year} Year
                    </div>
                    
                    {/* Reasons list */}
                    <div className="flex flex-wrap gap-1 mt-1 text-[8px] font-bold">
                      {suggestion.reasons.sharedProjects > 0 && (
                        <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-1.5 py-0.5 rounded">
                          Worked together ({suggestion.reasons.sharedProjects})
                        </span>
                      )}
                      {suggestion.reasons.mutualTeammates > 0 && (
                        <span className="bg-reddit-blue/10 text-reddit-blue border border-reddit-blue/20 px-1.5 py-0.5 rounded">
                          {suggestion.reasons.mutualTeammates} Mutual teammate{suggestion.reasons.mutualTeammates > 1 ? 's' : ''}
                        </span>
                      )}
                      {suggestion.reasons.sharedSkills > 0 && (
                        <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded">
                          {suggestion.reasons.sharedSkills} Shared skill{suggestion.reasons.sharedSkills > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchStudents;
