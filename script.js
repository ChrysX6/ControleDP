// ============================================================
// SCRIPT PRINCIPAL — Controle do Departamento Pessoal
// ============================================================

const MONTH_NAMES = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

let state = {
  months: [],          // ["2026-08", "2026-09", ...]
  currentMonth: null,
  currentControl: "FolhaPagamento",
  headers: [],
  rows: [],
  editingIndex: null
};

function monthKey(y,m){ return `${y}-${String(m).padStart(2,"0")}`; }
function monthLabel(key){
  const [y,m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m)-1]}/${y}`;
}

function sheetName(monthKey, control){
  return `${monthKey}_${control}`;
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", async () => {
  const startKey = monthKey(START_MONTH.year, START_MONTH.month);
  state.months = loadMonthsLocal();
  if(!state.months.includes(startKey)){
    state.months.unshift(startKey);
    saveMonthsLocal();
  }
  state.currentMonth = state.months[state.months.length-1];
  renderMonths();
  bindEvents();
  await loadTable();
});

function loadMonthsLocal(){
  const saved = localStorage.getItem("dp_months");
  return saved ? JSON.parse(saved) : [];
}
function saveMonthsLocal(){
  localStorage.setItem("dp_months", JSON.stringify(state.months));
}

function renderMonths(){
  const list = document.getElementById("monthList");
  list.innerHTML = "";
  state.months.forEach(mk => {
    const li = document.createElement("li");
    li.textContent = monthLabel(mk);
    li.dataset.month = mk;
    if(mk === state.currentMonth) li.classList.add("active");
    li.addEventListener("click", () => {
      state.currentMonth = mk;
      renderMonths();
      loadTable();
    });
    list.appendChild(li);
  });
}

function bindEvents(){
  document.querySelectorAll(".tab-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      state.currentControl = btn.dataset.control;
      loadTable();
    });
  });

  document.getElementById("addRowBtn").addEventListener("click", ()=>openRowModal(null));
  document.getElementById("cancelRowBtn").addEventListener("click", closeRowModal);
  document.getElementById("saveRowBtn").addEventListener("click", saveRow);

  document.getElementById("addMonthBtn").addEventListener("click", ()=>{
    document.getElementById("monthModal").classList.remove("hidden");
  });
  document.getElementById("cancelMonthBtn").addEventListener("click", ()=>{
    document.getElementById("monthModal").classList.add("hidden");
  });
  document.getElementById("confirmMonthBtn").addEventListener("click", createNextMonth);

  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
  document.getElementById("exportPdfBtn").addEventListener("click", exportPdf);

  document.getElementById("searchInput").addEventListener("input", (e)=>{
    filterTable(e.target.value.toLowerCase());
  });
}

// ---------- API CALLS (Google Apps Script) ----------
async function apiGet(action, params={}){
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  const res = await fetch(url.toString());
  return res.json();
}

async function apiPost(action, payload={}){
  const res = await fetch(API_URL, {
    method:"POST",
    headers:{ "Content-Type":"text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload })
  });
  return res.json();
}

function showLoading(v){
  document.getElementById("loadingIndicator").style.display = v ? "inline" : "none";
}

// ---------- LOAD TABLE ----------
async function loadTable(){
  showLoading(true);
  const sheet = sheetName(state.currentMonth, state.currentControl);
  try{
    const data = await apiGet("getData", { sheet });
    state.headers = data.headers || [];
    state.rows = data.rows || [];
  }catch(err){
    console.error(err);
    state.headers = [];
    state.rows = [];
  }
  renderTable();
  showLoading(false);
}

function renderTable(){
  const head = document.getElementById("tableHead");
  const body = document.getElementById("tableBody");
  head.innerHTML = "";
  body.innerHTML = "";

  state.headers.forEach(h=>{
    const th = document.createElement("th");
    th.textContent = h;
    head.appendChild(th);
  });
  const thActions = document.createElement("th");
  thActions.textContent = "Ações";
  head.appendChild(thActions);

  state.rows.forEach((row, idx)=>{
    const tr = document.createElement("tr");
    state.headers.forEach(h=>{
      const td = document.createElement("td");
      td.textContent = row[h] || "";
      tr.appendChild(td);
    });
    const tdAct = document.createElement("td");
    tdAct.className = "row-actions";
    tdAct.innerHTML = `<button onclick="openRowModal(${idx})" title="Editar">✏️</button><button onclick="deleteRow(${idx})" title="Excluir">🗑️</button>`;
    tr.appendChild(tdAct);
    body.appendChild(tr);
  });
}

function filterTable(term){
  document.querySelectorAll("#tableBody tr").forEach(tr=>{
    const text = tr.textContent.toLowerCase();
    tr.style.display = text.includes(term) ? "" : "none";
  });
}

// ---------- MODAL ADD/EDIT ----------
function openRowModal(idx){
  state.editingIndex = idx;
  document.getElementById("modalTitle").textContent = idx === null ? "Adicionar Registro" : "Editar Registro";
  const fieldsDiv = document.getElementById("modalFields");
  fieldsDiv.innerHTML = "";
  const rowData = idx !== null ? state.rows[idx] : {};

  const headers = state.headers.length ? state.headers : Object.keys(rowData);
  headers.forEach(h=>{
    const label = document.createElement("label");
    label.textContent = h;
    const input = document.createElement("input");
    input.type = "text";
    input.dataset.field = h;
    input.value = rowData[h] || "";
    label.appendChild(input);
    fieldsDiv.appendChild(label);
  });

  document.getElementById("rowModal").classList.remove("hidden");
}

function closeRowModal(){
  document.getElementById("rowModal").classList.add("hidden");
}

async function saveRow(){
  const inputs = document.querySelectorAll("#modalFields input");
  const rowObj = {};
  inputs.forEach(inp => rowObj[inp.dataset.field] = inp.value);

  const sheet = sheetName(state.currentMonth, state.currentControl);
  showLoading(true);
  try{
    if(state.editingIndex === null){
      await apiPost("addRow", { sheet, row: rowObj });
    }else{
      await apiPost("updateRow", { sheet, index: state.editingIndex, row: rowObj });
    }
    closeRowModal();
    await loadTable();
  }catch(err){
    alert("Erro ao salvar. Verifique a conexão com o Google Sheets.");
  }
  showLoading(false);
}

async function deleteRow(idx){
  if(!confirm("Deseja realmente excluir este registro?")) return;
  const sheet = sheetName(state.currentMonth, state.currentControl);
  showLoading(true);
  try{
    await apiPost("deleteRow", { sheet, index: idx });
    await loadTable();
  }catch(err){
    alert("Erro ao excluir.");
  }
  showLoading(false);
}

// ---------- NOVO MÊS ----------
async function createNextMonth(){
  const last = state.months[state.months.length-1];
  const [y,m] = last.split("-").map(Number);
  let ny = y, nm = m+1;
  if(nm > 12){ nm = 1; ny++; }
  const newKey = monthKey(ny, nm);

  if(state.months.includes(newKey)){
    alert("Este mês já existe.");
    document.getElementById("monthModal").classList.add("hidden");
    return;
  }

  showLoading(true);
  try{
    for(const control of Object.values(CONTROLS)){
      const baseSheet = sheetName(last, control);
      const newSheet = sheetName(newKey, control);
      await apiPost("createMonthSheet", { baseSheet, newSheet });
    }
    state.months.push(newKey);
    saveMonthsLocal();
    state.currentMonth = newKey;
    renderMonths();
    await loadTable();
  }catch(err){
    alert("Erro ao criar novo mês na planilha.");
  }
  document.getElementById("monthModal").classList.add("hidden");
  showLoading(false);
}

// ---------- EXPORTAÇÃO ----------
function exportCsv(){
  if(!state.rows.length){ alert("Nenhum dado para exportar."); return; }
  let csv = state.headers.join(";") + "\n";
  state.rows.forEach(row=>{
    csv += state.headers.map(h => `"${(row[h]||"").toString().replace(/"/g,'""')}"`).join(";") + "\n";
  });
  const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${sheetName(state.currentMonth, state.currentControl)}.csv`;
  link.click();
}

function exportPdf(){
  if(!state.rows.length){ alert("Nenhum dado para exportar."); return; }
  // Carrega jsPDF só quando necessário, mantendo o site leve
  const scriptJsPdf = document.createElement("script");
  scriptJsPdf.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  scriptJsPdf.onload = () => {
    const scriptAutoTable = document.createElement("script");
    scriptAutoTable.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
    scriptAutoTable.onload = generatePdf;
    document.body.appendChild(scriptAutoTable);
  };
  document.body.appendChild(scriptJsPdf);
}

function generatePdf(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"landscape" });
  doc.setFontSize(14);
  doc.text(`Relatório — ${state.currentControl} — ${monthLabel(state.currentMonth)}`, 14, 15);
  doc.autoTable({
    startY: 22,
    head: [state.headers],
    body: state.rows.map(r => state.headers.map(h => r[h] || "")),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [11,77,44] }
  });
  doc.save(`${sheetName(state.currentMonth, state.currentControl)}.pdf`);
}
