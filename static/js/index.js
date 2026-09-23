/* GenTwin academic project page. */

/* Add one entry per application section already declared in index.html. */
var applicationSections = [
    { id: "application-1", dir: "static/videos/applications/application-1/", videos: [] },
    { id: "application-2", dir: "static/videos/applications/application-2/", videos: [] }
];

var resultCategories = {
    deformable: {
        label: "Deformable",
        description: "Multi-part deformable objects from the PhysTwin benchmark.",
        scenes: [
            "double_lift_sloth", "double_stretch_sloth", "single_lift_sloth",
            "single_push_sloth", "double_lift_zebra", "double_stretch_zebra",
            "single_lift_zebra"
        ],
        methods: [
            { label: "Observation", base: "static/videos/results/observation/deformable/", single: true },
            { label: "GS-Dynamics", base: "static/videos/results/gs_dynamics/deformable/", single: true },
            { label: "Spring-Gaus", base: "static/videos/results/spring_gaus/deformable/", single: true },
            { label: "PhysTwin", base: "static/videos/results/phystwin/deformable/" },
            { label: "GenTwin", base: "static/videos/results/gentwin/deformable/", isOurs: true }
        ]
    },
    articulated: {
        label: "Articulated",
        description: "Self-captured drawers and folding cases with constrained rigid-part motion.",
        scenes: [
            "double_close_drawer_11", "single_fold_case_03",
            "single_fold_case_08", "single_fold_case_09"
        ],
        methods: [
            { label: "Observation", base: "static/videos/results/observation/articulated/", single: true },
            { label: "GS-Dynamics", base: "static/videos/results/gs_dynamics/articulated/", single: true },
            { label: "Spring-Gaus", base: "static/videos/results/spring_gaus/articulated/", single: true },
            { label: "ArtGS", base: "static/videos/results/artgs/articulated/" },
            { label: "GaussianArt", base: "static/videos/results/gaussianart/articulated/" },
            { label: "PhysTwin", base: "static/videos/results/phystwin/articulated/" },
            { label: "GenTwin", base: "static/videos/results/gentwin/articulated/", isOurs: true }
        ]
    },
    hybrid: {
        label: "Hybrid",
        description: "Self-captured objects combining rigid components with flexible or deformable parts.",
        scenes: [
            "double_lift_card_01", "single_lift_card_05", "single_lift_flag_03",
            "single_lift_flag_05", "single_push_duster_03", "single_push_broom_01"
        ],
        methods: [
            { label: "Observation", base: "static/videos/results/observation/hybrid/", single: true },
            { label: "GS-Dynamics", base: "static/videos/results/gs_dynamics/hybrid/", single: true },
            { label: "Spring-Gaus", base: "static/videos/results/spring_gaus/hybrid/", single: true },
            { label: "PhysTwin", base: "static/videos/results/phystwin/hybrid/" },
            { label: "GenTwin", base: "static/videos/results/gentwin/hybrid/", isOurs: true }
        ]
    }
};

var activeResultCategory = "deformable";

var newControlPointTasks = [
    { id: "card", label: "Card" },
    { id: "duster", label: "Duster" },
    { id: "flag03", label: "Flag" },
    { id: "zebra", label: "Zebra" }
];

var dataGenerationTasks = [
    { id: "duster_case09_gen", label: "Duster + Case 09" },
    { id: "card_drawer11_gen", label: "Card + Drawer 11" }
];

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
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "auto");
    return video;
}

function loadVideo(video) {
    if (!video.getAttribute("src") && video.dataset.src) {
        video.src = video.dataset.src;
        video.load();
    }
}

function waitForVideo(video) {
    loadVideo(video);
    if (video.readyState >= 3) { return Promise.resolve(); }
    return new Promise(function (resolve) {
        var settled = false;
        function finish() {
            if (settled) { return; }
            settled = true;
            video.removeEventListener("canplay", finish);
            video.removeEventListener("error", finish);
            resolve();
        }
        video.addEventListener("canplay", finish, { once: true });
        video.addEventListener("error", finish, { once: true });
    });
}

