import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download, FileDown, CheckCircle, Clock, Send, DollarSign, Shield, FileCheck, Loader2 } from 'lucide-react';
import { payAppService, lienWaiverService } from '../services/supabaseService';
import { useSupabaseById } from '../hooks/useSupabase';
import { downloadPdf } from '../utils/downloadPdf';

/* ── Currency formatting ─────────────────────────────────────── */
const fmt = (v) => {
  if (v == null) return '$0.00';
  const num = Number(v);
  if (num < 0) return '($' + Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ')';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtPct = (v) => {
  if (v == null || v === 0) return '0.0%';
  return Number(v).toFixed(1) + '%';
};

const fmtDash = (v) => {
  if (v == null || v === 0) return ' - ';
  return fmt(v);
};

/* ── Handle thisPeriod / thisPeroid (legacy typo) / this_period (Supabase) */
const getThisPeriod = (li) => li.thisPeriod ?? li.thisPeroid ?? li.this_period ?? 0;

/* ── Date formatting ─────────────────────────────────────────── */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

/* ── Status badge config ─────────────────────────────────────── */
const statusConfig = {
  Submitted: { color: '#2563eb', bg: '#dbeafe', icon: Send },
  Approved: { color: '#16a34a', bg: '#dcfce7', icon: CheckCircle },
  Paid: { color: '#7c3aed', bg: '#ede9fe', icon: DollarSign },
  Draft: { color: '#6b7280', bg: '#f3f4f6', icon: Clock },
  Rejected: { color: '#dc2626', bg: '#fee2e2', icon: Clock },
};

/* ── Normalizer: convert Supabase snake_case to the camelCase the UI expects */
function normalizePayApp(raw) {
  if (!raw) return null;

  // If it already has camelCase keys (mock data), return as-is
  if (raw.applicationNo !== undefined) return raw;

  // Supabase snake_case -> camelCase
  const pa = {
    id: raw.id,
    applicationNo: raw.application_no,
    projectId: raw.project_id,
    projectName: raw.project_name ?? '',
    projectLocation: raw.project_location ?? '',
    owner: raw.owner_name ?? '',
    ownerAddress: raw.owner_address ?? '',
    contractor: raw.contractor_name ?? 'Boulder Construction',
    contractorAddress: raw.contractor_address ?? '',
    architect: raw.architect_name ?? '',
    architectAddress: raw.architect_address ?? '',
    contractFor: raw.contract_for ?? '',
    contractDate: raw.contract_date,
    periodTo: raw.period_to,
    applicationDate: raw.application_date,
    originalContractSum: raw.original_contract_sum ?? 0,
    netChangeOrders: raw.net_change_orders ?? 0,
    contractSumToDate: raw.contract_sum_to_date ?? 0,
    totalCompletedAndStored: raw.total_completed_and_stored ?? 0,
    retainagePercent: raw.retainage_percent ?? 10,
    retainageOnCompleted: raw.retainage_on_completed ?? 0,
    retainageOnStored: raw.retainage_on_stored ?? 0,
    totalRetainage: raw.total_retainage ?? 0,
    totalEarnedLessRetainage: raw.total_earned_less_retainage ?? 0,
    lessPreviousCertificates: raw.less_previous_certificates ?? 0,
    currentPaymentDue: raw.current_payment_due ?? 0,
    balanceToFinish: raw.balance_to_finish ?? 0,
    isSubcontractorVersion: raw.is_subcontractor_version ?? false,
    subcontractor: raw.subcontractor ?? raw.contractor_name ?? '',
    status: raw.status ?? 'Draft',
    changeOrderSummary: raw.change_order_summary ?? raw.changeOrderSummary ?? {
      previousAdditions: 0, previousDeductions: 0,
      thisMonthAdditions: 0, thisMonthDeductions: 0,
    },
    // Line items from Supabase relation
    lineItems: (raw.pay_application_line_items || []).map((li) => ({
      itemNo: li.item_no,
      description: li.description ?? '',
      scheduledValue: li.scheduled_value ?? 0,
      previousApplication: li.previous_application ?? 0,
      thisPeriod: li.this_period ?? 0,
      materialsStored: li.materials_stored ?? 0,
      totalCompleted: li.total_completed ?? 0,
      percentComplete: li.percent_complete ?? 0,
      balanceToFinish: li.balance_to_finish ?? 0,
      retainage: li.retainage ?? 0,
    })),
    // Draw history from Supabase relation
    backupDrawHistory: raw.pay_app_draw_history || raw.backupDrawHistory || [],
  };

  return pa;
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
export default function PayApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('g702');
  const [actionLoading, setActionLoading] = useState(false);
  const [waiverLoading, setWaiverLoading] = useState(false);

  // Memoize the fetch function to prevent re-renders
  const fetchFn = useCallback((payAppId) => payAppService.getById(payAppId), []);

  // Fetch from Supabase
  const { data: rawData, loading, setData } = useSupabaseById(fetchFn, id);

  // Normalize the data (handles both Supabase and mock formats)
  const pa = normalizePayApp(rawData);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#64748b' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading pay application...</span>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!pa) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <h2>Pay Application Not Found</h2>
        <p>No pay application with ID "{id}" was found.</p>
        <button onClick={() => navigate('/pay-applications')} style={{ marginTop: 16, padding: '8px 20px', cursor: 'pointer', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff' }}>
          Back to Pay Applications
        </button>
      </div>
    );
  }

  const isSub = !!pa.isSubcontractorVersion;
  const sc = statusConfig[pa.status] || statusConfig.Draft;
  const StatusIcon = sc.icon;
  const lineItems = pa.lineItems || [];

  /* Labels based on version */
  const lblToOwner = isSub ? 'TO OWNER/CONTRACTOR:' : 'TO OWNER:';
  const lblFromContractor = isSub ? 'FROM SUBCONTRACTOR:' : 'FROM CONTRACTOR:';
  const lblG702 = isSub ? 'AIA DOCUMENT G702S' : 'AIA DOCUMENT G702';
  const lblG703 = isSub ? 'AIA DOCUMENT G703S' : 'AIA DOCUMENT G703';
  const lblHeaderG702 = isSub
    ? 'APPLICATION AND CERTIFICATION FOR PAYMENT, CONTRACTOR-SUBCONTRACTOR VERSION'
    : 'APPLICATION AND CERTIFICATION FOR PAYMENT';
  const lblHeaderG703 = isSub
    ? 'CONTINUATION SHEET, CONTRACTOR-SUBCONTRACTOR VERSION'
    : 'CONTINUATION SHEET';
  const lblCertEntity = isSub ? 'Subcontractor' : 'Contractor';

  /* Compute grand totals from line items */
  const grandTotals = lineItems.reduce(
    (acc, li) => ({
      scheduledValue: acc.scheduledValue + (li.scheduledValue || 0),
      previousApplication: acc.previousApplication + (li.previousApplication || 0),
      thisPeriod: acc.thisPeriod + getThisPeriod(li),
      materialsStored: acc.materialsStored + (li.materialsStored || 0),
      totalCompleted: acc.totalCompleted + (li.totalCompleted || 0),
      balanceToFinish: acc.balanceToFinish + (li.balanceToFinish || 0),
      retainage: acc.retainage + (li.retainage || 0),
    }),
    { scheduledValue: 0, previousApplication: 0, thisPeriod: 0, materialsStored: 0, totalCompleted: 0, balanceToFinish: 0, retainage: 0 }
  );
  const grandPct = grandTotals.scheduledValue ? ((grandTotals.totalCompleted / grandTotals.scheduledValue) * 100) : 0;

  const cos = pa.changeOrderSummary || {};
  const totalAdditions = (cos.previousAdditions || 0) + (cos.thisMonthAdditions || 0);
  const totalDeductions = (cos.previousDeductions || 0) + (cos.thisMonthDeductions || 0);
  const netChanges = totalAdditions - totalDeductions;

  const retPct = pa.retainagePercent;

  /* Separate base items from change order items */
  const baseItems = lineItems.filter(li => !li.description.startsWith('CO #'));
  const coItems = lineItems.filter(li => li.description.startsWith('CO #'));

  const hasBackup = pa.backupDrawHistory && pa.backupDrawHistory.length > 0;

  /* ── Action handlers ─────────────────────────────────────────── */
  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await payAppService.updateStatus(id, 'Approved');
      setData((prev) => {
        if (!prev) return prev;
        if (prev.status !== undefined) {
          return { ...prev, status: 'Approved' };
        }
        return prev;
      });
    } catch (err) {
      alert('Failed to approve: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateWaiver = async () => {
    setWaiverLoading(true);
    try {
      await lienWaiverService.generateFromPayApp(
        {
          id: pa.id,
          project_id: pa.projectId,
          owner_name: pa.owner,
          owner_address: pa.ownerAddress,
          contractor_name: pa.contractor,
          contract_for: pa.contractFor,
          project_name: pa.projectName,
          application_no: pa.applicationNo,
          current_payment_due: pa.currentPaymentDue,
        },
        {
          company: isSub ? pa.subcontractor : (pa.contractor || 'Boulder Construction'),
          name: pa.owner,
          title: 'Project Manager',
        }
      );
      alert('Lien Waiver generated successfully!');
    } catch (err) {
      alert('Failed to generate waiver: ' + err.message);
    } finally {
      setWaiverLoading(false);
    }
  };

  /* ── Shared styles ─────────────────────────────────────────── */
  const b = '1px solid #000';
  const cellBase = { border: b, padding: '3px 5px', fontSize: 10, verticalAlign: 'top' };
  const cellR = { ...cellBase, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const cellC = { ...cellBase, textAlign: 'center' };

  const darkHeaderBg = '#1a1a2e';
  const accentBg = '#e8a435';
  const greenHeaderBg = '#2d5f2d';

  const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6,
    background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
  };

  const tabBtnStyle = (active) => ({
    padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6,
    background: active ? '#1a1a2e' : '#fff', color: active ? '#fff' : '#333',
    cursor: 'pointer', fontSize: 12, fontWeight: 600,
  });

  /* ── Shared page container style ── */
  const pageStyle = {
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    color: '#000',
    background: '#fff',
    width: '100%',
    maxWidth: 720,
    margin: '16px auto 0',
    boxSizing: 'border-box',
    padding: '0 16px 24px',
    fontSize: 10,
  };

  /* ──────────────────────────────────────────────────────────────
     PAGE 1: G702
     ────────────────────────────────────────────────────────────── */
  const renderG702 = () => {
    const valW = 100;
    const valCellStyle = { borderBottom: b, borderLeft: b, padding: '4px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 10, width: valW };
    const labelCellStyle = { borderBottom: b, padding: '4px 6px', fontSize: 10 };

    return (
      <div style={pageStyle}>

        {/* Top header bar */}
        <div style={{ background: darkHeaderBg, color: '#fff', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, letterSpacing: 0.3 }}>
          <span style={{ fontWeight: 700 }}>{lblHeaderG702}</span>
          <span style={{ fontStyle: 'italic' }}>{lblG702}</span>
        </div>

        {/* === Boulder Logo + Title Row === */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              {/* Logo */}
              <td style={{ border: b, borderTop: 'none', width: '20%', padding: '6px 8px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 26, height: 26, background: accentBg, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontWeight: 900, fontSize: 14, lineHeight: 1 }}>B</span>
                  </div>
                  <div style={{ lineHeight: 1.1 }}>
                    <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 0.5 }}>BOULDER</div>
                    <div style={{ fontSize: 6, letterSpacing: 1.5, color: '#555' }}>CONSTRUCTION</div>
                  </div>
                </div>
              </td>
              {/* Title */}
              <td style={{ border: b, borderTop: 'none', width: '50%', padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Application for Payment #{pa.applicationNo}</div>
              </td>
              {/* Distribution */}
              <td style={{ border: b, borderTop: 'none', width: '30%', padding: '4px 6px', verticalAlign: 'middle', fontSize: 8 }}>
                <div style={{ textAlign: 'right', color: '#666', marginBottom: 2 }}>Distribution to:</div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>&#9745;</span> OWNER{' '}
                  <span style={{ fontFamily: 'monospace' }}>&#9744;</span> ARCHITECT{' '}
                  <span style={{ fontFamily: 'monospace' }}>&#9744;</span> CONTRACTOR
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* === Info Grid: Owner/Contractor | From Sub | Period/Contract === */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              {/* Left: To Owner/Contractor */}
              <td style={{ ...cellBase, width: '36%', verticalAlign: 'top', borderTop: 'none' }}>
                <div style={{ fontWeight: 700, fontSize: 9, marginBottom: 2 }}>{lblToOwner}</div>
                <div style={{ fontSize: 10 }}>{pa.owner}</div>
                <div style={{ fontSize: 9, color: '#444' }}>{pa.ownerAddress || ''}</div>
              </td>
              {/* Middle: From Subcontractor */}
              <td style={{ ...cellBase, width: '30%', verticalAlign: 'top', borderTop: 'none' }}>
                <div style={{ fontWeight: 700, fontSize: 9, marginBottom: 2 }}>{lblFromContractor}</div>
                <div style={{ fontSize: 10 }}>{isSub ? pa.subcontractor : (pa.contractor || 'Boulder Construction')}</div>
              </td>
              {/* Right: Period/Contract info */}
              <td style={{ ...cellBase, width: '34%', verticalAlign: 'top', borderTop: 'none', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '3px 6px', borderBottom: b, fontSize: 9 }}>
                        <strong>PERIOD TO:</strong> {formatDate(pa.periodTo)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 6px', borderBottom: b, fontSize: 9 }}>
                        <strong>PAYMENT DUE:</strong> {formatDate(pa.periodTo)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 6px', borderBottom: b, fontSize: 9 }}>
                        <strong>APP TYPE:</strong>{' '}
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>
                          {isSub ? 'Subcontractor Application' : 'Contractor Application'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 6px', borderBottom: b, fontSize: 9 }}>
                        <strong>JOB:</strong> {pa.contractFor || pa.projectName}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 6px', borderBottom: b, fontSize: 9 }}>
                        <strong>CONTRACT DATE:</strong> {formatDate(pa.contractDate)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 6px', fontSize: 9 }}>
                        <strong>CONTRACT #:</strong> {pa.applicationNo}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* === Main G702 Body — Two Columns Side by Side === */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              {/* ──── LEFT COLUMN: Lines 1–9 ──── */}
              <td style={{ border: b, width: '50%', verticalAlign: 'top', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {/* Line 1 */}
                    <tr>
                      <td style={labelCellStyle}><strong>1.</strong>&nbsp;&nbsp;<strong>ORIGINAL CONTRACT SUM:</strong></td>
                      <td style={valCellStyle}>{fmt(pa.originalContractSum)}</td>
                    </tr>
                    {/* Line 2 */}
                    <tr>
                      <td style={labelCellStyle}><strong>2.</strong>&nbsp;&nbsp;Net Change by Change Orders:</td>
                      <td style={valCellStyle}>{fmt(pa.netChangeOrders)}</td>
                    </tr>
                    {/* Line 3 */}
                    <tr>
                      <td style={{ ...labelCellStyle, fontWeight: 700 }}><strong>3.</strong>&nbsp;&nbsp;Contract Sum to Date (1+2):</td>
                      <td style={{ ...valCellStyle, fontWeight: 700 }}>{fmt(pa.contractSumToDate)}</td>
                    </tr>
                    {/* Line 4 */}
                    <tr>
                      <td style={labelCellStyle}>
                        <strong>4.</strong>&nbsp;&nbsp;Total Completed and Stored To Date<br />
                        <span style={{ fontSize: 8, color: '#555', paddingLeft: 16 }}>(Column G on G703)</span>
                      </td>
                      <td style={valCellStyle}>{fmt(pa.totalCompletedAndStored)}</td>
                    </tr>
                    {/* Line 5 header */}
                    <tr>
                      <td style={{ padding: '3px 6px 0', fontSize: 10, borderBottom: 'none' }}><strong>5.</strong>&nbsp;&nbsp;Retainage:</td>
                      <td style={{ borderLeft: b, borderBottom: 'none' }}></td>
                    </tr>
                    {/* 5a */}
                    <tr>
                      <td style={{ padding: '1px 6px 1px 22px', fontSize: 9, borderBottom: 'none' }}>
                        a. {retPct === 'Variable' ? '___' : retPct}% of Completed Work $<br />
                        <span style={{ fontSize: 8, color: '#555' }}>(Column D + E on G703)</span>
                      </td>
                      <td style={{ borderLeft: b, padding: '1px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 10, borderBottom: 'none' }}>
                        {fmt(pa.retainageOnCompleted)}
                      </td>
                    </tr>
                    {/* 5b */}
                    <tr>
                      <td style={{ padding: '1px 6px 1px 22px', fontSize: 9, borderBottom: 'none' }}>
                        b. {retPct === 'Variable' ? '___' : retPct}% of Stored Materials $<br />
                        <span style={{ fontSize: 8, color: '#555' }}>(Column F on G703)</span>
                      </td>
                      <td style={{ borderLeft: b, padding: '1px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 10, borderBottom: 'none' }}>
                        {fmt(pa.retainageOnStored || 0)}
                      </td>
                    </tr>
                    {/* Total Retainage */}
                    <tr>
                      <td style={{ ...labelCellStyle, paddingLeft: 16, fontSize: 10 }}>
                        Total Retainage (Lines 5a + 5b or<br />
                        <span style={{ fontSize: 8, color: '#555' }}>(Total in Column I of G703)</span>
                      </td>
                      <td style={{ ...valCellStyle, textDecoration: 'underline' }}>{fmt(pa.totalRetainage)}</td>
                    </tr>
                    {/* Line 6 */}
                    <tr>
                      <td style={{ ...labelCellStyle, fontWeight: 700 }}>
                        <strong>6.</strong>&nbsp;&nbsp;TOTAL EARNED LESS RETAINAGE (Line 4<br />
                        <span style={{ fontSize: 8, fontWeight: 400, paddingLeft: 16 }}>Less Line 5 Total):</span>
                      </td>
                      <td style={{ ...valCellStyle, fontWeight: 700 }}>{fmt(pa.totalEarnedLessRetainage)}</td>
                    </tr>
                    {/* Line 7 */}
                    <tr>
                      <td style={labelCellStyle}>
                        <strong>7.</strong>&nbsp;&nbsp;LESS Previous Applications for Payment:<br />
                        <span style={{ fontSize: 8, color: '#555', paddingLeft: 16 }}>(Line 6 from prior Certificate)</span>
                      </td>
                      <td style={valCellStyle}>{fmt(pa.lessPreviousCertificates)}</td>
                    </tr>
                    {/* Line 8 — CURRENT PAYMENT DUE */}
                    <tr style={{ background: '#fef9c3' }}>
                      <td style={{ borderBottom: '2px solid #000', padding: '5px 6px', fontSize: 11, fontWeight: 800 }}>
                        <strong>8.</strong>&nbsp;&nbsp;<strong>Current Payment Due:</strong>
                      </td>
                      <td style={{ borderBottom: '2px solid #000', borderLeft: '2px solid #000', padding: '5px 6px', textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: 12, textDecoration: 'underline' }}>
                        {fmt(pa.currentPaymentDue)}
                      </td>
                    </tr>
                    {/* Line 9 */}
                    <tr>
                      <td style={{ padding: '4px 6px', fontSize: 10 }}>
                        <strong>9.</strong>&nbsp;&nbsp;Balance to Finish, Including Retainage<br />
                        <span style={{ fontSize: 8, color: '#555', paddingLeft: 16 }}>(3-6):</span>
                      </td>
                      <td style={{ borderLeft: b, padding: '4px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>
                        {fmt(pa.balanceToFinish)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* ──── RIGHT COLUMN: Certification + Subcontractor ──── */}
              <td style={{ border: b, width: '50%', verticalAlign: 'top', padding: 0 }}>
                {/* Certification text */}
                <div style={{ padding: '6px 8px', fontSize: 9, lineHeight: 1.45, textAlign: 'justify', borderBottom: b }}>
                  The undersigned {lblCertEntity} certifies that to the best of the {lblCertEntity}'s knowledge,
                  information, and belief the Work covered by this Application for Payment has been completed
                  in accordance with the Contract Documents, that all amounts have been paid by the {lblCertEntity} for
                  Work for which previous Certificates for Payment were issued and payments received from the
                  Owner{isSub ? '/Contractor' : ''}, and that current payment shown herein is now due.
                </div>

                {/* Application is made for payment... */}
                <div style={{ padding: '6px 8px', fontSize: 8, lineHeight: 1.4, fontStyle: 'italic', color: '#444', borderBottom: b }}>
                  Application is made for payment, as shown below, in connection with the {isSub ? 'Subcontract' : 'Contract'}. Continuation Sheet,{' '}
                  {lblG703}, is attached.
                </div>

                {/* SUBCONTRACTOR / CONTRACTOR info block */}
                <div style={{ padding: '8px 8px' }}>
                  <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 6 }}>{lblCertEntity.toUpperCase()}:</div>
                  <div style={{ fontSize: 10, marginBottom: 8 }}>{isSub ? pa.subcontractor : (pa.contractor || 'Boulder Construction')}</div>

                  <div style={{ fontSize: 9, lineHeight: 2 }}>
                    <div>By: _________________________</div>
                    <div>Date: _________________________</div>
                    <div style={{ marginTop: 4 }}>State of: ____________</div>
                    <div>County of: ____________</div>
                    <div style={{ marginTop: 4 }}>Subscribed and sworn to before me this ____ day of</div>
                    <div>__________________________________________</div>
                    <div style={{ marginTop: 4 }}>Notary Public: _________________________</div>
                    <div>My Commission Expires: _________________</div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* === CHANGE ORDER SUMMARY + CERTIFICATE FOR PAYMENT (page 2) === */}
        <div
          className="html2pdf__page-break"
          style={{ pageBreakBefore: 'always', breakBefore: 'page', height: 0, overflow: 'hidden', margin: 0, padding: 0 }}
        />
        <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <tbody>
              <tr>
                {/* Left: Change Order Summary */}
                <td style={{ border: b, width: '50%', verticalAlign: 'top', padding: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 10, padding: '5px 6px', borderBottom: b, background: '#f5f5f5' }}>
                    CHANGE ORDER SUMMARY
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ ...cellBase, borderTop: 'none', borderLeft: 'none', fontWeight: 700, fontSize: 9 }}></td>
                        <td style={{ ...cellC, borderTop: 'none', fontWeight: 700, fontSize: 9, width: 80 }}>Additions</td>
                        <td style={{ ...cellC, borderTop: 'none', borderRight: 'none', fontWeight: 700, fontSize: 9, width: 80 }}>Deductions</td>
                      </tr>
                      <tr>
                        <td style={{ ...cellBase, borderLeft: 'none', fontSize: 9 }}>Total changes approved<br />in previous months by<br />Owner</td>
                        <td style={{ ...cellR, fontSize: 9 }}>{fmt(cos.previousAdditions || 0)}</td>
                        <td style={{ ...cellR, borderRight: 'none', fontSize: 9 }}>{fmt(cos.previousDeductions || 0)}</td>
                      </tr>
                      <tr>
                        <td style={{ ...cellBase, borderLeft: 'none', fontSize: 9 }}>Total approved this<br />Month</td>
                        <td style={{ ...cellR, fontSize: 9 }}>{fmt(cos.thisMonthAdditions || 0)}</td>
                        <td style={{ ...cellR, borderRight: 'none', fontSize: 9 }}>{fmt(cos.thisMonthDeductions || 0)}</td>
                      </tr>
                      <tr style={{ fontWeight: 700 }}>
                        <td style={{ ...cellBase, borderLeft: 'none', fontWeight: 700, fontSize: 9 }}>TOTALS</td>
                        <td style={{ ...cellR, fontWeight: 700, fontSize: 9 }}>{fmt(totalAdditions)}</td>
                        <td style={{ ...cellR, borderRight: 'none', fontWeight: 700, fontSize: 9 }}>{fmt(totalDeductions)}</td>
                      </tr>
                      <tr>
                        <td style={{ ...cellBase, borderLeft: 'none', fontWeight: 700, fontSize: 9 }}>NET CHANGES by Change Order:</td>
                        <td colSpan={2} style={{ ...cellR, borderRight: 'none', fontWeight: 700, fontSize: 9 }}>{fmt(netChanges)}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>

                {/* Right: Certificate for Payment */}
                <td style={{ border: b, width: '50%', verticalAlign: 'top', padding: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 10, padding: '5px 6px', borderBottom: b, background: '#f5f5f5' }}>
                    CERTIFICATE FOR PAYMENT
                  </div>
                  <div style={{ padding: '6px 8px', fontSize: 8.5, lineHeight: 1.45, textAlign: 'justify' }}>
                    In accordance with the Contract Documents, based on on-site
                    observations and the data comprising the above application, the
                  </div>
                  <div style={{ padding: '4px 8px', fontSize: 8.5, lineHeight: 1.45, textAlign: 'justify' }}>
                    Construction Manager certifies that to the best of his knowledge,
                    information, and belief the Work has progressed as indicated, the
                    quality of the Work is in accordance with the Contract Documents,
                    and the Contractor is entitled to payment of the AMOUNT CERTIFIED.
                  </div>
                  <div style={{ padding: '6px 8px', fontSize: 9, lineHeight: 1.8 }}>
                    <div><strong>Amount Certified: $</strong> _______________</div>
                    <div style={{ marginTop: 4 }}><strong>Construction Manager:</strong></div>
                    <div>By:________________&nbsp;&nbsp;&nbsp;&nbsp;Date: ___________</div>
                    <div style={{ marginTop: 4 }}><strong>Architect:</strong></div>
                    <div>By:________________&nbsp;&nbsp;&nbsp;&nbsp;Date: ___________</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ──────────────────────────────────────────────────────────────
     PAGE 2: G703 — CONTINUATION SHEET
     ────────────────────────────────────────────────────────────── */
  const renderG703 = () => {
    const thStyle = { border: b, padding: '2px 3px', fontSize: 7, fontWeight: 700, textAlign: 'center', color: '#fff', background: greenHeaderBg, verticalAlign: 'bottom' };
    const tdN = { border: b, padding: '2px 3px', fontSize: 9, textAlign: 'center', verticalAlign: 'top' };
    const tdL = { border: b, padding: '2px 3px', fontSize: 9, verticalAlign: 'top' };
    const tdR = { border: b, padding: '2px 3px', fontSize: 9, textAlign: 'right', fontVariantNumeric: 'tabular-nums', verticalAlign: 'top' };
    const tdRBold = { ...tdR, fontWeight: 700 };

    const renderRow = (li, isSubRow) => {
      const tp = getThisPeriod(li);
      const pct = li.scheduledValue ? ((li.totalCompleted / li.scheduledValue) * 100) : 0;
      return (
        <tr key={li.itemNo + (isSubRow ? '-sub' : '')} style={{ pageBreakInside: 'avoid' }}>
          <td style={tdN}>{li.itemNo}</td>
          <td style={{ ...tdL, fontStyle: isSubRow ? 'italic' : 'normal', paddingLeft: isSubRow ? 10 : 3 }}>
            {isSubRow ? '- ' : ''}{li.description}
          </td>
          <td style={tdR}>{fmtDash(li.scheduledValue)}</td>
          <td style={tdR}>{fmtDash(li.previousApplication)}</td>
          <td style={tdR}>{fmtDash(tp)}</td>
          <td style={tdR}>{fmtDash(li.materialsStored)}</td>
          <td style={tdR}>{fmtDash(li.totalCompleted)}</td>
          <td style={tdN}>{li.totalCompleted !== 0 ? fmtPct(pct) : '0.0%'}</td>
          <td style={tdR}>{fmtDash(li.balanceToFinish)}</td>
          <td style={tdR}>{fmtDash(li.retainage)}</td>
        </tr>
      );
    };

    return (
      <div style={pageStyle}>

        {/* Header bar */}
        <div style={{ background: darkHeaderBg, color: '#fff', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9 }}>
          <span style={{ fontWeight: 700, letterSpacing: 0.3 }}>{lblHeaderG703}</span>
          <span style={{ fontStyle: 'italic' }}>{lblG703}</span>
        </div>

        {/* Info rows */}
        <div style={{ textAlign: 'right', padding: '4px 6px', fontSize: 9, borderBottom: b, border: b, borderTop: 'none' }}>
          <div><strong>APPLICATION NO:</strong> {pa.applicationNo}&nbsp;&nbsp;&nbsp;<strong>APPLICATION DATE:</strong> {formatDate(pa.applicationDate)}</div>
          <div><strong>PERIOD TO:</strong> {formatDate(pa.periodTo)}&nbsp;&nbsp;&nbsp;<strong>PROJECT NO:</strong></div>
        </div>

        {/* G703 Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: b, tableLayout: 'fixed' }}>
          <thead>
            {/* Letter row */}
            <tr>
              <th style={{ ...thStyle, width: '5%' }}>A</th>
              <th style={{ ...thStyle, width: '20%' }}>B</th>
              <th style={{ ...thStyle, width: '10%' }}>C</th>
              <th style={{ ...thStyle, width: '10%' }}>D</th>
              <th style={{ ...thStyle, width: '10%' }}>E</th>
              <th style={{ ...thStyle, width: '10%' }}>F</th>
              <th style={{ ...thStyle, width: '10%' }}>G</th>
              <th style={{ ...thStyle, width: '5%' }}>H</th>
              <th style={{ ...thStyle, width: '10%' }}>I</th>
              <th style={{ ...thStyle, width: '10%' }}>J</th>
            </tr>
            {/* Category row */}
            <tr>
              <th style={thStyle}></th>
              <th style={thStyle}></th>
              <th style={thStyle}></th>
              <th colSpan={2} style={thStyle}>WORK COMPLETED</th>
              <th style={thStyle}>MATERIALS</th>
              <th style={thStyle}>TOTAL</th>
              <th style={thStyle}></th>
              <th style={thStyle}></th>
              <th style={thStyle}></th>
            </tr>
            {/* Full description row */}
            <tr>
              <th style={{ ...thStyle, fontSize: 6.5, lineHeight: 1.2 }}>ITEM<br />NO.</th>
              <th style={{ ...thStyle, fontSize: 6.5, lineHeight: 1.2 }}>DESCRIPTION<br />OF WORK</th>
              <th style={{ ...thStyle, fontSize: 6.5, lineHeight: 1.2 }}>SCHEDULED<br />VALUE</th>
              <th style={{ ...thStyle, fontSize: 6.5, lineHeight: 1.2 }}>FROM PREVIOUS<br />APPLICATION<br />(D+E)</th>
              <th style={{ ...thStyle, fontSize: 6.5, lineHeight: 1.2 }}>THIS<br />PERIOD</th>
              <th style={{ ...thStyle, fontSize: 6.5, lineHeight: 1.2 }}>PRESENTLY<br />STORED<br />(NOT IN D OR E)</th>
              <th style={{ ...thStyle, fontSize: 6.5, lineHeight: 1.2 }}>COMPLETED<br />AND STORED<br />TO DATE<br />(D+E+F)</th>
              <th style={{ ...thStyle, fontSize: 6.5, lineHeight: 1.2 }}>%<br />(G{'\u00F7'}C)</th>
              <th style={{ ...thStyle, fontSize: 6.5, lineHeight: 1.2 }}>BALANCE<br />TO FINISH<br />(C-G)</th>
              <th style={{ ...thStyle, fontSize: 6.5, lineHeight: 1.2 }}>RETAINAGE<br />(IF VARIABLE<br />RATE)</th>
            </tr>
          </thead>
          <tbody>
            {/* Base items */}
            {baseItems.map((li) => renderRow(li, false))}

            {/* Separator row if there are change orders */}
            {coItems.length > 0 && (
              <tr>
                <td colSpan={10} style={{ ...tdL, fontWeight: 700, fontSize: 8, background: '#f5f5f5', padding: '2px 4px' }}>
                  CHANGE ORDERS
                </td>
              </tr>
            )}

            {/* Change order items */}
            {coItems.map((li) => renderRow(li, false))}

            {/* GRAND TOTAL */}
            <tr style={{ fontWeight: 700, background: '#e8e8e8', pageBreakInside: 'avoid' }}>
              <td style={{ ...tdN, fontWeight: 700 }}></td>
              <td style={{ ...tdL, fontWeight: 700 }}>GRAND TOTAL</td>
              <td style={tdRBold}>{fmt(grandTotals.scheduledValue)}</td>
              <td style={tdRBold}>{fmt(grandTotals.previousApplication)}</td>
              <td style={tdRBold}>{fmt(grandTotals.thisPeriod)}</td>
              <td style={tdRBold}>{fmt(grandTotals.materialsStored)}</td>
              <td style={tdRBold}>{fmt(grandTotals.totalCompleted)}</td>
              <td style={{ ...tdN, fontWeight: 700 }}>{fmtPct(grandPct)}</td>
              <td style={tdRBold}>{fmt(grandTotals.balanceToFinish)}</td>
              <td style={tdRBold}>{fmt(grandTotals.retainage)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  /* ──────────────────────────────────────────────────────────────
     PAGE 3: BACKUP — PAYMENT HISTORY
     ────────────────────────────────────────────────────────────── */
  const renderBackup = () => {
    if (!hasBackup) return <div style={{ padding: 40, textAlign: 'center' }}>No backup payment history available.</div>;

    const draws = pa.backupDrawHistory;
    const currentDrawNo = pa.applicationNo;
    const priorDraws = draws.filter(d => d.draw < currentDrawNo);
    const currentDraw = draws.find(d => d.draw === currentDrawNo);

    const thStyle = { border: b, padding: '3px 5px', fontSize: 8, fontWeight: 700, textAlign: 'center', color: '#fff', background: greenHeaderBg };
    const tdN = { border: b, padding: '2px 5px', fontSize: 9, textAlign: 'center', verticalAlign: 'top' };
    const tdL = { border: b, padding: '2px 5px', fontSize: 9, verticalAlign: 'top' };
    const tdR = { border: b, padding: '2px 5px', fontSize: 9, textAlign: 'right', fontVariantNumeric: 'tabular-nums', verticalAlign: 'top' };

    /* Compute prior totals */
    let priorTotalAmt = 0, priorTotalRet = 0, priorTotalNet = 0;
    priorDraws.forEach(d => d.items.forEach(it => {
      priorTotalAmt += it.amount;
      priorTotalRet += it.retainage;
      priorTotalNet += it.netAmount;
    }));

    /* Compute current draw totals */
    let curTotalAmt = 0, curTotalRet = 0, curTotalNet = 0;
    if (currentDraw) {
      currentDraw.items.forEach(it => {
        curTotalAmt += it.amount;
        curTotalRet += it.retainage;
        curTotalNet += it.netAmount;
      });
    }

    return (
      <div style={pageStyle}>

        {/* PRIOR PAYMENTS */}
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Prior Payments</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: b, tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '7%' }}>Draw #</th>
              <th style={{ ...thStyle, width: '7%' }}>G703 #</th>
              <th style={{ ...thStyle, width: '28%' }}>Description</th>
              <th style={{ ...thStyle, width: '22%' }}>Commentary</th>
              <th style={{ ...thStyle, width: '12%' }}>Amount</th>
              <th style={{ ...thStyle, width: '12%' }}>Retainage</th>
              <th style={{ ...thStyle, width: '12%' }}>Net Amount</th>
            </tr>
          </thead>
          <tbody>
            {priorDraws.map((draw) =>
              draw.items.map((it, idx) => (
                <tr key={`prior-${draw.draw}-${idx}`} style={{ pageBreakInside: 'avoid' }}>
                  <td style={tdN}>{idx === 0 ? draw.draw : ''}</td>
                  <td style={tdN}>{it.g703No}</td>
                  <td style={tdL}>{it.description}</td>
                  <td style={tdL}>{it.commentary || ''}</td>
                  <td style={tdR}>{fmt(it.amount)}</td>
                  <td style={tdR}>{fmt(it.retainage)}</td>
                  <td style={tdR}>{fmt(it.netAmount)}</td>
                </tr>
              ))
            )}
            {/* Prior total */}
            <tr style={{ fontWeight: 700, background: '#e8e8e8', pageBreakInside: 'avoid' }}>
              <td colSpan={4} style={{ ...tdL, fontWeight: 700 }}>Total</td>
              <td style={{ ...tdR, fontWeight: 700 }}>{fmt(priorTotalAmt)}</td>
              <td style={{ ...tdR, fontWeight: 700 }}>{fmt(priorTotalRet)}</td>
              <td style={{ ...tdR, fontWeight: 700 }}>{fmt(priorTotalNet)}</td>
            </tr>
          </tbody>
        </table>

        {/* NEW PAYMENT REQUESTS */}
        {currentDraw && (
          <>
            <div style={{ fontWeight: 700, fontSize: 12, margin: '16px 0 6px' }}>New Payment Requests</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: b, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '8%' }}>G703 #</th>
                  <th style={{ ...thStyle, width: '30%' }}>Description</th>
                  <th style={{ ...thStyle, width: '22%' }}>Commentary</th>
                  <th style={{ ...thStyle, width: '14%' }}>Amount</th>
                  <th style={{ ...thStyle, width: '12%' }}>Retainage</th>
                  <th style={{ ...thStyle, width: '14%' }}>Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {currentDraw.items.map((it, idx) => (
                  <tr key={`cur-${idx}`} style={{ pageBreakInside: 'avoid' }}>
                    <td style={tdN}>{it.g703No}</td>
                    <td style={tdL}>{it.description}</td>
                    <td style={tdL}>{it.commentary || ''}</td>
                    <td style={tdR}>{fmt(it.amount)}</td>
                    <td style={tdR}>{fmt(it.retainage)}</td>
                    <td style={tdR}>{fmt(it.netAmount)}</td>
                  </tr>
                ))}
                {/* Current draw total */}
                <tr style={{ fontWeight: 700, background: '#e8e8e8', pageBreakInside: 'avoid' }}>
                  <td colSpan={3} style={{ ...tdL, fontWeight: 700 }}>Total</td>
                  <td style={{ ...tdR, fontWeight: 700 }}>{fmt(curTotalAmt)}</td>
                  <td style={{ ...tdR, fontWeight: 700 }}>{fmt(curTotalRet)}</td>
                  <td style={{ ...tdR, fontWeight: 700 }}>{fmt(curTotalNet)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: letter; margin: 0.35in 0.4in; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
        @media screen {
          .print-page { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Action Buttons + Tabs */}
      <div className="no-print" style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <button onClick={() => navigate('/pay-applications')} style={btnStyle}>
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={() => window.print()} style={btnStyle}>
          <Printer size={16} /> Print
        </button>
        <button onClick={() => {
          const tabId = activeTab === 'g702' ? 'payapp-g702-content'
                      : activeTab === 'g703' ? 'payapp-g703-content'
                      : 'payapp-backup-content';
          const name = `PayApp-${pa.applicationNo || pa.application_no}-${activeTab.toUpperCase()}`;
          downloadPdf(tabId, name);
        }} style={btnStyle}>
          <Download size={16} /> Download PDF
        </button>
        <button onClick={() => {
          // Temporarily show all tabs so the full content can be captured
          const g702El = document.getElementById('payapp-g702-content');
          const g703El = document.getElementById('payapp-g703-content');
          const backupEl = document.getElementById('payapp-backup-content');
          const prevStyles = {
            g702: g702El?.style.display,
            g703: g703El?.style.display,
            backup: backupEl?.style.display,
          };
          if (g702El) g702El.style.display = '';
          if (g703El) g703El.style.display = '';
          if (backupEl) backupEl.style.display = '';

          const name = `PayApp-${pa.applicationNo || pa.application_no}-FULL`;

          // Small delay to let the browser repaint with all tabs visible
          setTimeout(() => {
            downloadPdf('payapp-full-content', name);
            // Restore hidden tabs after html2canvas clones the DOM (~500ms)
            setTimeout(() => {
              if (g702El) g702El.style.display = prevStyles.g702;
              if (g703El) g703El.style.display = prevStyles.g703;
              if (backupEl) backupEl.style.display = prevStyles.backup;
            }, 500);
          }, 100);
        }} style={btnStyle}>
          <FileDown size={16} /> Download All
        </button>

        {/* Approve button — only shown for Submitted status */}
        {pa.status === 'Submitted' && (
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            style={{
              ...btnStyle,
              background: '#dcfce7',
              borderColor: '#86efac',
              color: '#16a34a',
              fontWeight: 600,
              opacity: actionLoading ? 0.6 : 1,
            }}
          >
            {actionLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Shield size={16} />}
            {actionLoading ? 'Approving...' : 'Approve'}
          </button>
        )}

        {/* Generate Lien Waiver button */}
        <button
          onClick={handleGenerateWaiver}
          disabled={waiverLoading}
          style={{
            ...btnStyle,
            background: '#fef3c7',
            borderColor: '#fcd34d',
            color: '#92400e',
            fontWeight: 600,
            opacity: waiverLoading ? 0.6 : 1,
          }}
        >
          {waiverLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileCheck size={16} />}
          {waiverLoading ? 'Generating...' : 'Generate Lien Waiver'}
        </button>

        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: sc.color, background: sc.bg }}>
          <StatusIcon size={14} /> {pa.status}
        </span>
      </div>

      {/* Tab buttons */}
      <div className="no-print" style={{ maxWidth: 720, margin: '12px auto 0', padding: '0 16px', display: 'flex', gap: 8, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <button onClick={() => setActiveTab('g702')} style={tabBtnStyle(activeTab === 'g702')}>
          G702 — Application
        </button>
        <button onClick={() => setActiveTab('g703')} style={tabBtnStyle(activeTab === 'g703')}>
          G703 — Continuation Sheet
        </button>
        {hasBackup && (
          <button onClick={() => setActiveTab('backup')} style={tabBtnStyle(activeTab === 'backup')}>
            Backup — Payment History
          </button>
        )}
      </div>

      {/* Page content */}
      <div className="print-page" id="payapp-full-content">
        <div id="payapp-g702-content" style={activeTab !== 'g702' ? { display: 'none' } : undefined}>
          {renderG702()}
        </div>
        <div id="payapp-g703-content" style={activeTab !== 'g703' ? { display: 'none' } : undefined}>
          {renderG703()}
        </div>
        <div id="payapp-backup-content" style={activeTab !== 'backup' ? { display: 'none' } : undefined}>
          {renderBackup()}
        </div>
      </div>
    </>
  );
}
