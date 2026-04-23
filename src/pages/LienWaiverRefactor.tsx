import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Download, PenTool, CheckCircle, Loader2, Settings2 } from 'lucide-react';
import { lienWaiverService, invoiceService } from '../services/supabaseService';
import { downloadPdf } from '../utils/downloadPdf';
import LienWaiverDocument from '../components/LienWaiverDocument';
import SignatureModal from '../components/SignatureModal';
import ManageWaiverModal from '../components/ManageWaiverModal';

const LienWaiverRefactor = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [waiver, setWaiver] = useState<any>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
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

  const handleSaveSignature = async (base64: string) => {
    setSignature(base64);
    setIsSaving(true);
    try {
      await lienWaiverService.updateWaiver(id, {
        signer_signature: base64,
        status: 'Signed',
        signed_at: new Date().toISOString()
      });
      setWaiver((prev: any) => ({ ...prev, status: 'Signed' }));
    } catch (err) {
      console.error('Failed to save signature:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving vendor details from Manage Waiver modal
  const handleSaveDetails = async (formData: any) => {
    setIsSaving(true);
    try {
      await lienWaiverService.updateWaiver(id, {
        signer_name: formData.signer_name,
        signer_title: formData.signer_title,
        signer_company: formData.signer_company,
        furnisher: formData.furnisher,
      });
      setWaiver((prev: any) => ({
        ...prev,
        signer_name: formData.signer_name,
        signer_title: formData.signer_title,
        signer_company: formData.signer_company,
        furnisher: formData.furnisher,
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
  const handleSignAndSave = async (formData: any) => {
    setIsSaving(true);
    try {
      await lienWaiverService.updateWaiver(id, {
        signer_name: formData.signer_name,
        signer_title: formData.signer_title,
        signer_company: formData.signer_company,
        furnisher: formData.furnisher,
        signer_signature: formData.signer_signature,
        status: 'Signed',
        signed_at: new Date().toISOString()
      });
      setWaiver((prev: any) => ({
        ...prev,
        signer_name: formData.signer_name,
        signer_title: formData.signer_title,
        signer_company: formData.signer_company,
        furnisher: formData.furnisher,
        signer_signature: formData.signer_signature,
        status: 'Signed',
        signed_at: new Date().toISOString()
      }));
      setSignature(formData.signer_signature);
      setIsManageModalOpen(false);
    } catch (err) {
      console.error('Failed to sign and save:', err);
      alert('Failed to sign document. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    downloadPdf('lien-waiver-document', `LienWaiver-${waiver?.id || 'Ref'}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Loader2 className="animate-spin text-orange-600" size={40} />
    </div>
  );

  if (!waiver) return <div>Waiver not found.</div>;

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
    mode: (waiver.waiver_type?.includes('Retainage') ? 'retainage' : 'invoice') as 'invoice' | 'retainage',
    type: (waiver.waiver_category?.toLowerCase() === 'final' ? 'final' : 'partial') as 'partial' | 'final',
    condition: (waiver.condition_type?.toLowerCase() === 'unconditional' ? 'unconditional' : 'conditional') as 'conditional' | 'unconditional',
    retainageAmount: waiver.waiver_type?.includes('Retainage') ? waiver.waiver_amount : undefined,
    date: waiver.waiver_date || new Date().toLocaleDateString(),
    signer: {
      name: waiver.signer_name || '',
      title: waiver.signer_title || 'Authorized Representative',
      signature: signature || waiver.signer_signature || undefined
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER ACTION ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lien Waiver Details</h1>
          <p className="text-sm text-gray-500 font-mono">Reference: {waiver.id}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full flex items-center gap-2 mr-2">
             <div className={`w-2 h-2 rounded-full ${waiver.status === 'Signed' ? 'bg-green-500' : 'bg-orange-500'}`} />
             <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{waiver.status}</span>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 btn-secondary"
          >
            <Download size={16} />
            Download PDF
          </button>

          <button
             onClick={() => setIsManageModalOpen(true)}
             disabled={isSaving}
             className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            <Settings2 size={16} />
            Manage & Sign Waiver
          </button>
        </div>
      </div>

      {/* DOCUMENT PREVIEW AREA */}
      <div className="bg-gray-100 rounded-xl border border-gray-200 p-8 flex justify-center shadow-inner overflow-hidden min-h-[1200px]">
        <div className="scale-[0.8] lg:scale-[0.9] xl:scale-[1] transform origin-top transition-all">
          <LienWaiverDocument {...documentProps} />
        </div>
      </div>


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

export default LienWaiverRefactor;
