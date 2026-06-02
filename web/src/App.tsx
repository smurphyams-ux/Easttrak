import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import RoutesPage from './pages/RoutesPage';
import DashboardScreen from './screens/DashboardScreen';
import InvoicesPanel from './screens/InvoicesPanel';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/route" element={<RoutesPage />} />
        <Route path="/invoices" element={<InvoicesPanel />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}