import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  FolderOpen,
  MessageSquare,
  StickyNote,
  FileText,
  DollarSign,
} from 'lucide-react';
import { clientService, projectService, communicationService, documentService, invoiceService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const projectStatusBadge = {
  'In Progress': 'badge-blue',
  'Planning': 'badge-yellow',
  'On Hold': 'badge-gray',
  'Completed': 'badge-green',
};

const invoiceStatusBadge = {
  Paid: 'badge-green',
  Pending: 'badge-yellow',
  Overdue: 'badge-red',
};

const tabs = [
  { key: 'projects', label: 'Projects', icon: FolderOpen },
  { key: 'communications', label: 'Communication Log', icon: MessageSquare },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'invoices', label: 'Invoices', icon: DollarSign },
];

function ClientDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('projects');

  const { data: clients, loading: loadingClients } = useSupabase(clientService.list);
  const { data: allProjects, loading: loadingProjects } = useSupabase(projectService.list);
  const { data: allComms, loading: loadingComms } = useSupabase(communicationService.list);
  const { data: allDocs, loading: loadingDocs } = useSupabase(documentService.list);
  const { data: allInvoices, loading: loadingInvoices } = useSupabase(invoiceService.list);

  const loading = loadingClients || loadingProjects || loadingComms || loadingDocs || loadingInvoices;

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading client details...</div>;
  }

  const client = (clients || []).find((c) => c.id === id);

  if (!client) {
    return (
      <div>
        <Link to="/clients" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Clients
        </Link>
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          Client not found.
        </div>
      </div>
    );
  }

  const clientProjects = (allProjects || []).filter((p) => p.client_id === client.id);
  const clientComms = (allComms || []).filter((c) => c.client_id === client.id);
  const clientProjectIds = clientProjects.map((p) => p.id);
  const clientDocs = (allDocs || []).filter((d) => clientProjectIds.includes(d.project_id));
  const clientInvoices = (allInvoices || []).filter((i) => i.client_id === client.id || i.owner_name === client.name);

  const formatCurrency = (val) =>
    val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

  return (
    <div>
      <Link to="/clients" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back to Clients
      </Link>

      {/* Contact Info Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{client.name}</h1>
            <p style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={14} /> {client.company}
            </p>
          </div>
          <span className={
            client.status === 'Active' ? 'badge-green' :
            client.status === 'Inactive' ? 'badge-gray' :
            'badge-blue'
          }>
            {client.status}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
            <Mail size={16} style={{ color: '#6b7280' }} />
            {client.email}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
            <Phone size={16} style={{ color: '#6b7280' }} />
            {client.phone}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
            <MapPin size={16} style={{ color: '#6b7280' }} />
            {client.address}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#2563eb' : '#6b7280',
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                marginBottom: '-2px',
                whiteSpace: 'nowrap',
                fontSize: '0.875rem',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'projects' && (
        <div className="card" style={{ overflow: 'auto' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Projects ({clientProjects.length})</h2>
          {clientProjects.length === 0 ? (
            <p style={{ color: '#9ca3af', padding: '1rem 0' }}>No projects for this client.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-header">Project</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Progress</th>
                  <th className="table-header">Budget</th>
                  <th className="table-header">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {clientProjects.map((proj) => (
                  <tr key={proj.id}>
                    <td className="table-cell" style={{ fontWeight: 600 }}>{proj.name}</td>
                    <td className="table-cell">
                      <span className={projectStatusBadge[proj.status] || 'badge-gray'}>{proj.status}</span>
                    </td>
                    <td className="table-cell">{proj.progress}%</td>
                    <td className="table-cell">{formatCurrency(proj.budget)}</td>
                    <td className="table-cell">{proj.deadline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'communications' && (
        <div className="card" style={{ overflow: 'auto' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Communication Log ({clientComms.length})</h2>
          {clientComms.length === 0 ? (
            <p style={{ color: '#9ca3af', padding: '1rem 0' }}>No communications recorded.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Subject</th>
                  <th className="table-header">Notes</th>
                </tr>
              </thead>
              <tbody>
                {clientComms.map((comm) => (
                  <tr key={comm.id}>
                    <td className="table-cell" style={{ whiteSpace: 'nowrap' }}>{comm.date}</td>
                    <td className="table-cell">
                      <span className="badge-blue">{comm.type}</span>
                    </td>
                    <td className="table-cell" style={{ fontWeight: 500 }}>{comm.subject}</td>
                    <td className="table-cell" style={{ color: '#6b7280', maxWidth: '320px' }}>{comm.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Notes</h2>
          <p style={{ color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {client.notes || 'No notes available.'}
          </p>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card" style={{ overflow: 'auto' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Documents ({clientDocs.length})</h2>
          {clientDocs.length === 0 ? (
            <p style={{ color: '#9ca3af', padding: '1rem 0' }}>No documents found for this client's projects.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Project</th>
                  <th className="table-header">Uploaded</th>
                  <th className="table-header">Size</th>
                </tr>
              </thead>
              <tbody>
                {clientDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td className="table-cell" style={{ fontWeight: 500 }}>{doc.name}</td>
                    <td className="table-cell">
                      <span className="badge-gray">{doc.category}</span>
                    </td>
                    <td className="table-cell">{doc.project_name || doc.project}</td>
                    <td className="table-cell" style={{ whiteSpace: 'nowrap' }}>{doc.upload_date || doc.uploadDate}</td>
                    <td className="table-cell">{doc.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="card" style={{ overflow: 'auto' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Invoices ({clientInvoices.length})</h2>
          {clientInvoices.length === 0 ? (
            <p style={{ color: '#9ca3af', padding: '1rem 0' }}>No invoices for this client.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-header">Invoice</th>
                  <th className="table-header">Project</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Issue Date</th>
                  <th className="table-header">Due Date</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {clientInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="table-cell" style={{ fontWeight: 600 }}>{inv.id}</td>
                    <td className="table-cell">{inv.project_name || inv.project}</td>
                    <td className="table-cell">{formatCurrency(inv.current_payment_due || inv.amount || 0)}</td>
                    <td className="table-cell" style={{ whiteSpace: 'nowrap' }}>{inv.application_date || inv.issueDate}</td>
                    <td className="table-cell" style={{ whiteSpace: 'nowrap' }}>{inv.period_to || inv.dueDate}</td>
                    <td className="table-cell">
                      <span className={invoiceStatusBadge[inv.status] || 'badge-gray'}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default ClientDetail;
