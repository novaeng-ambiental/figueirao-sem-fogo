(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }
  window.FSF = { el: el, $: $, $$: $$ };

  /* Menu no celular */
  var menuBotao = $(".menu-botao"), menu = $("#menu");
  if (menuBotao) {
    menuBotao.addEventListener("click", function () {
      var aberto = menu.classList.toggle("aberto");
      menuBotao.setAttribute("aria-expanded", aberto ? "true" : "false");
    });
    $$("#menu a").forEach(function (a) {
      a.addEventListener("click", function () { menu.classList.remove("aberto"); menuBotao.setAttribute("aria-expanded", "false"); });
    });
  }

  /* Abas genéricas com setas do teclado */
  function abas(botoes, aoEscolher) {
    botoes.forEach(function (b, i) {
      b.addEventListener("click", function () { escolher(i, false); });
      b.addEventListener("keydown", function (ev) {
        var n = botoes.length, j = null;
        if (ev.key === "ArrowRight" || ev.key === "ArrowDown") j = (i + 1) % n;
        if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") j = (i - 1 + n) % n;
        if (ev.key === "Home") j = 0;
        if (ev.key === "End") j = n - 1;
        if (j !== null) { ev.preventDefault(); escolher(j, true); }
      });
    });
    function escolher(i, foco) {
      botoes.forEach(function (b, k) {
        b.setAttribute("aria-selected", k === i ? "true" : "false");
        b.tabIndex = k === i ? 0 : -1;
      });
      if (foco) botoes[i].focus();
      aoEscolher(i);
    }
    return escolher;
  }

  /* Alternador antes/depois do hero */
  var alt = $("#alternador");
  if (alt) {
    var textos = [
      "A Serra do Figueirão tem fauna, nascentes e histórias para contar.",
      "Só resta o que não deu tempo de salvar."
    ];
    abas($$(".abas button", alt), function (i) {
      $("#alt-texto").textContent = textos[i];
      alt.setAttribute("data-lado", i ? "depois" : "antes");
    });
  }

  /* Território: quadro de proporção */
  var prop = $(".proporcao");
  if (prop) {
    for (var q = 0; q < 100; q++) prop.appendChild(el("i", q === 0 ? { "class": "mona" } : null));
  }

  /* Divisor de águas */
  var gotaAnda = $("#gota-anda"), msg = $("#divisor-msg");
  function descer(lado) {
    var rio = $(lado === "esq" ? "#rio-esq" : "#rio-dir");
    var nome = lado === "esq" ? "Bacia do Paraguai" : "Bacia do Paraná";
    $$(".divisor path[id^='rio']").forEach(function (p) { p.setAttribute("opacity", ".35"); });
    rio.setAttribute("opacity", "1");
    var total = rio.getTotalLength(), inicio = null;
    var reduzir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function passo(t) {
      if (!inicio) inicio = t;
      var f = reduzir ? 1 : Math.min(1, (t - inicio) / 1400);
      var pt = rio.getPointAtLength(total * f);
      gotaAnda.setAttribute("cx", pt.x); gotaAnda.setAttribute("cy", pt.y);
      if (f < 1) requestAnimationFrame(passo);
      else msg.textContent = "Esta gota correu para a " + nome + ". As duas bacias se juntam na Bacia do Rio da Prata.";
    }
    requestAnimationFrame(passo);
  }
  ["esq", "dir"].forEach(function (lado) {
    var g = $("#gota-" + lado);
    if (!g) return;
    g.addEventListener("click", function () { descer(lado); });
    g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); descer(lado); } });
  });

  /* Cartões antes/depois */
  var cartoes = [
    { tema: "Fauna", antes: "Tatu, tamanduá e seriema encontram abrigo na Serra do Figueirão.", depois: "Não sobra para onde fugir.", mais: "Quando o fogo atinge essas áreas, a fauna perde seus refúgios e fontes de alimento." },
    { tema: "Comunidade", antes: "A Comunidade Quilombola Santa Tereza tem escola, roça e pessoas que nasceram ali.", depois: "Incêndio perto da comunidade ameaça tudo.", mais: "Um incêndio próximo pode colocar em risco pessoas, plantações e moradias." },
    { tema: "Relevo e solo", antes: "A Pedra Bonita levou milhões de anos para se formar.", depois: "A chuva carrega o solo que o fogo deixou exposto.", mais: "Sem a vegetação, a chuva leva a camada de cima do solo, favorece a erosão e atrapalha a recuperação das plantas." },
    { tema: "Vegetação", antes: "A vegetação do Cerrado leva décadas para se desenvolver e se recuperar.", depois: "O fogo destrói em minutos.", mais: "Quando o fogo destrói essa cobertura, a regeneração da vegetação fica comprometida." },
    { tema: "Uma bituca", antes: "Uma bituca de cigarro no chão parece pequena, sem perigo.", depois: "Em minutos, vira um foco de incêndio.", mais: "Pequenas atitudes podem evitar grandes incêndios." }
  ];
  var grade = $("#cartoes-virar");
  if (grade) {
    cartoes.forEach(function (c, i) {
      var b = el("button", { type: "button", "class": "virar", "aria-pressed": "false", "aria-label": c.tema + ": antes do fogo. " + c.antes + " Toque para ver depois do fogo." });
      b.innerHTML =
        '<span class="lados">' +
          '<span class="lado frente"><span class="etiqueta">Antes do fogo</span><span class="tema">' + c.tema + '</span><p>' + c.antes + '</p><span class="dica">Toque para virar</span></span>' +
          '<span class="lado tras"><span class="etiqueta depois">Depois do fogo</span><span class="tema">' + c.tema + '</span><p><strong>' + c.depois + '</strong></p><p>' + c.mais + '</p><span class="dica">Toque para voltar</span></span>' +
        '</span>';
      b.addEventListener("click", function () {
        var v = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", v ? "true" : "false");
        b.setAttribute("aria-label", c.tema + (v ? ": depois do fogo. " + c.depois + " " + c.mais + " Toque para voltar." : ": antes do fogo. " + c.antes + " Toque para ver depois do fogo."));
      });
      grade.appendChild(b);
    });
  }

  /* Causas */
  var causas = [
    { texto: "<p>Uma bituca de cigarro jogada em área de vegetação ou na beira da estrada pode começar um incêndio. Ela parece pequena e sem perigo, mas em minutos vira um foco de incêndio.</p><p style='margin-top:8px'><strong>O que fazer:</strong> não jogue bitucas em áreas com vegetação nem às margens das estradas.</p>",
      lei: "Provocar incêndio em floresta ou em demais formas de vegetação é crime: reclusão de 2 a 4 anos e multa. Mesmo sem intenção, a pena é de detenção de 6 meses a 1 ano e multa (Lei nº 9.605/1998, art. 41)." },
    { texto: "<p>Queimar lixo doméstico, folhas secas ou restos de vegetação, no quintal ou na propriedade rural, está entre as causas recorrentes de incêndio na estiagem.</p><p style='margin-top:8px'><strong>O que fazer:</strong> não queime lixo, folhas secas ou restos de vegetação.</p>",
      lei: "É proibida a queima de resíduos sólidos a céu aberto ou em recipientes, instalações e equipamentos não licenciados para essa finalidade (Lei nº 12.305/2010, art. 47, III)." },
    { texto: "<p>Queimadas de manejo mal controladas podem escapar do controle e virar incêndio, especialmente em períodos de estiagem e baixa umidade.</p><p style='margin-top:8px'><strong>O que fazer:</strong> use o fogo apenas quando autorizado e com os cuidados necessários.</p>",
      lei: "Queima controlada é o uso planejado, monitorado e controlado do fogo, em áreas determinadas e sob condições específicas (Lei nº 14.944/2024, art. 2º, II). Fogo sem controle e sem planejamento é incêndio." }
  ];
  var painel = $("#causa-painel");
  if (painel) {
    var mostraCausa = function (i) { painel.innerHTML = causas[i].texto + '<p class="lei">' + causas[i].lei + "</p>"; };
    abas($$(".causas button"), mostraCausa);
    mostraCausa(0);
  }

  /* Termos da Lei 14.944/2024 */
  var termos = [
    { nome: "Incêndio florestal", inciso: "art. 2º, I", def: "“Qualquer fogo não controlado e não planejado que incida sobre florestas e demais formas de vegetação.” Exige resposta, seja qual for a origem do fogo." },
    { nome: "Queima controlada", inciso: "art. 2º, II", def: "Uso planejado, monitorado e controlado do fogo para atividades agrícolas, florestais ou de pecuária, em áreas determinadas e sob condições específicas." },
    { nome: "Queima prescrita", inciso: "art. 2º, III", def: "Uso planejado, monitorado e controlado do fogo para conservação, pesquisa ou manejo, com objetivos definidos em um plano de manejo integrado do fogo." },
    { nome: "Uso tradicional e adaptativo do fogo", inciso: "art. 2º, IV", def: "Prática ancestral adaptada às condições do território, do ambiente e do clima de hoje, usada por povos indígenas, comunidades quilombolas e outras comunidades tradicionais." },
    { nome: "Manejo integrado do fogo", inciso: "art. 2º, XI", def: "Modelo de planejamento e gestão que junta aspectos ecológicos, culturais, socioeconômicos e técnicos para orientar as queimas e as ações de prevenção e combate a incêndios." }
  ];
  var lista = $("#termos-lista"), def = $("#termo-def");
  if (lista) {
    termos.forEach(function (t, i) {
      lista.appendChild(el("button", { type: "button", role: "tab", "aria-selected": i ? "false" : "true", tabindex: i ? "-1" : "0", "aria-controls": "termo-def" }, t.nome));
    });
    var mostraTermo = function (i) { def.innerHTML = "<h3>" + termos[i].nome + "</h3><p>" + termos[i].def + '</p><p class="fonte">Lei nº 14.944/2024, ' + termos[i].inciso + ".</p>"; };
    abas($$("button", lista), mostraTermo);
    mostraTermo(0);
  }

  /* Gráfico Cerrado/MS */
  var dados = {
    area: { rotulo: "hectares", v: [["2025", 24783], ["2026", 14615]], nota: "Área queimada no Cerrado de Mato Grosso do Sul. Em 2026, foram 10.168 ha a menos que em 2025." },
    focos: { rotulo: "focos", v: [["2025", 578], ["2026", 321]], nota: "Focos de calor no Cerrado de Mato Grosso do Sul. Em 2026, foram 257 focos a menos que em 2025." }
  };
  var fmt = function (n) { return n.toLocaleString("pt-BR"); };
  function desenha(chave) {
    var d = dados[chave], max = Math.max(d.v[0][1], d.v[1][1]), caixa = $("#barras");
    caixa.innerHTML = "";
    d.v.forEach(function (par) {
      var linha = el("div", { "class": "barra ano" + par[0] });
      linha.innerHTML = "<b>" + par[0] + '</b><div class="trilho"><div class="valor" style="width:' + (par[1] / max * 100).toFixed(1) + '%"></div><span class="num">' + fmt(par[1]) + " " + d.rotulo + "</span></div>";
      caixa.appendChild(linha);
    });
    $("#barras-nota").textContent = d.nota + " Período: 1º de janeiro a 15 de julho de cada ano.";
  }
  if ($("#barras")) {
    $$(".alterna button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".alterna button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        desenha(b.getAttribute("data-dado"));
      });
    });
    desenha("area");
  }

  /* Copiar números */
  var aviso = $("#aviso-copia");
  $$("[data-copiar]").forEach(function (b) {
    var original = b.textContent;
    b.addEventListener("click", function () {
      var n = b.getAttribute("data-copiar");
      var ok = function () { b.textContent = "Copiado"; aviso.textContent = "Número " + n + " copiado."; setTimeout(function () { b.textContent = original; }, 2000); };
      var falhou = function () {
        var alvo = b.parentNode.querySelector(".numero");
        try { var r = document.createRange(); r.selectNodeContents(alvo); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {}
        b.textContent = "Selecionado"; aviso.textContent = "Não foi possível copiar. O número " + n + " está selecionado na tela.";
        setTimeout(function () { b.textContent = original; }, 2500);
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(n).then(ok, falhou);
        else falhou();
      } catch (e) { falhou(); }
    });
  });

  /* Memória */
  var M = window.MEMORIA || {};
  var lt = $("#linha-tempo");
  if (lt && M.linhaTempo) M.linhaTempo.forEach(function (it) {
    lt.appendChild(el("li", null, "<time>" + it.data + "</time><p>" + it.texto + '</p><p class="prova">Prova: ' + it.prova + "</p>"));
  });
  var nums = $("#numeros");
  if (nums && M.numeros) M.numeros.forEach(function (n) { nums.appendChild(el("div", { "class": "numero-grande" }, "<b>" + n.valor + "</b>" + n.texto)); });
  var ins = $("#insercoes"), insDias = $("#insercoes-dias");
  if (ins && M.insercoes) M.insercoes.forEach(function (d) {
    ins.appendChild(el("div", { "class": d[1] === 3 ? "tres" : "", style: "height:" + (d[1] / 3 * 100) + "%", title: d[0] + "/10: " + d[1] + " inserções" }));
    insDias.appendChild(el("span", null, d[0]));
  });

  /* Galerias com ampliação */
  var lb = null, lbLista = [], lbIndice = 0, lbVoltar = null;
  function abrir(listaImgs, i, origem) {
    lbLista = listaImgs; lbIndice = i; lbVoltar = origem;
    if (!lb) {
      lb = el("div", { "class": "lightbox", role: "dialog", "aria-modal": "true", "aria-label": "Imagem ampliada" });
      lb.innerHTML = '<button type="button" class="botao pequeno fechar">Fechar</button><figure><img alt=""><figcaption></figcaption><div class="nav"><button type="button" class="botao pequeno ant">Anterior</button><button type="button" class="botao pequeno prox">Próxima</button></div></figure>';
      document.body.appendChild(lb);
      $(".fechar", lb).addEventListener("click", fechar);
      $(".ant", lb).addEventListener("click", function () { mostra(lbIndice - 1); });
      $(".prox", lb).addEventListener("click", function () { mostra(lbIndice + 1); });
      lb.addEventListener("click", function (ev) { if (ev.target === lb) fechar(); });
      document.addEventListener("keydown", function (ev) {
        if (!lb || lb.hidden) return;
        if (ev.key === "Escape") fechar();
        if (ev.key === "ArrowRight") mostra(lbIndice + 1);
        if (ev.key === "ArrowLeft") mostra(lbIndice - 1);
        if (ev.key === "Tab") {
          var focaveis = $$("button", lb), primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
          if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus(); }
          else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus(); }
        }
      });
    }
    lb.hidden = false; mostra(i); $(".fechar", lb).focus();
  }
  function mostra(i) {
    var n = lbLista.length; lbIndice = (i + n) % n;
    var it = lbLista[lbIndice];
    $("img", lb).src = it.src; $("img", lb).alt = it.alt;
    $("figcaption", lb).textContent = it.legenda + " (" + (lbIndice + 1) + " de " + n + ")";
  }
  function fechar() { lb.hidden = true; if (lbVoltar) lbVoltar.focus(); }
  function galeria(id, itens) {
    var g = $(id); if (!g || !itens) return;
    itens.forEach(function (it, i) {
      var b = el("button", { type: "button", "aria-label": "Ampliar: " + it.legenda });
      b.innerHTML = '<img src="' + it.src + '" alt="' + it.alt.replace(/"/g, "&quot;") + '" loading="lazy"><span>' + it.legenda + "</span>";
      b.addEventListener("click", function () { abrir(itens, i, b); });
      g.appendChild(b);
    });
  }
  galeria("#galeria-fotos", M.fotos);
  galeria("#galeria-artes", M.artes);
  galeria("#galeria-prints", M.prints);

  var rel = $("#relatos");
  if (rel) {
    if (M.relatos && M.relatos.length) M.relatos.forEach(function (r) {
      rel.appendChild(el("blockquote", { "class": "relato" }, "<p>“" + r.texto + "”</p><p class='fonte'>" + r.nome + (r.lugar ? ", " + r.lugar : "") + (r.data ? ", " + r.data : "") + "</p>"));
    });
    else rel.appendChild(el("div", { "class": "relatos-vazio" }, "<p><strong>Ainda não há relatos publicados.</strong></p><p style='margin-top:6px'>Este espaço vai reunir relatos de moradores, estudantes, professores e produtores sobre a campanha e sobre a prevenção ao fogo em Figueirão. Os relatos entram com a autorização de quem relatou.</p>"));
  }

  /* Outros projetos */
  var lp = $("#lista-projetos");
  if (lp && window.PROJETOS) window.PROJETOS.forEach(function (g) {
    var bloco = el("div", { "class": "grupo-projetos" }, "<h3>" + g.grupo + "</h3>");
    var gr = el("div", { "class": "grade g3" });
    g.itens.forEach(function (p) {
      var c = el("article", { "class": "projeto" });
      c.innerHTML = '<span class="status' + (p.url ? " no-ar" : "") + '">' + (p.url ? "No ar" : "Site em preparação") + "</span><strong>" + p.nome + "</strong><p>" + p.resumo + "</p>" +
        (p.url ? '<a class="botao pequeno" href="' + p.url + '" target="_blank" rel="noopener" style="justify-self:start">Visitar o site</a>' : "");
      gr.appendChild(c);
    });
    bloco.appendChild(gr); lp.appendChild(bloco);
  });

  /* Menu marca a seção visível */
  if ("IntersectionObserver" in window) {
    var links = $$("#menu a");
    var obs = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) links.forEach(function (a) { a.setAttribute("aria-current", a.getAttribute("href") === "#" + en.target.id ? "true" : "false"); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (a) { var s = $(a.getAttribute("href")); if (s) obs.observe(s); });
  }
})();
