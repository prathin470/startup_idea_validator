# Competitor Identification Test Cases

<!-- This file is loaded by the competitor analysis pipeline at runtime.
     The synthesis LLM reads these calibration examples before identifying competitors
     so it learns from past sessions what counts as a real competitor vs a false positive.

     HOW TO ADD A TEST CASE:
     Copy the template below, fill it in after each test session, and save.
     The next run will automatically pick up the new entry. -->

---

## Calibration Rules (updated as patterns emerge)

<!-- These are the highest-priority rules. Apply them before every competitor identification.
     They are derived from real mistakes made in past sessions and must not repeat. -->

### Core matching rules
- A competitor must share at least one CORE FEATURE with the idea, not just the broad category.
  e.g. A timer app is NOT a competitor for a conversational AI accountability product — they share a category (productivity) but not a mechanism (conversation).
- Similarity score must reflect FEATURE OVERLAP only — not market position, App Store rank, or category proximity.
  A #1 ranked app with no feature overlap must score < 20, regardless of how dominant it is.
- If the idea's core differentiator is a specific INTERACTION MODEL (e.g. "you talk to it", "voice-first", "conversational"), only apps that share that exact interaction model can score > 60. Everything else is at most Adjacent.

### Category traps to avoid
- "Productivity app" is not a feature. Do not include a competitor just because it lives in the Productivity category.
- "Finance app" is not a feature. A budgeting app does not compete with a receipt-scanning app unless it also auto-scans receipts.
- "Health app" is not a feature. A sleep tracker does not compete with a work-performance app unless it explicitly correlates sleep data with output metrics.
- "Journaling app" is not a feature. A plain journal (Day One, Notion) does not compete with an AI pattern-detection journal unless it runs AI analysis on entries.
- "Gamified learning app" is not a feature. Duolingo is a language-learning curriculum app — shared gamification elements and a student audience do NOT make it a competitor for a study accountability app. It teaches only one subject (language), has no open-subject study support, no accountability conversation, no mascot-based nagging, and no in-app enforcement. Score Duolingo 5–12 for any non-language-learning idea. Never score it above 20.

### Weakness framing rule — always compare back to the user's solution
- Competitor weaknesses must NOT be raw user complaints in isolation (e.g. "scam", "requires subscription", "hard to cancel").
  Those are noise. The weakness that matters is the one that directly creates the gap the user's idea fills.
- Format every weakness as: "[Competitor] does X, but NOT [the specific thing the user's idea does]."
  e.g. NOT "Scam, requires subscription" — but "Generic one-size-fits-all games with no personalisation — unlike [idea] which tailors activities to the user's interests and preferences."
  e.g. NOT "Unclear if customization based on preferences" — but "No tailoring of training to what the user enjoys — [idea] solves this by customising game selection to user preferences."
- When the verdict is "Contested", the structural limits cited MUST connect back to the user's specific differentiator from the conversation.
  A limit that doesn't relate to the user's solution is filler — drop it and find one that does.

### Scoring boundaries
- 85–100: Direct clone — same mechanism, same target user, same problem. e.g. two conversational AI coaches for the same audience.
- 60–84: Direct competitor — same core feature, slightly different angle. e.g. AI coach that texts vs AI coach that talks.
- 35–59: Indirect — solves the same problem but via a completely different mechanism. e.g. task manager vs conversational coach — same outcome (accountability), different how.
- 10–34: Adjacent — related space, different core feature. e.g. a meditation app adjacent to a focus app.
- 0–9: Not a competitor — category match only, zero feature overlap.

### Dominant incumbent trap — platforms too big to appear in Reddit discovery queries
- For ideas in well-known, heavily-branded consumer categories (streaming video, social media, ride-sharing, food delivery, music, messaging), the dominant category leaders MUST be included as competitors even if they do not appear in Reddit or Twitter search results.
- These platforms are so dominant that users do not recommend them in Reddit threads — they are assumed. The absence of Netflix from Reddit search results does NOT mean Netflix is not a competitor for a streaming app. It means Netflix is so ubiquitous it is never discussed as a discovery.
- Required inclusions by category (treat as Direct, score 80–95):
  - Streaming video: Netflix, Disney+, HBO Max, Amazon Prime Video, Apple TV+, YouTube
  - Music: Spotify, Apple Music, YouTube Music
  - Social: Instagram, TikTok, YouTube, Facebook
  - Ride-sharing: Uber, Lyft
  - Food delivery: DoorDash, Uber Eats
  - Messaging: WhatsApp, iMessage, Telegram
