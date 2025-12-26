// Configuration - UPDATE THIS WITH YOUR GITHUB USERNAME AND REPO NAME
const CONFIG = {
  // For GitHub Pages: https://yourusername.github.io/reponame/
  // For local testing: use window.location.origin + '/'
  baseUrl: window.location.origin + window.location.pathname.replace('index.html', ''),
  // When deploying, change to: 'https://yourusername.github.io/multi-qr-app/'
};

// QR Customization Settings
let qrCustomization = {
  backgroundColor: '#ffffff',
  backgroundOpacity: 100,
  qrStyle: 'squares',
  qrColor: '#000000',
  isGradient: false,
  gradientColor1: '#000000',
  gradientColor2: '#6366f1',
  gradientDirection: 'horizontal',
  spacing: 16
};

// QR Padding Configuration - single source of truth
const QR_PADDING_CONFIG = {
  referenceSize: 2048,   // Reference output size
  get referencePadding() {
    return qrCustomization.spacing; // Dynamic padding based on user setting
  }
};

// Load users from multiple JSON files for QR modal
async function loadUsersForQR(username, userCode) {
  try {
    // List of data files to load (same as loadUsers)
    const dataFiles = [
      './data/personal.json',
      './data/clients.json',
      './data/demo.json',
      // Add more files here as needed: './data/users_location2.json', etc.
    ];

    const allUsers = [];

    // Load users from each file
    for (const file of dataFiles) {
      try {
        const res = await fetch(file);
        if (res.ok) {
          const users = await res.json();
          allUsers.push(...users);
        }
      } catch (fileErr) {
        // Continue loading other files even if one fails
      }
    }

    // Find the specific user
    const user = allUsers.find(u => u.username === username && u.userCode === userCode);

    if (user) {
      document.getElementById('qrUserName').innerText = user.fullname || 'Unknown User';
      document.getElementById('qrUserHandle').innerText = `@${username}`;
    } else {
      document.getElementById('qrUserName').innerText = 'Unknown User';
      document.getElementById('qrUserHandle').innerText = `@${username}`;
    }
  } catch (err) {
    // Fallback if all files fail to load
    document.getElementById('qrUserName').innerText = 'Unknown User';
    document.getElementById('qrUserHandle').innerText = `@${username}`;
  }
}

// Global variable to store all users for search functionality
let allUsersGlobal = [];

// Global variable to store all admin accounts for search functionality
let allAdminAccountsGlobal = [];

// Global variable to track password visibility state
let passwordsVisible = false; // Default to hidden

// Toggle password visibility
function togglePasswordVisibility() {
  passwordsVisible = !passwordsVisible;

  // Update all password elements except admin accounts
  const passwordElements = document.querySelectorAll('.password:not(.admin-hidden)');
  passwordElements.forEach(element => {
    if (passwordsVisible) {
      element.classList.remove('hidden');
      element.classList.add('visible');
    } else {
      element.classList.remove('visible');
      element.classList.add('hidden');
    }
  });

  // Update toggle button icon
  const toggleIcon = document.querySelector('.toggle-icon');
  if (toggleIcon) {
    toggleIcon.textContent = passwordsVisible ? '🙈' : '👁️';
  }

  // Update button title
  const toggleBtn = document.getElementById('passwordToggleBtn');
  if (toggleBtn) {
    toggleBtn.title = passwordsVisible ? 'Hide passwords' : 'Show passwords';
  }
}


function editUser(username, userCode) {
  // Redirect to edit page with user parameters
  window.location.href = `edit.html?username=${username}&code=${userCode}`;
}

// UI switching functions
function showAdminUI() {
  // Hide user UI elements
  document.getElementById('searchContainer').style.display = 'none';
  document.getElementById('userStatsContainer').style.display = 'none';
  document.getElementById('userList').style.display = 'none';

  // Show admin UI elements
  document.getElementById('adminSearchContainer').style.display = 'block';
  document.getElementById('adminStatsContainer').style.display = 'block';
  document.getElementById('adminTableContainer').style.display = 'block';

  // Hide Add New User button for admin (not relevant for admin dashboard)
  const addUserBtn = document.getElementById('addUserBtn');
  if (addUserBtn) {
    addUserBtn.style.display = 'none';
  }

  // Show admin-only buttons
  const addLoginBtn = document.getElementById('addLoginBtn');
  if (addLoginBtn) {
    addLoginBtn.style.display = 'inline-flex';
  }

  // Update header
  document.getElementById('headerDescription').textContent = 'Admin Dashboard - Manage digital business cards with QR codes';
  const adminUsername = sessionStorage.getItem('adminUsername');
  document.getElementById('userInfo').textContent = `Logged in as: ${adminUsername}`;
}

function showUserUI() {
  // Hide admin UI elements
  document.getElementById('adminSearchContainer').style.display = 'none';
  document.getElementById('adminStatsContainer').style.display = 'none';
  document.getElementById('adminTableContainer').style.display = 'none';

  // Hide admin-only buttons
  const addLoginBtn = document.getElementById('addLoginBtn');
  if (addLoginBtn) {
    addLoginBtn.style.display = 'none';
  }

  // Show Add New User button for regular users
  const addUserBtn = document.getElementById('addUserBtn');
  if (addUserBtn) {
    addUserBtn.style.display = 'inline-flex';
  }

  // Show user UI elements
  document.getElementById('searchContainer').style.display = 'block';
  document.getElementById('userStatsContainer').style.display = 'block';
  document.getElementById('userList').style.display = 'grid';

  // Update header
  document.getElementById('headerDescription').textContent = 'Manage digital business cards with QR codes';
  const userDataFile = sessionStorage.getItem('adminDataFile');
  const userUsername = sessionStorage.getItem('adminUsername');
  document.getElementById('userInfo').textContent = `Data File: ${userDataFile} | Logged in as: ${userUsername}`;
}

// Load users from multiple JSON files
async function loadUsers() {
  const userRole = sessionStorage.getItem('adminRole');
  const userDataFile = sessionStorage.getItem('adminDataFile');

  try {
    if (userRole === 'main_admin') {
      // Admin users see all data and admin statistics
      const dataFiles = [
        './data/personal.json',
        './data/clients.json',
        './data/demo.json',
      ];

      const allUsers = [];

      for (const file of dataFiles) {
        try {
          const res = await fetch(file);
          if (res.ok) {
            const users = await res.json();
            allUsers.push(...users);
            console.log(`✅ Loaded ${users.length} users from ${file}`);
          } else {
            console.log(`⚠️ File not found: ${file}`);
          }
        } catch (fileErr) {
          console.log(`⚠️ Error loading ${file}:`, fileErr.message);
        }
      }

      allUsersGlobal = allUsers;
      showAdminUI();
      displayAdminStatistics(allUsers);
      displayLoginAccountsTable();

    } else if (userRole === 'user') {
      // Regular users see only their assigned data file
      if (!userDataFile) {
        document.getElementById('userList').innerHTML =
          '<div class="no-users"><p style="color: red;">❌ No data file assigned to this user!</p></div>';
        return;
      }

      let users = [];
      try {
        const response = await fetch(`./data/${userDataFile}`);
        if (response.ok) {
          users = await response.json();
        } else if (response.status === 404) {
          // Data file doesn't exist yet - show empty state
          users = [];
        } else {
          throw new Error('Failed to load data file');
        }
      } catch (error) {
        console.error(`Error loading ${userDataFile}:`, error);
        document.getElementById('userList').innerHTML =
          '<div class="no-users"><p style="color: red;">❌ Error loading users!</p></div>';
        return;
      }

      allUsersGlobal = users;
      showUserUI();
      displayUsers(users);
      updateUserStatistics(users);

    } else {
      // Unknown role - redirect to login
      redirectToLogin();
    }

  } catch (error) {
    console.error('Error loading users:', error);
    document.getElementById('userList').innerHTML =
      '<div class="no-users"><p style="color: red;">❌ Error loading users!</p></div>';
  }
}

