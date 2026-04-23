import { useMemo, useState } from 'react';
import { FileText, CheckCircle, Clock, DollarSign, Wallet, Layers } from 'lucide-react';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);

const statusConfig = {
  Draft: { icon: FileText, color: '#64748b', bg: '#f1f5f9', label: 'Draft' },
  Pending: { icon: Clock, color: '#d97706', bg: '#fef3c7', label: 'Pending' },
  Approved: { icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4', label: 'Approved' },
  Paid: { icon: DollarSign, color: '#2563eb', bg: '#dbeafe', label: 'Paid' },
  Overdue: { icon: Clock, color: '#dc2626', bg: '#fee2e2', label: 'Overdue' },
};

/**
 * MultiInvoiceSelector Component
 * 
 * Supports multi-selection of invoices or retainage releases.
 */
export default function InvoiceSelector({ 
  invoices = [], 
  projectId, 
  selectedInvoiceIds = [], 
  onToggle,
  disabled = false,
  mode = 'invoice', // 'invoice' | 'retainage'
  onModeChange
}) {
  // Filter invoices by project
  const filteredInvoices = useMemo(() => {
    if (!projectId) return [];
    return invoices.filter(inv => inv.project_id === projectId || inv.projectId === projectId);
  }, [invoices, projectId]);

  // Selected invoices details
  const selectedInvoices = useMemo(() => {
    return filteredInvoices.filter(inv => selectedInvoiceIds.includes(inv.id));
  }, [filteredInvoices, selectedInvoiceIds]);

  const totalAmount = useMemo(() => {
    return selectedInvoices.reduce((sum, inv) => {
      if (mode === 'retainage') {
        const retainage = parseFloat(inv.total_retainage || inv.retainage || 0);
        const outstanding = parseFloat(inv.balance_to_finish || 0);
        return sum + retainage + outstanding;
      }
      return sum + (inv.current_payment_due || inv.amount || 0);
    }, 0);
  }, [selectedInvoices, mode]);

  if (!projectId) {
    return (
      <div className="invoice-selector-empty">
        <div className="empty-state" style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
          <FileText size={32} className="text-gray-300" />
          <p className="text-gray-500 text-sm mt-2">Select a project first to view available invoices</p>
        </div>
      </div>
    );
  }

  return (
    <div className="invoice-selector">
      {/* Mode Toggle */}
      <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => onModeChange?.('invoice')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            background: mode === 'invoice' ? '#fff' : 'transparent',
            boxShadow: mode === 'invoice' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            color: mode === 'invoice' ? '#0f172a' : '#64748b',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Layers size={16} />
          Invoice Mode
        </button>
        <button
          onClick={() => onModeChange?.('retainage')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            background: mode === 'retainage' ? '#fff' : 'transparent',
            boxShadow: mode === 'retainage' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            color: mode === 'retainage' ? '#0f172a' : '#64748b',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Wallet size={16} />
          Retainage Mode
        </button>
      </div>

      <div className="selector-header" style={{ marginBottom: '12px' }}>
        <h4 className="text-sm font-semibold text-gray-700">
          {mode === 'invoice' ? 'Select Invoices' : 'Select Retainage Releases'}
          <span className="text-gray-400 font-normal ml-2">({filteredInvoices.length} available)</span>
        </h4>
      </div>

      <div className="invoice-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredInvoices.map((invoice) => {
          const status = statusConfig[invoice.status] || statusConfig.Draft;
          const isSelected = selectedInvoiceIds.includes(invoice.id);
          
          let displayAmount = 0;
          if (mode === 'retainage') {
            const retainage = parseFloat(invoice.total_retainage || invoice.retainage || 0);
            const outstanding = parseFloat(invoice.balance_to_finish || 0);
            displayAmount = retainage + outstanding;
          } else {
            displayAmount = invoice.current_payment_due || invoice.amount || 0;
          }

          return (
            <div
              key={invoice.id}
              onClick={() => !disabled && onToggle(invoice.id)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: `2px solid ${isSelected ? '#f97316' : '#e2e8f0'}`,
                background: isSelected ? '#fff7ed' : '#fff',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {/* Checkbox Icon */}
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  border: `2px solid ${isSelected ? '#f97316' : '#cbd5e1'}`,
                  background: isSelected ? '#f97316' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.1s'
                }}
              >
                {isSelected && <CheckCircle size={14} color="white" />}
              </div>

              {/* Invoice Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span className="font-semibold text-sm text-gray-900 truncate">
                    {invoice.id}
                  </span>
                  {mode === 'invoice' && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: status.bg,
                        color: status.color,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {status.label}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b' }}>
                  <span>App #{invoice.application_no || invoice.applicationNo || '—'}</span>
                  <span>•</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(displayAmount)}</span>
                  {mode === 'retainage' && (
                    <span className="text-[10px] text-gray-400">
                      (Bal + Ret)
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>{mode === 'invoice' ? 'Due' : 'Release'}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f97316' }}>{formatCurrency(displayAmount)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Summary */}
      {selectedInvoices.length > 0 && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #f97316',
            boxShadow: '0 4px 12px rgba(249, 115, 22, 0.08)'
          }}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Items Selected ({selectedInvoices.length})</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {selectedInvoices.map(inv => (
                  <span key={inv.id} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold">
                    {inv.id}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px dashed #fed7aa', paddingTop: '12px', marginTop: '4px' }} className="flex justify-between items-center">
             <span className="text-sm font-semibold text-gray-600">Total Waiver Amount:</span>
             <span className="text-xl font-black text-orange-600">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
