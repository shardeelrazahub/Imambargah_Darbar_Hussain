import os
import uuid
from flask import Flask, request, jsonify, send_from_directory, session
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash
from database import init_db, get_db_connection
from auth import authenticate_admin, get_current_admin, require_admin, require_super_admin, ACTIVE_SESSIONS

# Load .env for local development
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Cloudinary setup (used on Vercel; skipped locally if not configured)
CLOUDINARY_ENABLED = bool(os.environ.get('CLOUDINARY_CLOUD_NAME'))
if CLOUDINARY_ENABLED:
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(
        cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
        api_key=os.environ.get('CLOUDINARY_API_KEY'),
        api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
        secure=True
    )

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.secret_key = os.environ.get('SECRET_KEY', 'darbello_imambargah_secret_key_2026')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

# Local upload folder (only used when Cloudinary is NOT configured)
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
if not CLOUDINARY_ENABLED:
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Initialize DB on start
init_db()

# --- STATIC & SPA ROUTES ---
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# --- PUBLIC APIs ---
@app.route('/api/public/initial_data', methods=['GET'])
def get_public_initial_data():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Settings dict
    cursor.execute("SELECT setting_key, setting_value FROM website_settings")
    settings = {row['setting_key']: row['setting_value'] for row in cursor.fetchall()}

    # Pages dict
    cursor.execute("SELECT * FROM pages")
    pages = {row['page_key']: dict(row) for row in cursor.fetchall()}

    # Published Events
    cursor.execute("SELECT * FROM events WHERE is_published = 1 ORDER BY event_date ASC")
    events = [dict(row) for row in cursor.fetchall()]

    # Published Announcements
    cursor.execute("SELECT * FROM announcements WHERE is_published = 1 ORDER BY created_at DESC")
    announcements = [dict(row) for row in cursor.fetchall()]

    # Gallery Categories
    cursor.execute("SELECT * FROM gallery_categories ORDER BY display_order ASC")
    categories = [dict(row) for row in cursor.fetchall()]

    # Gallery Images
    cursor.execute('''
        SELECT g.*, c.name_en as category_name_en, c.name_ur as category_name_ur, c.slug as category_slug
        FROM gallery_images g
        LEFT JOIN gallery_categories c ON g.category_id = c.id
        ORDER BY g.display_order ASC, g.id DESC
    ''')
    images = [dict(row) for row in cursor.fetchall()]

    # Published Media Items
    cursor.execute("SELECT * FROM media_items WHERE is_published = 1 ORDER BY id DESC")
    media = [dict(row) for row in cursor.fetchall()]

    # Active Social Links
    cursor.execute("SELECT * FROM social_links WHERE is_active = 1 ORDER BY display_order ASC")
    socials = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return jsonify({
        "settings": settings,
        "pages": pages,
        "events": events,
        "announcements": announcements,
        "gallery_categories": categories,
        "gallery_images": images,
        "media_items": media,
        "social_links": socials
    })

