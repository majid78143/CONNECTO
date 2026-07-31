import time, secrets, hashlib
from flask import Blueprint, render_template, request, jsonify, session
from firebase_admin import firestore

bots_bp = Blueprint('bots', __name__)

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


@bots_bp.route('/')
def portal():
    if 'user_uid' not in session:
        from flask import redirect, url_for
        return redirect(url_for('auth.login'))
    return render_template('developers/portal.html')


@bots_bp.route('/api/bots', methods=['GET'])
@login_required
def list_bots():
    uid       = session['user_uid']
    db_client = get_db()
    docs      = db_client.collection('bots').where('ownerId', '==', uid).get()
    bots      = []
    for d in docs:
        b = {"botId": d.id, **d.to_dict()}
        b.pop('token', None)   # Never send token in list
        bots.append(b)
    return jsonify({"bots": bots})


@bots_bp.route('/api/bots', methods=['POST'])
@login_required
def create_bot():
    uid       = session['user_uid']
    db_client = get_db()

    # Max 5 bots per user
    existing = db_client.collection('bots').where('ownerId', '==', uid).get()
    if len(existing) >= 5:
        return jsonify({"error": "Max 5 bots allowed per account"}), 400

    data     = request.get_json()
    name     = data.get('name', '').strip()[:32]
    bio      = data.get('bio', '').strip()
    avatar   = data.get('avatarUrl', '')

    if not name:
        return jsonify({"error": "Bot name required"}), 400

    # Check premium for HTML bio
    user_doc  = db_client.collection('users').document(uid).get()
    is_premium= user_doc.to_dict().get('isPremium', False) if user_doc.exists else False
    if not is_premium and len(bio) > 500:
        return jsonify({"error": "Bio max 500 chars for normal users. Upgrade to Premium for HTML bio!"}), 400

    # Generate unique bot token
    token = f"Bot.{secrets.token_urlsafe(48)}"

    _, bot_ref = db_client.collection('bots').add({
        'name':       name,
        'bio':        bio,
        'avatarUrl':  avatar,
        'ownerId':    uid,
        'isOfficial': False,
        'isVerified': False,
        'isBanned':   False,
        'createdAt':  int(time.time()),
        'servers':    [],
        'isHtmlBio':  is_premium
    })

    # Store token separately (only owner can read)
    bot_ref.collection('token').document('main').set({'token': token})

    return jsonify({"success": True, "botId": bot_ref.id, "token": token})


@bots_bp.route('/api/bots/<bot_id>', methods=['GET'])
@login_required
def get_bot(bot_id):
    uid       = session['user_uid']
    db_client = get_db()
    doc       = db_client.collection('bots').document(bot_id).get()
    if not doc.exists:
        return jsonify({"error": "Bot not found"}), 404
    bot = {"botId": doc.id, **doc.to_dict()}
    if bot.get('ownerId') != uid:
        bot.pop('token', None)
    return jsonify(bot)


@bots_bp.route('/api/bots/<bot_id>', methods=['PATCH'])
@login_required
def update_bot(bot_id):
    uid       = session['user_uid']
    db_client = get_db()
    doc       = db_client.collection('bots').document(bot_id).get()
    if not doc.exists or doc.to_dict().get('ownerId') != uid:
        return jsonify({"error": "Not authorized"}), 403

    data     = request.get_json()
    user_doc = db_client.collection('users').document(uid).get()
    premium  = user_doc.to_dict().get('isPremium', False) if user_doc.exists else False

    updates = {}
    if 'name' in data:
        updates['name'] = data['name'][:32]
    if 'bio' in data:
        bio = data['bio']
        if not premium and len(bio) > 500:
            return jsonify({"error": "Upgrade to Premium for longer HTML bio"}), 400
        updates['bio']     = bio
        updates['isHtmlBio'] = premium
    if 'avatarUrl' in data:
        updates['avatarUrl'] = data['avatarUrl']

    db_client.collection('bots').document(bot_id).update(updates)
    return jsonify({"success": True})


@bots_bp.route('/api/bots/<bot_id>/token', methods=['GET'])
@login_required
def get_token(bot_id):
    uid       = session['user_uid']
    db_client = get_db()
    doc       = db_client.collection('bots').document(bot_id).get()
    if not doc.exists or doc.to_dict().get('ownerId') != uid:
        return jsonify({"error": "Not authorized"}), 403
    token_doc = doc.reference.collection('token').document('main').get()
    if not token_doc.exists:
        return jsonify({"error": "Token not found"}), 404
    return jsonify({"token": token_doc.to_dict().get('token', '')})


@bots_bp.route('/api/bots/<bot_id>/token/regenerate', methods=['POST'])
@login_required
def regenerate_token(bot_id):
    uid       = session['user_uid']
    db_client = get_db()
    doc       = db_client.collection('bots').document(bot_id).get()
    if not doc.exists or doc.to_dict().get('ownerId') != uid:
        return jsonify({"error": "Not authorized"}), 403
    new_token = f"Bot.{secrets.token_urlsafe(48)}"
    doc.reference.collection('token').document('main').set({'token': new_token})
    return jsonify({"success": True, "token": new_token})


@bots_bp.route('/api/bots/<bot_id>', methods=['DELETE'])
@login_required
def delete_bot(bot_id):
    uid       = session['user_uid']
    db_client = get_db()
    doc       = db_client.collection('bots').document(bot_id).get()
    if not doc.exists or doc.to_dict().get('ownerId') != uid:
        return jsonify({"error": "Not authorized"}), 403
    db_client.collection('bots').document(bot_id).delete()
    return jsonify({"success": True})
