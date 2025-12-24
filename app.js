let contas = JSON.parse(localStorage.getItem("contas")) || [];
let filtro = "todas";
const PIN = "2007";

/* ================= UTIL ================= */

function brParaISO(data) {
  const [d, m, a] = data.split("/");
  return `${a}-${m}-${d}`;
}

function isoParaBR(data) {
  return new Date(data).toLocaleDateString("pt-BR");
}

function mesAnoTexto(data = new Date()) {
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/* ================= BLOQUEIO ================= */

function desbloquear() {
  if (document.getElementById("pin").value === PIN) {
    document.getElementById("lock").style.display = "none";
    render();
  } else {
    alert("PIN incorreto");
  }
}

/* ================= SALVAR ================= */

function salvar() {
  localStorage.setItem("contas", JSON.stringify(contas));
  render();
}

/* ================= FILTRO ================= */

function setFiltro(f) {
  filtro = f;
  render();
}

/* ================= RESUMO + BARRA ================= */

function renderResumo() {
  const agora = new Date();
  const mes = agora.getMonth();
  const ano = agora.getFullYear();

  let total = 0;
  let pago = 0;

  contas.forEach(c => {
    const d = new Date(c.vencimento);
    if (d.getMonth() === mes && d.getFullYear() === ano) {
      total += c.valor;
      if (c.paga) pago += c.valor;
    }
  });

  const progresso = total ? Math.round((pago / total) * 100) : 0;
  const barra = document.getElementById("barraProgresso");

  barra.style.width = progresso + "%";
  barra.style.background =
    progresso === 100 ? "#2ecc71" :
    progresso >= 50 ? "#f1c40f" : "#ff4d4d";

  document.getElementById("resumoMes").innerText = `📊 ${mesAnoTexto()}`;
  document.getElementById("resumo").innerHTML = `
    💸 Total: R$ ${total.toFixed(2)}<br>
    ✅ Pago: R$ ${pago.toFixed(2)}<br>
    ⏳ Falta: R$ ${(total - pago).toFixed(2)}
  `;
}

/* ================= RENDER ================= */

function render() {
  renderResumo();
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  const visiveis = contas.filter(c => {
    const d = new Date(c.vencimento);
    if (!c.paga) return true;
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  visiveis
    .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento))
    .forEach(c => {
      if (filtro === "pagas" && !c.paga) return;
      if (filtro === "abertas" && c.paga) return;

      const i = contas.indexOf(c);

      lista.innerHTML += `
        <div class="conta ${c.paga ? "verde" : "vermelho"}">
          <strong>${c.nome}</strong><br>
          💰 R$ ${c.valor.toFixed(2)}<br>
          📅 ${isoParaBR(c.vencimento)}<br>
          ${c.comprovante ? `<a href="${c.comprovante}" target="_blank">📎 Comprovante</a><br>` : ""}
          <button onclick="toggle(${i})">${c.paga ? "❌ Desmarcar" : "✅ Marcar paga"}</button>
          <button onclick="editarConta(${i})">✏️</button>
          <button onclick="anexarComprovante(${i})">📎</button>
          <button onclick="deletarConta(${i})">🗑️</button>
        </div>
      `;
    });
}

/* ================= AÇÕES ================= */

function toggle(i) {
  contas[i].paga = !contas[i].paga;
  salvar();
}

function adicionarConta() {
  const nome = prompt("Nome:");
  const valor = prompt("Valor:");
  const data = prompt("Vencimento (DD/MM/AAAA):");

  if (!nome || !valor || !data) return;

  contas.push({
    nome,
    valor: Number(valor),
    vencimento: brParaISO(data),
    paga: false
  });

  salvar();
}

function editarConta(i) {
  const c = contas[i];

  const nome = prompt("Nome:", c.nome);
  const valor = prompt("Valor:", c.valor);
  const data = prompt("Vencimento (DD/MM/AAAA):", isoParaBR(c.vencimento));

  if (!nome || !valor || !data) return;

  c.nome = nome;
  c.valor = Number(valor);
  c.vencimento = brParaISO(data);

  salvar();
}

function deletarConta(i) {
  if (confirm("Apagar conta?")) {
    contas.splice(i, 1);
    salvar();
  }
}

/* ================= COMPROVANTE ================= */

function anexarComprovante(i) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,application/pdf";

  input.onchange = () => {
    const reader = new FileReader();
    reader.onload = () => {
      contas[i].comprovante = reader.result;
      salvar();
    };
    reader.readAsDataURL(input.files[0]);
  };

  input.click();
}

/* ================= WHATSAPP ================= */

function compartilhar() {
  let texto = `📋 Contas - ${mesAnoTexto()}\n\n`;
  let pago = 0;
  let pendente = 0;

  contas.forEach(c => {
    c.paga ? pago += c.valor : pendente += c.valor;
    texto += `${c.nome} - R$ ${c.valor.toFixed(2)} - ${isoParaBR(c.vencimento)} ( status ${c.paga ? "pago ✅" : "pendente ⚠️"} )\n`;
  });

  texto += `\n💰 Pago: R$ ${pago.toFixed(2)}\n⏳ Falta: R$ ${pendente.toFixed(2)}`;

  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`);
}

/* ================= HISTÓRICO ================= */

function abrirHistorico() {
  const lista = document.getElementById("lista");

  lista.innerHTML = `
    <button onclick="render()" style="margin:10px">⬅ Voltar</button>
    <h3>📊 Histórico</h3>
  `;

  const grupos = {};

  contas.filter(c => c.paga).forEach(c => {
    const d = new Date(c.vencimento);
    const k = `${d.getMonth() + 1}/${d.getFullYear()}`;
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push(c);
  });

  Object.keys(grupos).forEach(m => {
    lista.innerHTML += `<div class="historico-mes"><h4>${m}</h4></div>`;
    grupos[m].forEach(c => {
      lista.innerHTML += `
        <div class="conta verde">
          ${c.nome} - R$ ${c.valor.toFixed(2)}
          ${c.comprovante ? `<a href="${c.comprovante}" target="_blank"> 📎</a>` : ""}
        </div>
      `;
    });
  });
}