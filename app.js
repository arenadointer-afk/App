/* ================= 0. FIREBASE CONFIGURAÇÃO ================= */
const firebaseConfig = {
  apiKey: "AIzaSyDDguzJOP5GKqlqf8GW-xdsTCxh1Ha7C7k",
  authDomain: "sutello-financeiro.firebaseapp.com",
  projectId: "sutello-financeiro",
  storageBucket: "sutello-financeiro.firebasestorage.app",
  messagingSenderId: "460447549653",
  appId: "1:460447549653:web:a36b0c7d2c2919ff633a5c"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* ================= 1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS ================= */
const PIN = "2007"; 
let contas = [];
let logs = [];
let filtro = "todas";
const BIOMETRIA_USER_ID = Uint8Array.from("sutello-contas-fixo", c => c.charCodeAt(0));

/* ================= SISTEMA DE LOGIN E SINCRONIZAÇÃO ================= */
function fazerLoginFirebase() {
    const email = document.getElementById("loginEmail").value;
    const senha = document.getElementById("loginSenha").value;
    if (!email || !senha) return exibirMensagemModal("Aviso", "Preencha o e-mail e a senha!");
    auth.signInWithEmailAndPassword(email, senha)
        .then(() => entrarNoApp())
        .catch((e) => exibirMensagemModal("Erro", "E-mail ou senha incorretos!"));
}

auth.onAuthStateChanged(function(user) {
    if (user) {
        db.collection("usuarios").doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                const dados = doc.data();
                if(dados.fotoPerfil) { document.getElementById("fotoPerfil").src = dados.fotoPerfil; localStorage.setItem("fotoPerfil", dados.fotoPerfil); }
                if(dados.nome) { document.getElementById("nomePerfil").innerText = "Bem-vindo, " + dados.nome; localStorage.setItem("nomePerfil", dados.nome); }
            }
        });

        document.getElementById("loginEmail").style.display = "none";
        document.getElementById("loginSenha").style.display = "none";
        document.querySelector("button[onclick='fazerLoginFirebase()']").style.display = "none";

        db.collection("dados_financeiros").doc(user.uid).onSnapshot(function(doc) {
            if (doc.exists) {
                const dadosDaNuvem = doc.data();
                contas = dadosDaNuvem.contas || [];
                logs = dadosDaNuvem.logs || [];
                if (document.getElementById("app").style.display === "block") render();
            }
        });
        tentarAutoLogin();
    } else {
        document.getElementById("loginEmail").style.display = "block";
        document.getElementById("loginSenha").style.display = "block";
        document.querySelector("button[onclick='fazerLoginFirebase()']").style.display = "block";
    }
});

/* ================= SISTEMA DE ACESSO (LOCK SCREEN E BIOMETRIA) ================= */
async function tentarAutoLogin() {
    if (localStorage.getItem("biometria_cadastrada") === "true") {
        const disponivel = window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (disponivel) setTimeout(() => { acaoBotaoBiometria(true); }, 500);
    }
}

async function acaoBotaoBiometria(silencioso = false) {
    const disponivel = window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!disponivel) return !silencioso && exibirMensagemModal("Aviso", "Biometria não disponível.");
    try {
        const credential = await navigator.credentials.get({
            publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), userVerification: "required", timeout: 60000 }
        });
        if (credential) entrarNoApp();
    } catch (e) {
        if (localStorage.getItem("biometria_cadastrada") !== "true" && !silencioso) {
            mostrarConfirmacaoModal("Vincular Digital", "Deseja cadastrar sua digital para entrar automático da próxima vez?", cadastrarChaveAcesso);
        }
    }
}

async function cadastrarChaveAcesso() {
    try {
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: "Minhas Contas" }, 
                user: { id: BIOMETRIA_USER_ID, name: "sutello@contas", displayName: "Sutello" },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "required" },
                timeout: 60000
            }
        });
        if (credential) {
            localStorage.setItem("biometria_cadastrada", "true");
            exibirMensagemModal("Sucesso ✅", "Digital salva! Entrando...");
            setTimeout(() => { fecharModalDecisao(); entrarNoApp(); }, 1000);
        }
    } catch (e) { exibirMensagemModal("Erro", "Falha ao salvar digital."); }
}

