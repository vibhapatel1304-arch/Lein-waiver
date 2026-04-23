import React, { useState } from 'react';
import { Download, FileText, Filter } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  revenueService,
  projectService,
  invoiceService,
  timesheetService,
  employeeService,
  clientService,
  jobCostService,
} from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

// ── Computed Data functions ──────────────────────────────────────────
function computeProfitabilityData(jobCostData) {
  return jobCostData
    .map((p) => {
      const totalBudget = (p.categories || []).reduce((s, c) => s + c.budgeted, 0);
      const totalSpent = (p.categories || []).reduce((s, c) => s + c.actual, 0);
      const profitLoss = totalBudget - totalSpent;
      const margin = totalBudget > 0 ? (profitLoss / totalBudget) * 100 : 0;
      return {
        projectId: p.projectId,
        projectName: p.projectName,
        totalBudget,
        totalSpent,
        profitLoss,
        margin,
      };
    })
    .sort((a, b) => b.margin - a.margin);
}

function computeEmployeeHoursData(timesheetEntries) {
  const employeeHoursMap = {};
  timesheetEntries.forEach((ts) => {
    if (!employeeHoursMap[ts.employeeId]) {
      employeeHoursMap[ts.employeeId] = {
        name: ts.employee,
        totalHours: 0,
        projects: new Set(),
        days: new Set(),
      };
    }
    employeeHoursMap[ts.employeeId].totalHours += ts.hours;
    if (ts.projectId) employeeHoursMap[ts.employeeId].projects.add(ts.projectId);
    employeeHoursMap[ts.employeeId].days.add(ts.date);
  });
  return Object.entries(employeeHoursMap).map(([id, data]) => ({
    id,
    name: data.name,
    totalHours: data.totalHours,
    projectCount: data.projects.size,
    avgHoursPerDay: data.days.size > 0 ? (data.totalHours / data.days.size).toFixed(1) : '0.0',
  }));
}

function computeInvoiceAgingData(invoices) {
  const paidCount = invoices.filter((i) => i.status === 'Paid').length;
  const pendingCount = invoices.filter((i) => i.status === 'Pending').length;
  const overdueCount = invoices.filter((i) => i.status === 'Overdue').length;
  return [
    { name: 'Paid', value: paidCount, color: '#10b981' },
    { name: 'Pending', value: pendingCount, color: '#f59e0b' },
    { name: 'Overdue', value: overdueCount, color: '#ef4444' },
  ];
}

// ── Tooltip Components ─────────────────────────────────────

const RevenueTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={tooltipBox}>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{label}</p>
        <p style={{ margin: '0.25rem 0 0', fontWeight: 600, color: '#0f172a' }}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const HoursTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={tooltipBox}>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{payload[0].payload.name}</p>
        <p style={{ margin: '0.25rem 0 0', fontWeight: 600, color: '#0f172a' }}>
          {payload[0].value} hours
        </p>
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={tooltipBox}>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{payload[0].name}</p>
        <p style={{ margin: '0.25rem 0 0', fontWeight: 600, color: '#0f172a' }}>
          {payload[0].value} invoice{payload[0].value !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
};

const tooltipBox = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '0.5rem',
  padding: '0.75rem 1rem',
  boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
};

// ── Styles ─────────────────────────────────────────────────

const cardStyle = {
  background: '#fff',
  borderRadius: '0.75rem',
  border: '1px solid #e2e8f0',
  padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const sectionTitle = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#0f172a',
  margin: '0 0 1rem 0',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.875rem',
};

const thStyle = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  borderBottom: '2px solid #e2e8f0',
  color: '#64748b',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid #f1f5f9',
  color: '#334155',
};

// ── Component ──────────────────────────────────────────────

