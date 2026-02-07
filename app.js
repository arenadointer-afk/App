const PIN = "2007";
let contas = [];
let filtro = "todas"; 

/* ================= INICIALIZAÇÃO SEGURA ================= */
try {
  const dadosLocais = localStorage.getItem("contas");
  if (dadosLocais) {
    contas = JSON.parse(dadosLocais) || [];
  }
} catch (error) {
  console.error("Erro crítico ao carregar dados:", error);
  alert("Erro nos dados salvos. O app iniciou com uma lista vazia para recuperar o acesso.");
  contas = [];
}

/* ================= UTILITÁRIOS VISUAIS ================= */
// 1. Ícones Automáticos
function getIcone(nome) {
  const n = nome.toLowerCase();
  if (n.includes("luz") || n.includes("energia") || n.includes("cemig") || n.includes("enel")) return "💡";
  if (n.includes("agua") || n.includes("água") || n.includes("sanepar") || n.includes("sabesp")) return "💧";
  if (n.includes("net") || n.includes("wifi") || n.includes("vivo") || n.includes("claro") || n.includes("tim")) return "🌐";
  if (n.includes("aluguel") || n.includes("condominio") || n.includes("casa")) return "🏠";
  if (n.includes("mercado") || n.includes("compras") || n.includes("ifood")) return "🛒";
  if (n.includes("cartao") || n.includes("nubank") || n.includes("inter") || n.includes("fatura")) return "💳";
  if (n.includes("carro") || n.includes("gasolina") || n.includes("uber") || n.includes("ipva")) return "🚗";
  if (n.includes("faculdade") || n.includes("curso") || n.includes("escola")) return "🎓";
  if (n.includes("streaming") || n.includes("netflix") || n.includes("spotify") || n.includes("amazon")) return "🎬";
  if (n.includes("academia") || n.includes("smart")) return "💪";
  return "📄"; // Padrão
}

// 2. Alternar Privacidade
function togglePrivacidade() {
    document.body.classList.toggle("modo-privado");
    const btn = document.getElementById("btnPrivacidade");
    if(btn) {
        btn.innerHTML = document.body.classList.contains("modo-privado") ? "🙈" : "👁️";
    }
}

// 3. Limpar Texto para PDF (Remove Emojis)
function limparTextoPdf(texto) {
    return texto.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
}

/* ================= SEGURANÇA EXTRA ================= */
function confirmarSeguranca(acao) {
  const n1 = Math.floor(Math.random() * 9) + 1;
  const n2 = Math.floor(Math.random() * 9) + 1;
  const soma = n1 + n2;
  const resposta = prompt(`🔒 Segurança para ${acao}:\nQuanto é ${n1} + ${n2}?`);
  
  if (resposta && parseInt(resposta) === soma) return true;
  
  alert("🚫 Resposta incorreta. Ação cancelada.");
  return false;
}

/* ================= SALVAMENTO ================= */
function salvar() {
  try {
    localStorage.setItem("contas", JSON.stringify(contas));
    const lista = document.getElementById("lista");
    if (lista && lista.getAttribute("data-mode") === "historico") {
      abrirHistorico();
    } else {
      render();
    }
  } catch (e) {
    alert("Erro ao salvar! Memória cheia?");
    console.error(e);
  }
}

/* ================= DATAS ================= */
const isoParaBR = d => {
  if(!d) return "--/--/----";
  const [a,m,di] = d.split("-");
  return `${di}/${m}/${a}`;
};

