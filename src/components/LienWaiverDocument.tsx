import React, { useRef, useState, useEffect } from 'react';

interface LienWaiverDocumentProps {
  vendor: { name: string; address?: string };
  project: { name: string; owner: string; address?: string };
  invoices: { id: string; amount: number }[];
  mode: "invoice" | "retainage";
  type: "partial" | "final";
  condition: "conditional" | "unconditional";
  retainageAmount?: number;
  date: string;
  signer?: { name: string; title?: string; signature?: string };
  pay_application_id?: string;
}

const LienWaiverDocument: React.FC<LienWaiverDocumentProps> = ({
  vendor,
  project,
  invoices,
  type,
  retainageAmount,
  date,
  signer,
  pay_application_id
}) => {
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0).replace('$', '');
  };

  const numberToWords = (num: number): string => {
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    const convertChunk = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n/10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n/100)] + ' Hundred' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
    };
    if (num === 0) return 'Zero';
    if (num < 1000) return convertChunk(num);
    if (num < 1000000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      return convertChunk(thousands) + ' Thousand' + (remainder ? ' ' + convertChunk(remainder) : '');
    }
    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;
    return convertChunk(millions) + ' Million' + (remainder ? ' ' + numberToWords(remainder) : '');
  };

  const parsedDate = new Date(date);
  const defaultMonth = parsedDate.toLocaleString('en-US', { month: 'long' }) || 'April';
  const defaultDay = String(parsedDate.getDate() || 22);
  const defaultYear = String(parsedDate.getFullYear() || 2026);

  // Calculate amount from invoices if retainageAmount not provided
  const invoiceTotal = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const amount = retainageAmount || invoiceTotal || 0;
  
  // Editable date state
  const [editMonth, setEditMonth] = useState(defaultMonth);
  const [editDay, setEditDay] = useState(defaultDay);
  const [editYear, setEditYear] = useState(defaultYear);
  const [isEditingDate, setIsEditingDate] = useState(false);
  
  const [savedSignature, setSavedSignature] = useState<string | null>(signer?.signature || null);

  useEffect(() => {
    if (signer?.signature) {
      setSavedSignature(signer.signature);
    }
  }, [signer?.signature]);

  // Common styles - Balanced for full A4 fit
  const s = {
    page: { width: '794px', height: '1123px', background: '#fff', padding: '25px 40px', boxSizing: 'border-box' as const, fontFamily: "'Inter', -apple-system, sans-serif", color: '#1e293b', display: 'flex', flexDirection: 'column' as const },
    headerBox: { border: '3px solid #0f172a', padding: '12px 16px', marginBottom: '14px', position: 'relative' as const },
    cornerTL: { position: 'absolute' as const, top: '-3px', left: '-3px', width: '16px', height: '16px', borderTop: '4px solid #0f172a', borderLeft: '4px solid #0f172a' },
    cornerTR: { position: 'absolute' as const, top: '-3px', right: '-3px', width: '16px', height: '16px', borderTop: '4px solid #0f172a', borderRight: '4px solid #0f172a' },
    cornerBL: { position: 'absolute' as const, bottom: '-3px', left: '-3px', width: '16px', height: '16px', borderBottom: '4px solid #0f172a', borderLeft: '4px solid #0f172a' },
    cornerBR: { position: 'absolute' as const, bottom: '-3px', right: '-3px', width: '16px', height: '16px', borderBottom: '4px solid #0f172a', borderRight: '4px solid #0f172a' },
    headerInner: { border: '1px solid #cbd5e1', position: 'absolute' as const, inset: '3px', pointerEvents: 'none' as const },
    headerFlex: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { fontSize: '20px', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.02em', flex: 1, textAlign: 'center' as const, paddingRight: '20px' },
    infoBox: { border: '1px solid #cbd5e1', padding: '12px 16px', background: '#fff', width: '120px', flexShrink: 0 },
    infoLabel: { fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', textAlign: 'center' as const, marginBottom: '3px' },
    infoValue: { fontSize: '12px', fontWeight: 800, color: '#0f172a', textAlign: 'center' as const },
    infoDivider: { borderTop: '1px solid #e2e8f0', margin: '5px 0' },
    infoValueBlue: { fontSize: '11px', fontWeight: 800, color: '#0f172a', textAlign: 'center' as const },
    
    // Text sections - Balanced
    textBlock: { fontSize: '13px', lineHeight: '1.6', color: '#334155', marginBottom: '16px', textAlign: 'justify' as const },
    textLine: { display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' as const },
    underlineField: { borderBottom: '1px solid #94a3b8', display: 'inline', textAlign: 'center' as const, fontWeight: 700, color: '#0f172a', padding: '0 4px' },
    
    // Date fields
    dateRow: { display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '12px', marginTop: '8px', marginBottom: '10px', position: 'relative' as const },
    dateBox: { textAlign: 'center' as const },
    dateValue: { borderBottom: '2px solid #0f172a', padding: '0 12px', fontSize: '16px', fontWeight: 700, color: '#0f172a', minWidth: '60px' },
    dateInput: { border: 'none', borderBottom: '2px solid #0f172a', padding: '0 8px', fontSize: '16px', fontWeight: 700, color: '#0f172a', textAlign: 'center' as const, background: 'transparent', fontFamily: 'inherit', minWidth: '60px', outline: 'none' },
    dateLabel: { fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginTop: '4px' },
    dateComma: { fontSize: '18px', fontWeight: 700, marginBottom: '6px' },
    dateEditButton: { position: 'absolute' as const, right: '0', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', padding: '2px 8px', border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '3px', cursor: 'pointer', color: '#64748b' },
    inlineDate: { borderBottom: '1px solid #94a3b8', display: 'inline', fontWeight: 700, color: '#0f172a', padding: '0 4px' },
    
    // Section bars
    affidavitBar: { background: '#0f172a', color: '#fff', textAlign: 'center' as const, padding: '6px 0', fontSize: '12px', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase' as const, marginTop: '16px', marginBottom: '16px' },
    executionBar: { background: '#f1f5f9', color: '#64748b', textAlign: 'center' as const, padding: '4px 0', fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', marginTop: '16px', marginBottom: '16px' },
    
    // Retainage box - Balanced
    retainageBox: { border: '2px solid #0f172a', padding: '16px 18px', marginTop: '16px', marginBottom: '16px' },
    retainageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '12px' },
    retainageBar: { width: '4px', height: '16px', background: '#f97316' },
    retainageTitle: { fontSize: '18px', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#0f172a', textAlign: 'center' as const },
    retainageLine: { display: 'flex', alignItems: 'baseline', gap: '4px', fontSize: '13px', marginBottom: '6px' },
    retainageLabel: { color: '#64748b', whiteSpace: 'nowrap' as const },
    retainageField: { borderBottom: '1px solid #cbd5e1', flex: 1, textAlign: 'center' as const, fontWeight: 700, color: '#0f172a', fontSize: '13px' },
    
    // Amount display
    amountRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px', margin: '8px 0' },
    amountDollar: { fontSize: '16px', fontWeight: 700, color: '#64748b' },
    amountValue: { fontSize: '26px', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', padding: '0 8px' },
    amountWords: { fontSize: '12px', fontWeight: 700, color: '#0f172a', fontStyle: 'italic', textAlign: 'center' as const, marginBottom: '4px' },
    amountNote: { fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' as const, marginBottom: '6px' },
    
    // Checkboxes
    checkboxRow: { borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', gap: '24px' },
    checkboxItem: { display: 'flex', alignItems: 'center', gap: '4px' },
    checkboxEmpty: { width: '14px', height: '14px', border: '1px solid #cbd5e1', borderRadius: '2px' },
    checkboxChecked: { width: '14px', height: '14px', border: '1px solid #0f172a', background: '#0f172a', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    checkboxLabel: { fontSize: '12px', color: '#475569', lineHeight: '1.5' },
    checkboxLabelBold: { fontSize: '12px', fontWeight: 700, color: '#0f172a' },
    
    // Therefore section
    thereforeBox: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px 18px', marginTop: '16px', marginBottom: '16px' },
    thereforeText: { fontSize: '12px', lineHeight: '1.5', color: '#475569', textAlign: 'justify' as const },
    thereforeBold: { fontWeight: 900, color: '#0f172a' },
    
    // Signature section - Expanded to fill space
    signatureArea: { marginTop: '16px', marginBottom: '20px', padding: '24px 0' },
    cursiveText: { fontFamily: "'Dancing Script', cursive", fontSize: '34px', color: '#94a3b8', textAlign: 'center' as const, opacity: 0.6, marginBottom: '20px' },
    signatureGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' },
    signatureCol: { textAlign: 'center' as const },
    signatureLine: { borderBottom: '2px solid #0f172a', height: '60px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '8px' },
    signatureLineThick: { borderBottom: '2px solid #0f172a', height: '60px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '8px', position: 'relative' as const },
    signatureValue: { fontSize: '13px', fontWeight: 700, color: '#0f172a' },
    signatureLabel: { fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontStyle: 'italic' },
    signatureImage: { position: 'absolute' as const, bottom: '6px', maxHeight: '54px', maxWidth: '240px', objectFit: 'contain' as const },
    
    // E-signature pad - Balanced
    esignSection: { marginTop: '20px', borderTop: '2px solid #0f172a', paddingTop: '12px', paddingBottom: '8px' },
    esignLabel: { fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.2em', textTransform: 'uppercase' as const, textAlign: 'center' as const, marginBottom: '4px' },
    esignPlaceholder: { width: '100%', height: '80px', border: '1px dashed #e2e8f0', background: '#f8fafc', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' },
    esignNote: { fontSize: '9px', color: '#94a3b8', textAlign: 'center' as const, fontStyle: 'italic' },
  };

  return (
    <div id="lien-waiver-document" style={{ background: '#f3f4f6', display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <div style={s.page}>
        {/* HEADER */}
        <div style={s.headerBox}>
          <div style={s.cornerTL} />
          <div style={s.cornerTR} />
          <div style={s.cornerBL} />
          <div style={s.cornerBR} />
          <div style={s.headerInner} />
          <div style={s.headerFlex}>
            <h1 style={s.headerTitle}>Affidavit, Release and Waiver of Lien</h1>
            <div style={s.infoBox}>
              <div style={s.infoLabel}>Invoice Ref.</div>
              <div style={s.infoValue}>{pay_application_id || invoices[0]?.id || 'INV-006'}</div>
              <div style={s.infoDivider} />
              <div style={s.infoLabel}>Waiver Type</div>
              <div style={s.infoValueBlue}>{type.toUpperCase()}</div>
            </div>
          </div>
        </div>

        {/* AFFIDAVIT TEXT with inline date */}
        <div style={s.textBlock}>
          I, <span style={s.underlineField}>{vendor.name || '________________'}</span>, being duly sworn, state that <span style={s.underlineField}>{vendor.name || '________________'}</span> contracted with <span style={s.underlineField}>{project.owner || '________________'}</span> to furnish certain materials and/or labor for the following project known as <span style={s.underlineField}>{project.name || '________________'}</span> and do hereby further state on behalf of the aforementioned Furnisher for labor or materials supplied to the project thru the date of <span style={s.inlineDate}>{editMonth}</span> <span style={s.inlineDate}>{editDay}</span>, <span style={s.inlineDate}>{editYear}</span>.
        </div>

        {/* AFFIDAVIT BAR */}
        <div style={s.affidavitBar}>Affidavit</div>

        {/* PARTIAL/FINAL WAIVER */}
        <div style={s.retainageBox}>
          <div style={s.retainageHeader}>
            <span style={s.retainageTitle}>{type === 'final' ? 'Final Waiver' : 'Partial Waiver'}</span>
          </div>
          <div style={s.textBlock}>
            There is due from <span style={s.underlineField}>{project.owner || '________________'}</span> the sum of <span style={s.underlineField}>{numberToWords(Math.round(amount))}</span> Dollars $<span style={s.underlineField}>{formatCurrency(amount)}</span>
            <br />
            <div style={{...s.checkboxItem, alignItems: 'flex-start', marginTop: '14px', gap: '8px'}}>
              <div style={{...s.checkboxChecked, marginTop: '2px', flexShrink: 0}}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div> 
              <span style={s.checkboxLabel}>
                The payment of which has been promised as the sole consideration of this Affidavit, Release and {type === 'final' ? 'Final' : 'Partial'} Waiver of Lien which is given solely with respect to said amount and is effective upon receipt of such payment <i style={{fontWeight: 400}}>(conditional)</i>.
              </span>
            </div>
          </div>
        </div>

        {/* THEREFORE */}
        <div style={s.thereforeBox}>
          <p style={s.thereforeText}>
            <span style={s.thereforeBold}>THEREFORE</span>, the undersigned waives and releases unto the Owner of said premises any and all liens or claims whatsoever on the above described property and improvements thereon on account of labor, material and/or services provided by the undersigned, subject to the Limitations or conditions expressed herein, if any, and further releases claims of any nature against the Owner/Prime Contractor.
            <br /><br />
            <span style={{fontWeight: 700, color: '#0f172a'}}>I SWEAR OR AFFIRM UNDER THE PENALTIES OF PERJURY THAT THE FOREGOING STATEMENTS ARE TRUE TO THE BEST OF MY KNOWLEDGE.</span>
          </p>
        </div>

        {/* EXECUTION */}
        <div style={s.executionBar}>Execution by Authorized Representative</div>

        {/* SIGNATURES */}
        <div style={s.signatureArea}>
          <div style={s.signatureGrid}>
            <div style={s.signatureCol}>
              <div style={s.signatureLine}>
                <span style={s.signatureValue}>{vendor.name}</span>
              </div>
              <span style={s.signatureLabel}>Company / Claimant</span>
            </div>
            <div style={s.signatureCol}>
              <div style={s.signatureLineThick}>
                {savedSignature && <img src={savedSignature} alt="" style={s.signatureImage} />}
              </div>
              <span style={s.signatureLabel}>Authorized Signature</span>
            </div>
            <div style={s.signatureCol}>
              <div style={s.signatureLine}>
                <span style={s.signatureValue}>{signer?.title || ''}</span>
              </div>
              <span style={s.signatureLabel}>Title</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LienWaiverDocument;
