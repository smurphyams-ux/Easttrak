# Automatic SMS Delivery Reminders - Setup Guide

## 🎉 What's Been Added

Your DumpsterTracker now has **automatic SMS delivery reminders**!

### Features:
- ✅ **Automatic daily reminders** - Sends SMS every morning at 8:00 AM to customers with next-day deliveries
- ✅ **Manual send option** - Test or send anytime with a button click
- ✅ **Delivery scheduling** - New "Deliveries" page to manage your schedule
- ✅ **Customer integration** - Auto-fills from your existing customer list
- ✅ **Tracking** - See which reminders were sent and when

### Example SMS Message:
```
Hi John! Reminder: 20 yard dumpster delivery scheduled for 
tomorrow between 8AM-5PM. 123 Main St, Jackson MI. 
Questions? Call (248) 388-1000
```

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Free Twilio Account

1. **Sign up:** https://www.twilio.com/try-twilio
2. **Verify your phone** (for testing)
3. **Get a phone number:**
   - Click "Get a Twilio phone number"
   - Click "Choose this Number"
   - This is your SMS sending number (FREE with trial credit)

4. **Get your credentials:**
   - Go to Console Dashboard: https://console.twilio.com
   - Copy your **Account SID**
   - Copy your **Auth Token** (click "show" to reveal)

### Step 2: Configure Backend

**Edit your server `.env` file:**
```bash
cd ~/Documents/DumpsterTracker/server
code .env
```

**Add your Twilio credentials:**
```env
# Twilio SMS (from https://console.twilio.com)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+12485551234

# Your business phone (shows in SMS)
BUSINESS_PHONE=(248) 388-1000
```

⚠️ **Important:** Phone numbers must include country code (e.g., `+12485551234`)

### Step 3: Restart Backend Server

```bash
# Stop current server (Ctrl+C if running)
cd ~/Documents/DumpsterTracker/server
npm start
```

You should see:
```
🚀 DumpsterTracker API server running on http://localhost:3001
⏰ Automatic reminder cron job scheduled for 8:00 AM daily
```

### Step 4: Test It!

1. **Open app:** http://localhost:3000
2. **Click "Deliveries"** button on dashboard
3. **Schedule a test delivery** for tomorrow
4. **Click "Send Tomorrow's Reminders"** to test
5. You should receive an SMS instantly!

---

## 📱 How It Works

### Automatic Sending
- **When:** Every morning at 8:00 AM (Eastern Time)
- **Who:** Customers with deliveries scheduled for the next day
- **What:** SMS reminder with customer name, dumpster size, time, address
- **No action needed** - Runs automatically while server is running

### Manual Sending
- Click **"Send Tomorrow's Reminders"** button anytime
- Reviews list before sending
- Shows results (sent/failed counts)
- Great for testing

---

## 💰 Cost & Free Trial

### Free Trial
- **$15 credit** (enough for ~500 SMS in USA)
- **1 phone number** included
- Perfect for testing

### After Trial
- **$1.15/month** per phone number
- **~$0.0079 per SMS** in USA/Canada
- Example: 100 SMS/month = $1.94/month

---

## 🔧 Configuration Options

### Change Reminder Time

Edit `server/server.js` line with cron schedule:

```javascript
// Current: 8:00 AM daily
cron.schedule('0 8 * * *', async () => {

// Change to 5:00 PM:
cron.schedule('0 17 * * *', async () => {

// Change to 7:00 AM:
cron.schedule('0 7 * * *', async () => {
```

Format: `'minute hour * * *'` (24-hour format)

### Change Timezone

Edit `server/server.js`:
```javascript
cron.schedule('0 8 * * *', async () => {
  // ...
}, {
  timezone: "America/New_York"  // or "America/Chicago", "America/Los_Angeles"
});
```

### Customize Message

Edit `server/server.js` in the `sendTomorrowReminders()` function:
```javascript
const message = `Hi ${delivery.customerName}! Reminder: ${delivery.dumpsterSize} dumpster delivery scheduled for tomorrow ${delivery.deliveryTime || 'between 8AM-5PM'}. ${delivery.address}. Questions? Call ${process.env.BUSINESS_PHONE}`;
```

---

## 📊 Using the Deliveries Page

### Schedule a Delivery
1. Click **"Schedule Delivery"** button
2. Select existing customer OR enter manually
3. Fill in:
   - Phone number (required for SMS)
   - Delivery date
   - Dumpster size
   - Optional: time, notes
4. Click **"Schedule Delivery"**

### View Scheduled Deliveries
- **Filters:** Upcoming, Today, Tomorrow, All
- **Status tracking:** Scheduled, Confirmed, Completed, Cancelled
- **Reminder status:** Shows if/when reminder was sent

### Manual Reminders
- Click **"Send Tomorrow's Reminders"**
- Confirms before sending
- Shows results (sent/failed)

---

## 🐛 Troubleshooting

### "Twilio not configured" error
- Make sure `.env` file has all three Twilio values
- Restart backend server after editing `.env`
- Check credentials at https://console.twilio.com

### SMS not received
- **In trial mode:** Can only send to verified phone numbers
  - Go to https://console.twilio.com/us1/develop/phone-numbers/manage/verified
  - Add customer phone numbers here
- **Phone number format:** Must include country code (+1 for USA)
- **Check Twilio logs:** https://console.twilio.com/us1/monitor/logs/sms

### Automatic reminders not sending
- Backend server must be running 24/7
- For production, deploy to cloud (Heroku, Railway, etc.)
- Check server logs in terminal

### Backend server keeps stopping
- macOS may sleep after inactivity
- **Quick fix:** System Preferences → Energy Saver → Prevent sleep
- **Better fix:** Deploy to cloud server ($5-10/month)

---

## 🚀 Production Deployment (Optional)

For 100% reliable automatic reminders, deploy backend to cloud:

### Recommended Services:
1. **Railway.app** - Easiest, ~$5/month
2. **Heroku** - Popular, free tier available
3. **DigitalOcean** - $6/month, more control

### Quick Railway Deploy:
```bash
cd ~/Documents/DumpsterTracker/server
# Install Railway CLI
npm i -g @railway/cli
# Login and deploy
railway login
railway init
railway up
```

Add environment variables in Railway dashboard, and you're live!

---

## 📞 Support

### Twilio Support
- Help Center: https://support.twilio.com
- Phone: 1-844-812-4627

### Common Questions

**Q: Can I send to landlines?**
A: No, SMS only works with mobile phones.

**Q: Can customers reply?**
A: Yes! You can check replies at https://console.twilio.com/us1/monitor/logs/sms

**Q: What if I run out of trial credit?**
A: Add a credit card to continue. SMS are ~$0.01 each.

**Q: Can I use my own business phone number?**
A: Yes, you can port your existing number to Twilio (takes 7-10 days).

---

## ✅ Verification Checklist

- [ ] Twilio account created
- [ ] Phone number obtained
- [ ] Credentials added to `.env`
- [ ] Backend server restarted
- [ ] Test delivery scheduled for tomorrow
- [ ] Manual reminder sent successfully
- [ ] SMS received on phone
- [ ] Automatic reminder time configured (8 AM default)

---

**All set!** Your customers will now automatically receive delivery reminders. 🎉
