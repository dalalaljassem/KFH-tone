const API_BASE = "http://localhost:8000";

const state = {
  product: "KFH",
  audience: "General",
  type: "Button",
  tableTypeFilter: "All",
  searchQuery: "",
  currentPage: 1,
  perPage: 10,
  editingId: null,
  resultEN: "",
  resultAR: "",
  lastInput: "",
  todayCount: 0,
  // Will be populated from backend /categories to ensure valid requests
  selectedCategory: null,
  categories: [],
};

let glossary = [];
let nextId = 1;

document.addEventListener("DOMContentLoaded", async () => {
  await loadCategories();
  loadGlossary();
});

async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) throw new Error(`Failed to load categories: ${response.status}`);
    const data = await response.json();
    const categories = Array.isArray(data?.categories) ? data.categories : (Array.isArray(data) ? data : []);
    if (categories.length === 0) {
      console.warn("No categories returned by backend.");
      return;
    }
    state.categories = categories;
    // If selectedCategory is not set or invalid, pick the first valid one
    if (!state.selectedCategory || !categories.includes(state.selectedCategory)) {
      state.selectedCategory = categories[0];
    }
    renderCategorySegControl();
    renderFilterChips();
  } catch (err) {
    console.warn("Could not load categories from backend.", err);
    // Fallback to static categories if backend not available
    const fallback = [
      "button_or_action",
      "description",
      "input_or_selection",
      "label_or_navigation",
      "legal_or_policy",
      "other",
      "status_or_feedback",
      "title",
    ];
    state.categories = fallback;
    if (!state.selectedCategory) state.selectedCategory = fallback[0];
    renderCategorySegControl();
    renderFilterChips();
  }
}

