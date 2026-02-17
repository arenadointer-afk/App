/* ================= CONFIGURAÇÕES E VARIÁVEIS GLOBAIS ================= */
const PIN = "2007"; 
let contas = [];
let logs = [];
let filtro = "todas";

// ID fixo para garantir que o Android salve a digital permanentemente
const BIOMETRIA_USER_ID = Uint8Array.from("sutello-contas-fixo", c => c.charCodeAt(0));

/* ================= SISTEMA DE ACESSO (LOCK SCREEN) ================= */

// 1. BIOMETRIA PERSISTENTE: Tenta logar ou oferece cadastro se não existir chave
async function acaoBotaoBiometria() {
    const disponivel = window.PublicKeyCredential && 
                       await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    
    if (!disponivel) {
        exibirMensagemModal("Aviso", "Sensor biométrico não disponível neste aparelho.");
        return;
    }

    try {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const credential = await navigator.credentials.get({
            publicKey: { 
                challenge: challenge, 
                userVerification: "required",
                timeout: 60000 
            }
        });
        if (credential) entrarNoApp();
    } catch (e) {
        console.log("Falha na biometria:", e);
        // Se não houver digital, convida para cadastrar no modal roxo
        mostrarConfirmacaoModal(
            "Vincular Digital", 
            "Deseja salvar sua digital para entrar mais rápido?", 
            cadastrarChaveAcesso
        );
    }
}

// 2. CADASTRO: Cria a chave de acesso definitiva no Android
async function cadastrarChaveAcesso() {
    try {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: challenge,
                rp: { name: "Minhas Contas" }, 
                user: { id: BIOMETRIA_USER_ID, name: "sutello@contas", displayName: "Sutello" },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: { 
                    authenticatorAttachment: "platform", 
                    userVerification: "required",
                    residentKey: "required" // Isso garante que a digital fique salva
                },
                timeout: 60000
            }
        });

        if (credential) {
            // 1. ESTA É A LINHA NOVA QUE SALVA O CADASTRO
            localStorage.setItem("biometria_cadastrada", "true"); 

            // 2. Aqui mudamos a mensagem para avisar que vai entrar
            exibirMensagemModal("Sucesso ✅", "Digital vinculada! Entrando...");
            
            // 3. Entra no app automaticamente após 1.5 segundos
            setTimeout(() => {
                fecharModalDecisao();
                entrarNoApp();
            }, 1500);
        }

    } catch (e) {
        exibirMensagemModal("Erro", "Falha ao vincular digital. Verifique o bloqueio de tela do celular.");
    }
}

// 3. PIN CORRIGIDO: Valida o código 2007 e destranca o app
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
        const val = document.getElementById("inputPinAcesso").value;
        if (val.trim() === PIN) {
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

/* ================= SEGURANÇA (MATEMÁTICA) ================= */

// Remove o aviso com o nome do site movendo a conta para o modal
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
    const resp = document.getElementById("respSeguranca").value;
    if (parseInt(resp) === soma) {
      fecharModalDecisao();
      callback(); 
    } else {
      exibirMensagemModal("Erro", "Resposta incorreta!");
    }
  };

  document.getElementById("btnOpcao2").style.display = "none"; 
  modal.style.display = "flex";
}

/* ================= UTILITÁRIOS DE INTERFACE ================= */

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
/* ================= RENDERIZAÇÃO DA INTERFACE ================= */

