import re

# 1. Update dashboard.html
with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()

# Replace hardcoded dark inline text colors with Design System variables
html = html.replace('color: #0f172a;', 'color: var(--text-main);')
html = html.replace('color: #475569;', 'color: var(--text-muted);')
html = html.replace('color: #334155;', 'color: var(--text-main);')

with open("dashboard.html", "w", encoding="utf-8") as f:
    f.write(html)

print("dashboard.html hardcoded dark colors replaced with var(--text-main) / var(--text-muted)!")

# 2. Update js/app.js
with open("js/app.js", "r", encoding="utf-8") as f:
    js = f.read()

js = js.replace('color: #0f172a;', 'color: var(--text-main);')
js = js.replace('color: #0f172a', 'color: var(--text-main)')
js = js.replace('color: #334155;', 'color: var(--text-main);')
js = js.replace('color: #475569;', 'color: var(--text-muted);')

# Update Chart.js tick colors in Dark Mode
js = js.replace("return this.currentTheme === 'dark' ? '#b8b8b8' : '#475569';", "return this.currentTheme === 'dark' ? '#cbd5e1' : '#475569';")
js = js.replace("return this.currentTheme === 'dark' ? '#b8b8b8' : '#0f172a';", "return this.currentTheme === 'dark' ? '#f8fafc' : '#0f172a';")

with open("js/app.js", "w", encoding="utf-8") as f:
    f.write(js)

print("js/app.js hardcoded dark colors and chart tick colors updated!")
