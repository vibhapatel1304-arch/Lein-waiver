import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, CheckCircle, DollarSign, ChevronRight, Loader2, Shield } from 'lucide-react';
import { payAppService, subPayAppService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const statusBadge = (status) => {
  const map = {
    Submitted: 'badge-blue',
    Approved: 'badge-green',
    Paid: 'badge-green',
    Draft: 'badge-gray',
  };
  return map[status] || 'badge-gray';
};

/* Normalizer: support both snake_case (Supabase) and camelCase (mock) */
const normalize = (pa) => ({
  id: pa.id,
  applicationNo: pa.application_no ?? pa.applicationNo,
  projectName: pa.project_name ?? pa.projectName ?? '',
  subcontractor: pa.subcontractor ?? pa.contractor_name ?? '',
  periodTo: pa.period_to ?? pa.periodTo,
  contractSumToDate: pa.contract_sum_to_date ?? pa.contractSumToDate ?? 0,
  totalCompletedAndStored: pa.total_completed_and_stored ?? pa.totalCompletedAndStored ?? 0,
  totalRetainage: pa.total_retainage ?? pa.totalRetainage ?? 0,
  currentPaymentDue: pa.current_payment_due ?? pa.currentPaymentDue ?? 0,
  status: pa.status ?? 'Draft',
  isSubcontractorVersion: pa.is_subcontractor_version ?? pa.isSubcontractorVersion ?? false,
});

export default function PayApplications() {
  const [activeTab, setActiveTab] = useState('contractor');
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch all pay applications from Supabase
  const { data: payApps, loading: loadingPayApps, refetch } = useSupabase(payAppService.list);
  const { data: subPayApps, loading: loadingSubPayApps } = useSupabase(subPayAppService.list);
  const loading = loadingPayApps || loadingSubPayApps;
  const rawApps = [...payApps, ...subPayApps];

  // Normalize all records
  const allApps = rawApps.map(normalize);

  // Separate contractor vs sub pay apps, apply outstanding filter
  const isOutstandingApp = (a) => a.status === 'Submitted' || a.status === 'Approved' || a.status === 'Draft';
  const contractorApps = allApps.filter((a) => !a.isSubcontractorVersion && (!outstandingOnly || isOutstandingApp(a)));
  const subApps = allApps.filter((a) => a.isSubcontractorVersion && (!outstandingOnly || isOutstandingApp(a)));

  // Summary cards from live data
  const totalSubmitted = allApps.filter((a) => a.status === 'Submitted').length;
  const totalApproved = allApps.filter((a) => a.status === 'Approved').length;
  const currentAmountDue = allApps.reduce((sum, a) => sum + (a.currentPaymentDue || 0), 0);

  // Action handlers
  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await payAppService.updateStatus(id, 'Approved');
      await refetch();
    } catch (err) {
      alert('Failed to approve: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async (id) => {
    setActionLoading(id);
    try {
      await payAppService.updateStatus(id, 'Paid');
      await refetch();
    } catch (err) {
      alert('Failed to mark paid: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#64748b' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '1rem', fontWeight: 500 }}>Loading pay applications...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const renderActionButtons = (pa) => {
    const isLoading = actionLoading === pa.id;
    return (
      <div style={{ display: 'flex', gap: '0.375rem' }}>
        {pa.status === 'Submitted' && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleApprove(pa.id); }}
            disabled={isLoading}
            style={{
              background: '#dcfce7', border: '1px solid #86efac', borderRadius: '4px',
              padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 600, color: '#16a34a',
              cursor: isLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center', gap: '3px', opacity: isLoading ? 0.6 : 1,
            }}
          >
            <Shield size={11} /> Approve
          </button>
        )}
        {pa.status === 'Approved' && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMarkPaid(pa.id); }}
            disabled={isLoading}
            style={{
              background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '4px',
              padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 600, color: '#7c3aed',
              cursor: isLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center', gap: '3px', opacity: isLoading ? 0.6 : 1,
            }}
          >
            <DollarSign size={11} /> Mark Paid
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Pay Applications (AIA G702/G703)</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage contractor and subcontractor pay applications
          </p>
        </div>
        <Link to="/pay-applications/create" className="btn-primary" style={{ textDecoration: 'none' }}>
          <Plus size={16} />
          Create New Pay App
        </Link>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Total Submitted */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total Submitted</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{totalSubmitted}</p>
            </div>
          </div>
        </div>

        {/* Total Approved */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} style={{ color: '#16a34a' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total Approved</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{totalApproved}</p>
            </div>
          </div>
        </div>

        {/* Current Amount Due */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} style={{ color: '#d97706' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Current Amount Due</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{formatCurrency(currentAmountDue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Outstanding Filter + Tab Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('contractor')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            background: activeTab === 'contractor' ? '#fff' : 'transparent',
            color: activeTab === 'contractor' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'contractor' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          Contractor Pay Apps
        </button>
        <button
          onClick={() => setActiveTab('subcontractor')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            background: activeTab === 'subcontractor' ? '#fff' : 'transparent',
            color: activeTab === 'subcontractor' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'subcontractor' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          Subcontractor Pay Apps
        </button>
        </div>
        <button
          onClick={() => setOutstandingOnly((v) => !v)}
          style={{
            padding: '0.5rem 0.875rem',
            borderRadius: '8px',
            border: `1px solid ${outstandingOnly ? '#dc2626' : '#e2e8f0'}`,
            fontSize: '0.8rem',
            fontWeight: 600,
            color: outstandingOnly ? '#dc2626' : '#64748b',
            background: outstandingOnly ? '#fee2e2' : '#fff',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          Outstanding Only
        </button>
      </div>

      {/* Contractor Pay Apps Table */}
      {activeTab === 'contractor' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={thStyle}>App #</th>
                  <th style={thStyle}>Project Name</th>
                  <th style={thStyle}>Period To</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Contract Sum</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Completed to Date</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>% Complete</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Retainage</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Current Payment Due</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                  <th style={{ ...thStyle, width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {contractorApps.map((pa) => {
                  const percentComplete = pa.contractSumToDate > 0
                    ? ((pa.totalCompletedAndStored / pa.contractSumToDate) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <tr key={pa.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={tdStyle}><span style={{ fontWeight: 600 }}>{pa.applicationNo}</span></td>
                      <td style={tdStyle}>
                        <Link to={`/pay-applications/${pa.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                          {pa.projectName}
                        </Link>
                      </td>
                      <td style={tdStyle}>{formatDate(pa.periodTo)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(pa.contractSumToDate)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(pa.totalCompletedAndStored)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{percentComplete}%</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(pa.totalRetainage)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatCurrency(pa.currentPaymentDue)}</td>
                      <td style={tdStyle}>
                        <span className={statusBadge(pa.status)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {pa.status === 'Paid' && <CheckCircle size={12} />}
                          {pa.status}
                        </span>
                      </td>
                      <td style={tdStyle}>{renderActionButtons(pa)}</td>
                      <td style={tdStyle}>
                        <Link to={`/pay-applications/${pa.id}`} style={{ color: '#94a3b8' }}>
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {contractorApps.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                      No contractor pay applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subcontractor Pay Apps Table */}
      {activeTab === 'subcontractor' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={thStyle}>App #</th>
                  <th style={thStyle}>Subcontractor</th>
                  <th style={thStyle}>Period To</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Contract Sum</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Completed to Date</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>% Complete</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Retainage</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Current Payment Due</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                  <th style={{ ...thStyle, width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {subApps.map((spa) => {
                  const percentComplete = spa.contractSumToDate > 0
                    ? ((spa.totalCompletedAndStored / spa.contractSumToDate) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <tr key={spa.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={tdStyle}><span style={{ fontWeight: 600 }}>{spa.applicationNo}</span></td>
                      <td style={tdStyle}>
                        <Link to={`/pay-applications/sub/${spa.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                          {spa.subcontractor || spa.projectName}
                        </Link>
                      </td>
                      <td style={tdStyle}>{formatDate(spa.periodTo)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(spa.contractSumToDate)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(spa.totalCompletedAndStored)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{percentComplete}%</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(spa.totalRetainage)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatCurrency(spa.currentPaymentDue)}</td>
                      <td style={tdStyle}>
                        <span className={statusBadge(spa.status)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {spa.status === 'Paid' && <CheckCircle size={12} />}
                          {spa.status}
                        </span>
                      </td>
                      <td style={tdStyle}>{renderActionButtons(spa)}</td>
                      <td style={tdStyle}>
                        <Link to={`/pay-applications/sub/${spa.id}`} style={{ color: '#94a3b8' }}>
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {subApps.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                      No subcontractor pay applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const thStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: '#334155',
  whiteSpace: 'nowrap',
};