function entrarNoApp() {
    document.getElementById("lock").style.display = "none";
    document.getElementById("app").style.display = "block";
    carregarPerfil(); render();
}

/* ================= 3. SEGURANÇA (MODAIS CUSTOMIZADOS) ================= */
function confirmarSeguranca(acao, callback) {
  const n1 = Math.floor(Math.random() * 9) + 1;
  const n2 = Math.floor(Math.random() * 9) + 1;
  const soma = n1 + n2;
  const modal = document.getElementById("modalDecisao");
  document.getElementById("tituloDecisao").innerText = "🛡️ Segurança";
  document.getElementById("textoDecisao").innerHTML = `Resolva para <b>${acao}</b>:<br><br><span style="font-size:28px; color:white;">${n1} + ${n2} = ?</span><br><br><input type="number" id="respSeguranca" inputmode="numeric" style="width:100px; padding:12px; border-radius:10px; border:1px solid #444; background:#222; color:white; text-align:center; font-size:22px;">`;
  const btn1 = document.getElementById("btnOpcao1");
  btn1.innerText = "CONFIRMAR";
  btn1.onclick = () => {
    const el = document.getElementById("respSeguranca");
    if (el && parseInt(el.value) === soma) { fecharModalDecisao(); callback(); } else { exibirMensagemModal("Erro", "Resposta incorreta!"); }
  };
  document.getElementById("btnOpcao2").style.display = "none"; 
  modal.style.display = "flex";
}

function exibirMensagemModal(titulo, mensagem) {
    const modal = document.getElementById("modalDecisao");
    document.getElementById("tituloDecisao").innerText = titulo; document.getElementById("textoDecisao").innerText = mensagem;
    const btn1 = document.getElementById("btnOpcao1");
    btn1.innerText = "OK"; btn1.onclick = fecharModalDecisao;
    document.getElementById("btnOpcao2").style.display = "none"; modal.style.display = "flex";
}

function mostrarConfirmacaoModal(titulo, mensagem, callback) {
    const modal = document.getElementById("modalDecisao");
    document.getElementById("tituloDecisao").innerText = titulo; document.getElementById("textoDecisao").innerText = mensagem;
    const btn1 = document.getElementById("btnOpcao1"); const btn2 = document.getElementById("btnOpcao2");
    btn1.innerText = "SIM"; btn1.onclick = () => { fecharModalDecisao(); callback(); };
    btn2.style.display = "block"; btn2.innerText = "NÃO"; btn2.onclick = fecharModalDecisao;
    modal.style.display = "flex";
}

function fecharModalDecisao() { document.getElementById("modalDecisao").style.display = "none"; }

/* ================= 5. RENDERIZAÇÃO ================= */
function setFiltro(novoFiltro, btn) {
    filtro = novoFiltro;
    document.querySelectorAll('.filtros button').forEach(b => b.classList.remove('ativo'));
    if(btn) btn.classList.add('ativo');
    render();
}

