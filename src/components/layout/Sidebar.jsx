import { NavLink } from 'react-router-dom';
import boulderLogo from '../../assets/boulder-logo.png';
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Clock,
  FileText,
  Receipt,
  DollarSign,
  Users,
  FolderOpen,
  BarChart3,
  Settings,
  ClipboardList,
  ShieldCheck,
  HardHat,
  FileSignature,
  MessageSquare,
  BookOpen,
} from 'lucide-react';

// Brand orange extracted from the Boulder logo
const BRAND = '#f07030';

const navSections = [
  {
    label: 'Main',
    links: [
      { to: '/', icon: LayoutDashboard, text: 'Dashboard' },
    ],
  },
  {
    label: 'Work',
    links: [
      { to: '/projects', icon: FolderKanban, text: 'Projects' },
      { to: '/scheduling', icon: Calendar, text: 'Scheduling' },
      { to: '/time-tracking', icon: Clock, text: 'Time Tracking' },
      { to: '/change-orders', icon: ClipboardList, text: 'Change Orders' },
      { to: '/rfis', icon: MessageSquare, text: 'RFIs' },
      { to: '/daily-logs', icon: BookOpen, text: 'Daily Logs' },
    ],
  },
  {
    label: 'Finance',
    links: [
      { to: '/contracts', icon: FileSignature, text: 'Contracts' },
      { to: '/estimates', icon: FileText, text: 'Estimates' },
      { to: '/invoices', icon: Receipt, text: 'Invoices (G702)' },
      { to: '/lien-waivers', icon: ShieldCheck, text: 'Lien Waivers' },
      { to: '/job-costing', icon: DollarSign, text: 'Job Costing' },
    ],
  },
  {
    label: 'People',
    links: [
      { to: '/clients', icon: Users, text: 'Clients' },
      { to: '/subcontractors', icon: HardHat, text: 'Subcontractors' },
    ],
  },
  {
    label: 'Other',
    links: [
      { to: '/documents', icon: FolderOpen, text: 'Documents' },
      { to: '/reports', icon: BarChart3, text: 'Reports' },
      { to: '/settings', icon: Settings, text: 'Settings' },
    ],
  },
];

function Sidebar() {
  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 240,
        height: '100vh',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        overflowY: 'auto',
        zIndex: 50,
        borderRight: '1px solid #e5e7eb',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1.25rem 1rem 1rem',
          borderBottom: '1px solid #f3f4f6',
          gap: '0.25rem',
        }}
      >
        <img
          src={boulderLogo}
          alt="Boulder Construction"
          style={{ width: '140px', height: 'auto', display: 'block' }}
        />
        <div style={{ color: '#9ca3af', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Construction CRM
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0', padding: '0.75rem 0.75rem 0' }}>
        {navSections.map((section) => (
          <div key={section.label} style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                color: '#d1d5db',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '0 0.5rem',
                marginBottom: '0.25rem',
              }}
            >
              {section.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {section.links.map(({ to, icon: Icon, text }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `sidebar-link${isActive ? ' active' : ''}`
                  }
                >
                  <Icon size={16} />
                  {text}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.875rem 1rem',
          borderTop: '1px solid #f3f4f6',
          margin: '0 0.75rem 0.75rem',
          borderRadius: '0.625rem',
          background: '#fafafa',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: BRAND,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.7rem',
            flexShrink: 0,
          }}
        >
          MT
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#111827', fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Mike Thornton
          </div>
          <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>
            Admin
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
