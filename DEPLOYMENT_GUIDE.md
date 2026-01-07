# 🚀 Ultimate Deployment Guide
## Hosting "ThinkChrist" on Vercel & Supabase

This guide will take you through every single click required to get your app online.

---

## Phase 1: Supabase (The Backend)

We need to create the database first so we have the keys for the frontend.

### Step 1: Create Project
1.  Go to [supabase.com](https://supabase.com/) and click **"Start your project"**.
2.  Sign in with GitHub.
3.  Click **"New Project"**.
4.  **Name**: `think-christ-platform`
5.  **Database Password**: Click "Generate a password" and **COPY IT** to a notepad. You will need it later.
6.  **Region**: Choose one close to you (e.g., Mumbai, Singapore).
7.  Click **"Create new project"**. Wait ~2 minutes for it to finish setting up.

### Step 2: Get Your API Credentials
Once the project is created:
1.  On the left sidebar, click the **Settings icon** (⚙️) at the bottom.
2.  Click **"API"**.
3.  Look for the `Project URL`. **Copy this**.
4.  Look for the `anon` / `public` key. **Copy this**.
    *(Do not use the `service_role` key yet).*

### Step 3: Set Up the Database Tables
We will manually run the SQL scripts to ensure everything is perfect.

1.  On the left sidebar, click the **SQL Editor** icon (looks like a terminal `>_`).
2.  Click **"New Query"**.
3.  **Action**: You need to run the migration scripts one by one.
    *   Open your local project folder: `supabase/migrations/`
    *   Open `001_create_users_table.sql`
    *   Copy **ALL** text.
    *   Paste it into the Supabase SQL Editor.
    *   Click **Run** (bottom right).
    *   *Success Message should appear.*
4.  **Repeat** this for files `002` through `008`.
5.  Then run the files starting with timestamps (e.g., `2024...`).
6.  **Finally**: Open `supabase/seed.sql`, copy its content, paste, and Run. This adds the initial test data.

### Step 4: Configure Auth
1.  On the left sidebar, click the **Authentication** icon (looks like a lock).
2.  Click **URL Configuration** (under Configuration).
3.  **Site URL**: Leave as default for now (we will update this after Vercel deployment).
4.  **Redirect URLs**: Add `http://localhost:3000/auth/callback` (for local testing).

---

## Phase 2: Vercel (The Frontend)

Now we host the actual website.

### Step 1: Import to Vercel
1.  Go to [vercel.com](https://vercel.com/) and Log In.
2.  Click **"Add New..."** > **"Project"**.
3.  You should see `ThinkChrist-NoteSharingPlatform` in the list from GitHub.
4.  Click **"Import"**.

### Step 2: Configure Project
1.  **Framework Preset**: It should say "Next.js".
2.  **Root Directory**: It should be `./`.
3.  **Environment Variables**: Click to expand this section.
    *   You need to copy-paste the keys we found in Phase 1.

| Name | Value |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Paste your **Project URL** from Phase 1, Step 2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Paste your **anon key** from Phase 1, Step 2 |
| `NEXT_PUBLIC_CLIENT_ID` | Type: `thinkchrist` |
| `NEXT_PUBLIC_APP_URL` | leave blank for now, Vercel sets this automatically |
| `NEXT_PUBLIC_API_URL` | Type: `/api` |

*(If you have YouTube/GitHub features enabled, add those keys too. If not, you can skip them for the initial test)*.

### Step 3: Deploy
1.  Click **"Deploy"**.
2.  Wait ~2 minutes. You will see a building screen.
3.  🎉 **Congratulations!** You should see a "Congratulations!" screen with a screenshot of your app.
4.  Click the **preview image** to visit your live site (e.g., `think-christ-platform.vercel.app`).

---

## Phase 3: Final Connection

Now that you have your Vercel URL (e.g., `https://think-christ-platform.vercel.app`), let's tell Supabase where you are.

1.  Go back to **Supabase > Authentication > URL Configuration**.
2.  **Site URL**: Change this to your new Vercel URL (e.g., `https://think-christ-platform.vercel.app`).
3.  **Redirect URLs**: Add `https://think-christ-platform.vercel.app/auth/callback`.
4.  Click **Save**.

## Phase 4: Verification

1.  Go to your new website URL.
2.  **Check Branding**: Does it look Blue & Gold? (That implies the 'thinkchrist' client ID worked).
3.  **Check Login**: Try to sign up. If you get a confirmation email or log in successfully, your Database connection is perfect.