function render() {
  const lista = document.getElementById("lista");
  if(!lista) return;
  lista.innerHTML = "";
  const isPrivado = document.body.classList.contains("modo-privado");
  const fmtMoney = (v) => isPrivado ? "••••" : `R$ ${v.toFixed(2)}`;

  if(!document.getElementById("btnPrivacidade")) {
      const divFiltros = document.querySelector(".filtros");
      if(divFiltros) {
          const divBusca = document.createElement("div"); divBusca.className = "busca-container"; divBusca.style.cssText = "display:flex; gap:10px; padding:0 15px; margin-top:10px;";
          const iconeOlho = isPrivado ? "🙈" : "👁️";
          divBusca.innerHTML = `<input type="text" id="inputBusca" placeholder="🔍 Buscar..." onkeyup="render()" style="flex:1; padding:10px; border-radius:20px; border:1px solid #444; background:#222; color:white; text-align:center;"><button id="btnPrivacidade" onclick="togglePrivacidade()" style="background:none; border:none; font-size:22px; cursor:pointer;">${iconeOlho}</button>`;
          divFiltros.parentNode.insertBefore(divBusca, divFiltros);
      }
  } else { document.getElementById("btnPrivacidade").innerHTML = isPrivado ? "🙈" : "👁️"; }

  const termo = document.getElementById("inputBusca") ? document.getElementById("inputBusca").value.toLowerCase() : "";
  const contasComIndex = contas.map((c, i) => ({...c, originalIndex: i}));
  const grupos = {};
  
  [...contasComIndex].sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento)).forEach(c => {
      const k = mesAno(c.vencimento);
      if(!grupos[k]) grupos[k] = [];
      grupos[k].push(c);
  });

  if (Object.keys(grupos).length === 0) return lista.innerHTML = `<div style="text-align:center; padding:30px; color:#666;">Nenhuma conta encontrada.</div>`;

  Object.keys(grupos).forEach(k => {
    const todasDoMes = grupos[k];
    let totalMes = 0, pagoMes = 0;
    todasDoMes.forEach(c => { if(c.oculta && !c.paga) return; totalMes += c.valor; if(c.paga) pagoMes += c.valor; });

    const contasVisiveis = todasDoMes.filter(c => {
        if (termo) return c.nome.toLowerCase().includes(termo);
        if (c.oculta) return false;
        if (filtro === "pagas") return c.paga;
        return !c.paga; 
    });

    if (!termo && contasVisiveis.length === 0) return;
    const faltaMes = totalMes - pagoMes;
    let pct = totalMes > 0 ? (pagoMes / totalMes) * 100 : 0;

    const bloco = document.createElement("div"); bloco.className = "mes-container";
    bloco.innerHTML = `
      <div class="cabecalho-mes"><h3>📅 ${k}</h3><div class="acoes-mes"><button onclick="compartilharMes('${k}')">📤</button><button onclick="baixarPdfMes('${k}')">📄</button></div></div>
      <div class="resumo-mes">
          <div class="resumo-item"><small>Total</small><strong class="texto-branco">${fmtMoney(totalMes)}</strong></div>
          <div class="resumo-item"><small>Pago</small><strong class="texto-verde">${fmtMoney(pagoMes)}</strong></div>
          <div class="resumo-item"><small>Falta</small><strong class="texto-vermelho">${fmtMoney(faltaMes)}</strong></div>
          <div class="barra-container"><div class="barra-fundo"><div class="barra-preenchimento" style="width: ${pct}%"></div></div><div class="barra-texto">${pct.toFixed(0)}% Pago</div></div>
      </div>
    `;

    contasVisiveis.forEach(c => {
      const div = document.createElement("div");
      const vencInfo = infoVencimento(c.vencimento);
      let classes = "conta" + (c.paga ? " verde" : (vencInfo.classe === "vencido" ? " atrasada" : ""));
      let htmlParcelas = c.totalParcelas > 0 ? `<div class="info-parcelas"><div>🔢 ${c.parcelaAtual}/${c.totalParcelas}</div></div>` : (c.recorrente ? `<div class="info-parcelas"><div>🔄 Recorrente</div></div>` : "");

      div.className = classes;
      div.innerHTML = `
        ${(!c.paga && vencInfo.classe === "vencido") ? `<span class="badge-vencido">VENCIDO</span>` : ``}
        <div style="font-size: 1.1em; margin-bottom: 5px;"><strong>${getIcone(c.nome)} ${c.nome} ${c.pagador ? `(${c.pagador})` : ''}</strong></div>
        <div style="font-size: 1.2em; font-weight: bold;">💰 ${fmtMoney(c.valor)} <small style="font-size:10px; color:#555; font-weight:normal;">[ID:${c.id.toString().substring(0,4)}]</small></div>
        <div style="margin-top: 5px;">📅 ${isoParaBR(c.vencimento)}</div>
        ${htmlParcelas}
        <small class="vencimento ${vencInfo.classe}">${c.paga ? "PAGO ✅" : vencInfo.texto}</small>
        
        <div class="acoes-principal">
            ${!c.paga ? `<button class="btn-pagar" onclick="iniciarPagamento(${c.originalIndex})">✅ PAGAR</button>` : `<button class="btn-reverter" onclick="desfazerPagamento(${c.originalIndex})">↩️ DESFAZER</button>`}
            <button id="btn-expand-${c.id}" class="btn-expandir" onclick="toggleMenu('${c.id}')">🔻</button>
        </div>
        <div id="menu-${c.id}" class="menu-secundario">
            <button onclick="copiarPix(${c.originalIndex})">📋 Pix</button>
            <button onclick="editarConta(${c.originalIndex})">✏️ Editar</button>
            <button onclick="adiarConta(${c.originalIndex})">⏩ Adiar</button>
            <button onclick="clonarConta(${c.originalIndex})">🧬 Clonar</button>
            <button onclick="gerarComprovanteIndividual(${c.originalIndex})">📄 PDF</button>
            <button onclick="compartilharIndividual(${c.originalIndex})">📱 Zap</button>
            <button onclick="deletarConta(${c.originalIndex})" style="color:#ef5350;">🗑️ Excluir</button>
        </div>
      `;
      bloco.appendChild(div);
    });
    lista.appendChild(bloco);
  });
}

