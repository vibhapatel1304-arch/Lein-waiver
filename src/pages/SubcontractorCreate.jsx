import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X, Star } from 'lucide-react';

const TRADE_OPTIONS = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Steel Fabrication',
  'Concrete',
  'Roofing',
  'Painting',
  'Carpentry',
  'Landscaping',
  'Demolition',
  'Excavation',
  'Masonry',
  'Drywall',
  'Flooring',
  'Fire Protection',
  'Other',
];

const CERTIFICATION_SUGGESTIONS = [
  'OSHA 10',
  'OSHA 30',
  'EPA 608',
  'Licensed Master Electrician',
  'Licensed Master Plumber',
  'Certified Welding Inspector',
  'NATE Certified',
  'LEED AP',
  'First Aid/CPR',
  'Confined Space Entry',
];

export default function SubcontractorCreate() {
  const navigate = useNavigate();

  // Company Information
  const [companyName, setCompanyName] = useState('');
  const [trade, setTrade] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Licensing & Insurance
  const [licenseNumber, setLicenseNumber] = useState('');
  const [insuranceExpDate, setInsuranceExpDate] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');

  // Certifications
  const [certifications, setCertifications] = useState([]);
  const [certInput, setCertInput] = useState('');

  // Rating
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  // Notes
  const [notes, setNotes] = useState('');

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '0.25rem',
  };

  const sectionTitleStyle = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #e2e8f0',
  };

  const addCertification = (cert) => {
    const value = cert || certInput.trim();
    if (value && !certifications.includes(value)) {
      setCertifications([...certifications, value]);
    }
    setCertInput('');
  };

  const removeCertification = (cert) => {
    setCertifications(certifications.filter((c) => c !== cert));
  };

  const handleSave = () => {
    alert('Subcontractor saved successfully!');
    navigate('/subcontractors');
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/subcontractors')}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            padding: 0,
            marginBottom: '0.5rem',
          }}
        >
          <ArrowLeft size={16} /> Back to Subcontractors
        </button>
        <h1 className="page-title">Add Subcontractor</h1>
      </div>

      {/* Form Card */}
      <div className="card" style={{ padding: '2rem', maxWidth: '950px' }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

          {/* Section 1: Company Information */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={sectionTitleStyle}>Company Information</h2>

            {/* Company Name & Trade — two-column */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Company Name</label>
                <input
                  className="input"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label style={labelStyle}>Trade / Specialty</label>
                <select
                  className="input"
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                >
                  <option value="">Select a trade</option>
                  {TRADE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact Person & Phone — two-column */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Contact Person</label>
                <input
                  className="input"
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Enter contact person name"
                />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input
                  className="input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            {/* Email — full width */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            {/* Address — full width */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Address</label>
              <textarea
                className="input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Section 2: Licensing & Insurance */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={sectionTitleStyle}>Licensing & Insurance</h2>

            {/* License Number & Insurance Provider — two-column */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={labelStyle}>License Number</label>
                <input
                  className="input"
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Enter license number"
                />
              </div>
              <div>
                <label style={labelStyle}>Insurance Provider</label>
                <input
                  className="input"
                  type="text"
                  value={insuranceProvider}
                  onChange={(e) => setInsuranceProvider(e.target.value)}
                  placeholder="Enter insurance provider"
                />
              </div>
            </div>

            {/* Insurance Expiration Date */}
            <div style={{ marginBottom: '1.5rem', maxWidth: '50%' }}>
              <label style={labelStyle}>Insurance Expiration Date</label>
              <input
                className="input"
                type="date"
                value={insuranceExpDate}
                onChange={(e) => setInsuranceExpDate(e.target.value)}
              />
            </div>
          </div>

          {/* Section 3: Certifications */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={sectionTitleStyle}>Certifications</h2>

            {/* Add certification input */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                className="input"
                type="text"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCertification();
                  }
                }}
                placeholder="Type a certification"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={() => addCertification()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
              >
                <Plus size={16} /> Add Certification
              </button>
            </div>

            {/* Suggestions */}
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '0.5rem' }}>Suggestions:</span>
              {CERTIFICATION_SUGGESTIONS.filter((s) => !certifications.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addCertification(s)}
                  style={{
                    display: 'inline-block',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '9999px',
                    padding: '0.2rem 0.65rem',
                    fontSize: '0.75rem',
                    color: '#475569',
                    cursor: 'pointer',
                    margin: '0.2rem',
                  }}
                >
                  + {s}
                </button>
              ))}
            </div>

            {/* Added certifications badges */}
            {certifications.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {certifications.map((cert) => (
                  <span
                    key={cert}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '9999px',
                      padding: '0.3rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                    }}
                  >
                    {cert}
                    <button
                      type="button"
                      onClick={() => removeCertification(cert)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        color: '#1e40af',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Rating */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={sectionTitleStyle}>Rating</h2>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.15rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Star
                    size={28}
                    fill={(hoverRating || rating) >= star ? '#f59e0b' : 'none'}
                    color={(hoverRating || rating) >= star ? '#f59e0b' : '#cbd5e1'}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#64748b', alignSelf: 'center' }}>
                  {rating} / 5
                </span>
              )}
            </div>
          </div>

          {/* Section 5: Notes */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={sectionTitleStyle}>Notes</h2>
            <textarea
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes about this subcontractor"
              rows={5}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/subcontractors')}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Save size={16} /> Save Subcontractor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
