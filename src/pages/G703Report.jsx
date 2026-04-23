import { useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { contractService, invoiceService } from '../services/supabaseService';
import { useSupabase, useSupabaseById } from '../hooks/useSupabase';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const fmtPct = (n) => (isFinite(n) ? n.toFixed(1) + '%' : '0.0%');

const cellStyle = { padding: '6px 10px', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#374151', verticalAlign: 'middle' };
const numCell = { ...cellStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const headCell = { padding: '8px 10px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', whiteSpace: 'nowrap' };
const headNumCell = { ...headCell, textAlign: 'right' };

export default function G703Report() {
  const { contractId } = useParams();
  const navigate = useNavigate();

  const { data: contract } = useSupabaseById(contractService.getById, contractId);

  const { data: rawInvoices } = useSupabase(
    useCallback(() => invoiceService.listByContract(contractId), [contractId]),
  );

  if (!contract) {
    return (
      <div style={{ padding: '2rem', color: '#64748b' }}>
        <button onClick={() => navigate(`/contracts/${contractId}`)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Contract
        </button>
        Loading…
      </div>
    );
  }

  // Normalize invoices — handle both mock (camelCase) and Supabase (snake_case)
  const invoices = [...rawInvoices]
    .sort((a, b) => (a.applicationNo ?? a.application_no ?? 0) - (b.applicationNo ?? b.application_no ?? 0));

  const contractValue = parseFloat(contract.contractValue ?? contract.contract_value ?? 0);

  // Build cumulative G703 SOV lines — works from contract line items or inferred from invoice lines
  const contractLineItems = contract.contract_line_items || contract.lineItems || [];

  // If no contract line items, infer SOV structure from the first invoice's line items
  const sovSource = contractLineItems.length > 0
    ? contractLineItems
    : (invoices[0]?.pay_application_line_items || invoices[0]?.lineItems || []).map((li) => ({
        description: li.description,
        amount: parseFloat(li.scheduled_value ?? li.scheduledValue ?? 0),
      }));

  const sovLines = sovSource.map((li, idx) => {
    const scheduledValue = parseFloat(li.amount ?? li.scheduledValue ?? li.scheduled_value ?? 0);

    // Per-invoice breakdown for this SOV item
    const perInvoice = invoices.map((inv) => {
      const invLines = inv.pay_application_line_items || inv.lineItems || [];
      const match = invLines.find(
        (a) => (a.item_no ?? a.itemNo) === idx + 1 || a.description === li.description,
      );
      const tp = match ? parseFloat(match.this_period ?? match.thisPeriod ?? 0) : 0;
      const st = match ? parseFloat(match.materials_stored ?? match.materialsStored ?? 0) : 0;
      const ret = match ? parseFloat(match.retainage ?? 0) : 0;
      return { invId: inv.id, appNo: inv.applicationNo ?? inv.application_no, thisPeriod: tp, stored: st, retainage: ret };
    });

    // Cumulative totals across ALL invoices
    const totalCompleted = perInvoice.reduce((s, r) => s + r.thisPeriod + r.stored, 0);
    const totalRetainage = perInvoice.reduce((s, r) => s + r.retainage, 0);

    // Previous = everything except the latest invoice
    const latest = perInvoice.length > 0 ? perInvoice[perInvoice.length - 1] : null;
    const prevApplicationTotal = totalCompleted - (latest ? latest.thisPeriod + latest.stored : 0);
    const latestPeriod = latest ? latest.thisPeriod : 0;
    const latestStored = latest ? latest.stored : 0;
    const balance = scheduledValue - totalCompleted;
    const pct = scheduledValue > 0 ? (totalCompleted / scheduledValue) * 100 : 0;

    return {
      itemNo: idx + 1,
      description: li.description,
      scheduledValue,
      previousApplication: prevApplicationTotal,
      thisPeriod: latestPeriod,
      materialsStored: latestStored,
      totalCompleted,
      percentComplete: pct,
      balanceToFinish: balance,
      retainage: totalRetainage,
      perInvoice,
    };
  });

  // Totals row
  const totals = {
    scheduledValue: sovLines.reduce((s, l) => s + l.scheduledValue, 0),
    previousApplication: sovLines.reduce((s, l) => s + l.previousApplication, 0),
    thisPeriod: sovLines.reduce((s, l) => s + l.thisPeriod, 0),
    materialsStored: sovLines.reduce((s, l) => s + l.materialsStored, 0),
    totalCompleted: sovLines.reduce((s, l) => s + l.totalCompleted, 0),
    balanceToFinish: sovLines.reduce((s, l) => s + l.balanceToFinish, 0),
    retainage: sovLines.reduce((s, l) => s + l.retainage, 0),
  };
  totals.percentComplete = totals.scheduledValue > 0 ? (totals.totalCompleted / totals.scheduledValue) * 100 : 0;

  const totalBilled = invoices.reduce((s, inv) => s + parseFloat(inv.current_payment_due ?? inv.amount ?? 0), 0);
  const totalPaid = invoices.filter((inv) => inv.status === 'Paid').reduce((s, inv) => s + parseFloat(inv.current_payment_due ?? inv.amount ?? 0), 0);
  const balance = contractValue - totalBilled;

  const kpiCard = (label, value, color) => (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem 1.25rem', flex: 1 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: color || '#0f172a' }}>{value}</div>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <Link to={`/contracts/${contractId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: '#64748b', textDecoration: 'none', fontWeight: 500, marginBottom: 8 }}>
            <ArrowLeft size={16} /> Back to Contract
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>G703 Continuation Sheet</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
            {contract.title || contract.project_name || contract.project} — All Pay Applications Cumulative
          </p>
        </div>
        <button
          onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}
        >
          <Printer size={15} /> Print
        </button>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {kpiCard('Contract Value', fmt(contractValue), '#0f172a')}
        {kpiCard('Total Billed', fmt(totalBilled), '#2563eb')}
        {kpiCard('Total Paid', fmt(totalPaid), '#059669')}
        {kpiCard('Balance to Finish', fmt(balance), balance > 0 ? '#d97706' : '#059669')}
        {kpiCard('Overall % Complete', fmtPct(totals.percentComplete), totals.percentComplete >= 100 ? '#059669' : '#f07030')}
      </div>

      {/* Invoice summary */}
      <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
          Pay Applications ({invoices.length})
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['App #', 'Period', 'Status', 'This Period', 'Retainage', 'Net Due', 'Actions'].map((h, i) => (
                <th key={h} style={i >= 3 ? headNumCell : headCell}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={7} style={{ ...cellStyle, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No pay applications yet for this contract.</td></tr>
            ) : invoices.map((inv) => {
              const appNo = inv.applicationNo ?? inv.application_no ?? '—';
              const period = inv.period_to ?? inv.periodTo ?? inv.issueDate ?? inv.issue_date ?? '—';
              const thisAmt = parseFloat(inv.total_completed_and_stored ?? inv.amount ?? 0);
              const ret = parseFloat(inv.total_retainage ?? 0);
              const net = parseFloat(inv.current_payment_due ?? inv.amount ?? 0);
              const sc = { Paid: '#059669', Approved: '#059669', Pending: '#d97706', Overdue: '#dc2626', Draft: '#64748b', Submitted: '#3b82f6' }[inv.status] || '#64748b';
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={cellStyle}><strong>#{appNo}</strong></td>
                  <td style={cellStyle}>{period}</td>
                  <td style={cellStyle}>
                    <span style={{ background: sc + '18', color: sc, padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>{inv.status}</span>
                  </td>
                  <td style={numCell}>{fmt(thisAmt)}</td>
                  <td style={numCell}>{fmt(ret)}</td>
                  <td style={{ ...numCell, fontWeight: 700 }}>{fmt(net)}</td>
                  <td style={cellStyle}>
                    <Link to={`/invoices/${inv.id}`} style={{ fontSize: '0.8rem', color: '#f07030', fontWeight: 600, textDecoration: 'none', marginRight: 12 }}>View</Link>
                    <Link to={`/contracts/${contractId}/invoices/${inv.id}/lien-waiver/create`} style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textDecoration: 'none' }}>+ Waiver</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* G703 Cumulative Table */}
      <div className="card" style={{ overflow: 'auto', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>Schedule of Values — Cumulative to Date</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>AIA Document G703 — Continuation Sheet</div>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              <th style={headCell}>Item</th>
              <th style={headCell}>Description of Work</th>
              <th style={headNumCell}>Scheduled Value</th>
              <th style={headNumCell}>Prev. Application (D+E)</th>
              <th style={headNumCell}>This Period (E)</th>
              <th style={headNumCell}>Stored (F)</th>
              <th style={headNumCell}>Total (G+H+I)</th>
              <th style={headNumCell}>% (G+H)/F</th>
              <th style={headNumCell}>Balance</th>
              <th style={headNumCell}>Retainage</th>
            </tr>
          </thead>
          <tbody>
            {sovLines.length === 0 ? (
              <tr><td colSpan={10} style={{ ...cellStyle, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No schedule of values defined on this contract.</td></tr>
            ) : sovLines.map((line) => (
              <tr key={line.itemNo} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ ...cellStyle, fontWeight: 600, color: '#64748b' }}>{line.itemNo}</td>
                <td style={{ ...cellStyle, fontWeight: 500, maxWidth: 240 }}>{line.description}</td>
                <td style={numCell}>{fmt(line.scheduledValue)}</td>
                <td style={numCell}>{fmt(line.previousApplication)}</td>
                <td style={numCell}>{fmt(line.thisPeriod)}</td>
                <td style={numCell}>{fmt(line.materialsStored)}</td>
                <td style={{ ...numCell, fontWeight: 700 }}>{fmt(line.totalCompleted)}</td>
                <td style={{ ...numCell, color: line.percentComplete >= 100 ? '#059669' : line.percentComplete >= 50 ? '#d97706' : '#dc2626', fontWeight: 700 }}>
                  {fmtPct(line.percentComplete)}
                </td>
                <td style={{ ...numCell, color: line.balanceToFinish > 0 ? '#d97706' : '#059669' }}>{fmt(line.balanceToFinish)}</td>
                <td style={numCell}>{fmt(line.retainage)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
              <td style={{ ...cellStyle, fontWeight: 800, color: '#0f172a' }} colSpan={2}>TOTALS</td>
              <td style={{ ...numCell, fontWeight: 800 }}>{fmt(totals.scheduledValue)}</td>
              <td style={{ ...numCell, fontWeight: 800 }}>{fmt(totals.previousApplication)}</td>
              <td style={{ ...numCell, fontWeight: 800 }}>{fmt(totals.thisPeriod)}</td>
              <td style={{ ...numCell, fontWeight: 800 }}>{fmt(totals.materialsStored)}</td>
              <td style={{ ...numCell, fontWeight: 800, color: '#f07030' }}>{fmt(totals.totalCompleted)}</td>
              <td style={{ ...numCell, fontWeight: 800, color: totals.percentComplete >= 100 ? '#059669' : '#d97706' }}>{fmtPct(totals.percentComplete)}</td>
              <td style={{ ...numCell, fontWeight: 800, color: '#d97706' }}>{fmt(totals.balanceToFinish)}</td>
              <td style={{ ...numCell, fontWeight: 800 }}>{fmt(totals.retainage)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <style>{`@media print { button { display: none !important; } }`}</style>
    </div>
  );
}
