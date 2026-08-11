/* ==========================================================================
   MARKAZI IMAM BARGAH DARBAR IMAM HUSSAIN (A.S.) DARBELLO - PUBLIC APP JS
   ========================================================================== */

let currentLang = 'en'; // 'en' or 'ur'
let siteData = null;
let activeEventFilter = 'upcoming';
let activeGalleryCategory = 'all';

// Language Dictionary for UI static text
const i18n = {
  en: {
    nav_home: "Home",
    nav_about: "About",
    nav_events: "Events",
    nav_announcements: "Announcements",
    nav_gallery: "Gallery",
    nav_media: "Media",
    nav_community: "Community",
    nav_location: "Location",
    nav_contact: "Contact",
    explore_btn: "Explore",
    upcoming_events_btn: "Upcoming Events",
    view_location_btn: "View Location",
    about_subtitle: "Spiritual Sanctuary",
    events_subtitle: "Majalis & Programs",
    events_heading: "Upcoming & Past Events",
    announcements_subtitle: "Latest News",
    announcements_heading: "Announcements",
    gallery_subtitle: "Visual Journey",
    gallery_heading: "Photo Gallery",
    media_subtitle: "Videos & Online Links",
    media_heading: "Media Center",
    community_subtitle: "Unity & Support",
    location_subtitle: "Find Us",
    location_heading: "Imam Bargah Location",
    contact_subtitle: "Get in Touch",
    contact_heading: "Contact & Official Profiles",
    form_name: "Your Name *",
    form_email: "Email Address",
    form_phone: "Phone Number",
    form_message: "Your Message *"
  },
  ur: {
    nav_home: "صفحہ اول",
    nav_about: "تعارف",
    nav_events: "مجالس و پروگرامات",
    nav_announcements: "اعلانات",
    nav_gallery: "تصاویری گیلری",
    nav_media: "میڈیا سینٹر",
    nav_community: "کمیونٹی خدمات",
    nav_location: "مقام و راستہ",
    nav_contact: "رابطہ",
    explore_btn: "تعارف دیکھیں",
    upcoming_events_btn: "آئندہ پروگرامات",
    view_location_btn: "مقام دیکھیں",
    about_subtitle: "روحانی مرکز",
    events_subtitle: "مجالس و پروگرامات",
    events_heading: "مجالس و مذہبی پروگرامات",
    announcements_subtitle: "تازہ ترین خبریں",
    announcements_heading: "اہم اعلانات",
    gallery_subtitle: "تصاویری جھلکیاں",
    gallery_heading: "فوٹو گیلری",
    media_subtitle: "ویڈیوز اور آن لائن لنکس",
    media_heading: "میڈیا سینٹر",
    community_subtitle: "باہمی اتحاد و خدمت",
    location_subtitle: "مقام",
    location_heading: "امام بارگاہ کا مقام",
    contact_subtitle: "رابطہ کریں",
    contact_heading: "رابطہ و سرکاری پروفائلز",
    form_name: "آپ کا نام *",
    form_email: "ای میل ایڈریس",
    form_phone: "فون نمبر",
    form_message: "آپ کا پیغام *"
  }
};

document.addEventListener('DOMContentLoaded', () => {
  fetchPublicData();
  setupNavScroll();

  // Check URL hash for admin view
  if (window.location.hash === '#admin-login') {
    showAdminLogin();
  } else if (window.location.hash === '#admin-dashboard') {
    checkAdminDashboardAuth();
  }
});

async function fetchPublicData() {
  try {
    const res = await fetch('/api/public/initial_data');
    if (!res.ok) throw new Error("Failed to load site data.");
    siteData = await res.json();
    renderPublicSite();
  } catch (err) {
    console.error("Error fetching site data:", err);
    showToast("Failed to load website content. Please refresh.", "error");
  }
}