- If an idea's core feature is "watch movies/shows", "listen to music", "share short videos", or any direct overlap with the above platforms' PRIMARY function — those platforms are Direct competitors and MUST appear in the output, regardless of whether Serper found them.
- A streaming/video app run that does not return Netflix as a competitor is an incomplete run.

### Workaround and fallback apps
- If users in reviews describe the competitor as "a workaround" or "not quite what I need", that is a signal of low feature satisfaction, not high similarity. Capture it as a weakness, not evidence of overlap.
- A competitor users explicitly say they are replacing (switching FROM) is evidence the space has demand, not that the competitor is a strong Direct competitor.

---

## Test Sessions

---

### Session 1a — 2026-04-10
*Sub-case: vague intake wording surfaces wrong competitors*

**Idea submitted:** An app that helps you stay accountable to your goals
**Differentiator:** You can actually talk to it and it responds like a real coach
**Target user:** Freelancers who work alone and struggle with self-discipline
**Core features extracted by LLM:** ["accountability", "goal tracking", "reminders"]
<!-- Note: LLM missed "conversational AI" entirely because the differentiator was
     not prominent enough in the query. This caused the wrong competitor set. -->

**Competitors returned:**
| Name | Similarity Score | Category | Verdict |
|------|-----------------|----------|---------|
| Forest | 65 | Direct | ❌ Wrong — Forest is a Pomodoro timer. Zero conversational feature. Should score 8. |
| Habitica | 58 | Direct | ❌ Wrong — Habitica is a gamified habit tracker. No conversation. Should score 20. |
| Todoist | 52 | Direct | ❌ Wrong — Task manager. No coaching, no conversation. Should score 12. |
| Streaks | 47 | Indirect | ❌ Wrong — Habit streak tracker. No conversation. Should score 10. |
| Coach.me | 70 | Direct | ✅ Correct — Human coaching platform. Legitimate Adjacent/Direct. |

**What went wrong:**
- LLM extracted "accountability" and "goal tracking" as core features — these are outcomes, not mechanisms. It missed "conversational AI" entirely.
- Forest (a timer app) received 65% similarity — the only shared property is "productivity category." There is zero feature overlap.
- Queries generated were category-level ("accountability app", "goal tracker") rather than mechanism-level ("AI you can talk to about goals", "conversational accountability coach").

**What went right:**
- Coach.me was correctly surfaced as a competitor — it is a real coaching platform with human + AI coach features.

**Calibration note:**
- When a differentiator mentions "talk to it", "conversational", "responds like a person", or "AI coach", the core feature to anchor queries on is the CONVERSATIONAL MECHANISM — not the outcome category. Timer apps and habit trackers score 0–15 in this context, never above 20.

---

### Session 1b — 2026-04-10
*Sub-case: precise intake wording corrects competitor set*

**Idea submitted:** An AI you can have a real two-way conversation with about your goals — it checks in, asks follow-up questions, and remembers what you told it last time
**Differentiator:** It's conversational — not a checklist, not reminders. You talk to it, it responds contextually and adjusts based on your history.
**Target user:** Freelancers and solo founders who work without a team and lose motivation mid-week
**Core features extracted by LLM:** ["conversational AI", "contextual memory", "proactive check-ins", "real-time coaching dialogue"]

