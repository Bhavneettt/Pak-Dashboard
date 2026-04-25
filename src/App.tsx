import { useState, useEffect, useMemo } from 'react';
import type { DiplomaticEvent, StatsData } from './types';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import Filters from './components/Filters';
import Timeline from './components/Timeline';

// Use the local or Vercel serverless API endpoint
const API_BASE = '/api';

function App() {
  const [events, setEvents] = useState<DiplomaticEvent[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [selectedType, setSelectedType] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch all events
        const eventsRes = await fetch(`${API_BASE}/get_events.php`);
        const eventsJson = await eventsRes.json();
        if (eventsJson.success) {
          setEvents(eventsJson.data);
        }

        // Fetch stats
        const statsRes = await fetch(`${API_BASE}/stats.php`);
        const statsJson = await statsRes.json();
        if (statsJson.success) {
          setStats(statsJson.data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Derived filter options from actual data
  const types = useMemo(() => {
    const uniqueTypes = new Set(events.map(e => e.event_type));
    return Array.from(uniqueTypes).sort();
  }, [events]);

  const countries = useMemo(() => {
    const uniqueCountries = new Set(events.map(e => e.country));
    return Array.from(uniqueCountries).sort();
  }, [events]);

  // Apply filters client-side
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchType = selectedType === '' || event.event_type === selectedType;
      const matchCountry = selectedCountry === '' || event.country === selectedCountry;
      
      const term = searchTerm.toLowerCase();
      const matchSearch = term === '' || 
        event.title.toLowerCase().includes(term) || 
        event.summary.toLowerCase().includes(term) ||
        (event.actor && event.actor.toLowerCase().includes(term));
        
      return matchType && matchCountry && matchSearch;
    });
  }, [events, selectedType, selectedCountry, searchTerm]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsBar stats={stats} loading={loading} />
        
        <div className="relative">
          <Filters 
            types={types}
            countries={countries}
            selectedType={selectedType}
            selectedCountry={selectedCountry}
            searchTerm={searchTerm}
            onTypeChange={setSelectedType}
            onCountryChange={setSelectedCountry}
            onSearchChange={setSearchTerm}
          />
          
          <Timeline events={filteredEvents} loading={loading} />
        </div>
      </main>
    </div>
  );
}

export default App;
