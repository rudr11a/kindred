import React, { useState } from 'react';
import { Settings as SettingsIcon, Shield, Moon, Sun, User, ToggleLeft, ToggleRight, Trash2, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { Input } from '../components/common/Input';

const Settings: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const { currentTheme, toggleTheme } = useTheme();
  const isDarkMode = currentTheme === 'dark';
  const [updating, setUpdating] = useState(false);

  // Deletion Flow States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [consequencesChecked, setConsequencesChecked] = useState({
    profile: false,
    notifications: false,
    memberships: false,
    discussions: false,
  });
  const [deleteConfirmationWord, setDeleteConfirmationWord] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleToggleInvitations = async () => {
    if (!user || updating) return;
    try {
      setUpdating(true);
      await updateProfile({
        skills: user.skills || [],
        availability: user.availability || 'Available',
        githubProfile: user.githubProfile || '',
        openToInvitations: !user.openToInvitations,
      });
    } catch (err) {
      console.error('Failed to toggle invitations status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAvailabilityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!user || updating) return;
    const newAvailability = e.target.value as 'Available' | 'Busy';
    try {
      setUpdating(true);
      await updateProfile({
        skills: user.skills || [],
        availability: newAvailability,
        githubProfile: user.githubProfile || '',
        openToInvitations: user.openToInvitations !== undefined ? user.openToInvitations : true,
      });
    } catch (err) {
      console.error('Failed to update availability status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const resetDeleteFlow = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setConsequencesChecked({
      profile: false,
      notifications: false,
      memberships: false,
      discussions: false,
    });
    setDeleteConfirmationWord('');
    setDeletePassword('');
    setDeleteError('');
    setDeleting(false);
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword || deleting) return;
    setDeleting(true);
    setDeleteError('');

    try {
      await api.delete('/users/me', { data: { password: deletePassword } });
      resetDeleteFlow();
      logout();
      window.location.href = '/auth/login?deleted=true';
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete account. Please verify your password and try again.');
    } finally {
      setDeleting(false);
    }
  };

  const isStep1Valid =
    consequencesChecked.profile &&
    consequencesChecked.notifications &&
    consequencesChecked.memberships &&
    consequencesChecked.discussions;

  const isStep2Valid = deleteConfirmationWord === 'DELETE';

  return (
    <div className="flex-1 max-w-2xl mx-auto min-w-0 font-sans">
      <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-5 flex flex-col gap-6">
        {/* Title */}
        <h2 className="text-base font-extrabold text-reddit-text dark:text-reddit-textDark border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-3 flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-reddit-blue" /> Account Settings
        </h2>

        {/* Section 1: Account Info */}
        <div className="bg-reddit-bg/15 dark:bg-reddit-bgDark/15 border border-reddit-border/40 dark:border-reddit-borderDark/40 rounded-md p-4 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-reddit-text dark:text-reddit-textDark flex items-center gap-1.5 border-b border-reddit-border/10 dark:border-reddit-borderDark/10 pb-2">
            <User className="h-4 w-4 text-reddit-gray" /> Account Profile (Read-Only)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-reddit-gray font-bold uppercase block">Name</span>
              <span className="text-reddit-text dark:text-reddit-textDark font-semibold">{user?.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-reddit-gray font-bold uppercase block">USN Identifier</span>
              <span className="text-reddit-text dark:text-reddit-textDark font-semibold">{user?.usn}</span>
            </div>
            <div>
              <span className="text-[10px] text-reddit-gray font-bold uppercase block">Email Address</span>
              <span className="text-reddit-text dark:text-reddit-textDark font-semibold">{user?.email}</span>
            </div>
            <div>
              <span className="text-[10px] text-reddit-gray font-bold uppercase block">Branch & Year</span>
              <span className="text-reddit-text dark:text-reddit-textDark font-semibold">{user?.branch} - Year {user?.year}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Collaboration */}
        <div className="bg-reddit-bg/15 dark:bg-reddit-bgDark/15 border border-reddit-border/40 dark:border-reddit-borderDark/40 rounded-md p-4 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-reddit-text dark:text-reddit-textDark flex items-center gap-1.5 border-b border-reddit-border/10 dark:border-reddit-borderDark/10 pb-2">
            <Shield className="h-4 w-4 text-reddit-orange" /> Collaboration Preferences
          </h3>
          
          <div className="flex justify-between items-center text-xs">
            <div>
              <span className="font-bold text-reddit-text dark:text-reddit-textDark block">Open to Invitations</span>
              <span className="text-[11px] text-reddit-gray">Allow other student team leads to send you collaboration requests</span>
            </div>
            <button
              onClick={handleToggleInvitations}
              disabled={updating}
              className="text-reddit-orange focus:outline-none transition-transform active:scale-95 disabled:opacity-50"
            >
              {user?.openToInvitations ? (
                <ToggleRight className="h-8 w-8 text-reddit-orange" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-reddit-gray" />
              )}
            </button>
          </div>

          <div className="flex justify-between items-center text-xs pt-2">
            <div>
              <span className="font-bold text-reddit-text dark:text-reddit-textDark block">Availability Status</span>
              <span className="text-[11px] text-reddit-gray">Set whether you are actively available or currently busy</span>
            </div>
            <select
              value={user?.availability || 'Available'}
              onChange={handleAvailabilityChange}
              disabled={updating}
              className="h-8 px-2 bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs font-semibold outline-none text-reddit-text dark:text-reddit-textDark cursor-pointer focus:border-reddit-blue disabled:opacity-50"
            >
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
            </select>
          </div>
        </div>

        {/* Section 3: Interface Theme */}
        <div className="bg-reddit-bg/15 dark:bg-reddit-bgDark/15 border border-reddit-border/40 dark:border-reddit-borderDark/40 rounded-md p-4 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-reddit-text dark:text-reddit-textDark flex items-center gap-1.5 border-b border-reddit-border/10 dark:border-reddit-borderDark/10 pb-2">
            {isDarkMode ? <Moon className="h-4 w-4 text-reddit-blue" /> : <Sun className="h-4 w-4 text-yellow-500" />} System Theme
          </h3>
          <div className="flex justify-between items-center text-xs">
            <div>
              <span className="font-bold text-reddit-text dark:text-reddit-textDark block">Dark Mode</span>
              <span className="text-[11px] text-reddit-gray">Toggle default dark / light theme layout</span>
            </div>
            <button
              onClick={toggleTheme}
              className="text-reddit-blue focus:outline-none transition-transform active:scale-95"
            >
              {isDarkMode ? (
                <ToggleRight className="h-8 w-8 text-reddit-blue" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-reddit-gray" />
              )}
            </button>
          </div>
        </div>

        {/* Section 4: Danger Zone */}
        <div className="bg-red-500/5 border border-red-500/20 dark:border-red-500/40 rounded-md p-4 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-red-500 flex items-center gap-1.5 border-b border-red-500/10 pb-2">
            <Trash2 className="h-4 w-4 text-red-500" /> Danger Zone
          </h3>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
            <div className="flex-1">
              <span className="font-bold text-reddit-text dark:text-reddit-textDark block">Delete Account</span>
              <span className="text-[11px] text-reddit-gray block mt-1 leading-relaxed">
                Permanently delete your Kindred account. This action is destructive and cannot be undone.
              </span>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full md:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60 animate-fade-in">
          <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-lg max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 relative animate-scale-in">
            {/* Close Button */}
            <button
              onClick={resetDeleteFlow}
              className="absolute top-4 right-4 text-reddit-gray hover:text-reddit-text dark:hover:text-reddit-textDark transition-colors focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 pb-2 border-b border-reddit-border/30 dark:border-reddit-borderDark/30">
              <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 animate-bounce" />
              <div>
                <h3 className="text-sm font-extrabold text-reddit-text dark:text-reddit-textDark">
                  Delete Your Account
                </h3>
                <span className="text-[10px] font-bold text-reddit-gray uppercase tracking-wider block mt-0.5">
                  Step {deleteStep} of 3
                </span>
              </div>
            </div>

            {/* Step 1: Consequence Warnings */}
            {deleteStep === 1 && (
              <div className="flex flex-col gap-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-[11px] text-red-600 dark:text-red-400 leading-relaxed font-semibold">
                  This action is permanent and will soft-delete your data. You cannot reverse this. Please acknowledge the following consequences:
                </div>

                <div className="flex flex-col gap-2.5">
                  <label className="flex items-start gap-3 cursor-pointer group text-xs text-reddit-text dark:text-reddit-textDark font-medium">
                    <input
                      type="checkbox"
                      checked={consequencesChecked.profile}
                      onChange={(e) =>
                        setConsequencesChecked({
                          ...consequencesChecked,
                          profile: e.target.checked,
                        })
                      }
                      className="mt-0.5 rounded border-reddit-border dark:border-reddit-borderDark accent-red-600 text-white"
                    />
                    <span>Profile details, skills, and domains will be cleared.</span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group text-xs text-reddit-text dark:text-reddit-textDark font-medium">
                    <input
                      type="checkbox"
                      checked={consequencesChecked.notifications}
                      onChange={(e) =>
                        setConsequencesChecked({
                          ...consequencesChecked,
                          notifications: e.target.checked,
                        })
                      }
                      className="mt-0.5 rounded border-reddit-border dark:border-reddit-borderDark accent-red-600 text-white"
                    />
                    <span>All invitations and notification histories will be purged.</span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group text-xs text-reddit-text dark:text-reddit-textDark font-medium">
                    <input
                      type="checkbox"
                      checked={consequencesChecked.memberships}
                      onChange={(e) =>
                        setConsequencesChecked({
                          ...consequencesChecked,
                          memberships: e.target.checked,
                        })
                      }
                      className="mt-0.5 rounded border-reddit-border dark:border-reddit-borderDark accent-red-600 text-white"
                    />
                    <span>You will be removed from all active teams (leads of multi-member teams must reassign ownership).</span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group text-xs text-reddit-text dark:text-reddit-textDark font-medium">
                    <input
                      type="checkbox"
                      checked={consequencesChecked.discussions}
                      onChange={(e) =>
                        setConsequencesChecked({
                          ...consequencesChecked,
                          discussions: e.target.checked,
                        })
                      }
                      className="mt-0.5 rounded border-reddit-border dark:border-reddit-borderDark accent-red-600 text-white"
                    />
                    <span>Access to team chats and discussions will be permanently lost.</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-reddit-border/30 dark:border-reddit-borderDark/30">
                  <button
                    onClick={resetDeleteFlow}
                    className="px-4 py-2 border border-reddit-border dark:border-reddit-borderDark text-reddit-text dark:text-reddit-textDark rounded text-xs font-bold hover:bg-reddit-bg dark:hover:bg-reddit-bgDark transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!isStep1Valid}
                    onClick={() => setDeleteStep(2)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Acknowledge & Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Confirm keyword */}
            {deleteStep === 2 && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-reddit-text dark:text-reddit-textDark leading-relaxed">
                  To confirm that you want to proceed, please type <strong className="text-red-500 font-extrabold select-none">DELETE</strong> exactly in the input box below.
                </p>

                <Input
                  type="text"
                  value={deleteConfirmationWord}
                  onChange={(e) => setDeleteConfirmationWord(e.target.value)}
                  placeholder="Type DELETE"
                  className="focus:border-red-500 font-bold"
                />

                <div className="flex justify-between items-center pt-2 border-t border-reddit-border/30 dark:border-reddit-borderDark/30">
                  <button
                    onClick={() => setDeleteStep(1)}
                    className="px-4 py-2 border border-reddit-border dark:border-reddit-borderDark text-reddit-text dark:text-reddit-textDark rounded text-xs font-bold hover:bg-reddit-bg dark:hover:bg-reddit-bgDark transition-colors"
                  >
                    Back
                  </button>
                  <button
                    disabled={!isStep2Valid}
                    onClick={() => setDeleteStep(3)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Password verification */}
            {deleteStep === 3 && (
              <form onSubmit={handleDeleteSubmit} className="flex flex-col gap-4">
                <p className="text-xs text-reddit-text dark:text-reddit-textDark leading-relaxed">
                  Please enter your password to authorize this destructive deletion request.
                </p>

                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="focus:border-red-500"
                />

                {deleteError && (
                  <div className="text-[11px] bg-red-500/10 border border-red-500/30 text-red-500 p-2.5 rounded font-semibold leading-relaxed">
                    {deleteError}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-reddit-border/30 dark:border-reddit-borderDark/30">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      setDeleteError('');
                      setDeleteStep(2);
                    }}
                    className="px-4 py-2 border border-reddit-border dark:border-reddit-borderDark text-reddit-text dark:text-reddit-textDark rounded text-xs font-bold hover:bg-reddit-bg dark:hover:bg-reddit-bgDark transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!deletePassword || deleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {deleting ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
