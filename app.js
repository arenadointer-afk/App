const PIN = "2007";
let contas = JSON.parse(localStorage.getItem("contas")) || [];
let filtro = "todas"; 

/* ================= UTIL ================= */
function salvar() {
  localStorage.setItem("contas", JSON.stringify(contas));
  const lista = document.getElementById("lista");
  // Mantém a visualização atual (Home ou Histórico)
  if (lista && lista.getAttribute("data-mode") === "historico") {
    abrirHistorico();
  } else {
    render();
  }
}

const isoParaBR = d => {
  if(!d) return "--/--/----";
  const [a,m,di] = d.split("-");
  return `${di}/${m}/${a}`;
};

const brParaISO = d => {
  const [di,m,a] = d.split("/");
  return `${a}-${m}-${di}`;
};

const proximoMes = d => {
  const data = new Date(d);
  data.setMonth(data.getMonth() + 1);
  return data.toISOString().split("T")[0];
};

const mesAno = d => {
  const [a,m] = d.split("-");
  return `${m}/${a}`;
};

/* ======== INFO DE VENCIMENTO ======== */
function infoVencimento(dataISO) {
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const venc = new Date(dataISO);
  venc.setHours(0,0,0,0);
  const diff = Math.floor((venc - hoje) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { texto: "VENCIDO", classe: "vencido" };
  if (diff === 0) return { texto: "vence hoje", classe: "hoje" };
  if (diff === 1) return { texto: "vence amanhã", classe: "amanha" };
  return { texto: `vence em: ${diff} dias`, classe: "normal" };
}

/* ================= LOCK & SYSTEM ================= */
document.addEventListener("DOMContentLoaded", () => {
   // desbloquear(); // Descomente para testes
});

function desbloquear() {
  const pinInput = document.getElementById("pin");
  if (pinInput && pinInput.value !== PIN && pinInput.value !== "") {
     alert("PIN incorreto");
     pinInput.value = "";
     return;
  }
  document.getElementById("lock").style.display = "none";
  document.getElementById("app").style.display = "block";
  carregarPerfil();
  render();
}

function carregarPerfil() {
  const f = localStorage.getItem("fotoPerfil");
  const img = document.getElementById("fotoPerfil");
  if (f && img) img.src = f;
}
const imgPerfil = document.getElementById("fotoPerfil");
const inputUpload = document.getElementById("uploadFoto");
if(imgPerfil && inputUpload) {
    imgPerfil.onclick = () => inputUpload.click();
    inputUpload.onchange = e => {
      const r = new FileReader();
      r.onload = () => { localStorage.setItem("fotoPerfil", r.result); imgPerfil.src = r.result; };
      r.readAsDataURL(e.target.files[0]);
    };
}

function setFiltro(f, btn) {
  filtro = f;
  document.querySelectorAll(".filtros button").forEach(b => b.classList.remove("ativo"));
  btn.classList.add("ativo");
  render();
}

/* ================= RENDER HOME ================= */
function render() {
  const lista = document.getElementById("lista");
  if(!lista) return;
  
  lista.setAttribute("data-mode", "home"); 
  lista.innerHTML = "";

  const grupos = {};
  const contasOrdenadas = contas
    .map((c, index) => ({ ...c, index }))
    .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

  contasOrdenadas.forEach(c => {
      const k = mesAno(c.vencimento);
      if (!grupos[k]) grupos[k] = [];
      grupos[k].push(c);
  });

  Object.keys(grupos).forEach(k => {
    const contasDoMes = grupos[k];
    const visiveis = contasDoMes.filter(c => {
      if (c.oculta) return false; 
      if (filtro === "pagas") return c.paga; 
      if (filtro === "pendentes" && c.paga) return false;
      return true;
    });

    if (visiveis.length === 0) return; 

    let totalMes = 0, pagoMes = 0;
    contasDoMes.forEach(c => {
        if(!c.oculta) {
             totalMes += c.valor;
             if(c.paga) pagoMes += c.valor;
        }
    });
    const faltaMes = totalMes - pagoMes;

    const bloco = document.createElement("div");
    bloco.className = "mes-container";

    bloco.innerHTML = `
      <div class="cabecalho-mes">
          <h3>📅 ${k}</h3>
          <div class="acoes-mes">
            <button onclick="compartilharMes('${k}')">📤</button>
            <button onclick="baixarPdfMes('${k}')">📄</button>
          </div>
      </div>
      <div class="resumo-mes">
          <div class="resumo-item"><small>Total</small><strong class="texto-branco">R$ ${totalMes.toFixed(2)}</strong></div>
          <div class="resumo-item"><small>Pago</small><strong class="texto-verde">R$ ${pagoMes.toFixed(2)}</strong></div>
          <div class="resumo-item"><small>Falta</small><strong class="texto-vermelho">R$ ${faltaMes.toFixed(2)}</strong></div>
      </div>
    `;

    visiveis.forEach(c => {
      const div = document.createElement("div");
      const vencInfo = infoVencimento(c.vencimento);
      let classes = "conta";
      if (c.paga) classes += " verde";
      else if (vencInfo.classe === "vencido") classes += " atrasada";

      const badgeHtml = (!c.paga && vencInfo.classe === "vencido") ? `<span class="badge-vencido">VENCIDO</span>` : ``;
      
      let htmlParcelas = "";
      if (c.recorrente && c.totalParcelas) {
          const valorJaPago = (c.parcelaAtual - 1) * c.valor; 
          htmlParcelas = `<div class="info-parcelas"><div>🔢 Parcela: <strong>${c.parcelaAtual} / ${c.totalParcelas}</strong></div><div>💰 Já pago: R$ ${valorJaPago.toFixed(2)}</div></div>`;
      } else if (c.recorrente) {
           htmlParcelas = `<div class="info-parcelas"><div>🔄 Recorrente</div></div>`;
      }

      // Lógica do botão PIX
      let btnPix = "";
      if(c.codigoPix && c.codigoPix.length > 5) {
         btnPix = `<button onclick="copiarPix(${c.index})" style="background:#4caf50; color:white;">📋 Copiar Pix</button>`;
      }

      div.className = classes;
      div.innerHTML = `
        ${badgeHtml}
        <div style="font-size: 1.1em; margin-bottom: 5px;"><strong>${c.nome}</strong></div>
        <div style="font-size: 1.2em; font-weight: bold;">💰 R$ ${c.valor.toFixed(2)}</div>
        <div style="margin-top: 5px;">📅 ${isoParaBR(c.vencimento)}</div>
        <small class="vencimento ${vencInfo.classe}">${c.paga ? "PAGO ✅" : vencInfo.texto}</small>
        ${htmlParcelas}
        <div class="acoes">
          ${!c.paga ? `<button onclick="marcarPaga(${c.index})">✅ Pagar</button>` : ""}
          ${btnPix}
          <button onclick="ocultarConta(${c.index})">👁 Arquivar</button>
          <button onclick="editarConta(${c.index})">✏️</button>
          <button onclick="deletarConta(${c.index})">🗑️</button>
        </div>
      `;
      let startX = 0;
      div.addEventListener("touchstart", e => startX = e.touches[0].clientX);
      div.addEventListener("touchend", e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (dx > 80) ocultarConta(c.index);
        if (dx < -80 && !c.paga) marcarPaga(c.index);
      });
      bloco.appendChild(div);
    });
    lista.appendChild(bloco);
  });
}

