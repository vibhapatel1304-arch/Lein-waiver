import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, AlertCircle, DollarSign, Eye, Download, Filter, Loader2, Clock } from 'lucide-react';
import { lienWaiverService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const statusBadge = (status) => {
  const map = {
    Draft: 'badge-gray',
    'Pending Signature': 'badge-amber',
    Sent: 'badge-blue',
    Signed: 'badge-green',
  };
  return map[status] || 'badge-gray';
};

// Expiry calculation helpers
const calculateExpiryDate = (waiverDate) => {
  if (!waiverDate) return null;
  const date = new Date(waiverDate);
  date.setDate(date.getDate() + 30); // 30 days from waiver date
  return date;
};

const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { status: 'expired', days: Math.abs(diffDays), label: 'Expired', color: '#dc2626', bg: '#fee2e2' };
  if (diffDays <= 3) return { status: 'urgent', days: diffDays, label: 'Expires Soon', color: '#dc2626', bg: '#fee2e2' };
  if (diffDays <= 7) return { status: 'warning', days: diffDays, label: diffDays + ' days left', color: '#d97706', bg: '#fef3c7' };
  if (diffDays <= 14) return { status: 'notice', days: diffDays, label: diffDays + ' days left', color: '#2563eb', bg: '#dbeafe' };
  return null;
};

