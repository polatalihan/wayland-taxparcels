(() => {
"use strict";

const DATA = window.WAYLAND_PARCELS;
if (!DATA || !Array.isArray(DATA.features)) {
  document.getElementById("loading").textContent = "Parcel data failed to load.";
  throw new Error("WAYLAND_PARCELS not available");
}

const els = {
  loading: document.getElementById("loading"),
  theme: document.getElementById("themeSelect"),
  landUseFilters: document.getElementById("landUseFilters"),
  useCode: document.getElementById("useCodeSelect"),
  zoning: document.getElementById("zoningSelect"),
  valueRange: document.getElementById("valueRange"),
  ownerLocation: document.getElementById("ownerLocation"),
  minLotSize: document.getElementById("minLotSize"),
  search: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  searchClear: document.getElementById("searchClear"),
  reset: document.getElementById("resetBtn"),
  filteredLabel: document.getElementById("filteredLabel"),
  legend: document.getElementById("legend"),
  statParcels: document.getElementById("statParcels"),
  statTotal: document.getElementById("statTotal"),
  statLand: document.getElementById("statLand"),
  statEconomic: document.getElementById("statEconomic"),
  details: document.getElementById("parcelDetails"),
  parcelEmpty: document.getElementById("parcelEmpty"),
  closeParcel: document.getElementById("closeParcel"),
  downloadCsv: document.getElementById("downloadCsv"),
  landUseToggle: document.getElementById("landUseToggle")
};

const LANDUSE_COLORS = {
  "Residential - Single Family":"#788795",
  "Residential - Condominium":"#8b9eae",
  "Residential - 2/3 Family & Other":"#a37b65",
  "Residential - Accessory":"#9d8d72",
  "Residential - Apartments":"#e19a53",
  "Residential - Group Quarters":"#d7b56b",
  "Residential - Vacant Land":"#d9c36b",
  "Residential - Other":"#aa8b74",
  "Open Space":"#6d996f",
  "Commercial - Retail/Auto":"#d96875",
  "Commercial - Office":"#a777cf",
  "Commercial - Other":"#c87b57",
  "Commercial - Vacant Land":"#bf9c4d",
  "Industrial / Utility":"#d45b4f",
  "Chapter 61 - Forest":"#3f7950",
  "Chapter 61A - Agricultural":"#66a65f",
  "Chapter 61B - Recreational":"#4aa49a",
  "Tax Exempt / Public / Institutional":"#5684b9",
  "Other / Unknown":"#7b6c89",
  "No assessor data":"#464d53"
};

const VALUE_COLORS = ["#263849","#34536c","#437092","#5f8eb1","#86abc5","#c4d7e5","#f0d7a4"];
const VALUE_BINS = {
  total:[0,500000,750000,1000000,1500000,2500000,5000000,Infinity],
  land:[0,250000,400000,550000,750000,1000000,2000000,Infinity],
  building:[0,150000,300000,500000,750000,1000000,2500000,Infinity],
  value_per_acre:[0,300000,500000,750000,1000000,1500000,2500000,Infinity]
};
const THEME_LABELS = {
  total:"Total assessed value",
  land:"Land assessed value",
  building:"Building assessed value",
  value_per_acre:"Total value per acre",
  landuse:"Land use",
  zoning:"Zoning"
};

const formatter = new Intl.NumberFormat("en-US");
const money = new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
const compactMoney = new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:1});

function safe(v, fallback="—"){ return v===null || v===undefined || v==="" ? fallback : v; }
function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function fmtMoney(v){ return Number.isFinite(Number(v)) ? money.format(Number(v)) : "—"; }
function fmtDate(v){
  const s=String(v ?? "");
  if(!/^\d{8}$/.test(s)) return "—";
  return `${s.slice(4,6)}/${s.slice(6,8)}/${s.slice(0,4)}`;
}
function shortMoney(v){ return compactMoney.format(num(v)); }
function isEconomic(p){ return /^Commercial/.test(p.LAND_USE || "") || (p.LAND_USE || "")==="Industrial / Utility"; }

