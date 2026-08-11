import secrets
from functools import wraps
from flask import request, jsonify, session
from werkzeug.security import check_password_hash, generate_password_hash
from database import get_db_connection

# In-memory active admin sessions map (token -> user_dict)
ACTIVE_SESSIONS = {}

def authenticate_admin(email, password):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM admin_users WHERE email = ? AND is_active = 1", (email.strip().lower(),))
    user = cursor.fetchone()
    conn.close()

    if user and check_password_hash(user['password_hash'], password):
        token = secrets.token_hex(32)
        user_info = {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "avatar_url": user['avatar_url'] if ('avatar_url' in user.keys() and user['avatar_url']) else '/static/images/logo.png',
            "role": user['role']
        }
        ACTIVE_SESSIONS[token] = user_info
        return token, user_info
    return None, None

def get_current_admin():
    # Check Authorization header first
    auth_header = request.headers.get('Authorization')
    token = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    elif request.headers.get('X-Admin-Token'):
        token = request.headers.get('X-Admin-Token')
    elif 'admin_token' in session:
        token = session['admin_token']

    if token and token in ACTIVE_SESSIONS:
        return ACTIVE_SESSIONS[token]
    return None

def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        admin = get_current_admin()
        if not admin:
            return jsonify({"error": "Unauthorized. Please log in as an administrator.", "status": 401}), 401
        return f(admin, *args, **kwargs)
    return decorated_function

def require_super_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        admin = get_current_admin()
        if not admin:
            return jsonify({"error": "Unauthorized. Please log in as an administrator.", "status": 401}), 401
        if admin.get('role') != 'SUPER_ADMIN':
            return jsonify({"error": "Forbidden. Super Admin privileges required.", "status": 403}), 403
        return f(admin, *args, **kwargs)
    return decorated_function
