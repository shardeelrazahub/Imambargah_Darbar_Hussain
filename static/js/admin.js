/* ==========================================================================
   MARKAZI IMAM BARGAH DARBAR IMAM HUSSAIN (A.S.) DARBELLO - ADMIN PORTAL JS
   ========================================================================== */

let currentAdminUser = null;
let activeAdminTab = 'overview';
let adminEvents = [];
let adminAnnouncements = [];
let adminGallery = [];
let adminCategories = [];
let adminMedia = [];
let adminSocial = [];
let adminMessages = [];
let adminUsersList = [];

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errBox = document.getElementById('login-error-alert');
  errBox.style.display = 'none';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('admin_token', data.token);
      currentAdminUser = data.user;
      showToast("Welcome back, " + currentAdminUser.name, "success");
      window.location.hash = '#admin-dashboard';
      showAdminDashboard();
    } else {
      errBox.innerText = data.error || "Login failed.";
      errBox.style.display = 'block';
    }
  } catch (err) {
    errBox.innerText = "Connection error. Failed to reach server.";
    errBox.style.display = 'block';
  }
}

async function checkAdminDashboardAuth() {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    showAdminLogin();
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      currentAdminUser = data.user;
      showAdminDashboard();
    } else {
      localStorage.removeItem('admin_token');
      showAdminLogin();
    }
  } catch (err) {
    showAdminLogin();
  }
}

function showAdminDashboard() {
  window.location.hash = '#admin-dashboard';
  document.getElementById('public-app').style.display = 'none';
  document.getElementById('admin-login-view').style.display = 'none';
  document.getElementById('admin-dashboard-view').style.display = 'flex';

  if (currentAdminUser) {
    document.getElementById('admin-user-name').innerText = currentAdminUser.name;
    document.getElementById('admin-user-role-badge').innerText = currentAdminUser.role.replace('_', ' ');
    const topAvatar = document.getElementById('admin-topbar-avatar');
    if (topAvatar) topAvatar.src = currentAdminUser.avatar_url || '/static/images/logo.png';

    // Hide users tab for Content Admin
    const usersTab = document.getElementById('sidebar-item-users');
    if (usersTab) usersTab.style.display = currentAdminUser.role === 'SUPER_ADMIN' ? 'block' : 'none';
  }

  switchAdminTab(activeAdminTab);
}

async function handleAdminLogout() {
  const token = localStorage.getItem('admin_token');
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { }
  }
  localStorage.removeItem('admin_token');
  currentAdminUser = null;
  showToast("Signed out successfully.", "success");
  showPublicSite();
}

function getAdminHeaders() {
  const token = localStorage.getItem('admin_token') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

async function switchAdminTab(tabName) {
  activeAdminTab = tabName;
  document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));

  const activeLink = document.querySelector(`.sidebar-link[onclick="switchAdminTab('${tabName}')"]`);
  if (activeLink) activeLink.classList.add('active');

  const contentArea = document.getElementById('admin-content-area');
  const titleEl = document.getElementById('admin-page-title');

  switch (tabName) {
    case 'overview':
      titleEl.innerText = 'Dashboard Overview';
      renderOverviewTab(contentArea);
      break;
    case 'settings':
      titleEl.innerText = 'Website Settings & Details';
      renderSettingsTab(contentArea);
      break;
    case 'pages':
      titleEl.innerText = 'Editable Pages Content (Home, About, Community)';
      renderPagesTab(contentArea);
      break;
    case 'events':
      titleEl.innerText = 'Events & Majalis Management';
      renderEventsTab(contentArea);
      break;
    case 'announcements':
      titleEl.innerText = 'Announcements Management';
      renderAnnouncementsTab(contentArea);
      break;
    case 'gallery':
      titleEl.innerText = 'Photo Gallery & Category Manager';
      renderGalleryTab(contentArea);
      break;
    case 'media':
      titleEl.innerText = 'Media Center Manager';
      renderMediaTab(contentArea);
      break;
    case 'social':
      titleEl.innerText = 'Social Links Management';
      renderSocialTab(contentArea);
      break;
    case 'inbox':
      titleEl.innerText = 'Contact Messages Inbox';
      renderInboxTab(contentArea);
      break;
    case 'users':
      titleEl.innerText = 'Admin Users & Role Access';
      renderUsersTab(contentArea);
      break;
    case 'profile':
      titleEl.innerText = 'My Admin Profile & Security Settings';
      renderProfileTab(contentArea);
      break;
  }
}

// --- TAB 1: OVERVIEW ---
async function renderOverviewTab(container) {
  container.innerHTML = `<div style="text-align:center; padding:3rem;"><i class="ri-loader-4-line ri-spin" style="font-size:2rem; color:var(--primary);"></i> Loading stats...</div>`;

  try {
    const res = await fetch('/api/admin/dashboard_stats', { headers: getAdminHeaders() });
    const stats = await res.json();

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon"><i class="ri-calendar-event-line"></i></div>
          <div>
            <div class="stat-num">${stats.total_events || 0}</div>
            <div class="stat-label">Total Events</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:#FEF3C7; color:#92400E;"><i class="ri-time-line"></i></div>
          <div>
            <div class="stat-num">${stats.upcoming_events || 0}</div>
            <div class="stat-label">Upcoming Events</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:#E0E7FF; color:#3730A3;"><i class="ri-image-line"></i></div>
          <div>
            <div class="stat-num">${stats.total_gallery || 0}</div>
            <div class="stat-label">Gallery Photos</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:#DEF7EC; color:#03543F;"><i class="ri-notification-3-line"></i></div>
          <div>
            <div class="stat-num">${stats.total_announcements || 0}</div>
            <div class="stat-label">Announcements</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:#FEE2E2; color:#991B1B;"><i class="ri-mail-unread-line"></i></div>
          <div>
            <div class="stat-num">${stats.unread_messages || 0}</div>
            <div class="stat-label">Unread Messages</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h4 style="color:var(--primary-dark);"><i class="ri-speed-up-line"></i> Quick Shortcuts & Guidance</h4>
        </div>
        <div class="panel-body">
          <p style="margin-bottom:1rem; color:var(--text-muted);">
            From this portal, any changes made to events, photos, announcements, hero titles, or address info are immediately saved in the database and updated on the live website automatically.
          </p>
          <div style="display:flex; gap:1rem; flex-wrap:wrap;">
            <button onclick="switchAdminTab('events')" class="btn btn-primary btn-sm"><i class="ri-add-circle-line"></i> Add New Event</button>
            <button onclick="switchAdminTab('gallery')" class="btn btn-secondary btn-sm" style="color:var(--primary-dark); border-color:var(--primary);"><i class="ri-upload-cloud-line"></i> Upload Gallery Image</button>
            <button onclick="switchAdminTab('announcements')" class="btn btn-secondary btn-sm" style="color:var(--primary-dark); border-color:var(--primary);"><i class="ri-notification-3-line"></i> New Announcement</button>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color:red;">Failed to load dashboard overview stats.</div>`;
  }
}

