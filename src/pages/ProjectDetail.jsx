import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  Users,
  ClipboardList,
  FileText,
  BookOpen,
  BarChart3,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  File,
  Presentation,
  HardHat,
} from 'lucide-react';
import { projectService, employeeService, documentService, changeOrderService, invoiceService } from '../services/supabaseService';
import { useSupabase, useSupabaseById } from '../hooks/useSupabase';

const statusBadge = {
  'In Progress': 'badge-blue',
  Planning: 'badge-amber',
  'On Hold': 'badge-gray',
  Completed: 'badge-green',
  Pending: 'badge-gray',
  'Under Review': 'badge-amber',
  Approved: 'badge-green',
};

function progressColor(pct) {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-blue-500';
  if (pct >= 25) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getInitialsColor(name) {
  const colors = [
    'bg-blue-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-purple-600',
    'bg-rose-600',
    'bg-cyan-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

function fileIcon(type) {
  switch (type) {
    case 'PDF':
      return <FileText size={18} className="text-red-500" />;
    case 'CAD':
      return <FileSpreadsheet size={18} className="text-blue-500" />;
    case 'Archive':
      return <FileArchive size={18} className="text-amber-500" />;
    case 'Presentation':
      return <Presentation size={18} className="text-orange-500" />;
    case 'Word':
      return <FileText size={18} className="text-blue-700" />;
    case 'Image':
      return <FileImage size={18} className="text-green-500" />;
    default:
      return <File size={18} className="text-gray-400" />;
  }
}

const tabs = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'invoices', label: 'Invoices', icon: DollarSign },
  { key: 'tasks', label: 'Tasks', icon: ClipboardList },
  { key: 'files', label: 'Files', icon: FileText },
  { key: 'dailylog', label: 'Daily Log', icon: BookOpen },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: project, loading: projectLoading } = useSupabaseById(projectService.getById, id);
  const { data: employees } = useSupabase(employeeService.list);
  const { data: documents } = useSupabase(documentService.list);
  const { data: allChangeOrders } = useSupabase(changeOrderService.list);
  const { data: allInvoices } = useSupabase(invoiceService.list);

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-20 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </Link>
        <div className="text-center py-20 text-gray-500">
          Project not found.
        </div>
      </div>
    );
  }

  const projectDocs = documents.filter((d) => d.projectId === project.id || d.project_id === project.id);
  const projectCOs = allChangeOrders.filter((c) => c.projectId === project.id || c.project_id === project.id);
  const projectInvoices = allInvoices.filter((i) => i.project_id === project.id || i.projectId === project.id);

  const budgetPct = Math.round((project.spent / project.budget) * 100);

  // Group tasks by phase
  const tasksByPhase = {};
  (project.tasks || []).forEach((task) => {
    if (!tasksByPhase[task.phase]) tasksByPhase[task.phase] = [];
    tasksByPhase[task.phase].push(task);
  });

  // Find employee details for team members
  const teamDetails = (project.team || []).map((name) => {
    const emp = employees.find((e) => e.name === name);
    return {
      name,
      role: emp ? emp.role : '',
      initials: emp ? emp.initials : getInitials(name),
    };
  });

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        <ArrowLeft size={16} />
        Back to Projects
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {project.name}
              </h1>
              <span
                className={`${
                  statusBadge[project.status] || 'badge-gray'
                } text-xs px-2.5 py-1 rounded-full font-medium`}
              >
                {project.status}
              </span>
            </div>
            <p className="text-gray-500">{project.client}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Overall Progress</span>
            <span className="font-semibold text-gray-700">
              {project.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`${progressColor(project.progress)} h-3 rounded-full transition-all`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab
          project={project}
          budgetPct={budgetPct}
          teamDetails={teamDetails}
          projectCOs={projectCOs}
        />
      )}
      {activeTab === 'invoices' && <InvoicesTab invoices={projectInvoices} projectId={project.id} />}
      {activeTab === 'tasks' && (
        <TasksTab tasksByPhase={tasksByPhase} />
      )}
      {activeTab === 'files' && <FilesTab docs={projectDocs} />}
      {activeTab === 'dailylog' && (
        <DailyLogTab logs={project.dailyLogs || []} />
      )}
    </div>
  );
}

