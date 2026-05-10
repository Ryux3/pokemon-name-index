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

const state = {
  query: "",
  selectedId: pokemon[0].id,
  activeLetter: "All",
  railIndex: -1,
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
};

const existingLetters = new Set(pokemon.map((item) => item.initial));

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
  updateRailActiveClasses();
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
  if (row) setSelected(row.dataset.id);
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
    elements.clear.click();
  }
});

renderRail();
render();
