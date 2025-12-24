// ===== ESTADO =====
let contas = JSON.parse(localStorage.getItem("contas")) || [];
let filtro = "todas";
let PIN_SALVO = localStorage.getItem("pin") || "2007";

// salva PIN padrão se não existir
if (!localStorage.getItem("pin")) {
  localStorage.setItem("pin", "2007");
}

// ===== BLOQUEIO =====
function desbloquear() {
  const pin = document.getElementById("pin").value;

  if (pin === PIN_SALVO) {
    document.getElementById("lock").style.display = "none";
    pedirPermissaoNotificacao();
    checarNotificacoes();
  } else {
    alert("PIN incorreto");
  }
}

// ===== UTIL =====
function salvar() {
  localStorage.setItem("contas", JSON.stringify(contas));
  render();
}

function converterParaISO(dataBR) {
  const [d, m, a] = dataBR.split("/");
  return `${a}-${m}-${d}`;
}

function diasParaVencer(dataISO) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataISO);
  venc.setHours(0, 0, 0, 0);
  return Math.ceil((venc - hoje) / 86400000);
}

// ===== FILTRO =====
function setFiltro(f) {
  filtro = f;
  render();
}

// ===== RENDER =====
function render() {
  const lista = document.getElementById("lista");
  const totalEl = document.getElementById("total");
  lista.innerHTML = "";
  let total = 0;

  contas
    .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento))
    .filter(c => {
      if (filtro === "pagas") return c.paga;
      if (filtro === "abertas") return !c.paga;
      return true;
    })
    .forEach((c, i) => {
      const dias = diasParaVencer(c.vencimento);

      let cor = "amarelo";
      if (c.paga) cor = "verde";
      else if (dias <= 7) cor = "vermelho";

      if (!c.paga) total += Number(c.valor);

      lista.innerHTML += `
        <div class="conta ${cor}">
          <strong>${c.nome}</strong> ${c.fixa ? "📌" : ""}<br>
          💰 R$ ${Number(c.valor).toFixed(2)}<br>
          📅 ${new Date(c.vencimento).toLocaleDateString("pt-BR")}<br><br>

          <button onclick="toggle(${i})">
            ${c.paga ? "❌ Desmarcar" : "✅ Marcar paga"}
          </button>

          <button onclick="deletarConta(${i})" class="danger">
            🗑️ Apagar
          </button>
        </div>
      `;
    });

  totalEl.innerHTML = `💸 Total em aberto: R$ ${total.toFixed(2)}`;
}

// ===== AÇÕES =====
function toggle(i) {
  contas[i].paga = !contas[i].paga;
  salvar();
}

function deletarConta(i) {
  if (confirm("Deseja apagar esta conta?")) {
    contas.splice(i, 1);
    salvar();
  }
}

function adicionarConta() {
  const nome = prompt("Nome da conta:");
  const valor = prompt("Valor (ex: 150.50):");
  const data = prompt("Vencimento (DD/MM/AAAA):");
  const fixa = confirm("Essa conta é fixa todo mês?");

  if (!nome || !valor || !data) return;

  contas.push({
    nome,
    valor: Number(valor),
    vencimento: converterParaISO(data),
    paga: false,
    fixa
  });

  salvar();
}

// ===== DUPLICAR MÊS =====
function duplicarMes() {
  const novas = contas
    .filter(c => c.fixa)
    .map(c => {
      const d = new Date(c.vencimento);
      d.setMonth(d.getMonth() + 1);
      return {
        ...c,
        vencimento: d.toISOString().slice(0, 10),
        paga: false
      };
    });

  contas = contas.concat(novas);
  salvar();
}

// ===== WHATSAPP =====
function compartilhar() {
  let texto = "*📋 Planejamento de Contas*\n\n";

  contas.forEach(c => {
    texto += `${c.paga ? "✅" : "🔴"} ${c.nome} - R$ ${Number(c.valor).toFixed(2)} - ${new Date(c.vencimento).toLocaleDateString("pt-BR")}\n`;
  });

  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`);
}

// ===== NOTIFICAÇÕES =====
function pedirPermissaoNotificacao() {
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

function checarNotificacoes() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  contas.forEach(c => {
    const dias = diasParaVencer(c.vencimento);

    if (dias === 1 && !c.paga) {
      new Notification("📌 Conta vence amanhã", {
        body: `${c.nome} - R$ ${Number(c.valor).toFixed(2)}`,
      });
    }
  });
}

// checa ao abrir
render();
// ===== FOTO DE PERFIL =====
const fotoPerfil = document.getElementById("fotoPerfil");
const inputFoto = document.getElementById("inputFoto");

// carregar foto salva
const fotoSalva = localStorage.getItem("fotoPerfil");
if (fotoSalva) {
  fotoPerfil.src = fotoSalva;
} else {
  fotoPerfil.src = "https://via.placeholder.com/100";
}

function trocarFoto() {
  inputFoto.click();
}

inputFoto.addEventListener("change", () => {
  const file = inputFoto.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    fotoPerfil.src = reader.result;
    localStorage.setItem("fotoPerfil", reader.result);
  };
  reader.readAsDataURL(file);
});
function abrirHistorico() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "<h3>📊 Histórico de Gastos</h3>";

  const historico = {};

  contas
    .filter(c => c.paga)
    .forEach(c => {
      const d = new Date(c.vencimento);
      const chave = `${d.getMonth()+1}/${d.getFullYear()}`;

      if (!historico[chave]) {
        historico[chave] = {
          total: 0,
          contas: []
        };
      }

      historico[chave].total += Number(c.valor);
      historico[chave].contas.push(c);
    });

  if (Object.keys(historico).length === 0) {
    lista.innerHTML += "<p>Nenhuma conta paga ainda.</p>";
    return;
  }

  Object.keys(historico)
    .sort((a,b) => {
      const [ma, ya] = a.split("/");
      const [mb, yb] = b.split("/");
      return new Date(yb, mb-1) - new Date(ya, ma-1);
    })
    .forEach(mes => {
      lista.innerHTML += `
        <div class="historico-mes">
          <h4>📅 ${mes}</h4>
          <p><strong>Total gasto:</strong> R$ ${historico[mes].total.toFixed(2)}</p>
        </div>
      `;

      historico[mes].contas.forEach(c => {
        lista.innerHTML += `
          <div class="conta verde">
            ${c.nome}<br>
            💰 R$ ${Number(c.valor).toFixed(2)}
          </div>
        `;
      });
    });
}