function render() {
  const lista = document.getElementById("lista");
  if(!lista) return;
  lista.innerHTML = "";

  // Adiciona campo de busca e botão de privacidade se não existirem
  if(!document.getElementById("btnPrivacidade")) {
      const divFiltros = document.querySelector(".filtros");
      if(divFiltros) {
          const divBusca = document.createElement("div");
          divBusca.className = "busca-container";
          divBusca.style.cssText = "display:flex; gap:10px; padding:0 15px; margin-top:10px;";
          const iconeOlho = document.body.classList.contains("modo-privado") ? "🙈" : "👁️";
          divBusca.innerHTML = `
            <input type="text" id="inputBusca" placeholder="🔍 Buscar conta..." onkeyup="render()" 
            style="flex:1; padding:10px; border-radius:20px; border:1px solid #444; background:#222; color:white; text-align:center;">
            <button id="btnPrivacidade" onclick="togglePrivacidade()" style="background:none; border:none; font-size:22px; cursor:pointer;">${iconeOlho}</button>`;
          divFiltros.parentNode.insertBefore(divBusca, divFiltros);
      }
  }

  const termo = document.getElementById("inputBusca") ? document.getElementById("inputBusca").value.toLowerCase() : "";
  const contasComIndex = contas.map((c, i) => ({...c, originalIndex: i}));
  const grupos = {};
  
  // Agrupa contas por Mês/Ano
  [...contasComIndex].sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento)).forEach(c => {
      const k = mesAno(c.vencimento);
      if(!grupos[k]) grupos[k] = [];
      grupos[k].push(c);
  });

  if (Object.keys(grupos).length === 0) {
      lista.innerHTML = `<div style="text-align:center; padding:30px; color:#666;">Nenhuma conta cadastrada.</div>`;
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
        return !c.oculta; 
    });

    if (!termo && contasVisiveis.length === 0) return;

    // Cabeçalho do Mês e Barra de Progresso
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
            <div class="barra-fundo"><div class="barra-preenchimento" style="width: ${pct}%"></div></div>
            <div class="barra-texto">${pct.toFixed(0)}% Pago</div>
          </div>
      </div>
    `;

    contasVisiveis.forEach(c => {
      const div = document.createElement("div");
      const vencInfo = infoVencimento(c.vencimento);
      const icone = getIcone(c.nome); 
      
      let classes = "conta";
      if (c.paga) classes += " verde";
      else if (vencInfo.classe === "vencido") classes += " atrasada"; // Animação de pulso se vencido

      const menuId = `menu-${c.id}`;
      div.className = classes;
      div.innerHTML = `
        ${(!c.paga && vencInfo.classe === "vencido") ? `<span class="badge-vencido">VENCIDO</span>` : ``}
        <div style="font-size: 1.1em; margin-bottom: 5px;"><strong>${icone} ${c.nome}</strong></div>
        <div style="font-size: 1.2em; font-weight: bold;">💰 R$ ${c.valor.toFixed(2)}</div>
        <div style="margin-top: 5px;">📅 ${isoParaBR(c.vencimento)}</div>
        <small class="vencimento ${vencInfo.classe}">${c.paga ? "PAGO ✅" : vencInfo.texto}</small>
        
        <div class="acoes-principal">
            ${!c.paga ? 
                `<button class="btn-pagar" onclick="iniciarPagamento(${c.originalIndex})">✅ PAGAR</button>` : 
                `<button class="btn-reverter" onclick="desfazerPagamento(${c.originalIndex})">↩️ DESFAZER</button>`
            }
            <button id="btn-expand-${c.id}" class="btn-expandir" onclick="toggleMenu('${c.id}')">🔻</button>
        </div>
        
        <div id="${menuId}" class="menu-secundario">
            <button onclick="copiarPix(${c.originalIndex})">📋 Copiar Pix</button>
            <button onclick="editarConta(${c.originalIndex})">✏️ Editar</button>
            <button onclick="compartilharIndividual(${c.originalIndex})">📱 WhatsApp</button>
            <button onclick="deletarConta(${c.originalIndex})" style="color:#ef5350;">🗑️ Excluir</button>
        </div>
      `;
      bloco.appendChild(div);
    });
    lista.appendChild(bloco);
  });
}

/* ================= OPERAÇÕES DE CONTA (CRUD) ================= */

function salvar() {
  localStorage.setItem("contas", JSON.stringify(contas));
  localStorage.setItem("logs", JSON.stringify(logs));
  render();
}

function deletarConta(i) {
    confirmarSeguranca("EXCLUIR", () => {
        const backup = JSON.parse(JSON.stringify(contas[i]));
        registrarLog("EXCLUÍDO", `Apagou ${contas[i].nome}`, backup);
        contas.splice(i, 1);
        salvar();
    });
}

function desfazerPagamento(i) {
    confirmarSeguranca("REVERTER PAGAMENTO", () => {
        contas[i].paga = false;
        contas[i].oculta = false;
        registrarLog("ESTORNO", `Reverteu pagamento de ${contas[i].nome}`);
        salvar();
    });
}

function copiarPix(i) {
    const pix = contas[i].codigoPix;
    if (pix) {
        navigator.clipboard.writeText(pix);
        exibirMensagemModal("Copiado", "Código Pix copiado para a área de transferência! ✅");
    } else {
        exibirMensagemModal("Aviso", "Esta conta não possui código Pix cadastrado.");
    }
}

/* ================= WHATSAPP E PDF ================= */

function compartilharMes(mes) {
    let texto = `📅 *Resumo Financeiro - ${mes}*\n\n`;
    const selecionadas = contas.filter(c => mesAno(c.vencimento) === mes);
    
    selecionadas.forEach(c => {
        const status = c.paga ? "✅" : "⭕";
        const infoParcela = (c.totalParcelas > 0) ? ` (${c.parcelaAtual}/${c.totalParcelas})` : "";
        texto += `${status} ${c.nome}${infoParcela}: R$ ${c.valor.toFixed(2)}\n`;
    });
    
    const total = selecionadas.reduce((acc, curr) => acc + curr.valor, 0);
    texto += `\n💰 *Total do Mês: R$ ${total.toFixed(2)}*`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
}

function compartilharIndividual(i) {
    const c = contas[i];
    const infoParcela = (c.totalParcelas > 0) ? `\n🔢 Parcela: ${c.parcelaAtual} de ${c.totalParcelas}` : "";
    const texto = `🧾 *Conta: ${c.nome}*${infoParcela}\n💰 Valor: R$ ${c.valor.toFixed(2)}\n🗓 Vencimento: ${isoParaBR(c.vencimento)}\n📌 Status: ${c.paga ? 'PAGO' : 'PENDENTE'}`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
}

/* ================= AUXILIARES TÉCNICOS ================= */

function getIcone(nome) {
  const n = nome.toLowerCase();
  if (n.includes("luz") || n.includes("energia")) return "💡";
  if (n.includes("agua")) return "💧";
  if (n.includes("net") || n.includes("wifi")) return "🌐";
  if (n.includes("cartao") || n.includes("nubank") || n.includes("inter")) return "💳";
  if (n.includes("mercado") || n.includes("compras")) return "🛒";
  return "📄"; 
}

const isoParaBR = d => d.split("-").reverse().join("/");
const brParaISO = d => d.split("/").reverse().join("-");
const mesAno = d => d.split("-").slice(1, 0).reverse().join("/") || d.substring(5,7) + "/" + d.substring(0,4);
const proximoMes = d => { 
    const dt = new Date(d + "T12:00:00"); 
    dt.setMonth(dt.getMonth() + 1); 
    return dt.toISOString().split("T")[0]; 
};

function infoVencimento(dataISO) {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const venc = new Date(dataISO + "T12:00:00"); venc.setHours(0,0,0,0);
  const diff = Math.floor((venc - hoje) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { texto: "VENCIDO", classe: "vencido" };
  if (diff === 0) return { texto: "vence hoje", classe: "hoje" };
  return { texto: `vence em: ${diff} dias`, classe: "normal" };
}

function toggleMenu(id) {
    const menu = document.getElementById(`menu-${id}`);
    const btn = document.getElementById(`btn-expand-${id}`);
    if (menu.style.display === "flex") {
        menu.style.display = "none";
        btn.innerHTML = "🔻";
    } else {
        menu.style.display = "flex";
        btn.innerHTML = "🔺";
    }
}

function togglePrivacidade() {
    document.body.classList.toggle("modo-privado");
    localStorage.setItem("modoPrivado", document.body.classList.contains("modo-privado"));
    render();
}

function registrarLog(acao, detalhe, backup = null) {
    logs.unshift({ id: Date.now(), data: new Date().toISOString(), acao, detalhe, backup });
    if(logs.length > 30) logs.pop();
}

// Inicializa o App
render();

// Tenta disparar a biometria automaticamente se o usuário já cadastrou antes
async function tentarAutoLogin() {
    const jaCadastrou = localStorage.getItem("biometria_cadastrada");
    if (jaCadastrou === "true") {
        // Pequeno atraso para o navegador carregar totalmente
        setTimeout(() => {
            acaoBotaoBiometria(); 
        }, 500);
    }
}

// Chame essa função no final do arquivo ou no DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    tentarAutoLogin();
});