const features = DATA.features;
const categories = [...new Set(features.map(f => f.properties.LAND_USE || "No assessor data"))]
  .sort((a,b) => a.localeCompare(b));
const zoningValues = [...new Set(features.map(f => f.properties.ZONING).filter(Boolean))].sort();
const codeCounts = new Map();
features.forEach(f => {
  const p=f.properties, code=p.USE_CODE;
  if(code) codeCounts.set(code,(codeCounts.get(code)||0)+1);
});
const useCodes = [...codeCounts.keys()].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));

let selectedCategories = new Set(categories);
let filteredFeatures = features.slice();
let parcelLayer = null;
let selectedLayer = null;
let landUseChart = null;
let imageryOn = false;

const map = L.map("map",{
  center:[42.36,-71.36],
  zoom:13,
  zoomControl:true,
  preferCanvas:true,
  renderer:L.canvas({padding:0.35})
});
map.zoomControl.setPosition("topright");

const darkBase = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  {attribution:"Tiles © Esri",maxZoom:20}
).addTo(map);
const darkRef = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
  {attribution:"Esri",maxZoom:20,pane:"overlayPane"}
).addTo(map);
const imagery = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {attribution:"Tiles © Esri",maxZoom:20}
);

function zoningColor(z){
  if(!z) return "#4c5359";
  const palette=["#5c86b6","#9c6cb5","#c17761","#6b9b75","#c49a53","#6d8ca3","#b86d86","#8d8a5f","#6d72a8","#a06f59","#648c8b","#9577a4","#a7835a","#6c9f62","#967087","#77818c"];
  let h=0; for(let i=0;i<z.length;i++) h=((h<<5)-h)+z.charCodeAt(i);
  return palette[Math.abs(h)%palette.length];
}
function valueThemeInfo(theme,p){
  if(theme==="total") return num(p.TOTAL_VAL);
  if(theme==="land") return num(p.LAND_VAL);
  if(theme==="building") return num(p.BLDG_VAL);
  if(theme==="value_per_acre") return num(p.VALUE_PER_ACRE);
  return 0;
}
function valueColor(theme,value){
  if(!value || value<=0) return "#41474d";
  const bins=VALUE_BINS[theme];
  for(let i=1;i<bins.length;i++) if(value<bins[i]) return VALUE_COLORS[i-1];
  return VALUE_COLORS[VALUE_COLORS.length-1];
}
function featureStyle(feature){
  const p=feature.properties||{}, theme=els.theme.value;
  let fill="#555", fillOpacity=.77;
  if(theme==="landuse") fill=LANDUSE_COLORS[p.LAND_USE] || "#69727b";
  else if(theme==="zoning") fill=zoningColor(p.ZONING);
  else fill=valueColor(theme,valueThemeInfo(theme,p));
  return {color:"#11171c",weight:.55,opacity:.9,fillColor:fill,fillOpacity};
}
function tooltipHtml(p){
  return `<strong>${esc(safe(p.SITE_ADDR,"Parcel"))}</strong><br>`+
    `${esc(safe(p.LAND_USE))}<br>`+
    `${fmtMoney(p.TOTAL_VAL)} · ${esc(safe(p.ZONING,"No zoning"))}`;
}

function renderLayer(){
  if(parcelLayer) map.removeLayer(parcelLayer);
  parcelLayer=L.geoJSON({type:"FeatureCollection",features:filteredFeatures},{
    renderer:L.canvas({padding:0.4}),
    style:featureStyle,
    onEachFeature:(feature,layer)=>{
      layer.bindTooltip(tooltipHtml(feature.properties||{}),{sticky:true,className:"parcel-tip",direction:"top"});
      layer.on("click",()=>selectFeature(feature));
      layer.on("mouseover",e=>e.target.setStyle({weight:1.5,color:"#f3f6f8"}));
      layer.on("mouseout",e=>parcelLayer && parcelLayer.resetStyle(e.target));
    }
  }).addTo(map);
  renderLegend();
}

function updateLayerStyle(){
  if(parcelLayer) parcelLayer.setStyle(featureStyle);
  renderLegend();
}

