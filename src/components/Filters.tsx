import React from 'react';

interface FiltersProps {
  types: string[];
  countries: string[];
  selectedType: string;
  selectedCountry: string;
  searchTerm: string;
  onTypeChange: (type: string) => void;
  onCountryChange: (country: string) => void;
  onSearchChange: (term: string) => void;
}

export default function Filters({
  types, countries, selectedType, selectedCountry, searchTerm,
  onTypeChange, onCountryChange, onSearchChange
}: FiltersProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-[73px] z-40 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            placeholder="Search events, actors, keywords..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        {/* Type Filter */}
        <div className="sm:w-48">
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 bg-slate-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border appearance-none transition-colors"
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            <option value="">All Event Types</option>
            {types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Country Filter */}
        <div className="sm:w-48">
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 bg-slate-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border appearance-none transition-colors"
            value={selectedCountry}
            onChange={(e) => onCountryChange(e.target.value)}
          >
            <option value="">All Countries</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
