import { Link } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import { estimateService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const statusBadge = (status) => {
  const map = {
    Accepted: 'badge-green',
    Sent: 'badge-blue',
    Draft: 'badge-gray',
    Rejected: 'badge-red',
  };
  return map[status] || 'badge-gray';
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

export default function Estimates() {
  const { data: estimates, loading } = useSupabase(estimateService.list);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading estimates...</div>;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Estimates & Proposals</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage your construction estimates and client proposals
          </p>
        </div>
        <Link to="/estimates/create" className="btn-primary" style={{ textDecoration: 'none' }}>
          <Plus size={16} />
          Create New Estimate
        </Link>
      </div>

      {/* Table Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <th className="table-header">Estimate ID</th>
              <th className="table-header">Client</th>
              <th className="table-header">Project Name</th>
              <th className="table-header">Total Amount</th>
              <th className="table-header">Status</th>
              <th className="table-header">Date</th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((est) => (
              <tr
                key={est.id}
                style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="table-cell">
                  <Link
                    to={`/estimates/${est.id}`}
                    style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <FileText size={14} />
                    {est.id}
                  </Link>
                </td>
                <td className="table-cell" style={{ fontWeight: 500, color: '#1e293b' }}>{est.client_name || est.client}</td>
                <td className="table-cell">{est.project_name || est.projectName}</td>
                <td className="table-cell" style={{ fontWeight: 600, color: '#1e293b' }}>
                  {formatCurrency(est.total_amount || est.totalAmount || 0)}
                </td>
                <td className="table-cell">
                  <span className={`badge ${statusBadge(est.status)}`}>{est.status}</span>
                </td>
                <td className="table-cell">{new Date(est.estimate_date || est.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
