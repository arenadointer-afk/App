/* ================= 1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS ================= */
const PIN = "2007"; 
let contas = [];
let logs = [];
let filtro = "todas";

// ID fixo para a biometria não se perder e garantir persistência
const BIOMETRIA_USER_ID = Uint8Array.from("sutello-contas-fixo", c => c.charCodeAt(0));

/* ================= 2. SISTEMA DE ACESSO (LOCK SCREEN) ================= */

// Auto-Login: Tenta entrar direto se já tiver cadastro
async function tentarAutoLogin() {
    const jaCadastrou = localStorage.getItem("biometria_cadastrada");
    if (jaCadastrou === "true") {
        const disponivel = window.PublicKeyCredential && 
                           await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (disponivel) {
             // Pequeno delay para garantir que a página carregou antes de pedir o dedo
             setTimeout(() => { acaoBotaoBiometria(true); }, 500);
        }
    }
}

// Botão Biometria (O parâmetro 'silencioso' evita abrir modal de erro no auto-login)
async function acaoBotaoBiometria(silencioso = false) {
    const disponivel = window.PublicKeyCredential && 
                       await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    
    if (!disponivel) {
        if(!silencioso) exibirMensagemModal("Aviso", "Biometria não disponível.");
        return;
    }

    try {
        const credential = await navigator.credentials.get({
            publicKey: { 
                challenge: crypto.getRandomValues(new Uint8Array(32)), 
                userVerification: "required",
                timeout: 60000 
            }
        });
        if (credential) entrarNoApp();
    } catch (e) {
        console.log("Biometria cancelada ou não encontrada.");
        // SÓ PERGUNTA SE QUER CADASTRAR SE A PESSOA NUNCA TIVER CADASTRADO ANTES
        if (localStorage.getItem("biometria_cadastrada") !== "true" && !silencioso) {
            mostrarConfirmacaoModal(
                "Vincular Digital", 
                "Deseja cadastrar sua digital para entrar automático da próxima vez?", 
                cadastrarChaveAcesso
            );
        }
    }
}

// Cadastro da Digital (Criação da Chave)
async function cadastrarChaveAcesso() {
    try {
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                rp: { name: "Minhas Contas" }, 
                user: { id: BIOMETRIA_USER_ID, name: "sutello@contas", displayName: "Sutello" },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: { 
                    authenticatorAttachment: "platform", 
                    userVerification: "required",
                    residentKey: "required" // Força salvar no Android
                },
                timeout: 60000
            }
        });

        if (credential) {
            // SALVA A FLAG PARA NÃO PERGUNTAR MAIS
            localStorage.setItem("biometria_cadastrada", "true");
            
            exibirMensagemModal("Sucesso ✅", "Digital salva! Entrando...");
            setTimeout(() => {
                fecharModalDecisao();
                entrarNoApp();
            }, 1000);
        }
    } catch (e) {
        exibirMensagemModal("Erro", "Falha ao salvar digital. Tente novamente.");
    }
}

// PIN (Senha)
function pedirPinFallback() {
    const modal = document.getElementById("modalDecisao");
    const titulo = document.getElementById("tituloDecisao");
    const texto = document.getElementById("textoDecisao");
    const btn1 = document.getElementById("btnOpcao1");

    titulo.innerText = "Acesso via PIN";
    texto.innerHTML = `
        <input type="password" id="inputPinAcesso" inputmode="numeric" placeholder="••••" 
        style="width:100%; padding:15px; border-radius:12px; border:1px solid #444; background:#222; color:white; text-align:center; font-size:24px;">
    `;
    
    btn1.innerText = "ENTRAR";
    btn1.onclick = () => {
        const el = document.getElementById("inputPinAcesso");
        if (el && el.value.trim() === PIN) {
            fecharModalDecisao();
            entrarNoApp();
        } else {
            exibirMensagemModal("Erro", "PIN Incorreto!");
        }
    };
    
    document.getElementById("btnOpcao2").style.display = "none";
    modal.style.display = "flex";
}

function entrarNoApp() {
    document.getElementById("lock").style.display = "none";
    document.getElementById("app").style.display = "block";
    carregarPerfil();
    render();
}

/* ================= 3. SEGURANÇA (MODAIS CUSTOMIZADOS) ================= */

