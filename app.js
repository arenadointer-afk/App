const PIN = "2007";
let contas = [];
let logs = []; 
let filtro = "todas"; 

/* ================= INICIALIZAÇÃO ================= */
try {
  const dadosLocais = localStorage.getItem("contas");
  if (dadosLocais) {
      contas = JSON.parse(dadosLocais) || [];
      contas.forEach(c => { if(!c.id) c.id = Date.now() + Math.random(); });
  }
  const logsLocais = localStorage.getItem("logs");
  if (logsLocais) logs = JSON.parse(logsLocais) || [];
} catch (error) {
  console.error("Erro dados:", error);
  contas = []; logs = [];
}

/* ================= UTILITÁRIOS ================= */
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
  return "📄"; 
}

const isoParaBR = d => { if(!d) return "--/--/----"; const [a,m,di] = d.split("-"); return `${di}/${m}/${a}`; };
const brParaISO = d => { if(!d) return ""; const [di,m,a] = d.split("/"); return `${a}-${m}-${di}`; };
const proximoMes = d => { const data = new Date(d); data.setMonth(data.getMonth() + 1); return data.toISOString().split("T")[0]; };
const mesAno = d => { const [a,m] = d.split("-"); return `${m}/${a}`; };

function infoVencimento(dataISO) {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const venc = new Date(dataISO); venc.setHours(0,0,0,0);
  const diff = Math.floor((venc - hoje) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { texto: "VENCIDO", classe: "vencido" };
  if (diff === 0) return { texto: "vence hoje", classe: "hoje" };
  if (diff === 1) return { texto: "vence amanhã", classe: "amanha" };
  return { texto: `vence em: ${diff} dias`, classe: "normal" };
}

function togglePrivacidade() {
    document.body.classList.toggle("modo-privado");
    localStorage.setItem("modoPrivado", document.body.classList.contains("modo-privado"));
    const btn = document.getElementById("btnPrivacidade");
    if(btn) btn.innerHTML = document.body.classList.contains("modo-privado") ? "🙈" : "👁️";
}

function toggleMenu(id) {
    const menu = document.getElementById(`menu-${id}`);
    const btn = document.getElementById(`btn-expand-${id}`);
    if (menu.style.display === "flex") {
        menu.style.display = "none";
        btn.classList.remove("aberto");
        btn.innerHTML = "🔻";
    } else {
        menu.style.display = "flex";
        btn.classList.add("aberto");
        btn.innerHTML = "🔺";
    }
}

/* ================= SISTEMA ================= */
function confirmarSeguranca(acao) {
  const n1 = Math.floor(Math.random() * 9) + 1;
  const n2 = Math.floor(Math.random() * 9) + 1;
  const soma = n1 + n2;
  const resposta = prompt(`🔒 Segurança para ${acao}:\nQuanto é ${n1} + ${n2}?`);
  return (resposta && parseInt(resposta) === soma);
}

function salvar() {
  try {
    localStorage.setItem("contas", JSON.stringify(contas));
    localStorage.setItem("logs", JSON.stringify(logs));
    const isLogAberto = document.getElementById("historicoLogs") && document.getElementById("historicoLogs").style.display === "block";
    if(!isLogAberto) render(); 
  } catch (e) { alert("Erro ao salvar."); }
}

function registrarLog(acao, detalhe, backupData = null, relatedId = null) {
    const agora = new Date();
    logs.unshift({ id: Date.now()+Math.random(), data: agora.toISOString(), acao, detalhe, backup: backupData, relatedId });
    if(logs.length > 50) logs.pop();
    salvar();
}

function desfazerAcaoLog(logId) {
    const logIndex = logs.findIndex(l => l.id === logId);
    if(logIndex === -1) return;
    const log = logs[logIndex];
    if (!log.backup) { alert("Irreversível."); return; }
    if (!confirm(`Desfazer: "${log.acao}"?`)) return;

    if (log.relatedId) {
        const relatedIndex = contas.findIndex(c => c.id === log.relatedId);
        if (relatedIndex !== -1) contas.splice(relatedIndex, 1);
    }
    if (log.acao.includes("EXCLUÍDO")) {
        contas.push(log.backup);
    } else {
        const contaIndex = contas.findIndex(c => c.id === log.backup.id);
        if (contaIndex !== -1) contas[contaIndex] = log.backup;
        else contas.push(log.backup);
    }
    logs.splice(logIndex, 1);
    salvar(); abrirHistorico(); alert("Desfeito! ↩️");
}

/* ================= RENDERIZAÇÃO ================= */
function render() {
  const lista = document.getElementById("lista");
  if(!lista) return;
  lista.innerHTML = "";

  if(!document.getElementById("btnPrivacidade")) {
      const divFiltros = document.querySelector(".filtros");
      if(divFiltros && !divFiltros.previousElementSibling.classList.contains("busca-container")) {
          const divBusca = document.createElement("div");
          divBusca.className = "busca-container";
          divBusca.style.cssText = "display:flex; gap:10px; padding:0 15px; margin-top:10px;";
          const iconeOlho = document.body.classList.contains("modo-privado") ? "🙈" : "👁️";
          divBusca.innerHTML = `<input type="text" id="inputBusca" placeholder="🔍 Buscar..." onkeyup="render()" style="flex:1; padding:10px; border-radius:20px; border:1px solid #444; background:#222; color:white; text-align:center;"><button id="btnPrivacidade" onclick="togglePrivacidade()" style="background:none; border:none; font-size:22px; cursor:pointer;">${iconeOlho}</button>`;
          divFiltros.parentNode.insertBefore(divBusca, divFiltros);
      }
  }

  const termo = document.getElementById("inputBusca") ? document.getElementById("inputBusca").value.toLowerCase() : "";
  const contasComIndex = contas.map((c, i) => ({...c, originalIndex: i}));
  const grupos = {};
  
  [...contasComIndex].sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento)).forEach(c => {
      const k = mesAno(c.vencimento);
      if(!grupos[k]) grupos[k] = [];
      grupos[k].push(c);
  });

  if (Object.keys(grupos).length === 0) {
      lista.innerHTML = `<div style="text-align:center; padding:30px; color:#666;">Nenhuma conta encontrada.</div>`;
      return;
  }

  Object.keys(grupos).forEach(k => {
    const todasDoMes = grupos[k];
    let totalMes = 0, pagoMes = 0;
    todasDoMes.forEach(c => { totalMes += c.valor; if(c.paga) pagoMes += c.valor; });
    const faltaMes = totalMes - pagoMes;
    let pct = totalMes > 0 ? (pagoMes / totalMes) * 100 : 0;

    const contasVisiveis = todasDoMes.filter(c => {
        if (termo) return c.nome.toLowerCase().includes(termo);
        if (filtro === "pagas") return c.paga;
        if (filtro === "todas") return !c.oculta; 
        return true;
    });

    if (!termo && contasVisiveis.length === 0) return;

    const bloco = document.createElement("div");
    bloco.className = "mes-container";
    bloco.innerHTML = `
      <div class="cabecalho-mes"><h3>📅 ${k}</h3><div class="acoes-mes"><button onclick="compartilharMes('${k}')">📤</button><button onclick="baixarPdfMes('${k}')">📄</button></div></div>
      <div class="resumo-mes">
          <div class="resumo-item"><small>Total</small><strong class="texto-branco">R$ ${totalMes.toFixed(2)}</strong></div>
          <div class="resumo-item"><small>Pago</small><strong class="texto-verde">R$ ${pagoMes.toFixed(2)}</strong></div>
          <div class="resumo-item"><small>Falta</small><strong class="texto-vermelho">R$ ${faltaMes.toFixed(2)}</strong></div>
          <div class="barra-container"><div class="barra-fundo"><div class="barra-preenchimento" style="width: ${pct}%"></div></div><div class="barra-texto">${pct.toFixed(0)}% Pago</div></div>
      </div>
    `;

    contasVisiveis.forEach(c => {
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
      } else if (c.recorrente) htmlParcelas = `<div class="info-parcelas"><div>🔄 Recorrente</div></div>`;

      let obsHtml = c.obs ? `<div style="font-size:11px; color:#ff9800; margin-top:5px;">⚠️ ${c.obs}</div>` : "";
      
      let btnPrincipal = !c.paga ? `<button class="btn-pagar" onclick="iniciarPagamento(${c.originalIndex})">✅ PAGAR</button>` : `<button class="btn-reverter" onclick="desfazerPagamento(${c.originalIndex})">↩️ DESFAZER</button>`;

      const menuId = `menu-${c.id}`; 
      const btnExpandId = `btn-expand-${c.id}`;
      const menuBotoes = `
        <button onclick="copiarPix(${c.originalIndex})">📋 Copiar Pix</button>
        <button onclick="adiarConta(${c.originalIndex})">⏩ Jogar p/ Mês Seguinte</button>
        <button onclick="clonarConta(${c.originalIndex})">🧬 Clonar Conta</button>
        ${!c.paga ? `<button onclick="ocultarConta(${c.originalIndex})">👁 Arquivar (Ocultar)</button>` : ''}
        <button onclick="editarConta(${c.originalIndex})">✏️ Editar Dados</button>
        <button onclick="gerarComprovanteIndividual(${c.originalIndex})">📄 Gerar PDF</button>
        <button onclick="compartilharIndividual(${c.originalIndex})">📱 Mandar no Zap</button>
        <button onclick="deletarConta(${c.originalIndex})" style="color:#ef5350; border-color:#ef5350;">🗑️ Excluir Definitivamente</button>
      `;

      div.className = classes;
      div.innerHTML = `
        ${badgeHtml}
        <div style="font-size: 1.1em; margin-bottom: 5px;"><strong>${icone} ${c.nome}</strong></div>
        <div style="font-size: 1.2em; font-weight: bold;">💰 R$ ${c.valor.toFixed(2)}</div>
        <div style="margin-top: 5px;">📅 ${isoParaBR(c.vencimento)}</div>
        ${obsHtml}
        <small class="vencimento ${vencInfo.classe}">${c.paga ? "PAGO ✅" : vencInfo.texto}</small>
        ${htmlParcelas}
        <div class="acoes-principal">${btnPrincipal}<button id="${btnExpandId}" class="btn-expandir" onclick="toggleMenu('${c.id}')">🔻</button></div>
        <div id="${menuId}" class="menu-secundario">${menuBotoes}</div>
      `;
      bloco.appendChild(div);
    });
    lista.appendChild(bloco);
  });
}
/* ================= PAGAMENTO ================= */
function iniciarPagamento(i) {
    if (!confirmarSeguranca("PAGAR CONTA")) return;
    const c = contas[i];
    const tipo = prompt(`Valor: R$ ${c.valor.toFixed(2)}\n\n1 - TOTAL\n2 - PARCIAL`, "1");
    const backup = JSON.parse(JSON.stringify(c));

    if (tipo === "1") {
        c.paga = true; c.oculta = true; c.dataPagamento = new Date().toISOString().split("T")[0];
        let idNovaConta = null;
        if (c.recorrente) {
            let gerar = true; let novaParcela = (c.parcelaAtual || 1) + 1; let totalP = c.totalParcelas || 0;
            if (typeof c.repeticoes === "number") { c.repeticoes--; if (c.repeticoes <= 0) gerar = false; }
            if (totalP > 0 && novaParcela > totalP) gerar = false;
            if (gerar) {
                const nova = { ...c, id: Date.now()+Math.random(), paga: false, oculta: false, dataPagamento: null, obs: null, vencimento: proximoMes(c.vencimento), parcelaAtual: novaParcela, totalParcelas: totalP };
                contas.push(nova); idNovaConta = nova.id;
            }
        }
        registrarLog("PAGAMENTO TOTAL", `Pagou ${c.nome}`, backup, idNovaConta);
        salvar(); alert("Pago! ✅");

    } else if (tipo === "2") {
        const valorPagoStr = prompt("Valor pago agora:", c.valor);
        if(!valorPagoStr) return;
        const valorPago = parseFloat(valorPagoStr.replace(",", "."));
        if(isNaN(valorPago) || valorPago <= 0 || valorPago >= c.valor) { alert("Valor inválido."); return; }

        const restante = c.valor - valorPago;
        const mover = confirm(`Restam R$ ${restante.toFixed(2)}.\nJogar para o PRÓXIMO mês?\n\nOK = Sim\nCancelar = Não (Mantém neste)`);

        const regPag = { ...c, id: Date.now()+Math.random(), nome: `${c.nome} (Parcial)`, valor: valorPago, paga: true, oculta: true, dataPagamento: new Date().toISOString().split("T")[0], obs: `Pagamento parcial. Restou R$ ${restante.toFixed(2)}` };
        contas.push(regPag);

        c.valor = restante; c.obs = `Restante parcial.`;
        if (mover) { c.vencimento = proximoMes(c.vencimento); c.obs += ` Adiado.`; }
        
        registrarLog("PAGAMENTO PARCIAL", `${c.nome}: Pagou R$ ${valorPago}, restou R$ ${restante}`, backup, regPag.id);
        salvar(); alert("Parcial registrado! ⚠️");
    }
}