/* ================= HISTÓRICO ================= */
function abrirHistorico() {
  const lista = document.getElementById("lista");
  lista.setAttribute("data-mode", "historico");

  lista.innerHTML = `
    <div style="padding: 10px;">
        <button style="width:100%; padding:12px; background:#333; color:white; border:none; border-radius:8px; font-weight:bold; font-size:14px;" onclick="render()">
            ⬅ Voltar para Início
        </button>
    </div>
    <h2 style="text-align:center; margin-bottom:20px;">📜 Histórico de Pagamentos</h2>
  `;

  const grupos = {};
  const historico = contas
    .map((c, index) => ({...c, index}))
    .filter(c => c.oculta) 
    .sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento));

  if(historico.length === 0) {
      lista.innerHTML += `<div style="text-align:center; padding:20px; color:#888;">Nenhuma conta no histórico.</div>`;
      return;
  }

  historico.forEach(c => {
    const k = mesAno(c.vencimento);
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push(c);
  });

  Object.keys(grupos).forEach(k => {
    let totalPagoNoMes = 0;
    grupos[k].forEach(c => { if(c.paga) totalPagoNoMes += c.valor; });

    const container = document.createElement("div");
    container.className = "historico-container";

    let html = `
      <div class="historico-cabecalho">
        <h3>📅 ${k}</h3>
        <div class="botoes-historico">
            <button onclick="compartilharMes('${k}')">📤</button>
            <button onclick="baixarPdfMes('${k}')">📄</button>
        </div>
      </div>
      <div class="historico-lista">
    `;

    grupos[k].forEach(c => {
        const dataPagamentoFmt = c.dataPagamento ? isoParaBR(c.dataPagamento) : "Arquivada";
        html += `
          <div class="conta-historico">
            <div class="dados-historico">
                <strong>${c.nome}</strong>
                <span>Vencimento: ${isoParaBR(c.vencimento)}</span>
                <span>Pago em: ${dataPagamentoFmt}</span>
                <div style="color:#2ecc71; margin-top:2px;">R$ ${c.valor.toFixed(2)}</div>
            </div>
            <div class="botoes-historico">
                <button onclick="editarConta(${c.index})">✏️</button>
                <button onclick="deletarConta(${c.index})" style="background:#c62828;">🗑️</button>
            </div>
          </div>
        `;
    });

    html += `</div>
      <div class="historico-resumo">
         <span>Total Pago em ${k}</span>
         <strong>R$ ${totalPagoNoMes.toFixed(2)}</strong>
      </div>
    `;

    container.innerHTML = html;
    lista.appendChild(container);
  });
}

