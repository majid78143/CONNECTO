import time, json
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from firebase_admin import firestore, auth as fb_auth
from config import ADMIN_EMAIL, ADMIN_PASSWORD

admin_bp = Blueprint('admin', __name__)

db = None
def get_db():
    global db
    if db is None:
        db = firestore.client()
    return db

def is_admin():
    return session.get('user_uid') and session.get('user_email') == ADMIN_EMAIL

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_admin():
            return jsonify({"error": "Admin only"}), 403
        return f(*args, **kwargs)
    return decorated


@admin_bp.route('/')
def panel():
    if not is_admin():
        return redirect(url_for('auth.login'))
    return render_template('admin/panel.html')


@admin_bp.route('/api/stats')
@admin_required
def stats():
    db_client = get_db()
    users   = len(db_client.collection('users').get())
    servers = len(db_client.collection('servers').get())
    bots    = len(db_client.collection('bots').get())
    payments= db_client.collection('payments').where('status','==','success').get()
    revenue = sum(p.to_dict().get('amount',0) for p in payments)
    return jsonify({
        "totalUsers":   users,
        "totalServers": servers,
        "totalBots":    bots,
        "totalRevenue": revenue,
        "currency":     "INR"
    })


@admin_bp.route('/api/users')
@admin_required
def list_users():
    db_client = get_db()
    page      = int(request.args.get('page', 1))
    per_page  = int(request.args.get('per_page', 50))
    docs      = db_client.collection('users').limit(per_page).offset((page-1)*per_page).get()
    users     = [{"id": d.id, **d.to_dict()} for d in docs]
    # Strip sensitive fields
    for u in users:
        u.pop('profileAnimation', None)
    return jsonify({"users": users, "page": page, "per_page": per_page})


@admin_bp.route('/api/users/<uid>/premium', methods=['POST'])
@admin_required
def set_premium(uid):
    data     = request.get_json()
    premium  = data.get('isPremium', False)
    plan     = data.get('plan', 'monthly')
    days     = {"weekly":7,"monthly":30,"yearly":365}.get(plan, 30)
    expiry   = int(time.time()) + days*86400 if premium else None
    db_client= get_db()
    db_client.collection('users').document(uid).update({
        'isPremium':    premium,
        'premiumExpiry': expiry,
        'premiumPlan':  plan if premium else None
    })
    _log(f"Admin set premium={premium} plan={plan} for uid={uid}")
    return jsonify({"success": True})


@admin_bp.route('/api/users/<uid>/role', methods=['POST'])
@admin_required
def set_role(uid):
    role = request.get_json().get('role', 'user')
    if role not in ['user','moderator','admin']:
        return jsonify({"error": "Invalid role"}), 400
    db_client = get_db()
    db_client.collection('users').document(uid).update({'role': role})
    _log(f"Admin set role={role} for uid={uid}")
    return jsonify({"success": True})


@admin_bp.route('/api/users/<uid>/ban', methods=['POST'])
@admin_required
def ban_user(uid):
    banned = request.get_json().get('banned', True)
    db_client = get_db()
    db_client.collection('users').document(uid).update({'isBanned': banned})
    try:
        if banned:
            fb_auth.update_user(uid, disabled=True)
        else:
            fb_auth.update_user(uid, disabled=False)
    except Exception:
        pass
    _log(f"Admin ban={banned} uid={uid}")
    return jsonify({"success": True})


@admin_bp.route('/api/users/<uid>/animation', methods=['POST'])
@admin_required
def set_animation(uid):
    html = request.get_json().get('html', '')
    if len(html) > 20000:
        return jsonify({"error": "HTML too long (max 20000 chars)"}), 400
    db_client = get_db()
    db_client.collection('users').document(uid).update({'profileAnimation': html})
    _log(f"Admin set profileAnimation for uid={uid}")
    return jsonify({"success": True})


@admin_bp.route('/api/users/<uid>/coins', methods=['POST'])
@admin_required
def adjust_coins(uid):
    amount = int(request.get_json().get('amount', 0))
    db_client = get_db()
    coin_ref  = db_client.collection('coins').document(uid)
    coin_doc  = coin_ref.get()
    old_bal   = coin_doc.to_dict().get('balance', 0) if coin_doc.exists else 0
    new_bal   = max(0, old_bal + amount)
    coin_ref.set({'balance': new_bal}, merge=True)
    _log(f"Admin adjusted coins by {amount} for uid={uid}. New balance: {new_bal}")
    return jsonify({"success": True, "newBalance": new_bal})


