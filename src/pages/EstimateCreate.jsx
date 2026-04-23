import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save, Send, Loader2 } from 'lucide-react';
import { estimateService, clientService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

const emptyLineItem = () => ({ description: '', quantity: 1, unitCost: 0 });

export default function EstimateCreate() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [lineItems, setLineItems] = useState([emptyLineItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const { data: clients } = useSupabase(clientService.list);
  const [taxRate] = useState(0);

  const updateLineItem = (index, field, value) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, emptyLineItem()]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const lineTotal = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0);
  const subtotal = lineItems.reduce((sum, item) => sum + lineTotal(item), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  const handleSave = async (asDraft) => {
    setSubmitting(true);
    setSubmitError(null);
    const status = asDraft ? 'Draft' : 'Sent';
    const today = new Date().toISOString().split('T')[0];
    const client = clients.find((c) => c.id === clientId);
    const estimateRow = {
      client_id: clientId || null,
      client_name: client ? `${client.company || client.name}` : null,
      project_name: projectName,
      total_amount: grandTotal,
      subtotal,
      tax: taxAmount,
      status,
      estimate_date: today,
      valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    };
    const sovRows = lineItems.filter((li) => li.description.trim()).map((li) => ({
      description: li.description,
      quantity: parseFloat(li.quantity) || 1,
      unitCost: parseFloat(li.unitCost) || 0,
      total: lineTotal(li),
    }));
    try {
      await estimateService.create(estimateRow, sovRows);
      navigate('/estimates');
    } catch (err) {
      setSubmitError(err.message || 'Failed to save estimate.');
      setSubmitting(false);
    }
  };

  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button
            onClick={() => navigate('/estimates')}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={16} /> Back to Estimates
          </button>
          <h1 className="page-title">Create New Estimate</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={() => handleSave(true)} disabled={submitting}>
            {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />} Save as Draft
          </button>
          <button className="btn-primary" onClick={() => handleSave(false)} disabled={submitting}>
            {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />} Send
          </button>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      {submitError && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.875rem' }}>
          {submitError}
        </div>
      )}
      {/* Form Card */}
      <div className="card" style={{ padding: '2rem', maxWidth: '950px' }}>
        {/* Client & Project */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <label style={labelStyle}>Client</label>
            <select
              className="input"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={{ appearance: 'auto' }}
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.company}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Project Name</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Office Renovation Phase 2"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
        </div>

        {/* Line Items */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Line Items</label>
            <button
              onClick={addLineItem}
              style={{ background: 'none', border: '1px dashed #cbd5e1', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 500, padding: '0.375rem 0.75rem', borderRadius: '0.375rem', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.color = '#d97706'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
            >
              <Plus size={14} /> Add Line Item
            </button>
          </div>

          {/* Line Items Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px 140px 40px', gap: '0.75rem', padding: '0 0 0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Qty</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Unit Cost</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Total</span>
            <span></span>
          </div>

          {/* Line Item Rows */}
          {lineItems.map((item, idx) => (
            <div
              key={idx}
              style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px 140px 40px', gap: '0.75rem', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}
            >
              <input
                className="input"
                type="text"
                placeholder="Description of work"
                value={item.description}
                onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
              />
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={item.quantity}
                onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                style={{ textAlign: 'center' }}
              />
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={item.unitCost || ''}
                onChange={(e) => updateLineItem(idx, 'unitCost', e.target.value)}
                style={{ textAlign: 'right' }}
              />
              <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.875rem', color: '#1e293b', paddingRight: '0.25rem' }}>
                {formatCurrency(lineTotal(item))}
              </div>
              <button
                onClick={() => removeLineItem(idx)}
                disabled={lineItems.length === 1}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: lineItems.length === 1 ? 'not-allowed' : 'pointer',
                  color: lineItems.length === 1 ? '#cbd5e1' : '#ef4444',
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Remove line item"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.875rem', color: '#475569' }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.875rem', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
              <span>Tax ({taxRate}%)</span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(taxAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
              <span>Grand Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