/* ================= AÇÕES & CRUD ================= */
function marcarPaga(i) {
  const c = contas[i];
  c.paga = true;
  c.oculta = true; 
  c.dataPagamento = new Date().toISOString().split("T")[0];

  if (c.recorrente) {
    let gerar = true;
    let novaParcela = (c.parcelaAtual || 1) + 1;
    let totalP = c.totalParcelas || 0;

    if (typeof c.repeticoes === "number") {
      c.repeticoes--;
      if (c.repeticoes <= 0) gerar = false;
    }
    if (totalP > 0 && novaParcela > totalP) gerar = false;

    if (gerar) {
      contas.push({
        ...c,
        paga: false, oculta: false, dataPagamento: null,
        vencimento: proximoMes(c.vencimento),
        parcelaAtual: novaParcela, totalParcelas: totalP,
      });
    }
  }
  salvar();
}

function ocultarConta(i) { contas[i].oculta = true; salvar(); }

function adicionarConta() {
  const nome = prompt("Nome da conta:");
  if (!nome) return;
  const valorStr = prompt("Valor:");
  if (!valorStr) return;
  const valor = parseFloat(valorStr.replace(",", "."));
  const data = prompt("Vencimento (DD/MM/AAAA):");
  if (!data) return;

  // NOVO: Campo de PIX
  const codigoPix = prompt("Cole o código PIX / Barras (Opcional):");

  let recorrente = confirm("Recorrente/Parcelada?");
  let repeticoes = null, totalParcelas = 0;

  if (recorrente) {
    const r = prompt("Parcelas? (Nº ou vazio p/ infinito)");
    const n = Number(r);
    if (n > 0) { repeticoes = n; totalParcelas = n; }
  }

  contas.push({
    nome, valor, vencimento: brParaISO(data),
    codigoPix: codigoPix || "", // Salva o código
    paga: false, recorrente, repeticoes,
    totalParcelas: totalParcelas > 0 ? totalParcelas : null,
    parcelaAtual: recorrente ? 1 : null,
    oculta: false, dataPagamento: null
  });
  salvar();
}

function editarConta(i) {
  const c = contas[i];
  const nome = prompt("Nome:", c.nome);
  const valorStr = prompt("Valor:", c.valor);
  const valor = parseFloat(String(valorStr).replace(",", "."));
  const data = prompt("Vencimento (DD/MM/AAAA):", isoParaBR(c.vencimento));
  // Edição do PIX
  const pix = prompt("Código PIX:", c.codigoPix || "");

  if (!nome || isNaN(valor) || !data) return;
  c.nome = nome; c.valor = valor; c.vencimento = brParaISO(data);
  c.codigoPix = pix;
  salvar();
}

function deletarConta(i) {
  if (confirm("Apagar permanentemente?")) { contas.splice(i,1); salvar(); }
}

