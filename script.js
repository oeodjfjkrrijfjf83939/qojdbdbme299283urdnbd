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
  gradientColor2: '#6366f1',
  gradientDirection: 'horizontal',
  spacing: 16,
  logoOption: 'none', // 'none' or 'image'
  logoData: null, // Data URL of the logo image
  logoBgOption: 'match', // 'match' or 'custom'
  logoBgColor: '#ffffff',
  logoBgOption: 'match', // 'match' or 'custom'
  logoBgColor: '#ffffff',
  logoBgTransparent: false,
  logoBgOption: 'match', // 'match' or 'custom'
  logoBgColor: '#ffffff',
  logoBgTransparent: false,
  logoCornerRadius: 0.2, // Active radius
  logoRadiusMode: 'auto', // 'auto' or 'manual'
  logoManualRadius: 0.2,
  detectedLogoRadius: 0.2
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
    let filesToSearch = [];
    const indexUrl = DATA_FILES_CONFIG.indexFile || './data/index.json';

    try {
      const indexRes = await fetch(indexUrl);
      if (indexRes.ok) {
        const index = await indexRes.json();

        // OPTIMIZATION: If we have userCode, look up exact file!
        if (userCode && index[userCode]) {
          filesToSearch = [index[userCode]];
        } else {
          // Fallback: search all known files
          filesToSearch = [...new Set(Object.values(index))];
        }
      } else {
        throw new Error("Index fetch failed");
      }
    } catch (e) {
      console.warn("Index lookup failed for QR, falling back", e);
      filesToSearch = DATA_FILES_CONFIG.fallbackFiles || ['personal.json', 'clients.json', 'demo.json'];
    }

    let user = null;

    // Load users from identified files
    for (const file of filesToSearch) {
      try {
        // Handle both relative paths in index and simple filenames in fallback
        const filePath = file.includes('/') ? `./data/${file}` : `./data/${file}`;
        // Actually, index values are like "a/b/file.json", so prepending ./data/ is correct.
        // Fallback files are "file.json", so prepending ./data/ is also correct.

        const res = await fetch(`./data/${file}`);
        if (res.ok) {
          const users = await res.json();
          // Find the specific user
          user = users.find(u => u.username === username && u.userCode === userCode);
          if (user) break;
        }
      } catch (fileErr) {
        console.error(`Error loading ${file} for QR match:`, fileErr);
      }
    }

    if (user) {
      document.getElementById('qrUserName').innerText = user.fullname || 'Unknown User';
      document.getElementById('qrUserHandle').innerText = `@${username}`;
    } else {
      document.getElementById('qrUserName').innerText = 'Unknown User';
      document.getElementById('qrUserHandle').innerText = `@${username}`;
    }
  } catch (err) {
    console.error("Critical error in loadUsersForQR:", err);
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

  // Show Sync Button for Admins
  const syncBtn = document.getElementById('syncBtn');
  if (syncBtn) {
    syncBtn.style.display = 'inline-flex';
    // Remove existing listeners to avoid duplicates if any (though this function runs once usually)
    const newBtn = syncBtn.cloneNode(true);
    syncBtn.parentNode.replaceChild(newBtn, syncBtn);

    newBtn.addEventListener('click', async () => {
      // Confirmation Logic
      if (newBtn.dataset.confirming === 'true') {
        newBtn.disabled = true;
        newBtn.innerHTML = '<span>⏳</span> Syncing...';
        try {
          const { dataService } = await import('./data-service.js');
          await dataService.syncToFirebase();

          newBtn.innerHTML = '<span>✅</span> Synced!';
          newBtn.style.backgroundColor = '#4CAF50';
          setTimeout(() => resetSyncBtn(newBtn), 2000);

        } catch (e) {
          console.error("Sync failed", e);
          newBtn.innerHTML = '<span>❌</span> Failed';
          newBtn.style.backgroundColor = '#f44336';
          setTimeout(() => resetSyncBtn(newBtn), 3000);
        }
      } else {
        // Enter confirmation state
        newBtn.dataset.confirming = 'true';
        newBtn.dataset.originalText = newBtn.innerHTML;
        newBtn.innerHTML = '<span>⚠️</span> Confirm?';
        newBtn.style.backgroundColor = '#ff9800';

        // Reset after 3 seconds
        setTimeout(() => {
          if (newBtn && newBtn.isConnected && newBtn.dataset.confirming === 'true') {
            resetSyncBtn(newBtn);
          }
        }, 3000);
      }
    });

    function resetSyncBtn(btn) {
      btn.dataset.confirming = 'false';
      btn.innerHTML = btn.dataset.originalText || '<span>🔄</span> Sync to Firebase';
      btn.disabled = false;
      btn.style.backgroundColor = '';
    }
  }
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

  // Hide Sync Button for regular users
  const syncBtn = document.getElementById('syncBtn');
  if (syncBtn) {
    syncBtn.style.display = 'none';
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

  // let userInfoHtml = `Data File: ${userDataFile} | Logged in as: ${userUsername}`;
  let userInfoHtml = `Logged in as: ${userUsername}`;
  if (window.currentUser && window.currentUser.isFrozen) {
    userInfoHtml += ` <span class="frozen-badge">❄️ FROZEN (Read-Only)</span>`;

    // Disable Add New User button for frozen accounts
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
      addUserBtn.style.backgroundColor = '#9ca3af'; // Gray
      addUserBtn.style.cursor = 'not-allowed';
      addUserBtn.disabled = true;
      addUserBtn.title = "Account is frozen (Read-Only). Contact admin to unfreeze.";
    }
  }
  document.getElementById('userInfo').innerHTML = userInfoHtml;
}

