import { useParams, Link } from 'react-router-dom';
import {
  Star,
  HardHat,
  Phone,
  Mail,
  MapPin,
  Shield,
  Award,
  ArrowLeft,
} from 'lucide-react';
import { subcontractorService, projectService, invoiceService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

// Mock mapping: subcontractor -> project assignments
const subProjectMap = {
  'SUB-001': ['PRJ-001', 'PRJ-002', 'PRJ-005'],
  'SUB-002': ['PRJ-001', 'PRJ-002'],
  'SUB-003': ['PRJ-001', 'PRJ-004'],
  'SUB-004': ['PRJ-001'],
  'SUB-005': ['PRJ-002', 'PRJ-007'],
};

// Mock subcontractor invoice entries
const subInvoices = [
  { id: 'SINV-001', subId: 'SUB-001', project: 'Harrington Office Complex', description: 'Electrical rough-in - Floors 1-2', amount: 87500, date: '2026-03-10', status: 'Paid' },
  { id: 'SINV-002', subId: 'SUB-001', project: 'Wells Luxury Condos - Phase 1', description: 'Temporary power & panel install', amount: 34200, date: '2026-03-22', status: 'Pending' },
  { id: 'SINV-003', subId: 'SUB-001', project: 'Mitchell Estate - Custom Home', description: 'Service entrance & main panel', amount: 18900, date: '2026-02-28', status: 'Paid' },
  { id: 'SINV-004', subId: 'SUB-002', project: 'Harrington Office Complex', description: 'Underground sanitary & storm piping', amount: 62000, date: '2026-02-15', status: 'Paid' },
  { id: 'SINV-005', subId: 'SUB-002', project: 'Wells Luxury Condos - Phase 1', description: 'Foundation drain & waterproofing assist', amount: 28500, date: '2026-03-18', status: 'Pending' },
  { id: 'SINV-006', subId: 'SUB-003', project: 'Harrington Office Complex', description: 'HVAC ductwork fabrication - Phase 1', amount: 115000, date: '2026-03-05', status: 'Paid' },
  { id: 'SINV-007', subId: 'SUB-003', project: 'Vasquez Boutique Hotel', description: 'HVAC design review & consultation', amount: 8500, date: '2026-03-25', status: 'Pending' },
  { id: 'SINV-008', subId: 'SUB-004', project: 'Harrington Office Complex', description: 'Structural steel fabrication & erection', amount: 342000, date: '2026-03-01', status: 'Paid' },
  { id: 'SINV-009', subId: 'SUB-005', project: 'Wells Luxury Condos - Phase 1', description: 'Foundation pour - Units 1-6', amount: 96000, date: '2026-03-12', status: 'Paid' },
  { id: 'SINV-010', subId: 'SUB-005', project: 'Park Academy Expansion', description: 'Site concrete - sidewalks & curbs', amount: 41500, date: '2026-03-28', status: 'Pending' },
];

const invoiceStatusBadge = {
  Paid: 'badge-green',
  Pending: 'badge-yellow',
  Overdue: 'badge-red',
};

const projectStatusBadge = {
  'In Progress': 'badge-blue',
  'Planning': 'badge-yellow',
  'On Hold': 'badge-gray',
  'Completed': 'badge-green',
};

function StarRating({ rating, size = 16 }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
      {[...Array(full)].map((_, i) => (
        <Star key={`f${i}`} size={size} fill="#f59e0b" stroke="#f59e0b" />
      ))}
      {hasHalf && (
        <span style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
          <Star size={size} stroke="#d1d5db" style={{ position: 'absolute', top: 0, left: 0 }} />
          <span style={{ position: 'absolute', top: 0, left: 0, overflow: 'hidden', width: '50%' }}>
            <Star size={size} fill="#f59e0b" stroke="#f59e0b" />
          </span>
        </span>
      )}
      {[...Array(empty)].map((_, i) => (
        <Star key={`e${i}`} size={size} stroke="#d1d5db" />
      ))}
    </span>
  );
}

