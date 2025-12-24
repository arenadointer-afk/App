const PIN = "2007";
let contas = JSON.parse(localStorage.getItem("contas")) || [];
let filtro = "todas";

/* ================= UTIL ================= */

function salvar() {
  localStorage.setItem("contas", JSON.stringify(contas));
  render();
}

/* ISO -> BR (NUNCA usa Date) */
function isoParaBR(data) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/* BR -> ISO */
function brParaISO(data) {
  const [dia, mes, ano] = data.split("/");
  return `${ano}-${mes}-${dia}`;
}

function mesAnoTexto() {
  const agora = new Date();
  return agora.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
}

/* ================= LOCK ================= */

function desbloquear() {
  if (document.getElementById("pin").value === PIN) {
    document.getElementById("lock").style.display = "none";
    document.getElementById("app").style.display = "block";
    render();
  } else {
    alert("PIN incorreto");
  }
}

/* ================= RESUMO ================= */

function renderResumo() {
  let total = 0;
  let pago = 0;

  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  const visiveis = contas.filter(c => {
    if (!c.paga) return true;
    const [ano, mes] = c.vencimento.split("-");
    return Number(mes) - 1 === mesAtual && Number(ano) === anoAtual;
  });

  visiveis.forEach(c => {
    total += c.valor;
    if (c.paga) pago += c.valor;
  });

  const progresso = total ? Math.round((pago / total) * 100) : 0;

  const barra = document.getElementById("barraProgresso");
  barra.style.width = progresso + "%";
  barra.style.background =
    progresso === 100 ? "#2ecc71" :
    progresso >= 50 ? "#f1c40f" : "#ff4d4d";

  document.getElementById("resumoMes").innerText = "📊 " + mesAnoTexto();
  document.getElementById("resumo").innerHTML = `
    💸 Total: R$ ${total.toFixed(2)}<br>
    ✅ Pago: R$ ${pago.toFixed(2)}<br>
    ⏳ Falta: R$ ${(total - pago).toFixed(2)}
  `;
}

/* ================= LISTA ================= */

function render() {
  renderResumo();
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  contas.forEach((c, i) => {
    if (
      filtro === "pendentes" && c.paga ||
      filtro === "pagas" && !c.paga
    ) return;

    lista.innerHTML += `
      <div class="conta ${c.paga ? "verde" : ""}">
        <strong>${c.nome}</strong><br>
        💰 R$ ${c.valor.toFixed(2)}<br>
        📅 ${isoParaBR(c.vencimento)}<br>

        ${!c.paga ? `<button onclick="toggle(${i})">✅ Marcar paga</button>` : ""}
        <button onclick="editarConta(${i})">✏️</button>
        <button onclick="anexar(${i})">📎</button>
        <button onclick="deletarConta(${i})">🗑️</button>
      </div>
    `;
  });
}

/* ================= AÇÕES ================= */

function adicionarConta() {
  const nome = prompt("Nome da conta:");
  const valor = Number(prompt("Valor:"));
  const dataBR = prompt("Vencimento (DD/MM/AAAA):");

  if (!nome || !valor || !dataBR) return;

  contas.push({
    nome,
    valor,
    vencimento: brParaISO(dataBR),
    paga: false
  });

  salvar();
}

function editarConta(i) {
  const c = contas[i];

  const nome = prompt("Nome:", c.nome);
  const valor = Number(prompt("Valor:", c.valor));
  const dataBR = prompt("Vencimento (DD/MM/AAAA):", isoParaBR(c.vencimento));

  if (!nome || !valor || !dataBR) return;

  c.nome = nome;
  c.valor = valor;
  c.vencimento = brParaISO(dataBR);

  salvar();
}

function toggle(i) {
  contas[i].paga = !contas[i].paga;
  salvar();
}

function deletarConta(i) {
  if (confirm("Deseja excluir esta conta?")) {
    contas.splice(i, 1);
    salvar();
  }
}

/* ================= COMPROVANTE ================= */

function anexar(i) {
  const input = document.createElement("input");
  input.type = "file";

  input.onchange = e => {
    const reader = new FileReader();
    reader.onload = () => {
      contas[i].comprovante = reader.result;
      salvar();
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  input.click();
}

/* ================= HISTÓRICO ================= */

function abrirHistorico() {
  const lista = document.getElementById("lista");

  lista.innerHTML = `
    <button onclick="render()">⬅ Voltar</button>
    <h3>📊 Histórico</h3>
  `;

  contas.forEach((c, i) => {
    if (!c.paga) return;

    lista.innerHTML += `
      <div class="conta verde">
        <strong>${c.nome}</strong><br>
        💰 R$ ${c.valor.toFixed(2)}<br>
        📅 ${isoParaBR(c.vencimento)}<br>
        ${c.comprovante ? `<a href="${c.comprovante}" target="_blank">📎 Comprovante</a><br>` : ""}
        <button onclick="toggle(${i})">↩️ Voltar</button>
        <button onclick="deletarConta(${i})">🗑️</button>
      </div>
    `;
  });
}

/* ================= COMPARTILHAR ================= */

function compartilhar() {
  let texto = `📊 ${mesAnoTexto()}\n\n`;
  let total = 0;
  let pago = 0;

  contas.forEach(c => {
    texto += `${c.nome} - R$ ${c.valor.toFixed(2)} - ${isoParaBR(c.vencimento)} - ${c.paga ? "pago ✅" : "pendente ⚠️"}\n`;
    total += c.valor;
    if (c.paga) pago += c.valor;
  });

  texto += `\n💸 Total: R$ ${total.toFixed(2)}\n`;
  texto += `✅ Pago: R$ ${pago.toFixed(2)}\n`;
  texto += `⏳ Falta: R$ ${(total - pago).toFixed(2)}`;

  navigator.share ? navigator.share({ text: texto }) : alert(texto);
}