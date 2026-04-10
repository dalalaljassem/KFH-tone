const state = {
  product: "KFH",
  audience: "General",
  type: "Button",
  filter: "KFH",
  searchQuery: "",
  currentPage: 1,
  perPage: 10,
  editingId: null,
  resultEN: "",
  resultAR: "",
  lastInput: "",
  todayCount: 0,
};

let glossary = [
  {
    id: 1,
    ar: "حياك الله",
    en: "Welcome",
    toneEN: "Welcome back",
    toneAR: "حياك الله",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 2,
    ar: "اضغط للدخول بخاصية الوجه",
    en: "Tap to login by Face ID",
    toneEN: "Sign in with Face ID",
    toneAR: "سجّل دخولك عبر Face ID",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 3,
    ar: "الدخول بإستخدام بياناتك",
    en: "Login using credentials",
    toneEN: "Sign in with your details",
    toneAR: "سجّل دخولك باستخدام بياناتك",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 4,
    ar: "الدخول بمستخدم اخر",
    en: "Login with another user",
    toneEN: "Sign in with another account",
    toneAR: "سجّل الدخول بحساب آخر",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 5,
    ar: "عروضنا",
    en: "Offers",
    toneEN: "Explore our offers",
    toneAR: "اكتشف عروضنا",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 6,
    ar: "مكافآت بيتك",
    en: "Baitek Rewards",
    toneEN: "Discover Baitek Rewards",
    toneAR: "اكتشف مكافآت بيتك",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 7,
    ar: "تواصل معنا",
    en: "Contact Us",
    toneEN: "Get in touch with us",
    toneAR: "تواصل معنا بكل سهولة",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 8,
    ar: "أوتو بيتك",
    en: "KFH Auto",
    toneEN: "Explore KFH Auto",
    toneAR: "اكتشف KFH Auto",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 9,
    ar: "الإشعارات",
    en: "Push Notifications",
    toneEN: "Your notifications",
    toneAR: "إشعاراتك",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 10,
    ar: "لا يوجد إشعارات",
    en: "No Notifications",
    toneEN: "No notifications yet",
    toneAR: "لا توجد إشعارات حتى الآن",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 11,
    ar: "أين تجدنا",
    en: "Find Us",
    toneEN: "Find a branch near you",
    toneAR: "اعثر على أقرب فرع لك",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 12,
    ar: "محول العملات",
    en: "Exchange",
    toneEN: "Currency converter",
    toneAR: "محوّل العملات",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 13,
    ar: "حاسبتنا",
    en: "Calculator",
    toneEN: "Try our calculator",
    toneAR: "جرّب حاسبتنا",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 14,
    ar: "بيتك للمساعدة",
    en: "KFH Assistant",
    toneEN: "Chat with KFH Assistant",
    toneAR: "تحدّث مع مساعد بيتك",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 15,
    ar: "احجز موعدك",
    en: "Book Appointment",
    toneEN: "Book your appointment",
    toneAR: "احجز موعدك بكل سهولة",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 16,
    ar: "المحافظ الرقمية",
    en: "Digital Wallets",
    toneEN: "Manage your digital wallets",
    toneAR: "أدر محافظك الرقمية",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 17,
    ar: "بيان الخصوصية",
    en: "Privacy Notice",
    toneEN: "Read our privacy notice",
    toneAR: "اطّلع على بيان الخصوصية",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 18,
    ar: "التالي",
    en: "Next",
    toneEN: "Continue",
    toneAR: "متابعة",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 19,
    ar: "دخول",
    en: "Login",
    toneEN: "Sign in",
    toneAR: "سجّل الدخول",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
  {
    id: 20,
    ar: "مستخدم جديد",
    en: "New User",
    toneEN: "Create a new account",
    toneAR: "أنشئ حسابًا جديدًا",
    product: "KFH",
    audience: "General",
    source: "preset",
  },
];

let nextId = 21;

document.addEventListener("DOMContentLoaded", () => {
  renderGlossaryTable();
  updateNavStats();
});

function setSeg(key, value, clickedBtn) {
  state[key] = value;
  const control = clickedBtn.closest(".seg-control");
  control
    .querySelectorAll(".seg-control__btn")
    .forEach((btn) => btn.classList.remove("seg-control__btn--active"));
  clickedBtn.classList.add("seg-control__btn--active");
  if (key === "product") {
    const audienceSeg = document.getElementById("seg-audience");
    audienceSeg.innerHTML =
      value === "KFH"
        ? `<button class="seg-control__btn seg-control__btn--active" onclick="setSeg('audience','General',this)">General</button>
           <button class="seg-control__btn" onclick="setSeg('audience','Youth',this)">Youth</button>`
        : `<button class="seg-control__btn seg-control__btn--active" onclick="setSeg('audience','General',this)">General</button>
           <button class="seg-control__btn" onclick="setSeg('audience','TAM-Girls',this)">Girls</button>
           <button class="seg-control__btn" onclick="setSeg('audience','TAM-Boys',this)">Boys</button>`;
    state.audience = "General";
  }
  checkForDuplicate();
}

function onInput() {
  const value = document.getElementById("raw-input").value;
  const counter = document.getElementById("char-counter");
  counter.textContent = `${value.length} / 300`;
  counter.className =
    "char-counter" + (value.length > 250 ? " char-counter--warning" : "");
  if (value.trim().length > 2) checkForDuplicate();
  else hideDupeWarning();
}

function checkForDuplicate() {
  const query = document.getElementById("raw-input").value.trim().toLowerCase();
  const match = glossary.find(
    (entry) =>
      entry.en.toLowerCase().includes(query) ||
      entry.ar.includes(query) ||
      query.includes(entry.en.toLowerCase())
  );
  if (match) {
    document.getElementById(
      "dupe-warning-msg"
    ).textContent = `"${match.en}" / "${match.ar}" already in glossary — scroll down to see the approved version.`;
    document
      .getElementById("dupe-warning")
      .classList.add("dupe-warning--visible");
  } else {
    hideDupeWarning();
  }
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

  const generateBtn = document.getElementById("generate-btn");
  const spinner = document.getElementById("spinner");
  const generateIcon = document.getElementById("generate-icon");

  generateBtn.disabled = true;
  spinner.style.display = "block";
  generateIcon.style.display = "none";

  try {
    const result = await callTranslationAPI(inputText);
    state.resultEN = result.en;
    state.resultAR = result.ar;
    state.lastInput = inputText;

    const outputEnglish = document.getElementById("output-english");
    const outputArabic = document.getElementById("output-arabic");
    outputEnglish.textContent = result.en;
    outputEnglish.classList.add("lang-pane__output--has-result");
    outputArabic.textContent = result.ar;
    outputArabic.classList.add("lang-pane__output--has-result");

    const metaLabel = `${state.product} · ${state.audience} · ${state.type}`;
    document.getElementById("meta-english").textContent = metaLabel;
    document.getElementById("meta-arabic").textContent = metaLabel;

    document
      .getElementById("result-block")
      .classList.add("result-block--visible");
    document
      .getElementById("result-block")
      .scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    showToast("API error — check your connection", true);
  } finally {
    generateBtn.disabled = false;
    spinner.style.display = "none";
    generateIcon.style.display = "block";
  }
}

async function callTranslationAPI(inputText) {
  await new Promise((resolve) => setTimeout(resolve, 1300));
  return {
    en: `[API placeholder] KFH tone for: "${inputText}"`,
    ar: `[نتيجة مؤقتة] النبرة لـ: "${inputText}"`,
  };
}

function saveEntry() {
  if (!state.resultEN) return;
  const alreadyExists = glossary.find(
    (entry) => entry.en.toLowerCase() === state.resultEN.toLowerCase()
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
    source: "added",
  });
  state.todayCount++;
  state.currentPage = 1;
  updateNavStats();
  renderGlossaryTable();
  showToast("✅ Saved to glossary");
}

