import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Download, PenTool, CheckCircle, Loader2, Settings2 } from 'lucide-react';
import { lienWaiverService, invoiceService } from '../services/supabaseService';
import { downloadPdf } from '../utils/downloadPdf';
import LienWaiverDocument from '../components/LienWaiverDocument';
import SignatureModal from '../components/SignatureModal';
import ManageWaiverModal from '../components/ManageWaiverModal';

const LienWaiverDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [waiver, setWaiver] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [signature, setSignature] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const w = await lienWaiverService.getById(id);
        setWaiver(w);
        
        if (w.invoice_id) {
          const inv = await invoiceService.getById(w.invoice_id);
          setInvoiceData(inv);
        }
      } catch (err) {
        console.error('Failed to fetch waiver:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSaveSignature = async (base64) => {
    setSignature(base64);
    setIsSaving(true);
    try {
      await lienWaiverService.updateWaiver(id, {
        signer_signature: base64,
        status: 'Signed',
        signed_at: new Date().toISOString()
      });
      setWaiver(prev => ({ ...prev, status: 'Signed' }));
    } catch (err) {
      console.error('Failed to save signature:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving vendor details from Manage Waiver modal
  const handleSaveDetails = async (formData) => {
    setIsSaving(true);
    try {
      const updates = {
        // Original fields
        signer_name: formData.signer_name,
        signer_title: formData.signer_title,
        signer_company: formData.signer_company,
        furnisher: formData.furnisher,
        // New fields from expanded modal
        owner_contractor: formData.owner_contractor,
        job_name_address: formData.job_name_address,
        project_name: formData.project_name,
        waiver_category: formData.waiver_category || (formData.waiver_type === 'final' ? 'Final' : 'Partial'),
        condition_type: formData.condition_type,
        pay_application: formData.pay_application,
        // Update waiver_type string for display
        waiver_type: formData.condition_type && formData.waiver_category 
          ? `${formData.condition_type} ${formData.waiver_category === 'Final' ? 'Final' : 'Progress'}`
          : `${formData.condition_type || 'Conditional'} ${formData.waiver_type === 'final' ? 'Final' : 'Progress'}`,
      };
      
      await lienWaiverService.updateWaiver(id, updates);
      
      setWaiver(prev => ({
        ...prev,
        ...updates,
      }));
      setIsManageModalOpen(false);
    } catch (err) {
      console.error('Failed to save details:', err);
      alert('Failed to save details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle sign and save from Manage Waiver modal
  const handleSignAndSave = async (formData) => {
    setIsSaving(true);
    try {
      const updates = {
        // Original fields
        signer_name: formData.signer_name,
        signer_title: formData.signer_title,
        signer_company: formData.signer_company,
        furnisher: formData.furnisher,
        // New fields from expanded modal
        owner_contractor: formData.owner_contractor,
        job_name_address: formData.job_name_address,
        project_name: formData.project_name,
        waiver_category: formData.waiver_category || (formData.waiver_type === 'final' ? 'Final' : 'Partial'),
        condition_type: formData.condition_type,
        pay_application: formData.pay_application,
        // Update waiver_type string for display
        waiver_type: formData.condition_type && formData.waiver_category 
          ? `${formData.condition_type} ${formData.waiver_category === 'Final' ? 'Final' : 'Progress'}`
          : `${formData.condition_type || 'Conditional'} ${formData.waiver_type === 'final' ? 'Final' : 'Progress'}`,
        // Signing fields
        status: 'Signed',
        signed_at: new Date().toISOString()
      };
      
      await lienWaiverService.updateWaiver(id, updates);
      
      setWaiver(prev => ({
        ...prev,
        ...updates,
      }));
      setIsManageModalOpen(false);
    } catch (err) {
      console.error('Failed to sign and save:', err);
      alert('Failed to sign. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    downloadPdf('lien-waiver-document', `LienWaiver-${waiver?.id || 'Ref'}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-medium tracking-wide">Processing Document...</p>
      </div>
    </div>
  );

  if (!waiver) return (
    <div className="p-12 text-center text-slate-500">
      <p>Lien waiver not found.</p>
      <Link to="/lien-waivers" className="text-blue-600 hover:underline mt-4 inline-block">Back to Dashboard</Link>
    </div>
  );

  // Prop Mapping Logic
  const documentProps = {
    vendor: {
      name: waiver.furnisher || 'Unknown Vendor',
      address: waiver.signer_company_address || 'Address not provided',
    },
    project: {
      name: waiver.project_name || 'Project Name',
      owner: waiver.owner_contractor || 'Property Owner',
      address: waiver.job_name_address || 'Project Site Address',
    },
    invoices: [
      { id: waiver.invoice_id || 'REF-001', amount: waiver.waiver_amount || 0 }
    ],
    mode: waiver.waiver_type?.toLowerCase().includes('retainage') ? 'retainage' : 'invoice',
    type: waiver.waiver_category?.toLowerCase() === 'final' ? 'final' : 'partial',
    condition: waiver.condition_type?.toLowerCase() === 'unconditional' ? 'unconditional' : 'conditional',
    retainageAmount: waiver.waiver_type?.toLowerCase().includes('retainage') ? waiver.waiver_amount : undefined,
    date: waiver.waiver_date || new Date().toLocaleDateString(),
    signer: {
      name: waiver.signer_name || '',
      title: waiver.signer_title || 'Authorized Representative',
      signature: signature || waiver.signer_signature || undefined
    },
    pay_application_id: waiver.pay_application_number || waiver.batch_invoice_ids || waiver.pay_application_id
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar Controls */}
      <aside className="w-80 bg-white border-r border-slate-200 p-8 flex flex-col shadow-sm sticky top-0 h-screen">
        <Link 
          to="/lien-waivers" 
          className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider mb-10 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </Link>

        <div className="space-y-8 flex-1">
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight mb-2">Manage Document</h1>
            <p className="text-xs font-mono text-slate-400">REF: {waiver.id}</p>
          </div>

          <div className="space-y-3">
             <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Current Status</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${waiver.status === 'Signed' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                  <span className="font-bold text-slate-700 text-sm">{waiver.status.toUpperCase()}</span>
                </div>
             </div>
          </div>

          <div className="space-y-4 pt-4">
            <button
               onClick={() => setIsManageModalOpen(true)}
               disabled={isSaving}
               className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg active:scale-95 transition-all text-sm disabled:opacity-50"
            >
              <Settings2 size={18} />
              Manage Waiver
            </button>

            <button
               onClick={() => setIsSignatureModalOpen(true)}
               disabled={isSaving}
               className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg active:scale-95 transition-all text-sm disabled:opacity-50"
            >
              <PenTool size={18} />
              {signature || waiver.signer_signature ? 'Re-Sign Document' : 'Sign Document'}
            </button>

            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-4 px-6 rounded-xl shadow-sm active:scale-95 transition-all text-sm"
            >
              <Download size={18} />
              Export PDF
            </button>
            
            <button
               onClick={() => window.print()}
               className="w-full flex items-center text-slate-500 justify-center gap-2 text-[11px] font-bold uppercase hover:text-slate-800 transition-colors"
            >
              <Printer size={14} /> Print Preview
            </button>
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-slate-100">
          <p className="text-[10px] text-slate-300 leading-normal italic">
            Standard ISO A4 rendering protocol enabled. 794x1123px grid alignment active.
          </p>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 overflow-auto bg-slate-100 py-12 px-8 flex justify-center">
        <LienWaiverDocument {...documentProps} />
      </main>

      <SignatureModal 
        isOpen={isSignatureModalOpen} 
        onClose={() => setIsSignatureModalOpen(false)} 
        onSave={handleSaveSignature} 
      />

      <ManageWaiverModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        waiver={waiver}
        onSave={handleSaveDetails}
        onSignAndSave={handleSignAndSave}
        isLoading={isSaving}
      />
    </div>
  );
};

export default LienWaiverDetail;
