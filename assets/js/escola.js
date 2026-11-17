(function () {
  "use strict";
  var F = window.FSF, $ = F.$, el = F.el;

  /* Armazenamento protegido: o site funciona mesmo sem ele */
  var guarda = {
    ler: function (k, padrao) { try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } },
    gravar: function (k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* QUIZ */
  var perguntas = [
    { p: "Segundo o projeto da campanha, qual é o período de estiagem com maior risco de incêndios na região?", o: ["De janeiro a março", "De julho a outubro", "De novembro a dezembro"], c: 1,
      e: "A estiagem, entre julho e outubro, concentra o maior risco de incêndios. Em 2026, a campanha foi ao ar no fim desse período, de 19 a 31 de outubro.", f: "Projeto da Ação 04 (2026); declaração da emissora." },
    { p: "Queimar lixo a céu aberto, no quintal, é:", o: ["Permitido, se for pouco lixo", "Proibido por lei", "Permitido só de noite"], c: 1,
      e: "A Política Nacional de Resíduos Sólidos proíbe a queima de resíduos a céu aberto ou em recipientes, instalações e equipamentos não licenciados para isso.", f: "Lei nº 12.305/2010, art. 47, III." },
    { p: "Provocar incêndio em floresta ou em outras formas de vegetação é:", o: ["Crime ambiental", "Apenas falta de educação", "Permitido na estiagem"], c: 0,
      e: "É crime, com pena de reclusão de 2 a 4 anos e multa. Mesmo sem intenção (crime culposo), a pena é de detenção de 6 meses a 1 ano e multa.", f: "Lei nº 9.605/1998, art. 41." },
    { p: "Qual é a diferença entre incêndio florestal e queima controlada?", o: ["Não há diferença", "O incêndio é fogo sem controle e sem planejamento; a queima controlada é planejada, monitorada e controlada", "A queima controlada só acontece em cidades"], c: 1,
      e: "Incêndio florestal é qualquer fogo não controlado e não planejado sobre a vegetação. Queima controlada é o uso planejado, monitorado e controlado do fogo, em áreas determinadas e condições específicas.", f: "Lei nº 14.944/2024, art. 2º, I e II." },
    { p: "Viu fogo ou fumaça na vegetação. Para qual número a campanha manda ligar?", o: ["190", "193", "199"], c: 1,
      e: "193 é o Corpo de Bombeiros. O spot diz: “Viu fogo? Ligue 193, Corpo de Bombeiros.” Afaste-se sem se colocar em risco.", f: "Spot e peças da campanha; notícia da Prefeitura de Figueirão." },
    { p: "Figueirão fica no divisor de águas entre quais bacias hidrográficas?", o: ["Amazonas e São Francisco", "Paraguai e Paraná", "Paraná e Uruguai"], c: 1,
      e: "O município é divisor de águas entre as bacias do Paraguai e do Paraná. As duas fazem parte da Bacia do Rio da Prata.", f: "Folder e cartaz da campanha." },
    { p: "Quem certificou a Comunidade Quilombola Santa Tereza?", o: ["A Prefeitura de Figueirão", "A Fundação Cultural Palmares", "O Corpo de Bombeiros"], c: 1,
      e: "A comunidade foi certificada pela Fundação Cultural Palmares, pela Portaria nº 32, de 2005.", f: "Projeto da Ação 04 (2026), que cita a Portaria FCP nº 32/2005." },
    { p: "Qual é a área do Monumento Natural Serra do Figueirão?", o: ["5.047 hectares", "488 hectares", "50.470 hectares"], c: 0,
      e: "São 5.047 hectares, cerca de 1% da área do município, que tem 488.073,6 hectares.", f: "Resolução Semadesc/MS nº 132/2025 (ICMS Ecológico 2026), Anexo III." },
    { p: "No Cerrado de MS, entre 1º de janeiro e 15 de julho, quantos focos de calor houve em 2026?", o: ["578", "321", "1.170"], c: 1,
      e: "Foram 321 focos em 2026, contra 578 no mesmo período de 2025. Mesmo assim, a previsão para agosto a outubro de 2026 colocou o norte do estado, onde fica Figueirão, em “Alerta Alto”.", f: "Informativo nº 01/CICOE-PEMIF/2026, Cemtec e Asbom." },
    { p: "Em dia de muita fumaça de queimada, o que o Ministério da Saúde orienta?", o: ["Fazer exercício ao ar livre para limpar o pulmão", "Abrir as janelas para ventilar", "Ficar em ambiente fechado, com janelas fechadas, e beber mais água"], c: 2,
      e: "A principal orientação é ficar em ambientes internos protegidos da fumaça, com portas e janelas fechadas, beber mais água e evitar exercício ao ar livre, sobretudo entre 12h e 16h.", f: "Ministério da Saúde, via Agência Gov, 21/07/2026." }
  ];
  var caixa = $("#quiz"), atual = 0, acertos = 0;
  function renderPergunta() {
    var q = perguntas[atual];
    caixa.innerHTML = "";
    caixa.appendChild(el("p", { "class": "progresso" }, "Pergunta " + (atual + 1) + " de " + perguntas.length + " · " + acertos + " acerto" + (acertos === 1 ? "" : "s")));
    caixa.appendChild(el("p", { "class": "pergunta", id: "quiz-p", tabindex: "-1" }, q.p));
    var ops = el("div", { "class": "opcoes", role: "group", "aria-labelledby": "quiz-p" });
    q.o.forEach(function (txt, i) {
      var b = el("button", { type: "button" }, txt);
      b.addEventListener("click", function () { responder(i); });
      ops.appendChild(b);
    });
    caixa.appendChild(ops);
    caixa.appendChild(el("div", { id: "quiz-retorno", "aria-live": "polite" }));
  }
  function responder(i) {
    var q = perguntas[atual], certo = i === q.c;
    if (certo) acertos++;
    F.$$(".opcoes button", caixa).forEach(function (b, k) {
      b.disabled = true;
      if (k === q.c) b.setAttribute("data-estado", "certa");
      else if (k === i) b.setAttribute("data-estado", "errada");
    });
    var ret = $("#quiz-retorno");
    ret.innerHTML = '<div class="explica' + (certo ? "" : " erro") + '"><p><strong>' + (certo ? "Isso mesmo." : "Não é essa.") + "</strong> " + q.e + "</p><small>Fonte: " + q.f + "</small></div>";
    var prox = el("button", { type: "button", "class": "botao", style: "justify-self:start;margin-top:10px" }, atual < perguntas.length - 1 ? "Próxima pergunta" : "Ver resultado");
    prox.addEventListener("click", function () {
      atual++;
      if (atual < perguntas.length) { renderPergunta(); $("#quiz-p").focus(); } else fim();
    });
    ret.appendChild(prox);
    F.$(".progresso", caixa).textContent = "Pergunta " + (atual + 1) + " de " + perguntas.length + " · " + acertos + " acerto" + (acertos === 1 ? "" : "s");
  }
  function fim() {
    var msg = acertos >= 8 ? "A turma está pronta para cuidar de Figueirão antes do fogo." : acertos >= 5 ? "Bom caminho. Reveja as explicações e tente de novo." : "Vale ler o site de novo e jogar mais uma vez.";
    caixa.innerHTML = '<p class="pergunta" id="quiz-p" tabindex="-1">Você acertou ' + acertos + " de " + perguntas.length + ".</p><p>" + msg + "</p>";
    var de = el("button", { type: "button", "class": "botao", style: "justify-self:start" }, "Fazer de novo");
    de.addEventListener("click", function () { atual = 0; acertos = 0; renderPergunta(); $("#quiz-p").focus(); });
    caixa.appendChild(de);
    $("#quiz-p").focus();
  }
  if (caixa) renderPergunta();

  /* CHECKLIST */
  var itens = [
    { t: "Sabemos os números da campanha: 193, 181, Polícia Militar Ambiental e Defesa Civil Estadual.", f: "Peças da campanha" },
    { t: "Combinamos em casa que não queimamos lixo, folhas secas ou restos de vegetação.", f: "Lei nº 12.305/2010, art. 47, III" },
    { t: "Ninguém da família joga bituca de cigarro em vegetação ou na beira da estrada.", f: "Notícia da Prefeitura de Figueirão" },
    { t: "Sabemos o que fazer se virmos fogo: afastar e avisar o 193, sem se colocar em risco.", f: "Notícia da Prefeitura de Figueirão" },
    { t: "Sabemos nos proteger em dia de fumaça: janelas fechadas, água e nada de exercício ao ar livre.", f: "Ministério da Saúde" },
    { t: "A turma conhece o Monumento Natural Serra do Figueirão e a Comunidade Quilombola Santa Tereza.", f: "Projeto da Ação 04" },
    { t: "A turma jogou “Antes ou depois?” e conversou sobre os finais.", f: "Este site" },
    { t: "A turma fez o quiz e leu as explicações.", f: "Este site" }
  ];
  var ul = $("#checklist"), CH = "fsf-checklist-v1";
  if (ul) {
    var marcados = guarda.ler(CH, []);
    var conta = function () {
      var n = F.$$("input", ul).filter(function (x) { return x.checked; }).length;
      $("#check-contador").textContent = n + " de " + itens.length + " itens feitos" + (n === itens.length ? ". Tudo pronto antes do fogo!" : ".");
    };
    itens.forEach(function (it, i) {
      var li = el("li");
      li.innerHTML = '<label><input type="checkbox" id="chk-' + i + '"' + (marcados.indexOf(i) > -1 ? " checked" : "") + "><span>" + it.t + "<small>" + it.f + "</small></span></label>";
      ul.appendChild(li);
    });
    ul.addEventListener("change", function () {
      var lista = []; F.$$("input", ul).forEach(function (x, i) { if (x.checked) lista.push(i); });
      guarda.gravar(CH, lista); conta();
    });
    $("#check-limpar").addEventListener("click", function () { F.$$("input", ul).forEach(function (x) { x.checked = false; }); guarda.gravar(CH, []); conta(); });
    conta();
  }

  /* CARTÃO DA TURMA */
  var campos = [["#cc-antes", "#pv-antes"], ["#cc-depois", "#pv-depois"], ["#cc-turma", "#pv-turma"]];
  campos.forEach(function (par) {
    var ent = $(par[0]), sai = $(par[1]);
    if (!ent) return;
    var at = function () { sai.textContent = ent.value.trim() || "..."; };
    ent.addEventListener("input", at); at();
  });
  var form = $("#form-cartao");
  if (form) form.addEventListener("submit", function (e) { e.preventDefault(); });
})();
