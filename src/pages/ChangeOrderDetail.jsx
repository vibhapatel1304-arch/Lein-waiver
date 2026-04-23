import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, DollarSign, FolderKanban, GitBranch, Loader2 } from 'lucide-react';
import { changeOrderService, projectService } from '../services/supabaseService';
import { useSupabase, useSupabaseById } from '../hooks/useSupabase';

const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

const STATUS_STYLE = {
  Approved:      { background: '#d1fae5', color: '#059669', border: '#6ee7b7' },
  Pending:       { background: '#fef3c7', color: '#d97706', border: '#fde68a' },
  'Under Review':{ background: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
  Rejected:      { background: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
};

export default function ChangeOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const { data: co, loading, setData } = useSupabaseById(changeOrderService.getById, id);
  const { data: projectsList } = useSupabase(projectService.list);

  if (loading) return (
    <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      Loading...
    </div>
  );

  if (!co) return (
    <div style={{ padding: '1.5rem' }}>
      <button onClick={() => navigate('/change-orders')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Back to Change Orders
      </button>
      <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Change order not found.</div>
    </div>
  );

  const coId = co.id || co.co_number;
  const coStatus = co.status || 'Pending';
  const st = STATUS_STYLE[coStatus] || STATUS_STYLE.Pending;
  const project = projectsList.find((p) => p.id === (co.projectId || co.project_id));
  const versions = co.versions || co.change_order_versions || [];
  const description = co.description;
  const amount = parseFloat(co.amount || 0);
  const requestedBy = co.requestedBy || co.requested_by;
  const coDate = co.date || co.co_date;
  const coProject = co.project || co.project_name;

  const updateStatus = async (newStatus) => {
    setSaving(true);
    try {
      await changeOrderService.updateStatus(coId, newStatus);
      setData({ ...co, status: newStatus });
    } catch {
      setData({ ...co, status: newStatus });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <button onClick={() => navigate('/change-orders')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '0.5rem' }}>
            <ArrowLeft size={16} /> Back to Change Orders
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>{coId}</h1>
            <span style={{ ...st, padding: '0.3rem 0.875rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, border: `1px solid ${st.border}` }}>
              {coStatus}
            </span>
          </div>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.375rem' }}>{coProject} · {coDate}</div>
        </div>

        {/* Action buttons based on status */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {coStatus === 'Pending' || coStatus === 'Under Review' ? (
            <>
              <button className="btn-secondary" onClick={() => updateStatus('Rejected')} disabled={saving}
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={15} />} Reject
              </button>
              <button className="btn-primary" onClick={() => updateStatus('Approved')} disabled={saving}
                style={{ background: '#059669' }}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={15} />} Approve
              </button>
            </>
          ) : coStatus === 'Approved' ? (
            <button className="btn-secondary" onClick={() => updateStatus('Pending')} disabled={saving}>
              <Clock size={15} /> Reopen
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem' }}>
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Description */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Description of Work</h3>
            <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.75, margin: 0 }}>{description}</p>
          </div>

          {/* Version history */}
          {versions.length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GitBranch size={15} style={{ color: '#f07030' }} />
                <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', margin: 0 }}>Version History</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Version', 'Date', 'Amount', 'Notes'].map((h) => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v, idx) => {
                    const vNum = v.version || v.version_number;
                    const vDate = v.date || v.version_date;
                    const vAmount = parseFloat(v.amount || 0);
                    const isLatest = idx === versions.length - 1;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: isLatest ? '#fffbf5' : 'transparent' }}>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{ fontWeight: 700, color: isLatest ? '#f07030' : '#64748b', fontSize: '0.875rem' }}>
                            v{vNum} {isLatest && <span style={{ fontSize: '0.7rem', background: '#fed7aa', color: '#92400e', padding: '0.1rem 0.4rem', borderRadius: 4, marginLeft: 4 }}>Current</span>}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', color: '#475569', fontSize: '0.875rem' }}>{vDate}</td>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{fmt(vAmount)}</td>
                        <td style={{ padding: '0.9rem 1rem', color: '#64748b', fontSize: '0.8125rem' }}>{v.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Amount card */}
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: `4px solid ${st.color}` }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Change Order Amount</div>
            <div style={{ fontSize: '2.25rem', fontWeight: 900, color: amount >= 0 ? '#0f172a' : '#dc2626' }}>{fmt(amount)}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Requested by {requestedBy}</div>
          </div>

          {/* Details */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>Details</h3>
            {[
              { label: 'CO Number', value: coId },
              { label: 'Date', value: coDate },
              { label: 'Requested By', value: requestedBy },
              { label: 'Versions', value: versions.length },
            ].map(({ label, value }) => (
              <div key={label} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Linked Project */}
          {project && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Linked Project</h3>
              <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#f07030')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FolderKanban size={14} style={{ color: '#f07030' }} />
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{project.name}</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {project.status} · {project.phase}
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