// Search functionality for regular users
function searchUsers(searchTerm) {
  if (!allUsersGlobal || allUsersGlobal.length === 0) {
    document.getElementById('userList').innerHTML = '<div class="no-results-card"><p>No users available to search.</p></div>';
    return;
  }

  const term = searchTerm.toLowerCase().trim();

  if (term === '') {
    displayUsers(allUsersGlobal);
    return;
  }

  const filteredUsers = allUsersGlobal.filter(user => {
    const fullname = (user.fullname || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    const userCode = (user.userCode || '').toLowerCase();

    return fullname.includes(term) || username.includes(term) || userCode.includes(term);
  });

  displayUsers(filteredUsers);
}

// Search functionality for admin accounts
function searchAdminAccounts(searchTerm) {
  if (!allAdminAccountsGlobal || allAdminAccountsGlobal.length === 0) {
    document.getElementById('adminAccountsTableBody').innerHTML = '<tr><td colspan="7" style="text-align: center;">No login accounts available to search.</td></tr>';
    return;
  }

  const term = searchTerm.toLowerCase().trim();

  if (term === '') {
    displayLoginAccountsTable(allAdminAccountsGlobal);
    return;
  }

  const filteredAccounts = allAdminAccountsGlobal.filter(account => {
    const username = (account.username || '').toLowerCase();
    const description = (account.description || '').toLowerCase();
    const dataFile = (account.dataFile || '').toLowerCase();

    return username.includes(term) || description.includes(term) || dataFile.includes(term);
  });

  displayLoginAccountsTable(filteredAccounts);
}

// Update user statistics for regular users
function updateUserStatistics(users) {
  const totalUsers = users.length;
  let totalLinks = 0;

  users.forEach(user => {
    const allPlatforms = [
      user.linkedin, user.xing, user.angellist, user.behance, user.dribbble, user.figma, user.portfolio,
      user.instagram, user.twitter, user.facebook, user.threads, user.mastodon, user.bluesky,
      user.youtube, user.tiktok, user.vimeo, user.twitch, user.spotify, user.soundcloud, user.applemusic, user.bandcamp,
      user.github, user.gitlab, user.bitbucket, user.stackoverflow, user.devto, user.codepen,
      user.whatsapp, user.telegram, user.discord, user.signal, user.skype, user.slack,
      user.steam, user.xbox, user.playstation, user.nintendo, user.patreon, user.kofi, user.buymeacoffee, user.substack,
      user.etsy, user.amazon, user.shopify, user.flipkart, user.flickr, user['500px'], user.unsplash,
      user.medium, user.wordpress, user.blogger, user.pinterest, user.reddit, user.snapchat, user.tumblr,
      user.bereal, user.clubhouse, user.nextdoor, user.strava, user.linktree, user.notion, user.calendly,
      user.paypal, user.gpay, user.phonepe, user.paytm, user.upi, user.cashapp, user.crunchbase,
      user.glassdoor, user.indeed, user.coursera, user.udemy, user.skillshare, user.khanacademy,
      user.email, user.phone, user.website, user.location, user.googleReview
    ];

    allPlatforms.forEach(link => {
      if (link && typeof link === 'string' && link.trim()) {
        if (link.includes(',')) {
          const items = link.split(',').map(item => item.trim()).filter(item => item);
          totalLinks += items.length;
        } else {
          totalLinks += 1;
        }
      }
    });
  });

  document.getElementById('totalUsers').textContent = totalUsers;
}

// Display users in the list
function displayUsers(users) {
  const list = document.getElementById('userList');

  if (users.length === 0) {
    // Check if this is from a search or initial load
    const searchInput = document.getElementById('searchInput');
    const isSearching = searchInput && searchInput.value.trim() !== '';

    let message = '';
    if (isSearching) {
      message = 'No users found matching your search criteria.';
    } else {
      message = 'No users yet. Add your first user!';
    }

    list.innerHTML = `
      <div class="no-results-card">
        <p>${message}</p>
      </div>
    `;
    return;
  }

  list.innerHTML = "";

  users.forEach(u => {
    const div = document.createElement('div');
    div.classList.add('user-card');

    // Count active social links (all 175+ platforms)
    const allPlatforms = [
      // Professional
      u.linkedin, u.xing, u.angellist, u.meetup, u.opportunity,
      // Design
      u.behance, u.dribbble, u.figma, u.portfolio, u.artstation, u.zerply,
      // Social
      u.instagram, u.twitter, u.facebook, u.threads, u.mastodon, u.bluesky,
      // Video
      u.youtube, u.tiktok, u.vimeo, u.twitch, u.rumble, u.dailymotion,
      // Music
      u.spotify, u.soundcloud, u.applemusic, u.bandcamp,
      // Developer
      u.github, u.gitlab, u.bitbucket, u.stackoverflow, u.devto, u.codepen,
      // Messaging
      u.whatsapp, u.telegram, u.discord, u.signal, u.skype, u.slack, u.wechat, u.line, u.viber, u.messenger,
      // Gaming
      u.steam, u.xbox, u.playstation, u.nintendo, u.dream11, u.mpl, u.winzo,
      // Creator
      u.patreon, u.kofi, u.buymeacoffee, u.substack,
      // Ecommerce
      u.etsy, u.amazon, u.shopify, u.flipkart, u.myntra, u.meesho, u.nykaa, u.bigbasket, u.blinkit, u.zepto,
      // Photography
      u.flickr, u['500px'], u.unsplash,
      // Blogging
      u.medium, u.wordpress, u.blogger,
      // Misc Social
      u.pinterest, u.reddit, u.snapchat, u.tumblr, u.bereal, u.clubhouse, u.nextdoor, u.strava,
      u.sharechat, u.moj, u.josh, u.koo, u.mxtakatak, u.vk, u.ok, u.kakaotalk, u.quora,
      // Productivity
      u.linktree, u.notion, u.calendly,
      // Payment
      u.paypal, u.gpay, u.phonepe, u.paytm, u.upi, u.cashapp, u.razorpay, u.cred, u.mobikwik,
      u.freecharge, u.bhim, u.amazonpay, u.navi, u.jupiter, u.jiofinance,
      // Business
      u.crunchbase, u.glassdoor, u.indeed, u.naukri,
      // Education
      u.coursera, u.udemy, u.skillshare, u.khanacademy, u.byjus, u.unacademy, u.vedantu, u.upgrad, u.physicswallah,
      // Food
      u.swiggy, u.zomato, u.dineout, u.eatsure, u.magicpin, u.jiomart, u.swiggyinstamart, u.dunzo,
      // Transportation
      u.ola, u.uber, u.rapido, u.porter,
      // Travel
      u.makemytrip, u.goibibo, u.oyo, u.cleartrip, u.ixigo,
      // Health
      u.practo, u.onemg, u.pharmeasy, u.cultfit,
      // Books
      u.goodreads,
      // OTT
      u.jiocinema, u.hotstar, u.netflix, u.primevideo, u.sonyliv, u.zee5, u.mxplayer, u.imdb,
      // Contact
      u.email, u.phone, u.website, u.menucard, u.location, u.googleReview
    ];

    // Count links, considering multiple UPI IDs, phone numbers, and email addresses
    let linkCount = 0;
    allPlatforms.forEach(link => {
      if (link && typeof link === 'string' && link.trim()) {
        // For UPI platforms, count each ID separately
        if (link.includes(',') && (link.includes('@') || link.includes('upi'))) {
          const upiIds = link.split(',').map(id => id.trim()).filter(id => id);
          linkCount += upiIds.length;
        }
        // For phone numbers, count each number separately
        else if (link.includes(',') && (link.includes('+') || /^\d/.test(link.trim()))) {
          const phoneNumbers = link.split(',').map(num => num.trim()).filter(num => num);
          linkCount += phoneNumbers.length;
        }
        // For email addresses, count each email separately
        else if (link.includes(',') && link.includes('@') && !link.includes('upi')) {
          const emailAddresses = link.split(',').map(email => email.trim()).filter(email => email);
          linkCount += emailAddresses.length;
        } else {
          linkCount += 1;
        }
      }
    });

    // Add certificates count
    if (u.certificates && Array.isArray(u.certificates)) {
      linkCount += u.certificates.length;
    }

    // Get first few active platforms for display badges
    const activePlatforms = [];
    if (u.linkedin) activePlatforms.push('LinkedIn');
    if (u.github) activePlatforms.push('GitHub');
    if (u.instagram) activePlatforms.push('Instagram');
    if (u.twitter) activePlatforms.push('Twitter');
    if (u.behance) activePlatforms.push('Behance');

    const platformBadges = activePlatforms.slice(0, 3).map(p =>
      `<span class="link-badge">${p}</span>`
    ).join('');
    const moreBadge = linkCount > 3 ? `<span class="link-badge">+${linkCount - 3} more</span>` : '';

    // <p class="user-code">Code: ${u.userCode || 'N/A'}</p>
    div.innerHTML = `
      <div class="user-info">
        <h3>${u.fullname}</h3>
        <p class="username">@${u.username}</p>
        <div class="user-links">
          ${platformBadges}
          ${moreBadge}
        </div>
        <p class="meta">${linkCount} active link${linkCount !== 1 ? 's' : ''}</p>
      </div>
      <div class="user-actions">
        <button class="qrBtn btn-show-qr" data-username="${u.username}" data-usercode="${u.userCode}">📱 Show QR</button>
        <button class="btn-edit" onclick="editUser('${u.username}', '${u.userCode}')">✏️ Edit</button>
        <button class="btn-view" onclick="viewUser('${u.username}', '${u.userCode}')">👁️ View</button>
      </div>
    `;
    list.appendChild(div);
  });

  // Add event listeners to QR buttons
  document.querySelectorAll('.qrBtn').forEach(btn => {
    btn.addEventListener('click', () => showQR(btn.dataset.username, btn.dataset.usercode));
  });
}

// Show QR Code Modal
function showQR(username, userCode) {
  if (!userCode) {
    alert('Error: User code is missing. Please refresh the page.');
    return;
  }

  // Create secure URL with username AND userCode
  const qrUrl = `${CONFIG.baseUrl}user.html?u=${username}&code=${userCode}`;

  document.getElementById('qrTitle').innerText = 'QR Code';
  document.getElementById('qrUrl').textContent = qrUrl;

  // Find user data to display name from all data files
  loadUsersForQR(username, userCode);

  const qrContainer = document.getElementById('qrContainer');
  qrContainer.innerHTML = "";

  // Generate QR Code using qrcode-generator library
  const typeNumber = 0;
  const errorCorrectionLevel = 'H';
  const qr = qrcode(typeNumber, errorCorrectionLevel);
  qr.addData(qrUrl);
  qr.make();

  // Create as image for better quality
  const size = 8;
  qrContainer.innerHTML = qr.createImgTag(size, 0);

  // Store username and userCode for download
  qrContainer.dataset.username = username;
  qrContainer.dataset.usercode = userCode;

  // Show modal
  document.getElementById('qrModal').classList.add('active');

  // Setup download options
  setupDownloadOptions();
}

// Setup download options for PNG and SVG
function setupDownloadOptions() {
  const downloadBtn = document.getElementById('downloadQR');
  const downloadOptions = document.querySelectorAll('.download-option');
  const sizeOptions = document.querySelectorAll('.size-option');
  const downloadContainer = document.querySelector('.download-options');

  // Toggle dropdown on button click
  downloadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadContainer.classList.toggle('expanded');
  });

  // Handle SVG option clicks
  downloadOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const format = e.target.dataset.format;
      downloadQR(format);
      // Close dropdown after selection
      downloadContainer.classList.remove('expanded');
    });
  });

  // Handle PNG size option clicks
  sizeOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const format = e.target.dataset.format;
      const size = e.target.dataset.size;
      downloadQR(format, size);
      // Close dropdown after selection
      downloadContainer.classList.remove('expanded');
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!downloadContainer.contains(e.target)) {
      downloadContainer.classList.remove('expanded');
    }
  });
}

