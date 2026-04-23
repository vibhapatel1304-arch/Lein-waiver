import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save, Send, Loader2 } from 'lucide-react';
import { contractService, clientService, projectService, generateContractId } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.375rem',
};

const CONTRACT_TYPES = ['Lump Sum', 'GMP', 'Cost Plus', 'Time & Materials'];

const emptyLineItem = () => ({ description: '', amount: '' });

export default function ContractCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');

  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [contractType, setContractType] = useState('Lump Sum');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState([emptyLineItem()]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  // Load existing contract when editing — tries Supabase first, falls back to mock
  useEffect(() => {
    if (!editId) return;
    async function loadContract() {
      let c = null;
      try {
        c = await contractService.getById(editId);
      } catch (err) {
        console.error('Failed to load contract for editing:', err);
      }
      if (c) {
        setTitle(c.title || '');
        setClientId(c.client_id || c.clientId || '');
        setProjectId(c.project_id || c.projectId || '');
        setContractType(c.contract_type || c.type || 'Lump Sum');
        setStartDate(c.start_date || c.startDate || '');
        setEndDate(c.end_date || c.endDate || '');
        setScopeOfWork(c.scope_of_work || c.scopeOfWork || '');
        setPaymentTerms(c.payment_terms || c.paymentTerms || '');
        setNotes(c.notes || '');
        const lis = c.lineItems || c.contract_line_items || [];
        setLineItems(lis.length ? lis.map((li) => ({ description: li.description, amount: String(li.amount) })) : [emptyLineItem()]);
      }
      setLoadingEdit(false);
    }
    loadContract();
  }, [editId]);

  const { data: clients } = useSupabase(clientService.list);
  const { data: projectsList } = useSupabase(projectService.list);

  const selectedClient = clients.find((c) => c.id === clientId);
  const clientProjects = projectsList.filter((p) => (p.clientId || p.client_id) === clientId);

  // Live preview of next contract ID
  const [previewId, setPreviewId] = useState('');
  useEffect(() => {
    if (editId || !selectedClient) { setPreviewId(''); return; }
    generateContractId(selectedClient.company).then(setPreviewId).catch(() => setPreviewId(''));
  }, [selectedClient, editId]);

  const updateLineItem = (index, field, value) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLineItem = () => setLineItems((prev) => [...prev, emptyLineItem()]);
  const removeLineItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalValue = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const handleSave = async (asDraft) => {
    setSubmitting(true);
    setSubmitError(null);
    const status = asDraft ? 'Draft' : 'Sent';
    const today = new Date().toISOString().split('T')[0];
    const client = clients.find((c) => c.id === clientId);
    const project = projectsList.find((p) => p.id === projectId);
    const contractRow = {
      title,
      client_id: clientId || null,
      client_name: client?.name || null,
      company: client?.company || null,
      project_id: projectId || null,
      project_name: project?.name || null,
      contract_type: contractType,
      status,
      contract_value: totalValue,
      start_date: startDate || null,
      end_date: endDate || null,
      sent_date: status === 'Sent' ? today : null,
      scope_of_work: scopeOfWork,
      payment_terms: paymentTerms,
      notes,
    };
    const sovRows = lineItems.filter((li) => li.description.trim()).map((li) => ({
      description: li.description,
      amount: parseFloat(li.amount) || 0,
    }));
    try {
      if (editId) {
        await contractService.update(editId, contractRow, sovRows);
        navigate(`/contracts/${editId}`, { state: { refetch: Date.now() } });
      } else {
        await contractService.create(contractRow, sovRows);
        navigate('/contracts');
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to save contract.');
      setSubmitting(false);
    }
  };

  if (loadingEdit) {
    return (
      <div style={{ padding: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#64748b' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        Loading contract...
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button
            onClick={() => editId ? navigate(`/contracts/${editId}`) : navigate('/contracts')}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={16} /> {editId ? 'Back to Contract' : 'Back to Contracts'}
          </button>
          <h1 className="page-title">{editId ? `Edit Contract — ${editId}` : 'Create New Contract'}</h1>
          {/* Live contract ID preview */}
          {!editId && (
            <div style={{ marginTop: '0.375rem', padding: '0.5rem 0.875rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#94a3b8', fontWeight: 400 }}>Contract ID:</span>
              <code style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#0f172a', background: '#fff', padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                {previewId || `CON-???-${new Date().getFullYear()}-###`}
              </code>
              {previewId && (
                <span style={{ color: '#64748b', fontWeight: 400, fontSize: '0.75rem' }}>
                  Invoice will be: {previewId}-D01, {previewId}-D02, ...
                </span>
              )}
              {!previewId && (
                <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.75rem' }}>
                  Select a client to see ID
                </span>
              )}
            </div>
          )}
          {editId && (
            <div style={{ marginTop: '0.375rem', padding: '0.375rem 0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.375rem', fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 500 }}>
              Editing draft — changes will overwrite current contract data.
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={() => handleSave(true)} disabled={submitting}>
            {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />} Save as Draft
          </button>
          <button className="btn-primary" onClick={() => handleSave(false)} disabled={submitting}>
            {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />} Send to Client
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      {submitError && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.875rem' }}>
          {submitError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Main Form */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Basic Info */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
              Contract Details
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Contract Title</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Harrington Office Complex — General Contract"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Client</label>
                  <select
                    className="input"
                    value={clientId}
                    onChange={(e) => { setClientId(e.target.value); setProjectId(''); }}
                    style={{ appearance: 'auto' }}
                  >
                    <option value="">Select a client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Linked Project</label>
                  <select
                    className="input"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    disabled={!clientId}
                    style={{ appearance: 'auto', opacity: clientId ? 1 : 0.5 }}
                  >
                    <option value="">Select a project...</option>
                    {clientProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    {clientId && clientProjects.length === 0 && (
                      <option disabled>No projects for this client</option>
                    )}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Contract Type</label>
                  <select
                    className="input"
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                    style={{ appearance: 'auto' }}
                  >
                    {CONTRACT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input
                    className="input"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>End Date / Deadline</label>
                  <input
                    className="input"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Scope of Work */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
              Scope of Work
            </h2>
            <textarea
              className="input"
              placeholder="Describe the full scope of work, inclusions, and exclusions..."
              value={scopeOfWork}
              onChange={(e) => setScopeOfWork(e.target.value)}
              rows={5}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Line Items / Schedule of Values */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>Schedule of Values</h2>
              <button
                onClick={addLineItem}
                style={{ background: 'none', border: '1px dashed #cbd5e1', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 500, padding: '0.375rem 0.75rem', borderRadius: '0.375rem' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f07030'; e.currentTarget.style.color = '#f07030'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', gap: '0.75rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Description</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>Amount</span>
              <span />
            </div>

            {lineItems.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', gap: '0.75rem', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #f8fafc' }}>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Foundation & Concrete Work"
                  value={item.description}
                  onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={item.amount}
                  onChange={(e) => updateLineItem(idx, 'amount', e.target.value)}
                  style={{ textAlign: 'right' }}
                />
                <button
                  onClick={() => removeLineItem(idx)}
                  disabled={lineItems.length === 1}
                  style={{ background: 'none', border: 'none', cursor: lineItems.length === 1 ? 'not-allowed' : 'pointer', color: lineItems.length === 1 ? '#e2e8f0' : '#ef4444', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '2px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Contract Value</span>
                <span style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(totalValue)}</span>
              </div>
            </div>
          </div>

          {/* Payment Terms & Notes */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
              Terms & Notes
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Payment Terms</label>
                <textarea
                  className="input"
                  placeholder="e.g. Monthly AIA G702 pay applications. Net 30. 10% retainage..."
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Internal Notes</label>
                <textarea
                  className="input"
                  placeholder="Any internal notes about this contract..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem', marginTop: '0.125rem' }}>
                  {selectedClient ? selectedClient.name : <span style={{ color: '#cbd5e1' }}>Not selected</span>}
                </div>
                {selectedClient && <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{selectedClient.company}</div>}
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem', marginTop: '0.125rem' }}>{contractType}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</div>
                <div style={{ fontWeight: 500, color: '#0f172a', fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                  {startDate && endDate ? `${startDate} → ${endDate}` : startDate || endDate || <span style={{ color: '#cbd5e1' }}>Not set</span>}
                </div>
              </div>
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contract Value</div>
                <div style={{ fontWeight: 800, color: '#f07030', fontSize: '1.25rem', marginTop: '0.25rem' }}>{formatCurrency(totalValue)}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', background: '#fffbf5', border: '1px solid #fed7aa' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Workflow</h3>
            {[
              { step: '1', label: 'Save as Draft', done: false },
              { step: '2', label: 'Send to Client', done: false },
              { step: '3', label: 'Client Reviews', done: false },
              { step: '4', label: 'Signed', done: false },
            ].map(({ step, label }) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f07030', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                  {step}
                </div>
                <span style={{ fontSize: '0.8125rem', color: '#92400e', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
