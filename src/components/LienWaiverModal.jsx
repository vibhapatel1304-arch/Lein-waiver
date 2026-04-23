import { useState, useEffect } from 'react';
import { X, Send, CheckCircle, FileText, DollarSign, Building2, User, PenTool, Shield, Eye } from 'lucide-react';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Status badge styles
const statusConfig = {
  Draft: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
  Sent: { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' },
  Viewed: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  Signed: { bg: '#d1fae5', color: '#16a34a', border: '#a7f3d0' },
  Completed: { bg: '#f3e8ff', color: '#9333ea', border: '#e9d5ff' },
};

// Waiver type options
const waiverTypes = [
  { value: 'Conditional Progress', label: 'Conditional Progress' },
  { value: 'Unconditional Progress', label: 'Unconditional Progress' },
  { value: 'Conditional Final', label: 'Conditional Final' },
  { value: 'Unconditional Final', label: 'Unconditional Final' },
  { value: 'Conditional Retainage', label: 'Conditional Retainage Release' },
  { value: 'Unconditional Retainage', label: 'Unconditional Retainage Release' },
];

/**
 * LienWaiverModal - Center modal for editing and managing lien waivers
 * 
 * Features:
 * - Large center modal (max-width 900px)
 * - Section headers with icons
 * - Status management
 * - Payment integration
 * - Signature system
 * - Send to vendor functionality
 */
export default function LienWaiverModal({ 
  isOpen, 
  onClose, 
  waiver, 
  invoiceData,
  onSave, 
  onSendToVendor,
  onSign,
  isLoading 
}) {
  const [formData, setFormData] = useState({
    status: 'Draft',
    waiver_type: 'Conditional Progress',
    invoice_amount: 0,
    paid_amount: 0,
    remaining_amount: 0,
    signer_name: '',
    signer_title: '',
    signer_company: '',
    project_name: '',
    project_id: '',
    vendor_name: '',
    vendor_id: '',
    furnisher: '',
    owner_contractor: '',
    job_name_address: '',
    waiver_amount: 0,
    final_balance: 0,
    payment_condition: '',
    date: '',
    id: '',
    invoice_id: '',
    payment_id: '',
    created_at: '',
    updated_at: '',
    signed_at: '',
    access_token: '',
  });

  const [showSignatureInput, setShowSignatureInput] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize form data when modal opens with waiver
  useEffect(() => {
    if (waiver && isOpen && !isInitialized) {
      console.log('Initializing form with waiver:', waiver);
      // Use camelCase properties from normalizeWaiver
      const invoiceAmt = parseFloat(waiver.invoiceAmount || waiver.waiverAmount || waiver.finalBalance || 0);
      const paidAmt = parseFloat(waiver.paidAmount || 0);
      
      setFormData({
        status: waiver.status || 'Draft',
        waiver_type: waiver.waiverType || 'Conditional Progress',
        invoice_amount: invoiceAmt,
        paid_amount: paidAmt,
        remaining_amount: invoiceAmt - paidAmt,
        signer_name: waiver.signerName || '',
        signer_title: waiver.signerTitle || '',
        signer_company: waiver.signerCompany || '',
        project_name: waiver.projectName || '',
        project_id: waiver.projectId || '',
        vendor_name: waiver.vendorName || waiver.furnisher || '',
        vendor_id: waiver.vendorId || '',
        furnisher: waiver.furnisher || '',
        owner_contractor: waiver.ownerContractor || '',
        job_name_address: waiver.jobNameAddress || '',
        waiver_amount: waiver.waiverAmount || 0,
        final_balance: waiver.finalBalance || 0,
        payment_condition: waiver.paymentCondition || '',
        date: waiver.date || '',
        id: waiver.id || '',
        invoice_id: waiver.invoiceId || '',
        payment_id: waiver.paymentId || '',
        created_at: waiver.createdAt || '',
        updated_at: waiver.signedAt || '',
        signed_at: waiver.signedAt || '',
        access_token: waiver.accessToken || '',
      });
      setSignatureName(waiver.signerName || '');
      setIsInitialized(true);
    }
  }, [waiver, isOpen, isInitialized]);

  // Reset initialization flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen]);

  // Auto-set retainage amount when retainage waiver type is selected
  useEffect(() => {
    if (isInitialized && formData.waiver_type?.includes('Retainage')) {
      // Get retainage amount from linked invoice data
      const retainageAmount = parseFloat(
        invoiceData?.total_retainage || 
        invoiceData?.retainage || 
        invoiceData?.totalRetainage || 
        waiver?.total_retainage || 
        waiver?.retainage || 
        0
      );
      console.log('Invoice data:', invoiceData);
      console.log('Looking for retainage, found:', retainageAmount);
      if (retainageAmount > 0) {
        console.log('Setting retainage amount:', retainageAmount);
        setFormData(prev => ({
          ...prev,
          // For retainage: invoice = retainage, paid = 0 (conditional), remaining = retainage
          invoice_amount: retainageAmount,
          paid_amount: 0,
          remaining_amount: retainageAmount,
          waiver_amount: retainageAmount,
          final_balance: 0,
        }));
      }
    }
  }, [formData.waiver_type, isInitialized, waiver, invoiceData]);

  // Calculate remaining amount when invoice or paid amount changes
  useEffect(() => {
    const invoice = parseFloat(formData.invoice_amount || 0);
    const paid = parseFloat(formData.paid_amount || 0);
    const newRemaining = Math.max(0, invoice - paid);

    // Only update if actually changed to prevent infinite loop
    if (Math.abs((formData.remaining_amount || 0) - newRemaining) > 0.01) {
      setFormData(prev => ({
        ...prev,
        remaining_amount: newRemaining
      }));
    }
  }, [formData.invoice_amount, formData.paid_amount, formData.remaining_amount]);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    console.log('handleInputChange:', field, '=', value);
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      console.log('New formData:', newState);
      return newState;
    });
  };

  const handleSave = async () => {
    try {
      await onSave?.(formData);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleSendToVendor = async () => {
    setIsSending(true);
    try {
      await onSendToVendor?.(formData);
    } finally {
      setIsSending(false);
    }
  };

  const handleSign = async () => {
    if (!signatureName.trim()) return;
    setIsSigning(true);
    try {
      await onSign?.({ 
        ...formData, 
        signer_name: signatureName,
        status: 'Signed'
      });
      setShowSignatureInput(false);
    } finally {
      setIsSigning(false);
    }
  };

  const statusStyle = statusConfig[formData.status] || statusConfig.Draft;

  // Section Header Component
  const SectionHeader = ({ icon: Icon, title, color = '#3b82f6' }) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      padding: '12px 16px',
      background: `${color}10`,
      borderLeft: `4px solid ${color}`,
      borderRadius: '4px',
      marginBottom: '16px'
    }}>
      <Icon size={20} style={{ color }} />
      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e3a5f' }}>{title}</span>
    </div>
  );

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e3a5f' }}>
                Lien Waiver #{formData.id}
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                {formData.waiver_type} • Created {formatDate(formData.created_at)}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Status Badge */}
            <span style={{
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: statusStyle.bg,
              color: statusStyle.color,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              border: `1px solid ${statusStyle.border}`
            }}>
              {formData.status}
            </span>
            
            <button 
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={24} color="#64748b" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          padding: '24px'
        }}>
          {/* Status Update Section */}
          <SectionHeader icon={Eye} title="Status & Workflow" color="#8b5cf6" />
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                Current Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  background: '#fff'
                }}
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Viewed">Viewed</option>
                <option value="Signed">Signed</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                Waiver Type
              </label>
              <select
                value={formData.waiver_type}
                onChange={(e) => {
                  console.log('Waiver type selected:', e.target.value);
                  handleInputChange('waiver_type', e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  background: '#fff'
                }}
              >
                {waiverTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                Waiver Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          {/* Project Details Section */}
          <SectionHeader icon={Building2} title="Project Details" color="#3b82f6" />
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                Project Name
              </label>
              <input
                type="text"
                value={formData.project_name}
                onChange={(e) => handleInputChange('project_name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
                placeholder="Enter project name"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                Job Name & Address
              </label>
              <input
                type="text"
                value={formData.job_name_address}
                onChange={(e) => handleInputChange('job_name_address', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
                placeholder="Enter job address"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                Owner / Prime Contractor
              </label>
              <input
                type="text"
                value={formData.owner_contractor}
                onChange={(e) => handleInputChange('owner_contractor', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
                placeholder="Enter owner/contractor name"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                Invoice Reference
              </label>
              <input
                type="text"
                value={formData.invoice_id}
                onChange={(e) => handleInputChange('invoice_id', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  background: '#f3f4f6'
                }}
                readOnly
              />
            </div>
          </div>

          {/* Vendor Details Section */}
          <SectionHeader icon={User} title="Vendor / Furnisher Details" color="#10b981" />
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                Furnisher / Company Name
              </label>
              <input
                type="text"
                value={formData.furnisher || formData.signer_company}
                onChange={(e) => {
                  handleInputChange('furnisher', e.target.value);
                  handleInputChange('signer_company', e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
                placeholder="Enter company name"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                Authorized Representative
              </label>
              <input
                type="text"
                value={formData.signer_name}
                onChange={(e) => handleInputChange('signer_name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
                placeholder="Enter representative name"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                Title
              </label>
              <input
                type="text"
                value={formData.signer_title}
                onChange={(e) => handleInputChange('signer_title', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
                placeholder="e.g., President, Project Manager"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                Payment Reference
              </label>
              <input
                type="text"
                value={formData.payment_id}
                onChange={(e) => handleInputChange('payment_id', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  background: '#f3f4f6'
                }}
                readOnly
              />
            </div>
          </div>

          {/* Payment Details Section */}
          <SectionHeader 
            icon={DollarSign} 
            title={formData.waiver_type?.includes('Retainage') ? 'Retainage Details' : 'Payment Details'} 
            color={formData.waiver_type?.includes('Retainage') ? '#0284c7' : '#f59e0b'} 
          />
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: formData.waiver_type?.includes('Retainage') ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
            gap: '16px',
            marginBottom: '24px',
            padding: '16px',
            background: formData.waiver_type?.includes('Retainage') ? '#f0f9ff' : '#fefce8',
            borderRadius: '8px',
            border: formData.waiver_type?.includes('Retainage') ? '1px solid #bae6fd' : '1px solid #fde68a'
          }}>
            {/* Retainage Amount - only for retainage waivers */}
            {formData.waiver_type?.includes('Retainage') && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#0284c7', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Retainage Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.invoice_amount || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    handleInputChange('invoice_amount', val);
                    handleInputChange('remaining_amount', val);
                    handleInputChange('waiver_amount', val);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '2px solid #0ea5e9',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#0369a1',
                    background: '#e0f2fe'
                  }}
                  placeholder="Enter retainage amount"
                />
                <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                  {invoiceData?.total_retainage ? `Auto-fetched: $${parseFloat(invoiceData.total_retainage).toFixed(2)}` : 'Enter manually or auto-fetches from invoice'}
                </p>
              </div>
            )}
            
            {/* Invoice Amount - hidden for retainage waivers */}
            {!formData.waiver_type?.includes('Retainage') && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#92400e', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Invoice Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.invoice_amount || ''}
                  onChange={(e) => handleInputChange('invoice_amount', parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #fbbf24',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#92400e'
                  }}
                  placeholder="0.00"
                />
              </div>
            )}
            
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#166534', marginBottom: '4px', textTransform: 'uppercase' }}>
                {formData.waiver_type?.includes('Retainage') ? 'Already Paid' : 'Paid Amount'}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.paid_amount || ''}
                onChange={(e) => handleInputChange('paid_amount', parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #22c55e',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#166534',
                  background: formData.waiver_type?.includes('Retainage') ? '#f0fdf4' : '#fff'
                }}
                placeholder="0.00"
                readOnly={formData.waiver_type?.includes('Retainage')}
              />
              {formData.waiver_type?.includes('Retainage') && (
                <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                  Retainage releases are typically conditional (0 until paid)
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#991b1b', marginBottom: '4px', textTransform: 'uppercase' }}>
                {formData.waiver_type?.includes('Retainage') ? 'Amount to Release' : 'Remaining Amount'}
              </label>
              <div style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#991b1b',
                background: '#f3f4f6'
              }}>
                {formatCurrency(formData.remaining_amount)}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic' }}>
                Auto-calculated
              </p>
            </div>
          </div>

          {/* Waiver Amount Details */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                Waiver Amount (Partial)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.waiver_amount || ''}
                onChange={(e) => handleInputChange('waiver_amount', parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                Final Balance (if Final)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.final_balance || ''}
                onChange={(e) => handleInputChange('final_balance', parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Signature Section */}
          <SectionHeader icon={PenTool} title="Signature Section" color="#ec4899" />
          <div style={{ 
            padding: '20px',
            background: '#fdf2f8',
            borderRadius: '8px',
            border: '1px solid #fbcfe8',
            marginBottom: '24px'
          }}>
            {formData.status === 'Signed' ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: '#d1fae5',
                  borderRadius: '8px',
                  border: '1px solid #a7f3d0'
                }}>
                  <CheckCircle size={24} color="#16a34a" />
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#166534' }}>
                      Document Signed
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#15803d' }}>
                      by {formData.signer_name} on {formatDate(formData.signed_at)}
                    </p>
                  </div>
                </div>
              </div>
            ) : showSignatureInput ? (
              <div>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.875rem', color: '#374151' }}>
                  Enter your full legal name to sign this document electronically:
                </p>
                <input
                  type="text"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Type your full legal name"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    border: '2px solid #ec4899',
                    fontSize: '1rem',
                    marginBottom: '12px',
                    fontFamily: 'cursive',
                    fontStyle: 'italic'
                  }}
                />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setShowSignatureInput(false)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      color: '#374151',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSign}
                    disabled={!signatureName.trim() || isSigning}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '6px',
                      border: 'none',
                      background: signatureName.trim() ? '#ec4899' : '#e5e7eb',
                      color: signatureName.trim() ? '#fff' : '#9ca3af',
                      fontWeight: 600,
                      cursor: signatureName.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <PenTool size={16} />
                    {isSigning ? 'Signing...' : 'Sign Document'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: '#374151' }}>
                  This document requires your signature to be legally binding.
                </p>
                <button
                  onClick={() => setShowSignatureInput(true)}
                  style={{
                    padding: '12px 32px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#ec4899',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 6px -1px rgba(236, 72, 153, 0.2)'
                  }}
                >
                  <PenTool size={20} />
                  Sign Document Now
                </button>
              </div>
            )}
          </div>

          {/* Legal Section */}
          <SectionHeader icon={Shield} title="Legal & Audit Information" color="#dc2626" />
          <div style={{ 
            padding: '16px',
            background: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            marginBottom: '24px'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '12px',
              fontSize: '0.75rem'
            }}>
              <div>
                <span style={{ color: '#64748b' }}>Document ID:</span>
                <span style={{ marginLeft: '8px', fontWeight: 600, fontFamily: 'monospace', color: '#1e3a5f' }}>
                  {formData.id || 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Created:</span>
                <span style={{ marginLeft: '8px', fontWeight: 600, color: '#374151' }}>
                  {formatDate(formData.created_at) || 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Last Updated:</span>
                <span style={{ marginLeft: '8px', fontWeight: 600, color: '#374151' }}>
                  {formatDate(formData.updated_at) || 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Signed:</span>
                <span style={{ marginLeft: '8px', fontWeight: 600, color: formData.signed_at ? '#16a34a' : '#9ca3af' }}>
                  {formatDate(formData.signed_at) || 'Not signed'}
                </span>
              </div>
            </div>
            
            {formData.access_token && (
              <div style={{ 
                marginTop: '12px',
                padding: '12px',
                background: '#fff',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
                  Vendor Portal Link:
                </p>
                <code style={{ 
                  display: 'block',
                  padding: '8px 12px',
                  background: '#f3f4f6',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  wordBreak: 'break-all',
                  color: '#1e40af'
                }}>
                  {`${window.location.origin}/lien-waivers/view/${formData.access_token}`}
                </code>
              </div>
            )}

            <p style={{ 
              margin: '12px 0 0 0', 
              fontSize: '0.65rem', 
              color: '#dc2626',
              textAlign: 'center',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              ⚠️ System Generated Document - All changes are logged for audit purposes
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ 
          padding: '20px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSave}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#1e40af',
                color: '#fff',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle size={18} />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            
            {formData.status !== 'Signed' && formData.status !== 'Completed' && (
              <button
                onClick={handleSendToVendor}
                disabled={isSending}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid #10b981',
                  background: '#fff',
                  color: '#10b981',
                  fontWeight: 600,
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Send size={18} />
                {isSending ? 'Sending...' : 'Send to Vendor'}
              </button>
            )}
          </div>
          
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#64748b',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
