import re

with open('src/pages/Dashboard.tsx', 'r') as f:
 content = f.read()

opens = content.count('<div')
closes = content.count('</div>')
diff = opens - closes
print(f'Dashboard: opens={opens}, closes={closes}, diff={diff}')

# Fix: add missing closing divs
# The file ends with: ...</div></div></div></div></div></ProtectedRoute>
# We need: ...</div></div></div></div></div></div></ProtectedRoute>

old_end = '</div>\n</div>\n</div>\n</div>\n</div>\n</ProtectedRoute>'
new_end = '</div>\n</div>\n</div>\n</div>\n</div>\n</div>\n</ProtectedRoute>'

if old_end in content:
 content = content.replace(old_end, new_end, 1)
 print('Fixed Dashboard ending')
else:
 print('Pattern not found, showing last lines:')
 lines = content.split('\n')
 for i in range(len(lines) - 10, len(lines)):
 print(f'{i+1}: {lines[i]}')

with open('src/pages/Dashboard.tsx', 'w') as f:
 f.write(content)

# Also fix Onboarding
with open('src/pages/Onboarding.tsx', 'r') as f:
 oc = f.read()
oo = oc.count('<div')
oc2 = oc.count('</div>')
od = oo - oc2
print(f'Onboarding: opens={oo}, closes={oc2}, diff={od}')

# Also fix Claims
with open('src/pages/Claims.tsx', 'r') as f:
 cc = f.read()
co = cc.count('<div')
cc2 = cc.count('</div>')
cd = co - cc2
print(f'Claims: opens={co}, closes={cc2}, diff={cd}')

# Also fix Yield
with open('src/pages/Yield.tsx', 'r') as f:
 yc = f.read()
yo = yc.count('<div')
yc2 = yc.count('</div>')
yd = yo - yc2
print(f'Yield: opens={yo}, closes={yc2}, diff={yd}')

# Verify after fix
with open('src/pages/Dashboard.tsx', 'r') as f:
 dc = f.read()
print(f'Dashboard after: opens={dc.count("<div")}, closes={dc.count("</div>")}, diff={dc.count("<div")-dc.count("</div>")}')