const brParaISO = d => {
  if(!d) return "";
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

/* ================= SISTEMA ================= */
document.addEventListener("DOMContentLoaded", () => {
   // desbloquear(); 
});

function desbloquear() {
  const pinInput = document.getElementById("pin");
  if (pinInput && pinInput.value !== PIN) {
     alert("PIN incorreto.");
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

/* ================= RENDERIZAÇÃO ================= */
function render() {
  const lista = document.getElementById("lista");
  if(!lista) return;
  
  lista.setAttribute("data-mode", "home"); 
  lista.innerHTML = "";

  // Injeção da Barra de Busca e Botão Privacidade
  if(!document.getElementById("btnPrivacidade")) {
      const divFiltros = document.querySelector(".filtros");
      if(divFiltros && !divFiltros.previousElementSibling.classList.contains("busca-container")) {
          const divBusca = document.createElement("div");
          divBusca.className = "busca-container";
          divBusca.style.cssText = "display:flex; gap:10px; padding:0 15px; margin-top:10px;";
          divBusca.innerHTML = `
            <input type="text" id="inputBusca" placeholder="🔍 Buscar..." onkeyup="render()" 
            style="flex:1; padding: 10px; border-radius: 20px; border: 1px solid #444; background: #222; color: white; text-align: center;">
            <button id="btnPrivacidade" onclick="togglePrivacidade()" style="background:none; border:none; font-size:22px; cursor:pointer;">👁️</button>
          `;
          divFiltros.parentNode.insertBefore(divBusca, divFiltros);
      }
  }

  const termo = document.getElementById("inputBusca") ? document.getElementById("inputBusca").value.toLowerCase() : "";

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
      if (termo && !c.nome.toLowerCase().includes(termo)) return false; 
      if (filtro === "pagas") return c.paga; 
      if (filtro === "pendentes" && c.paga) return false;
      return true;
    });

    if (visiveis.length === 0) return; 

    // Cálculos
    let totalMes = 0, pagoMes = 0;
    contasDoMes.forEach(c => {
         totalMes += c.valor;        
         if(c.paga) pagoMes += c.valor; 
    });
    const faltaMes = totalMes - pagoMes;
    let pct = totalMes > 0 ? (pagoMes / totalMes) * 100 : 0;

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
          
          <div class="barra-container">
            <div class="barra-fundo">
                <div class="barra-preenchimento" style="width: ${pct}%"></div>
            </div>
            <div class="barra-texto">${pct.toFixed(0)}% Pago</div>
          </div>
      </div>
    `;

    visiveis.forEach(c => {
      const div = document.createElement("div");
      const vencInfo = infoVencimento(c.vencimento);
      const icone = getIcone(c.nome); 

      let classes = "conta";
      if (c.paga) classes += " verde";
      else if (vencInfo.classe === "vencido") classes += " atrasada";

      const badgeHtml = (!c.paga && vencInfo.classe === "vencido") ? `<span class="badge-vencido">VENCIDO</span>` : ``;
      
      let htmlParcelas = "";
      if (c.recorrente && c.totalParcelas) {
          const valorJaPago = (c.parcelaAtual - 1) * c.valor; 
          htmlParcelas = `<div class="info-parcelas"><div>🔢 ${c.parcelaAtual}/${c.totalParcelas}</div><div>💰 Pago: R$ ${valorJaPago.toFixed(2)}</div></div>`;
      } else if (c.recorrente) {
           htmlParcelas = `<div class="info-parcelas"><div>🔄 Recorrente</div></div>`;
      }

      let btnPix = "";
      if(c.codigoPix && c.codigoPix.length > 5) {
         btnPix = `<button onclick="copiarPix(${c.index})" style="background:#4caf50; color:white;">Pix</button>`;
      }

      // BOTÃO NOVO: ADIAR (⏩)
      let btnAdiar = !c.paga ? `<button onclick="adiarConta(${c.index})" style="background:#0288d1;" title="Mover para outro mês">⏩</button>` : "";

      div.className = classes;
      div.innerHTML = `
        ${badgeHtml}
        <div style="font-size: 1.1em; margin-bottom: 5px;"><strong>${icone} ${c.nome}</strong></div>
        <div style="font-size: 1.2em; font-weight: bold;">💰 R$ ${c.valor.toFixed(2)}</div>
        <div style="margin-top: 5px;">📅 ${isoParaBR(c.vencimento)}</div>
        <small class="vencimento ${vencInfo.classe}">${c.paga ? "PAGO ✅" : vencInfo.texto}</small>
        ${htmlParcelas}
        <div class="acoes">
          ${!c.paga ? `<button onclick="marcarPaga(${c.index})">✅ Pagar</button>` : ""}
          ${btnPix}
          ${btnAdiar}
          <button onclick="clonarConta(${c.index})" title="Clonar">🧬</button> 
          <button onclick="ocultarConta(${c.index})">👁 Arq</button>
          <button onclick="editarConta(${c.index})">✏️</button>
          <button onclick="deletarConta(${c.index})">🗑️</button>
        </div>
      `;
      // Swipe
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
    <h2 style="text-align:center; margin-bottom:20px;">📜 Histórico</h2>
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
        const dataPagamentoFmt = c.dataPagamento ? isoParaBR(c.dataPagamento) : "Apenas Arquivada";
        const statusTexto = c.paga ? `Pago em: ${dataPagamentoFmt}` : "Pendente (Arquivada)";
        const corValor = c.paga ? "#2ecc71" : "#ef5350";
        const icone = getIcone(c.nome);
        
        let btnExtra = c.paga 
            ? `<button onclick="desfazerPagamento(${c.index})" style="background:#e67e22; color:white;">↩️</button>` 
            : `<button onclick="desarquivarConta(${c.index})" style="background:#fbc02d; color:black;">📂</button>`;

        html += `
          <div class="conta-historico">
            <div class="dados-historico">
                <strong>${icone} ${c.nome}</strong>
                <span>Venc: ${isoParaBR(c.vencimento)}</span>
                <span>${statusTexto}</span>
                <div style="color:${corValor}; margin-top:2px;">R$ ${c.valor.toFixed(2)}</div>
            </div>
            <div class="botoes-historico">
                ${btnExtra}
                <button onclick="editarConta(${c.index})">✏️</button>
                <button onclick="deletarConta(${c.index})" style="background:#c62828;">🗑️</button>
            </div>
          </div>
        `;
    });

    html += `</div>
      <div class="historico-resumo">
         <span>Total Pago</span>
         <strong>R$ ${totalPagoNoMes.toFixed(2)}</strong>
      </div>
    `;
    container.innerHTML = html;
    lista.appendChild(container);
  });
}

/* ================= CRUD & AÇÕES ================= */
// NOVA FUNÇÃO: ADIAR / MOVER CONTA ⏩
function adiarConta(i) {
    if (!confirmarSeguranca("MOVER CONTA")) return;
    
    const c = contas[i];
    const dataAtual = new Date(c.vencimento);
    dataAtual.setMonth(dataAtual.getMonth() + 1);
    const sugestao = dataAtual.toISOString().split('T')[0];
    
    const novaData = prompt(`Para qual data deseja mover "${c.nome}"?`, isoParaBR(sugestao));
    
    if (novaData) {
        c.vencimento = brParaISO(novaData);
        salvar();
        alert(`Conta movida para ${novaData} com sucesso! 🗓️`);
    }
}

function clonarConta(i) {
    if(!confirm("Clonar esta conta?")) return;
    const original = contas[i];
    const copia = {
        ...original,
        nome: original.nome + " (Cópia)",
        paga: false, oculta: false, dataPagamento: null,
        recorrente: false, parcelaAtual: null, totalParcelas: null
    };
    contas.push(copia);
    salvar();
}

function marcarPaga(i) {
  if (!confirmarSeguranca("PAGAR")) return;
  const c = contas[i];
  c.paga = true; c.oculta = true; c.dataPagamento = new Date().toISOString().split("T")[0];
  if (c.recorrente) {
    let gerar = true;
    let novaParcela = (c.parcelaAtual || 1) + 1;
    let totalP = c.totalParcelas || 0;
    if (typeof c.repeticoes === "number") { c.repeticoes--; if (c.repeticoes <= 0) gerar = false; }
    if (totalP > 0 && novaParcela > totalP) gerar = false;
    if (gerar) {
      contas.push({
        ...c, paga: false, oculta: false, dataPagamento: null,
        vencimento: proximoMes(c.vencimento), parcelaAtual: novaParcela, totalParcelas: totalP,
      });
    }
  }
  salvar();
}

function ocultarConta(i) { 
  if (!confirmarSeguranca("ARQUIVAR")) return;
  contas[i].oculta = true; salvar(); 
}

function desarquivarConta(i) {
  if(confirm("Desarquivar?")) { contas[i].oculta = false; salvar(); }
}

function desfazerPagamento(i) {
    if (!confirmarSeguranca("DESFAZER")) return;
    const c = contas[i]; c.paga = false; c.oculta = false; c.dataPagamento = null; 
    salvar(); alert("Desfeito! ↩️");
}

function adicionarConta() {
  const nome = prompt("Nome:"); if (!nome) return;
  const valorStr = prompt("Valor:"); if (!valorStr) return;
  const valor = parseFloat(valorStr.replace(",", "."));
  const data = prompt("Vencimento (DD/MM/AAAA):"); if (!data) return;
  const codigoPix = prompt("Pix (Opcional):");
  let recorrente = confirm("Recorrente?");
  let repeticoes = null, totalParcelas = 0;
  if (recorrente) {
    const r = prompt("Parcelas? (0 p/ infinito)");
    const n = Number(r); if (n > 0) { repeticoes = n; totalParcelas = n; }
  }
  contas.push({
    nome, valor, vencimento: brParaISO(data), codigoPix: codigoPix || "", 
    paga: false, recorrente, repeticoes, totalParcelas: totalParcelas > 0 ? totalParcelas : null,
    parcelaAtual: recorrente ? 1 : null, oculta: false, dataPagamento: null
  });
  salvar();
}

function editarConta(i) {
  if (!confirmarSeguranca("EDITAR")) return;
  const c = contas[i];
  const novoNome = prompt("Nome:", c.nome); if (novoNome === null) return; 
  const novoValorStr = prompt("Valor:", c.valor); if (novoValorStr === null) return;
  const novoValor = parseFloat(novoValorStr.replace(",", "."));
  const novaData = prompt("Data:", isoParaBR(c.vencimento)); if (novaData === null) return;
  const novoPix = prompt("Pix:", c.codigoPix || "");
  const isRecorrente = confirm("Recorrente?");
  let novaParcelaAtual = null; let novoTotalParcelas = null;
  if (isRecorrente) {
      const pAtual = prompt("Parcela Atual?", c.parcelaAtual || 1);
      novaParcelaAtual = pAtual ? parseInt(pAtual) : 1;
      const pTotal = prompt("Total Parcelas?", c.totalParcelas || "");
      novoTotalParcelas = (pTotal && parseInt(pTotal) > 0) ? parseInt(pTotal) : null;
  }
  if (!novoNome || isNaN(novoValor) || !novaData) { alert("Inválido."); return; }
  c.nome = novoNome; c.valor = novoValor; c.vencimento = brParaISO(novaData);
  c.codigoPix = novoPix || ""; c.recorrente = isRecorrente;
  c.parcelaAtual = novaParcelaAtual; c.totalParcelas = novoTotalParcelas;
  salvar();
}

function deletarConta(i) { if (confirmarSeguranca("EXCLUIR")) { contas.splice(i,1); salvar(); } }
function copiarPix(i) { const codigo = contas[i].codigoPix; if(!codigo) return; navigator.clipboard.writeText(codigo).then(() => alert("Copiado!")); }

/* ================= EXTRAS ================= */
function abrirOpcoes() { document.getElementById("modalOpcoes").style.display = "flex"; }
function fecharOpcoes() { document.getElementById("modalOpcoes").style.display = "none"; }

function baixarBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(contas));
    const node = document.createElement('a');
    node.setAttribute("href", dataStr);
    node.setAttribute("download", `backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(node); node.click(); node.remove();
}

function lerArquivoBackup(input) {
    const file = input.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if(Array.isArray(dados)) { if(confirm("Restaurar?")) { contas = dados; salvar(); alert("OK! 🔄"); location.reload(); } }
        } catch(err) { alert("Erro."); }
    };
    reader.readAsText(file);
}

