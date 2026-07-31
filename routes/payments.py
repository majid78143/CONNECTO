import razorpay, hmac, hashlib, time
from flask import Blueprint, request, jsonify, session
from firebase_admin import firestore
from config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, PREMIUM_PLANS

payments_bp = Blueprint('payments', __name__)
rz_client   = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID else None

db = None
def get_db():
    global db
    if db is None:
        db = firestore.client()
    return db


@payments_bp.route('/create-order', methods=['POST'])
def create_order():
    if 'user_uid' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    if not rz_client:
        return jsonify({"error": "Payment service unavailable"}), 503

    data = request.get_json()
    plan = data.get('plan', 'monthly')
    if plan not in PREMIUM_PLANS:
        return jsonify({"error": "Invalid plan"}), 400

    plan_info = PREMIUM_PLANS[plan]
    amount_paise = plan_info['price'] * 100   # Razorpay uses paise

    try:
        order = rz_client.order.create({
            "amount":   amount_paise,
            "currency": "INR",
            "receipt":  f"connecto_{session['user_uid']}_{int(time.time())}",
            "notes": {
                "user_uid": session['user_uid'],
                "plan":     plan,
                "app":      "CONNECTO"
            }
        })
        return jsonify({
            "order_id":   order['id'],
            "amount":     order['amount'],
            "currency":   order['currency'],
            "plan":       plan,
            "plan_name":  plan_info['name'],
            "razorpay_key": RAZORPAY_KEY_ID
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@payments_bp.route('/verify', methods=['POST'])
def verify_payment():
    if 'user_uid' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data     = request.get_json()
    order_id = data.get('razorpay_order_id', '')
    pay_id   = data.get('razorpay_payment_id', '')
    signature= data.get('razorpay_signature', '')
    plan     = data.get('plan', 'monthly')

    # Signature verification
    msg = f"{order_id}|{pay_id}".encode()
    expected = hmac.new(RAZORPAY_KEY_SECRET.encode(), msg, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return jsonify({"error": "Invalid signature"}), 400

    if plan not in PREMIUM_PLANS:
        return jsonify({"error": "Invalid plan"}), 400

    uid       = session['user_uid']
    plan_info = PREMIUM_PLANS[plan]
    now       = int(time.time())
    expiry    = now + (plan_info['duration'] * 86400)

    db_client = get_db()

    # Update user premium status
    db_client.collection('users').document(uid).update({
        'isPremium':     True,
        'premiumExpiry': expiry,
        'premiumPlan':   plan
    })

    # Add coins bonus
    coin_ref = db_client.collection('coins').document(uid)
    coin_doc = coin_ref.get()
    old_bal  = coin_doc.to_dict().get('balance', 0) if coin_doc.exists else 0
    coin_ref.set({'balance': old_bal + plan_info['coins']}, merge=True)

    # Log payment
    db_client.collection('payments').add({
        'userId':          uid,
        'orderId':         order_id,
        'paymentId':       pay_id,
        'amount':          plan_info['price'],
        'currency':        'INR',
        'plan':            plan,
        'status':          'success',
        'coinsAwarded':    plan_info['coins'],
        'premiumExpiry':   expiry,
        'createdAt':       now
    })

    return jsonify({
        "success":      True,
        "message":      f"Premium activated! {plan_info['coins']} bonus coins added.",
        "premiumExpiry": expiry,
        "coinsAwarded":  plan_info['coins']
    })


@payments_bp.route('/webhook', methods=['POST'])
def webhook():
    """Razorpay webhook for payment events"""
    payload   = request.get_data()
    signature = request.headers.get('X-Razorpay-Signature', '')
    expected  = hmac.new(RAZORPAY_KEY_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return jsonify({"error": "Invalid signature"}), 400
    return jsonify({"status": "ok"})


@payments_bp.route('/plans', methods=['GET'])
def get_plans():
    return jsonify(PREMIUM_PLANS)
