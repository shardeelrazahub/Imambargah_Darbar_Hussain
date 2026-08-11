"""
database.py - Dual-Database Adapter (SQLite for local, PostgreSQL for Vercel)

- If DATABASE_URL environment variable is set → uses PostgreSQL (Neon/Vercel)
- If not set                                 → uses SQLite (local development)

No changes required in app.py — the UnifiedConnection adapter handles everything.
"""

import os
from werkzeug.security import generate_password_hash

# Load .env file if present (local development only)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DATABASE_URL = os.environ.get('DATABASE_URL')  # Set this on Vercel dashboard

if DATABASE_URL:
    import psycopg2
    import psycopg2.extras
    DB_TYPE = 'postgresql'
else:
    import sqlite3
    DB_TYPE = 'sqlite'
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')


# ─────────────────────────────────────────────
# Unified Cursor — works the same for both DBs
# ─────────────────────────────────────────────
class UnifiedCursor:
    def __init__(self, raw_cursor, db_type):
        self._c = raw_cursor
        self._db_type = db_type
        self._lastrowid = None

    def _adapt(self, query):
        """Convert SQLite-style SQL to PostgreSQL-style SQL automatically."""
        if self._db_type == 'postgresql':
            query = query.replace('?', '%s')
            query = query.replace("date('now')", 'CURRENT_DATE')
            query = query.replace("datetime('now')", 'NOW()')
            query = query.replace('INSERT OR IGNORE INTO', 'INSERT INTO')
            query = query.replace(
                'ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value',
                'ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value'
            )
            # Generic ON CONFLICT DO NOTHING for INSERT OR IGNORE
            if 'INSERT INTO' in query and 'ON CONFLICT' not in query:
                query = query + ' ON CONFLICT DO NOTHING'
        return query

    def execute(self, query, params=None):
        query = self._adapt(query)
        if params is not None:
            self._c.execute(query, params)
        else:
            self._c.execute(query)

        # Track lastrowid for PostgreSQL INSERTs
        if self._db_type == 'postgresql' and query.strip().upper().startswith('INSERT'):
            try:
                self._c.execute('SELECT lastval() AS id')
                row = self._c.fetchone()
                self._lastrowid = row['id'] if row else None
            except Exception:
                self._lastrowid = None

    @property
    def lastrowid(self):
        if self._db_type == 'postgresql':
            return self._lastrowid
        return self._c.lastrowid

    def fetchone(self):
        row = self._c.fetchone()
        if row is None:
            return None
        # PostgreSQL RealDictRow → plain dict; SQLite Row → behaves like dict
        if self._db_type == 'postgresql':
            return dict(row)
        return row

    def fetchall(self):
        rows = self._c.fetchall()
        if self._db_type == 'postgresql':
            return [dict(r) for r in rows]
        return rows

    def __getattr__(self, name):
        return getattr(self._c, name)


# ─────────────────────────────────────────────
# Unified Connection
# ─────────────────────────────────────────────
class UnifiedConnection:
    def __init__(self, raw_conn, db_type):
        self._conn = raw_conn
        self._db_type = db_type

    def cursor(self):
        if self._db_type == 'postgresql':
            raw = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        else:
            raw = self._conn.cursor()
        return UnifiedCursor(raw, self._db_type)

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()

    def __getattr__(self, name):
        return getattr(self._conn, name)


# ─────────────────────────────────────────────
# Public API: get_db_connection()
# ─────────────────────────────────────────────
def get_db_connection():
    if DB_TYPE == 'postgresql':
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False
        return UnifiedConnection(conn, 'postgresql')
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return UnifiedConnection(conn, 'sqlite')