export default function Reports() {
  const { data: revenueData } = useSupabase(revenueService.list);
  const { data: projects } = useSupabase(projectService.list);
  const { data: invoices } = useSupabase(invoiceService.list);
  const { data: timesheetEntries } = useSupabase(timesheetService.list);
  const { data: employees } = useSupabase(employeeService.list);
  const { data: clients } = useSupabase(clientService.list);
  const { data: jobCostData } = useSupabase(jobCostService.list);

  const profitabilityData = computeProfitabilityData(jobCostData);
  const employeeHoursData = computeEmployeeHoursData(timesheetEntries);
  const employeeChartData = employeeHoursData
    .map((e) => ({ name: e.name.split(' ')[0], hours: e.totalHours }))
    .sort((a, b) => b.hours - a.hours);
  const invoiceAgingData = computeInvoiceAgingData(invoices);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedClient, setSelectedClient] = useState('');

  const handleExport = (type) => {
    alert(`Export ${type} — this feature will generate a downloadable ${type} report.`);
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Reports & Analytics
          </h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            Financial insights and project performance metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={() => handleExport('PDF')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} />
            Export PDF
          </button>
          <button className="btn-secondary" onClick={() => handleExport('CSV')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>
          <Filter size={16} />
          Filters
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          style={inputStyle}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          style={inputStyle}
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* 1. Revenue by Month Chart */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <h2 style={sectionTitle}>Revenue by Month</h2>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
              <Tooltip content={<RevenueTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fill="url(#amberGradient)"
                dot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Project Profitability Table */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <h2 style={sectionTitle}>Project Profitability</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Project Name</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Budget</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Spent</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Profit / Loss</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {profitabilityData.map((row) => {
                const isProfitable = row.profitLoss >= 0;
                const accentColor = isProfitable ? '#10b981' : '#ef4444';
                return (
                  <tr key={row.projectId} style={{ transition: 'background 0.15s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#0f172a' }}>{row.projectName}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(row.totalBudget)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(row.totalSpent)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: accentColor, fontFamily: 'monospace' }}>
                      {isProfitable ? '+' : ''}{formatCurrency(row.profitLoss)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: accentColor,
                        background: isProfitable ? '#ecfdf5' : '#fef2f2',
                      }}>
                        {row.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Employee Hours Report */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Table */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Employee Hours</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Employee</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total Hours</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Projects</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Avg Hrs/Day</th>
                </tr>
              </thead>
              <tbody>
                {employeeHoursData
                  .sort((a, b) => b.totalHours - a.totalHours)
                  .map((emp) => (
                    <tr key={emp.id} style={{ transition: 'background 0.15s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#0f172a' }}>{emp.name}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{emp.totalHours}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          background: '#eff6ff',
                          color: '#3b82f6',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}>
                          {emp.projectCount}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{emp.avgHoursPerDay}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bar Chart */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Hours by Employee</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={employeeChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#334155', fontWeight: 500 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<HoursTooltip />} />
                <Bar dataKey="hours" radius={[0, 6, 6, 0]} barSize={24}>
                  {employeeChartData.map((_, idx) => (
                    <Cell key={idx} fill={['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][idx % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Invoice Aging Summary */}
      <div style={cardStyle}>
        <h2 style={sectionTitle}>Invoice Aging Summary</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
          {/* Donut Chart */}
          <div style={{ width: 280, height: 280, flexShrink: 0 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={invoiceAgingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {invoiceAgingData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend / Summary Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            {invoiceAgingData.map((item) => {
              const matchingInvoices = invoices.filter((i) => i.status === item.name);
              const totalAmount = matchingInvoices.reduce((s, i) => s + i.amount, 0);
              return (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    borderRadius: '0.5rem',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: item.color,
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{item.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      {item.value} invoice{item.value !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', fontSize: '1rem' }}>
                    {formatCurrency(totalAmount)}
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

const inputStyle = {
  padding: '0.45rem 0.75rem',
  borderRadius: '0.375rem',
  border: '1px solid #e2e8f0',
  fontSize: '0.85rem',
  color: '#334155',
  background: '#fff',
  outline: 'none',
};