// --- TAB 2: SETTINGS ---
async function renderSettingsTab(container) {
  const s = siteData ? (siteData.settings || {}) : {};

  container.innerHTML = `
    <!-- 1. THEME & COLOR SCHEME CUSTOMIZER -->
    <div class="panel">
      <div class="panel-header">
        <h4 style="color:var(--primary-dark);"><i class="ri-palette-line"></i> Dynamic Theme & Color Palette</h4>
      </div>
      <div class="panel-body">
        <p style="color:var(--text-muted); margin-bottom:1.2rem;">Customize the primary colors of your website. Changes apply immediately across the entire website!</p>
        
        <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:1.5rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="applyPresetTheme('#0B4D36', '#D4AF37', '#58181A')">🌿 Emerald & Gold (Default)</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="applyPresetTheme('#0F2C59', '#D4AF37', '#1E3A8A')">🔷 Royal Blue & Gold</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="applyPresetTheme('#1F2937', '#D4AF37', '#B91C1C')">🌑 Midnight & Crimson</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="applyPresetTheme('#064E3B', '#F59E0B', '#7C2D12')">🌲 Deep Teal & Amber</button>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1.5rem;">
          <div class="form-group">
            <label class="form-label">Primary Color</label>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <input type="color" id="set-theme-primary-color" value="${s.theme_primary || '#0B4D36'}" onchange="document.getElementById('set-theme-primary').value=this.value" style="width:45px; height:42px; padding:0; border:none; cursor:pointer; border-radius:var(--radius-sm);">
              <input type="text" id="set-theme-primary" class="form-control" value="${s.theme_primary || '#0B4D36'}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Gold Accent Color</label>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <input type="color" id="set-theme-gold-color" value="${s.theme_gold || '#D4AF37'}" onchange="document.getElementById('set-theme-gold').value=this.value" style="width:45px; height:42px; padding:0; border:none; cursor:pointer; border-radius:var(--radius-sm);">
              <input type="text" id="set-theme-gold" class="form-control" value="${s.theme_gold || '#D4AF37'}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Maroon / Highlight Color</label>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <input type="color" id="set-theme-maroon-color" value="${s.theme_maroon || '#58181A'}" onchange="document.getElementById('set-theme-maroon').value=this.value" style="width:45px; height:42px; padding:0; border:none; cursor:pointer; border-radius:var(--radius-sm);">
              <input type="text" id="set-theme-maroon" class="form-control" value="${s.theme_maroon || '#58181A'}">
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. WEBSITE LOGO & PROFILE PICTURE -->
    <div class="panel">
      <div class="panel-header">
        <h4 style="color:var(--primary-dark);"><i class="ri-image-edit-line"></i> Website Profile Picture / Logo</h4>
      </div>
      <div class="panel-body">
        <div style="display:flex; align-items:center; gap:2rem;">
          <img src="${s.logo_url || '/static/images/profile_pic.jpg'}" id="set-logo-preview" style="width:90px; height:90px; border-radius:50%; object-fit:cover; border:3px solid var(--gold);" alt="Site Profile Picture">
          <div style="flex:1;">
            <label class="form-label">Website Logo / Profile Picture URL</label>
            <div style="display:flex; gap:0.5rem;">
              <input type="text" id="set-logo-url" class="form-control" value="${s.logo_url || '/static/images/profile_pic.jpg'}">
              <input type="file" id="set-logo-file" style="display:none;" onchange="handleLogoUpload(event)">
              <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('set-logo-file').click()"><i class="ri-upload-2-line"></i> Upload Picture</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. EDITABLE SECTION HEADINGS & BRAND NAMES -->
    <div class="panel">
      <div class="panel-header">
        <h4 style="color:var(--primary-dark);"><i class="ri-t-box-line"></i> Editable Heading Names & Brand Titles</h4>
        <button onclick="saveWebsiteSettings()" class="btn btn-primary btn-sm"><i class="ri-save-line"></i> Save All Settings</button>
      </div>
      <div class="panel-body">
        <form id="settings-form">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div class="form-group">
              <label class="form-label">English Website Name</label>
              <input type="text" id="set-site-name-en" class="form-control" value="${s.site_name_en || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Urdu Website Name (عنوان)</label>
              <input type="text" id="set-site-name-ur" class="form-control urdu-font" value="${s.site_name_ur || ''}">
            </div>

            <div class="form-group">
              <label class="form-label">English Subtitle</label>
              <input type="text" id="set-site-sub-en" class="form-control" value="${s.site_subtitle_en || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Urdu Subtitle</label>
              <input type="text" id="set-site-sub-ur" class="form-control urdu-font" value="${s.site_subtitle_ur || ''}">
            </div>

            <!-- Section Headings -->
            <div class="form-group">
              <label class="form-label">Events Section Heading (EN)</label>
              <input type="text" id="set-heading-events-en" class="form-control" value="${s.heading_events_en || 'Upcoming & Past Events'}">
            </div>
            <div class="form-group">
              <label class="form-label">Events Section Heading (UR)</label>
              <input type="text" id="set-heading-events-ur" class="form-control urdu-font" value="${s.heading_events_ur || 'مجالس و مذہبی پروگرامات'}">
            </div>

            <div class="form-group">
              <label class="form-label">Photo Gallery Heading (EN)</label>
              <input type="text" id="set-heading-gallery-en" class="form-control" value="${s.heading_gallery_en || 'Photo Gallery'}">
            </div>
            <div class="form-group">
              <label class="form-label">Photo Gallery Heading (UR)</label>
              <input type="text" id="set-heading-gallery-ur" class="form-control urdu-font" value="${s.heading_gallery_ur || 'فوٹو گیلری'}">
            </div>

            <div class="form-group">
              <label class="form-label">Announcements Heading (EN)</label>
              <input type="text" id="set-heading-announcements-en" class="form-control" value="${s.heading_announcements_en || 'Announcements'}">
            </div>
            <div class="form-group">
              <label class="form-label">Announcements Heading (UR)</label>
              <input type="text" id="set-heading-announcements-ur" class="form-control urdu-font" value="${s.heading_announcements_ur || 'اہم اعلانات'}">
            </div>

            <div class="form-group">
              <label class="form-label">Location Heading (EN)</label>
              <input type="text" id="set-heading-location-en" class="form-control" value="${s.heading_location_en || 'Imam Bargah Location'}">
            </div>
            <div class="form-group">
              <label class="form-label">Location Heading (UR)</label>
              <input type="text" id="set-heading-location-ur" class="form-control urdu-font" value="${s.heading_location_ur || 'امام بارگاہ کا مقام'}">
            </div>

            <div class="form-group">
              <label class="form-label">Contact Heading (EN)</label>
              <input type="text" id="set-heading-contact-en" class="form-control" value="${s.heading_contact_en || 'Contact & Official Profiles'}">
            </div>
            <div class="form-group">
              <label class="form-label">Contact Heading (UR)</label>
              <input type="text" id="set-heading-contact-ur" class="form-control urdu-font" value="${s.heading_contact_ur || 'رابطہ و سرکاری پروفائلز'}">
            </div>

            <div class="form-group">
              <label class="form-label">English Address</label>
              <input type="text" id="set-address-en" class="form-control" value="${s.address_en || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Urdu Address</label>
              <input type="text" id="set-address-ur" class="form-control urdu-font" value="${s.address_ur || ''}">
            </div>

            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="text" id="set-phone" class="form-control" value="${s.phone || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="set-email" class="form-control" value="${s.email || ''}">
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">Google Maps Embed URL (iframe src)</label>
              <input type="text" id="set-map-embed" class="form-control" value="${s.map_embed_url || ''}">
            </div>
            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">SEO Page Title</label>
              <input type="text" id="set-seo-title" class="form-control" value="${s.seo_title || ''}">
            </div>
            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">SEO Meta Description</label>
              <textarea id="set-seo-desc" class="form-control">${s.seo_description || ''}</textarea>
            </div>
          </div>

          <div style="margin-top:1.5rem; text-align:right;">
            <button type="button" onclick="saveWebsiteSettings()" class="btn btn-primary"><i class="ri-save-line"></i> Save Website Settings</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function applyPresetTheme(primary, gold, maroon) {
  document.getElementById('set-theme-primary').value = primary;
  document.getElementById('set-theme-primary-color').value = primary;
  document.getElementById('set-theme-gold').value = gold;
  document.getElementById('set-theme-gold-color').value = gold;
  document.getElementById('set-theme-maroon').value = maroon;
  document.getElementById('set-theme-maroon-color').value = maroon;

  document.documentElement.style.setProperty('--primary', primary);
  document.documentElement.style.setProperty('--gold', gold);
  document.documentElement.style.setProperty('--maroon', maroon);

  showToast("Theme colors applied! Click 'Save Website Settings' to save permanently.", "success");
}

async function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('set-logo-url').value = data.url;
      document.getElementById('set-logo-preview').src = data.url;
      showToast("Logo picture uploaded successfully!", "success");
    } else {
      showToast(data.error || "Upload failed.", "error");
    }
  } catch (err) { showToast("Upload error.", "error"); }
}

async function saveWebsiteSettings() {
  const data = {
    site_name_en: document.getElementById('set-site-name-en').value,
    site_name_ur: document.getElementById('set-site-name-ur').value,
    site_subtitle_en: document.getElementById('set-site-sub-en').value,
    site_subtitle_ur: document.getElementById('set-site-sub-ur').value,
    theme_primary: document.getElementById('set-theme-primary').value,
    theme_gold: document.getElementById('set-theme-gold').value,
    theme_maroon: document.getElementById('set-theme-maroon').value,
    logo_url: document.getElementById('set-logo-url').value,
    heading_events_en: document.getElementById('set-heading-events-en').value,
    heading_events_ur: document.getElementById('set-heading-events-ur').value,
    heading_gallery_en: document.getElementById('set-heading-gallery-en').value,
    heading_gallery_ur: document.getElementById('set-heading-gallery-ur').value,
    heading_announcements_en: document.getElementById('set-heading-announcements-en').value,
    heading_announcements_ur: document.getElementById('set-heading-announcements-ur').value,
    heading_location_en: document.getElementById('set-heading-location-en').value,
    heading_location_ur: document.getElementById('set-heading-location-ur').value,
    heading_contact_en: document.getElementById('set-heading-contact-en').value,
    heading_contact_ur: document.getElementById('set-heading-contact-ur').value,
    address_en: document.getElementById('set-address-en').value,
    address_ur: document.getElementById('set-address-ur').value,
    phone: document.getElementById('set-phone').value,
    email: document.getElementById('set-email').value,
    map_embed_url: document.getElementById('set-map-embed').value,
    seo_title: document.getElementById('set-seo-title').value,
    seo_description: document.getElementById('set-seo-desc').value
  };

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(data)
    });
    if (res.ok) {
      showToast("Theme, Profile Pic, and Heading Settings saved!", "success");
      await fetchPublicData();
    } else {
      showToast("Failed to save settings.", "error");
    }
  } catch (err) {
    showToast("Error connecting to server.", "error");
  }
}

// --- TAB 3: PAGES ---
function renderPagesTab(container) {
  const p = siteData ? (siteData.pages || {}) : {};
  const home = p.home || {};
  const about = p.about || {};
  const comm = p.community || {};

  container.innerHTML = `
    <!-- Home Hero Page -->
    <div class="panel">
      <div class="panel-header">
        <h4 style="color:var(--primary-dark);"><i class="ri-home-4-line"></i> Editable Home Hero Section</h4>
        <button onclick="savePageContent('home')" class="btn btn-primary btn-sm"><i class="ri-save-line"></i> Save Hero Section</button>
      </div>
      <div class="panel-body">
        <form id="page-home-form">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div class="form-group">
              <label class="form-label">English Hero Title</label>
              <input type="text" id="home-title-en" class="form-control" value="${home.title_en || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Urdu Hero Title (عنوان)</label>
              <input type="text" id="home-title-ur" class="form-control urdu-font" value="${home.title_ur || ''}">
            </div>

            <div class="form-group">
              <label class="form-label">English Subtitle / Intro</label>
              <textarea id="home-sub-en" class="form-control">${home.subtitle_en || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Urdu Subtitle / Intro</label>
              <textarea id="home-sub-ur" class="form-control urdu-font">${home.subtitle_ur || ''}</textarea>
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">Hero Background Image URL</label>
              <div style="display:flex; gap:0.5rem;">
                <input type="text" id="home-img-url" class="form-control" value="${home.image_url || ''}">
                <input type="file" id="home-img-file" style="display:none;" onchange="handleFileUpload('home-img-file', 'home-img-url')">
                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('home-img-file').click()"><i class="ri-upload-2-line"></i> Upload Image</button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- About Page -->
    <div class="panel">
      <div class="panel-header">
        <h4 style="color:var(--primary-dark);"><i class="ri-information-line"></i> Editable About Page Content</h4>
        <button onclick="savePageContent('about')" class="btn btn-primary btn-sm"><i class="ri-save-line"></i> Save About Page</button>
      </div>
      <div class="panel-body">
        <form id="page-about-form">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div class="form-group">
              <label class="form-label">English Heading</label>
              <input type="text" id="about-title-en" class="form-control" value="${about.title_en || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Urdu Heading</label>
              <input type="text" id="about-title-ur" class="form-control urdu-font" value="${about.title_ur || ''}">
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">English Content Paragraphs</label>
              <textarea id="about-content-en" class="form-control" style="min-height:120px;">${about.content_en || ''}</textarea>
            </div>
            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">Urdu Content Paragraphs</label>
              <textarea id="about-content-ur" class="form-control urdu-font" style="min-height:120px;">${about.content_ur || ''}</textarea>
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">About Section Photo URL</label>
              <div style="display:flex; gap:0.5rem;">
                <input type="text" id="about-img-url" class="form-control" value="${about.image_url || ''}">
                <input type="file" id="about-img-file" style="display:none;" onchange="handleFileUpload('about-img-file', 'about-img-url')">
                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('about-img-file').click()"><i class="ri-upload-2-line"></i> Upload Image</button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Community Page -->
    <div class="panel">
      <div class="panel-header">
        <h4 style="color:var(--primary-dark);"><i class="ri-group-line"></i> Editable Community Role & Services</h4>
        <button onclick="savePageContent('community')" class="btn btn-primary btn-sm"><i class="ri-save-line"></i> Save Community</button>
      </div>
      <div class="panel-body">
        <form id="page-community-form">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div class="form-group">
              <label class="form-label">English Title</label>
              <input type="text" id="community-title-en" class="form-control" value="${comm.title_en || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Urdu Title</label>
              <input type="text" id="community-title-ur" class="form-control urdu-font" value="${comm.title_ur || ''}">
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">English Description</label>
              <textarea id="community-content-en" class="form-control">${comm.content_en || ''}</textarea>
            </div>
            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">Urdu Description</label>
              <textarea id="community-content-ur" class="form-control urdu-font">${comm.content_ur || ''}</textarea>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function savePageContent(pageKey) {
  let data = {};
  if (pageKey === 'home') {
    data = {
      title_en: document.getElementById('home-title-en').value,
      title_ur: document.getElementById('home-title-ur').value,
      subtitle_en: document.getElementById('home-sub-en').value,
      subtitle_ur: document.getElementById('home-sub-ur').value,
      image_url: document.getElementById('home-img-url').value
    };
  } else if (pageKey === 'about') {
    data = {
      title_en: document.getElementById('about-title-en').value,
      title_ur: document.getElementById('about-title-ur').value,
      content_en: document.getElementById('about-content-en').value,
      content_ur: document.getElementById('about-content-ur').value,
      image_url: document.getElementById('about-img-url').value
    };
  } else if (pageKey === 'community') {
    data = {
      title_en: document.getElementById('community-title-en').value,
      title_ur: document.getElementById('community-title-ur').value,
      content_en: document.getElementById('community-content-en').value,
      content_ur: document.getElementById('community-content-ur').value
    };
  }

  try {
    const res = await fetch(`/api/admin/pages/${pageKey}`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify(data)
    });
    if (res.ok) {
      showToast(`Page '${pageKey}' saved successfully!`, "success");
      await fetchPublicData();
    } else {
      showToast("Failed to save page content.", "error");
    }
  } catch (err) {
    showToast("Error connecting to server.", "error");
  }
}

// --- TAB 4: EVENTS CRUD ---
async function renderEventsTab(container) {
  container.innerHTML = `<div style="text-align:center; padding:2rem;"><i class="ri-loader-4-line ri-spin" style="font-size:2rem; color:var(--primary);"></i> Loading events...</div>`;

  try {
    const res = await fetch('/api/admin/events', { headers: getAdminHeaders() });
    adminEvents = await res.json();

    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h4 style="color:var(--primary-dark);"><i class="ri-calendar-event-line"></i> Events & Majalis Schedule</h4>
          <button onclick="openEventModal()" class="btn btn-primary btn-sm"><i class="ri-add-line"></i> Create New Event</button>
        </div>
        <div class="panel-body" style="padding:0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title (EN / UR)</th>
                <th>Date & Time</th>
                <th>Speaker</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${adminEvents.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding:2rem;">No events found. Click 'Create New Event' to add one.</td></tr>` : ''}
              ${adminEvents.map(e => `
                <tr>
                  <td><img src="${e.image_url || '/static/images/hero_architecture.jpg'}" class="table-img"></td>
                  <td>
                    <strong>${e.title_en}</strong><br>
                    <span class="urdu-font" style="font-size:0.9rem; color:var(--gold-hover);">${e.title_ur}</span>
                  </td>
                  <td>${e.event_date} ${e.start_time ? '(' + e.start_time + ')' : ''}</td>
                  <td>${e.speaker_en || '-'}</td>
                  <td><span class="badge ${e.is_published ? 'badge-success' : 'badge-warning'}">${e.is_published ? 'Published' : 'Draft'}</span></td>
                  <td>
                    <button onclick="editEventModal(${e.id})" class="btn btn-outline btn-sm" title="Edit"><i class="ri-edit-line"></i></button>
                    <button onclick="deleteEvent(${e.id})" class="btn btn-danger btn-sm" title="Delete"><i class="ri-delete-bin-line"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Event Modal Container -->
      <div id="admin-event-modal" class="modal-backdrop">
        <div class="modal-content-wrap" style="padding:2rem; max-width:700px;">
          <button class="modal-close" onclick="closeEventModal()">&times;</button>
          <h3 id="event-modal-title" style="margin-bottom:1.5rem; color:var(--primary-dark);">Add New Event</h3>
          
          <form id="event-form" onsubmit="saveEventForm(event)">
            <input type="hidden" id="evt-id">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label class="form-label">English Title *</label>
                <input type="text" id="evt-title-en" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label">Urdu Title *</label>
                <input type="text" id="evt-title-ur" class="form-control urdu-font" required>
              </div>

              <div class="form-group">
                <label class="form-label">Event Date *</label>
                <input type="date" id="evt-date" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label">Start Time</label>
                <input type="time" id="evt-start" class="form-control">
              </div>

              <div class="form-group">
                <label class="form-label">Speaker / Zakir (EN)</label>
                <input type="text" id="evt-speaker-en" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Speaker / Zakir (UR)</label>
                <input type="text" id="evt-speaker-ur" class="form-control urdu-font">
              </div>

              <div class="form-group" style="grid-column:1/-1;">
                <label class="form-label">English Description</label>
                <textarea id="evt-desc-en" class="form-control"></textarea>
              </div>
              <div class="form-group" style="grid-column:1/-1;">
                <label class="form-label">Urdu Description</label>
                <textarea id="evt-desc-ur" class="form-control urdu-font"></textarea>
              </div>

              <div class="form-group" style="grid-column:1/-1;">
                <label class="form-label">Cover Image URL</label>
                <div style="display:flex; gap:0.5rem;">
                  <input type="text" id="evt-img-url" class="form-control">
                  <input type="file" id="evt-img-file" style="display:none;" onchange="handleFileUpload('evt-img-file', 'evt-img-url')">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('evt-img-file').click()">Upload</button>
                </div>
              </div>

              <div class="form-group" style="grid-column:1/-1;">
                <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                  <input type="checkbox" id="evt-published" checked>
                  <strong>Publish immediately on public website</strong>
                </label>
              </div>
            </div>

            <div style="margin-top:1.5rem; text-align:right;">
              <button type="submit" class="btn btn-primary"><i class="ri-save-line"></i> Save Event</button>
            </div>
          </form>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color:red;">Failed to load events.</div>`;
  }
}

function openEventModal() {
  document.getElementById('event-modal-title').innerText = 'Add New Event';
  document.getElementById('evt-id').value = '';
  document.getElementById('event-form').reset();
  document.getElementById('admin-event-modal').classList.add('active');
}

function closeEventModal() {
  document.getElementById('admin-event-modal').classList.remove('active');
}

function editEventModal(eventId) {
  const e = adminEvents.find(item => item.id === eventId);
  if (!e) return;

  document.getElementById('event-modal-title').innerText = 'Edit Event';
  document.getElementById('evt-id').value = e.id;
  document.getElementById('evt-title-en').value = e.title_en;
  document.getElementById('evt-title-ur').value = e.title_ur;
  document.getElementById('evt-date').value = e.event_date;
  document.getElementById('evt-start').value = e.start_time || '';
  document.getElementById('evt-speaker-en').value = e.speaker_en || '';
  document.getElementById('evt-speaker-ur').value = e.speaker_ur || '';
  document.getElementById('evt-desc-en').value = e.description_en || '';
  document.getElementById('evt-desc-ur').value = e.description_ur || '';
  document.getElementById('evt-img-url').value = e.image_url || '';
  document.getElementById('evt-published').checked = !!e.is_published;

  document.getElementById('admin-event-modal').classList.add('active');
}

async function saveEventForm(e) {
  e.preventDefault();
  const id = document.getElementById('evt-id').value;
  const data = {
    title_en: document.getElementById('evt-title-en').value,
    title_ur: document.getElementById('evt-title-ur').value,
    event_date: document.getElementById('evt-date').value,
    start_time: document.getElementById('evt-start').value,
    speaker_en: document.getElementById('evt-speaker-en').value,
    speaker_ur: document.getElementById('evt-speaker-ur').value,
    description_en: document.getElementById('evt-desc-en').value,
    description_ur: document.getElementById('evt-desc-ur').value,
    image_url: document.getElementById('evt-img-url').value,
    is_published: document.getElementById('evt-published').checked
  };

  const url = id ? `/api/admin/events/${id}` : '/api/admin/events';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: getAdminHeaders(),
      body: JSON.stringify(data)
    });
    if (res.ok) {
      showToast("Event saved successfully!", "success");
      closeEventModal();
      renderEventsTab(document.getElementById('admin-content-area'));
      await fetchPublicData();
    } else {
      showToast("Failed to save event.", "error");
    }
  } catch (err) {
    showToast("Error connecting to server.", "error");
  }
}

async function deleteEvent(id) {
  if (!confirm("Are you sure you want to delete this event?")) return;
  try {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'DELETE',
      headers: getAdminHeaders()
    });
    if (res.ok) {
      showToast("Event deleted.", "success");
      renderEventsTab(document.getElementById('admin-content-area'));
      await fetchPublicData();
    }
  } catch (e) { showToast("Delete failed.", "error"); }
}

