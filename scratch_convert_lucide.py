import re

# Load dashboard.html
with open("dashboard.html", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Lucide script in head if not present
if "lucide.min.js" not in content and "unpkg.com/lucide" not in content:
    content = content.replace(
        '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>',
        '<script src="https://unpkg.com/lucide@latest"></script>\n    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>'
    )

# Dictionary of replacements for dashboard.html & app.js
replacements = [
    # Top Header & Login
    (r'<i class="fa-solid fa-right-to-bracket"></i>', r'<i data-lucide="log-in"></i>'),
    (r'<i class="fa-solid fa-rotate"></i>', r'<i data-lucide="refresh-cw"></i>'),
    (r'<i class="fa-solid fa-moon"></i>', r'<i data-lucide="moon"></i>'),
    (r'<i class="fa-solid fa-sun" style="color: #f59e0b;"></i>', r'<i data-lucide="sun" style="color: #f59e0b;"></i>'),
    (r'<i class="fa-solid fa-power-off"></i>', r'<i data-lucide="log-out"></i>'),
    
    # Flatpickr & Period
    (r'<i class="fa-regular fa-calendar-days datepicker-icon"></i>', r'<i data-lucide="calendar" class="datepicker-icon"></i>'),
    (r'<i class="fa-regular fa-calendar-check datepicker-icon"></i>', r'<i data-lucide="calendar-check" class="datepicker-icon"></i>'),
    (r'<i class="fa-solid fa-calendar-range" style="color: var\(--primary\);"></i>', r'<i data-lucide="calendar-range" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-filter" style="color: var\(--primary\);"></i>', r'<i data-lucide="filter" style="color: var(--primary);"></i>'),

    # KPIs
    (r'<i class="fa-solid fa-dollar-sign"></i>', r'<i data-lucide="dollar-sign"></i>'),
    (r'<i class="fa-solid fa-arrow-down-short-wide"></i>', r'<i data-lucide="trending-down"></i>'),
    (r'<i class="fa-solid fa-chart-line"></i>', r'<i data-lucide="trending-up"></i>'),
    (r'<i class="fa-solid fa-hand-holding-dollar"></i>', r'<i data-lucide="coins"></i>'),
    (r'<i class="fa-solid fa-receipt"></i>', r'<i data-lucide="receipt"></i>'),

    # Expenses & Centro de Custos
    (r'<i class="fa-solid fa-sitemap" style="color: var\(--accent-rose\);"></i>', r'<i data-lucide="network" style="color: var(--accent-rose);"></i>'),
    (r'<i class="fa-solid fa-user-group" style="color: var\(--primary\);"></i>', r'<i data-lucide="users" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-car" style="color: var\(--accent-amber\);"></i>', r'<i data-lucide="car" style="color: var(--accent-amber);"></i>'),
    (r'<i class="fa-solid fa-bullhorn" style="color: var\(--accent-cyan\);"></i>', r'<i data-lucide="megaphone" style="color: var(--accent-cyan);"></i>'),
    (r'<i class="fa-solid fa-laptop-code" style="color: #6366f1;"></i>', r'<i data-lucide="laptop" style="color: #6366f1;"></i>'),
    (r'<i class="fa-solid fa-pump-soap" style="color: var\(--accent-emerald\);"></i>', r'<i data-lucide="sparkles" style="color: var(--accent-emerald);"></i>'),
    
    # Charts & Sections
    (r'<i class="fa-solid fa-chart-area" style="color: var\(--primary\);"></i>', r'<i data-lucide="area-chart" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-pie-chart" style="color: var\(--accent-rose\);"></i>', r'<i data-lucide="pie-chart" style="color: var(--accent-rose);"></i>'),
    (r'<i class="fa-solid fa-pie-chart" style="color: var\(--primary\);"></i>', r'<i data-lucide="pie-chart" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-pie-chart" style="color: var\(--accent-cyan\);"></i>', r'<i data-lucide="pie-chart" style="color: var(--accent-cyan);"></i>'),
    (r'<i class="fa-solid fa-clipboard-check" style="color: var\(--primary\);"></i>', r'<i data-lucide="clipboard-check" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-wand-magic-sparkles"></i>', r'<i data-lucide="sparkles"></i>'),
    (r'<i class="fa-solid fa-users-viewfinder" style="color: var\(--primary\);"></i>', r'<i data-lucide="users" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-crown" style="color: var\(--accent-amber\);"></i>', r'<i data-lucide="crown" style="color: var(--accent-amber);"></i>'),
    (r'<i class="fa-solid fa-arrows-rotate" style="color: var\(--accent-emerald\);"></i>', r'<i data-lucide="repeat" style="color: var(--accent-emerald);"></i>'),
    (r'<i class="fa-solid fa-file-invoice-dollar" style="color: var\(--accent-rose\);"></i>', r'<i data-lucide="file-text" style="color: var(--accent-rose);"></i>'),
    (r'<i class="fa-solid fa-arrow-trend-up" style="color: var\(--primary\);"></i>', r'<i data-lucide="trending-up" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-line-chart" style="color: var\(--accent-emerald\);"></i>', r'<i data-lucide="trending-up" style="color: var(--accent-emerald);"></i>'),
    (r'<i class="fa-solid fa-lightbulb" style="color: var\(--accent-amber\);"></i>', r'<i data-lucide="lightbulb" style="color: var(--accent-amber);"></i>'),
    (r'<i class="fa-solid fa-arrow-up-right-dots" style="color: var\(--accent-rose\);"></i>', r'<i data-lucide="arrow-up-right" style="color: var(--accent-rose);"></i>'),
    (r'<i class="fa-solid fa-piggy-bank" style="color: var\(--accent-amber\);"></i>', r'<i data-lucide="piggy-bank" style="color: var(--accent-amber);"></i>'),
    (r'<i class="fa-solid fa-star" style="color: var\(--accent-amber\);"></i>', r'<i data-lucide="star" style="color: var(--accent-amber);"></i>'),
    (r'<i class="fa-solid fa-rocket" style="color: var\(--primary\);"></i>', r'<i data-lucide="rocket" style="color: var(--primary);"></i>'),

    # Aba Equipes BI
    (r'<i class="fa-solid fa-table-list" style="color: var\(--primary\);"></i>', r'<i data-lucide="table" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-trophy" style="color: var\(--accent-amber\);"></i>', r'<i data-lucide="trophy" style="color: var(--accent-amber);"></i>'),
    (r'<i class="fa-solid fa-gem" style="color: #ec4899;"></i>', r'<i data-lucide="gem" style="color: #ec4899;"></i>'),
    (r'<i class="fa-solid fa-boxes-stacked" style="color: var\(--accent-emerald\);"></i>', r'<i data-lucide="layers" style="color: var(--accent-emerald);"></i>'),
    (r'<i class="fa-solid fa-heart" style="color: var\(--accent-amber\);"></i>', r'<i data-lucide="heart" style="color: var(--accent-amber);"></i>'),
    (r'<i class="fa-solid fa-triangle-exclamation" style="color: var\(--accent-rose\);"></i>', r'<i data-lucide="alert-triangle" style="color: var(--accent-rose);"></i>'),
    (r'<i class="fa-solid fa-calculator" style="color: var\(--text-main\);"></i>', r'<i data-lucide="calculator" style="color: var(--text-main);"></i>'),
    (r'<i class="fa-solid fa-id-card" style="color: var\(--primary\);"></i>', r'<i data-lucide="id-card" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-chart-bar" style="color: var\(--primary\);"></i>', r'<i data-lucide="bar-chart-3" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-arrow-right-arrow-left" style="color: var\(--accent-amber\);"></i>', r'<i data-lucide="arrow-left-right" style="color: var(--accent-amber);"></i>'),
    (r'<i class="fa-solid fa-list-check" style="color: var\(--accent-emerald\);"></i>', r'<i data-lucide="check-square" style="color: var(--accent-emerald);"></i>'),
    (r'<i class="fa-solid fa-coins" style="color: #ec4899;"></i>', r'<i data-lucide="coins" style="color: #ec4899;"></i>'),
    (r'<i class="fa-solid fa-compass-drafting" style="color: var\(--primary\);"></i>', r'<i data-lucide="compass" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-scale-balanced" style="color: var\(--primary\);"></i>', r'<i data-lucide="scale" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-user-shield" style="color: var\(--primary\);"></i>', r'<i data-lucide="shield" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-clipboard-list" style="color: var\(--primary\);"></i>', r'<i data-lucide="clipboard-list" style="color: var(--primary);"></i>'),

    # Aba Transações & Relatórios
    (r'<i class="fa-solid fa-file-csv"></i>', r'<i data-lucide="file-spreadsheet"></i>'),
    (r'<i class="fa-solid fa-file-pdf"></i>', r'<i data-lucide="file-text"></i>'),
    (r'<i class="fa-solid fa-circle-arrow-down" style="color: var\(--accent-emerald\);"></i>', r'<i data-lucide="arrow-down-circle" style="color: var(--accent-emerald);"></i>'),
    (r'<i class="fa-solid fa-circle-arrow-up" style="color: var\(--accent-rose\);"></i>', r'<i data-lucide="arrow-up-circle" style="color: var(--accent-rose);"></i>'),
    (r'<i class="fa-solid fa-shield-halved" style="color: var\(--primary\);"></i>', r'<i data-lucide="shield-check" style="color: var(--primary);"></i>'),
    (r'<i class="fa-solid fa-magnifying-glass"></i>', r'<i data-lucide="search"></i>'),
    (r'<i class="fa-solid fa-users select-icon"></i>', r'<i data-lucide="users" class="select-icon"></i>'),
    (r'<i class="fa-solid fa-chevron-down select-arrow"></i>', r'<i data-lucide="chevron-down" class="select-arrow"></i>'),
    (r'<i class="fa-solid fa-circle-check select-icon"></i>', r'<i data-lucide="check-circle" class="select-icon"></i>'),
    (r'<i class="fa-solid fa-tags select-icon"></i>', r'<i data-lucide="tag" class="select-icon"></i>'),
    (r'<i class="fa-solid fa-chevron-left"></i>', r'<i data-lucide="chevron-left"></i>'),
    (r'<i class="fa-solid fa-chevron-right"></i>', r'<i data-lucide="chevron-right"></i>'),
    (r'<i class="fa-solid fa-users" style="color: var\(--primary\);"></i>', r'<i data-lucide="users" style="color: var(--primary);"></i>'),

    # Bottom Navbar
    (r'<i class="fa-solid fa-chart-pie"></i>', r'<i data-lucide="pie-chart"></i>'),
    (r'<i class="fa-solid fa-users"></i>', r'<i data-lucide="users"></i>'),
    (r'<i class="fa-solid fa-sliders"></i>', r'<i data-lucide="sliders"></i>'),
    (r'<i class="fa-solid fa-list"></i>', r'<i data-lucide="file-text"></i>')
]

for pat, repl in replacements:
    content = re.sub(pat, repl, content)

with open("dashboard.html", "w", encoding="utf-8") as f:
    f.write(content)

print("dashboard.html updated with Lucide icon data attributes!")
