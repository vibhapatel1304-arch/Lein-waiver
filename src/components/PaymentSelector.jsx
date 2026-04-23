import { useMemo } from 'react';
import { CreditCard, CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const statusConfig = {
  Pending: { icon: Clock, color: '#d97706', bg: '#fef3c7', label: 'Pending' },
  Completed: { icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4', label: 'Completed' },
  Failed: { icon: AlertCircle, color: '#dc2626', bg: '#fee2e2', label: 'Failed' },
  Refunded: { icon: DollarSign, color: '#64748b', bg: '#f1f5f9', label: 'Refunded' },
};

const methodConfig = {
  Check: { label: 'Check', icon: '💳' },
  ACH: { label: 'ACH Transfer', icon: '🏦' },
  Wire: { label: 'Wire Transfer', icon: '⚡' },
  'Credit Card': { label: 'Credit Card', icon: '💳' },
  Cash: { label: 'Cash', icon: '💵' },
};

/**
 * PaymentSelector Component
 * 
 * Step 3 of Lien Waiver workflow: Select a payment linked to the selected invoice
 * 
 * @param {Object} props
 * @param {Array} props.payments - List of payments for the selected invoice
 * @param {string} props.selectedPaymentId - Currently selected payment ID
 * @param {Function} props.onSelect - Callback when payment is selected
 * @param {boolean} props.disabled - Whether the selector is disabled
 * @param {boolean} props.loading - Whether payments are loading
 */
export default function PaymentSelector({ 
  payments = [], 
  selectedPaymentId, 
  onSelect,
  disabled = false,
  loading = false
}) {
  // Selected payment details
  const selectedPayment = useMemo(() => {
    return payments.find(p => p.id === selectedPaymentId);
  }, [payments, selectedPaymentId]);

  // Calculate waiver type based on payment status (for preview)
  const getWaiverType = (status) => {
    if (status === 'Completed') return { type: 'Unconditional Progress', color: '#16a34a' };
    return { type: 'Conditional Progress', color: '#d97706' };
  };

  if (loading) {
    return (
      <div className="payment-selector-loading">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="animate-spin" style={{ width: '24px', height: '24px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }} />
          <span className="ml-3 text-gray-500 text-sm">Loading payments...</span>
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="payment-selector-empty">
        <div 
          style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            background: '#fef3c7', 
            borderRadius: '8px',
            border: '1px solid #fde68a'
          }}
        >
          <AlertCircle size={32} style={{ color: '#d97706', margin: '0 auto' }} />
          <p className="text-amber-700 text-sm mt-2 font-medium">
            No payments found for this invoice
          </p>
          <p className="text-amber-600 text-xs mt-1">
            A payment must be recorded before generating a lien waiver
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-selector">
      <div className="selector-header">
        <h4 className="text-sm font-semibold text-gray-700">
          Select Payment 
          <span className="text-gray-400 font-normal">({payments.length} found)</span>
        </h4>
        <p className="text-xs text-gray-500 mt-1">
          Waiver type will be auto-determined based on payment status
        </p>
      </div>

      <div className="payment-list space-y-2 mt-3">
        {payments.map((payment) => {
          const status = statusConfig[payment.status] || statusConfig.Pending;
          const StatusIcon = status.icon;
          const method = methodConfig[payment.payment_method] || methodConfig.Check;
          const isSelected = payment.id === selectedPaymentId;
          const waiverInfo = getWaiverType(payment.status);

          return (
            <button
              key={payment.id}
              onClick={() => !disabled && onSelect(payment.id)}
              disabled={disabled}
              className={`payment-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '8px',
                border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                background: isSelected ? '#eff6ff' : '#fff',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                transition: 'all 0.15s ease',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Status Indicator */}
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: status.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <StatusIcon size={22} style={{ color: status.color }} />
                </div>

                {/* Payment Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span className="font-semibold text-sm text-gray-900">
                      {payment.id}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: status.bg,
                        color: status.color,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>
                      <span style={{ marginRight: '4px' }}>{method.icon}</span>
                      {method.label}
                    </span>
                    <span style={{ color: '#94a3b8' }}>•</span>
                    <span style={{ color: '#64748b' }}>
                      {formatDate(payment.payment_date)}
                    </span>
                    {payment.reference_number && (
                      <>
                        <span style={{ color: '#94a3b8' }}>•</span>
                        <span style={{ color: '#64748b', fontFamily: 'monospace' }}>
                          Ref: {payment.reference_number}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Waiver Type Preview */}
                  <div 
                    style={{ 
                      marginTop: '8px',
                      padding: '4px 10px',
                      background: isSelected ? '#dbeafe' : '#f1f5f9',
                      borderRadius: '4px',
                      display: 'inline-block',
                    }}
                  >
                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        color: waiverInfo.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Waiver Type: {waiverInfo.type}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p className="font-bold text-lg text-gray-900">
                    {formatCurrency(payment.amount_paid)}
                  </p>
                  <p className="text-xs text-gray-500">Amount Paid</p>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle size={14} color="white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Payment Summary */}
      {selectedPayment && (
        <div
          className="selected-summary"
          style={{
            marginTop: '16px',
            padding: '16px',
            background: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
          }}
        >
          <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-3">
            Payment Selected — Lien Waiver Preview
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <p className="text-xs text-gray-500">Payment Amount</p>
              <p className="font-bold text-gray-900">{formatCurrency(selectedPayment.amount_paid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Date</p>
              <p className="font-medium text-gray-900">{formatDate(selectedPayment.payment_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Waiver Type (Auto)</p>
              <p className="font-medium" style={{ color: getWaiverType(selectedPayment.status).color }}>
                {getWaiverType(selectedPayment.status).type}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="font-medium text-gray-900">{selectedPayment.status}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
