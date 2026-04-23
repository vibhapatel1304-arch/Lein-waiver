import { supabase } from '../lib/supabase';

// ── Tax ID Validation Helpers ───────────────────────────────

/**
 * Validate SSN format: XXX-XX-XXXX or XXXXXXXXX
 * @param {string} ssn
 * @returns {boolean}
 */
export function isValidSSN(ssn) {
  if (!ssn) return false;
  const clean = ssn.replace(/\D/g, '');
  if (clean.length !== 9) return false;
  
  // Check for invalid SSN patterns
  const area = parseInt(clean.substring(0, 3), 10);
  const group = parseInt(clean.substring(3, 5), 10);
  const serial = parseInt(clean.substring(5, 9), 10);
  
  // Invalid area numbers: 000, 666, 900-999
  if (area === 0 || area === 666 || (area >= 900 && area <= 999)) return false;
  // Invalid group numbers: 00
  if (group === 0) return false;
  // Invalid serial numbers: 0000
  if (serial === 0) return false;
  
  return true;
}

/**
 * Validate EIN format: XX-XXXXXXX or XXXXXXXXX
 * @param {string} ein
 * @returns {boolean}
 */
export function isValidEIN(ein) {
  if (!ein) return false;
  const clean = ein.replace(/\D/g, '');
  if (clean.length !== 9) return false;
  
  // EIN must start with specific prefixes
  const prefix = parseInt(clean.substring(0, 2), 10);
  // Valid EIN prefixes: 10, 20-27, 30-39, 40-49, 50-59, 60-69, 70-79, 80-88, 90-99
  const validPrefixes = [
    10, ...Array.from({length: 8}, (_, i) => 20 + i), // 20-27
    ...Array.from({length: 10}, (_, i) => 30 + i),   // 30-39
    ...Array.from({length: 10}, (_, i) => 40 + i),   // 40-49
    ...Array.from({length: 10}, (_, i) => 50 + i),   // 50-59
    ...Array.from({length: 10}, (_, i) => 60 + i),   // 60-69
    ...Array.from({length: 10}, (_, i) => 70 + i),   // 70-79
    ...Array.from({length: 9}, (_, i) => 80 + i),    // 80-88
    ...Array.from({length: 10}, (_, i) => 90 + i),    // 90-99
  ];
  
  return validPrefixes.includes(prefix);
}

/**
 * Format SSN with dashes
 * @param {string} ssn
 * @returns {string}
 */
