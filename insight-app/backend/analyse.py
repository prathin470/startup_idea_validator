import os
import sys
import json
import time
import datetime
import pathlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI, RateLimitError
from dotenv import load_dotenv

# Add the directory containing this file to sys.path so sibling modules can be
# imported without a package __init__.py — keeps the project structure flat
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from serper import search_reddit, search_twitter, search_blogs, fetch_appstore_reviews  # noqa: E402

load_dotenv(dotenv_path=pathlib.Path(__file__).parent.parent / ".env")

router = APIRouter()

# Reuse the same OpenRouter client config as main.py
_llm = OpenAI(
    api_key=os.environ.get("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)
_MODEL = "google/gemini-2.0-flash-001"

# Load prompts.md once at import time — same directory as this file (backend/)
_PROMPTS_PATH = pathlib.Path(__file__).parent / "prompts.md"
_PROMPTS = _PROMPTS_PATH.read_text(encoding="utf-8")

# Sessions are saved under data/testcases/ — one JSON file per run, named by timestamp
_SESSIONS_DIR = pathlib.Path(__file__).parent.parent / "data" / "testcases"
_SESSIONS_DIR.mkdir(exist_ok=True)

# Load testcases.md once at import time — calibration examples from past runs.
# The synthesis LLM reads these before identifying competitors so it doesn't
# repeat known mistakes (e.g. including timer apps for a conversational AI idea).
# Restart the server after adding new calibration entries for them to take effect.
_TESTCASES_PATH = pathlib.Path(__file__).parent / "testcases.md"
_TESTCASES = _TESTCASES_PATH.read_text(encoding="utf-8") if _TESTCASES_PATH.exists() else ""


def _llm_call(messages: list[dict], retries: int = 3, delay: float = 8.0) -> str:
    """Retry wrapper — backs off on 429 rate-limit errors then re-raises on final attempt."""
    for attempt in range(retries):
        try:
            response = _llm.chat.completions.create(
                model=_MODEL,
                response_format={"type": "json_object"},
                messages=messages,
            )
            return response.choices[0].message.content
        except RateLimitError:
            if attempt == retries - 1:
                raise
            time.sleep(delay * (attempt + 1))


def _extract_section(heading: str) -> str:
    """
    Pull a named # heading section out of prompts.md so each LLM call only
    receives the rules relevant to it — avoids model confusion from unrelated
    instructions bleeding across calls.
    """
    lines = _PROMPTS.splitlines()
    capturing = False
    section_lines = []
    for line in lines:
        if line.strip() == f"# {heading}":
            capturing = True
            continue
        if capturing and line.strip().startswith("# "):
            break
        if capturing:
            section_lines.append(line)
    return "\n".join(section_lines).strip()


class ChatMessage(BaseModel):
    role: str
    content: str


class AnalyseRequest(BaseModel):
    idea: str
    conversation: list[ChatMessage]


class Competitor(BaseModel):
    name: str
    description: str
    pricing: str
    strengths: list[str]
    weaknesses: list[str]
    sentiment: str
    # LLM-derived feature overlap — 0 (no overlap) to 100 (direct clone of core features)
    similarity_score: int | None = None
    # Direct / Adjacent / Substitute / Graveyard / Mechanism analog
    category: str | None = None
    # Evidence capture — derived from Reddit + Twitter mention analysis
    mention_count: int | None = None          # total independent thread/tweet appearances
    engagement_score: int | None = None       # sum of Reddit upvote signals + Twitter like signals
    sentiment_split: dict | None = None       # {"positive": 60, "neutral": 30, "negative": 10}
    dominant_complaint: str | None = None     # most-cited criticism verbatim, under 15 words
    dominant_praise: str | None = None        # most-cited strength verbatim
    platform_split: str | None = None         # "reddit" / "twitter" / "both"
    status_signal: str | None = None          # "active" / "declining" / "dead"
    competitor_sources: list[str] | None = None  # URLs where this competitor was found


class AnalyseResponse(BaseModel):
    competitors: list[Competitor]
    personas: list[dict]
    differentiators: list[str]
    sources: list[str]
    market_score: float        # 0–10 opportunity score derived from competitor dissatisfaction
    # Audience-specific niche fit evaluation — separate from market_score which measures
    # general user dissatisfaction. niche_evaluation answers "do ANY of these tools actually
    # serve the specific audience this idea targets, or are they all generic?"
    niche_evaluation: dict | None = None


@router.post("/analyse", response_model=AnalyseResponse)
def analyse(req: AnalyseRequest):
    if not _llm.api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY is not set")

    search_rules = _extract_section("Search Rules")
    conversation_text = "\n".join(f"{m.role}: {m.content}" for m in req.conversation)

    # =========================================================================
    # PHASE 1 — Query builder
    # Generates two sets of discovery queries: one for Reddit (via Google
    # site:reddit.com), one for Twitter/X (via Google site:x.com).
    #
    # Three query categories per platform, following the research methodology:
    #   A. Direct recommendation asks — find who people already use
    #   B. Unmet-need queries — find where people say nothing exists
    #   C. Gold thread hunt (Reddit) / complaint language (Twitter) — find
    #      threads comparing or criticising tools in this space
    #
    # Twitter's native engagement operators (min_faves, min_retweets) are NOT
    # available through Google search. Queries are written as content phrases
    # that surface relevant tweets — engagement filtering happens implicitly
    # because Google ranks by authority, not recency.
    # =========================================================================
    query_prompt = f"""You are a competitor research strategist. Extract the target audience and core differentiating MECHANISMS of this idea, then generate Phase 1 discovery queries for Reddit and Twitter.

Startup idea: {req.idea}

Conversation:
{conversation_text}

Search rules to follow:
{search_rules}

Return valid JSON with exactly this shape:
{{
  "target_audience": "The most specific description of WHO this is for — extracted from the user's answer to 'who is it for'. Include the condition, situation, or identity (e.g. 'people with anxiety and panic attacks', 'Year 12 students revising for A-Levels'). This is the PRIMARY anchor for all queries — every query must be relevant to this audience.",
  "core_features": [
    "the 2–3 most distinctive MECHANISMS — what it does differently, not what category it's in",
    "e.g. 'conversational AI check-in with memory' not 'accountability'"
  ],
  "reddit_phase1": [
    "what app do you use for [specific feature] for [audience]",
    "best app for [audience] with [specific problem]",
    "is there an app that [specific capability] for [audience]",
    "wish there was an app [specific need] [audience]",
    "looking for an app [specific use case] [audience]",
    "intitle:(\\\"tried every\\\" OR \\\"my ranking\\\") [audience problem] app",
    "why isn't there an app [specific gap] [audience]"
  ],
  "twitter_phase1": [
    "I hate [audience problem] app",
    "every [audience category] app is",
    "someone should build an app [audience problem]",
    "I would pay for an app [audience problem]",
    "best app for [audience] [specific feature]",
    "recommendations for [audience problem] app",
    "what app do you use for [audience problem]"
  ]
}}

Guidelines:
- target_audience: THIS IS THE MOST IMPORTANT FIELD. Pull it directly from the user's words — do not generalise. "people with anxiety and panic attacks" beats "mental health users". "freelance designers juggling 4–6 clients" beats "professionals".
- core_features: the MECHANISM, not the outcome. "camera OCR + auto-categorise" beats "expense tracking". "two-way AI conversation with memory" beats "accountability".
- EVERY query must be anchored on BOTH target_audience AND core_features. A query without the audience is useless — it will surface generic tools that don't serve this audience.
- reddit_phase1: 5–7 queries. Mix categories A (recommendation asks), B (unmet-need), C (gold threads). Do NOT add site:reddit.com — the backend adds it.
- twitter_phase1: 5–7 queries. Mix complaint language, wish language, recommendation asks. Do NOT use min_faves or min_retweets — not supported here. Write as natural phrases a real user would tweet.
- If the idea targets a health/mental health audience: queries MUST include the condition name (e.g. "anxiety", "panic attacks", "depression") — not just the mechanism."""

    queries_data = json.loads(_llm_call([{"role": "user", "content": query_prompt}]))
    # Gemini occasionally wraps JSON in an array — treat anything non-dict as empty
    if not isinstance(queries_data, dict):
        queries_data = {}
    target_audience: str      = queries_data.get("target_audience", "")
    core_features: list[str]  = queries_data.get("core_features", [])
    reddit_p1: list[str]      = queries_data.get("reddit_phase1", [])
    twitter_p1: list[str]     = queries_data.get("twitter_phase1", [])

    if not reddit_p1 and not twitter_p1:
        raise HTTPException(status_code=500, detail="LLM failed to generate Phase 1 queries")

    # =========================================================================
    # PHASE 1 FETCH — Reddit + Twitter run in parallel
    # Total wait = max(Reddit, Twitter, Blogs), not their sum.
    # Blog search runs alongside Reddit + Twitter — ProductHunt, Capterra, and
    # "best X apps" roundup articles surface many named competitors that never
    # appear in Reddit/Twitter discussions. Queries are derived directly from
    # core_features so they stay mechanism-anchored, not category-level.
    # =========================================================================
    reddit_p1_results:  list[dict] = []
    twitter_p1_results: list[dict] = []
    blog_p1_results:    list[dict] = []

    def _fetch_reddit_p1():
        try:
            return search_reddit(reddit_p1, results_per_query=3)
        except RuntimeError:
            return []

    def _fetch_twitter_p1():
        try:
            return search_twitter(twitter_p1, results_per_query=5)
        except RuntimeError:
            return []

    def _fetch_blogs_p1():
        blog_queries = [f"best apps for {f}" for f in core_features]
        blog_queries += [f"{f} app alternatives" for f in core_features]
        try:
            return search_blogs(blog_queries, results_per_query=5)
        except RuntimeError:
            return []

    with ThreadPoolExecutor(max_workers=3) as executor:
        p1_futures = {
            executor.submit(_fetch_reddit_p1):  "reddit",
            executor.submit(_fetch_twitter_p1): "twitter",
            executor.submit(_fetch_blogs_p1):   "blogs",
        }
        for future in as_completed(p1_futures):
            src = p1_futures[future]
            if src == "reddit":
                reddit_p1_results = future.result()
            elif src == "twitter":
                twitter_p1_results = future.result()
            else:
                blog_p1_results = future.result()

    # =========================================================================
    # EXTRACT + PHASE 2 QUERY BUILDER (single combined LLM call)
    #
    # From Phase 1 results, the LLM does two things in one call:
    #   1. Extracts every named app/software competitor it finds (apps only —
    #      spreadsheets, Notion templates, habits, pen-and-paper, hiring a
    #      human are explicitly excluded as non-competitors per research scope)
    #   2. Generates Phase 2 competitor-seeded dissatisfaction queries for each
    #      app found — "alternative to X", "I switched from X", "tired of X"
    #      These uncover new apps (ones users switched TO) and capture raw
    #      churn/pain language that generic queries never surface.
    #
    # Phase 1 results are truncated to 6k chars each to stay within token limits
    # while preserving enough signal for meaningful extraction. Blog results get
    # 4k — they tend to be more structured (listicles) so shorter is sufficient.
    # =========================================================================
    reddit_p1_json  = json.dumps(reddit_p1_results,  indent=2)[:6000]
    twitter_p1_json = json.dumps(twitter_p1_results, indent=2)[:6000]
    blog_p1_json    = json.dumps(blog_p1_results,    indent=2)[:4000]

    extract_prompt = f"""You are a research analyst. Read these Phase 1 results and do two things:

1. EXTRACT every named app, software product, SaaS tool, or AI product mentioned as a solution.
   LOG ONLY: mobile apps, web apps, SaaS tools, browser extensions, desktop software, named AI tools/chatbots.
   DO NOT LOG: Google Sheets / Excel spreadsheets, Notion templates, Obsidian vaults, pen-and-paper, habits, routines, "I just do it manually", hiring a VA/coach/human.
   If a thread's most-upvoted answer is a non-digital workaround, discard it entirely.
   Blog/article results often list 5–10 apps per article — extract only the top 5 most directly relevant apps by feature overlap with the startup idea. Ignore apps that only share a broad category.

2. For each of these 5 apps, generate Phase 2 competitor-seeded queries.
   Reddit Phase 2 style: "alternative to [App]", "I switched from [App]", "better than [App]", "tired of [App]", "gave up on [App]"
   Twitter Phase 2 style: "[App] switched to", "[App] just canceled", "alternative to [App]", "finally switched from [App]"

Phase 1 Reddit results:
{reddit_p1_json}

Phase 1 Twitter results:
{twitter_p1_json}

Phase 1 Blog/Article results (ProductHunt, Capterra, roundup articles — extract every named app):
{blog_p1_json}

Return valid JSON:
{{
  "app_candidates": ["AppName1", "AppName2"],
  "reddit_phase2": ["alternative to AppName1", "I switched from AppName1", "better than AppName2"],
  "twitter_phase2": ["AppName1 switched to", "alternative to AppName2", "finally switched from AppName1"]
}}"""

    extract_data = json.loads(_llm_call([{"role": "user", "content": extract_prompt}]))
    if not isinstance(extract_data, dict):
        extract_data = {}
    app_candidates: list[str] = extract_data.get("app_candidates", [])
    # Hard caps as a safety net in case the LLM ignores the "top 5 apps" prompt instruction —
    # prevents the query explosion seen in earlier sessions where 26 apps × 5 queries = 130 Serper calls
    reddit_p2: list[str]  = extract_data.get("reddit_phase2", [])[:25]
    twitter_p2: list[str] = extract_data.get("twitter_phase2", [])[:20]

    # =========================================================================
    # PHASE 2 FETCH — competitor-seeded dissatisfaction queries
    # Reddit + Twitter run in parallel. Phase 2 queries uncover:
    #   - Apps users switched TO from Phase 1 apps (new competitors)
    #   - Churn language and dominant complaints per known app
    # =========================================================================
    reddit_p2_results:  list[dict] = []
    twitter_p2_results: list[dict] = []

    def _fetch_reddit_p2():
        if not reddit_p2:
            return []
        try:
            return search_reddit(reddit_p2, results_per_query=3)
        except RuntimeError:
            return []

    def _fetch_twitter_p2():
        if not twitter_p2:
            return []
        try:
            return search_twitter(twitter_p2, results_per_query=5)
        except RuntimeError:
            return []

    with ThreadPoolExecutor(max_workers=2) as executor:
        p2_futures = {
            executor.submit(_fetch_reddit_p2):  "reddit",
            executor.submit(_fetch_twitter_p2): "twitter",
        }
        for future in as_completed(p2_futures):
            src = p2_futures[future]
            if src == "reddit":
                reddit_p2_results = future.result()
            else:
                twitter_p2_results = future.result()

    # =========================================================================
    # APP STORE REVIEW COUNTS
    # Run after Phase 2 completes. Fetches review counts for all app candidates
    # via the free iTunes Search API (no key required). Used to rank competitors
    # by market presence — the most-reviewed app surfaces first in the response.
    # =========================================================================
    appstore_reviews: dict[str, int] = fetch_appstore_reviews(app_candidates)

    all_reddit:  list[dict] = reddit_p1_results  + reddit_p2_results
    all_twitter: list[dict] = twitter_p1_results + twitter_p2_results

    if not all_reddit and not all_twitter:
        raise HTTPException(status_code=404, detail="No competitor data found on Reddit or Twitter")

    # =========================================================================
    # SYNTHESIS — final LLM call
    #
    # All Phase 1 + Phase 2 + Phase 3 data from Reddit and Twitter is fed to the
    # synthesis LLM with three explicit instructions:
    #   1. Apps-only filter: non-digital workarounds are captured separately
    #      under non_app_signals (valuable market signal) but NOT as competitors
    #   2. Full evidence capture per competitor: mention_count, sentiment_split,
    #      dominant_complaint, dominant_praise, platform_split, status_signal
    #   3. Calibration context from testcases.md injected before identification —
    #      known mistakes (e.g. timer apps for conversational AI) are not repeated
    #
    # Reddit + Twitter context is each truncated to 8k chars — beyond that the LLM
    # receives diminishing returns and starts hallucinating from truncated JSON.
    # Blog context is truncated to 5k — roundup articles are shorter and denser.
    # =========================================================================
    testcases_context = f"""
--- CALIBRATION: PAST TEST CASES ---
Read these BEFORE identifying competitors. Apply all rules. Do not repeat flagged mistakes.
{_TESTCASES}
--- END CALIBRATION ---
""" if _TESTCASES else ""

    reddit_ctx  = json.dumps(all_reddit,     indent=2)[:8000]
    twitter_ctx = json.dumps(all_twitter,    indent=2)[:8000]
    blog_ctx    = json.dumps(blog_p1_results, indent=2)[:5000]

    synthesis_prompt = f"""You are a startup research analyst. Analyse all Reddit, Twitter, and blog/article data below to produce a competitor landscape, user persona report, and market opportunity assessment.
{testcases_context}
Startup idea: {req.idea}

⚠️ TARGET AUDIENCE — THIS IS YOUR PRIMARY FILTER ⚠️
"{target_audience}"
Every competitor you include MUST be something this specific audience actually uses or would consider.
A general wellness app is NOT a competitor for an anxiety-specific tool. A general productivity app is NOT a competitor for a student revision tool.
If a competitor does not serve or directly overlap with "{target_audience}", exclude it — no matter how many Reddit mentions it has.
Ask yourself for every candidate: "Would someone with {target_audience} realistically use this app for that specific need?" If no, cut it.

Original conversation (the user's words — read this to extract their specific selling points, niche, and intended rules/features; differentiators MUST reference these explicitly):
{conversation_text}

Core differentiating mechanisms of this idea (anchor all competitor identification on these):
{json.dumps(core_features)}

--- REDDIT DATA (Phases 1–3) ---
{reddit_ctx}

--- TWITTER/X DATA (Phases 1–3) ---
{twitter_ctx}

--- BLOG/ARTICLE DATA (ProductHunt, Capterra, G2, roundup articles) ---
{blog_ctx}

--- APP STORE REVIEW COUNTS ---
{json.dumps(appstore_reviews, indent=2)}
These are real App Store review counts fetched from iTunes. Higher = more established market presence.
Use this to inform mention_count estimates and to order competitors — the most-reviewed app should appear first in your competitors list.

CRITICAL FILTER — APPS ONLY:
Include competitors that are: mobile apps, web apps/SaaS tools, browser extensions, desktop software, named AI tools/chatbots.
Do NOT include as competitors: spreadsheets (Google Sheets, Excel), Notion templates, Obsidian vaults, pen-and-paper systems, habits, routines, hiring a VA/coach/human, "I just do it manually".
If the most common solution in a thread is non-digital, log it in non_app_signals — do not include it in the competitors list.

Return valid JSON with exactly this shape:
{{
  "competitors": [
    {{
      "name": "tool name",
      "description": "what it does in one sentence",
      "pricing": "free / paid / freemium / unknown",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["Frame each weakness as the gap it creates for the user's idea — not a raw complaint. e.g. not 'requires subscription' but 'no personalisation of training — unlike this idea which tailors games to what the user enjoys'. Always connect back to the user's differentiators from the conversation above."],
      "sentiment": "positive / mixed / negative",
      "category": "Direct / Adjacent / Substitute / Graveyard / Mechanism analog",
      "similarity_score": 72,
      "mention_count": 14,
      "engagement_score": 340,
      "sentiment_split": {{"positive": 45, "neutral": 30, "negative": 25}},
      "dominant_complaint": "verbatim complaint under 15 words from real users",
      "dominant_praise": "verbatim praise under 15 words from real users",
      "platform_split": "reddit",
      "status_signal": "active",
      "competitor_sources": ["url1", "url2"]
    }}
  ],
  "personas": [
    {{
      "id": "kebab-case-slug",
      "name": "Realistic full name",
      "age": 28,
      "role": "Job title",
      "context": "1–2 sentences describing their work situation and why this problem affects them",
      "redditSource": "r/subreddit where this persona pattern was found",
      "commentary": "First-person frustrated quote under 25 words",
      "thoughts": "What they think about current solutions in one sentence",
      "feelings": [
        {{"emoji": "😤", "label": "Overwhelmed"}},
        {{"emoji": "⏱️", "label": "Time-poor"}},
        {{"emoji": "🔍", "label": "Searching"}}
      ],
      "ideaScore": 8.5,
      "journeySteps": [
        {{
          "title": "Short step name",
          "description": "What they actually do",
          "painPoint": "The specific friction in this step"
        }}
      ]
    }}
  ],
  "non_app_signals": [
    "Most common non-digital workaround found and its apparent traction e.g. spreadsheet system cited in 40+ comments"
  ],
  "differentiators": [
    "Concrete gap tied to a SPECIFIC SELLING POINT from the conversation — name the feature, name which competitor lacks it",
    "e.g. 'coachcall.ai is general accountability — no niche for studying specifically; this app targets students only'",
    "e.g. 'no competitor enforces an in-app rule to talk before leaving — this app does, by design'"
  ],
  "sources": ["url1", "url2"],
  "niche_evaluation": {{
    "audience": "Precise description of who this idea is specifically built for — include age group, role, and context (e.g. 'Year 10–13 students preparing for GCSE/A-Level exams', NOT just 'students'). Extract this from the conversation, not from generic category language.",
    "niche_score": 8.5,
    "gap_summary": "1–2 sentences on why existing competitors miss this specific audience. Cite competitors by name. Explain the structural reason they can't serve this niche — not a feature list, the root cause (e.g. 'ChatGPT and Khan Academy are built for general learners — neither has awareness of exam boards, mark schemes, or the pressure of a specific curriculum. A Year 12 student revising for A-Level Chemistry gets the same interface as a 40-year-old professional.').",
    "suggestions": [
      "Specific, actionable way to deepen niche fit — name the feature and why no competitor has it (e.g. 'Map every question to a curriculum module and exam board — no competitor does this, so students always know which spec point they are revising')",
      "Second suggestion tied directly to the audience's real context — workflow, platform they use, constraints they have",
      "Third suggestion if warranted — else omit this entry"
    ]
  }}
}}

Scoring rules:
- similarity_score 0–100: FEATURE OVERLAP only. Not popularity, not market position. Read calibration test cases above for exact score boundaries.
  Direct clone = 85–100. Same feature different angle = 60–84. Same problem different mechanism = 35–59. Related space = 10–34. Category match only = 0–9.
- category: "Direct" = same problem + same mechanism + same audience. "Substitute" = different approach, solves same problem. "Graveyard" = no updates in 18+ months. "Mechanism analog" = different problem, same mechanism.
- mention_count: independent thread/tweet appearances across all phases and both platforms.
- engagement_score: estimate from Reddit comment/upvote signals + Twitter engagement signals visible in snippets.
- sentiment_split must sum to 100. Derive from tone of comments/tweets about the app specifically.
- dominant_complaint and dominant_praise: most repeated phrasing. Quote real user language — verbatim beats paraphrase.
- weaknesses: NEVER just paste raw user complaints ("scam", "too expensive", "buggy"). Frame every weakness as the specific gap it creates relative to the user's idea. Format: "[Competitor] does X but NOT [what the user's idea does]." If the user's idea personalises games, the weakness of Lumosity is "generic one-size-fits-all training with no personalisation — not tailored to what the user enjoys", not "scam".
- platform_split: "reddit" if found in Reddit or blog/article sources only, "twitter" if only Twitter, "both" if on multiple platforms.
- status_signal: "dead" if Graveyard, "declining" if churn language dominates, "active" otherwise.
- personas: derive 2–3 from real user patterns in the data. Each needs exactly 3 feelings and 3–5 journey steps.
- ideaScore: 0–10 — how much this persona would benefit from the startup idea specifically.
- non_app_signals: list any prominent non-digital workarounds. These are market opportunity signals.
- differentiators: MUST be anchored on the user's specific selling points from the conversation above.
  Format: "[Competitor X] does not have [specific feature the user mentioned] — [user's idea] does."
  e.g. "coachcall.ai is general accountability with no niche for studying — this app targets students only."
  e.g. "No competitor enforces an in-app rule to talk before the user leaves — this app does by design."
  Never write a generic differentiator like "simpler UX" or "better onboarding" — tie it to a named feature from the conversation.
- Return at least 5 competitors, 2 personas, 3 differentiators if the data supports it. If Direct/Indirect don't fill 5, include Adjacent competitors — label them clearly. Never pad with false positives (e.g. Duolingo for a study accountability app).
- niche_score 0–10: how underserved is the SPECIFIC AUDIENCE (from the conversation) by every existing tool in the results?
  9–10: no competitor targets this audience — they are all generic or built for a different segment entirely.
  7–8: competitors touch the problem space but ignore key aspects of this audience's context (age, curriculum, workflow, constraints).
  5–6: some tools have niche features but are incomplete or poorly executed for this audience.
  3–4: decent niche coverage exists — differentiation must come from execution quality, not audience gap.
  1–2: audience is already well-served by dedicated tools — fighting directly on the competitor's home turf.
  Score high when tools are generic household names (ChatGPT, Google, Excel) repurposed for a specific niche.
- niche_evaluation.suggestions: each must be SPECIFIC to the audience's context. "Map questions to curriculum spec points" beats "add more content". Name what no competitor has done. Include why it is structurally hard for a generic tool to add this. Max 3 suggestions."""

    result = json.loads(_llm_call([{"role": "user", "content": synthesis_prompt}]))
    if not isinstance(result, dict):
        result = {}

    # Sort competitors by App Store review count descending — most-reviewed (most
    # established) competitor surfaces first regardless of LLM ordering.
    # Falls back to 0 for any competitor the LLM returned that wasn't in app_candidates.
    result["competitors"] = sorted(
        result.get("competitors", []),
        key=lambda c: appstore_reviews.get(c.get("name", ""), 0),
        reverse=True,
    )

    # =========================================================================
    # Market score
    # Derived from competitor sentiment_split (Reddit + Twitter dissatisfaction).
    #
    # Formula per competitor:
    #   opportunity = (negative% + neutral% * 0.5) / 100 * 10
    #   → high dissatisfaction = high opportunity score
    #
    # Fallback for competitors where the LLM didn't produce sentiment_split:
    #   positive → 2.5 (25% dissatisfaction), mixed → 5.0, negative → 7.5
    #
    # Final score = average of opportunity scores across all competitors, 0dp.
    # A market of very satisfied users → ~2.5 (saturated).
    # A market of frustrated users → ~7.5+ (real opening).
    # =========================================================================
    sentiment_fallback = {"positive": 2.5, "mixed": 5.0, "negative": 7.5}
    opportunity_scores: list[float] = []

    for c in result.get("competitors", []):
        split = c.get("sentiment_split")
        if split and isinstance(split, dict):
            negative_pct = split.get("negative", 0)
            neutral_pct  = split.get("neutral",  0)
            opportunity_scores.append((negative_pct + neutral_pct * 0.5) / 100 * 10)
        else:
            opportunity_scores.append(sentiment_fallback.get(c.get("sentiment", "mixed"), 5.0))

    market_score = round(sum(opportunity_scores) / len(opportunity_scores), 1) if opportunity_scores else 5.0

    # =========================================================================
    # Session capture — full pipeline state saved to backend/testcases/
    # Every run gets its own timestamped JSON file. Reviewing these files is
    # how we fill in testcases.md calibration entries after each test session.
    # =========================================================================
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    session = {
        "timestamp": timestamp,
        "idea": req.idea,
        "conversation": [{"role": m.role, "content": m.content} for m in req.conversation],
        "target_audience": target_audience,
        "core_features": core_features,
        "app_candidates_phase1": app_candidates,
        "queries": {
            "reddit_phase1":  reddit_p1,
            "twitter_phase1": twitter_p1,
            "reddit_phase2":  reddit_p2,
            "twitter_phase2": twitter_p2,
        },
        "search_results": {
            "reddit_phase1":  reddit_p1_results,
            "twitter_phase1": twitter_p1_results,
            "reddit_phase2":  reddit_p2_results,
            "twitter_phase2": twitter_p2_results,
        },
        "appstore_reviews": appstore_reviews,
        "competitors":      result.get("competitors",      []),
        "market_score":     market_score,
        "non_app_signals":  result.get("non_app_signals",  []),
        "differentiators":  result.get("differentiators",  []),
        "sources":          result.get("sources",          []),
    }
    session_path = _SESSIONS_DIR / f"session_{timestamp}.json"
    session_path.write_text(json.dumps(session, indent=2), encoding="utf-8")

    return AnalyseResponse(
        competitors=result.get("competitors", []),
        personas=result.get("personas", []),
        differentiators=result.get("differentiators", []),
        sources=result.get("sources", []),
        market_score=market_score,
        niche_evaluation=result.get("niche_evaluation"),
    )
