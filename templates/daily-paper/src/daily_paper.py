"""Daily paper: pick the single most relevant new arXiv paper and write a structured summary as JSON.

Standard library only. Configuration comes from environment variables (see README).
"""
from __future__ import annotations

import csv
import datetime as dt
import glob
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import asdict, dataclass, field
from typing import Callable, Optional

SUMMARY_FIELDS = (
    "title", "authors", "arxiv_id", "pdf_url", "date", "categories",
    "one_line_contribution", "problem", "method", "key_results", "why_relevant",
    "limitations", "related_anchor", "reading_time_min", "score", "score_reason",
)
LLM_FIELDS = (
    "one_line_contribution", "problem", "method", "key_results", "why_relevant",
    "limitations", "related_anchor", "reading_time_min",
)
UA = "daily-paper-template/1.0 (+https://github.com)"
STOPWORDS = set("""a an the of for and or in on to with by from via is are be as at we our this that these those
into using use based towards toward new can its it their than then which while when where also both such not no
paper propose proposed method methods approach results show shows model models learning""".split())


@dataclass
class Paper:
    arxiv_id: str
    title: str
    abstract: str
    authors: list[str]
    categories: list[str]
    announce_type: str = "new"
    coarse: float = 0.0
    llm_score: Optional[float] = None
    llm_reason: str = ""


@dataclass
class Config:
    keywords: list[tuple[str, float]]
    categories: list[str]
    exclude: list[str]
    model: str
    language: str
    api_key: str
    base_url: str
    embedding_model: str = ""
    top_n: int = 20
    include_cross: bool = False
    out_dir: str = "docs"
    profile_dir: str = "profile"
    extra: dict = field(default_factory=dict)


def _split(s: str) -> list[str]:
    return [x.strip() for x in re.split(r"[,\n;，；]", s or "") if x.strip()]


def parse_keywords(s: str) -> list[tuple[str, float]]:
    out = []
    for item in _split(s):
        name, _, w = item.partition(":")
        try:
            weight = float(w) if w.strip() else 1.0
        except ValueError:
            weight = 1.0
        out.append((name.strip().lower(), weight))
    return out


def load_config(env: dict = os.environ) -> Config:
    return Config(
        keywords=parse_keywords(env.get("KEYWORDS", "")),
        categories=_split(env.get("CATEGORIES", "cs.LG")),
        exclude=[x.lower() for x in _split(env.get("EXCLUDE_KEYWORDS", ""))],
        model=env.get("MODEL_NAME", "").strip(),
        language=env.get("LANGUAGE", "English").strip() or "English",
        api_key=env.get("LLM_API_KEY", "").strip(),
        base_url=(env.get("LLM_BASE_URL", "") or "https://api.openai.com/v1").strip().rstrip("/"),
        embedding_model=env.get("EMBEDDING_MODEL", "").strip(),
        top_n=int(env.get("TOP_N", "20") or 20),
        include_cross=env.get("INCLUDE_CROSS_LIST", "false").strip().lower() == "true",
        out_dir=env.get("OUT_DIR", "docs"),
        profile_dir=env.get("PROFILE_DIR", "profile"),
    )


# ── HTTP ─────────────────────────────────────────────────────────────
def http_get(url: str, timeout: int = 60) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def http_post_json(url: str, payload: dict, api_key: str, timeout: int = 120) -> dict:
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(), method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}", "User-Agent": UA},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def with_retry(fn: Callable, tries: int = 3, wait: float = 5.0):
    for i in range(tries):
        try:
            return fn()
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            if i == tries - 1:
                raise
            print(f"  retry {i + 1}/{tries - 1} after error: {e}", file=sys.stderr)
            time.sleep(wait * (i + 1))


# ── arXiv RSS ────────────────────────────────────────────────────────
NS = {"dc": "http://purl.org/dc/elements/1.1/", "arxiv": "http://arxiv.org/schemas/atom"}