// Download QR Code in specified format (PNG or SVG)
function downloadQR(format = 'png', size = 512) {
  const qrContainer = document.getElementById('qrContainer');
  const username = qrContainer.dataset.username || 'user';
  const userCode = qrContainer.dataset.usercode || 'NOCODE';

  if (format === 'svg') {
    downloadQRSVG(username, userCode);
  } else {
    downloadQRPNG(username, userCode, size);
  }
}

// Download QR Code as PNG
function downloadQRPNG(username, userCode, size = 512) {
  // Get the QR code data from the library
  const qrUrl = document.getElementById('qrUrl').textContent;

  // Create a canvas with the specified size
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Set canvas size to the requested dimensions
  canvas.width = size;
  canvas.height = size;

  // Fill background with custom color and opacity
  const bgColor = hexToRgba(qrCustomization.backgroundColor, qrCustomization.backgroundOpacity / 100);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  // Generate QR code with high quality
  const typeNumber = 0;
  const errorCorrectionLevel = 'H';
  const qr = qrcode(typeNumber, errorCorrectionLevel);
  qr.addData(qrUrl);
  qr.make();

  // Calculate module size with proportional padding
  const moduleCount = qr.getModuleCount();
  const padding = (size / QR_PADDING_CONFIG.referenceSize) * QR_PADDING_CONFIG.referencePadding; // Proportional padding

  const availableSize = size - (padding * 2);
  const moduleSize = availableSize / moduleCount;

  // Draw QR code modules with custom colors and styles
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        drawQRModule(
          ctx,
          padding + col * moduleSize,
          padding + row * moduleSize,
          moduleSize,
          moduleSize,
          qrCustomization.qrStyle
        );
      }
    }
  }

  // Download as PNG with unique filename: username_userCode_QR_size.png
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${username}_${userCode}_QR_${size}x${size}.png`;
    link.href = url;
    link.click();

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, 'image/png');
}

// Download QR Code as SVG
function downloadQRSVG(username, userCode) {
  // Get the QR code data from the library
  const qrUrl = document.getElementById('qrUrl').textContent;

  // Create SVG version of the QR code
  const typeNumber = 0;
  const errorCorrectionLevel = 'H';
  const qr = qrcode(typeNumber, errorCorrectionLevel);
  qr.addData(qrUrl);
  qr.make();

  // Generate custom SVG string with colors and proportional padding
  const moduleCount = qr.getModuleCount();
  const moduleSize = 8;
  const qrSize = moduleCount * moduleSize;
  const padding = (qrSize / QR_PADDING_CONFIG.referenceSize) * QR_PADDING_CONFIG.referencePadding; // Proportional padding

  const totalSize = qrSize + (padding * 2);

  let svgString = `<svg width="${totalSize}" height="${totalSize}" xmlns="http://www.w3.org/2000/svg">`;

  // Background
  const bgColor = hexToRgba(qrCustomization.backgroundColor, qrCustomization.backgroundOpacity / 100);
  svgString += `<rect width="${totalSize}" height="${totalSize}" fill="${bgColor}"/>`;

  // QR modules with different styles
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        const x = padding + col * moduleSize;
        const y = padding + row * moduleSize;
        const centerX = x + moduleSize / 2;
        const centerY = y + moduleSize / 2;
        const radius = moduleSize / 2;

        // Set color
        let fillColor = qrCustomization.qrColor;
        if (qrCustomization.isGradient) {
          // Create gradient definition
          const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
          let gradientDef = `<defs><linearGradient id="${gradientId}"`;

          switch (qrCustomization.gradientDirection) {
            case 'horizontal':
              gradientDef += ` x1="0%" y1="0%" x2="100%" y2="0%"`;
              break;
            case 'vertical':
              gradientDef += ` x1="0%" y1="0%" x2="0%" y2="100%"`;
              break;
            case 'diagonal':
              gradientDef += ` x1="0%" y1="0%" x2="100%" y2="100%"`;
              break;
            case 'radial':
              gradientDef = `<defs><radialGradient id="${gradientId}" cx="50%" cy="50%" r="50%"`;
              break;
          }

          gradientDef += `><stop offset="0%" stop-color="${qrCustomization.gradientColor1}"/><stop offset="100%" stop-color="${qrCustomization.gradientColor2}"/></linearGradient></defs>`;
          svgString = svgString.replace('<svg', gradientDef + '<svg');
          fillColor = `url(#${gradientId})`;
        }

        // Draw different styles
        switch (qrCustomization.qrStyle) {
          case 'squares':
            svgString += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${fillColor}"/>`;
            break;

          case 'dots':
            svgString += `<circle cx="${centerX}" cy="${centerY}" r="${radius * 0.9}" fill="${fillColor}"/>`;
            break;

          case 'rounded':
            const cornerRadius = moduleSize * 0.2;
            svgString += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${fillColor}"/>`;
            break;

          case 'circles':
            svgString += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="${fillColor}"/>`;
            break;

          case 'diamonds':
            // Larger diamond shape (covers more of the module for better scannability)
            const diamondScale = 1.25; // Increase to 125% of standard size
            const diamondTop = centerY - radius * diamondScale;
            const diamondRight = centerX + radius * diamondScale;
            const diamondBottom = centerY + radius * diamondScale;
            const diamondLeft = centerX - radius * diamondScale;
            svgString += `<polygon points="${centerX},${diamondTop} ${diamondRight},${centerY} ${centerX},${diamondBottom} ${diamondLeft},${centerY}" fill="${fillColor}"/>`;
            break;

          case 'hexagons':
            const hexRadius = radius * 1.0;
            let hexPoints = '';
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i;
              const hexX = centerX + hexRadius * Math.cos(angle);
              const hexY = centerY + hexRadius * Math.sin(angle);
              hexPoints += `${hexX},${hexY} `;
            }
            svgString += `<polygon points="${hexPoints.trim()}" fill="${fillColor}"/>`;
            break;

          case 'stars':
            const starRadius = radius * 1.2; // Increased to 120% for better scannability
            const innerRadius = starRadius * 0.6; // Increased from 0.5 to 0.6
            let starPoints = '';
            for (let i = 0; i < 10; i++) {
              const angle = (Math.PI / 5) * i - Math.PI / 2;
              const r = i % 2 === 0 ? starRadius : innerRadius;
              const starX = centerX + r * Math.cos(angle);
              const starY = centerY + r * Math.sin(angle);
              starPoints += `${starX},${starY} `;
            }
            svgString += `<polygon points="${starPoints.trim()}" fill="${fillColor}"/>`;
            break;

          case 'hearts':
            const heartSize = radius * 2.0; // Increased to 200% for maximum scannability
            // Much larger, bolder heart path
            svgString += `<path d="M ${centerX} ${centerY + heartSize * 0.6} C ${centerX} ${centerY}, ${centerX - heartSize * 0.6} ${centerY - heartSize * 0.4}, ${centerX - heartSize * 0.6} ${centerY} C ${centerX - heartSize * 0.6} ${centerY + heartSize * 0.5}, ${centerX} ${centerY + heartSize * 0.8}, ${centerX} ${centerY + heartSize * 1.0} C ${centerX} ${centerY + heartSize * 0.8}, ${centerX + heartSize * 0.6} ${centerY + heartSize * 0.5}, ${centerX + heartSize * 0.6} ${centerY} C ${centerX + heartSize * 0.6} ${centerY - heartSize * 0.4}, ${centerX} ${centerY}, ${centerX} ${centerY + heartSize * 0.6} Z" fill="${fillColor}"/>`;
            break;

          case 'triangles':
            // Much larger triangle with minimal margins
            svgString += `<polygon points="${centerX},${y + moduleSize * 0.02} ${x + moduleSize * 0.02},${y + moduleSize * 0.98} ${x + moduleSize * 0.98},${y + moduleSize * 0.98}" fill="${fillColor}"/>`;
            break;

          case 'octagons':
            const octRadius = radius * 0.9;
            let octPoints = '';
            for (let i = 0; i < 8; i++) {
              const angle = (Math.PI / 4) * i;
              const octX = centerX + octRadius * Math.cos(angle);
              const octY = centerY + octRadius * Math.sin(angle);
              octPoints += `${octX},${octY} `;
            }
            svgString += `<polygon points="${octPoints.trim()}" fill="${fillColor}"/>`;
            break;

          case 'rounded-dots':
            svgString += `<circle cx="${centerX}" cy="${centerY}" r="${radius * 0.9}" fill="${fillColor}"/>`;
            break;

          case 'pixels':
            const pixelSize = moduleSize * 0.8;
            const pixelOffset = (moduleSize - pixelSize) / 2;
            svgString += `<rect x="${x + pixelOffset}" y="${y + pixelOffset}" width="${pixelSize}" height="${pixelSize}" fill="${fillColor}"/>`;
            break;

          default:
            svgString += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${fillColor}"/>`;
        }
      }
    }
  }

  svgString += '</svg>';

  // Create blob and download
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${username}_${userCode}_QR.svg`;
  link.href = url;
  link.click();

  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// Navigate to edit page with userCode to identify specific user
function editUser(username, userCode) {
  // Pass both username and userCode to identify the correct user
  window.location.href = `edit.html?user=${username}&code=${userCode}`;
}

// View user page with security code
function viewUser(username, userCode) {
  if (!userCode) {
    alert('Error: User code is missing. Please refresh the page.');
    return;
  }

  // Open user page with secure URL
  window.open(`user.html?u=${username}&code=${userCode}`, '_blank');
}

// Copy URL to clipboard
function copyQRUrl() {
  const url = document.getElementById('qrUrl').textContent;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('copyUrl');
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ Copied!';
    btn.style.background = '#10b981';
    btn.style.color = '#fff';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);
  }).catch(err => {
    alert('Failed to copy URL');
  });
}

// Add copy URL functionality
document.addEventListener('DOMContentLoaded', () => {
  const copyBtn = document.getElementById('copyUrl');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyQRUrl);
  }

});

// Add new user button
document.getElementById('addUserBtn').onclick = () => {
  window.location.href = "edit.html";
};

// Logout button
document.getElementById('logoutBtn').onclick = () => {
  sessionStorage.removeItem('adminAuthenticated');
  sessionStorage.removeItem('adminLoginTime');
  window.location.href = 'admin.html';
};

// Close modal
document.getElementById('closeModal').onclick = () => {
  document.getElementById('qrModal').classList.remove('active');
};

// Close modal when clicking outside
window.onclick = (event) => {
  const modal = document.getElementById('qrModal');
  if (event.target === modal) {
    modal.classList.remove('active');
  }
};

// Check admin authentication
function checkAdminAuth() {
  const isAuthenticated = sessionStorage.getItem('adminAuthenticated');
  const loginTime = sessionStorage.getItem('adminLoginTime');
  const userRole = sessionStorage.getItem('adminRole');

  console.log('checkAdminAuth called:', { isAuthenticated, loginTime, userRole });

  // Check if session is valid (24 hours)
  if (!isAuthenticated || !loginTime) {
    console.log('No authentication or login time, redirecting to login');
    redirectToLogin();
    return false;
  }

  const sessionAge = Date.now() - parseInt(loginTime);
  const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

  if (sessionAge > maxSessionAge) {
    console.log('Session expired, clearing and redirecting to login');
    sessionStorage.clear();
    redirectToLogin();
    return false;
  }

  // All authenticated users (both admin and regular users) can access index.html
  // The UI will be adjusted based on their role
  console.log('Authentication successful for role:', userRole);
  return true;
}

function redirectToLogin() {
  window.location.href = 'admin.html';
}

// Helper functions for QR customization
function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createGradient(ctx, x, y, width, height, direction) {
  let gradient;

  switch (direction) {
    case 'horizontal':
      gradient = ctx.createLinearGradient(x, y, x + width, y);
      break;
    case 'vertical':
      gradient = ctx.createLinearGradient(x, y, x, y + height);
      break;
    case 'diagonal':
      gradient = ctx.createLinearGradient(x, y, x + width, y + height);
      break;
    case 'radial':
      gradient = ctx.createRadialGradient(x + width / 2, y + height / 2, 0, x + width / 2, y + height / 2, Math.max(width, height) / 2);
      break;
    default:
      gradient = ctx.createLinearGradient(x, y, x + width, y);
  }

  gradient.addColorStop(0, qrCustomization.gradientColor1);
  gradient.addColorStop(1, qrCustomization.gradientColor2);

  return gradient;
}

// Draw QR code modules with different styles
function drawQRModule(ctx, x, y, width, height, style) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radius = Math.min(width, height) / 2;
  const size = Math.min(width, height);

  // Set color based on gradient or solid color
  if (qrCustomization.isGradient) {
    const gradient = createGradient(ctx, x, y, width, height, qrCustomization.gradientDirection);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = qrCustomization.qrColor;
  }

  switch (style) {
    case 'squares':
      // Default square style
      ctx.fillRect(x, y, width, height);
      break;

    case 'dots':
      // Circular dots
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.9, 0, 2 * Math.PI);
      ctx.fill();
      break;

    case 'rounded':
      // Rounded squares
      const cornerRadius = Math.min(width, height) * 0.2;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, cornerRadius);
      ctx.fill();
      break;

    case 'circles':
      // Full circles
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      break;

    case 'diamonds':
      // Larger diamond shape (covers more of the module for better scannability)
      ctx.beginPath();
      const diamondScale = 1.25; // Increase to 125% of standard size
      ctx.moveTo(centerX, centerY - radius * diamondScale);             // Top
      ctx.lineTo(centerX + radius * diamondScale, centerY);             // Right
      ctx.lineTo(centerX, centerY + radius * diamondScale);             // Bottom
      ctx.lineTo(centerX - radius * diamondScale, centerY);             // Left
      ctx.closePath();
      ctx.fill();
      break;

    case 'hexagons':
      // Hexagon shape
      ctx.beginPath();
      const hexRadius = radius * 1.0;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hexX = centerX + hexRadius * Math.cos(angle);
        const hexY = centerY + hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(hexX, hexY);
        else ctx.lineTo(hexX, hexY);
      }
      ctx.closePath();
      ctx.fill();
      break;

    case 'stars':
      // Much larger 5-pointed star for better scannability
      ctx.beginPath();
      const starRadius = radius * 1.2; // Increased to full radius (100%)
      const innerRadius = starRadius * 0.6; // Increased from 0.5 to 0.6
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? starRadius : innerRadius;
        const starX = centerX + r * Math.cos(angle);
        const starY = centerY + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(starX, starY);
        else ctx.lineTo(starX, starY);
      }
      ctx.closePath();
      ctx.fill();
      break;

    case 'hearts':
      // Much larger and bolder heart shape for maximum scannability
      ctx.beginPath();
      const heartSize = radius * 2.0; // Increased beyond full radius to 110%
      // Much larger, bolder heart using stronger curves
      ctx.moveTo(centerX, centerY + heartSize * 0.6);
      ctx.bezierCurveTo(centerX, centerY, centerX - heartSize * 0.6, centerY - heartSize * 0.4, centerX - heartSize * 0.6, centerY);
      ctx.bezierCurveTo(centerX - heartSize * 0.6, centerY + heartSize * 0.5, centerX, centerY + heartSize * 0.8, centerX, centerY + heartSize * 1.0);
      ctx.bezierCurveTo(centerX, centerY + heartSize * 0.8, centerX + heartSize * 0.6, centerY + heartSize * 0.5, centerX + heartSize * 0.6, centerY);
      ctx.bezierCurveTo(centerX + heartSize * 0.6, centerY - heartSize * 0.4, centerX, centerY, centerX, centerY + heartSize * 0.6);
      ctx.fill();
      break;

    case 'triangles':
      // Much larger triangle shape for better scannability
      ctx.beginPath();
      ctx.moveTo(centerX, y + size * 0.02); // Reduced margin from 0.05 to 0.02
      ctx.lineTo(x + size * 0.02, y + size * 0.98); // Reduced margin from 0.05 to 0.02
      ctx.lineTo(x + size * 0.98, y + size * 0.98); // Increased from 0.95 to 0.98
      ctx.closePath();
      ctx.fill();
      break;

    case 'octagons':
      // Octagon shape
      ctx.beginPath();
      const octRadius = radius * 0.9;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i;
        const octX = centerX + octRadius * Math.cos(angle);
        const octY = centerY + octRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(octX, octY);
        else ctx.lineTo(octX, octY);
      }
      ctx.closePath();
      ctx.fill();
      break;

    case 'rounded-dots':
      // Rounded dots (larger radius)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.9, 0, 2 * Math.PI);
      ctx.fill();
      break;

    case 'pixels':
      // Pixelated squares (smaller)
      const pixelSize = size * 0.8;
      const pixelOffset = (size - pixelSize) / 2;
      ctx.fillRect(x + pixelOffset, y + pixelOffset, pixelSize, pixelSize);
      break;

    default:
      // Fallback to squares
      ctx.fillRect(x, y, width, height);
  }
}

function updateQRDisplay() {
  const qrContainer = document.getElementById('qrContainer');
  const qrImg = qrContainer.querySelector('img');

  if (!qrImg) return;

  // Create a high-quality canvas for better display
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Use higher resolution for better quality (4x the display size)
  const displaySize = 200; // What we want to display
  const canvasSize = 800; // High quality canvas size
  canvas.width = canvasSize;
  canvas.height = canvasSize;

  // Fill background with custom color and opacity
  const bgColor = hexToRgba(qrCustomization.backgroundColor, qrCustomization.backgroundOpacity / 100);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // Get QR data and regenerate
  const qrUrl = document.getElementById('qrUrl').textContent;
  const typeNumber = 0;
  const errorCorrectionLevel = 'H';
  const qr = qrcode(typeNumber, errorCorrectionLevel);
  qr.addData(qrUrl);
  qr.make();

  // Calculate module size with proportional padding
  const moduleCount = qr.getModuleCount();
  const padding = (canvasSize / QR_PADDING_CONFIG.referenceSize) * QR_PADDING_CONFIG.referencePadding; // Proportional padding

  const availableSize = canvasSize - (padding * 2);
  const moduleSize = availableSize / moduleCount;

  // Draw QR code modules with custom colors and styles
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        drawQRModule(
          ctx,
          padding + col * moduleSize,
          padding + row * moduleSize,
          moduleSize,
          moduleSize,
          qrCustomization.qrStyle
        );
      }
    }
  }

  // Replace the displayed QR with high-quality customized version
  qrImg.src = canvas.toDataURL('image/png', 1.0); // Maximum quality
}

function setupCustomizationPanel() {
  const editBtn = document.getElementById('editQRBtn');
  const panel = document.getElementById('qrCustomizationPanel');
  const applyBtn = document.getElementById('applyCustomization');
  const resetBtn = document.getElementById('resetCustomization');
  const gradientToggle = document.getElementById('gradientToggleBtn');
  const gradientControls = document.getElementById('gradientControls');

  // Background color picker
  const bgColorPicker = document.getElementById('bgColorPicker');
  const transparentBgBtn = document.getElementById('transparentBgBtn');

  // Background opacity slider
  const bgOpacitySlider = document.getElementById('bgOpacitySlider');
  const bgOpacityValue = document.getElementById('bgOpacityValue');

  // QR spacing slider
  const qrSpacingSlider = document.getElementById('qrSpacingSlider');
  const qrSpacingValue = document.getElementById('qrSpacingValue');

  // QR style selector
  const qrStyleSelect = document.getElementById('qrStyleSelect');

  // QR color picker
  const qrColorPicker = document.getElementById('qrColorPicker');

  // Gradient controls
  const gradientColor1 = document.getElementById('gradientColor1');
  const gradientColor2 = document.getElementById('gradientColor2');
  const gradientDirection = document.getElementById('gradientDirection');

  // Toggle panel (similar to download dropdown)
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('expanded');
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !editBtn.contains(e.target)) {
      panel.classList.remove('expanded');
    }
  });

  // Apply changes
  applyBtn.addEventListener('click', () => {
    qrCustomization.backgroundColor = bgColorPicker.value;
    qrCustomization.backgroundOpacity = parseInt(bgOpacitySlider.value);
    qrCustomization.spacing = parseInt(qrSpacingSlider.value);
    qrCustomization.qrStyle = qrStyleSelect.value;
    qrCustomization.qrColor = qrColorPicker.value;
    qrCustomization.isGradient = gradientControls.style.display === 'block';
    qrCustomization.gradientColor1 = gradientColor1.value;
    qrCustomization.gradientColor2 = gradientColor2.value;
    qrCustomization.gradientDirection = gradientDirection.value;

    updateQRDisplay();
    panel.classList.remove('expanded');
  });

  // Reset to default
  resetBtn.addEventListener('click', () => {
    qrCustomization = {
      backgroundColor: '#ffffff',
      backgroundOpacity: 100,
      qrStyle: 'squares',
      qrColor: '#000000',
      isGradient: false,
      gradientColor1: '#000000',
      gradientColor2: '#6366f1',
      gradientDirection: 'horizontal',
      spacing: 16
    };

    // Reset UI values
    bgColorPicker.value = '#ffffff';
    bgOpacitySlider.value = 100;
    bgOpacityValue.textContent = '100%';
    qrSpacingSlider.value = 16;
    qrSpacingValue.textContent = '16px';
    qrStyleSelect.value = 'squares';
    qrColorPicker.value = '#000000';
    gradientToggle.textContent = 'Gradient';
    gradientControls.style.display = 'none';
    gradientColor1.value = '#000000';
    gradientColor2.value = '#6366f1';
    gradientDirection.value = 'horizontal';

    updateQRDisplay();
  });

  // Toggle gradient
  gradientToggle.addEventListener('click', () => {
    if (gradientControls.style.display === 'none') {
      gradientControls.style.display = 'block';
      gradientToggle.textContent = 'Solid';
    } else {
      gradientControls.style.display = 'none';
      gradientToggle.textContent = 'Gradient';
    }
  });

  // Transparent background
  transparentBgBtn.addEventListener('click', () => {
    bgOpacitySlider.value = 0;
    bgOpacityValue.textContent = '0%';
  });

  // Update opacity value display
  bgOpacitySlider.addEventListener('input', () => {
    bgOpacityValue.textContent = bgOpacitySlider.value + '%';
  });

  // Update spacing value display
  qrSpacingSlider.addEventListener('input', () => {
    qrSpacingValue.textContent = qrSpacingSlider.value + 'px';
  });

  // Real-time preview (optional - can be removed for better performance)
  [bgColorPicker, bgOpacitySlider, qrSpacingSlider, qrStyleSelect, qrColorPicker, gradientColor1, gradientColor2, gradientDirection].forEach(element => {
    element.addEventListener('input', () => {
      // Debounced preview update
      clearTimeout(window.previewTimeout);
      window.previewTimeout = setTimeout(() => {
        qrCustomization.backgroundColor = bgColorPicker.value;
        qrCustomization.backgroundOpacity = parseInt(bgOpacitySlider.value);
        qrCustomization.spacing = parseInt(qrSpacingSlider.value);
        qrCustomization.qrStyle = qrStyleSelect.value;
        qrCustomization.qrColor = qrColorPicker.value;
        qrCustomization.isGradient = gradientControls.style.display === 'block';
        qrCustomization.gradientColor1 = gradientColor1.value;
        qrCustomization.gradientColor2 = gradientColor2.value;
        qrCustomization.gradientDirection = gradientDirection.value;
        updateQRDisplay();
      }, 300);
    });
  });
}

// Display admin statistics
async function displayAdminStatistics(users) {
  const totalClientUsers = users.length;
  const totalDataFiles = 3; // personal.json, clients.json, demo.json

  let totalLinks = 0;
  users.forEach(user => {
    const allPlatforms = [
      user.linkedin, user.xing, user.angellist, user.behance, user.dribbble, user.figma, user.portfolio,
      user.instagram, user.twitter, user.facebook, user.threads, user.mastodon, user.bluesky,
      user.youtube, user.tiktok, user.vimeo, user.twitch, user.spotify, user.soundcloud, user.applemusic, user.bandcamp,
      user.github, user.gitlab, user.bitbucket, user.stackoverflow, user.devto, user.codepen,
      user.whatsapp, user.telegram, user.discord, user.signal, user.skype, user.slack,
      user.steam, user.xbox, user.playstation, user.nintendo, user.patreon, user.kofi, user.buymeacoffee, user.substack,
      user.etsy, user.amazon, user.shopify, user.flipkart, user.flickr, user['500px'], user.unsplash,
      user.medium, user.wordpress, user.blogger, user.pinterest, user.reddit, user.snapchat, user.tumblr,
      user.bereal, user.clubhouse, user.nextdoor, user.strava, user.linktree, user.notion, user.calendly,
      user.paypal, user.gpay, user.phonepe, user.paytm, user.upi, user.cashapp, user.crunchbase,
      user.glassdoor, user.indeed, user.coursera, user.udemy, user.skillshare, user.khanacademy,
      user.email, user.phone, user.website, user.location, user.googleReview
    ];

    allPlatforms.forEach(link => {
      if (link && typeof link === 'string' && link.trim()) {
        if (link.includes(',')) {
          const items = link.split(',').map(item => item.trim()).filter(item => item);
          totalLinks += items.length;
        } else {
          totalLinks += 1;
        }
      }
    });
  });

  // Load login accounts count
  let totalLoginAccounts = 0;
  try {
    // Check for localStorage override first
    let credentials;
    const override = localStorage.getItem('adminCredentialsOverride');
    if (override) {
      credentials = JSON.parse(override);
    } else {
      const response = await fetch('./credentials/login_credentials.json');
      if (response.ok) {
        credentials = await response.json();
      }
    }

    if (credentials) {
      // Exclude main admin from count - only count regular users (including inactive)
      totalLoginAccounts = credentials.filter(cred => cred.role !== 'main_admin').length;
    }
  } catch (error) {
    console.error('Error loading credentials:', error);
  }

  document.getElementById('totalLoginAccounts').textContent = totalLoginAccounts;
  document.getElementById('totalDataFiles').textContent = totalDataFiles;
  document.getElementById('totalClientUsers').textContent = totalClientUsers;
  document.getElementById('totalLinksCount').textContent = totalLinks;
}

// Display login accounts table
async function displayLoginAccountsTable(accountsToShow = null) {
  const tbody = document.getElementById('adminAccountsTableBody');

  try {
    let allAccounts;

    if (accountsToShow) {
      // Use provided accounts (for search results)
      allAccounts = accountsToShow;
    } else {
      // Load accounts from file or localStorage
      let credentials;
      const override = localStorage.getItem('adminCredentialsOverride');
      if (override) {
        credentials = JSON.parse(override);
      } else {
        const response = await fetch('./credentials/login_credentials.json');
        if (!response.ok) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Error loading login accounts</td></tr>';
          return;
        }
        credentials = await response.json();
      }

      // Show all accounts regardless of isActive status
      allAccounts = credentials;

      // Store accounts globally for search functionality
      allAdminAccountsGlobal = allAccounts;
    }

    if (allAccounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No login accounts found</td></tr>';
      return;
    }

    tbody.innerHTML = "";

    // Count client users for each data file
    const clientUserCounts = await getClientUserCounts();

    allAccounts.forEach(account => {
      const clientUsersCount = account.role === 'main_admin' ? '-' : (clientUserCounts[account.dataFile] || 0);
      const roleDisplay = account.role === 'main_admin' ? 'Main Admin' : 'User';
      const statusClass = account.isActive ? 'active' : 'inactive';
      const statusText = account.isActive ? 'Active' : 'Inactive';
      const isMainAdmin = account.role === 'main_admin';

      const row = document.createElement('tr');
      if (isMainAdmin) {
        row.classList.add('main-admin-row');
      }
      row.innerHTML = `
        <td>
          <div class="username-cell">
            <div class="username">${account.username}</div>
            <div class="password ${isMainAdmin ? 'hidden admin-hidden' : (passwordsVisible ? 'visible' : 'hidden')}">${account.password}</div>
          </div>
        </td>
        <td>${account.description || 'No description'}</td>
        <td>${account.dataFile || '-'}</td>
        <td>${clientUsersCount}</td>
        <td>${roleDisplay}</td>
        <td>
          <div class="status-badge ${statusClass}">
            <span>${statusText}</span>
          </div>
        </td>
        <td>
          ${isMainAdmin ?
          '<span class="main-admin-badge">Always Active</span>' :
          `<label class="toggle-switch">
              <input type="checkbox" ${account.isActive ? 'checked' : ''} 
                     onchange="toggleAccountStatus('${account.username}', this.checked)">
              <span class="toggle-slider"></span>
            </label>`
        }
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading login accounts:', error);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Error loading login accounts</td></tr>';
  }
}

