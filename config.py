# config.py - LORD NELLY OTP BOT - 

# ─────────────────────────────────────────────────────────────────────
# TELEGRAM BOT CREDENTIALS
# ─────────────────────────────────────────────────────────────────────
BOT_TOKEN = "8367586354:AAFlkc-UF7y0XVhktjbP4IDuG9fmdJkZ-80"     # Your live bot token
API_ID = 36139190                                                # Your Telegram API ID
API_HASH = "168e6a1cf8d398bf86de10d45cc6e3c2"                   # Your Telegram API Hash

# ─────────────────────────────────────────────────────────────────────
# ADMIN & OUTPUT CHANNELS
# ─────────────────────────────────────────────────────────────────────
ADMIN_ID = 8379700820                                            # Your personal Telegram user ID (admin dashboard access)
GROUP_ID = -1003646359841                                        

# ─────────────────────────────────────────────────────────────────────
# 
# ─────────────────────────────────────────────────────────────────────
IVASMS_EMAIL = "ziskyplayz@gmail.com"
IVASMS_PASSWORD = "chiefwan-2009"                    # ← PUT YOUR REAL PASSWORD

IVASMS_LOGIN_URL = "https://ivasms.com/login"                    # Update if domain changes
IVASMS_DASHBOARD_URL = "https://www.ivasms.com/portal/live/my_sms"                  # Where OTPs live

# ─────────────────────────────────────────────────────────────────────
# BEHAVIOR & TIMING
# ─────────────────────────────────────────────────────────────────────
CHECK_INTERVAL = 7                                               # Seconds between scrapes — fast but not suicidal
MAX_OTP_HISTORY = 8000                                           # Memory cap for seen IDs

# ─────────────────────────────────────────────────────────────────────
# BUTTON LINKS IN MESSAGES (customize or keep for promotion)
# ─────────────────────────────────────────────────────────────────────
OTP_GROUP_URL = "https://t.me/nelly_otp_gc"
OTP_CHANNEL_URL = "https://t.me/nellydomain"
DEVELOPER_URL = "https://t.me/chaosrule123bot"                      # Or your own handle

# ─────────────────────────────────────────────────────────────────────
# PROXY ROTATION - Your massive list of free proxy sources
# ─────────────────────────────────────────────────────────────────────
PROXY_SOURCES = [
    "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all",
    "https://api.openproxylist.xyz/http.txt",
    "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
    "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
    "https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt",
    "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
    "https://multiproxy.org/txt_all/proxy.txt",
    "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt"
]

PROXY_USERNAME = None                                            # Leave None unless your proxies need auth
PROXY_PASSWORD = None                                            # Leave None unless needed
PROXY_TYPE = "http"                                              # All your sources are http — perfect

# ─────────────────────────────────────────────────────────────────────
# ADVANCED OPTIONS
# ─────────────────────────────────────────────────────────────────────
HEADLESS = True                                                  # Must stay True on Pterodactyl
LOG_LEVEL = "INFO"                                               # Change to "DEBUG" if you want verbose shit
RECREATE_DRIVER_EVERY = 5                                        # Refresh browser every 5 scrapes to avoid memory fuckups