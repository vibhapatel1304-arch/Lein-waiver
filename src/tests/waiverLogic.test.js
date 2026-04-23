/**
 * Test script: Waiver Category Logic (Partial vs Final)
 *
 * Run with: node src/tests/waiverLogic.test.js
 *
 * Tests the core logic that determines whether a lien waiver
 * should be Partial or Final based on contract-level totals.
 */

// ── Simulate the logic from LienWaiverCreate useEffect ──────

function determineWaiverCategory({
  linkedInvoice,
  rawContracts,
  rawPayApps,
  routeContractId,
  urlContractValue,
  urlTotalBilled,
}) {
  if (!linkedInvoice) return { category: null, reason: 'No linked invoice' };

  const storedDue = parseFloat(linkedInvoice.current_payment_due ?? linkedInvoice.amount ?? 0);
  const due = storedDue;

  const cId = linkedInvoice.contract_id || routeContractId;
  const contract = cId ? rawContracts.find((c) => c.id === cId) : null;
  const liveContractValue = contract ? parseFloat(contract.contract_value ?? 0) : urlContractValue;

  let liveTotalBilled = urlTotalBilled;
  if (contract && rawPayApps.length > 0) {
    liveTotalBilled = rawPayApps
      .filter((pa) => (pa.contract_id || pa.contractId) === cId)
      .reduce((s, pa) => s + parseFloat(pa.total_completed_and_stored ?? pa.totalCompletedAndStored ?? pa.current_payment_due ?? 0), 0);
  }

  const remainingAfterThis = liveContractValue > 0 ? liveContractValue - liveTotalBilled : null;
  const isFinal = remainingAfterThis !== null ? remainingAfterThis <= 0 : false;

  return {
    category: isFinal ? 'Final' : 'Partial',
    due,
    cId,
    contractFound: !!contract,
    liveContractValue,
    liveTotalBilled,
    remainingAfterThis,
    isFinal,
  };
}

// ── Simulate the logic from supabaseService.generateFromPayApp ──

function determineGenerateCategory({ payApp, contract, allInvoices }) {
  let isFinal = false;
  if (contract) {
    const contractValue = parseFloat(contract.contract_value ?? 0);
    const totalBilled = (allInvoices || []).reduce(
      (s, inv) => s + parseFloat(inv.total_completed_and_stored ?? inv.current_payment_due ?? 0), 0
    );
    isFinal = contractValue > 0 && totalBilled >= contractValue;
  }
  if (!isFinal && parseFloat(payApp.balance_to_finish ?? 0) <= 0) {
    isFinal = true;
  }
  return isFinal ? 'Final' : 'Partial';
}

// ── Simulate recordPayment / markPaid contract check ──

function determinePaymentWaiverCategory({ allInvoices, contract }) {
  const contractValue = parseFloat(contract.contract_value ?? 0);
  const totalCompleted = (allInvoices || [])
    .filter((inv) => inv.status === 'Paid')
    .reduce((s, inv) => s + parseFloat(inv.total_completed_and_stored ?? inv.current_payment_due ?? 0), 0);
  return contractValue > 0 && totalCompleted >= contractValue ? 'Final' : 'Partial';
}

// ═══════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${msg ? ' — ' + msg : ''}`);
  }
}

// ── Test Suite 1: LienWaiverCreate useEffect logic ──────────

console.log('\n═══ LienWaiverCreate: Partial vs Final determination ═══\n');

test('Contract $100K, 2 invoices of $50K each (with retainage) → Final', () => {
  // current_payment_due = $48,750 (net after 2.5% retainage)
  // total_completed_and_stored = $50,000 (gross)
  // The comparison must use gross (total_completed_and_stored) vs contract_value
  const result = determineWaiverCategory({
    linkedInvoice: { id: 'PA-001', contract_id: 'CON-001', current_payment_due: 48750 },
    rawContracts: [{ id: 'CON-001', contract_value: 100000 }],
    rawPayApps: [
      { id: 'PA-001', contract_id: 'CON-001', current_payment_due: 48750, total_completed_and_stored: 50000 },
      { id: 'PA-002', contract_id: 'CON-001', current_payment_due: 48750, total_completed_and_stored: 50000 },
    ],
    routeContractId: 'CON-001',
    urlContractValue: 100000,
    urlTotalBilled: 100000,
  });
  assertEqual(result.category, 'Final');
});

test('Contract $100K, only 1 invoice of $50K → Partial', () => {
  const result = determineWaiverCategory({
    linkedInvoice: { id: 'PA-001', contract_id: 'CON-001', current_payment_due: 48750 },
    rawContracts: [{ id: 'CON-001', contract_value: 100000 }],
    rawPayApps: [
      { id: 'PA-001', contract_id: 'CON-001', current_payment_due: 48750, total_completed_and_stored: 50000 },
    ],
    routeContractId: 'CON-001',
    urlContractValue: 100000,
    urlTotalBilled: 50000,
  });
  assertEqual(result.category, 'Partial');
});