const statusBadgeStyle = (status) => {
  const map = {
    Draft: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
    'Pending Signature': { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
    Sent: { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' },
    Signed: { bg: '#d1fae5', color: '#16a34a', border: '#a7f3d0' },
  };
  return map[status] || map.Draft;
};

const waiverTypeBadge = (type) => {
  const map = {
    'Conditional Progress': { bg: '#fef3c7', color: '#d97706', label: 'Conditional \u00B7 Progress' },
    'Unconditional Progress': { bg: '#d1fae5', color: '#16a34a', label: 'Unconditional \u00B7 Progress' },
    'Conditional Final': { bg: '#fee2e2', color: '#dc2626', label: 'Conditional \u00B7 Final' },
    'Unconditional Final': { bg: '#dbeafe', color: '#2563eb', label: 'Unconditional \u00B7 Final' },
  };
  return map[type] || map['Conditional Progress'];
};

const formTypeBadge = (formType, templateType) => {
  // Use template_type if available (k1/k2), otherwise fall back to form_type (K1/K2/Custom)
  const type = templateType?.toLowerCase() || formType?.toLowerCase() || 'k1';
  const map = {
    'k1': { bg: '#e0e7ff', color: '#4338ca', label: 'K1', desc: 'Conditional' },
    'k2': { bg: '#fce7f3', color: '#be185d', label: 'K2', desc: 'Unconditional' },
    'custom': { bg: '#f3f4f6', color: '#6b7280', label: 'Custom', desc: 'Custom' },
    'K1': { bg: '#e0e7ff', color: '#4338ca', label: 'K1', desc: 'Conditional' },
    'K2': { bg: '#fce7f3', color: '#be185d', label: 'K2', desc: 'Unconditional' },
  };
  return map[type] || map['k1'];
};

/** Normalize a waiver row so both snake_case (Supabase) and camelCase (mock) fields are accessible */
function normalizeWaiver(w) {
  const category = w.waiver_category || w.waiverCategory || 'Partial';
  const condition = w.condition_type || w.conditionType || 'Conditional';
  const waiverType = w.waiver_type || w.waiverType || null;
  const waiverAmt = w.waiver_amount ?? w.waiverAmount ?? 0;
  const finalBal = w.final_balance ?? w.finalBalance ?? 0;
  
  // Build waiver type label from category + condition if waiver_type not explicitly set
  const typeLabel = waiverType || `${category} \u00B7 ${condition}`;
  
  // Derive form type from waiver_type since form_type/template_type columns may not exist yet
  const derivedCondition = waiverType?.includes('Unconditional') ? 'Unconditional' : 'Conditional';
  const derivedFormType = derivedCondition === 'Unconditional' ? 'K2' : 'K1';
  const derivedTemplateType = derivedCondition === 'Unconditional' ? 'k2' : 'k1';
  
  // Calculate expiry
  const waiverDate = w.waiver_date || w.date || '';
  const expiryDate = calculateExpiryDate(waiverDate);
  const expiryStatus = getExpiryStatus(expiryDate);
  
  return {
    id: w.id,
    waiverCategory: category,
    conditionType: condition,
    waiverType: waiverType || `${condition} ${category}`,
    typeLabel: typeLabel,
    // Use derived values if database columns don't exist yet
    formType: w.form_type || w.formType || derivedFormType,
    templateType: w.template_type || w.templateType || w.form_type || derivedTemplateType,
    cfrSection: w.cfr_section || w.cfrSection || '14.106',
    isActive: w.is_active ?? w.isActive ?? true,
    projectName: w.project_name || w.projectName || '',
    projectId: w.project_id || w.projectId || '',
    signerCompany: w.signer_company || w.signerCompany || '',
    signerName: w.signer_name || w.signerName || '',
    furnisher: w.furnisher || '',
    amount: category === 'Final' ? Number(finalBal) : Number(waiverAmt),
    date: waiverDate,
    status: w.status || 'Draft',
    paymentId: w.payment_id || w.paymentId || '',
    invoiceId: w.invoice_id || w.invoiceId || '',
    vendorId: w.vendor_id || w.vendorId || '',
    signedAt: w.signed_at || w.signedAt || null,
    // Expiry info
    expiryDate,
    expiryStatus,
    isExpiringSoon: expiryStatus && expiryStatus.status !== 'expired' && (w.status === 'Draft' || w.status === 'Pending Signature'),
    isExpired: expiryStatus && expiryStatus.status === 'expired',
  };
}

export default function LienWaivers() {
  const { data: rawWaivers, loading } = useSupabase(lienWaiverService.list);

  const [projectFilter, setProjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [formTypeFilter, setFormTypeFilter] = useState('K1'); // Default to K1 as per requirement
  const [activeFilter, setActiveFilter] = useState('Active'); // Default Active
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [expiringOnly, setExpiringOnly] = useState(false);

  // Normalize all waivers for consistent field access
  const waivers = rawWaivers.map(normalizeWaiver);

  // Summary calculations from live data
  const totalWaivers = waivers.length;
  const pendingSignature = waivers.filter((w) => w.status === 'Pending Signature').length;
  const expiringSoon = waivers.filter((w) => w.isExpiringSoon).length;
  const expiredCount = waivers.filter((w) => w.isExpired).length;
  const totalReleased = waivers
    .filter((w) => w.status === 'Signed')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  // Filtered list with new compliance filters
  const filtered = waivers.filter((w) => {
    if (projectFilter !== 'All' && w.projectName !== projectFilter) return false;
    if (statusFilter !== 'All' && w.status !== statusFilter) return false;
    if (categoryFilter !== 'All' && w.waiverCategory !== categoryFilter) return false;
    if (formTypeFilter !== 'All' && w.formType !== formTypeFilter) return false;
    if (activeFilter === 'Active' && !w.isActive) return false;
    if (activeFilter === 'Inactive' && w.isActive) return false;
    if (outstandingOnly && w.status === 'Signed') return false;
    if (expiringOnly && !w.isExpiringSoon && !w.isExpired) return false;
    return true;
  });

  // Unique project names for filter
  const projectNames = [...new Set(waivers.map((w) => w.projectName).filter(Boolean))];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <span className="ml-3 text-gray-500 text-lg">Loading lien waivers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Lien Waivers</h1>
          <p className="text-gray-500 text-sm mt-1">Manage affidavit, release and waiver of lien documents for all projects</p>
        </div>
        <Link to="/lien-waivers/generate" className="btn-primary" style={{ textDecoration: 'none' }}>
          <Plus size={16} className="inline mr-1.5 -mt-0.5" />
          Generate Waiver
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Waivers</p>
              <p className="text-2xl font-bold mt-1">{totalWaivers}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Signature</p>
              <p className="text-2xl font-bold mt-1">{pendingSignature}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <AlertCircle size={24} className="text-amber-600" />
            </div>
          </div>
        </div>
        <div className={`stat-card ${expiringSoon > 0 || expiredCount > 0 ? 'ring-2 ring-red-500' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Expiring / Expired</p>
              <p className={`text-2xl font-bold mt-1 ${expiringSoon > 0 || expiredCount > 0 ? 'text-red-600' : ''}`}>
                {expiringSoon + expiredCount}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${expiringSoon > 0 || expiredCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <Clock size={24} className={expiringSoon > 0 || expiredCount > 0 ? 'text-red-600' : 'text-gray-400'} />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Released</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalReleased)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign size={24} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter size={16} className="text-gray-400" />
        <button
          onClick={() => setOutstandingOnly((v) => !v)}
          style={{
            padding: '0.4rem 0.75rem',
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
        <button
          onClick={() => setExpiringOnly((v) => !v)}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            border: `1px solid ${expiringOnly ? '#dc2626' : '#e2e8f0'}`,
            fontSize: '0.8rem',
            fontWeight: 600,
            color: expiringOnly ? '#dc2626' : '#64748b',
            background: expiringOnly ? '#fee2e2' : '#fff',
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Clock size={14} />
          Expiring Soon {expiringSoon + expiredCount > 0 && `(${expiringSoon + expiredCount})`}
        </button>
        <select
          className="input-field w-auto"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="All">All Projects</option>
          {projectNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select
          className="input-field w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Pending Signature">Pending Signature</option>
          <option value="Sent">Sent</option>
          <option value="Signed">Signed</option>
        </select>
        <select
          className="input-field w-auto"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="All">All Types</option>
          <option value="Partial">Partial Waiver</option>
          <option value="Final">Final Waiver</option>
        </select>
        <select
          className="input-field w-auto"
          value={formTypeFilter}
          onChange={(e) => setFormTypeFilter(e.target.value)}
          title="Form Type (K1/K2/Custom)"
        >
          <option value="All">All Forms</option>
          <option value="K1">K1 (Default)</option>
          <option value="K2">K2</option>
          <option value="Custom">Custom</option>
        </select>
        <select
          className="input-field w-auto"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          title="Active/Inactive Status"
        >
          <option value="Active">Active Only</option>
          <option value="Inactive">Inactive Only</option>
          <option value="All">All (Active + Inactive)</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="pb-3 pl-4 font-medium" style={{ minWidth: '140px' }}>Waiver ID</th>
                <th className="pb-3 font-medium" style={{ minWidth: '140px' }}>Waiver Type</th>
                <th className="pb-3 font-medium" style={{ minWidth: '60px' }}>Form</th>
                <th className="pb-3 font-medium" style={{ minWidth: '180px' }}>Project</th>
                <th className="pb-3 font-medium" style={{ minWidth: '180px' }}>Furnisher / Company</th>
                <th className="pb-3 font-medium text-right" style={{ minWidth: '120px', paddingRight: '16px' }}>Amount</th>
                <th className="pb-3 font-medium" style={{ minWidth: '100px' }}>Date</th>
                <th className="pb-3 font-medium" style={{ minWidth: '100px' }}>Status</th>
                <th className="pb-3 pr-4 font-medium text-right" style={{ minWidth: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => {
                const typeBadge = waiverTypeBadge(w.waiverType);
                const formBadge = formTypeBadge(w.formType, w.templateType);
                const statusStyle = statusBadgeStyle(w.status);
                return (
                  <tr 
                    key={w.id} 
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${!w.isActive ? 'opacity-60 bg-gray-50' : ''}`}
                  >
                    <td className="py-3 pl-4">
                      <Link to={`/lien-waivers/${w.id}`} className="text-blue-600 font-medium hover:underline">
                        {w.id}
                      </Link>
                      {!w.isActive && (
                        <span 
                          className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600"
                          title="Inactive waiver"
                        >
                          Inactive
                        </span>
                      )}
                      {w.invoiceId && (
                        <span 
                          className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600"
                          title={`Linked to Invoice: ${w.invoiceId}`}
                        >
                          Invoice Linked
                        </span>
                      )}
                      {w.expiryStatus && w.status !== 'Signed' && (
                        <span 
                          className="ml-2 text-xs px-2 py-0.5 rounded-full"
                          style={{ 
                            background: w.expiryStatus.bg, 
                            color: w.expiryStatus.color,
                            fontWeight: 600
                          }}
                          title={`${w.expiryStatus.label} - Expires: ${w.expiryDate ? w.expiryDate.toLocaleDateString() : 'N/A'}`}
                        >
                          {w.isExpired ? '⚠️ Expired' : `⏰ ${w.expiryStatus.label}`}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <span 
                        style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: typeBadge.bg,
                          color: typeBadge.color,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          border: `1px solid ${typeBadge.bg}`,
                        }}
                      >
                        {typeBadge.label}
                      </span>
                    </td>
                    <td className="py-3">
                      <span 
                        style={{
                          fontSize: '10px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: formBadge.bg,
                          color: formBadge.color,
                          fontWeight: 600,
                          letterSpacing: '0.02em',
                          border: `1px solid ${formBadge.bg}`,
                        }}
                        title={`${formBadge.desc} • CFR: ${w.cfrSection}`}
                      >
                        {formBadge.label}
                      </span>
                    </td>
                    <td className="py-3 text-sm">{w.projectName}</td>
                    <td className="py-3 text-sm">{w.furnisher || w.signerCompany || '—'}</td>
                    <td className="py-3 text-sm text-right font-medium" style={{ paddingRight: '16px', whiteSpace: 'nowrap' }}>{formatCurrency(w.amount)}</td>
                    <td className="py-3 text-sm text-gray-500" style={{ whiteSpace: 'nowrap' }}>{w.date}</td>
                    <td className="py-3">
                      <span 
                        style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          border: `1px solid ${statusStyle.border}`,
                        }}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/lien-waivers/${w.id}`}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                          title="View"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    No waivers match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
