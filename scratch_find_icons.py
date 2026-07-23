import re

with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()

icons = re.findall(r'<i[^>]*class="([^"]+)"[^>]*>', html)
print(f"Total icon tags found: {len(icons)}")
for ic in set(icons):
    print(ic)

with open("js/app.js", "r", encoding="utf-8") as f:
    js = f.read()

js_icons = re.findall(r'<i[^>]*class="([^"]+)"[^>]*>', js)
print(f"\nTotal icon tags in app.js: {len(js_icons)}")
for ic in set(js_icons):
    print(ic)
