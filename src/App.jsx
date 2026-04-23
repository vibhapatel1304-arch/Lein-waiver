import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import ClientCreate from './pages/ClientCreate';
import Estimates from './pages/Estimates';
import EstimateDetail from './pages/EstimateDetail';
import EstimateCreate from './pages/EstimateCreate';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ProjectCreate from './pages/ProjectCreate';
import Scheduling from './pages/Scheduling';
import TimeTracking from './pages/TimeTracking';
import ChangeOrders from './pages/ChangeOrders';
import ChangeOrderCreate from './pages/ChangeOrderCreate';
import RFICreate from './pages/RFICreate';
import RFIs from './pages/RFIs';
import RFIDetail from './pages/RFIDetail';
import DailyLogs from './pages/DailyLogs';
import ChangeOrderDetail from './pages/ChangeOrderDetail';
import Documents from './pages/Documents';
import DocumentUpload from './pages/DocumentUpload';
import Subcontractors from './pages/Subcontractors';
import SubcontractorDetail from './pages/SubcontractorDetail';
import SubcontractorCreate from './pages/SubcontractorCreate';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import InvoiceCreate from './pages/InvoiceCreate';
import Contracts from './pages/Contracts';
import ContractCreate from './pages/ContractCreate';
import ContractDetail from './pages/ContractDetail';
import LienWaivers from './pages/LienWaivers';
import LienWaiverRefactor from './pages/LienWaiverRefactor';
import LienWaiverCreate from './pages/LienWaiverCreate';
import LienWaiverGenerate from './pages/LienWaiverGenerate';
import LienWaiverPublicView from './pages/LienWaiverPublicView';
import G703Report from './pages/G703Report';
import JobCosting from './pages/JobCosting';
import Reports from './pages/Reports';
import ClientPortal from './pages/ClientPortal';
import ClientPortalLogin from './pages/ClientPortalLogin';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* Client Portal (separate layout) */}
        <Route path="/portal" element={<ClientPortalLogin />} />
        <Route path="/portal/dashboard" element={<ClientPortal />} />

        {/* Public Lien Waiver View (no auth required) */}
        <Route path="/lien-waivers/view/:token" element={<LienWaiverPublicView />} />

        {/* Main CRM (with sidebar layout) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />

          {/* Clients */}
          <Route path="clients" element={<Clients />} />
          <Route path="clients/create" element={<ClientCreate />} />
          <Route path="clients/:id" element={<ClientDetail />} />

          {/* Estimates */}
          <Route path="estimates" element={<Estimates />} />
          <Route path="estimates/create" element={<EstimateCreate />} />
          <Route path="estimates/:id" element={<EstimateDetail />} />

          {/* Projects */}
          <Route path="projects" element={<Projects />} />
          <Route path="projects/create" element={<ProjectCreate />} />
          <Route path="projects/:id" element={<ProjectDetail />} />

          {/* Scheduling & Time */}
          <Route path="scheduling" element={<Scheduling />} />
          <Route path="time-tracking" element={<TimeTracking />} />

          {/* Change Orders */}
          <Route path="change-orders" element={<ChangeOrders />} />
          <Route path="change-orders/create" element={<ChangeOrderCreate />} />
          <Route path="change-orders/:id" element={<ChangeOrderDetail />} />

          {/* RFIs */}
          <Route path="rfis" element={<RFIs />} />
          <Route path="rfis/create" element={<RFICreate />} />
          <Route path="rfis/:id" element={<RFIDetail />} />

          {/* Daily Logs */}
          <Route path="daily-logs" element={<DailyLogs />} />

          {/* Documents */}
          <Route path="documents" element={<Documents />} />
          <Route path="documents/upload" element={<DocumentUpload />} />

          {/* Subcontractors */}
          <Route path="subcontractors" element={<Subcontractors />} />
          <Route path="subcontractors/create" element={<SubcontractorCreate />} />
          <Route path="subcontractors/:id" element={<SubcontractorDetail />} />

          {/* Invoices */}
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/create" element={<InvoiceCreate />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />

          {/* Pay Applications — redirect to invoices (Invoice = G702) */}
          <Route path="pay-applications" element={<Invoices />} />
          <Route path="pay-applications/create" element={<InvoiceCreate />} />
          <Route path="pay-applications/:id" element={<InvoiceDetail />} />

          {/* Contracts */}
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/create" element={<ContractCreate />} />
          <Route path="contracts/:id" element={<ContractDetail />} />
          {/* Contract-scoped nested routes */}
          <Route path="contracts/:contractId/invoices/create" element={<InvoiceCreate />} />
          <Route path="contracts/:contractId/invoices/:invoiceId/lien-waiver/create" element={<LienWaiverGenerate />} />
          <Route path="contracts/:contractId/g703" element={<G703Report />} />

          {/* Lien Waivers */}
          <Route path="lien-waivers" element={<LienWaivers />} />
          <Route path="lien-waivers/create" element={<LienWaiverGenerate />} />
          <Route path="lien-waivers/generate" element={<LienWaiverGenerate />} />
          <Route path="lien-waivers/:id" element={<LienWaiverRefactor />} />

          {/* Finance & Reports */}
          <Route path="job-costing" element={<JobCosting />} />
          <Route path="reports" element={<Reports />} />

          {/* Settings */}
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
