import re

# Read dashboard.html
with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()

# Replace button text emojis in dashboard.html
html = html.replace('📅 Dia', 'Dia')
html = html.replace('🗓️ Semana', 'Semana')
html = html.replace('📆 Mês', 'Mês')
html = html.replace('🏆 Anual', 'Anual')

# Save dashboard.html
with open("dashboard.html", "w", encoding="utf-8") as f:
    f.write(html)

print("dashboard.html emojis cleaned!")

# Read js/app.js
with open("js/app.js", "r", encoding="utf-8") as f:
    js = f.read()

# Replace FontAwesome icons in js/app.js with Lucide icons
js = js.replace('<i class="fa-solid fa-sun" style="color: #f59e0b;"></i>', '<i data-lucide="sun" style="color: #f59e0b;"></i>')
js = js.replace('<i class="fa-solid fa-moon"></i>', '<i data-lucide="moon"></i>')
js = js.replace('<i class="fa-solid fa-wand-magic-sparkles"></i>', '<i data-lucide="sparkles"></i>')
js = js.replace('<i class="fa-solid fa-spinner fa-spin"></i>', '<i data-lucide="loader-2" class="spin"></i>')
js = js.replace('<i class="fa-solid fa-trophy"></i>', '<i data-lucide="trophy"></i>')
js = js.replace('<i class="fa-solid fa-star"></i>', '<i data-lucide="star"></i>')
js = js.replace('<i class="fa-solid fa-lightbulb"></i>', '<i data-lucide="lightbulb"></i>')
js = js.replace('<i class="fa-solid fa-dollar-sign"></i>', '<i data-lucide="dollar-sign"></i>')
js = js.replace('<i class="fa-solid fa-arrow-down-short-wide"></i>', '<i data-lucide="trending-down"></i>')
js = js.replace('<i class="fa-solid fa-rotate"></i>', '<i data-lucide="refresh-cw"></i>')

# Replace emojis in js/app.js
js = js.replace('👥 Mão de Obra (Payroll)', '<i data-lucide="users" style="color: var(--primary);"></i> Mão de Obra (Payroll)')
js = js.replace('🚗 Frota de Veículos (3 Carros)', '<i data-lucide="car" style="color: var(--accent-amber);"></i> Frota de Veículos (3 Carros)')
js = js.replace('📢 Marketing & Aquisição de Clientes', '<i data-lucide="megaphone" style="color: var(--accent-cyan);"></i> Marketing & Aquisição de Clientes')
js = js.replace('💻 Tech, CRM & Taxas Administrativas', '<i data-lucide="laptop" style="color: #6366f1;"></i> Tech, CRM & Taxas Administrativas')
js = js.replace('🧼 Operações & Material de Limpeza', '<i data-lucide="sparkles" style="color: var(--accent-emerald);"></i> Operações & Material de Limpeza')

js = js.replace('🏆 1º Liderança', '<i data-lucide="trophy"></i> 1º Liderança')
js = js.replace('⭐ Maior Ticket', '<i data-lucide="star"></i> Maior Ticket')
js = js.replace('⚠ Menor Ticket', '<i data-lucide="alert-triangle"></i> Menor Ticket')
js = js.replace('🏆 Maior Faturamento', 'Maior Faturamento')
js = js.replace('💰 Maior Ticket', 'Maior Ticket')

js = js.replace('🥇 1º Lugar', '<i data-lucide="trophy"></i> 1º Lugar')
js = js.replace('🥈 2º Lugar', '2º Lugar')
js = js.replace('🥉 3º Lugar', '3º Lugar')

# Save js/app.js
with open("js/app.js", "w", encoding="utf-8") as f:
    f.write(js)

print("js/app.js icons & emojis updated to Lucide!")