def parse_rss(xml_text: str) -> list[Paper]:
    root = ET.fromstring(xml_text)
    papers = []
    for it in root.iter("item"):
        link = it.findtext("link") or ""
        m = re.search(r"(\d{4}\.\d{4,5})", link)
        if not m:
            continue
        desc = it.findtext("description") or ""
        ann = it.findtext("arxiv:announce_type", default="", namespaces=NS) or ""
        if not ann:
            am = re.search(r"Announce Type:\s*([\w-]+)", desc)
            ann = am.group(1) if am else "new"
        abstract = re.split(r"Abstract:\s*", desc, maxsplit=1)[-1].strip()
        creators = it.findtext("dc:creator", default="", namespaces=NS) or ""
        papers.append(Paper(
            arxiv_id=m.group(1),
            title=re.sub(r"\s+", " ", (it.findtext("title") or "").strip()),
            abstract=re.sub(r"\s+", " ", abstract),
            authors=[a.strip() for a in re.split(r",| and ", creators) if a.strip()],
            categories=[c.text for c in it.findall("category") if c.text],
            announce_type=ann.strip(),
        ))
    return papers


OPENALEX_ARXIV = "S4306400194"


def _arxiv_yymm(arxiv_id: str) -> str:
    return arxiv_id.split(".")[0]


def parse_openalex(json_text: str, min_yymm: str) -> list[Paper]:
    papers = []
    for w in json.loads(json_text).get("results", []):
        loc = (w.get("primary_location") or {}).get("landing_page_url") or ""
        m = re.search(r"(\d{4}\.\d{4,5})", ((w.get("ids") or {}).get("doi") or "") + " " + loc)
        if not m or _arxiv_yymm(m.group(1)) < min_yymm:  # updated versions of older papers are not "new"
            continue
        inv = w.get("abstract_inverted_index") or {}
        words = sorted((pos, word) for word, poss in inv.items() for pos in poss)
        papers.append(Paper(
            arxiv_id=m.group(1),
            title=re.sub(r"\s+", " ", w.get("title") or "").strip(),
            abstract=" ".join(word for _, word in words),
            authors=[(a.get("author") or {}).get("display_name", "") for a in w.get("authorships") or []][:20],
            categories=["arXiv"],
            announce_type="openalex",
        ))
    return papers


def fetch_openalex_recent(cfg: Config, get: Callable[[str], str], now: dt.datetime, days: int = 3) -> list[Paper]:
    if not cfg.keywords:
        return []
    since = (now - dt.timedelta(days=days)).date()
    min_yymm = (since - dt.timedelta(days=7)).strftime("%y%m")  # arXiv ids start with the submission yymm
    search = " OR ".join(f'"{k}"' for k, _ in cfg.keywords)
    url = ("https://api.openalex.org/works?per_page=200"
           f"&filter=primary_location.source.id:{OPENALEX_ARXIV},from_publication_date:{since.isoformat()}"
           f"&search={urllib.parse.quote(search)}"
           "&select=ids,title,publication_date,authorships,abstract_inverted_index,primary_location")
    return parse_openalex(with_retry(lambda: get(url)), min_yymm)


def fetch_candidates(cfg: Config, get: Callable[[str], str] = http_get,
                     now: Optional[dt.datetime] = None) -> list[Paper]:
    seen, out, rss_items = set(), [], 0
    allowed = {"new", "cross"} if cfg.include_cross else {"new"}
    for cat in cfg.categories:
        xml_text = with_retry(lambda: get(f"https://rss.arxiv.org/rss/{cat}"))
        papers = parse_rss(xml_text)
        rss_items += len(papers)
        for p in papers:
            if p.announce_type in allowed and p.arxiv_id not in seen:
                seen.add(p.arxiv_id)
                out.append(p)
    if rss_items == 0:
        # arXiv does not announce on Fri/Sat nights (empty weekend feeds) or holidays. Fall back to OpenAlex
        # (arXiv works of the last 3 days matching KEYWORDS; the arXiv API itself rate-limits shared CI IPs).
        print("RSS feeds are empty (weekend/holiday) -> OpenAlex fallback, last 3 days")
        try:
            out = [p for p in fetch_openalex_recent(cfg, get, now or dt.datetime.now(dt.timezone.utc))
                   if not (p.arxiv_id in seen or seen.add(p.arxiv_id))]
        except Exception as e:  # a fallback outage must not fail the run
            print(f"  fallback unavailable: {e}", file=sys.stderr)
    return out


# ── profile (Zotero export) ──────────────────────────────────────────
def _bib_field(entry: str, name: str) -> str:
    m = re.search(name + r"\s*=\s*[{\"](.+?)[}\"]\s*,?\s*\n", entry, re.S | re.I)
    return re.sub(r"[{}\s]+", " ", m.group(1)).strip() if m else ""


