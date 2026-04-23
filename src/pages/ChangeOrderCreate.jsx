import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Upload, Loader2 } from 'lucide-react';
import { changeOrderService, projectService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' };

export default function ChangeOrderCreate() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [amount, setAmount] = useState('');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch projects and existing change orders from Supabase
  const { data: projectsList } = useSupabase(projectService.list);
  const { data: existingCOs } = useSupabase(changeOrderService.list);

  // Auto-generate next CO number
  const generateCoNumber = () => {
    const existingNumbers = existingCOs
      .map(co => {
        const match = (co.id || co.co_number || '').match(/CO-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return `CO-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    const coNumber = generateCoNumber();
    const parsedAmount = parseFloat(amount || 0);
    const today = new Date().toISOString().split('T')[0];

    const co = {
      co_number: coNumber,
      project_id: projectId,
      description,
      amount: parsedAmount,
      status: 'Pending',
      requested_by: requestedBy,
      co_date: today,
    };

    const initialVersion = {
      version_number: 1,
      amount: parsedAmount,
      notes: justification || description,
      version_date: today,
    };

    try {
      await changeOrderService.create(co, [initialVersion]);
      navigate('/change-orders');
    } catch (err) {
      console.error('Failed to create change order:', err);
      setErrorMsg(`Failed to create change order: ${err.message}`);
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
        <h1 className="page-title">New Change Order</h1>
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
          {/* Row 1: Project & Requested By */}
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
              <label style={labelStyle}>Requested By</label>
              <select
                className="input"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                required
                style={{ appearance: 'auto' }}
              >
                <option value="">Select requestor...</option>
                {['Client', 'Contractor', 'Architect', 'Engineer'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Describe the proposed change..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Amount ($)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Justification / Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Justification / Notes</label>
            <textarea
              className="input"
              rows={4}
              placeholder="Provide justification or additional notes for this change order..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Supporting Documents */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Supporting Documents</label>
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
                  <Send size={16} /> Submit Change Order
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
