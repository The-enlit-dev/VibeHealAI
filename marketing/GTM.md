# VibeHeal go-to-market and sales plan ($0, run by a 13-year-old founder)

**Status:** written 2026-11-08 for the owner. It replaces the channel plan in [content-strategy.md](./content-strategy.md) where they differ; the content workflow there (batching, drafts, approval) still applies.
**Budget:** $0. Every tool here has a free plan.
**Time:** about **3–4 hours a week**, planned around school, hackathons and cricket.

---

## 0. Ground rules first (read these before anything else)
These keep you, the project and your family safe. They are not optional.

1. **A parent or guardian is your partner for anything legal or money-related.** In most countries, under-18s can't sign binding contracts or open payment accounts on their own.
   - **Payments:** Stripe and similar services need an adult account holder. When VibeHeal charges money, the account is in your parent's name (or a family business).
   - **Terms you accept:** your parent reads any terms of service you agree to for VibeHeal.
   - **Partnerships:** any deal with a company or person needs a parent in the conversation.
2. **Check each platform's minimum age before signing up, and only use the ones you're allowed on.**
   - **LinkedIn:** requires age 16+, so skip it for now. Your parent can post on their own account if they want.
   - **Others (X, Reddit, Discord, YouTube and the rest):** most require 13+, but rules differ by country and change. Read each platform's terms on the day you sign up.
   - **Under-age content:** never post on a platform whose minimum age you don't meet, even through someone else's account.
3. **Keep your private life private.**
   - Don't post your school, address, phone number, daily routine, or photos of your school or home.
   - Use the VibeHeal brand accounts and the `vibeheal.online` address, not your personal ones.
   - "Built by a young founder" can be a great story, but **you and your parent decide together** how much to share. You can always share more later; you can't take it back.
4. **No cold emailing, cold DMs or calls with strangers.**
   - Let people come to you: through posts, the website and the waitlist.
   - If someone wants a call or a meeting, a parent is present or it doesn't happen.
   - Bulk emails to people who didn't sign up can break anti-spam and privacy laws (GDPR, CAN-SPAM, India's DPDP Act). Only email people who joined the waitlist and agreed to it.
5. **Be honest.** VibeHeal isn't released yet.
   - Never claim users, features, prices or dates you don't have; the rules are in [brand-guidelines.md](./brand-guidelines.md).
   - Honesty is a selling point: beginners are tired of hype.
6. **If anything feels off** (pressure, money requests, people asking for personal details, mean messages), stop, don't reply, and show a parent.

---

## 1. Where VibeHeal is today (true as of 2026-11-08)
- **Website:** https://vibeheal.online, with a blog, an FAQ, Clerk sign-in, and a **working waitlist** (Netlify Forms).
- **Product:** **not available yet.** There is an early foundation (local backend, integrations, GitHub read-only). The safety features and agents are planned (see `docs/planning/FEATURES.md`).
- **Pricing:** not decided. The plan is a free plan where people bring their own AI, and a paid Pro tier later.

So the go-to-market right now is **pre-launch**: build an audience, fill the waitlist, and learn what people really want. "Sales" starts at launch.

---

## 2. Who we're for (the ideal customer)
**Beginner and hobby "vibe coders":** people who build apps and websites with AI tools (Claude Code, Cursor, Lovable, Bolt, Replit) but don't fully understand the code those tools write.
- **Their pain:**
  - "The AI broke my project and I don't know what changed."
  - "I'm scared to let it touch my files."
  - "Errors make no sense."
- **Where they hang out:** Reddit coding and AI-tool communities, Discord servers for those AI tools, YouTube tutorials, X, hackathons, school and college coding clubs.
- **Why they'd pick VibeHeal:** it's safe by design (you choose what the AI can touch, and you can undo anything), private (data stays on your laptop), and free to start with their own AI.

**Second audience (later):** student hackathon teams and teachers running coding clubs.

---

## 3. The message
- **Catch line:** *Just vibeheal it.*
- **One sentence:** "VibeHeal lets AI agents work on your stuff safely: you choose what they can touch, see every change, and undo anything."
- **Three proof points to repeat everywhere:**
  1. You pick the folder; nothing else is touched.
  2. Every change has a snapshot and one-click undo.
  3. Your data stays on your laptop, and it works with the AI you already use.
- **Founder angle (your choice how much to share):** "I build with AI tools too, and I kept breaking my projects, so I'm building the safety net I wanted."

---

## 4. Free channels, ranked for you

| # | Channel | Why | Effort per week |
|---|---|---|---|
| 1 | **The blog on vibeheal.online** | You own it. Search engines and AI answer engines find it. Posts are made in the studio (`/studio/`). | 1 post every 2 weeks, about 45 min |
| 2 | **YouTube Shorts / short videos** | Beginners learn from video. Show real broken-project fixes on screen. **No face needed**: screen recording plus voice or captions. | 1 short, about 45 min |
| 3 | **X (build in public)** | Quick progress updates, tips and polls. Dev and AI-tool communities are active there. | 3 short posts, about 20 min |
| 4 | **Reddit** | Real conversations. Help first, mention VibeHeal only where the community's rules allow it, and never spam. | 1 helpful post or a few answers, about 20 min |
| 5 | **Your own Discord: "VibeHeal Builders"** | A home for early users and testers. Start when the waitlist reaches about 50 people. | Check-in, about 15 min |
| 6 | **Hackathons and coding clubs** | You already go! Demo VibeHeal, help other teams fix broken builds, and collect feedback. A parent helps with anything formal. | When they happen |
| 7 | **Launch sites (at launch only)** | Product Hunt, Hacker News "Show HN", dev.to and Hashnode. Check each one's minimum age and terms; a parent may need to be the account holder. | Launch week only |

