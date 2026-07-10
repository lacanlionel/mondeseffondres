// ---------------------------------------------------------------
// Carte — même esthétique que le prototype : tuiles vectorielles
// OpenFreeMap repeintes dans la palette du site (papier / encre /
// verdigris / ochre), sans dépendance à une clé API.
// ---------------------------------------------------------------
const CENTER = [4.439712, 44.045885]; // [lng, lat]

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: CENTER,
  zoom: 17,
  pitch: 0
});

// Outils de navigation groupés en bas à droite (zoom + boussole + géolocalisation)
map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

const geolocate = new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  showAccuracyCircle: true,
  showUserHeading: true
});
map.addControl(geolocate, 'bottom-right');

function repaintStyle() {
  const layers = map.getStyle().layers;
  layers.forEach(layer => {
    const id = layer.id;
    try {
      if (layer.type === 'background') {
        map.setPaintProperty(id, 'background-color', '#ECE4D3');
      } else if (layer.type === 'fill') {
        if (/water/i.test(id)) {
          map.setPaintProperty(id, 'fill-color', '#B9C7C0');
        } else if (/park|wood|forest|landuse|land|vegetation|grass/i.test(id)) {
          map.setPaintProperty(id, 'fill-color', '#D9D2BB');
        } else if (/building/i.test(id)) {
          map.setPaintProperty(id, 'fill-color', '#D8CDB4');
        }
      } else if (layer.type === 'line') {
        if (/water|river|stream/i.test(id)) {
          map.setPaintProperty(id, 'line-color', '#8FA79D');
        } else if (/road|street|highway|path|track/i.test(id)) {
          map.setPaintProperty(id, 'line-color', '#B7A98A');
        } else if (/building/i.test(id)) {
          map.setPaintProperty(id, 'line-color', '#C4B896');
        }
      } else if (layer.type === 'symbol') {
        if (/poi|place|label/i.test(id)) {
          map.setPaintProperty(id, 'text-color', '#8A7E60');
          map.setPaintProperty(id, 'text-halo-color', '#ECE4D3');
        }
      }
    } catch (e) { /* propriété absente pour ce type de calque : on ignore */ }
  });
}

// ---------------------------------------------------------------
// Encart GPS utilisateur (bas gauche)
// ---------------------------------------------------------------
const gpsCoordsEl = document.getElementById('gpsCoords');

function formatCoords(lat, lng) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

geolocate.on('geolocate', (e) => {
  const { latitude, longitude } = e.coords;
  gpsCoordsEl.textContent = formatCoords(latitude, longitude);
});

geolocate.on('error', () => {
  gpsCoordsEl.textContent = 'position indisponible';
});

map.on('load', () => {
  repaintStyle();
  // les repères photo sont ajoutés au DOM avant le déclenchement du
  // suivi GPS, pour qu'ils restent au-dessus du point utilisateur
  loadPhotos();
  geolocate.trigger();
});

// ---------------------------------------------------------------
// Marqueurs photo + popup sobre
// ---------------------------------------------------------------
function popupHTML(props, lng, lat) {
  return `
    <div class="popup-card">
      <button class="popup-photo-btn" data-src="${props.image}" data-title="${props.title}" title="Agrandir">
        <img src="${props.image}" alt="${props.title}">
      </button>
      <div class="popup-caption">
        <div class="popup-title">${props.title}</div>
        <div class="popup-note">${props.note}</div>
        <div class="popup-footer">
          <span>${formatCoords(lat, lng)}</span>
          <span>${props.year}</span>
        </div>
      </div>
    </div>`;
}

