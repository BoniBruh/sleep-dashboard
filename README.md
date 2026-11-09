# Sleep dashboard

React + Tailwind dashboard that reads the "Daily Summary" tab of our Google Sheet.

## Setup
1. Install Node.js (LTS) from nodejs.org and Git/GitHub Desktop.
2. Clone this repo, then in a terminal:

cd sleep-dashboard
npm install

3. Copy `.env.example` to `.env` and fill in the values (ask Alex for the API key; don't commit it).
4. Run `npm run dev` and open http://localhost:5173/

## Notes
- Data comes from the Google Sheet, so there is no backend.
- Reference ranges for the green bands live in `src/lib/reference.js`.