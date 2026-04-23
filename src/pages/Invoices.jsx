import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, DollarSign, TrendingUp, AlertCircle, FileText, CheckCircle, Clock, Loader2, Search, Lock, Square, CheckSquare } from 'lucide-react';
import { invoiceService, contractService, clientService, projectService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const statusBadge = (status) => {
  const map = {
    Draft:    'badge-gray',
    Pending:  'badge-amber',
    Approved: 'badge-blue',
    Rejected: 'badge-red',
    Paid:     'badge-green',
    Overdue:  'badge-red',
  };
  return map[status] || 'badge-gray';
};

export default function Invoices() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  
  // Mode toggle: invoice | retainage
  const [mode, setMode] = useState('invoice');
  const [selectedInvoices, setSelectedInvoices] = useState([]);

  // Reset selection on mode switch
  useEffect(() => {
    setSelectedInvoices([]);
  }, [mode]);

  // Fetch invoices, contracts, clients, and projects from Supabase
  const { data: invoices, loading, refetch } = useSupabase(invoiceService.list);
  const { data: contracts } = useSupabase(contractService.list);
  const { data: clients } = useSupabase(clientService.list);
  const { data: projects } = useSupabase(projectService.list);

  // Normalize fields — works for Supabase, mock invoices, and mock payApplications
  const getClientName = (inv) => {
    if (inv.owner_name) return inv.owner_name; // Supabase pay_applications
    if (inv.owner) return inv.owner; // mock payApplications
    if (inv.client) return inv.client; // mock invoices (company string)
    const cId = inv.client_id || inv.clientId;
    const found = clients.find((c) => c.id === cId);
    return found ? found.company : cId || '—';
  };

  const getProjectName = (inv) => {
    if (inv.project_name) return inv.project_name; // Supabase
    if (inv.projectName) return inv.projectName; // mock payApplications
    if (inv.project) return inv.project; // mock invoices
    const pId = inv.project_id || inv.projectId;
    const found = projects.find((p) => p.id === pId);
    return found ? found.name : pId || '—';
  };

  const getContractId = (inv) => inv.contract_id || inv.contractId || null;
  const getContractLabel = (inv) => {
    const cid = getContractId(inv);
    if (!cid) return null;
    const con = contracts.find((c) => c.id === cid);
    return con ? (con.title || cid) : cid;
  };

  const getAmount = (inv) => inv.current_payment_due || inv.currentPaymentDue || inv.amount || 0;
  const getDueDate = (inv) => inv.period_to || inv.periodTo || inv.due_date || inv.dueDate || '';
  const getPaidDate = (inv) => inv.paid_date || inv.paidDate || '';
  const getInvoiceNumber = (inv) => inv.id || inv.invoice_number || '';
  const getStatus = (inv) => inv.status || '';

  // ── Summary calculations from live data ──
  const totalOutstanding = invoices
    .filter((i) => getStatus(i) === 'Pending' || getStatus(i) === 'Overdue')
    .reduce((sum, i) => sum + getAmount(i), 0);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const paidThisMonth = invoices
    .filter((i) => getStatus(i) === 'Paid' && getPaidDate(i) && getPaidDate(i).startsWith(currentMonth))
    .reduce((sum, i) => sum + getAmount(i), 0);

  const overdueCount = invoices.filter((i) => getStatus(i) === 'Overdue').length;

  // Aging breakdown for outstanding invoices
  const today = new Date();
  const outstandingInvoices = invoices.filter((i) => getStatus(i) === 'Pending' || getStatus(i) === 'Overdue');
  const aging = { '0-30': 0, '31-60': 0, '61-90': 0 };
  outstandingInvoices.forEach((inv) => {
    const due = new Date(getDueDate(inv));
    const daysOverdue = Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
    if (daysOverdue <= 30) aging['0-30'] += getAmount(inv);
    else if (daysOverdue <= 60) aging['31-60'] += getAmount(inv);
    else aging['61-90'] += getAmount(inv);
  });
  const agingTotal = aging['0-30'] + aging['31-60'] + aging['61-90'];

  // Project-level outstanding: total amount still OWED (unpaid) across all invoices in project
  // This is sum of all pending/overdue invoices, NOT remaining contract value to bill
  const getProjectOutstanding = (inv) => {
    const pId = inv.project_id || inv.projectId;
    if (!pId) return null;
    
    // Get all invoices for this project that are NOT paid/draft
    const projectInvoices = invoices.filter((i) => (i.project_id || i.projectId) === pId);
    const outstandingInvoices = projectInvoices.filter((i) => {
      const status = getStatus(i);
      return status === 'Pending' || status === 'Overdue';
    });
    
    // Sum of all outstanding amounts
    return outstandingInvoices.reduce((sum, i) => sum + getAmount(i), 0);
  };

  // Per-invoice outstanding: what is still owed on this specific invoice
  const getInvoiceOutstanding = (inv) => {
    const s = getStatus(inv);
    if (s === 'Paid' || s === 'Draft') return 0;
    return getAmount(inv); // Pending or Overdue → full amount still owed
  };

  // Filtered invoices
  let filtered = statusFilter === 'All' ? invoices : invoices.filter((i) => getStatus(i) === statusFilter);
  if (outstandingOnly) {
    filtered = filtered.filter((i) => {
      const s = getStatus(i);
      return s === 'Pending' || s === 'Overdue';
    });
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((i) =>
      getInvoiceNumber(i).toLowerCase().includes(q) ||
      getClientName(i).toLowerCase().includes(q) ||
      getProjectName(i).toLowerCase().includes(q)
    );
  }
  if (clientFilter) {
    filtered = filtered.filter((i) => (i.client_id || i.clientId) === clientFilter);
  }
  if (projectFilter) {
    filtered = filtered.filter((i) => (i.project_id || i.projectId) === projectFilter);
  }
  if (contractFilter) {
    filtered = filtered.filter((i) => (i.contract_id || i.contractId) === contractFilter);
  }

  // Unique clients/projects from live invoice data for filter dropdowns
  const invoiceClientIds = [...new Set(invoices.map((i) => i.client_id || i.clientId).filter(Boolean))];
  const invoiceProjectIds = [...new Set(invoices.map((i) => i.project_id || i.projectId).filter(Boolean))];
  const invoiceContractIds = [...new Set(invoices.map((i) => i.contract_id || i.contractId).filter(Boolean))];
  const filterClients = clients.filter((c) => invoiceClientIds.includes(c.id));
  const filterProjects = projects.filter((p) => invoiceProjectIds.includes(p.id));
  const filterContracts = contracts.filter((c) => invoiceContractIds.includes(c.id));

  // ── Actions ──
  const handleMarkPaid = async (id) => {
    setActionLoading(id);
    try {
      await invoiceService.markPaid(id);
      await refetch();
    } catch (err) {
      console.error('Failed to mark as paid:', err);
      alert('Failed to mark as paid: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkOverdue = async (id) => {
    setActionLoading(id);
    try {
      await invoiceService.markOverdue(id);
      await refetch();
    } catch (err) {
      console.error('Failed to mark as overdue:', err);
      alert('Failed to mark as overdue: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Determine if a pending invoice is past due
  const isPastDue = (inv) => {
    if (getStatus(inv) !== 'Pending') return false;
    const due = new Date(getDueDate(inv));
    return today > due;
  };

  // Selection handler based on mode
  const handleSelect = (invoice) => {
    if (mode === 'invoice') {
      // Multi-select with checkbox
      setSelectedInvoices((prev) =>
        prev.find(i => i.id === invoice.id)
          ? prev.filter(i => i.id !== invoice.id)
          : [...prev, invoice]
      );
    } else {
      // Single select on row click
      setSelectedInvoices([invoice]);
    }
  };

  const isSelected = (invoice) => selectedInvoices.some(i => i.id === invoice.id);

  // Retainage calculations
  const selected = selectedInvoices[0];
  const selectedOutstanding = selected ? getInvoiceOutstanding(selected) : 0;
  const selectedProjectOwed = selected ? (getProjectOutstanding(selected) || 0) : 0;
  const selectedPayable = selectedOutstanding + selectedProjectOwed;

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Invoices &amp; Payments</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Track invoices, payments, and outstanding balances
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/invoices/create" className="btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={16} />
            Create Invoice
          </Link>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#64748b', gap: '0.5rem' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading invoices...</span>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!loading && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Total Outstanding */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={20} style={{ color: '#d97706' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total Outstanding</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{formatCurrency(totalOutstanding)}</p>
                </div>
              </div>
            </div>

            {/* Paid This Month */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={20} style={{ color: '#16a34a' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Paid This Month</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{formatCurrency(paidThisMonth)}</p>
                </div>
              </div>
            </div>

            {/* Overdue */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={20} style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Overdue</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {overdueCount} invoice{overdueCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Aging Summary */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>Aging Summary</p>
              {agingTotal > 0 && (
                <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', height: '10px', marginBottom: '0.75rem' }}>
                  {aging['0-30'] > 0 && (
                    <div style={{ width: `${(aging['0-30'] / agingTotal) * 100}%`, background: '#facc15' }} title={`0-30 days: ${formatCurrency(aging['0-30'])}`} />
                  )}
                  {aging['31-60'] > 0 && (
                    <div style={{ width: `${(aging['31-60'] / agingTotal) * 100}%`, background: '#f97316' }} title={`31-60 days: ${formatCurrency(aging['31-60'])}`} />
                  )}
                  {aging['61-90'] > 0 && (
                    <div style={{ width: `${(aging['61-90'] / agingTotal) * 100}%`, background: '#ef4444' }} title={`61-90 days: ${formatCurrency(aging['61-90'])}`} />
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#facc15', display: 'inline-block' }} />
                  0-30d
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f97316', display: 'inline-block' }} />
                  31-60d
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ef4444', display: 'inline-block' }} />
                  61-90d
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
              <Search size={14} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search invoices…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#1e293b', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            {/* Client */}
            <select
              value={clientFilter}
              onChange={(e) => { setClientFilter(e.target.value); setProjectFilter(''); }}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', color: clientFilter ? '#1e293b' : '#94a3b8', background: '#fff', cursor: 'pointer' }}
            >
              <option value="">All Clients</option>
              {filterClients.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
            {/* Project */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', color: projectFilter ? '#1e293b' : '#94a3b8', background: '#fff', cursor: 'pointer' }}
            >
              <option value="">All Projects</option>
              {filterProjects
                .filter((p) => !clientFilter || p.clientId === clientFilter)
                .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {/* Contract */}
            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', color: contractFilter ? '#1e293b' : '#94a3b8', background: '#fff', cursor: 'pointer' }}
            >
              <option value="">All Contracts</option>
              {filterContracts.map((c) => <option key={c.id} value={c.id}>{c.id} — {c.title.slice(0, 30)}{c.title.length > 30 ? '…' : ''}</option>)}
            </select>
            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#1e293b', background: '#fff', cursor: 'pointer' }}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Draft">Draft</option>
            </select>
            {/* Outstanding toggle */}
            <button
              onClick={() => setOutstandingOnly((v) => !v)}
              style={{ padding: '0.5rem 0.875rem', borderRadius: '8px', border: `1px solid ${outstandingOnly ? '#dc2626' : '#e2e8f0'}`, fontSize: '0.8rem', fontWeight: 600, color: outstandingOnly ? '#dc2626' : '#64748b', background: outstandingOnly ? '#fee2e2' : '#fff', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
            >
              Outstanding Only
            </button>
            {/* Clear filters */}
            {(search || clientFilter || projectFilter || contractFilter || statusFilter !== 'All' || outstandingOnly) && (
              <button
                onClick={() => { setSearch(''); setClientFilter(''); setProjectFilter(''); setContractFilter(''); setStatusFilter('All'); setOutstandingOnly(false); }}
                style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 500, color: '#64748b', background: '#f8fafc', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Clear
              </button>
            )}
            
            {/* Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginLeft: 'auto' }}>
              <button
                onClick={() => setMode('invoice')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px 0 0 8px',
                  border: '1px solid #e2e8f0',
                  borderRight: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: mode === 'invoice' ? '#2563eb' : '#fff',
                  color: mode === 'invoice' ? '#fff' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Invoice Mode
              </button>
              <button
                onClick={() => setMode('retainage')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0 8px 8px 0',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: mode === 'retainage' ? '#2563eb' : '#fff',
                  color: mode === 'retainage' ? '#fff' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Retainage Mode
              </button>
            </div>
          </div>

          {/* Retainage Summary Section */}
          {mode === 'retainage' && selected && (
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              background: '#f8fafc',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <FileText size={16} color="#2563eb" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                  Selected: {getInvoiceNumber(selected)} — {getClientName(selected)}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Outstanding</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(selectedOutstanding)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Project Owed (Retainage)</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>{formatCurrency(selectedProjectOwed)}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.25rem',
                  borderLeft: '2px solid #2563eb',
                  paddingLeft: '1rem'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#2563eb', textTransform: 'uppercase', fontWeight: 600 }}>Total Payable</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>{formatCurrency(selectedPayable)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {mode === 'invoice' && (
                    <th className="table-header" style={{ width: '40px' }}></th>
                  )}
                  <th className="table-header">Invoice ID</th>
                  <th className="table-header">Contract</th>
                  <th className="table-header">Client</th>
                  <th className="table-header">Project</th>
                  <th className="table-header">Amount ($)</th>
                  <th className="table-header">Invoice Outstanding</th>
                  <th className="table-header" title="Total amount owed across all unpaid invoices in this project">Project Owed</th>
                  <th className="table-header">Due Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const invId = inv.id;
                  const invNumber = getInvoiceNumber(inv);
                  const status = getStatus(inv);
                  const isActing = actionLoading === invId;
                  const selected = isSelected(inv);
                  return (
                    <tr
                      key={invId}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        cursor: mode === 'retainage' ? 'pointer' : 'default',
                        transition: 'background 0.15s',
                        background: selected && mode === 'retainage' ? '#eff6ff' : 'transparent'
                      }}
                      onClick={() => mode === 'retainage' && handleSelect(inv)}
                      onMouseEnter={(e) => !selected && (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => !selected && (e.currentTarget.style.background = 'transparent')}
                    >
                      {mode === 'invoice' && (
                        <td className="table-cell" style={{ textAlign: 'center' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSelect(inv); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                          >
                            {selected ? (
                              <CheckSquare size={18} color="#2563eb" />
                            ) : (
                              <Square size={18} color="#94a3b8" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="table-cell">
                        <Link
                          to={`/invoices/${invId}`}
                          style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <FileText size={14} />
                          {invNumber}
                        </Link>
                      </td>
                      <td className="table-cell">
                        {getContractId(inv)
                          ? <Link to={`/contracts/${getContractId(inv)}`} style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none', fontSize: '0.8rem' }}>{getContractId(inv)}</Link>
                          : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>}
                      </td>
                      <td className="table-cell" style={{ fontWeight: 500, color: '#1e293b' }}>{getClientName(inv)}</td>
                      <td className="table-cell">{getProjectName(inv)}</td>
                      <td className="table-cell" style={{ fontWeight: 600, color: '#1e293b' }}>{formatCurrency(getAmount(inv))}</td>
                      <td className="table-cell">
                        {(() => {
                          const own = getInvoiceOutstanding(inv);
                          if (own === 0 && getStatus(inv) === 'Paid') return <span style={{ fontWeight: 600, color: '#16a34a' }}>$0 — Paid</span>;
                          if (own === 0) return <span style={{ color: '#94a3b8' }}>—</span>;
                          return <span style={{ fontWeight: 700, color: '#dc2626' }}>{formatCurrency(own)}</span>;
                        })()}
                      </td>
                      <td className="table-cell">
                        {(() => {
                          const outstanding = getProjectOutstanding(inv);
                          if (outstanding === null) return <span style={{ color: '#94a3b8' }}>—</span>;
                          const color = outstanding <= 0 ? '#16a34a' : outstanding < 200000 ? '#d97706' : '#dc2626';
                          return (
                            <span style={{ fontWeight: 600, color }}>
                              {formatCurrency(outstanding)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="table-cell">
                        {getDueDate(inv) ? new Date(getDueDate(inv)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${statusBadge(status)}`}>{status}</span>
                      </td>
                      <td className="table-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <Link
                            to={`/invoices/${invId}`}
                            style={{ color: '#1d4ed8', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}
                          >
                            View
                          </Link>
                          {/* Only Approved invoices can be marked Paid — Pending is frozen */}
                          {status === 'Approved' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkPaid(invId); }}
                              disabled={isActing}
                              style={{
                                background: 'none', border: '1px solid #16a34a', color: '#16a34a',
                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                cursor: isActing ? 'not-allowed' : 'pointer', opacity: isActing ? 0.5 : 1,
                                display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap',
                              }}
                              title="Mark as Paid"
                            >
                              {isActing ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={12} />}
                              Paid
                            </button>
                          )}
                          {/* Pending = frozen, show lock icon only */}
                          {status === 'Pending' && (
                            <span style={{ fontSize: '0.7rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Lock size={10} /> Frozen
                            </span>
                          )}
                          {isPastDue(inv) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkOverdue(invId); }}
                              disabled={isActing}
                              style={{
                                background: 'none', border: '1px solid #dc2626', color: '#dc2626',
                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                cursor: isActing ? 'not-allowed' : 'pointer', opacity: isActing ? 0.5 : 1,
                                display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap',
                              }}
                              title="Mark as Overdue"
                            >
                              {isActing ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Clock size={12} />}
                              Overdue
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
