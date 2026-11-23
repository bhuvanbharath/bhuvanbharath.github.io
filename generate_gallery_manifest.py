"""Generate js/gallery-manifest.json by scanning images/gallery/<album-id> folders."""

import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
GALLERY = ROOT / "images" / "gallery"
PREVIEW_ROOT = GALLERY / "_previews"
OUTPUT = ROOT / "js" / "gallery-manifest.json"
ALBUMS = ROOT / "js" / "gallery-albums.json"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
PREVIEW_MAX_WIDTH = 1400
THUMBNAIL_MAX_WIDTH = 700


def humanize(filename: str) -> str:
    return " ".join(filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").split())


def generate_preview(photo_path: Path, output_path: Path, max_width: int) -> None:
    with Image.open(photo_path) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((max_width, max_width), Image.Resampling.LANCZOS)
        image.save(output_path, "WEBP", quality=78, method=6)


def clean_previews(album_metadata: list[dict]) -> None:
    if not PREVIEW_ROOT.exists():
        return

    active_album_ids = {album["id"] for album in album_metadata}
    for child in PREVIEW_ROOT.iterdir():
        if child.is_dir() and child.name not in active_album_ids:
            for stale_file in child.iterdir():
                if stale_file.is_file():
                    stale_file.unlink()
            child.rmdir()


def main() -> None:
    with ALBUMS.open("r", encoding="utf-8") as file:
        album_metadata = json.load(file)

    clean_previews(album_metadata)

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

        preview_folder = PREVIEW_ROOT / album_id
        preview_folder.mkdir(parents=True, exist_ok=True)

        expected_preview_names = {f"{photo.stem}_preview.webp" for photo in photos}
        for stale_file in preview_folder.glob("*_preview.webp"):
            if stale_file.name not in expected_preview_names:
                stale_file.unlink()

        photo_entries = []
        for photo in photos:
            preview_path = preview_folder / f"{photo.stem}_preview.webp"
            generate_preview(photo, preview_path, PREVIEW_MAX_WIDTH)
            photo_entries.append({
                "src": f"images/gallery/{album_id}/{photo.name}",
                "preview": f"images/gallery/_previews/{album_id}/{preview_path.name}",
            })

        captions = album.get("captions", {})
        cover_setting = album.get("cover")
        if cover_setting:
            cover_photo = next((photo for photo in photos if photo.name == Path(cover_setting).name), photos[0])
        else:
            cover_photo = photos[0]

        generate_preview(cover_photo, preview_folder / f"{cover_photo.stem}_cover.webp", THUMBNAIL_MAX_WIDTH)
        cover_name = f"{cover_photo.stem}_cover.webp"
        for stale_cover in preview_folder.glob("*_cover.webp"):
            if stale_cover.name != cover_name:
                stale_cover.unlink()

        manifest.append({
            **album,
            "cover": f"images/gallery/_previews/{album_id}/{cover_photo.stem}_cover.webp",
            "photos": [
                {
                    "src": entry["src"],
                    "preview": entry["preview"],
                    "alt": captions.get(Path(entry["src"]).name, f'{album["title"]} — {humanize(Path(entry["src"]).name)}'),
                    "caption": captions.get(Path(entry["src"]).name, "")
                }
                for entry in photo_entries
            ]
        })

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Generated {OUTPUT.relative_to(ROOT)} with {sum(len(a['photos']) for a in manifest)} photos")


if __name__ == "__main__":
    main()