function playVideoGroup(owner, token, videos) {
    if (owner._syncToken !== token) { return; }
    videos.forEach(function (video) {
        try { video.currentTime = 0; } catch (error) {}
    });
    window.requestAnimationFrame(function () {
        if (owner._syncToken !== token) { return; }
        videos.forEach(function (video) {
            var promise = video.play();
            if (promise && typeof promise.catch === "function") {
                promise.catch(function () {});
            }
        });
    });
}

function synchronizeVideoGroup(owner, videos) {
    videos = Array.prototype.slice.call(videos).filter(Boolean);
    owner._syncToken = (owner._syncToken || 0) + 1;
    var token = owner._syncToken;

    videos.forEach(function (video) {
        video.pause();
        loadVideo(video);
    });
    if (!videos.length) { return; }

    Promise.all(videos.map(waitForVideo)).then(function () {
        if (owner._syncToken !== token) { return; }
        playVideoGroup(owner, token, videos);

        var master = videos[0];
        var lastCorrection = 0;
        function maintainSync(timestamp) {
            if (owner._syncToken !== token) { return; }

            var durations = videos.map(function (video) { return video.duration; })
                .filter(function (duration) { return Number.isFinite(duration) && duration > 0; });
            var sharedDuration = durations.length ? Math.min.apply(Math, durations) : 0;

            if (sharedDuration && master.currentTime >= sharedDuration - 0.05) {
                videos.forEach(function (video) { video.pause(); });
                playVideoGroup(owner, token, videos);
                lastCorrection = timestamp;
            } else if (!master.paused && timestamp - lastCorrection > 250) {
                videos.slice(1).forEach(function (video) {
                    if (Math.abs(video.currentTime - master.currentTime) > 0.06) {
                        video.currentTime = master.currentTime;
                    }
                });
                lastCorrection = timestamp;
            }
            window.requestAnimationFrame(maintainSync);
        }
        window.requestAnimationFrame(maintainSync);
    });
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
    var activeVideos = [];
    Array.prototype.forEach.call(root.querySelectorAll(".carousel-slide"), function (slide, i) {
        var video = slide.querySelector("video");
        if (!video) { return; }
        if (i >= start && i < end) {
            activeVideos.push(video);
        } else {
            video.pause();
        }
    });
    synchronizeVideoGroup(root, activeVideos);
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

function formatSceneName(sceneId) {
    return sceneId.split("_").map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(" ");
}

function resultVideoPath(method, sceneId) {
    if (method.single) { return method.base + sceneId + ".mp4"; }
    return method.base + sceneId + "/0.mp4";
}

function renderCategoryTabs() {
    var root = document.getElementById("result-category-tabs");
    if (!root) { return; }
    Array.prototype.forEach.call(root.querySelectorAll("[data-category]"), function (button) {
        var key = button.dataset.category;
        button.classList.toggle("active", key === activeResultCategory);
        if (!button.dataset.bound) {
            button.dataset.bound = "true";
            button.addEventListener("click", function () {
                activeResultCategory = key;
                renderCategoryTabs();
                populateSceneSelect();
                renderSelectedScene();
            });
        }
    });
}

function createComparisonCard(method, sceneId) {
    var card = document.createElement("article");
    card.className = "video-card comparison-card" + (method.isOurs ? " ours-card" : "");

    var header = document.createElement("div");
    header.className = "comparison-method-header";
    header.appendChild(document.createTextNode(method.label));
    if (method.isOurs) {
        var badge = document.createElement("span");
        badge.className = "ours-badge";
        badge.textContent = "Ours";
        header.appendChild(badge);
    }
    card.appendChild(header);

    var video = createVideoElement(resultVideoPath(method, sceneId));
    video.defaultPlaybackRate = 0.8;
    video.playbackRate = 0.8;
    video.addEventListener("error", function () { card.classList.add("video-unavailable"); });
    card.appendChild(video);
    return card;
}

function populateSceneSelect() {
    var select = document.getElementById("comparison-scene-select");
    if (!select) { return; }
    var category = resultCategories[activeResultCategory];
    select.innerHTML = "";
    category.scenes.forEach(function (sceneId) {
        var option = document.createElement("option");
        option.value = sceneId;
        option.textContent = formatSceneName(sceneId);
        select.appendChild(option);
    });
}

function renderSelectedScene() {
    var grid = document.getElementById("comparison-grid");
    var select = document.getElementById("comparison-scene-select");
    if (!grid || !select) { return; }
    var category = resultCategories[activeResultCategory];
    var sceneId = select.value || category.scenes[0];
    grid.innerHTML = "";

    var description = document.getElementById("comparison-category-description");
    if (description) { description.textContent = category.description + " Results are shown from camera view 1."; }

    var title = document.getElementById("comparison-scene-title");
    if (title) { title.textContent = formatSceneName(sceneId); }

    category.methods.forEach(function (method) {
        grid.appendChild(createComparisonCard(method, sceneId));
    });

    synchronizeVideoGroup(grid, grid.querySelectorAll("video"));
}

function initResultBrowser() {
    var select = document.getElementById("comparison-scene-select");
    if (!select) { return; }
    select.addEventListener("change", renderSelectedScene);
    renderCategoryTabs();
    populateSceneSelect();
    renderSelectedScene();
}

function createDownstreamCard(method, filename, isOurs) {
    var card = document.createElement("article");
    card.className = "video-card comparison-card downstream-card" + (isOurs ? " ours-card" : "");

    var header = document.createElement("div");
    header.className = "comparison-method-header";
    header.appendChild(document.createTextNode(method));
    if (isOurs) {
        var badge = document.createElement("span");
        badge.className = "ours-badge";
        badge.textContent = "Ours";
        header.appendChild(badge);
    }
    card.appendChild(header);
    card.appendChild(createVideoElement("static/videos/applications/new_control_point/" + filename));
    return card;
}

function activateDownstreamSlide(root) {
    var slides = root.querySelectorAll(".downstream-slide");
    var track = root.querySelector(".downstream-track");
    track.style.transform = "translateX(-" + (root._index * 100) + "%)";

    var activeVideos = [];
    Array.prototype.forEach.call(slides, function (slide, index) {
        Array.prototype.forEach.call(slide.querySelectorAll("video"), function (video) {
            if (index === root._index) {
                activeVideos.push(video);
            } else {
                video.pause();
            }
        });
    });
    synchronizeVideoGroup(root, activeVideos);

    Array.prototype.forEach.call(root.querySelectorAll(".carousel-dot"), function (dot, index) {
        dot.classList.toggle("active", index === root._index);
    });
}

function buildDownstreamCarousel() {
    var root = document.getElementById("new-control-carousel");
    if (!root) { return; }
    var track = root.querySelector(".downstream-track");
    var dots = root.querySelector(".downstream-dots");
    root._index = 0;

    newControlPointTasks.forEach(function (task, index) {
        var slide = document.createElement("section");
        slide.className = "downstream-slide";

        var title = document.createElement("h4");
        title.className = "downstream-task-title";
        title.textContent = task.label;
        slide.appendChild(title);

        var pair = document.createElement("div");
        pair.className = "downstream-pair";
        pair.appendChild(createDownstreamCard("PhysTwin", "Phystwin_" + task.id + ".mp4", false));
        pair.appendChild(createDownstreamCard("GenTwin", "Gentwin_" + task.id + ".mp4", true));
        slide.appendChild(pair);
        track.appendChild(slide);

        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot" + (index === 0 ? " active" : "");
        dot.setAttribute("aria-label", "Show " + task.label);
        dot.addEventListener("click", function () {
            root._index = index;
            activateDownstreamSlide(root);
        });
        dots.appendChild(dot);
    });

    root.querySelector(".downstream-prev").addEventListener("click", function () {
        root._index = (root._index - 1 + newControlPointTasks.length) % newControlPointTasks.length;
        activateDownstreamSlide(root);
    });
    root.querySelector(".downstream-next").addEventListener("click", function () {
        root._index = (root._index + 1) % newControlPointTasks.length;
        activateDownstreamSlide(root);
    });
    activateDownstreamSlide(root);
}

function createGenerationCard(label, filename) {
    var card = document.createElement("article");
    card.className = "video-card comparison-card downstream-card ours-card";

    var header = document.createElement("div");
    header.className = "comparison-method-header";
    header.textContent = label;
    card.appendChild(header);
    card.appendChild(createVideoElement("static/videos/applications/data_generation/" + filename));
    return card;
}

function buildDataGenerationCarousel() {
    var root = document.getElementById("data-generation-carousel");
    if (!root) { return; }
    var track = root.querySelector(".downstream-track");
    var dots = root.querySelector(".downstream-dots");
    root._index = 0;

    dataGenerationTasks.forEach(function (task, index) {
        var slide = document.createElement("section");
        slide.className = "downstream-slide";

        var title = document.createElement("h4");
        title.className = "downstream-task-title";
        title.textContent = task.label;
        slide.appendChild(title);

        var pair = document.createElement("div");
        pair.className = "downstream-pair";
        pair.appendChild(createGenerationCard("Generation 01", task.id + "_01.mp4"));
        pair.appendChild(createGenerationCard("Generation 02", task.id + "_02.mp4"));
        slide.appendChild(pair);
        track.appendChild(slide);

        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot" + (index === 0 ? " active" : "");
        dot.setAttribute("aria-label", "Show " + task.label);
        dot.addEventListener("click", function () {
            root._index = index;
            activateDownstreamSlide(root);
        });
        dots.appendChild(dot);
    });

    root.querySelector(".downstream-prev").addEventListener("click", function () {
        root._index = (root._index - 1 + dataGenerationTasks.length) % dataGenerationTasks.length;
        activateDownstreamSlide(root);
    });
    root.querySelector(".downstream-next").addEventListener("click", function () {
        root._index = (root._index + 1) % dataGenerationTasks.length;
        activateDownstreamSlide(root);
    });
    activateDownstreamSlide(root);
}

function observeVideos(root) {
    var scope = root || document;
    var videos = scope.querySelectorAll("video[data-src]");
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
                loadVideo(video);
            }
        });
    }, { rootMargin: "240px 0px", threshold: 0.05 });
    videos.forEach(function (video) {
        if (!video.dataset.observerBound) {
            video.dataset.observerBound = "true";
            observer.observe(video);
        }
    });
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

