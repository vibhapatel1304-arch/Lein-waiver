import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, AlertCircle, Building2, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { vendorService, validateTaxId, formatSSN, formatEIN } from '../services/vendorService';

export default function VendorCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_type: 'EIN', // Default to EIN for businesses
    tax_id: '',
    w9_completed: false
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);

  // Load vendor data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      loadVendor();
    }
  }, [id]);

  const loadVendor = async () => {
    setFetchLoading(true);
    try {
      const vendor = await vendorService.getById(id);
      setFormData({
        name: vendor.name || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: vendor.address || '',
        tax_type: vendor.tax_type || 'EIN',
        tax_id: vendor.tax_id || '',
        w9_completed: vendor.w9_completed || false
      });
    } catch (err) {
      alert('Failed to load vendor: ' + err.message);
      navigate('/vendors');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleTaxIdChange = (value) => {
    // Auto-format based on tax type
    let formatted = value;
    if (formData.tax_type === 'SSN') {
      formatted = formatSSN(value);
    } else if (formData.tax_type === 'EIN') {
      formatted = formatEIN(value);
    }
    handleChange('tax_id', formatted);
  };

  const handleTaxTypeChange = (value) => {
    handleChange('tax_type', value);
    // Reformat tax_id when type changes
    if (formData.tax_id) {
      if (value === 'SSN') {
        handleChange('tax_id', formatSSN(formData.tax_id));
      } else if (value === 'EIN') {
        handleChange('tax_id', formatEIN(formData.tax_id));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name?.trim()) {
      newErrors.name = 'Vendor name is required';
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Tax ID validation (using service validation)
    const taxValidation = validateTaxId({
      tax_type: formData.tax_type,
      tax_id: formData.tax_id
    });

    if (!taxValidation.valid) {
      newErrors.tax_id = taxValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        await vendorService.update(id, formData);
      } else {
        await vendorService.create(formData);
      }
      navigate('/vendors');
    } catch (err) {
      setErrors(prev => ({ ...prev, submit: err.message }));
    } finally {
      setSaving(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-500">Loading vendor...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          to="/vendors" 
          className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-4"
          style={{ textDecoration: 'none' }}
        >
          <ArrowLeft size={16} />
          Back to Vendors
        </Link>
        <h1 className="page-title">
          {isEditMode ? 'Edit Vendor' : 'Create Vendor'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {isEditMode 
            ? 'Update vendor information and compliance status' 
            : 'Add a new vendor with tax information for W-9/1099 compliance'}
        </p>
      </div>

      {/* Error Banner */}
      {errors.submit && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{errors.submit}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 size={20} className="text-blue-600" />
            Basic Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`input-field w-full ${errors.name ? 'border-red-500' : ''}`}
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter vendor or company name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail size={14} className="inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  className={`input-field w-full ${errors.email ? 'border-red-500' : ''}`}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="vendor@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone size={14} className="inline mr-1" />
                  Phone
                </label>
                <input
                  type="tel"
                  className="input-field w-full"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin size={14} className="inline mr-1" />
                Address
              </label>
              <textarea
                className="input-field w-full"
                rows={2}
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Street address, City, State, ZIP"
              />
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            Tax Information (W-9)
          </h2>
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> Tax ID type and number must match. 
              Select SSN for individuals or EIN for businesses. 
              The system validates the format to ensure compliance.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field w-full"
                  value={formData.tax_type}
                  onChange={(e) => handleTaxTypeChange(e.target.value)}
                >
                  <option value="EIN">EIN (Employer Identification Number)</option>
                  <option value="SSN">SSN (Social Security Number)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.tax_type === 'EIN' 
                    ? 'For businesses and entities' 
                    : 'For individual contractors'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`input-field w-full font-mono ${errors.tax_id ? 'border-red-500' : ''}`}
                  value={formData.tax_id}
                  onChange={(e) => handleTaxIdChange(e.target.value)}
                  placeholder={formData.tax_type === 'SSN' ? 'XXX-XX-XXXX' : 'XX-XXXXXXX'}
                />
                {errors.tax_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.tax_id}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Format: {formData.tax_type === 'SSN' ? 'XXX-XX-XXXX' : 'XX-XXXXXXX'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="w9_completed"
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                checked={formData.w9_completed}
                onChange={(e) => handleChange('w9_completed', e.target.checked)}
              />
              <label htmlFor="w9_completed" className="text-sm text-gray-700">
                W-9 Form Completed
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              Check this when you have received and verified the vendor's W-9 form.
              Required for 1099 filing eligibility.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 pt-6 flex items-center justify-end gap-3">
          <Link
            to="/vendors"
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            style={{ textDecoration: 'none' }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="btn-primary inline-flex items-center gap-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                {isEditMode ? 'Update Vendor' : 'Create Vendor'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Validation Info */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Validation Rules</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• SSN format: XXX-XX-XXXX (9 digits)</li>
          <li>• EIN format: XX-XXXXXXX (9 digits)</li>
          <li>• SSN and EIN are mutually exclusive</li>
          <li>• Tax ID must match the selected type</li>
          <li>• W-9 completion required for 1099 eligibility</li>
        </ul>
      </div>
    </div>
  );
}
