"""Download all GESP Python exam PDFs from the official website."""

import json
import logging
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup, Tag

BASE_URL = "https://gesp.ccf.org.cn"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
OUTPUT_DIR = Path(__file__).parent / "pdfs"
RATE_LIMIT_SECONDS = 1

SESSIONS = [
    {"session": "2026-03", "url": "https://gesp.ccf.org.cn/101/1010/10269.html", "python_levels": [1, 2, 3, 4, 5, 6]},
    {"session": "2025-12", "url": "https://gesp.ccf.org.cn/101/1010/10242.html", "python_levels": [1, 2, 3, 4, 5, 6, 7]},
    {"session": "2025-09", "url": "https://gesp.ccf.org.cn/101/1010/10229.html", "python_levels": [1, 2, 3, 4, 5, 6]},
    {"session": "2025-06", "url": "https://gesp.ccf.org.cn/101/1010/10217.html", "python_levels": [1, 2, 3, 4, 5, 6]},
    {"session": "2025-03", "url": "https://gesp.ccf.org.cn/101/1010/10200.html", "python_levels": [1, 2, 3, 4, 5, 6, 7]},
    {"session": "2024-12", "url": "https://gesp.ccf.org.cn/101/1010/10178.html", "python_levels": [1, 2, 3, 4, 5, 6]},
    {"session": "2024-09", "url": "https://gesp.ccf.org.cn/101/1010/10166.html", "python_levels": [1, 2, 3, 4, 5, 6]},
    {"session": "2024-06", "url": "https://gesp.ccf.org.cn/101/1010/10147.html", "python_levels": [1, 2, 3, 4, 5]},
    {"session": "2024-03", "url": "https://gesp.ccf.org.cn/101/1010/10134.html", "python_levels": [1, 2, 3, 4, 5, 6]},
    {"session": "2023-12", "url": "https://gesp.ccf.org.cn/101/1010/10119.html", "python_levels": [1, 2, 3, 4]},
    {"session": "2023-09", "url": "https://gesp.ccf.org.cn/101/1010/10105.html", "python_levels": [1, 2, 3, 4]},
    {"session": "2023-06", "url": "https://gesp.ccf.org.cn/101/1010/10098.html", "python_levels": [1, 2, 3, 4]},
    {"session": "2023-03", "url": "https://gesp.ccf.org.cn/101/1010/10086.html", "python_levels": [1, 2, 3, 4]},
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def find_pdf_link(soup: BeautifulSoup, level: int) -> str | None:
    """Find the PDF download link for a given Python level from the page."""
    for a_tag in soup.find_all("a", href=True):
        if not isinstance(a_tag, Tag):
            continue
        text = a_tag.get_text(strip=True)
        href = str(a_tag.get("href", ""))
        if re.search(r"Python", text, re.IGNORECASE) and re.search(rf"\b{level}\b", text):
            if ".pdf" in href.lower():
                return href
    return None


def download_pdf(url: str, dest: Path) -> bool:
    """Download a PDF from url to dest. Returns True on success."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        log.info("Downloaded %s -> %s", url, dest)
        return True
    except requests.RequestException as e:
        log.warning("Failed to download %s: %s", url, e)
        return False


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: list[dict] = []

    for session_info in SESSIONS:
        session = session_info["session"]
        page_url = session_info["url"]
        python_levels = session_info["python_levels"]

        session_dir = OUTPUT_DIR / session
        session_dir.mkdir(parents=True, exist_ok=True)

        log.info("Fetching session page: %s (%s)", session, page_url)
        try:
            resp = requests.get(page_url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
        except requests.RequestException as e:
            log.warning("Failed to fetch page %s: %s", page_url, e)
            for level in python_levels:
                manifest.append({
                    "session": session,
                    "level": level,
                    "filename": f"level-{level}.pdf",
                    "url": "",
                    "downloaded": False,
                    "error": f"page fetch failed: {e}",
                })
            time.sleep(RATE_LIMIT_SECONDS)
            continue

        for level in python_levels:
            filename = f"level-{level}.pdf"
            dest = session_dir / filename

            if dest.exists() and dest.stat().st_size > 0:
                log.info("Already exists, skipping: %s", dest)
                manifest.append({
                    "session": session,
                    "level": level,
                    "filename": filename,
                    "url": "",
                    "downloaded": True,
                    "skipped": True,
                })
                continue

            pdf_href = find_pdf_link(soup, level)
            if pdf_href is None:
                log.warning("No PDF link found for %s level %d", session, level)
                manifest.append({
                    "session": session,
                    "level": level,
                    "filename": filename,
                    "url": "",
                    "downloaded": False,
                    "error": "no PDF link found on page",
                })
                continue

            pdf_url = pdf_href if pdf_href.startswith("http") else BASE_URL + pdf_href
            success = download_pdf(pdf_url, dest)
            manifest.append({
                "session": session,
                "level": level,
                "filename": filename,
                "url": pdf_url,
                "downloaded": success,
            })
            time.sleep(RATE_LIMIT_SECONDS)

        time.sleep(RATE_LIMIT_SECONDS)

    manifest_path = OUTPUT_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    log.info("Manifest written to %s (%d entries)", manifest_path, len(manifest))

    downloaded = sum(1 for e in manifest if e["downloaded"])
    total = len(manifest)
    log.info("Done: %d/%d PDFs downloaded", downloaded, total)


if __name__ == "__main__":
    main()