function renderPublicSite() {
  if (!siteData) return;

  const s = siteData.settings || {};
  const p = siteData.pages || {};

  // Dynamic Theme Colors
  if (s.theme_primary) document.documentElement.style.setProperty('--primary', s.theme_primary);
  if (s.theme_gold) document.documentElement.style.setProperty('--gold', s.theme_gold);
  if (s.theme_maroon) document.documentElement.style.setProperty('--maroon', s.theme_maroon);

  // Meta & Favicon
  if (s.seo_title) document.getElementById('meta-title').innerText = s.seo_title;
  if (s.seo_description) document.getElementById('meta-description').content = s.seo_description;
  if (s.seo_keywords) document.getElementById('meta-keywords').content = s.seo_keywords;
  if (s.logo_url) document.getElementById('site-favicon').href = s.logo_url;

  // Header & Brand
  if (s.logo_url) document.getElementById('nav-brand-logo').src = s.logo_url;
  document.getElementById('nav-brand-main').innerText = currentLang === 'ur' ? (s.site_name_ur || s.site_name_en) : (s.site_name_en || 'Markazi Imam Bargah');
  document.getElementById('nav-brand-sub').innerText = currentLang === 'ur' ? (s.site_subtitle_ur || s.site_subtitle_en) : (s.site_subtitle_en || 'Darbello, Sindh, Pakistan');

  // Dynamic Section Headings
  const hEvents = document.getElementById('heading-events');
  if (hEvents) hEvents.innerText = currentLang === 'ur' ? (s.heading_events_ur || 'مجالس و مذہبی پروگرامات') : (s.heading_events_en || 'Upcoming & Past Events');

  const hGallery = document.getElementById('heading-gallery');
  if (hGallery) hGallery.innerText = currentLang === 'ur' ? (s.heading_gallery_ur || 'فوٹو گیلری') : (s.heading_gallery_en || 'Photo Gallery');

  const hAnc = document.getElementById('heading-announcements');
  if (hAnc) hAnc.innerText = currentLang === 'ur' ? (s.heading_announcements_ur || 'اہم اعلانات') : (s.heading_announcements_en || 'Announcements');

  const hLoc = document.getElementById('heading-location');
  if (hLoc) hLoc.innerText = currentLang === 'ur' ? (s.heading_location_ur || 'امام بارگاہ کا مقام') : (s.heading_location_en || 'Imam Bargah Location');

  const hContact = document.getElementById('heading-contact');
  if (hContact) hContact.innerText = currentLang === 'ur' ? (s.heading_contact_ur || 'رابطہ و سرکاری پروفائلز') : (s.heading_contact_en || 'Contact & Official Profiles');
  document.getElementById('nav-brand-main').innerText = currentLang === 'ur' ? (s.site_name_ur || s.site_name_en) : (s.site_name_en || 'Markazi Imam Bargah');
  document.getElementById('nav-brand-sub').innerText = currentLang === 'ur' ? (s.site_subtitle_ur || s.site_subtitle_en) : (s.site_subtitle_en || 'Darbello, Sindh, Pakistan');

  // Announcement Ticker
  const banners = (siteData.announcements || []).filter(a => a.is_banner);
  if (banners.length > 0) {
    const bannerText = currentLang === 'ur' ? (banners[0].content_ur || banners[0].title_ur) : (banners[0].content_en || banners[0].title_en);
    document.getElementById('ticker-text').innerText = bannerText;
  } else {
    document.getElementById('ticker-text').innerText = currentLang === 'ur' ? 'مرکزی امام بارگاہ دربار امام حسین علیہ السلام دریبلو میں خوش آمدید' : 'Welcome to Markazi Imam Bargah Darbar Imam Hussain (A.S.), Darbello';
  }
  document.getElementById('current-timing-badge').innerHTML = `<i class="ri-time-line"></i> ${currentLang === 'ur' ? (s.timing_ur || 'ہر وقت کھلا ہے') : (s.timing_en || 'Always Open')}`;

  // Hero Section
  const homePage = p.home || {};
  if (homePage.image_url) {
    document.querySelector('.hero-section').style.backgroundImage = `linear-gradient(135deg, rgba(6, 56, 39, 0.9), rgba(88, 24, 26, 0.85)), url('${homePage.image_url}')`;
  }
  document.getElementById('hero-badge-text').innerHTML = `<i class="ri-map-pin-2-fill"></i> ${currentLang === 'ur' ? (s.address_ur || 'میمن محلہ، دریبلو نیو، پاکستان') : (s.address_en || 'Memon Muhalla, Darbello New, Pakistan')}`;
  document.getElementById('hero-title-en').innerText = homePage.title_en || s.site_name_en || 'Markazi Imam Bargah Darbar Imam Hussain (A.S.), Darbello';
  document.getElementById('hero-subtitle').innerText = currentLang === 'ur' ? (homePage.subtitle_ur || homePage.content_ur || 'ایمان، یاد الہیٰ، روحانیت اور باہمی اتحاد کا مرکز۔') : (homePage.subtitle_en || homePage.content_en || 'A place of faith, remembrance, spirituality and community.');

  // About Section
  const aboutPage = p.about || {};
  if (aboutPage.image_url) document.getElementById('about-image').src = aboutPage.image_url;
  document.getElementById('about-title').innerText = currentLang === 'ur' ? (aboutPage.title_ur || 'ہمارے بارے میں') : (aboutPage.title_en || 'About Our Imam Bargah');
  document.getElementById('about-text-1').innerText = currentLang === 'ur' ? (aboutPage.content_ur || '') : (aboutPage.content_en || '');
  document.getElementById('about-text-2').innerText = currentLang === 'ur' ? (aboutPage.subtitle_ur || '') : (aboutPage.subtitle_en || '');

  // Community Section
  const commPage = p.community || {};
  document.getElementById('community-title').innerText = currentLang === 'ur' ? (commPage.title_ur || 'کمیونٹی خدمات') : (commPage.title_en || 'Community & Services');
  document.getElementById('community-text').innerText = currentLang === 'ur' ? (commPage.content_ur || '') : (commPage.content_en || '');

  // Location Section
  document.getElementById('loc-address').innerText = currentLang === 'ur' ? (s.address_ur || 'میمن محلہ، دریبلو نیو، دریبلو، پاکستان') : (s.address_en || 'Memon Muhalla, Darbello New, Darbello, Pakistan');
  document.getElementById('loc-timing').innerText = currentLang === 'ur' ? (s.timing_ur || 'ہر وقت کھلا ہے') : (s.timing_en || 'Always Open');
  if (s.map_embed_url) document.getElementById('google-map-iframe').src = s.map_embed_url;
  if (s.map_directions_url) document.getElementById('get-directions-btn').href = s.map_directions_url;

  // Footer Section
  document.getElementById('footer-title-ur').innerText = s.site_name_ur || 'مرکزی امام بارگاہ دربار امام حسین علیہ السلام دریبلو';
  document.getElementById('footer-title-en').innerText = s.site_name_en || 'Markazi Imam Bargah Darbar Imam Hussain (A.S.), Darbello';
  document.getElementById('footer-address').innerHTML = `<i class="ri-map-pin-line"></i> ${currentLang === 'ur' ? (s.address_ur || '') : (s.address_en || '')}`;

  // Social Links
  renderSocialLinks(siteData.social_links || []);

  // Render Dynamic Items
  renderEvents();
  renderAnnouncements();
  renderGallery();
  renderMedia();
}

