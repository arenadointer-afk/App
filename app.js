const PIN = "2007";
let contas = JSON.parse(localStorage.getItem("contas")) || [];
let filtro = "todas";

/* ================= UTIL ================= */
function salvar() {
  localStorage.setItem("contas", JSON.stringify(contas));
  render();
}

const isoParaBR = d => {
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

/* ================= LOCK ================= */
function desbloquear() {
  const pinInput = document.getElementById("pin");
  const lockDiv = document.getElementById("lock");
  const appDiv = document.getElementById("app");

  if (pinInput.value === PIN) {
    lockDiv.style.display = "none";
    appDiv.style.display = "block";
    carregarPerfil();
    render();
  } else {
    alert("PIN incorreto");
  }
}

/* ================= PERFIL ================= */
function carregarPerfil() {
  const f = localStorage.getItem("fotoPerfil");
  if (f) document.getElementById("fotoPerfil").src = f;
}

document.getElementById("fotoPerfil").onclick = () =>
  document.getElementById("uploadFoto").click();

document.getElementById("uploadFoto").onchange = e => {
  const r = new FileReader();
  r.onload = () => {
    localStorage.setItem("fotoPerfil", r.result);
    document.getElementById("fotoPerfil").src = r.result;
  };
  r.readAsDataURL(e.target.files[0]);
};

/* ================= FILTRO ================= */
function setFiltro(f, btn) {
  filtro = f;
  document.querySelectorAll(".filtros button")
    .forEach(b => b.classList.remove("ativo"));
  btn.classList.add("ativo");
  render();
}

/* ================= RENDER ================= */
function render() {
  const lista = document.getElementById("lista");
  lista.style.overflowY = "auto";
  lista.style.maxHeight = "calc(100vh - 230px)";
  lista.innerHTML = "";

  const grupos = {};

  contas.forEach((c,i) => {
    if (c.oculta) return;
    if (filtro === "pendentes" && c.paga) return;
    if (filtro === "pagas" && !c.paga) return;

    const k = mesAno(c.vencimento);
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push({ ...c, index: i });
  });

  Object.keys(grupos).forEach(k => {
    let total = 0, pago = 0;

    const bloco = document.createElement("div");
    bloco.innerHTML = `
      <h3>📅 ${k}</h3>
      <button onclick="compartilharMes('${k}')">📤 Compartilhar mês</button>
    `;

    grupos[k].forEach(c => {
      total += c.valor;
      if (c.paga) pago += c.valor;

      const div = document.createElement("div");
      div.className = "conta" + (c.paga ? " verde" : "");
      div.innerHTML = `
        <strong>${c.nome}</strong><br>
        💰 R$ ${c.valor.toFixed(2)}<br>
        📅 ${isoParaBR(c.vencimento)}
        <div class="acoes">
          <button onclick="marcarPaga(${c.index})">✅ Paga</button>
          <button onclick="ocultarConta(${c.index})">👁 Ocultar</button>
          <button onclick="editarConta(${c.index})">✏️</button>
          <button onclick="deletarConta(${c.index})">🗑️</button>
        </div>
      `;

      let startX = 0;
      div.addEventListener("touchstart", e => startX = e.touches[0].clientX);
      div.addEventListener("touchend", e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (dx < -80) marcarPaga(c.index);
        if (dx > 80) ocultarConta(c.index);
      });

      bloco.appendChild(div);
    });

    bloco.innerHTML += `
      <div class="resumo">
        💰 Total: R$ ${total.toFixed(2)}<br>
        ✅ Pago: R$ ${pago.toFixed(2)}<br>
        ⏳ Falta: R$ ${(total - pago).toFixed(2)}
      </div>
    `;

    lista.appendChild(bloco);
  });
}