function SubcontractorDetail() {
  const { id } = useParams();
  const { data: subcontractors } = useSupabase(subcontractorService.list);
  const { data: projects } = useSupabase(projectService.list);
  const { data: invoices } = useSupabase(invoiceService.list);
  const sub = subcontractors.find((s) => s.id === id);

  if (!sub) {
    return (
      <div>
        <Link to="/subcontractors" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Subcontractors
        </Link>
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          Subcontractor not found.
        </div>
      </div>
    );
  }

  const assignedProjectIds = subProjectMap[sub.id] || [];
  const assignedProjects = projects.filter((p) => assignedProjectIds.includes(p.id));
  const subInvoiceList = subInvoices.filter((inv) => inv.subId === sub.id);

  const formatCurrency = (val) =>
    val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

  return (
    <div>
      <Link to="/subcontractors" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back to Subcontractors
      </Link>

      {/* Profile Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HardHat size={22} style={{ color: '#f59e0b' }} />
              {sub.name}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>{sub.trade}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <span className="badge-green">{sub.status}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <StarRating rating={sub.rating} size={18} />
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#374151' }}>{sub.rating.toFixed(1)}/5.0</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
            <Award size={16} style={{ color: '#6b7280' }} />
            <span><strong>Contact:</strong> {sub.contact}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
            <Phone size={16} style={{ color: '#6b7280' }} />
            {sub.phone}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
            <Mail size={16} style={{ color: '#6b7280' }} />
            {sub.email}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
            <MapPin size={16} style={{ color: '#6b7280' }} />
            {sub.address}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
            <Shield size={16} style={{ color: '#6b7280' }} />
            <span><strong>License #:</strong> {sub.license}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
            <Shield size={16} style={{ color: '#6b7280' }} />
            <span><strong>Insurance Expiry:</strong> {sub.insurance}</span>
          </div>
        </div>

        {/* Certifications */}
        <div style={{ marginTop: '1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Certifications
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {sub.certifications.map((cert) => (
              <span key={cert} className="badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Award size={12} />
                {cert}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Active Projects */}
      <div className="card" style={{ marginBottom: '1.5rem', overflow: 'auto' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Active Projects ({assignedProjects.length})
        </h2>
        {assignedProjects.length === 0 ? (
          <p style={{ color: '#9ca3af', padding: '1rem 0' }}>No active projects.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="table-header">Project</th>
                <th className="table-header">Client</th>
                <th className="table-header">Status</th>
                <th className="table-header">Progress</th>
                <th className="table-header">Budget</th>
                <th className="table-header">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {assignedProjects.map((proj) => (
                <tr key={proj.id}>
                  <td className="table-cell" style={{ fontWeight: 600 }}>
                    <Link to={`/projects/${proj.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {proj.name}
                    </Link>
                  </td>
                  <td className="table-cell">{proj.client}</td>
                  <td className="table-cell">
                    <span className={projectStatusBadge[proj.status] || 'badge-gray'}>{proj.status}</span>
                  </td>
                  <td className="table-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, minWidth: 60 }}>
                        <div style={{ width: `${proj.progress}%`, height: '100%', background: '#2563eb', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{proj.progress}%</span>
                    </div>
                  </td>
                  <td className="table-cell">{formatCurrency(proj.budget)}</td>
                  <td className="table-cell" style={{ whiteSpace: 'nowrap' }}>{proj.deadline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invoice History */}
      <div className="card" style={{ overflow: 'auto' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Invoice History ({subInvoiceList.length})
        </h2>
        {subInvoiceList.length === 0 ? (
          <p style={{ color: '#9ca3af', padding: '1rem 0' }}>No invoices on record.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="table-header">Invoice</th>
                <th className="table-header">Project</th>
                <th className="table-header">Description</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Date</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {subInvoiceList.map((inv) => (
                <tr key={inv.id}>
                  <td className="table-cell" style={{ fontWeight: 600 }}>{inv.id}</td>
                  <td className="table-cell">{inv.project}</td>
                  <td className="table-cell" style={{ color: '#6b7280', maxWidth: '280px' }}>{inv.description}</td>
                  <td className="table-cell">{formatCurrency(inv.amount)}</td>
                  <td className="table-cell" style={{ whiteSpace: 'nowrap' }}>{inv.date}</td>
                  <td className="table-cell">
                    <span className={invoiceStatusBadge[inv.status] || 'badge-gray'}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default SubcontractorDetail;
