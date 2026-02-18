import { useState, useMemo } from 'react';
import { teamMembers, ownerColors } from '../data/constants';

const priorityDot = { high: '🔴', medium: '🟠', low: '🟢' };

export default function BacklogTreeView({ tasks, epics, features, sprints, onEditTask }) {
  const [filterEpic, setFilterEpic] = useState('all');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [expandedEpics, setExpandedEpics] = useState(() => new Set(epics.map(e => e.id)));
  const [expandedFeatures, setExpandedFeatures] = useState(() => new Set(features.map(f => f.id)));

  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (filterEpic !== 'all' && t.epicId !== filterEpic) return false;
    if (filterOwner !== 'all' && t.owner !== filterOwner) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  }), [tasks, filterEpic, filterOwner, filterPriority]);

  // Group: epicId → featureId → tasks[]
  const grouped = useMemo(() => {
    const result = {};
    filteredTasks.forEach(t => {
      const eid = t.epicId || '__none__';
      const fid = t.featureId || '__none__';
      if (!result[eid]) result[eid] = {};
      if (!result[eid][fid]) result[eid][fid] = [];
      result[eid][fid].push(t);
    });
    return result;
  }, [filteredTasks]);

  const getSprintLabel = (t) => {
    if (!t.sprintId) return { label: 'Backlog', cls: 'bg-orange-100 text-orange-800' };
    const s = sprints.find(s => s.id === t.sprintId);
    return s ? { label: `S${s.number}`, cls: 'bg-sky-100 text-sky-800' } : { label: '?', cls: 'bg-gray-100 text-gray-500' };
  };

  const toggleEpic = (id) => setExpandedEpics(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleFeature = (id) => setExpandedFeatures(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const hasFilter = filterEpic !== 'all' || filterOwner !== 'all' || filterPriority !== 'all';
  const visibleEpics = filterEpic === 'all' ? epics : epics.filter(e => e.id === filterEpic);

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap mb-4 pb-4 border-b-2 border-gray-100">
        <select
          className="text-xs px-2 py-1.5 border-2 border-gray-300 rounded-lg bg-white font-medium cursor-pointer"
          value={filterEpic}
          onChange={e => setFilterEpic(e.target.value)}
        >
          <option value="all">All Epics</option>
          {epics.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select
          className="text-xs px-2 py-1.5 border-2 border-gray-300 rounded-lg bg-white font-medium cursor-pointer"
          value={filterOwner}
          onChange={e => setFilterOwner(e.target.value)}
        >
          <option value="all">All Owners</option>
          {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select
          className="text-xs px-2 py-1.5 border-2 border-gray-300 rounded-lg bg-white font-medium cursor-pointer"
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
        >
          <option value="all">All Priorities</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟠 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        {hasFilter && (
          <button
            className="text-[11px] px-2.5 py-1 border border-gray-200 rounded-md bg-gray-50 text-gray-500 hover:bg-gray-100 cursor-pointer border-none"
            onClick={() => { setFilterEpic('all'); setFilterOwner('all'); setFilterPriority('all'); }}
          >✕ Clear</button>
        )}
        <span className="ml-auto text-xs text-gray-400 font-medium">{filteredTasks.length} tasks</span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {visibleEpics.map(epic => {
          const epicData = grouped[epic.id];
          if (!epicData) return null;
          const epicTaskCount = Object.values(epicData).flat().length;
          const isOpen = expandedEpics.has(epic.id);
          const epicFeats = features.filter(f => f.epicId === epic.id && epicData[f.id]);
          const noFeature = epicData['__none__'] || [];

          return (
            <div key={epic.id} className="rounded-xl overflow-hidden border border-gray-100">
              {/* Epic header */}
              <button
                onClick={() => toggleEpic(epic.id)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 font-bold text-sm text-white cursor-pointer border-none text-left"
                style={{ background: epic.color }}
              >
                <span className="text-xs opacity-80">{isOpen ? '▼' : '▶'}</span>
                <span className="flex-1">{epic.name}</span>
                <span className="bg-white/25 text-white text-xs px-2 py-0.5 rounded-full font-bold">{epicTaskCount}</span>
              </button>

              {isOpen && (
                <div className="bg-white p-2 space-y-1.5">
                  {epicFeats.map(feat => {
                    const featTasks = epicData[feat.id] || [];
                    const isFOpen = expandedFeatures.has(feat.id);
                    return (
                      <div key={feat.id} className="rounded-lg overflow-hidden border border-gray-100">
                        <button
                          onClick={() => toggleFeature(feat.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer border-none text-left"
                        >
                          <span className="opacity-50">{isFOpen ? '▼' : '▶'}</span>
                          <span className="flex-1">{feat.name}</span>
                          <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{featTasks.length}</span>
                        </button>
                        {isFOpen && featTasks.map(task => {
                          const sl = getSprintLabel(task);
                          const oc = ownerColors[task.owner] || {};
                          const owner = teamMembers.find(m => m.id === task.owner);
                          return (
                            <div
                              key={task.id}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-sky-50/40 group border-t border-gray-50 text-sm cursor-pointer"
                              onClick={() => onEditTask(task)}
                            >
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${sl.cls}`}>{sl.label}</span>
                              <span className="flex-1 text-gray-800 truncate">{task.title}</span>
                              {task.size && <span className="text-[10px] font-bold text-gray-400 shrink-0">{task.size}</span>}
                              <span className="text-[10px] shrink-0">{priorityDot[task.priority]}</span>
                              {owner && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 border"
                                  style={{ background: oc.bg, color: oc.text, borderColor: oc.border }}>
                                  {owner.name.split(' ')[0]}
                                </span>
                              )}
                              <span className="opacity-0 group-hover:opacity-60 text-gray-500 text-xs shrink-0">✏️</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {noFeature.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold text-gray-400 px-2 py-1">Unassigned feature</div>
                      {noFeature.map(task => {
                        const sl = getSprintLabel(task);
                        const oc = ownerColors[task.owner] || {};
                        const owner = teamMembers.find(m => m.id === task.owner);
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-sky-50/40 group border-t border-gray-50 text-sm cursor-pointer"
                            onClick={() => onEditTask(task)}
                          >
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${sl.cls}`}>{sl.label}</span>
                            <span className="flex-1 text-gray-800 truncate">{task.title}</span>
                            {task.size && <span className="text-[10px] font-bold text-gray-400 shrink-0">{task.size}</span>}
                            <span className="text-[10px] shrink-0">{priorityDot[task.priority]}</span>
                            {owner && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 border"
                                style={{ background: oc.bg, color: oc.text, borderColor: oc.border }}>
                                {owner.name.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Tasks with no epic */}
        {grouped['__none__'] && (filterEpic === 'all') && (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <div className="flex items-center gap-2.5 px-4 py-2.5 font-bold text-sm bg-gray-200 text-gray-600">
              <span className="flex-1">Uncategorized</span>
              <span className="bg-gray-300 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">
                {Object.values(grouped['__none__']).flat().length}
              </span>
            </div>
            <div className="bg-white p-2">
              {Object.values(grouped['__none__']).flat().map(task => {
                const sl = getSprintLabel(task);
                const oc = ownerColors[task.owner] || {};
                const owner = teamMembers.find(m => m.id === task.owner);
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-sky-50/40 group border-b border-gray-50 last:border-0 text-sm cursor-pointer"
                    onClick={() => onEditTask(task)}
                  >
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${sl.cls}`}>{sl.label}</span>
                    <span className="flex-1 text-gray-800 truncate">{task.title}</span>
                    {task.size && <span className="text-[10px] font-bold text-gray-400 shrink-0">{task.size}</span>}
                    <span className="text-[10px] shrink-0">{priorityDot[task.priority]}</span>
                    {owner && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 border"
                        style={{ background: oc.bg, color: oc.text, borderColor: oc.border }}>
                        {owner.name.split(' ')[0]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-sm">No tasks match the current filters</div>
          </div>
        )}
      </div>
    </div>
  );
}