// --- TAB 5: ANNOUNCEMENTS ---
async function renderAnnouncementsTab(container) {
  container.innerHTML = `<div style="text-align:center; padding:2rem;"><i class="ri-loader-4-line ri-spin" style="font-size:2rem; color:var(--primary);"></i> Loading announcements...</div>`;

  try {
    const res = await fetch('/api/admin/announcements', { headers: getAdminHeaders() });
    adminAnnouncements = await res.json();

    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h4 style="color:var(--primary-dark);"><i class="ri-notification-3-line"></i> Announcements & Ticker Banner</h4>
          <button onclick="openAnnouncementModal()" class="btn btn-primary btn-sm"><i class="ri-add-line"></i> Create Announcement</button>
        </div>
        <div class="panel-body" style="padding:0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Title (EN / UR)</th>
                <th>Content Snippet</th>
                <th>Banner Alert</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${adminAnnouncements.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:2rem;">No announcements.</td></tr>` : ''}
              ${adminAnnouncements.map(a => `
                <tr>
                  <td>
                    <strong>${a.title_en}</strong><br>
                    <span class="urdu-font" style="color:var(--gold-hover);">${a.title_ur}</span>
                  </td>
                  <td style="max-width:300px;">${a.content_en || a.content_ur || ''}</td>
                  <td>${a.is_banner ? '<span class="badge badge-success">Top Ticker</span>' : 'Standard'}</td>
                  <td><span class="badge ${a.is_published ? 'badge-success' : 'badge-warning'}">${a.is_published ? 'Published' : 'Draft'}</span></td>
                  <td>
                    <button onclick="deleteAnnouncement(${a.id})" class="btn btn-danger btn-sm"><i class="ri-delete-bin-line"></i> Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal -->
      <div id="admin-announcement-modal" class="modal-backdrop">
        <div class="modal-content-wrap" style="padding:2rem; max-width:600px;">
          <button class="modal-close" onclick="closeAnnouncementModal()">&times;</button>
          <h3 style="margin-bottom:1.5rem; color:var(--primary-dark);">Add Announcement</h3>
          <form onsubmit="saveAnnouncementForm(event)">
            <div class="form-group">
              <label class="form-label">Title (EN) *</label>
              <input type="text" id="anc-title-en" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">Title (UR) *</label>
              <input type="text" id="anc-title-ur" class="form-control urdu-font" required>
            </div>
            <div class="form-group">
              <label class="form-label">Content (EN)</label>
              <textarea id="anc-content-en" class="form-control"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Content (UR)</label>
              <textarea id="anc-content-ur" class="form-control urdu-font"></textarea>
            </div>
            <div class="form-group">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="anc-banner">
                <strong>Show in top announcement marquee banner</strong>
              </label>
            </div>
            <div style="margin-top:1.5rem; text-align:right;">
              <button type="submit" class="btn btn-primary"><i class="ri-save-line"></i> Save Announcement</button>
            </div>
          </form>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color:red;">Failed to load announcements.</div>`;
  }
}

function openAnnouncementModal() { document.getElementById('admin-announcement-modal').classList.add('active'); }
function closeAnnouncementModal() { document.getElementById('admin-announcement-modal').classList.remove('active'); }

async function saveAnnouncementForm(e) {
  e.preventDefault();
  const data = {
    title_en: document.getElementById('anc-title-en').value,
    title_ur: document.getElementById('anc-title-ur').value,
    content_en: document.getElementById('anc-content-en').value,
    content_ur: document.getElementById('anc-content-ur').value,
    is_banner: document.getElementById('anc-banner').checked,
    is_published: true
  };

  try {
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(data)
    });
    if (res.ok) {
      showToast("Announcement created!", "success");
      closeAnnouncementModal();
      renderAnnouncementsTab(document.getElementById('admin-content-area'));
      await fetchPublicData();
    }
  } catch (err) { showToast("Save failed.", "error"); }
}

async function deleteAnnouncement(id) {
  if (!confirm("Delete announcement?")) return;
  await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE', headers: getAdminHeaders() });
  showToast("Deleted announcement.", "success");
  renderAnnouncementsTab(document.getElementById('admin-content-area'));
  await fetchPublicData();
}

// --- TAB 6: GALLERY & CATEGORIES ---
async function renderGalleryTab(container) {
  container.innerHTML = `<div style="text-align:center; padding:2rem;"><i class="ri-loader-4-line ri-spin" style="font-size:2rem; color:var(--primary);"></i> Loading gallery...</div>`;

  try {
    const [resG, resC] = await Promise.all([
      fetch('/api/admin/gallery', { headers: getAdminHeaders() }),
      fetch('/api/admin/categories', { headers: getAdminHeaders() })
    ]);
    adminGallery = await resG.json();
    adminCategories = await resC.json();

    container.innerHTML = `
      <div style="margin-bottom:2rem;">
        <div class="panel">
          <div class="panel-header">
            <h4 style="color:var(--primary-dark);"><i class="ri-upload-cloud-line"></i> Quick Image Upload</h4>
          </div>
          <div class="panel-body">
            <div class="upload-dropzone" onclick="document.getElementById('gallery-upload-file').click()">
              <i class="ri-image-add-line" style="font-size:2.5rem; color:var(--gold);"></i>
              <h4 style="margin-top:0.5rem; color:var(--primary-dark);">Click to select and upload a photo</h4>
              <p style="font-size:0.85rem; color:var(--text-muted);">Supports PNG, JPG, JPEG, WEBP (Max 16MB)</p>
              <input type="file" id="gallery-upload-file" style="display:none;" onchange="handleGalleryUpload(event)">
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h4 style="color:var(--primary-dark);"><i class="ri-gallery-line"></i> Manage Gallery Photos</h4>
        </div>
        <div class="panel-body" style="padding:0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Caption (EN / UR)</th>
                <th>Category</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${adminGallery.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:2rem;">No gallery images uploaded yet.</td></tr>` : ''}
              ${adminGallery.map(img => `
                <tr>
                  <td><img src="${img.image_url}" class="table-img"></td>
                  <td>
                    <strong>${img.caption_en || 'Untitled'}</strong><br>
                    <span class="urdu-font" style="color:var(--gold-hover);">${img.caption_ur || ''}</span>
                  </td>
                  <td>${img.category_name_en || 'Uncategorized'}</td>
                  <td>${img.display_order || 0}</td>
                  <td>
                    <button onclick="deleteGalleryImage(${img.id})" class="btn btn-danger btn-sm"><i class="ri-delete-bin-line"></i> Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color:red;">Failed to load gallery content.</div>`;
  }
}

async function handleGalleryUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
      body: formData
    });
    const data = await res.json();

    if (res.ok) {
      // Add to gallery DB
      const caption = prompt("Enter caption for this image (or leave blank):", file.name) || '';
      await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          category_id: adminCategories[0] ? adminCategories[0].id : null,
          image_url: data.url,
          caption_en: caption,
          caption_ur: caption
        })
      });
      showToast("Gallery image uploaded successfully!", "success");
      renderGalleryTab(document.getElementById('admin-content-area'));
      await fetchPublicData();
    } else {
      showToast(data.error || "Upload failed.", "error");
    }
  } catch (err) { showToast("Upload error.", "error"); }
}

