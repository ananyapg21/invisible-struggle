# 🌌 The Invisible Struggle — Setup Guide
*You can do this. Every step is copy-paste. Takes about 30–45 minutes.*

---

## What you're setting up

| Piece | What it does | Cost |
|---|---|---|
| **Supabase** | Stores everyone's thoughts in a database | Free |
| **Vercel** | Hosts your website publicly | Free |
| **GitHub** | Connects your code to Vercel | Free |

---

## Step 1 — Set up your database (Supabase)

1. Go to **https://supabase.com** → click **Start your project** → sign up with Google
2. Click **New project**, name it `invisible-struggle`, choose any region, set any database password (save it somewhere)
3. Wait ~2 minutes for it to set up
4. Click **SQL Editor** in the left sidebar
5. Paste this entire block and click **Run**:

```sql
-- Create the thoughts table
create table thoughts (
  id uuid default gen_random_uuid() primary key,
  text text not null check (char_length(text) between 5 and 140),
  approved boolean default true,
  flagged boolean default false,
  flag_count integer default 0,
  needs_review boolean default false,
  created_at timestamp with time zone default now()
);

-- Allow anyone to read approved thoughts (anonymous access)
alter table thoughts enable row level security;

create policy "Anyone can read approved thoughts"
  on thoughts for select
  using (approved = true);

create policy "Anyone can submit a thought"
  on thoughts for insert
  with check (true);

create policy "Anyone can flag a thought"
  on thoughts for update
  using (true)
  with check (true);

-- Enable real-time updates
alter publication supabase_realtime add table thoughts;
```

6. Go to **Settings → API** in the left sidebar
7. Copy these two values — you'll need them in Step 3:
   - **Project URL** (looks like `https://xyzxyz.supabase.co`)
   - **anon public** key (long string under "Project API keys")

---

## Step 2 — Put your code on GitHub

1. Go to **https://github.com** → sign up or log in
2. Click the **+** icon → **New repository**
3. Name it `invisible-struggle`, keep it **Public**, click **Create repository**
4. Download/install **GitHub Desktop** from https://desktop.github.com (easiest way)
5. Open GitHub Desktop → **File → Add Local Repository** → find your `invisible-struggle` folder
6. Click **Publish repository** → make sure "Keep this code private" is **unchecked** → Publish

---

## Step 3 — Deploy to Vercel

1. Go to **https://vercel.com** → sign up with your GitHub account
2. Click **Add New → Project**
3. Find `invisible-struggle` in the list → click **Import**
4. Before clicking Deploy, click **Environment Variables** and add these two:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL from Step 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key from Step 1 |

5. Click **Deploy** — wait ~2 minutes
6. 🎉 Your site is live! Vercel gives you a URL like `invisible-struggle-abc123.vercel.app`

---

## Step 4 — Get a cleaner URL (optional, ~2 min)

In Vercel → your project → **Settings → Domains** → type your preferred name like  
`invisible-struggle.vercel.app` → Vercel will check if it's available and add it for free.

---

## Step 5 — Share it!

Your URL is ready. Here's how to drive traffic:

**QR Code poster** (most effective)
- Go to https://qr.io or https://qrcode-monkey.com
- Paste your URL → download as PNG
- Put it on a poster (Canva is free) → print and hang in:
  - Dorm bathroom mirrors / stall doors
  - Library study carrels
  - Counseling center waiting room
  - Campus gym

**Social**
- Ask your student mental health org to share the link
- Post a screenshot of the constellation on Instagram Stories
- Tag your university's wellness account

---

## Managing submissions

Go to your **Supabase dashboard → Table Editor → thoughts** to:
- See all submissions (including ones held for review)
- Manually approve/hide anything that slipped through
- Set `approved = false` to hide any thought from the public

Thoughts with sensitive keywords (like "want to die") are automatically held and won't show publicly until you manually set `approved = true` — giving you a chance to review them first.

---

## Troubleshooting

**Site shows blank / errors on load**
→ Double check your environment variables in Vercel are spelled exactly right (no spaces)

**Thoughts aren't saving**
→ Make sure you ran the full SQL block in Step 1. Go to Supabase → Table Editor — you should see a `thoughts` table.

**Real-time isn't working**
→ Make sure the last line of the SQL (`alter publication supabase_realtime...`) ran successfully.

---

*Questions? The code is all in your GitHub repo. Each file has comments explaining what it does.*
