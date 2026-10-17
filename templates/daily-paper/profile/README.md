# profile/ (optional)

Drop Zotero exports here to rank papers by similarity to what you already read:

- Zotero → select a collection → right-click → **Export Collection…** → format **CSV** (preferred, keeps "Date Added" for recency weighting) or **BibTeX**.
- Any number of `*.csv` / `*.bib` files is fine. Only titles, abstracts and "Date Added" are used.
- Similarity uses the `EMBEDDING_MODEL` variable when set (OpenAI-compatible `/embeddings`, same key/base URL as the LLM); otherwise a built-in TF-IDF with no extra dependencies.

If this repository is public, these files are public too. Make the repo private if your library should not be visible.
