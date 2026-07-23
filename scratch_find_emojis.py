import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

emoji_pattern = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "\U0001F900-\U0001F9FF"
    "\U0001FA70-\U0001FAFF"
    "]+", flags=re.UNICODE
)

with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()

html_emojis = emoji_pattern.findall(html)
print(f"Emojis in dashboard.html ({len(html_emojis)}):")
for e in set(html_emojis):
    print(ascii(e))

with open("js/app.js", "r", encoding="utf-8") as f:
    js = f.read()

js_emojis = emoji_pattern.findall(js)
print(f"\nEmojis in app.js ({len(js_emojis)}):")
for e in set(js_emojis):
    print(ascii(e))
