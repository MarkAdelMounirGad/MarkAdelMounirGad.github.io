MARK ADEL ADMIN + ANALYTICS — FIXED BUILD

This build fixes the GA4 metric bug that caused:
"Field gaActiveUsers is not a valid metric"

Correct GA4 metric used everywhere in API calls:
activeUsers

Your HTML dashboard element ID remains:
gaActiveUsers
(which is correct and must not be renamed)

UPLOAD / REPLACE THESE FILES IN GITHUB:
- admin-analytics.js
- admin.html
- index.html
- script.js
- admin.css
- admin.js

IMPORTANT:
DO NOT replace your current contact.json.
DO NOT replace assets/images/profile.jpeg.
Those contain your current live profile information/photo.

This build also adds cache-busting (?v=4) so the browser loads the new JavaScript instead of an older cached copy.

After upload + commit:
1. Open https://markadelmounirgad.github.io/admin.html?v=4
2. Open Analytics
3. Connect Google Analytics
4. Click Refresh

Property ID expected:
549159908
