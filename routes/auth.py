from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from firebase_admin import auth as fb_auth, firestore
import time

auth_bp = Blueprint('auth', __name__)

db = None
def get_db():
    global db
    if db is None:
        db = firestore.client()
    return db


def verify_token(id_token):
    """Verify Firebase ID token and return decoded token"""
    try:
        return fb_auth.verify_id_token(id_token)
    except Exception:
        return None


@auth_bp.route('/login')
def login():
    if 'user_uid' in session:
        return redirect(url_for('main.app_page'))
    return render_template('auth/login.html')


@auth_bp.route('/register')
def register():
    if 'user_uid' in session:
        return redirect(url_for('main.app_page'))
    return render_template('auth/register.html')


@auth_bp.route('/session', methods=['POST'])
def set_session():
    """Called after Firebase client-side login — sets server session"""
    data     = request.get_json()
    id_token = data.get('idToken', '')
    decoded  = verify_token(id_token)
    if not decoded:
        return jsonify({"error": "Invalid token"}), 401

    uid   = decoded['uid']
    email = decoded.get('email', '')
    name  = decoded.get('name', email.split('@')[0] if email else 'User')
    photo = decoded.get('picture', '')

    session['user_uid']   = uid
    session['user_email'] = email
    session['user_name']  = name
    session.permanent     = True

    db_client = get_db()
    user_ref  = db_client.collection('users').document(uid)
    user_doc  = user_ref.get()

    if not user_doc.exists:
        # New user — create profile
        username = name.lower().replace(' ', '_')[:20]
        user_ref.set({
            'uid':             uid,
            'email':           email,
            'displayName':     name,
            'username':        username,
            'avatarUrl':       photo,
            'bio':             '',
            'role':            'user',
            'isPremium':       False,
            'premiumExpiry':   None,
            'isVerified':      False,
            'isBanned':        False,
            'profileAnimation': '',
            'customBadge':     '',
            'createdAt':       int(time.time()),
            'lastSeen':        int(time.time()),
            'settings': {
                'theme':         'dark',
                'notifications': True,
                'language':      'en'
            }
        })
        # Initialize coins
        db_client.collection('coins').document(uid).set({
            'balance':       0,
            'totalEarned':   0,
            'lastDailyClaim': 0,
            'lastGameEarn':   0
        })

    else:
        user_ref.update({'lastSeen': int(time.time())})

    return jsonify({"success": True, "uid": uid, "name": name})


@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True})


@auth_bp.route('/check')
def check_auth():
    if 'user_uid' in session:
        return jsonify({"authenticated": True, "uid": session['user_uid']})
    return jsonify({"authenticated": False}), 401


@auth_bp.route('/set-admin', methods=['POST'])
def set_admin():
    """Admin can promote users — internal use"""
    data  = request.get_json()
    token = data.get('adminToken', '')
    uid   = data.get('uid', '')
    from config import ADMIN_PASSWORD
    if token != ADMIN_PASSWORD or not uid:
        return jsonify({"error": "Unauthorized"}), 403
    db_client = get_db()
    db_client.collection('users').document(uid).update({'role': 'admin'})
    return jsonify({"success": True})
