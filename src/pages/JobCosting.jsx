import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  PieChart,
  Search,
  Package,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { jobCostService, materialService, projectService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatCurrencyDecimal = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const getVarianceColor = (variance) => (variance >= 0 ? '#10b981' : '#ef4444');

const getUsageColor = (pct) => {
  if (pct > 100) return '#ef4444';
  if (pct >= 80) return '#f59e0b';
  return '#10b981';
};

const ChartTooltip = ({ active, payload, label }) => {
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
        {payload.map((entry, i) => (
          <p key={i} style={{ margin: '0.25rem 0 0', fontWeight: 600, color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function JobCosting() {
  const { data: jobCostData } = useSupabase(jobCostService.list);
  const { data: materialCatalog } = useSupabase(materialService.list);
  const { data: projects } = useSupabase(projectService.list);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');

  // Auto-select first project when data loads
  React.useEffect(() => {
    if (jobCostData.length > 0 && !selectedProjectId) {
      setSelectedProjectId(jobCostData[0]?.projectId || '');
    }
  }, [jobCostData, selectedProjectId]);

  const selectedProject = useMemo(
    () => jobCostData.find((p) => p.projectId === selectedProjectId),
    [selectedProjectId]
  );

  const totals = useMemo(() => {
    if (!selectedProject) return { budget: 0, spent: 0, remaining: 0, margin: 0 };
    const budget = selectedProject.categories.reduce((s, c) => s + c.budgeted, 0);
    const spent = selectedProject.categories.reduce((s, c) => s + c.actual, 0);
    const remaining = budget - spent;
    const margin = budget > 0 ? ((remaining / budget) * 100).toFixed(1) : 0;
    return { budget, spent, remaining, margin };
  }, [selectedProject]);

  const budgetConsumedPct = totals.budget > 0 ? (totals.spent / totals.budget) * 100 : 0;

  const filteredMaterials = useMemo(() => {
    if (!materialSearch.trim()) return materialCatalog;
    const q = materialSearch.toLowerCase();
    return materialCatalog.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.unit.toLowerCase().includes(q)
    );
  }, [materialSearch]);

  const chartData = useMemo(() => {
    if (!selectedProject) return [];
    return selectedProject.categories.map((c) => ({
      category: c.category,
      Budgeted: c.budgeted,
      Actual: c.actual,
    }));
  }, [selectedProject]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Job Costing & Budgeting
          </h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
            Track project budgets, costs, and profitability
          </p>
        </div>

        {/* Project Selector */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{
              appearance: 'none',
              padding: '0.625rem 2.5rem 0.625rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              background: '#fff',
              color: '#0f172a',
              cursor: 'pointer',
              minWidth: '280px',
            }}
          >
            {jobCostData.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.projectName}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* Profitability Summary Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <TrendingUp size={20} style={{ color: '#3b82f6' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            Profitability Summary
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Total Budget</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0.25rem 0 0' }}>{formatCurrency(totals.budget)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Total Spent</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444', margin: '0.25rem 0 0' }}>{formatCurrency(totals.spent)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Remaining</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', margin: '0.25rem 0 0' }}>{formatCurrency(totals.remaining)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Profit Margin</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: parseFloat(totals.margin) >= 20 ? '#10b981' : '#f59e0b', margin: '0.25rem 0 0' }}>{totals.margin}%</p>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.375rem' }}>
            <span>Budget Consumed</span>
            <span>{budgetConsumedPct.toFixed(1)}%</span>
          </div>
          <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(budgetConsumedPct, 100)}%`,
                height: '100%',
                background: getUsageColor(budgetConsumedPct),
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Cost Breakdown Table & Chart Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Cost Breakdown Table */}
        <div
          style={{
            background: '#fff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <PieChart size={20} style={{ color: '#8b5cf6' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Cost Breakdown
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Category', 'Budgeted ($)', 'Actual ($)', 'Variance ($)', '% Used'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.625rem 0.75rem',
                        textAlign: h === 'Category' ? 'left' : 'right',
                        color: '#64748b',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedProject?.categories.map((cat) => {
                  const variance = cat.budgeted - cat.actual;
                  const pctUsed = cat.budgeted > 0 ? (cat.actual / cat.budgeted) * 100 : 0;
                  return (
                    <tr key={cat.category} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500, color: '#0f172a' }}>
                        {cat.category}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#334155' }}>
                        {formatCurrency(cat.budgeted)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#334155' }}>
                        {formatCurrency(cat.actual)}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          color: getVarianceColor(variance),
                          fontWeight: 600,
                        }}
                      >
                        {variance >= 0 ? '+' : ''}
                        {formatCurrency(variance)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <div style={{ width: '60px', height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(pctUsed, 100)}%`,
                                height: '100%',
                                background: getUsageColor(pctUsed),
                                borderRadius: '999px',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: getUsageColor(pctUsed), minWidth: '42px' }}>
                            {pctUsed.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Chart */}
        <div
          style={{
            background: '#fff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <DollarSign size={20} style={{ color: '#f59e0b' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Budget vs Actual by Category
            </h2>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '0.8rem' }}
              />
              <Bar dataKey="Budgeted" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
              <Bar dataKey="Actual" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Material Catalog */}
      <div
        style={{
          background: '#fff',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={20} style={{ color: '#06b6d4' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Material Catalog
            </h2>
          </div>

          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search materials..."
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                outline: 'none',
                width: '260px',
                color: '#0f172a',
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['Item Name', 'Unit', 'Cost per Unit ($)'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '0.625rem 0.75rem',
                      textAlign: h === 'Cost per Unit ($)' ? 'right' : 'left',
                      color: '#64748b',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map((mat) => (
                <tr key={mat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 500, color: '#0f172a' }}>
                    {mat.name}
                  </td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>{mat.unit}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                    {formatCurrencyDecimal(mat.cost)}
                  </td>
                </tr>
              ))}
              {filteredMaterials.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}
                  >
                    No materials found matching "{materialSearch}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
