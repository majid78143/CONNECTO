import time
from flask import Blueprint, render_template, request, jsonify, session
from firebase_admin import firestore

users_bp = Blueprint('users', __name__)

db = None
def get_db():
    global db
    if db is None:
        db = firestore.client()
    return db


def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_uid' not in session:
            return jsonify({"error": "Login required"}), 401
        return f(*args, **kwargs)
    return decorated


@users_bp.route('/<uid>')
def profile(uid):
    db_client = get_db()
    doc = db_client.collection('users').document(uid).get()
    if not doc.exists:
        return "User not found", 404
    user = {"uid": doc.id, **doc.to_dict()}
    user.pop('email', None)
    return render_template('app/profile.html', profile=user)


@users_bp.route('/api/me')
@login_required
def me():
    uid       = session['user_uid']
    db_client = get_db()
    doc       = db_client.collection('users').document(uid).get()
    if not doc.exists:
        return jsonify({"error": "User not found"}), 404
    user = {"uid": doc.id, **doc.to_dict()}
    user.pop('email', None)
    return jsonify(user)


@users_bp.route('/api/me', methods=['PATCH'])
@login_required
def update_me():
    uid       = session['user_uid']
    db_client = get_db()
    user_doc  = db_client.collection('users').document(uid).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}
    premium   = user_data.get('isPremium', False)

    data    = request.get_json()
    updates = {}

    if 'displayName' in data:
        updates['displayName'] = data['displayName'][:32]

    if 'username' in data:
        uname = data['username'].lower().replace(' ', '_')[:20]
        # Check uniqueness
        existing = db_client.collection('users').where('username', '==', uname).get()
        if existing and existing[0].id != uid:
            return jsonify({"error": "Username taken"}), 409
        updates['username'] = uname

    if 'bio' in data:
        bio = data['bio']
        max_len = 5000 if premium else 500
        if len(bio) > max_len:
            return jsonify({"error": f"Bio max {max_len} chars"}), 400
        updates['bio'] = bio

    if 'avatarUrl' in data:
        updates['avatarUrl'] = data['avatarUrl']

    if 'bannerUrl' in data:
        updates['bannerUrl'] = data['bannerUrl']

    if 'customStatus' in data:
        updates['customStatus'] = data['customStatus'][:128]

    if 'statusEmoji' in data:
        updates['statusEmoji'] = data['statusEmoji']

    if 'settings' in data:
        allowed = ['theme','notifications','language','compactMode']
        settings_update = {k: v for k, v in data['settings'].items() if k in allowed}
        updates.update({f'settings.{k}': v for k, v in settings_update.items()})

    if updates:
        db_client.collection('users').document(uid).update(updates)

    return jsonify({"success": True})


@users_bp.route('/api/me/export')
@login_required
def export_my_data():
    """GDPR â€” user can export their own data"""
    uid       = session['user_uid']
    db_client = get_db()

    user_doc = db_client.collection('users').document(uid).get()
    user     = user_doc.to_dict() if user_doc.exists else {}
    user.pop('profileAnimation', None)

    coins_doc = db_client.collection('coins').document(uid).get()
    coins     = coins_doc.to_dict() if coins_doc.exists else {}

    data = {
        "exportedAt": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        "profile":    user,
        "coins":      coins,
    }

    import json
    from flask import Response
    return Response(
        json.dumps(data, indent=2, default=str),
        mimetype='application/json',
        headers={"Content-Disposition": f"attachment; filename=my_connecto_data.json"}
    )


# â”€â”€ Friends â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@users_bp.route('/api/friends', methods=['GET'])
@login_required
def list_friends():
    uid       = session['user_uid']
    db_client = get_db()
    docs      = db_client.collection('users').document(uid).collection('friends').get()
    friends   = [{"uid": d.id, **d.to_dict()} for d in docs if d.to_dict().get('status') == 'accepted']
    return jsonify({"friends": friends})


@users_bp.route('/api/friends/request', methods=['POST'])
@login_required
def friend_request():
    uid       = session['user_uid']
    target_uid= request.get_json().get('uid', '')
    if not target_uid or target_uid == uid:
        return jsonify({"error": "Invalid target"}), 400
    db_client = get_db()
    # Check target exists
    target = db_client.collection('users').document(target_uid).get()
    if not target.exists:
        return jsonify({"error": "User not found"}), 404

    now = int(time.time())
    db_client.collection('users').document(uid).collection('friends').document(target_uid).set({
        'status':    'pending_sent',
        'createdAt': now
    })
    db_client.collection('users').document(target_uid).collection('friends').document(uid).set({
        'status':    'pending_received',
        'fromUid':   uid,
        'fromName':  session.get('user_name', ''),
        'createdAt': now
    })
    # Notification
    db_client.collection('notifications').document(target_uid).collection('items').add({
        'type':      'friend_request',
        'fromUid':   uid,
        'fromName':  session.get('user_name', ''),
        'message':   f"{session.get('user_name','Someone')} sent you a friend request!",
        'timestamp': now,
        'read':      False
    })
    return jsonify({"success": True})


@users_bp.route('/api/friends/<target_uid>/accept', methods=['POST'])
@login_required
def accept_friend(target_uid):
    uid       = session['user_uid']
    db_client = get_db()
    db_client.collection('users').document(uid).collection('friends').document(target_uid).update({'status': 'accepted'})
    db_client.collection('users').document(target_uid).collection('friends').document(uid).update({'status': 'accepted'})
    return jsonify({"success": True})


@users_bp.route('/api/friends/<target_uid>/remove', methods=['DELETE'])
@login_required
def remove_friend(target_uid):
    uid       = session['user_uid']
    db_client = get_db()
    db_client.collection('users').document(uid).collection('friends').document(target_uid).delete()
    db_client.collection('users').document(target_uid).collection('friends').document(uid).delete()
    return jsonify({"success": True})


@users_bp.route('/api/block/<target_uid>', methods=['POST'])
@login_required
def block_user(target_uid):
    uid       = session['user_uid']
    db_client = get_db()
    db_client.collection('users').document(uid).collection('blocked').document(target_uid).set({
        'blockedAt': int(time.time())
    })
    return jsonify({"success": True})


@users_bp.route('/api/block/<target_uid>', methods=['DELETE'])
@login_required
def unblock_user(target_uid):
    uid       = session['user_uid']
    db_client = get_db()
    db_client.collection('users').document(uid).collection('blocked').document(target_uid).delete()
    return jsonify({"success": True})
