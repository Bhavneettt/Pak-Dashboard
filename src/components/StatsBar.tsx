import type { StatsData } from '../types';

interface StatsBarProps {
  stats: StatsData | null;
  loading: boolean;
}

export default function StatsBar({ stats, loading }: StatsBarProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse h-24"></div>
        ))}
      </div>
    );
  }

  const items = [
    { label: 'Total Events', value: stats.total_events, color: 'text-slate-900' },
    { label: 'Visits', value: stats.by_type['Visit'] || 0, color: 'text-visit' },
    { label: 'Funding', value: stats.by_type['Funding'] || 0, color: 'text-funding' },
    { label: 'Mediation', value: stats.by_type['Mediation'] || 0, color: 'text-mediation' },
    { 
      label: 'Top Partner', 
      value: stats.top_country ? stats.top_country.country : 'None', 
      sub: stats.top_country ? `${stats.top_country.count} events` : '',
      color: 'text-slate-900' 
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {items.map((item, idx) => (
        <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{item.label}</p>
          <div className="flex items-baseline space-x-2">
            <h3 className={`text-2xl font-bold ${item.color}`}>{item.value}</h3>
            {item.sub && <span className="text-xs font-medium text-slate-400">{item.sub}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
