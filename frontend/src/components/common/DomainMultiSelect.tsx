import React, { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

interface DomainMultiSelectProps {
  selectedDomains: string[];
  onChange: (domains: string[]) => void;
  placeholder?: string;
}

const DEFAULT_DOMAINS = [
  'Healthcare',
  'AI',
  'Machine Learning',
  'FinTech',
  'EdTech',
  'Cloud Computing',
  'Cybersecurity',
  'IoT',
  'Blockchain',
  'Quantum Computing',
  'Web Development',
  'Mobile Apps',
  'E-commerce',
  'DevOps',
  'AR/VR',
  'Game Development',
];

const DomainMultiSelect: React.FC<DomainMultiSelectProps> = ({
  selectedDomains = [],
  onChange,
  placeholder = 'Type to search or add domains...',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRemoveDomain = (domainToRemove: string) => {
    onChange(selectedDomains.filter((d) => d !== domainToRemove));
  };

  const handleAddDomain = (domainToAdd: string) => {
    const cleanDomain = domainToAdd.trim();
    if (!cleanDomain) return;

    // Avoid duplicates (case-insensitive check)
    const exists = selectedDomains.some((d) => d.toLowerCase() === cleanDomain.toLowerCase());
    if (!exists) {
      onChange([...selectedDomains, cleanDomain]);
    }
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        handleAddDomain(query);
      }
    }
  };

  // Filter recommendations based on query and exclude already selected ones
  const filteredSuggestions = DEFAULT_DOMAINS.filter((d) => {
    const isMatched = d.toLowerCase().includes(query.toLowerCase());
    const isAlreadySelected = selectedDomains.some((sel) => sel.toLowerCase() === d.toLowerCase());
    return isMatched && !isAlreadySelected;
  });

  const showCustomAdd =
    query.trim() !== '' &&
    !DEFAULT_DOMAINS.some((d) => d.toLowerCase() === query.trim().toLowerCase()) &&
    !selectedDomains.some((sel) => sel.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={containerRef} className="relative w-full text-xs">
      {/* Selected Chips container */}
      <div className="flex flex-wrap gap-1.5 p-2 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded min-h-[38px] focus-within:border-reddit-blue transition-colors">
        {selectedDomains.map((domain, index) => (
          <span
            key={index}
            className="flex items-center gap-1 bg-reddit-orange text-white px-2 py-0.5 rounded font-semibold text-[10px]"
          >
            {domain}
            <button
              type="button"
              onClick={() => handleRemoveDomain(domain)}
              className="hover:bg-black/20 rounded-full p-0.5 focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        
        {/* Search input field inside wrapper */}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedDomains.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent outline-none border-0 text-reddit-text dark:text-reddit-textDark p-0 h-6 focus:ring-0"
        />
      </div>

      {/* Recommendations Dropdown */}
      {isOpen && (query.trim() !== '' || filteredSuggestions.length > 0) && (
        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded shadow-lg z-50 py-1 divide-y divide-reddit-border/20 dark:divide-reddit-borderDark/20">
          {filteredSuggestions.map((suggestion, idx) => (
            <div
              key={idx}
              onClick={() => {
                handleAddDomain(suggestion);
                setIsOpen(false);
              }}
              className="px-3 py-2 cursor-pointer hover:bg-reddit-bg dark:hover:bg-reddit-bgDark text-reddit-text dark:text-reddit-textDark flex items-center justify-between"
            >
              <span>{suggestion}</span>
              <Plus className="h-3 w-3 text-reddit-gray" />
            </div>
          ))}

          {showCustomAdd && (
            <div
              onClick={() => {
                handleAddDomain(query);
                setIsOpen(false);
              }}
              className="px-3 py-2 cursor-pointer hover:bg-reddit-bg dark:hover:bg-reddit-bgDark text-reddit-orange font-bold flex items-center justify-between"
            >
              <span>Add Custom: "{query.trim()}"</span>
              <Plus className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DomainMultiSelect;