/* ================= HISTÓRICO GLOBAL (LOGS) ================= */
function abrirHistorico() {
    document.getElementById("lista").style.display = "none";
    document.querySelector(".filtros").style.display = "none";
    const mesContainer = document.querySelector(".mes-container"); if(mesContainer) mesContainer.style.display = "none";
    
    document.getElementById("historicoLogs").style.display = "block";
    const listaLogs = document.getElementById("listaLogs");
    listaLogs.innerHTML = "";
    listaLogs.innerHTML += `<button onclick="compartilharLog()" style="width:100%; margin-bottom:15px; background:#0288d1; color:white; border:none; padding:10px; border-radius:8px;">📤 Compartilhar Relatório de Logs</button>`;

    if(logs.length === 0) { listaLogs.innerHTML += "<p style='text-align:center; color:#888;'>Vazio.</p>"; return; }

    logs.forEach(log => {
        const item = document.createElement("div");
        item.style.cssText = "background:#222; margin:5px 0; padding:10px; border-radius:8px; border-left:3px solid #7b2ff7; display:flex; justify-content:space-between; align-items:center;";
        const btnDesfazer = log.backup ? `<button class="btn-undo" onclick="desfazerAcaoLog(${log.id})">↩️ Desfazer</button>` : "";
        item.innerHTML = `<div><div style="font-size:10px; color:#aaa;">${new Date(log.data).toLocaleString()}</div><div style="font-weight:bold; color:white;">${log.acao}</div><div style="color:#ddd; font-size:12px;">${log.detalhe}</div></div><div>${btnDesfazer}</div>`;
        listaLogs.appendChild(item);
    });
}