/* =================== OVERVIEW TAB =================== */
function OverviewTab({ project, budgetPct, teamDetails, projectCOs }) {
  const completedTasks = (project.tasks || []).filter(
    (t) => t.status === 'Completed'
  ).length;
  const totalTasks = (project.tasks || []).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Budget Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={20} className="text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Budget</h2>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Budget</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(project.budget)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Spent to Date</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(project.spent)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Remaining</span>
            <span
              className={`font-semibold ${
                project.budget - project.spent >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {formatCurrency(project.budget - project.spent)}
            </span>
          </div>
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Budget Used</span>
              <span className="text-gray-500">{budgetPct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Start Date</span>
            <span className="font-medium text-gray-900">
              {project.startDate}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Deadline</span>
            <span className="font-medium text-gray-900">
              {project.deadline}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Current Phase</span>
            <span className="font-medium text-gray-900">{project.phase}</span>
          </div>
        </div>
      </div>

      {/* Team Members Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} className="text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        </div>
        <div className="space-y-3">
          {teamDetails.map((member) => (
            <div key={member.name} className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${getInitialsColor(member.name)}`}
              >
                {member.initials}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {member.name}
                </p>
                {member.role && (
                  <p className="text-xs text-gray-500">{member.role}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Stats Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-900">Key Stats</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {completedTasks}/{totalTasks}
            </p>
            <p className="text-xs text-gray-500 mt-1">Tasks Completed</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {project.team.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Team Members</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {projectCOs.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Change Orders</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {(project.dailyLogs || []).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Daily Logs</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =================== TASKS TAB =================== */
function TasksTab({ tasksByPhase }) {
  const phases = Object.keys(tasksByPhase);

  if (phases.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No tasks for this project.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {phases.map((phase) => (
        <div
          key={phase}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">{phase}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {tasksByPhase[phase].map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.status === 'Completed'
                        ? 'bg-green-500'
                        : task.status === 'In Progress'
                          ? 'bg-blue-500'
                          : task.status === 'On Hold'
                            ? 'bg-amber-500'
                            : 'bg-gray-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {task.name}
                    </p>
                    <p className="text-xs text-gray-500">{task.assignee}</p>
                  </div>
                </div>
                <span
                  className={`${
                    statusBadge[task.status] || 'badge-gray'
                  } text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ml-3`}
                >
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =================== FILES TAB =================== */
function FilesTab({ docs }) {
  if (docs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No files for this project.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0">{fileIcon(doc.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {doc.name}
              </p>
              <p className="text-xs text-gray-500">
                {doc.category} &middot; {doc.size}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm text-gray-600">{doc.uploadDate}</p>
              <p className="text-xs text-gray-400">{doc.uploadedBy}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =================== DAILY LOG TAB =================== */
function DailyLogTab({ logs }) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No daily log entries yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((entry, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-blue-600" />
              <span className="font-semibold text-gray-900">{entry.date}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <HardHat size={14} />
              <span>{entry.crew} crew members</span>
            </div>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {entry.summary}
          </p>
        </div>
      ))}
    </div>
  );
}

/* =================== INVOICES TAB =================== */
function InvoicesTab({ invoices, projectId }) {
  const invoiceStatusColor = {
    Paid: '#059669', Approved: '#059669', Pending: '#d97706',
    Overdue: '#dc2626', Draft: '#64748b', Submitted: '#3b82f6', Rejected: '#dc2626',
  };

  const totalBilled = invoices.reduce((s, i) => s + parseFloat(i.current_payment_due ?? i.amount ?? 0), 0);
  const totalPaid = invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + parseFloat(i.current_payment_due ?? i.amount ?? 0), 0);
  const totalOutstanding = totalBilled - totalPaid;

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 mb-4">No invoices for this project yet.</p>
        <Link
          to={`/invoices/create?projectId=${projectId}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition"
        >
          + Create Invoice
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Billed</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalBilled)}</p>
          <p className="text-xs text-gray-500 mt-1">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Paid</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-gray-500 mt-1">{invoices.filter((i) => i.status === 'Paid').length} paid</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Outstanding</p>
          <p className="text-xl font-bold" style={{ color: totalOutstanding > 0 ? '#dc2626' : '#059669' }}>{formatCurrency(totalOutstanding)}</p>
          <p className="text-xs text-gray-500 mt-1">{invoices.filter((i) => i.status === 'Pending' || i.status === 'Overdue').length} pending</p>
        </div>
      </div>

      {/* Invoice table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Pay Applications</h3>
          <Link
            to={`/invoices/create?projectId=${projectId}`}
            className="text-xs font-semibold text-orange-500 hover:text-orange-600"
          >
            + New Invoice
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-semibold">Invoice</th>
              <th className="text-left px-5 py-3 font-semibold">Date</th>
              <th className="text-left px-5 py-3 font-semibold">Contract</th>
              <th className="text-right px-5 py-3 font-semibold">Amount</th>
              <th className="text-center px-5 py-3 font-semibold">Status</th>
              <th className="text-right px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const amount = parseFloat(inv.current_payment_due ?? inv.amount ?? 0);
              const date = inv.application_date || inv.period_to || inv.issue_date || '';
              const contractId = inv.contract_id || inv.contractId || null;
              const color = invoiceStatusColor[inv.status] || '#64748b';
              return (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-5 py-3">
                    <Link to={`/invoices/${inv.id}`} className="font-semibold text-blue-600 hover:text-blue-800">
                      {inv.id}
                    </Link>
                    {inv.application_no && (
                      <span className="text-gray-400 text-xs ml-2">App #{inv.application_no}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    {contractId ? (
                      <Link to={`/contracts/${contractId}`} className="text-purple-600 font-medium text-xs hover:text-purple-800">
                        {contractId}
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(amount)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: color + '18', color }}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/invoices/${inv.id}`} className="text-xs font-semibold text-orange-500 hover:text-orange-600">
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
