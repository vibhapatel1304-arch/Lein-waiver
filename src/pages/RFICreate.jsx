import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Upload, Loader2 } from 'lucide-react';
import { rfiService, projectService, employeeService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' };

export default function RFICreate() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState('');
  const [subject, setSubject] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  const [priority, setPriority] = useState('');
  const [detailedQuestion, setDetailedQuestion] = useState('');
  const [suggestedSolution, setSuggestedSolution] = useState('');
  const [referenceDrawings, setReferenceDrawings] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: projectsList } = useSupabase(projectService.list);
  const { data: employeesList } = useSupabase(employeeService.list);

  // Auto-generate next RFI number
  const generateRfiNumber = () => {
    // Simple sequential based on timestamp to avoid collisions
    const now = new Date();
    const seq = String(now.getTime()).slice(-4);
    return `RFI-${seq}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    // Find selected employee name
    const emp = employeesList.find(em => em.id === submittedBy);
    const submitterName = emp ? emp.name : submittedBy;
    const today = new Date().toISOString().split('T')[0];

    const rfi = {
      rfi_number: generateRfiNumber(),
      project_id: projectId,
      subject,
      submitted_by: submitterName,
      date_submitted: today,
      status: 'Open',
    };

    try {
      await rfiService.create(rfi);
      navigate('/change-orders');
    } catch (err) {
      console.error('Failed to create RFI:', err);
      setErrorMsg(`Failed to create RFI: ${err.message}`);
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/change-orders')}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '0.5rem' }}
        >
          <ArrowLeft size={16} /> Back to Change Orders
        </button>
        <h1 className="page-title">New RFI</h1>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '12px 16px', marginBottom: '1rem', color: '#b91c1c',
          fontSize: '0.85rem', fontWeight: 500,
        }}>
          {errorMsg}
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '2rem', maxWidth: '950px' }}>
          {/* Row 1: Project & Subject */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Project</label>
              <select
                className="input"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                style={{ appearance: 'auto' }}
              >
                <option value="">Select a project...</option>
                {projectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Subject</label>
              <input
                className="input"
                type="text"
                placeholder="Brief subject of the RFI..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Row 2: Submitted By & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Submitted By</label>
              <select
                className="input"
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                required
                style={{ appearance: 'auto' }}
              >
                <option value="">Select employee...</option>
                {employeesList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select
                className="input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
                style={{ appearance: 'auto' }}
              >
                <option value="">Select priority...</option>
                {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed Question */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Detailed Question</label>
            <textarea
              className="input"
              rows={6}
              placeholder="Provide a detailed description of the question or issue that requires clarification..."
              value={detailedQuestion}
              onChange={(e) => setDetailedQuestion(e.target.value)}
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Suggested Solution */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Suggested Solution</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Optionally suggest a proposed solution or approach..."
              value={suggestedSolution}
              onChange={(e) => setSuggestedSolution(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Reference Drawings / Specs */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Reference Drawings / Specs</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Sheet A-201, Spec Section 03 30 00"
              value={referenceDrawings}
              onChange={(e) => setReferenceDrawings(e.target.value)}
            />
          </div>

          {/* Attachments */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Attachments</label>
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '0.5rem',
                padding: '2rem',
                textAlign: 'center',
                color: '#94a3b8',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
            >
              <Upload size={28} style={{ margin: '0 auto 0.5rem', display: 'block' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem', color: '#64748b' }}>
                Drag and drop files here, or click to browse
              </p>
              <p style={{ fontSize: '0.75rem' }}>PDF, JPG, PNG, or DWG up to 25 MB</p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <button type="button" className="btn-secondary" onClick={() => navigate('/change-orders')} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {submitting ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...
                </>
              ) : (
                <>
                  <Send size={16} /> Submit RFI
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
