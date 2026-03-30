let map, pepiteIcon, currentBar;
let bars = [];
let markers = [];
let filterState = {
  types: [],
  happyHour: false,
  priceMin: 0,
  priceMax: 10,
  fermeApres2h: false,
  notes: ['Pépite', 'A', 'B', 'C', 'D']
};
let priceRange = { min: 0, max: 20 };

const BAR_TYPES = ['Tous', 'Bar à fléchette', 'Bar dansant', 'Bar à cocktail', 'Guinguette', 'Pub', 'Bar à jeux', 'Terrasse au soleil'];
const TYPE_MAP = {
  'Bar à fléchette': 'flechettes', 'Bar dansant': 'bar-dansant',
  'Bar à cocktail': 'cocktail', 'Guinguette': 'guinguette',
  'Pub': 'pub', 'Bar à jeux': 'jeux', 'Terrasse au soleil': 'terrasse-au-soleil'
};
const NOTE_COLORS = {
  'A': { bg: '#306629', text: '#fef8f5' }, 'B': { bg: '#b5dabe', text: '#fef8f5' },
  'C': { bg: '#f4c280', text: '#fef8f5' }, 'D': { bg: '#d66643', text: '#fef8f5' },
};

// ==================== INIT APP ====================
async function initApp() {
  try {
    const res = await fetch('data/bars.json');
    const data = await res.json();
    bars = data.bars || [];
    console.log(`✅ ${bars.length} bars chargés`);

    // Calculate price range from actual data
    const prices = bars.map(b => parsePrice(b.pdlmc_price)).filter(p => p > 0);
    if (prices.length) {
      priceRange.min = Math.floor(Math.min(...prices) * 2) / 2;
      priceRange.max = Math.ceil(Math.max(...prices) * 2) / 2;
      filterState.priceMin = priceRange.min;
      filterState.priceMax = priceRange.max;
    }

    // Initialize in correct order
    initMap();
    initFilters();
    initFilterUI();
    console.log('✅ App initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing app:', error);
  }
}

// Price sliders initialization
function initFilters() {
  const minSlider = document.getElementById('price-min');
  const maxSlider = document.getElementById('price-max');
  const priceDisplay = document.getElementById('price-display');

  if (!minSlider || !maxSlider) {
    console.error('Price sliders not found in DOM');
    return;
  }

  // Set initial values
  minSlider.min = maxSlider.min = priceRange.min;
  minSlider.max = maxSlider.max = priceRange.max;
  minSlider.value = filterState.priceMin;
  maxSlider.value = filterState.priceMax;
  updatePriceDisplay();

  // Min slider event
  minSlider.addEventListener('input', () => {
    if (parseFloat(minSlider.value) > parseFloat(maxSlider.value)) {
      minSlider.value = maxSlider.value;
    }
    filterState.priceMin = parseFloat(minSlider.value);
    updatePriceDisplay();
    filterMarkers();
  });

  // Max slider event
  maxSlider.addEventListener('input', () => {
    if (parseFloat(maxSlider.value) < parseFloat(minSlider.value)) {
      maxSlider.value = minSlider.value;
    }
    filterState.priceMax = parseFloat(maxSlider.value);
    updatePriceDisplay();
    filterMarkers();
  });
}

function updatePriceDisplay() {
  const display = document.getElementById('price-display');
  if (display) display.textContent = `${filterState.priceMin.toFixed(1)}€ — ${filterState.priceMax.toFixed(1)}€`;
  const range = priceRange.max - priceRange.min;
  if (!range) return;
  const fill = document.getElementById('range-fill');
  if (fill) {
    const minPct = ((filterState.priceMin - priceRange.min) / range) * 100;
    const maxPct = ((filterState.priceMax - priceRange.min) / range) * 100;
    fill.style.left = minPct + '%';
    fill.style.width = (maxPct - minPct) + '%';
  }
}