function compartilharLog() {
    let texto = "📜 *Log de Atividades*\n\n";
    logs.forEach(l => { texto += `[${new Date(l.data).toLocaleDateString()}] ${l.acao}: ${l.detalhe}\n`; });
    enviarWhatsapp(texto);
}

function fecharHistoricoLogs() {
    document.getElementById("historicoLogs").style.display = "none";
    document.getElementById("lista").style.display = "block";
    document.querySelector(".filtros").style.display = "flex";
    render(); 
}
function apagarLog(i) { if(confirm("Apagar registro?")) { logs.splice(i, 1); salvar(); abrirHistorico(); } }
function limparLogs(tipo) {
    if(!confirm("Limpar?")) return;
    const agora = new Date();
    if (tipo === "tudo") logs = [];
    else logs = logs.filter(l => {
        const d = new Date(l.data);
        if (tipo === "dia") return d.toDateString() !== agora.toDateString(); 
        if (tipo === "mes") return d.getMonth() !== agora.getMonth(); 
        return true;
    });
    salvar(); abrirHistorico();
}

/* ================= CRUD ================= */
function adicionarConta() {
  const nome = prompt("Nome:"); if (!nome) return;
  const valorStr = prompt("Valor:"); if (!valorStr) return;
  const valor = parseFloat(valorStr.replace(",", "."));
  const data = prompt("Vencimento (DD/MM/AAAA):"); if (!data) return;
  const codigoPix = prompt("Pix (Opcional):");
  
  let recorrente = confirm("Recorrente (Mensal)?");
  let repeticoes = null, totalParcelas = 0;
  if (recorrente) { 
      const r = prompt("Quantas parcelas? (Digite 0 para infinito)"); 
      const n = Number(r); 
      if (n > 0) { repeticoes = n; totalParcelas = n; } 
  }

  contas.push({ id: Date.now()+Math.random(), nome, valor, vencimento: brParaISO(data), codigoPix: codigoPix || "", paga: false, oculta: false, recorrente, repeticoes, totalParcelas, parcelaAtual: recorrente ? 1 : null, dataPagamento: null });
  registrarLog("CRIADO", `Nova conta: ${nome} - R$ ${valor}`);
  salvar();
}

