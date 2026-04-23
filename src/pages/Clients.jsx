import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { clientService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const statusBadge = {
  Active: 'badge-green',
  Inactive: 'badge-gray',
  Lead: 'badge-blue',
};

function Clients() {
  const { data: clients, loading } = useSupabase(clientService.list);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = (clients || []).filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading clients...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Clients</h1>
        <Link to="/clients/create" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Plus size={16} />
          Add New Client
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search by name, company, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: '2.25rem', width: '100%' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
          style={{ width: 'auto', minWidth: '150px' }}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Lead">Lead</option>
        </select>
      </div>

      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="table-header">Name</th>
              <th className="table-header">Company</th>
              <th className="table-header">Phone</th>
              <th className="table-header">Email</th>
              <th className="table-header">Projects</th>
              <th className="table-header">Status</th>
              <th className="table-header">Last Contact</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <tr key={client.id} style={{ cursor: 'pointer' }}>
                <td className="table-cell">
                  <Link to={`/clients/${client.id}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                    {client.name}
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/clients/${client.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {client.company}
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/clients/${client.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {client.phone}
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/clients/${client.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {client.email}
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/clients/${client.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {client.projects}
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/clients/${client.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <span className={statusBadge[client.status]}>{client.status}</span>
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/clients/${client.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {client.lastContact}
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="table-cell" colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                  No clients found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Clients;
