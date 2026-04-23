import { FileText, Building2, User, DollarSign, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

/**
 * LienWaiverPreview Component
 * 
 * Displays a live preview of the lien waiver before generation
 * Shows auto-filled data from selected invoice
 * 
 * @param {Object} props
 * @param {Object} props.project - Selected project
 * @param {Object} props.invoice - Selected invoice
 * @param {Object} props.vendor - Vendor/subcontractor info
 * @param {string} props.waiverType - Calculated waiver type
 * @param {boolean} props.isValid - Whether all required fields are selected
 * @param {string} props.error - Error message if validation fails
 */
export default function LienWaiverPreview({ 
  project, 
  invoice, 
  vendor,
  waiverType,
  isValid = false,
  error = null
}) {
  // Calculate waiver details based on invoice data per requirements:
  // - Partial vs Final: paid_amount < total_amount ? "partial" : "final"
  // - K1 vs K2: invoice.status === "paid" ? "k2" (unconditional) : "k1" (conditional)
  const getWaiverDetails = () => {
    if (!invoice) return null;
    
    const totalAmount = parseFloat(invoice.current_payment_due || invoice.total_contract_value || invoice.amount || 0);
    const paidAmount = parseFloat(invoice.paid_amount || invoice.previous_payments || 0);
    const remainingAmount = totalAmount - paidAmount;
    
    // Determine waiver type: partial if still owe money, final if fully paid
    const isFinal = remainingAmount <= 0.01;
    
    // Determine template type: K2 (unconditional) if paid, K1 (conditional) if pending
    const isPaid = invoice.status?.toLowerCase() === 'paid' || paidAmount >= totalAmount;
    const templateType = isPaid ? 'K2' : 'K1';
    const conditionType = isPaid ? 'Unconditional' : 'Conditional';
    
    const type = waiverType || `${conditionType} ${isFinal ? 'Final' : 'Progress'}`;
    
    return {
      category: isFinal ? 'Final' : 'Partial',
      condition: conditionType,
      type: type,
      templateType: templateType,
      amount: isFinal ? remainingAmount : remainingAmount,
      statusColor: isFinal ? '#2563eb' : '#d97706',
      statusBg: isFinal ? '#dbeafe' : '#fef3c7',
      canGenerate: isValid && totalAmount > 0,
      isPaid,
      paidAmount,
      totalAmount,
    };
  };

  const details = getWaiverDetails();

  if (!details) {
    return (
      <div 
        className="lien-waiver-preview-empty"
        style={{
          padding: '2rem',
          textAlign: 'center',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '2px dashed #e2e8f0',
        }}
      >
        <FileText size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
        <p className="text-gray-500 text-sm">
          Complete Steps 1-2 to preview your lien waiver
        </p>
        <div style={{ marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}>
          <p>1. Select Project</p>
          <p>2. Select Invoice</p>
          <p>3. Review & Generate</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="lien-waiver-preview"
      style={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div 
        style={{
          padding: '16px 20px',
          background: details.statusBg,
          borderBottom: `1px solid ${details.statusColor}20`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={22} style={{ color: details.statusColor }} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900">Lien Waiver Preview</h4>
            <p className="text-sm" style={{ color: details.statusColor, fontWeight: 600 }}>
              {details.type} • {details.templateType}
              {invoice?.display_invoice_id?.includes(',') && ' • Batch'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {/* Validation Error */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: '#fee2e2',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success State */}
        {isValid && !error && (
          <div
            style={{
              padding: '12px 16px',
              background: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
            <p className="text-sm text-green-700">
              All required data selected. Ready to generate lien waiver.
            </p>
          </div>
        )}

        {/* Data Preview Grid */}
        <div style={{ display: 'grid', gap: '16px' }}>
          
          {/* Project */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={16} style={{ color: '#3b82f6' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Project</p>
              <p className="font-medium text-gray-900">
                {project?.name || project?.project_name || '—'}
              </p>
              {project?.client_name && (
                <p className="text-sm text-gray-500">{project.client_name}</p>
              )}
            </div>
          </div>

          {/* Invoice */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={16} style={{ color: '#d97706' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Invoice</p>
              <p className="font-medium text-gray-900">{invoice?.display_invoice_id || invoice?.id || '—'}</p>
              <p className="text-sm text-gray-500">
                {invoice?.display_invoice_id?.includes(',') 
                  ? 'Multiple Invoices Selected' 
                  : `App #${invoice?.application_no || invoice?.applicationNo || '—'}`}
                {' • '}
                {formatCurrency(invoice?.current_payment_due || invoice?.amount)}
              </p>
            </div>
          </div>

          {/* Amount / Waiver Value */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: details.statusBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <DollarSign size={16} style={{ color: details.statusColor }} />
            </div>
            <div style={{ flex: 1 }}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Waiver Amount</p>
              <p className="font-medium text-gray-900">{formatCurrency(details.amount)}</p>
              <p className="text-sm text-gray-500">
                From Invoice: {invoice?.id} • App #{invoice?.application_no || invoice?.applicationNo || '—'}
              </p>
            </div>
          </div>

          {/* Vendor */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#f3e8ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <User size={16} style={{ color: '#9333ea' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Vendor / Furnisher</p>
              <p className="font-medium text-gray-900">
                {vendor?.name || invoice?.contractor_name || invoice?.contractorName || '—'}
              </p>
              {vendor?.trade && (
                <p className="text-sm text-gray-500">{vendor.trade}</p>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#e2e8f0', margin: '20px 0' }} />

        {/* Waiver Amount Summary */}
        <div
          style={{
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <p className="text-sm text-gray-600">Waiver Amount</p>
            <p className="text-xs text-gray-500 mt-1">
              Paid: {formatCurrency(details.paidAmount)} / {formatCurrency(details.totalAmount)}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(details.amount)}</p>
            <p className="text-xs text-gray-500">{details.condition} • {details.templateType}</p>
          </div>
        </div>

        {/* Auto-calculation Notice */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #dbeafe',
          }}
        >
          <p className="text-sm text-blue-800">
            <strong>Auto-filled fields:</strong> Project, Invoice, Amount, Vendor, and Waiver Type 
            are automatically populated. Template: {details.isPaid ? 'K2 (Unconditional - Paid)' : 'K1 (Conditional - Pending)'}.
          </p>
        </div>
      </div>
    </div>
  );
}
