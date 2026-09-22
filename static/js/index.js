/* Clean academic project-page template.
   Add project media only in the configuration blocks below. */

/* Example:
var qualitativeVideos = [
    { src: "static/videos/qualitative/example.mp4", caption: "Example result" }
];
*/
var qualitativeVideos = [];

/* Add one entry per application section already declared in index.html. */
var applicationSections = [
    { id: "application-1", dir: "static/videos/applications/application-1/", videos: [] },
    { id: "application-2", dir: "static/videos/applications/application-2/", videos: [] }
];

/* Example:
var comparisonMethodOrder = [
    { key: "gt", label: "Ground Truth", isOurs: false },
    { key: "ours", label: "Ours", isOurs: true }
];
var comparisonDirs = {
    gt: "static/videos/comparisons/ground-truth/",
    ours: "static/videos/comparisons/ours/"
};
var comparisonScenes = ["scene_01"];
*/
var comparisonMethodOrder = [];
var comparisonDirs = {};
var comparisonScenes = [];
var comparisonPathOverrides = {};

function emptyState(message) {
    var el = document.createElement("div");
    el.className = "empty-state";
    el.textContent = message;
    return el;
}

function stripExtension(filename) {
    return filename.replace(/\.[^.]+$/i, "");
}

function createVideoElement(src) {
    var video = document.createElement("video");
    video.dataset.src = src;
    video.muted = true;
    video.setAttribute("muted", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "metadata");
    return video;
}

function createVideoCard(src, caption) {
    var card = document.createElement("div");
    card.className = "video-card";
    card.appendChild(createVideoElement(src));

    var label = document.createElement("p");
    label.className = "video-caption";
    label.textContent = caption || stripExtension(src.split("/").pop());
    card.appendChild(label);
    return card;
}

function renderQualitative() {
    var grid = document.getElementById("qualitative-grid");
    if (!grid) { return; }
    if (!qualitativeVideos.length) {
        grid.appendChild(emptyState("Qualitative videos will appear here."));
        return;
    }
    qualitativeVideos.forEach(function (item) {
        var src = typeof item === "string" ? item : item.src;
        var caption = typeof item === "string" ? stripExtension(item.split("/").pop()) : item.caption;
        grid.appendChild(createVideoCard(src, caption));
    });
}

function appCarouselPerPage() {
    return window.matchMedia && window.matchMedia("(max-width: 600px)").matches ? 1 : 2;
}

function createAppSlide(dir, item) {
    var filename = typeof item === "string" ? item : item.file;
    var caption = typeof item === "string" ? stripExtension(item) : item.caption;
    var slide = document.createElement("div");
    slide.className = "carousel-slide";
    slide.appendChild(createVideoCard(dir + filename, caption));
    return slide;
}

function appPageCount(root) {
    return Math.max(1, Math.ceil(root._videos.length / appCarouselPerPage()));
}

function activateAppVideos(root, start, end) {
    Array.prototype.forEach.call(root.querySelectorAll(".carousel-slide"), function (slide, i) {
        var video = slide.querySelector("video");
        if (!video) { return; }
        if (i >= start && i < end) {
            if (!video.getAttribute("src") && video.dataset.src) {
                video.src = video.dataset.src;
                video.load();
            }
            var playPromise = video.play();
            if (playPromise && typeof playPromise.catch === "function") {
                playPromise.catch(function () {});
            }
        } else {
            video.pause();
        }
    });
}

function renderAppDots(root) {
    var dots = root.querySelector(".carousel-dots");
    if (!dots) { return; }
    dots.innerHTML = "";
    var pages = appPageCount(root);
    if (!root._videos.length || pages <= 1) { return; }
    for (var i = 0; i < pages; i++) {
        var dot = document.createElement("button");
        dot.className = "carousel-dot" + (i === root._pageIndex ? " active" : "");
        dot.type = "button";
        dot.setAttribute("aria-label", "Go to page " + (i + 1));
        (function (pageIndex) {
            dot.addEventListener("click", function () {
                root._pageIndex = pageIndex;
                layoutAppCarousel(root);
            });
        })(i);
        dots.appendChild(dot);
    }
}

function layoutAppCarousel(root) {
    if (!root._videos.length) { return; }
    var perPage = appCarouselPerPage();
    var pages = appPageCount(root);
    root._pageIndex = Math.min(root._pageIndex, pages - 1);
    var track = root.querySelector(".carousel-track");
    track.style.transform = "translateX(-" + (root._pageIndex * 100) + "%)";
    Array.prototype.forEach.call(track.children, function (slide) {
        slide.style.flexBasis = (100 / perPage) + "%";
    });
    var start = root._pageIndex * perPage;
    activateAppVideos(root, start, Math.min(start + perPage, root._videos.length));
    renderAppDots(root);
}