function compartilharMes(mes) {
  let texto = `📅 *Resumo - ${mes}*\n\n`;
  let total = 0, pago = 0;
  const contasDoMes = contas.filter(c => mesAno(c.vencimento) === mes).sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
  if (contasDoMes.length === 0) { alert("Nada."); return; }
  contasDoMes.forEach(c => {
    total += c.valor;
    if (c.paga) { pago += c.valor; texto += `✅ ${c.nome}: R$ ${c.valor.toFixed(2)}\n`; } 
    else {
        const diff = Math.floor((new Date(c.vencimento) - new Date().setHours(0,0,0,0)) / (86400000));
        let aviso = diff < 0 ? "VENCIDO" : (diff === 0 ? "HOJE" : (diff === 1 ? "Amanhã" : `${diff} dias`));
        texto += `⭕ ${c.nome} (Vence em: ${aviso}): R$ ${c.valor.toFixed(2)}\n`;
    }
  });
  texto += `\n--------------------\n💰 Total: R$ ${total.toFixed(2)}\n✅ Pago: R$ ${pago.toFixed(2)}\n⏳ Falta: R$ ${(total - pago).toFixed(2)}`;
  if (navigator.share) navigator.share({ title: `Contas ${mes}`, text: texto }).catch(console.error);
  else { const el = document.createElement('textarea'); el.value = texto; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); alert("Copiado!"); }
}

