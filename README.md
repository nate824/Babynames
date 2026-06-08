# Baby Name Picker

A no-paywall, two-person baby name swiping PWA. Built for you and your partner. You swipe right on names you like, left on the ones you don't, and the app shows you the names you both said yes to. Comes preloaded with thousands of names so you don't have to buy "name packs" like every other app.

Installs to your phone as a PWA, works offline (cached names + swipes), syncs between the two of you via Firebase Firestore (free tier), and hosts as a static site on GitHub Pages.

## What's included
- Tinder-style swipe UI (gestures + buttons), works on phone or desktop
- ~2,000+ names bundled (boys / girls / neutral)
- Filter by gender
- **Suggest a name to your partner** — type any name and it jumps to the top of their swipe queue with a "♥ Nate picked this for you" ribbon. Works with names not in the bundled list too.
- Real-time match detection between you and your partner
- "It's a match!" celebration when you both like the same name
- Installable PWA, offline-capable
- All data lives in *your* Firebase project — nobody else sees it

## One-time setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create a Firebase project (free, ~5 min)
1. Go to https://console.firebase.google.com → **Add project**. Skip Google Analytics.
2. In the project, click the **</>** (Web) icon to register a web app. Give it any nickname. **Do not** enable Firebase Hosting (we use GitHub Pages instead).
3. After registering, Firebase shows you a `firebaseConfig` snippet. Keep this open — you'll paste it into the app on first launch (or into a `.env` file, see below).
4. In the left nav, go to **Build → Firestore Database → Create database**. Pick **Start in production mode**, any region close to you.
5. Once Firestore is created, open the **Rules** tab and replace the rules with this (it locks Firestore to only the `couples/{yourCode}` doc you pick — anyone who knows the code can read/write; nobody else can):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /couples/{coupleCode} {
         allow read, write: if true;
       }
     }
   }
   ```

   Click **Publish**. (Free tier: 50K reads/day, 20K writes/day — your couple will use a tiny fraction of that.)

### 3. (Optional) Add Firebase config via env file
You can either paste the config into the app's setup screen on first launch (recommended — easier to change later), or bake it in at build time:
```bash
cp .env.example .env
# Fill in the VITE_FIREBASE_* values from the Firebase console
```

### 4. Run it locally
```bash
npm run dev
```
Open http://localhost:5173. On first load you'll be asked for the Firebase config (if not in `.env`), a **couple code** (pick anything — your shared password), and which partner you are (A or B). Your partner does the same thing on their device with the same couple code, picking B.

## Deploying to GitHub Pages

1. Create a new GitHub repo (e.g. `baby-name-picker`). Push this folder to it:
   ```bash
   git remote add origin https://github.com/<your-username>/baby-name-picker.git
   git branch -M main
   git add . && git commit -m "Initial commit"
   git push -u origin main
   ```
2. In your GitHub repo: **Settings → Pages → Source → Deploy from a branch**, branch = `gh-pages`.
3. Build & deploy:
   ```bash
   # Replace 'baby-name-picker' with your actual repo name.
   VITE_BASE=/baby-name-picker/ npm run deploy
   ```
   That runs `vite build` then publishes `dist/` to a `gh-pages` branch.
4. After ~30s your app is live at `https://<your-username>.github.io/baby-name-picker/`.

### Restricting your Firebase API key (recommended)
Firebase web API keys aren't secret, but you should still restrict them:
1. Google Cloud Console → **APIs & Services → Credentials**.
2. Click your auto-created Browser key.
3. Under **Application restrictions**, choose **HTTP referrers** and add:
   - `https://<your-username>.github.io/*`
   - `http://localhost:*` (for local dev)
4. Save.

## How sync works
Each "couple" is one Firestore document at `couples/<your-code>`:
```
{ a: { likes: [...], dislikes: [...] },
  b: { likes: [...], dislikes: [...] } }
```
You're partner `a` or `b`. The app subscribes to that document in real time and computes matches as `a.likes ∩ b.likes`. Writes are debounced (500ms) so a quick swiping spree only costs a couple of writes.

Each device also caches your swipes in `localStorage`, so the app works offline — swipes queue locally and push as soon as you're back online.

## Adding more names
Open `src/names.ts` and append to any of the three big space-separated strings. The file dedupes by lowercased name (so adding "Ezra" twice is fine), and a name that shows up in both the boys' and girls' lists is automatically marked neutral.

## Notes
- "Couple code" is essentially the password for your shared name list — pick something not guessable.
- If you want to wipe and start over: open the matches view → "Reset my swipes" at the bottom. (This only clears *your* swipes; your partner's stay.)
- To start a totally fresh couple, change the couple code on both devices.