**Competitors returned:**
| Name | Similarity Score | Category | Verdict |
|------|-----------------|----------|---------|
| Replika | 75 | Direct | ✅ Correct — Conversational AI companion. Same interaction model, different positioning. |
| Pi (Inflection AI) | 80 | Direct | ✅ Correct — Conversational AI assistant with memory and coaching tone. Near-direct. |
| Woebot | 65 | Direct | ✅ Correct — CBT chatbot with conversational check-ins. Same mechanism, mental health framing. |
| Coach.me | 55 | Indirect | ✅ Correct — Human coaching via text, no real-time AI conversation. Indirect. |
| Notion AI | 22 | Adjacent | ✅ Correct — AI writing assistant. Adjacent at best — no proactive check-ins or memory of goals. |
| Forest | 8 | Adjacent | ✅ Correct — Timer app. Correctly scored low after calibration rule from Session 1a. |

**What went wrong:**
- Nothing significant in competitor identification. Scores were close to expected.
- Notion AI at 22 is borderline — could argue for 15, but 22 is acceptable given it has AI chat.

**What went right:**
- Conversational mechanism correctly anchored: Replika, Pi, Woebot all correctly surfaced as Direct competitors.
- Forest correctly scored 8 — the timer-app false positive from Session 1a did not repeat.
- Contextual memory and proactive check-ins were both used as query anchors, surfacing niche but accurate competitors.

**Calibration note:**
- Woebot is always a relevant competitor for conversational AI products aimed at personal growth or accountability — even if the idea is not mental health focused. The interaction model overlap is high.
- Pi (Inflection AI) should appear for any idea where the core feature is "a thoughtful AI you can talk to about your life." It is a near-direct competitor in this space.

---

### Session 2a — 2026-04-12
*Sub-case: receipt scanning idea — category trap surfaces generic finance apps*

**Idea submitted:** An app that scans your receipts and auto-categorises your spending before your accountant ever sees it
**Differentiator:** It's fully automatic — you never manually enter anything. Point the camera at a receipt and it does everything.
**Target user:** Freelancers and sole traders who hate bookkeeping but need clean records at tax time
**Core features extracted by LLM:** ["expense tracking", "budgeting", "finance management"]
<!-- Note: LLM again extracted outcome features, not the mechanical differentiator (camera OCR + auto-categorisation). -->

**Competitors returned:**
| Name | Similarity Score | Category | Verdict |
|------|-----------------|----------|---------|
| Mint | 72 | Direct | ❌ Wrong — Mint is a budgeting app. It links bank accounts, does not scan receipts. Should score 18. |
| YNAB | 68 | Direct | ❌ Wrong — YNAB is a manual envelope-budgeting app. Zero receipt scanning. Should score 12. |
| Expensify | 78 | Direct | ✅ Correct — Expensify auto-scans receipts via SmartScan OCR. Legitimate Direct competitor. |
| Shoeboxed | 82 | Direct | ✅ Correct — Core feature IS receipt scanning and categorisation for tax. Near-clone. |
| Wave | 60 | Indirect | ⚠️ Borderline — Wave has receipt scanning but it's manual upload, not auto-scan. 40 would be more accurate. |

**What went wrong:**
- Mint and YNAB were included because they are top finance apps, not because they share the receipt-scanning feature. This is a category trap.
- Core features extracted were "expense tracking" and "budgeting" — which describe what the user WANTS TO ACHIEVE, not what the product DOES. The mechanical feature is "camera OCR + AI auto-categorisation."

**What went right:**
- Expensify and Shoeboxed were correctly identified — these are the two most direct competitors in the receipt-scanning space.

**Calibration note:**
- Mint and YNAB are NEVER Direct competitors for a receipt-scanning product. They manage money via bank-feed sync, not physical receipt capture. They are at most Adjacent (score 15–25).
- The mechanical differentiator here is "camera + OCR + AI categorisation." Only apps that share all three steps (capture → extract → categorise automatically) can score > 55.

---

### Session 2b — 2026-04-12
*Sub-case: same idea, queries corrected to target OCR mechanism*

**Idea submitted:** An app that scans your receipts and auto-categorises your spending before your accountant ever sees it
**Differentiator:** Fully automatic — camera, OCR, categorisation happens without any manual input
**Target user:** Freelancers and sole traders who hate bookkeeping but need clean records at tax time
**Core features extracted by LLM:** ["camera OCR receipt capture", "automatic AI categorisation", "tax-ready expense records", "zero manual data entry"]

