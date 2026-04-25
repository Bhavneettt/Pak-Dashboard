export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Pakistan Diplomatic Activity Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Post Op Sindoor Analysis & Intelligence Tracker
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">System Live</span>
          </div>
        </div>
      </div>
    </header>
  );
}