function toTitle(s) {
  if (!s) return "";
  return String(s)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderCategorySegControl() {
  const wrap = document.getElementById("seg-type");
  if (!wrap) return;
  const cats = state.categories || [];
  if (!cats.length) {
    wrap.innerHTML = '<button class="seg-control__btn seg-control__btn--active" disabled>Loading…</button>';
    return;
  }
  wrap.innerHTML = cats
    .map(
      (c) => `<button class="seg-control__btn ${
        c === state.selectedCategory ? "seg-control__btn--active" : ""
      }" onclick="setSeg('selectedCategory','${c}',this)">${toTitle(c)}</button>`
    )
    .join("");
}

function renderFilterChips() {
  const container = document.getElementById("filter-chips");
  if (!container) return;
  const chips = [
    `<button class="filter-chip ${
      state.tableTypeFilter === "All" ? "filter-chip--active" : ""
    }" data-type="All" onclick="setTableType('All',this)">All</button>`,
    ...(state.categories || []).map(
      (c) => `<button class="filter-chip ${
        state.tableTypeFilter === c ? "filter-chip--active" : ""
      }" data-type="${c}" onclick="setTableType('${c}',this)">${toTitle(c)}</button>`
    ),
  ];
  container.innerHTML = chips.join("");
}

async function loadGlossary() {
  try {
    const response = await fetch(`${API_BASE}/jsonl/contents`);
    if (!response.ok)
      throw new Error(`Failed to load glossary: ${response.status}`);

    const data = await response.json();

    glossary = data.records.map((record, index) => ({
      id: index + 1,
      ar: record.text_ar || record.raw_text_ar || "",
      en: record.text_en || record.raw_text_en || "",
      toneEN: record.kfh_tone_en || record.normalized_text_en || "",
      toneAR: record.kfh_tone_ar || record.normalized_text_ar || "",
      labelType: record.category || record.general_category || "other",
      product: record.product || "KFH",
      audience: record.audience || "General",
      source: "preset",
    }));

    nextId = glossary.length + 1;

    renderGlossaryTable();
    updateNavStats();
  } catch (err) {
    console.warn("Could not reach backend, starting with empty glossary.", err);
    glossary = [];
    renderGlossaryTable();
    updateNavStats();
    showToast("Backend offline — glossary not loaded", true);
  }
}

function setSeg(key, value, clickedBtn) {
  state[key] = value;
  const control = clickedBtn.closest(".seg-control");
  control
    .querySelectorAll(".seg-control__btn")
    .forEach((btn) => btn.classList.remove("seg-control__btn--active"));
  clickedBtn.classList.add("seg-control__btn--active");
  if (key === "product") {
    const audienceSeg = document.getElementById("seg-audience");
    if (audienceSeg) {
      audienceSeg.innerHTML =
        value === "KFH"
          ? `<button class="seg-control__btn seg-control__btn--active" onclick="setSeg('audience','General',this)">General</button>
           <button class="seg-control__btn" onclick="setSeg('audience','Youth',this)">Youth</button>`
          : `<button class="seg-control__btn seg-control__btn--active" onclick="setSeg('audience','General',this)">General</button>
           <button class="seg-control__btn" onclick="setSeg('audience','TAM-Girls',this)">Girls</button>
           <button class="seg-control__btn" onclick="setSeg('audience','TAM-Boys',this)">Boys</button>`;
      state.audience = "General";
    }
  }
}

function setTableType(value, clickedBtn) {
  state.tableTypeFilter = value;
  clickedBtn
    .closest(".filter-chips")
    .querySelectorAll(".filter-chip")
    .forEach((btn) => btn.classList.remove("filter-chip--active"));
  clickedBtn.classList.add("filter-chip--active");
  state.currentPage = 1;
  renderGlossaryTable();
}

function onInput() {
  const value = document.getElementById("raw-input").value;
  const counter = document.getElementById("char-counter");
  counter.textContent = `${value.length} / 300`;
  counter.className =
    "char-counter" + (value.length > 250 ? " char-counter--warning" : "");
  hideDupeWarning();
}

function hideDupeWarning() {
  document
    .getElementById("dupe-warning")
    .classList.remove("dupe-warning--visible");
}

async function handleGenerate() {
  const inputText = document.getElementById("raw-input").value.trim();
  if (!inputText) {
    showToast("Please enter a label first", true);
    return;
  }

  setGenerateLoading(true);

  try {
    const result = await callTranslationAPI(inputText);
    state.resultEN = result.en;
    state.resultAR = result.ar;
    state.lastInput = inputText;

    const outEN = document.getElementById("output-english");
    const outAR = document.getElementById("output-arabic");
    outEN.textContent = result.en;
    outAR.textContent = result.ar;
    outEN.classList.add("lang-pane__output--has-result");
    outAR.classList.add("lang-pane__output--has-result");

    const metaLabel = `${state.product} · ${state.audience} · ${toTitle(state.selectedCategory || "")}`;
    document.getElementById("meta-english").textContent = metaLabel;
    document.getElementById("meta-arabic").textContent = metaLabel;

    document
      .getElementById("result-block")
      .classList.add("result-block--visible");
    document
      .getElementById("result-block")
      .scrollIntoView({ behavior: "smooth", block: "nearest" });

    autoAddToGlossary(inputText, result.en, result.ar);
  } catch (err) {
    showToast("API error — check your connection", true);
  } finally {
    setGenerateLoading(false);
  }
}

function setGenerateLoading(isLoading) {
  document.getElementById("generate-btn").disabled = isLoading;
  document.getElementById("spinner").style.display = isLoading
    ? "block"
    : "none";
  document.getElementById("generate-icon").style.display = isLoading
    ? "none"
    : "block";
}

async function callTranslationAPI(inputText) {
  const response = await fetch(`${API_BASE}/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input_text: inputText,
      // Use the selected backend category only
      category: state.selectedCategory,
      allow_generation: true,
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();

  return {
    en: data.text_en || data.recommended_text_en || data.toneEN || inputText,
    ar: data.text_ar || data.recommended_text_ar || data.toneAR || inputText,
  };
}

function autoAddToGlossary(rawInput, toneEN, toneAR) {
  const alreadyExists = glossary.find(
    (e) => e.toneEN.toLowerCase() === toneEN.toLowerCase()
  );
  if (alreadyExists) return;
  glossary.unshift({
    id: nextId++,
    ar: rawInput,
    en: rawInput,
    toneEN,
    toneAR,
    product: state.product,
    audience: state.audience,
    labelType: state.selectedCategory || "other",
    source: "generated",
  });
  state.todayCount++;
  state.currentPage = 1;
  updateNavStats();
  renderGlossaryTable();
}

function saveEntry() {
  if (!state.resultEN) return;
  const alreadyExists = glossary.find(
    (e) => e.toneEN.toLowerCase() === state.resultEN.toLowerCase()
  );
  if (alreadyExists) {
    showToast("Already exists in glossary", true);
    return;
  }
  glossary.unshift({
    id: nextId++,
    ar: state.lastInput,
    en: state.lastInput,
    toneEN: state.resultEN,
    toneAR: state.resultAR,
    product: state.product,
    audience: state.audience,
    labelType: state.selectedCategory || "other",
    source: "added",
  });
  state.todayCount++;
  state.currentPage = 1;
  updateNavStats();
  renderGlossaryTable();
  showToast("Saved to glossary");
}

function copyLang(lang) {
  navigator.clipboard
    .writeText(lang === "en" ? state.resultEN : state.resultAR)
    .catch(() => {});
  showToast("Copied");
}

function copyBoth() {
  navigator.clipboard
    .writeText(`EN: ${state.resultEN}\nAR: ${state.resultAR}`)
    .catch(() => {});
  showToast("Both languages copied");
}

function onSearch() {
  state.searchQuery = document.getElementById("glossary-search").value;
  state.currentPage = 1;
  renderGlossaryTable();
}

function getFilteredRows() {
  const q = state.searchQuery.toLowerCase();
  const typeFilter = state.tableTypeFilter;
  return glossary.filter((entry) => {
    const matchesSearch =
      !q ||
      entry.ar.includes(q) ||
      entry.en.toLowerCase().includes(q) ||
      (entry.toneEN || "").toLowerCase().includes(q) ||
      (entry.toneAR || "").includes(q);
    const matchesType =
      typeFilter === "All"
        ? true
        : (entry.labelType || "other") === typeFilter;
    return matchesSearch && matchesType;
  });
}

function renderGlossaryTable() {
  const filtered = getFilteredRows();
  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / state.perPage));
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  const startIndex = (state.currentPage - 1) * state.perPage;
  const pageRows = filtered.slice(startIndex, startIndex + state.perPage);

  const tableBody = document.getElementById("glossary-table-body");
  const emptyState = document.getElementById("glossary-empty-state");

  if (!pageRows.length) {
    tableBody.innerHTML = "";
    emptyState.style.display = "flex";
  } else {
    emptyState.style.display = "none";
    tableBody.innerHTML = pageRows
      .map((entry, i) => buildTableRow(entry, startIndex + i + 1))
      .join("");
    if (state.editingId) {
      setTimeout(() => {
        const el = document.getElementById(`edit-english-${state.editingId}`);
        if (el) {
          el.focus();
          el.select();
        }
      }, 30);
    }
  }

  renderPagination(totalRows, totalPages);
  updateNavStats();
}

function buildTableRow(entry, rowNumber) {
  const editActions = `
    <div class="glossary-grid__cell glossary-grid__cell--actions">
      <button class="icon-btn icon-btn--confirm" onclick="saveRowEdit(${entry.id})" title="Save">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="icon-btn" onclick="cancelRowEdit()" title="Cancel">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>`;

  const viewActions = `
    <div class="glossary-grid__cell glossary-grid__cell--actions">
      <button class="icon-btn" onclick="startRowEdit(${entry.id})" title="Edit">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 9.5h2l5-5-2-2-5 5v2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M7 2.5l2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
      </button>
      <button class="icon-btn icon-btn--danger" onclick="deleteEntry(${entry.id})" title="Delete">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3.5h8M4.5 3.5V2h3v1.5M5 5.5v3.5M7 5.5v3.5M3 3.5l.5 6.5h5l.5-6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>`;

  if (state.editingId === entry.id) {
    const lt = entry.labelType || "other";
    const opts = (state.categories && state.categories.length
      ? state.categories
      : [
          "button_or_action",
          "description",
          "input_or_selection",
          "label_or_navigation",
          "legal_or_policy",
          "other",
          "status_or_feedback",
          "title",
        ]
    )
      .map((c) => `<option value="${c}" ${lt === c ? "selected" : ""}>${toTitle(c)}</option>`) 
      .join("");
    return `
      <div class="glossary-grid__row glossary-grid__row--editing">
        <div class="glossary-grid__cell glossary-grid__cell--num">${rowNumber}</div>
        <div class="glossary-grid__cell">
          <input class="inline-edit-input inline-edit-input--arabic" id="edit-arabic-${
            entry.id
          }" value="${esc(entry.toneAR || entry.ar)}" dir="rtl"/>
        </div>
        <div class="glossary-grid__cell">
          <input class="inline-edit-input" id="edit-english-${
            entry.id
          }" value="${esc(entry.toneEN || entry.en)}"/>
        </div>
        <div class="glossary-grid__cell">
          <select class="inline-edit-input" id="edit-labeltype-${
            entry.id
          }" style="cursor:pointer;">
            ${opts}
          </select>
        </div>
        ${editActions}
      </div>`;
  }

  return `
    <div class="glossary-grid__row">
      <div class="glossary-grid__cell glossary-grid__cell--num">${rowNumber}</div>
      <div class="glossary-grid__cell cell--arabic">${esc(
        entry.toneAR || entry.ar
      )}</div>
      <div class="glossary-grid__cell cell--english">${esc(
        entry.toneEN || entry.en
      )}</div>
      <div class="glossary-grid__cell">${buildLabelTypeBadge(
        entry.labelType
      )}</div>
      ${viewActions}
    </div>`;
}

function buildLabelTypeBadge(type) {
  // Generic badge that displays the backend category as a title-cased label
  const txt = toTitle(type || "other");
  return `<span class="badge">${esc(txt)}</span>`;
}

function startRowEdit(id) {
  state.editingId = id;
  renderGlossaryTable();
}
function cancelRowEdit() {
  state.editingId = null;
  renderGlossaryTable();
}

function saveRowEdit(id) {
  const newArabic = document.getElementById(`edit-arabic-${id}`)?.value.trim();
  const newEnglish = document
    .getElementById(`edit-english-${id}`)
    ?.value.trim();
  const newLabelType = document.getElementById(`edit-labeltype-${id}`)?.value;
  if (!newArabic || !newEnglish) {
    showToast("Arabic and English are both required", true);
    return;
  }
  const entry = glossary.find((e) => e.id === id);
  if (entry) {
    entry.toneAR = newArabic;
    entry.toneEN = newEnglish;
    entry.labelType = newLabelType || entry.labelType;
  }
  state.editingId = null;
  renderGlossaryTable();
  showToast("Entry updated");
}

function deleteEntry(id) {
  if (!confirm("Delete this glossary entry?")) return;
  glossary = glossary.filter((e) => e.id !== id);
  if (state.editingId === id) state.editingId = null;
  renderGlossaryTable();
  showToast("Entry deleted");
}

function renderPagination(totalRows, totalPages) {
  const container = document.getElementById("pagination");
  if (totalRows === 0) {
    container.innerHTML = "";
    return;
  }

  const rangeStart = (state.currentPage - 1) * state.perPage + 1;
  const rangeEnd = Math.min(state.currentPage * state.perPage, totalRows);
  const pageButtons = buildPageRange(state.currentPage, totalPages)
    .map((page) => {
      if (page === "…") return `<span class="pagination__ellipsis">…</span>`;
      const active = page === state.currentPage;
      return `<button class="pagination__btn${
        active ? " pagination__btn--active" : ""
      }" onclick="goToPage(${page})">${page}</button>`;
    })
    .join("");

  container.innerHTML = `
    <span class="pagination__info">Showing <strong>${rangeStart}–${rangeEnd}</strong> of <strong>${totalRows}</strong></span>
    <div class="pagination__controls">
      <button class="pagination__btn" onclick="goToPage(${
        state.currentPage - 1
      })" ${state.currentPage === 1 ? "disabled" : ""}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      ${pageButtons}
      <button class="pagination__btn" onclick="goToPage(${
        state.currentPage + 1
      })" ${state.currentPage === totalPages ? "disabled" : ""}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>`;
}

