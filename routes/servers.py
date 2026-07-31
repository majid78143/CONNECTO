import time, secrets
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from firebase_admin import firestore
from config import SERVER_TEMPLATES

servers_bp = Blueprint('servers', __name__)

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
            return jsonify({"error":"Login required"}), 401
        return f(*args, **kwargs)
    return decorated


@servers_bp.route('/<server_id>')
def server_page(server_id):
    if 'user_uid' not in session:
        return redirect(url_for('auth.login'))
    return render_template('app/main.html', server_id=server_id)


@servers_bp.route('/api/list')
@login_required
def list_servers():
    uid       = session['user_uid']
    db_client = get_db()
    # Servers user is member of
    docs = db_client.collection_group('members').where('uid','==',uid).get()
    server_ids = [d.reference.parent.parent.id for d in docs]
    servers = []
    for sid in server_ids[:50]:
        doc = db_client.collection('servers').document(sid).get()
        if doc.exists:
            s = {"serverId": sid, **doc.to_dict()}
            servers.append(s)
    return jsonify({"servers": servers})


@servers_bp.route('/api/create', methods=['POST'])
@login_required
def create_server():
    uid       = session['user_uid']
    db_client = get_db()
    data      = request.get_json()
    name      = data.get('name','').strip()[:100]
    icon_url  = data.get('iconUrl','')
    template  = data.get('template','')
    is_public = data.get('isPublic', True)

    if not name:
        return jsonify({"error":"Server name required"}), 400

    tmpl = SERVER_TEMPLATES.get(template, {})
    now  = int(time.time())

    _, srv_ref = db_client.collection('servers').add({
        'name':        name,
        'iconUrl':     icon_url,
        'bannerUrl':   '',
        'description': data.get('description',''),
        'ownerId':     uid,
        'isPublic':    is_public,
        'isVerified':  False,
        'memberCount': 1,
        'createdAt':   now,
        'settings': {
            'defaultNotifications': 'all',
            'slowMode': 0,
            'verificationLevel': 0
        }
    })

    # Add owner as member
    srv_ref.collection('members').document(uid).set({
        'uid':      uid,
        'role':     'owner',
        'joinedAt': now,
        'nickname': ''
    })

    # Default roles
    roles = [
        {'name':'Owner','color':'#ffd700','permissions':['all'],'position':100},
        {'name':'Admin','color':'#e74c3c','permissions':['manage_channels','manage_roles','kick_members','ban_members','delete_messages'],'position':90},
        {'name':'Moderator','color':'#3498db','permissions':['kick_members','delete_messages','pin_messages'],'position':50},
        {'name':'Member','color':'#95a5a6','permissions':['send_messages','read_messages','add_reactions'],'position':1},
    ]
    for r in roles:
        srv_ref.collection('roles').add({**r, 'createdAt': now})

    # Channels from template or default
    channels = tmpl.get('channels', ['general','random'])
    for i, ch in enumerate(channels):
        is_announce = 'announce' in ch
        srv_ref.collection('channels').add({
            'name':     ch,
            'type':     'announcement' if is_announce else 'text',
            'position': i,
            'topic':    '',
            'slowMode': 0,
            'isNsfw':   False,
            'createdAt': now
        })

    return jsonify({"success": True, "serverId": srv_ref.id})


@servers_bp.route('/api/<server_id>/settings', methods=['GET'])
@login_required
def get_settings(server_id):
    uid       = session['user_uid']
    db_client = get_db()
    doc       = db_client.collection('servers').document(server_id).get()
    if not doc.exists:
        return jsonify({"error":"Server not found"}), 404
    data = doc.to_dict()
    # Only owner/admin
    member = db_client.collection('servers').document(server_id).collection('members').document(uid).get()
    if not member.exists or member.to_dict().get('role') not in ['owner','admin']:
        return jsonify({"error":"Not authorized"}), 403
    return jsonify({"serverId": doc.id, **data})


@servers_bp.route('/api/<server_id>/settings', methods=['PATCH'])
@login_required
def update_settings(server_id):
    uid       = session['user_uid']
    db_client = get_db()
    member    = db_client.collection('servers').document(server_id).collection('members').document(uid).get()
    if not member.exists or member.to_dict().get('role') not in ['owner','admin']:
        return jsonify({"error":"Not authorized"}), 403
    data    = request.get_json()
    allowed = ['name','description','iconUrl','bannerUrl','isPublic','settings']
    updates = {k: v for k,v in data.items() if k in allowed}
    if updates:
        db_client.collection('servers').document(server_id).update(updates)
    return jsonify({"success": True})


@servers_bp.route('/api/<server_id>/invite', methods=['POST'])
@login_required
def create_invite(server_id):
    uid       = session['user_uid']
    db_client = get_db()
    member    = db_client.collection('servers').document(server_id).collection('members').document(uid).get()
    if not member.exists:
        return jsonify({"error":"Not a member"}), 403
    code = secrets.token_urlsafe(8)
    db_client.collection('servers').document(server_id).collection('invites').document(code).set({
        'code':      code,
        'createdBy': uid,
        'createdAt': int(time.time()),
        'uses':      0,
        'maxUses':   data.get('maxUses', 0) if (data := request.get_json()) else 0,
        'expiresAt': None
    })
    return jsonify({"success": True, "code": code, "url": f"/invite/{code}"})


