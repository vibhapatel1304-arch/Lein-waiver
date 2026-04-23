import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MessageSquare, CheckCircle, Clock, XCircle } from 'lucide-react';
import { rfiService, projectService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const STATUS_STYLE = {
  Open:      { background: '#fef3c7', color: '#d97706' },
  Responded: { background: '#d1fae5', color: '#059669' },
  Closed:    { background: '#f1f5f9', color: '#64748b' },
};

const STATUS_ICON = {
  Open:      Clock,
  Responded: CheckCircle,
  Closed:    XCircle,
};

export default function RFIs() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');

  const { data: rfis } = useSupabase(rfiService.list);
  const { data: projects } = useSupabase(projectService.list);

  const statuses = ['All', 'Open', 'Responded', 'Closed'];
  const projectNames = ['All', ...Array.from(new Set(rfis.map((r) => r.project || r.project_name).filter(Boolean)))];

  const filtered = rfis.filter((r) => {
    const matchSearch = r.subject?.toLowerCase().includes(search.toLowerCase()) ||
      r.project?.toLowerCase().includes(search.toLowerCase()) ||
      r.submittedBy?.toLowerCase().includes(search.toLowerCase()) ||
      (r.rfi_number || r.id || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchProject = projectFilter === 'All' || r.project === projectFilter ||
      r.project_name === projectFilter;
    return matchSearch && matchStatus && matchProject;
  });

  const openCount = rfis.filter((r) => r.status === 'Open').length;
  const respondedCount = rfis.filter((r) => r.status === 'Responded').length;
  const closedCount = rfis.filter((r) => r.status === 'Closed').length;

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Requests for Information</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Track and respond to RFIs across all projects.
          </p>
        </div>
        <Link to="/rfis/create">
          <button className="btn-primary"><Plus size={16} /> New RFI</button>
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Open', count: openCount, color: '#d97706', bg: '#fef3c7', icon: Clock },
          { label: 'Responded', count: respondedCount, color: '#059669', bg: '#d1fae5', icon: CheckCircle },
          { label: 'Closed', count: closedCount, color: '#64748b', bg: '#f1f5f9', icon: XCircle },
        ].map(({ label, count, color, bg, icon: Icon }) => (
          <div key={label} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="input" placeholder="Search RFIs..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '0.375rem 0.875rem', borderRadius: '0.375rem', border: '1px solid',
              fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              borderColor: statusFilter === s ? '#f07030' : '#e2e8f0',
              background: statusFilter === s ? '#fff5ef' : '#fff',
              color: statusFilter === s ? '#f07030' : '#64748b',
            }}>{s}</button>
          ))}
        </div>
        <select className="input" style={{ appearance: 'auto', maxWidth: 220 }} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          {projectNames.map((p) => <option key={p} value={p}>{p === 'All' ? 'All Projects' : p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
              {['RFI #', 'Subject', 'Project', 'Submitted By', 'Date', 'Responded', 'Status', ''].map((h) => (
                <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No RFIs found.</td></tr>
            ) : filtered.map((r) => {
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.Open;
              const Icon = STATUS_ICON[r.status] || Clock;
              const id = r.id || r.rfi_number;
              return (
                <tr key={id} style={{ borderBottom: '1px solid #f1f5f9' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '1rem' }}>
                    <Link to={`/rfis/${id}`} style={{ textDecoration: 'none', fontWeight: 700, color: '#f07030', fontSize: '0.875rem' }}>{id}</Link>
                  </td>
                  <td style={{ padding: '1rem', maxWidth: 280 }}>
                    <Link to={`/rfis/${id}`} style={{ textDecoration: 'none', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.subject || r.rfi_subject}
                    </Link>
                  </td>
                  <td style={{ padding: '1rem', color: '#475569', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{r.project || r.project_name}</td>
                  <td style={{ padding: '1rem', color: '#475569', fontSize: '0.875rem' }}>{r.submittedBy || r.submitted_by}</td>
                  <td style={{ padding: '1rem', color: '#475569', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{r.dateSubmitted || r.date_submitted}</td>
                  <td style={{ padding: '1rem', color: r.dateResponded || r.date_responded ? '#475569' : '#cbd5e1', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    {r.dateResponded || r.date_responded || '—'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ ...st, padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Icon size={12} /> {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <Link to={`/rfis/${id}`} style={{ fontSize: '0.8125rem', color: '#f07030', fontWeight: 600, textDecoration: 'none' }}>View →</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
