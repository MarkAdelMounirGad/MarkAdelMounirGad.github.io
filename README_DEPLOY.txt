MARK ADEL CONTACT CARD — HARD-CODED ADMIN + ANALYTICS BUILD

This package hardcodes permanent fallback settings in:
  admin-config.js

Defaults included:
  Admin password: mark-admin
  GA4 Property ID: 549159908
  Google OAuth Client ID: 974834211769-sj4l91tgagkv6cs8p06nkmn5e9gfmc7l.apps.googleusercontent.com

SECURITY
The password itself is NOT written into admin-config.js.
Only its SHA-256 hash is stored there.
Because GitHub Pages is static, this is convenience protection rather than server-side security.

HOW CHANGES WORK
- Change password from Admin:
  It takes effect immediately on that browser.
- Change GA Property ID / Client ID:
  The values are saved locally on that browser after connecting.
- To make any changed password / Analytics settings permanent on EVERY device:
  Click "Download persistent admin-config.js" in the Admin page,
  then replace admin-config.js in GitHub and commit.

UPLOAD
Replace/upload these code files in the root of your repository:
  index.html
  style.css
  script.js
  admin.html
  admin.css
  admin.js
  admin-analytics.js
  admin-config.js

IMPORTANT — KEEP YOUR LIVE PROFILE DATA
Do NOT delete or overwrite your current:
  contact.json
  assets/images/profile.jpeg
unless you intentionally want to change your public profile.

ADMIN URL
https://markadelmounirgad.github.io/admin.html?v=30

Default first login:
mark-admin
