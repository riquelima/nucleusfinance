with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()

html = html.replace('<i class="fa-solid fa-sliders" style="color: var(--primary);"></i>', '<i data-lucide="sliders" style="color: var(--primary);"></i>')
html = html.replace('<i class="fa-solid fa-chart-pie" style="color: var(--primary);"></i>', '<i data-lucide="pie-chart" style="color: var(--primary);"></i>')
html = html.replace('<i class="fa-solid fa-chart-pie" style="color: var(--accent-cyan);"></i>', '<i data-lucide="pie-chart" style="color: var(--accent-cyan);"></i>')

with open("dashboard.html", "w", encoding="utf-8") as f:
    f.write(html)

with open("js/app.js", "r", encoding="utf-8") as f:
    js = f.read()

js = js.replace('<i class="fa-solid fa-dollar-sign" style="color: var(--accent-emerald);"></i>', '<i data-lucide="dollar-sign" style="color: var(--accent-emerald);"></i>')
js = js.replace('<i class="fa-solid fa-arrow-down-short-wide" style="color: var(--accent-rose);"></i>', '<i data-lucide="trending-down" style="color: var(--accent-rose);"></i>')

with open("js/app.js", "w", encoding="utf-8") as f:
    f.write(js)

print("All remaining fa-solid icons converted to Lucide icons successfully!")
