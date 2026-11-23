// Configure each album below. Put photos in images/gallery/<id>/.
// id, title, folder and description are album metadata.
// cover is optional (the first photo is used); photos/captions are optional.
const albums = [
    {
        id: "photowalk_blr",
        title: "Photowalk, Bengaluru",
        description: "Moments from a photowalk in Bengaluru",
        folder: "images/gallery/photowalk_blr"
        // cover: "images/gallery/photowalk_blr/BBT02879.jpg",
        // captions: {
        //     "BBT02879.jpg": "Morning in Bengaluru"
        // }
    }
];

const GITHUB_OWNER = "bhuvanbharath";
const GITHUB_REPOSITORY = "bhuvanbharath.github.io";
const GITHUB_BRANCH = "main";
const imageExtensionPattern = /\.(jpe?g|png|webp|gif|avif)$/i;

function filenameLabel(filename) {
    return filename
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

async function discoverAlbumPhotos(album) {
    if (album.photos) {
        return album.photos.map((photo, index) => {
            if (typeof photo === "string") {
                return {
                    src: photo,
                    alt: `${album.title}, photo ${index + 1}`,
                    caption: album.captions?.[photo.split("/").pop()] || ""
                };
            }

            return {
                src: photo.src,
                alt: photo.alt || `${album.title}, photo ${index + 1}`,
                caption: photo.caption || album.captions?.[photo.src.split("/").pop()] || ""
            };
        });
    }

    const folder = album.folder || `images/gallery/${album.id}`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/contents/${folder}?ref=${GITHUB_BRANCH}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
        throw new Error(`Could not read album folder: ${folder}`);
    }

    const entries = await response.json();
    const photos = entries
        .filter((entry) => entry.type === "file" && imageExtensionPattern.test(entry.name))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
        .map((entry) => {
            const label = filenameLabel(entry.name);
            return {
                src: `${folder}/${encodeURI(entry.name)}`,
                alt: `${album.title} — ${label}`,
                caption: album.captions?.[entry.name] || ""
            };
        });

    if (!photos.length) {
        throw new Error(`No photos found in album folder: ${folder}`);
    }

    return photos;
}

async function prepareAlbums() {
    await Promise.all(albums.map(async (album) => {
        try {
            album.photos = await discoverAlbumPhotos(album);
            if (!album.cover) album.cover = album.photos[0].src;
        } catch (error) {
            console.error(error);
            album.photos = [];
            album.cover = album.cover || "";
        }
    }));
}

const albumsView = document.querySelector("#albums-view");
const albumView = document.querySelector("#album-view");
const albumGrid = document.querySelector("#album-grid");
const photoGrid = document.querySelector("#photo-grid");
const albumTitle = document.querySelector("#album-title");
const albumDescription = document.querySelector("#album-description");
const backButton = document.querySelector("#back-button");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");

let currentAlbum = null;
let currentPhotoIndex = 0;

function escapeHash(value) {
    return encodeURIComponent(value);
}

function renderAlbums() {
    albumGrid.replaceChildren();

    if (!albums.length) {
        const empty = document.createElement("p");
        empty.textContent = "Albums will appear here once photos are added.";
        albumGrid.append(empty);
        return;
    }

    albums.forEach((album) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "album-card";
        card.setAttribute("aria-label", `Open ${album.title}`);
        card.innerHTML = `
            <img src="${album.cover}" alt="" loading="lazy">
            <h2>${album.title}</h2>
            <p>${album.photos.length} photos</p>
        `;
        card.addEventListener("click", () => openAlbum(album.id));
        albumGrid.append(card);
    });
}

function openAlbum(albumId, updateHash = true) {
    const album = albums.find((item) => item.id === albumId);
    if (!album) return;

    currentAlbum = album;
    albumTitle.textContent = album.title;
    albumDescription.textContent = album.description || "";
    photoGrid.replaceChildren();

    album.photos.forEach((photo, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "photo-button";
        button.setAttribute("aria-label", photo.alt || `Open photo ${index + 1}`);
        const image = document.createElement("img");
        image.src = photo.src;
        image.alt = photo.alt || "";
        image.loading = "lazy";
        button.append(image);
        button.addEventListener("click", () => openLightbox(index));
        photoGrid.append(button);
    });

    albumsView.hidden = true;
    albumView.hidden = false;
    if (updateHash) history.pushState({ album: album.id }, "", `#${escapeHash(album.id)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showAlbums(updateHash = true) {
    currentAlbum = null;
    albumView.hidden = true;
    albumsView.hidden = false;
    if (updateHash) history.pushState({}, "", location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function openLightbox(index) {
    if (!currentAlbum) return;
    currentPhotoIndex = index;
    showPhoto();
    if (typeof lightbox.showModal === "function") lightbox.showModal();
}

function showPhoto() {
    const photo = currentAlbum.photos[currentPhotoIndex];
    lightboxImage.src = photo.src;
    lightboxImage.alt = photo.alt || "";
    lightboxCaption.textContent = photo.caption || "";
}

backButton.addEventListener("click", () => showAlbums());
document.querySelector("#lightbox-close").addEventListener("click", () => lightbox.close());
document.querySelector("#lightbox-prev").addEventListener("click", () => {
    currentPhotoIndex = (currentPhotoIndex - 1 + currentAlbum.photos.length) % currentAlbum.photos.length;
    showPhoto();
});
document.querySelector("#lightbox-next").addEventListener("click", () => {
    currentPhotoIndex = (currentPhotoIndex + 1) % currentAlbum.photos.length;
    showPhoto();
});

lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
});

document.addEventListener("keydown", (event) => {
    if (!lightbox.open || !currentAlbum) return;
    if (event.key === "ArrowLeft") document.querySelector("#lightbox-prev").click();
    if (event.key === "ArrowRight") document.querySelector("#lightbox-next").click();
});

window.addEventListener("popstate", () => {
    const albumId = decodeURIComponent(location.hash.slice(1));
    if (albumId) openAlbum(albumId, false);
    else showAlbums(false);
});

async function initializeGallery() {
    await prepareAlbums();
    renderAlbums();

    const initialAlbumId = decodeURIComponent(location.hash.slice(1));
    if (initialAlbumId) openAlbum(initialAlbumId, false);
}

initializeGallery().catch(console.error);
