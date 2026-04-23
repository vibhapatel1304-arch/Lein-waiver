import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, MessageSquare, Send, FolderKanban } from 'lucide-react';
import { rfiService, projectService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const STATUS_STYLE = {
  Open:      { background: '#fef3c7', color: '#d97706', border: '#fde68a' },
  Responded: { background: '#d1fae5', color: '#059669', border: '#6ee7b7' },
  Closed:    { background: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
};

export default function RFIDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: rfis, loading, setData: setRfis } = useSupabase(rfiService.list);
  const { data: projects } = useSupabase(projectService.list);
  const rfi = rfis.find((r) => r.id === id) || null;
  const setData = (updated) => setRfis(rfis.map((r) => r.id === id ? updated : r));

  if (loading) return <div style={{ padding: '2rem', color: '#94a3b8' }}>Loading...</div>;
  if (!rfi) return (
    <div style={{ padding: '1.5rem' }}>
      <button onClick={() => navigate('/rfis')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Back to RFIs
      </button>
      <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>RFI not found.</div>
    </div>
  );

  const st = STATUS_STYLE[rfi.status] || STATUS_STYLE.Open;
  const project = projects.find((p) => p.id === (rfi.projectId || rfi.project_id));
  const subject = rfi.subject || rfi.rfi_subject;
  const submittedBy = rfi.submittedBy || rfi.submitted_by;
  const dateSubmitted = rfi.dateSubmitted || rfi.date_submitted;
  const dateResponded = rfi.dateResponded || rfi.date_responded;
  const rfiResponse = rfi.response;
  const rfiProject = rfi.project || rfi.project_name;

  const handleRespond = async () => {
    if (!response.trim()) return;
    setSaving(true);
    try {
      await rfiService.respond(rfi.id, response);
      setData({ ...rfi, status: 'Responded', response, dateResponded: new Date().toISOString().split('T')[0], date_responded: new Date().toISOString().split('T')[0] });
      setResponse('');
    } catch {
      setData({ ...rfi, status: 'Responded', response, dateResponded: new Date().toISOString().split('T')[0] });
      setResponse('');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    setSaving(true);
    try {
      await rfiService.close(rfi.id);
      setData({ ...rfi, status: 'Closed' });
    } catch {
      setData({ ...rfi, status: 'Closed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <button onClick={() => navigate('/rfis')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '0.5rem' }}>
            <ArrowLeft size={16} /> Back to RFIs
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>{rfi.id}</h1>
            <span style={{ ...st, padding: '0.3rem 0.875rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, border: `1px solid ${st.border}` }}>
              {rfi.status}
            </span>
          </div>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.375rem' }}>{rfiProject}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {rfi.status === 'Open' && (
            <button className="btn-secondary" onClick={handleClose} disabled={saving} style={{ color: '#64748b' }}>
              <XCircle size={15} /> Close RFI
            </button>
          )}
          {rfi.status === 'Responded' && (
            <button className="btn-secondary" onClick={handleClose} disabled={saving}>
              <XCircle size={15} /> Close
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem' }}>
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Question */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={16} style={{ color: '#f07030' }} /> RFI Subject
            </h3>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.5rem' }}>{subject}</p>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Submitted by {submittedBy} on {dateSubmitted}</div>
          </div>

          {/* Response */}
          {rfiResponse ? (
            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #059669' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#059669', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={16} /> Response
                {dateResponded && <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.8rem', marginLeft: 'auto' }}>Responded {dateResponded}</span>}
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{rfiResponse}</p>
            </div>
          ) : rfi.status !== 'Closed' ? (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Submit Response</h3>
              <textarea
                className="input"
                placeholder="Type your response here..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={5}
                style={{ resize: 'vertical', fontFamily: 'inherit', marginBottom: '0.75rem' }}
              />
              <button className="btn-primary" onClick={handleRespond} disabled={saving || !response.trim()}>
                <Send size={15} /> {saving ? 'Saving...' : 'Submit Response'}
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding: '1.5rem', background: '#f8fafc' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>This RFI was closed without a formal response.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>Details</h3>
            {[
              { label: 'RFI Number', value: rfi.id },
              { label: 'Project', value: rfiProject },
              { label: 'Submitted By', value: submittedBy },
              { label: 'Date Submitted', value: dateSubmitted },
              { label: 'Date Responded', value: dateResponded || '—' },
              { label: 'Status', value: rfi.status },
            ].map(({ label, value }) => (
              <div key={label} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{value}</div>
              </div>
            ))}
          </div>

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
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>{project.status} · {project.phase}</div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
