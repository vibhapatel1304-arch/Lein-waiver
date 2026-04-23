import { useState, useEffect, useRef } from 'react';
import { X, Save, PenTool, User, Briefcase, Building2, CheckCircle, RotateCcw } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * ManageWaiverModal - Modal for vendors to update their details and sign the waiver
 * 
 * Features:
 * - Update vendor/signer name
 * - Update designation/title
 * - Update company name
 * - Electronic signature capture
 * - Save changes without signing
 */
export default function ManageWaiverModal({ 
  isOpen, 
  onClose, 
  waiver, 
  onSave,
  onSignAndSave,
  isLoading 
}) {
  const [formData, setFormData] = useState({
    signer_name: '',
    signer_title: '',
    signer_company: '',
    furnisher: '',
    owner_contractor: '',
    job_name_address: '',
    project_name: '',
    waiver_type: 'partial',
    condition_type: 'conditional',
    pay_application: '',
  });
  const [showSignatureInput, setShowSignatureInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'signature'
  const sigPadRef = useRef(null);
  const [hasSignature, setHasSignature] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (waiver && isOpen) {
      setFormData({
        signer_name: waiver.signer_name || '',
        signer_title: waiver.signer_title || '',
        signer_company: waiver.signer_company || waiver.furnisher || '',
        furnisher: waiver.furnisher || waiver.signer_company || '',
        owner_contractor: waiver.owner_contractor || '',
        job_name_address: waiver.job_name_address || '',
        project_name: waiver.project_name || '',
        waiver_type: waiver.waiver_category?.toLowerCase() === 'final' ? 'final' : 'partial',
        condition_type: waiver.condition_type?.toLowerCase() === 'unconditional' ? 'unconditional' : 'conditional',
        pay_application: waiver.pay_application || '',
      });
    }
  }, [waiver, isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowSignatureInput(false);
      setActiveTab('details');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Sync furnisher and signer_company
    if (field === 'signer_company') {
      setFormData(prev => ({ ...prev, furnisher: value }));
    }
    if (field === 'furnisher') {
      setFormData(prev => ({ ...prev, signer_company: value }));
    }
  };

  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      const isFinal = formData.waiver_type === 'final';
      const conditionLabel = formData.condition_type === 'unconditional' ? 'Unconditional' : 'Conditional';
      
      await onSave?.({
        ...formData,
        waiver_category: isFinal ? 'Final' : 'Partial',
        condition_type: conditionLabel,
        waiver_type: `${conditionLabel} ${isFinal ? 'Final' : 'Progress'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignAndSave = async () => {
    setIsSigning(true);
    try {
      const sigPad = sigPadRef.current;
      if (!sigPad) {
        console.error('Signature pad ref is null');
        alert('Internal error: Signature pad not found.');
        return;
      }

      // Safe check for empty
      const isEmpty = typeof sigPad.isEmpty === 'function' ? sigPad.isEmpty() : false;
      if (isEmpty) {
        alert('Please draw your signature before saving.');
        return;
      }
      let base64Signature = '';
      
      try {
        // Attempt 1: Component instance methods
        if (typeof sigPad.getTrimmedCanvas === 'function') {
          base64Signature = sigPad.getTrimmedCanvas().toDataURL('image/png');
        } else if (typeof sigPad.toDataURL === 'function') {
          base64Signature = sigPad.toDataURL('image/png');
        } 
        
        // Attempt 2: Direct canvas element
        if (!base64Signature) {
          const canvas = typeof sigPad.getCanvas === 'function' ? sigPad.getCanvas() : (sigPad.canvas || sigPad);
          if (canvas && typeof canvas.toDataURL === 'function') {
            base64Signature = canvas.toDataURL('image/png');
          }
        }

        // Attempt 3: Internal signaturePad object
        if (!base64Signature && sigPad.signaturePad) {
          base64Signature = sigPad.signaturePad.toDataURL();
        }
      } catch (innerErr) {
        console.warn('Primary signature capture failed:', innerErr);
      }

      if (!base64Signature) {
        // Ultimate fallback: Try to find any canvas child
        const canvasEl = document.querySelector('.sigCanvas canvas') || document.querySelector('canvas');
        if (canvasEl) {
          base64Signature = canvasEl.toDataURL('image/png');
        }
      }

      if (!base64Signature) {
        alert('Error: Unable to capture signature data. Debug: ' + Object.keys(sigPad).join(', '));
        return;
      }
        
      const isFinal = formData.waiver_type === 'final';
      const conditionLabel = formData.condition_type === 'unconditional' ? 'Unconditional' : 'Conditional';
        
      await onSignAndSave?.({
        ...formData,
        signer_signature: base64Signature,
        status: 'Signed',
        waiver_category: isFinal ? 'Final' : 'Partial',
        condition_type: conditionLabel,
        waiver_type: `${conditionLabel} ${isFinal ? 'Final' : 'Progress'}`
      });
      setShowSignatureInput(false);
    } catch (err) {
      console.error('Signature capture failed:', err);
      alert('Failed to sign document. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleClearSignature = () => {
    sigPadRef.current?.clear();
    setHasSignature(false);
  };

  const isSigned = waiver?.status === 'Signed' || waiver?.signed_at;

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
          maxWidth: '600px',
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
              background: '#f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Briefcase size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e3a5f' }}>
                Manage Waiver
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Update your details and sign the document
              </p>
            </div>
          </div>
          
          {isSigned && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: '#d1fae5',
              borderRadius: '6px',
              border: '1px solid #a7f3d0'
            }}>
              <CheckCircle size={16} color="#16a34a" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534' }}>Signed</span>
            </div>
          )}
          
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

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#fff'
        }}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              flex: 1,
              padding: '14px 20px',
              border: 'none',
              background: activeTab === 'details' ? '#fff' : '#f8fafc',
              borderBottom: activeTab === 'details' ? '2px solid #f97316' : '2px solid transparent',
              color: activeTab === 'details' ? '#f97316' : '#64748b',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <User size={16} />
            Your Details
          </button>
          <button
            onClick={() => setActiveTab('signature')}
            style={{
              flex: 1,
              padding: '14px 20px',
              border: 'none',
              background: activeTab === 'signature' ? '#fff' : '#f8fafc',
              borderBottom: activeTab === 'signature' ? '2px solid #f97316' : '2px solid transparent',
              color: activeTab === 'signature' ? '#f97316' : '#64748b',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <PenTool size={16} />
            Signature
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          padding: '24px'
        }}>
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Signer/Representative Name */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: '#64748b', 
                  marginBottom: '6px', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em'
                }}>
                  <User size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  Your Full Name (Signer)
                </label>
                <input
                  type="text"
                  value={formData.signer_name}
                  onChange={(e) => handleInputChange('signer_name', e.target.value)}
                  placeholder="Enter your full legal name"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.95rem',
                    transition: 'border-color 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#f97316'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
                <p style={{ margin: '6px 0 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                  This name will appear as the authorized representative on the waiver
                </p>
              </div>

              {/* Designation/Title */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: '#64748b', 
                  marginBottom: '6px', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em'
                }}>
                  <Briefcase size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  Your Designation / Title
                </label>
                <input
                  type="text"
                  value={formData.signer_title}
                  onChange={(e) => handleInputChange('signer_title', e.target.value)}
                  placeholder="e.g., President, Project Manager, Owner"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.95rem',
                    transition: 'border-color 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#f97316'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
                <p style={{ margin: '6px 0 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                  Your job title or role in the company
                </p>
              </div>

              {/* Company Name */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: '#64748b', 
                  marginBottom: '6px', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em'
                }}>
                  <Building2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  value={formData.signer_company}
                  onChange={(e) => handleInputChange('signer_company', e.target.value)}
                  placeholder="Enter company name"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.95rem',
                    transition: 'border-color 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#f97316'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
                <p style={{ margin: '6px 0 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                  The company you represent on this waiver
                </p>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

              {/* Signature Information Section */}
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                  Signature Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: '#64748b', 
                      marginBottom: '6px', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.signer_company}
                      onChange={(e) => handleInputChange('signer_company', e.target.value)}
                      placeholder="Company name"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '0.95rem',
                        transition: 'border-color 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#f97316'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: '#64748b', 
                      marginBottom: '6px', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.signer_title}
                      onChange={(e) => handleInputChange('signer_title', e.target.value)}
                      placeholder="Title / role"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '0.95rem',
                        transition: 'border-color 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#f97316'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    color: '#64748b', 
                    marginBottom: '6px', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em'
                  }}>
                    Related Pay Application <span style={{ textTransform: 'none', fontWeight: 400, color: '#94a3b8' }}>(auto-fills amounts)</span>
                  </label>
                  <select
                    value={formData.pay_application}
                    onChange={(e) => handleInputChange('pay_application', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.95rem',
                      transition: 'border-color 0.2s',
                      outline: 'none',
                      background: '#fff'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  >
                    <option value="">None</option>
                    <option value="pay_app_1">Pay Application #1</option>
                    <option value="pay_app_2">Pay Application #2</option>
                    <option value="pay_app_3">Pay Application #3</option>
                  </select>
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

              {/* Waiver Type Section */}
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Waiver Type
                </h3>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="waiver_type"
                      value="partial"
                      checked={formData.waiver_type === 'partial'}
                      onChange={(e) => handleInputChange('waiver_type', e.target.value)}
                      style={{ width: '16px', height: '16px', accentColor: '#f97316' }}
                    />
                    <span style={{ fontSize: '0.9rem', color: '#374151' }}>Partial Waiver</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="waiver_type"
                      value="final"
                      checked={formData.waiver_type === 'final'}
                      onChange={(e) => handleInputChange('waiver_type', e.target.value)}
                      style={{ width: '16px', height: '16px', accentColor: '#f97316' }}
                    />
                    <span style={{ fontSize: '0.9rem', color: '#374151' }}>Final Waiver</span>
                  </label>
                </div>
              </div>

              {/* Condition Type Section */}
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Condition Type
                </h3>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="condition_type"
                      value="unconditional"
                      checked={formData.condition_type === 'unconditional'}
                      onChange={(e) => handleInputChange('condition_type', e.target.value)}
                      style={{ width: '16px', height: '16px', accentColor: '#f97316' }}
                    />
                    <span style={{ fontSize: '0.9rem', color: '#374151' }}>Unconditional</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="condition_type"
                      value="conditional"
                      checked={formData.condition_type === 'conditional'}
                      onChange={(e) => handleInputChange('condition_type', e.target.value)}
                      style={{ width: '16px', height: '16px', accentColor: '#f97316' }}
                    />
                    <span style={{ fontSize: '0.9rem', color: '#374151' }}>Conditional</span>
                  </label>
                </div>
              </div>

              {/* Project Section */}
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Project
                </h3>
                <select
                  value={formData.project_name}
                  onChange={(e) => handleInputChange('project_name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.95rem',
                    transition: 'border-color 0.2s',
                    outline: 'none',
                    background: '#fff'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#f97316'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                >
                  <option value="">Select a project</option>
                  <option value={waiver?.project_name}>{waiver?.project_name || 'Current Project'}</option>
                </select>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

              {/* Sworn Statement Details Section */}
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                  Sworn Statement Details
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: '#64748b', 
                      marginBottom: '6px', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}>
                      Name (Signer)
                    </label>
                    <input
                      type="text"
                      value={formData.signer_name}
                      onChange={(e) => handleInputChange('signer_name', e.target.value)}
                      placeholder="Person making the affidavit"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '0.95rem',
                        transition: 'border-color 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#f97316'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: '#64748b', 
                      marginBottom: '6px', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}>
                      Furnisher
                    </label>
                    <input
                      type="text"
                      value={formData.furnisher}
                      onChange={(e) => handleInputChange('furnisher', e.target.value)}
                      placeholder="Furnisher / subcontractor name"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '0.95rem',
                        transition: 'border-color 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#f97316'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: '#64748b', 
                      marginBottom: '6px', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}>
                      Owner or Prime Contractor
                    </label>
                    <input
                      type="text"
                      value={formData.owner_contractor}
                      onChange={(e) => handleInputChange('owner_contractor', e.target.value)}
                      placeholder="Owner / prime contractor name"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '0.95rem',
                        transition: 'border-color 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#f97316'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: '#64748b', 
                      marginBottom: '6px', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}>
                      Job Name & Address
                    </label>
                    <input
                      type="text"
                      value={formData.job_name_address}
                      onChange={(e) => handleInputChange('job_name_address', e.target.value)}
                      placeholder="Job site name and address"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '0.95rem',
                        transition: 'border-color 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#f97316'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                </div>
              </div>

              {/* Preview Card */}
              <div style={{
                marginTop: '12px',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Preview on Document
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Signer Name:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f97316' }}>
                      {formData.signer_name || 'Not set'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Title:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f97316' }}>
                      {formData.signer_title || 'Not set'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Company:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f97316' }}>
                      {formData.signer_company || 'Not set'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Furnisher:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f97316' }}>
                      {formData.furnisher || 'Not set'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Waiver Type:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f97316' }}>
                      {formData.waiver_type === 'partial' ? 'Partial' : 'Final'} Waiver
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Condition:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f97316' }}>
                      {formData.condition_type === 'conditional' ? 'Conditional' : 'Unconditional'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Owner/Contractor:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f97316' }}>
                      {formData.owner_contractor || 'Not set'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Project:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f97316' }}>
                      {formData.project_name || 'Not set'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'signature' && (
            <div>
              {isSigned ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#d1fae5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                  }}>
                    <CheckCircle size={40} color="#16a34a" />
                  </div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#166534' }}>
                    Document Already Signed
                  </h3>
                  <p style={{ margin: '0', fontSize: '0.875rem', color: '#64748b' }}>
                    Signed by <strong>{waiver.signer_name}</strong> on {formatDate(waiver.signed_at)}
                  </p>
                  <button
                    onClick={() => setShowSignatureInput(true)}
                    style={{
                      marginTop: '24px',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      color: '#374151',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    Re-sign Document
                  </button>
                </div>
               ) : showSignatureInput ? (
                <div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
                      Draw your signature below
                    </p>
                    <button
                      onClick={handleClearSignature}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        color: '#64748b',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#f1f5f9'}
                      onMouseOut={(e) => e.target.style.background = 'none'}
                    >
                      <RotateCcw size={12} />
                      Clear Pad
                    </button>
                  </div>

                  <div style={{ 
                    border: '2px dashed #f97316', 
                    borderRadius: '12px', 
                    background: '#fff',
                    overflow: 'hidden',
                    marginBottom: '20px'
                  }}>
                    <SignatureCanvas
                      ref={(ref) => { if (ref) sigPadRef.current = ref; }}
                      penColor="#1e3a5f"
                      onBegin={() => setHasSignature(true)}
                      canvasProps={{
                        className: 'sigCanvas',
                        style: {
                          width: '100%',
                          height: '200px',
                          cursor: 'crosshair'
                        }
                      }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => {
                        setShowSignatureInput(false);
                        setHasSignature(false);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        color: '#374151',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSignAndSave}
                      disabled={!hasSignature || isSigning}
                      style={{
                        flex: 2,
                        padding: '12px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: hasSignature ? '#f97316' : '#e5e7eb',
                        color: hasSignature ? '#fff' : '#9ca3af',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: hasSignature ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <PenTool size={16} />
                      {isSigning ? 'Signing...' : 'Sign & Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#fff7ed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <PenTool size={28} color="#f97316" />
                  </div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700, color: '#1e3a5f' }}>
                    Ready to Sign?
                  </h3>
                  <p style={{ margin: '0 0 24px 0', fontSize: '0.875rem', color: '#64748b' }}>
                    By signing this document, you confirm that all the information provided 
                    is accurate and you authorize the release of lien rights.
                  </p>
                  <button
                    onClick={() => setShowSignatureInput(true)}
                    style={{
                      padding: '14px 32px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#f97316',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '1rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)'
                    }}
                  >
                    <PenTool size={18} />
                    Sign Document Now
                  </button>
                  <p style={{ margin: '16px 0 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                    This creates a legally binding electronic signature
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'details' && (
          <div style={{ 
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#374151',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDetails}
              disabled={isSaving}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                background: '#f97316',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Details'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
