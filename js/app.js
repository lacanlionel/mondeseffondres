
const map=new maplibregl.Map({
container:'map',
style:'https://tiles.openfreemap.org/styles/positron',
center:[4.4399,44.0458],
zoom:17
});

map.addControl(new maplibregl.NavigationControl({
showCompass:true,
visualizePitch:true
}),'bottom-right');

fetch('photos.geojson').then(r=>r.json()).then(data=>{
data.features.forEach(f=>{
const el=document.createElement('div');
el.className='marker';
new maplibregl.Marker({element:el})
.setLngLat(f.geometry.coordinates)
.addTo(map);

el.onclick=()=>{
document.getElementById('panelBody').innerHTML=`
<img src="${f.properties.image}">
<div>
<div>${f.properties.year}</div>
<h2>${f.properties.title}</h2>
<p>${f.properties.description}</p>
</div>`;
};
});
});

let userMarker=null;
document.getElementById('locateBtn').onclick=()=>{
navigator.geolocation.getCurrentPosition(pos=>{
const lng=pos.coords.longitude;
const lat=pos.coords.latitude;
if(!userMarker){
userMarker=new maplibregl.Marker().setLngLat([lng,lat]).addTo(map);
}else{
userMarker.setLngLat([lng,lat]);
}
map.flyTo({center:[lng,lat],zoom:18});
});
};
