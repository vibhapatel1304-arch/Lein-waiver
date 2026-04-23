import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Download, HardHat } from 'lucide-react';
import { estimateService, clientService } from '../services/supabaseService';
import { useSupabaseById, useSupabase } from '../hooks/useSupabase';
import { downloadPdf } from '../utils/downloadPdf';

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
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

export default function EstimateDetail() {
  const { id } = useParams();
  const { data: estimate, loading: loadingEstimate } = useSupabaseById(estimateService.getById, id);
  const { data: allClients, loading: loadingClients } = useSupabase(clientService.list);

  if (loadingEstimate || loadingClients) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading estimate...</div>;
  }

  if (!estimate) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <Link to="/estimates" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Estimates
        </Link>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: '1.125rem' }}>Estimate not found.</p>
        </div>
      </div>
    );
  }

  const client = (allClients || []).find((c) => c.id === estimate.client_id);

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link to="/estimates" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back to Estimates
        </Link>
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
          <button className="btn-primary" onClick={() => downloadPdf('estimate-pdf-content', `Estimate-${estimate.id}`)}>
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>

      {/* Printable Estimate */}
      <div id="estimate-pdf-content" className="card" style={{ padding: '2.5rem', maxWidth: '850px', margin: '0 auto' }}>
        {/* Company Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '2px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HardHat size={32} style={{ color: '#f59e0b' }} />
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Boulder Construction</h1>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>NJ Licensed General Contractor</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge ${statusBadge(estimate.status)}`} style={{ fontSize: '0.875rem', padding: '0.25rem 0.875rem' }}>
              {estimate.status}
            </span>
          </div>
        </div>

        {/* Estimate Meta + Client */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Estimate Details</p>
            <table style={{ fontSize: '0.875rem', color: '#475569' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600, paddingRight: '1rem', paddingBottom: '0.25rem', color: '#1e293b' }}>Estimate #:</td>
                  <td style={{ paddingBottom: '0.25rem' }}>{estimate.id}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, paddingRight: '1rem', paddingBottom: '0.25rem', color: '#1e293b' }}>Date:</td>
                  <td style={{ paddingBottom: '0.25rem' }}>{new Date(estimate.estimate_date || estimate.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, paddingRight: '1rem', paddingBottom: '0.25rem', color: '#1e293b' }}>Valid Until:</td>
                  <td style={{ paddingBottom: '0.25rem' }}>{new Date(estimate.valid_until || estimate.validUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, paddingRight: '1rem', color: '#1e293b' }}>Project:</td>
                  <td>{estimate.project_name || estimate.projectName}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Client</p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', margin: '0 0 0.25rem' }}>{client ? client.name : (estimate.client_name || estimate.client)}</p>
            <p style={{ color: '#475569', fontSize: '0.875rem', margin: '0 0 0.25rem' }}>{client ? client.company : (estimate.client_name || estimate.client)}</p>
            {client && (
              <>
                <p style={{ color: '#475569', fontSize: '0.875rem', margin: '0 0 0.125rem' }}>{client.address}</p>
                <p style={{ color: '#475569', fontSize: '0.875rem', margin: '0 0 0.125rem' }}>{client.email}</p>
                <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0 }}>{client.phone}</p>
              </>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px' }}>Qty</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '140px' }}>Unit Cost</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '140px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(estimate.lineItems || []).map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', color: '#1e293b' }}>{item.description}</td>
                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', color: '#475569', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', color: '#475569', textAlign: 'right' }}>{formatCurrency(item.unit_cost || item.unitCost || 0)}</td>
                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: 600, textAlign: 'right' }}>{formatCurrency(item.total || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.875rem', color: '#475569' }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(estimate.subtotal || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.875rem', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
              <span>Tax</span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(estimate.tax || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
              <span>Grand Total</span>
              <span>{formatCurrency(estimate.total_amount || estimate.grandTotal || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
