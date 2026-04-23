import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FileSignature, DollarSign, Calendar, Building2 } from 'lucide-react';
import { contractService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const STATUS_STYLE = {
  Draft:  { background: '#f1f5f9', color: '#64748b' },
  Sent:   { background: '#fef3c7', color: '#d97706' },
  Signed: { background: '#d1fae5', color: '#059669' },
  Void:   { background: '#fee2e2', color: '#dc2626' },
};

const TYPE_STYLE = {
  'Lump Sum':  { background: '#eff6ff', color: '#3b82f6' },
  'GMP':       { background: '#f5f3ff', color: '#7c3aed' },
  'Cost Plus': { background: '#fff7ed', color: '#ea580c' },
  'Time & Materials': { background: '#ecfdf5', color: '#059669' },
};

export default function Contracts() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { data: contracts } = useSupabase(contractService.list);

  const statuses = ['All', 'Draft', 'Sent', 'Signed', 'Void'];

  const filtered = contracts.filter((c) => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.client.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.project.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalValue = filtered.reduce((sum, c) => sum + (c.contract_value ?? c.contractValue ?? 0), 0);
  const signedCount = contracts.filter((c) => c.status === 'Signed').length;
  const draftCount = contracts.filter((c) => c.status === 'Draft').length;
  const sentCount = contracts.filter((c) => c.status === 'Sent').length;

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Contracts</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage client contracts, track status, and monitor contract values.
          </p>
        </div>
        <Link to="/contracts/create">
          <button className="btn-primary">
            <Plus size={16} /> New Contract
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Contract Value', value: formatCurrency(contracts.reduce((s, c) => s + (c.contract_value ?? c.contractValue ?? 0), 0)), icon: DollarSign, color: '#3b82f6' },
          { label: 'Signed Contracts', value: signedCount, icon: FileSignature, color: '#059669' },
          { label: 'Awaiting Signature', value: sentCount, icon: Calendar, color: '#d97706' },
          { label: 'Drafts', value: draftCount, icon: Building2, color: '#64748b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#0f172a', marginTop: '0.125rem' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="input"
            placeholder="Search contracts, clients, projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '0.375rem 0.875rem',
                borderRadius: '0.375rem',
                border: '1px solid',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                borderColor: statusFilter === s ? '#f07030' : '#e2e8f0',
                background: statusFilter === s ? '#fff5ef' : '#fff',
                color: statusFilter === s ? '#f07030' : '#64748b',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              {['Contract', 'Client', 'Project', 'Type', 'Value', 'Status', 'Signed'].map((h) => (
                <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  No contracts found.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '1rem' }}>
                    <Link to={`/contracts/${c.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem', marginBottom: '0.125rem' }}>{c.title}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{c.id}</div>
                    </Link>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{c.client}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{c.company}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ color: '#475569', fontSize: '0.875rem' }}>{c.project}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ ...(TYPE_STYLE[c.contract_type || c.type] || { background: '#f1f5f9', color: '#64748b' }), padding: '0.2rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      {c.contract_type || c.type}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                    {formatCurrency((c.contract_value ?? c.contractValue ?? 0))}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ ...(STATUS_STYLE[c.status] || {}), padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#475569', fontSize: '0.875rem' }}>
                    {c.signed_date || c.signedDate || <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                <td colSpan={4} style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>
                  {filtered.length} contract{filtered.length !== 1 ? 's' : ''}
                </td>
                <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                  {formatCurrency(totalValue)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
