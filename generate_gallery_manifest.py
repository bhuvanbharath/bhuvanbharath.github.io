"""Generate js/gallery-manifest.json by scanning images/gallery/<album-id> folders."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GALLERY = ROOT / "images" / "gallery"
OUTPUT = ROOT / "js" / "gallery-manifest.json"
ALBUMS = ROOT / "js" / "gallery-albums.json"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}


def humanize(filename: str) -> str:
    return " ".join(filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").split())


def main() -> None:
    with ALBUMS.open("r", encoding="utf-8") as file:
        album_metadata = json.load(file)

    manifest = []
    for album in album_metadata:
        album_id = album["id"]
        folder = GALLERY / album_id
        if not folder.is_dir():
            raise ValueError(f"Album folder not found: {folder}")

        photos = sorted(
            (path for path in folder.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS),
            key=lambda path: path.name.lower()
        )
        if not photos:
            raise ValueError(f"No photos found in album folder: {folder}")

        captions = album.pop("captions", {})
        cover = album.pop("cover", None)
        manifest.append({
            **album,
            "cover": cover or f"images/gallery/{album_id}/{photos[0].name}",
            "photos": [
                {
                    "src": f"images/gallery/{album_id}/{photo.name}",
                    "alt": captions.get(photo.name, f'{album["title"]} — {humanize(photo.name)}'),
                    "caption": captions.get(photo.name, "")
                }
                for photo in photos
            ]
        })

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Generated {OUTPUT.relative_to(ROOT)} with {sum(len(a['photos']) for a in manifest)} photos")


if __name__ == "__main__":
    main()