async function loadPhotos() {
  let data;
  try {
    const res = await fetch('data/photos.geojson');
    if (!res.ok) throw new Error(`HTTP ${res.status} sur data/photos.geojson`);
    data = await res.json();
  } catch (err) {
    console.error('Impossible de charger data/photos.geojson :', err);
    return;
  }

  data.features.forEach((feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;

    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = `url(${props.image})`;
    // sécurité en plus du CSS : le repère photo doit toujours passer
    // au-dessus du point GPS / cercle de précision, et rester cliquable
    el.style.zIndex = '50';
    el.style.pointerEvents = 'auto';

    el.addEventListener('click', () => {
      const popup = new maplibregl.Popup({
        offset: 22,
        closeButton: true,
        maxWidth: '240px'
      })
        .setLngLat([lng, lat])
        .setHTML(popupHTML(props, lng, lat))
        .addTo(map);

      const btn = popup.getElement().querySelector('.popup-photo-btn');
      if (btn) {
        btn.addEventListener('click', () => openFullscreen(btn.dataset.src));
        const img = btn.querySelector('img');
        if (img) {
          img.addEventListener('error', () => {
            console.error('Image introuvable :', img.src);
            btn.textContent = 'Image introuvable — vérifier le chemin/casse du fichier';
            btn.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:12px;text-align:center;font-size:11px;color:var(--paper-dim);';
          }, { once: true });
        }
      }
    });

    new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);
  });
}

// ---------------------------------------------------------------
// Visionneuse plein écran : zoom (doigt / trackpad / boutons)
// ---------------------------------------------------------------
const fsViewer = document.getElementById('fsViewer');
const fsStage = document.getElementById('fsStage');
const fsImage = document.getElementById('fsImage');
const fsClose = document.getElementById('fsClose');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');

const MIN_SCALE = 1;
const MAX_SCALE = 6;

let scale = 1, posX = 0, posY = 0;
let startDist = 0, startScale = 1;
let dragging = false, dragOrigin = { x: 0, y: 0 }, posOrigin = { x: 0, y: 0 };
const pointers = new Map();

function applyTransform() {
  fsImage.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
}

function resetTransform() {
  scale = 1; posX = 0; posY = 0;
  applyTransform();
}

function clampScale(s) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

function openFullscreen(src) {
  fsImage.src = src;
  resetTransform();
  fsViewer.classList.add('open');
}

function closeFullscreen() {
  fsViewer.classList.remove('open');
  fsImage.src = '';
  pointers.clear();
  startDist = 0;
  dragging = false;
}

fsClose.addEventListener('click', closeFullscreen);
fsViewer.addEventListener('click', (e) => {
  if (e.target === fsViewer) closeFullscreen();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && fsViewer.classList.contains('open')) closeFullscreen();
});

// Zoom trackpad / molette
fsViewer.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = -e.deltaY * 0.0025;
  scale = clampScale(scale + delta);
  if (scale === MIN_SCALE) { posX = 0; posY = 0; }
  applyTransform();
}, { passive: false });

// Boutons loupe
zoomInBtn.addEventListener('click', () => {
  scale = clampScale(scale + 0.6);
  applyTransform();
});
zoomOutBtn.addEventListener('click', () => {
  scale = clampScale(scale - 0.6);
  if (scale === MIN_SCALE) { posX = 0; posY = 0; }
  applyTransform();
});

// Double-clic / double-tap
fsStage.addEventListener('dblclick', () => {
  if (scale > MIN_SCALE) {
    resetTransform();
  } else {
    scale = 2.5;
    applyTransform();
  }
});

// Pincement (doigts) + glisser pour déplacer une fois zoomé
fsStage.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1 && scale > MIN_SCALE) {
    dragging = true;
    dragOrigin = { x: e.clientX, y: e.clientY };
    posOrigin = { x: posX, y: posY };
  }
});

fsStage.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size === 2) {
    const pts = Array.from(pointers.values());
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (startDist === 0) {
      startDist = dist;
      startScale = scale;
    } else {
      scale = clampScale(startScale * (dist / startDist));
      applyTransform();
    }
  } else if (dragging && pointers.size === 1 && scale > MIN_SCALE) {
    posX = posOrigin.x + (e.clientX - dragOrigin.x);
    posY = posOrigin.y + (e.clientY - dragOrigin.y);
    applyTransform();
  }
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) startDist = 0;
  if (pointers.size === 0) dragging = false;
}
fsStage.addEventListener('pointerup', endPointer);
fsStage.addEventListener('pointercancel', endPointer);
fsStage.addEventListener('pointerleave', endPointer);
