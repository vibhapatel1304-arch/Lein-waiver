import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  FileText, 
  FileCheck, 
  Loader2, 
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  Wallet,
  Layers
} from 'lucide-react';
import { 
  projectService, 
  invoiceService, 
  subcontractorService, 
  lienWaiverService 
} from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';
import InvoiceSelector from '../components/InvoiceSelector';
import LienWaiverPreview from '../components/LienWaiverPreview';

/**
 * LienWaiverGenerate Page (Refactored for Multi-select & Retainage)
 */
export default function LienWaiverGenerate() {
  const navigate = useNavigate();

  // Fetch data
  const { data: projects, loading: projectsLoading } = useSupabase(projectService.list);
  const { data: invoices, loading: invoicesLoading } = useSupabase(invoiceService.list);
  const { data: vendors } = useSupabase(subcontractorService.list);

  // Selection state
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState('invoice'); // 'invoice' | 'retainage'

  // Form state
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [templateTypeOverride, setTemplateTypeOverride] = useState(''); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Derived data
  const selectedProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), 
    [projects, selectedProjectId]
  );

  const selectedInvoices = useMemo(() => 
    invoices.filter(i => selectedInvoiceIds.includes(i.id)), 
    [invoices, selectedInvoiceIds]
  );

  // Determine vendor from first selected invoice
  const selectedVendor = useMemo(() => {
    if (selectedInvoices.length === 0) return null;
    const vendorId = selectedInvoices[0].subcontractor_id || selectedInvoices[0].vendor_id;
    return vendors.find(v => v.id === vendorId);
  }, [vendors, selectedInvoices]);

  // Aggregate Data for Waiver
  const aggregateData = useMemo(() => {
    if (selectedInvoices.length === 0) return null;

    let totalDue = 0;
    let totalRetainage = 0;
    let totalBalance = 0;
    let allPaid = true;

    selectedInvoices.forEach(inv => {
      const due = parseFloat(inv.current_payment_due || inv.amount || 0);
      const ret = parseFloat(inv.total_retainage || inv.retainage || 0);
      const bal = parseFloat(inv.balance_to_finish || 0);
      
      totalDue += due;
      totalRetainage += ret;
      totalBalance += bal;
      
      if (inv.status?.toLowerCase() !== 'paid') {
        allPaid = false;
      }
    });

    const isRetainageMode = selectionMode === 'retainage';
    const waiverAmount = isRetainageMode ? (totalRetainage + totalBalance) : totalDue;

    return {
      id: selectedInvoices.map(i => i.id).join(', '),
      project_id: selectedProjectId,
      project_name: selectedProject?.name || selectedProject?.project_name || '',
      owner_name: selectedInvoices[0].owner_name || '',
      owner_address: selectedInvoices[0].owner_address || '',
      contractor_name: companyName || selectedInvoices[0].contractor_name || '',
      current_payment_due: waiverAmount,
      total_retainage: isRetainageMode ? 0 : totalRetainage,
      balance_to_finish: isRetainageMode ? 0 : totalBalance,
      status: allPaid ? 'Paid' : 'Pending',
      vendor_id: selectedInvoices[0].subcontractor_id || selectedInvoices[0].vendor_id,
      // FIX: Store single ID for FK, full list for display
      actual_invoice_id: selectedInvoices[0].id, 
      display_invoice_id: selectedInvoices.map(i => i.id).join(', ')
    };
  }, [selectedInvoices, selectionMode, selectedProjectId, selectedProject, companyName]);

  // Calculate waiver type display
  const waiverTypeLabel = useMemo(() => {
    if (!aggregateData) return null;
    const isFinal = aggregateData.balance_to_finish <= 0.01 && aggregateData.total_retainage <= 0.01;
    const conditionType = aggregateData.status === 'Paid' ? 'Unconditional' : 'Conditional';
    return `${conditionType} ${isFinal ? 'Final' : 'Progress'}`;
  }, [aggregateData]);

  // Validation
  const validation = useMemo(() => {
    const errors = [];
    if (!selectedProjectId) errors.push('Select a project');
    if (selectedInvoiceIds.length === 0) errors.push('Select at least one invoice');
    if (aggregateData && aggregateData.current_payment_due <= 0) {
      errors.push('Total waiver amount must be greater than 0');
    }
    return {
      isValid: errors.length === 0,
      errors,
      canGenerate: errors.length === 0 && selectedInvoices.length > 0
    };
  }, [selectedProjectId, selectedInvoiceIds, aggregateData, selectedInvoices]);

  const currentStep = useMemo(() => {
    if (!selectedProjectId) return 1;
    if (selectedInvoiceIds.length === 0) return 2;
    return 3;
  }, [selectedProjectId, selectedInvoiceIds]);

  const handleProjectSelect = (projectId) => {
    setSelectedProjectId(projectId);
    setSelectedInvoiceIds([]);
    setError(null);
  };

  const handleToggleInvoice = (invoiceId) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId) 
        : [...prev, invoiceId]
    );
    setError(null);

    // Auto-populate company name from first selection if not set
    if (selectedInvoiceIds.length === 0) {
      const inv = invoices.find(i => i.id === invoiceId);
      if (inv) setCompanyName(inv.contractor_name || '');
    }
  };

  const handleGenerate = async () => {
    if (!validation.canGenerate) {
      setError('Please complete all required steps before generating');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const signerInfo = {
        name: signerName || selectedVendor?.contact_person || 'Authorized Representative',
        company: companyName || selectedVendor?.name || aggregateData.contractor_name || '',
        title: signerTitle || 'Authorized Representative'
      };

      const waiverData = {
        ...aggregateData,
        _templateOverride: templateTypeOverride || null
      };

      const waiver = await lienWaiverService.generateWaiverFromInvoice(
        waiverData,
        signerInfo
      );

      navigate(`/lien-waivers/${waiver.id}`);
    } catch (err) {
      console.error('Failed to generate lien waiver:', err);
      setError(err.message || 'Failed to generate lien waiver. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const StepIndicator = ({ step, label, icon: Icon, isActive, isComplete }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: isActive || isComplete ? 1 : 0.5 }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isComplete ? '#16a34a' : isActive ? '#f97316' : '#e2e8f0', color: isComplete || isActive ? '#fff' : '#64748b',
        fontWeight: 600, fontSize: '14px'
      }}>
        {isComplete ? <CheckCircle2 size={18} /> : <Icon size={18} />}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">Step {step}</p>
        <p className={`text-sm font-semibold ${isActive ? 'text-orange-600' : 'text-gray-700'}`}>{label}</p>
      </div>
      {step < 3 && <ChevronRight size={16} style={{ color: '#cbd5e1', marginLeft: '8px' }} />}
    </div>
  );

  if (projectsLoading || invoicesLoading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin text-orange-500" />
        <span className="ml-3 text-gray-500">Loading data...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/lien-waivers')} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 mb-4 bg-transparent border-none cursor-pointer">
          <ArrowLeft size={16} /> Back to Lien Waivers
        </button>
        <h1 className="page-title text-2xl font-bold">Generate Lien Waiver</h1>
        <p className="text-gray-500 text-sm mt-1">Select multiple invoices for a batch payment waiver or release retainage.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
          <AlertCircle size={18} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-10 mb-8 p-5 bg-white rounded-xl border border-gray-200">
        <StepIndicator step={1} label="Select Project" icon={Building2} isActive={currentStep === 1} isComplete={currentStep > 1} />
        <StepIndicator step={2} label="Select Items" icon={Layers} isActive={currentStep === 2} isComplete={currentStep > 2} />
        <StepIndicator step={3} label="Review & Create" icon={FileCheck} isActive={currentStep === 3} isComplete={false} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
        <div className="space-y-6">
          <div className={`card p-6 ${currentStep === 1 ? 'ring-2 ring-orange-500' : 'bg-gray-50 opacity-80'}`}>
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Building2 className="text-orange-500" /> 1. Select Project
            </h3>
            <select className="input-field w-full" value={selectedProjectId} onChange={(e) => handleProjectSelect(e.target.value)}>
              <option value="">Select a project...</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name || p.project_name}</option>)}
            </select>
          </div>

          <div className={`card p-6 ${currentStep === 2 ? 'ring-2 ring-orange-500' : (currentStep < 2 ? 'opacity-50 grayscale' : 'bg-gray-50')}`}>
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Layers className="text-orange-500" /> 2. Select Invoices / Retainage
            </h3>
            <InvoiceSelector
              invoices={invoices}
              projectId={selectedProjectId}
              selectedInvoiceIds={selectedInvoiceIds}
              onToggle={handleToggleInvoice}
              disabled={currentStep < 2}
              mode={selectionMode}
              onModeChange={setSelectionMode}
            />
          </div>

          {currentStep === 3 && (
            <div className="card p-6 ring-2 ring-orange-500 animate-in fade-in slide-in-from-bottom-4 duration-300">
               <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-3">
                <FileCheck className="text-orange-500" /> 3. Signer & Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Company Name</label>
                  <input type="text" className="input-field w-full" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Signer Name</label>
                  <input type="text" className="input-field w-full" value={signerName} onChange={e => setSignerName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Signer Title</label>
                  <input type="text" className="input-field w-full" value={signerTitle} onChange={e => setSignerTitle(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Form Override</label>
                  <select className="input-field w-full" value={templateTypeOverride} onChange={e => setTemplateTypeOverride(e.target.value)}>
                    <option value="">Auto Detect</option>
                    <option value="k1">K1 (Conditional)</option>
                    <option value="k2">K2 (Unconditional)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="sticky top-6">
            <LienWaiverPreview
              project={selectedProject}
              invoice={aggregateData}
              vendor={selectedVendor}
              waiverType={waiverTypeLabel}
              isValid={validation.isValid}
            />

            <button
              onClick={handleGenerate}
              disabled={!validation.canGenerate || isGenerating}
              className="w-full mt-6 py-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg shadow-lg shadow-orange-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
            >
              {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <FileCheck size={24} />}
              {isGenerating ? 'Generating batch...' : 'Generate Batch Waiver'}
            </button>
            
            {!validation.isValid && validation.errors.length > 0 && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                 <p className="text-xs font-bold text-orange-800 uppercase mb-2">Pending Steps:</p>
                 <ul className="text-sm text-orange-700 space-y-1">
                   {validation.errors.map((e, i) => <li key={i} className="flex items-center gap-2"><div className="w-1 h-1 bg-orange-400 rounded-full" /> {e}</li>)}
                 </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
