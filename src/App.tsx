import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import RouteScreen from './screens/RouteScreen';
import StopDetailsScreen from './screens/StopDetailsScreen';
import QRScanScreen from './screens/QRScanScreen';
import CustomerPanel from './screens/CustomerPanel';
import FleetPanel from './screens/FleetPanel';
import InvoicesPanel from './screens/InvoicesPanel';
import ScanScreen from './screens/ScanScreen';
import ReportsPanel from './screens/ReportsPanel';
import BankAccountsPanel from './screens/BankAccountsPanel';
import DeliveriesPanel from './screens/DeliveriesPanel';

export default function App() {
	return (
		<AuthProvider>
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<Navigate to="/login" replace />} />
					<Route path="/login" element={<LoginScreen />} />
					<Route path="/dashboard" element={<DashboardScreen />} />
					<Route path="/route" element={<RouteScreen />} />
					<Route path="/stop-details" element={<StopDetailsScreen />} />
					<Route path="/qr-scan" element={<QRScanScreen />} />
					<Route path="/customers" element={<CustomerPanel />} />
					<Route path="/fleet" element={<FleetPanel />} />
					<Route path="/invoices" element={<InvoicesPanel />} />
					<Route path="/scan" element={<ScanScreen />} />
					<Route path="/reports" element={<ReportsPanel />} />
					<Route path="/bank" element={<BankAccountsPanel />} />
					<Route path="/deliveries" element={<DeliveriesPanel />} />
				</Routes>
			</BrowserRouter>
		</AuthProvider>
	);
}