function confirmarSeguranca(acao, callback) {
  const n1 = Math.floor(Math.random() * 9) + 1;
  const n2 = Math.floor(Math.random() * 9) + 1;
  const soma = n1 + n2;
  
  const modal = document.getElementById("modalDecisao");
  document.getElementById("tituloDecisao").innerText = "🛡️ Segurança";
  const texto = document.getElementById("textoDecisao");
  
  texto.innerHTML = `Resolva para <b>${acao}</b>:<br><br><span style="font-size:28px; color:white;">${n1} + ${n2} = ?</span><br><br>` +
                   `<input type="number" id="respSeguranca" inputmode="numeric" style="width:100px; padding:12px; border-radius:10px; border:1px solid #444; background:#222; color:white; text-align:center; font-size:22px;">`;

  const btn1 = document.getElementById("btnOpcao1");
  btn1.innerText = "CONFIRMAR";
  btn1.onclick = () => {
    const el = document.getElementById("respSeguranca");
    if (el && parseInt(el.value) === soma) {
      fecharModalDecisao();
      callback(); 
    } else {
      exibirMensagemModal("Erro", "Resposta incorreta!");
    }
  };

  document.getElementById("btnOpcao2").style.display = "none"; 
  modal.style.display = "flex";
}

/* ================= 4. UTILITÁRIOS DE MODAL ================= */

function exibirMensagemModal(titulo, mensagem) {
    const modal = document.getElementById("modalDecisao");
    document.getElementById("tituloDecisao").innerText = titulo;
    document.getElementById("textoDecisao").innerText = mensagem;
    const btn1 = document.getElementById("btnOpcao1");
    btn1.innerText = "OK";
    btn1.onclick = fecharModalDecisao;
    document.getElementById("btnOpcao2").style.display = "none";
    modal.style.display = "flex";
}

function mostrarConfirmacaoModal(titulo, mensagem, callback) {
    const modal = document.getElementById("modalDecisao");
    document.getElementById("tituloDecisao").innerText = titulo;
    document.getElementById("textoDecisao").innerText = mensagem;
    const btn1 = document.getElementById("btnOpcao1");
    const btn2 = document.getElementById("btnOpcao2");
    
    btn1.innerText = "SIM";
    btn1.onclick = () => { fecharModalDecisao(); callback(); };
    btn2.style.display = "block";
    btn2.innerText = "NÃO";
    btn2.onclick = fecharModalDecisao;
    modal.style.display = "flex";
}