function buildAppCarousels() {
    applicationSections.forEach(function (section) {
        var root = document.getElementById("carousel-" + section.id);
        if (!root) { return; }
        var track = root.querySelector(".carousel-track");
        root._videos = section.videos.slice();
        root._pageIndex = 0;

        if (!root._videos.length) {
            track.appendChild(emptyState("Application videos will appear here."));
            root.classList.add("is-empty");
            return;
        }

        root._videos.forEach(function (item) {
            track.appendChild(createAppSlide(section.dir, item));
        });

        root.querySelector(".carousel-prev").addEventListener("click", function () {
            root._pageIndex = (root._pageIndex - 1 + appPageCount(root)) % appPageCount(root);
            layoutAppCarousel(root);
        });
        root.querySelector(".carousel-next").addEventListener("click", function () {
            root._pageIndex = (root._pageIndex + 1) % appPageCount(root);
            layoutAppCarousel(root);
        });
        layoutAppCarousel(root);
    });
}

function comparisonVideoPath(sceneId, methodKey) {
    var overrides = comparisonPathOverrides[sceneId];
    if (overrides && overrides[methodKey]) { return overrides[methodKey]; }
    return comparisonDirs[methodKey] + sceneId + ".mp4";
}

var comparisonCards = [];

function buildComparisonGrid() {
    var grid = document.getElementById("comparison-grid");
    var controls = document.getElementById("comparison-controls");
    if (!grid) { return; }
    if (!comparisonMethodOrder.length || !comparisonScenes.length) {
        grid.appendChild(emptyState("Baseline comparison videos will appear here."));
        if (controls) { controls.hidden = true; }
        return;
    }

    comparisonMethodOrder.forEach(function (method) {
        var card = document.createElement("div");
        card.className = "video-card comparison-card" + (method.isOurs ? " ours-card" : "");
        var header = document.createElement("div");
        header.className = "comparison-method-header";
        header.textContent = method.label;
        if (method.isOurs) {
            var badge = document.createElement("span");
            badge.className = "ours-badge";
            badge.textContent = "Ours";
            header.appendChild(badge);
        }
        card.appendChild(header);
        var video = createVideoElement("");
        card.appendChild(video);
        grid.appendChild(card);
        comparisonCards.push({ key: method.key, video: video });
    });
}

function applyComparisonScene(sceneId) {
    comparisonCards.forEach(function (entry) {
        var src = comparisonVideoPath(sceneId, entry.key);
        entry.video.pause();
        entry.video.dataset.src = src;
        entry.video.src = src;
        entry.video.load();
        var playPromise = entry.video.play();
        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function () {});
        }
    });
    var title = document.getElementById("comparison-scene-title");
    if (title) { title.textContent = sceneId; }
}

function renderSceneSelect() {
    var select = document.getElementById("comparison-scene-select");
    if (!select || !comparisonScenes.length) { return; }
    comparisonScenes.forEach(function (sceneId) {
        var option = document.createElement("option");
        option.value = sceneId;
        option.textContent = sceneId;
        select.appendChild(option);
    });
    select.addEventListener("change", function () { applyComparisonScene(this.value); });
    applyComparisonScene(comparisonScenes[0]);
}

function observeVideos() {
    var videos = document.querySelectorAll("video[data-src]");
    if (!("IntersectionObserver" in window)) {
        videos.forEach(function (video) {
            if (!video.getAttribute("src") && video.dataset.src) { video.src = video.dataset.src; }
        });
        return;
    }
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            var video = entry.target;
            if (entry.isIntersecting) {
                if (!video.getAttribute("src") && video.dataset.src) {
                    video.src = video.dataset.src;
                    video.load();
                }
                var playPromise = video.play();
                if (playPromise && typeof playPromise.catch === "function") {
                    playPromise.catch(function () {});
                }
            } else {
                video.pause();
            }
        });
    }, { rootMargin: "240px 0px", threshold: 0.05 });
    videos.forEach(function (video) { observer.observe(video); });
}

function setupReveal() {
    var elements = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
        elements.forEach(function (element) { element.classList.add("revealed"); });
        return;
    }
    document.body.classList.add("js-enabled");
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add("revealed");
                observer.unobserve(entry.target);
            }
        });
    }, { rootMargin: "0px 0px -40px 0px", threshold: 0.05 });
    elements.forEach(function (element) { observer.observe(element); });
}

function init() {
    renderQualitative();
    buildAppCarousels();
    buildComparisonGrid();
    renderSceneSelect();
    observeVideos();
    setupReveal();
}

window.addEventListener("resize", function () {
    document.querySelectorAll(".app-carousel:not(.is-empty)").forEach(layoutAppCarousel);
});

init();
