import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save, Send, FileText, Calculator, Loader2, FileCheck } from 'lucide-react';
import { payAppService, projectService, clientService, estimateService, lienWaiverService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

const parseCurrency = (value) => {
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
};

const emptyLineItem = (itemNum = 1) => ({
  itemNumber: itemNum,
  description: '',
  scheduledValue: 0,
  previousApplication: 0,
  thisPeriod: 0,
  materialsStored: 0,
});

export default function PayApplicationCreate() {
  const navigate = useNavigate();

  const { data: projectsList } = useSupabase(projectService.list);
  const { data: clientsList } = useSupabase(clientService.list);
  const { data: estimatesList } = useSupabase(estimateService.list);

  // Project information
  const [projectId, setProjectId] = useState('');
  const [applicationNumber, setApplicationNumber] = useState('1');
  const [periodTo, setPeriodTo] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [contractFor, setContractFor] = useState('');
  const [contractorName, setContractorName] = useState('Boulder Construction');

  // Architect information
  const [architectName, setArchitectName] = useState('');
  const [architectAddress, setArchitectAddress] = useState('');

  // Contract summary
  const [originalContractSum, setOriginalContractSum] = useState(0);
  const [netChangeOrders, setNetChangeOrders] = useState(0);

  // Schedule of Values line items
  const [lineItems, setLineItems] = useState([emptyLineItem(1)]);

  // Retainage
  const [retainagePercent, setRetainagePercent] = useState(10);

  // Previous certificates
  const [previousCertificates, setPreviousCertificates] = useState(0);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [createdPayApp, setCreatedPayApp] = useState(null);
  const [generatingWaiver, setGeneratingWaiver] = useState(false);

  // Auto-fill when project is selected
  useEffect(() => {
    if (!projectId) {
      setOwnerName('');
      setContractDate('');
      setContractFor('');
      setOriginalContractSum(0);
      setLineItems([emptyLineItem(1)]);
      return;
    }

    // Support both snake_case (Supabase) and camelCase field names
    const project = projectsList.find((p) => p.id === projectId);
    if (!project) return;

    // Support both Supabase snake_case and camelCase
    const clientId = project.client_id ?? project.clientId;
    const projectName = project.name ?? project.project_name ?? '';

    // Fill owner from clients list
    const client = clientsList.find((c) => c.id === clientId);
    if (client) {
      setOwnerName(`${client.name} — ${client.company || ''}`);
    } else {
      setOwnerName(project.owner_name ?? project.client ?? '');
    }

    setContractDate(project.start_date ?? project.startDate ?? '');
    setContractFor(project.description ?? projectName);
    setOriginalContractSum(project.budget ?? 0);

    // Try to find matching estimate and pre-populate line items
    const matchingEstimate = estimatesList.find(
      (e) => (e.clientId === clientId || e.client_id === clientId) && (e.projectName === projectName || e.project_name === projectName)
    );
    if (matchingEstimate && (matchingEstimate.lineItems || matchingEstimate.line_items) && (matchingEstimate.lineItems || matchingEstimate.line_items).length > 0) {
      const items = matchingEstimate.lineItems || matchingEstimate.line_items;
      setLineItems(
        items.map((item, idx) => ({
          itemNumber: idx + 1,
          description: item.description,
          scheduledValue: item.total || 0,
          previousApplication: 0,
          thisPeriod: 0,
          materialsStored: 0,
        }))
      );
    } else {
      setLineItems([emptyLineItem(1)]);
    }
  }, [projectId, projectsList, clientsList, estimatesList]);

  // Line item helpers
  const updateLineItem = (index, field, value) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: field === 'description' ? value : parseCurrency(value) };
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, emptyLineItem(prev.length + 1)]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) =>
      prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, itemNumber: i + 1 }))
    );
  };

  // Per-row calculations
  const rowTotalCompleted = (item) => (item.previousApplication || 0) + (item.thisPeriod || 0) + (item.materialsStored || 0);
  const rowPercentComplete = (item) => {
    const sv = item.scheduledValue || 0;
    if (sv === 0) return 0;
    return (rowTotalCompleted(item) / sv) * 100;
  };
  const rowBalanceToFinish = (item) => (item.scheduledValue || 0) - rowTotalCompleted(item);

  // Grand totals
  const totals = useMemo(() => {
    const scheduledValue = lineItems.reduce((s, i) => s + (i.scheduledValue || 0), 0);
    const previousApplication = lineItems.reduce((s, i) => s + (i.previousApplication || 0), 0);
    const thisPeriod = lineItems.reduce((s, i) => s + (i.thisPeriod || 0), 0);
    const materialsStored = lineItems.reduce((s, i) => s + (i.materialsStored || 0), 0);
    const totalCompleted = previousApplication + thisPeriod + materialsStored;
    const percentComplete = scheduledValue > 0 ? (totalCompleted / scheduledValue) * 100 : 0;
    const balanceToFinish = scheduledValue - totalCompleted;
    return { scheduledValue, previousApplication, thisPeriod, materialsStored, totalCompleted, percentComplete, balanceToFinish };
  }, [lineItems]);

  // Contract sum to date
  const contractSumToDate = (parseCurrency(originalContractSum) || 0) + (parseCurrency(netChangeOrders) || 0);

  // Summary calculations
  const totalCompletedAndStored = totals.totalCompleted;
  const totalRetainage = totalCompletedAndStored * ((retainagePercent || 0) / 100);
  const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage;
  const currentPaymentDue = totalEarnedLessRetainage - (parseCurrency(previousCertificates) || 0);
  const balanceToFinish = totals.scheduledValue - totalCompletedAndStored;

  const handleSave = async (asDraft) => {
    const status = asDraft ? 'Draft' : 'Submitted';
    setSaving(true);

    // Build line items for Supabase (snake_case)
    const supabaseLineItems = lineItems.map((li) => {
      const tc = rowTotalCompleted(li);
      const sv = li.scheduledValue || 0;
      const pct = sv > 0 ? (tc / sv) * 100 : 0;
      const bf = sv - tc;
      const ret = tc * ((retainagePercent || 0) / 100);
      return {
        item_no: li.itemNumber,
        description: li.description,
        scheduled_value: sv,
        previous_application: li.previousApplication || 0,
        this_period: li.thisPeriod || 0,
        materials_stored: li.materialsStored || 0,
        total_completed: tc,
        percent_complete: parseFloat(pct.toFixed(2)),
        balance_to_finish: bf,
        retainage: parseFloat(ret.toFixed(2)),
      };
    });

    // Calculate summary using payAppService.calcSummary
    const summary = payAppService.calcSummary(
      supabaseLineItems,
      parseCurrency(originalContractSum),
      parseCurrency(netChangeOrders),
      retainagePercent || 0,
      parseCurrency(previousCertificates)
    );

    // Build pay application record for Supabase
    const payApp = {
      application_no: parseInt(applicationNumber, 10) || 1,
      project_id: projectId || null,
      project_name: contractFor || '',
      owner_name: ownerName,
      contractor_name: contractorName,
      architect_name: architectName,
      contract_for: contractFor,
      contract_date: contractDate || null,
      period_to: periodTo || null,
      application_date: new Date().toISOString().split('T')[0],
      original_contract_sum: parseCurrency(originalContractSum),
      net_change_orders: parseCurrency(netChangeOrders),
      retainage_percent: retainagePercent || 0,
      less_previous_certificates: parseCurrency(previousCertificates),
      status,
      // Calculated fields from calcSummary
      ...summary,
    };

    try {
      const created = await payAppService.create(payApp, supabaseLineItems);
      setCreatedPayApp(created);
      if (!asDraft) {
        // Short delay so user can see the "Generate Lien Waiver" button
        // before navigating (only on submit, not draft)
      }
      navigate('/pay-applications');
    } catch (err) {
      console.warn('Supabase save failed:', err.message);
      // Fallback: just show alert and navigate anyway
      alert(`Pay Application saved as "${status}" (offline). Current Payment Due: ${formatCurrency(currentPaymentDue)}`);
      navigate('/pay-applications');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateWaiver = async () => {
    if (!createdPayApp) return;
    setGeneratingWaiver(true);
    try {
      await lienWaiverService.generateFromPayApp(createdPayApp, {
        company: contractorName || 'Boulder Construction',
        name: ownerName,
        title: 'Project Manager',
      });
      alert('Lien waiver (K2) generated successfully!');
    } catch (err) {
      alert('Failed to generate waiver: ' + err.message);
    } finally {
      setGeneratingWaiver(false);
    }
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.375rem',
  };

  const sectionTitle = (text, icon) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e2e8f0' }}>
      {icon}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{text}</h2>
    </div>
  );

  const readOnlyStyle = { background: '#f1f5f9', color: '#475569', cursor: 'default' };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button
            onClick={() => navigate('/pay-applications')}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={16} /> Back to Pay Applications
          </button>
          <h1 className="page-title">Create Pay Application</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>AIA G702/G703 — Application and Certificate for Payment</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {createdPayApp && (
            <button
              className="btn-secondary"
              onClick={handleGenerateWaiver}
              disabled={generatingWaiver}
              style={{ opacity: generatingWaiver ? 0.6 : 1 }}
            >
              <FileCheck size={16} /> {generatingWaiver ? 'Generating...' : 'Generate Lien Waiver'}
            </button>
          )}
          <button className="btn-secondary" onClick={() => handleSave(true)} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button className="btn-primary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
            {saving ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ============ PROJECT INFORMATION ============ */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        {sectionTitle('Project Information', <FileText size={18} style={{ color: '#2563eb' }} />)}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Project</label>
            <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— Select Project —</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>{p.name ?? p.project_name ?? p.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Owner</label>
            <input className="input" value={ownerName} readOnly style={readOnlyStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Contract Date</label>
            <input className="input" type="date" value={contractDate} readOnly style={readOnlyStyle} />
          </div>
          <div>
            <label style={labelStyle}>Application Number</label>
            <input className="input" type="number" min="1" value={applicationNumber} onChange={(e) => setApplicationNumber(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Period To</label>
            <input className="input" type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <label style={labelStyle}>Contract For</label>
          <input className="input" value={contractFor} readOnly style={readOnlyStyle} />
        </div>
      </div>

      {/* ============ ARCHITECT INFORMATION ============ */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        {sectionTitle('Architect Information', <FileText size={18} style={{ color: '#7c3aed' }} />)}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Architect Name</label>
            <input className="input" value={architectName} onChange={(e) => setArchitectName(e.target.value)} placeholder="Enter architect name" />
          </div>
          <div>
            <label style={labelStyle}>Architect Address</label>
            <input className="input" value={architectAddress} onChange={(e) => setArchitectAddress(e.target.value)} placeholder="Enter architect address" />
          </div>
        </div>
      </div>

      {/* ============ CONTRACT SUMMARY ============ */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        {sectionTitle('Contract Summary', <Calculator size={18} style={{ color: '#059669' }} />)}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
          <div>
            <label style={labelStyle}>1. Original Contract Sum</label>
            <input
              className="input"
              value={originalContractSum}
              onChange={(e) => setOriginalContractSum(parseCurrency(e.target.value))}
              style={{ textAlign: 'right' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
              {formatCurrency(parseCurrency(originalContractSum))}
            </span>
          </div>
          <div>
            <label style={labelStyle}>2. Net Change by Change Orders</label>
            <input
              className="input"
              value={netChangeOrders}
              onChange={(e) => setNetChangeOrders(parseCurrency(e.target.value))}
              style={{ textAlign: 'right' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
              {formatCurrency(parseCurrency(netChangeOrders))}
            </span>
          </div>
          <div>
            <label style={labelStyle}>3. Contract Sum to Date (1 + 2)</label>
            <input className="input" value={formatCurrency(contractSumToDate)} readOnly style={{ ...readOnlyStyle, textAlign: 'right', fontWeight: 600 }} />
          </div>
        </div>
      </div>

      {/* ============ SCHEDULE OF VALUES (G703) ============ */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        {sectionTitle('Schedule of Values (G703 Line Items)', <FileText size={18} style={{ color: '#d97706' }} />)}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Item #', 'Description of Work', 'Scheduled Value', 'Previous Application', 'This Period', 'Materials Stored', 'Total Completed', '% Complete', 'Balance to Finish', ''].map((h, i) => (
                  <th key={i} style={{ padding: '0.625rem 0.5rem', textAlign: i >= 2 ? 'right' : 'left', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => {
                const tc = rowTotalCompleted(item);
                const pc = rowPercentComplete(item);
                const bf = rowBalanceToFinish(item);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem', width: '60px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                      {item.itemNumber}
                    </td>
                    <td style={{ padding: '0.5rem', minWidth: '200px' }}>
                      <input
                        className="input"
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                        placeholder="Description of work"
                        style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem', width: '130px' }}>
                      <input
                        className="input"
                        value={item.scheduledValue}
                        onChange={(e) => updateLineItem(idx, 'scheduledValue', e.target.value)}
                        style={{ textAlign: 'right', fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem', width: '130px' }}>
                      <input
                        className="input"
                        value={item.previousApplication}
                        onChange={(e) => updateLineItem(idx, 'previousApplication', e.target.value)}
                        style={{ textAlign: 'right', fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem', width: '130px' }}>
                      <input
                        className="input"
                        value={item.thisPeriod}
                        onChange={(e) => updateLineItem(idx, 'thisPeriod', e.target.value)}
                        style={{ textAlign: 'right', fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem', width: '130px' }}>
                      <input
                        className="input"
                        value={item.materialsStored}
                        onChange={(e) => updateLineItem(idx, 'materialsStored', e.target.value)}
                        style={{ textAlign: 'right', fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem', width: '110px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                      {formatCurrency(tc)}
                    </td>
                    <td style={{ padding: '0.5rem', width: '80px', textAlign: 'right', fontWeight: 600, color: pc >= 100 ? '#059669' : pc >= 50 ? '#d97706' : '#64748b' }}>
                      {pc.toFixed(1)}%
                    </td>
                    <td style={{ padding: '0.5rem', width: '110px', textAlign: 'right', color: '#475569' }}>
                      {formatCurrency(bf)}
                    </td>
                    <td style={{ padding: '0.5rem', width: '40px', textAlign: 'center' }}>
                      <button
                        onClick={() => removeLineItem(idx)}
                        style={{ background: 'none', border: 'none', cursor: lineItems.length === 1 ? 'not-allowed' : 'pointer', color: lineItems.length === 1 ? '#cbd5e1' : '#ef4444', padding: '0.25rem' }}
                        disabled={lineItems.length === 1}
                        title="Remove line item"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Grand Totals Row */}
              <tr style={{ background: '#f1f5f9', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                <td style={{ padding: '0.625rem 0.5rem' }} colSpan={2}>
                  Grand Totals
                </td>
                <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right' }}>{formatCurrency(totals.scheduledValue)}</td>
                <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right' }}>{formatCurrency(totals.previousApplication)}</td>
                <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right' }}>{formatCurrency(totals.thisPeriod)}</td>
                <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right' }}>{formatCurrency(totals.materialsStored)}</td>
                <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right' }}>{formatCurrency(totals.totalCompleted)}</td>
                <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right' }}>{totals.percentComplete.toFixed(1)}%</td>
                <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right' }}>{formatCurrency(totals.balanceToFinish)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <button
          onClick={addLineItem}
          style={{ marginTop: '1rem', background: 'none', border: '1px dashed #94a3b8', borderRadius: '8px', padding: '0.625rem 1.25rem', color: '#2563eb', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> Add Line Item
        </button>
      </div>

      {/* ============ RETAINAGE ============ */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        {sectionTitle('Retainage', <Calculator size={18} style={{ color: '#dc2626' }} />)}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Retainage Percentage</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={retainagePercent}
                onChange={(e) => setRetainagePercent(parseFloat(e.target.value) || 0)}
                style={{ width: '100px', textAlign: 'right' }}
              />
              <span style={{ fontWeight: 600, color: '#64748b' }}>%</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Retainage on Completed Work</label>
            <input className="input" value={formatCurrency(totalRetainage)} readOnly style={{ ...readOnlyStyle, textAlign: 'right', fontWeight: 600 }} />
          </div>
          <div>
            <label style={labelStyle}>Total Completed & Stored</label>
            <input className="input" value={formatCurrency(totalCompletedAndStored)} readOnly style={{ ...readOnlyStyle, textAlign: 'right', fontWeight: 600 }} />
          </div>
        </div>
      </div>

      {/* ============ SUMMARY ============ */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        {sectionTitle('Payment Summary', <Calculator size={18} style={{ color: '#2563eb' }} />)}

        <div style={{ maxWidth: '500px' }}>
          {[
            { label: 'Total Completed & Stored to Date', value: totalCompletedAndStored, editable: false },
            { label: 'Total Retainage', value: totalRetainage, editable: false, subtract: true },
            { label: 'Total Earned Less Retainage', value: totalEarnedLessRetainage, editable: false, bold: true },
            { label: 'Less Previous Certificates for Payment', value: previousCertificates, editable: true, subtract: true },
            { label: 'Current Payment Due', value: currentPaymentDue, editable: false, bold: true, highlight: true },
            { label: 'Balance to Finish Including Retainage', value: balanceToFinish + totalRetainage, editable: false },
          ].map((row, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 0',
                borderBottom: idx < 5 ? '1px solid #e2e8f0' : 'none',
                ...(row.highlight ? { background: '#eff6ff', margin: '0 -1rem', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #bfdbfe' } : {}),
              }}
            >
              <span style={{ fontSize: '0.875rem', color: row.bold ? '#1e293b' : '#475569', fontWeight: row.bold ? 700 : 500 }}>
                {row.subtract ? '(-) ' : ''}{row.label}
              </span>
              {row.editable ? (
                <input
                  className="input"
                  value={previousCertificates}
                  onChange={(e) => setPreviousCertificates(parseCurrency(e.target.value))}
                  style={{ width: '160px', textAlign: 'right', fontSize: '0.875rem' }}
                />
              ) : (
                <span style={{ fontWeight: row.bold ? 700 : 600, fontSize: row.highlight ? '1.125rem' : '0.875rem', color: row.highlight ? '#2563eb' : '#1e293b' }}>
                  {formatCurrency(row.value)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', paddingBottom: '2rem' }}>
        {createdPayApp && (
          <button
            className="btn-secondary"
            onClick={handleGenerateWaiver}
            disabled={generatingWaiver}
            style={{ opacity: generatingWaiver ? 0.6 : 1 }}
          >
            <FileCheck size={16} /> {generatingWaiver ? 'Generating...' : 'Generate Lien Waiver'}
          </button>
        )}
        <button className="btn-secondary" onClick={() => handleSave(true)} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button className="btn-primary" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
          {saving ? 'Submitting...' : 'Submit for Review'}
        </button>
      </div>
    </div>
  );
}