function fecharModalDecisao() {
    document.getElementById("modalDecisao").style.display = "none";
}
/* ================= 5. RENDERIZAÇÃO E FUNCIONALIDADES ================= */

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

  // 1. Configura busca e botões
  if(!document.getElementById("btnPrivacidade")) {
      const divFiltros = document.querySelector(".filtros");
      if(divFiltros) {
          const divBusca = document.createElement("div");
          divBusca.className = "busca-container";
          divBusca.style.cssText = "display:flex; gap:10px; padding:0 15px; margin-top:10px;";
          const iconeOlho = document.body.classList.contains("modo-privado") ? "🙈" : "👁️";
          divBusca.innerHTML = `
            <input type="text" id="inputBusca" placeholder="🔍 Buscar..." onkeyup="render()" 
            style="flex:1; padding:10px; border-radius:20px; border:1px solid #444; background:#222; color:white; text-align:center;">
            <button id="btnPrivacidade" onclick="togglePrivacidade()" style="background:none; border:none; font-size:22px; cursor:pointer;">${iconeOlho}</button>`;
          divFiltros.parentNode.insertBefore(divBusca, divFiltros);
      }
      const btns = document.querySelectorAll('.filtros button');
      if(btns.length > 0 && filtro === 'todas') btns[0].classList.add('ativo');
  }

  const termo = document.getElementById("inputBusca") ? document.getElementById("inputBusca").value.toLowerCase() : "";
  const contasComIndex = contas.map((c, i) => ({...c, originalIndex: i}));
  const grupos = {};
  
  // 2. Agrupa por Mês
  [...contasComIndex].sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento)).forEach(c => {
      const k = mesAno(c.vencimento);
      if(!grupos[k]) grupos[k] = [];
      grupos[k].push(c);
  });

  if (Object.keys(grupos).length === 0) {
      lista.innerHTML = `<div style="text-align:center; padding:30px; color:#666;">Nenhuma conta encontrada.</div>`;
      return;
  }

  // 3. Processa cada Mês
  Object.keys(grupos).forEach(k => {
    const todasDoMes = grupos[k];
    
    let totalMes = 0, pagoMes = 0;
    todasDoMes.forEach(c => {
        if(c.oculta && !c.paga) return; 
        totalMes += c.valor;
        if(c.paga) pagoMes += c.valor;
    });

    const faltaMes = totalMes - pagoMes;
    let pct = totalMes > 0 ? (pagoMes / totalMes) * 100 : 0;

    const contasVisiveis = todasDoMes.filter(c => {
        if (termo) return c.nome.toLowerCase().includes(termo);
        if (c.oculta) return false;
        if (filtro === "pagas") return c.paga;
        return !c.paga; 
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

      let htmlParcelas = "";
      // Mostra 1/5 na tela
      if (c.totalParcelas && c.totalParcelas > 0) {
          htmlParcelas = `<div class="info-parcelas"><div>🔢 ${c.parcelaAtual}/${c.totalParcelas}</div></div>`;
      } else if (c.recorrente) htmlParcelas = `<div class="info-parcelas"><div>🔄 Recorrente</div></div>`;

      div.className = classes;
      div.innerHTML = `
        ${(!c.paga && vencInfo.classe === "vencido") ? `<span class="badge-vencido">VENCIDO</span>` : ``}
        <div style="font-size: 1.1em; margin-bottom: 5px;"><strong>${icone} ${c.nome}</strong></div>
        <div style="font-size: 1.2em; font-weight: bold;">💰 R$ ${c.valor.toFixed(2)}</div>
        <div style="margin-top: 5px;">📅 ${isoParaBR(c.vencimento)}</div>
        ${htmlParcelas}
        <small class="vencimento ${vencInfo.classe}">${c.paga ? "PAGO ✅" : vencInfo.texto}</small>
        
        <div class="acoes-principal">
            ${!c.paga ? 
                `<button class="btn-pagar" onclick="iniciarPagamento(${c.originalIndex})">✅ PAGAR</button>` : 
                `<button class="btn-reverter" onclick="desfazerPagamento(${c.originalIndex})">↩️ DESFAZER</button>`
            }
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

/* ================= 6. AÇÕES DE SISTEMA (CRUD INTELIGENTE) ================= */

function salvar() {
  localStorage.setItem("contas", JSON.stringify(contas));
  localStorage.setItem("logs", JSON.stringify(logs));
  render();
}

function registrarLog(acao, detalhe, backup = null, relatedId = null) {
    logs.unshift({ id: Date.now()+Math.random(), data: new Date().toISOString(), acao, detalhe, backup, relatedId });
    if(logs.length > 50) logs.pop();
}

function togglePrivacidade() {
    document.body.classList.toggle("modo-privado");
    localStorage.setItem("modoPrivado", document.body.classList.contains("modo-privado"));
    render();
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

// Funções de Modal
function abrirCalculadora() { document.getElementById("modalCalc").style.display = "flex"; }
function fecharCalculadora() { document.getElementById("modalCalc").style.display = "none"; }
function abrirOpcoes() { document.getElementById("modalOpcoes").style.display = "flex"; }
function fecharOpcoes() { document.getElementById("modalOpcoes").style.display = "none"; }
function abrirHistorico() { 
    document.getElementById("lista").style.display = "none";
    document.querySelector(".filtros").style.display = "none";
    document.getElementById("historicoLogs").style.display = "block";
    const listaLogs = document.getElementById("listaLogs");
    listaLogs.innerHTML = "";
    if(logs.length === 0) listaLogs.innerHTML = "<p style='text-align:center'>Vazio.</p>";
    logs.forEach(l => {
        const btnUndo = l.backup ? `<button onclick="desfazerAcaoLog(${l.id})" style="float:right; padding:5px;">↩️</button>` : "";
        listaLogs.innerHTML += `<div style="background:#222; margin:5px 0; padding:10px; border-radius:8px; border-left:3px solid #7b2ff7;">
            ${btnUndo}
            <small style="color:#888">${new Date(l.data).toLocaleString()}</small><br>
            <strong>${l.acao}</strong>: ${l.detalhe}
        </div>`;
    });
}
function fecharHistoricoLogs() {
    document.getElementById("historicoLogs").style.display = "none";
    document.getElementById("lista").style.display = "block";
    document.querySelector(".filtros").style.display = "flex";
}
function limparLogs(tipo) {
    if(!confirm("Limpar logs?")) return;
    if(tipo==='tudo') logs=[];
    salvar(); abrirHistorico();
}

function desfazerAcaoLog(logId) {
    const idx = logs.findIndex(l => l.id === logId);
    if(idx === -1) return;
    const log = logs[idx];
    if(!log.backup) return;
    if(!confirm("Desfazer essa ação?")) return;
    
    if(log.acao === "EXCLUÍDO") contas.push(log.backup);
    else if(log.relatedId) {
        const cIdx = contas.findIndex(c => c.id === log.relatedId);
        if(cIdx !== -1) contas.splice(cIdx, 1); 
        const origIdx = contas.findIndex(c => c.id === log.backup.id);
        if(origIdx !== -1) contas[origIdx] = log.backup; 
    } else {
        const cIdx = contas.findIndex(c => c.id === log.backup.id);
        if(cIdx !== -1) contas[cIdx] = log.backup;
    }
    logs.splice(idx, 1);
    salvar(); abrirHistorico(); alert("Desfeito!");
}

let calcExp = "";
function calcAdd(v) { calcExp += v; document.getElementById("calcDisplay").value = calcExp; }
function calcLimpar() { calcExp = ""; document.getElementById("calcDisplay").value = ""; }
function calcCalcular() { try { document.getElementById("calcDisplay").value = eval(calcExp); } catch { alert("Erro"); } }

// === CRUD ATUALIZADO (CÁLCULO AUTOMÁTICO DE PARCELAS) ===
/* ================= NOVO SISTEMA DE ADICIONAR (FORMULÁRIO VISUAL) ================= */

// 1. Cria o HTML do modal automaticamente (só na primeira vez)
function garantirModalAdicionar() {
    if (document.getElementById("modalNovaConta")) return;

    const modalHtml = `
    <div id="modalNovaConta" class="modal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.8); align-items:center; justify-content:center;">
        <div class="modal-conteudo" style="background:#1c1c26; padding:20px; border-radius:15px; width:90%; max-width:350px; border:1px solid #444; color:white; text-align:left;">
            <h3 style="margin-top:0; text-align:center; color:#7b2ff7;">➕ Nova Conta</h3>
            
            <label style="font-size:12px; color:#aaa;">Nome da conta</label>
            <input id="newNome" type="text" placeholder="Ex: Tênis Nike" style="width:100%; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #444; background:#222; color:white;">
            
            <label style="font-size:12px; color:#aaa;">Valor TOTAL da compra</label>
            <input id="newValor" type="number" inputmode="decimal" placeholder="0.00" oninput="calcularPrevia()" style="width:100%; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #444; background:#222; color:white;">
            
            <label style="font-size:12px; color:#aaa;">Vencimento</label>
            <input id="newData" type="date" style="width:100%; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #444; background:#222; color:white;">
            
            <div style="background:#2a2a36; padding:10px; border-radius:8px; margin-bottom:15px;">
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                    <input id="newRecorrente" type="checkbox" onchange="toggleParcelasInput()" style="width:20px; height:20px;">
                    <span>É parcelado ou fixo?</span>
                </label>
                
                <div id="divParcelas" style="display:none; margin-top:10px; border-top:1px solid #444; padding-top:10px;">
                    <label style="font-size:12px; color:#aaa;">Quantas vezes? (0 = Fixo Mensal)</label>
                    <input id="newQtd" type="number" inputmode="numeric" placeholder="Ex: 10" oninput="calcularPrevia()" style="width:100%; padding:10px; border-radius:8px; border:1px solid #444; background:#222; color:white;">
                    <p id="txtPrevia" style="font-size:13px; color:#00e676; margin-top:5px; text-align:center; font-weight:bold;"></p>
                </div>
            </div>

            <div style="display:flex; gap:10px;">
                <button onclick="salvarContaFormulario()" style="flex:1; background:#7b2ff7; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer;">SALVAR</button>
                <button onclick="fecharModalAdicionar()" style="flex:1; background:transparent; border:1px solid #666; color:#ccc; padding:12px; border-radius:8px; cursor:pointer;">CANCELAR</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 2. Substitui a função antiga para abrir esse novo modal
function adicionarConta() {
    garantirModalAdicionar(); // Garante que o HTML existe
    
    // Limpa os campos para nova inserção
    document.getElementById("newNome").value = "";
    document.getElementById("newValor").value = "";
    document.getElementById("newData").value = new Date().toISOString().split("T")[0]; // Data de hoje
    document.getElementById("newRecorrente").checked = false;
    document.getElementById("newQtd").value = "";
    toggleParcelasInput();
    
    // Abre o modal
    document.getElementById("modalNovaConta").style.display = "flex";
}

// 3. Controla a visibilidade do campo de parcelas
function toggleParcelasInput() {
    const check = document.getElementById("newRecorrente");
    const div = document.getElementById("divParcelas");
    if(check && div) {
        div.style.display = check.checked ? "block" : "none";
        calcularPrevia();
    }
}

// 4. Calcula automaticamente quanto fica cada parcela
function calcularPrevia() {
    const total = parseFloat(document.getElementById("newValor").value) || 0;
    const qtd = parseInt(document.getElementById("newQtd").value) || 0;
    const txt = document.getElementById("txtPrevia");
    const isRec = document.getElementById("newRecorrente").checked;
    
    if (total > 0 && qtd > 0 && isRec) {
        const mensal = total / qtd;
        txt.innerText = `Ficam ${qtd}x de R$ ${mensal.toFixed(2)}`;
    } else if (qtd === 0 && isRec) {
        txt.innerText = "Valor fixo todo mês";
    } else {
        txt.innerText = "";
    }
}

function fecharModalAdicionar() {
    document.getElementById("modalNovaConta").style.display = "none";
}

// 5. Salva os dados do formulário
function salvarContaFormulario() {
    const nome = document.getElementById("newNome").value;
    const valorTotal = parseFloat(document.getElementById("newValor").value);
    const data = document.getElementById("newData").value;
    const isRec = document.getElementById("newRecorrente").checked;
    const qtd = isRec ? (parseInt(document.getElementById("newQtd").value) || 0) : 0;

    if (!nome || isNaN(valorTotal) || !data) {
        alert("Preencha o nome, valor e data!");
        return;
    }

    // Lógica inteligente: Se for parcelado, divide o valor. Se for fixo ou único, mantém.
    let valorFinal = valorTotal;
    if (isRec && qtd > 0) {
        valorFinal = valorTotal / qtd;
    }

    contas.push({ 
      id: Date.now()+Math.random(), 
      nome: nome, 
      valor: valorFinal,
      valorTotalOriginal: (isRec && qtd > 0) ? valorTotal : null, // Guarda o total para o Zap
      vencimento: brParaISO(data), 
      paga: false, 
      oculta: false, 
      recorrente: isRec, 
      totalParcelas: qtd, 
      parcelaAtual: isRec ? 1 : null, 
      codigoPix: ""
    });
  
    const detalhe = qtd > 0 ? `${qtd}x de R$ ${valorFinal.toFixed(2)}` : `R$ ${valorFinal.toFixed(2)}`;
    registrarLog("CRIADO", `Conta: ${nome} (${detalhe})`);
    
    salvar();
    fecharModalAdicionar();
}


function iniciarPagamento(i) {
    confirmarSeguranca("PAGAR", () => {
        const c = contas[i];
        const backup = JSON.parse(JSON.stringify(c));
        const tipo = prompt(`Valor da Parcela: R$ ${c.valor.toFixed(2)}\n1-PAGAR MÊS ATUAL\n2-PAGAMENTO PARCIAL`, "1");
        
        if(tipo === "1") {
            c.paga = true; 
            c.dataPagamento = new Date().toISOString().split("T")[0];
            
            // Lógica de Criar o Próximo Mês Automaticamente
            let idNova = null;
            if(c.recorrente) {
                let criar = true;
                // Se for parcelado (ex: 5x) e já pagou a 5ª, para de criar.
                if(c.totalParcelas > 0 && c.parcelaAtual >= c.totalParcelas) criar = false;
                
                if(criar) {
                    const nova = {
                        ...c, 
                        id: Date.now()+Math.random(), 
                        paga:false, 
                        oculta:false, 
                        dataPagamento: null,
                        vencimento: proximoMes(c.vencimento), 
                        parcelaAtual: c.parcelaAtual+1 
                    };
                    contas.push(nova); idNova = nova.id;
                }
            }
            registrarLog("PAGO", `Pagou ${c.nome}`, backup, idNova);
            salvar(); exibirMensagemModal("Sucesso", "Pago! ✅");
        
        } else if (tipo === "2") {
            const vPago = parseFloat(prompt("Valor pago hoje:")?.replace(",","."));
            if(vPago && vPago < c.valor) {
                const restante = c.valor - vPago;
                const jogarProx = confirm("Jogar restante para próximo mês?");
                
                const novaParcial = {...c, id: Date.now()+Math.random(), nome: c.nome + " (Parcial)", valor: vPago, paga: true, oculta: false, dataPagamento: new Date().toISOString().split("T")[0] };
                contas.push(novaParcial);
                
                c.valor = restante;
                if(jogarProx) c.vencimento = proximoMes(c.vencimento);
                
                registrarLog("PARCIAL", `Pagou ${vPago}, restou ${restante}`, backup, novaParcial.id);
                salvar();
            }
        }
    });
}

function desfazerPagamento(i) {
    confirmarSeguranca("DESFAZER", () => {
        const backup = JSON.parse(JSON.stringify(contas[i]));
        contas[i].paga = false;
        registrarLog("ESTORNO", `Reverteu ${contas[i].nome}`, backup);
        salvar();
    });
}

function deletarConta(i) {
    confirmarSeguranca("EXCLUIR", () => {
        const backup = JSON.parse(JSON.stringify(contas[i]));
        registrarLog("EXCLUÍDO", `Apagou ${contas[i].nome}`, backup);
        contas.splice(i, 1);
        salvar();
    });
}

function editarConta(i) {
    confirmarSeguranca("EDITAR", () => {
        const c = contas[i];
        const n = prompt("Nome:", c.nome);
        const v = prompt("Valor Parcela:", c.valor); // Edita o valor mensal
        const d = prompt("Data:", isoParaBR(c.vencimento));
        if(n && v && d) {
            c.nome = n; c.valor = parseFloat(v.replace(",",".")); c.vencimento = brParaISO(d);
            salvar();
        }
    });
}

function adiarConta(i) {
    confirmarSeguranca("ADIAR", () => {
        const c = contas[i];
        c.vencimento = proximoMes(c.vencimento);
        salvar();
        exibirMensagemModal("Adiado", "Conta movida para próximo mês ⏩");
    });
}

function clonarConta(i) {
    if(!confirm("Clonar esta conta?")) return;
    const orig = contas[i];
    const nova = {...orig, id: Date.now()+Math.random(), nome: orig.nome + " (Cópia)", paga: false, oculta: false};
    contas.push(nova);
    salvar();
}

function copiarPix(i) {
    const pix = contas[i].codigoPix || "";
    if(pix) {
        navigator.clipboard.writeText(pix);
        exibirMensagemModal("Sucesso", "Pix Copiado! 📋");
    } else {
        const novo = prompt("Cole o código Pix para salvar:");
        if(novo) { contas[i].codigoPix = novo; salvar(); }
    }
}

function ocultarConta(i) {
    if(!confirm("Arquivar esta conta?")) return;
    const backup = JSON.parse(JSON.stringify(contas[i]));
    contas[i].oculta = true;
    registrarLog("ARQUIVADO", `Ocultou ${contas[i].nome}`, backup);
    salvar();
}
/* ================= 7. EXPORTAÇÃO (WHATSAPP CORRIGIDO) ================= */

function compartilharMes(mes) {
    let t = `📅 *Resumo ${mes}*\n\n`;
    const contasDoMes = contas.filter(c => mesAno(c.vencimento) === mes);
    let total = 0, pago = 0;

    contasDoMes.forEach(c => {
        // Ignora contas arquivadas que não foram pagas
        if(c.oculta && !c.paga) return;
        
        total += c.valor;
        if(c.paga) pago += c.valor;

        const status = c.paga ? "✅" : "⭕";
        
        let infoParcela = "";
        let infoFinanceira = "";
        
        if (c.totalParcelas > 0) {
            infoParcela = ` (${c.parcelaAtual}/${c.totalParcelas})`;
            
            if (c.valorTotalOriginal) {
                // CORREÇÃO AQUI:
                // Se a conta está PAGA (✅), multiplicamos pela parcela atual (ex: pagou a 5ª de 10 -> 5 * valor).
                // Se está PENDENTE (⭕), multiplicamos pela anterior (ex: deve a 5ª de 10 -> 4 * valor).
                let parcelasConsideradas = c.paga ? c.parcelaAtual : (c.parcelaAtual - 1);
                const jaPago = (parcelasConsideradas * c.valor).toFixed(2);
                
                infoFinanceira = `\n   ↳ Total Compra: R$ ${c.valorTotalOriginal} | Já Pago: R$ ${jaPago}`;
            }
        }

        t += `${status} ${c.nome}${infoParcela}: R$ ${c.valor.toFixed(2)}${infoFinanceira}\n`;
    });
    
    t += `\n💰 Total Mês: R$ ${total.toFixed(2)}\n✅ Pago Mês: R$ ${pago.toFixed(2)}\n⏳ Falta: R$ ${(total-pago).toFixed(2)}`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(t)}`);
}

function compartilharIndividual(i) {
    const c = contas[i];
    let extra = "";
    
    if(c.totalParcelas > 0 && c.valorTotalOriginal) {
        // CORREÇÃO AQUI TAMBÉM:
        let parcelasConsideradas = c.paga ? c.parcelaAtual : (c.parcelaAtual - 1);
        const jaPago = (parcelasConsideradas * c.valor).toFixed(2);
        
        extra = `\n📦 Parcela: ${c.parcelaAtual}/${c.totalParcelas}\n🏷️ Total Compra: R$ ${c.valorTotalOriginal}\n💸 Acumulado Pago: R$ ${jaPago}`;
    }
    
    const t = `🧾 ${c.nome}\n💰 Valor Parcela: R$ ${c.valor.toFixed(2)}\n🗓 Vencimento: ${isoParaBR(c.vencimento)}${extra}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(t)}`);
}

// PDF Profissional
function baixarPdfMes(mes) {
    if(!window.jspdf) { alert("Erro: jsPDF não carregado."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("courier", "bold"); doc.setFontSize(16);
    doc.text(`DEMONSTRATIVO - ${mes}`, 105, 20, {align:"center"});
    
    let y = 40; doc.setFontSize(10); doc.setFont("courier", "normal");
    
    let total = 0, pago = 0;
    const itens = contas.filter(c => mesAno(c.vencimento)===mes);
    
    itens.forEach(c => {
        if(c.oculta && !c.paga) return;
        total += c.valor; if(c.paga) pago += c.valor;
        
        let nomeDisplay = c.nome;
        if(c.totalParcelas > 0) nomeDisplay += ` (${c.parcelaAtual}/${c.totalParcelas})`;

        doc.text(`${isoParaBR(c.vencimento)} | ${nomeDisplay.padEnd(20)} | R$ ${c.valor.toFixed(2)} | ${c.paga?"PAGO":"ABERTO"}`, 15, y);
        y += 10;
    });

    doc.setFont("courier", "bold");
    doc.text(`TOTAL: R$ ${total.toFixed(2)}  |  PAGO: R$ ${pago.toFixed(2)}`, 15, y+10);
    doc.save(`Extrato_${mes.replace("/","-")}.pdf`);
}

function gerarComprovanteIndividual(i) {
    if(!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const c = contas[i];
    doc.rect(10, 10, 190, 100);
    doc.setFontSize(20); doc.text("RECIBO", 105, 30, {align:"center"});
    doc.setFontSize(14); 
    doc.text(`Pagador: Sutello`, 20, 50);
    doc.text(`Referente: ${c.nome} ${c.totalParcelas > 0 ? '('+c.parcelaAtual+'/'+c.totalParcelas+')' : ''}`, 20, 60);
    doc.text(`Valor Parcela: R$ ${c.valor.toFixed(2)}`, 20, 70);
    if(c.valorTotalOriginal) doc.text(`Valor Total Compra: R$ ${c.valorTotalOriginal}`, 20, 80);
    doc.text(`Status: ${c.paga ? "PAGO ✅" : "PENDENTE ⭕"}`, 20, 90);
    doc.save(`Recibo_${c.nome}.pdf`);
}

// Backup JSON
function baixarBackup() {
    const d = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({contas, logs}));
    const a = document.createElement('a'); a.href = d; a.download = "backup_contas.json"; a.click();
}
function lerArquivoBackup(input) {
    const f = input.files[0];
    const r = new FileReader();
    r.onload = e => {
        try {
            const d = JSON.parse(e.target.result);
            if(d.contas) { contas = d.contas; logs = d.logs || []; salvar(); location.reload(); }
        } catch(err) { alert("Arquivo inválido"); }
    };
    r.readAsText(f);
}


// PDF Profissional
function baixarPdfMes(mes) {
    if(!window.jspdf) { alert("Erro: jsPDF não carregado."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("courier", "bold"); doc.setFontSize(16);
    doc.text(`DEMONSTRATIVO - ${mes}`, 105, 20, {align:"center"});
    
    let y = 40; doc.setFontSize(10); doc.setFont("courier", "normal");
    
    let total = 0, pago = 0;
    const itens = contas.filter(c => mesAno(c.vencimento)===mes);
    
    itens.forEach(c => {
        if(c.oculta && !c.paga) return;
        total += c.valor; if(c.paga) pago += c.valor;
        
        let nomeDisplay = c.nome;
        if(c.totalParcelas > 0) nomeDisplay += ` (${c.parcelaAtual}/${c.totalParcelas})`;

        doc.text(`${isoParaBR(c.vencimento)} | ${nomeDisplay.padEnd(20)} | R$ ${c.valor.toFixed(2)} | ${c.paga?"PAGO":"ABERTO"}`, 15, y);
        y += 10;
    });

    doc.setFont("courier", "bold");
    doc.text(`TOTAL: R$ ${total.toFixed(2)}  |  PAGO: R$ ${pago.toFixed(2)}`, 15, y+10);
    doc.save(`Extrato_${mes.replace("/","-")}.pdf`);
}

function gerarComprovanteIndividual(i) {
    if(!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const c = contas[i];
    doc.rect(10, 10, 190, 100);
    doc.setFontSize(20); doc.text("RECIBO", 105, 30, {align:"center"});
    doc.setFontSize(14); 
    doc.text(`Pagador: Sutello`, 20, 50);
    doc.text(`Referente: ${c.nome} ${c.totalParcelas > 0 ? '('+c.parcelaAtual+'/'+c.totalParcelas+')' : ''}`, 20, 60);
    doc.text(`Valor Parcela: R$ ${c.valor.toFixed(2)}`, 20, 70);
    if(c.valorTotalOriginal) doc.text(`Valor Total Compra: R$ ${c.valorTotalOriginal}`, 20, 80);
    doc.text(`Status: ${c.paga ? "PAGO ✅" : "PENDENTE ⭕"}`, 20, 90);
    doc.save(`Recibo_${c.nome}.pdf`);
}

// Backup JSON
function baixarBackup() {
    const d = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({contas, logs}));
    const a = document.createElement('a'); a.href = d; a.download = "backup_contas.json"; a.click();
}
function lerArquivoBackup(input) {
    const f = input.files[0];
    const r = new FileReader();
    r.onload = e => {
        try {
            const d = JSON.parse(e.target.result);
            if(d.contas) { contas = d.contas; logs = d.logs || []; salvar(); location.reload(); }
        } catch(err) { alert("Arquivo inválido"); }
    };
    r.readAsText(f);
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    try {
        const dados = localStorage.getItem("contas");
        if(dados) contas = JSON.parse(dados);
        const l = localStorage.getItem("logs");
        if(l) logs = JSON.parse(l);
        if(localStorage.getItem("modoPrivado") === "true") document.body.classList.add("modo-privado");
        
        carregarPerfil();
        tentarAutoLogin(); 
    } catch(e) { console.error("Erro init", e); }
});

function carregarPerfil() {
    const f = localStorage.getItem("fotoPerfil");
    const img = document.getElementById("fotoPerfil");
    if(f && img) img.src = f;
}
const inputUpload = document.getElementById("uploadFoto");
if(inputUpload) {
    inputUpload.onchange = e => {
        const r = new FileReader();
        r.onload = () => { localStorage.setItem("fotoPerfil", r.result); document.getElementById("fotoPerfil").src = r.result; };
        r.readAsDataURL(e.target.files[0]);
    };
}

/* ================= 8. UTILITÁRIOS (DATA, TEXTO) ================= */
const isoParaBR = d => d.split("-").reverse().join("/");
const brParaISO = d => d.split("/").reverse().join("-");
const mesAno = d => d.split("-").slice(1, 0).reverse().join("/") || d.substring(5,7) + "/" + d.substring(0,4);
const proximoMes = d => { const dt = new Date(d + "T12:00:00"); dt.setMonth(dt.getMonth() + 1); return dt.toISOString().split("T")[0]; };

function getIcone(nome) {
  const n = nome.toLowerCase();
  if (n.includes("luz") || n.includes("energia")) return "💡";
  if (n.includes("agua")) return "💧";
  if (n.includes("net") || n.includes("wifi")) return "🌐";
  if (n.includes("nubank") || n.includes("card") || n.includes("fatura")) return "💳";
  return "📄"; 
}

function infoVencimento(dataISO) {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const venc = new Date(dataISO + "T12:00:00"); venc.setHours(0,0,0,0);
  const diff = Math.floor((venc - hoje) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { texto: "VENCIDO", classe: "vencido" };
  if (diff === 0) return { texto: "vence hoje", classe: "hoje" };
  return { texto: `vence em: ${diff} dias`, classe: "normal" };
}