function renderSocialLinks(links) {
  const navContainer = document.getElementById('nav-social-icons');
  if (!navContainer) return;
  navContainer.innerHTML = '';

  links.forEach(item => {
    let iconClass = 'ri-share-line';
    if (item.platform === 'instagram') iconClass = 'ri-instagram-line';
    if (item.platform === 'facebook') iconClass = 'ri-facebook-fill';
    if (item.platform === 'youtube') iconClass = 'ri-youtube-fill';
    if (item.platform === 'whatsapp') iconClass = 'ri-whatsapp-line';

    const a = document.createElement('a');
    a.href = item.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'social-icon-btn';
    a.title = item.platform_name_en || item.platform;
    a.innerHTML = `<i class="${iconClass}"></i>`;
    navContainer.appendChild(a);
  });
}

function renderEvents() {
  const container = document.getElementById('events-grid-container');
  if (!container || !siteData) return;
  container.innerHTML = '';

  const today = new Date().toISOString().split('T')[0];
  let events = siteData.events || [];

  if (activeEventFilter === 'upcoming') {
    events = events.filter(e => e.event_date >= today);
  }

  if (events.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--text-muted);">
      <i class="ri-calendar-event-line" style="font-size:3rem; color:var(--gold);"></i>
      <p style="margin-top:1rem;">${currentLang === 'ur' ? 'فل الوقت کوئی نیا پروگرام درج نہیں ہے۔' : 'No upcoming events listed at the moment.'}</p>
    </div>`;
    return;
  }

  events.forEach(item => {
    const title = currentLang === 'ur' ? item.title_ur : item.title_en;
    const desc = currentLang === 'ur' ? item.description_ur : item.description_en;
    const speaker = currentLang === 'ur' ? item.speaker_ur : item.speaker_en;
    const location = currentLang === 'ur' ? item.location_ur : item.location_en;

    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <img src="${item.image_url || '/static/images/hero_architecture.jpg'}" alt="${title}" class="event-card-image">
      <div class="event-card-body">
        <div class="event-date-badge">
          <i class="ri-calendar-line"></i> ${item.event_date} ${item.start_time ? '| ' + item.start_time : ''}
        </div>
        <h3 class="event-title">${title}</h3>
        <div class="event-meta">
          ${speaker ? `<span><i class="ri-user-voice-line" style="color:var(--gold);"></i> ${speaker}</span>` : ''}
          <span><i class="ri-map-pin-line" style="color:var(--gold);"></i> ${location || 'Markazi Imam Bargah, Darbello'}</span>
        </div>
        <p class="event-desc">${desc || ''}</p>
      </div>
    `;
    container.appendChild(card);
  });
}

