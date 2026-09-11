#!/usr/bin/env python3
import os

os.chdir('/home/sukrit/Projects/ALgo/Algo/app')

files_to_check = ['src/pages/Dashboard.tsx', 'src/pages/Allocations.tsx', 'src/pages/Claims.tsx', 'src/pages/Yield.tsx', 'src/pages/Onboarding.tsx']

for filepath in files_to_check:
 with open(filepath, 'r') as f:
 content = f.read()
 opens = content.count('<div')
 closes = content.count('</div>')
 diff = opens - closes
 print(filepath + ': opens=' + str(opens) + ', closes=' + str(closes) + ', diff=' + str(diff))

 if diff > 0:
 pr_idx = content.rfind('</ProtectedRoute>')
 if pr_idx > 0:
 before = content[:pr_idx]
 needed = opens - before.count('</div>')
 for _ in range(needed):
 before += '</div>'
 before += '</ProtectedRoute>'
 content = before
 with open(filepath, 'w') as f:
 f.write(content)
 print(' Fixed! Added ' + str(needed) + ' closing div(s)')

 with open(filepath, 'r') as f:
 content2 = f.read()
 o2 = content2.count('<div')
 c2 = content2.count('</div>')
 print(' After: opens=' + str(o2) + ', closes=' + str(c2) + ', diff=' + str(o2 - c2))