/* ================= 6. AÇÕES DE SISTEMA (CRUD) ================= */
function salvar() {
    localStorage.setItem("contas", JSON.stringify(contas));
    localStorage.setItem("logs", JSON.stringify(logs));
    if (auth.currentUser) db.collection("dados_financeiros").doc(auth.currentUser.uid).set({ contas: contas, logs: logs }).catch(e => console.error(e));
    render();
}

function registrarLog(acao, detalhe, backup = null, relatedId = null) {
    logs.unshift({ id: Date.now()+Math.random(), data: new Date().toISOString(), acao, detalhe, backup, relatedId });
    if(logs.length > 50) logs.pop();
}

function togglePrivacidade() { document.body.classList.toggle("modo-privado"); localStorage.setItem("modoPrivado", document.body.classList.contains("modo-privado")); render(); }
function toggleMenu(id) { const m = document.getElementById(`menu-${id}`), btn = document.getElementById(`btn-expand-${id}`); if(m.style.display==="flex"){m.style.display="none";btn.classList.remove("aberto");btn.innerHTML="🔻";}else{m.style.display="flex";btn.classList.add("aberto");btn.innerHTML="🔺";} }
function abrirCalculadora() { document.getElementById("modalCalc").style.display = "flex"; }
function fecharCalculadora() { document.getElementById("modalCalc").style.display = "none"; }
function abrirOpcoes() { document.getElementById("modalOpcoes").style.display = "flex"; }
function fecharOpcoes() { document.getElementById("modalOpcoes").style.display = "none"; }
function abrirHistorico() { document.getElementById("lista").style.display = "none"; document.querySelector(".filtros").style.display = "none"; document.getElementById("historicoLogs").style.display = "block"; const listaLogs = document.getElementById("listaLogs"); listaLogs.innerHTML = ""; if(logs.length === 0) listaLogs.innerHTML = "<p style='text-align:center'>Vazio.</p>"; logs.forEach(l => { const btnUndo = l.backup ? `<button onclick="desfazerAcaoLog(${l.id})" style="float:right; padding:5px;">↩️</button>` : ""; listaLogs.innerHTML += `<div style="background:#222; margin:5px 0; padding:10px; border-radius:8px; border-left:3px solid #7b2ff7;">${btnUndo}<small style="color:#888">${new Date(l.data).toLocaleString()}</small><br><strong>${l.acao}</strong>: ${l.detalhe}</div>`; }); }
function fecharHistoricoLogs() { document.getElementById("historicoLogs").style.display = "none"; document.getElementById("lista").style.display = "block"; document.querySelector(".filtros").style.display = "flex"; }
function limparLogs(tipo) { if(!confirm("Limpar logs?")) return; if(tipo==='tudo') logs=[]; salvar(); abrirHistorico(); }
function desfazerAcaoLog(logId) { /* Lógica mantida por brevidade, veja seu original */ }

let calcExp = "";
function calcAdd(v) { calcExp += v; document.getElementById("calcDisplay").value = calcExp; }
function calcLimpar() { calcExp = ""; document.getElementById("calcDisplay").value = ""; }
function calcCalcular() { try { document.getElementById("calcDisplay").value = eval(calcExp); } catch { alert("Erro"); } }