def load_profile(profile_dir: str) -> list[dict]:
    items: list[dict] = []
    for path in sorted(glob.glob(os.path.join(profile_dir, "*.bib"))):
        text = open(path, encoding="utf-8", errors="replace").read()
        for i, entry in enumerate(re.split(r"\n@", "\n" + text)[1:]):
            t = _bib_field(entry, "title")
            if t:
                items.append({"text": t + ". " + _bib_field(entry, "abstract"), "added": "", "order": i})
    for path in sorted(glob.glob(os.path.join(profile_dir, "*.csv"))):
        with open(path, encoding="utf-8-sig", errors="replace") as f:
            for i, row in enumerate(csv.DictReader(f)):
                t = row.get("Title") or row.get("title") or ""
                if t:
                    items.append({"text": t + ". " + (row.get("Abstract Note") or row.get("abstract") or ""),
                                  "added": row.get("Date Added") or "", "order": i})
    return sorted(items, key=lambda x: (x["added"], x["order"]), reverse=True)


def time_decay(n: int) -> list[float]:
    w = [1 / (1 + math.log10(i + 1)) for i in range(n)]
    s = sum(w) or 1.0
    return [x / s for x in w]


def tokenize(s: str) -> list[str]:
    return [w for w in re.findall(r"[a-z][a-z0-9\-]+", s.lower()) if w not in STOPWORDS and len(w) > 2]


def tfidf_similarity(cands: list[str], corpus: list[str]) -> list[list[float]]:
    docs = [Counter(tokenize(d)) for d in cands + corpus]
    df = Counter(w for d in docs for w in d)
    n = len(docs)

    def vec(c: Counter) -> dict:
        v = {w: tf * math.log((1 + n) / (1 + df[w])) for w, tf in c.items()}
        norm = math.sqrt(sum(x * x for x in v.values())) or 1.0
        return {w: x / norm for w, x in v.items()}

    vs = [vec(d) for d in docs]
    cv, pv = vs[: len(cands)], vs[len(cands):]
    return [[sum(a[w] * b.get(w, 0.0) for w in a) for b in pv] for a in cv]


def embedding_similarity(cands: list[str], corpus: list[str], cfg: Config) -> list[list[float]]:
    def embed(texts: list[str]) -> list[list[float]]:
        out = []
        for i in range(0, len(texts), 64):
            r = with_retry(lambda: http_post_json(f"{cfg.base_url}/embeddings",
                                                  {"model": cfg.embedding_model, "input": texts[i:i + 64]}, cfg.api_key))
            out += [d["embedding"] for d in sorted(r["data"], key=lambda d: d["index"])]
        return out

    def unit(v: list[float]) -> list[float]:
        n = math.sqrt(sum(x * x for x in v)) or 1.0
        return [x / n for x in v]

    ce, pe = [unit(v) for v in embed(cands)], [unit(v) for v in embed(corpus)]
    return [[sum(x * y for x, y in zip(a, b)) for b in pe] for a in ce]


# ── coarse ranking ───────────────────────────────────────────────────
def keyword_score(p: Paper, keywords: list[tuple[str, float]]) -> float:
    title, abstract = p.title.lower(), p.abstract.lower()
    return sum(w * (2.0 if k in title else 1.0 if k in abstract else 0.0) for k, w in keywords)


def is_excluded(p: Paper, exclude: list[str]) -> bool:
    text = (p.title + " " + p.abstract).lower()
    return any(x in text for x in exclude)


def _normalize(xs: list[float]) -> list[float]:
    hi = max(xs) if xs else 0.0
    return [x / hi if hi > 0 else 0.0 for x in xs]


def coarse_rank(papers: list[Paper], cfg: Config, profile: list[dict]) -> list[Paper]:
    kw = _normalize([keyword_score(p, cfg.keywords) for p in papers])
    if profile:
        texts = [p.title + ". " + p.abstract for p in papers]
        corpus = [x["text"] for x in profile[:300]]
        sim = embedding_similarity(texts, corpus, cfg) if cfg.embedding_model else tfidf_similarity(texts, corpus)
        print(f"  profile similarity via {'embedding:' + cfg.embedding_model if cfg.embedding_model else 'TF-IDF'}"
              f" over {len(corpus)} profile items")
        w = time_decay(len(corpus))
        prof = _normalize([sum(s * wi for s, wi in zip(row, w)) for row in sim])
        mix = 0.5 if cfg.keywords else 0.0
        scores = [mix * a + (1 - mix) * b for a, b in zip(kw, prof)]
    else:
        scores = kw
    for p, s in zip(papers, scores):
        p.coarse = round(s, 4)
    return sorted(papers, key=lambda p: p.coarse, reverse=True)