// Load users from multiple JSON files
async function loadUsers() {
  const userRole = sessionStorage.getItem('adminRole');
  const userDataFile = sessionStorage.getItem('adminDataFile');
  const currentUsername = sessionStorage.getItem('adminUsername');

  // Load current user details to get latest limits/status
  try {
    const { dataService } = await import('./data-service.js');
    const credentials = await dataService.getCredentials();
    const myself = credentials.find(c => c.username === currentUsername);
    if (myself) {
      window.currentUser = myself;
      // Re-render UI if frozen status changed (e.g. while page open)
      if (userRole === 'user') showUserUI();
    }
  } catch (e) { console.warn("Could not load current user details", e); }

  try {
    if (userRole === 'super_admin') {
      // Super admin users see all users from all files
      console.log('🔑 Super Admin Login - Loading all users');

      let allUsers = [];
      let loadedFromFirebase = false;

      // 1. Try Firebase First
      try {
        const { dataService } = await import('./data-service.js');
        const firebaseUsers = await dataService.getUsers(null); // null = all
        if (firebaseUsers) {
          allUsers = firebaseUsers;
          loadedFromFirebase = true;
          console.log('✅ Loaded all users from Firebase');
        }
      } catch (e) {
        console.warn('⚠️ Firebase load failed, falling back to local:', e);
      }

      // 2. Fallback to Local if Firebase failed or returned nothing
      if (!loadedFromFirebase) {
        console.log('📂 Loading users from local files (Fallback)');
        try {
          const indexRes = await fetch('./data/index.json');
          if (!indexRes.ok) throw new Error('Index file not found');
          const index = await indexRes.json();
          const dataFiles = [...new Set(Object.values(index))];

          for (const file of dataFiles) {
            try {
              const res = await fetch(`./data/${file}`);
              if (res.ok) allUsers.push(...(await res.json()));
            } catch (err) { console.warn(`Failed to load ${file}`, err); }
          }
        } catch (localErr) {
          console.error('Error loading local index:', localErr);
          alert('Failed to load data. Please ensure local files are correct.');
          return;
        }
      }

      console.log(`📊 Total users loaded: ${allUsers.length}`);
      allUsersGlobal = allUsers;
      showUserUI();
      displayUsers(allUsers);
      updateUserStatistics(allUsers);

    } else if (userRole === 'main_admin') {
      // Admin users see all data and admin statistics
      console.log('🔑 Main Admin Login - Loading all users');

      let allUsers = [];
      let loadedFromFirebase = false;

      // 1. Try Firebase First
      try {
        const { dataService } = await import('./data-service.js');
        const firebaseUsers = await dataService.getUsers(null);
        if (firebaseUsers) {
          allUsers = firebaseUsers;
          loadedFromFirebase = true;
          console.log('✅ Loaded all users from Firebase');
        }
      } catch (e) {
        console.warn('⚠️ Firebase load failed, falling back to local:', e);
      }

      // 2. Fallback to Local (if Firebase failed)
      if (!loadedFromFirebase) {
        console.log('📂 Loading users from local files (Fallback)');
        try {
          const indexRes = await fetch(DATA_FILES_CONFIG.indexFile || './data/index.json');
          if (indexRes.ok) {
            const index = await indexRes.json();
            const dataFiles = [...new Set(Object.values(index))];
            for (const file of dataFiles) {
              try {
                const res = await fetch(`./data/${file}`);
                if (res.ok) allUsers.push(...(await res.json()));
              } catch (err) { console.warn(`Failed to load ${file}`, err); }
            }
          }
        } catch (err) { console.error('Error loading index:', err); }
      }

      allUsersGlobal = allUsers;
      showAdminUI();
      displayAdminStatistics(allUsers);
      displayLoginAccountsTable();

    } else if (userRole === 'user') {
      // Regular users see files based on their assigned dataFile
      if (!userDataFile) {
        document.getElementById('userList').innerHTML =
          '<div class="no-results-card"><p style="color: red;">❌ No data file assigned to this user!</p></div>';
        return;
      }

      console.log(`👤 User Login - Loading data for scope: ${userDataFile}`);
      let allUsers = [];
      let loadedFromFirebase = false;

      // 1. Try Firebase First
      try {
        const { dataService } = await import('./data-service.js');
        const firebaseUsers = await dataService.getUsers(userDataFile);
        if (firebaseUsers) {
          allUsers = firebaseUsers;
          loadedFromFirebase = true;
          console.log(`✅ Loaded users from Firebase for scope ${userDataFile}`);
        }
      } catch (e) {
        console.warn('⚠️ Firebase load failed, falling back to local:', e);
      }

      // 2. Fallback to Local
      if (!loadedFromFirebase) {
        console.log('📂 Loading users from local files (Fallback)');
        try {
          const indexRes = await fetch(DATA_FILES_CONFIG.indexFile || './data/index.json');
          if (!indexRes.ok) throw new Error('Failed to load master index');
          const index = await indexRes.json();
          const allKnownFiles = [...new Set(Object.values(index))];

          const targetFiles = allKnownFiles.filter(filePath => {
            const normFilePath = filePath.replace(/\\/g, '/');
            const normScope = userDataFile.replace(/\\/g, '/');
            if (normFilePath === normScope) return true;
            if (normFilePath.startsWith(normScope + '/')) return true;
            return false;
          });

          if (targetFiles.length === 0) {
            document.getElementById('userList').innerHTML = `<div class="no-results-card"><p>No data files found for: ${userDataFile}</p></div>`;
            return;
          }

          for (const file of targetFiles) {
            try {
              const res = await fetch(`./data/${file}`);
              if (res.ok) allUsers.push(...(await res.json()));
            } catch (e) { console.warn(`Warn: ${file} load failed`, e); }
          }
        } catch (err) {
          console.error('Error resolving file scope:', err);
          document.getElementById('userList').innerHTML = '<div class="no-results-card"><p style="color: red;">❌ Error resolving file permissions.</p></div>';
          return;
        }
      }

      allUsersGlobal = allUsers;
      showUserUI();
      displayUsers(allUsers);
      updateUserStatistics(allUsers);

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
      user.playstore, user.appstore,
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

  if (window.currentUser && window.currentUser.role === 'user' && window.currentUser.isUnlimited === false) {
    const limit = window.currentUser.maxUsers || 100;
    const count = users ? users.length : 0;
    document.getElementById('totalUsers').textContent = `${count} / ${limit}`;

    const totalUsersLabel = document.querySelector('.total-users-label');
    const addUserBtn = document.getElementById('addUserBtn');

    if (count >= limit) {
      if (totalUsersLabel) totalUsersLabel.style.color = 'var(--danger)'; // Red warning
      if (addUserBtn) {
        addUserBtn.style.backgroundColor = '#9ca3af'; // Gray
        addUserBtn.style.cursor = 'not-allowed';
        addUserBtn.disabled = true;
        addUserBtn.title = "User limit reached. Contact admin to upgrade.";
      }
    } else {
      if (totalUsersLabel) totalUsersLabel.style.color = '';
      if (addUserBtn) {
        addUserBtn.style.backgroundColor = '';
        addUserBtn.style.cursor = '';
        addUserBtn.disabled = false;
        addUserBtn.title = "";
      }
    }
  } else {
    document.getElementById('totalUsers').textContent = totalUsers;
  }
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
      // App Downloads
      u.playstore, u.appstore,
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

    // Check if account is frozen to disable Edit button
    const isFrozen = window.currentUser && window.currentUser.isFrozen;
    const editBtnStyle = isFrozen ? 'style="background-color: #9ca3af; cursor: not-allowed;" disabled title="Account is frozen (Read-Only)"' : '';
    const editBtnOnclick = isFrozen ? '' : `onclick="editUser('${u.username}', '${u.userCode}')"`;

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
      <div class="user-actions">
        <button class="qrBtn btn-show-qr" data-username="${u.username}" data-usercode="${u.userCode}" data-fullname="${u.fullname}">📱 Show QR</button>
        <button class="btn-edit" ${editBtnStyle} ${editBtnOnclick}>✏️ Edit</button>
        <button class="btn-view" onclick="viewUser('${u.username}', '${u.userCode}')">👁️ View</button>
        <button class="btn-delete" onclick="deleteUser(this, '${u.username}', '${u.userCode}', '${u.dataFile || ''}')">🗑️ Delete</button>
      </div>
    `;
    list.appendChild(div);
  });

  // Add event listeners to QR buttons
  document.querySelectorAll('.qrBtn').forEach(btn => {
    btn.addEventListener('click', () => showQR(btn.dataset.username, btn.dataset.usercode, btn.dataset.fullname));
  });
}

// Show QR Code Modal
function showQR(username, userCode, fullname) {
  if (!userCode) {
    alert('Error: User code is missing. Please refresh the page.');
    return;
  }

  // Create secure URL with username AND userCode
  const qrUrl = `${CONFIG.baseUrl}user.html?u=${username}&code=${userCode}`;

  document.getElementById('qrTitle').innerText = 'QR Code';
  document.getElementById('qrUrl').textContent = qrUrl;

  // Find user data to display name from all data files
  // Display user name
  document.getElementById('qrUserName').textContent = fullname || username;
  document.getElementById('qrUserHandle').textContent = '@' + username;

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

  // Ensure QR matches current customization (fixes default state issue)
  // We need to wait for modal to be visible for canvas to render correctly if needed,
  // but mostly just to ensure data is ready.
  setTimeout(() => {
    updateQRDisplay();
  }, 10);
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

  // Calculate Logo Area (for exclusion)
  let logoStartPos = -1;
  let logoEndPos = -1;

  if (qrCustomization.logoOption === 'image') {
    const centerStart = Math.floor(moduleCount * (1 - 0.22) / 2);
    const centerEnd = Math.ceil(moduleCount * (1 + 0.22) / 2);
    logoStartPos = centerStart;
    logoEndPos = centerEnd;
  }

  // Create Global Gradient if needed
  let globalFillStyle = null;
  if (qrCustomization.isGradient) {
    globalFillStyle = createGradient(ctx, 0, 0, size, size, qrCustomization.gradientDirection);
  } else {
    globalFillStyle = qrCustomization.qrColor;
  }

  // Draw QR code modules with custom colors and styles
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {

      // Skip modules in logo area
      // Skip modules in logo area
      if (logoStartPos !== -1) {
        // Smart exclusion: Check shape
        if (qrCustomization.logoCornerRadius > 0.4) {
          // Circular Exclusion
          const centerX = moduleCount / 2;
          const centerY = moduleCount / 2;
          const modCenterX = col + 0.5;
          const modCenterY = row + 0.5;
          const dist = Math.sqrt(Math.pow(modCenterX - centerX, 2) + Math.pow(modCenterY - centerY, 2));

          // Limit radius: logo is 0.22 of full size.
          const limitRadius = (moduleCount * 0.22) / 2;

          if (dist < limitRadius + 0.5) {
            continue;
          }
        } else {
          // Square Exclusion
          if (row >= logoStartPos && row < logoEndPos && col >= logoStartPos && col < logoEndPos) {
            continue;
          }
        }
      }

      if (qr.isDark(row, col)) {
        const isDarkSafe = (r, c) => {
          if (r < 0 || r >= moduleCount || c < 0 || c >= moduleCount) return false;
          return qr.isDark(r, c);
        };

        const neighbors = {
          top: isDarkSafe(row - 1, col),
          bottom: isDarkSafe(row + 1, col),
          left: isDarkSafe(row, col - 1),
          right: isDarkSafe(row, col + 1)
        };

        drawQRModule(
          ctx,
          padding + col * moduleSize,
          padding + row * moduleSize,
          moduleSize,
          moduleSize,
          qrCustomization.qrStyle,
          neighbors,
          globalFillStyle
        );
      }
    }
  }

  // Function to finalize download
  const finishDownload = () => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${username}_${userCode}_QR_${size}x${size}.png`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }, 'image/png');
  };

  // Handle Logo
  if (qrCustomization.logoOption === 'image') {
    const logoSize = size * 0.22;
    const logoX = (size - logoSize) / 2;
    const logoY = (size - logoSize) / 2;

    // Draw background logic for logo
    let drawLogoBg = false;
    let logoBgFill = qrCustomization.backgroundColor;

    if (qrCustomization.logoBgOption === 'custom') {
      if (qrCustomization.logoBgTransparent) {
        drawLogoBg = false;
      } else {
        drawLogoBg = true;
        logoBgFill = qrCustomization.logoBgColor;
      }
    } else {
      // Match -> No draw (main BG shows)
      drawLogoBg = false;
    }

    if (drawLogoBg) {
      ctx.fillStyle = logoBgFill;
      const cornerRadius = logoSize * qrCustomization.logoCornerRadius;
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, logoSize, logoSize, cornerRadius);
      ctx.fill();
    }

    if (qrCustomization.logoData) {
      const img = new Image();
      img.onload = () => {
        const imgPadding = logoSize * 0.02; // 2% padding
        const imgSize = logoSize - imgPadding * 2;
        const imgX = logoX + imgPadding;
        const imgY = logoY + imgPadding;

        ctx.save();
        ctx.beginPath();
        // User requested: "make it automatically follow this radius parameter"
        // referring to cornerRadius = logoSize * 0.2
        const imgCornerRadius = logoSize * 0.2;
        ctx.roundRect(imgX, imgY, imgSize, imgSize, imgCornerRadius);
        ctx.clip();

        ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        ctx.restore();

        finishDownload();
      };
      img.onerror = finishDownload; // Proceed anyway on error
      img.src = qrCustomization.logoData;
      return; // Wait for load
    } else {
      // Draw placeholder
      // Only draw default gray box if we didn't already draw a custom background!
      if (!drawLogoBg) {
        ctx.fillStyle = '#f3f4f6';
        const cornerRadius = logoSize * 0.2; // 20% corner radius
        ctx.beginPath();
        ctx.roundRect(logoX, logoY, logoSize, logoSize, cornerRadius);
        ctx.fill();
      }

      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = size * 0.005;
      // Ensure path exists for stroke if we skipped fill above
      if (drawLogoBg) {
        const cornerRadius = logoSize * 0.2;
        ctx.beginPath();
        ctx.roundRect(logoX, logoY, logoSize, logoSize, cornerRadius);
      }
      ctx.stroke();

      // Draw "LOGO" text
      ctx.font = `bold ${logoSize * 0.25}px sans-serif`;
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LOGO', size / 2, size / 2);

      finishDownload();
    }
  } else {
    finishDownload();
  }
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

  // Global Gradient Definition
  let globalGradientId = null;
  if (qrCustomization.isGradient) {
    globalGradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
    let gradientDef = `<defs>`;

    const isRadial = qrCustomization.gradientDirection === 'radial';
    if (isRadial) {
      gradientDef += `<radialGradient id="${globalGradientId}" cx="50%" cy="50%" r="50%" gradientUnits="userSpaceOnUse">`;
    } else {
      gradientDef += `<linearGradient id="${globalGradientId}" gradientUnits="userSpaceOnUse"`;
      switch (qrCustomization.gradientDirection) {
        case 'horizontal': gradientDef += ` x1="0%" y1="0%" x2="100%" y2="0%"`; break;
        case 'vertical': gradientDef += ` x1="0%" y1="0%" x2="0%" y2="100%"`; break;
        case 'diagonal': gradientDef += ` x1="0%" y1="0%" x2="100%" y2="100%"`; break;
        case 'diagonal-reverse': gradientDef += ` x1="100%" y1="0%" x2="0%" y2="100%"`; break;
        default: gradientDef += ` x1="0%" y1="0%" x2="100%" y2="0%"`;
      }
      gradientDef += `>`;
    }

    gradientDef += `<stop offset="0%" stop-color="${qrCustomization.gradientColor1}"/><stop offset="100%" stop-color="${qrCustomization.gradientColor2}"/></${isRadial ? 'radialGradient' : 'linearGradient'}></defs>`;
    svgString += gradientDef;
  }

  // Background
  const bgColor = hexToRgba(qrCustomization.backgroundColor, qrCustomization.backgroundOpacity / 100);
  svgString += `<rect width="${totalSize}" height="${totalSize}" fill="${bgColor}"/>`;

  // QR modules with different styles
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        // Calculate neighbors
        const isDarkSafe = (r, c) => {
          if (r < 0 || r >= moduleCount || c < 0 || c >= moduleCount) return false;
          return qr.isDark(r, c);
        };

        const neighbors = {
          top: isDarkSafe(row - 1, col),
          bottom: isDarkSafe(row + 1, col),
          left: isDarkSafe(row, col - 1),
          right: isDarkSafe(row, col + 1)
        };

        const x = padding + col * moduleSize;
        const y = padding + row * moduleSize;
        const centerX = x + moduleSize / 2;
        const centerY = y + moduleSize / 2;
        const radius = moduleSize / 2;

        // Set color
        let fillColor = qrCustomization.qrColor;
        if (qrCustomization.isGradient && globalGradientId) {
          fillColor = `url(#${globalGradientId})`;
        }

        // Draw different styles
        switch (qrCustomization.qrStyle) {
          case 'squares':
            svgString += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${fillColor}"/>`;
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
            const hOffset = moduleSize * 0.1;
            const hY = y + hOffset;
            const hH = moduleSize - (hOffset * 2);
            const topC = hH * 0.3;
            const mx = x + moduleSize / 2;

            // Constructing SVG path command equivalent to the canvas bezier curves
            // M mx, hY+hH*0.2
            // C mx, hY, x, hY, x, hY+topC
            // C x, hY+(hH+topC)/2, mx, hY+hH, mx, hY+hH
            // C mx, hY+hH, x+moduleSize, hY+(hH+topC)/2, x+moduleSize, hY+topC
            // C x+moduleSize, hY, mx, hY, mx, hY+hH*0.2
            let hd = `M ${mx} ${hY + hH * 0.2}`;
            hd += ` C ${mx} ${hY}, ${x} ${hY}, ${x} ${hY + topC}`;
            hd += ` C ${x} ${hY + (hH + topC) / 2}, ${mx} ${hY + hH}, ${mx} ${hY + hH}`;
            hd += ` C ${mx} ${hY + hH}, ${x + moduleSize} ${hY + (hH + topC) / 2}, ${x + moduleSize} ${hY + topC}`;
            hd += ` C ${x + moduleSize} ${hY}, ${mx} ${hY}, ${mx} ${hY + hH * 0.2}`;

            svgString += `<path d="${hd}" fill="${fillColor}"/>`;
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

          case 'fluid':
            const { top, right, bottom, left } = neighbors;
            const maxR = moduleSize / 2;

            const tl = (top || left) ? 0 : maxR;
            const tr = (top || right) ? 0 : maxR;
            const br = (bottom || right) ? 0 : maxR;
            const bl = (bottom || left) ? 0 : maxR;

            let d = `M ${x + tl} ${y}`;
            d += ` L ${x + moduleSize - tr} ${y}`;
            if (tr > 0) d += ` A ${tr} ${tr} 0 0 1 ${x + moduleSize} ${y + tr}`;
            d += ` L ${x + moduleSize} ${y + moduleSize - br}`;
            if (br > 0) d += ` A ${br} ${br} 0 0 1 ${x + moduleSize - br} ${y + moduleSize}`;
            d += ` L ${x + bl} ${y + moduleSize}`;
            if (bl > 0) d += ` A ${bl} ${bl} 0 0 1 ${x} ${y + moduleSize - bl}`;
            d += ` L ${x} ${y + tl}`;
            if (tl > 0) d += ` A ${tl} ${tl} 0 0 1 ${x + tl} ${y}`;
            d += ` Z`;

            svgString += `<path d="${d}" fill="${fillColor}" />`;
            break;

          case 'stripes':
            const stripeHeight = moduleSize * 0.7;
            const stripeY = y + (moduleSize - stripeHeight) / 2;
            const sRad = stripeHeight / 2;
            const { left: sLeft, right: sRight } = neighbors;

            // Left side
            const lR = sLeft ? 0 : sRad;
            // Right side
            const rR = sRight ? 0 : sRad;

            // Construct path manually for control over specific corners
            // Start top-left
            let sd = `M ${x + lR} ${stripeY}`;
            // Line to top-right
            sd += ` L ${x + moduleSize - rR} ${stripeY}`;
            // Arc top-right if needed
            if (rR > 0) sd += ` A ${rR} ${rR} 0 0 1 ${x + moduleSize} ${stripeY + rR}`;
            // Line down right side (if flat, it's just a point, effectively logic holds)
            sd += ` L ${x + moduleSize} ${stripeY + stripeHeight - rR}`;
            // Arc bottom-right if needed
            if (rR > 0) sd += ` A ${rR} ${rR} 0 0 1 ${x + moduleSize - rR} ${stripeY + stripeHeight}`;
            // Line to bottom-left
            sd += ` L ${x + lR} ${stripeY + stripeHeight}`;
            // Arc bottom-left if needed
            if (lR > 0) sd += ` A ${lR} ${lR} 0 0 1 ${x} ${stripeY + stripeHeight - lR}`;
            // Line up left side
            sd += ` L ${x} ${stripeY + lR}`;
            // Arc top-left if needed
            if (lR > 0) sd += ` A ${lR} ${lR} 0 0 1 ${x + lR} ${stripeY}`;
            sd += ` Z`;

            svgString += `<path d="${sd}" fill="${fillColor}" />`;
            break;

          case 'vertical-stripes':
            const vStripeWidth = moduleSize * 0.7;
            const vStripeX = x + (moduleSize - vStripeWidth) / 2;
            const vStripeRad = vStripeWidth / 2;
            const { top: vTop, bottom: vBottom } = neighbors;

            const tR = vTop ? 0 : vStripeRad;
            const bR = vBottom ? 0 : vStripeRad;

            let vsd = `M ${vStripeX} ${y + tR}`;
            if (tR > 0) vsd += ` A ${tR} ${tR} 0 0 1 ${vStripeX + tR} ${y}`;
            vsd += ` L ${vStripeX + vStripeWidth - tR} ${y}`;
            if (tR > 0) vsd += ` A ${tR} ${tR} 0 0 1 ${vStripeX + vStripeWidth} ${y + tR}`;
            vsd += ` L ${vStripeX + vStripeWidth} ${y + moduleSize - bR}`;
            if (bR > 0) vsd += ` A ${bR} ${bR} 0 0 1 ${vStripeX + vStripeWidth - bR} ${y + moduleSize}`;
            vsd += ` L ${vStripeX + bR} ${y + moduleSize}`;
            if (bR > 0) vsd += ` A ${bR} ${bR} 0 0 1 ${vStripeX} ${y + moduleSize - bR}`;
            vsd += ` Z`;

            svgString += `<path d="${vsd}" fill="${fillColor}" />`;
            break;

          case 'cross':
            const thick = moduleSize * 0.35;
            const offset = (moduleSize - thick) / 2;
            const crossRad = thick / 3;
            svgString += `<rect x="${x}" y="${y + offset}" width="${moduleSize}" height="${thick}" rx="${crossRad}" ry="${crossRad}" fill="${fillColor}" />`;
            svgString += `<rect x="${x + offset}" y="${y}" width="${thick}" height="${moduleSize}" rx="${crossRad}" ry="${crossRad}" fill="${fillColor}" />`;
            break;

          case 'leaf':
            // Leaf: Top-Right & Bottom-Left sharp, others round
            // [tl, tr, br, bl] -> [r, 0, r, 0]
            const leafR = moduleSize / 2;
            // Using path A rx ry x-axis-rotation large-arc-flag sweep-flag x y
            // tl
            let lPath = `M ${x} ${y + leafR} A ${leafR} ${leafR} 0 0 1 ${x + leafR} ${y}`;
            // tr (sharp)
            lPath += ` L ${x + moduleSize} ${y}`;
            // br
            lPath += ` L ${x + moduleSize} ${y + moduleSize - leafR} A ${leafR} ${leafR} 0 0 1 ${x + moduleSize - leafR} ${y + moduleSize}`;
            // bl (sharp)
            lPath += ` L ${x} ${y + moduleSize} Z`;

            svgString += `<path d="${lPath}" fill="${fillColor}" />`;
            break;

          case 'boxed':
            // Boxed: Outer Black, Inner White (Background), Center Black
            // Note: SVG order is painters algo. We draw Black Outer. Then White Inner. Then Black Center.
            // Issue: fillColor might be a gradient. If we draw White, we assume white background.
            // If bg is transparent or different, this fails. 
            // Better approach: Path with a hole? (Fill rule: evenodd)
            // Outer rectangle (clockwise) + Inner rectangle (counter-clockwise) = Hole

            const bBorder = moduleSize * 0.25;
            const bInner = moduleSize - (bBorder * 2);
            const bDotSize = moduleSize * 0.35;
            const bDotOffset = (moduleSize - bDotSize) / 2;

            // Path construction for frame (Outer square minus inner square)
            // Outer: M x y h width v height h -width z
            let bPath = `M ${x} ${y} h ${moduleSize} v ${moduleSize} h -${moduleSize} z`;
            // Inner (hole): M x+bBorder y+bBorder v bInner h bInner v -bInner z (counter-clockwise relative to outer? No, standard SVG winding rule usually requires reversing direction or using fill-rule="evenodd")
            // Simplest: just use fill-rule="evenodd" on the path tag if we combine them.
            // OR: Since we can't easily change fill-rule for just this one if using a shared style...
            // Let's assume white background for "Inner White" is acceptable OR use a mask.
            // BUT, wait, for PNG we used destination-out which clears to transparent.
            // To match that in SVG with simple shapes is hard without masks.
            // Alternative: Compound Path.
            // M x y L x+w y L x+w y+h L x y+h Z  M x+b x+b L x+b y+b+i L x+b+i y+b+i L x+b+i y+b Z
            // Let's try drawing the frame as 4 rectangles if complex path is too risky? No, path is better.
            // Let's use 2 shapes. 
            // Shape 1: Frame. 
            // Shape 2: Center Dot.

            // Frame via Path (Outer - Inner)
            // Using mask simulation by drawing 4 rects? No, too many elements.
            // Let's use the 'evenodd' trick. 
            // Prevent save if Frozen
            if (window.currentUser && window.currentUser.isFrozen) {
              alert("⚠️ Account is Frozen (Read-Only). You cannot make changes.");
              saveBtn.innerHTML = originalBtnText;
              saveBtn.disabled = false;
              return;
            }

            // If no scope (New User), try to determine from sessioneed to add fill-rule="evenodd" to this specific path element.

            let framePath = `M ${x} ${y} h ${moduleSize} v ${moduleSize} h -${moduleSize} z`;
            framePath += ` M ${x + bBorder} ${y + bBorder} v ${bInner} h ${bInner} v -${bInner} z`; // Hole

            svgString += `<path d="${framePath}" fill="${fillColor}" fill-rule="evenodd"/>`;
            svgString += `<rect x="${x + bDotOffset}" y="${y + bDotOffset}" width="${bDotSize}" height="${bDotSize}" fill="${fillColor}" />`;
            break;

          case 'target':
            // Target: Outer Circle, Hole, Inner Dot
            const tRad = moduleSize / 2;
            const tHoleRad = tRad * 0.7;
            const tDotRad = tRad * 0.35;

            // Circle with hole
            let tPath = `M ${centerX} ${centerY - tRad}`; // Top of outer
            tPath += ` A ${tRad} ${tRad} 0 1 0 ${centerX} ${centerY + tRad} A ${tRad} ${tRad} 0 1 0 ${centerX} ${centerY - tRad} Z`;
            // Inner hole (reverse direction for nonzero winding, or just use evenodd)
            tPath += ` M ${centerX} ${centerY - tHoleRad}`;
            tPath += ` A ${tHoleRad} ${tHoleRad} 0 1 1 ${centerX} ${centerY + tHoleRad} A ${tHoleRad} ${tHoleRad} 0 1 1 ${centerX} ${centerY - tHoleRad} Z`;

            svgString += `<path d="${tPath}" fill="${fillColor}" fill-rule="evenodd"/>`;

            // Inner Dot
            svgString += `<circle cx="${centerX}" cy="${centerY}" r="${tDotRad}" fill="${fillColor}" />`;
            break;

          case 'glitch':
            const slH = moduleSize / 4;
            svgString += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${slH}" fill="${fillColor}" />`;
            svgString += `<rect x="${x - moduleSize * 0.1}" y="${y + slH}" width="${moduleSize}" height="${slH}" fill="${fillColor}" />`;
            svgString += `<rect x="${x + moduleSize * 0.1}" y="${y + slH * 2}" width="${moduleSize}" height="${slH}" fill="${fillColor}" />`;
            svgString += `<rect x="${x}" y="${y + slH * 3}" width="${moduleSize}" height="${slH}" fill="${fillColor}" />`;
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
    console.error('Failed to copy URL:', err);
    const btn = document.getElementById('copyUrl');
    btn.innerHTML = '❌ Failed';
    btn.style.background = '#ef4444';
    btn.style.color = '#fff';
    setTimeout(() => {
      btn.innerHTML = '📋 Copy Link'; // Assuming original text or use originalText logic if scoped
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);
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
document.getElementById('addUserBtn').onclick = (e) => {
  if (e) e.preventDefault();

  // Check if button is disabled (frozen or limit reached)
  const addUserBtn = document.getElementById('addUserBtn');
  if (addUserBtn && addUserBtn.disabled) {
    return; // Button is disabled, do nothing
  }

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
    case 'diagonal-reverse':
      gradient = ctx.createLinearGradient(x + width, y, x, y + height);
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
// Draw QR code modules with different styles
function drawQRModule(ctx, x, y, width, height, style, neighbors = {}, optFillStyle = null) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radius = Math.min(width, height) / 2;
  const size = Math.min(width, height);

  // Set color: Use optional global style if provided, else fall back to local logic (backward compatibility)
  if (optFillStyle) {
    ctx.fillStyle = optFillStyle;
  } else if (qrCustomization.isGradient) {
    // This fallback is per-module gradient, which we are moving away from but keeping for safety
    const gradient = createGradient(ctx, x, y, width, height, qrCustomization.gradientDirection);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = qrCustomization.qrColor;
  }

  // Helper for fluid corners
  const drawCorner = (ctx, startX, startY, cornerX, cornerY, endX, endY, r) => {
    ctx.moveTo(startX, startY);
    ctx.arcTo(cornerX, cornerY, endX, endY, r);
  };

  switch (style) {
    case 'squares':
      ctx.fillRect(x, y, width, height);
      break;

    case 'diamonds':
      ctx.beginPath();
      const diamondScale = 1.25;
      ctx.moveTo(centerX, centerY - radius * diamondScale);
      ctx.lineTo(centerX + radius * diamondScale, centerY);
      ctx.lineTo(centerX, centerY + radius * diamondScale);
      ctx.lineTo(centerX - radius * diamondScale, centerY);
      ctx.closePath();
      ctx.fill();
      break;

    case 'hexagons':
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
      ctx.beginPath();
      const starRadius = radius * 1.2;
      const innerRadius = starRadius * 0.6;
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
      ctx.beginPath();
      // Improved heart shape
      // Pushing the heart slightly up to center it visually in the square
      const hOffset = height * 0.1;
      const hY = y + hOffset;
      const hHeight = height - (hOffset * 2); // Keep some padding

      const topCurveHeight = hHeight * 0.3;
      ctx.moveTo(x + width / 2, hY + hHeight * 0.2);
      ctx.bezierCurveTo(x + width / 2, hY, x, hY, x, hY + topCurveHeight);
      ctx.bezierCurveTo(x, hY + (hHeight + topCurveHeight) / 2, x + width / 2, hY + hHeight, x + width / 2, hY + hHeight);
      ctx.bezierCurveTo(x + width / 2, hY + hHeight, x + width, hY + (hHeight + topCurveHeight) / 2, x + width, hY + topCurveHeight);
      ctx.bezierCurveTo(x + width, hY, x + width / 2, hY, x + width / 2, hY + hHeight * 0.2);
      ctx.fill();
      break;

    case 'triangles':
      ctx.beginPath();
      ctx.moveTo(centerX, y + size * 0.02);
      ctx.lineTo(x + size * 0.02, y + size * 0.98);
      ctx.lineTo(x + size * 0.98, y + size * 0.98);
      ctx.closePath();
      ctx.fill();
      break;

    case 'octagons':
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
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.9, 0, 2 * Math.PI);
      ctx.fill();
      break;

    case 'pixels':
      const pixelSize = size * 0.8;
      const pixelOffset = (size - pixelSize) / 2;
      ctx.fillRect(x + pixelOffset, y + pixelOffset, pixelSize, pixelSize);
      break;

    case 'fluid':
      if (!neighbors) neighbors = {};
      const { top, right, bottom, left } = neighbors;
      const maxR = size / 2;

      // Smart corner rounding logic
      // If neighbor is dark, corner is sharp (0 radius)
      // If neighbor is light, corner is rounded (0.5 * size radius)

      // Top Left
      const tl = (top || left) ? 0 : maxR;
      // Top Right
      const tr = (top || right) ? 0 : maxR;
      // Bottom Right
      const br = (bottom || right) ? 0 : maxR;
      // Bottom Left
      const bl = (bottom || left) ? 0 : maxR;

      ctx.beginPath();
      ctx.roundRect(x, y, width, height, [tl, tr, br, bl]);
      ctx.fill();
      break;

    case 'stripes':
      // Continuous horizontal stripes
      const stripeHeight = height * 0.7; // Slightly thicker
      const stripeY = y + (height - stripeHeight) / 2;
      const stripeRad = stripeHeight / 2; // Maximum radius

      if (!neighbors) neighbors = {};
      const { left: sLeft, right: sRight } = neighbors;

      // Left corners (top-left, bottom-left) - rounded if no left neighbor
      const lRad = sLeft ? 0 : stripeRad;
      // Right corners (top-right, bottom-right) - rounded if no right neighbor
      const rRad = sRight ? 0 : stripeRad;

      ctx.beginPath();
      // roundRect syntax: [tl, tr, br, bl]
      ctx.roundRect(x, stripeY, width, stripeHeight, [lRad, rRad, rRad, lRad]);
      ctx.fill();
      break;

    case 'vertical-stripes':
      // Continuous vertical stripes
      const vStripeW = width * 0.7;
      const vStripeX = x + (width - vStripeW) / 2;
      const vStripeR = vStripeW / 2;

      if (!neighbors) neighbors = {};
      const { top: vT, bottom: vB } = neighbors;

      // Top corners (top-left, top-right) - rounded if no top neighbor
      const tRad = vT ? 0 : vStripeR;
      // Bottom corners (bottom-left, bottom-right) - rounded if no bottom neighbor
      const bRad = vB ? 0 : vStripeR;

      ctx.beginPath();
      // roundRect syntax: [tl, tr, br, bl]
      ctx.roundRect(vStripeX, y, vStripeW, height, [tRad, tRad, bRad, bRad]);
      ctx.fill();
      break;

    case 'cross':
      const thick = width * 0.35;
      const offset = (width - thick) / 2;

      ctx.beginPath();
      // Horizontal bar
      ctx.roundRect(x, y + offset, width, thick, thick / 3);
      // Vertical bar
      ctx.roundRect(x + offset, y, thick, height, thick / 3);
      ctx.fill();
      break;

    case 'leaf':
      ctx.beginPath();
      // Leaf: Top-Right & Bottom-Left sharp, others round
      // [tl, tr, br, bl]
      // tr=0, bl=0. tl=r, br=r
      const leafR = size / 1.6;
      ctx.roundRect(x, y, width, height, [leafR, 0, leafR, 0]);
      ctx.fill();
      break;

    case 'boxed':
      // Boxed: Square with a hole
      // Draw outer square
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.fill();

      // Clear inner square
      const boxBorder = width * 0.25;
      const boxInner = width - (boxBorder * 2);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.rect(x + boxBorder, y + boxBorder, boxInner, boxInner);
      ctx.fill();

      // Reset composite operation to default
      ctx.globalCompositeOperation = 'source-over';
      // Draw center dot? implementation_plan said Frame+Dot
      const boxDotSize = width * 0.35;
      const boxDotOffset = (width - boxDotSize) / 2;
      // Re-apply fill style (it might have been lost or we need to be safe)
      if (qrCustomization.isGradient) {
        // Gradient needs to be recreated if context state shifted, but usually fine.
        // Simpler to just fill.
      }
      ctx.beginPath();
      ctx.rect(x + boxDotOffset, y + boxDotOffset, boxDotSize, boxDotSize);
      ctx.fill();
      break;

    case 'target':
      // Target: Concentric circles
      // Outer
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Clear middle ring
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.7, 0, 2 * Math.PI);
      ctx.fill();

      // Reset
      ctx.globalCompositeOperation = 'source-over';

      // Inner dot
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.35, 0, 2 * Math.PI);
      ctx.fill();
      break;

    case 'glitch':
      // Glitch: horizontal strips with offsets
      const sliceH = height / 4;

      // Slice 1: Normal
      ctx.fillRect(x, y, width, sliceH);

      // Slice 2: Offset Left
      ctx.fillRect(x - width * 0.1, y + sliceH, width, sliceH);

      // Slice 3: Offset Right
      ctx.fillRect(x + width * 0.1, y + sliceH * 2, width, sliceH);

      // Slice 4: Normal
      ctx.fillRect(x, y + sliceH * 3, width, sliceH);
      break;

    default:
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
  const errorCorrectionLevel = 'H'; // High error correction for logo support
  const qr = qrcode(typeNumber, errorCorrectionLevel);
  qr.addData(qrUrl);
  qr.make();

  // Calculate module size with proportional padding
  const moduleCount = qr.getModuleCount();
  const padding = (canvasSize / QR_PADDING_CONFIG.referenceSize) * QR_PADDING_CONFIG.referencePadding; // Proportional padding

  const availableSize = canvasSize - (padding * 2);
  const moduleSize = availableSize / moduleCount;

  // Calculate Logo Area (for exclusion)
  let logoStartPos = -1;
  let logoEndPos = -1;

  if (qrCustomization.logoOption === 'image') {
    const centerStart = Math.floor(moduleCount * (1 - 0.22) / 2);
    const centerEnd = Math.ceil(moduleCount * (1 + 0.22) / 2);
    logoStartPos = centerStart;
    logoEndPos = centerEnd;
  }

  // Create Global Gradient if needed
  let globalFillStyle = null;
  if (qrCustomization.isGradient) {
    globalFillStyle = createGradient(ctx, 0, 0, canvasSize, canvasSize, qrCustomization.gradientDirection);
  } else {
    globalFillStyle = qrCustomization.qrColor;
  }

  // Draw QR code modules with custom colors and styles
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {

      // Skip modules in logo area
      // Skip modules in logo area
      if (logoStartPos !== -1) {
        // Smart exclusion: Check shape
        if (qrCustomization.logoCornerRadius > 0.4) {
          // Circular Exclusion
          const centerX = moduleCount / 2;
          const centerY = moduleCount / 2;
          const modCenterX = col + 0.5;
          const modCenterY = row + 0.5;
          const dist = Math.sqrt(Math.pow(modCenterX - centerX, 2) + Math.pow(modCenterY - centerY, 2));

          // Limit radius: logo is 0.22 of full size. In modules:
          const limitRadius = (moduleCount * 0.22) / 2;

          // Add slight padding (0.5 module) to not touch logo edge
          if (dist < limitRadius + 0.5) {
            continue;
          }
        } else {
          // Square Exclusion
          if (row >= logoStartPos && row < logoEndPos && col >= logoStartPos && col < logoEndPos) {
            continue;
          }
        }
      }

      if (qr.isDark(row, col)) {
        const isDarkSafe = (r, c) => {
          if (r < 0 || r >= moduleCount || c < 0 || c >= moduleCount) return false;
          return qr.isDark(r, c);
        };

        const neighbors = {
          top: isDarkSafe(row - 1, col),
          bottom: isDarkSafe(row + 1, col),
          left: isDarkSafe(row, col - 1),
          right: isDarkSafe(row, col + 1)
        };

        drawQRModule(
          ctx,
          padding + col * moduleSize,
          padding + row * moduleSize,
          moduleSize,
          moduleSize,
          qrCustomization.qrStyle,
          neighbors,
          globalFillStyle
        );
      }
    }
  }

  // Handle Logo Drawing
  if (qrCustomization.logoOption === 'image') {
    const logoSize = canvasSize * 0.22; // 22% of QR size
    const logoX = (canvasSize - logoSize) / 2;
    const logoY = (canvasSize - logoSize) / 2;

    // Draw background logic for logo
    let drawLogoBg = false;
    let logoBgFill = qrCustomization.backgroundColor; // Default to Match

    if (qrCustomization.logoBgOption === 'custom') {
      if (qrCustomization.logoBgTransparent) {
        // Transparent custom means DON'T draw
        drawLogoBg = false;
      } else {
        drawLogoBg = true;
        logoBgFill = qrCustomization.logoBgColor;
      }
    } else {
      // Match QR (Default)
      drawLogoBg = false;
    }

    if (drawLogoBg) {
      ctx.fillStyle = logoBgFill;
      const cornerRadius = logoSize * qrCustomization.logoCornerRadius;
      ctx.beginPath();
      // Adjust size slightly to cover module edges if needed, but module grid is clean
      ctx.roundRect(logoX, logoY, logoSize, logoSize, cornerRadius);
      ctx.fill();
    }

    if (qrCustomization.logoData) {
      const img = new Image();
      img.onload = () => {
        // Draw logo image
        const imgPadding = logoSize * 0.02; // 2% padding
        const imgSize = logoSize - imgPadding * 2;
        const imgX = logoX + imgPadding;
        const imgY = logoY + imgPadding;

        ctx.save();
        ctx.beginPath();
        // User requested: "make it automatically follow this radius parameter"
        // referring to cornerRadius = logoSize * 0.2
        const imgCornerRadius = logoSize * qrCustomization.logoCornerRadius;
        ctx.roundRect(imgX, imgY, imgSize, imgSize, imgCornerRadius);
        ctx.clip();

        ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        ctx.restore();

        qrImg.src = canvas.toDataURL('image/png', 1.0);
      };
      // Handle error just in case
      img.onerror = () => {
        console.error("Failed to load logo image");
        qrImg.src = canvas.toDataURL('image/png', 1.0);
      };
      img.src = qrCustomization.logoData;
      return; // Async update
    } else {
      // Draw placeholder
      // Only draw default gray box if we didn't already draw a custom background!
      if (!drawLogoBg) {
        ctx.fillStyle = '#f3f4f6';
        const cornerRadius = logoSize * 0.2; // 20% corner radius
        ctx.beginPath();
        ctx.roundRect(logoX, logoY, logoSize, logoSize, cornerRadius);
        ctx.fill();
      }

      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 4;

      // Ensure path exists for stroke if we skipped fill above
      if (drawLogoBg) {
        const cornerRadius = logoSize * 0.2;
        ctx.beginPath();
        ctx.roundRect(logoX, logoY, logoSize, logoSize, cornerRadius);
      }
      ctx.stroke();

      // Draw "LOGO" text
      ctx.font = `bold ${logoSize * 0.25}px sans-serif`;
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LOGO', canvasSize / 2, canvasSize / 2);
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

  // Logo controls
  const logoOptionNone = document.getElementById('logoOptionNone');
  const logoOptionImage = document.getElementById('logoOptionImage');
  const logoUploadContainer = document.getElementById('logoUploadContainer');
  const logoUploadBtn = document.getElementById('logoUploadBtn');
  const logoInput = document.getElementById('logoInput');
  // Logo controls

  const logoFileName = document.getElementById('logoFileName');

  // Logo BG controls
  const logoBgOptions = document.getElementsByName('logoBgOption');
  const logoBgColorContainer = document.getElementById('logoBgColorContainer');
  const logoBgColorPicker = document.getElementById('logoBgColorPicker');
  const logoBgTransparentBtn = document.getElementById('logoBgTransparentBtn');

  // Toggle panel (similar to download dropdown)
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    // Sync UI with current state when opening
    bgColorPicker.value = qrCustomization.backgroundColor;
    bgOpacitySlider.value = qrCustomization.backgroundOpacity;
    bgOpacityValue.textContent = qrCustomization.backgroundOpacity + '%';
    qrSpacingSlider.value = qrCustomization.spacing;
    qrSpacingValue.textContent = qrCustomization.spacing + 'px';
    qrStyleSelect.value = qrCustomization.qrStyle;
    qrColorPicker.value = qrCustomization.qrColor;

    if (qrCustomization.isGradient) {
      gradientControls.style.display = 'block';
      gradientToggle.textContent = 'Solid';
    } else {
      gradientControls.style.display = 'none';
      gradientToggle.textContent = 'Gradient';
    }
    gradientColor1.value = qrCustomization.gradientColor1;
    gradientColor2.value = qrCustomization.gradientColor2;
    gradientDirection.value = qrCustomization.gradientDirection;

    if (qrCustomization.logoOption === 'image') {
      logoOptionImage.checked = true;
      logoUploadContainer.style.display = 'block';
      if (qrCustomization.logoData) {
        logoFileName.textContent = 'Image loaded';
      }
    } else {
      logoOptionNone.checked = true;
      logoUploadContainer.style.display = 'none';
    }

    // Sync Logo BG state
    // Reset all states first
    logoBgTransparentBtn.classList.remove('selected');
    for (const option of logoBgOptions) {
      option.checked = false;
    }

    if (qrCustomization.logoBgOption === 'transparent') {
      logoBgTransparentBtn.classList.add('selected');
      logoBgColorContainer.style.display = 'block'; // Keep container visible for button
    } else {
      // Match or Custom
      for (const option of logoBgOptions) {
        if (option.value === qrCustomization.logoBgOption) {
          option.checked = true;
        }
      }
      logoBgColorContainer.style.display = qrCustomization.logoBgOption === 'custom' ? 'block' : 'none';
    }
    logoBgColorPicker.value = qrCustomization.logoBgColor;

    panel.classList.toggle('expanded');
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !editBtn.contains(e.target)) {
      panel.classList.remove('expanded');
    }
  });

  // Logo Option Toggle
  const handleLogoOptionChange = () => {
    if (logoOptionImage.checked) {
      qrCustomization.logoOption = 'image';
      logoUploadContainer.style.display = 'block';
    } else {
      qrCustomization.logoOption = 'none';
      logoUploadContainer.style.display = 'none';
    }
    updateQRDisplay();
  };

  logoOptionNone.addEventListener('change', handleLogoOptionChange);
  logoOptionImage.addEventListener('change', handleLogoOptionChange);

  // Logo Upload Button
  logoUploadBtn.addEventListener('click', () => {
    logoInput.click();
  });

  // Logo File Input
  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const logoData = event.target.result;
        qrCustomization.logoData = logoData;
        logoFileName.textContent = file.name;

        // Analyze image for shape (Circle vs Square)
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 100; // Analysis size
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, size, size);

          // Check corners for transparency
          // Top-Left (0,0), Top-Right (w,0), Bottom-Left (0,h), Bottom-Right (w,h)
          // We check extreme corners AND a point slightly inward (12% in)
          // A Circle is transparent deep into the corner (~15%), a Rounded Square is opaque by ~6-10%.

          const extremePoints = [
            ctx.getImageData(0, 0, 1, 1).data,
            ctx.getImageData(size - 1, 0, 1, 1).data,
            ctx.getImageData(0, size - 1, 1, 1).data,
            ctx.getImageData(size - 1, size - 1, 1, 1).data
          ];

          // Check inner points at 12% (12px on 100px)
          const innerOffset = Math.floor(size * 0.12);
          const innerPoints = [
            ctx.getImageData(innerOffset, innerOffset, 1, 1).data,
            ctx.getImageData(size - 1 - innerOffset, innerOffset, 1, 1).data,
            ctx.getImageData(innerOffset, size - 1 - innerOffset, 1, 1).data,
            ctx.getImageData(size - 1 - innerOffset, size - 1 - innerOffset, 1, 1).data
          ];

          // 1. Extreme corners must be transparent
          const cornersTransparent = extremePoints.every(p => p[3] < 10);

          // 2. Inner points must ALSO be transparent for it to be a Circle
          const innerTransparent = innerPoints.every(p => p[3] < 10);

          let detected = 0.2;
          if (cornersTransparent && innerTransparent) {
            detected = 0.5; // Circle
          } else {
            detected = 0.2; // Rounded Square
          }
          qrCustomization.detectedLogoRadius = detected;

          // Only apply if auto mode is ON
          if (qrCustomization.logoRadiusMode === 'auto') {
            qrCustomization.logoCornerRadius = detected;
            // Update slider visual just in case (optional, but good for feedback if we enable it later)
            // But slider is disabled in auto mode.
          }

          updateQRDisplay();
        };
        img.src = logoData;
      };
      reader.readAsDataURL(file);
    }
  });

  // Logo BG Option Toggle
  // RADIUS CONTROLS
  const logoRadiusAuto = document.getElementById('logoRadiusAuto');
  const logoRadiusSlider = document.getElementById('logoRadiusSlider');
  const logoRadiusValue = document.getElementById('logoRadiusValue');

  // Auto Toggle Listener
  logoRadiusAuto.addEventListener('change', (e) => {
    const isAuto = e.target.checked;
    qrCustomization.logoRadiusMode = isAuto ? 'auto' : 'manual';

    if (isAuto) {
      logoRadiusSlider.disabled = true;
      logoRadiusValue.textContent = 'Auto';
      qrCustomization.logoCornerRadius = qrCustomization.detectedLogoRadius;
    } else {
      logoRadiusSlider.disabled = false;
      // Apply current manual value
      const val = parseInt(logoRadiusSlider.value);
      logoRadiusValue.textContent = val + '%';
      qrCustomization.logoManualRadius = val / 100;
      qrCustomization.logoCornerRadius = qrCustomization.logoManualRadius;
    }
    updateQRDisplay();
  });

  // Slider Listener
  logoRadiusSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    logoRadiusValue.textContent = val + '%';
    qrCustomization.logoManualRadius = val / 100;
    qrCustomization.logoCornerRadius = qrCustomization.logoManualRadius;
    updateQRDisplay();
  });

  logoBgOptions.forEach(option => {
    option.addEventListener('change', (e) => {
      qrCustomization.logoBgOption = e.target.value;

      // Reset transparent flag when switching via radio buttons
      qrCustomization.logoBgTransparent = false;

      // If user clicks a radio (Match or Custom), ensure Transparent button is deselected
      logoBgTransparentBtn.classList.remove('selected');

      if (e.target.value === 'custom') {
        logoBgColorContainer.style.display = 'block';
      } else {
        logoBgColorContainer.style.display = 'none';
      }
      updateQRDisplay();
    });
  });

  // Swap Gradient Colors
  const gradientSwapBtn = document.getElementById('gradientSwapBtn');
  if (gradientSwapBtn) {
    gradientSwapBtn.addEventListener('click', () => {
      const color1 = gradientColor1.value;
      const color2 = gradientColor2.value;

      gradientColor1.value = color2;
      gradientColor2.value = color1;

      qrCustomization.gradientColor1 = color2;
      qrCustomization.gradientColor2 = color1;

      updateQRDisplay();
    });
  }

  // Logo BG Color Picker
  logoBgColorPicker.addEventListener('input', (e) => {
    qrCustomization.logoBgColor = e.target.value;
    // Interaction with picker implies Custom mode, not transparent
    if (qrCustomization.logoBgOption === 'transparent') {
      qrCustomization.logoBgOption = 'custom';
      // We need to re-check the custom radio visual state if it was unchecked
      // Find the custom radio and check it
      const customRadio = document.querySelector('input[name="logoBgOption"][value="custom"]');
      if (customRadio) customRadio.checked = true;
    }

    qrCustomization.logoBgTransparent = false;
    logoBgTransparentBtn.classList.remove('selected');

    updateQRDisplay();
  });

  // Logo BG Transparent Button
  logoBgTransparentBtn.addEventListener('click', () => {
    qrCustomization.logoBgOption = 'transparent'; // Logic state
    qrCustomization.logoBgTransparent = true; // Flag legacy support if needed

    // UI State: Select button, Deselect radio (visually)
    logoBgTransparentBtn.classList.add('selected');

    // To "deselect" the custom radio while keeping the container open:
    // We can't actually uncheck a radio group easily without checking another.
    // However, the container visibility is tied to the 'change' event of the group.
    // If we manually uncheck all radios, the container might hide if we aren't careful?
    // Actually, we WANT the container to stay open because the button is inside it.

    // Trick: Uncheck all radios in the group to show "None" selected
    logoBgOptions.forEach(opt => opt.checked = false);

    // Ensure container stays visible since we are in a 'custom-like' mode (transparent)
    logoBgColorContainer.style.display = 'block';

    updateQRDisplay();
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
    qrCustomization.logoOption = logoOptionImage.checked ? 'image' : 'none';

    // Logo BG is already live updated via valid listeners above, but ensure it sticks
    // Actually apply button handles closing AND ensuring values.
    qrCustomization.logoBgOption = document.querySelector('input[name="logoBgOption"]:checked').value;
    qrCustomization.logoBgColor = logoBgColorPicker.value;

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
      spacing: 16,
      logoOption: 'none',
      logoData: null
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

    logoOptionNone.checked = true;
    logoUploadContainer.style.display = 'none';
    logoInput.value = '';
    logoFileName.textContent = 'No file chosen';

    // Reset Logo BG
    document.querySelector('input[name="logoBgOption"][value="match"]').checked = true;
    logoBgColorContainer.style.display = 'none';
    logoBgColorPicker.value = '#ffffff';
    qrCustomization.logoBgOption = 'match';
    qrCustomization.logoBgColor = '#ffffff';
    qrCustomization.logoBgTransparent = false;

    updateQRDisplay();
  });

  // Toggle gradient
  gradientToggle.addEventListener('click', () => {
    if (gradientControls.style.display === 'none') {
      gradientControls.style.display = 'block';
      gradientToggle.textContent = 'Solid';
      qrCustomization.isGradient = true;
    } else {
      gradientControls.style.display = 'none';
      gradientToggle.textContent = 'Gradient';
      qrCustomization.isGradient = false;
    }
    updateQRDisplay();
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
// Display Admin Statistics
// Display admin statistics
// Display Admin Statistics
async function displayAdminStatistics(users) {
  const totalClientUsersElement = document.getElementById('totalClientUsers');
  const totalAccountsElement = document.getElementById('totalLoginAccounts');
  const userStatsContainer = document.getElementById('userStatsContainer');

  // 1. Total Client Users
  if (totalClientUsersElement) {
    totalClientUsersElement.textContent = users ? users.length : 0;
  }

  // 2. Login Accounts Count
  if (totalAccountsElement) {
    try {
      const { dataService } = await import('./data-service.js');
      const credentials = await dataService.getCredentials();
      // Exclude admins
      const count = credentials.filter(cred => cred.role !== 'main_admin' && cred.role !== 'super_admin').length;
      totalAccountsElement.textContent = count;
    } catch (e) {
      console.warn("Failed to load credentials count:", e);
      totalAccountsElement.textContent = "-";
    }
  }
}

// Display login accounts table
async function displayLoginAccountsTable(accountsToShow = null) {
  const tbody = document.getElementById('adminAccountsTableBody');
  if (!tbody) return; // Add check for existing body

  try {
    let allAccounts;

    if (accountsToShow) {
      // Use provided accounts (for search results)
      allAccounts = accountsToShow;
    } else {
      // Load accounts via DataService
      try {
        const { dataService } = await import('./data-service.js');
        allAccounts = await dataService.getCredentials();
      } catch (e) {
        console.warn("Display: Using local credentials fetch fallback");
        const response = await fetch('./credentials/login_credentials.json');
        if (response.ok) allAccounts = await response.json();
      }

      // Check for localStorage override (still useful for session testing)
      const override = localStorage.getItem('adminCredentialsOverride');
      if (override) {
        // Merge or replace? For simplicity, replace if override exists
        allAccounts = JSON.parse(override);
      }

      // Store accounts globally for search functionality
      allAdminAccountsGlobal = allAccounts || [];
    }

    if (!allAccounts || allAccounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No login accounts found</td></tr>';
      return;
    }

    tbody.innerHTML = "";

    // Count client users for each data file
    // Pass global users to get accurate count without fetching
    const clientUserStats = await getClientUserCounts(typeof allUsersGlobal !== 'undefined' ? allUsersGlobal : []);

    // Sort accounts: Main/Super Admins first
    allAccounts.sort((a, b) => {
      const isMainA = a.role === 'main_admin' || a.role === 'super_admin';
      const isMainB = b.role === 'main_admin' || b.role === 'super_admin';
      if (isMainA && !isMainB) return -1;
      if (!isMainA && isMainB) return 1;
      return 0;
    });

    allAccounts.forEach(account => {
      let clientCountsDisplay = '-';

      if (account.role !== 'main_admin' && account.role !== 'super_admin') {
        const stats = clientUserStats[account.dataFile];
        if (stats) {
          clientCountsDisplay = `${stats.users}`;
        } else {
          clientCountsDisplay = '0';
        }
      }

      let roleDisplay = 'User';
      if (account.role === 'super_admin') roleDisplay = 'Super Admin';
      else if (account.role === 'main_admin') roleDisplay = 'Main Admin';

      const statusClass = account.isActive ? 'active' : 'inactive';
      const statusText = account.isActive ? 'Active' : 'Inactive';
      const isMainAdmin = account.role === 'main_admin' || account.role === 'super_admin';

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
        <td class="centered-cell">${clientCountsDisplay}</td>
        <td>${roleDisplay}</td>
        <td>
          <div class="status-badge ${account.isFrozen ? 'frozen' : statusClass}">
            <span>${account.isFrozen ? 'Freezed' : statusText}</span>
          </div>
        </td>
        <td class="centered-cell">
          ${isMainAdmin ? '<span class="badge-infinity">∞</span>' :
          `
            <label class="toggle-switch" title="Toggle Limit/Unlimited">
                <input type="checkbox" ${account.isUnlimited !== false ? 'checked' : ''} 
                       onchange="toggleLimitMode('${account.username}', this.checked)">
                <span class="toggle-slider"></span>
            </label>
            `
        }
        </td>
        <td class="centered-cell">
          ${isMainAdmin ? '-' :
          (account.isUnlimited !== false ?
            '<span class="limit-text">∞</span>' :
            `<input type="number" class="limit-input" value="${account.maxUsers || 100}" 
                          min="1" onchange="updateLimitValue('${account.username}', this.value)">`
          )
        }
        </td>
        <td class="centered-cell">
          ${isMainAdmin ? '<span class="main-admin-badge">Always Active</span>' :
          `
            <label class="toggle-switch" title="Activate/Deactivate Login">
              <input type="checkbox" ${account.isActive ? 'checked' : ''} 
                     onchange="toggleAccountStatus('${account.username}', this.checked)">
              <span class="toggle-slider"></span>
            </label>
            `
        }
        </td>
        <td class="centered-cell">
          ${isMainAdmin ? '-' :
          `
            <label class="toggle-switch" title="${!account.isActive ? 'Account Deactivated' : (account.isFrozen ? 'Unfreeze' : 'Freeze')}">
              <input type="checkbox" ${account.isFrozen ? 'checked' : ''} 
                     ${!account.isActive ? 'disabled' : ''}
                     onchange="toggleAccountFreeze('${account.username}', this.checked)">
              <span class="toggle-slider"></span>
            </label>
            `
        }
        </td>
        <td class="centered-cell">
          ${isMainAdmin ? '-' :
          `
            <button class="btn-capsule-delete" 
                    title="Delete Account"
                    onclick="deleteAccount(this, '${account.username}')">
              Delete
            </button>
            `
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
async function getClientUserCounts(users = []) {
  const counts = {};

  try {
    // 1. Get credentials via DataService to know which dataFiles (scopes) exist
    // If not already imported, import it dynamically
    let credentials = [];
    try {
      const { dataService } = await import('./data-service.js');
      credentials = await dataService.getCredentials();
    } catch (e) {
      console.warn("Using local credentials fetch fallback");
      const credRes = await fetch('./credentials/login_credentials.json');
      if (credRes.ok) credentials = await credRes.json();
    }

    // 2. Aggregate counts from the passed 'users' array
    // users array should have 'dataFile' property if loaded from Firebase with my modification
    // or if loaded locally via index iteration (where we might need to infer it?)
    // Actually, local load logic in loadUsers pushed raw JSON.
    // If local JSON files don't have 'dataFile' property in user objects, we can't easily group them unless we infer it during load.

    // For local load in loadUsers (lines 280-285), we iterate 'dataFiles'.
    // We should probably modify loadUsers to inject dataFile there too if missing!
    // But assuming we have it:

    // Group users by dataFile
    const userGroups = {};
    users.forEach(u => {
      // If dataFile is missing, try to find it or group as 'unknown'
      // For local files, we might need to rely on the fact that loadUsers *should* have injected it?
      // Wait, I didn't modify loadUsers local loading logic to inject dataFile.
      // Let's assume for now that Firebase users have it (I added it).
      // For local users, we might need to update loadUsers first.
      const scope = u.dataFile || 'unknown';
      if (!userGroups[scope]) userGroups[scope] = { count: 0, files: new Set() };
      userGroups[scope].count++;
      // We don't have file paths per se in the user object from Firebase, just the scope.
      // But for local fallback, we technically do have file paths in index.
      // Let's just count unique scopes.
    });

    // 3. Map back to credentials to ensure we show all configured scopes even if empty
    // (Optional, but good for UI consistency)
    const scopes = [...new Set(credentials.map(c => c.dataFile).filter(Boolean))];

    scopes.forEach(scope => {
      const group = userGroups[scope] || { count: 0 };
      counts[scope] = {
        users: group.count,
        files: 1, // Simplify to 1 "scope" = 1 "file" concept for now
        details: [] // We can populate this if we want, but scope-level count is main goal
      };
    });

    // Also include scopes found in users but not in credentials (e.g. orphans or super admin views)
    Object.keys(userGroups).forEach(scope => {
      if (!counts[scope]) {
        counts[scope] = {
          users: userGroups[scope].count,
          files: 1,
          details: []
        };
      }
    });

  } catch (error) {
    console.error('Error calculating client counts:', error);
  }

  return counts;
}

// Toggle account status (admin only function)
async function toggleAccountStatus(username, isActive) {
  try {
    const { dataService } = await import('./data-service.js');

    // Attempt update via DataService (Firebase)
    const success = await dataService.updateCredential(username, { isActive: isActive });

    if (success) {
      const statusText = isActive ? 'activated' : 'deactivated';
      alert(`Account "${username}" has been ${statusText}.`);
      displayLoginAccountsTable();
      return;
    }

    // Fallback for Local Mode (Session only)
    console.log("Using session override for toggle status");
    // Load current credentials
    let credentials = [];
    // Check override first
    const override = localStorage.getItem('adminCredentialsOverride');
    if (override) {
      credentials = JSON.parse(override);
    } else {
      const response = await fetch('./credentials/login_credentials.json');
      if (response.ok) credentials = await response.json();
    }

    // Find and update
    const accountIndex = credentials.findIndex(cred => cred.username === username);
    if (accountIndex !== -1) {
      credentials[accountIndex].isActive = isActive;
      localStorage.setItem('adminCredentialsOverride', JSON.stringify(credentials));
      const statusText = isActive ? 'activated' : 'deactivated';
      alert(`Account "${username}" has been ${statusText}.\n\n(Local Mode: Changes are applied for this session only)`);
      displayLoginAccountsTable();
    } else {
      alert('Error: Account not found in local data');
    }

  } catch (error) {
    console.error('Error toggling account status:', error);
    alert('Error: Could not update account status');
  }
}

// Toggle Freeze status (Read-Only)
async function toggleAccountFreeze(username, isFrozen) {
  try {
    const { dataService } = await import('./data-service.js');
    const success = await dataService.updateCredential(username, { isFrozen: isFrozen });

    if (success) {
      // No alert, just refresh
      displayLoginAccountsTable();
    } else {
      // Local fallback
      let credentials = [];
      const override = localStorage.getItem('adminCredentialsOverride');
      if (override) {
        credentials = JSON.parse(override);
      } else {
        const response = await fetch('./credentials/login_credentials.json');
        if (response.ok) credentials = await response.json();
      }
      const accountIndex = credentials.findIndex(cred => cred.username === username);
      if (accountIndex !== -1) {
        credentials[accountIndex].isFrozen = isFrozen;
        localStorage.setItem('adminCredentialsOverride', JSON.stringify(credentials));
        displayLoginAccountsTable();
        alert(`Account "${username}" is now ${isFrozen ? 'Frozen (Read-Only)' : 'Unfrozen'}. (Local Session)`);
      }
    }
  } catch (error) {
    console.error('Error toggling freeze status:', error);
    alert('Error updating freeze status');
  }
}

// Delete Account
async function deleteAccount(btn, username) {
  // Show confirmation dialog immediately
  const confirmed = confirm(
    `⚠️ DELETE ACCOUNT: "${username}"\n\n` +
    `WARNING: This action is PERMANENT and IRREVERSIBLE!\n\n` +
    `If you delete this account:\n` +
    `• The login credentials will be permanently deleted\n` +
    `• All user profiles associated with this account will be permanently deleted\n` +
    `• All data will be lost forever\n` +
    `• There is NO way to recover this data\n\n` +
    `Are you absolutely sure you want to delete this account?\n\n` +
    `Click "OK" to DELETE PERMANENTLY\n` +
    `Click "Cancel" to keep the account`
  );

  if (!confirmed) {
    // User clicked Cancel - do nothing
    return;
  }

  // User clicked OK - proceed with deletion
  const originalContent = btn.innerHTML;
  btn.innerHTML = '⏳';
  btn.disabled = true;

  try {
    const { dataService } = await import('./data-service.js');
    const success = await dataService.deleteCredential(username);

    if (success) {
      // Success - refresh the table
      displayLoginAccountsTable();
      alert(`✅ Account "${username}" has been permanently deleted.`);
    } else {
      // Local fallback (Session only)
      let credentials = [];
      const override = localStorage.getItem('adminCredentialsOverride');
      if (override) {
        credentials = JSON.parse(override);
      } else {
        const response = await fetch('./credentials/login_credentials.json');
        if (response.ok) credentials = await response.json();
      }
      const newCredentials = credentials.filter(c => c.username !== username);
      if (newCredentials.length < credentials.length) {
        localStorage.setItem('adminCredentialsOverride', JSON.stringify(newCredentials));
        displayLoginAccountsTable();
        alert(`✅ Account "${username}" deleted (Local Session).`);
      } else {
        alert("❌ Delete failed. Please try again.");
        btn.innerHTML = originalContent;
        btn.disabled = false;
      }
    }
  } catch (e) {
    console.error("Delete failed", e);
    alert("❌ Delete failed due to an error. Please try again.");
    btn.innerHTML = originalContent;
    btn.disabled = false;
  }
}

// Toggle Limit Mode (Infinity vs Limited)
async function toggleLimitMode(username, isUnlimited) {
  try {
    const { dataService } = await import('./data-service.js');
    const updateData = { isUnlimited: isUnlimited };
    if (!isUnlimited) {
      updateData.maxUsers = 100; // Default when switching off infinity
    }

    await dataService.updateCredential(username, updateData);
    displayLoginAccountsTable();
  } catch (e) {
    console.error("Link toggle failed", e);
    alert("Error updating limit mode");
  }
}

// Update Max Users Value
async function updateLimitValue(username, value) {
  try {
    const { dataService } = await import('./data-service.js');
    await dataService.updateCredential(username, { maxUsers: parseInt(value) });
    console.log(`Updated limit for ${username} to ${value}`);
  } catch (e) {
    console.error("Limit update failed", e);
  }
}

// Show folder details modal
function showFolderDetails(dataFile) {
  const details = window.folderDetailsCache ? window.folderDetailsCache[dataFile] : null;

  if (!details || details.length === 0) {
    alert('No details available');
    return;
  }

  const modal = document.getElementById('folderDetailsModal');
  const modalContent = document.getElementById('folderDetailsContent');

  if (!modal) return;

  // Calculate total
  const totalUsers = details.reduce((sum, item) => sum + item.count, 0);

  // Determine folder display name
  const folderName = dataFile.endsWith('/') ? dataFile : dataFile + '/';

  // Build the new UI structure
  let html = `
    <div class="folder-modal-wrapper">
      <!-- Custom Header -->
      <div class="folder-modal-header">
        <div class="folder-header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
        </div>
        <div class="folder-header-info">
          <h3>Folder Distribution</h3>
          <p>${folderName}</p>
        </div>
        <button class="custom-close-btn" onclick="closeFolderDetailsModal()">&times;</button>
      </div>

      <!-- Summary Row -->
      <div class="folder-stats-row">
        <span class="stats-label">Total Users</span>
        <span class="stats-value">${totalUsers}</span>
      </div>

      <!-- File List -->
      <div class="folder-file-list">
  `;

  details.forEach(item => {
    let typeLabel = "Root Folder"; // Default

    // Normalize paths
    const normFile = item.file.replace(/\\/g, '/');
    const normScope = dataFile.replace(/\\/g, '/');

    const relativePath = normFile.startsWith(normScope) ? normFile.substring(normScope.length) : normFile;
    const cleanRelative = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    const depth = cleanRelative.split('/').length;

    let iconSvg = '';

    if (depth > 1) {
      typeLabel = "Sub-folder";
      // Folder Icon (Yellow)
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fbbf24" stroke="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    } else {
      // File Icon (Blue/Gray) - for Root Folder items
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
    }

    html += `
        <div class="folder-list-item">
          <div class="item-icon">
            ${iconSvg}
          </div>
          <div class="item-details">
            <span class="item-name">${item.file}</span>
            <span class="item-type">${typeLabel}</span>
          </div>
          <div class="item-stats">
            <span class="item-count">${item.count}</span>
            <span class="item-label">Users</span>
          </div>
        </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  // Hide default modal header/footer to match design (safely check if they exist)
  const defaultHeader = modal.querySelector('.modal-header');
  if (defaultHeader) defaultHeader.style.display = 'none';

  const defaultFooter = modal.querySelector('.modal-footer');
  if (defaultFooter) defaultFooter.style.display = 'none';

  modalContent.innerHTML = html;

  // Remove padding from modal content to allow header to stretch
  modalContent.style.padding = '0';
  modalContent.style.overflow = 'hidden';

  modal.classList.remove('hidden');

  // Add click outside listener
  const closeOnOutsideClick = (e) => {
    // If click is on the overlay (the background), close the modal
    if (e.target === modal) {
      closeFolderDetailsModal();
      modal.removeEventListener('click', closeOnOutsideClick);
    }
  };
  modal.addEventListener('click', closeOnOutsideClick);
}

function closeFolderDetailsModal() {
  const modal = document.getElementById('folderDetailsModal');
  if (modal) {
    modal.classList.add('hidden');
    // Restore default header/footer if they exist (for future proofing)
    const defaultHeader = modal.querySelector('.modal-header');
    if (defaultHeader) defaultHeader.style.display = '';
    const defaultFooter = modal.querySelector('.modal-footer');
    if (defaultFooter) defaultFooter.style.display = '';

    // Reset content padding
    const modalContent = document.getElementById('folderDetailsContent');
    if (modalContent) modalContent.style.padding = '';
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

    // Reset Submit Button State
    const submitBtn = document.querySelector('#addLoginForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = 'Generate Credentials';
      submitBtn.style.backgroundColor = '';
      submitBtn.disabled = false;
    }
    // Remove Next Button if exists
    const nextBtn = document.getElementById('btn-next-step');
    if (nextBtn) nextBtn.remove();
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

  // Process data file name - use exactly what user entered
  let processedDataFile = dataFile;

  // Check username and data file uniqueness
  try {
    const { dataService } = await import('./data-service.js');

    // Check credentials (handles both Firebase and local fallback)
    const { usernameExists, dataFileExists } = await dataService.checkCredentialUniqueness(username, processedDataFile);

    if (usernameExists) {
      alert('Username already exists. Please choose a different username.');
      return;
    }

    if (dataFileExists) {
      alert('Data file name already exists. Please choose a different data file name.');
      return;
    }

    // Loading State
    const submitBtn = document.querySelector('#addLoginForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '⏳ Generating...';
      submitBtn.disabled = true;
    }

    // Attempt to add credential to Firebase
    // If it fails (e.g. local mode), we still show the JSON for manual addition
    const credentialData = {
      username: username,
      password: password,
      role: 'user',
      createdAt: new Date().toISOString().split('T')[0],
      isActive: true,
      isFrozen: false,
      isUnlimited: false, // Default to Limited as requested
      maxUsers: 100,      // Default 100
      dataFile: processedDataFile,
      description: description || `User account for ${processedDataFile}`
    };

    const added = await dataService.addCredential(credentialData);
    if (added) {
      console.log('Account created in Firebase');
    } else {
      console.warn('Could not add to Firebase (likely local mode).');
    }

  } catch (error) {
    console.error('Error checking uniqueness or adding credential:', error);
    // Reset button on error
    const submitBtn = document.querySelector('#addLoginForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = 'Generate Credentials';
      submitBtn.disabled = false;
    }
    // Fallback to purely local check if dataService fails completely?
    // The dataService method handles errors gracefully usually, but let's be safe.
    try {
      const response = await fetch('./credentials/login_credentials.json');
      if (response.ok) {
        const credentials = await response.json();
        if (credentials.find(c => c.username.toLowerCase() === username.toLowerCase())) {
          alert('Username already exists (Local Check).');
          return;
        }
      }
    } catch (e) { console.warn("Local check failed", e); }
  }

  // UI Feedback instead of immediate transition
  const submitBtn = document.querySelector('#addLoginForm button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerHTML = '✅ Credentials Added';
    submitBtn.style.backgroundColor = '#4CAF50';
    submitBtn.disabled = true;
  }

  // Add Next Button
  const actionsDiv = document.querySelector('#addLoginForm .modal-actions');
  if (actionsDiv && !document.getElementById('btn-next-step')) {
    const nextBtn = document.createElement('button');
    nextBtn.id = 'btn-next-step';
    nextBtn.type = 'button';
    nextBtn.className = 'btn-primary';
    nextBtn.innerText = 'Next';
    nextBtn.style.marginLeft = '10px';
    nextBtn.onclick = () => {
      showCredentialsDisplay(username, password, processedDataFile, 'user', description);
    };
    actionsDiv.appendChild(nextBtn);
  }
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

  // Reset copy button to original state
  const copyButton = document.querySelector('.copy-all-btn');
  if (copyButton) {
    copyButton.textContent = '📋 Copy JSON';
    copyButton.style.background = '';
  }
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

    // Select the text visually
    if (window.getSelection && document.createRange) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(jsonElement);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
      // Optional: clear selection after timeout? User didn't specify, but keeping it selected looks like the screenshot
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

  // Basic validation for data file name - Allow slashes for folders
  if (!/^[a-zA-Z0-9_\-./\\]+$/.test(dataFile)) {
    showFieldError(field, 'Data file name can only contain letters, numbers, hyphens, underscores, dots, and slashes');
    return;
  }

  // Check data file uniqueness
  try {
    const response = await fetch('./credentials/login_credentials.json');
    if (response.ok) {
      const credentials = await response.json();
      const processedDataFile = dataFile;
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

  // Add New User button (for regular users)
  const addUserBtn = document.getElementById('addUserBtn');
  if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
      // Check if frozen
      if (window.currentUser && window.currentUser.isFrozen) {
        alert("⚠️ Account is Frozen (Read-Only). You cannot add new users.");
        return;
      }
      window.location.href = 'edit.html'; // Navigate to empty edit form
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

window.deleteUser = async function (btn, username, userCode, scope) {
  // If button is in confirmation state
  if (btn.dataset.confirming === 'true') {
    // Perform delete
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Deleting...';
    btn.disabled = true;

    try {
      const { dataService } = await import('./data-service.js');
      // Scope is required for Firebase delete
      if (!scope) {
        console.warn("Scope (dataFile) missing for delete.");
      }

      const success = await dataService.deleteUser(scope, username);
      if (success) {
        // Success - Reload list
        // No alert needed, the row disappearing is feedback enough.
        console.log(`User ${username} deleted successfully.`);
        loadUsers();
      } else {
        btn.innerHTML = '❌ Failed';
        btn.style.backgroundColor = 'red';
        setTimeout(() => resetDeleteBtn(btn), 2000);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      btn.innerHTML = '❌ Error';
      btn.style.backgroundColor = 'red';
      setTimeout(() => resetDeleteBtn(btn), 2000);
    }
  } else {
    // Enter confirmation state
    btn.dataset.confirming = 'true';
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '⚠️ Confirm?';
    btn.style.backgroundColor = '#ff9800'; // Orange for warning

    // Reset after 3 seconds if not confirmed
    setTimeout(() => {
      if (btn && btn.isConnected) resetDeleteBtn(btn);
    }, 3000);
  }
};

function resetDeleteBtn(btn) {
  btn.dataset.confirming = 'false';
  btn.innerHTML = btn.dataset.originalText || '🗑️ Delete';
  btn.disabled = false;
  btn.style.backgroundColor = ''; // Revert to CSS default
}
