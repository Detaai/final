/* =========================================================================
   API Module
   Handles all requests to iNaturalist and GBIF and normalizes their data
   into a single "reptile" shape the rest of the app can use.
   ========================================================================= */
const ApiModule = (function () {
  const INAT_BASE = "https://api.inaturalist.org/v1";
  const GBIF_BASE = "https://api.gbif.org/v1";

  // iNaturalist taxon ids for the class Reptilia and its major groups.
  const CATEGORY_TAXA = {
    all: { id: 26036, label: "All Reptiles" },
    snakes: { id: 85553, label: "Snakes" },
    lizards: { id: 85552, label: "Lizards" },
    turtles: { id: 39532, label: "Turtles & Tortoises" },
    crocodilians: { id: 26039, label: "Crocodilians" },
  };

  const IUCN_LABELS = {
    LC: "Least Concern",
    NT: "Near Threatened",
    VU: "Vulnerable",
    EN: "Endangered",
    CR: "Critically Endangered",
    EW: "Extinct in the Wild",
    EX: "Extinct",
  };

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed (${res.status}): ${url}`);
    return res.json();
  }

  /** Turn an iNaturalist taxon object into the shape used across the UI. */
  function normalizeTaxon(taxon) {
    if (!taxon) return null;
    const photos = (taxon.taxon_photos || [])
      .map((p) => p.photo)
      .filter(Boolean);
    const mainPhoto =
      taxon.default_photo || (photos[0] ? photos[0] : null);

    return {
      id: taxon.id,
      commonName: taxon.preferred_common_name || taxon.name,
      scientificName: taxon.name,
      iconicGroupName: taxon.iconic_taxon_name,
      rank: taxon.rank,
      photoUrl: mainPhoto
        ? (mainPhoto.medium_url || mainPhoto.square_url || mainPhoto.url)
        : null,
      photos: photos.map((p) => ({
        thumb: p.square_url || p.small_url,
        large: p.large_url || p.medium_url || p.original_url,
        attribution: p.attribution,
      })),
      conservationStatus: taxon.conservation_status
        ? {
            code: (taxon.conservation_status.iucn_status_code || "").toUpperCase(),
            authority: taxon.conservation_status.authority,
            description: taxon.conservation_status.description,
          }
        : null,
      wikipediaUrl: taxon.wikipedia_url || null,
      wikipediaSummary: taxon.wikipedia_summary
        ? taxon.wikipedia_summary.replace(/<[^>]+>/g, "")
        : null,
      ancestors: (taxon.ancestors || [])
        .filter((a) => a.rank_level <= 50) // class Reptilia and below
        .map((a) => ({ id: a.id, name: a.preferred_common_name || a.name, rank: a.rank })),
      observationsCount: taxon.observations_count || 0,
    };
  }

  /** Category browse list: the most-observed reptiles in a group (or all reptiles). */
  async function getFeaturedReptiles(categoryKey = "all", perPage = 18) {
    const cat = CATEGORY_TAXA[categoryKey] || CATEGORY_TAXA.all;
    const url = `${INAT_BASE}/observations/species_counts?taxon_id=${cat.id}&iconic_taxa=Reptilia&per_page=${perPage}&locale=en`;
    const data = await fetchJson(url);
    return (data.results || []).map((r) => normalizeTaxon(r.taxon));
  }

  /** Free-text search for reptiles by common or scientific name. */
  async function searchReptiles(query, perPage = 24) {
    const url = `${INAT_BASE}/taxa?q=${encodeURIComponent(
      query
    )}&iconic_taxa=Reptilia&per_page=${perPage}&locale=en&photos=true`;
    const data = await fetchJson(url);
    return (data.results || []).map(normalizeTaxon);
  }

  /** Full detail record for a single reptile taxon. */
  async function getTaxonDetails(id) {
    const url = `${INAT_BASE}/taxa/${id}`;
    const data = await fetchJson(url);
    const taxon = (data.results || [])[0];
    return normalizeTaxon(taxon);
  }

  /**
   * GBIF: resolve a scientific name to a usageKey, then pull the top
   * countries/areas where the species has been recorded — used as an
   * approximation of native/observed range on the details page.
   */
  async function getNativeRange(scientificName) {
    try {
      const matchUrl = `${GBIF_BASE}/species/match?name=${encodeURIComponent(
        scientificName
      )}&strict=false`;
      const match = await fetchJson(matchUrl);
      const usageKey = match.usageKey;
      if (!usageKey) return { countries: [], recordCount: 0 };

      const occUrl = `${GBIF_BASE}/occurrence/search?taxonKey=${usageKey}&facet=country&facetLimit=8&limit=0`;
      const occData = await fetchJson(occUrl);
      const countryFacet =
        (occData.facets || []).find((f) => f.field === "COUNTRY") || {};
      const countries = (countryFacet.counts || []).map((c) => ({
        code: c.name,
        count: c.count,
      }));

      return {
        countries,
        recordCount: occData.count || 0,
        gbifKey: usageKey,
      };
    } catch (err) {
      console.warn("GBIF native range lookup failed:", err);
      return { countries: [], recordCount: 0 };
    }
  }

  function iucnLabel(code) {
    return IUCN_LABELS[code] || null;
  }

  return {
    CATEGORY_TAXA,
    getFeaturedReptiles,
    searchReptiles,
    getTaxonDetails,
    getNativeRange,
    iucnLabel,
  };
})();