# ── LLM ──────────────────────────────────────────────────────────────
def interests_text(cfg: Config) -> str:
    kws = ", ".join(f"{k} (weight {w:g})" for k, w in cfg.keywords) or "(none given)"
    exc = ", ".join(cfg.exclude) or "(none)"
    return f"Research keywords: {kws}\nNot interested in: {exc}"


def rerank_prompt(papers: list[Paper], cfg: Config) -> str:
    lines = [f"{i + 1}. Title: {p.title}\n   Abstract: {p.abstract[:1500]}" for i, p in enumerate(papers)]
    return (
        "You are screening new arXiv papers for one researcher. Score each paper's relevance to the researcher's "
        "interests from 1 to 10 using ONLY title and abstract. 9-10: directly on a stated keyword with a concrete "
        "contribution; 7-8: clearly relevant; 4-6: tangential; 1-3: unrelated or matches an excluded topic.\n"
        "Keep the input order. Output exactly one line per paper in this format and nothing else "
        "(no code fences):\n"
        '1. {"score": 7, "reason": "one sentence"}\n\n'
        f"{interests_text(cfg)}\n\nPapers:\n" + "\n".join(lines)
    )


def summary_prompt(p: Paper, cfg: Config, fulltext: str) -> str:
    schema = {
        "one_line_contribution": "one sentence, what is new",
        "problem": "<=2 sentences",
        "method": "<=3 sentences",
        "key_results": "<=3 sentences, MUST include concrete numbers copied from the text (dataset, metric, value)",
        "why_relevant": "<=2 sentences, refer explicitly to which of the researcher's keywords it matches",
        "limitations": "<=2 sentences; if the paper states none, give the most evident one and say it is inferred",
        "related_anchor": "which known line of work it is closest to and how it differs, 1 sentence",
        "reading_time_min": "integer minutes for a careful read",
    }
    return (
        f"Summarize this arXiv paper for a busy PhD student. Write all values in {cfg.language}; keep technical "
        "terms and method names in English. Never invent numbers: only use numbers present in the text below; if "
        "none are present, say so in key_results.\n"
        "Return ONE JSON object with exactly these keys and no code fences:\n"
        f"{json.dumps(schema, ensure_ascii=False, indent=1)}\n\n"
        f"{interests_text(cfg)}\n\nTitle: {p.title}\nAbstract: {p.abstract}\n\n"
        f"Body excerpt (may be empty):\n{fulltext[:6000]}"
    )


