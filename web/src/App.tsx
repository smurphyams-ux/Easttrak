import RoutesPage from './pages/RoutesPage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { BusinessProvider, useBusiness } from './contexts/BusinessContext';
import { ImportInvoiceProvider } from './contexts/ImportInvoiceContext';
import InvoicesPanel from './screens/InvoicesPanel';



import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import StopDetailsScreen from './screens/StopDetailsScreen';
import QRScanScreen from './screens/QRScanScreen';
import ScanScreen from './screens/ScanScreen';
import FleetPanel from './screens/FleetPanel';
import ReportsPanel from './screens/ReportsPanel';
import BankAccountsPanel from './screens/BankAccountsPanel';
import DeliveriesPanel from './screens/DeliveriesPanel';
import ProfessionalCustomersPage from './pages/ProfessionalCustomersPage';
import DriverDashboard from './pages/DriverDashboard';
import CreateInvoiceForm from './pages/CreateInvoiceForm';
import TrackDeliveryPage from './pages/TrackDeliveryPage';
import { useAuth } from './contexts/AuthContext';




function BusinessSelector() {
  const { businessId, setBusinessId, businesses } = useBusiness();
  const isCompact = typeof window !== 'undefined' && window.innerWidth <= 768;
  // Debug output
  if (!businesses || businesses.length === 0) {
    return (
      <div style={{ padding: 8, background: '#ffeaea', borderBottom: '1px solid #eee', color: 'red' }}>
        <strong>BusinessSelector Error:</strong> No businesses found.<br />
        <span>businessId: {String(businessId)}</span><br />
        <span>businesses: {JSON.stringify(businesses)}</span>
      </div>
    );
  }
  return (
    <div style={{ padding: isCompact ? '6px 10px' : 8, background: '#f8f8f8', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: isCompact ? 6 : 8, flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 500, fontSize: isCompact ? 13 : 15 }}>Business:</span>
      <select value={businessId} onChange={e => setBusinessId(e.target.value)} style={{ fontSize: isCompact ? 14 : 16, padding: isCompact ? '3px 6px' : 4, minHeight: isCompact ? 32 : undefined }}>
        {businesses.map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
  );
}

export default function App() {
  // Use auth context to determine user role
  function AppRoutes() {
    const { user } = useAuth();
      if (!user) {
        // Not logged in: always show login screen
        return (
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/track/:token" element={<TrackDeliveryPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        );
      }
      if (user.role === 'driver') {
        return (
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/track/:token" element={<TrackDeliveryPage />} />
            <Route path="/driver" element={<DriverDashboard />} />
            <Route path="/route" element={<RoutesPage />} />
            <Route path="/scan" element={<ScanScreen />} />
            <Route path="/" element={<Navigate to="/driver" replace />} />
            <Route path="*" element={<Navigate to="/driver" replace />} />
          </Routes>
        );
      }
      // Manager/admin: full access
      return (
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/track/:token" element={<TrackDeliveryPage />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/driver" element={<DriverDashboard />} />
          <Route path="/professional-customers" element={<ProfessionalCustomersPage />} />
          <Route path="/invoices" element={<InvoicesPanel />} />
          <Route path="/deliveries" element={<DeliveriesPanel />} />
          <Route path="/pickups" element={<StopDetailsScreen />} />
          <Route path="/route" element={<RoutesPage />} />
          <Route path="/scan" element={<ScanScreen />} />
          <Route path="/qr-scan" element={<QRScanScreen />} />
          <Route path="/fleet" element={<FleetPanel />} />
          <Route path="/reports" element={<ReportsPanel />} />
          <Route path="/bank" element={<BankAccountsPanel />} />
          <Route path="/create-invoice" element={<CreateInvoiceForm />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      );
    }
  return (
    <div>
      <BusinessProvider>
        <AuthProvider>
          <ImportInvoiceProvider>
            <BrowserRouter>
              <BusinessSelector />
              <AppRoutes />
            </BrowserRouter>
          </ImportInvoiceProvider>
        </AuthProvider>
      </BusinessProvider>
    </div>
  );
}