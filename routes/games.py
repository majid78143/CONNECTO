import time, random
from flask import Blueprint, render_template, request, jsonify, session
from firebase_admin import firestore
from config import GAMES, DAILY_CLAIM_COINS, GAME_RATE_LIMIT

games_bp = Blueprint('games', __name__)

db = None
def get_db():
    global db
    if db is None:
        db = firestore.client()
    return db


@games_bp.route('/')
def index():
    return render_template('games/index.html', games=GAMES)


@games_bp.route('/<game_id>')
def play_game(game_id):
    if game_id not in GAMES:
        return "Game not found", 404
    return render_template(f'games/{game_id}.html', game=GAMES[game_id])


@games_bp.route('/api/earn-coins', methods=['POST'])
def earn_coins():
    if 'user_uid' not in session:
        return jsonify({"error": "Login required"}), 401

    data    = request.get_json()
    game_id = data.get('game', '')
    score   = int(data.get('score', 0))

    if game_id not in GAMES:
        return jsonify({"error": "Invalid game"}), 400

    uid       = session['user_uid']
    db_client = get_db()
    coin_ref  = db_client.collection('coins').document(uid)
    coin_doc  = coin_ref.get()
    coin_data = coin_doc.to_dict() if coin_doc.exists else {}

    now           = int(time.time())
    last_earn     = coin_data.get('lastGameEarn', 0)
    earned_hour   = coin_data.get('earnedThisHour', 0)
    hour_reset    = coin_data.get('hourReset', 0)

    # Reset hourly counter
    if now - hour_reset > 3600:
        earned_hour = 0
        hour_reset  = now

    # Rate limit check
    if earned_hour >= GAME_RATE_LIMIT:
        return jsonify({"error": "Hourly coin limit reached. Come back later!", "limited": True}), 429

    g       = GAMES[game_id]
    coins   = min(g['min_coins'], g['max_coins'])

    # Score-based coins
    if game_id == 'snake':
        coins = min(int(score * 0.2), g['max_coins'])
    elif game_id == 'flappy_bird':
        coins = min(int(score * 0.2), g['max_coins'])
    elif game_id == 'number_guess':
        coins = random.randint(g['min_coins'], g['max_coins'])
    elif game_id == 'coin_flip':
        coins = g['max_coins'] if score > 0 else 0
    elif game_id == 'math_quiz':
        coins = min(int(score * 0.5), g['max_coins'])
    else:
        coins = random.randint(g['min_coins'], g['max_coins'])

    old_bal     = coin_data.get('balance', 0)
    total_earned= coin_data.get('totalEarned', 0)
    new_bal     = old_bal + coins
    earned_hour += coins

    coin_ref.set({
        'balance':        new_bal,
        'totalEarned':    total_earned + coins,
        'lastGameEarn':   now,
        'earnedThisHour': earned_hour,
        'hourReset':      hour_reset
    }, merge=True)

    # Update leaderboard
    db_client.collection('leaderboard').document(uid).set({
        'coins':    new_bal,
        'uid':      uid,
        'username': session.get('user_name', 'User'),
        'updatedAt': now
    }, merge=True)

    # Game history
    db_client.collection('gameScores').document(uid).collection('history').add({
        'game':       game_id,
        'score':      score,
        'coinsEarned': coins,
        'playedAt':   now
    })

    return jsonify({"success": True, "coinsEarned": coins, "newBalance": new_bal})


@games_bp.route('/api/daily-claim', methods=['POST'])
def daily_claim():
    if 'user_uid' not in session:
        return jsonify({"error": "Login required"}), 401

    uid       = session['user_uid']
    db_client = get_db()
    coin_ref  = db_client.collection('coins').document(uid)
    coin_doc  = coin_ref.get()
    coin_data = coin_doc.to_dict() if coin_doc.exists else {}

    now       = int(time.time())
    last_claim= coin_data.get('lastDailyClaim', 0)

    # Check if 24 hours passed
    if now - last_claim < 86400:
        remaining = 86400 - (now - last_claim)
        hrs = remaining // 3600
        mins= (remaining % 3600) // 60
        return jsonify({
            "error":     f"Already claimed! Come back in {hrs}h {mins}m",
            "claimed":   False,
            "remaining": remaining
        }), 429

    old_bal = coin_data.get('balance', 0)
    new_bal = old_bal + DAILY_CLAIM_COINS

    coin_ref.set({
        'balance':       new_bal,
        'totalEarned':   coin_data.get('totalEarned', 0) + DAILY_CLAIM_COINS,
        'lastDailyClaim': now
    }, merge=True)

    return jsonify({
        "success":     True,
        "claimed":     True,
        "coinsEarned": DAILY_CLAIM_COINS,
        "newBalance":  new_bal
    })


@games_bp.route('/api/leaderboard')
def leaderboard():
    db_client = get_db()
    docs = db_client.collection('leaderboard').order_by('coins', direction=firestore.Query.DESCENDING).limit(50).get()
    board = [{"rank": i+1, **d.to_dict()} for i, d in enumerate(docs)]
    return jsonify({"leaderboard": board})


@games_bp.route('/api/balance')
def balance():
    if 'user_uid' not in session:
        return jsonify({"error": "Login required"}), 401
    uid       = session['user_uid']
    db_client = get_db()
    doc       = db_client.collection('coins').document(uid).get()
    data      = doc.to_dict() if doc.exists else {}
    now       = int(time.time())
    last_claim= data.get('lastDailyClaim', 0)
    can_claim = (now - last_claim) >= 86400
    return jsonify({
        "balance":    data.get('balance', 0),
        "totalEarned": data.get('totalEarned', 0),
        "canClaim":   can_claim,
        "nextClaim":  max(0, 86400 - (now - last_claim))
    })