// Get client user counts for each data file
async function getClientUserCounts() {
  const counts = {};
  const dataFiles = ['personal.json', 'clients.json', 'demo.json'];

  for (const file of dataFiles) {
    try {
      const response = await fetch(`./data/${file}`);
      if (response.ok) {
        const users = await response.json();
        counts[file] = users.length;
      } else {
        counts[file] = 0;
      }
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
      counts[file] = 0;
    }
  }

  return counts;
}

// Toggle account status (admin only function)
async function toggleAccountStatus(username, isActive) {
  try {
    // Load current credentials
    const response = await fetch('./credentials/login_credentials.json');
    if (!response.ok) {
      alert('Error: Could not load account data');
      return;
    }

    const credentials = await response.json();

    // Find and update the account
    const accountIndex = credentials.findIndex(cred => cred.username === username);
    if (accountIndex === -1) {
      alert('Error: Account not found');
      return;
    }

    // Update the account status
    credentials[accountIndex].isActive = isActive;

    // Store the updated credentials in localStorage for this session
    localStorage.setItem('adminCredentialsOverride', JSON.stringify(credentials));

    // Show success message
    const statusText = isActive ? 'activated' : 'deactivated';
    alert(`Account "${username}" has been ${statusText}.\n\nChanges are applied for this session.`);

    // Refresh the table to show updated status
    displayLoginAccountsTable();

  } catch (error) {
    console.error('Error toggling account status:', error);
    alert('Error: Could not update account status');
  }
}