test('Contract $100K, 3 invoices totaling $100K → Final', () => {
  const result = determineWaiverCategory({
    linkedInvoice: { id: 'PA-003', contract_id: 'CON-001', current_payment_due: 20000 },
    rawContracts: [{ id: 'CON-001', contract_value: 100000 }],
    rawPayApps: [
      { id: 'PA-001', contract_id: 'CON-001', current_payment_due: 40000 },
      { id: 'PA-002', contract_id: 'CON-001', current_payment_due: 40000 },
      { id: 'PA-003', contract_id: 'CON-001', current_payment_due: 20000 },
    ],
    routeContractId: 'CON-001',
    urlContractValue: 100000,
    urlTotalBilled: 100000,
  });
  assertEqual(result.category, 'Final');
});

test('No contract (standalone invoice) → falls back to URL params: Partial', () => {
  const result = determineWaiverCategory({
    linkedInvoice: { id: 'PA-001', contract_id: null, current_payment_due: 50000 },
    rawContracts: [],
    rawPayApps: [{ id: 'PA-001', contract_id: null, current_payment_due: 50000 }],
    routeContractId: null,
    urlContractValue: 0,
    urlTotalBilled: 0,
  });
  assertEqual(result.category, 'Partial');
});

test('Race condition: rawContracts empty but URL params have correct data → Final', () => {
  const result = determineWaiverCategory({
    linkedInvoice: { id: 'PA-002', contract_id: 'CON-001', current_payment_due: 48750 },
    rawContracts: [],  // Not loaded yet!
    rawPayApps: [],    // Not loaded yet!
    routeContractId: 'CON-001',
    urlContractValue: 100000,
    urlTotalBilled: 100000,
  });
  // BUG: This returns Partial because contract not found, falls back to urlContractValue
  // but liveTotalBilled stays as urlTotalBilled since contract is null
  assertEqual(result.category, 'Final', 'URL fallback should work when Supabase data not loaded');
});

test('Exact contract value match (no retainage) → Final', () => {
  const result = determineWaiverCategory({
    linkedInvoice: { id: 'PA-002', contract_id: 'CON-001', current_payment_due: 50000 },
    rawContracts: [{ id: 'CON-001', contract_value: 100000 }],
    rawPayApps: [
      { id: 'PA-001', contract_id: 'CON-001', current_payment_due: 50000 },
      { id: 'PA-002', contract_id: 'CON-001', current_payment_due: 50000 },
    ],
    routeContractId: 'CON-001',
    urlContractValue: 100000,
    urlTotalBilled: 100000,
  });
  assertEqual(result.category, 'Final');
});

// ── Test Suite 2: generateFromPayApp logic ──────────────────

console.log('\n═══ generateFromPayApp: category determination ═══\n');

test('Total completed >= contract value → Final', () => {
  const cat = determineGenerateCategory({
    payApp: { balance_to_finish: 0 },
    contract: { contract_value: 100000 },
    allInvoices: [
      { total_completed_and_stored: 50000, current_payment_due: 48750 },
      { total_completed_and_stored: 50000, current_payment_due: 48750 },
    ],
  });
  assertEqual(cat, 'Final');
});

test('Total completed < contract value → Partial', () => {
  const cat = determineGenerateCategory({
    payApp: { balance_to_finish: 50000 },
    contract: { contract_value: 100000 },
    allInvoices: [{ total_completed_and_stored: 50000, current_payment_due: 48750 }],
  });
  assertEqual(cat, 'Partial');
});

test('No contract but balance_to_finish = 0 → Final', () => {
  const cat = determineGenerateCategory({
    payApp: { balance_to_finish: 0 },
    contract: null,
    allInvoices: [],
  });
  assertEqual(cat, 'Final');
});

// ── Test Suite 3: recordPayment / markPaid logic ────────────

console.log('\n═══ recordPayment: contract-level waiver update ═══\n');

test('All invoices Paid, total completed >= contract → Final', () => {
  const cat = determinePaymentWaiverCategory({
    contract: { contract_value: 100000 },
    allInvoices: [
      { total_completed_and_stored: 50000, current_payment_due: 48750, status: 'Paid' },
      { total_completed_and_stored: 50000, current_payment_due: 48750, status: 'Paid' },
    ],
  });
  assertEqual(cat, 'Final');
});

test('One invoice Paid, one Pending → Partial', () => {
  const cat = determinePaymentWaiverCategory({
    contract: { contract_value: 100000 },
    allInvoices: [
      { total_completed_and_stored: 50000, current_payment_due: 48750, status: 'Paid' },
      { total_completed_and_stored: 50000, current_payment_due: 48750, status: 'Pending' },
    ],
  });
  assertEqual(cat, 'Partial');
});

test('Overpayment (completed > contract) → Final', () => {
  const cat = determinePaymentWaiverCategory({
    contract: { contract_value: 100000 },
    allInvoices: [
      { total_completed_and_stored: 60000, current_payment_due: 58500, status: 'Paid' },
      { total_completed_and_stored: 50000, current_payment_due: 48750, status: 'Paid' },
    ],
  });
  assertEqual(cat, 'Final');
});

// ── Summary ─────────────────────────────────────────────────
console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);
if (failed > 0) process.exit(1);
