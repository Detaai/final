/* =========================================================================
   Reptile Display Module
   Builds the image roundabout (carousel) and reptile card grids/lists.
   ========================================================================= */
const ReptileDisplayModule = (function () {
  let carouselTimer = null;

  function placeholderImg() {
    return "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
          <rect width='100%' height='100%' fill='#e5efe8'/>
          <text x='50%' y='50%' font-family='sans-serif' font-size='16'
            fill='#8fa89a' text-anchor='middle' dy='.3em'>No image</text>
        </svg>`
      );
  }

  /** A single clickable reptile card. */
  function createCard(reptile) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "reptile-card";
    card.setAttribute("aria-label", `View details for ${reptile.commonName}`);

    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = reptile.photoUrl || placeholderImg();
    img.alt = reptile.commonName;

    const info = document.createElement("div");
    info.className = "info";
    info.innerHTML = `
      <p class="common-name">${escapeHtml(reptile.commonName)}</p>
      <p class="sci-name">${escapeHtml(reptile.scientificName)}</p>
      ${reptile.iconicGroupName ? `<span class="taxon-badge">${escapeHtml(reptile.iconicGroupName)}</span>` : ""}
    `;

    card.appendChild(img);
    card.appendChild(info);
    card.addEventListener("click", () => NavigationModule.goToDetails(reptile.id));
    return card;
  }

  /** Renders a grid of reptile cards into a container element. */
  function renderCardGrid(container, reptiles) {
    container.innerHTML = "";
    if (!reptiles || reptiles.length === 0) {
      container.innerHTML = `<p class="status-msg">No reptiles found.</p>`;
      return;
    }
    const frag = document.createDocumentFragment();
    reptiles.forEach((r) => frag.appendChild(createCard(r)));
    container.appendChild(frag);
  }

  function renderLoading(container, message = "Loading reptiles…") {
    container.innerHTML = `
      <div class="status-msg">
        <div class="spinner"></div>
        <p>${escapeHtml(message)}</p>
      </div>`;
  }

  function renderError(container, message = "Something went wrong. Please try again.") {
    container.innerHTML = `<div class="status-msg error">⚠️ ${escapeHtml(message)}</div>`;
  }

  /** Auto-rotating image roundabout featuring a handful of reptiles. */
  function renderCarousel(container, reptiles) {
    clearInterval(carouselTimer);
    container.innerHTML = "";
    const slides = reptiles.filter((r) => r.photoUrl).slice(0, 8);
    if (slides.length === 0) {
      container.innerHTML = `<p class="status-msg">No images available.</p>`;
      return;
    }

    let current = 0;
    const track = document.createElement("div");
    track.className = "carousel-track";

    slides.forEach((r) => {
      const slide = document.createElement("div");
      slide.className = "carousel-slide";
      slide.innerHTML = `
        <img src="${r.photoUrl}" alt="${escapeHtml(r.commonName)}">
        <div class="carousel-caption">
          ${escapeHtml(r.commonName)}
          <small>${escapeHtml(r.scientificName)}</small>
        </div>`;
      slide.addEventListener("click", () => NavigationModule.goToDetails(r.id));
      track.appendChild(slide);
    });

    const prevBtn = document.createElement("button");
    prevBtn.className = "carousel-btn prev";
    prevBtn.setAttribute("aria-label", "Previous reptile");
    prevBtn.textContent = "‹";

    const nextBtn = document.createElement("button");
    nextBtn.className = "carousel-btn next";
    nextBtn.setAttribute("aria-label", "Next reptile");
    nextBtn.textContent = "›";

    const dots = document.createElement("div");
    dots.className = "carousel-dots";
    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
      if (i === 0) dot.classList.add("active");
      dot.addEventListener("click", () => goTo(i));
      dots.appendChild(dot);
    });

    container.appendChild(track);
    container.appendChild(prevBtn);
    container.appendChild(nextBtn);
    container.appendChild(dots);

    function goTo(index) {
      current = (index + slides.length) % slides.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      [...dots.children].forEach((d, i) =>
        d.classList.toggle("active", i === current)
      );
    }

    prevBtn.addEventListener("click", () => goTo(current - 1));
    nextBtn.addEventListener("click", () => goTo(current + 1));

    carouselTimer = setInterval(() => goTo(current + 1), 5000);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return {
    renderCardGrid,
    renderCarousel,
    renderLoading,
    renderError,
    escapeHtml,
  };
})();
