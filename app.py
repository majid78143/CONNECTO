from flask import Flask, render_template, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials
import json, os

from config import (
    SECRET_KEY, DEBUG, FIREBASE_CONFIG,
    FIREBASE_SERVICE_ACCOUNT, validate_config
)

# ── Routes ────────────────────────────────────────────────────────
from routes.auth     import auth_bp
from routes.main     import main_bp
from routes.upload   import upload_bp
from routes.payments import payments_bp
from routes.admin    import admin_bp
from routes.games    import games_bp
from routes.bots     import bots_bp
from routes.users    import users_bp
from routes.servers  import servers_bp
from routes.pages    import pages_bp

def create_app():
    app = Flask(__name__)
    app.secret_key = SECRET_KEY
    CORS(app)

    # ── Firebase Admin SDK init ───────────────────────────────────
    if not firebase_admin._apps:
        if FIREBASE_SERVICE_ACCOUNT:
            cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT)
            firebase_admin.initialize_app(cred, {
                'databaseURL': os.environ.get('FIREBASE_DATABASE_URL', '')
            })
        else:
            print("[CONNECTO] ⚠️  Firebase Admin SDK not initialized — service account missing")

    # ── Blueprints ────────────────────────────────────────────────
    app.register_blueprint(auth_bp,     url_prefix='/auth')
    app.register_blueprint(main_bp,     url_prefix='/')
    app.register_blueprint(upload_bp,   url_prefix='/api/upload')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    app.register_blueprint(admin_bp,    url_prefix='/admin')
    app.register_blueprint(games_bp,    url_prefix='/games')
    app.register_blueprint(bots_bp,     url_prefix='/developers')
    app.register_blueprint(users_bp,    url_prefix='/u')
    app.register_blueprint(servers_bp,  url_prefix='/s')
    app.register_blueprint(pages_bp,    url_prefix='/')

    # ── Context processor — Firebase config available in all templates
    @app.context_processor
    def inject_firebase():
        return dict(firebase_config=FIREBASE_CONFIG)

    # ── Error handlers ────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return render_template('pages/404.html'), 404

    @app.errorhandler(403)
    def forbidden(e):
        return render_template('pages/403.html'), 403

    @app.errorhandler(500)
    def server_error(e):
        return render_template('pages/500.html'), 500

    # ── Health check ──────────────────────────────────────────────
    @app.route('/api/health')
    def health():
        return jsonify({"status": "ok", "app": "CONNECTO"})

    return app


app = create_app()

if __name__ == '__main__':
    validate_config()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=DEBUG)