@servers_bp.route('/api/<server_id>/join', methods=['POST'])
@login_required
def join_server(server_id):
    uid       = session['user_uid']
    db_client = get_db()
    srv_doc   = db_client.collection('servers').document(server_id).get()
    if not srv_doc.exists:
        return jsonify({"error":"Server not found"}), 404
    member_ref = db_client.collection('servers').document(server_id).collection('members').document(uid)
    if member_ref.get().exists:
        return jsonify({"error":"Already a member"}), 409
    member_ref.set({'uid': uid, 'role': 'member', 'joinedAt': int(time.time()), 'nickname': ''})
    db_client.collection('servers').document(server_id).update({'memberCount': firestore.Increment(1)})
    return jsonify({"success": True})


@servers_bp.route('/api/<server_id>/leave', methods=['POST'])
@login_required
def leave_server(server_id):
    uid       = session['user_uid']
    db_client = get_db()
    db_client.collection('servers').document(server_id).collection('members').document(uid).delete()
    db_client.collection('servers').document(server_id).update({'memberCount': firestore.Increment(-1)})
    return jsonify({"success": True})


@servers_bp.route('/api/<server_id>/members')
@login_required
def list_members(server_id):
    uid       = session['user_uid']
    db_client = get_db()
    member    = db_client.collection('servers').document(server_id).collection('members').document(uid).get()
    if not member.exists:
        return jsonify({"error":"Not a member"}), 403
    docs    = db_client.collection('servers').document(server_id).collection('members').limit(200).get()
    members = []
    for d in docs:
        m = {"uid": d.id, **d.to_dict()}
        user_doc = db_client.collection('users').document(d.id).get()
        if user_doc.exists:
            ud = user_doc.to_dict()
            m.update({
                'displayName': ud.get('displayName',''),
                'avatarUrl':   ud.get('avatarUrl',''),
                'isPremium':   ud.get('isPremium', False),
                'isOnline':    ud.get('isOnline', False),
                'customStatus': ud.get('customStatus','')
            })
        members.append(m)
    return jsonify({"members": members})


@servers_bp.route('/api/<server_id>/roles')
@login_required
def list_roles(server_id):
    uid       = session['user_uid']
    db_client = get_db()
    member    = db_client.collection('servers').document(server_id).collection('members').document(uid).get()
    if not member.exists:
        return jsonify({"error":"Not a member"}), 403
    docs  = db_client.collection('servers').document(server_id).collection('roles').get()
    roles = [{"roleId": d.id, **d.to_dict()} for d in docs]
    return jsonify({"roles": sorted(roles, key=lambda x: -x.get('position',0))})


@servers_bp.route('/api/<server_id>/roles', methods=['POST'])
@login_required
def create_role(server_id):
    uid       = session['user_uid']
    db_client = get_db()
    member    = db_client.collection('servers').document(server_id).collection('members').document(uid).get()
    if not member.exists or member.to_dict().get('role') not in ['owner','admin']:
        return jsonify({"error":"Not authorized"}), 403
    data = request.get_json()
    _, ref = db_client.collection('servers').document(server_id).collection('roles').add({
        'name':        data.get('name','New Role'),
        'color':       data.get('color','#95a5a6'),
        'icon':        data.get('icon',''),
        'permissions': data.get('permissions',[]),
        'position':    data.get('position', 1),
        'createdAt':   int(time.time())
    })
    return jsonify({"success": True, "roleId": ref.id})


@servers_bp.route('/api/<server_id>/channels', methods=['POST'])
@login_required
def create_channel(server_id):
    uid       = session['user_uid']
    db_client = get_db()
    member    = db_client.collection('servers').document(server_id).collection('members').document(uid).get()
    if not member.exists or member.to_dict().get('role') not in ['owner','admin']:
        return jsonify({"error":"Not authorized"}), 403
    data = request.get_json()
    _, ref = db_client.collection('servers').document(server_id).collection('channels').add({
        'name':     data.get('name','new-channel').lower().replace(' ','-')[:32],
        'type':     data.get('type','text'),
        'topic':    data.get('topic',''),
        'slowMode': 0,
        'isNsfw':   False,
        'position': data.get('position', 0),
        'createdAt': int(time.time())
    })
    return jsonify({"success": True, "channelId": ref.id})


@servers_bp.route('/api/<server_id>/kick/<target_uid>', methods=['POST'])
@login_required
def kick_member(server_id, target_uid):
    uid       = session['user_uid']
    db_client = get_db()
    member    = db_client.collection('servers').document(server_id).collection('members').document(uid).get()
    if not member.exists or member.to_dict().get('role') not in ['owner','admin','moderator']:
        return jsonify({"error":"Not authorized"}), 403
    db_client.collection('servers').document(server_id).collection('members').document(target_uid).delete()
    db_client.collection('servers').document(server_id).update({'memberCount': firestore.Increment(-1)})
    return jsonify({"success": True})