function renderLegend(){
  const theme=els.theme.value;
  let html=`<div class="legend-title">${esc(THEME_LABELS[theme])}</div>`;
  if(theme==="landuse"){
    const visibleCats=categories.filter(c=>selectedCategories.has(c));
    visibleCats.slice(0,12).forEach(c=>{
      html+=`<div class="legend-row"><span class="legend-color" style="background:${LANDUSE_COLORS[c]||"#69727b"}"></span><span>${esc(c.replace("Residential - ","Res. ").replace("Commercial - ","Comm. "))}</span></div>`;
    });
    if(visibleCats.length>12) html+=`<div class="legend-row">+ ${visibleCats.length-12} more</div>`;
  } else if(theme==="zoning"){
    const visibleZ=[...new Set(filteredFeatures.map(f=>f.properties.ZONING).filter(Boolean))].sort();
    visibleZ.slice(0,16).forEach(z=>{
      html+=`<div class="legend-row"><span class="legend-color" style="background:${zoningColor(z)}"></span><span>${esc(z)}</span></div>`;
    });
  } else {
    const bins=VALUE_BINS[theme];
    for(let i=0;i<VALUE_COLORS.length;i++){
      const lo=bins[i], hi=bins[i+1];
      let label=i===0 ? `Under ${shortMoney(hi)}` : (hi===Infinity ? `${shortMoney(lo)}+` : `${shortMoney(lo)}–${shortMoney(hi)}`);
      html+=`<div class="legend-row"><span class="legend-color" style="background:${VALUE_COLORS[i]}"></span><span>${label}</span></div>`;
    }
    html+=`<div class="legend-row"><span class="legend-color" style="background:#41474d"></span><span>No / $0 value</span></div>`;
  }
  els.legend.innerHTML=html;
}

function renderLandUseFilters(){
  const counts=new Map();
  features.forEach(f=>{
    const c=f.properties.LAND_USE || "No assessor data";
    counts.set(c,(counts.get(c)||0)+1);
  });
  els.landUseFilters.innerHTML="";
  categories.forEach(c=>{
    const row=document.createElement("label");
    row.className="check-row";
    row.innerHTML=`<input type="checkbox" value="${esc(c)}" checked>
      <span class="swatch" style="background:${LANDUSE_COLORS[c]||"#69727b"}"></span>
      <span>${esc(c)}</span><span class="check-count">${formatter.format(counts.get(c)||0)}</span>`;
    const cb=row.querySelector("input");
    cb.addEventListener("change",()=>{
      cb.checked?selectedCategories.add(c):selectedCategories.delete(c);
      setQuickActive(null);
      applyFilters();
    });
    els.landUseFilters.appendChild(row);
  });
}
function syncLandUseCheckboxes(){
  els.landUseFilters.querySelectorAll("input[type=checkbox]").forEach(cb=>{
    cb.checked=selectedCategories.has(cb.value);
  });
}
function populateSelects(){
  zoningValues.forEach(z=>{
    const o=document.createElement("option");o.value=z;o.textContent=z;els.zoning.appendChild(o);
  });
  useCodes.forEach(code=>{
    const sample=features.find(f=>f.properties.USE_CODE===code)?.properties;
    const o=document.createElement("option");
    o.value=code;
    const desc=sample?.LAND_USE_DESC && !sample.LAND_USE_DESC.startsWith("DOR property") ? ` — ${sample.LAND_USE_DESC}` : "";
    o.textContent=`${code}${desc} (${codeCounts.get(code)})`;
    els.useCode.appendChild(o);
  });
}
function parseValueRange(){
  if(!els.valueRange.value) return null;
  const [a,b]=els.valueRange.value.split("-");
  return [Number(a),b==="inf"?Infinity:Number(b)];
}
function matchesFilters(f){
  const p=f.properties||{};
  if(!selectedCategories.has(p.LAND_USE || "No assessor data")) return false;
  if(els.useCode.value && p.USE_CODE!==els.useCode.value) return false;
  if(els.zoning.value && p.ZONING!==els.zoning.value) return false;
  if(els.ownerLocation.value && p.OWNER_LOCAL!==els.ownerLocation.value) return false;
  const minLot=Number(els.minLotSize.value||0);
  if(minLot>0 && num(p.LOT_SIZE)<minLot) return false;
  const range=parseValueRange();
  if(range){
    const v=num(p.TOTAL_VAL);
    if(v<range[0] || v>=range[1]) return false;
  }
  return true;
}
function applyFilters(){
  filteredFeatures=features.filter(matchesFilters);
  renderLayer();
  updateSummary();
  els.filteredLabel.textContent=filteredFeatures.length===features.length ? "All parcels" : `${formatter.format(filteredFeatures.length)} shown`;
}

