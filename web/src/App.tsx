                  <span className="text-white text-sm font-semibold">82% of $30K goal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Container Management Section */}
      <section className="mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Container Management</h2>
          <p className="text-gray-600 mb-6">View and manage all your containers</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition">
              View All Containers
            </button>
            <button className="bg-green-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-green-700 transition">
              Add New Container
            </button>
            <button className="bg-gray-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-gray-700 transition">
              Container Reports
            </button>
          </div>
        </div>
      </section>

      {/* Routes & Deliveries Section */}
      <section className="mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Routes & Deliveries</h2>
          <p className="text-gray-600 mb-6">Plan routes and schedule deliveries</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition">
              View All Routes
            </button>
            <button className="bg-green-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-green-700 transition">
              Schedule Delivery
            </button>
            <button className="bg-purple-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-purple-700 transition">
              Optimize Routes
            </button>
          </div>
        </div>
      </section>

      {/* Customers & Billing Section */}
      <section className="mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Customers & Billing</h2>
          <p className="text-gray-600 mb-6">Manage customer accounts and invoices</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition">
              View Customers
            </button>
            <button className="bg-green-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-green-700 transition">
              Create Invoice
            </button>
            <button className="bg-yellow-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-yellow-700 transition">
              Pending Payments
            </button>
          </div>
        </div>
      </section>

      {/* Reports & Analytics Section */}
      <section>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Reports & Analytics</h2>
          <p className="text-gray-600 mb-6">Generate reports and view analytics</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-purple-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-purple-700 transition">
              Financial Report
            </button>
            <button className="bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition">
              Performance Metrics
            </button>
            <button className="bg-gray-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-gray-700 transition">
              Export Data
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const handleLogin = (username: string, password: string) => {
    // Simple authentication - in production, this would call an API
    if (username && password) {
      setIsAuthenticated(true);
      setCurrentUser(username);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
  };



  import React from 'react';
  import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
  import { AuthProvider } from '../contexts/AuthContext';
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
}
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

export default App;