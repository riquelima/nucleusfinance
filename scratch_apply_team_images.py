import re

with open("js/app.js", "r", encoding="utf-8") as f:
    js = f.read()

# 1. Update renderTeamsGrid team card avatar
old_avatar = """<div class="team-avatar ${teamClasses[key]}">
                                T${key.replace('TIME', '')}
                            </div>"""

new_avatar = """<div class="team-avatar">
                                <img src="time${key.replace('TIME', '')}.jpg" alt="${label}" class="team-avatar-img">
                            </div>"""

js = js.replace(old_avatar, new_avatar)

# 2. Update renderTeamPerformanceSection table row
old_perf_row = """<td style="font-weight: 700;"><span class="team-jobs-badge">${label}</span></td>"""
new_perf_row = """<td style="font-weight: 700;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <img src="time${key.replace('TIME', '')}.jpg" alt="${label}" class="team-avatar-img-xs">
                            <span>${label}</span>
                        </div>
                    </td>"""

js = js.replace(old_perf_row, new_perf_row)

# 3. Update teamsComparativeTbody table row
old_comp_row = """<td style="font-weight: 700;">
                            <span class="team-jobs-badge" style="width: 68px; justify-content: center;">${label}</span>
                        </td>"""
new_comp_row = """<td style="font-weight: 700;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <img src="time${key.replace('TIME', '')}.jpg" alt="${label}" class="team-avatar-img-xs">
                                <span>${label}</span>
                            </div>
                        </td>"""

js = js.replace(old_comp_row, new_comp_row)

# 4. Update teamProfileHeader
old_prof_header = """<span class="team-profile-title" style="color: ${meta.color};">${label}</span>"""
new_prof_header = """<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                                <img src="time${key.replace('TIME', '')}.jpg" alt="${label}" class="team-avatar-img-sm">
                                <span class="team-profile-title" style="color: ${meta.color};">${label}</span>
                            </div>"""

js = js.replace(old_prof_header, new_prof_header)

# 5. Update renderReportsTeamsSection table row
old_rep_row = """<td style="font-weight: 700; color: #0f172a;">${t.label}</td>"""
new_rep_row = """<td style="font-weight: 700; color: #0f172a;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <img src="time${t.key.replace('TIME', '')}.jpg" alt="${t.label}" class="team-avatar-img-xs">
                            <span>${t.label}</span>
                        </div>
                    </td>"""

js = js.replace(old_rep_row, new_rep_row)

with open("js/app.js", "w", encoding="utf-8") as f:
    f.write(js)

print("js/app.js updated with team avatar images!")
