import React from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Receipt,
  DollarSign,
  AlertCircle,
  Plus,
  FileText,
  UserPlus,
  CreditCard,
  ClipboardList,
  FileEdit,
  Clock,
  Shield,
  Upload,
  CheckCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell,
} from 'recharts';
import {
  projectService,
  invoiceService,
  payAppService,
  lienWaiverService,
  revenueService,
} from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const currentUser = { name: 'Mike Thornton', initials: 'MT' };

const today = new Date();
const formattedDate = today.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const STATUS_COLORS = {
  'In Progress': '#3b82f6',
  Planning: '#8b5cf6',
  'On Hold': '#f59e0b',
  Completed: '#10b981',
};

const activityIcons = {
  payment: CreditCard,
  log: ClipboardList,
  change_order: FileEdit,
  rfi: FileText,
  estimate: FileText,
  timesheet: Clock,
  inspection: Shield,
  document: Upload,
};

const activityColors = {
  payment: '#10b981',
  log: '#3b82f6',
  change_order: '#f59e0b',
  rfi: '#8b5cf6',
  estimate: '#06b6d4',
  timesheet: '#6366f1',
  inspection: '#10b981',
  document: '#64748b',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          padding: '0.75rem 1rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{label}</p>
        <p style={{ margin: '0.25rem 0 0', fontWeight: 600, color: '#0f172a' }}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const BarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          padding: '0.75rem 1rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
          {payload[0].payload.status}
        </p>
        <p style={{ margin: '0.25rem 0 0', fontWeight: 600, color: '#0f172a' }}>
          {payload[0].value} {payload[0].value === 1 ? 'project' : 'projects'}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { data: projects } = useSupabase(projectService.list);
  const { data: invoices } = useSupabase(invoiceService.list);
  const { data: payApplications } = useSupabase(payAppService.list);
  const { data: lienWaivers } = useSupabase(lienWaiverService.list);
  const { data: revenueData } = useSupabase(revenueService.list);

  const firstName = currentUser.name.split(' ')[0];

  // Stat calculations
  const activeProjects = projects.filter((p) => p.status === 'In Progress').length;
  const pendingInvoices = invoices.filter((i) => i.status === 'Pending').length;

  const outstandingInvoiceAmt = invoices
    .filter((i) => i.status === 'Pending' || i.status === 'Overdue')
    .reduce((s, i) => s + (i.amount || i.currentPaymentDue || i.current_payment_due || 0), 0);
  const outstandingPayAppAmt = payApplications
    .filter((pa) => pa.status === 'Submitted' || pa.status === 'Approved')
    .reduce((s, pa) => s + (pa.currentPaymentDue || pa.current_payment_due || 0), 0);
  const unsignedWaivers = lienWaivers.filter((w) => w.status !== 'Signed').length;
  const totalCrossModuleOutstanding = outstandingInvoiceAmt + outstandingPayAppAmt;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const marchRevenue = invoices
    .filter((i) => {
      if (i.status !== 'Paid') return false;
      const paidDate = i.paidDate || i.paid_date;
      if (!paidDate) return false;
      const paid = new Date(paidDate);
      return paid.getMonth() === currentMonth && paid.getFullYear() === currentYear;
    })
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const sixtyDaysFromNow = new Date(today);
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
  const upcomingDeadlines = projects.filter((p) => {
    if (p.status === 'Completed') return false;
    const deadline = new Date(p.deadline);
    return deadline >= today && deadline <= sixtyDaysFromNow;
  }).length;

  // Compute project status data from live data
  const statusCounts = {};
  projects.forEach((p) => {
    const s = p.status || 'Unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const projectStatusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  // Compute recent activity from invoices/projects
  const recentActivity = invoices
    .slice(0, 8)
    .map((inv, idx) => ({
      id: `act-${idx}`,
      type: 'payment',
      action: `Invoice ${inv.invoiceNumber || inv.invoice_number || inv.id} — ${inv.status}`,
      user: inv.client || inv.client_name || 'System',
      time: inv.date || inv.created_at || '',
    }));

  return (
    <div style={{ padding: '0' }}>
      {/* Welcome header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.75rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Welcome back, {firstName} 👋
          </h1>
          <p style={{ color: '#9ca3af', margin: '0.2rem 0 0', fontSize: '0.8125rem' }}>
            {formattedDate}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <Link to="/projects/create" className="btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={15} />
            New Project
          </Link>
          <Link to="/invoices/create" className="btn-secondary" style={{ textDecoration: 'none' }}>
            <FileText size={15} />
            New Invoice
          </Link>
          <Link to="/clients/create" className="btn-secondary" style={{ textDecoration: 'none' }}>
            <UserPlus size={15} />
            New Client
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Projects
              </p>
              <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: '0.375rem 0 0', letterSpacing: '-0.02em' }}>
                {activeProjects}
              </p>
            </div>
            <div style={{ background: '#fff7ed', borderRadius: '0.625rem', padding: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderKanban size={20} color="#f97316" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pending Invoices
              </p>
              <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: '0.375rem 0 0', letterSpacing: '-0.02em' }}>
                {pendingInvoices}
              </p>
            </div>
            <div style={{ background: '#fff7ed', borderRadius: '0.625rem', padding: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={20} color="#f97316" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Revenue This Month
              </p>
              <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: '0.375rem 0 0', letterSpacing: '-0.02em' }}>
                {formatCurrency(marchRevenue)}
              </p>
            </div>
            <div style={{ background: '#ecfdf5', borderRadius: '0.625rem', padding: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} color="#059669" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Upcoming Deadlines
              </p>
              <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: '0.375rem 0 0', letterSpacing: '-0.02em' }}>
                {upcomingDeadlines}
              </p>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: '0.625rem', padding: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={20} color="#ef4444" />
            </div>
          </div>
        </div>

        {/* Outstanding Cross-Module */}
        <Link to="/invoices" style={{ textDecoration: 'none' }}>
          <div className="stat-card" style={{ cursor: 'pointer', borderLeft: '3px solid #f97316' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Outstanding
                </p>
                <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#dc2626', margin: '0.375rem 0 0', letterSpacing: '-0.02em' }}>
                  {formatCurrency(totalCrossModuleOutstanding)}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0.25rem 0 0' }}>
                  {unsignedWaivers} waiver{unsignedWaivers !== 1 ? 's' : ''} unsigned
                </p>
              </div>
              <div style={{ background: '#fef2f2', borderRadius: '0.625rem', padding: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={20} color="#dc2626" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts + Activity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 380px',
          gap: '1.5rem',
        }}
      >
        {/* Line chart - Monthly Revenue */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#0f172a',
              margin: '0 0 1.25rem',
            }}
          >
            Monthly Revenue
          </h3>
          <div style={{ width: '100%', height: 280, minHeight: 280 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#revenueGradient)"
                  dot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar chart - Project Status */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#0f172a',
              margin: '0 0 1.25rem',
            }}
          >
            Project Status Breakdown
          </h3>
          <div style={{ width: '100%', height: 280, minHeight: 280 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <BarChart data={projectStatusData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={48}>
                  {projectStatusData.map((entry, index) => (
                    <Cell key={index} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#0f172a',
              margin: '0 0 1.25rem',
            }}
          >
            Recent Activity
          </h3>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            {recentActivity.map((activity) => {
              const Icon = activityIcons[activity.type] || CheckCircle;
              const iconColor = activityColors[activity.type] || '#64748b';
              return (
                <div
                  key={activity.id}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: `${iconColor}14`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={15} color={iconColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        color: '#1e293b',
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {activity.action}
                    </p>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        margin: '0.25rem 0 0',
                      }}
                    >
                      {activity.user} &middot; {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
