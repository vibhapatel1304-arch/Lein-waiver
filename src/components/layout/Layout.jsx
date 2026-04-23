import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

const routeTitles = {
  '/': 'Dashboard',
  '/clients': 'Clients',
  '/projects': 'Projects',
  '/scheduling': 'Scheduling',
  '/time-tracking': 'Time Tracking',
  '/estimates': 'Estimates & Proposals',
  '/clients/create': 'Add New Client',
  '/estimates/create': 'Create Estimate',
  '/projects/create': 'New Project',
  '/invoices': 'Invoices & Payments',
  '/invoices/create': 'Create Invoice',
  '/job-costing': 'Job Costing & Budgeting',
  '/subcontractors': 'Subcontractors',
  '/subcontractors/create': 'Add Subcontractor',
  '/documents': 'Documents',
  '/documents/upload': 'Upload Document',
  '/reports': 'Reports & Analytics',
  '/change-orders': 'Change Orders & RFIs',
  '/change-orders/create': 'New Change Order',
  '/rfis/create': 'New RFI',
  '/pay-applications': 'Pay Applications (AIA G702/G703)',
  '/pay-applications/create': 'Create Pay Application',
  '/lien-waivers': 'Lien Waivers',
  '/lien-waivers/create': 'Generate Lien Waiver',
  '/settings': 'Settings',
};

function getTitle(pathname) {
  if (routeTitles[pathname]) return routeTitles[pathname];
  if (pathname.startsWith('/clients/')) return 'Client Details';
  if (pathname.startsWith('/projects/')) return 'Project Details';
  if (pathname.startsWith('/estimates/')) return 'Estimate Details';
  if (pathname.startsWith('/invoices/')) return 'Invoice Details';
  if (pathname.startsWith('/subcontractors/')) return 'Subcontractor Details';
  if (pathname.startsWith('/pay-applications/sub/')) return 'Subcontractor Pay Application';
  if (pathname.startsWith('/pay-applications/')) return 'Pay Application Detail';
  if (pathname.startsWith('/lien-waivers/')) return 'Lien Waiver Detail';
  return 'Boulder Construction';
}

function Layout() {
  const location = useLocation();
  const title = getTitle(location.pathname);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">
        <TopNav title={title} />
        <main style={{ flex: 1, background: '#f5f5f5', padding: '1.75rem 2rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
