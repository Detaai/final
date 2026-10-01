/* =========================================================================
   Reptile Details Module
   Renders the full detail view for a single reptile: images, taxonomy,
   habitat/range (GBIF), pet information, and conservation status.
   ========================================================================= */
const ReptileDetailsModule = (function () {
  const PET_INFO = {
    Serpentes: `Snakes require secure, escape-proof enclosures, a controlled thermal
      gradient, appropriate humidity, and a diet suited to their species (usually
      whole prey). Many species can live 15–30 years, and some grow far larger
      than beginners expect. Always check local and national laws — some species
      are restricted or banned as pets.`,
    Sauria: `Lizards vary enormously in care needs: some require high heat and UVB
      lighting, live insects, and tall enclosures for climbing, while others need
      cooler, burrow-style setups. Research the exact species before buying, and
      confirm captive-bred sourcing where possible to protect wild populations.`,
    Testudines: `Turtles and tortoises need spacious enclosures (often much larger
      than sold "starter" tanks), clean water or substrate, UVB lighting, and a
      calcium-rich diet. Many species live 30–100+ years, which is a lifelong
      commitment. Never release pet turtles into the wild — it can spread disease
      and disrupt local ecosystems.`,
    Crocodylia: `Crocodilians are generally unsuitable for typical households: they
      grow large, are powerful, and require specialized permits, secure housing,
      and expert handling in most places. They are best appreciated in
      accredited zoos and sanctuaries rather than as private pets.`,
    default: `Before getting any reptile as a pet, research its adult size,
      lifespan, diet, enclosure, and lighting/heating needs, and check local
      exotic-pet regulations. Choose captive-bred animals when possible to
      reduce pressure on wild populations.`,
  };

  const countryNames = (() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      return null;
    }
  })();

  function countryLabel(code) {
    if (!code) return "Unknown";
    if (countryNames) {
      try {
        return countryNames.of(code) || code;
      } catch {
        return code;
      }
    }
    return code;
  }

  function petInfoFor(reptile) {
    const ancestorNames = (reptile.ancestors || []).map((a) => a.name);
    if (ancestorNames.includes("Snakes")) return PET_INFO.Serpentes;
    if (ancestorNames.includes("Lizards")) return PET_INFO.Sauria;
    const ranks = (reptile.ancestors || []).map((a) => a.rank);
    // fall back on matching by common ancestor rank names captured from iNaturalist
    if (reptile.wikipediaUrl && /turtle|tortoise/i.test(reptile.commonName || ""))
      return PET_INFO.Testudines;
    if (/croc|alligator|caiman|gharial/i.test(reptile.commonName || ""))
      return PET_INFO.Crocodylia;
    if (/turtle|tortoise/i.test(reptile.commonName || "")) return PET_INFO.Testudines;
    if (/snake|python|boa|viper|adder/i.test(reptile.commonName || ""))
      return PET_INFO.Serpentes;
    if (/lizard|gecko|iguana|skink|chameleon|monitor|anole/i.test(reptile.commonName || ""))
      return PET_INFO.Sauria;
    return PET_INFO.default;
  }

  function conservationBlock(reptile) {
    const status = reptile.conservationStatus;
    if (!status || !status.code) {
      return `
        <span class="conservation-badge cons-unknown">Not Evaluated</span>
        <p>No IUCN Red List assessment is available for this species in our data
        source. That does not necessarily mean it is safe — check the
        <a href="https://www.iucnredlist.org/search?query=${encodeURIComponent(
          reptile.scientificName
        )}" target="_blank" rel="noopener">IUCN Red List</a> directly for the latest assessment.</p>`;
    }
    const label = ApiModule.iucnLabel(status.code) || status.code;
    return `
      <span class="conservation-badge cons-${escapeHtml(status.code)}">${escapeHtml(label)}</span>
      <p>${status.description ? escapeHtml(status.description) : "Conservation status sourced from iNaturalist's taxonomy data."}
      ${status.authority ? ` (Source: ${escapeHtml(status.authority)})` : ""}</p>`;
  }

  function rangeBlock(range) {
    if (!range || !range.countries || range.countries.length === 0) {
      return `<p>No occurrence-record range data was found on GBIF for this species yet.</p>`;
    }
    const items = range.countries
      .map((c) => `<li>${escapeHtml(countryLabel(c.code))} — ${c.count.toLocaleString()} records</li>`)
      .join("");
    return `
      <p>Based on ${range.recordCount.toLocaleString()} occurrence records from GBIF, this
      species has most commonly been recorded in:</p>
      <ul>${items}</ul>
      <p class="source-note">Range is approximated from public observation/occurrence
      records and may include introduced or captive sightings, not just native range.</p>`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderBreadcrumbs(reptile) {
    const crumbs = (reptile.ancestors || [])
      .map((a) => `<span>${escapeHtml(a.name)}</span>`)
      .join("");
    return `<div class="breadcrumbs">${crumbs}<span>${escapeHtml(reptile.commonName)}</span></div>`;
  }

  function renderPhotoGallery(container, reptile) {
    const photos = reptile.photos && reptile.photos.length
      ? reptile.photos
      : reptile.photoUrl
      ? [{ thumb: reptile.photoUrl, large: reptile.photoUrl }]
      : [];

    const mainImg = document.createElement("img");
    mainImg.alt = reptile.commonName;
    mainImg.src = photos[0] ? photos[0].large : "";

    const wrap = document.createElement("div");
    wrap.className = "detail-image-wrap";
    wrap.appendChild(mainImg);

    const strip = document.createElement("div");
    strip.className = "photo-strip";
    photos.forEach((p, i) => {
      const img = document.createElement("img");
      img.src = p.thumb;
      img.alt = `${reptile.commonName} photo ${i + 1}`;
      if (i === 0) img.classList.add("active");
      img.addEventListener("click", () => {
        mainImg.src = p.large;
        strip.querySelectorAll("img").forEach((el) => el.classList.remove("active"));
        img.classList.add("active");
      });
      strip.appendChild(img);
    });

    container.innerHTML = "";
    container.appendChild(wrap);
    if (photos.length > 1) container.appendChild(strip);
  }

  /** Main entry point: fetch + render everything for a given taxon id. */
  async function render(elements, taxonId) {
    const { heroContainer, infoContainer } = elements;
    infoContainer.innerHTML = `
      <div class="status-msg"><div class="spinner"></div><p>Loading species details…</p></div>`;

    let reptile;
    try {
      reptile = await ApiModule.getTaxonDetails(taxonId);
    } catch (err) {
      infoContainer.innerHTML = `<div class="status-msg error">⚠️ Could not load this reptile's details.</div>`;
      return;
    }
    if (!reptile) {
      infoContainer.innerHTML = `<div class="status-msg error">Reptile not found.</div>`;
      return;
    }

    document.title = `${reptile.commonName} · Reptile Explorer`;

    heroContainer.innerHTML = `
      <a href="#/browse" class="back-link">&larr; Back to Browse</a>
      ${renderBreadcrumbs(reptile)}
      <h1>${escapeHtml(reptile.commonName)}</h1>
      <p class="sci-name">${escapeHtml(reptile.scientificName)}</p>
    `;

    const galleryHost = document.createElement("div");
    heroContainer.parentElement
      .querySelector(".detail-image-slot")
      .replaceChildren(galleryHost);
    renderPhotoGallery(galleryHost, reptile);

    // Kick off GBIF range lookup in parallel with rendering the rest.
    const rangePromise = ApiModule.getNativeRange(reptile.scientificName);

    infoContainer.innerHTML = `
      <div class="info-card">
        <h3>🌍 Habitat &amp; Native Range</h3>
        <div id="range-slot"><div class="status-msg"><div class="spinner"></div><p>Looking up range data…</p></div></div>
      </div>
      <div class="info-card">
        <h3>🏠 Pet Information</h3>
        <p>${petInfoFor(reptile)}</p>
      </div>
      <div class="info-card">
        <h3>🛡️ Conservation Status</h3>
        ${conservationBlock(reptile)}
      </div>
      ${
        reptile.wikipediaSummary
          ? `<div class="info-card">
              <h3>📖 Overview</h3>
              <p>${escapeHtml(reptile.wikipediaSummary)}</p>
              ${reptile.wikipediaUrl ? `<p class="source-note"><a href="${reptile.wikipediaUrl}" target="_blank" rel="noopener">Read more on Wikipedia</a></p>` : ""}
            </div>`
          : ""
      }
    `;

    const range = await rangePromise;
    const rangeSlot = infoContainer.querySelector("#range-slot");
    if (rangeSlot) rangeSlot.innerHTML = rangeBlock(range);
  }

  return { render };
})();
