import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Check } from 'lucide-react';
import api, { extractErrorMessage } from '../services/api';
import SkillMultiSelect from '../components/common/SkillMultiSelect';
import DomainMultiSelect from '../components/common/DomainMultiSelect';
import { Input } from '../components/common/Input';

const CreateTeam: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  
  const [maxMembers, setMaxMembers] = useState<number>(2);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (description.length < 10) {
      setError('Description must be at least 10 characters.');
      return;
    }

    if (maxMembers < 2 || maxMembers > 5) {
      setError('Maximum team size must be between 2 and 5.');
      return;
    }

    setLoading(true);

    try {
      const tagsArray = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await api.post('/teams', {
        title,
        description,
        domains,
        tags: tagsArray,
        skills,
        maxMembers,
      });

      navigate(`/teams/${res.data.team._id}`);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to create team. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 max-w-2xl mx-auto min-w-0">
      <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-6">
        <h2 className="text-base font-extrabold text-reddit-text dark:text-reddit-textDark border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-3 mb-4">
          Start a Collaboration Team
        </h2>

        {error && (
          <div className="mb-4 text-xs bg-red-500/10 border border-red-500/30 text-red-500 p-2.5 rounded flex items-center gap-2 whitespace-pre-line">
            <ShieldAlert className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Project Title"
            type="text"
            required
            placeholder="E.g., Autonomous Drone Navigation Network"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Domain</label>
              <DomainMultiSelect
                selectedDomains={domains}
                onChange={setDomains}
                placeholder="Search or add project domains..."
              />
            </div>
            <Input
              label="Tags (comma-separated)"
              type="text"
              placeholder="E.g., hackathon, research, study"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="h-9"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Target Skills Needed</label>
            <SkillMultiSelect
              selectedSkills={skills}
              onChange={setSkills}
              placeholder="Search or add project skills..."
            />
            <p className="text-[9px] text-reddit-gray mt-1 leading-normal">
              These skills will compare against your active team members to calculate the Skill Gap Indicator dynamically.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Project Description</label>
            <textarea
              required
              rows={4}
              placeholder="Outline the goals, methodology, timeline, and expectations of this project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none resize-none focus:border-reddit-blue focus:bg-reddit-card dark:focus:bg-reddit-cardDark"
            />
          </div>

          {/* Maximum Team Size selector */}
          <div className="border-t border-reddit-border/30 dark:border-reddit-borderDark/30 pt-4 font-sans">
            <label className="block text-[10px] font-bold text-reddit-gray uppercase mb-1">Maximum Team Size</label>
            <select
              value={maxMembers}
              onChange={(e) => setMaxMembers(parseInt(e.target.value))}
              className="w-full p-2 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none focus:border-reddit-blue focus:bg-reddit-card dark:focus:bg-reddit-cardDark text-reddit-text dark:text-reddit-textDark"
            >
              <option value={2}>2 Members (1 Lead + 1 Member)</option>
              <option value={3}>3 Members (1 Lead + 2 Members)</option>
              <option value={4}>4 Members (1 Lead + 3 Members)</option>
              <option value={5}>5 Members (1 Lead + 4 Members)</option>
            </select>
            <p className="text-[9px] text-reddit-gray mt-1 leading-normal">
              Specify the maximum number of students allowed in this collaboration team (2 to 5 members).
            </p>
          </div>

          <div className="border-t border-reddit-border/30 dark:border-reddit-borderDark/30 pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-reddit-bg dark:bg-reddit-bgDark text-xs font-semibold px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-reddit-orange hover:bg-reddit-orangeHover disabled:opacity-50 text-white text-xs font-semibold px-5 py-2 rounded flex items-center gap-1.5 transition-colors"
            >
              <Check className="h-4 w-4" /> {loading ? 'Creating Project...' : 'Launch Project Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeam;
