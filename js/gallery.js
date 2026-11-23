// Configure each album below. Put photos in images/gallery/<id>/.
// id, title, folder and description are album metadata.
// cover is optional (the first photo is used); photos/captions are optional.
let albums = [];

async function prepareAlbums() {
    const response = await fetch("js/gallery-manifest.json", { cache: "no-store" });
    if (!response.ok) {
        throw new Error("Gallery manifest not found. Run generate_gallery_manifest.py.");
    }

    const manifest = await response.json();
    if (!Array.isArray(manifest)) {
        throw new Error("Gallery manifest must contain an album array.");
    }

    albums = manifest.filter((album) => {
        if (!album || typeof album.id !== "string" || typeof album.title !== "string") return false;

        const isSafePhotoPath = (photo) =>
            typeof photo?.src === "string" &&
            /^images\/gallery\/([_a-zA-Z0-9-]+\/)?[^<>"\\]+$/i.test(photo.src);

        const isSafePreviewPath = (src) =>
            typeof src === "string" &&
            /^images\/gallery\/_previews\/[_a-zA-Z0-9-]+\/[^<>"\\]+$/i.test(src);

        if (!isSafePhotoPath({ src: album.cover }) && !isSafePreviewPath(album.cover)) return false;
        if (!Array.isArray(album.photos) || !album.photos.every((photo) =>
            isSafePhotoPath(photo) && isSafePreviewPath(photo.preview))) return false;

        album.description = typeof album.description === "string" ? album.description : "";
        album.photos = album.photos.map((photo, index) => ({
            src: photo.src,
            preview: photo.preview,
            alt: typeof photo.alt === "string" ? photo.alt : `${album.title}, photo ${index + 1}`,
            caption: typeof photo.caption === "string" ? photo.caption : ""
        }));

        return true;
    });
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

        const image = document.createElement("img");
        image.src = album.cover;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";

        const title = document.createElement("h2");
        title.textContent = album.title;

        const count = document.createElement("p");
        count.textContent = `${album.photos.length} photos`;

        card.append(image, title, count);
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
        image.src = photo.preview;
        image.alt = photo.alt || "";
        image.loading = "lazy";
        image.decoding = "async";
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
    lightboxImage.decoding = "async";
    lightboxCaption.textContent = photo.caption || "";

    [-1, 1].forEach((offset) => {
        const index = (currentPhotoIndex + offset + currentAlbum.photos.length) % currentAlbum.photos.length;
        const preload = new Image();
        preload.src = currentAlbum.photos[index].src;
    });
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
    if (event.key === "PrintScreen" ||
        ((event.ctrlKey || event.metaKey) && ["s", "u", "p"].includes(event.key.toLowerCase()))) {
        event.preventDefault();
    }

    if (!lightbox.open || !currentAlbum) return;
    if (event.key === "ArrowLeft") document.querySelector("#lightbox-prev").click();
    if (event.key === "ArrowRight") document.querySelector("#lightbox-next").click();
});

document.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".album-card, .photo-button, .lightbox")) {
        event.preventDefault();
    }
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
