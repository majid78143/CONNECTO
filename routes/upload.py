import requests, random, base64
from flask import Blueprint, request, jsonify, session
from config import IMAGEBB_KEYS, MAX_IMAGEBB_FILE_SIZE_MB

upload_bp = Blueprint('upload', __name__)

def get_imagebb_key():
    """Round-robin ImageBB key selection"""
    if not IMAGEBB_KEYS:
        return None
    return random.choice(IMAGEBB_KEYS)

@upload_bp.route('/image', methods=['POST'])
def upload_image():
    """Proxy upload to ImageBB — API key never exposed to frontend"""
    if 'user_uid' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    key = get_imagebb_key()
    if not key:
        return jsonify({"error": "Upload service unavailable"}), 503

    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    # Size check
    file.seek(0, 2)
    size_mb = file.tell() / (1024 * 1024)
    file.seek(0)
    if size_mb > MAX_IMAGEBB_FILE_SIZE_MB:
        return jsonify({"error": f"File too large. Max {MAX_IMAGEBB_FILE_SIZE_MB}MB"}), 413

    allowed = {'png','jpg','jpeg','gif','webp','bmp'}
    ext = file.filename.rsplit('.', 1)[-1].lower()
    if ext not in allowed:
        return jsonify({"error": "File type not allowed"}), 400

    try:
        img_data = base64.b64encode(file.read()).decode('utf-8')
        resp = requests.post(
            'https://api.imgbb.com/1/upload',
            data={'key': key, 'image': img_data},
            timeout=15
        )
        data = resp.json()
        if data.get('success'):
            return jsonify({
                "success": True,
                "url":      data['data']['url'],
                "display":  data['data']['display_url'],
                "thumb":    data['data']['thumb']['url'],
                "delete":   data['data']['delete_url'],
            })
        return jsonify({"error": "Upload failed", "detail": data.get('error', {}).get('message', '')}), 500
    except Exception as e:
        return jsonify({"error": "Upload error", "detail": str(e)}), 500


@upload_bp.route('/avatar', methods=['POST'])
def upload_avatar():
    """Avatar upload — same as image but adds user uid tag"""
    if 'user_uid' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    return upload_image()


@upload_bp.route('/server-icon', methods=['POST'])
def upload_server_icon():
    """Server icon upload"""
    if 'user_uid' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    return upload_image()