function updateSummary(){
  const parcelCount=filteredFeatures.length;
  let total=0, land=0, econ=0;
  const byUse=new Map();
  filteredFeatures.forEach(f=>{
    const p=f.properties||{}, tv=num(p.TOTAL_VAL), lv=num(p.LAND_VAL);
    total+=tv; land+=lv; if(isEconomic(p)) econ+=tv;
    const c=p.LAND_USE||"No assessor data";
    byUse.set(c,(byUse.get(c)||0)+tv);
  });
  els.statParcels.textContent=formatter.format(parcelCount);
  els.statTotal.textContent=shortMoney(total);
  els.statLand.textContent=shortMoney(land);
  els.statEconomic.textContent=shortMoney(econ);

  const rows=[...byUse.entries()].filter(d=>d[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const labels=rows.map(d=>d[0].replace("Residential - ","Res. ").replace("Commercial - ","Comm. "));
  const data=rows.map(d=>d[1]);
  const colors=rows.map(d=>LANDUSE_COLORS[d[0]]||"#69727b");
  if(landUseChart) landUseChart.destroy();
  const ctx=document.getElementById("landUseChart");
  landUseChart=new Chart(ctx,{
    type:"bar",
    data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:0,borderRadius:2}]},
    options:{
      indexAxis:"y",responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmtMoney(c.raw)}}},
      scales:{
        x:{ticks:{color:"#778593",font:{size:9},callback:v=>shortMoney(v)},grid:{color:"rgba(255,255,255,.05)"},border:{display:false}},
        y:{ticks:{color:"#aeb9c2",font:{size:9}},grid:{display:false},border:{display:false}}
      }
    }
  });
}

function selectFeature(feature){
  const p=feature.properties||{};
  if(selectedLayer) map.removeLayer(selectedLayer);
  selectedLayer=L.geoJSON(feature,{
    style:{color:"#ffd36b",weight:3,fillColor:"#ffd36b",fillOpacity:.08},
    interactive:false
  }).addTo(map);
  try{ map.fitBounds(selectedLayer.getBounds(),{padding:[35,35],maxZoom:18}); }catch(e){}
  showDetails(p);
}
function showDetails(p){
  els.parcelEmpty.classList.add("hidden");
  els.details.classList.remove("hidden");
  els.closeParcel.classList.remove("hidden");
  const addr=safe(p.SITE_ADDR,"Parcel");
  const mapQuery=encodeURIComponent(`${addr}, Wayland, MA`);
  const owner=safe(p.OWNER1);
  const localCode=safe(p.USE_CODE);
  const base=p.LU_BASE ? `<span class="code-pill">DOR ${esc(p.LU_BASE)}</span>` : "";
  els.details.innerHTML=`
    <div class="parcel-title">${esc(addr)}</div>
    <div class="parcel-sub">${esc(safe(p.LAND_USE))}${base}</div>
    <div class="owner-line"><strong>Owner:</strong> ${esc(owner)}</div>
    <div class="detail-grid">
      ${detail("Total assessed",fmtMoney(p.TOTAL_VAL))}
      ${detail("Land assessed",fmtMoney(p.LAND_VAL))}
      ${detail("Building assessed",fmtMoney(p.BLDG_VAL))}
      ${detail("Other value",fmtMoney(p.OTHER_VAL))}
      ${detail("Land use code",localCode)}
      ${detail("Property type",safe(p.LAND_USE_DESC))}
      ${detail("Zoning",safe(p.ZONING))}
      ${detail("Lot size",p.LOT_SIZE!=null?`${Number(p.LOT_SIZE).toLocaleString(undefined,{maximumFractionDigits:3})} acres`:"—")}
      ${detail("Value / acre",fmtMoney(p.VALUE_PER_ACRE))}
      ${detail("Year built",safe(p.YEAR_BUILT))}
      ${detail("Building area",p.BLD_AREA!=null?`${formatter.format(p.BLD_AREA)} sf`:"—")}
      ${detail("Residential area",p.RES_AREA!=null?`${formatter.format(p.RES_AREA)} sf`:"—")}
      ${detail("Style",safe(p.STYLE))}
      ${detail("Stories",safe(p.STORIES))}
      ${detail("Last sale date",fmtDate(p.LS_DATE))}
      ${detail("Last sale price",fmtMoney(p.LS_PRICE))}
      ${detail("Parcel ID",safe(p.PROP_ID),"detail-wide")}
      ${detail("Map / Parcel",`${esc(safe(p.MAP_NO))} / ${esc(safe(p.MAP_PAR_ID))}`,"detail-wide")}
    </div>
    <a class="external-link" href="https://www.google.com/maps/search/?api=1&query=${mapQuery}" target="_blank" rel="noopener">Open address in Google Maps ↗</a>
  `;
}
function detail(label,value,extra=""){
  return `<div class="detail-item ${extra}"><div class="detail-label">${esc(label)}</div><div class="detail-value">${value}</div></div>`;
}
function clearSelection(){
  if(selectedLayer){map.removeLayer(selectedLayer);selectedLayer=null;}
  els.details.classList.add("hidden");
  els.closeParcel.classList.add("hidden");
  els.parcelEmpty.classList.remove("hidden");
}