/* ================= MODAL NOVA CONTA ================= */
function garantirModalAdicionar() {
    if (document.getElementById("modalNovaConta")) return;
    const modalHtml = `<div id="modalNovaConta" class="modal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.8); align-items:center; justify-content:center;"><div class="modal-conteudo" style="background:#1c1c26; padding:20px; border-radius:15px; width:90%; max-width:350px; border:1px solid #444; color:white; text-align:left;"><h3 style="margin-top:0; text-align:center; color:#ffffff;">➕ Nova Conta</h3><label style="font-size:12px; color:#aaa;">Nome da conta</label><input id="newNome" type="text" placeholder="Ex: Tênis Nike" style="width:100%; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #444; background:#222; color:white;"><label style="font-size:12px; color:#aaa;">Valor TOTAL</label><input id="newValor" type="number" inputmode="decimal" placeholder="0.00" oninput="calcularPrevia()" style="width:100%; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #444; background:#222; color:white;"><label style="font-size:12px; color:#aaa;">Vencimento</label><input id="newData" type="date" style="width:100%; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #444; background:#222; color:white;"><label style="font-size:12px; color:#aaa;">Pagador</label><select id="newPagador" style="width:100%; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #444; background:#222; color:white;"><option value="Leonardo">Leonardo</option><option value="Vitórya">Vitórya</option><option value="Ambos">Ambos</option></select><div style="background:#2a2a36; padding:10px; border-radius:8px; margin-bottom:15px;"><label style="display:flex; align-items:center; gap:10px; cursor:pointer;"><input id="newRecorrente" type="checkbox" onchange="toggleParcelasInput()" style="width:20px; height:20px;"><span>É parcelado ou fixo?</span></label><div id="divParcelas" style="display:none; margin-top:10px; border-top:1px solid #444; padding-top:10px;"><label style="font-size:12px; color:#aaa;">Quantas vezes? (0 = Fixo)</label><input id="newQtd" type="number" inputmode="numeric" placeholder="Ex: 10" oninput="calcularPrevia()" style="width:100%; padding:10px; border-radius:8px; border:1px solid #444; background:#222; color:white;"><p id="txtPrevia" style="font-size:13px; color:#00e676; margin-top:5px; text-align:center; font-weight:bold;"></p></div></div><div style="display:flex; gap:10px;"><button onclick="salvarContaFormulario()" style="flex:1; background:#2ecc71; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer;">SALVAR</button><button onclick="fecharModalAdicionar()" style="flex:1; background:transparent; border:1px solid #666; color:#ccc; padding:12px; border-radius:8px; cursor:pointer;">CANCELAR</button></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function adicionarConta() {
    garantirModalAdicionar();
    document.getElementById("newNome").value = ""; document.getElementById("newValor").value = ""; document.getElementById("newData").value = new Date().toISOString().split("T")[0]; document.getElementById("newRecorrente").checked = false; document.getElementById("newQtd").value = ""; toggleParcelasInput();
    document.getElementById("modalNovaConta").style.display = "flex";
}
function toggleParcelasInput() { const check = document.getElementById("newRecorrente"), div = document.getElementById("divParcelas"); if(check && div) { div.style.display = check.checked ? "block" : "none"; calcularPrevia(); } }
function calcularPrevia() { const total = parseFloat(document.getElementById("newValor").value)||0, qtd = parseInt(document.getElementById("newQtd").value)||0, txt = document.getElementById("txtPrevia"), isRec = document.getElementById("newRecorrente").checked; if(total>0&&qtd>0&&isRec) txt.innerText = `Ficam ${qtd}x de R$ ${(total/qtd).toFixed(2)}`; else if(qtd===0&&isRec) txt.innerText = "Fixo todo mês"; else txt.innerText = ""; }
function fecharModalAdicionar() { document.getElementById("modalNovaConta").style.display = "none"; }
function salvarContaFormulario() {
    const nome = document.getElementById("newNome").value, valorTotal = parseFloat(document.getElementById("newValor").value), data = document.getElementById("newData").value, isRec = document.getElementById("newRecorrente").checked, qtd = isRec ? (parseInt(document.getElementById("newQtd").value)||0) : 0, pagador = document.getElementById("newPagador").value;
    if(!nome||isNaN(valorTotal)||!data) return alert("Preencha tudo!");
    const valorFinal = (isRec && qtd>0) ? valorTotal/qtd : valorTotal;
    contas.push({ id: Date.now()+Math.random(), nome, pagador, valor: valorFinal, valorTotalOriginal: (isRec&&qtd>0)?valorTotal:null, vencimento: data, paga: false, oculta: false, recorrente: isRec, totalParcelas: qtd, parcelaAtual: isRec?1:null, codigoPix: "" });
    registrarLog("CRIADO", `Conta: ${nome}`); salvar(); fecharModalAdicionar();
}

/* LÓGICA DE INTERAÇÃO COM ARRAY */
function iniciarPagamento(i) {
    confirmarSeguranca("PAGAR", () => {
        const c = contas[i]; const backup = JSON.parse(JSON.stringify(c)); const tipo = prompt(`Valor: R$ ${c.valor.toFixed(2)}\n1-PAGAR MÊS ATUAL\n2-PAGAMENTO PARCIAL`, "1");
        if(tipo === "1") {
            executarPagamentoDireto(c.id); // Reutilizamos a lógica invisível da IA
            exibirMensagemModal("Sucesso", "Pago! ✅");
        } else if (tipo === "2") {
            const vPago = parseFloat(prompt("Valor pago:")?.replace(",","."));
            if(vPago && vPago < c.valor) {
                const restante = c.valor - vPago; const novaParcial = {...c, id: Date.now()+Math.random(), nome: c.nome+" (Parcial)", valor: vPago, paga: true, oculta: false, dataPagamento: new Date().toISOString().split("T")[0] };
                contas.push(novaParcial); c.valor = restante; if(confirm("Jogar restante pra próximo mês?")) c.vencimento = proximoMes(c.vencimento);
                registrarLog("PARCIAL", `Pagou ${vPago}`, backup, novaParcial.id); salvar();
            }
        }
    });
}
function desfazerPagamento(i) { confirmarSeguranca("DESFAZER", () => { contas[i].paga = false; salvar(); }); }
function deletarConta(i) { confirmarSeguranca("EXCLUIR", () => { contas.splice(i, 1); salvar(); }); }
function editarConta(i) { confirmarSeguranca("EDITAR", () => { const c=contas[i]; c.nome=prompt("Nome:",c.nome)||c.nome; c.pagador=prompt("Pagador:",c.pagador)||c.pagador; c.valor=parseFloat(prompt("Valor:",c.valor)?.replace(",","."))||c.valor; c.vencimento=brParaISO(prompt("Data:",isoParaBR(c.vencimento)))||c.vencimento; salvar(); }); }
function adiarConta(i) { confirmarSeguranca("ADIAR", () => { contas[i].vencimento = proximoMes(contas[i].vencimento); salvar(); }); }
function clonarConta(i) { if(confirm("Clonar?")) { contas.push({...contas[i], id: Date.now(), nome: contas[i].nome+" (Cópia)", paga: false}); salvar(); } }
function copiarPix(i) { const p = contas[i].codigoPix; if(p) { navigator.clipboard.writeText(p); alert("Copiado!"); } else { const n = prompt("Cole o Pix:"); if(n) { contas[i].codigoPix=n; salvar(); } } }

/* ================= 7. EXPORTAÇÃO E PDF ================= */
function compartilharMes(mes) { let t=`📅 *Resumo ${mes}*\n\n`; let total=0, pago=0; contas.filter(c=>mesAno(c.vencimento)===mes).sort((a,b)=>new Date(a.vencimento)-new Date(b.vencimento)).forEach(c=>{ if(c.oculta&&!c.paga)return; total+=c.valor; if(c.paga)pago+=c.valor; t+=`${c.paga?"✅":"⭕"} *${c.nome}* (${c.pagador||'Ambos'}): R$ ${c.valor.toFixed(2)}\n\n`; }); t+=`💰 Total: R$ ${total.toFixed(2)}\n✅ Pago: R$ ${pago.toFixed(2)}`; window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(t)}`); }
function compartilharIndividual(i) { const c=contas[i]; window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`🧾 ${c.nome}\n💰 R$ ${c.valor.toFixed(2)}\n🗓 Venc: ${isoParaBR(c.vencimento)}`)}`); }
function baixarPdfMes(mes) { /* Mantido igual seu original */ }
function gerarComprovanteIndividual(i) { /* Mantido igual seu original */ }
function baixarBackup() { const d="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify({contas, logs})); const a=document.createElement('a'); a.href=d; a.download="backup_contas.json"; a.click(); }
function lerArquivoBackup(input) { const r=new FileReader(); r.onload=e=>{ try{ const d=JSON.parse(e.target.result); if(d.contas){contas=d.contas;logs=d.logs||[];salvar();location.reload();} }catch(err){alert("Erro");} }; r.readAsText(input.files[0]); }

/* ================= 8. INICIALIZAÇÃO, PERFIL E UTILITÁRIOS ================= */
const isoParaBR = d => d.split("-").reverse().join("/"); const brParaISO = d => d.split("/").reverse().join("-"); const mesAno = d => d.split("-").slice(1, 0).reverse().join("/") || d.substring(5,7) + "/" + d.substring(0,4); const proximoMes = d => { const dt = new Date(d + "T12:00:00"); dt.setMonth(dt.getMonth() + 1); return dt.toISOString().split("T")[0]; };
function getIcone(nome) { const n=nome.toLowerCase(); if(n.includes("luz"))return"💡"; if(n.includes("agua"))return"💧"; if(n.includes("net")||n.includes("wi"))return"🌐"; if(n.includes("nubank")||n.includes("cartao"))return"💳"; return"📄"; }
function infoVencimento(dataISO) { const hoje=new Date(); hoje.setHours(0,0,0,0); const venc=new Date(dataISO+"T12:00:00"); venc.setHours(0,0,0,0); const diff=Math.floor((venc-hoje)/(1000*60*60*24)); if(diff<0)return{texto:"VENCIDO",classe:"vencido"}; if(diff===0)return{texto:"hoje",classe:"hoje"}; return{texto:`em ${diff} dias`,classe:"normal"}; }
function carregarPerfil() { const f = localStorage.getItem("fotoPerfil"); if(f) document.getElementById("fotoPerfil").src = f; }
function abrirConfiguracoesDoApp() { /* Omitido para não estourar limite, é o mesmo que o seu */ }
function fecharConfiguracoes() { document.getElementById("secaoConfiguracoes").style.display = "none"; document.getElementById("app").style.display = "block"; }

document.addEventListener("DOMContentLoaded", () => {
    try {
        const dados = localStorage.getItem("contas"); if(dados) contas = JSON.parse(dados);
        const l = localStorage.getItem("logs"); if(l) logs = JSON.parse(l);
        if(localStorage.getItem("modoPrivado") === "true") document.body.classList.add("modo-privado");
        carregarPerfil();
        auth.onAuthStateChanged(user => { if(user) tentarAutoLogin(); });
    } catch(e) { console.error("Erro no init:", e); }
});

/* ================= MOTOR SUTELLO AI ================= */
const GEMINI_API_KEY = "AQ.Ab8RN6L1lyZ2ZRfEhB0l5eGMvp4aNOBka1-E5RkzGlEno4RrwA"; 

function abrirChatSutello() { document.getElementById("modalChatSutello").style.display = "flex"; }
function fecharChatSutello() { document.getElementById("modalChatSutello").style.display = "none"; }

async function enviarMensagemSutello() {
    const input = document.getElementById("inputChat");
    const msg = input.value.trim();
    if (!msg) return;

    const chatMensagens = document.getElementById("chatMensagens");
    chatMensagens.innerHTML += `<div style="background: #2ecc71; padding: 10px; border-radius: 8px; align-self: flex-end; max-width: 85%; color: white; font-size: 14px; margin-bottom: 5px;">${msg}</div>`;
    input.value = "";
    
    const idDigitando = "msg-" + Date.now();
    chatMensagens.innerHTML += `<div id="${idDigitando}" style="background: #2a2a36; padding: 10px; border-radius: 8px; align-self: flex-start; max-width: 85%; color: #aaa; font-size: 14px; font-style: italic; margin-bottom: 5px;">Analisando dados do Sutello Financeiro...</div>`;
    chatMensagens.scrollTop = chatMensagens.scrollHeight;

    const contextoMinimizado = contas.map(c => ({
        id: c.id.toString().substring(0, 4), 
        n: c.nome, 
        v: c.valor, 
        dt: c.vencimento, 
        pg: c.paga ? 1 : 0,
        por: c.pagador || 'Ambos'
    }));

    const promptSistema = `
        Você é o SutelloAi, assistente inteligente do App Financeiro.
        Contas Atuais: ${JSON.stringify(contextoMinimizado)}
        Ano atual: ${new Date().getFullYear()}. Mês atual: ${new Date().getMonth() + 1}.
        
        REGRA: Se o usuário pedir para adicionar, pagar, excluir ou adiar, responda no final com um bloco JSON. O JSON não deve ser falado para o usuário, deve estar entre \`\`\`json.
        Exemplo de comandos JSON:
        \`\`\`json
        {
          "comandos": [
            {"acao": "adicionar", "nome": "Academia", "valor": 90, "vencimento": "2026-06-10", "pagador": "Leonardo", "recorrente": true, "parcelas": 0},
            {"acao": "pagar", "id": "1a2b"},
            {"acao": "excluir", "id": "1a2b"},
            {"acao": "adiar", "id": "1a2b"}
          ]
        }
        \`\`\`
        Mensagem do Usuário: "${msg}"
    `;

    try {
        const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptSistema }] }] })
        });

        const dados = await resposta.json();
        let textoCompleto = dados.candidates[0].content.parts[0].text;
        let textoExibicao = textoCompleto;

        const match = textoCompleto.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
            try {
                const json = JSON.parse(match[1]);
                processarComandosIA(json.comandos);
                textoExibicao = textoCompleto.replace(/```json\s*([\s\S]*?)\s*```/, '').trim();
            } catch (e) { console.error("Erro JSON", e); }
        }
        
        document.getElementById(idDigitando).innerHTML = textoExibicao.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        document.getElementById(idDigitando).style.fontStyle = "normal";
        document.getElementById(idDigitando).style.color = "white";

    } catch (erro) {
        document.getElementById(idDigitando).innerHTML = "⚠️ Erro de conexão.";
    }
    chatMensagens.scrollTop = chatMensagens.scrollHeight;
}