// Add Login Account Modal Functions
function showAddLoginModal() {
  const modal = document.getElementById('addLoginModal');
  if (modal) {
    modal.classList.remove('hidden');
    // Reset form
    document.getElementById('addLoginForm').reset();
    document.getElementById('credentialsDisplay').classList.add('hidden');
    document.getElementById('addLoginForm').classList.remove('hidden');
    // Focus on username field
    setTimeout(() => {
      const usernameField = document.getElementById('newUsername');
      if (usernameField) usernameField.focus();
    }, 100);
  }
}

function closeAddLoginModal() {
  const modal = document.getElementById('addLoginModal');
  if (modal) {
    modal.classList.add('hidden');
    // Clear any validation errors
    clearAllFieldErrors();
  }
}

async function handleAddLoginForm(e) {
  e.preventDefault();

  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value;
  const dataFile = document.getElementById('newDataFile').value.trim();
  const description = document.getElementById('newDescription').value.trim();

  // Validate inputs
  if (!username || !password || !dataFile) {
    alert('Please fill in all required fields');
    return;
  }

  if (password.length < 8) {
    alert('Password must be at least 8 characters long');
    return;
  }

  // Process data file name
  let processedDataFile = dataFile;
  if (!processedDataFile.endsWith('.json')) {
    processedDataFile += '.json';
  }

  // Check username and data file uniqueness
  try {
    const response = await fetch('./credentials/login_credentials.json');
    if (response.ok) {
      const credentials = await response.json();

      // Check username uniqueness
      const existingUser = credentials.find(cred => cred.username.toLowerCase() === username.toLowerCase());
      if (existingUser) {
        alert('Username already exists. Please choose a different username.');
        return;
      }

      // Check data file uniqueness
      const existingDataFile = credentials.find(cred =>
        cred.dataFile && cred.dataFile.toLowerCase() === processedDataFile.toLowerCase()
      );
      if (existingDataFile) {
        alert('Data file name already exists. Please choose a different data file name.');
        return;
      }
    }
  } catch (error) {
    console.error('Error checking uniqueness:', error);
  }

  // Show credentials display
  showCredentialsDisplay(username, password, processedDataFile, 'user', description);
}