function copyLang(lang) {
  const text = lang === "en" ? state.resultEN : state.resultAR;
  navigator.clipboard.writeText(text).catch(() => {});
  showToast("📋 Copied");
}

function copyBoth() {
  navigator.clipboard
    .writeText(`EN: ${state.resultEN}\nAR: ${state.resultAR}`)
    .catch(() => {});
  showToast("📋 Both languages copied");
}

function setChip(clickedChip) {
  document
    .querySelectorAll(".filter-chip")
    .forEach((chip) => chip.classList.remove("filter-chip--active"));
  clickedChip.classList.add("filter-chip--active");
  state.filter = clickedChip.dataset.filter;
  state.currentPage = 1;
  renderGlossaryTable();
}

function onSearch() {
  state.searchQuery = document.getElementById("glossary-search").value;
  state.currentPage = 1;
  renderGlossaryTable();
}

function getFilteredRows() {
  const query = state.searchQuery.toLowerCase();
  const filter = state.filter;
  return glossary.filter((entry) => {
    const matchesSearch =
      !query ||
      entry.ar.includes(query) ||
      entry.en.toLowerCase().includes(query) ||
      entry.product.toLowerCase().includes(query) ||
      entry.audience.toLowerCase().includes(query);
    const matchesFilter =
      filter === "all"
        ? true
        : entry.product === filter ||
          entry.audience === filter ||
          entry.audience.startsWith(filter);
    return matchesSearch && matchesFilter;
  });
}