@admin_bp.route('/api/bots/<bot_id>/official', methods=['POST'])
@admin_required
def set_official_bot(bot_id):
    official = request.get_json().get('isOfficial', True)
    db_client = get_db()
    db_client.collection('bots').document(bot_id).update({'isOfficial': official})
    _log(f"Admin set isOfficial={official} for bot={bot_id}")
    return jsonify({"success": True})


@admin_bp.route('/api/servers/<server_id>/verify', methods=['POST'])
@admin_required
def verify_server(server_id):
    verified = request.get_json().get('verified', True)
    db_client = get_db()
    db_client.collection('servers').document(server_id).update({'isVerified': verified})
    return jsonify({"success": True})


@admin_bp.route('/api/servers/<server_id>/delete', methods=['DELETE'])
@admin_required
def delete_server(server_id):
    db_client = get_db()
    db_client.collection('servers').document(server_id).delete()
    _log(f"Admin deleted server={server_id}")
    return jsonify({"success": True})


# ── Backup / Restore ─────────────────────────────────────────────

@admin_bp.route('/api/backup/export', methods=['GET'])
@admin_required
def export_backup():
    db_client  = get_db()
    include    = request.args.getlist('include') or ['users','coins','servers','bots','payments']
    backup     = {
        "meta": {
            "app":        "CONNECTO",
            "version":    "1.0.0",
            "exportedAt": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            "exportedBy": session.get('user_email', 'admin'),
        }
    }

    if 'users' in include:
        docs = db_client.collection('users').get()
        backup['users'] = [{**d.to_dict(), "uid": d.id} for d in docs]

    if 'coins' in include:
        docs = db_client.collection('coins').get()
        backup['coins'] = [{**d.to_dict(), "uid": d.id} for d in docs]

    if 'servers' in include:
        docs = db_client.collection('servers').get()
        backup['servers'] = [{**d.to_dict(), "serverId": d.id} for d in docs]

    if 'bots' in include:
        docs = db_client.collection('bots').get()
        bots_list = []
        for d in docs:
            b = {**d.to_dict(), "botId": d.id}
            b.pop('token', None)   # Never export tokens
            bots_list.append(b)
        backup['bots'] = bots_list

    if 'payments' in include:
        docs = db_client.collection('payments').get()
        backup['payments'] = [{**d.to_dict(), "paymentId": d.id} for d in docs]

    backup['meta']['totalUsers']   = len(backup.get('users', []))
    backup['meta']['totalServers'] = len(backup.get('servers', []))

    from flask import Response
    filename = f"connecto_backup_{time.strftime('%Y-%m-%d')}.json"
    return Response(
        json.dumps(backup, indent=2, default=str),
        mimetype='application/json',
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@admin_bp.route('/api/backup/restore', methods=['POST'])
@admin_required
def restore_backup():
    data    = request.get_json()
    mode    = data.get('mode', 'merge')  # merge or overwrite
    backup  = data.get('backup', {})
    results = {}
    db_client = get_db()

    if 'users' in backup:
        count = 0
        for user in backup['users']:
            uid = user.pop('uid', None)
            if not uid: continue
            user.pop('token', None)
            if mode == 'merge':
                db_client.collection('users').document(uid).set(user, merge=True)
            else:
                db_client.collection('users').document(uid).set(user)
            count += 1
        results['users'] = count

    if 'coins' in backup:
        count = 0
        for coin in backup['coins']:
            uid = coin.pop('uid', None)
            if not uid: continue
            db_client.collection('coins').document(uid).set(coin, merge=True)
            count += 1
        results['coins'] = count

    _log(f"Admin restored backup mode={mode} results={results}")
    return jsonify({"success": True, "restored": results})


@admin_bp.route('/api/announcement', methods=['POST'])
@admin_required
def global_announcement():
    data    = request.get_json()
    content = data.get('content', '')
    if not content:
        return jsonify({"error": "Content required"}), 400
    db_client = get_db()
    db_client.collection('globalAnnouncements').add({
        'content':   content,
        'createdBy': session.get('user_uid'),
        'createdAt': int(time.time()),
        'isActive':  True
    })
    return jsonify({"success": True})


@admin_bp.route('/api/logs')
@admin_required
def get_logs():
    db_client = get_db()
    docs      = db_client.collection('adminLogs').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(100).get()
    logs      = [{"id": d.id, **d.to_dict()} for d in docs]
    return jsonify({"logs": logs})


def _log(message):
    try:
        db = get_db()
        db.collection('adminLogs').add({
            'message':   message,
            'adminEmail': session.get('user_email', 'system'),
            'timestamp': int(time.time())
        })
    except Exception:
        pass
