"""
CONNECTO — Configuration
All config pulled from environment variables / Replit Secrets
"""
import os, json

# ── App ──────────────────────────────────────────────────────────────────────
APP_NAME    = os.environ.get('APP_NAME', 'CONNECTO')
SECRET_KEY  = os.environ.get('SECRET_KEY', 'change-me-in-production')
SESSION_SECRET = os.environ.get('SESSION_SECRET', SECRET_KEY)
FLASK_ENV   = os.environ.get('FLASK_ENV', 'development')
DEBUG       = FLASK_ENV != 'production'

ADMIN_EMAIL    = os.environ.get('ADMIN_EMAIL', '')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')

# ── Firebase ─────────────────────────────────────────────────────────────────
FIREBASE_SERVICE_ACCOUNT_JSON = os.environ.get('FIREBASE_SERVICE_ACCOUNT', '{}')
FIREBASE_PROJECT_ID  = os.environ.get('FIREBASE_PROJECT_ID',  'connecto-5814d')
FIREBASE_AUTH_DOMAIN = os.environ.get('FIREBASE_AUTH_DOMAIN', 'connecto-5814d.firebaseapp.com')
FIREBASE_DB_URL      = os.environ.get('FIREBASE_DATABASE_URL','https://connecto-5814d-default-rtdb.firebaseio.com')
FIREBASE_STORAGE_BUCKET = os.environ.get('FIREBASE_STORAGE_BUCKET','connecto-5814d.appspot.com')
FIREBASE_MESSAGING_SENDER_ID = os.environ.get('FIREBASE_MESSAGING_SENDER_ID','')
FIREBASE_APP_ID      = os.environ.get('FIREBASE_APP_ID','')
FIREBASE_API_KEY     = os.environ.get('FIREBASE_API_KEY', os.environ.get('GOOGLE_API_KEY',''))
FIREBASE_MEASUREMENT_ID = os.environ.get('FIREBASE_MEASUREMENT_ID','')

# Client-side config (safe to expose — these are public Firebase config values)
FIREBASE_CLIENT_CONFIG = {
    'apiKey':            FIREBASE_API_KEY,
    'authDomain':        FIREBASE_AUTH_DOMAIN,
    'databaseURL':       FIREBASE_DB_URL,
    'projectId':         FIREBASE_PROJECT_ID,
    'storageBucket':     FIREBASE_STORAGE_BUCKET,
    'messagingSenderId': FIREBASE_MESSAGING_SENDER_ID,
    'appId':             FIREBASE_APP_ID,
    'measurementId':     FIREBASE_MEASUREMENT_ID,
}

FIREBASE_CONFIG = FIREBASE_CLIENT_CONFIG

# ── ImageBB ──────────────────────────────────────────────────────────────────
IMAGEBB_KEYS = [
    k for k in [
        os.environ.get('IMAGEBB_KEY_1',''),
        os.environ.get('IMAGEBB_KEY_2',''),
        os.environ.get('IMAGEBB_KEY_3',''),
    ] if k
]

# ── Razorpay ─────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID     = os.environ.get('RAZORPAY_KEY_ID','')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET','')

# ── Adsterra ─────────────────────────────────────────────────────────────────
ADSTERRA_SMART_BANNER_CODE = os.environ.get('ADSTERRA_SMART_BANNER_CODE','')
ADSTERRA_BANNER_URL        = os.environ.get('ADSTERRA_BANNER_URL','')

# ── Premium Plans ─────────────────────────────────────────────────────────────
PREMIUM_PLANS = {
    'weekly':  {'label':'Weekly',  'price_inr': 4900,  'days': 7,   'coins_bonus': 100},
    'monthly': {'label':'Monthly', 'price_inr': 14900, 'days': 30,  'coins_bonus': 500},
    'yearly':  {'label':'Yearly',  'price_inr': 99900, 'days': 365, 'coins_bonus': 7000},
}

# ── Games Config ─────────────────────────────────────────────────────────────
GAMES = {
    'snake':        {'name':'Snake',         'icon':'🐍', 'max_coins':20, 'type':'canvas'},
    'flappy_bird':  {'name':'Flappy Bird',   'icon':'🐦', 'max_coins':20, 'type':'canvas'},
    'tictactoe':    {'name':'Tic-Tac-Toe',   'icon':'❌', 'max_coins':5,  'type':'custom'},
    'memory_cards': {'name':'Memory Cards',  'icon':'🃏', 'max_coins':15, 'type':'custom'},
    'number_guess': {'name':'Number Guess',  'icon':'🎯', 'max_coins':10, 'type':'custom'},
    'word_scramble':{'name':'Word Scramble', 'icon':'🔤', 'max_coins':8,  'type':'custom'},
    'math_quiz':    {'name':'Math Quiz',     'icon':'🧮', 'max_coins':6,  'type':'custom'},
    'reaction_time':{'name':'Reaction Time', 'icon':'⚡', 'max_coins':5,  'type':'custom'},
    'coin_flip':    {'name':'Coin Flip',     'icon':'🎰', 'max_coins':3,  'type':'custom'},
    'color_match':  {'name':'Color Match',   'icon':'🎨', 'max_coins':7,  'type':'custom'},
}
DAILY_CLAIM_COINS  = 50
DAILY_CLAIM_HOURS  = 24

