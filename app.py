import asyncio
import logging
import re
import json
import random
import os
from datetime import datetime
from typing import Dict, List
import aiohttp
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from telethon import TelegramClient, events
from telethon.tl.custom import Button
from config import (
    BOT_TOKEN, API_ID, API_HASH, ADMIN_ID, GROUP_ID,
    IVASMS_EMAIL, IVASMS_PASSWORD, IVASMS_LOGIN_URL, IVASMS_DASHBOARD_URL,
    CHECK_INTERVAL, OTP_GROUP_URL, OTP_CHANNEL_URL, DEVELOPER_URL,
    PROXY_SOURCES, PROXY_USERNAME, PROXY_PASSWORD, PROXY_TYPE,
    HEADLESS, LOG_LEVEL, RECREATE_DRIVER_EVERY, MAX_OTP_HISTORY
)
logging.basicConfig(level=LOG_LEVEL, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
class OTPBot:
    def __init__(self):
        self.client = TelegramClient('lord_nelly_session', API_ID, API_HASH)
        self.driver = None
        self.last_otp_ids = set()
        self.session_active = False
        self.sms_dashboard_status = False
        self.login_status = False
        self.total_otps = 0
        self.failure_reasons = []
        self.seen_file = "seen_otps.json"
        self.proxies = []
        self.current_proxy = None
        self.scrape_count = 0
        self._load_seen_ids()
        asyncio.create_task(self._refresh_proxies_loop())
    def _load_seen_ids(self):
        try:
            with open(self.seen_file, 'r') as f:
                data = json.load(f)
                self.last_otp_ids = set(data[:MAX_OTP_HISTORY])
            logger.info(f"Loaded {len(self.last_otp_ids)} seen OTPs")
        except:
            logger.info("No seen file - starting clean")
    def _save_seen_ids(self):
        try:
            with open(self.seen_file, 'w') as f:
                json.dump(list(self.last_otp_ids), f)
        except Exception as e:
            logger.error(f"Save seen failed: {e}")
    async def _refresh_proxies_loop(self):
        while True:
            try:
                fresh = await self._fetch_proxies()
                if fresh:
                    self.proxies = fresh
                    logger.info(f"Proxies refreshed: {len(self.proxies)} alive")
            except:
                pass
            await asyncio.sleep(random.randint(600, 1200))
    async def _fetch_proxies(self) -> List[str]:
        collected = set()
        async with aiohttp.ClientSession() as session:
            for url in PROXY_SOURCES:
                try:
                    async with session.get(url, timeout=15) as r:
                        if r.status == 200:
                            text = await r.text()
                            for line in text.splitlines():
                                line = line.strip()
                                if ':' in line and not line.startswith('#'):
                                    if not line.startswith(('http://', 'socks')):
                                        line = f"{PROXY_TYPE}://{line}"
                                    collected.add(line)
                except:
                    continue
        formatted = list(collected)
        if PROXY_USERNAME and PROXY_PASSWORD:
            auth = f"{PROXY_USERNAME}:{PROXY_PASSWORD}@"
            formatted = [p.replace("://", f"://{auth}") for p in formatted]
        random.shuffle(formatted)
        return formatted[:400]
    def _pick_proxy(self) -> str | None:
        if not self.proxies:
            return None
        p = random.choice(self.proxies)
        self.current_proxy = p
        return p
    def _create_driver(self):
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        if self.current_proxy:
            chrome_options.add_argument(f"--proxy-server={self.current_proxy}")
        chromedriver_path = "/usr/bin/chromedriver"
        if not os.path.exists(chromedriver_path):
            chromedriver_path = "/usr/local/bin/chromedriver"
        service = Service(executable_path=chromedriver_path) if chromedriver_path and os.path.exists(chromedriver_path) else Service()
        try:
            driver = webdriver.Chrome(service=service, options=chrome_options)
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            logger.info("Chrome driver started successfully - we're in business bitch")
            return driver
        except Exception as e:
            logger.error(f"Driver creation failed: {e}")
            try:
                driver = webdriver.Chrome(options=chrome_options)
                logger.info("Fallback plain Chrome driver started - good enough to fuck shit up")
                return driver
            except Exception as fallback_e:
                logger.critical(f"All driver attempts failed: {fallback_e} - panel probably missing chromedriver entirely")
                return None
    async def start(self):
        await self.client.start(bot_token=BOT_TOKEN)
        logger.info("LORD NELLY OTP BOT online and ready to harvest souls")
        self._pick_proxy()
        self.driver = self._create_driver()
        if self.driver is None:
            logger.critical("No browser driver - bot will log but not scrape - fix your fucking egg")
        self.client.add_event_handler(self.handle_start, events.NewMessage(pattern='/start'))
        self.client.add_event_handler(self.handle_admin, events.NewMessage(pattern='/admin'))
        self.client.add_event_handler(self.handle_status, events.NewMessage(pattern='/status'))
        asyncio.create_task(self.monitor_loop())
        await self.client.run_until_disconnected()
    async def _ensure_driver(self):
        self.scrape_count += 1
        if self.scrape_count % RECREATE_DRIVER_EVERY == 0 or self.driver is None:
            if self.driver:
                try:
                    self.driver.quit()
                except:
                    pass
            self._pick_proxy()
            self.driver = self._create_driver()
    async def login_to_ivasms(self) -> bool:
        await self._ensure_driver()
        if not self.driver:
            return False
        try:
            self.driver.get(IVASMS_LOGIN_URL)
            WebDriverWait(self.driver, 60).until(EC.presence_of_element_located((By.NAME, "email")))
            self.driver.find_element(By.NAME, "email").send_keys(IVASMS_EMAIL)
            self.driver.find_element(By.NAME, "password").send_keys(IVASMS_PASSWORD)
            self.driver.find_element(By.XPATH, "//button[@type='submit']").click()
            WebDriverWait(self.driver, 60).until(lambda d: IVASMS_DASHBOARD_URL in d.current_url or d.find_elements(By.XPATH, "//*[contains(text(),'logout')]"))
            self.session_active = True
            self.login_status = True
            logger.info("Logged into ivasms - time to steal some codes")
            return True
        except Exception as e:
            logger.error(f"Login failed: {e}")
            self.failure_reasons.append(str(e))
            return False
    async def access_dashboard(self) -> bool:
        await self._ensure_driver()
        if not self.driver:
            return False
        try:
            self.driver.get(IVASMS_DASHBOARD_URL)
            WebDriverWait(self.driver, 60).until(EC.presence_of_element_located((By.CSS_SELECTOR, ".sms-item, table tr, div.message")))
            self.sms_dashboard_status = True
            logger.info("Dashboard accessed - OTPs incoming")
            return True
        except Exception as e:
            logger.error(f"Dashboard access failed: {e}")
            return False
    async def scrape_otp_messages(self) -> List[Dict]:
        await self._ensure_driver()
        if not self.driver or not self.session_active or not self.sms_dashboard_status:
            if not await self.login_to_ivasms():
                return []
            if not await self.access_dashboard():
                return []
        try:
            self.driver.refresh()
            await asyncio.sleep(5)
            for _ in range(8):
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                await asyncio.sleep(2)
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            items = soup.select('.sms-item, tr, div[class*="sms"], div[class*="message"], tr[data-*], .sms-row')
            new = []
            for item in items:
                try:
                    oid = item.get('data-id') or item.get('id') or str(hash(item.text[:120]))
                    if oid in self.last_otp_ids:
                        continue
                    num = (item.select_one('[class*="phone"], [class*="from"], .number, td:first-child') or {}).text.strip() or "Unknown"
                    soc = (item.select_one('[class*="service"], [class*="social"], [class*="platform"]') or {}).text.strip() or "Unknown"
                    msg = (item.select_one('[class*="text"], [class*="msg"], .content, td:last-child') or item).text.strip()
                    code = re.search(r'\b\d{4,8}\b', msg)
                    code = code.group(0) if code else "——"
                    data = {
                        'id': oid,
                        'number': num,
                        'social': soc,
                        'country': self.get_country_from_phone(num),
                        'code': code,
                        'message': msg,
                        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                    new.append(data)
                    self.last_otp_ids.add(oid)
                    if len(self.last_otp_ids) > MAX_OTP_HISTORY:
                        self.last_otp_ids = set(list(self.last_otp_ids)[-MAX_OTP_HISTORY:])
                    self._save_seen_ids()
                except:
                    continue
            logger.info(f"Scraped {len(new)} new OTPs this cycle")
            return new
        except Exception as e:
            logger.error(f"Scrape failed: {e}")
            return []
    def get_country_from_phone(self, phone: str) -> str:
        m = re.search(r'\+(\d+)', phone)
        if not m:
            return "Unknown 🏳️"
        cc = m.group(1)
        map_ = {
            '1': '🇺🇸 United States', '44': '🇬🇧 United Kingdom', '234': '🇳🇬 Nigeria',
            '91': '🇮🇳 India', '86': '🇨🇳 China', '81': '🇯🇵 Japan', '82': '🇰🇷 South Korea',
        }
        return map_.get(cc, f"Unknown (+{cc}) 🏳️")
    def mask_phone_number(self, num: str) -> str:
        m = re.search(r'\+(\d+)', num)
        if not m:
            return num
        cc = m.group(0)
        rest = num[len(cc):].strip()
        if len(rest) <= 4:
            return f"{cc} {rest}"
        return f"{cc} {rest[:2]}{'*'*(len(rest)-4)}{rest[-2:]}"
    async def send_otp_to_group(self, otp: Dict):
        masked = self.mask_phone_number(otp['number'])
        text = (
            "╔══════════════════════════════╗\n"
            "✨🌌 LORD NELLY 🌌✨ OTP BOT\n"
            "╚══════════════════════════════╝\n"
            "🚨 NEW OTP RECEIVED 🚨\n"
            f"🔹 *Number:* {masked}\n"
            f"🔹 *Social:* {otp['social']}\n"
            f"🔹 *Country:* {otp['country']}\n"
            f"🛡️ *Code:* `{otp['code']}`\n"
            "💬 *Message:*\n> {otp['message']}\n"
            "TIP: Tap code to copy 💡"
        )
        buttons = [
            [Button.url("OTP GROUP", OTP_GROUP_URL)],
            [Button.url("OTP CHANNEL", OTP_CHANNEL_URL)],
            [Button.url("DEVELOPER", DEVELOPER_URL)]
        ]
        try:
            await self.client.send_message(GROUP_ID, text, buttons=buttons, parse_mode='markdown')
            self.total_otps += 1
            logger.info(f"OTP sent: {otp['code']} from {masked}")
        except Exception as e:
            logger.error(f"Failed sending OTP: {e}")
    async def monitor_loop(self):
        while True:
            try:
                otps = await self.scrape_otp_messages()
                for o in otps:
                    await self.send_otp_to_group(o)
                await asyncio.sleep(CHECK_INTERVAL)
            except Exception as e:
                logger.error(f"Monitor crashed: {e}")
                await asyncio.sleep(10)
    async def handle_start(self, event):
        if event.sender_id == ADMIN_ID:
            await self.send_admin_dashboard(event.sender_id)
        else:
            await self.send_user_welcome(event.sender_id)
    async def handle_admin(self, event):
        if event.sender_id == ADMIN_ID:
            await self.send_admin_dashboard(event.sender_id)
    async def handle_status(self, event):
        await self.handle_admin(event)
    async def send_user_welcome(self, uid):
        text = (
            "╔══════════════════════════════╗\n"
            "💫 🌌 LORD NELLY 🌌 💫 *OTP BOT*\n"
            "╚══════════════════════════════╝\n"
            "✅ ACTIVE AND RUNNING\n"
            "╚══════════════════════════════╝\n"
            "⚠️ ANY ISSUE? CONTACT DEVELOPER\n"
            "╚══════════════════════════════╝\n"
            "🌐 JOIN OTP GROUP AND CHANNEL\n"
            "╚══════════════════════════════╝\n"
            "╭───────────── 🔘 ─────────────╮\n"
            "│ POWERED BY NELLY\n"
            "╰──────────────────────────────╯"
        )
        buttons = [
            [Button.url("OTP GROUP", OTP_GROUP_URL)],
            [Button.url("OTP CHANNEL", OTP_CHANNEL_URL)],
            [Button.url("DEVELOPER", DEVELOPER_URL)]
        ]
        await self.client.send_message(uid, text, buttons=buttons, parse_mode='markdown')
    async def send_admin_dashboard(self, uid):
        login_ok = self.login_status or await self.login_to_ivasms()
        dash_ok = self.sms_dashboard_status or await self.access_dashboard()
        reasons = "\n".join(self.failure_reasons[-5:]) or "No recent issues detected"
        text = (
            "╔══════════════════════════════╗\n"
            "✨🌌 LORD NELLY OTP BOT 🌌✨\n"
            "╚══════════════════════════════╝\n"
            "🛠️ ADMIN DASHBOARD\n"
            "╚══════════════════════════════╝\n"
            f"LOGIN STATUS: {'✅' if login_ok else '🚫'}\n"
            f"SMS DASHBOARD: {'✅' if dash_ok else '🚫'}\n"
            f"FAILURE REASONS:\n{reasons}\n"
            f"TOTAL OTPs RECEIVED: {self.total_otps}\n"
            "╭───────────────╮\n"
            "│ POWERED BY NELLY\n"
            "╰───────────────╯"
        )
        buttons = [
            [Button.url("OTP GROUP", OTP_GROUP_URL)],
            [Button.url("OTP CHANNEL", OTP_CHANNEL_URL)],
            [Button.url("DEVELOPER", DEVELOPER_URL)]
        ]
        await self.client.send_message(uid, text, buttons=buttons, parse_mode='markdown')
    async def cleanup(self):
        self._save_seen_ids()
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
        await self.client.disconnect()
async def main():
    bot = OTPBot()
    try:
        await bot.start()
    except Exception as e:
        logger.critical(f"Fatal crash: {e}")
    finally:
        await bot.cleanup()
if __name__ == "__main__":
    asyncio.run(main())