async function deleteGalleryImage(id) {
  if (!confirm("Delete this gallery image?")) return;
  await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE', headers: getAdminHeaders() });
  showToast("Image deleted.", "success");
  renderGalleryTab(document.getElementById('admin-content-area'));
  await fetchPublicData();
}

// --- TAB 7: MEDIA ---
async function renderMediaTab(container) {
  const res = await fetch('/api/admin/media', { headers: getAdminHeaders() });
  adminMedia = await res.json();

  container.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h4 style="color:var(--primary-dark);"><i class="ri-video-line"></i> Media Links (YouTube, Facebook, Instagram)</h4>
        <button onclick="openMediaModal()" class="btn btn-primary btn-sm"><i class="ri-add-line"></i> Add Media Link</button>
      </div>
      <div class="panel-body" style="padding:0;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Platform</th>
              <th>Media URL</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${adminMedia.map(m => `
              <tr>
                <td><strong>${m.title_en}</strong></td>
                <td><span class="badge badge-success">${m.media_type}</span></td>
                <td><a href="${m.media_url}" target="_blank" style="color:var(--primary);">${m.media_url}</a></td>
                <td>
                  <button onclick="deleteMediaItem(${m.id})" class="btn btn-danger btn-sm"><i class="ri-delete-bin-line"></i> Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Media Modal -->
    <div id="admin-media-modal" class="modal-backdrop">
      <div class="modal-content-wrap" style="padding:2rem; max-width:600px;">
        <button class="modal-close" onclick="closeMediaModal()">&times;</button>
        <h3 style="margin-bottom:1.5rem; color:var(--primary-dark);">Add Media Link</h3>
        <form onsubmit="saveMediaForm(event)">
          <div class="form-group">
            <label class="form-label">Title (EN) *</label>
            <input type="text" id="med-title-en" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label">Title (UR) *</label>
            <input type="text" id="med-title-ur" class="form-control urdu-font" required>
          </div>
          <div class="form-group">
            <label class="form-label">Platform Type</label>
            <select id="med-type" class="form-control">
              <option value="YOUTUBE">YouTube Video</option>
              <option value="FACEBOOK">Facebook Link/Video</option>
              <option value="INSTAGRAM">Instagram Post</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Media / Video URL *</label>
            <input type="url" id="med-url" class="form-control" placeholder="https://..." required>
          </div>
          <div style="margin-top:1.5rem; text-align:right;">
            <button type="submit" class="btn btn-primary"><i class="ri-save-line"></i> Save Media</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function openMediaModal() { document.getElementById('admin-media-modal').classList.add('active'); }
function closeMediaModal() { document.getElementById('admin-media-modal').classList.remove('active'); }

async function saveMediaForm(e) {
  e.preventDefault();
  const data = {
    title_en: document.getElementById('med-title-en').value,
    title_ur: document.getElementById('med-title-ur').value,
    media_type: document.getElementById('med-type').value,
    media_url: document.getElementById('med-url').value,
    is_published: true
  };

  await fetch('/api/admin/media', {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(data)
  });
  showToast("Media added!", "success");
  closeMediaModal();
  renderMediaTab(document.getElementById('admin-content-area'));
  await fetchPublicData();
}

async function deleteMediaItem(id) {
  if (!confirm("Delete media link?")) return;
  await fetch(`/api/admin/media/${id}`, { method: 'DELETE', headers: getAdminHeaders() });
  showToast("Media link deleted.", "success");
  renderMediaTab(document.getElementById('admin-content-area'));
  await fetchPublicData();
}

// --- TAB 8: SOCIAL LINKS ---
async function renderSocialTab(container) {
  const res = await fetch('/api/admin/social', { headers: getAdminHeaders() });
  adminSocial = await res.json();

  container.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h4 style="color:var(--primary-dark);"><i class="ri-share-line"></i> Official Social Media Profiles</h4>
      </div>
      <div class="panel-body" style="padding:0;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Profile URL</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${adminSocial.map(s => `
              <tr>
                <td><strong>${s.platform_name_en}</strong></td>
                <td><input type="text" id="social-url-${s.id}" class="form-control" value="${s.url}"></td>
                <td><span class="badge ${s.is_active ? 'badge-success' : 'badge-warning'}">${s.is_active ? 'Active' : 'Hidden'}</span></td>
                <td>
                  <button onclick="updateSocialLink(${s.id})" class="btn btn-primary btn-sm"><i class="ri-save-line"></i> Save Link</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function updateSocialLink(id) {
  const s = adminSocial.find(item => item.id === id);
  if (!s) return;
  const newUrl = document.getElementById(`social-url-${id}`).value;

  await fetch(`/api/admin/social/${id}`, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify({
      platform: s.platform,
      platform_name_en: s.platform_name_en,
      platform_name_ur: s.platform_name_ur,
      url: newUrl,
      is_active: s.is_active
    })
  });
  showToast("Social link updated!", "success");
  await fetchPublicData();
}

// --- TAB 9: INBOX ---
async function renderInboxTab(container) {
  const res = await fetch('/api/admin/messages', { headers: getAdminHeaders() });
  adminMessages = await res.json();

  container.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h4 style="color:var(--primary-dark);"><i class="ri-inbox-line"></i> Contact Form Messages Inbox</h4>
      </div>
      <div class="panel-body" style="padding:0;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Sender</th>
              <th>Contact Info</th>
              <th>Message</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${adminMessages.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:2rem;">Inbox is empty. No messages received yet.</td></tr>` : ''}
            ${adminMessages.map(m => `
              <tr style="${m.is_read ? '' : 'font-weight:bold; background:#FDFBF7;'}">
                <td>${m.name}</td>
                <td>
                  ${m.email ? `<div><i class="ri-mail-line"></i> ${m.email}</div>` : ''}
                  ${m.phone ? `<div><i class="ri-phone-line"></i> ${m.phone}</div>` : ''}
                </td>
                <td style="max-width:300px;">${m.message}</td>
                <td>${m.created_at}</td>
                <td>
                  ${!m.is_read ? `<button onclick="markMessageRead(${m.id})" class="btn btn-outline btn-sm" title="Mark Read"><i class="ri-check-double-line"></i></button>` : ''}
                  <button onclick="deleteMessage(${m.id})" class="btn btn-danger btn-sm" title="Delete"><i class="ri-delete-bin-line"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function markMessageRead(id) {
  await fetch(`/api/admin/messages/${id}/read`, { method: 'PUT', headers: getAdminHeaders() });
  showToast("Marked as read.", "success");
  renderInboxTab(document.getElementById('admin-content-area'));
}

async function deleteMessage(id) {
  if (!confirm("Delete message?")) return;
  await fetch(`/api/admin/messages/${id}`, { method: 'DELETE', headers: getAdminHeaders() });
  showToast("Deleted message.", "success");
  renderInboxTab(document.getElementById('admin-content-area'));
}

// --- TAB 10: USERS (SUPER ADMIN) ---
async function renderUsersTab(container) {
  if (!currentAdminUser || currentAdminUser.role !== 'SUPER_ADMIN') {
    container.innerHTML = `<div style="padding:2rem; color:red;">Super Admin privilege required.</div>`;
    return;
  }

  const res = await fetch('/api/admin/users', { headers: getAdminHeaders() });
  adminUsersList = await res.json();

  container.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h4 style="color:var(--primary-dark);"><i class="ri-user-settings-line"></i> Admin User Accounts</h4>
        <button onclick="openUserModal()" class="btn btn-primary btn-sm"><i class="ri-user-add-line"></i> Create Admin User</button>
      </div>
      <div class="panel-body" style="padding:0;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${adminUsersList.map(u => `
              <tr>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge ${u.role === 'SUPER_ADMIN' ? 'badge-warning' : 'badge-success'}">${u.role}</span></td>
                <td>${u.is_active ? 'Active' : 'Disabled'}</td>
                <td>
                  ${u.id !== currentAdminUser.id ? `<button onclick="deleteAdminUser(${u.id})" class="btn btn-danger btn-sm"><i class="ri-delete-bin-line"></i> Delete</button>` : '(Self)'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- User Modal -->
    <div id="admin-user-modal" class="modal-backdrop">
      <div class="modal-content-wrap" style="padding:2rem; max-width:500px;">
        <button class="modal-close" onclick="closeUserModal()">&times;</button>
        <h3 style="margin-bottom:1.5rem; color:var(--primary-dark);">Add Admin User</h3>
        <form onsubmit="saveUserForm(event)">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" id="usr-name" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input type="email" id="usr-email" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password *</label>
            <input type="password" id="usr-pass" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label">Role</label>
            <select id="usr-role" class="form-control">
              <option value="CONTENT_ADMIN">Content Admin (Pages, Gallery, Events)</option>
              <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
            </select>
          </div>
          <div style="margin-top:1.5rem; text-align:right;">
            <button type="submit" class="btn btn-primary"><i class="ri-save-line"></i> Create Account</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function openUserModal() { document.getElementById('admin-user-modal').classList.add('active'); }
function closeUserModal() { document.getElementById('admin-user-modal').classList.remove('active'); }

async function saveUserForm(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('usr-name').value,
    email: document.getElementById('usr-email').value,
    password: document.getElementById('usr-pass').value,
    role: document.getElementById('usr-role').value
  };

  try {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(data)
    });
    if (res.ok) {
      showToast("Admin account created!", "success");
      closeUserModal();
      renderUsersTab(document.getElementById('admin-content-area'));
    } else {
      const d = await res.json();
      showToast(d.error || "Failed to create account.", "error");
    }
  } catch (err) { showToast("Save failed.", "error"); }
}

async function deleteAdminUser(id) {
  if (!confirm("Delete this admin account?")) return;
  await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: getAdminHeaders() });
  showToast("Account deleted.", "success");
  renderUsersTab(document.getElementById('admin-content-area'));
}

// --- UTILITY HELPER FOR FILE UPLOADS ---
async function handleFileUpload(fileInputId, targetInputId) {
  const fileInput = document.getElementById(fileInputId);
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById(targetInputId).value = data.url;
      showToast("Image uploaded and path updated!", "success");
    } else {
      showToast(data.error || "Upload failed.", "error");
    }
  } catch (err) { showToast("Upload failed.", "error"); }
}

