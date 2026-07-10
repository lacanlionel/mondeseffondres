// --- Secteur : Saint-Quentin-la-Poterie, Gard (30700) ---
// Les points sont lus depuis data/photos.geojson (GeoJSON = format pérenne,
// éditable à la main ou généré depuis un GPX / des EXIF de photos).
const CENTER = [4.4413, 44.0454];
const GEOJSON_URL = 'data/photos.geojson';

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: CENTER,
  zoom: 16,
  pitch: 0,
  attributionControl: true,
});

// Boussole + zoom
map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'bottom-right');

// "Vous êtes ici" : point de position + cercle de précision + suivi du cap
const geolocate = new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  showAccuracyCircle: true,
  showUserLocation: true,
  showUserHeading: true,
});
map.addControl(geolocate, 'bottom-right');

const panel = document.getElementById('panel');
const panelBody = document.getElementById('panelBody');
const closeBtn = document.getElementById('closeBtn');
let activeEl = null;

function openPanel(props, lng, lat, el){
  if (activeEl) activeEl.classList.remove('active');
  el.classList.add('active');
  activeEl = el;

  panelBody.innerHTML = `
    <div class="photo" style="background-image:url('${props.image}')">
      <div class="frame-no">N° ${String(props.id).padStart(3, '0')}</div>
    </div>
    <div class="info">
      <div class="cat">Relevé ${props.year}</div>
      <h2>${props.title}</h2>
      <p>${props.note}</p>
      <div class="coords">${lat.toFixed(5)}° N · ${lng.toFixed(5)}° E</div>
    </div>
  `;
  panel.classList.add('open');
  map.easeTo({ center: [lng, lat], duration: 500 });
}

closeBtn.addEventListener('click', () => {
  panel.classList.remove('open');
  if (activeEl) activeEl.classList.remove('active');
  activeEl = null;
});

map.on('load', () => {
  // Déclenche la géolocalisation automatiquement à l'arrivée sur la page
  geolocate.trigger();

  // Repeindre le style OpenFreeMap dans notre palette, sans dépendre des noms exacts de calques
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
    } catch (e) { /* certaines propriétés n'existent pas selon le type de calque : on ignore */ }
  });

  // Chargement des points-photos depuis le GeoJSON
  fetch(GEOJSON_URL)
    .then(res => res.json())
    .then(fc => {
      fc.features.forEach(f => {
        const [lng, lat] = f.geometry.coordinates;
        const props = f.properties;

        const el = document.createElement('div');
        el.className = 'marker';
        el.addEventListener('click', () => openPanel(props, lng, lat, el));

        new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
      });
    })
    .catch(err => console.error('Impossible de charger data/photos.geojson', err));
});