export function formatSSN(ssn) {
  if (!ssn) return '';
  const clean = ssn.replace(/\D/g, '');
  if (clean.length !== 9) return ssn;
  return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5)}`;
}

/**
 * Format EIN with dash
 * @param {string} ein
 * @returns {string}
 */
export function formatEIN(ein) {
  if (!ein) return '';
  const clean = ein.replace(/\D/g, '');
  if (clean.length !== 9) return ein;
  return `${clean.slice(0, 2)}-${clean.slice(2)}`;
}

/**
 * Comprehensive tax ID validation
 * Enforces mutual exclusivity of SSN and EIN
 * @param {Object} data - { tax_type, tax_id }
 * @returns {Object} - { valid: boolean, error?: string }
 */
export function validateTaxId(data) {
  const { tax_type, tax_id } = data;
  
  // Required fields
  if (!tax_type) {
    return { valid: false, error: 'Tax type is required (SSN or EIN)' };
  }
  if (!tax_id) {
    return { valid: false, error: 'Tax ID is required' };
  }
  
  const upperType = tax_type.toUpperCase();
  const cleanId = tax_id.replace(/\D/g, '');
  
  // Validate based on tax type
  if (upperType === 'SSN') {
    if (!isValidSSN(tax_id)) {
      return { valid: false, error: 'Invalid SSN format. Must be XXX-XX-XXXX' };
    }
    // Double-check it's not an EIN format
    if (isValidEIN(tax_id) && !isValidSSN(tax_id)) {
      return { valid: false, error: 'Tax ID appears to be an EIN but SSN was selected' };
    }
  } else if (upperType === 'EIN') {
    if (!isValidEIN(tax_id)) {
      return { valid: false, error: 'Invalid EIN format. Must be XX-XXXXXXX' };
    }
    // Double-check it's not an SSN format
    if (isValidSSN(tax_id) && !isValidEIN(tax_id)) {
      return { valid: false, error: 'Tax ID appears to be an SSN but EIN was selected' };
    }
  } else {
    return { valid: false, error: 'Tax type must be either SSN or EIN' };
  }
  
  return { valid: true, formattedId: upperType === 'SSN' ? formatSSN(tax_id) : formatEIN(tax_id) };
}

// ── 1099 Eligibility Logic ─────────────────────────────────

/**
 * Check if vendor is 1099 eligible (paid > $600 in tax year)
 * @param {number} totalPaid - Total amount paid to vendor
 * @returns {boolean}
 */
export function is1099Eligible(totalPaid) {
  const threshold = 600;
  return totalPaid > threshold;
}

/**
 * Calculate total payments to vendor from invoices
 * @param {Array} invoices - Array of invoice objects
 * @returns {number}
 */
export function calculateTotalPaid(invoices) {
  if (!Array.isArray(invoices)) return 0;
  return invoices
    .filter(inv => inv.status?.toLowerCase() === 'paid')
    .reduce((sum, inv) => sum + (parseFloat(inv.amount || inv.paid_amount || 0)), 0);
}

// ── ID Generator ───────────────────────────────────────────

async function generateVendorId() {
  const year = new Date().getFullYear();
  const pattern = `VEND-${year}-`;
  
  try {
    const { data } = await supabase
      .from('app_vendors')
      .select('id')
      .like('id', `${pattern}%`)
      .order('id', { ascending: false })
      .limit(1);
    
    let next = 1;
    if (data && data.length > 0) {
      const last = data[0].id;
      const seq = parseInt(last.split('-').pop(), 10);
      if (!isNaN(seq)) next = seq + 1;
    }
    return `${pattern}${String(next).padStart(4, '0')}`;
  } catch {
    // Fallback: timestamp-based ID
    return `VEND-${year}-${Date.now().toString(36).toUpperCase()}`;
  }
}

// ── Vendor Service ────────────────────────────────────────

export const vendorService = {
  /**
   * Get all vendors
   * @returns {Promise<Array>}
   */
  async list() {
    const { data, error } = await supabase
      .from('app_vendors')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Get vendor by ID
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('app_vendors')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Create new vendor with validation
   * @param {Object} vendorData
   * @returns {Promise<Object>}
   */
  async create(vendorData) {
    // Validate tax ID
    const taxValidation = validateTaxId({
      tax_type: vendorData.tax_type,
      tax_id: vendorData.tax_id
    });
    
    if (!taxValidation.valid) {
      throw new Error(taxValidation.error);
    }
    
    // Generate ID if not provided
    const id = vendorData.id || await generateVendorId();
    
    const { data, error } = await supabase
      .from('app_vendors')
      .insert({
        id,
        name: vendorData.name,
        email: vendorData.email,
        phone: vendorData.phone,
        address: vendorData.address,
        tax_type: vendorData.tax_type.toUpperCase(),
        tax_id: taxValidation.formattedId,
        w9_completed: vendorData.w9_completed || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Update vendor with validation
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async update(id, updates) {
    // Validate tax ID if being updated
    if (updates.tax_type || updates.tax_id) {
      const taxValidation = validateTaxId({
        tax_type: updates.tax_type || updates.tax_type,
        tax_id: updates.tax_id || updates.tax_id
      });
      
      if (!taxValidation.valid) {
        throw new Error(taxValidation.error);
      }
      
      if (taxValidation.formattedId) {
        updates.tax_id = taxValidation.formattedId;
      }
    }
    
    const { data, error } = await supabase
      .from('app_vendors')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete vendor
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const { error } = await supabase
      .from('app_vendors')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * Get vendor with payment summary and 1099 eligibility
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getWithPaymentSummary(id) {
    // Get vendor
    const vendor = await this.getById(id);
    if (!vendor) return null;
    
    // Get all invoices for this vendor
    const { data: invoices } = await supabase
      .from('app_invoices')
      .select('amount, paid_amount, status')
      .eq('vendor_id', id);
    
    const totalPaid = calculateTotalPaid(invoices || []);
    const is1099Required = is1099Eligible(totalPaid) && vendor.w9_completed;
    
    return {
      ...vendor,
      total_paid: totalPaid,
      is_1099_eligible: is1099Required,
      invoice_count: (invoices || []).length
    };
  },

  /**
   * Get all vendors with 1099 summary
   * @returns {Promise<Array>}
   */
  async listWith1099Summary() {
    const vendors = await this.list();
    
    // Get payment data for all vendors
    const { data: invoices } = await supabase
      .from('app_invoices')
      .select('vendor_id, amount, paid_amount, status');
    
    // Group invoices by vendor
    const invoicesByVendor = (invoices || []).reduce((acc, inv) => {
      if (!acc[inv.vendor_id]) acc[inv.vendor_id] = [];
      acc[inv.vendor_id].push(inv);
      return acc;
    }, {});
    
    return vendors.map(vendor => {
      const vendorInvoices = invoicesByVendor[vendor.id] || [];
      const totalPaid = calculateTotalPaid(vendorInvoices);
      
      return {
        ...vendor,
        total_paid: totalPaid,
        is_1099_eligible: is1099Eligible(totalPaid) && vendor.w9_completed,
        invoice_count: vendorInvoices.length
      };
    });
  },

  /**
   * Get vendors eligible for 1099
   * @returns {Promise<Array>}
   */
  async get1099EligibleVendors() {
    const vendorsWithSummary = await this.listWith1099Summary();
    return vendorsWithSummary.filter(v => v.is_1099_eligible);
  },

  /**
   * Mark W9 as completed
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async markW9Completed(id) {
    return this.update(id, { w9_completed: true });
  }
};

export default vendorService;