function editarConta(i) {
    if (!confirmarSeguranca("EDITAR")) return;
    const c = contas[i]; const backup = JSON.parse(JSON.stringify(c));
    
    const novoNome = prompt("Nome:", c.nome); if (novoNome === null) return; 
    const novoValorStr = prompt("Valor:", c.valor); if (novoValorStr === null) return;
    const novoValor = parseFloat(novoValorStr.replace(",", "."));
    const novaData = prompt("Data:", isoParaBR(c.vencimento)); if (novaData === null) return;
    const novoPix = prompt("Pix:", c.codigoPix || "");
    
    const isRecorrente = confirm("Recorrente?");
    let novaParcelaAtual = null; let novoTotalParcelas = null;
    if (isRecorrente) {
        const pAtual = prompt("Parcela Atual?", c.parcelaAtual || 1); novaParcelaAtual = pAtual ? parseInt(pAtual) : 1;
        const pTotal = prompt("Total Parcelas?", c.totalParcelas || ""); novoTotalParcelas = (pTotal && parseInt(pTotal) > 0) ? parseInt(pTotal) : null;
    }

    if (!novoNome || isNaN(novoValor) || !novaData) { alert("Inválido."); return; }
    c.nome = novoNome; c.valor = novoValor; c.vencimento = brParaISO(novaData);
    c.codigoPix = novoPix || ""; c.recorrente = isRecorrente; c.parcelaAtual = novaParcelaAtual; c.totalParcelas = novoTotalParcelas;
    
    registrarLog("EDITADO", `Alterou ${c.nome}`, backup);
    salvar();
}

