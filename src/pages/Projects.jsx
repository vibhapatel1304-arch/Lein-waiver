import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  LayoutGrid,
  List,
  Search,
  Calendar,
  DollarSign,
  Users,
  Loader2,
} from 'lucide-react';
import { projectService, employeeService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const statusBadge = {
  'In Progress': 'badge-blue',
  'Planning': 'badge-amber',
  'On Hold': 'badge-gray',
  'Completed': 'badge-green',
};

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

function progressColor(pct) {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-blue-500';
  if (pct >= 25) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatBudget(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Projects() {
  const [view, setView] = useState('card');
  const [search, setSearch] = useState('');

  const { data: projects, loading } = useSupabase(projectService.list);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
        <Loader2 size={36} style={{ color: '#2563eb', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading projects...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <Link to="/projects/create" className="btn-primary flex items-center gap-2" style={{ textDecoration: 'none' }}>
          <Plus size={18} />
          New Project
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search projects by name, client, or status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setView('card')}
            className={`p-2 ${
              view === 'card'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title="Card view"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setView('table')}
            className={`p-2 ${
              view === 'table'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title="Table view"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((project) => (
            <Link
              to={`/projects/${project.id}`}
              key={project.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow block"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1 mr-3">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {project.client}
                  </p>
                </div>
                <span
                  className={`${
                    statusBadge[project.status] || 'badge-gray'
                  } text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap`}
                >
                  {project.status}
                </span>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium text-gray-700">
                    {project.progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${progressColor(project.progress)} h-2 rounded-full transition-all`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Budget & Deadline */}
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <DollarSign size={14} />
                  <span>{formatBudget(project.budget)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Calendar size={14} />
                  <span>{project.deadline}</span>
                </div>
              </div>

              {/* Team Avatars */}
              <div className="flex items-center -space-x-2">
                {(project.team || []).map((member) => (
                  <div
                    key={member}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ring-2 ring-white ${getInitialsColor(member)}`}
                    title={member}
                  >
                    {getInitials(member)}
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Project
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Progress
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Budget
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Deadline
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Team
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/projects/${project.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {project.client}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`${
                          statusBadge[project.status] || 'badge-gray'
                        } text-xs px-2.5 py-1 rounded-full font-medium`}
                      >
                        {project.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`${progressColor(project.progress)} h-2 rounded-full`}
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-gray-600 text-xs">
                          {project.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatBudget(project.budget)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {project.deadline}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center -space-x-2">
                        {(project.team || []).slice(0, 3).map((member) => (
                          <div
                            key={member}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium ring-2 ring-white ${getInitialsColor(member)}`}
                            title={member}
                          >
                            {getInitials(member)}
                          </div>
                        ))}
                        {project.team.length > 3 && (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 text-[10px] font-medium ring-2 ring-white">
                            +{project.team.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No projects match your search.
        </div>
      )}
    </div>
  );
}