function showCredentialsDisplay(username, password, dataFile, role, userDescription) {
  // Hide form and show credentials
  document.getElementById('addLoginForm').classList.add('hidden');
  document.getElementById('credentialsDisplay').classList.remove('hidden');

  // Generate JSON format
  const jsonData = {
    username: username,
    password: password,
    role: role,
    createdAt: new Date().toISOString().split('T')[0],
    isActive: true,
    dataFile: dataFile,
    description: userDescription || `User account for ${dataFile}`
  };

  // Format JSON with proper indentation
  const jsonString = JSON.stringify(jsonData, null, 4);
  document.getElementById('jsonCredentials').textContent = jsonString;
}

function copyJsonCredentials() {
  const jsonElement = document.getElementById('jsonCredentials');
  const jsonText = jsonElement.textContent;

  navigator.clipboard.writeText(jsonText).then(function () {
    // Show temporary feedback
    const button = document.querySelector('.copy-all-btn');
    const originalText = button.textContent;
    button.textContent = '✅ Copied!';
    button.style.background = 'var(--success)';

    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 2000);
  }).catch(function (err) {
    console.error('Could not copy text: ', err);
    alert('Failed to copy to clipboard');
  });
}

// Validation functions
async function validateUsername() {
  const username = document.getElementById('newUsername').value.trim();
  const field = document.getElementById('newUsername');

  if (username.length === 0) {
    clearFieldError(field);
    return;
  }

  try {
    const response = await fetch('./credentials/login_credentials.json');
    if (response.ok) {
      const credentials = await response.json();
      const existingUser = credentials.find(cred => cred.username.toLowerCase() === username.toLowerCase());

      if (existingUser) {
        showFieldError(field, 'Username already exists');
      } else {
        showFieldSuccess(field, 'Username available');
      }
    }
  } catch (error) {
    console.error('Error validating username:', error);
  }
}

