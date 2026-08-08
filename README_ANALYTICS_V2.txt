MARK ADEL CONTACT CARD — ANALYTICS V2

Google Analytics Measurement ID:
G-Y64QEYK6LR

WHAT THIS VERSION ADDS
- GA4 installed on the public index.html page.
- Tracks clicks on:
  * Save Contact
  * Call
  * WhatsApp
  * Email
  * LinkedIn
  * Website
  * CV
- Tracks engagement milestones:
  * 30 seconds
  * 60 seconds
  * 120 seconds
  * 50% scroll
  * 90% scroll
  * returning visitor
- Sends a privacy-conscious professional_interest event (low/medium/high signal).
- Adds an Analytics section to admin.html with a quick link to Google Analytics.

GA4 EVENTS TO LOOK FOR
- contact_action
- professional_interest
- engagement_milestone
- return_visitor
- session_summary

IMPORTANT
This version does NOT pretend that GitHub Pages can securely read your GA4 reports back into admin.html.
A true in-admin numerical dashboard requires Google OAuth + the Google Analytics Data API (or an embedded Looker Studio report).
The public tracking itself works immediately after uploading these files to GitHub.

UPLOAD
Replace these existing files in GitHub:
- index.html
- script.js
- admin.html
- admin.css

Other files are included unchanged for convenience.
