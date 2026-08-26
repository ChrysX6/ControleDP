// ====================================================================
// CONFIGURAÇÃO — cole aqui a URL do seu Google Apps Script Web App
// (veja instruções no README para gerar essa URL)
// ====================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbxynq6QZIQ-Z0pxt4jQst0dtAu3iC0T6ETj5eMOU3pi7qdMc41Nf1-m7oUkwWEjAZU/exec";

// Nomes técnicos dos 5 controles (usados como prefixo das abas no Sheets)
const CONTROLS = {
  FolhaPagamento: "FolhaPagamento",
  ProLabore: "ProLabore",
  FolhaDomestica: "FolhaDomestica",
  ControleSindical: "ControleSindical",
  EmpregadorWeb: "EmpregadorWeb"
};

// Mês inicial do sistema
const START_MONTH = { year: 2026, month: 8 }; // Agosto/2026
