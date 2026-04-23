import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Calendar, Users, ChevronDown, ChevronRight, FolderKanban, Loader2 } from 'lucide-react';
import { projectService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

export default function DailyLogs() {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [expanded, setExpanded] = useState({});

  const { data: projects, loading } = useSupabase(projectService.list);

  // Flatten all daily logs from all projects
  const allLogs = useMemo(() =>
    projects
      .filter((p) => p.dailyLogs && p.dailyLogs.length > 0)
      .flatMap((p) =>
        p.dailyLogs.map((log) => ({
          ...log,
          projectId: p.id,
          project: p.name,
          client: p.client,
          phase: p.phase,
        }))
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [projects]
  );

  const projectNames = ['All', ...Array.from(new Set(allLogs.map((l) => l.project)))];

  const filtered = allLogs.filter((l) => {
    const matchSearch =
      l.summary?.toLowerCase().includes(search.toLowerCase()) ||
      l.project?.toLowerCase().includes(search.toLowerCase());
    const matchProject = projectFilter === 'All' || l.project === projectFilter;
    return matchSearch && matchProject;
  });

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
        <Loader2 size={36} style={{ color: '#2563eb', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading daily logs...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Group by date
  const byDate = filtered.reduce((acc, log) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Daily Logs</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Field reports across all active projects — {allLogs.length} total entries.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Entries', value: allLogs.length, color: '#3b82f6' },
          { label: 'Active Projects', value: projects.filter((p) => p.dailyLogs?.length > 0).length, color: '#059669' },
          { label: 'Latest Entry', value: allLogs[0]?.date || '—', color: '#f07030' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color, marginTop: '0.25rem' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="input" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
        </div>
        <select className="input" style={{ appearance: 'auto', maxWidth: 240 }} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          {projectNames.map((p) => <option key={p} value={p}>{p === 'All' ? 'All Projects' : p}</option>)}
        </select>
      </div>

      {/* Logs grouped by date */}
      {dates.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No daily logs found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {dates.map((date) => {
            const logs = byDate[date];
            const isOpen = expanded[date] !== false; // open by default
            return (
              <div key={date} className="card" style={{ overflow: 'hidden' }}>
                {/* Date header */}
                <button
                  onClick={() => toggle(date)}
                  style={{ width: '100%', background: '#f8fafc', border: 'none', borderBottom: isOpen ? '1px solid #e2e8f0' : 'none', padding: '0.875rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}
                >
                  {isOpen ? <ChevronDown size={16} style={{ color: '#94a3b8', flexShrink: 0 }} /> : <ChevronRight size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />}
                  <Calendar size={15} style={{ color: '#f07030', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
                    {logs.length} log{logs.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {isOpen && (
                  <div>
                    {logs.map((log, idx) => (
                      <div key={idx} style={{ padding: '1.25rem', borderBottom: idx < logs.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
                        <div>
                          {/* Project link */}
                          <Link to={`/projects/${log.projectId}`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                            <FolderKanban size={13} style={{ color: '#f07030' }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f07030' }}>{log.project}</span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>· {log.phase}</span>
                          </Link>
                          {/* Summary */}
                          <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.7, margin: 0 }}>{log.summary}</p>
                        </div>
                        {/* Crew count */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: '#f1f5f9', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', flexShrink: 0 }}>
                          <Users size={14} style={{ color: '#64748b' }} />
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{log.crew}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>crew</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
