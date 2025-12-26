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

## 🚀 **Quick Start**

### **Option A: Full Management (Admin)**
1. **Open `admin.html`** → Enter password → Access dashboard
2. **Click "➕ Add New User"** to create profiles
3. **Click "📱 Show QR"** to generate QR codes
4. **Download and print** for customers

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

### Advanced Features
- **Multiple UPI IDs**: Support for multiple payment IDs per platform
- **Multiple Phone Numbers**: Add multiple contact numbers
- **Multiple Emails**: Add multiple email addresses
- **Google Maps Integration**: Location + Review links combined
- **Custom Menu Cards**: Digital menu/business card links

## 🔐 **Security Features**

- **Public Profile Creation:** Anyone can create profiles via `edit.html` (no login needed)
- **Protected Management:** Dashboard requires admin password
- **Session Management:** Auto-logout after 24 hours
- **User Isolation:** End users can only access their own profiles via QR codes
- **Input Protection:** XSS prevention and input sanitization
- **Multi-User Login:** Multiple admin accounts with role-based access
- **Unique User Codes:** Each profile secured with auto-generated code

## 📚 **Documentation**

- **🚀 [Quick Start Guide](docs/QUICK_GUIDE.md)** - Get started in 2 minutes
- **🌐 [Platform List](docs/PLATFORMS.md)** - All 175+ supported platforms
- **🎓 [Certificates Guide](docs/CERTIFICATES.md)** - How to add custom certificates

## 📁 **File Structure**

```
MultiLinkQRgenerator/
├── admin.html              # Admin login page
├── index.html              # Dashboard (protected)
├── edit.html               # Add/edit users (public)
├── user.html               # Public user profiles
├── script.js               # Main JavaScript
├── style.css               # Styling
├── data/
│   ├── personal.json       # Personal accounts
│   ├── clients.json        # Client database
│   └── demo.json           # Demo database
├── credentials/
│   └── login_credentials.json  # Admin accounts
├── assets/
│   └── icons/              # 155 platform icons
└── docs/
    ├── QUICK_GUIDE.md      # Setup guide
    ├── PLATFORMS.md        # Platform list
    └── CERTIFICATES.md     # Certificates guide
```

## ⚠️ **Important Security Notes**

1. **Update login credentials** in `credentials/login_credentials.json`
2. **Never share admin.html URL** with end users
3. **Only share QR codes** - they lead to secure user profiles
4. **Admin session expires** after 24 hours for security
5. **Multi-user access** - Multiple admin accounts with different permissions
6. **Change default passwords** before deployment

## 🎯 **Platform Categories**

- 💼 Professional & Business (9 platforms)
- 🎨 Design & Creative (6 platforms)
- 📱 Social Media (6 platforms)
- 🎥 Video & Streaming (6 platforms)
- 🎵 Music & Audio (4 platforms)
- 💻 Developer & Tech (6 platforms)
- 💬 Messaging & Chat (10 platforms)
- 🎮 Gaming (7 platforms)
- 💰 Creator & Monetization (4 platforms)
- 🛒 E-commerce & Shopping (10 platforms)
- 📸 Photography & Visual (3 platforms)
- ✍️ Blogging & Writing (3 platforms)
- 🌐 Other Social (17 platforms)
- 🔧 Productivity & Tools (3 platforms)
- 💳 Payment & Donation (15 platforms)
- 🏢 Business Tools (4 platforms)
- 🎓 Education & Learning (9 platforms)
- 🍔 Food & Dining (8 platforms)
- 🚗 Ride & Transportation (4 platforms)
- ✈️ Travel & Hospitality (5 platforms)
- 🏥 Health & Wellness (4 platforms)
- 📚 Books & Reading (1 platform)
- 🎬 Entertainment & OTT (8 platforms)
- 🎓 Certificates & Credentials (unlimited)
- 📞 Contact Information (6 fields)

## 🔗 **Navigation**

**🚀 [Quick Guide](docs/QUICK_GUIDE.md)** | **🌐 [Platforms](docs/PLATFORMS.md)** | **🎓 [Certificates](docs/CERTIFICATES.md)**

---

**Built with ❤️ for modern business QR services**