// Initialize map with Leaflet
function initMap() {

map = L.map('map', {
  zoomControl: true,
  preferCanvas: true,
  fadeAnimation: false,
  zoomAnimation: false,
  markerZoomAnimation: false
}).setView([47.2184, -1.5536], 13.5);

  L.tileLayer('https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=8b46d9f2ad30440aac72699d4746657c', {
    attribution: '&copy; Thunderforest & OpenStreetMap',
    maxZoom: 19
  }).addTo(map);

  pepiteIcon = L.icon({
    iconUrl: './assets/Pepite.png',
    iconSize: [42, 42],
    iconAnchor: [21, 21]
  });

  // Add all bar markers
  bars.forEach(bar => {
    let marker;

    if (bar.isPépite) {
      marker = L.marker([bar.lat, bar.lng], { icon: pepiteIcon });
    } else {
      const html = `<div class="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg border-2 border-white" style="background-color:${bar.color}">${bar.rating}</div>`;
      const icon = L.divIcon({
        className: 'custom-marker',
        html: html,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      marker = L.marker([bar.lat, bar.lng], { icon });
    }

    marker.on('click', () => showBarModal(bar));
    marker.addTo(map);
    markers.push({ marker, bar });
  });

  // Add filter button control
  const FilterControl = L.Control.extend({
    onAdd: function() {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      const btn = L.DomUtil.create('button', 'leaflet-filter-btn', container);
      btn.title = 'Filtres';
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="9" cy="6" r="3" fill="currentColor"/>
        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="15" cy="12" r="3" fill="currentColor"/>
        <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="9" cy="18" r="3" fill="currentColor"/>
      </svg>`;
      L.DomEvent.on(btn, 'click', e => { L.DomEvent.stopPropagation(e); toggleFilterPanel(); });
      L.DomEvent.disableClickPropagation(container);
      return container;
    }
  });
  new FilterControl({ position: 'topleft' }).addTo(map);
  console.log('✅ Map ready with clickable markers');
}

// Show bar details modal
function showBarModal(bar) {
  currentBar = bar;

  document.getElementById('modal-name').textContent = bar.name;

  const ratingEl = document.getElementById('modal-rating');
  if (bar.isPépite) {
    ratingEl.innerHTML = `<img src="./assets/Pepite.png" class="w-16 h-16" alt="Pépite">`;
  } else {
    ratingEl.textContent = bar.rating;
    ratingEl.style.color = bar.color || '#000';
  }

  document.getElementById('modal-price').textContent = bar.pdlmc_price;
  document.getElementById('modal-desc').innerHTML = (bar.description || '') + ' <i>... lire la suite sur Instagram</i>';

  document.getElementById('modal-ig').href = bar.ig_link;
  document.getElementById('modal-photo').src = bar.photos && bar.photos[0]
    ? bar.photos[0]
    : 'https://placehold.co/800x600/cccccc/333333?text=Photo+non+disponible';

  renderModalInfo(bar);

  document.getElementById('bar-modal').classList.remove('hidden');
}

function renderModalInfo(bar) {
  const typesContainer = document.getElementById('modal-types');
  typesContainer.innerHTML = '';
const blockTypes = document.getElementById('block-types');
if (bar.types && bar.types.length > 0) {
  blockTypes.classList.remove('hidden');
} else {
  blockTypes.classList.add('hidden');
}
  if (bar.types && bar.types.length > 0) {
    bar.types.forEach(type => {
      const img = document.createElement('img');
      img.src = `./assets/${type}.png`;
      img.alt = type;
      img.className = "w-10 h-10 hover:scale-110 transition-transform";
      img.title = type.replace(/-/g, ' ');
      typesContainer.appendChild(img);
    });
  }

  const infoContainer = document.getElementById('modal-extra-info');
  let html = '';
  if (bar.hasHappyHour === true) html += `
    <div class="flex items-baseline gap-2">
      <span class="text-xs tracking-widest text-zinc-500">HAPPY HOURS</span>
      <span class="text-zinc-800">${bar.happyHourTimes || ''}</span>
    </div>`;

  if (bar.closesAt) html += `
    <div class="flex items-baseline gap-2">
      <span class="text-xs tracking-widest text-zinc-500">FERMETURE</span>
      <span class="text-zinc-800">${bar.closesAt}</span>
    </div>`;
  infoContainer.innerHTML = html;
}

// ==================== FILTER UI INITIALIZATION ====================
function initFilterUI() {
  // Type filters
  const typeList = document.getElementById('filter-type-list');
  if (typeList) {
    BAR_TYPES.forEach(type => {
      const item = document.createElement('div');
      item.className = 'filter-type-item' + (type === 'Tous' ? ' active' : '');
      item.textContent = type;
      item.onclick = () => {
        if (type === 'Tous') {
          filterState.types = [];
          document.querySelectorAll('.filter-type-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
        } else {
          document.querySelector('.filter-type-item').classList.remove('active');
          item.classList.toggle('active');
          const mapped = TYPE_MAP[type];
          const idx = filterState.types.indexOf(mapped);
          if (idx > -1) filterState.types.splice(idx, 1);
          else filterState.types.push(mapped);
          if (filterState.types.length === 0) {
            document.querySelector('.filter-type-item').classList.add('active');
          }
        }
        filterMarkers();
      };
      typeList.appendChild(item);
    });
  }

  // Note/Rating filters
  const notesList = document.getElementById('filter-notes-list');
  if (notesList) {
    const noteList = ['Pépite', 'A', 'B', 'C', 'D'];

    noteList.forEach(note => {
      const btn = document.createElement('button');
      btn.className = 'note-btn';
      btn.textContent = note;

if (note === 'Pépite') {
  btn.textContent = '';
  btn.style.background = '#fef3c7';
  const img = document.createElement('img');
  img.src = './assets/Pepite.png';
  img.style.width = '28px';
  img.style.height = '28px';
  img.style.objectFit = 'contain';
  btn.appendChild(img);
} else {
  btn.textContent = note;
  btn.style.background = NOTE_COLORS[note].bg;
  btn.style.color = NOTE_COLORS[note].text;
}

      btn.dataset.note = note;
      btn.onclick = () => {
        const idx = filterState.notes.indexOf(note);
        if (idx > -1) {
          if (filterState.notes.length > 1) {
            filterState.notes.splice(idx, 1);
            btn.classList.add('inactive');
          }
        } else {
          filterState.notes.push(note);
          btn.classList.remove('inactive');
        }
        filterMarkers();
      };
      notesList.appendChild(btn);
    });
  }
}

// ==================== MODAL FUNCTIONS ====================
function closeModal() {
  document.getElementById('bar-modal').classList.add('hidden');
}

function openDonationModal() {
  document.getElementById('donation-modal').classList.remove('hidden');
}

function closeDonationModal() {
  document.getElementById('donation-modal').classList.add('hidden');
}

function donate(amount) {
  alert(`🎉 Merci pour ton don de ${amount} € !`);
  closeDonationModal();
}

function donateCustom() {
  const val = document.getElementById('custom-amount').value;
  if (val && parseFloat(val) > 0) donate(val);
  else alert("Entre un montant valide 🙂");
}

// ==================== SEARCH FUNCTION ====================
function showSuggestions(input) {
  const suggestionsDiv = document.getElementById('search-suggestions');
  suggestionsDiv.innerHTML = '';
  suggestionsDiv.classList.add('hidden');

  if (input.length < 2) return;

  const filteredBars = bars.filter(bar => bar.name.toLowerCase().includes(input.toLowerCase()));

  filteredBars.forEach(bar => {
    const item = document.createElement('div');
    item.className = 'px-4 py-2 hover:bg-emerald-100 cursor-pointer text-zinc-900';
    item.textContent = bar.name;
item.onclick = () => {
  map.setView([bar.lat, bar.lng], 16, { animate: true, duration: 0.8 });
  setTimeout(() => showBarModal(bar), 900);
  document.getElementById('search-bar').value = '';
  suggestionsDiv.classList.add('hidden');
};
    suggestionsDiv.appendChild(item);
  });

  if (filteredBars.length > 0) suggestionsDiv.classList.remove('hidden');
}

// ==================== HELPER FUNCTIONS ====================
function parsePrice(str) {
  if (!str) return 0;
  return parseFloat(str.replace(',', '.').replace(/[€\s]/g, '')) || 0;
}

function parseHour(closesAt) {
  if (!closesAt) return -1;
  return parseInt(closesAt.split(':')[0]);
}

// Filter markers based on current filter state
function filterMarkers() {
  markers.forEach(({ marker, bar }) => {
    const price = parsePrice(bar.pdlmc_price);
    const typeOk = filterState.types.length === 0 || (bar.types && filterState.types.some(t => bar.types.includes(t)));
    const hhOk = !filterState.happyHour || bar.hasHappyHour === true;
    const priceOk = !price || (price >= filterState.priceMin && price <= filterState.priceMax);
    const h = parseHour(bar.closesAt);
    const fermeOk = !filterState.fermeApres2h || (h >= 2 && h <= 8);
    const noteOk = filterState.notes.includes(bar.isPépite ? 'Pépite' : bar.rating);
    const visible = typeOk && hhOk && priceOk && fermeOk && noteOk;
    if (visible) { if (!map.hasLayer(marker)) marker.addTo(map); }
    else { if (map.hasLayer(marker)) map.removeLayer(marker); }
  });
}

function onFilterChange() {
  filterState.happyHour = document.getElementById('filter-hh').checked;
  filterState.fermeApres2h = document.getElementById('filter-ferme').checked;
  filterMarkers();
}

function toggleFilterPanel() {
  document.getElementById('filter-panel').classList.toggle('open');
  document.getElementById('filter-overlay').classList.toggle('open');
}

function resetFilters() {
  filterState = { types: [], happyHour: false, priceMin: priceRange.min, priceMax: priceRange.max, fermeApres2h: false, notes: ['Pépite', 'A', 'B', 'C', 'D'] };
  document.querySelectorAll('.filter-type-item').forEach((el, i) => el.classList.toggle('active', i === 0));
  document.getElementById('filter-hh').checked = false;
  document.getElementById('filter-ferme').checked = false;
  const minSlider = document.getElementById('price-min');
  const maxSlider = document.getElementById('price-max');
  if (minSlider) minSlider.value = priceRange.min;
  if (maxSlider) maxSlider.value = priceRange.max;
  updatePriceDisplay();
  document.querySelectorAll('.note-btn').forEach(btn => btn.classList.remove('inactive'));
  filterMarkers();
}

// ==================== EVENT LISTENERS ====================
window.addEventListener('load', initApp);

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-bar');
  if (searchInput) searchInput.addEventListener('input', (e) => showSuggestions(e.target.value));
});

document.addEventListener('keydown', e => {
  if (e.key === "Escape") {
    document.getElementById('bar-modal').classList.add('hidden');
    document.getElementById('donation-modal').classList.add('hidden');
  }
});