@app.route('/api/public/contact', methods=['POST'])
def submit_contact_message():
    data = request.json or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()
    message = (data.get('message') or '').strip()

    if not name or not message:
        return jsonify({"error": "Name and message are required fields."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO contact_messages (name, email, phone, message)
        VALUES (?, ?, ?, ?)
    ''', (name, email, phone, message))
    conn.commit()
    conn.close()

    return jsonify({"message": "Thank you! Your message has been sent successfully."})

# --- AUTH APIs ---
@app.route('/api/auth/login', methods=['POST'])
def admin_login():
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    token, user_info = authenticate_admin(email, password)
    if not token:
        return jsonify({"error": "Invalid email or password."}), 401

    session['admin_token'] = token
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user_info
    })

@app.route('/api/auth/logout', methods=['POST'])
def admin_logout():
    admin = get_current_admin()
    auth_header = request.headers.get('Authorization')
    token = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    elif 'admin_token' in session:
        token = session['admin_token']

    if token and token in ACTIVE_SESSIONS:
        del ACTIVE_SESSIONS[token]
    session.pop('admin_token', None)

    return jsonify({"message": "Logged out successfully."})

@app.route('/api/auth/me', methods=['GET'])
def admin_me():
    admin = get_current_admin()
    if not admin:
        return jsonify({"authenticated": False}), 401
    return jsonify({"authenticated": True, "user": admin})

# --- ADMIN APIs (Protected) ---
@app.route('/api/admin/dashboard_stats', methods=['GET'])
@require_admin
def get_dashboard_stats(current_admin):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM events")
    total_events = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM events WHERE is_published = 1 AND event_date >= date('now')")
    upcoming_events = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM gallery_images")
    total_gallery = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM announcements")
    total_announcements = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM contact_messages WHERE is_read = 0")
    unread_messages = cursor.fetchone()[0]

    conn.close()
    return jsonify({
        "total_events": total_events,
        "upcoming_events": upcoming_events,
        "total_gallery": total_gallery,
        "total_announcements": total_announcements,
        "unread_messages": unread_messages
    })

@app.route('/api/admin/upload', methods=['POST'])
@require_admin
def upload_file(current_admin):
    if 'file' not in request.files:
        return jsonify({"error": "No file part provided."}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file."}), 400

    if not (file and allowed_file(file.filename)):
        return jsonify({"error": "File type not allowed. Allowed: PNG, JPG, JPEG, WEBP, GIF"}), 400

    if CLOUDINARY_ENABLED:
        # ── Vercel / Production: Upload to Cloudinary CDN ──
        try:
            result = cloudinary.uploader.upload(
                file,
                folder='imambargah_darbello',
                resource_type='image'
            )
            file_url = result['secure_url']
            return jsonify({"message": "File uploaded successfully", "url": file_url})
        except Exception as e:
            return jsonify({"error": f"Cloudinary upload failed: {str(e)}"}), 500
    else:
        # ── Local Development: Save to /uploads/ folder ──
        ext = file.filename.rsplit('.', 1)[1].lower()
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
        file.save(filepath)
        file_url = f"/uploads/{unique_name}"
        return jsonify({"message": "File uploaded successfully", "url": file_url})

# --- ADMIN SETTINGS & PAGES ---
@app.route('/api/admin/settings', methods=['POST'])
@require_admin
def update_settings(current_admin):
    data = request.json or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    for key, val in data.items():
        cursor.execute('''
            INSERT INTO website_settings (setting_key, setting_value)
            VALUES (?, ?)
            ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
        ''', (key, str(val)))
    conn.commit()
    conn.close()
    return jsonify({"message": "Settings updated successfully."})

@app.route('/api/admin/pages/<page_key>', methods=['PUT'])
@require_admin
def update_page(current_admin, page_key):
    data = request.json or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO pages (page_key, title_en, title_ur, subtitle_en, subtitle_ur, content_en, content_ur, image_url, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(page_key) DO UPDATE SET
            title_en = excluded.title_en,
            title_ur = excluded.title_ur,
            subtitle_en = excluded.subtitle_en,
            subtitle_ur = excluded.subtitle_ur,
            content_en = excluded.content_en,
            content_ur = excluded.content_ur,
            image_url = excluded.image_url,
            updated_at = CURRENT_TIMESTAMP
    ''', (
        page_key,
        data.get('title_en', ''),
        data.get('title_ur', ''),
        data.get('subtitle_en', ''),
        data.get('subtitle_ur', ''),
        data.get('content_en', ''),
        data.get('content_ur', ''),
        data.get('image_url', '')
    ))
    conn.commit()
    conn.close()
    return jsonify({"message": f"Page '{page_key}' updated successfully."})

# --- ADMIN EVENTS CRUD ---
@app.route('/api/admin/events', methods=['GET', 'POST'])
@require_admin
def handle_admin_events(current_admin):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute("SELECT * FROM events ORDER BY event_date DESC")
        events = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(events)

    elif request.method == 'POST':
        data = request.json or {}
        cursor.execute('''
            INSERT INTO events (title_en, title_ur, description_en, description_ur, event_date, start_time, end_time, location_en, location_ur, speaker_en, speaker_ur, image_url, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('title_en', '').strip(),
            data.get('title_ur', '').strip(),
            data.get('description_en', '').strip(),
            data.get('description_ur', '').strip(),
            data.get('event_date', ''),
            data.get('start_time', ''),
            data.get('end_time', ''),
            data.get('location_en', 'Memon Muhalla, Darbello New, Darbello, Pakistan'),
            data.get('location_ur', 'میمن محلہ، دریبلو نیو، دریبلو، پاکستان'),
            data.get('speaker_en', ''),
            data.get('speaker_ur', ''),
            data.get('image_url', ''),
            1 if data.get('is_published', True) else 0
        ))
        conn.commit()
        event_id = cursor.lastrowid
        conn.close()
        return jsonify({"message": "Event created successfully.", "id": event_id})

@app.route('/api/admin/events/<int:event_id>', methods=['PUT', 'DELETE'])
@require_admin
def handle_single_event(current_admin, event_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'PUT':
        data = request.json or {}
        cursor.execute('''
            UPDATE events SET
                title_en = ?, title_ur = ?, description_en = ?, description_ur = ?,
                event_date = ?, start_time = ?, end_time = ?, location_en = ?, location_ur = ?,
                speaker_en = ?, speaker_ur = ?, image_url = ?, is_published = ?
            WHERE id = ?
        ''', (
            data.get('title_en', '').strip(),
            data.get('title_ur', '').strip(),
            data.get('description_en', '').strip(),
            data.get('description_ur', '').strip(),
            data.get('event_date', ''),
            data.get('start_time', ''),
            data.get('end_time', ''),
            data.get('location_en', ''),
            data.get('location_ur', ''),
            data.get('speaker_en', ''),
            data.get('speaker_ur', ''),
            data.get('image_url', ''),
            1 if data.get('is_published', True) else 0,
            event_id
        ))
        conn.commit()
        conn.close()
        return jsonify({"message": "Event updated successfully."})

    elif request.method == 'DELETE':
        cursor.execute("DELETE FROM events WHERE id = ?", (event_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Event deleted successfully."})

# --- ADMIN ANNOUNCEMENTS CRUD ---
@app.route('/api/admin/announcements', methods=['GET', 'POST'])
@require_admin
def handle_admin_announcements(current_admin):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute("SELECT * FROM announcements ORDER BY id DESC")
        items = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(items)

    elif request.method == 'POST':
        data = request.json or {}
        cursor.execute('''
            INSERT INTO announcements (title_en, title_ur, content_en, content_ur, announcement_date, is_banner, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('title_en', '').strip(),
            data.get('title_ur', '').strip(),
            data.get('content_en', '').strip(),
            data.get('content_ur', '').strip(),
            data.get('announcement_date', ''),
            1 if data.get('is_banner', False) else 0,
            1 if data.get('is_published', True) else 0
        ))
        conn.commit()
        item_id = cursor.lastrowid
        conn.close()
        return jsonify({"message": "Announcement created successfully.", "id": item_id})

@app.route('/api/admin/announcements/<int:item_id>', methods=['PUT', 'DELETE'])
@require_admin
def handle_single_announcement(current_admin, item_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'PUT':
        data = request.json or {}
        cursor.execute('''
            UPDATE announcements SET
                title_en = ?, title_ur = ?, content_en = ?, content_ur = ?,
                announcement_date = ?, is_banner = ?, is_published = ?
            WHERE id = ?
        ''', (
            data.get('title_en', '').strip(),
            data.get('title_ur', '').strip(),
            data.get('content_en', '').strip(),
            data.get('content_ur', '').strip(),
            data.get('announcement_date', ''),
            1 if data.get('is_banner', False) else 0,
            1 if data.get('is_published', True) else 0,
            item_id
        ))
        conn.commit()
        conn.close()
        return jsonify({"message": "Announcement updated successfully."})

    elif request.method == 'DELETE':
        cursor.execute("DELETE FROM announcements WHERE id = ?", (item_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Announcement deleted successfully."})

# --- ADMIN GALLERY CRUD ---
@app.route('/api/admin/gallery', methods=['GET', 'POST'])
@require_admin
def handle_admin_gallery(current_admin):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('''
            SELECT g.*, c.name_en as category_name_en, c.name_ur as category_name_ur
            FROM gallery_images g
            LEFT JOIN gallery_categories c ON g.category_id = c.id
            ORDER BY g.display_order ASC, g.id DESC
        ''')
        images = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(images)

    elif request.method == 'POST':
        data = request.json or {}
        cursor.execute('''
            INSERT INTO gallery_images (category_id, image_url, caption_en, caption_ur, display_order, is_featured)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data.get('category_id'),
            data.get('image_url', '').strip(),
            data.get('caption_en', '').strip(),
            data.get('caption_ur', '').strip(),
            int(data.get('display_order', 0)),
            1 if data.get('is_featured', False) else 0
        ))
        conn.commit()
        img_id = cursor.lastrowid
        conn.close()
        return jsonify({"message": "Gallery image added successfully.", "id": img_id})

@app.route('/api/admin/gallery/<int:img_id>', methods=['PUT', 'DELETE'])
@require_admin
def handle_single_gallery_image(current_admin, img_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'PUT':
        data = request.json or {}
        cursor.execute('''
            UPDATE gallery_images SET
                category_id = ?, image_url = ?, caption_en = ?, caption_ur = ?,
                display_order = ?, is_featured = ?
            WHERE id = ?
        ''', (
            data.get('category_id'),
            data.get('image_url', '').strip(),
            data.get('caption_en', '').strip(),
            data.get('caption_ur', '').strip(),
            int(data.get('display_order', 0)),
            1 if data.get('is_featured', False) else 0,
            img_id
        ))
        conn.commit()
        conn.close()
        return jsonify({"message": "Gallery image updated successfully."})

    elif request.method == 'DELETE':
        cursor.execute("DELETE FROM gallery_images WHERE id = ?", (img_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Gallery image deleted successfully."})

# --- ADMIN GALLERY CATEGORIES ---
@app.route('/api/admin/categories', methods=['GET', 'POST'])
@require_admin
def handle_admin_categories(current_admin):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute("SELECT * FROM gallery_categories ORDER BY display_order ASC")
        categories = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(categories)

    elif request.method == 'POST':
        data = request.json or {}
        name_en = data.get('name_en', '').strip()
        name_ur = data.get('name_ur', '').strip()
        slug = data.get('slug', '').strip().lower().replace(' ', '-')

        cursor.execute('''
            INSERT INTO gallery_categories (name_en, name_ur, slug, display_order)
            VALUES (?, ?, ?, ?)
        ''', (name_en, name_ur, slug, int(data.get('display_order', 0))))
        conn.commit()
        cat_id = cursor.lastrowid
        conn.close()
        return jsonify({"message": "Category created successfully.", "id": cat_id})

@app.route('/api/admin/categories/<int:cat_id>', methods=['PUT', 'DELETE'])
@require_admin
def handle_single_category(current_admin, cat_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'PUT':
        data = request.json or {}
        cursor.execute('''
            UPDATE gallery_categories SET
                name_en = ?, name_ur = ?, slug = ?, display_order = ?
            WHERE id = ?
        ''', (
            data.get('name_en', '').strip(),
            data.get('name_ur', '').strip(),
            data.get('slug', '').strip().lower().replace(' ', '-'),
            int(data.get('display_order', 0)),
            cat_id
        ))
        conn.commit()
        conn.close()
        return jsonify({"message": "Category updated successfully."})

    elif request.method == 'DELETE':
        cursor.execute("DELETE FROM gallery_categories WHERE id = ?", (cat_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Category deleted successfully."})

# --- ADMIN MEDIA LINKS CRUD ---
@app.route('/api/admin/media', methods=['GET', 'POST'])
@require_admin
def handle_admin_media(current_admin):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute("SELECT * FROM media_items ORDER BY id DESC")
        items = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(items)

    elif request.method == 'POST':
        data = request.json or {}
        cursor.execute('''
            INSERT INTO media_items (title_en, title_ur, media_type, media_url, thumbnail_url, description_en, description_ur, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('title_en', '').strip(),
            data.get('title_ur', '').strip(),
            data.get('media_type', 'YOUTUBE'),
            data.get('media_url', '').strip(),
            data.get('thumbnail_url', '').strip(),
            data.get('description_en', '').strip(),
            data.get('description_ur', '').strip(),
            1 if data.get('is_published', True) else 0
        ))
        conn.commit()
        item_id = cursor.lastrowid
        conn.close()
        return jsonify({"message": "Media item created successfully.", "id": item_id})

@app.route('/api/admin/media/<int:item_id>', methods=['PUT', 'DELETE'])
@require_admin
def handle_single_media(current_admin, item_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'PUT':
        data = request.json or {}
        cursor.execute('''
            UPDATE media_items SET
                title_en = ?, title_ur = ?, media_type = ?, media_url = ?,
                thumbnail_url = ?, description_en = ?, description_ur = ?, is_published = ?
            WHERE id = ?
        ''', (
            data.get('title_en', '').strip(),
            data.get('title_ur', '').strip(),
            data.get('media_type', 'YOUTUBE'),
            data.get('media_url', '').strip(),
            data.get('thumbnail_url', '').strip(),
            data.get('description_en', '').strip(),
            data.get('description_ur', '').strip(),
            1 if data.get('is_published', True) else 0,
            item_id
        ))
        conn.commit()
        conn.close()
        return jsonify({"message": "Media item updated successfully."})

    elif request.method == 'DELETE':
        cursor.execute("DELETE FROM media_items WHERE id = ?", (item_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Media item deleted successfully."})

# --- ADMIN SOCIAL LINKS CRUD ---
@app.route('/api/admin/social', methods=['GET', 'POST'])
@require_admin
def handle_admin_social(current_admin):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute("SELECT * FROM social_links ORDER BY display_order ASC")
        items = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(items)

    elif request.method == 'POST':
        data = request.json or {}
        cursor.execute('''
            INSERT INTO social_links (platform, platform_name_en, platform_name_ur, url, is_active, display_order)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data.get('platform', '').strip().lower(),
            data.get('platform_name_en', '').strip(),
            data.get('platform_name_ur', '').strip(),
            data.get('url', '').strip(),
            1 if data.get('is_active', True) else 0,
            int(data.get('display_order', 0))
        ))
        conn.commit()
        item_id = cursor.lastrowid
        conn.close()
        return jsonify({"message": "Social link created successfully.", "id": item_id})

@app.route('/api/admin/social/<int:item_id>', methods=['PUT', 'DELETE'])
@require_admin
def handle_single_social(current_admin, item_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'PUT':
        data = request.json or {}
        cursor.execute('''
            UPDATE social_links SET
                platform = ?, platform_name_en = ?, platform_name_ur = ?, url = ?,
                is_active = ?, display_order = ?
            WHERE id = ?
        ''', (
            data.get('platform', '').strip().lower(),
            data.get('platform_name_en', '').strip(),
            data.get('platform_name_ur', '').strip(),
            data.get('url', '').strip(),
            1 if data.get('is_active', True) else 0,
            int(data.get('display_order', 0)),
            item_id
        ))
        conn.commit()
        conn.close()
        return jsonify({"message": "Social link updated successfully."})

    elif request.method == 'DELETE':
        cursor.execute("DELETE FROM social_links WHERE id = ?", (item_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Social link deleted successfully."})

# --- ADMIN CONTACT MESSAGES INBOX ---
@app.route('/api/admin/messages', methods=['GET'])
@require_admin
def get_contact_messages(current_admin):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM contact_messages ORDER BY created_at DESC")
    messages = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(messages)

@app.route('/api/admin/messages/<int:msg_id>/read', methods=['PUT'])
@require_admin
def mark_message_read(current_admin, msg_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE contact_messages SET is_read = 1 WHERE id = ?", (msg_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Message marked as read."})

@app.route('/api/admin/messages/<int:msg_id>', methods=['DELETE'])
@require_admin
def delete_contact_message(current_admin, msg_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM contact_messages WHERE id = ?", (msg_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Message deleted."})

# --- ADMIN USERS MANAGEMENT (Super Admin Only) ---
@app.route('/api/admin/users', methods=['GET', 'POST'])
@require_super_admin
def handle_admin_users(current_admin):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute("SELECT id, email, name, role, is_active, created_at FROM admin_users ORDER BY id ASC")
        users = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(users)

    elif request.method == 'POST':
        data = request.json or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        name = (data.get('name') or '').strip()
        role = data.get('role', 'CONTENT_ADMIN')

        if not email or not password or not name:
            return jsonify({"error": "Email, password, and name are required."}), 400

        p_hash = generate_password_hash(password)
        try:
            cursor.execute('''
                INSERT INTO admin_users (email, password_hash, name, role, is_active)
                VALUES (?, ?, ?, ?, 1)
            ''', (email, p_hash, name, role))
            conn.commit()
            user_id = cursor.lastrowid
            conn.close()
            return jsonify({"message": "Admin user created successfully.", "id": user_id})
        except Exception as e:
            conn.close()
            return jsonify({"error": f"Failed to create user: {str(e)}"}), 400

@app.route('/api/admin/users/<int:user_id>', methods=['PUT', 'DELETE'])
@require_super_admin
def handle_single_admin_user(current_admin, user_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'PUT':
        data = request.json or {}
        name = (data.get('name') or '').strip()
        role = data.get('role', 'CONTENT_ADMIN')
        is_active = 1 if data.get('is_active', True) else 0

        if 'password' in data and data['password'].strip():
            p_hash = generate_password_hash(data['password'].strip())
            cursor.execute('''
                UPDATE admin_users SET name = ?, role = ?, is_active = ?, password_hash = ?
                WHERE id = ?
            ''', (name, role, is_active, p_hash, user_id))
        else:
            cursor.execute('''
                UPDATE admin_users SET name = ?, role = ?, is_active = ?
                WHERE id = ?
            ''', (name, role, is_active, user_id))

        conn.commit()
        conn.close()
        return jsonify({"message": "Admin user updated successfully."})

    elif request.method == 'DELETE':
        if user_id == current_admin['id']:
            conn.close()
            return jsonify({"error": "You cannot delete your own account."}), 400

        cursor.execute("DELETE FROM admin_users WHERE id = ?", (user_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Admin user deleted successfully."})

# --- ADMIN SELF PROFILE MANAGEMENT ---
@app.route('/api/admin/profile', methods=['PUT'])
@require_admin
def update_admin_profile(current_admin):
    data = request.json or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    avatar_url = (data.get('avatar_url') or '').strip() or '/static/images/logo.png'
    new_password = (data.get('password') or '').strip()

    if not name or not email:
        return jsonify({"error": "Name and email are required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if new_password:
            p_hash = generate_password_hash(new_password)
            cursor.execute('''
                UPDATE admin_users SET name = ?, email = ?, avatar_url = ?, password_hash = ?
                WHERE id = ?
            ''', (name, email, avatar_url, p_hash, current_admin['id']))
        else:
            cursor.execute('''
                UPDATE admin_users SET name = ?, email = ?, avatar_url = ?
                WHERE id = ?
            ''', (name, email, avatar_url, current_admin['id']))
        conn.commit()

        # Update active session object
        current_admin['name'] = name
        current_admin['email'] = email
        current_admin['avatar_url'] = avatar_url

        conn.close()
        return jsonify({"message": "Profile updated successfully.", "user": current_admin})
    except Exception as e:
        conn.close()
        return jsonify({"error": f"Failed to update profile: {str(e)}"}), 400

# ── Local development server ──
# On Vercel, the 'app' object is detected automatically as the WSGI entry point.
if __name__ == '__main__':
    print('Starting Flask application server on http://127.0.0.1:5000')
    app.run(host='127.0.0.1', port=5000, debug=True)
