const pokemon = window.POKEMON_DATA.map((item) => {
  const english = item.english || "";
  const japanese = item.japanese || "";
  return {
    ...item,
    initial: english[0].toUpperCase(),
    searchKey: toSearchKey(`${english} ${japanese} ${item.id}`),
  };
}).sort((a, b) => a.english.localeCompare(b.english));

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const typeColors = {
  normal: "#8a8f99",
  fire: "#e6532f",
  water: "#2874d9",
  electric: "#d69a00",
  grass: "#27864c",
  ice: "#2d9ab7",
  fighting: "#b44835",
  poison: "#8a55b5",
  ground: "#b87936",
  flying: "#5f7fc9",
  psychic: "#d83f75",
  bug: "#6d8f22",
  rock: "#8d7447",
  ghost: "#5e5aa0",
  dragon: "#4c68c9",
  dark: "#54505a",
  steel: "#697f8f",
  fairy: "#c95a96",
};

const favoriteStorageKey = "pokemon-name-index:favorites";

const state = {
  query: "",
  selectedId: pokemon[0].id,
  activeLetter: "All",
  railIndex: -1,
  favorites: loadFavorites(),
  modalOpen: false,
};

const elements = {
  rail: document.querySelector("#letterRail"),
  letterButtons: document.querySelector("#letterButtons"),
  bubble: document.querySelector("#letterBubble"),
  results: document.querySelector("#results"),
  search: document.querySelector("#searchInput"),
  clear: document.querySelector("#clearButton"),
  count: document.querySelector("#matchCount"),
  activeLetter: document.querySelector("#activeLetter"),
  detailNumber: document.querySelector("#detailNumber"),
  detailEnglish: document.querySelector("#detailEnglish"),
  detailJapanese: document.querySelector("#detailJapanese"),
  detailTypes: document.querySelector("#detailTypes"),
  copy: document.querySelector("#copyButton"),
  copyStatus: document.querySelector("#copyStatus"),
  favoritesBar: document.querySelector("#favoritesBar"),
  modal: document.querySelector("#detailModal"),
  modalNumber: document.querySelector("#modalNumber"),
  modalEnglish: document.querySelector("#modalEnglish"),
  modalJapanese: document.querySelector("#modalJapanese"),
  modalTypes: document.querySelector("#modalTypes"),
  modalBasics: document.querySelector("#modalBasics"),
  modalEvolution: document.querySelector("#modalEvolution"),
  modalTypeChart: document.querySelector("#modalTypeChart"),
  modalStats: document.querySelector("#modalStats"),
  favoriteButton: document.querySelector("#favoriteButton"),
  installButton: document.querySelector("#installButton"),
};

const existingLetters = new Set(pokemon.map((item) => item.initial));
const details = window.POKEMON_DETAILS || {};
const statLabels = [
  ["hp", "HP"],
  ["attack", "Attack"],
  ["defense", "Defense"],
  ["special-attack", "Sp. Atk"],
  ["special-defense", "Sp. Def"],
  ["speed", "Speed"],
];
const defenseOrder = ["4x", "2x", "1x", "1/2x", "1/4x", "0x"];
const typeEffectiveness = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};
let deferredInstallPrompt = null;

function toSearchKey(value) {
  return String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`´-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function padId(id) {
  return `#${String(id).padStart(4, "0")}`;
}

function normalize(value) {
  return toSearchKey(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text) {
  if (!state.query) return text;
  const compactQuery = state.query.replace(/\s/g, "");
  const regex = new RegExp(`(${escapeRegExp(compactQuery)})`, "ig");
  return text.replace(regex, '<mark class="highlight">$1</mark>');
}

function typeChip(type) {
  const color = typeColors[type.en] || "#627083";
  return `<span class="type-chip" style="--chip: ${color}">${type.ja}</span>`;
}

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(favoriteStorageKey) || "[]");
  } catch {
    return [];
  }
}

function saveFavorites() {
  localStorage.setItem(favoriteStorageKey, JSON.stringify(state.favorites));
}

function isFavorite(id) {
  return state.favorites.includes(Number(id));
}

function formatValue(value, suffix = "") {
  return value == null ? "-" : `${value}${suffix}`;
}

function getPokemonById(id) {
  return pokemon.find((item) => item.id === Number(id));
}

