import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, Loader2, AlertCircle, PenTool, Building2, User, DollarSign, Shield } from 'lucide-react';
import { lienWaiverService } from '../services/supabaseService';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

// Status badge styles
const statusConfig = {
  Draft: { bg: '#f3f4f6', color: '#6b7280' },
  'Pending Signature': { bg: '#fef3c7', color: '#d97706' },
  Sent: { bg: '#dbeafe', color: '#2563eb' },
  Viewed: { bg: '#fef3c7', color: '#d97706' },
  Signed: { bg: '#d1fae5', color: '#16a34a' },
  Completed: { bg: '#f3e8ff', color: '#9333ea' },
};

/**
 * LienWaiverPublicView - Public page for vendors to view and sign lien waivers
 * Accessed via: /lien-waivers/view/:token
 */
export default function LienWaiverPublicView() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [waiver, setWaiver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSignatureInput, setShowSignatureInput] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch waiver by access token
  useEffect(() => {
    async function fetchWaiver() {
      try {
        // Record view first (if not already viewed)
        await lienWaiverService.recordView(token);
        
        // Fetch waiver data
        const data = await lienWaiverService.getByAccessToken(token);
        
        // Normalize the data
        setWaiver({
          id: data.id,
          status: data.status || 'Sent',
          waiver_type: data.waiver_type || 'Conditional Progress',
          project_name: data.project_name || '',
          job_name_address: data.job_name_address || '',
          owner_contractor: data.owner_contractor || '',
          furnisher: data.furnisher || data.signer_company || '',
          signer_name: data.signer_name || '',
          signer_title: data.signer_title || '',
          invoice_amount: parseFloat(data.invoice_amount || data.waiver_amount || 0),
          paid_amount: parseFloat(data.paid_amount || data.waiver_amount || 0),
          remaining_amount: parseFloat(data.remaining_amount || 0),
          waiver_amount: parseFloat(data.waiver_amount || 0),
          final_balance: parseFloat(data.final_balance || 0),
          date: data.waiver_date || data.date || '',
          created_at: data.created_at || '',
          signed_at: data.signed_at || null,
          access_token: token,
        });
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch waiver:', err);
        setError('Invalid or expired link. Please contact the sender for a new link.');
        setLoading(false);
      }
    }
    
    if (token) {
      fetchWaiver();
    }
  }, [token]);

  const handleSign = async () => {
    if (!signatureName.trim()) return;
    
    setIsSigning(true);
    try {
      // Sign using the service method
      const data = await lienWaiverService.signByToken(token, {
        signer_name: signatureName
      });
      
      // Update local state with returned data
      setWaiver(prev => ({
        ...prev,
        status: 'Signed',
        signer_name: data.signer_name || signatureName,
        signed_at: data.signed_at || new Date().toISOString()
      }));
      
      setSuccessMessage('Document signed successfully!');
      setShowSignatureInput(false);
    } catch (err) {
      console.error('Failed to sign:', err);
      setError('Failed to sign document. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f1f5f9'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '16px', color: '#64748b' }}>Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f1f5f9',
        padding: '20px'
      }}>
        <div style={{ 
          background: '#fff', 
          padding: '40px', 
          borderRadius: '12px',
          textAlign: 'center',
          maxWidth: '500px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <AlertCircle size={48} color="#dc2626" style={{ marginBottom: '16px' }} />
          <h2 style={{ margin: '0 0 8px 0', color: '#1e3a5f' }}>Access Error</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              background: '#1e40af',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (!waiver) {
    return null;
  }

  const statusStyle = statusConfig[waiver.status] || statusConfig.Draft;
  const isSigned = waiver.status === 'Signed' || waiver.status === 'Completed';

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '20px' }}>
      {/* Header */}
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#1e40af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e3a5f' }}>
              Lien Waiver Document
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Document #{waiver.id}
            </p>
          </div>
        </div>
        
        <span style={{
          fontSize: '14px',
          padding: '8px 16px',
          borderRadius: '6px',
          background: statusStyle.bg,
          color: statusStyle.color,
          fontWeight: 600,
          textTransform: 'uppercase'
        }}>
          {waiver.status}
        </span>
      </div>

      {/* Main Document Card */}
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Document Header */}
        <div style={{
          padding: '24px',
          background: '#1e3a5f',
          color: '#fff',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            AFFIDAVIT, RELEASE AND WAIVER OF LIEN
          </h2>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
            {waiver.waiver_type}
          </p>
        </div>

        {/* Document Content */}
        <div style={{ padding: '32px' }}>
          {/* Success Message */}
          {successMessage && (
            <div style={{
              padding: '16px',
              background: '#d1fae5',
              borderRadius: '8px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <CheckCircle size={24} color="#16a34a" />
              <span style={{ fontWeight: 600, color: '#166534' }}>{successMessage}</span>
            </div>
          )}

          {/* Project Details */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              padding: '12px',
              background: '#eff6ff',
              borderRadius: '6px'
            }}>
              <Building2 size={20} color="#3b82f6" />
              <span style={{ fontWeight: 600, color: '#1e3a5f' }}>Project Details</span>
            </div>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Project:</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#1e3a5f' }}>{waiver.project_name}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Location:</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#1e3a5f' }}>{waiver.job_name_address}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Owner/Contractor:</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#1e3a5f' }}>{waiver.owner_contractor}</p>
              </div>
            </div>
          </div>

          {/* Vendor Details */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              padding: '12px',
              background: '#f0fdf4',
              borderRadius: '6px'
            }}>
              <User size={20} color="#10b981" />
              <span style={{ fontWeight: 600, color: '#1e3a5f' }}>Furnisher Details</span>
            </div>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Company:</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#1e3a5f' }}>{waiver.furnisher}</p>
              </div>
              {waiver.signer_name && isSigned && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Signed By:</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#16a34a' }}>
                    {waiver.signer_name} on {formatDate(waiver.signed_at)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              padding: '12px',
              background: '#fefce8',
              borderRadius: '6px'
            }}>
              <DollarSign size={20} color="#f59e0b" />
              <span style={{ fontWeight: 600, color: '#1e3a5f' }}>Payment Details</span>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '16px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '8px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Invoice Amount</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 700, color: '#92400e' }}>
                  {formatCurrency(waiver.invoice_amount)}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Paid Amount</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 700, color: '#166534' }}>
                  {formatCurrency(waiver.paid_amount)}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Remaining</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>
                  {formatCurrency(waiver.remaining_amount)}
                </p>
              </div>
            </div>

            <div style={{ 
              marginTop: '16px',
              padding: '16px',
              background: '#eff6ff',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                Waiver Amount for this Payment
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '1.5rem', fontWeight: 700, color: '#1e40af' }}>
                {formatCurrency(waiver.waiver_amount)}
              </p>
            </div>
          </div>

          {/* Signature Section */}
          {!isSigned ? (
            <div style={{
              padding: '24px',
              background: '#fdf2f8',
              borderRadius: '8px',
              border: '2px solid #f9a8d4'
            }}>
              {showSignatureInput ? (
                <div>
                  <h3 style={{ margin: '0 0 16px 0', color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PenTool size={20} color="#ec4899" />
                    Sign Document
                  </h3>
                  <p style={{ margin: '0 0 16px 0', color: '#374151', fontSize: '0.875rem' }}>
                    By typing your full legal name below, you agree to electronically sign this lien waiver document.
                    This signature is legally binding.
                  </p>
                  <input
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Type your full legal name"
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '2px solid #ec4899',
                      fontSize: '1.25rem',
                      marginBottom: '16px',
                      fontFamily: 'cursive',
                      fontStyle: 'italic',
                      textAlign: 'center'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setShowSignatureInput(false)}
                      style={{
                        flex: 1,
                        padding: '12px',
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
                        flex: 2,
                        padding: '12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: signatureName.trim() ? '#ec4899' : '#e5e7eb',
                        color: signatureName.trim() ? '#fff' : '#9ca3af',
                        fontWeight: 600,
                        cursor: signatureName.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <PenTool size={18} />
                      {isSigning ? 'Processing...' : 'Sign Document'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 16px 0', color: '#1e3a5f' }}>
                    Ready to Sign
                  </h3>
                  <p style={{ margin: '0 0 24px 0', color: '#374151', fontSize: '0.875rem' }}>
                    Please review the document carefully. Once signed, this lien waiver is legally binding.
                  </p>
                  <button
                    onClick={() => setShowSignatureInput(true)}
                    style={{
                      padding: '16px 48px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#ec4899',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '1.125rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '12px',
                      boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)'
                    }}
                  >
                    <PenTool size={24} />
                    Sign Document Now
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              padding: '24px',
              background: '#d1fae5',
              borderRadius: '8px',
              border: '2px solid #86efac',
              textAlign: 'center'
            }}>
              <CheckCircle size={48} color="#16a34a" style={{ marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#166534' }}>
                Document Signed
              </h3>
              <p style={{ margin: 0, color: '#15803d', fontSize: '0.875rem' }}>
                This lien waiver was signed by <strong>{waiver.signer_name}</strong> on {formatDate(waiver.signed_at)}.
                <br />
                A copy has been sent to all parties.
              </p>
            </div>
          )}

          {/* Legal Footer */}
          <div style={{
            marginTop: '32px',
            padding: '16px',
            background: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Shield size={16} color="#dc2626" />
              <span style={{ fontWeight: 600, color: '#991b1b', fontSize: '0.875rem' }}>
                Legal Notice
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#7f1d1d', lineHeight: 1.6 }}>
              I SWEAR OR AFFIRM UNDER THE PENALTIES OF PERJURY THAT THE FOREGOING STATEMENTS ARE TRUE TO THE BEST OF MY KNOWLEDGE. 
              This is a system-generated document. All changes are logged for audit purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        maxWidth: '800px', 
        margin: '24px auto',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: '#94a3b8'
      }}>
        <p>System Generated Document • Document ID: {waiver.id}</p>
        <p style={{ marginTop: '4px' }}>© Construction Management System</p>
      </div>
    </div>
  );
}