function filterEvents(filterType) {
  activeEventFilter = filterType;
  document.getElementById('tab-upcoming').classList.toggle('active', filterType === 'upcoming');
  document.getElementById('tab-all-events').classList.toggle('active', filterType === 'all');
  renderEvents();
}

function renderAnnouncements() {
  const container = document.getElementById('announcements-grid-container');
  if (!container || !siteData) return;
  container.innerHTML = '';

  const announcements = siteData.announcements || [];
  if (announcements.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-muted);">
      <p>${currentLang === 'ur' ? 'کوئی نیا اعلان نہیں ہے۔' : 'No announcements currently.'}</p>
    </div>`;
    return;
  }

  announcements.forEach(item => {
    const title = currentLang === 'ur' ? item.title_ur : item.title_en;
    const content = currentLang === 'ur' ? item.content_ur : item.content_en;

    const card = document.createElement('div');
    card.className = 'event-card';
    card.style.borderLeft = '4px solid var(--gold)';
    card.innerHTML = `
      <div class="event-card-body">
        <div class="event-date-badge"><i class="ri-notification-3-line"></i> ${item.announcement_date || 'Notice'}</div>
        <h3 class="event-title">${title}</h3>
        <p class="event-desc">${content}</p>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderGallery() {
  const catContainer = document.getElementById('gallery-categories-container');
  const gridContainer = document.getElementById('gallery-grid-container');
  if (!catContainer || !gridContainer || !siteData) return;

  // Render Categories
  const categories = siteData.gallery_categories || [];
  catContainer.innerHTML = `<button class="cat-btn ${activeGalleryCategory === 'all' ? 'active' : ''}" onclick="filterGallery('all')">
    ${currentLang === 'ur' ? 'تمام تصویریں' : 'All Photos'}
  </button>`;

  categories.forEach(cat => {
    const name = currentLang === 'ur' ? cat.name_ur : cat.name_en;
    const btn = document.createElement('button');
    btn.className = `cat-btn ${activeGalleryCategory === cat.slug ? 'active' : ''}`;
    btn.innerText = name;
    btn.onclick = () => filterGallery(cat.slug);
    catContainer.appendChild(btn);
  });

  // Render Images Grid
  gridContainer.innerHTML = '';
  let images = siteData.gallery_images || [];

  if (activeGalleryCategory !== 'all') {
    images = images.filter(img => img.category_slug === activeGalleryCategory);
  }

  if (images.length === 0) {
    gridContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">
      <i class="ri-image-line" style="font-size:3rem; color:var(--gold);"></i>
      <p style="margin-top:1rem;">${currentLang === 'ur' ? 'اس کیٹیگری میں کوئی تصویر دستیاب نہیں ہے۔' : 'No photos found in this category.'}</p>
    </div>`;
    return;
  }

  images.forEach(img => {
    const caption = currentLang === 'ur' ? (img.caption_ur || img.caption_en) : (img.caption_en || img.caption_ur);
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.onclick = () => openLightbox(img.image_url, caption);
    item.innerHTML = `
      <img src="${img.image_url}" alt="${caption || 'Imam Bargah Photo'}" loading="lazy">
      <div class="gallery-overlay">
        <div class="gallery-caption"><i class="ri-search-eye-line"></i> ${caption || 'View Full Image'}</div>
      </div>
    `;
    gridContainer.appendChild(item);
  });
}

function filterGallery(categorySlug) {
  activeGalleryCategory = categorySlug;
  renderGallery();
}

function openLightbox(imgUrl, caption) {
  document.getElementById('lightbox-img').src = imgUrl;
  document.getElementById('lightbox-caption').innerText = caption || '';
  document.getElementById('gallery-lightbox').classList.add('active');
}

function closeLightbox() {
  document.getElementById('gallery-lightbox').classList.remove('active');
}

function renderMedia() {
  const container = document.getElementById('media-grid-container');
  if (!container || !siteData) return;
  container.innerHTML = '';

  const media = siteData.media_items || [];
  if (media.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-muted);">
      <p>${currentLang === 'ur' ? 'کوئی ویڈیو یا میڈیا لنک درج نہیں ہے۔' : 'No media items available.'}</p>
    </div>`;
    return;
  }

  media.forEach(item => {
    const title = currentLang === 'ur' ? item.title_ur : item.title_en;
    const desc = currentLang === 'ur' ? item.description_ur : item.description_en;

    const card = document.createElement('div');
    card.className = 'media-card';
    card.innerHTML = `
      <div class="media-thumbnail-wrap">
        <img src="${item.thumbnail_url || '/static/images/hero_architecture.jpg'}" alt="${title}">
        <a href="${item.media_url}" target="_blank" rel="noopener" class="play-badge" title="Watch Media">
          <i class="ri-play-fill"></i>
        </a>
      </div>
      <div style="padding:1.2rem;">
        <h4 style="font-size:1.1rem; color:var(--primary-dark); margin-bottom:0.5rem;">${title}</h4>
        <p style="font-size:0.9rem; color:var(--text-muted);">${desc || ''}</p>
        <a href="${item.media_url}" target="_blank" rel="noopener" style="display:inline-block; margin-top:0.8rem; font-weight:600; font-size:0.85rem; color:var(--primary);">
          Watch on ${item.media_type} &rarr;
        </a>
      </div>
    `;
    container.appendChild(card);
  });
}

function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'ur' : 'en';
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ur' ? 'rtl' : 'ltr';

  document.getElementById('lang-btn-text').innerText = currentLang === 'en' ? 'اردو' : 'English';

  // Update i18n static text elements
  const dict = i18n[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.innerText = dict[key];
  });

  renderPublicSite();
}