**Competitors returned:**
| Name | Similarity Score | Category | Verdict |
|------|-----------------|----------|---------|
| Expensify | 85 | Direct | ✅ Correct — SmartScan OCR + auto-categorisation. Direct clone of core feature. |
| Shoeboxed | 88 | Direct | ✅ Correct — Core product is receipt scanning and tax-ready categorisation. Near-identical mechanism. |
| Dext (formerly Receipt Bank) | 82 | Direct | ✅ Correct — Auto-captures receipts, AI categorisation, accountant export. Built for exactly this. |
| AutoEntry | 75 | Direct | ✅ Correct — Receipt scanning and bookkeeping automation for accountants and SMBs. |
| Hubdoc | 68 | Direct | ✅ Correct — Document capture and auto-coding for bookkeeping. Direct. |
| Mint | 18 | Adjacent | ✅ Correct — Bank-feed budgeting only. No receipt capture. Correctly scored low. |

**What went wrong:**
- Nothing significant — this was a clean run after correcting the core feature extraction.

**What went right:**
- Dext was correctly surfaced — it is the UK/ANZ market leader in this space and is often missed when queries are generic.
- Mechanism-level queries ("receipt OCR auto-categorise", "smart receipt capture accounting") surfaced specialist tools that category-level queries miss entirely.

**Calibration note:**
- Dext (formerly Receipt Bank) is the market leader in automated receipt-to-bookkeeping. Any idea in this space that doesn't show Dext as a Direct competitor is an incomplete run.
- AutoEntry and Hubdoc are cloud-accounting adjacent tools that overlap significantly — they should appear for any idea targeting accountants + freelancers in the receipt/document space.

---

### Session 3a — 2026-04-15
*Sub-case: sleep-work correlation tracker — health category trap*

**Idea submitted:** An app that pulls your sleep data from your wearable and cross-references it with your calendar to show how your sleep quality affected your work output that day
**Differentiator:** It doesn't just track your sleep — it connects it to your actual work performance: meetings attended, tasks completed, focus blocks held. Shows you the pattern over time.
**Target user:** Knowledge workers and founders who feel their performance varies day to day but can't identify why
**Core features extracted by LLM:** ["sleep tracking", "health monitoring", "wellness data"]
<!-- Note: LLM again collapsed to category (health/sleep) rather than the mechanism (cross-source correlation). -->

**Competitors returned:**
| Name | Similarity Score | Category | Verdict |
|------|-----------------|----------|---------|
| Sleep Cycle | 72 | Direct | ❌ Wrong — Tracks sleep quality and wakes you at optimal time. No work performance correlation. Should score 20. |
| Oura Ring app | 68 | Direct | ❌ Wrong — Oura tracks readiness and sleep but doesn't pull calendar or task completion data. Should score 22. |
| Whoop | 65 | Direct | ❌ Wrong — Sports recovery tracker. No work or calendar integration. Should score 18. |
| RescueTime | 55 | Indirect | ⚠️ Borderline — Tracks work time and productivity patterns but no sleep data. 38 would be more accurate. |
| Exist.app | 78 | Direct | ✅ Correct — Explicitly correlates sleep, mood, activity, and work metrics across data sources. Near-direct. |

**What went wrong:**
- Sleep Cycle, Oura, and Whoop were all given Direct scores around 65–72 because they are top health/sleep apps — not because they do cross-source correlation. Category trap: "tracks sleep" ≠ "correlates sleep with work output."
- The core feature here is CROSS-SOURCE CORRELATION between health data and productivity/calendar data. Only apps that pull from BOTH sides score > 50.

**What went right:**
- Exist.app was correctly identified and scored highest — it is the only mainstream app that explicitly does multi-source personal data correlation.

**Calibration note:**
- Sleep Cycle, Oura, and Whoop are NEVER Direct competitors for an idea whose core feature is correlating sleep with work performance. They track sleep in isolation. Score them 15–25 (Adjacent).
- Exist.app (exist.io) is the canonical Direct competitor for any idea that cross-references multiple personal data streams (sleep, mood, activity, productivity). It must appear if the idea involves correlation across data types.
- RescueTime is Indirect (not Direct) for sleep-work ideas: it tracks work, not sleep. It can validate the "work side" of the correlation but doesn't close the loop.