function filteredPokemon() {
  if (!state.query) return pokemon;
  return pokemon.filter((item) => item.searchKey.includes(state.query));
}

function renderRail() {
  elements.letterButtons.innerHTML = letters
    .map((letter) => {
      const disabled = existingLetters.has(letter) ? "" : "disabled";
      const active = state.activeLetter === letter ? " active" : "";
      return `<button class="letter-button${active}" type="button" data-letter="${letter}" ${disabled}>${letter}</button>`;
    })
    .join("");
  updateRailWave(state.railIndex);
}

function updateRailActiveClasses() {
  elements.letterButtons.querySelectorAll(".letter-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.letter === state.activeLetter);
  });
}

function renderResults() {
  const rows = filteredPokemon();
  elements.count.textContent = rows.length;
  elements.activeLetter.textContent = state.query ? "Search" : state.activeLetter;

  if (!rows.length) {
    elements.results.innerHTML = '<div class="empty-state">一致する英語名がありません</div>';
    return;
  }

  const grouped = rows.reduce((groups, item) => {
    groups[item.initial] ||= [];
    groups[item.initial].push(item);
    return groups;
  }, {});

  elements.results.innerHTML = Object.entries(grouped)
    .map(([letter, items]) => {
      const list = items
        .map(
          (item) => `
            <button class="result-row${item.id === state.selectedId ? " selected" : ""}" type="button" data-id="${item.id}">
              <span class="number">${padId(item.id)}</span>
              <span class="english-name">${highlight(item.english)}</span>
              <span class="japanese-name">${item.japanese}</span>
              <span class="type-list">${item.types.map(typeChip).join("")}</span>
            </button>
          `,
        )
        .join("");
      return `
        <div class="letter-section" id="section-${letter}" data-letter-section="${letter}">
          <div class="section-title">${letter}</div>
          ${list}
        </div>
      `;
    })
    .join("");
}