async function handleContactSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('contact-name').value;
  const email = document.getElementById('contact-email').value;
  const phone = document.getElementById('contact-phone').value;
  const message = document.getElementById('contact-message').value;

  try {
    const res = await fetch('/api/public/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, message })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || "Message sent successfully!", "success");
      document.getElementById('public-contact-form').reset();
    } else {
      showToast(data.error || "Failed to send message.", "error");
    }
  } catch (err) {
    showToast("Error connecting to server.", "error");
  }
}

function toggleMobileNav() {
  document.getElementById('nav-menu').classList.toggle('active');
}

function setupNavScroll() {
  window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const scrollPos = window.scrollY + 100;

    sections.forEach(sec => {
      if (scrollPos >= sec.offsetTop && scrollPos < (sec.offsetTop + sec.offsetHeight)) {
        const id = sec.getAttribute('id');
        document.querySelectorAll('.nav-link').forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  });
}

function showPublicSite() {
  window.location.hash = '';
  document.getElementById('public-app').style.display = 'block';
  document.getElementById('admin-login-view').style.display = 'none';
  document.getElementById('admin-dashboard-view').style.display = 'none';
}

function showAdminLogin() {
  window.location.hash = '#admin-login';
  document.getElementById('public-app').style.display = 'none';
  document.getElementById('admin-login-view').style.display = 'flex';
  document.getElementById('admin-dashboard-view').style.display = 'none';
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="${type === 'success' ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'}"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