# ── Server Templates ──────────────────────────────────────────────────────────
SERVER_TEMPLATES = {
    'gaming': {
        'name': 'Gaming',
        'channels': [
            {'name':'general',      'type':'text',         'category':'TEXT CHANNELS'},
            {'name':'game-chat',    'type':'text',         'category':'TEXT CHANNELS'},
            {'name':'clips-and-highlights','type':'text',  'category':'TEXT CHANNELS'},
            {'name':'lfg',          'type':'text',         'category':'TEXT CHANNELS'},
            {'name':'General Voice','type':'voice',        'category':'VOICE CHANNELS'},
            {'name':'Gaming Voice', 'type':'voice',        'category':'VOICE CHANNELS'},
        ],
        'roles': [
            {'name':'Pro Gamer', 'color':'#5865f2', 'permissions':[]},
            {'name':'Casual',    'color':'#57f287', 'permissions':[]},
        ]
    },
    'study': {
        'name': 'Study Group',
        'channels': [
            {'name':'announcements','type':'announcement', 'category':'INFO'},
            {'name':'general',      'type':'text',         'category':'STUDY'},
            {'name':'resources',    'type':'text',         'category':'STUDY'},
            {'name':'homework-help','type':'text',         'category':'STUDY'},
            {'name':'Study Room 1', 'type':'voice',        'category':'VOICE'},
        ],
        'roles': [
            {'name':'Tutor',   'color':'#fee75c', 'permissions':['manage_messages']},
            {'name':'Student', 'color':'#57f287', 'permissions':[]},
        ]
    },
    'work': {
        'name': 'Work Team',
        'channels': [
            {'name':'announcements','type':'announcement', 'category':'COMPANY'},
            {'name':'general',      'type':'text',         'category':'TEAM'},
            {'name':'projects',     'type':'text',         'category':'TEAM'},
            {'name':'random',       'type':'text',         'category':'TEAM'},
            {'name':'standup',      'type':'text',         'category':'MEETINGS'},
            {'name':'Team Meeting', 'type':'voice',        'category':'MEETINGS'},
        ],
        'roles': [
            {'name':'Manager',   'color':'#fee75c', 'permissions':['manage_channels','manage_roles']},
            {'name':'Team Lead', 'color':'#5865f2', 'permissions':['manage_messages']},
            {'name':'Member',    'color':'#57f287', 'permissions':[]},
        ]
    },
    'music': {
        'name': 'Music',
        'channels': [
            {'name':'general',       'type':'text',  'category':'CHAT'},
            {'name':'music-requests','type':'text',  'category':'CHAT'},
            {'name':'lyrics',        'type':'text',  'category':'CHAT'},
            {'name':'Listening Room','type':'voice', 'category':'VOICE'},
        ],
        'roles': [{'name':'DJ','color':'#9b59b6','permissions':['manage_messages']}]
    },
    'community': {
        'name': 'Community',
        'channels': [
            {'name':'announcements','type':'announcement', 'category':'INFO'},
            {'name':'rules',        'type':'text',         'category':'INFO'},
            {'name':'general',      'type':'text',         'category':'COMMUNITY'},
            {'name':'introductions','type':'text',         'category':'COMMUNITY'},
            {'name':'off-topic',    'type':'text',         'category':'COMMUNITY'},
            {'name':'Community Hub','type':'voice',        'category':'VOICE'},
        ],
        'roles': [
            {'name':'Moderator', 'color':'#fe3c3c', 'permissions':['manage_messages','kick_members']},
            {'name':'Member',    'color':'#57f287', 'permissions':[]},
        ]
    },
}

def validate_config():
    """Warn about missing critical config"""
    warnings = []
    if not FIREBASE_API_KEY:
        warnings.append('GOOGLE_API_KEY / FIREBASE_API_KEY not set')
    if not IMAGEBB_KEYS:
        warnings.append('No ImageBB keys set — image uploads will fail')
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        warnings.append('Razorpay keys not set — payments disabled')
    try:
        sa = json.loads(FIREBASE_SERVICE_ACCOUNT_JSON)
        if not sa.get('project_id'):
            warnings.append('FIREBASE_SERVICE_ACCOUNT missing or invalid JSON')
    except Exception:
        warnings.append('FIREBASE_SERVICE_ACCOUNT is not valid JSON')
    return warnings
