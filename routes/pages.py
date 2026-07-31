from flask import Blueprint, render_template, request, jsonify
from firebase_admin import firestore
import time

pages_bp = Blueprint('pages', __name__)

db = None
def get_db():
    global db
    if db is None:
        db = firestore.client()
    return db


@pages_bp.route('/about')
def about():
    return render_template('pages/about.html')

@pages_bp.route('/terms')
def terms():
    return render_template('pages/terms.html')

@pages_bp.route('/privacy')
def privacy():
    return render_template('pages/privacy.html')

@pages_bp.route('/contact')
def contact():
    return render_template('pages/contact.html')

@pages_bp.route('/guidelines')
def guidelines():
    return render_template('pages/guidelines.html')

@pages_bp.route('/status')
def status():
    return render_template('pages/status.html')

@pages_bp.route('/download')
def download():
    return render_template('pages/download.html')

@pages_bp.route('/cookies')
def cookies():
    return render_template('pages/cookies.html')

@pages_bp.route('/dmca')
def dmca():
    return render_template('pages/dmca.html')

@pages_bp.route('/contact', methods=['POST'])
def contact_submit():
    data    = request.get_json()
    name    = data.get('name','').strip()
    email   = data.get('email','').strip()
    message = data.get('message','').strip()
    if not all([name, email, message]):
        return jsonify({"error": "All fields required"}), 400
    if len(message) > 2000:
        return jsonify({"error": "Message too long"}), 400
    db_client = get_db()
    db_client.collection('contactForms').add({
        'name':      name,
        'email':     email,
        'message':   message,
        'createdAt': int(time.time()),
        'status':    'unread'
    })
    return jsonify({"success": True, "message": "Message sent! We'll reply soon."})
