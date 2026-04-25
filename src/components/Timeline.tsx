import type { DiplomaticEvent } from '../types';
import EventCard from './EventCard';

interface TimelineProps {
  events: DiplomaticEvent[];
  loading: boolean;
}

export default function Timeline({ events, loading }: TimelineProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="pl-8 sm:pl-32 py-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-40"></div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
        <svg className="mx-auto h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 className="text-sm font-medium text-slate-900">No events found</h3>
        <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