function renderGlossaryTable() {
  const filteredRows = getFilteredRows();
  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / state.perPage));
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  const startIndex = (state.currentPage - 1) * state.perPage;
  const pageRows = filteredRows.slice(startIndex, startIndex + state.perPage);
  const tableBody = document.getElementById("glossary-table-body");
  const emptyState = document.getElementById("glossary-empty-state");
  if (!pageRows.length) {
    tableBody.innerHTML = "";
    emptyState.style.display = "flex";
  } else {
    emptyState.style.display = "none";
    tableBody.innerHTML = pageRows
      .map((entry, index) => buildTableRow(entry, startIndex + index + 1))
      .join("");
    if (state.editingId) {
      setTimeout(() => {
        const focusTarget = document.getElementById(
          `edit-english-${state.editingId}`
        );
        if (focusTarget) {
          focusTarget.focus();
          focusTarget.select();
        }
      }, 30);
    }
  }
  renderPagination(totalRows, totalPages);
  updateNavStats();
}

function buildToneCell(entry) {
  return `<div class="glossary-grid__cell glossary-grid__cell--tone">
      <div class="tone-en">${esc(entry.toneEN || "—")}</div>
      <div class="tone-ar">${esc(entry.toneAR || "—")}</div>
    </div>`;
}

function buildTableRow(entry, rowNumber) {
  const editActions = `<div class="glossary-grid__cell glossary-grid__cell--actions">
      <button class="icon-btn icon-btn--confirm" onclick="saveRowEdit(${entry.id})" title="Save">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="icon-btn" onclick="cancelRowEdit()" title="Cancel">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>`;

  const viewActions = `<div class="glossary-grid__cell glossary-grid__cell--actions">
      <button class="icon-btn" onclick="startRowEdit(${entry.id})" title="Edit">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 9.5h2l5-5-2-2-5 5v2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M7 2.5l2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
      </button>
      <button class="icon-btn icon-btn--danger" onclick="deleteEntry(${entry.id})" title="Delete">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3.5h8M4.5 3.5V2h3v1.5M5 5.5v3.5M7 5.5v3.5M3 3.5l.5 6.5h5l.5-6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>`;

  if (state.editingId === entry.id) {
    return `<div class="glossary-grid__row glossary-grid__row--editing">
        <div class="glossary-grid__cell glossary-grid__cell--num">${rowNumber}</div>
        <div class="glossary-grid__cell"><input class="inline-edit-input inline-edit-input--arabic" id="edit-arabic-${
          entry.id
        }" value="${esc(entry.ar)}" dir="rtl"/></div>
        <div class="glossary-grid__cell"><input class="inline-edit-input" id="edit-english-${
          entry.id
        }" value="${esc(entry.en)}"/></div>
        ${buildToneCell(entry)}
        <div class="glossary-grid__cell"><input class="inline-edit-input" id="edit-product-${
          entry.id
        }" value="${esc(entry.product)}" style="font-size:12px"/></div>
        ${editActions}
      </div>`;
  }

  return `<div class="glossary-grid__row">
      <div class="glossary-grid__cell glossary-grid__cell--num">${rowNumber}</div>
      <div class="glossary-grid__cell cell--arabic">${esc(entry.ar)}</div>
      <div class="glossary-grid__cell cell--english">${esc(entry.en)}</div>
      ${buildToneCell(entry)}
      <div class="glossary-grid__cell">${buildProductBadge(entry.product)}</div>
      ${viewActions}
    </div>`;
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
  const newProduct = document
    .getElementById(`edit-product-${id}`)
    ?.value.trim();
  const newAudience = document
    .getElementById(`edit-audience-${id}`)
    ?.value.trim();
  if (!newArabic || !newEnglish) {
    showToast("Arabic and English are both required", true);
    return;
  }
  const entry = glossary.find((e) => e.id === id);
  if (entry) {
    entry.ar = newArabic;
    entry.en = newEnglish;
    entry.product = newProduct || entry.product;
    entry.audience = newAudience || entry.audience;
  }
  state.editingId = null;
  renderGlossaryTable();
  showToast("✏️ Entry updated");
}

function deleteEntry(id) {
  if (!confirm("Delete this glossary entry?")) return;
  glossary = glossary.filter((entry) => entry.id !== id);
  if (state.editingId === id) state.editingId = null;
  renderGlossaryTable();
  showToast("🗑️ Entry deleted");
}

function buildProductBadge(product) {
  return product === "TAM"
    ? '<span class="badge badge--tam">TAM</span>'
    : '<span class="badge badge--kfh">KFH</span>';
}

function buildAudienceBadge(audience) {
  if (audience === "Youth")
    return '<span class="badge badge--youth">Youth</span>';
  if (audience.startsWith("TAM"))
    return `<span class="badge badge--tam">${esc(audience)}</span>`;
  return '<span class="badge badge--general">General</span>';
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
      const isActive = page === state.currentPage;
      return `<button class="pagination__btn${
        isActive ? " pagination__btn--active" : ""
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
  const header = "ID,Arabic,English,KFH Tone EN,KFH Tone AR,Product,Audience\n";
  const rows = glossary
    .map(
      (e) =>
        `${e.id},"${e.ar}","${e.en}","${e.toneEN}","${e.toneAR}","${e.product}","${e.audience}"`
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
  showToast("📊 Exported as CSV");
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
