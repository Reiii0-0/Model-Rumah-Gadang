#!/usr/bin/env python3
"""Download only Wikimedia Commons files whose declared reuse license is recorded."""
import hashlib
import html
import json
import pathlib
import re
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
FILES = [
    ("pdikm-official.jpg", "Rumah Gadang Minangkabau PDIKM, Padang Panjang.jpg"),
    ("pdikm-center.jpg", "Minangkabau Center.JPG"),
    ("pdikm-view-2.jpg", "Pdikm padangpanjang 2.jpg"),
    ("pdikm-view-3.jpg", "Pdikm padangpanjang 3.jpg"),
    ("pdikm-carving.jpg", "Rumitnya Ukiran Minang.jpg"),
    ("pdikm-interior.jpg", "Inside the PDIKM.JPG"),
]


def get(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "RumahGadangStudentProject/1.0 (educational reference collection)"
        },
    )
    return urllib.request.urlopen(request, timeout=60).read()


def clean(value: str) -> str:
    return html.unescape(re.sub("<[^>]+>", "", value))


def main() -> None:
    records = []
    photos_dir = ROOT / "references/photos"
    photos_dir.mkdir(parents=True, exist_ok=True)

    for local, title in FILES:
        query = urllib.parse.urlencode(
            dict(
                action="query",
                format="json",
                prop="imageinfo",
                iiprop="url|extmetadata",
                titles="File:" + title,
            )
        )
        response = json.loads(get("https://commons.wikimedia.org/w/api.php?" + query))
        page = next(iter(response["query"]["pages"].values()))
        if "imageinfo" not in page:
            print("MISSING", title)
            continue

        info = page["imageinfo"][0]
        meta = {k: clean(str(v["value"])) for k, v in info["extmetadata"].items()}
        license_name = meta.get("LicenseShortName", "")
        if not any(x in license_name for x in ["CC BY", "CC0", "Public domain"]):
            print("LICENSE NOT ACCEPTED", title, license_name)
            continue

        target = photos_dir / local
        try:
            data = target.read_bytes() if target.exists() else get(info["url"].split("?")[0])
        except Exception as error:
            print("DOWNLOAD FAILED", title, str(error))
            continue

        target.write_bytes(data)
        records.append(
            dict(
                file=local,
                title=title,
                page=info["descriptionurl"],
                original=info["url"],
                metadata=meta,
                accessed="2026-11-03",
                sha256=hashlib.sha256(data).hexdigest(),
            )
        )
        print(local, len(data), license_name, meta.get("Artist"))

    (ROOT / "references/metadata.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
