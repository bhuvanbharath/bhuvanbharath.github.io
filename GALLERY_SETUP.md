# Gallery setup

The gallery automatically reads image files from an album folder when the site is deployed to GitHub Pages.

## Automatic album

1. Create a folder under `images/gallery/` using the album ID, for example:

```text
images/gallery/photowalk-blr/
```

2. Add JPG, JPEG, PNG, WebP, GIF, or AVIF photos to that folder. Do not rename or list them in JavaScript.

3. Add album metadata to `js/gallery.js`:

```js
{
    id: "photowalk-blr",
    title: "Photowalk, Bengaluru",
    description: "Moments from a photowalk in Bengaluru"
}
```

That setup automatically:

- Reads every supported image in `images/gallery/photowalk-blr/`
- Uses the first photo as the album cover
- Preserves each photo's natural aspect ratio
- Generates a photo number as fallback text
- Sorts filenames naturally

## Optional settings

Use a custom folder name:

```js
{
    id: "blr",
    title: "Photowalk",
    description: "Bengaluru streets",
    folder: "images/gallery/photowalk-blr"
}
```

Choose a specific cover:

```js
{
    id: "blr",
    title: "Photowalk",
    description: "Bengaluru streets",
    cover: "images/gallery/blr/selected-cover.jpg"
}
```

Add captions only for the photos that need them:

```js
{
    id: "blr",
    title: "Photowalk",
    description: "Bengaluru streets",
    captions: {
        "BBT02879.jpg": "Morning in Bengaluru",
        "BBT02934-2.jpg": "People and light"
    }
}
```

Photos without an entry in `captions` have no visible caption.

## Publishing

Commit and push the album folder plus the updated `js/gallery.js`. GitHub Pages then reads the folder contents through the GitHub API. This automatic discovery does not work from a closed/non-public GitHub repository unless the API access is changed.