function renderFavorites() {
  const favorites = state.favorites.map(getPokemonById).filter(Boolean);
  if (!favorites.length) {
    elements.favoritesBar.hidden = true;
    elements.favoritesBar.innerHTML = "";
    return;
  }
  elements.favoritesBar.hidden = false;
  elements.favoritesBar.innerHTML = `
    <div class="favorites-title">Favorites</div>
    <div class="favorite-list">
      ${favorites
        .map(
          (item) => `
            <button class="favorite-chip" type="button" data-id="${item.id}">
              <span>${item.japanese}</span>
              <small>${item.english}</small>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderDetail() {
  const selected = pokemon.find((item) => item.id === state.selectedId) || filteredPokemon()[0] || pokemon[0];
  state.selectedId = selected.id;
  elements.detailNumber.textContent = padId(selected.id);
  elements.detailEnglish.textContent = selected.english;
  elements.detailJapanese.textContent = selected.japanese;
  elements.detailTypes.innerHTML = selected.types.map(typeChip).join("");
}

function render() {
  renderResults();
  renderDetail();
  renderFavorites();
  updateRailActiveClasses();
}

function defensiveChart(item) {
  const multipliers = Object.keys(typeColors).map((attackType) => {
    const multiplier = item.types.reduce((value, defendType) => {
      return value * (typeEffectiveness[attackType]?.[defendType.en] ?? 1);
    }, 1);
    return { attackType, multiplier };
  });

  const groups = Object.fromEntries(defenseOrder.map((key) => [key, []]));
  multipliers.forEach((entry) => {
    const key =
      entry.multiplier === 4
        ? "4x"
        : entry.multiplier === 2
          ? "2x"
          : entry.multiplier === 0.5
            ? "1/2x"
            : entry.multiplier === 0.25
              ? "1/4x"
              : entry.multiplier === 0
                ? "0x"
                : "1x";
    groups[key].push(entry.attackType);
  });
  return groups;
}

function renderModal(item) {
  const detail = details[item.id] || {};
  const stats = detail.stats || {};
  const total = statLabels.reduce((sum, [key]) => sum + (stats[key] || 0), 0);
  const abilities = detail.abilities?.length
    ? detail.abilities
        .map(
          (ability) => `
            <div class="ability-line">
              <strong>${ability.ja}${ability.hidden ? "（隠れ）" : ""}</strong>
              <span>${ability.effect || "効果説明は未収録です。"}</span>
            </div>
          `,
        )
        .join("")
    : "-";
  const favorite = isFavorite(item.id);

  elements.modalNumber.textContent = padId(item.id);
  elements.modalEnglish.textContent = item.english;
  elements.modalJapanese.textContent = item.japanese;
  elements.modalTypes.innerHTML = item.types.map(typeChip).join("");
  elements.favoriteButton.classList.toggle("active", favorite);
  elements.favoriteButton.setAttribute("aria-label", favorite ? "お気に入りから外す" : "お気に入りに追加");

  elements.modalBasics.innerHTML = `
    <div><span>National Dex</span><strong>${padId(item.id).replace("#", "")}</strong></div>
    <div><span>Height</span><strong>${formatValue(detail.height, " m")}</strong></div>
    <div><span>Weight</span><strong>${formatValue(detail.weight, " kg")}</strong></div>
    <div><span>Base EXP</span><strong>${formatValue(detail.baseExperience)}</strong></div>
    <div><span>Catch Rate</span><strong>${formatValue(detail.catchRate)}</strong></div>
    <div><span>Base Friendship</span><strong>${formatValue(detail.baseFriendship)}</strong></div>
    <div class="wide"><span>Abilities</span><strong>${abilities}</strong></div>
  `;

  const evolutions = detail.evolutions || [];
  const familyEvolutions = detail.familyEvolutions?.length
    ? detail.familyEvolutions
    : evolutions.length
      ? [{ sourceId: item.id, sourceEnglish: item.english, sourceJapanese: item.japanese, methods: evolutions }]
      : [];
  elements.modalEvolution.innerHTML = familyEvolutions.length
    ? familyEvolutions
        .map(
          (entry) => `
            <div class="evolution-family">
              <strong>${padId(entry.sourceId)} ${entry.sourceJapanese} <span>${entry.sourceEnglish}</span></strong>
              ${entry.methods.map((text) => `<p>${text}</p>`).join("")}
            </div>
          `,
        )
        .join("")
    : "<div>Pokemon Unbound上の進化方法データはありません。</div>";

  const chart = defensiveChart(item);
  elements.modalTypeChart.innerHTML = defenseOrder
    .map(
      (label) => `
        <div class="chart-column">
          <strong>${label}</strong>
          <div>${chart[label].length ? chart[label].map((type) => typeChip({ en: type, ja: typeJaName(type) })).join("") : "<span class=\"none\">-</span>"}</div>
        </div>
      `,
    )
    .join("");

  elements.modalStats.innerHTML =
    statLabels
      .map(([key, label]) => {
        const value = stats[key] || 0;
        return `
          <div class="stat-row">
            <span>${label}</span>
            <div class="stat-track"><i style="width: ${Math.min(100, (value / 180) * 100)}%"></i></div>
            <strong>${value || "-"}</strong>
          </div>
        `;
      })
      .join("") +
    `
      <div class="stat-row total">
        <span>Total</span>
        <div class="stat-track"><i style="width: ${Math.min(100, (total / 720) * 100)}%"></i></div>
        <strong>${total || "-"}</strong>
      </div>
    `;
}

function typeJaName(type) {
  const sample = pokemon.find((item) => item.types.some((entry) => entry.en === type));
  return sample?.types.find((entry) => entry.en === type)?.ja || type;
}

function openModal(id) {
  const item = getPokemonById(id);
  if (!item) return;
  state.selectedId = item.id;
  state.modalOpen = true;
  renderDetail();
  renderModal(item);
  elements.modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal() {
  state.modalOpen = false;
  elements.modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function toggleFavorite(id) {
  const numericId = Number(id);
  state.favorites = isFavorite(numericId)
    ? state.favorites.filter((favoriteId) => favoriteId !== numericId)
    : [numericId, ...state.favorites].slice(0, 30);
  saveFavorites();
  renderFavorites();
  const item = getPokemonById(numericId);
  if (item && state.modalOpen) renderModal(item);
}

function jumpToLetter(letter, options = {}) {
  if (!existingLetters.has(letter)) return;
  const wasSearching = Boolean(state.query);
  state.query = "";
  state.activeLetter = letter;
  state.selectedId = pokemon.find((item) => item.initial === letter)?.id || state.selectedId;
  elements.search.value = "";
  if (options.drag && !wasSearching) {
    elements.count.textContent = pokemon.length;
    elements.activeLetter.textContent = letter;
    renderDetail();
    updateRailActiveClasses();
  } else {
    render();
  }
  if (!options.skipScroll) {
    requestAnimationFrame(() => {
      document.querySelector(`#section-${letter}`)?.scrollIntoView({ block: "start" });
    });
  }
}

function setSelected(id) {
  state.selectedId = Number(id);
  elements.copyStatus.textContent = "";
  render();
}

function railIndexFromPointer(event) {
  const rect = elements.letterButtons.getBoundingClientRect();
  const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
  return Math.min(letters.length - 1, Math.max(0, Math.floor((y / rect.height) * letters.length)));
}

function updateRailWave(index) {
  state.railIndex = index;
  const buttons = [...elements.letterButtons.querySelectorAll(".letter-button")];
  buttons.forEach((button, buttonIndex) => {
    if (index < 0) {
      button.style.setProperty("--wave", "0");
      return;
    }
    const distance = Math.abs(buttonIndex - index);
    const wave = Math.max(0, 1 - distance / 4);
    button.style.setProperty("--wave", wave.toFixed(3));
  });

  if (index >= 0) {
    const letter = letters[index];
    const rect = elements.letterButtons.getBoundingClientRect();
    const y = ((index + 0.5) / letters.length) * rect.height;
    elements.rail.style.setProperty("--bubble-y", `${y}px`);
    elements.bubble.textContent = letter;
  }
}

function handleRailPointer(event) {
  event.preventDefault();
  const index = railIndexFromPointer(event);
  const letter = letters[index];
  updateRailWave(index);
  if (letter && letter !== state.activeLetter) jumpToLetter(letter, { drag: true });
}

elements.search.addEventListener("input", (event) => {
  state.query = normalize(event.target.value);
  state.activeLetter = state.query ? "Search" : "All";
  const first = filteredPokemon()[0];
  if (first) state.selectedId = first.id;
  render();
});

elements.clear.addEventListener("click", () => {
  elements.search.value = "";
  state.query = "";
  state.activeLetter = "All";
  state.selectedId = pokemon[0].id;
  elements.search.focus();
  render();
  window.scrollTo({ top: 0 });
});

elements.rail.addEventListener("click", (event) => {
  const button = event.target.closest(".letter-button");
  if (button?.dataset.letter) jumpToLetter(button.dataset.letter);
});

elements.rail.addEventListener("pointerdown", (event) => {
  elements.rail.classList.add("is-touching");
  elements.rail.setPointerCapture(event.pointerId);
  handleRailPointer(event);
});

elements.rail.addEventListener("pointermove", (event) => {
  if (!elements.rail.classList.contains("is-touching")) return;
  handleRailPointer(event);
});

function releaseRailPointer() {
  elements.rail.classList.remove("is-touching");
  updateRailWave(-1);
  renderResults();
}

elements.rail.addEventListener("pointerup", releaseRailPointer);
elements.rail.addEventListener("pointercancel", releaseRailPointer);
elements.rail.addEventListener("lostpointercapture", releaseRailPointer);

elements.results.addEventListener("click", (event) => {
  const row = event.target.closest(".result-row");
  if (row) {
    setSelected(row.dataset.id);
    openModal(row.dataset.id);
  }
});

elements.favoritesBar.addEventListener("click", (event) => {
  const chip = event.target.closest(".favorite-chip");
  if (chip) openModal(chip.dataset.id);
});

elements.favoriteButton.addEventListener("click", () => {
  toggleFavorite(state.selectedId);
});

elements.modal.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-modal]")) closeModal();
});

elements.copy.addEventListener("click", async () => {
  const selected = pokemon.find((item) => item.id === state.selectedId);
  if (!selected) return;
  try {
    await navigator.clipboard.writeText(selected.japanese);
    elements.copyStatus.textContent = `${selected.japanese} をコピーしました`;
  } catch {
    elements.copyStatus.textContent = selected.japanese;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== elements.search) {
    event.preventDefault();
    elements.search.focus();
    elements.search.select();
  }
  if (event.key === "Escape") {
    if (state.modalOpen) closeModal();
    else elements.clear.click();
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  elements.installButton.hidden = false;
});

elements.installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  elements.installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  elements.installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

renderRail();
render();
