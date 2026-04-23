import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HardHat,
  LogOut,
  Building2,
  FileText,
  Receipt,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Lock,
} from 'lucide-react';
import { clientService, projectService, estimateService, invoiceService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const CLIENT_ID = 'CLI-001';

const hardcodedMessages = [
  {
    id: 1,
    from: 'Boulder Construction',
    fromRole: 'team',
    text: 'Hi Robert, just wanted to let you know the structural steel erection is underway on the 2nd floor. Everything is on schedule.',
    date: '2026-03-29 9:15 AM',
  },
  {
    id: 2,
    from: 'Robert Harrington',
    fromRole: 'client',
    text: 'Great to hear! Are we still on track for the exterior cladding to start in May?',
    date: '2026-03-29 11:42 AM',
  },
  {
    id: 3,
    from: 'Boulder Construction',
    fromRole: 'team',
    text: 'Yes, the cladding materials have been ordered and delivery is confirmed for the first week of May. We had a minor 2-hour rain delay yesterday but it did not impact the timeline.',
    date: '2026-03-30 8:30 AM',
  },
  {
    id: 4,
    from: 'Robert Harrington',
    fromRole: 'client',
    text: 'Perfect. I will be stopping by the site next Wednesday for a walkthrough. Can someone meet me there around 10 AM?',
    date: '2026-03-31 2:10 PM',
  },
];

const statusBadge = (status) => {
  const styles = {
    Paid:     'bg-emerald-100 text-emerald-700',
    Pending:  'bg-amber-100 text-amber-700',
    Approved: 'bg-blue-100 text-blue-700',
    Rejected: 'bg-red-100 text-red-700',
    Overdue:  'bg-red-100 text-red-700',
    Accepted: 'bg-emerald-100 text-emerald-700',
    Sent:     'bg-blue-100 text-blue-700',
    Draft:    'bg-slate-100 text-slate-600',
    'In Progress': 'bg-blue-100 text-blue-700',
    Planning: 'bg-purple-100 text-purple-700',
    'On Hold': 'bg-amber-100 text-amber-700',
    Completed: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
};

const statusIcon = (status) => {
  if (status === 'Paid' || status === 'Completed') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (status === 'Overdue') return <AlertTriangle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-amber-500" />;
};

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export default function ClientPortal() {
  const { data: allClients, loading: loadingClients } = useSupabase(clientService.list);
  const { data: allProjects, loading: loadingProjects } = useSupabase(projectService.list);
  const { data: allEstimates, loading: loadingEstimates } = useSupabase(estimateService.list);
  const { data: allInvoices, loading: loadingInvoices } = useSupabase(invoiceService.list);

  const client = (allClients || []).find((c) => c.id === CLIENT_ID) || {};
  const clientProjects = (allProjects || []).filter((p) => p.client_id === CLIENT_ID);
  const clientEstimates = (allEstimates || []).filter((e) => e.client_id === CLIENT_ID);
  const clientInvoices = (allInvoices || []).filter((i) => i.client_id === CLIENT_ID || i.owner_name === (client.name || ''));

  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState(hardcodedMessages);
  // Local invoice statuses — client can approve/reject Pending invoices
  const [invoiceStatuses, setInvoiceStatuses] = useState({});
  const [statusesInitialized, setStatusesInitialized] = useState(false);
  const [invoiceAction, setInvoiceAction] = useState(null); // id being acted on

  // Initialize invoice statuses once data loads
  if (!statusesInitialized && clientInvoices.length > 0) {
    setInvoiceStatuses(Object.fromEntries(clientInvoices.map((i) => [i.id, i.status])));
    setStatusesInitialized(true);
  }

  const loading = loadingClients || loadingProjects || loadingEstimates || loadingInvoices;

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading portal...</div>;
  }

  const handleClientApprove = async (invId) => {
    setInvoiceAction(invId + '_approve');
    try { await invoiceService.markApproved(invId); } catch (_) {}
    setInvoiceStatuses((prev) => ({ ...prev, [invId]: 'Approved' }));
    setInvoiceAction(null);
  };

  const handleClientReject = async (invId) => {
    setInvoiceAction(invId + '_reject');
    try { await invoiceService.markRejected(invId); } catch (_) {}
    setInvoiceStatuses((prev) => ({ ...prev, [invId]: 'Rejected' }));
    setInvoiceAction(null);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setMessages([
      ...messages,
      {
        id: messages.length + 1,
        from: 'Robert Harrington',
        fromRole: 'client',
        text: messageText.trim(),
        date: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      },
    ]);
    setMessageText('');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <HardHat className="w-8 h-8 text-amber-500" />
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Boulder Construction</h1>
                <p className="text-xs text-slate-500 -mt-0.5">Client Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 hidden sm:inline">
                {client.name} &mdash; {client.company}
              </span>
              <Link
                to="/portal/login"
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
          <h2 className="text-2xl font-bold">Welcome, Robert</h2>
          <p className="text-slate-300 mt-1">{client.company}</p>
        </div>

        {/* Project Progress */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-900">Project Progress</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientProjects.map((project) => (
              <div key={project.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-slate-900 text-sm">{project.name}</h4>
                  {statusBadge(project.status)}
                </div>
                <p className="text-xs text-slate-500 mb-3">Current Phase: {project.phase}</p>
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 text-right">{project.progress}% complete</p>
              </div>
            ))}
          </div>
        </section>

        {/* Proposals / Estimates */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-900">Proposals &amp; Estimates</h3>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Estimate</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Project</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Date</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">Amount</th>
                  <th className="text-center px-5 py-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {clientEstimates.map((est) => (
                  <tr key={est.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-900">{est.id}</td>
                    <td className="px-5 py-3 text-slate-600">{est.project_name || est.projectName}</td>
                    <td className="px-5 py-3 text-slate-500">{est.estimate_date || est.date}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(est.total_amount || est.totalAmount || 0)}
                    </td>
                    <td className="px-5 py-3 text-center">{statusBadge(est.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Invoices */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-900">Invoices</h3>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Invoice</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Project</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Issue Date</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Due Date</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">Amount</th>
                  <th className="text-center px-5 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Your Action</th>
                </tr>
              </thead>
              <tbody>
                {clientInvoices.map((inv) => {
                  const currentStatus = invoiceStatuses[inv.id] || inv.status;
                  const actingApprove = invoiceAction === inv.id + '_approve';
                  const actingReject  = invoiceAction === inv.id + '_reject';
                  return (
                    <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {statusIcon(currentStatus)}
                          <span className="font-medium text-slate-900">{inv.id}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{inv.project_name || inv.project}</td>
                      <td className="px-5 py-3 text-slate-500">{inv.application_date || inv.issueDate}</td>
                      <td className="px-5 py-3 text-slate-500">{inv.period_to || inv.dueDate}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-900">{formatCurrency(inv.current_payment_due || inv.amount || 0)}</td>
                      <td className="px-5 py-3 text-center">{statusBadge(currentStatus)}</td>
                      <td className="px-5 py-3">
                        {currentStatus === 'Pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => handleClientApprove(inv.id)}
                              disabled={actingApprove}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: actingApprove ? 0.6 : 1 }}
                            >
                              <ThumbsUp size={12} /> Approve
                            </button>
                            <button
                              onClick={() => handleClientReject(inv.id)}
                              disabled={actingReject}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid #dc2626', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: actingReject ? 0.6 : 1 }}
                            >
                              <ThumbsDown size={12} /> Reject
                            </button>
                          </div>
                        )}
                        {currentStatus === 'Approved' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                            <CheckCircle2 size={12} /> Approved
                          </span>
                        )}
                        {currentStatus === 'Rejected' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                            Rejected
                          </span>
                        )}
                        {currentStatus === 'Paid' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                            <CheckCircle2 size={12} /> Paid
                          </span>
                        )}
                        {(currentStatus === 'Draft' || currentStatus === 'Overdue') && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#94a3b8' }}>
                            <Lock size={12} /> No action
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Messages */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-900">Messages</h3>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Thread */}
            <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
              {messages.map((msg) => {
                const isClient = msg.fromRole === 'client';
                return (
                  <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-md rounded-xl px-4 py-3 ${
                        isClient ? 'bg-amber-50 border border-amber-200' : 'bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className={`text-xs font-semibold ${isClient ? 'text-amber-700' : 'text-slate-700'}`}>
                          {msg.from}
                        </span>
                        <span className="text-xs text-slate-400">{msg.date}</span>
                      </div>
                      <p className="text-sm text-slate-700">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="border-t border-slate-200 p-4 flex gap-3">
              <input
                type="text"
                className="input flex-1"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium text-sm cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
