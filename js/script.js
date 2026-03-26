let map, pepiteIcon, currentBar;
let bars = [];

// ==================== INIT APP ====================
async function initApp() {
  try {
    const res = await fetch('data/bars.json');
    const data = await res.json();
    bars = data.bars || [];
    console.log(`✅ ${bars.length} bars chargés`);
    initMap();
  } catch (e) {
    console.error("Erreur chargement bars.json :", e);
  }
}

function initMap() {
  map = L.map('map', { zoomControl: true }).setView([47.2184, -1.5536], 13.5);

  L.tileLayer('https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=8b46d9f2ad30440aac72699d4746657c', {
    attribution: '&copy; Thunderforest & OpenStreetMap',
    maxZoom: 19
  }).addTo(map);

  pepiteIcon = L.icon({
    iconUrl: './assets/Pepite.png',
    iconSize: [42, 42],
    iconAnchor: [21, 21]
  });

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
  });

  console.log('✅ Carte prête avec marqueurs cliquables');
}

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
    bar.types.forEach(type => {
      const img = document.createElement('img');
      img.src = `./assets/${type}.png`;
      img.alt = type;
img.className = "w-10 h-10 hover:scale-110 transition-transform";
      img.title = type.replace(/-/g, ' ');
      img.onclick = () => {};
      typesContainer.appendChild(img);
    });
  } else {
    blockTypes.classList.add('hidden');
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

// ==================== AUTRES FONCTIONS ====================
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

// Recherche
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
      showBarModal(bar);
      document.getElementById('search-bar').value = '';
      suggestionsDiv.classList.add('hidden');
    };
    suggestionsDiv.appendChild(item);
  });

  if (filteredBars.length > 0) suggestionsDiv.classList.remove('hidden');
}

// ==================== EVENTS ====================
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