---

### Session 3b — 2026-04-15
*Sub-case: same idea, corrected to focus on correlation mechanism*

**Idea submitted:** An app that pulls your sleep data from your wearable and cross-references it with your calendar to show how your sleep quality affected your work output that day
**Differentiator:** Connects sleep data to real work output metrics — calendar density, task completion, focus time — and surfaces patterns over 30 days
**Target user:** Knowledge workers and founders who feel their performance varies day to day but can't identify why
**Core features extracted by LLM:** ["cross-source data correlation", "wearable + calendar integration", "30-day performance pattern analysis", "sleep-to-productivity linkage"]

**Competitors returned:**
| Name | Similarity Score | Category | Verdict |
|------|-----------------|----------|---------|
| Exist.app | 82 | Direct | ✅ Correct — Cross-source personal analytics. Correlates sleep, mood, activity, and Toggl/RescueTime data. |
| Gyroscope | 72 | Direct | ✅ Correct — Aggregates wearable + productivity data and surfaces correlations and trends. |
| Reflect (Healthkit + work) | 58 | Indirect | ✅ Correct — Pulls Apple Health data but correlation depth is manual and shallow. |
| RescueTime | 40 | Indirect | ✅ Correct — Tracks work time only. No sleep input. Indirect. |
| Sleep Cycle | 22 | Adjacent | ✅ Correct — Sleep only, no work correlation. Correctly scored low. |
| Oura | 20 | Adjacent | ✅ Correct — Health readiness only. Correctly scored low. |

**What went wrong:**
- Minor: Gyroscope score of 72 could be argued as 65 — its correlation features are real but limited in depth.

**What went right:**
- Mechanism-level queries surfaced Gyroscope, which is frequently missed when queries use health/sleep category terms.
- Sleep Cycle and Oura correctly dropped to 20–22 (Adjacent) after the calibration rule from Session 3a was applied.

**Calibration note:**
- Gyroscope (gyrosco.pe) is a strong Direct competitor for any idea that aggregates health + productivity data into a personal analytics dashboard. It must appear alongside Exist.app for this feature space.

---

### Session 4a — 2026-04-18
*Sub-case: AI journaling with pattern detection — journal category trap*

**Idea submitted:** A journaling app where an AI reads your entries over time and tells you what patterns it's seeing — emotional cycles, recurring triggers, growth over time
**Differentiator:** You just write naturally — the AI does the analysis and surfaces insights you wouldn't notice yourself. It's not a mood tracker you fill in, it's a mirror that reflects your patterns back.
**Target user:** People who already journal but never go back and analyse what they've written — they want the insights without the effort
**Core features extracted by LLM:** ["journaling", "writing", "personal notes", "diary"]
<!-- Note: LLM missed "AI pattern detection" entirely — collapsed to "journaling app" category. -->

**Competitors returned:**
| Name | Similarity Score | Category | Verdict |
|------|-----------------|----------|---------|
| Day One | 75 | Direct | ❌ Wrong — Premium journal app. No AI analysis. No pattern detection. Should score 15. |
| Notion | 60 | Direct | ❌ Wrong — General workspace. No AI journaling or pattern analysis out of the box. Should score 10. |
| Bear | 55 | Direct | ❌ Wrong — Markdown note-taking app. No AI, no journaling features beyond text. Should score 8. |
| Rosebud AI | 82 | Direct | ✅ Correct — AI journaling app that asks guided questions and surfaces patterns and insights. |
| Reflectly | 58 | Indirect | ⚠️ Borderline — AI-enhanced mood journal with some pattern display. 45 is more accurate — pattern depth is shallow. |

**What went wrong:**
- Day One, Notion, and Bear were all included as Direct competitors based solely on being "note-taking / journaling" apps. None of them have AI pattern detection.
- The critical feature is "AI reads your entries and surfaces patterns." Only apps with this specific analytical loop can score > 50.