// --- TAB 11: MY PROFILE MANAGEMENT ---
function renderProfileTab(container) {
  const user = currentAdminUser || {};

  container.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h4 style="color:var(--primary-dark);"><i class="ri-user-3-line"></i> Update Profile Picture & Name</h4>
        <button onclick="saveAdminProfile()" class="btn btn-primary btn-sm"><i class="ri-save-line"></i> Save Profile Changes</button>
      </div>
      <div class="panel-body">
        <form id="admin-profile-form" onsubmit="event.preventDefault(); saveAdminProfile();">
          <div style="display:flex; align-items:center; gap:2rem; margin-bottom:2rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border-color);">
            <div style="text-align:center;">
              <img src="${user.avatar_url || '/static/images/logo.png'}" id="profile-avatar-preview" style="width:100px; height:100px; border-radius:50%; object-fit:cover; border:3px solid var(--gold); box-shadow:var(--shadow-md);" alt="Profile Picture">
            </div>
            <div>
              <h4 style="color:var(--primary-dark); margin-bottom:0.4rem;">Profile Picture / Avatar</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.8rem;">Upload a custom image or photo for your admin account profile.</p>
              <div style="display:flex; gap:0.5rem;">
                <input type="file" id="profile-avatar-file" style="display:none;" onchange="handleProfileAvatarUpload(event)">
                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('profile-avatar-file').click()"><i class="ri-upload-2-line"></i> Change Photo</button>
                <input type="hidden" id="prof-avatar-url" value="${user.avatar_url || '/static/images/logo.png'}">
              </div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input type="text" id="prof-name" class="form-control" value="${user.name || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Email Address *</label>
              <input type="email" id="prof-email" class="form-control" value="${user.email || ''}" required>
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">New Password (leave blank to keep current password)</label>
              <input type="password" id="prof-password" class="form-control" placeholder="••••••••">
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function handleProfileAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('prof-avatar-url').value = data.url;
      document.getElementById('profile-avatar-preview').src = data.url;
      showToast("Avatar image uploaded!", "success");
    } else {
      showToast(data.error || "Upload failed.", "error");
    }
  } catch (err) { showToast("Upload error.", "error"); }
}

async function saveAdminProfile() {
  const name = document.getElementById('prof-name').value;
  const email = document.getElementById('prof-email').value;
  const avatar_url = document.getElementById('prof-avatar-url').value;
  const password = document.getElementById('prof-password').value;

  try {
    const res = await fetch('/api/admin/profile', {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify({ name, email, avatar_url, password })
    });
    const data = await res.json();

    if (res.ok) {
      currentAdminUser = data.user;
      document.getElementById('admin-user-name').innerText = currentAdminUser.name;
      const topAvatar = document.getElementById('admin-topbar-avatar');
      if (topAvatar) topAvatar.src = currentAdminUser.avatar_url;

      showToast("Profile updated successfully!", "success");
      document.getElementById('prof-password').value = '';
    } else {
      showToast(data.error || "Failed to update profile.", "error");
    }
  } catch (err) { showToast("Error connecting to server.", "error"); }
}
