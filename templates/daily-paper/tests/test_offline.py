"""Offline end-to-end test: fixture RSS + fake LLM, no network. Run: python -m unittest discover -s tests"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "src"))
import daily_paper as dp  # noqa: E402

FIXTURE = open(os.path.join(HERE, "fixtures", "rss_sample.xml"), encoding="utf-8").read()


def fake_get(url: str) -> str:
    if "rss.arxiv.org" in url:
        return FIXTURE
    raise OSError("offline")


def fake_ask(prompt: str) -> str:
    if "Score each paper" in prompt:
        n = prompt.count("   Abstract:")
        return "\n".join(f'{i + 1}. {{"score": {9 if i == 1 else 3}, "reason": "placeholder reason {i + 1}"}}'
                         for i in range(n))
    return json.dumps({
        "one_line_contribution": "Placeholder contribution.",
        "problem": "Placeholder problem.",
        "method": "Placeholder method.",
        "key_results": "Improves accuracy from 70.1% to 75.3% on Dataset X.",
        "why_relevant": "Matches your-keyword.",
        "limitations": "Placeholder limitation.",
        "related_anchor": "Closest to Line of Work Y.",
        "reading_time_min": 25,
    })


class OfflineRun(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.cfg = dp.load_config({
            "KEYWORDS": "your-keyword:2, another topic", "CATEGORIES": "cs.LG",
            "EXCLUDE_KEYWORDS": "excluded-topic", "MODEL_NAME": "fake", "LLM_API_KEY": "x",
            "OUT_DIR": os.path.join(self.tmp, "docs"), "PROFILE_DIR": os.path.join(HERE, "fixtures", "profile"),
        })

    def test_pipeline_schema_dedup_and_no_new(self):
        st = dp.run(self.cfg, "2026-01-05", fake_get, fake_ask)
        self.assertEqual(st["status"], "ok")
        latest = json.load(open(os.path.join(self.cfg.out_dir, "latest.json")))
        self.assertEqual(set(latest), set(dp.SUMMARY_FIELDS))
        self.assertEqual(latest["arxiv_id"], "2601.00002")          # LLM rank 1 wins over coarse order
        self.assertEqual(latest["score"], 9.0)
        self.assertEqual(latest["date"], "2026-01-05")
        self.assertTrue(os.path.exists(os.path.join(self.cfg.out_dir, "daily", "2026-01-05.json")))

        dp.run(self.cfg, "2026-01-06", fake_get, fake_ask)        # same feed next day → must pick a different paper
        index = json.load(open(os.path.join(self.cfg.out_dir, "index.json")))
        self.assertEqual([x["date"] for x in index], ["2026-01-06", "2026-01-05"])
        self.assertNotEqual(index[0]["arxiv_id"], index[1]["arxiv_id"])
        self.assertNotIn("2601.00004", [x["arxiv_id"] for x in index])  # excluded keyword never picked

        dp.run(self.cfg, "2026-01-07", fake_get, fake_ask)
        st = dp.run(self.cfg, "2026-01-08", fake_get, fake_ask)   # feed exhausted → no_new_papers, latest untouched
        self.assertEqual(st["status"], "no_new_papers")
        self.assertEqual(json.load(open(os.path.join(self.cfg.out_dir, "latest.json")))["date"], "2026-01-07")

    def test_llm_outage_falls_back_to_coarse(self):
        def broken(prompt):
            raise OSError("down")
        st = dp.run(self.cfg, "2026-01-05", fake_get, broken)
        self.assertEqual(st["status"], "ok")
        latest = json.load(open(os.path.join(self.cfg.out_dir, "latest.json")))
        self.assertIn("coarse ranking only", latest["score_reason"])
        self.assertIn("summary fields missing", latest["score_reason"])

    def test_empty_rss_falls_back_to_openalex(self):
        oa = open(os.path.join(HERE, "fixtures", "openalex_sample.json"), encoding="utf-8").read()
        empty = '<?xml version="1.0"?><rss version="2.0"><channel><title>empty</title></channel></rss>'
        urls = []

        def weekend_get(url):
            urls.append(url)
            return empty if "rss.arxiv.org" in url else oa

        st = dp.run(self.cfg, "2026-01-10", weekend_get, fake_ask)
        self.assertEqual(st["status"], "ok")
        oa_url = next(u for u in urls if "api.openalex.org" in u)
        self.assertIn("from_publication_date:2026-01-07", oa_url)
        self.assertIn(dp.urllib.parse.quote('"your-keyword" OR "another topic"'), oa_url)
        cands = dp.fetch_candidates(self.cfg, weekend_get, dp.dt.datetime(2026, 1, 10, 23, 59, tzinfo=dp.dt.timezone.utc))
        self.assertEqual(sorted(p.arxiv_id for p in cands), ["2601.00011", "2601.00012"])  # old-id new version dropped
        self.assertEqual(next(p for p in cands if p.arxiv_id == "2601.00011").abstract,
                         "We revisit your-keyword; accuracy rises from 61.0% to 66.4%.")

    def test_fallback_outage_is_not_fatal(self):
        empty = '<?xml version="1.0"?><rss version="2.0"><channel><title>empty</title></channel></rss>'

        def down(url):
            if "rss.arxiv.org" in url:
                return empty
            raise dp.urllib.error.URLError("down")

        orig = dp.time.sleep
        dp.time.sleep = lambda s: None
        self.addCleanup(setattr, dp.time, "sleep", orig)
        st = dp.run(self.cfg, "2026-01-10", down, fake_ask)
        self.assertEqual(st["status"], "no_new_papers")

    def test_keyword_weights_and_cross_list(self):
        self.assertEqual(dp.parse_keywords("a:2, b"), [("a", 2.0), ("b", 1.0)])
        papers = dp.parse_rss(FIXTURE)
        self.assertIn("cross", {p.announce_type for p in papers})
        self.assertNotIn("2601.00005", [p.arxiv_id for p in dp.fetch_candidates(self.cfg, fake_get)])

    def test_time_decay_prefers_recent(self):
        w = dp.time_decay(5)
        self.assertAlmostEqual(sum(w), 1.0)
        self.assertTrue(all(a > b for a, b in zip(w, w[1:])))


if __name__ == "__main__":
    unittest.main()
