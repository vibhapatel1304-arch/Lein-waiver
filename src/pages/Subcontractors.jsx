import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Star, HardHat } from 'lucide-react';
import { subcontractorService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const statusBadge = {
  Active: 'badge-green',
  Inactive: 'badge-gray',
};

function StarRating({ rating }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
      {[...Array(full)].map((_, i) => (
        <Star key={`f${i}`} size={14} fill="#f59e0b" stroke="#f59e0b" />
      ))}
      {hasHalf && (
        <span style={{ position: 'relative', display: 'inline-block', width: 14, height: 14 }}>
          <Star size={14} stroke="#d1d5db" style={{ position: 'absolute', top: 0, left: 0 }} />
          <span style={{ position: 'absolute', top: 0, left: 0, overflow: 'hidden', width: '50%' }}>
            <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
          </span>
        </span>
      )}
      {[...Array(empty)].map((_, i) => (
        <Star key={`e${i}`} size={14} stroke="#d1d5db" />
      ))}
      <span style={{ marginLeft: '0.35rem', fontSize: '0.8rem', color: '#6b7280' }}>
        {rating.toFixed(1)}/5.0
      </span>
    </span>
  );
}

function Subcontractors() {
  const [search, setSearch] = useState('');
  const { data: subcontractors } = useSupabase(subcontractorService.list);

  const filtered = subcontractors.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.trade.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.contact.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HardHat size={24} /> Subcontractors
        </h1>
        <Link to="/subcontractors/create" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Plus size={16} />
          Add Subcontractor
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search by name, trade, contact, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: '2.25rem', width: '100%' }}
          />
        </div>
      </div>

      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="table-header">Name</th>
              <th className="table-header">Trade</th>
              <th className="table-header">Phone</th>
              <th className="table-header">Email</th>
              <th className="table-header">Active Projects</th>
              <th className="table-header">Rating</th>
              <th className="table-header">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sub) => (
              <tr key={sub.id} style={{ cursor: 'pointer' }}>
                <td className="table-cell">
                  <Link to={`/subcontractors/${sub.id}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                    {sub.name}
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/subcontractors/${sub.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {sub.trade}
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/subcontractors/${sub.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {sub.phone}
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/subcontractors/${sub.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {sub.email}
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/subcontractors/${sub.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {sub.activeProjects}
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/subcontractors/${sub.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <StarRating rating={sub.rating} />
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/subcontractors/${sub.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <span className={statusBadge[sub.status] || 'badge-gray'}>{sub.status}</span>
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="table-cell" colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                  No subcontractors found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Subcontractors;