/* ================= AÇÕES ================= */
function marcarPaga(i) {
  const c = contas[i];
  c.paga = true;
  c.oculta = true;
  c.dataPagamento = new Date().toISOString().split("T")[0];

  if (c.recorrente) {
    contas.push({
      ...c,
      paga: false,
      oculta: false,
      dataPagamento: null,
      vencimento: proximoMes(c.vencimento)
    });
  }
  salvar();
}

function ocultarConta(i) {
  contas[i].oculta = true;
  salvar();
}

function adicionarConta() {
  const nome = prompt("Nome da conta:");
  const valor = Number(prompt("Valor:"));
  const data = prompt("Vencimento (DD/MM/AAAA):");
  const recorrente = confirm("Conta mensal recorrente?");
  if (!nome || !valor || !data) return;

  contas.push({
    nome,
    valor,
    vencimento: brParaISO(data),
    paga: false,
    recorrente,
    oculta: false,
    dataPagamento: null
  });
  salvar();
}

function editarConta(i) {
  const c = contas[i];
  const nome = prompt("Nome:", c.nome);
  const valor = Number(prompt("Valor:", c.valor));
  const data = prompt("Vencimento (DD/MM/AAAA):", isoParaBR(c.vencimento));
  if (!nome || !valor || !data) return;

  c.nome = nome;
  c.valor = valor;
  c.vencimento = brParaISO(data);
  salvar();
}

function deletarConta(i) {
  if (confirm("Excluir esta conta?")) {
    contas.splice(i,1);
    salvar();
  }
}

/* ================= HISTÓRICO ================= */
function abrirHistorico() {
  const lista = document.getElementById("lista");
  lista.innerHTML = `<button onclick="render()">⬅ Voltar</button>`;
  const grupos = {};

  contas.filter(c => c.oculta).forEach((c,i) => {
    const k = mesAno(c.vencimento);
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push({ ...c, index: i });
  });

  Object.keys(grupos).forEach(k => {
    lista.innerHTML += `
      <h3>📅 ${k}</h3>
      <button onclick="compartilharMes('${k}', true)">📤 Compartilhar mês</button>
    `;

    grupos[k].forEach(c => {
      lista.innerHTML += `
        <div class="conta ${c.paga ? "verde" : ""}">
          <strong>${c.nome}</strong><br>
          💰 R$ ${c.valor.toFixed(2)}<br>
          📅 Vencimento: ${isoParaBR(c.vencimento)}<br>
          ${c.dataPagamento ? `✅ Pago em: ${isoParaBR(c.dataPagamento)}` : ""}
          <div class="acoes">
            <button onclick="editarConta(${c.index})">✏️</button>
            <button onclick="deletarConta(${c.index})">🗑️</button>
          </div>
        </div>
      `;
    });
  });
}

/* ================= COMPARTILHAR ================= */
function compartilhar() {
  let texto = `📊 Controle de Contas\n\n`;
  let total = 0, pago = 0;

  contas.forEach(c => {
    texto += `${c.nome} - R$ ${c.valor.toFixed(2)} - ${isoParaBR(c.vencimento)} - ${c.paga ? "Pago ✅" : "Pendente ⚠️"}\n`;
    total += c.valor;
    if (c.paga) pago += c.valor;
  });

  texto += `\n💰 Total: R$ ${total.toFixed(2)}\n✅ Pago: R$ ${pago.toFixed(2)}\n⏳ Falta: R$ ${(total - pago).toFixed(2)}`;

  navigator.share ? navigator.share({ text: texto }) : alert(texto);
}

function compartilharMes(mes, historico=false) {
  let texto = `📅 Contas ${mes}\n\n`;

  contas.forEach(c => {
    if (mesAno(c.vencimento) !== mes) return;
    if (!historico && c.oculta) return;

    texto += `${c.nome} - R$ ${c.valor.toFixed(2)} - ${isoParaBR(c.vencimento)} - ${c.paga ? "Pago ✅" : "Pendente ⚠️"}\n`;
  });

  navigator.share ? navigator.share({ text: texto }) : alert(texto);
}