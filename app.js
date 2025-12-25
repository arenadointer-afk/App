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
  if (pin.value === PIN) {
    lock.style.display = "none";
    app.style.display = "block";

    document.getElementById("avisoSwipe")?.remove();
    document.querySelector(".barra")?.remove();

    carregarPerfil();
    render();
  } else {
    alert("PIN incorreto");
  }
}

/* ================= PERFIL ================= */
function carregarPerfil() {
  const f = localStorage.getItem("fotoPerfil");
  if (f) fotoPerfil.src = f;
}

fotoPerfil.onclick = () => uploadFoto.click();
uploadFoto.onchange = e => {
  const r = new FileReader();
  r.onload = () => {
    localStorage.setItem("fotoPerfil", r.result);
    fotoPerfil.src = r.result;
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
  lista.innerHTML = "";

  const grupos = {};

  contas.forEach((c,i) => {
    const k = mesAno(c.vencimento);
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push({ ...c, index: i });
  });

  Object.keys(grupos).forEach(k => {
    const visiveis = grupos[k].filter(c => {

      if (filtro === "pagas") return c.paga;
      if (c.oculta) return false;
      if (filtro === "pendentes" && c.paga) return false;

      return true;
    });

    if (!visiveis.length) return;

    let total = 0, pago = 0;
    grupos[k].forEach(c => {
      total += c.valor;
      if (c.paga) pago += c.valor;
    });

    const bloco = document.createElement("div");
    bloco.innerHTML = `
      <h3>📅 ${k}</h3>
      <button onclick="compartilharMes('${k}')">📤 Compartilhar mês</button>
    `;

    visiveis.forEach(c => {
      const div = document.createElement("div");
      div.className = "conta" + (c.paga ? " verde" : "");
      div.innerHTML = `
        <strong>${c.nome}</strong><br>
        💰 R$ ${c.valor.toFixed(2)}<br>
        📅 ${isoParaBR(c.vencimento)}
        <div class="acoes">
          ${!c.paga ? `<button onclick="marcarPaga(${c.index})">✅ Paga</button>` : ""}
          <button onclick="ocultarConta(${c.index})">👁 Ocultar</button>
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

    bloco.innerHTML += `
      <div class="resumo">
        💰 Total do mês: R$ ${total.toFixed(2)}<br>
        ✅ Pago no mês: R$ ${pago.toFixed(2)}<br>
        ⏳ Falta no mês: R$ ${(total - pago).toFixed(2)}
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
    let gerar = true;

    if (typeof c.repeticoes === "number") {
      c.repeticoes--;
      if (c.repeticoes <= 0) gerar = false;
    }

    if (gerar) {
      contas.push({
        ...c,
        paga: false,
        oculta: false,
        dataPagamento: null,
        vencimento: proximoMes(c.vencimento)
      });
    }
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
  if (!nome || !valor || !data) return;

  let recorrente = confirm("Conta recorrente?");
  let repeticoes = null;

  if (recorrente) {
    const r = prompt(
      "Quantos meses essa conta deve se repetir?\n\n" +
      "• Vazio ou 0 = todos os meses\n" +
      "• Exemplo: 3"
    );
    const n = Number(r);
    if (n > 0) repeticoes = n;
  }

  contas.push({
    nome,
    valor,
    vencimento: brParaISO(data),
    paga: false,
    recorrente,
    repeticoes,
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
  contas.forEach((c,i) => {
    if (!c.oculta) return;
    const k = mesAno(c.vencimento);
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push({ ...c, index: i });
  });

  Object.keys(grupos).forEach(k => {
    lista.innerHTML += `
      <h3>📅 ${k}</h3>
      <button onclick="compartilharMes('${k}')">📤 Compartilhar mês</button>
    `;
    grupos[k].forEach(c => {
      lista.innerHTML += `
        <div class="conta ${c.paga ? "verde" : ""}">
          <strong>${c.nome}</strong><br>
          💰 R$ ${c.valor.toFixed(2)}<br>
          📅 ${isoParaBR(c.vencimento)}<br>
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
function compartilharMes(mes) {
  let texto = `📅 Contas ${mes}\n\n`;
  let total = 0, pago = 0;

  contas.forEach(c => {
    if (mesAno(c.vencimento) !== mes) return;
    total += c.valor;
    if (c.paga) pago += c.valor;

    texto += `${c.nome} - R$ ${c.valor.toFixed(2)} - ${isoParaBR(c.vencimento)} - ${c.paga ? "Pago ✅" : "Pendente ⚠️"}\n`;
  });

  texto += `\n💰 Total: R$ ${total.toFixed(2)}\n✅ Pago: R$ ${pago.toFixed(2)}\n⏳ Falta: R$ ${(total - pago).toFixed(2)}`;
  navigator.share ? navigator.share({ text: texto }) : alert(texto);
}