function validatePassword() {
  const password = document.getElementById('newPassword').value;
  const field = document.getElementById('newPassword');

  if (password.length === 0) {
    clearFieldError(field);
    return;
  }

  if (password.length < 8) {
    showFieldError(field, 'Password must be at least 8 characters');
  } else {
    showFieldSuccess(field, 'Password is valid');
  }
}

async function validateDataFile() {
  const dataFile = document.getElementById('newDataFile').value.trim();
  const field = document.getElementById('newDataFile');

  if (dataFile.length === 0) {
    clearFieldError(field);
    return;
  }

  // Basic validation for data file name
  if (!/^[a-zA-Z0-9_-]+$/.test(dataFile)) {
    showFieldError(field, 'Data file name can only contain letters, numbers, hyphens, and underscores');
    return;
  }

  // Check data file uniqueness
  try {
    const response = await fetch('./credentials/login_credentials.json');
    if (response.ok) {
      const credentials = await response.json();
      const processedDataFile = dataFile.endsWith('.json') ? dataFile : dataFile + '.json';
      const existingDataFile = credentials.find(cred =>
        cred.dataFile && cred.dataFile.toLowerCase() === processedDataFile.toLowerCase()
      );

      if (existingDataFile) {
        showFieldError(field, 'Data file name already exists');
      } else {
        showFieldSuccess(field, 'Data file name is available');
      }
    }
  } catch (error) {
    console.error('Error validating data file:', error);
    showFieldSuccess(field, 'Data file name is valid');
  }
}