**What went right:**
- Rosebud AI was correctly identified and scored highest.

**Calibration note:**
- Day One is NEVER a Direct competitor for an AI pattern-detection journaling app. It is a plain journal with no AI analysis. Score it 10–18 (Adjacent — it captures raw data but doesn't process it).
- Notion and Bear score < 15 for any idea whose core feature is AI pattern analysis. They are general-purpose text tools with no analytical loop.
- Rosebud AI is the canonical Direct competitor for AI journaling that surfaces patterns and emotional insights. It must appear for this feature space.

---

### Session 4b — 2026-04-18
*Sub-case: same idea, corrected to anchor on AI pattern detection*

**Idea submitted:** A journaling app where an AI reads your entries over time and tells you what patterns it's seeing — emotional cycles, recurring triggers, growth over time
**Differentiator:** AI reads all your past entries and surfaces patterns you didn't notice — emotional cycles, recurring triggers, shifts in your language over time
**Target user:** People who already journal but never re-read their old entries — they want the insights without the effort of self-analysis
**Core features extracted by LLM:** ["AI pattern analysis on written entries", "emotional cycle detection", "trigger identification from text", "longitudinal insight surfacing"]

**Competitors returned:**
| Name | Similarity Score | Category | Verdict |
|------|-----------------|----------|---------|
| Rosebud AI | 88 | Direct | ✅ Correct — AI journaling + insight extraction. Near-direct clone of core feature. |
| Stoic (app) | 72 | Direct | ✅ Correct — AI-assisted reflection journaling with mood patterns and prompt-driven entries. |
| Mindsera | 78 | Direct | ✅ Correct — AI journaling that analyses tone, emotions, and cognitive patterns in entries. Very high feature overlap. |
| Reflectly | 48 | Indirect | ✅ Correct — Mood tracking + guided questions, but pattern surfacing is shallow. Indirect. |
| Daylio | 38 | Indirect | ✅ Correct — Micro-diary with mood charts, no text analysis. Indirect. |
| Day One | 14 | Adjacent | ✅ Correct — Plain journal, no AI. Adjacent. Correctly scored low. |

**What went wrong:**
- Stoic scored 72 — this could be argued as 60–65. Its AI pattern features exist but are less prominent than Mindsera or Rosebud. Acceptable range.

**What went right:**
- Mindsera was correctly surfaced — it is a strong Direct competitor often missed when queries use generic "journaling app" terms.
- Day One correctly dropped to 14 (Adjacent) after the calibration rule from Session 4a was applied.
- Longitudinal / temporal pattern analysis as a query anchor surfaced niche but accurate competitors.

**Calibration note:**
- Mindsera is a strong Direct competitor for any AI journaling product focused on cognitive and emotional pattern analysis. It must appear alongside Rosebud for this feature space.
- Stoic (the app, not the philosophy) is a guided reflection and AI journaling app — it is a legitimate Indirect-to-Direct competitor for ideas in the reflective journaling space.
- Daylio is ALWAYS Indirect (not Direct) for text-based journaling ideas — it is a mood rating app, not a writing app. Its "journaling" is emoji + one-word entries, not prose.

---

### Session 5 — 2026-04-22
*Sub-case: study accountability app — differentiators missed user's specific selling points*

**Idea submitted:** An app where I can study with it, it will tell me off for not studying properly. I can talk to it, it will have a mascot icon.
**Differentiator (from conversation):** Chat function while studying; in-app enforcement rule — user must talk to the app before they can leave; study-niche only (not general accountability)
**Target user:** Students who need accountability specifically for studying
**Core features extracted by LLM:** ["Conversational mascot AI that checks on study habits", "Personalized nagging and conversation for study accountability"]

**Competitors returned:**
| Name | Similarity Score | Category | Verdict |
|------|-----------------|----------|---------|
| coachcall.ai | 75 | Direct | ⚠️ Borderline — Correct to surface it, but differentiators did NOT call out that it is general accountability with no studying niche. |
| Duolingo | 40 | Mechanism analog | ❌ Wrong — Duolingo teaches language only. No open-subject study, no accountability conversation, no enforcement. Shared gamification + student audience is a category trap. Should score 8–12 at most. |
| WinToday | 30 | Adjacent | ✅ Correct — correctly scored low. |

**What went wrong:**
- Duolingo was included as a competitor at 40% similarity — the only shared properties are gamification and a student audience. This is a category trap. Duolingo is a language curriculum app with no accountability conversation and no open-subject support. It should score 8–12.
- `differentiators` array was generic — none referenced the user's specific selling points from the conversation.
- "coachcall.ai has no studying niche" was not mentioned anywhere, even though the user explicitly said the niche is studying.
- "no competitor has an in-app enforcement rule (must talk before leaving)" was never surfaced — this was a named feature in the conversation.
- Synthesis LLM received no conversation text, so it had no way to derive niche-specific or feature-specific differentiators.
- Only 3 competitors total returned despite 33+307 Reddit and 70+534 Twitter raw results — synthesis was too conservative. Blog/article sources (ProductHunt, Capterra) were not searched.
- Twitter/X results (70 P1 + 534 P2 raw) returned 0 competitors — all three were tagged `platform_split: "reddit"`. May be legitimate for this niche.

**What went right:**
- coachcall.ai correctly identified as the highest-similarity competitor at 75% — the "Contested" verdict was accurate.
- Duolingo correctly scored as Mechanism analog at 40% — it has engagement loops but not the same interaction model.
- Query generation correctly focused on conversational + niche mechanisms rather than broad "study app" category.

**Calibration note:**
- When the user's idea includes a SPECIFIC NICHE (e.g. "only for studying", "only for runners", "only for freelancers"), differentiators MUST call out that existing competitors are general-purpose and lack that niche. "coachcall.ai is general accountability — not built for studying" is a valid differentiator. "Duolingo is gamified language learning — not a study session companion for any subject" is a valid differentiator.
- When the user names a specific INTERACTION RULE (e.g. "must talk before leaving", "must check in before starting", "only unlocks after X"), that rule should appear as a differentiator explicitly: "No competitor enforces [the rule] — this app does by design."
- differentiators must NEVER be generic (e.g. "simpler UX", "better onboarding"). They must be formatted as: "[Competitor X] does not have [named feature from conversation] — [this app] does."
- Always pass the full conversation text into the synthesis prompt so the LLM can extract niche, rules, and selling points directly from the user's own words.

---

### Session 6 — 2026-04-23
*Sub-case: streaming/movie app — dominant incumbent platforms completely missed*

**Idea submitted:** My app allows me to watch all different kinds of shows and movies
**Differentiator:** Not stated explicitly — general streaming aggregator or personalised content discovery
**Target user:** General consumer audience for video entertainment
**Core features extracted by LLM:** ["watch shows and movies", "content library", "streaming"]

**Competitors returned:**
| Name | Similarity Score | Category | Verdict |
|------|-----------------|----------|---------|
| Spotify | 65 | Direct | ❌ Wrong — Spotify is an audio/music platform, not video. Zero feature overlap with watching shows. Should score 10–18. |
| Plex | 55 | Direct | ⚠️ Borderline — Plex is a self-hosted media server, not a streaming app. Adjacent at 30–38. |
| Letterboxd | 35 | Adjacent | ✅ Correct category — but it is a film tracking/review app, not a streaming app. 20–28 is more accurate. |
| THEATER | 67 | Direct | ⚠️ Unknown app — could not be verified. Score unconfirmed. |
| Flixi | 70 | Direct | ⚠️ Unknown/minor app — inflated score for a platform with negligible market presence. |
| Bingeit | 68 | Direct | ⚠️ Unknown/minor app — same issue as Flixi. |
| IMDb | 40 | Adjacent | ✅ Correct — IMDb is a metadata/tracking app, not a streaming platform. Adjacent is correct. |

**What was NEVER returned (should have been the entire top of the list):**
| Name | Correct Score | Correct Category | Note |
|------|--------------|-----------------|------|
| Netflix | 92 | Direct | The single most dominant competitor. Must appear first. |
| Disney+ | 87 | Direct | Major streaming platform. Must appear. |
| HBO Max / Max | 85 | Direct | Major streaming platform. Must appear. |
| Amazon Prime Video | 83 | Direct | Bundled streaming. Must appear. |
| Apple TV+ | 78 | Direct | Major streaming platform. Must appear. |
| YouTube | 72 | Direct | Free video streaming — overlaps significantly for show/movie watching. |

**What went wrong:**
- ALL six major streaming incumbents (Netflix, Disney+, HBO Max, Prime Video, Apple TV+, YouTube) were completely absent from the output.
- Root cause: Reddit discovery queries for "best app to watch movies" surface discussions about Plex (self-hosted), VPNs, or small alternatives — not Netflix, because Netflix is so dominant that Reddit users never "recommend" it. They assume everyone already knows.
- The pipeline interpreted "not mentioned in Reddit threads" as "not a competitor." This is a fundamental misread: the biggest platforms in a saturated market are invisible to discovery queries precisely because they need no discovery.
- Spotify (audio streaming) was included at 65% — the only shared word is "streaming." Feature overlap with a video content app is near zero.
- The result gave a false impression of moderate competition (Flixi at 70%, Bingeit at 68%) when the real competitive landscape is catastrophically saturated — Netflix alone has 260M+ subscribers and a $300B market cap.

**What went right:**
- IMDb and Letterboxd were correctly identified as Adjacent (tracking/metadata apps, not streaming).
- The Adjacent categorisation for non-streaming apps was directionally correct.

**Market saturation signal that was missed:**
- Any idea whose primary function is "watch shows and movies" is entering one of the most saturated consumer markets on earth. The correct verdict is strong red: Netflix, Disney+, HBO Max, and Amazon Prime collectively spend $30B+/year on content. A new entrant cannot compete on content library. The only viable path is a very specific niche (e.g. "only indie films", "only anime with community watch-parties", "only short-form creator content") — and even then it is fighting YouTube and TikTok.
- The pipeline should have returned a market_score near 2–3 (well-served market) and a niche_score near 1–2 (audience already has abundant dedicated options), not the moderate scores it likely produced.

**Calibration note:**
- Netflix is ALWAYS a Direct competitor (score 88–95) for any idea whose core function is watching video content (shows, movies, series). It must appear first in the competitors list, regardless of whether Serper returned it.
- Disney+, HBO Max, Amazon Prime Video, Apple TV+ are all Direct competitors (score 78–88) for any streaming/video app and must appear even if absent from Reddit results.
- YouTube is a Direct competitor (score 68–75) for any free or ad-supported video viewing idea.
- Spotify is NEVER a competitor for a video streaming app. They do not share a core feature. Score 10–15 at most (Adjacent — both are subscription media platforms, but different media type).
- Plex is Adjacent (25–38), not Direct — it is a self-hosted media server, not a streaming service. Its audience is technically literate users managing their own libraries, not general consumers.
- For saturated incumbent markets (streaming, social, messaging, ride-sharing), the market_score should be 2–4 (low opportunity) unless the idea has a very specific mechanism or niche that none of the incumbents address. Generic entry ("watch shows and movies") = score 2–3. Specific niche ("watch anime with sync watch-party and community commentary") = score 5–7.

---

<!-- Template — copy and fill in for each session:

### Session [N] — [date]
**Idea submitted:** [exact text from Q1]
**Differentiator:** [exact text from Q2]
**Target user:** [exact text from Q3]
**Core features extracted by LLM:** [what the query builder identified]

**Competitors returned:**
| Name | Similarity Score | Category | Verdict |
|------|-----------------|----------|---------|
| [name] | [score] | [Direct/Indirect/Adjacent] | ✅ Correct / ❌ Wrong / ⚠️ Borderline |

**What went wrong:**
- [specific mistake e.g. "included Forest (timer app) with 65% similarity — should be < 15%"]

**What went right:**
- [specific win e.g. "correctly identified Replika as a conversational AI competitor"]

**Calibration note to add:**
- [rule to add to the Calibration Rules section above]

-->
