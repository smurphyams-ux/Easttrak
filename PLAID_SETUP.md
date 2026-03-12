# DumpsterTracker - Plaid Bank Integration Setup

## 🎯 What You Need

### 1. Create a Plaid Account (Free Sandbox)
1. Go to https://dashboard.plaid.com/signup
2. Sign up for a free account
3. Verify your email
4. Navigate to: **Team Settings → Keys** (left sidebar)
5. Copy your:
   - **client_id**
   - **sandbox secret** (for testing)

### 2. Configure Backend Server

**Step 1:** Navigate to server folder
```bash
cd ~/Documents/DumpsterTracker/server
```

**Step 2:** Create `.env` file (copy from example)
```bash
cp .env.example .env
```

**Step 3:** Edit `.env` with your Plaid credentials
```bash
# Open in your editor
code .env

# Or use nano
nano .env
```

**Add your Plaid keys:**
```env
PLAID_CLIENT_ID=your_actual_client_id_here
PLAID_SECRET=your_actual_sandbox_secret_here
PLAID_ENV=sandbox
PORT=3001
```

**Step 4:** Start the backend server
```bash
npm start
```

You should see:
```
🚀 DumpsterTracker API server running on http://localhost:3001
📊 Plaid Environment: sandbox
```

### 3. Use the App

**Terminal 1:** Backend Server
```bash
cd ~/Documents/DumpsterTracker/server
npm start
```

**Terminal 2:** Frontend Dev Server
```bash
cd ~/Documents/DumpsterTracker
npm run dev
```

**In the App:**
1. Login to DumpsterTracker
2. Click **"Bank Accounts"** button on dashboard
3. Click **"Connect Bank Account"**
4. In Plaid Link popup:
   - Select any bank (in sandbox, all banks work)
   - Use test credentials: **user_good** / **pass_good**
   - Select which accounts to connect
5. Click **"Sync Transactions"** to fetch last 30 days
6. Transactions auto-categorize as income or expenses

## 🔄 How Auto-Sync Works

### Automatic Categorization
- **Negative amounts (money out)** → Added as **Expenses**
  - Fuel keywords → Fuel category
  - Repair/Service → Maintenance
  - Shops → Supplies
  - Everything else → Other

- **Positive amounts (money in)** → Matched with **Invoices**
  - Finds pending invoices with matching amounts
  - Auto-marks as "Paid"
  - Records payment date

### Manual Sync
- Click **"Sync Transactions"** anytime to fetch new data
- Syncs last 30 days
- Won't create duplicates

## 🧪 Testing in Sandbox

### Test Bank Credentials
- **Username:** `user_good`
- **Password:** `pass_good`

### Create Test Transactions
Plaid sandbox has fake transactions for testing. You'll see:
- Sample purchases (expenses)
- Sample deposits (income)
- Various categories

## 📊 View Your Data

All synced data appears in:
1. **Bank Accounts page** - View accounts, balances, transaction history
2. **Reports → Profit & Loss** - Expenses automatically included
3. **Invoices** - Pending invoices auto-marked as paid when matching payment found

## 🚀 Production Deployment

When ready for real banking:

1. **Request Production Access** from Plaid dashboard
2. Update `.env`:
   ```env
   PLAID_SECRET=your_production_secret
   PLAID_ENV=production
   ```
3. Deploy backend to cloud (Heroku, AWS, etc.)
4. Update frontend API_URL in `BankAccountsPanel.tsx`

## 🔒 Security Notes

- **Never commit `.env` file** (already in .gitignore)
- Backend server stores access tokens in memory (use database in production)
- Plaid uses bank-level security
- All data encrypted in transit

## ❓ Troubleshooting

**"Backend Server Not Running"**
- Make sure server is running: `cd server && npm start`
- Check port 3001 is free: `lsof -i :3001`

**"Failed to connect bank account"**
- Verify Plaid credentials in `.env`
- Check server logs for errors
- Ensure you're using sandbox environment

**Transactions not syncing**
- Bank must be connected first
- Plaid sandbox has ~30 days of test transactions
- Check browser console for errors

## 📚 Learn More

- Plaid Documentation: https://plaid.com/docs/
- API Reference: https://plaid.com/docs/api/
- React Plaid Link: https://github.com/plaid/react-plaid-link

---

**Need Help?** Check the server terminal for error messages or contact support.