# ─────────────────────────────────────────────
# Schema helpers
# ─────────────────────────────────────────────
def _pg(sql):
    """Convert SQLite DDL → PostgreSQL DDL."""
    sql = sql.replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY')
    sql = sql.replace('TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'TIMESTAMP DEFAULT NOW()')
    return sql

def _ddl(sql):
    """Return DDL adapted for the current DB type."""
    return _pg(sql) if DB_TYPE == 'postgresql' else sql


# ─────────────────────────────────────────────
# init_db() — creates all tables
# ─────────────────────────────────────────────
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Admin Users
    cursor.execute(_ddl('''
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'CONTENT_ADMIN',
            avatar_url TEXT DEFAULT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    '''))

    # Add avatar_url column if missing (migration for older DBs)
    if DB_TYPE == 'sqlite':
        try:
            cursor.execute('ALTER TABLE admin_users ADD COLUMN avatar_url TEXT DEFAULT NULL')
        except Exception:
            pass
    else:
        try:
            cursor.execute('''
                ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL
            ''')
        except Exception:
            pass

    # 2. Website Settings
    cursor.execute(_ddl('''
        CREATE TABLE IF NOT EXISTS website_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT
        )
    '''))

    # 3. Editable Pages
    cursor.execute(_ddl('''
        CREATE TABLE IF NOT EXISTS pages (
            page_key TEXT PRIMARY KEY,
            title_en TEXT,
            title_ur TEXT,
            subtitle_en TEXT,
            subtitle_ur TEXT,
            content_en TEXT,
            content_ur TEXT,
            image_url TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    '''))

    # 4. Events / Majalis
    cursor.execute(_ddl('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title_en TEXT NOT NULL,
            title_ur TEXT NOT NULL,
            description_en TEXT,
            description_ur TEXT,
            event_date TEXT NOT NULL,
            start_time TEXT,
            end_time TEXT,
            location_en TEXT DEFAULT 'Memon Muhalla, Darbello New, Darbello, Pakistan',
            location_ur TEXT DEFAULT 'میمن محلہ، دریبلو نیو، دریبلو، پاکستان',
            speaker_en TEXT,
            speaker_ur TEXT,
            image_url TEXT,
            is_published INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    '''))

    # 5. Announcements
    cursor.execute(_ddl('''
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title_en TEXT NOT NULL,
            title_ur TEXT NOT NULL,
            content_en TEXT,
            content_ur TEXT,
            announcement_date TEXT,
            is_banner INTEGER NOT NULL DEFAULT 0,
            is_published INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    '''))

    # 6. Gallery Categories
    cursor.execute(_ddl('''
        CREATE TABLE IF NOT EXISTS gallery_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name_en TEXT NOT NULL,
            name_ur TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            display_order INTEGER DEFAULT 0
        )
    '''))

    # 7. Gallery Images
    cursor.execute(_ddl('''
        CREATE TABLE IF NOT EXISTS gallery_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            image_url TEXT NOT NULL,
            caption_en TEXT,
            caption_ur TEXT,
            display_order INTEGER DEFAULT 0,
            is_featured INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    '''))

    # 8. Media Links
    cursor.execute(_ddl('''
        CREATE TABLE IF NOT EXISTS media_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title_en TEXT NOT NULL,
            title_ur TEXT NOT NULL,
            media_type TEXT NOT NULL DEFAULT 'YOUTUBE',
            media_url TEXT NOT NULL,
            thumbnail_url TEXT,
            description_en TEXT,
            description_ur TEXT,
            is_published INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    '''))

    # 9. Social Links
    cursor.execute(_ddl('''
        CREATE TABLE IF NOT EXISTS social_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT UNIQUE NOT NULL,
            platform_name_en TEXT NOT NULL,
            platform_name_ur TEXT NOT NULL,
            url TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            display_order INTEGER DEFAULT 0
        )
    '''))

    # 10. Contact Messages
    cursor.execute(_ddl('''
        CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            message TEXT NOT NULL,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    '''))

    conn.commit()
    seed_default_data(conn)
    conn.close()


# ─────────────────────────────────────────────
# seed_default_data() — initial content
# ─────────────────────────────────────────────
def seed_default_data(conn):
    cursor = conn.cursor()

    # Super Admin
    cursor.execute('SELECT COUNT(*) FROM admin_users')
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT OR IGNORE INTO admin_users (email, password_hash, name, role, is_active)
            VALUES (?, ?, ?, 'SUPER_ADMIN', 1)
        ''', ('admin@darbelloimambargah.com', generate_password_hash('ImamHussain#2026'), 'Super Administrator'))

    # Website Settings
    default_settings = {
        'site_name_en': 'Markazi Imam Bargah Darbar Imam Hussain (A.S.)',
        'site_name_ur': 'مرکزی امام بارگاہ دربار امام حسین علیہ السلام',
        'site_subtitle_en': 'Darbello, Sindh, Pakistan',
        'site_subtitle_ur': 'دریبلو، سندھ، پاکستان',
        'logo_url': '/static/images/logo.png',
        'hero_image_url': '/static/images/hero_architecture.jpg',
        'address_en': 'Memon Muhalla, Darbello New, Darbello, Pakistan',
        'address_ur': 'میمن محلہ، دریبلو نیو، دریبلو، پاکستان',
        'phone': '',
        'email': '',
        'whatsapp': '',
        'timing_en': 'Always Open',
        'timing_ur': 'ہر وقت کھلا ہے',
        'map_embed_url': 'https://maps.google.com/maps?q=Darbello,Pakistan&t=&z=14&ie=UTF8&iwloc=&output=embed',
        'map_directions_url': 'https://maps.google.com/?q=Darbello,Pakistan',
        'seo_title': 'Markazi Imam Bargah Darbar Imam Hussain (A.S.) – Darbello',
        'seo_description': 'Official website of Markazi Imam Bargah Darbar Imam Hussain (A.S.), Memon Muhalla, Darbello New, Darbello, Pakistan.',
        'seo_keywords': 'Markazi Imam Bargah Darbello, Darbar Imam Hussain Darbello, Imam Bargah Darbello',
        'theme_primary': '#0B4D36',
        'theme_gold': '#D4AF37',
        'theme_maroon': '#58181A',
        'heading_events_en': 'Upcoming & Past Events',
        'heading_events_ur': 'مجالس و مذہبی پروگرامات',
        'heading_gallery_en': 'Photo Gallery',
        'heading_gallery_ur': 'فوٹو گیلری',
        'heading_announcements_en': 'Announcements',
        'heading_announcements_ur': 'اہم اعلانات',
        'heading_location_en': 'Imam Bargah Location',
        'heading_location_ur': 'امام بارگاہ کا مقام',
        'heading_contact_en': 'Contact & Official Profiles',
        'heading_contact_ur': 'رابطہ و سرکاری پروفائلز',
    }

    for key, val in default_settings.items():
        cursor.execute('''
            INSERT OR IGNORE INTO website_settings (setting_key, setting_value)
            VALUES (?, ?)
        ''', (key, val))

    # Social Links
    cursor.execute('SELECT COUNT(*) FROM social_links')
    if cursor.fetchone()[0] == 0:
        socials = [
            ('instagram', 'Instagram', 'انسٹاگرام', 'https://www.instagram.com/darbar_hussaina.s/', 1, 1),
            ('facebook', 'Facebook', 'فیس بک', 'https://www.facebook.com/profile.php?id=100072578134570', 1, 2),
        ]
        for item in socials:
            cursor.execute('''
                INSERT OR IGNORE INTO social_links (platform, platform_name_en, platform_name_ur, url, is_active, display_order)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', item)

    # Pages
    cursor.execute('SELECT COUNT(*) FROM pages')
    if cursor.fetchone()[0] == 0:
        pages = [
            ('home',
             'Markazi Imam Bargah Darbar Imam Hussain (A.S.), Darbello',
             'مرکزی امام بارگاہ دربار امام حسین علیہ السلام',
             'A place of faith, remembrance, spirituality and community.',
             'ایمان، یاد الہیٰ، روحانیت اور باہمی اتحاد کا مرکز۔',
             'Welcome to the official website of Markazi Imam Bargah Darbar Imam Hussain (A.S.), Darbello.',
             'مرکزی امام بارگاہ دربار امام حسین علیہ السلام کی سرکاری ویب سائٹ میں خوش آمدید۔',
             '/static/images/hero_architecture.jpg'),
            ('about',
             'About Our Imam Bargah',
             'ہماری امام بارگاہ کے بارے میں',
             'Faith, Service & Community Gathering',
             'ایمان، خدمت اور باہمی اتحاد',
             'Markazi Imam Bargah Darbar Imam Hussain (A.S.) is located in Memon Muhalla, Darbello New, Darbello, Pakistan.',
             'مرکزی امام بارگاہ دربار امام حسین علیہ السلام میمن محلہ، دریبلو نیو، دریبلو، پاکستان میں واقع ہے۔',
             '/static/images/imambargah_facade.jpg'),
            ('community',
             'Community & Services',
             'کمیونٹی اور خدمات',
             'Serving the Momineen and Local Community',
             'مؤمنین اور مقامی آبادی کی خدمت',
             'Our Imam Bargah coordinates religious services, Majalis, Niaz distribution, and community support in Darbello.',
             'ہماری امام بارگاہ دریبلو میں مذہبی خدمات، مجالس، نیاز کی تقسیم اور باہمی معاونت کا اہتمام کرتی ہے۔',
             '/static/images/community_event.jpg'),
        ]
        for p in pages:
            cursor.execute('''
                INSERT OR IGNORE INTO pages (page_key, title_en, title_ur, subtitle_en, subtitle_ur, content_en, content_ur, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', p)

    # Gallery Categories
    cursor.execute('SELECT COUNT(*) FROM gallery_categories')
    if cursor.fetchone()[0] == 0:
        categories = [
            ('Imam Bargah', 'امام بارگاہ', 'imam-bargah', 1),
            ('Architecture', 'تعمیرات و عمارت', 'architecture', 2),
            ('Religious Programs', 'مذہبی پروگرامات', 'religious-programs', 3),
            ('Majalis', 'مجالس عزا', 'majalis', 4),
            ('Muharram', 'محرم الحرام', 'muharram', 5),
            ('Community Events', 'کمیونٹی کے اجتماعات', 'community-events', 6),
            ('Other', 'دیگر', 'other', 7),
        ]
        for cat in categories:
            cursor.execute('''
                INSERT OR IGNORE INTO gallery_categories (name_en, name_ur, slug, display_order)
                VALUES (?, ?, ?, ?)
            ''', cat)

    # Sample Event
    cursor.execute('SELECT COUNT(*) FROM events')
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO events (title_en, title_ur, description_en, description_ur,
                event_date, start_time, end_time, location_en, location_ur,
                speaker_en, speaker_ur, image_url, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ''', (
            'Annual Majlis-e-Aza',
            'سالانہ مجلس عزا',
            'Special religious gathering for Momineen at Markazi Imam Bargah Darbar Imam Hussain (A.S.), Darbello.',
            'مرکزی امام بارگاہ دربار امام حسین علیہ السلام میں مؤمنین کے لیے مذہبی اجتماع۔',
            '2026-08-20', '20:00', '22:30',
            'Memon Muhalla, Darbello New, Darbello, Pakistan',
            'میمن محلہ، دریبلو نیو، دریبلو، پاکستان',
            'Zakir & Scholars', 'ذاکرین اور علمائے کرام',
            '/static/images/hero_architecture.jpg',
        ))

    # Sample Announcement
    cursor.execute('SELECT COUNT(*) FROM announcements')
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO announcements (title_en, title_ur, content_en, content_ur, announcement_date, is_banner, is_published)
            VALUES (?, ?, ?, ?, ?, 1, 1)
        ''', (
            'Welcome to the Official Website',
            'سرکاری ویب سائٹ میں خوش آمدید',
            'Markazi Imam Bargah Darbar Imam Hussain (A.S.), Darbello is pleased to announce its official online website.',
            'مرکزی امام بارگاہ دربار امام حسین علیہ السلام کی جانب سے سرکاری ویب سائٹ کے آغاز کا اعلان کیا جاتا ہے۔',
            '2026-08-11',
        ))

    conn.commit()


if __name__ == '__main__':
    init_db()
    print('Database initialized successfully.')
