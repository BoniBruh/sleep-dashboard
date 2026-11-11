# Sleep dashboard

React + Tailwind dashboard that reads the "Daily Summary" tab of our Google Sheet.

## Setup
1. Install Node.js (LTS) from nodejs.org and Git/GitHub Desktop.
2. Clone this repo, then in a terminal:

cd sleep-dashboard
npm install

3. Copy `.env.example` to `.env` and fill in the values (ask Alex for the API key; don't commit it).
4. Run `npm run dev` and open http://localhost:5173/

## Saving party nights to the sheet
Party nights are marked in the Sleep calendar. Without this setup they are only kept in the
browser that marked them. With it they are saved to a "Party nights" tab in the Google Sheet,
so they show on every device. The API key can only read the sheet, so saving goes through a
small Apps Script inside the sheet. Do this once, signed in as the sheet's owner:

1. Open the Google Sheet and go to **Extensions → Apps Script**.
2. Replace the code in `Code.gs` with the contents of `apps-script/party-nights.gs` and click **Save**.
3. Click **Deploy → New deployment**, choose the type **Web app**, and set
   **Execute as: Me** and **Who has access: Anyone**. Click **Deploy** and allow the permissions
   Google asks for (the script only edits this spreadsheet).
4. Copy the **Web app URL** (it ends in `/exec`) into `.env` as `VITE_PARTY_URL=...`
5. Restart `npm run dev`. The calendar now says "Saved to the Google Sheet" under the party button.
   Any marks that were only in your browser are uploaded the first time.

To check the deployment, open the `/exec` URL in a browser; it should show `{"ok":true,"dates":[...]}`.
If you change the script later, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

Anyone who has the URL can add or remove party marks (but cannot touch other tabs), so treat it like the API key.

## Notes
- Data comes from the Google Sheet, so there is no backend.
- Reference ranges for the green bands live in `src/lib/reference.js`.
- Party nights are saved by `apps-script/party-nights.gs`; the app reads them back with the API key.