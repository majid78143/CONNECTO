from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from firebase_admin import firestore

main_bp = Blueprint('main', __name__)

db = None
def get_db():
    global db
    if db is None:
        db = firestore.client()
    return db


@main_bp.route('/')
def index():
    if 'user_uid' in session:
        return redirect(url_for('main.app_page'))
    return render_template('index.html')


@main_bp.route('/app')
def app_page():
    if 'user_uid' not in session:
        return redirect(url_for('auth.login'))
    return render_template('app/main.html', server_id=None)


@main_bp.route('/app/dm/<uid>')
def dm_page(uid):
    if 'user_uid' not in session:
        return redirect(url_for('auth.login'))
    return render_template('app/main.html', dm_uid=uid, server_id=None)


@main_bp.route('/invite/<code>')
def invite(code):
    if 'user_uid' not in session:
        return redirect(url_for('auth.login') + f'?next=/invite/{code}')
    db_client = get_db()
    # Find server with this invite code
    servers = db_client.collection('servers').get()
    server_id = None
    for s in servers:
        inv = s.reference.collection('invites').document(code).get()
        if inv.exists:
            server_id = s.id
            inv.reference.update({'uses': firestore.Increment(1)})
            break
    if not server_id:
        return render_template('pages/404.html', message="Invite link invalid or expired")
    return render_template('app/invite.html', server_id=server_id, code=code)


@main_bp.route('/m/<message_id>')
def message_link(message_id):
    """Unique link for each message"""
    return render_template('app/message_link.html', message_id=message_id)


@main_bp.route('/settings')
def settings():
    if 'user_uid' not in session:
        return redirect(url_for('auth.login'))
    return render_template('app/settings.html')


@main_bp.route('/premium')
def premium():
    return render_template('premium/index.html')


@main_bp.route('/api/search')
def search():
    if 'user_uid' not in session:
        return jsonify({"error":"Login required"}), 401
    q         = request.args.get('q','').strip()
    category  = request.args.get('type','all')
    if not q or len(q) < 2:
        return jsonify({"results":[]})
    db_client = get_db()
    results   = []

    if category in ('all','users'):
        docs = db_client.collection('users').where('username','>=',q).where('username','<=',q+'\uf8ff').limit(10).get()
        for d in docs:
            u = d.to_dict()
            results.append({
                'type':'user','uid':d.id,
                'name': u.get('displayName',''),
                'username': u.get('username',''),
                'avatar': u.get('avatarUrl',''),
                'isPremium': u.get('isPremium',False)
            })

    if category in ('all','servers'):
        docs = db_client.collection('servers').where('isPublic','==',True).where('name','>=',q).where('name','<=',q+'\uf8ff').limit(10).get()
        for d in docs:
            s = d.to_dict()
            results.append({
                'type':'server','serverId':d.id,
                'name': s.get('name',''),
                'icon': s.get('iconUrl',''),
                'members': s.get('memberCount',0)
            })

    return jsonify({"results": results, "query": q})