function searchFeatures(q){
  q=q.trim().toLowerCase();
  if(q.length<2) return [];
  const scored=[];
  features.forEach(f=>{
    const p=f.properties||{};
    const fields=[p.SITE_ADDR,p.OWNER1,p.PROP_ID,p.MAP_PAR_ID].filter(Boolean).map(v=>String(v).toLowerCase());
    let score=99;
    fields.forEach(v=>{
      if(v===q) score=Math.min(score,0);
      else if(v.startsWith(q)) score=Math.min(score,1);
      else if(v.includes(q)) score=Math.min(score,2);
    });
    if(score<99) scored.push([score,f]);
  });
  scored.sort((a,b)=>a[0]-b[0] || String(a[1].properties.SITE_ADDR||"").localeCompare(String(b[1].properties.SITE_ADDR||"")));
  return scored.slice(0,9).map(d=>d[1]);
}
function renderSearch(){
  const q=els.search.value;
  const hits=searchFeatures(q);
  if(!q.trim() || q.trim().length<2){els.searchResults.classList.add("hidden");return;}
  els.searchResults.innerHTML=hits.length ? "" : `<div class="search-result"><div class="search-meta">No matches</div></div>`;
  hits.forEach(f=>{
    const p=f.properties||{};
    const div=document.createElement("div");
    div.className="search-result";
    div.innerHTML=`<div class="search-address">${esc(safe(p.SITE_ADDR,"Parcel"))}</div><div class="search-meta">${esc(safe(p.OWNER1))} · ${esc(safe(p.PROP_ID))}</div>`;
    div.addEventListener("click",()=>{
      selectFeature(f);
      els.searchResults.classList.add("hidden");
    });
    els.searchResults.appendChild(div);
  });
  els.searchResults.classList.remove("hidden");
}

