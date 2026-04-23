import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { scheduleService, projectService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TODAY = '2026-04-02';
const CURRENT_YEAR = 2026;
const CURRENT_MONTH = 3; // April (0-indexed)

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getEventsForDay(dateKey, scheduleEvents) {
  return scheduleEvents.filter((ev) => {
    return dateKey >= ev.date && dateKey <= ev.endDate;
  });
}

function getTodaysEvents(scheduleEvents) {
  return getEventsForDay(TODAY, scheduleEvents);
}

/* ── Calendar View ───────────────────────────────── */

function CalendarView({ scheduleEvents }) {
  const year = CURRENT_YEAR;
  const month = CURRENT_MONTH;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build multi-day event rows for the calendar
  // We'll render single-day events as dots and multi-day as bars
  const multiDayEvents = scheduleEvents.filter((ev) => ev.date !== ev.endDate);

  // Build the 6-week grid (42 cells max)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstDay + 1;
    if (dayNum >= 1 && dayNum <= daysInMonth) {
      cells.push(dayNum);
    } else {
      cells.push(null);
    }
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Month header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          {MONTH_NAMES[month]} {year}
        </h3>
        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
          {week.map((day, di) => {
            if (!day) {
              return <div key={di} className="min-h-[100px] bg-gray-50/50 border-r border-gray-100 last:border-0" />;
            }
            const dateKey = formatDateKey(year, month, day);
            const isToday = dateKey === TODAY;
            const dayEvents = getEventsForDay(dateKey, scheduleEvents);

            return (
              <div
                key={di}
                className={`min-h-[100px] p-1.5 border-r border-gray-100 last:border-0 ${
                  isToday ? 'bg-blue-50/60' : 'hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const isMultiDay = ev.date !== ev.endDate;
                    const isStart = ev.date === dateKey;
                    const isEnd = ev.endDate === dateKey;
                    return (
                      <div
                        key={ev.id}
                        className={`text-[10px] leading-tight truncate px-1 py-0.5 ${
                          isMultiDay
                            ? `text-white font-medium ${isStart ? 'rounded-l' : ''} ${isEnd ? 'rounded-r' : ''}`
                            : 'rounded text-white font-medium'
                        }`}
                        style={{ backgroundColor: ev.color }}
                        title={ev.title}
                      >
                        {isStart || !isMultiDay ? ev.title : ''}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-gray-500 pl-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ── Gantt Chart View ────────────────────────────── */

function GanttView({ scheduleEvents }) {
  const daysInMonth = 30; // April 2026
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Sort events by start date then by duration
  const sortedEvents = [...scheduleEvents]
    .filter((e) => e.date)
    .sort((a, b) => {
      const ad = a.date || '', bd = b.date || '';
      if (ad !== bd) return ad.localeCompare(bd);
      return (a.endDate || a.end_date || ad).localeCompare(b.endDate || b.end_date || bd);
    });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: '900px' }}>
          {/* Date headers */}
          <div className="flex border-b border-gray-200">
            <div className="w-56 flex-shrink-0 px-4 py-3 bg-gray-50 border-r border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Task
            </div>
            <div className="flex-1 flex">
              {days.map((d) => {
                const dateKey = formatDateKey(CURRENT_YEAR, CURRENT_MONTH, d);
                const isToday = dateKey === TODAY;
                return (
                  <div
                    key={d}
                    className={`flex-1 min-w-[28px] text-center py-3 text-[10px] font-medium border-r border-gray-100 last:border-0 ${
                      isToday ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500'
                    }`}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event rows */}
          {sortedEvents.map((ev) => {
            const startDay = Math.max(parseInt((ev.date || '').split('-')[2] || '1', 10), 1);
            const endDay = Math.min(parseInt((ev.endDate || ev.end_date || ev.date || '').split('-')[2] || '1', 10), daysInMonth);
            const startOffset = ((startDay - 1) / daysInMonth) * 100;
            const barWidth = ((endDay - startDay + 1) / daysInMonth) * 100;

            return (
              <div key={ev.id} className="flex border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                <div className="w-56 flex-shrink-0 px-4 py-3 border-r border-gray-200 flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ev.color }}
                  />
                  <span className="text-xs font-medium text-gray-800 truncate">
                    {ev.title}
                  </span>
                </div>
                <div className="flex-1 relative py-2 px-0.5">
                  {/* Background grid lines */}
                  <div className="absolute inset-0 flex">
                    {days.map((d) => {
                      const dateKey = formatDateKey(CURRENT_YEAR, CURRENT_MONTH, d);
                      const isToday = dateKey === TODAY;
                      return (
                        <div
                          key={d}
                          className={`flex-1 min-w-[28px] border-r border-gray-50 ${
                            isToday ? 'bg-blue-50/40' : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                  {/* The bar */}
                  <div
                    className="relative h-7 rounded-md flex items-center px-2 shadow-sm"
                    style={{
                      backgroundColor: ev.color,
                      marginLeft: `${startOffset}%`,
                      width: `${barWidth}%`,
                    }}
                  >
                    <span className="text-[10px] text-white font-medium truncate">
                      {ev.date !== ev.endDate ? `${startDay}–${endDay} Apr` : `Apr ${startDay}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Right Sidebar ───────────────────────────────── */

function TodaySidebar({ scheduleEvents }) {
  const todayEvents = getTodaysEvents(scheduleEvents);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Today's Schedule</h3>
      <p className="text-xs text-gray-500 mb-4">April 2, 2026</p>

      {todayEvents.length === 0 ? (
        <p className="text-sm text-gray-400">No events today.</p>
      ) : (
        <div className="space-y-3">
          {todayEvents.map((ev) => (
            <div key={ev.id} className="flex items-start gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: ev.color }}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                <p className="text-xs text-gray-500 truncate">{ev.project}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          This Month
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Events</span>
            <span className="font-semibold text-gray-900">{scheduleEvents.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Multi-day Tasks</span>
            <span className="font-semibold text-gray-900">
              {scheduleEvents.filter((e) => e.date !== e.endDate).length}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Projects</span>
            <span className="font-semibold text-gray-900">
              {new Set(scheduleEvents.map((e) => e.projectId).filter(Boolean)).size}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────── */

export default function Scheduling() {
  const [view, setView] = useState('calendar');
  const { data: scheduleEvents } = useSupabase(scheduleService.list);
  const { data: projects } = useSupabase(projectService.list);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduling</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage project timelines, deliveries, and milestones
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'calendar'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar size={16} />
            Calendar
          </button>
          <button
            onClick={() => setView('gantt')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'gantt'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 size={16} />
            Gantt
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {view === 'calendar' ? <CalendarView scheduleEvents={scheduleEvents} /> : <GanttView scheduleEvents={scheduleEvents} />}
        </div>

        {/* Right sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <TodaySidebar scheduleEvents={scheduleEvents} />
        </div>
      </div>
    </div>
  );
}