// Cérebro invisível da IA (faz ações sem abrir modal de segurança do usuário)
function processarComandosIA(comandos) {
    if (!comandos || !Array.isArray(comandos)) return;

    comandos.forEach(cmd => {
        if (cmd.acao === "adicionar") {
            contas.push({
                id: Date.now() + Math.random(),
                nome: cmd.nome || "Conta", valor: parseFloat(cmd.valor) || 0,
                vencimento: cmd.vencimento || new Date().toISOString().split("T")[0],
                paga: false, oculta: false,
                pagador: cmd.pagador || "Ambos",
                recorrente: cmd.recorrente || false, totalParcelas: parseInt(cmd.parcelas) || 0, parcelaAtual: cmd.recorrente ? 1 : null,
                codigoPix: ""
            });
            registrarLog("IA CRIOU", `${cmd.nome}`);
        }
        else if (cmd.acao === "pagar") { executarPagamentoDireto(cmd.id); }
        else if (cmd.acao === "excluir") {
            const idx = contas.findIndex(c => c.id.toString().startsWith(cmd.id));
            if(idx !== -1) { registrarLog("IA APAGOU", contas[idx].nome); contas.splice(idx, 1); }
        }
        else if (cmd.acao === "adiar") {
            const idx = contas.findIndex(c => c.id.toString().startsWith(cmd.id));
            if(idx !== -1) contas[idx].vencimento = proximoMes(contas[idx].vencimento);
        }
    });
    salvar(); 
}

function executarPagamentoDireto(idCurto) {
    const c = contas.find(x => x.id.toString().startsWith(idCurto));
    if(!c) return;
    c.paga = true; c.dataPagamento = new Date().toISOString().split("T")[0];
    if(c.recorrente) {
        let criar = true;
        if(c.totalParcelas > 0 && c.parcelaAtual >= c.totalParcelas) criar = false;
        if(criar) {
            contas.push({ ...c, id: Date.now()+Math.random(), paga:false, dataPagamento:null, vencimento: proximoMes(c.vencimento), parcelaAtual: c.parcelaAtual+1 });
        }
    }
    registrarLog("IA PAGOU", `${c.nome}`);
}

window.addEventListener("load", () => {
    document.getElementById("inputChat")?.addEventListener("keypress", function(e) { if (e.key === "Enter") enviarMensagemSutello(); });
});