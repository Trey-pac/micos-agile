import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const modules = [
    { path: '/kanban', icon: '📋', label: 'Kanban Board', desc: 'Drag tasks across status columns', ready: true },
    { path: '/planning', icon: '📋', label: 'Planning Board', desc: 'Backlog + sprint planning', ready: true },
    { path: '/calendar', icon: '🗓️', label: 'Calendar', desc: 'Monthly view with task dots', ready: true },
    { path: '/vendors', icon: '👥', label: 'Vendors', desc: 'Vendor contacts directory', ready: true },
    { path: '/inventory', icon: '📦', label: 'Inventory', desc: 'Track seeds, supplies, equipment', ready: false },
    { path: '/budget', icon: '💰', label: 'Budget', desc: 'Expenses and revenue tracking', ready: false },
    { path: '/production', icon: '🌿', label: 'Production', desc: 'Harvest and yield logs', ready: false },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(({ path, icon, label, desc, ready }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`text-left p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
              ready
                ? 'bg-white border-gray-200 hover:border-green-400 hover:shadow-md'
                : 'bg-gray-50 border-dashed border-gray-300 opacity-60'
            }`}
          >
            <span className="text-2xl">{icon}</span>
            <h3 className="text-sm font-bold text-gray-800 mt-2">{label}</h3>
            <p className="text-xs text-gray-500 mt-1">{desc}</p>
            {!ready && (
              <span className="inline-block mt-2 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Coming soon
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
