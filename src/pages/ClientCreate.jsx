import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { clientService } from '../services/supabaseService';

export default function ClientCreate() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('Active');
  const [notes, setNotes] = useState('');

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '0.25rem',
  };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await clientService.create({
        name: fullName,
        company: companyName,
        email,
        phone,
        address,
        status,
        notes,
      });
      navigate('/clients');
    } catch (err) {
      setSaveError(err.message || 'Failed to save client.');
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/clients')}
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
          <ArrowLeft size={16} /> Back to Clients
        </button>
        <h1 className="page-title">Add New Client</h1>
      </div>

      {saveError && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.875rem', maxWidth: '950px' }}>
          {saveError}
        </div>
      )}

      {/* Form Card */}
      <div className="card" style={{ padding: '2rem', maxWidth: '950px' }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {/* Full Name & Company Name — two-column */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                className="input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>
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
          </div>

          {/* Email & Phone — two-column */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
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

          {/* Status — full width */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Lead">Lead</option>
            </select>
          </div>

          {/* Notes — full width */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes"
              rows={5}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/clients')}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
