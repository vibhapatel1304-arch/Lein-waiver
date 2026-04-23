import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download, CheckCircle, Loader2, Send, ThumbsUp, ThumbsDown, Lock, XCircle, Pencil, Trash2 } from 'lucide-react';
import boulderLogo from '../assets/boulder-logo.png';
import { invoiceService, lienWaiverService, clientService, projectService, changeOrderService } from '../services/supabaseService';
import { useSupabase, useSupabaseById } from '../hooks/useSupabase';
import { downloadPdf } from '../utils/downloadPdf';

/* ================================================================
   UTILITY FUNCTIONS
   ================================================================ */

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  if (num < 0) {
    return `($${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  }
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

const addDays = (dateStr, days) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

/* ================================================================
   NORMALIZER — maps both Supabase (snake_case) and mock (camelCase)
   into a unified shape
   ================================================================ */

function normalizeLineItem(li) {
  const scheduledValue = parseFloat(li.scheduled_value ?? li.scheduledValue ?? li.total ?? 0);
  const previousApplication = parseFloat(li.previous_application ?? li.previousApplication ?? li.previously_completed ?? 0);
  const thisPeriod = parseFloat(li.this_period ?? li.thisPeriod ?? 0);
  const materialsStored = parseFloat(li.materials_stored ?? li.materialsStored ?? 0);
  const totalCompleted = parseFloat(li.total_completed ?? li.totalCompleted ?? (previousApplication + thisPeriod + materialsStored));
  const percentComplete = parseFloat(li.percent_complete ?? li.percentComplete ?? (scheduledValue !== 0 ? (totalCompleted / scheduledValue) * 100 : 0));
  const balanceToFinish = parseFloat(li.balance_to_finish ?? li.balanceToFinish ?? (scheduledValue - totalCompleted));
  const retainage = parseFloat(li.retainage ?? 0);
  const isChangeOrder = !!(li.is_change_order) || /^CO\s*#/i.test(li.description || '');

  return {
    itemNo: li.item_no ?? li.itemNo ?? 0,
    description: li.description || '',
    scheduledValue,
    previousApplication,
    thisPeriod,
    materialsStored,
    totalCompleted,
    percentComplete,
    balanceToFinish,
    retainage,
    isChangeOrder,
  };
}

function normalizeInvoice(raw) {
  if (!raw) return null;

  const retainagePercent = parseFloat(raw.retainage_percent ?? raw.retainagePercent ?? 10);

  // Gather raw line items from whichever source provides them
  const rawLineItems = raw.pay_application_line_items || raw.lineItems || raw.invoice_line_items || [];
  const lineItems = rawLineItems.map((li) => normalizeLineItem(li));

  // Compute G702 summary from line items when the fields aren't stored on the record
  // (the simple `invoices` mock array only has lineItems, not the G702 totals)
  const computedOriginalContractSum = lineItems.reduce((s, li) => s + li.scheduledValue, 0);
  const computedTotalCompletedAndStored = lineItems.reduce((s, li) => s + li.totalCompleted, 0);
  const computedLessPreviousCertificates = lineItems.reduce((s, li) => s + li.previousApplication, 0);
  const computedTotalRetainage = lineItems.reduce((s, li) => s + li.retainage, 0);
  const computedTotalEarnedLessRetainage = computedTotalCompletedAndStored - computedTotalRetainage;
  const computedCurrentPaymentDue = computedTotalEarnedLessRetainage - computedLessPreviousCertificates;

  const originalContractSum = parseFloat(raw.original_contract_sum ?? raw.originalContractSum ?? 0) || computedOriginalContractSum;
  const netChangeOrders = parseFloat(raw.net_change_orders ?? raw.netChangeOrders ?? 0);
  const contractSumToDate = parseFloat(raw.contract_sum_to_date ?? raw.contractSumToDate ?? 0) || (originalContractSum + netChangeOrders);
  const totalCompletedAndStored = parseFloat(raw.total_completed_and_stored ?? raw.totalCompletedAndStored ?? 0) || computedTotalCompletedAndStored;
  const totalRetainage = parseFloat(raw.total_retainage ?? raw.totalRetainage ?? 0) || computedTotalRetainage;
  const totalEarnedLessRetainage = parseFloat(raw.total_earned_less_retainage ?? raw.totalEarnedLessRetainage ?? 0) || computedTotalEarnedLessRetainage;
  const lessPreviousCertificates = parseFloat(raw.less_previous_certificates ?? raw.lessPreviousCertificates ?? 0) || computedLessPreviousCertificates;
  // Use raw.amount only if there are no line items to compute from
  const currentPaymentDue = parseFloat(raw.current_payment_due ?? raw.currentPaymentDue ?? 0) || computedCurrentPaymentDue || parseFloat(raw.amount ?? 0);
  const balanceToFinish = parseFloat(raw.balance_to_finish ?? raw.balanceToFinish ?? 0) || (contractSumToDate - totalCompletedAndStored);

  return {
    id: raw.id,
    applicationNo: raw.application_no ?? raw.applicationNo ?? 1,
    projectId: raw.project_id ?? raw.projectId ?? null,
    projectName: raw.project_name ?? raw.projectName ?? raw.contract_for ?? raw.contractFor ?? '',
    owner: raw.owner_name ?? raw.owner ?? raw.client ?? '',
    ownerAddress: raw.owner_address ?? raw.ownerAddress ?? '',
    contractor: raw.contractor_name ?? raw.contractor ?? 'Boulder Construction',
    contractorAddress: raw.contractor_address ?? raw.contractorAddress ?? '123 Commerce Way, Newark, NJ 07102',
    architect: raw.architect ?? '',
    architectAddress: raw.architect_address ?? raw.architectAddress ?? '',
    contractFor: raw.contract_for ?? raw.contractFor ?? raw.project ?? '',
    contractDate: raw.contract_date ?? raw.contractDate ?? '',
    periodTo: raw.period_to ?? raw.periodTo ?? raw.application_date ?? raw.applicationDate ?? raw.dueDate ?? '',
    applicationDate: raw.application_date ?? raw.applicationDate ?? raw.issueDate ?? '',
    status: raw.status || 'Pending',
    isSubcontractorVersion: raw.isSubcontractorVersion ?? raw.is_subcontractor_version ?? false,
    subcontractor: raw.subcontractor ?? raw.subcontractor_name ?? raw.from_subcontractor ?? '',

    // Distribution fields (AIA G702)
    distributionOwner: raw.distribution_owner ?? true,
    distributionArchitect: raw.distribution_architect ?? false,
    distributionContractor: raw.distribution_contractor ?? false,

    // G702 summary lines — computed from line items when not explicitly stored
    originalContractSum,
    netChangeOrders,
    contractSumToDate,
    totalCompletedAndStored,
    retainagePercent,
    retainageOnCompleted: parseFloat(raw.retainage_on_completed ?? raw.retainageOnCompleted ?? 0) || computedTotalRetainage,
    retainageOnStored: parseFloat(raw.retainage_on_stored ?? raw.retainageOnStored ?? 0),
    totalRetainage,
    totalEarnedLessRetainage,
    lessPreviousCertificates,
    currentPaymentDue,
    balanceToFinish,

    // Change order summary (AIA G702)
    coPreviousAdditions: parseFloat(raw.co_previous_additions ?? raw.changeOrderSummary?.previousAdditions ?? 0),
    coPreviousDeductions: parseFloat(raw.co_previous_deductions ?? raw.changeOrderSummary?.previousDeductions ?? 0),
    coThisMonthAdditions: parseFloat(raw.co_this_month_additions ?? raw.changeOrderSummary?.thisMonthAdditions ?? 0),
    coThisMonthDeductions: parseFloat(raw.co_this_month_deductions ?? raw.changeOrderSummary?.thisMonthDeductions ?? 0),

    lineItems,

    // Payment tracking
    paidAmount: parseFloat(raw.paid_amount ?? raw.paidAmount ?? 0),
    paymentStatus: raw.payment_status ?? raw.paymentStatus ?? null, // 'Partial' | 'Full' | null

    // Backup draw history (only on some records, e.g. SPA-001)
    backupDrawHistory: raw.backupDrawHistory ?? raw.backup_draw_history ?? null,
  };
}

/* ================================================================
   SHARED STYLES
   ================================================================ */

const cellBorder = { border: '1px solid #999', padding: '6px 10px', fontSize: '0.8rem', verticalAlign: 'top' };
const cellBorderBold = { ...cellBorder, fontWeight: 700 };
const labelStyle = { fontWeight: 700, fontSize: '0.7rem', color: '#333', textTransform: 'uppercase', letterSpacing: '0.03em' };
const valStyle = { fontSize: '0.8rem', color: '#1e293b' };
const outerBorder = { border: '2px solid #000' };

// A4 at 96 DPI: 794px wide
const pageStyle = {
  width: '794px',
  margin: '0 auto',
  background: '#fff',
  padding: '36px 42px',
  border: '1px solid #e5e7eb',
  marginBottom: 0,
  position: 'relative',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  boxSizing: 'border-box',
};

/* ================================================================
   BOULDER LOGO COMPONENT
   ================================================================ */

const Logo = () => (
  <img src={boulderLogo} alt="Boulder Construction" style={{ height: 48, width: 'auto', display: 'block' }} />
);

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('g702');
  const [markingPaid, setMarkingPaid] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'send' | 'approve' | 'reject' | 'paid'
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [linkedWaivers, setLinkedWaivers] = useState([]);

  // Fetch from Supabase (pay_applications table)
  const { data: rawInvoice, loading, error, setData: setRawData } = useSupabaseById(invoiceService.getById, id);

  // Fetch clients, projects, and change orders for lookups
  const { data: clients } = useSupabase(clientService.list);
  const { data: projects } = useSupabase(projectService.list);
  const { data: changeOrders } = useSupabase(changeOrderService.list);

  // Fetch linked lien waivers for this invoice
  useEffect(() => {
    if (!id) return;
    lienWaiverService.listByInvoice(id).then(setLinkedWaivers).catch(() => setLinkedWaivers([]));
  }, [id]);

  // Fetch all prior pay apps for the same contract (for cumulative G703 column D)
  const [priorPayApps, setPriorPayApps] = useState([]);
  useEffect(() => {
    const contractId = rawInvoice?.contract_id || rawInvoice?.contractId;
    const appNo = rawInvoice?.application_no ?? rawInvoice?.applicationNo ?? 0;
    if (!contractId) return;
    invoiceService.listByContract(contractId).then((all) => {
      // Only apps that came BEFORE this one (lower application_no)
      setPriorPayApps(all.filter((a) => (a.application_no ?? a.applicationNo ?? 0) < appNo));
    }).catch(() => setPriorPayApps([]));
  }, [rawInvoice]);

  // Normalize into unified shape
  const invoice = rawInvoice ? (() => {
    const normalized = normalizeInvoice(rawInvoice);
    if (!normalized) return null;
    // If CO summary fields are all zero, compute from change orders by projectId
    const hasStoredCO = normalized.coPreviousAdditions || normalized.coPreviousDeductions ||
                        normalized.coThisMonthAdditions || normalized.coThisMonthDeductions;
    if (!hasStoredCO && normalized.projectId) {
      const projectCOs = changeOrders.filter(
        (co) => (co.projectId || co.project_id) === normalized.projectId && co.status === 'Approved'
      );
      // For this application: COs approved before issueDate = previous, on/after = this month
      const issueDate = rawInvoice.issueDate || rawInvoice.applicationDate || rawInvoice.application_date;
      projectCOs.forEach((co) => {
        const coDate = co.date || '';
        const isThisMonth = issueDate && coDate >= issueDate;
        if (isThisMonth) normalized.coThisMonthAdditions += co.amount;
        else normalized.coPreviousAdditions += co.amount;
      });
      normalized.netChangeOrders = normalized.coPreviousAdditions + normalized.coThisMonthAdditions
                                  - normalized.coPreviousDeductions - normalized.coThisMonthDeductions;
      normalized.contractSumToDate = normalized.originalContractSum + normalized.netChangeOrders;
    }
    return normalized;
  })() : null;

  // Resolve client/project from Supabase data for address enrichment
  const resolveClient = (inv) => {
    if (!inv) return null;
    const cId = inv.projectId ? (projects.find(p => p.id === inv.projectId)?.clientId || projects.find(p => p.id === inv.projectId)?.client_id) : null;
    return clients.find(c => c.id === cId) || null;
  };

  const resolveProject = (inv) => {
    if (!inv) return null;
    return projects.find(p => p.id === inv.projectId) || null;
  };

  const getInvoiceNumber = () => {
    if (!invoice) return '';
    return String(invoice.applicationNo);
  };

  const runAction = async (key, serviceFn, mockStatus) => {
    setActionLoading(key);
    try {
      await serviceFn(id);
      // Optimistic update so UI reflects change immediately
      setRawData((prev) => prev ? { ...prev, status: mockStatus } : prev);
    } catch (err) {
      console.error(`Failed to ${key}:`, err);
      // Still update locally so UI reflects change
      setRawData((prev) => prev ? { ...prev, status: mockStatus } : prev);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend     = () => runAction('send',    invoiceService.markSent,     'Pending');
  const handleApprove  = () => runAction('approve', invoiceService.markApproved, 'Approved');
  const handleReject   = () => runAction('reject',  invoiceService.markRejected, 'Rejected');
  const handleMarkPaid = () => runAction('paid',    invoiceService.markPaid,     'Paid');
  const handleMarkOverdue = () => runAction('overdue', invoiceService.markOverdue, 'Overdue');

  const handleRecordPayment = async () => {
    const amountPaid = parseFloat(paymentAmount) || 0;
    const due = invoice?.currentPaymentDue || 0;
    if (amountPaid <= 0) return;
    setActionLoading('paid');
    try {
      await invoiceService.recordPayment(id, amountPaid, due);
      const isFull = amountPaid >= due;
      setRawData((prev) => prev ? {
        ...prev,
        paid_amount: amountPaid,
        payment_status: isFull ? 'Full' : 'Partial',
        status: isFull ? 'Paid' : 'Approved',
        paid_date: isFull ? new Date().toISOString().split('T')[0] : null,
      } : prev);
    } catch (err) {
      console.error('Record payment failed:', err);
      alert(err.message || 'Failed to record payment.');
    } finally {
      setActionLoading(null);
      setPaymentModal(false);
      setPaymentAmount('');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setActionLoading('delete');
    try {
      await invoiceService.delete(id);
      const contractId = rawInvoice?.contract_id || rawInvoice?.contractId;
      contractId ? navigate(`/contracts/${contractId}`) : navigate('/invoices');
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.message || 'Failed to delete invoice.');
      setActionLoading(null);
      setDeleteConfirm(false);
    }
  };

  // PDF download for active tab — A4, flush edges
  const handleDownload = () => {
    const tabId = activeTab === 'g702' ? 'invoice-g702-content'
                : activeTab === 'g703' ? 'invoice-g703-content'
                : 'invoice-backup-content';
    downloadPdf(tabId, `Invoice-${getInvoiceNumber()}-${activeTab.toUpperCase()}`, {
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      margin: [0, 0, 0, 0],
      html2canvas: { scale: 2, width: 794, windowWidth: 794 },
    });
  };

  /* ---- Loading / Error states ---- */
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64748b', gap: '0.5rem' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Loading invoice...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <Link to="/invoices" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Invoices
        </Link>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: '1.125rem' }}>Invoice not found.</p>
        </div>
      </div>
    );
  }

  /* ---- Derived values ---- */
  const client = resolveClient(invoice);
  const project = resolveProject(invoice);
  const status = invoice.status;
  const hasBackup = !!(invoice.backupDrawHistory && invoice.backupDrawHistory.length > 0);

  const ownerDisplay = invoice.owner || (client ? client.company : '');
  const ownerAddressDisplay = invoice.ownerAddress || (client ? client.address : '');
  const projectNameDisplay = invoice.projectName || invoice.contractFor || (project ? project.name : '');
  const contractDateDisplay = invoice.contractDate || '';
  const periodToDisplay = invoice.periodTo || '';
  const paymentDueDate = addDays(periodToDisplay, 30);

  // Payment status label shown alongside invoice status
  const paymentStatusLabel = (() => {
    if (!invoice) return null;
    const ps = invoice.paymentStatus;
    const paid = invoice.paidAmount || 0;
    const due = invoice.currentPaymentDue || 0;
    const retainage = invoice.totalRetainage || 0;
    if (ps === 'Full' || status === 'Paid') return { label: 'Paid in Full', color: '#16a34a', bg: '#dcfce7' };
    if (ps === 'Partial' && paid > 0) {
      const remaining = due - paid;
      return { label: `Partial — $${paid.toLocaleString()} paid, $${remaining.toLocaleString()} remaining`, color: '#d97706', bg: '#fffbeb' };
    }
    if (retainage > 0 && status === 'Approved') {
      return { label: `Net Due: $${(due).toLocaleString()} (retainage $${retainage.toLocaleString()} held)`, color: '#7c3aed', bg: '#f5f3ff' };
    }
    return null;
  })();

  const STATUS_META = {
    Draft:    { color: '#64748b', bg: '#f1f5f9', label: 'Draft' },
    Pending:  { color: '#d97706', bg: '#fffbeb', label: 'Pending — Awaiting Client' },
    Approved: { color: '#2563eb', bg: '#eff6ff', label: 'Approved by Client' },
    Rejected: { color: '#dc2626', bg: '#fef2f2', label: 'Rejected by Client' },
    Paid:     { color: '#16a34a', bg: '#dcfce7', label: 'Paid' },
    Overdue:  { color: '#dc2626', bg: '#fef2f2', label: 'Overdue' },
  };
  const sm = STATUS_META[status] || STATUS_META.Draft;
  const statusColor = sm.color;
  const statusBg = sm.bg;

  // Frozen = contractor cannot act when Pending (waiting on client)
  const isFrozen = status === 'Pending';
  const isActing = (key) => actionLoading === key;

  // Separate base items and change order items
  // Build cumulative G703 line items — override previousApplication with sum from all prior apps
  const g703LineItems = invoice.lineItems.map((li) => {
    if (priorPayApps.length === 0) return li;
    const cumulativePrev = priorPayApps.reduce((sum, app) => {
      const appLines = app.pay_application_line_items || app.lineItems || [];
      const match = appLines.find((a) =>
        (a.item_no ?? a.itemNo) === (li.itemNo) || a.description === li.description
      );
      return sum + parseFloat(match?.this_period ?? match?.thisPeriod ?? 0);
    }, 0);
    const totalCompleted = cumulativePrev + li.thisPeriod + li.materialsStored;
    const balanceToFinish = li.scheduledValue - totalCompleted;
    const percentComplete = li.scheduledValue > 0 ? (totalCompleted / li.scheduledValue) * 100 : 0;
    return { ...li, previousApplication: cumulativePrev, totalCompleted, balanceToFinish, percentComplete };
  });

  const baseItems = g703LineItems.filter(li => !li.isChangeOrder);
  const coItems = g703LineItems.filter(li => li.isChangeOrder);

  // Grand totals from normalized line items
  const gtScheduled = g703LineItems.reduce((s, li) => s + li.scheduledValue, 0);
  const gtPrevious = g703LineItems.reduce((s, li) => s + li.previousApplication, 0);
  const gtThisPeriod = invoice.lineItems.reduce((s, li) => s + li.thisPeriod, 0);
  const gtMaterials = invoice.lineItems.reduce((s, li) => s + li.materialsStored, 0);
  const gtTotalCompleted = invoice.lineItems.reduce((s, li) => s + li.totalCompleted, 0);
  const gtBalance = invoice.lineItems.reduce((s, li) => s + li.balanceToFinish, 0);
  const gtRetainage = invoice.lineItems.reduce((s, li) => s + li.retainage, 0);
  const gtPercent = gtScheduled !== 0 ? (gtTotalCompleted / gtScheduled) * 100 : 0;

  // Change order summary totals
  const coTotalAdditions = invoice.coPreviousAdditions + invoice.coThisMonthAdditions;
  const coTotalDeductions = invoice.coPreviousDeductions + invoice.coThisMonthDeductions;
  const coNetChanges = coTotalAdditions - coTotalDeductions;

  /* ================================================================
     TAB BUTTON STYLE HELPER
     ================================================================ */
  const tabBtnStyle = (tabKey) => ({
    padding: '8px 18px',
    borderRadius: 6,
    border: activeTab === tabKey ? '2px solid #f07030' : '1px solid #d1d5db',
    background: activeTab === tabKey ? '#fff4ee' : '#fff',
    color: activeTab === tabKey ? '#f07030' : '#6b7280',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: activeTab === tabKey ? 700 : 500,
  });

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div style={{ padding: '1.5rem 1rem', background: '#f3f4f6', minHeight: '100vh' }}>

      {/* ================================================================
          ACTION BAR (hidden on print)
          ================================================================ */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', maxWidth: '794px', margin: '0 auto 1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        {/* Left: back link */}
        <Link to="/invoices" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back to Invoices
        </Link>

        {/* Center: tab buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => setActiveTab('g702')} style={tabBtnStyle('g702')}>
            G702 &mdash; Application
          </button>
          <button onClick={() => setActiveTab('g703')} style={tabBtnStyle('g703')}>
            G703 &mdash; Continuation Sheet
          </button>
          {hasBackup && (
            <button onClick={() => setActiveTab('backup')} style={tabBtnStyle('backup')}>
              Backup
            </button>
          )}
        </div>

        {/* Right: action buttons + status */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Status badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 999,
            fontSize: '0.8rem', fontWeight: 700, color: statusColor, background: statusBg, border: `1px solid ${statusColor}`,
          }}>
            {isFrozen && <Lock size={12} />}
            {sm.label}
          </span>

          {/* Payment status badge */}
          {paymentStatusLabel && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', padding: '4px 14px', borderRadius: 999,
              fontSize: '0.8rem', fontWeight: 700, color: paymentStatusLabel.color,
              background: paymentStatusLabel.bg, border: `1px solid ${paymentStatusLabel.color}`,
            }}>
              {paymentStatusLabel.label}
            </span>
          )}

          {/* Linked waiver badges */}
          {linkedWaivers.map((w) => {
            const wCategory = w.waiver_category || 'Partial';
            const wStatus = w.status || '';
            const color = wStatus === 'Signed' ? '#16a34a' : wStatus === 'Pending Signature' ? '#d97706' : '#64748b';
            const bg = wStatus === 'Signed' ? '#dcfce7' : wStatus === 'Pending Signature' ? '#fffbeb' : '#f1f5f9';
            return (
              <Link key={w.id} to={`/lien-waivers/${w.id}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999,
                fontSize: '0.78rem', fontWeight: 700, color, background: bg, border: `1px solid ${color}`,
                textDecoration: 'none',
              }}>
                Waiver: {wCategory} · {wStatus}
              </Link>
            );
          })}

          {/* FROZEN notice */}
          {isFrozen && (
            <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Lock size={12} /> Invoice locked — awaiting client
            </span>
          )}

          {/* Draft → Send to Client */}
          {(status === 'Draft' || status === 'Rejected') && (
            <button
              onClick={handleSend}
              disabled={isActing('send')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: '1px solid #3b82f6', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: isActing('send') ? 0.6 : 1 }}
            >
              {isActing('send') ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              Send to Client
            </button>
          )}

          {/* Pending → Approve (contractor can approve on behalf, or client portal does it) */}
          {status === 'Pending' && (
            <>
              <button
                onClick={handleApprove}
                disabled={isActing('approve')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: isActing('approve') ? 0.6 : 1 }}
              >
                {isActing('approve') ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ThumbsUp size={16} />}
                Client Approved
              </button>
              <button
                onClick={handleReject}
                disabled={isActing('reject')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: '1px solid #dc2626', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: isActing('reject') ? 0.6 : 1 }}
              >
                {isActing('reject') ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ThumbsDown size={16} />}
                Client Rejected
              </button>
            </>
          )}

          {/* Approved → Record Payment (supports partial + full) */}
          {(status === 'Approved' || invoice?.paymentStatus === 'Partial') && (
            <button
              onClick={() => { setPaymentAmount(String(invoice?.currentPaymentDue || '')); setPaymentModal(true); }}
              disabled={isActing('paid')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: '1px solid #16a34a', background: '#dcfce7', color: '#16a34a', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: isActing('paid') ? 0.6 : 1 }}
            >
              {isActing('paid') ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
              Record Payment
            </button>
          )}

          {/* Rejected → can re-send after editing */}
          {status === 'Rejected' && (
            <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <XCircle size={12} /> Client rejected — revise and re-send
            </span>
          )}

          {/* Edit — only available before client authorization */}
          {(status === 'Draft' || status === 'Rejected') && (
            <button
              onClick={() => navigate(`/invoices/create?editId=${id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: '1px solid #f07030', background: '#fff5ef', color: '#f07030', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <Pencil size={16} /> Edit Invoice
            </button>
          )}

          {/* Delete — two-click confirmation */}
          {deleteConfirm && (
            <button
              onClick={() => setDeleteConfirm(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isActing('delete')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: `1px solid ${deleteConfirm ? '#dc2626' : '#e2e8f0'}`, background: deleteConfirm ? '#fef2f2' : '#fff', color: deleteConfirm ? '#dc2626' : '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: isActing('delete') ? 0.6 : 1 }}
          >
            {isActing('delete') ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
            {deleteConfirm ? 'Confirm Delete' : 'Delete'}
          </button>

          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
            <Printer size={16} /> Print
          </button>

          <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: 'none', background: '#f07030', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>

      {/* ================================================================
          TAB 1: G702 — APPLICATION FOR PAYMENT
          Wrapper div captures both pages for PDF download.
          ================================================================ */}
      {activeTab === 'g702' && (
        <div id="invoice-g702-content">
        <div style={pageStyle}>

          {/* PAID watermark */}
          {status === 'Paid' && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)',
              fontSize: '8rem', fontWeight: 900, color: 'rgba(22,163,74,0.07)', pointerEvents: 'none',
              letterSpacing: '0.1em', zIndex: 0, userSelect: 'none',
            }}>PAID</div>
          )}

          {/* AIA G702 Document Header */}
          <div style={{ borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 16, position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a' }}>
              {invoice.isSubcontractorVersion 
                ? 'APPLICATION AND CERTIFICATION FOR PAYMENT, CONTRACTOR-SUBCONTRACTOR VERSION'
                : 'APPLICATION AND CERTIFICATION FOR PAYMENT'} 
              <span style={{ float: 'right', fontSize: '0.75rem', fontStyle: 'italic' }}>AIA DOCUMENT G702</span>
            </div>
          </div>

          {/* TOP: Logo + Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, position: 'relative', zIndex: 1 }}>
            <Logo />
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
              Application for Payment #{invoice.applicationNo}
            </div>
          </div>

          {/* Distribution checkboxes — single line */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 20, marginBottom: 16, fontSize: '0.72rem', fontWeight: 600 }}>
            <span style={{ color: '#666', marginRight: 4 }}>Distribution to:</span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={invoice.distributionOwner} disabled style={{ width: 12, height: 12, margin: 0 }} />
              OWNER
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={invoice.distributionArchitect} disabled style={{ width: 12, height: 12, margin: 0 }} />
              ARCHITECT
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={invoice.distributionContractor} disabled style={{ width: 12, height: 12, margin: 0 }} />
              CONTRACTOR
            </label>
          </div>

          {/* INFO GRID — 3 columns (with subcontractor field if applicable) */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, ...outerBorder }}>
            <tbody>
              <tr>
                <td style={{ ...cellBorder, width: '36%', ...outerBorder }} rowSpan={invoice.isSubcontractorVersion ? 4 : 3}>
                  <div style={labelStyle}>{invoice.isSubcontractorVersion ? 'To Owner/Contractor:' : 'Submitted To:'}</div>
                  <div style={valStyle}>{ownerDisplay}</div>
                  <div style={{ ...valStyle, fontSize: '0.75rem', color: '#475569' }}>{ownerAddressDisplay}</div>
                </td>
                <td style={{ ...cellBorder, width: '36%', ...outerBorder }} rowSpan={invoice.isSubcontractorVersion ? 3 : 2}>
                  <div style={labelStyle}>{invoice.isSubcontractorVersion ? 'From Subcontractor:' : 'Contractor:'}</div>
                  <div style={valStyle}>{invoice.isSubcontractorVersion ? invoice.subcontractor : 'Boulder Construction'}</div>
                  <div style={{ ...valStyle, fontSize: '0.75rem', color: '#475569' }}>{invoice.isSubcontractorVersion ? '' : '123 Commerce Way'}</div>
                  {!invoice.isSubcontractorVersion && <div style={{ ...valStyle, fontSize: '0.75rem', color: '#475569' }}>Newark, NJ 07102</div>}
                </td>
                <td style={{ ...cellBorder, ...outerBorder }}>
                  <span style={labelStyle}>Period To: </span><span style={valStyle}>{formatDateShort(periodToDisplay)}</span>
                </td>
              </tr>
              <tr>
                <td style={{ ...cellBorder, ...outerBorder }}>
                  <span style={labelStyle}>Payment Due: </span><span style={valStyle}>{formatDateShort(paymentDueDate)}</span>
                </td>
              </tr>
              {invoice.isSubcontractorVersion && (
                <tr>
                  <td style={{ ...cellBorder, ...outerBorder }}>
                    <span style={labelStyle}>App Type: </span><span style={{ ...valStyle, color: '#d97706', fontWeight: 600 }}>Subcontractor Application</span>
                  </td>
                </tr>
              )}
              <tr>
                <td style={{ ...cellBorder, ...outerBorder }}>
                  <div style={labelStyle}>Job:</div>
                  <div style={valStyle}>{projectNameDisplay}</div>
                </td>
                <td style={{ ...cellBorder, ...outerBorder }}>
                  <span style={labelStyle}>Contract Date: </span><span style={valStyle}>{formatDateShort(contractDateDisplay)}</span>
                </td>
              </tr>
              <tr>
                <td style={{ ...cellBorder, ...outerBorder }}>&nbsp;</td>
                <td style={{ ...cellBorder, ...outerBorder }}>&nbsp;</td>
                <td style={{ ...cellBorder, ...outerBorder }}>
                  <span style={labelStyle}>Contract #: </span><span style={valStyle}>{invoice.applicationNo}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TWO-COLUMN SECTION: Lines 1-9 (left) + Certification/Signature (right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '55% 45%', border: '2px solid #000', marginBottom: 20, width: '100%', boxSizing: 'border-box' }}>

            {/* LEFT — Lines 1-9 */}
            <div style={{ borderRight: '2px solid #000', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    { num: '1.', label: 'ORIGINAL CONTRACT SUM:', val: formatCurrency(invoice.originalContractSum), bold: true },
                    { num: '2.', label: 'Net Change by Change Orders:', val: formatCurrency(invoice.netChangeOrders) },
                    { num: '3.', label: 'Contract Sum to Date (1+2):', val: formatCurrency(invoice.contractSumToDate) },
                    { num: '4.', label: 'Total Completed and Stored To Date', note: '(Column G on G703)', val: formatCurrency(invoice.totalCompletedAndStored) },
                    { num: '5.', label: 'Retainage:', val: '', sub: true },
                    { num: '', label: '  a.  ___% of Completed Work  $', note: '(Column D + E on G703)', val: '_________', indent: true, blank: true },
                    { num: '', label: '  b.  ___% of Stored Materials  $', note: '(Column F on G703)', val: '_________', indent: true, blank: true },
                    { num: '', label: '           Total Retainage (Lines 5a + 5b or', note: '(Total in Column I of G703)', val: formatCurrency(invoice.totalRetainage), indent: true },
                    { num: '6.', label: 'TOTAL EARNED LESS RETAINAGE (Line 4 Less Line 5 Total):', val: formatCurrency(invoice.totalEarnedLessRetainage) },
                    { num: '7.', label: 'LESS Previous Applications for Payment:', note: '(Line 6 from prior Certificate)', val: formatCurrency(invoice.lessPreviousCertificates) },
                    { num: '8.', label: 'Current Payment Due:', val: formatCurrency(invoice.currentPaymentDue), highlight: true },
                    { num: '9.', label: 'Balance to Finish, Including Retainage (3-6):', val: formatCurrency(invoice.balanceToFinish) },
                  ].map((row, i) => (
                    <tr key={i} style={row.highlight ? { background: '#fef3c7' } : {}}>
                      <td style={{
                        padding: '5px 8px', fontSize: '0.78rem', color: '#1e293b',
                        borderBottom: row.highlight ? '3px solid #d97706' : '1px solid #ddd',
                        borderTop: row.highlight ? '3px solid #d97706' : 'none',
                        fontWeight: row.bold || row.highlight ? 700 : 400, width: '70%',
                      }}>
                        {row.num && <span style={{ display: 'inline-block', width: 22, fontWeight: 600 }}>{row.num}</span>}
                        {row.label}
                        {row.note && <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', fontWeight: 400, marginTop: 2 }}>{row.note}</div>}
                      </td>
                      <td style={{
                        padding: '5px 8px', fontSize: '0.78rem', textAlign: 'right', color: '#0f172a',
                        borderBottom: row.highlight ? '3px solid #d97706' : '1px solid #ddd',
                        borderTop: row.highlight ? '3px solid #d97706' : 'none',
                        fontWeight: row.bold || row.highlight ? 700 : 400,
                        background: row.highlight ? '#fef3c7' : 'transparent',
                      }}>
                        {row.val}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* RIGHT — Certification Text + Signature Block */}
            <div style={{ padding: '12px 14px', fontSize: '0.75rem', lineHeight: 1.5, color: '#334155' }}>
              
              {/* Certification paragraph */}
              {invoice.isSubcontractorVersion ? (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: '0 0 8px' }}>
                    The undersigned Subcontractor certifies that to the best of the Subcontractor's knowledge, information, and belief the Work covered by this Application for Payment has been completed in accordance with the Contract Documents, that all amounts have been paid by the Subcontractor for Work for which previous Certificates for Payment were issued and payments received from the Owner/Contractor, and that current payment shown herein is now due.
                  </p>
                  <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.72rem' }}>
                    Application is made for payment, as shown below, in connection with the Subcontract. Continuation Sheet, AIA Document G703S, is attached.
                  </p>
                </div>
              ) : (
                <p style={{ margin: '0 0 12px' }}>
                  The undersigned Contractor certifies that to the best of the Contractor's knowledge, information, and belief, the Work covered by this Application for Payment has been completed in accordance with the Contract Documents, that all amounts have been paid by the Contractor for Work for which previous Applications for Payment were issued and payments received, and that current payment shown herein is now due.
                </p>
              )}

              {/* Subcontractor section */}
              <div style={{ borderTop: '1px solid #ddd', paddingTop: 8, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>SUBCONTRACTOR:</div>
                <div style={{ marginBottom: 8, fontSize: '0.72rem' }}>{invoice.isSubcontractorVersion ? invoice.subcontractor : 'N/A'}</div>
                
                {/* By/Date */}
                <div style={{ marginBottom: 8, fontSize: '0.72rem' }}>
                  <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 600 }}>By:</span> ______________</div>
                  <div><span style={{ fontWeight: 600 }}>Date:</span> ______________</div>
                </div>
                
                {/* Notary */}
                <div style={{ fontSize: '0.7rem' }}>
                  <div style={{ marginBottom: 4 }}>State of: ______________</div>
                  <div style={{ marginBottom: 4 }}>County of: ______________</div>
                  <div style={{ marginBottom: 4 }}>Subscribed and sworn to before me this _____ day of ______________</div>
                  <div style={{ marginBottom: 4 }}>Notary Public: ______________</div>
                  <div>My Commission Expires: ______________</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Page break trigger for PDF ── */}
        <div className="html2pdf__page-break" style={{ height: 0, overflow: 'hidden', margin: 0, padding: 0 }} />

        {/* ══════════════════════════════════════════════════════════════
            G702 PAGE 2 — Change Order Summary + Certificate for Payment
            Same width/padding as page 1 for perfect column alignment.
            ══════════════════════════════════════════════════════════════ */}
        <div style={pageStyle}>

          {/* Page 2 header */}
          <div style={{ borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 20 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a' }}>
              APPLICATION AND CERTIFICATION FOR PAYMENT — CONTINUED
              <span style={{ float: 'right', fontSize: '0.75rem', fontStyle: 'italic' }}>AIA DOCUMENT G702</span>
            </div>
          </div>

          {/* Two-column grid: same 55/45 split as page 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '55% 45%', border: '2px solid #000', width: '100%', boxSizing: 'border-box' }}>

            {/* LEFT — Change Order Summary */}
            <div style={{ borderRight: '2px solid #000', padding: 0 }}>
              <div style={{ background: '#f8fafc', padding: '6px 10px', borderBottom: '1px solid #999', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Change Order Summary
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <tbody>
                  <tr>
                    <th style={{ ...cellBorder, borderLeft: 'none', borderRight: 'none', textAlign: 'left', fontWeight: 600, fontSize: '0.68rem' }}>&nbsp;</th>
                    <th style={{ ...cellBorder, borderLeft: 'none', borderRight: 'none', textAlign: 'right', fontWeight: 600, fontSize: '0.68rem' }}>Additions</th>
                    <th style={{ ...cellBorder, borderLeft: 'none', borderRight: 'none', textAlign: 'right', fontWeight: 600, fontSize: '0.68rem' }}>Deductions</th>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 10px', borderBottom: '1px solid #ddd' }}>Total changes approved in previous months by Owner</td>
                    <td style={{ padding: '4px 10px', borderBottom: '1px solid #ddd', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>{formatCurrency(invoice.coPreviousAdditions)}</td>
                    <td style={{ padding: '4px 10px', borderBottom: '1px solid #ddd', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>{formatCurrency(invoice.coPreviousDeductions)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 10px', borderBottom: '1px solid #ddd' }}>Total approved this Month</td>
                    <td style={{ padding: '4px 10px', borderBottom: '1px solid #ddd', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>{formatCurrency(invoice.coThisMonthAdditions)}</td>
                    <td style={{ padding: '4px 10px', borderBottom: '1px solid #ddd', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>{formatCurrency(invoice.coThisMonthDeductions)}</td>
                  </tr>
                  <tr style={{ fontWeight: 600, background: '#fafafa' }}>
                    <td style={{ padding: '4px 10px', borderBottom: '1px solid #999' }}>TOTALS</td>
                    <td style={{ padding: '4px 10px', borderBottom: '1px solid #999', textAlign: 'right' }}>{formatCurrency(coTotalAdditions)}</td>
                    <td style={{ padding: '4px 10px', borderBottom: '1px solid #999', textAlign: 'right' }}>{formatCurrency(coTotalDeductions)}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ padding: '6px 10px', fontSize: '0.72rem', fontWeight: 600 }}>
                NET CHANGES by Change Order: <span style={{ float: 'right', color: coNetChanges >= 0 ? '#047857' : '#b91c1c' }}>{formatCurrency(coNetChanges)}</span>
              </div>
            </div>

            {/* RIGHT — Certificate for Payment */}
            <div style={{ padding: 0 }}>
              <div style={{ background: '#f8fafc', padding: '6px 10px', borderBottom: '1px solid #999', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Certificate for Payment
              </div>
              <div style={{ padding: '10px 14px', fontSize: '0.7rem', lineHeight: 1.55, color: '#334155' }}>
                <p style={{ margin: '0 0 10px' }}>
                  In accordance with the Contract Documents, based on on-site observations and the data
                  comprising the above application, the Construction Manager certifies that to the best of his
                  knowledge, information, and belief the Work has progressed as indicated, the quality of the
                  Work is in accordance with the Contract Documents, and the Contractor is entitled to
                  payment of the AMOUNT CERTIFIED.
                </p>
                <div style={{ marginBottom: 12, fontWeight: 600 }}>
                  Amount Certified: $___________________
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Construction Manager:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>By:_________________________</span>
                    <span>Date: _______________</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Architect:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>By:_________________________</span>
                    <span>Date: _______________</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ================================================================
          TAB 2: G703 — CONTINUATION SHEET
          ================================================================ */}
      {activeTab === 'g703' && (
        <div id="invoice-g703-content" style={{ ...pageStyle, padding: '24px 20px', pageBreakBefore: 'always' }}>

          {/* AIA G703 Document Header */}
          <div style={{ borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 16 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a' }}>
              CONTINUATION SHEET
              <span style={{ float: 'right', fontSize: '0.75rem', fontStyle: 'italic' }}>AIA DOCUMENT G703</span>
            </div>
          </div>

          {/* TOP: Logo + Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <Logo />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Application for Payment #{invoice.applicationNo}</div>
            </div>
          </div>

          {/* PRIOR PAY APPLICATIONS — full G703 tables for each previous invoice on this contract */}
          {priorPayApps.length > 0 && priorPayApps.map((priorApp, priorIdx) => {
            const priorLines = (priorApp.pay_application_line_items || priorApp.lineItems || []).map((li) => normalizeLineItem(li));
            const priorAppNo = priorApp.application_no ?? priorApp.applicationNo ?? '—';
            const priorPeriod = priorApp.period_to || priorApp.periodTo || priorApp.application_date || '—';
            const priorStatusColor = { Paid: '#059669', Approved: '#059669', Pending: '#d97706', Overdue: '#dc2626', Draft: '#64748b', Submitted: '#3b82f6' }[priorApp.status] || '#64748b';
            const pScheduled = priorLines.reduce((s, li) => s + li.scheduledValue, 0);
            const pPrev = priorLines.reduce((s, li) => s + li.previousApplication, 0);
            const pThis = priorLines.reduce((s, li) => s + li.thisPeriod, 0);
            const pMat = priorLines.reduce((s, li) => s + li.materialsStored, 0);
            const pTotal = priorLines.reduce((s, li) => s + li.totalCompleted, 0);
            const pBalance = priorLines.reduce((s, li) => s + li.balanceToFinish, 0);
            const pRetainage = priorLines.reduce((s, li) => s + li.retainage, 0);
            const pPct = pScheduled > 0 ? (pTotal / pScheduled) * 100 : 0;
            return (
              <div key={`prior-${priorIdx}`} style={{ marginBottom: 28, opacity: 0.85 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                    Application #{priorAppNo}
                    <span style={{ marginLeft: 8, fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>
                      Period to {typeof priorPeriod === 'string' && priorPeriod !== '—' ? new Date(priorPeriod).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : priorPeriod}
                    </span>
                  </div>
                  <span style={{ background: priorStatusColor + '18', color: priorStatusColor, padding: '2px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700 }}>
                    {priorApp.status}
                  </span>
                </div>
                <div style={{ overflowX: 'visible' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', ...outerBorder, fontSize: '0.72rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ ...cellBorderBold, textAlign: 'center', width: '4%' }}>A</th>
                        <th style={{ ...cellBorderBold, textAlign: 'center', width: '22%' }}>B</th>
                        <th style={{ ...cellBorderBold, textAlign: 'center', width: '11%' }}>C</th>
                        <th style={{ ...cellBorderBold, textAlign: 'center', width: '11%' }}>D</th>
                        <th style={{ ...cellBorderBold, textAlign: 'center', width: '11%' }}>E</th>
                        <th style={{ ...cellBorderBold, textAlign: 'center', width: '9%' }}>F</th>
                        <th style={{ ...cellBorderBold, textAlign: 'center', width: '11%' }}>G</th>
                        <th style={{ ...cellBorderBold, textAlign: 'center', width: '5%' }}>%</th>
                        <th style={{ ...cellBorderBold, textAlign: 'center', width: '10%' }}>H</th>
                        <th style={{ ...cellBorderBold, textAlign: 'center', width: '9%' }}>I</th>
                      </tr>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Item</th>
                        <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Description of Work</th>
                        <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Scheduled Value</th>
                        <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Work Completed Previously</th>
                        <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>This Period</th>
                        <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Materials Stored</th>
                        <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Total Completed & Stored</th>
                        <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>%</th>
                        <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Balance to Finish</th>
                        <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Retainage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priorLines.map((li, idx) => (
                        <tr key={idx}>
                          <td style={{ ...cellBorder, textAlign: 'center' }}>{li.itemNo || idx + 1}</td>
                          <td style={cellBorder}>{li.description}</td>
                          <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.scheduledValue)}</td>
                          <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.previousApplication)}</td>
                          <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.thisPeriod)}</td>
                          <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.materialsStored)}</td>
                          <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.totalCompleted)}</td>
                          <td style={{ ...cellBorder, textAlign: 'center' }}>{li.percentComplete.toFixed(1)}%</td>
                          <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.balanceToFinish)}</td>
                          <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.retainage)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                        <td style={{ ...cellBorderBold, textAlign: 'center' }} colSpan={2}>GRAND TOTALS</td>
                        <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(pScheduled)}</td>
                        <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(pPrev)}</td>
                        <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(pThis)}</td>
                        <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(pMat)}</td>
                        <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(pTotal)}</td>
                        <td style={{ ...cellBorderBold, textAlign: 'center' }}>{pPct.toFixed(1)}%</td>
                        <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(pBalance)}</td>
                        <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(pRetainage)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Divider between prior and current */}
          {priorPayApps.length > 0 && (
            <div style={{ borderTop: '3px solid #f07030', marginBottom: 20, paddingTop: 12 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f07030', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current Application #{invoice.applicationNo}
              </div>
            </div>
          )}

          {/* CURRENT CONTINUATION TABLE */}
          <div style={{ overflowX: 'visible' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', ...outerBorder, fontSize: '0.72rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ ...cellBorderBold, textAlign: 'center', width: '4%' }}>A</th>
                  <th style={{ ...cellBorderBold, textAlign: 'center', width: '22%' }}>B</th>
                  <th style={{ ...cellBorderBold, textAlign: 'center', width: '11%' }}>C</th>
                  <th style={{ ...cellBorderBold, textAlign: 'center', width: '11%' }}>D</th>
                  <th style={{ ...cellBorderBold, textAlign: 'center', width: '11%' }}>E</th>
                  <th style={{ ...cellBorderBold, textAlign: 'center', width: '9%' }}>F</th>
                  <th style={{ ...cellBorderBold, textAlign: 'center', width: '11%' }}>G</th>
                  <th style={{ ...cellBorderBold, textAlign: 'center', width: '5%' }}>%</th>
                  <th style={{ ...cellBorderBold, textAlign: 'center', width: '10%' }}>H</th>
                  <th style={{ ...cellBorderBold, textAlign: 'center', width: '9%' }}>I</th>
                </tr>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Item</th>
                  <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Description of Work</th>
                  <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Scheduled Value</th>
                  <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Work Completed Previously</th>
                  <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>This Period</th>
                  <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Materials Stored</th>
                  <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Total Completed & Stored</th>
                  <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>%</th>
                  <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Balance to Finish</th>
                  <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Retainage</th>
                </tr>
              </thead>
              <tbody>
                {/* Base contract items */}
                {baseItems.map((li, idx) => (
                  <tr key={`base-${idx}`}>
                    <td style={{ ...cellBorder, textAlign: 'center' }}>{li.itemNo || idx + 1}</td>
                    <td style={cellBorder}>{li.description}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.scheduledValue)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.previousApplication)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.thisPeriod)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.materialsStored)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.totalCompleted)}</td>
                    <td style={{ ...cellBorder, textAlign: 'center' }}>{li.percentComplete.toFixed(1)}%</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.balanceToFinish)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.retainage)}</td>
                  </tr>
                ))}

                {/* Change Orders separator + items */}
                {coItems.length > 0 && (
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={10} style={{ ...cellBorder, fontWeight: 700, fontStyle: 'italic', color: '#64748b', textAlign: 'center', fontSize: '0.75rem' }}>
                      Change Orders
                    </td>
                  </tr>
                )}
                {coItems.map((li, idx) => (
                  <tr key={`co-${idx}`}>
                    <td style={{ ...cellBorder, textAlign: 'center' }}>{li.itemNo || baseItems.length + idx + 1}</td>
                    <td style={cellBorder}>{li.description}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.scheduledValue)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.previousApplication)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.thisPeriod)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.materialsStored)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.totalCompleted)}</td>
                    <td style={{ ...cellBorder, textAlign: 'center' }}>{li.percentComplete.toFixed(1)}%</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.balanceToFinish)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(li.retainage)}</td>
                  </tr>
                ))}

                {/* GRAND TOTALS */}
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td style={{ ...cellBorderBold, textAlign: 'center' }} colSpan={2}>GRAND TOTALS</td>
                  <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtScheduled)}</td>
                  <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtPrevious)}</td>
                  <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtThisPeriod)}</td>
                  <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtMaterials)}</td>
                  <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtTotalCompleted)}</td>
                  <td style={{ ...cellBorderBold, textAlign: 'center' }}>{gtPercent.toFixed(1)}%</td>
                  <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtBalance)}</td>
                  <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtRetainage)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================
          TAB 3: BACKUP — PAYMENT HISTORY
          ================================================================ */}
      {activeTab === 'backup' && hasBackup && (
        <div id="invoice-backup-content" style={pageStyle}>

          {/* TOP: Logo + Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <Logo />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Application for Payment #{invoice.applicationNo}</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: '10px 0 20px', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0f172a' }}>
            Backup &mdash; Payment History
          </div>

          {(() => {
            const draws = invoice.backupDrawHistory;
            const currentDrawNo = invoice.applicationNo;
            const priorDraws = draws.filter(d => d.draw < currentDrawNo);
            const currentDraws = draws.filter(d => d.draw === currentDrawNo);

            const backupTableHead = (
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ ...cellBorderBold, textAlign: 'center', width: '6%' }}>Draw #</th>
                  <th style={{ ...cellBorderBold, textAlign: 'center', width: '6%' }}>G703 #</th>
                  <th style={{ ...cellBorderBold, textAlign: 'left', width: '28%' }}>Description</th>
                  <th style={{ ...cellBorderBold, textAlign: 'left', width: '20%' }}>Commentary</th>
                  <th style={{ ...cellBorderBold, textAlign: 'right', width: '14%' }}>Amount</th>
                  <th style={{ ...cellBorderBold, textAlign: 'right', width: '12%' }}>Retainage</th>
                  <th style={{ ...cellBorderBold, textAlign: 'right', width: '14%' }}>Net Amount</th>
                </tr>
              </thead>
            );

            const renderDrawItems = (drawList) => {
              const rows = [];
              drawList.forEach((draw) => {
                draw.items.forEach((item, itemIdx) => {
                  rows.push(
                    <tr key={`${draw.draw}-${itemIdx}`}>
                      {itemIdx === 0 ? (
                        <td style={{ ...cellBorder, textAlign: 'center', fontWeight: 600 }} rowSpan={draw.items.length}>
                          {draw.draw}
                        </td>
                      ) : null}
                      <td style={{ ...cellBorder, textAlign: 'center' }}>{item.g703No}</td>
                      <td style={cellBorder}>{item.description}</td>
                      <td style={{ ...cellBorder, color: '#64748b', fontSize: '0.72rem' }}>{item.commentary}</td>
                      <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                      <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(item.retainage)}</td>
                      <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(item.netAmount)}</td>
                    </tr>
                  );
                });
              });
              return rows;
            };

            const calcTotals = (drawList) => {
              let totalAmount = 0, totalRetainage = 0, totalNet = 0;
              drawList.forEach(d => d.items.forEach(item => {
                totalAmount += parseFloat(item.amount) || 0;
                totalRetainage += parseFloat(item.retainage) || 0;
                totalNet += parseFloat(item.netAmount) || 0;
              }));
              return { totalAmount, totalRetainage, totalNet };
            };

            const priorTotals = calcTotals(priorDraws);
            const currentTotals = calcTotals(currentDraws);

            return (
              <>
                {/* Prior Payments */}
                {priorDraws.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 8, color: '#0f172a', borderBottom: '2px solid #f59e0b', paddingBottom: 4, display: 'inline-block' }}>
                      Prior Payments
                    </div>
                    <div style={{ overflowX: 'visible' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', ...outerBorder, fontSize: '0.72rem' }}>
                        {backupTableHead}
                        <tbody>
                          {renderDrawItems(priorDraws)}
                          <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                            <td colSpan={4} style={{ ...cellBorderBold, textAlign: 'right' }}>Prior Payments Total:</td>
                            <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(priorTotals.totalAmount)}</td>
                            <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(priorTotals.totalRetainage)}</td>
                            <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(priorTotals.totalNet)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* New Payment Requests (Current Draw) */}
                {currentDraws.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 8, color: '#0f172a', borderBottom: '2px solid #f59e0b', paddingBottom: 4, display: 'inline-block' }}>
                      New Payment Requests (Draw #{currentDrawNo})
                    </div>
                    <div style={{ overflowX: 'visible' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', ...outerBorder, fontSize: '0.72rem' }}>
                        {backupTableHead}
                        <tbody>
                          {renderDrawItems(currentDraws)}
                          <tr style={{ background: '#fef3c7', fontWeight: 700 }}>
                            <td colSpan={4} style={{ ...cellBorderBold, textAlign: 'right' }}>Current Draw Total:</td>
                            <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(currentTotals.totalAmount)}</td>
                            <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(currentTotals.totalRetainage)}</td>
                            <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(currentTotals.totalNet)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ================================================================
          PAYMENT MODAL
          ================================================================ */}
      {paymentModal && invoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: 420, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Record Payment</h2>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
              Application #{invoice.applicationNo} — Net Due: {formatCurrency(invoice.currentPaymentDue)}
            </p>

            {invoice.totalRetainage > 0 && (
              <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#7c3aed' }}>
                <strong>Retainage held:</strong> {formatCurrency(invoice.totalRetainage)} — status stays <em>Partial</em> until full amount is paid.
              </div>
            )}

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>
              Amount Being Paid
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none' }}
              autoFocus
            />

            {(() => {
              const amt = parseFloat(paymentAmount) || 0;
              const due = invoice.currentPaymentDue || 0;
              const remaining = due - amt;
              const isFull = amt >= due;
              if (amt <= 0) return null;
              return (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: isFull ? '#dcfce7' : '#fffbeb', borderRadius: 8, fontSize: '0.8rem', color: isFull ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                  {isFull
                    ? 'Full payment — invoice will be marked Paid.'
                    : `Partial payment — ${formatCurrency(remaining)} remaining. Status stays Partial.`}
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setPaymentModal(false); setPaymentAmount(''); }}
                style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={!(parseFloat(paymentAmount) > 0) || actionLoading === 'paid'}
                style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', opacity: !(parseFloat(paymentAmount) > 0) || actionLoading === 'paid' ? 0.5 : 1 }}
              >
                {actionLoading === 'paid' ? 'Saving…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Print styles + spinner animation ---- */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; margin: 0; padding: 0; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