function setQuickActive(name){
  document.querySelectorAll(".chip[data-quick]").forEach(b=>b.classList.toggle("active",name && b.dataset.quick===name));
}
function applyQuick(name){
  if(name==="all") selectedCategories=new Set(categories);
  if(name==="economic") selectedCategories=new Set(categories.filter(c=>c.startsWith("Commercial")||c==="Industrial / Utility"));
  if(name==="vacant") selectedCategories=new Set(categories.filter(c=>c.includes("Vacant Land")));
  if(name==="public") selectedCategories=new Set(categories.filter(c=>c==="Tax Exempt / Public / Institutional"));
  els.useCode.value="";els.zoning.value="";els.valueRange.value="";els.ownerLocation.value="";els.minLotSize.value="0";
  syncLandUseCheckboxes();
  setQuickActive(name);
  applyFilters();
  if(name==="economic" || name==="vacant" || name==="public"){ els.theme.value="landuse"; updateLayerStyle(); }
}
function resetAll(){
  selectedCategories=new Set(categories);
  syncLandUseCheckboxes();
  els.useCode.value="";els.zoning.value="";els.valueRange.value="";els.ownerLocation.value="";els.minLotSize.value="0";els.theme.value="total";
  els.search.value="";els.searchResults.classList.add("hidden");
  setQuickActive("all");
  clearSelection();
  applyFilters();
  fitAll();
}
function fitAll(){
  if(parcelLayer && parcelLayer.getLayers().length) map.fitBounds(parcelLayer.getBounds(),{padding:[18,18]});
}
function downloadCSV(){
  const cols=["SITE_ADDR","OWNER1","OWNER_LOCAL","PROP_ID","MAP_NO","MAP_PAR_ID","USE_CODE","LU_BASE","LAND_USE","LAND_USE_DESC","ZONING","TOTAL_VAL","LAND_VAL","BLDG_VAL","OTHER_VAL","LOT_SIZE","VALUE_PER_ACRE","YEAR_BUILT","BLD_AREA","RES_AREA","LS_DATE","LS_PRICE"];
  const csv=[cols.join(",")];
  filteredFeatures.forEach(f=>{
    const p=f.properties||{};
    csv.push(cols.map(c=>`"${String(p[c]??"").replace(/"/g,'""')}"`).join(","));
  });
  const blob=new Blob([csv.join("\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="wayland_filtered_parcels.csv";a.click();URL.revokeObjectURL(a.href);
}

renderLandUseFilters();
populateSelects();
document.getElementById("aboutCount").textContent=formatter.format(features.length);

["useCodeSelect","zoningSelect","valueRange","ownerLocation","minLotSize"].forEach(id=>{
  document.getElementById(id).addEventListener("change",()=>{setQuickActive(null);applyFilters();});
});
els.theme.addEventListener("change",updateLayerStyle);
els.search.addEventListener("input",renderSearch);
els.search.addEventListener("keydown",e=>{
  if(e.key==="Enter"){const hit=searchFeatures(els.search.value)[0];if(hit){selectFeature(hit);els.searchResults.classList.add("hidden");}}
  if(e.key==="Escape") els.searchResults.classList.add("hidden");
});
els.searchClear.addEventListener("click",()=>{els.search.value="";els.searchResults.classList.add("hidden");});
els.reset.addEventListener("click",resetAll);
els.closeParcel.addEventListener("click",clearSelection);
els.downloadCsv.addEventListener("click",downloadCSV);
document.querySelectorAll(".chip[data-quick]").forEach(b=>b.addEventListener("click",()=>applyQuick(b.dataset.quick)));
document.getElementById("fitBtn").addEventListener("click",fitAll);
document.getElementById("basemapBtn").addEventListener("click",()=>{
  imageryOn=!imageryOn;
  if(imageryOn){
    map.removeLayer(darkBase);map.removeLayer(darkRef);imagery.addTo(map);
    document.getElementById("basemapBtn").textContent="Dark map";
  } else {
    map.removeLayer(imagery);darkBase.addTo(map);darkRef.addTo(map);
    document.getElementById("basemapBtn").textContent="Imagery";
  }
});
els.landUseToggle.addEventListener("click",()=>{
  const hidden=els.landUseFilters.classList.toggle("hidden");
  els.landUseToggle.textContent=hidden?"Expand":"Collapse";
});
document.getElementById("aboutBtn").addEventListener("click",()=>document.getElementById("aboutModal").classList.remove("hidden"));
document.getElementById("aboutClose").addEventListener("click",()=>document.getElementById("aboutModal").classList.add("hidden"));
document.getElementById("aboutModal").addEventListener("click",e=>{if(e.target.id==="aboutModal")e.currentTarget.classList.add("hidden")});

applyFilters();
fitAll();
els.loading.classList.add("hidden");
})();