function adiarConta(i) {
    if (!confirmarSeguranca("MOVER")) return;
    const c = contas[i]; const backup = JSON.parse(JSON.stringify(c));
    const novaData = prompt("Nova data:", isoParaBR(proximoMes(c.vencimento)));
    if (novaData) { c.vencimento = brParaISO(novaData); registrarLog("ADIADO", `${c.nome} para ${novaData}`, backup); salvar(); }
}
function ocultarConta(i) { 
    if(!confirmarSeguranca("ARQUIVAR")) return;
    const backup = JSON.parse(JSON.stringify(contas[i]));
    contas[i].oculta = true; registrarLog("ARQUIVADO", `Ocultou ${contas[i].nome}`, backup); salvar(); 
}
function deletarConta(i) {
    if(confirmarSeguranca("EXCLUIR")) {
        const backup = JSON.parse(JSON.stringify(contas[i]));
        registrarLog("EXCLUÍDO", `Apagou ${contas[i].nome}`, backup);
        contas.splice(i,1); salvar();
    }
}
function desfazerPagamento(i) { 
    if (!confirmarSeguranca("DESFAZER")) return; 
    const backup = JSON.parse(JSON.stringify(contas[i]));
    contas[i].paga = false; contas[i].dataPagamento = null; contas[i].oculta = false; 
    registrarLog("REVERTEU PGTO", `Voltou ${contas[i].nome}`, backup); salvar(); 
}
function clonarConta(i) {
    if(!confirm("Clonar?")) return;
    const original = contas[i];
    const copia = { ...original, id: Date.now()+Math.random(), nome: original.nome + " (Cópia)", paga: false, oculta: false, dataPagamento: null, recorrente: false };
    contas.push(copia); registrarLog("CLONADO", `Clonou ${original.nome}`); salvar();
}
function copiarPix(i) { const c = contas[i]; if(c.codigoPix) navigator.clipboard.writeText(c.codigoPix).then(()=>alert("Copiado!")); }