function baixarPdfMes(mes) {
  if(!window.jspdf) { alert("Carregando PDF..."); return; }
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  let y = 20;
  pdf.setFontSize(16); pdf.text(`Relatório: ${mes}`, 105, y, {align:'center'}); y += 15;
  pdf.setFontSize(10);
  contas.forEach(c => {
      if(mesAno(c.vencimento) !== mes) return;
      if(c.oculta && !c.paga) return; 
      // LIMPEZA DE EMOJIS APLICADA AQUI
      const nomeLimpo = limparTextoPdf(c.nome);
      pdf.text(`${nomeLimpo}`, 10, y);
      pdf.text(`R$ ${c.valor.toFixed(2)}`, 130, y);
      pdf.text(c.paga ? "PAGO" : "ABERTO", 170, y);
      y += 8;
  });
  pdf.save(`extrato_${mes.replace('/','-')}.pdf`);
}

/* ================= CALC ================= */
let calcExpressao = "";
function abrirCalculadora() { document.getElementById("modalCalc").style.display = "flex"; }
function fecharCalculadora() { document.getElementById("modalCalc").style.display = "none"; }
function calcAdd(v) { calcExpressao += v; document.getElementById("calcDisplay").value = calcExpressao; }
function calcLimpar() { calcExpressao = ""; document.getElementById("calcDisplay").value = ""; }
function calcCalcular() { try { document.getElementById("calcDisplay").value = Function('"use strict";return (' + calcExpressao + ')')(); calcExpressao = document.getElementById("calcDisplay").value; } catch { alert("Erro"); calcLimpar(); } }
function fecharAviso() { const av = document.getElementById("avisoSwipe"); if(av) av.remove(); }
