import re

with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()

for m in re.finditer(r'<i[^>]*fa-solid[^>]*>', html):
    print("dashboard.html match:", m.group(0))

with open("js/app.js", "r", encoding="utf-8") as f:
    js = f.read()

for m in re.finditer(r'<i[^>]*fa-solid[^>]*>', js):
    print("js/app.js match:", m.group(0))