function copiarPix(i) {
    const codigo = contas[i].codigoPix;
    if(!codigo) return;
    navigator.clipboard.writeText(codigo).then(() => {
        alert("Código copiado! ✅");
    });
}

/* ================= BACKUP & RESTORE ================= */
function abrirOpcoes() { document.getElementById("modalOpcoes").style.display = "flex"; }
function fecharOpcoes() { document.getElementById("modalOpcoes").style.display = "none"; }

function baixarBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(contas));
    const node = document.createElement('a');
    node.setAttribute("href", dataStr);
    node.setAttribute("download", `backup_contas_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(node);
    node.click();
    node.remove();
}

function lerArquivoBackup(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if(Array.isArray(dados)) {
                if(confirm("Isso substituirá todas as contas atuais pelo backup. Continuar?")) {
                    contas = dados;
                    salvar();
                    alert("Backup restaurado com sucesso! 🔄");
                    location.reload();
                }
            } else { alert("Arquivo inválido."); }
        } catch(err) { alert("Erro ao ler arquivo."); }
    };
    reader.readAsText(file);
}

/* ================= EXPORTAR ================= */
function compartilharMes(mes) {
  let texto = `📅 *Resumo de Contas - ${mes}*\n\n`;
  let total = 0, pago = 0;
  
  const contasDoMes = contas
    .filter(c => mesAno(c.vencimento) === mes)
    .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

  if (contasDoMes.length === 0) { alert("Nada para compartilhar."); return; }

  contasDoMes.forEach(c => {
    total += c.valor;
    if (c.paga) pago += c.valor;
    const check = c.paga ? "✅" : "⭕"; 
    texto += `${check} ${c.nome}: R$ ${c.valor.toFixed(2)}\n`;
  });
  
  const faltante = total - pago;
  texto += `\n--------------------\n💰 *Total:* R$ ${total.toFixed(2)}\n✅ *Pago:* R$ ${pago.toFixed(2)}\n⏳ *Falta:* R$ ${faltante.toFixed(2)}`;
  
  if (navigator.share) navigator.share({ title: `Contas ${mes}`, text: texto }).catch(console.error);
  else {
      const el = document.createElement('textarea');
      el.value = texto; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
      alert("Copiado!");
  }
}

function baixarPdfMes(mes) {
  if(!window.jspdf) { alert("Carregando PDF..."); return; }
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  let y = 20;
  pdf.setFontSize(16); pdf.text(`Relatório: ${mes}`, 105, y, {align:'center'}); y += 15;
  let total = 0;
  pdf.setFontSize(10);
  pdf.text("Conta", 10, y); pdf.text("Valor", 80, y); pdf.text("Vencimento", 120, y); pdf.text("Status", 160, y);
  y += 5; pdf.line(10, y, 200, y); y += 8;
  contas.forEach(c => {
      if(mesAno(c.vencimento) !== mes) return;
      if(c.oculta && !c.paga) return; 
      total += c.valor;
      pdf.text(`${c.nome}`, 10, y); pdf.text(`R$ ${c.valor.toFixed(2)}`, 80, y);
      pdf.text(`${isoParaBR(c.vencimento)}`, 120, y); pdf.text(c.paga ? "PAGO" : "ABERTO", 160, y);
      y += 8;
  });
  y += 5; pdf.line(10, y, 200, y); y += 10;
  pdf.setFontSize(12); pdf.text(`Total Mês: R$ ${total.toFixed(2)}`, 10, y);
  pdf.save(`extrato_${mes.replace('/','-')}.pdf`);
}

/* ================= CALCULADORA ================= */
let calcExpressao = "";
function abrirCalculadora() { document.getElementById("modalCalc").style.display = "flex"; }
function fecharCalculadora() { document.getElementById("modalCalc").style.display = "none"; }
function calcAdd(v) { calcExpressao += v; document.getElementById("calcDisplay").value = calcExpressao; }
function calcLimpar() { calcExpressao = ""; document.getElementById("calcDisplay").value = ""; }
function calcCalcular() { 
    try { document.getElementById("calcDisplay").value = Function('"use strict";return (' + calcExpressao + ')')(); 
        calcExpressao = document.getElementById("calcDisplay").value; } catch { alert("Erro"); calcLimpar(); } 
}
function fecharAviso() { document.getElementById("avisoSwipe")?.remove(); }
