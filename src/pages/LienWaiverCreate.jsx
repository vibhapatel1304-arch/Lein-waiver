import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, FileCheck, Eye } from 'lucide-react';
import { lienWaiverService, projectService, clientService, payAppService, invoiceService, contractService } from '../services/supabaseService';
import { useSupabase, useSupabaseById } from '../hooks/useSupabase';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);

export default function LienWaiverCreate() {
  const navigate = useNavigate();
  const { contractId: routeContractId, invoiceId: routeInvoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const urlContractValue = parseFloat(searchParams.get('contractValue') || '0');
  const urlTotalBilled = parseFloat(searchParams.get('totalBilled') || '0');

  // Fetch projects, clients, pay apps, and contracts from Supabase
  const { data: rawProjects } = useSupabase(projectService.list);
  const { data: rawClients } = useSupabase(clientService.list);
  const { data: rawPayApps } = useSupabase(payAppService.list);
  const { data: rawContracts } = useSupabase(contractService.list);

  // If launched from a specific invoice, fetch it
  const { data: linkedInvoice } = useSupabaseById(
    invoiceService.getById,
    routeInvoiceId || null,
  );

  // Normalize projects
  const projectsList = useMemo(() => rawProjects.map((p) => ({
    id: p.id,
    name: p.name || p.project_name || '',
    client: p.client || p.client_name || '',
    clientId: p.clientId || p.client_id || '',
    description: p.description || '',
  })), [rawProjects]);

  // Normalize pay apps
  const payAppsList = useMemo(() => rawPayApps.map((pa) => ({
    id: pa.id,
    applicationNo: pa.applicationNo ?? pa.application_no ?? '',
    projectId: pa.projectId || pa.project_id || '',
    projectName: pa.projectName || pa.project_name || '',
    ownerName: pa.owner || pa.owner_name || '',
    ownerAddress: pa.ownerAddress || pa.owner_address || '',
    contractorName: pa.contractor || pa.contractor_name || '',
    currentPaymentDue: pa.currentPaymentDue ?? pa.current_payment_due ?? 0,
    balanceToFinish: pa.balanceToFinish ?? pa.balance_to_finish ?? 0,
  })), [rawPayApps]);

  const [waiverCategory, setWaiverCategory] = useState('Partial');
  const [conditionType, setConditionType] = useState('Conditional');
  const [projectId, setProjectId] = useState('');
  const [signerName, setSignerName] = useState('');
  const [furnisher, setFurnisher] = useState('');
  const [ownerContractor, setOwnerContractor] = useState('');
  const [jobNameAddress, setJobNameAddress] = useState('');
  const [waiverAmount, setWaiverAmount] = useState('');
  const [finalBalance, setFinalBalance] = useState('');
  const [paymentCondition, setPaymentCondition] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [relatedPayApp, setRelatedPayApp] = useState('');
  const [saving, setSaving] = useState(false);

  // Auto-populate form from linked invoice when navigated from contract → invoice → waiver
  useEffect(() => {
    if (!linkedInvoice) return;

    // Compute net due — try stored field first, then compute from line items
    const lineItems = linkedInvoice.pay_application_line_items || linkedInvoice.lineItems || [];
    const computedThisPeriod = lineItems.reduce((s, li) => s + parseFloat(li.this_period ?? li.thisPeriod ?? 0), 0);
    const computedRetainage  = lineItems.reduce((s, li) => s + parseFloat(li.retainage ?? 0), 0);
    const computedNet = computedThisPeriod - computedRetainage;
    const storedDue = parseFloat(linkedInvoice.current_payment_due ?? linkedInvoice.amount ?? 0);
    const due = storedDue || computedNet || computedThisPeriod;

    setRelatedPayApp(linkedInvoice.id);

    // Determine Final vs Partial using LIVE contract data from Supabase
    // (URL params are a fallback if contract data isn't loaded yet)
    const cId = linkedInvoice.contract_id || routeContractId;
    const contract = cId ? rawContracts.find((c) => c.id === cId) : null;
    const liveContractValue = contract ? parseFloat(contract.contract_value ?? 0) : urlContractValue;

    // Sum total completed (gross, before retainage) across all invoices on this contract
    // Must use total_completed_and_stored, NOT current_payment_due (which is net after retainage)
    let liveTotalBilled = urlTotalBilled;
    if (contract && rawPayApps.length > 0) {
      liveTotalBilled = rawPayApps
        .filter((pa) => (pa.contract_id || pa.contractId) === cId)
        .reduce((s, pa) => s + parseFloat(pa.total_completed_and_stored ?? pa.totalCompletedAndStored ?? pa.current_payment_due ?? 0), 0);
    }

    const remainingAfterThis = liveContractValue > 0 ? liveContractValue - liveTotalBilled : null;
    const isFinal = remainingAfterThis !== null ? remainingAfterThis <= 0 : false;

    if (isFinal) {
      setWaiverCategory('Final');
      const prevBilled = liveTotalBilled - due;
      const finalAmt = liveContractValue > 0 ? Math.max(liveContractValue - prevBilled, due) : due;
      setFinalBalance(String(finalAmt > 0 ? finalAmt : due));
    } else {
      setWaiverCategory('Partial');
      setWaiverAmount(String(due));
    }

    const owner = linkedInvoice.owner_name || linkedInvoice.owner || linkedInvoice.client || '';
    const addr  = linkedInvoice.owner_address || linkedInvoice.ownerAddress || '';
    const projId = linkedInvoice.project_id || linkedInvoice.projectId || '';
    if (owner)  setOwnerContractor(owner);
    if (addr)   setJobNameAddress(addr);
    if (projId) setProjectId(projId);
  }, [linkedInvoice, rawContracts, rawPayApps, routeContractId, urlContractValue, urlTotalBilled]);

  // Auto-fill when project changes
  const handleProjectChange = (id) => {
    setProjectId(id);
    if (id) {
      const proj = projectsList.find((p) => p.id === id);
      if (proj) {
        setOwnerContractor(proj.client);
        const client = rawClients.find((c) => c.id === proj.clientId);
        const addr = client ? (client.address || '') : '';
        setJobNameAddress(addr);
      }
    } else {
      setOwnerContractor('');
      setJobNameAddress('');
    }
  };

  const projectPayApps = useMemo(
    () => (projectId ? payAppsList.filter((pa) => pa.projectId === projectId) : payAppsList),
    [projectId, payAppsList],
  );

  // Auto-fill amounts and category from selected pay app
  const handlePayAppChange = (payAppId) => {
    setRelatedPayApp(payAppId);
    if (!payAppId) return;
    const pa = payAppsList.find((p) => p.id === payAppId);
    if (!pa) return;
    const paymentDue = parseFloat(pa.currentPaymentDue) || 0;

    // Check contract-level: is total billed >= contract value?
    const rawPa = rawPayApps.find((p) => p.id === payAppId);
    const cId = rawPa?.contract_id || rawPa?.contractId || routeContractId;
    const contract = cId ? rawContracts.find((c) => c.id === cId) : null;
    let isFinal = false;
    if (contract) {
      const cv = parseFloat(contract.contract_value ?? 0);
      const totalBilled = rawPayApps
        .filter((p) => (p.contract_id || p.contractId) === cId)
        .reduce((s, p) => s + parseFloat(p.total_completed_and_stored ?? p.totalCompletedAndStored ?? p.current_payment_due ?? 0), 0);
      isFinal = cv > 0 && totalBilled >= cv;
    }
    // Fallback: also check balance_to_finish on the pay app itself
    if (!isFinal) {
      const balance = parseFloat(pa.balanceToFinish) || 0;
      isFinal = balance <= 0;
    }

    if (isFinal) {
      setWaiverCategory('Final');
      setFinalBalance(String(paymentDue));
    } else {
      setWaiverCategory('Partial');
      setWaiverAmount(String(paymentDue));
    }
    // Auto-fill owner/furnisher if not already set
    if (!ownerContractor && pa.ownerName) setOwnerContractor(pa.ownerName);
    if (!jobNameAddress && pa.ownerAddress) setJobNameAddress(pa.ownerAddress);
    if (!furnisher && pa.contractorName) setFurnisher(pa.contractorName);
    // Auto-set project if not already selected
    if (!projectId && pa.projectId) {
      setProjectId(pa.projectId);
    }
  };

  const selectedProjectName = projectsList.find((p) => p.id === projectId)?.name || '';

  /** Build the waiver row object for Supabase */
  const buildWaiverRow = (status) => ({
    waiver_category: waiverCategory,
    condition_type: conditionType,
    project_id: projectId || null,
    project_name: selectedProjectName,
    pay_application_id: relatedPayApp || routeInvoiceId || null,
    invoice_id: routeInvoiceId || relatedPayApp || null,
    signer_name: signerName,
    furnisher,
    owner_contractor: ownerContractor,
    job_name_address: jobNameAddress,
    waiver_amount: waiverAmount ? parseFloat(waiverAmount) : 0,
    final_balance: finalBalance ? parseFloat(finalBalance) : 0,
    payment_condition: paymentCondition,
    signer_company: companyName,
    signer_title: signerTitle,
    waiver_date: new Date().toISOString().split('T')[0],
    status,
  });

  const handleGenerate = async () => {
    setSaving(true);
    try {
      await lienWaiverService.create(buildWaiverRow('Pending Signature'));
      routeContractId ? navigate(`/contracts/${routeContractId}`) : navigate('/lien-waivers');
    } catch (err) {
      console.error('Failed to generate waiver:', err);
      alert('Failed to generate waiver. ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await lienWaiverService.create(buildWaiverRow('Draft'));
      routeContractId ? navigate(`/contracts/${routeContractId}`) : navigate('/lien-waivers');
    } catch (err) {
      console.error('Failed to save draft:', err);
      alert('Failed to save draft. ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem',
  };

  const sectionTitle = (text) => (
    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem', marginTop: '0.5rem' }}>
      {text}
    </h3>
  );

  const displayAmount = waiverCategory === 'Final'
    ? (finalBalance ? formatCurrency(parseFloat(finalBalance)) : '$0.00')
    : (waiverAmount ? formatCurrency(parseFloat(waiverAmount)) : '$0.00');

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => routeContractId ? navigate(`/contracts/${routeContractId}`) : navigate('/lien-waivers')}
          style={{
            background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '0.5rem',
          }}
        >
          <ArrowLeft size={16} /> {routeContractId ? 'Back to Contract' : 'Back to Lien Waivers'}
        </button>
        <h1 className="page-title">Generate Lien Waiver</h1>
        {/* Live waiver ID preview */}
        <div style={{ marginTop: '0.375rem', padding: '0.5rem 0.875rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#94a3b8', fontWeight: 400 }}>Waiver ID:</span>
          <code style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#0f172a', background: '#fff', padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
            LW-{relatedPayApp || routeInvoiceId || '???'}
          </code>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Form Card */}
        <div className="card" style={{ padding: '2rem' }}>
          {/* Waiver Category: Partial / Final */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Waiver Type</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="radio" name="waiverCategory" value="Partial" checked={waiverCategory === 'Partial'} onChange={(e) => setWaiverCategory(e.target.value)} />
                Partial Waiver
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="radio" name="waiverCategory" value="Final" checked={waiverCategory === 'Final'} onChange={(e) => setWaiverCategory(e.target.value)} />
                Final Waiver
              </label>
            </div>
          </div>

          {/* Condition Type: Conditional / Unconditional */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Condition Type</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="radio" name="conditionType" value="Unconditional" checked={conditionType === 'Unconditional'} onChange={(e) => setConditionType(e.target.value)} />
                Unconditional
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="radio" name="conditionType" value="Conditional" checked={conditionType === 'Conditional'} onChange={(e) => setConditionType(e.target.value)} />
                Conditional
              </label>
            </div>
          </div>

          {/* Project */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Project</label>
            <select className="input" value={projectId} onChange={(e) => handleProjectChange(e.target.value)}>
              <option value="">Select a project</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Sworn Statement Fields */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
            {sectionTitle('Sworn Statement Details')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Name (Signer)</label>
                <input className="input" type="text" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Person making the affidavit" />
              </div>
              <div>
                <label style={labelStyle}>Furnisher</label>
                <input className="input" type="text" value={furnisher} onChange={(e) => setFurnisher(e.target.value)} placeholder="Furnisher / subcontractor name" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Owner or Prime Contractor</label>
                <input className="input" type="text" value={ownerContractor} onChange={(e) => setOwnerContractor(e.target.value)} placeholder="Owner / prime contractor name" />
              </div>
              <div>
                <label style={labelStyle}>Job Name & Address</label>
                <input className="input" type="text" value={jobNameAddress} onChange={(e) => setJobNameAddress(e.target.value)} placeholder="Job site name and address" />
              </div>
            </div>
          </div>

          {/* Amount */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
            {sectionTitle('Payment Details')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {waiverCategory === 'Partial' ? (
                <div>
                  <label style={labelStyle}>Partial Waiver Amount ($)</label>
                  <input className="input" type="number" min="0" step="0.01" value={waiverAmount} onChange={(e) => setWaiverAmount(e.target.value)} placeholder="0.00" />
                </div>
              ) : (
                <div>
                  <label style={labelStyle}>Final Balance Due ($)</label>
                  <input className="input" type="number" min="0" step="0.01" value={finalBalance} onChange={(e) => setFinalBalance(e.target.value)} placeholder="0.00" />
                </div>
              )}
            </div>
            {conditionType === 'Conditional' && (
              <div>
                <label style={labelStyle}>Payment Condition (optional)</label>
                <textarea
                  className="input"
                  rows={2}
                  value={paymentCondition}
                  onChange={(e) => setPaymentCondition(e.target.value)}
                  placeholder="Describe any conditions for this payment..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            )}
          </div>

          {/* Signer / Signature Block */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
            {sectionTitle('Signature Information')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Company Name</label>
                <input className="input" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" />
              </div>
              <div>
                <label style={labelStyle}>Title</label>
                <input className="input" type="text" value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} placeholder="Title / role" />
              </div>
            </div>
          </div>

          {/* Related Pay Application */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={labelStyle}>Related Pay Application <span style={{ color: '#64748b', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(auto-fills amounts)</span></label>
            <select className="input" value={relatedPayApp} onChange={(e) => handlePayAppChange(e.target.value)}>
              <option value="">None</option>
              {projectPayApps.map((pa) => (
                <option key={pa.id} value={pa.id}>
                  {pa.id} — App #{pa.applicationNo} ({pa.projectName})
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <button className="btn-secondary" onClick={() => navigate('/lien-waivers')} disabled={saving}>Cancel</button>
            <button className="btn-secondary" onClick={handleSaveDraft} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button className="btn-primary" onClick={handleGenerate} disabled={saving}>
              <FileCheck size={16} /> {saving ? 'Generating...' : 'Generate Waiver'}
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#64748b' }}>
            <Eye size={16} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Preview</span>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1.25rem', background: '#fafbfc', fontSize: '0.78rem', lineHeight: 1.65, color: '#334155' }}>
            <h4 style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
              AFFIDAVIT, RELEASE AND WAIVER OF LIEN
            </h4>
            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748b', marginBottom: '1rem' }}>
              {waiverCategory} &middot; {conditionType}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Project</span>
                <p style={{ margin: 0 }}>{selectedProjectName || '---'}</p>
              </div>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Owner / Contractor</span>
                <p style={{ margin: 0 }}>{ownerContractor || '---'}</p>
              </div>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Furnisher</span>
                <p style={{ margin: 0 }}>{furnisher || '---'}</p>
              </div>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Job Name & Address</span>
                <p style={{ margin: 0 }}>{jobNameAddress || '---'}</p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Signer</span>
              <p style={{ margin: 0 }}>
                {signerName || '---'}{signerTitle ? `, ${signerTitle}` : ''}
              </p>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Company</span>
                  <p style={{ margin: 0 }}>{companyName || '---'}</p>
                </div>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Amount</span>
                  <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>
                    {displayAmount}
                  </p>
                </div>
              </div>
            </div>

            {paymentCondition && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Payment Condition</span>
                <p style={{ margin: 0 }}>{paymentCondition}</p>
              </div>
            )}

            <div style={{ borderTop: '1px solid #cbd5e1', marginTop: '1.25rem', paddingTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0, borderTop: '1px solid #ccc', paddingTop: 4 }}>Company Name</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0, borderTop: '1px solid #ccc', paddingTop: 4 }}>Representative Signature</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0, borderTop: '1px solid #ccc', paddingTop: 4 }}>Title</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