def chat(prompt: str, cfg: Config, max_tokens: int = 4096) -> str:
    r = with_retry(lambda: http_post_json(f"{cfg.base_url}/chat/completions", {
        "model": cfg.model, "temperature": 0.2, "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }, cfg.api_key))
    choice = r["choices"][0]
    if choice.get("finish_reason") == "length":
        print(f"  warning: LLM output hit max_tokens={max_tokens} (reasoning models spend tokens on thinking)", file=sys.stderr)
    return choice["message"].get("content") or ""


def parse_scores(text: str, n: int) -> list[Optional[tuple[float, str]]]:
    out: list[Optional[tuple[float, str]]] = [None] * n
    for m in re.finditer(r"(?m)^\s*(\d+)[.)]\s*(\{.*?\})\s*$", text):
        idx = int(m.group(1)) - 1
        try:
            obj = json.loads(m.group(2))
            if 0 <= idx < n:
                out[idx] = (float(obj.get("score", 0)), str(obj.get("reason", "")))
        except (json.JSONDecodeError, ValueError, TypeError):
            continue
    return out


def parse_json_object(text: str) -> Optional[dict]:
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        obj = json.loads(m.group(0))
        return obj if isinstance(obj, dict) else None
    except json.JSONDecodeError:
        return None


def llm_rerank(cands: list[Paper], cfg: Config, ask: Callable[[str], str]) -> list[Paper]:
    try:
        parsed = parse_scores(ask(rerank_prompt(cands, cfg)), len(cands))
    except Exception as e:  # LLM outage must not kill the run: fall back to coarse order
        print(f"  LLM rerank failed, falling back to coarse ranking: {e}", file=sys.stderr)
        parsed = [None] * len(cands)
    for p, r in zip(cands, parsed):
        if r:
            p.llm_score, p.llm_reason = r
    return sorted(cands, key=lambda p: (p.llm_score if p.llm_score is not None else -1, p.coarse), reverse=True)


def fetch_fulltext(arxiv_id: str, get: Callable[[str], str] = http_get) -> str:
    try:
        html = get(f"https://arxiv.org/html/{arxiv_id}")
    except Exception:
        return ""
    html = re.sub(r"(?is)<(script|style|math|nav|header|footer)[^>]*>.*?</\1>", " ", html)
    text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))
    i = text.lower().find("introduction")
    return text[i:] if i > 0 else text


def summarize(p: Paper, cfg: Config, ask: Callable[[str], str], fulltext: str) -> dict:
    obj: Optional[dict] = None
    for attempt in range(2):
        raw = ""
        try:
            raw = ask(summary_prompt(p, cfg, fulltext))
            obj = parse_json_object(raw)
        except Exception as e:
            print(f"  summary call failed: {e}", file=sys.stderr)
        if obj and all(k in obj for k in LLM_FIELDS):
            break
        print(f"  summary attempt {attempt + 1} unusable; response starts with: {raw[:300]!r}", file=sys.stderr)
    obj = obj or {}
    missing = [k for k in LLM_FIELDS if not obj.get(k)]
    words = len((p.abstract + " " + fulltext).split())
    rec = {
        "title": p.title,
        "authors": p.authors,
        "arxiv_id": p.arxiv_id,
        "pdf_url": f"https://arxiv.org/pdf/{p.arxiv_id}",
        "date": "",
        "categories": p.categories,
        **{k: str(obj.get(k, "") or "") for k in LLM_FIELDS if k != "reading_time_min"},
        "reading_time_min": int(obj.get("reading_time_min") or max(10, round(words / 200))),
        "score": round(p.llm_score if p.llm_score is not None else p.coarse * 10, 1),
        "score_reason": p.llm_reason or "coarse ranking only (LLM score unavailable)",
    }
    if missing:
        rec["score_reason"] += f" | summary fields missing: {', '.join(missing)}"
    return rec


# ── output ───────────────────────────────────────────────────────────
def read_json(path: str, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def write_json(path: str, obj) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def run(cfg: Config, today: str, get: Callable[[str], str] = http_get,
        ask: Optional[Callable[[str], str]] = None) -> dict:
    ask = ask or (lambda prompt: chat(prompt, cfg))
    index = read_json(os.path.join(cfg.out_dir, "index.json"), [])
    history = {x["arxiv_id"] for x in index}
    status = {"last_run": today, "generated_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}

    now = dt.datetime.fromisoformat(today + "T23:59:59+00:00")
    cands = [p for p in fetch_candidates(cfg, get, now) if p.arxiv_id not in history and not is_excluded(p, cfg.exclude)]
    print(f"{len(cands)} new candidate papers after dedup/exclusion")
    if not cands:
        status.update(status="no_new_papers", message="no new arXiv papers for these categories (all recent ones already recommended)")
        write_json(os.path.join(cfg.out_dir, "status.json"), status)
        return status

    ranked = coarse_rank(cands, cfg, load_profile(cfg.profile_dir))
    top = llm_rerank(ranked[: cfg.top_n], cfg, ask)
    best = top[0]
    print(f"picked {best.arxiv_id}: {best.title} (llm={best.llm_score}, coarse={best.coarse})")
    rec = summarize(best, cfg, ask, fetch_fulltext(best.arxiv_id, get))
    rec["date"] = today

    write_json(os.path.join(cfg.out_dir, "daily", f"{today}.json"), rec)
    write_json(os.path.join(cfg.out_dir, "latest.json"), rec)
    index = [x for x in index if x["date"] != today]
    index.insert(0, {"date": today, "title": rec["title"], "arxiv_id": rec["arxiv_id"], "score": rec["score"]})
    write_json(os.path.join(cfg.out_dir, "index.json"), index)
    status.update(status="ok", message=rec["arxiv_id"])
    write_json(os.path.join(cfg.out_dir, "status.json"), status)
    return status


def main() -> int:
    cfg = load_config()
    if not cfg.api_key or not cfg.model:
        print("LLM_API_KEY secret and MODEL_NAME variable are required", file=sys.stderr)
        return 1
    today = os.environ.get("RUN_DATE") or dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    print(json.dumps(run(cfg, today), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