/* ================= EXTRAS (PDF PRO, BACKUP, WHATSAPP) ================= */
function baixarBackup() { 
    const d = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({contas, logs})); 
    const a = document.createElement('a'); a.href = d; a.download = "backup.json"; document.body.appendChild(a); a.click(); a.remove(); 
}
function lerArquivoBackup(input) { 
    const file = input.files[0]; if(!file) return; 
    const reader = new FileReader(); 
    reader.onload = function(e) { 
        try { 
            const dados = JSON.parse(e.target.result); 
            if (Array.isArray(dados)) {
                if(confirm("Restaurar backup antigo?")) { 
                    contas = dados; logs = []; 
                    contas.forEach(c => { if(!c.id) c.id = Date.now() + Math.random(); });
                    salvar(); alert("Restaurado!"); location.reload(); 
                } 
            } else if (dados.contas) {
                if(confirm("Restaurar backup completo?")) { 
                    contas = dados.contas; logs = dados.logs || [];
                    salvar(); alert("Restaurado!"); location.reload(); 
                }
            } else alert("Inválido.");
        } catch(err) { alert("Erro ao ler."); } 
    }; 
    reader.readAsText(file); 
}

// === COMPARTILHAMENTO INTELIGENTE (WHATSAPP DIRETO) ===
function enviarWhatsapp(texto) {
    // Tenta API nativa primeiro, se falhar, abre link do zap
    if (navigator.share) {
        navigator.share({ title: 'Minhas Contas', text: texto }).catch(() => {
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
        });
    } else {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
    }
}

function compartilharMes(mes) {
  let texto = `📅 *Resumo - ${mes}*\n\n`;
  const contasDoMes = contas.filter(c => mesAno(c.vencimento) === mes).sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento));
  let total = 0, pago = 0;

  contasDoMes.forEach(c => {
    if(filtro === "pagas" && !c.paga) return;
    total += c.valor;
    if(c.paga) {
        pago += c.valor;
        texto += `✅ ${c.nome}: R$ ${c.valor.toFixed(2)}\n`;
    } else {
        const [ano, m, dia] = c.vencimento.split('-');
        texto += `⭕ ${c.nome} (${dia}/${m}): R$ ${c.valor.toFixed(2)}\n`;
    }
  });

  const falta = total - pago;
  texto += `\n--------------------\n💰 Total: R$ ${total.toFixed(2)}\n✅ Pago: R$ ${pago.toFixed(2)}\n⏳ Falta: R$ ${falta.toFixed(2)}`;
  
  enviarWhatsapp(texto);
}

function compartilharIndividual(i) { 
    const c = contas[i]; 
    const t = `🧾 *Conta*\n\n📌 ${c.nome}\n💰 R$ ${c.valor.toFixed(2)}\n🗓 Vencimento: ${isoParaBR(c.vencimento)}\n${c.paga ? '✅ PAGO' : '⭕ PENDENTE'}`; 
    enviarWhatsapp(t); 
}

// === PDF PROFISSIONAL (NOTA FISCAL) ===
function baixarPdfMes(mes) {
    if(!window.jspdf) { alert("Erro biblioteca PDF."); return; }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const contasDoMes = contas.filter(c => mesAno(c.vencimento) === mes && (filtro === "todas" || (filtro === "pagas" && c.paga)));
    
    // Configurações
    pdf.setFont("courier");
    let y = 15;

    // Cabeçalho
    pdf.setLineWidth(0.5);
    pdf.rect(10, 10, 190, 25); // Box Topo
    pdf.setFontSize(16); pdf.setFont(undefined, 'bold');
    pdf.text("DEMONSTRATIVO FINANCEIRO", 105, 18, {align:'center'});
    pdf.setFontSize(10); pdf.setFont(undefined, 'normal');
    pdf.text(`PERÍODO: ${mes}`, 105, 25, {align:'center'});
    pdf.text(`EMITIDO EM: ${new Date().toLocaleDateString()}`, 105, 30, {align:'center'});

    // Tabela com AutoTable
    let dadosTabela = [];
    let total = 0, pago = 0;
    contasDoMes.forEach(c => {
        total += c.valor; if(c.paga) pago += c.valor;
        dadosTabela.push([
            c.nome, 
            isoParaBR(c.vencimento), 
            c.paga ? "PAGO" : "ABERTO", 
            `R$ ${c.valor.toFixed(2)}`
        ]);
    });

    pdf.autoTable({
        head: [['CONTA', 'VENCIMENTO', 'STATUS', 'VALOR']],
        body: dadosTabela,
        startY: 40,
        theme: 'grid', // Estilo grade
        styles: { font: "courier", fontSize: 10 },
        headStyles: { fillColor: [40, 40, 40] } // Cabeçalho escuro
    });

    // Rodapé Totais
    y = pdf.lastAutoTable.finalY + 10;
    pdf.rect(10, y, 190, 20);
    pdf.setFont(undefined, 'bold');
    pdf.text(`TOTAL GERAL: R$ ${total.toFixed(2)}`, 15, y+8);
    pdf.text(`TOTAL PAGO:  R$ ${pago.toFixed(2)}`, 15, y+15);
    pdf.text(`RESTANTE:    R$ ${(total-pago).toFixed(2)}`, 110, y+8);

    // Código Verificação Falso
    const hash = Math.random().toString(36).substring(2, 15).toUpperCase();
    pdf.setFontSize(8); pdf.setTextColor(100);
    pdf.text(`AUTENTICAÇÃO: ${hash}-${Date.now()}`, 105, 285, {align:'center'});
    
    // Código de Barras Fake
    pdf.setFillColor(0);
    pdf.rect(70, 270, 70, 8, 'F'); 

    pdf.save(`relatorio_${mes.replace('/','-')}.pdf`);
}