function setupPointerAura() {
    var aura = document.querySelector(".pointer-aura");
    if (!aura || !window.matchMedia ||
        !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    var x = -300;
    var y = -300;
    var scheduled = false;

    function paint() {
        aura.style.transform = "translate3d(" + (x - 48) + "px, " + (y - 48) + "px, 0)";
        scheduled = false;
    }

    document.addEventListener("pointermove", function (event) {
        x = event.clientX;
        y = event.clientY;
        aura.classList.add("is-visible");
        if (!scheduled) {
            scheduled = true;
            window.requestAnimationFrame(paint);
        }
    }, { passive: true });

    document.addEventListener("pointerleave", function () {
        aura.classList.remove("is-visible");
    });
}

function setupNavigationFeedback() {
    var progress = document.querySelector(".scroll-progress span");
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav-links a[href^='#']"));
    var sections = links.map(function (link) {
        return document.querySelector(link.getAttribute("href"));
    }).filter(Boolean);
    var scheduled = false;

    function update() {
        var scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        var ratio = Math.min(1, Math.max(0, window.scrollY / scrollable));
        if (progress) { progress.style.transform = "scaleX(" + ratio + ")"; }

        var marker = window.scrollY + Math.min(window.innerHeight * 0.32, 240);
        var active = sections[0];
        sections.forEach(function (section) {
            if (section.offsetTop <= marker) { active = section; }
        });
        links.forEach(function (link) {
            link.classList.toggle("is-active", active && link.getAttribute("href") === "#" + active.id);
        });
        scheduled = false;
    }

    function requestUpdate() {
        if (!scheduled) {
            scheduled = true;
            window.requestAnimationFrame(update);
        }
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    update();
}

function init() {
    buildAppCarousels();
    initResultBrowser();
    buildDownstreamCarousel();
    buildDataGenerationCarousel();
    observeVideos();
    setupReveal();
    setupPointerAura();
    setupNavigationFeedback();
}

window.addEventListener("resize", function () {
    document.querySelectorAll(".app-carousel:not(.is-empty)").forEach(layoutAppCarousel);
});

init();
