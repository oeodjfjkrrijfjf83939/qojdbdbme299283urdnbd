# 🔗 Multi QR Manager

Create digital business cards with QR codes supporting **175+ platforms**. Perfect for business card services!

## ✨ **What It Does**

- 📱 **Generate QR codes** for customer profiles
- 👥 **Manage multiple users** from one dashboard
- 🎨 **Beautiful profiles** with social media links
- 🔐 **Secure access** with unique codes
- 📱 **Mobile friendly** design
- 🌍 **175+ platforms** - Global & Indian platforms
- 🎓 **Custom certificates** - Add unlimited credentials
- 🗂️ **Folder-based Organization** - Manage clients in nested folders
- 📊 **Advanced Analytics** - Track user counts per file and folder

## 📚 **Table of Contents**
- [Quick Start](#-quick-start)
- [Key Features](#-key-features)
- [Security Features](#-security-features)
- [File Structure](#-file-structure)
- [Folder-Based Data Management](#%EF%B8%8F-folder-based-data-management)
- [Detailed Guide](#-detailed-guide)
  - [Get Started in 2 Minutes](#-get-started-in-2-minutes)
  - [Deploy Online](#-deploy-online-optional)
  - [Pro Tips](#-pro-tips)
  - [Troubleshooting](#-quick-fixes)
- [Certificates & Credentials](#-certificates--credentials-guide)
- [Supported Platforms](#-supported-platforms)

---

## 🚀 **Quick Start**

### **Option A: Full Management (Admin)**
1. **Organize Data**: Place JSON files in `data/` or any subfolder (e.g., `data/clients/2024/`).
2. **Run Indexing**: Execute `node tools/generate_index.js` to update the system.
3. **Open `admin.html`** → Enter password → Access dashboard.
4. **Click "👁️ Show Details"** on folder accounts to see file breakdowns.
5. **Click "📱 Show QR"** to generate QR codes.

### **Option B: Quick Profile Creation (Public)**
1. **Open `edit.html`** directly (no login needed)
2. **Fill in user details** and social links
3. **Add certificates** with custom titles (optional)
4. **Save and get JSON** to add to database
5. **Generate QR codes** from dashboard

## 🌟 **Key Features**

### Platform Support
- **175+ Platforms** across 25+ categories
- **Global Platforms**: LinkedIn, GitHub, Instagram, YouTube, etc.
- **Indian Platforms**: Swiggy, Zomato, PhonePe, Razorpay, etc.
- **Custom Certificates**: Add unlimited certificates with custom titles
- **Forms**: Add unlimited forms (Google Forms, surveys, questionnaires) with custom titles

### Advanced Features
- **Multiple UPI IDs**: Support for multiple payment IDs per platform
- **Multiple Phone Numbers**: Add multiple contact numbers
- **Multiple Emails**: Add multiple email addresses
- **Google Maps Integration**: Location + Review links combined
- **Custom Menu Cards**: Digital menu/business card links
- **Advanced Analytics**: Track user counts per file and folder
- **13+ Unique QR Styles**: Fluid, Stripes, Vertical Stripes, Leaf, Boxed, Target, Glitch, and more
- **Global Gradient**: Apply seamless gradients across the entire QR code with multiple direction options
- **Folder Details Overlay**: Visual breakdown of users in nested folders
- **System Indexing**: Auto-discovery of user data files via `generate_index.js`

## 🔐 **Security Features**

- **Public Profile Creation:** Anyone can create profiles via `edit.html` (no login needed)
- **Protected Management:** Dashboard requires admin password
- **Session Management:** Auto-logout after 24 hours
- **User Isolation:** End users can only access their own profiles via QR codes
- **Input Protection:** XSS prevention and input sanitization
- **Multi-User Login:** Multiple admin accounts with role-based access
- **Unique User Codes:** Each profile secured with auto-generated code

## 📁 **File Structure**

```
MultiLynkQRgenerator/
├── admin.html              # Admin login page
├── index.html              # Dashboard (protected)
├── edit.html               # Add/edit users (public)
├── user.html               # Public user profiles
├── script.js               # Main JavaScript
├── style.css               # Styling
├── data/
│   ├── index.json          # System Index (Auto-generated)
│   ├── personal/           # Folder example
│   │   └── personal.json
│   ├── clients/            # Client database folder
│   │   ├── clients-1.json
│   │   └── clients-2.json
│   └── demo/               # Demo database folder
│       └── demo.json
├── tools/
│   └── generate_index.js   # Index generator script
├── credentials/
│   └── login_credentials.json  # Admin accounts
└── assets/
    └── icons/              # 155 platform icons
```

## 🗂️ **Folder-Based Data Management**

Organize your client data into folders for better structure. The system automatically detects files anywhere inside the `data/` directory.

1. **Create Folders**: Make folders like `data/clients/january/` or `data/vip/`.
2. **Add Files**: Place your `.json` data files inside these folders.
3. **Update Index**: Run the tool to register new files:
   ```bash
   node tools/generate_index.js
   ```
4. **Assign Access**: In `credentials/login_credentials.json`, set `dataFile` to a specific file OR a folder path (e.g., `"dataFile": "clients/january"`).
   - **File Access**: User sees only that specific file.
   - **Folder Access**: User sees ALL files inside that folder and its subfolders.

## ⚠️ **Important Security Notes**

1. **Update login credentials** in `credentials/login_credentials.json`
2. **Never share admin.html URL** with end users
3. **Only share QR codes** - they lead to secure user profiles
4. **Admin session expires** after 24 hours for security
5. **Multi-user access** - Multiple admin accounts with different permissions
6. **Change default passwords** before deployment

## 💡 Pro Tips

### QR Code Customization
- **Colors**: Change QR and background colors
- **Styles**: Choose from **12+ unique styles** including:
  - **Modern**: Fluid 💧, Stripes ➖, Vertical Stripes ┃, Cross ➕
  - **Creative**: Leaf 🍃, Boxed ▣, Target 🎯, Glitch 👾
  - **Classic**: Squares 🔲, Rounded Dots 🔘, etc.
- **Gradients**: Apply global gradients with multiple directions (Diagonal, Radial, etc.) and color swapping
- **Transparency**: Adjust background opacity
- **Spacing**: Control padding around QR code

### Best Practices
- **Use unique usernames** for each profile
- **Keep user codes secure** - they're like passwords
- **Update credentials** before deployment
- **Test QR codes** before printing
- **Backup data files** regularly

# 🌐 **Supported Platforms**

**Total Platforms**: 175+  
**Categories**: 25+  
**Icons**: 155 SVG icons  
**Geographic Coverage**: Global + India-specific

---

**Built with ❤️ for modern business QR services**