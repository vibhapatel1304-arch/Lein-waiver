import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, CheckCircle, XCircle, DollarSign, AlertTriangle, Search } from 'lucide-react';
import { vendorService } from '../services/vendorService';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const formatTaxId = (taxType, taxId) => {
  if (!taxId) return '—';
  const clean = taxId.replace(/\D/g, '');
  if (taxType === 'SSN') {
    return `XXX-XX-${clean.slice(-4)}`;
  } else if (taxType === 'EIN') {
    return `XX-${clean.slice(2)}`;
  }
  return taxId;
};

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterW9, setFilterW9] = useState('all'); // all, completed, pending
  const [filter1099, setFilter1099] = useState('all'); // all, eligible, not-eligible

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const data = await vendorService.listWith1099Summary();
      setVendors(data);
      setError(null);
    } catch (err) {
      setError('Failed to load vendors. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    
    try {
      await vendorService.delete(id);
      loadVendors();
    } catch (err) {
      alert('Failed to delete vendor: ' + err.message);
    }
  };

  // Filter vendors
  const filteredVendors = vendors.filter(v => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      v.name?.toLowerCase().includes(searchLower) ||
      v.email?.toLowerCase().includes(searchLower) ||
      v.tax_type?.toLowerCase().includes(searchLower);
    
    if (!matchesSearch) return false;
    
    // W9 filter
    if (filterW9 === 'completed' && !v.w9_completed) return false;
    if (filterW9 === 'pending' && v.w9_completed) return false;
    
    // 1099 filter
    if (filter1099 === 'eligible' && !v.is_1099_eligible) return false;
    if (filter1099 === 'not-eligible' && v.is_1099_eligible) return false;
    
    return true;
  });

  // Summary stats
  const totalVendors = vendors.length;
  const w9Completed = vendors.filter(v => v.w9_completed).length;
  const eligibleFor1099 = vendors.filter(v => v.is_1099_eligible).length;
  const totalPaid = vendors.reduce((sum, v) => sum + (v.total_paid || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Loading vendors...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Vendors</h1>
          <p className="text-gray-500 text-sm mt-1">Manage vendors, W-9 compliance, and 1099 eligibility</p>
        </div>
        <Link 
          to="/vendors/create" 
          className="btn-primary inline-flex items-center gap-2"
          style={{ textDecoration: 'none' }}
        >
          <Plus size={16} />
          Add Vendor
        </Link>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Vendors</p>
              <p className="text-2xl font-bold mt-1">{totalVendors}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">W-9 Completed</p>
              <p className="text-2xl font-bold mt-1">{w9Completed}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">1099 Eligible</p>
              <p className={`text-2xl font-bold mt-1 ${eligibleFor1099 > 0 ? 'text-purple-600' : ''}`}>
                {eligibleFor1099}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${eligibleFor1099 > 0 ? 'bg-purple-50' : 'bg-gray-50'}`}>
              <DollarSign size={24} className={eligibleFor1099 > 0 ? 'text-purple-600' : 'text-gray-400'} />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <DollarSign size={24} className="text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              className="input-field w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="input-field w-auto"
            value={filterW9}
            onChange={(e) => setFilterW9(e.target.value)}
          >
            <option value="all">All W-9 Status</option>
            <option value="completed">W-9 Completed</option>
            <option value="pending">W-9 Pending</option>
          </select>
          
          <select
            className="input-field w-auto"
            value={filter1099}
            onChange={(e) => setFilter1099(e.target.value)}
          >
            <option value="all">All 1099 Status</option>
            <option value="eligible">1099 Eligible</option>
            <option value="not-eligible">Not Eligible</option>
          </select>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="pb-3 pl-4 font-medium">Vendor Name</th>
                <th className="pb-3 font-medium">Tax Info</th>
                <th className="pb-3 font-medium">Contact</th>
                <th className="pb-3 font-medium text-right">Total Paid</th>
                <th className="pb-3 font-medium text-center">W-9</th>
                <th className="pb-3 font-medium text-center">1099</th>
                <th className="pb-3 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 pl-4">
                    <Link 
                      to={`/vendors/${vendor.id}`} 
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {vendor.name}
                    </Link>
                    <p className="text-xs text-gray-500">{vendor.id}</p>
                  </td>
                  <td className="py-3">
                    <span className="text-sm">
                      <span className="font-medium">{vendor.tax_type}:</span>{' '}
                      <span className="font-mono text-gray-600">
                        {formatTaxId(vendor.tax_type, vendor.tax_id)}
                      </span>
                    </span>
                  </td>
                  <td className="py-3">
                    <p className="text-sm">{vendor.email || '—'}</p>
                    <p className="text-xs text-gray-500">{vendor.phone || '—'}</p>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-medium">{formatCurrency(vendor.total_paid || 0)}</span>
                    <p className="text-xs text-gray-500">{vendor.invoice_count || 0} invoices</p>
                  </td>
                  <td className="py-3 text-center">
                    {vendor.w9_completed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        <CheckCircle size={12} />
                        Done
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                        <XCircle size={12} />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    {vendor.is_1099_eligible ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                        <DollarSign size={12} />
                        Eligible
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/vendors/${vendor.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(vendor.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredVendors.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No vendors found</p>
                    <p className="text-sm mt-1">
                      {searchTerm ? 'Try adjusting your search or filters' : 'Add your first vendor to get started'}
                    </p>
                    {!searchTerm && (
                      <Link
                        to="/vendors/create"
                        className="btn-primary inline-flex items-center gap-2 mt-4"
                        style={{ textDecoration: 'none' }}
                      >
                        <Plus size={16} />
                        Add Vendor
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1099 Summary Note */}
      {eligibleFor1099 > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
          <DollarSign size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-purple-900">1099 Filing Required</p>
            <p className="text-sm text-purple-700 mt-1">
              You have {eligibleFor1099} vendor{eligibleFor1099 > 1 ? 's' : ''} eligible for 1099 filing (paid over $600). 
              Make sure W-9 forms are completed for all eligible vendors.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
