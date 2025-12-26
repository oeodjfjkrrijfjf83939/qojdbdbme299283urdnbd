# 🚀 Multi QR Manager - Quick Guide

## ⚡ Get Started in 2 Minutes

### 1. Open the App
- **Option A**: Double-click `admin.html` → Enter password → Access dashboard
- **Option B**: Double-click `edit.html` → Create user profile directly (no login needed)

### 2. Add a User
- **From Dashboard**: Click "➕ Add New User" (requires login)
- **Direct Access**: Open `edit.html` directly (no login needed)
- Fill in username, full name, and social links
- Add certificates (optional) - see [CERTIFICATES.md](CERTIFICATES.md)
- Click "💾 Generate JSON"
- Copy the JSON that appears
- Open `data/clients.json` or `data/personal.json`
- Add the JSON to the array
- Save the file

### 3. Test It
- Refresh the dashboard
- Click "📱 Show QR" on your user
- Customize QR code (colors, styles, gradients)
- Download the QR code (PNG or SVG)
- Scan with phone - it works!

---

## 🌟 Key Features

### Platform Support
- **175+ Platforms** across 25+ categories
- **Global**: LinkedIn, GitHub, Instagram, YouTube, etc.
- **India**: Swiggy, Zomato, PhonePe, Razorpay, etc.
- See complete list: [PLATFORMS.md](PLATFORMS.md)

### Advanced Features
- **Custom Certificates**: Add unlimited credentials with custom titles
- **Multiple UPI IDs**: Support multiple payment IDs per platform
- **Multiple Phone/Email**: Add multiple contact methods
- **Google Maps**: Combined location + review links
- **QR Customization**: Colors, styles, gradients, transparency

---

## 🔐 Security Features

- **Public Profile Creation**: Anyone can create profiles via `edit.html`
- **Protected Dashboard**: Password required for management
- **User Isolation**: Each profile needs unique username+code
- **Session Timeout**: Auto-logout after 24 hours
- **Multi-User Login**: Multiple admin accounts with roles
- **Input Protection**: XSS prevention and sanitization

---

## 🌐 Deploy Online (Optional)

### GitHub Pages:
1. **Update login credentials** in `credentials/login_credentials.json`:
   ```json
   [
     {
       "username": "admin",
       "password": "YourSecurePassword123!",
       "role": "main_admin",
       "dataFile": "personal.json",
       "isActive": true
     }
   ]
   ```

2. Update `script.js` line 5:
   ```javascript
   baseUrl: 'https://YOUR-USERNAME.github.io/YOUR-REPO/'
   ```

3. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```

4. Enable GitHub Pages:
   - Go to repo Settings → Pages
   - Source: Deploy from branch
   - Branch: main → / (root) → Save

5. Wait 2 minutes, visit your URL!

### Production Deployment:
- **Netlify/Vercel**: Better for production (private repos, env vars)
- **Enable HTTPS**: Always use SSL certificates
- **Login Credentials**: Manage admin accounts via `credentials/login_credentials.json`
- **Environment Variables**: Store sensitive data securely

---

## 🎓 Adding Certificates

### Quick Steps:
1. Open `edit.html`
2. Scroll to "🎓 Certificates & Credentials"
3. Click "➕ Add Certificate"
4. Enter **Title** (e.g., "AWS Certified Solutions Architect")
5. Enter **URL** (link to your certificate)
6. Add more certificates as needed
7. Click "✖" to remove any certificate

### Where to Host:
- **Google Drive**: Upload → Share → Copy link
- **Dropbox**: Upload → Share → Copy link
- **Credential Platforms**: Credly, Accredible, Badgr
- **Personal Website**: Your own server

**Full Guide**: [CERTIFICATES.md](CERTIFICATES.md)

---

## 📝 Important Files

- `admin.html` - **Admin login (for dashboard access)**
- `index.html` - Dashboard (protected - requires login)
- `edit.html` - **Add/edit users (public access - no login needed)**
- `user.html` - Public profiles (QR access only)
- `data/clients.json` - Main user database
- `data/personal.json` - Personal user accounts
- `credentials/login_credentials.json` - Admin login accounts
- `assets/icons/` - 155 platform SVG icons

---

## 🎨 Platform Categories

- 💼 Professional & Business (9)
- 🎨 Design & Creative (6)
- 📱 Social Media (6)
- 🎥 Video & Streaming (6)
- 🎵 Music & Audio (4)
- 💻 Developer & Tech (6)
- 💬 Messaging & Chat (10)
- 🎮 Gaming (7)
- 💰 Creator & Monetization (4)
- 🛒 E-commerce & Shopping (10)
- � Photography (3)
- ✍️ Blogging & Writing (3)
- 🌐 Other Social (17)
- 🔧 Productivity & Tools (3)
- 💳 Payment & Donation (15)
- 🏢 Business Tools (4)
- 🎓 Education & Learning (9)
- 🍔 Food & Dining (8)
- 🚗 Transportation (4)
- ✈️ Travel & Hospitality (5)
- 🏥 Health & Wellness (4)
- 📚 Books & Reading (1)
- 🎬 Entertainment & OTT (8)
- 🎓 Certificates (unlimited)
- 📞 Contact (6 fields)

**Full List**: [PLATFORMS.md](PLATFORMS.md)

---

## �🐛 Quick Fixes

### Login Issues
- **Can't login?** Check credentials in `credentials/login_credentials.json`
- **Access denied?** Clear browser storage and try again
- **Session expired?** Re-login via `admin.html`

### User Management
- **Need to add user?** Use `edit.html` directly (no login needed)
- **Can't see user?** Refresh dashboard (Ctrl+Shift+R)
- **QR not working?** Check `data/clients.json` has the user

### Profile Access
- **URL needs both username and code** for security
- **QR code contains both** automatically
- **Direct URL format**: `user.html?u=username&code=USERCODE`

### Certificates
- **Not showing?** Ensure both title and URL are filled
- **Link not working?** Verify URL is accessible
- **Count wrong?** Refresh dashboard

---

## 💡 Pro Tips

### Multiple Entries
- **UPI IDs**: Add multiple IDs separated by commas
  - Example: `user@paytm,user@gpay,user@phonepe`
- **Phone Numbers**: Add multiple numbers separated by commas
  - Example: `+911234567890,+919876543210`
- **Email Addresses**: Add multiple emails separated by commas
  - Example: `work@email.com,personal@email.com`

### QR Code Customization
- **Colors**: Change QR and background colors
- **Styles**: Choose from 12 different styles (squares, dots, hearts, etc.)
- **Gradients**: Apply gradient colors
- **Transparency**: Adjust background opacity
- **Spacing**: Control padding around QR code

### Best Practices
- **Use unique usernames** for each profile
- **Keep user codes secure** - they're like passwords
- **Update credentials** before deployment
- **Test QR codes** before printing
- **Backup data files** regularly

---

## 📊 Statistics

- **Total Platforms**: 175+
- **Categories**: 25+
- **Icons**: 155 SVG files
- **Geographic Coverage**: Global + India
- **Custom Certificates**: Unlimited

---

## 🎯 That's It!

Your Multi QR Manager is ready! Create digital business cards with 175+ platforms and custom certificates.

---

## 🔗 Navigation

**🏠 [README](../README.md)** | **🌐 [PLATFORMS](PLATFORMS.md)** | **� [CERTIFICATES](CERTIFICATES.md)**

---

**Need help?** Check the documentation files or contact support.