function gerarComprovanteIndividual(i) {
    if(!window.jspdf) { alert("Erro PDF"); return; }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const c = contas[i];
    
    pdf.rect(10, 10, 190, 120); // Borda Grande
    pdf.setFontSize(22); pdf.setFont(undefined, 'bold');
    pdf.text("RECIBO", 105, 25, {align:'center'});
    
    pdf.setFontSize(12); pdf.setFont(undefined, 'normal');
    pdf.text(`Pagador: Sutello`, 20, 40);
    pdf.text(`Referente a: ${c.nome}`, 20, 50);
    pdf.text(`Vencimento: ${isoParaBR(c.vencimento)}`, 20, 60);
    
    pdf.setFontSize(16); pdf.setFont(undefined, 'bold');
    pdf.text(`VALOR: R$ ${c.valor.toFixed(2)}`, 20, 80);
    
    if(c.paga) {
        pdf.setTextColor(0,150,0);
        pdf.text("SITUAÇÃO: PAGO", 20, 95);
        pdf.setFontSize(10); pdf.setTextColor(0);
        pdf.text(`Data Pagamento: ${isoParaBR(c.dataPagamento)}`, 20, 102);
    } else {
        pdf.setTextColor(200,0,0);
        pdf.text("SITUAÇÃO: PENDENTE", 20, 95);
    }
    
    pdf.setLineWidth(0.5); pdf.line(20, 110, 190, 110);
    pdf.setFontSize(9); pdf.setTextColor(100);
    pdf.text(`Hash: ${Math.random().toString(36).toUpperCase()}`, 105, 118, {align:'center'});
    
    pdf.save(`recibo_${c.nome}.pdf`);
}

function abrirOpcoes() { document.getElementById("modalOpcoes").style.display = "flex"; }
function fecharOpcoes() { document.getElementById("modalOpcoes").style.display = "none"; }
function abrirCalculadora() { document.getElementById("modalCalc").style.display = "flex"; }
function fecharCalculadora() { document.getElementById("modalCalc").style.display = "none"; }
let calcExpressao = "";
function calcAdd(v) { calcExpressao += v; document.getElementById("calcDisplay").value = calcExpressao; }
function calcLimpar() { calcExpressao = ""; document.getElementById("calcDisplay").value = ""; }
function calcCalcular() { try { document.getElementById("calcDisplay").value = eval(calcExpressao); } catch { alert("Erro"); } }
function fecharAviso() { const av = document.getElementById("avisoSwipe"); if(av) av.remove(); }
function setFiltro(f, btn) {
  filtro = f;
  document.querySelectorAll(".filtros button").forEach(b => b.classList.remove("ativo"));
  btn.classList.add("ativo");
  render();
}

document.addEventListener("DOMContentLoaded", () => {
   if(localStorage.getItem("modoPrivado") === "true") document.body.classList.add("modo-privado");
});

function desbloquear() {
  const pinInput = document.getElementById("pin");
  if (pinInput && pinInput.value !== PIN) { alert("PIN incorreto."); pinInput.value = ""; return; }
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
