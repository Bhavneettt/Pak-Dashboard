import type { DiplomaticEvent } from '../types';

interface EventCardProps {
  event: DiplomaticEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const getBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'visit': return 'bg-visit/10 text-visit border-visit/20';
      case 'funding': return 'bg-funding/10 text-funding border-funding/20';
      case 'mediation': return 'bg-mediation/10 text-mediation border-mediation/20';
      case 'multilateral': return 'bg-multilateral/10 text-multilateral border-multilateral/20';
      case 'statement': return 'bg-statement/10 text-statement border-statement/20';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getLineColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'visit': return 'bg-visit';
      case 'funding': return 'bg-funding';
      case 'mediation': return 'bg-mediation';
      case 'multilateral': return 'bg-multilateral';
      case 'statement': return 'bg-statement';
      default: return 'bg-slate-300';
    }
  };

  const formattedDate = new Date(event.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="relative pl-8 sm:pl-32 py-6 group">
      {/* Timeline Line & Dot */}
      <div className="hidden sm:block absolute left-[110px] top-0 bottom-0 w-px bg-slate-200 group-last:bottom-auto group-last:h-full"></div>
      <div className={`absolute left-0 sm:left-[106px] top-8 h-2.5 w-2.5 rounded-full ring-4 ring-white z-10 ${getLineColor(event.event_type)}`}></div>
      
      {/* Date */}
      <div className="sm:absolute sm:left-0 sm:top-7 sm:w-24 sm:text-right mb-2 sm:mb-0">
        <span className="text-sm font-bold text-slate-500">{formattedDate}</span>
      </div>

      {/* Card Content */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:border-slate-300">
        <div className="flex flex-wrap gap-2 justify-between items-start mb-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeColor(event.event_type)}`}>
              {event.event_type}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {event.country}
            </span>
          </div>
          <a href={event.source_url} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-blue-500 flex items-center transition-colors">
            {event.source_name}
            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">
          {event.title}
        </h3>
        
        {event.actor && (
          <div className="flex items-center text-sm text-slate-600 mb-3 font-medium">
            <svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            {event.actor}
          </div>
        )}

        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          {event.summary}
        </p>

        {/* Intelligence Tags */}
        {(event.strategic_intent || event.india_relevance || event.outcome || event.funding_amount) && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {event.strategic_intent && (
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Strategic Intent</span>
                <span className="text-xs text-slate-700">{event.strategic_intent}</span>
              </div>
            )}
            {event.india_relevance && (
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">India Relevance</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                  event.india_relevance.toLowerCase() === 'high' ? 'bg-red-100 text-red-700' : 
                  event.india_relevance.toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-700' : 
                  'bg-slate-100 text-slate-700'
                }`}>
                  {event.india_relevance}
                </span>
              </div>
            )}
            {event.outcome && (
              <div className="sm:col-span-2">
                <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Outcome</span>
                <span className="text-xs text-slate-700">{event.outcome}</span>
              </div>
            )}
            {event.funding_amount && (
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Funding Details</span>
                <span className="text-xs text-slate-700 font-semibold text-funding">{event.funding_amount} <span className="font-normal text-slate-500">({event.funding_source})</span></span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