function showFieldError(field, message) {
  clearFieldError(field);
  field.classList.add('error');

  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error';
  errorDiv.textContent = message;
  field.parentNode.appendChild(errorDiv);
}

function showFieldSuccess(field, message) {
  clearFieldError(field);
  field.classList.add('success');

  const successDiv = document.createElement('div');
  successDiv.className = 'field-success';
  successDiv.textContent = message;
  field.parentNode.appendChild(successDiv);
}

function clearFieldError(field) {
  field.classList.remove('error', 'success');

  const existingError = field.parentNode.querySelector('.field-error');
  const existingSuccess = field.parentNode.querySelector('.field-success');

  if (existingError) existingError.remove();
  if (existingSuccess) existingSuccess.remove();
}

function clearAllFieldErrors() {
  const fields = ['newUsername', 'newPassword', 'newDataFile'];
  fields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      clearFieldError(field);
    }
  });
}

// Event listeners for search functionality
document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchUsers(e.target.value);
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const searchTerm = searchInput ? searchInput.value : '';
      searchUsers(searchTerm);
    });
  }

  // Admin search functionality
  const adminSearchInput = document.getElementById('adminSearchInput');
  const adminSearchBtn = document.getElementById('adminSearchBtn');

  if (adminSearchInput) {
    adminSearchInput.addEventListener('input', (e) => {
      searchAdminAccounts(e.target.value);
    });
  }

  if (adminSearchBtn) {
    adminSearchBtn.addEventListener('click', () => {
      const searchTerm = adminSearchInput ? adminSearchInput.value : '';
      searchAdminAccounts(searchTerm);
    });
  }

  // Add Login Account functionality
  const addLoginBtn = document.getElementById('addLoginBtn');
  if (addLoginBtn) {
    addLoginBtn.addEventListener('click', showAddLoginModal);
  }

  const addLoginForm = document.getElementById('addLoginForm');
  if (addLoginForm) {
    addLoginForm.addEventListener('submit', handleAddLoginForm);
  }

  // Real-time validation
  const newUsername = document.getElementById('newUsername');
  const newPassword = document.getElementById('newPassword');
  const newDataFile = document.getElementById('newDataFile');

  if (newUsername) {
    newUsername.addEventListener('input', validateUsername);
  }

  if (newPassword) {
    newPassword.addEventListener('input', validatePassword);
  }

  if (newDataFile) {
    newDataFile.addEventListener('input', validateDataFile);
  }

  // Password toggle functionality
  const passwordToggleBtn = document.getElementById('passwordToggleBtn');
  if (passwordToggleBtn) {
    passwordToggleBtn.addEventListener('click', togglePasswordVisibility);
  }
});

// Check authentication on page load
if (!checkAdminAuth()) {
  // Stop execution if not authenticated
  document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Inter, sans-serif;"><p>Redirecting to login...</p></div>';
} else {
  // Load users only if authenticated
  loadUsers();
  // Setup customization panel after DOM is loaded
  document.addEventListener('DOMContentLoaded', setupCustomizationPanel);
}
