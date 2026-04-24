import os
import time
import httpx
from concurrent.futures import ThreadPoolExecutor, as_completed

SERPER_URL = "https://google.serper.dev/search"

# Maximum simultaneous Serper requests — beyond ~5 concurrent calls the free
# tier reliably returns 429s. Keeping this low adds minimal wall time since
# each batch completes in ~0.8s and the next batch starts immediately after.
_MAX_WORKERS = 5

# Platform site prefixes — applied automatically so callers never hardcode them.
# Twitter/X is indexed under both domains; we use x.com as the canonical one.
PLATFORM_SITES = {
    "reddit":   "site:reddit.com",
    "linkedin": "site:linkedin.com",
    "twitter":  "site:x.com OR site:twitter.com",
}


def _fetch(query: str, results_per_query: int, headers: dict, retries: int = 3) -> list[dict]:
    """Single Serper request with exponential backoff on 429 rate-limit errors.

    tbs=qdr:y2 restricts results to the past 2 years so signals reflect
    current market reality rather than stale discussions from years ago.
    429s happen when too many threads hit Serper simultaneously — retrying
    after a short wait is more reliable than failing the entire pipeline.
    """
    for attempt in range(retries):
        response = httpx.post(
            SERPER_URL,
            headers=headers,
            json={"q": query, "num": results_per_query, "tbs": "qdr:y2"},
            timeout=10,
        )
        if response.status_code == 429:
            if attempt == retries - 1:
                response.raise_for_status()
            time.sleep(2 ** attempt)  # 1s, 2s, 4s
            continue
        response.raise_for_status()
        return response.json().get("organic", [])
    return []


def _parallel_fetch(
    queries: list[str],
    site_prefix: str,
    results_per_query: int,
    headers: dict,
    extra_fields: dict | None = None,
) -> list[dict]:
    """Fire all queries simultaneously using a thread pool, then deduplicate by URL.

    Previously each search function looped over queries sequentially — N queries × ~0.8s
    = N×0.8s total. Parallelising reduces that to a single ~0.8s round-trip regardless
    of how many queries are sent. Deduplication is safe because it happens after all
    threads complete, not inside them.

    extra_fields: optional dict of fixed key→value pairs to merge into every result
    (used to stamp platform attribution without an extra pass).
    """
    def _run(query: str) -> list[dict]:
        return _fetch(f"{query} {site_prefix}", results_per_query, headers)

    seen_urls: set[str] = set()
    results: list[dict] = []

    with ThreadPoolExecutor(max_workers=min(_MAX_WORKERS, len(queries))) as executor:
        futures = [executor.submit(_run, q) for q in queries]
        for future in as_completed(futures):
            for item in future.result():
                url = item.get("link", "")
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                entry = {
                    "title":   item.get("title", ""),
                    "url":     url,
                    "snippet": item.get("snippet", ""),
                }
                if extra_fields:
                    entry.update(extra_fields)
                results.append(entry)

    return results


def search_reddit(queries: list[str], results_per_query: int = 5) -> list[dict]:
    """All queries fire simultaneously — wall time is max(single query), not sum."""
    api_key = os.environ.get("SERPER_API_KEY")
    if not api_key:
        raise RuntimeError("SERPER_API_KEY is not set in .env")
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
    return _parallel_fetch(queries, PLATFORM_SITES["reddit"], results_per_query, headers)


def search_blogs(queries: list[str], results_per_query: int = 10) -> list[dict]:
    """Search Google for blog posts, articles, and review-site roundups.

    Social platforms are excluded so results surface ProductHunt, G2, Capterra,
    TechCrunch, and "best X apps" comparison articles. All queries fire in parallel.
    """
    api_key = os.environ.get("SERPER_API_KEY")
    if not api_key:
        raise RuntimeError("SERPER_API_KEY is not set in .env")
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
    exclusion = "-site:reddit.com -site:linkedin.com -site:twitter.com -site:x.com"
    return _parallel_fetch(queries, exclusion, results_per_query, headers)


def search_twitter(queries: list[str], results_per_query: int = 10) -> list[dict]:
    """Search Twitter/X via Google using site:x.com OR site:twitter.com.

    All queries fire in parallel — wall time is max(single query), not sum.
    """
    api_key = os.environ.get("SERPER_API_KEY")
    if not api_key:
        raise RuntimeError("SERPER_API_KEY is not set in .env")
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
    return _parallel_fetch(queries, PLATFORM_SITES["twitter"], results_per_query, headers)


def fetch_appstore_reviews(app_names: list[str]) -> dict[str, int]:
    """Fetch App Store review counts for each app via the free iTunes Search API.

    Runs all lookups in parallel. Returns a dict mapping app name → review count
    (0 if the app isn't found or the request fails). Review count is used downstream
    to rank competitors — more reviews means more market presence and real user base.
    No API key required; the iTunes Search API is publicly accessible.
    """
    def _fetch_one(name: str) -> tuple[str, int]:
        try:
            response = httpx.get(
                "https://itunes.apple.com/search",
                params={"term": name, "entity": "software", "limit": 5, "country": "us"},
                timeout=5,
            )
            response.raise_for_status()
            results = response.json().get("results", [])
            if results:
                return name, results[0].get("userRatingCount", 0)
            return name, 0
        except Exception:
            # Non-fatal — if App Store lookup fails for any app, score it 0
            return name, 0

    if not app_names:
        return {}

    with ThreadPoolExecutor(max_workers=min(_MAX_WORKERS, len(app_names))) as executor:
        futures = [executor.submit(_fetch_one, name) for name in app_names]
        return dict(f.result() for f in as_completed(futures))


def search_platforms(
    queries_by_platform: dict[str, list[str]],
    results_per_query: int = 5,
) -> dict[str, list[dict]]:
    """Search Reddit, LinkedIn, and Twitter separately, all platforms in parallel.

    Each platform also fires its own queries in parallel via _parallel_fetch,
    so total wall time = max(single Serper request) across all platforms and queries.
    """
    api_key = os.environ.get("SERPER_API_KEY")
    if not api_key:
        raise RuntimeError("SERPER_API_KEY is not set in .env")

    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
    results: dict[str, list[dict]] = {}

    def _fetch_platform(platform: str, queries: list[str]) -> tuple[str, list[dict]]:
        site_prefix = PLATFORM_SITES.get(platform)
        if not site_prefix:
            return platform, []
        posts = _parallel_fetch(
            queries, site_prefix, results_per_query, headers,
            extra_fields={"platform": platform},
        )
        return platform, posts

    with ThreadPoolExecutor(max_workers=len(queries_by_platform)) as executor:
        futures = {
            executor.submit(_fetch_platform, platform, queries): platform
            for platform, queries in queries_by_platform.items()
        }
        for future in as_completed(futures):
            platform, posts = future.result()
            results[platform] = posts

    return results