**Skip for now:** paid ads, LinkedIn (age 16+), cold email, buying followers or engagement, and giveaways that need personal data.

---

## 5. The plan in phases

### Phase A: now until a beta (about 90 days). Goal: 300 waitlist signups and 15 real conversations
1. **Week 1: set up (one-time, about 2 hours with a parent)**
   - [ ] Create the VibeHeal brand accounts on the channels you're allowed on. Use a brand email, not a personal one.
   - [ ] Put the same short bio and the `vibeheal.online` link on each.
   - [ ] Make a free tracker (a Google Sheet) with these columns: date, channel, post link, replies, waitlist signups (from Netlify → Forms).
   - [ ] Set up Search Console and Bing for the website (`docs/website/SEARCH_CONSOLE.md`).
2. **Every week (3–4 hours total)**, using the routine in section 7.
3. **Learn from people, not guesses:**
   - Add one optional question to the waitlist (already there: "biggest vibe-coding frustration").
   - Read every answer, group them into themes in the tracker, and write posts that answer the top themes.
   - When someone replies with an interesting problem, ask follow-up questions **in public replies or by email they started**.
4. **Monthly:** one "what I learned this month" post (building in public), plus one honest look at the tracker.

### Phase B: private beta. Goal: 10–20 testers using it weekly
- Invite people from the waitlist in small batches (an email they agreed to receive).
- Give testers a Discord channel and a short feedback form.
- Ask permission before quoting anyone, then turn real feedback into blog posts and videos.

### Phase C: public launch. Goal: first 500 free users
- **Launch week:**
  - a "Show HN" post;
  - Product Hunt (with a parent's help if the account needs to be 18+);
  - a launch blog post;
  - a launch video;
  - posts in the Reddit and Discord communities that allow it.
- **Prepare:** a 30-second demo video, 3 screenshots, an honest "what it does / what it doesn't do yet" list, and answers to the top 10 FAQ questions.

### Phase D: sales (after launch)
See section 6.

---

## 6. Sales strategy: self-serve, no cold outreach
VibeHeal sells **without a sales team**: people try it free, love it, and upgrade on their own. This is called "product-led growth", and it suits a solo founder.

1. **Free plan (the hook):** everything runs on the user's laptop with their own AI or API key. It costs us $0 to serve, so it can stay free forever.
2. **Pro plan (later, paid):** cloud agents that keep running while the laptop sleeps, plus extra power features. Price to be decided; payments go through an account your parent owns.
3. **What makes people upgrade:**
   - they hit a clear limit (for example cloud runs);
   - they see the value first (VibeHeal saved their project);
   - the upgrade button is easy to find.
4. **The "sales" you actually do:**
   - **reply to every question** (public replies, waitlist emails, Discord);
   - **fix what people complain about**, and tell them you fixed it;
   - **turn happy users into stories**, with their permission;
   - **referrals:** later, "invite a friend, both get a perk".
5. **Teams and schools (later):** a "VibeHeal for clubs" page. Teachers and club leaders contact *you* through the website form, and a parent joins any call.
6. **Never:** fake urgency ("only 3 spots left!"), fake reviews, or pressure tactics.

---

## 7. Your weekly routine (about 3.5 hours)

| Day | Task | Time |
|---|---|---|
| Sunday | Plan the week. Ask Claude Code to draft posts from `prompts/`. Check the tracker. | 30 min |
| Monday | Record one short screen video (a real fix or tip). | 45 min |
| Tuesday | Post on X, and answer 3 questions on Reddit or Discord (helpful, no spam). | 20 min |
| Wednesday | Write or edit a blog post in the studio, every other week. | 45 min |
| Thursday | Post the video. Reply to all comments and messages. | 20 min |
| Friday | Post a build-in-public update ("what I built and what broke this week"). | 15 min |
| Saturday | Read waitlist answers and add themes to the tracker. **Rest day if you're busy.** | 15 min |

**Exam weeks and busy weeks:** do just one post and answer messages. Consistency over months beats intensity for a week.

---

## 8. Free tools
- **Writing:** Claude Code (your existing plan), drafting into `marketing/content/drafts/`.
- **Website and blog:** vibeheal.online, with posts written in `/studio/`.
- **Waitlist and signups:** Netlify Forms (free).
- **Tracker:** Google Sheets.
- **Video:** your computer's built-in screen recorder, and the free tiers of CapCut or DaVinci Resolve. Check their age requirements; a parent may need to make the account.
- **Images:** Canva free, or the poster prompts in `prompts/poster-prompts.md`.
- **Analytics:** each platform's own free analytics, Netlify Forms counts, and Search Console.
- **Later, dogfooding:** use VibeHeal's own Blog writer, SEO checker and Daily update agents to run this plan once they exist. That is your best demo.

---

## 9. What to measure (honest numbers only)

| Metric | Where it comes from | 90-day target |
|---|---|---|
| Waitlist signups | Netlify → Forms → waitlist | 300 |
| Real conversations (replies with a real problem) | Your tracker | 15 |
| Blog posts published | vibeheal.online/blog | 6 |
| Short videos posted | YouTube Studio | 12 |
| Top 3 frustration themes | Waitlist answers | Written down and answered in posts |

Never post follower or signup numbers you didn't read from the real dashboards. Targets are goals, not promises.

---

## 10. Don't do these
- Cold emails, DMs or calls with strangers. Buying followers, likes or emails. Spamming communities.
- Sharing personal details or school information.
- Agreeing to deals, payments or contracts without a parent.
- Promising features, prices or dates that aren't decided.
- Burning out. This is a long game, and school comes first.
