# Dumpster Tracker App

A comprehensive dumpster tracking and management system built with React Native (Expo) and PostgreSQL.

## Features

- **Login System**: Role-based authentication (Manager/Driver)
- **Dashboard**: Admin view with customer, fleet, and invoice management
- **Route Management**: Driver route view with stop details
- **QR Scanner**: Scan dumpster QR codes to view rental info and warnings
- **Photo Capture**: Take photos of dumpsters and service locations
- **Maps Integration**: View service locations on map
- **Customer Management**: Track customer rentals and billing status

## Setup Instructions

### 1. Prerequisites

#### Install Homebrew (if not already installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Install PostgreSQL
```bash
brew install postgresql@16
brew services start postgresql@16
```

Add PostgreSQL to your PATH:
```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 2. Database Setup

Create the database:
```bash
createdb dumpstertracker
```

Apply the schema:
```bash
psql -d dumpstertracker -f ../dumpstertracker\ app2
```

Or connect and run:
```bash
psql dumpstertracker
\i '../dumpstertracker app2'
```

### 3. Install App Dependencies

```bash
cd /Users/sandramurphy/Documents/DumpsterTracker
npm install
```

### 4. Run the App

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## Test Login Credentials

- **Manager Account**: 
  - Email: `manager@test.com`
  - Password: any non-empty password
  - Routes to: Dashboard

- **Driver Account**:
  - Email: `driver@test.com` or any email containing `@driver`
  - Password: any non-empty password
  - Routes to: Route Screen

## Project Structure

```
DumpsterTracker/
├── App.tsx                      # Main navigation setup
├── src/
│   └── screens/
│       ├── LoginScreen.tsx      # Login page
│       ├── DashboardScreen.tsx  # Manager dashboard
│       ├── RouteScreen.tsx      # Driver route list
│       ├── StopDetailsScreen.tsx # Stop details with map
│       ├── QRScanScreen.tsx     # QR code scanner
│       ├── CustomerPanel.tsx    # Customer management (placeholder)
│       ├── FleetPanel.tsx       # Fleet management (placeholder)
│       ├── InvoicesPanel.tsx    # Invoice management (placeholder)
│       └── ScanScreen.tsx       # Additional scan (placeholder)
├── package.json
└── README.md
```

## Database Schema

The database includes tables for:
- Customers
- Containers (Dumpsters)
- Rentals
- Invoices
- Payments
- Routes & Route Stops
- Container Events
- Maintenance Logs
- Usage Tracking
- Technicians
- Billing Records

See `../dumpstertracker app2` for full schema details.

## API Integration

Currently, the app uses mock data. To integrate with a real backend:

1. Create a Node.js/Express API server
2. Connect it to the PostgreSQL database
3. Update the fetch URLs in:
   - `QRScanScreen.tsx` (fetchDumpsterInfo, submitConfirm)
   - `StopDetailsScreen.tsx` (completeJob)
   - `LoginScreen.tsx` (fakeAuth)

## Development Notes

- Built with Expo for easier cross-platform development
- Uses React Navigation for screen management
- Expo Barcode Scanner for QR code scanning
- Expo Image Picker for photo capture
- React Native Maps for location display

## Next Steps

1. Build backend API (Node.js + Express + PostgreSQL)
2. Implement real authentication with JWT
3. Connect all screens to real data
4. Add offline support with AsyncStorage
5. Implement push notifications for route updates
6. Add data synchronization
7. Complete customer/fleet/invoice panels

## Troubleshooting

### Database Connection Issues
If you can't connect to PostgreSQL, check:
```bash
brew services list
# Should show postgresql@16 as "started"

# If not running:
brew services restart postgresql@16
```

### App Won't Start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm start -- --clear
```

### Camera/Location Permissions
Make sure to allow camera and location permissions when prompted in the app.

## Support

For issues or questions, contact your development team.