function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

function goToPage(page) {
  const totalPages = Math.ceil(getFilteredRows().length / state.perPage);
  if (page < 1 || page > totalPages) return;
  state.currentPage = page;
  renderGlossaryTable();
  document
    .querySelector(".glossary-table-wrap")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

function exportCSV() {
  const header =
    "ID,Arabic Raw,English Raw,KFH Tone EN,KFH Tone AR,Label Type,Product,Audience\n";
  const rows = glossary
    .map(
      (e) =>
        `${e.id},"${e.ar}","${e.en}","${e.toneEN}","${e.toneAR}","${
          e.labelType || "other"
        }","${e.product}","${e.audience}"`
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + header + rows], {
    type: "text/csv;charset=utf-8;",
  });
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: "kfh-glossary.csv",
  });
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Exported as CSV");
}

function updateNavStats() {
  document.getElementById("stat-total").textContent = glossary.length;
  document.getElementById("stat-today").textContent = state.todayCount;
}

function showToast(message, isError = false) {
  const region = document.getElementById("toast-region");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<div class="toast__dot${
    isError ? " toast__dot--error" : ""
  }"></div>${esc(message)}`;
  region.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toast-out .18s ease forwards";
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleGenerate();
  if (e.key === "Escape" && state.editingId) cancelRowEdit();
});
