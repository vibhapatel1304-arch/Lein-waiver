import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { timesheetService, employeeService, projectService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

// Reference week: March 28–31, 2026 (Sat–Tue)
const WEEK_START = '2026-03-28';
const WEEK_END = '2026-03-31';

const isInCurrentWeek = (dateStr) => dateStr >= WEEK_START && dateStr <= WEEK_END;

export default function TimeTracking() {
  const { data: timesheetEntries } = useSupabase(timesheetService.list);
  const { data: employees } = useSupabase(employeeService.list);
  const { data: projects } = useSupabase(projectService.list);

  const [employeeFilter, setEmployeeFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [entries, setEntries] = useState([]);

  // Sync entries when timesheetEntries loads from Supabase
  useEffect(() => {
    if (timesheetEntries.length > 0) setEntries(timesheetEntries);
  }, [timesheetEntries]);

  // --- Summary calculations ---
  const weekEntries = entries.filter((e) => isInCurrentWeek(e.date));

  const totalHoursThisWeek = weekEntries.reduce((sum, e) => sum + e.hours, 0);

  const pendingApprovals = entries.filter(
    (e) => e.status === 'Pending Approval'
  ).length;

  const overtimeHours = useMemo(() => {
    // Group week entries by employee + date, sum hours, count anything over 8
    const dayMap = {};
    weekEntries.forEach((e) => {
      const key = `${e.employeeId}_${e.date}`;
      dayMap[key] = (dayMap[key] || 0) + e.hours;
    });
    return Object.values(dayMap).reduce(
      (sum, h) => sum + Math.max(0, h - 8),
      0
    );
  }, [entries]);

  // --- Filtering ---
  const filteredEntries = useMemo(() => {
    return [...entries]
      .filter((e) => employeeFilter === 'All' || e.employee === employeeFilter)
      .filter((e) => projectFilter === 'All' || e.project === projectFilter)
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  }, [entries, employeeFilter, projectFilter]);

  // --- Actions ---
  const handleApprove = (id) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'Approved' } : e))
    );
  };

  const handleReject = (id) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'Rejected' } : e))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">Time Tracking</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Hours This Week</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalHoursThisWeek}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingApprovals}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Overtime Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {overtimeHours}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-50">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Employee
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          >
            <option value="All">All</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.name}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Project
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="All">All</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.name}>
                {proj.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From
          </label>
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To
          </label>
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-600">
                Employee
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">
                Project
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">
                Phase
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">
                Date
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">
                Clock In
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">
                Clock Out
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">
                Hours
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">
                Status
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-3 px-4 font-medium text-gray-900">
                  {entry.employee}
                </td>
                <td className="py-3 px-4 text-gray-700">{entry.project}</td>
                <td className="py-3 px-4 text-gray-700">{entry.phase}</td>
                <td className="py-3 px-4 text-gray-700">{entry.date}</td>
                <td className="py-3 px-4 text-gray-700">{entry.clockIn}</td>
                <td className="py-3 px-4 text-gray-700">{entry.clockOut}</td>
                <td className="py-3 px-4 text-gray-700">{entry.hours}</td>
                <td className="py-3 px-4">
                  <span
                    className={
                      entry.status === 'Approved'
                        ? 'badge-green'
                        : entry.status === 'Pending Approval'
                          ? 'badge-amber'
                          : 'badge-red'
                    }
                  >
                    {entry.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {entry.status === 'Pending Approval' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(entry.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Approve"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleReject(entry.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Reject"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
