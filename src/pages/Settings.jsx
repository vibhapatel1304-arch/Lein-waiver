import { useState } from 'react';
import { Building2, Users, Bell, Palette, Upload, Edit, UserMinus } from 'lucide-react';
import { employeeService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const currentUser = { id: 'USR-001', name: 'Mike Thornton', email: 'mike@boulderconstruction.com', role: 'Admin', initials: 'MT' };

const tabs = [
  { id: 'company', label: 'Company Profile', icon: Building2 },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'branding', label: 'Branding', icon: Palette },
];

const notificationOptions = [
  { id: 'newInvoices', label: 'New Invoice Notifications', description: 'Receive an email whenever a new invoice is created or received.' },
  { id: 'overduePayments', label: 'Overdue Payment Alerts', description: 'Get notified when a payment passes its due date.' },
  { id: 'dailyDigest', label: 'Daily Project Digest', description: 'A summary of all project activity delivered each morning at 7:00 AM.' },
  { id: 'weeklyTimesheet', label: 'Weekly Timesheet Summary', description: 'Receive a weekly rollup of all timesheet hours every Monday.' },
  { id: 'changeOrders', label: 'Change Order Alerts', description: 'Instant notification when a change order is submitted or approved.' },
  { id: 'rfiNotifications', label: 'RFI Notifications', description: 'Get alerted when a new RFI is created or requires your response.' },
];

function Settings() {
  const { data: employees } = useSupabase(employeeService.list);
  const [activeTab, setActiveTab] = useState('company');

  // Company Profile form state
  const [company, setCompany] = useState({
    name: 'Boulder Construction',
    address: '123 Commerce Way, Newark, NJ 07102',
    phone: '(201) 555-0100',
    email: 'info@boulderconstruction.com',
    website: 'www.boulderconstruction.com',
    taxId: '22-3456789',
  });

  // Notification toggles
  const [notifications, setNotifications] = useState({
    newInvoices: true,
    overduePayments: true,
    dailyDigest: false,
    weeklyTimesheet: true,
    changeOrders: true,
    rfiNotifications: false,
  });

  // Branding state
  const [primaryColor, setPrimaryColor] = useState('#f59e0b');

  const handleCompanyChange = (field, value) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggle = (id) => {
    setNotifications((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    outline: 'none',
    backgroundColor: '#fff',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.375rem',
  };

  const renderCompanyProfile = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={labelStyle}>Company Name</label>
          <input style={inputStyle} value={company.name} onChange={(e) => handleCompanyChange('name', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Address</label>
          <input style={inputStyle} value={company.address} onChange={(e) => handleCompanyChange('address', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Phone</label>
          <input style={inputStyle} value={company.phone} onChange={(e) => handleCompanyChange('phone', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} value={company.email} onChange={(e) => handleCompanyChange('email', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Website</label>
          <input style={inputStyle} value={company.website} onChange={(e) => handleCompanyChange('website', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Tax ID</label>
          <input style={inputStyle} value={company.taxId} onChange={(e) => handleCompanyChange('taxId', e.target.value)} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Company Logo</label>
        <div
          style={{
            border: '2px dashed #d1d5db',
            borderRadius: '0.75rem',
            padding: '3rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            color: '#9ca3af',
            cursor: 'pointer',
            backgroundColor: '#f9fafb',
            minHeight: '220px',
          }}
        >
          <Upload size={36} />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Click to upload logo</span>
          <span style={{ fontSize: '0.75rem' }}>PNG, JPG, or SVG up to 2MB</span>
        </div>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <button className="btn-primary">Save Changes</button>
      </div>
    </div>
  );

  const renderUserManagement = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{employees.length} users in your organization</p>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={16} />
          Invite User
        </button>
      </div>
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              {['Name', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        backgroundColor: '#f59e0b',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      {emp.initials}
                    </div>
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{emp.name}</span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{emp.email}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{emp.role}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span className="badge-green">{emp.status}</span>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        backgroundColor: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      <Edit size={13} />
                      Edit
                    </button>
                    <button
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.75rem',
                        border: '1px solid #fca5a5',
                        borderRadius: '0.375rem',
                        backgroundColor: '#fff',
                        color: '#dc2626',
                        cursor: 'pointer',
                      }}
                    >
                      <UserMinus size={13} />
                      Deactivate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      {notificationOptions.map((opt) => (
        <div
          key={opt.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 0',
            borderBottom: '1px solid #f3f4f6',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: '0.9rem', color: '#111827', marginBottom: '0.2rem' }}>{opt.label}</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{opt.description}</div>
          </div>
          <label
            style={{
              position: 'relative',
              display: 'inline-block',
              width: '44px',
              height: '24px',
              flexShrink: 0,
              marginLeft: '1rem',
            }}
          >
            <input
              type="checkbox"
              checked={notifications[opt.id]}
              onChange={() => handleToggle(opt.id)}
              style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: notifications[opt.id] ? '#f59e0b' : '#d1d5db',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: notifications[opt.id] ? '22px' : '2px',
                top: '2px',
                width: '20px',
                height: '20px',
                backgroundColor: '#fff',
                borderRadius: '50%',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }}
            />
          </label>
        </div>
      ))}
    </div>
  );

  const renderBranding = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      <div>
        <label style={labelStyle}>Company Logo</label>
        <div
          style={{
            border: '2px dashed #d1d5db',
            borderRadius: '0.75rem',
            padding: '3rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            color: '#9ca3af',
            cursor: 'pointer',
            backgroundColor: '#f9fafb',
            minHeight: '180px',
          }}
        >
          <Upload size={36} />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Click to upload logo</span>
          <span style={{ fontSize: '0.75rem' }}>PNG, JPG, or SVG up to 2MB</span>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <label style={labelStyle}>Primary Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '0.5rem',
                backgroundColor: primaryColor,
                border: '2px solid #e5e7eb',
                flexShrink: 0,
              }}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#f59e0b"
            />
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.375rem' }}>
            Current: Amber (#f59e0b)
          </p>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Preview</label>
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>See how your brand color appears across the application.</p>

          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.5rem' }}>Buttons</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: primaryColor,
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Primary Action
              </button>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${primaryColor}`,
                  backgroundColor: 'transparent',
                  color: primaryColor,
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Secondary
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.5rem' }}>Badges</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '9999px',
                  backgroundColor: primaryColor + '20',
                  color: primaryColor,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                In Progress
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '9999px',
                  backgroundColor: primaryColor,
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                Active
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.5rem' }}>Company Name</span>
            <span style={{ fontSize: '1.375rem', fontWeight: 700, color: primaryColor }}>{company.name}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'company': return renderCompanyProfile();
      case 'users': return renderUserManagement();
      case 'notifications': return renderNotifications();
      case 'branding': return renderBranding();
      default: return null;
    }
  };

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>Settings</h1>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          borderBottom: '2px solid #e5e7eb',
          marginBottom: '1.5rem',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#f59e0b' : '#6b7280',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #f59e0b' : '2px solid transparent',
                marginBottom: '-2px',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="card" style={{ padding: '1.5rem' }}>
        {renderContent()}
      </div>
    </div>
  );
}

export default Settings;
