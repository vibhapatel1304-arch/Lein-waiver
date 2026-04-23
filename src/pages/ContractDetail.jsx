import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, FileSignature, DollarSign, Calendar, Building2,
  ClipboardList, CheckCircle, Clock, Send, Printer, Plus, Receipt,
  Pencil, Trash2, Loader2,
} from 'lucide-react';
import { contractService, invoiceService } from '../services/supabaseService';
import { useSupabase, useSupabaseById } from '../hooks/useSupabase';

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const STATUS_STYLE = {
  Draft:  { background: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  Sent:   { background: '#fef3c7', color: '#d97706', border: '#fde68a' },
  Signed: { background: '#d1fae5', color: '#059669', border: '#6ee7b7' },
  Void:   { background: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
};

const TYPE_STYLE = {
  'Lump Sum':  { background: '#eff6ff', color: '#3b82f6' },
  'GMP':       { background: '#f5f3ff', color: '#7c3aed' },
  'Cost Plus': { background: '#fff7ed', color: '#ea580c' },
  'Time & Materials': { background: '#ecfdf5', color: '#059669' },
};

const WORKFLOW_STEPS = ['Draft', 'Sent', 'Signed'];

function StepIndicator({ status }) {
  const currentIdx = WORKFLOW_STEPS.indexOf(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {WORKFLOW_STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#059669' : active ? '#f07030' : '#e2e8f0',
                color: done || active ? '#fff' : '#94a3b8',
                fontWeight: 700, fontSize: '0.8rem',
              }}>
                {done ? <CheckCircle size={16} /> : idx + 1}
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: active ? 700 : 500, color: active ? '#f07030' : done ? '#059669' : '#94a3b8', whiteSpace: 'nowrap' }}>
                {step}
              </span>
            </div>
            {idx < WORKFLOW_STEPS.length - 1 && (
              <div style={{ width: 60, height: 2, background: done ? '#059669' : '#e2e8f0', margin: '0 0.25rem', marginBottom: '1rem' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Live data from Supabase
  const { data: contract, loading, setData: setContract, refetch } = useSupabaseById(contractService.getById, id);

  // Re-fetch when navigating back from edit
  useEffect(() => {
    if (location.state?.refetch) refetch();
  }, [location.state?.refetch]);
  const { data: liveInvoices } = useSupabase(
    () => invoiceService.listByContract(id),
  );

  const runAction = async (key, fn, optimisticStatus) => {
    setActionLoading(key);
    try {
      await fn();
      setContract((prev) => ({ ...prev, status: optimisticStatus }));
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = () => runAction('send', () => contractService.updateStatus(id, 'Sent', { sent_date: new Date().toISOString().split('T')[0] }), 'Sent');
  const handleSign = () => runAction('sign', () => contractService.updateStatus(id, 'Signed', { signed_date: new Date().toISOString().split('T')[0] }), 'Signed');
  const handleVoid = () => runAction('void', () => contractService.updateStatus(id, 'Void'), 'Void');

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setActionLoading('delete');
    try {
      await contractService.delete(id);
      navigate('/contracts');
    } catch (err) {
      alert(err.message || 'Delete failed');
      setActionLoading(null);
      setDeleteConfirm(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: '#64748b' }}>Loading...</div>;
  }

  if (!contract) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <button onClick={() => navigate('/contracts')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Contracts
        </button>
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          Contract not found.
        </div>
      </div>
    );
  }

  // Normalize snake_case (Supabase) → camelCase for all reads
  const contractValue  = parseFloat(contract.contract_value  ?? contract.contractValue ?? 0);
  const contractType   = contract.contract_type  || contract.type        || 'Lump Sum';
  const startDate      = contract.start_date     || contract.startDate   || '—';
  const endDate        = contract.end_date       || contract.endDate     || '—';
  const sentDate       = contract.sent_date      || contract.sentDate;
  const signedDate     = contract.signed_date    || contract.signedDate;
  const scopeOfWork    = contract.scope_of_work  || contract.scopeOfWork || '';
  const paymentTerms   = contract.payment_terms  || contract.paymentTerms || '';
  const clientName     = contract.client_name    || contract.client      || '';
  const company        = contract.company        || '';
  const projectId      = contract.project_id     || contract.projectId   || '';
  const projectName    = contract.project_name   || contract.project     || '';
  const lineItems      = contract.lineItems       || contract.contract_line_items || [];

  const st = STATUS_STYLE[contract.status] || STATUS_STYLE.Draft;
  const tt = TYPE_STYLE[contractType] || { background: '#f1f5f9', color: '#64748b' };
  // All invoices linked to this contract from Supabase
  const allPayApps = liveInvoices
    .filter((i) => (i.contractId || i.contract_id) === contract.id)
    .sort((a, b) => (a.applicationNo ?? a.application_no ?? 0) - (b.applicationNo ?? b.application_no ?? 0));

  // Build cumulative G703 continuation sheet from all pay apps
  // Each SOV line item keyed by description — accumulate across all apps
  const sovLines = (contract.contract_line_items || contract.lineItems || []).map((li, idx) => {
    const scheduledValue = li.amount;
    let totalCompleted = 0;
    const appBreakdown = allPayApps.map((app) => {
      // line items may come from mock (camelCase) or Supabase (snake_case)
      const appLines = app.lineItems || app.pay_application_line_items || [];
      const matchedLi = appLines.find(
        (a) => (a.itemNo || a.item_no) === idx + 1 || a.description === li.description
      );
      const thisPeriod = matchedLi ? (matchedLi.thisPeriod || matchedLi.this_period || 0) : 0;
      return { appId: app.id, appNo: app.applicationNo ?? app.application_no, thisPeriod, status: app.status };
    });
    appBreakdown.forEach((a) => { totalCompleted += a.thisPeriod; });
    const balanceToFinish = scheduledValue - totalCompleted;
    const percentComplete = scheduledValue > 0 ? Math.round((totalCompleted / scheduledValue) * 100) : 0;
    return { description: li.description, scheduledValue, totalCompleted, balanceToFinish, percentComplete, appBreakdown };
  });

  const totalContractBilled = sovLines.reduce((s, l) => s + l.totalCompleted, 0);
  const totalContractBalance = contractValue - totalContractBilled;
  const overallPct = contractValue > 0 ? Math.round((totalContractBilled / contractValue) * 100) : 0;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: ClipboardList },
    { key: 'schedule', label: 'Schedule of Values', icon: DollarSign },
    { key: 'payapps', label: `Pay Applications (${allPayApps.length})`, icon: Receipt },
    { key: 'terms', label: 'Terms & Notes', icon: FileSignature },
  ];

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <button
            onClick={() => navigate('/contracts')}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={16} /> Back to Contracts
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>{contract.title}</h1>
            <span style={{ ...st, padding: '0.3rem 0.875rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, border: `1px solid ${st.border}` }}>
              {contract.status}
            </span>
          </div>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.375rem' }}>
            {contract.id} · {clientName} · {company}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn-secondary" onClick={() => alert('Print/PDF coming soon')}>
            <Printer size={16} /> Print / PDF
          </button>

          {/* Edit — only in Draft or Rejected */}
          {(contract.status === 'Draft') && (
            <button className="btn-secondary" onClick={() => navigate(`/contracts/create?editId=${id}`)}>
              <Pencil size={15} /> Edit
            </button>
          )}

          {/* Delete with confirmation */}
          {contract.status !== 'Signed' && (
            <button
              onClick={handleDelete}
              disabled={actionLoading === 'delete'}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                background: deleteConfirm ? '#dc2626' : '#fee2e2',
                color: deleteConfirm ? '#fff' : '#dc2626',
                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
              }}
            >
              {actionLoading === 'delete' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={15} />}
              {deleteConfirm ? 'Confirm Delete' : 'Delete'}
            </button>
          )}

          {/* Send to Client — Draft only */}
          {contract.status === 'Draft' && (
            <button className="btn-primary" onClick={handleSend} disabled={actionLoading === 'send'}>
              {actionLoading === 'send' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              Send to Client
            </button>
          )}

          {/* Mark as Signed — Sent only */}
          {contract.status === 'Sent' && (
            <button className="btn-primary" style={{ background: '#059669' }} onClick={handleSign} disabled={actionLoading === 'sign'}>
              {actionLoading === 'sign' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
              Mark as Signed
            </button>
          )}

          {/* Void — Draft or Sent only */}
          {(contract.status === 'Draft' || contract.status === 'Sent') && (
            <button
              onClick={handleVoid}
              disabled={actionLoading === 'void'}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0',
                background: '#fff', color: '#64748b',
                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
              }}
            >
              {actionLoading === 'void' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              Void
            </button>
          )}
        </div>
      </div>

      {/* Workflow progress */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <StepIndicator status={contract.status} />
        {sentDate && (
          <div style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: '#64748b' }}>
            <span style={{ fontWeight: 600 }}>Sent: </span>{sentDate}
            {signedDate && <span style={{ marginLeft: '1rem' }}><span style={{ fontWeight: 600 }}>Signed: </span>{signedDate}</span>}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Contract Value', value: formatCurrency(contractValue), icon: DollarSign, color: '#3b82f6' },
          { label: 'Contract Type', value: contractType, icon: FileSignature, color: '#7c3aed' },
          { label: 'Start Date', value: startDate, icon: Calendar, color: '#059669' },
          { label: 'End Date', value: endDate, icon: Clock, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '0.625rem', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem', marginTop: '0.1rem' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e2e8f0', marginBottom: '1.25rem' }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.75rem 1.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: activeTab === key ? 700 : 500,
              color: activeTab === key ? '#f07030' : '#64748b',
              borderBottom: activeTab === key ? '2px solid #f07030' : '2px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={16} style={{ color: '#f07030' }} /> Scope of Work
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>
              {scopeOfWork}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
                Linked Project
              </h3>
              {projectId ? (
                <Link to={`/projects/${projectId}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', transition: 'border-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#f07030')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  >
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{projectName}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.125rem' }}>{projectId}</div>
                  </div>
                </Link>
              ) : (
                <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>No project linked</span>
              )}
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
                Contract Value
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
                {formatCurrency(contractValue)}
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <span style={{ ...tt, padding: '0.25rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  {contractType}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>#</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Description</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Amount</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '1rem 1.25rem', color: '#94a3b8', fontSize: '0.8125rem' }}>{idx + 1}</td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{item.description}</td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                    {formatCurrency(item.amount)}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.625rem' }}>
                      <div style={{ width: 80, height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round((item.amount / contractValue) * 100)}%`, height: '100%', background: '#f07030', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500, minWidth: 36, textAlign: 'right' }}>
                        {Math.round((item.amount / contractValue) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                <td colSpan={2} style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                  Total Contract Value
                </td>
                <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>
                  {formatCurrency(contractValue)}
                </td>
                <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: '#64748b', fontSize: '0.875rem' }}>
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {activeTab === 'payapps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Summary bar */}
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contract Value</div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.25rem' }}>{formatCurrency(contractValue)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Billed to Date</div>
                <div style={{ fontWeight: 800, color: '#f07030', fontSize: '1.25rem' }}>{formatCurrency(totalContractBilled)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Balance to Finish</div>
                <div style={{ fontWeight: 800, color: '#059669', fontSize: '1.25rem' }}>{formatCurrency(totalContractBalance)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Overall % Complete</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{overallPct}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
                  <div style={{ width: `${overallPct}%`, height: '100%', background: overallPct >= 75 ? '#059669' : overallPct >= 50 ? '#3b82f6' : '#f59e0b', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link to={`/contracts/${contract.id}/g703`}>
                  <button className="btn-secondary" style={{ fontSize: '0.8125rem' }}>
                    G703 Report
                  </button>
                </Link>
                <Link to={`/contracts/${contract.id}/invoices/create`}>
                  <button className="btn-primary">
                    <Plus size={15} /> New Pay Application
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Pay Applications list */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>Pay Applications</h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{allPayApps.length} application{allPayApps.length !== 1 ? 's' : ''}</span>
            </div>
            {allPayApps.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Receipt size={32} style={{ color: '#e2e8f0', marginBottom: '0.75rem' }} />
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>No pay applications yet for this contract.</div>
                <Link to={`/contracts/${contract.id}/invoices/create`}>
                  <button className="btn-primary"><Plus size={14} /> Create First Pay Application</button>
                </Link>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['App #', 'Period', 'Contract Value', 'This Period', 'Retainage', 'Net Due', 'Total to Date', '% Complete', 'Status', ''].map((h) => {
                      const leftAlign = h === 'App #' || h === 'Period' || h === 'Status' || h === '' || h === '% Complete';
                      return (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: leftAlign ? 'left' : 'right', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {allPayApps.map((app, appIdx) => {
                    const appNo = app.applicationNo ?? app.application_no ?? '—';
                    const lineItems = app.pay_application_line_items || app.lineItems || [];
                    // "This Period" = sum of this_period from line items (what was billed THIS app only)
                    const appThisPeriod = lineItems.reduce((s, li) => s + parseFloat(li.this_period ?? li.thisPeriod ?? 0), 0);
                    const appRetainage = parseFloat(app.total_retainage ?? 0) || lineItems.reduce((s, li) => s + parseFloat(li.retainage ?? 0), 0);
                    const appNetDue = parseFloat(app.current_payment_due ?? app.amount ?? 0);
                    const totalBilledToDate = allPayApps.slice(0, appIdx + 1).reduce((s, a) => s + parseFloat(a.current_payment_due ?? a.amount ?? 0), 0);
                    // Cumulative total to date = sum of this_period across ALL apps up to this one
                    const cumulativeToDate = allPayApps.slice(0, appIdx + 1).reduce((s, a) => {
                      const aLines = a.pay_application_line_items || a.lineItems || [];
                      const thisPeriodSum = aLines.reduce((ls, li) => ls + parseFloat(li.this_period ?? li.thisPeriod ?? 0), 0);
                      return s + thisPeriodSum;
                    }, 0);
                    const appPct = contractValue > 0 ? Math.min(Math.round((cumulativeToDate / contractValue) * 100), 100) : 0;
                    const statusColor = {
                      Paid: '#059669', Approved: '#059669', Pending: '#d97706',
                      Overdue: '#dc2626', Draft: '#64748b', Submitted: '#3b82f6',
                    }[app.status] || '#64748b';
                    const period = app.periodTo || app.period_to || app.issueDate || app.issue_date || '—';
                    return (
                      <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                          #{appNo}
                        </td>
                        <td style={{ padding: '0.9rem 1rem', color: '#475569', fontSize: '0.875rem' }}>{period}</td>
                        <td style={{ padding: '0.9rem 1rem', color: '#475569', fontSize: '0.875rem', textAlign: 'right' }}>{formatCurrency(contractValue)}</td>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem', textAlign: 'right' }}>{formatCurrency(appThisPeriod)}</td>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: 600, color: '#dc2626', fontSize: '0.875rem', textAlign: 'right' }}>{appRetainage > 0 ? formatCurrency(appRetainage) : '—'}</td>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#059669', fontSize: '0.875rem', textAlign: 'right' }}>{formatCurrency(appNetDue)}</td>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem', textAlign: 'right' }}>{formatCurrency(cumulativeToDate)}</td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 56, height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                              <div style={{ width: `${appPct}%`, height: '100%', background: '#f07030', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{appPct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{ background: statusColor + '18', color: statusColor, padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {app.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                          <Link to={`/invoices/${app.id}`} style={{ fontSize: '0.8125rem', color: '#f07030', fontWeight: 600, textDecoration: 'none' }}>
                            View →
                          </Link>
                          <Link to={`/contracts/${contract.id}/invoices/${app.id}/lien-waiver/create?contractValue=${contractValue}&totalBilled=${totalBilledToDate}`} style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600, textDecoration: 'none', marginLeft: '0.875rem' }}>
                            + Waiver
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* G703 Continuation Sheet */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '2px solid #e2e8f0' }}>
              <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', marginBottom: '0.25rem' }}>G703 Continuation Sheet — Cumulative to Date</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Shows each contract line item with billed amounts across all pay applications.</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>#</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Description of Work</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Scheduled Value</th>
                    {allPayApps.map((app) => (
                      <th key={app.id} style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                        App #{app.applicationNo ?? app.application_no}
                      </th>
                    ))}
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total to Date</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Balance</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {sovLines.map((line, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.875rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>{idx + 1}</td>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{line.description}</td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: '#475569', fontSize: '0.875rem' }}>{formatCurrency(line.scheduledValue)}</td>
                      {line.appBreakdown.map((ab) => (
                        <td key={ab.appId} style={{ padding: '0.875rem 1rem', textAlign: 'right', fontSize: '0.875rem', color: ab.thisPeriod > 0 ? '#0f172a' : '#cbd5e1', fontWeight: ab.thisPeriod > 0 ? 600 : 400 }}>
                          {ab.thisPeriod > 0 ? formatCurrency(ab.thisPeriod) : '—'}
                        </td>
                      ))}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{formatCurrency(line.totalCompleted)}</td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: line.balanceToFinish > 0 ? '#d97706' : '#059669', fontWeight: 600, fontSize: '0.875rem' }}>
                        {formatCurrency(line.balanceToFinish)}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <div style={{ width: 48, height: 5, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                            <div style={{ width: `${line.percentComplete}%`, height: '100%', background: line.percentComplete === 100 ? '#059669' : '#f07030', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: line.percentComplete === 100 ? '#059669' : '#64748b', minWidth: 32, textAlign: 'right' }}>
                            {line.percentComplete}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                    <td colSpan={2} style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>TOTAL</td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{formatCurrency(contractValue)}</td>
                    {allPayApps.map((app) => {
                      const appColTotal = sovLines.reduce((s, l) => {
                        const ab = l.appBreakdown.find((a) => a.appId === app.id);
                        return s + (ab ? ab.thisPeriod : 0);
                      }, 0);
                      return (
                        <td key={app.id} style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 700, color: '#3b82f6', fontSize: '0.875rem' }}>
                          {formatCurrency(appColTotal)}
                        </td>
                      );
                    })}
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 800, color: '#f07030', fontSize: '0.9rem' }}>{formatCurrency(totalContractBilled)}</td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '0.9rem' }}>{formatCurrency(totalContractBalance)}</td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{overallPct}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'terms' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Payment Terms</h3>
            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>
              {paymentTerms || <span style={{ color: '#cbd5e1' }}>No payment terms specified.</span>}
            </p>
          </div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Internal Notes</h3>
            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>
              {contract.notes || <span style={{ color: '#cbd5e1' }}>No notes.</span>}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
