/* Jogo "Antes ou depois?"
   Cada personagem passa por 4 situações. Entre elas surgem 2 eventos sorteados.
   O final depende de: risco acumulado, foco causado pelo jogador, rapidez do aviso e exposição ao perigo. */
(function () {
  "use strict";
  var F = window.FSF, $ = F.$, el = F.el;
  var tela = $("#jogo-tela");
  if (!tela) return;
  tela.removeAttribute("aria-live");
  var anuncio = el("p", { "class": "sr", "aria-live": "polite" });
  tela.parentNode.appendChild(anuncio);

  var guarda = {
    ler: function (k, p) { try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : p; } catch (e) { return p; } },
    gravar: function (k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  var FONTE = {
    lixo: "Lei nº 12.305/2010, art. 47, III; projeto da campanha.",
    crime: "Lei nº 9.605/1998, art. 41.",
    lei14944: "Lei nº 14.944/2024, art. 2º.",
    bituca: "Carrossel e roteiro de publicação da campanha.",
    prefeitura: "Notícia da Prefeitura de Figueirão sobre a campanha.",
    saude: "Ministério da Saúde, orientações sobre fumaça (2026).",
    pecas: "Folder e cartaz da campanha."
  };

  /* Escolha: t = texto; c = classe (bom, medio, ruim); r = risco; foco, aviso ("rapido", "tarde", "nao"), perigo, saude ("ruim");
     res = explicação; f = fonte */
  var PERSONAGENS = {
    estudante: {
      nome: "Estudante", icone: "#ic-estudante", desc: "Estuda na rede pública e mora na cidade.",
      eventos: ["vento", "seca", "radio"],
      cenas: [
        { titulo: "Lixo no terreno", texto: "Na volta da escola, você vê o vizinho juntando sacolas de lixo e folhas secas no fundo do terreno. Ele diz que vai pôr fogo para limpar.",
          escolhas: [
            { t: "Explico que queimar lixo é proibido e pode virar incêndio, e chamo um adulto de casa para conversar com ele.", c: "bom", r: 0, res: "O vizinho desistiu. Queimar resíduos a céu aberto é proibido por lei, e a queima de lixo é uma das causas de incêndio na estiagem.", f: FONTE.lixo },
            { t: "Ajudo a juntar o lixo. Vai ficar mais limpo.", c: "ruim", r: 2, foco: true, res: "O fogo do lixo pulou para o capim seco do terreno ao lado. Você ajudou a começar um foco.", f: FONTE.lixo },
            { t: "Finjo que não vi.", c: "medio", r: 1, res: "O lixo foi queimado do mesmo jeito. Ninguém se feriu desta vez, mas o risco ficou no ar.", f: FONTE.lixo }
          ] },
        { titulo: "Dia de fumaça", texto: "A fumaça de uma queimada distante cobre a cidade. Seus amigos chamam para jogar bola na rua às duas da tarde.",
          escolhas: [
            { t: "Fico em casa, com as janelas fechadas, e bebo mais água.", c: "bom", r: 0, res: "Isso mesmo. Com fumaça, a orientação é ficar em ambiente fechado e se hidratar.", f: FONTE.saude },
            { t: "Vou jogar bola. É só fumaça.", c: "medio", r: 0, saude: "ruim", res: "O Ministério da Saúde orienta evitar exercício ao ar livre com fumaça, sobretudo entre 12h e 16h.", f: FONTE.saude },
            { t: "Abro todas as janelas para ventilar a casa.", c: "medio", r: 0, saude: "ruim", res: "Com fumaça, é o contrário: portas e janelas fechadas.", f: FONTE.saude }
          ] },
        { titulo: "Passeio perto da Serra", texto: "No fim de semana, você passeia com a família de um colega numa estrada de terra perto da Serra. Um adulto do grupo termina o cigarro e vai jogar a bituca no capim.",
          escolhas: [
            { t: "Peço com educação para ele não jogar a bituca no capim e lembro a frase da campanha.", c: "bom", r: 0, res: "Ele guardou a bituca. Uma bituca no chão parece pequena, sem perigo. Em minutos, vira um foco de incêndio.", f: FONTE.bituca },
            { t: "Não digo nada. Adulto sabe o que faz.", c: "ruim", r: 2, foco: true, res: "A bituca caiu no capim seco. Em minutos, virou um foco de incêndio.", f: FONTE.bituca }
          ] },
        { titulo: "Fumaça perto da escola", fogo: true,
          texto: "No recreio, você vê fumaça subindo de um terreno com mato seco perto da escola. Dá para ver as chamas.",
          textoFoco: "No recreio, você vê fumaça subindo de um terreno com mato seco perto da escola. É o mesmo tipo de foco que você viu começar nesta semana.",
          escolhas: [
            { t: "Me afasto e aviso na hora um professor, que liga para o 193.", c: "bom", aviso: "rapido", res: "Aviso rápido e ninguém em risco. É isso que a campanha pede: afastar-se e avisar imediatamente.", f: FONTE.prefeitura },
            { t: "Pego um galho para tentar apagar o fogo.", c: "ruim", perigo: true, aviso: "tarde", res: "Você chegou perto demais do fogo. Ninguém deve se colocar em risco. Afaste-se e avise.", f: FONTE.prefeitura },
            { t: "Filmo para postar e depois conto para alguém.", c: "medio", aviso: "tarde", r: 1, res: "O vídeo atrasou o aviso. Ao ver fumaça ou fogo, o aviso tem que ser imediato.", f: FONTE.prefeitura },
            { t: "Não é comigo. Volto para a sala.", c: "ruim", aviso: "nao", r: 2, res: "Ninguém avisou. O fogo cresceu no mato seco.", f: FONTE.prefeitura }
          ] }
      ]
    },
    produtora: {
      nome: "Produtora rural", icone: "#ic-produtora", desc: "Cria gado numa propriedade da zona rural.",
      eventos: ["vento", "seca", "radio", "vizinho"],
      cenas: [
        { titulo: "Pasto seco", texto: "O pasto está seco, cheio de capim velho. Um conhecido sugere pôr fogo hoje à tarde para limpar, sem pedir autorização a ninguém.",
          escolhas: [
            { t: "Não uso fogo sem autorização. Vou buscar orientação sobre outras formas de manejo.", c: "bom", r: 0, res: "A campanha orienta usar o fogo apenas quando autorizado e com os cuidados necessários. O projeto fala em práticas alternativas de manejo.", f: FONTE.pecas },
            { t: "Ponho fogo hoje mesmo, à tarde.", c: "ruim", r: 3, foco: true, res: "Fogo sem planejamento e sem controle é incêndio. Queimada mal controlada é uma das causas recorrentes de incêndio na estiagem, e provocar incêndio na vegetação é crime.", f: FONTE.lei14944 + " " + FONTE.crime },
            { t: "Ponho fogo só num cantinho, rapidinho.", c: "ruim", r: 2, foco: true, res: "Mesmo pequeno, o fogo sem autorização e sem controle escapou pelo capim seco.", f: FONTE.lei14944 }
          ] },
        { titulo: "O lixo da casa", texto: "O lixo da casa acumulou. Na zona rural, muita gente queima no quintal.",
          escolhas: [
            { t: "Não queimo. Guardo o lixo para dar a ele um destino correto.", c: "bom", r: 0, res: "Queimar resíduos a céu aberto é proibido. Guardar e dar o destino correto evita fumaça e foco de incêndio.", f: FONTE.lixo },
            { t: "Queimo num tambor no fundo do quintal.", c: "ruim", r: 2, foco: true, res: "A lei também proíbe queimar em recipientes não licenciados para isso. Uma fagulha do tambor caiu no capim.", f: FONTE.lixo },
            { t: "Queimo no meio do terreiro, longe do pasto.", c: "ruim", r: 1, foco: true, res: "A queima de lixo a céu aberto é proibida em qualquer lugar, e a fumaça fica no ar.", f: FONTE.lixo }
          ] },
        { titulo: "Fogo na cerca", fogo: true,
          texto: "Fim de tarde. Uma queima na propriedade vizinha escapou. O fogo vem pelo capim em direção à sua cerca.",
          textoFoco: "Fim de tarde. O fogo que começou na sua propriedade cresceu e vem pelo capim em direção à cerca e à casa.",
          escolhas: [
            { t: "Afasto a família e os trabalhadores e ligo na hora para o 193.", c: "bom", aviso: "rapido", res: "Aviso imediato e todos em segurança. É o que a campanha orienta.", f: FONTE.prefeitura },
            { t: "Pego um balde e vou sozinha conter o fogo.", c: "ruim", perigo: true, aviso: "tarde", res: "Sozinha diante do fogo, você correu perigo. A orientação é avisar sem se colocar em risco.", f: FONTE.prefeitura },
            { t: "Espero para ver se o fogo para na estrada.", c: "medio", aviso: "tarde", r: 2, res: "Esperar custou tempo. O fogo passou da estrada antes do aviso.", f: FONTE.prefeitura }
          ] },
        { titulo: "Na lida", texto: "Um trabalhador fuma durante a lida no pasto e vai jogar a bituca no capim.",
          escolhas: [
            { t: "Combino com a equipe: bituca nunca vai para o capim nem para a beira da estrada.", c: "bom", r: 0, res: "Combinado feito. Pequenas atitudes evitam grandes incêndios.", f: FONTE.prefeitura },
            { t: "Deixo. No pasto não tem perigo.", c: "ruim", r: 2, foco: true, res: "Capim seco é justamente onde a bituca vira foco de incêndio.", f: FONTE.bituca }
          ] }
      ]
    },
    motorista: {
      nome: "Motorista", icone: "#ic-motorista", desc: "Roda pelas estradas do município.",
      eventos: ["vento", "seca", "radio", "vizinho"],
      cenas: [
        { titulo: "Cigarro na estrada", texto: "Você dirige numa estrada com capim seco nas margens e termina o cigarro com a janela aberta.",
          escolhas: [
            { t: "Apago a bituca e guardo no carro.", c: "bom", r: 0, res: "Pensou em jogar bituca de cigarro na beira da estrada? Não faça. Você não fez.", f: FONTE.bituca },
            { t: "Jogo pela janela. É só uma bituca.", c: "ruim", r: 2, foco: true, res: "A bituca caiu no capim seco da margem. Em minutos, vira um foco de incêndio.", f: FONTE.bituca }
          ] },
        { titulo: "Fumaça na margem", fogo: true,
          texto: "Mais à frente, há fumaça e chamas no capim da margem da estrada.",
          textoFoco: "Pelo retrovisor, você vê fumaça subindo no capim, bem onde a bituca caiu.",
          escolhas: [
            { t: "Paro em lugar seguro, longe da fumaça, e ligo para o 193.", c: "bom", aviso: "rapido", res: "Aviso imediato e sem se colocar em risco. É o que a campanha pede.", f: FONTE.prefeitura },
            { t: "Passo devagar por dentro da fumaça para ver melhor.", c: "ruim", perigo: true, aviso: "tarde", res: "Entrar na fumaça põe você e quem vem na estrada em perigo.", f: FONTE.prefeitura },
            { t: "Sigo viagem. Alguém já deve ter avisado.", c: "ruim", aviso: "nao", r: 2, res: "Ninguém avisou. Cada um achou que outro ia ligar.", f: FONTE.prefeitura }
          ] },
        { titulo: "Estrada com fumaça", texto: "Na volta, a fumaça de outra queimada cobre um trecho da estrada.",
          escolhas: [
            { t: "Fecho as janelas e ligo o ar em recirculação.", c: "bom", r: 0, res: "Isso mesmo. É a orientação do Ministério da Saúde para quem dirige com fumaça.", f: FONTE.saude },
            { t: "Abro as janelas para o vidro não embaçar.", c: "medio", r: 0, saude: "ruim", res: "Com as janelas abertas, a fumaça entra no carro. A orientação é janelas fechadas e ar em recirculação.", f: FONTE.saude }
          ] },
        { titulo: "Lixo queimando", texto: "Já perto da cidade, você vê alguém queimando lixo num terreno baldio.",
          escolhas: [
            { t: "Anoto o local e faço a denúncia pelo 181, Disque Denúncia Estadual.", c: "bom", r: 0, res: "O 181 é um dos canais de denúncia da campanha. Queimar lixo a céu aberto é proibido.", f: FONTE.pecas + " " + FONTE.lixo },
            { t: "Não é da minha conta.", c: "medio", r: 1, res: "A queima continuou. Queima de lixo é uma das causas de incêndio na estiagem.", f: FONTE.lixo }
          ] }
      ]
    }
  };

  var EVENTOS = {
    vento: { titulo: "Vento forte", texto: "Hoje venta muito. Com vento, faísca e fogo vão mais longe. A partir de agora, escolhas arriscadas pesam mais.", mult: 1 },
    seca: { titulo: "Tarde de estiagem", texto: "Sol forte, tempo seco e baixa umidade. O capim está pronto para pegar fogo. A partir de agora, escolhas arriscadas pesam mais.", mult: 1 },
    radio: { titulo: "No rádio", texto: "Toca o spot da campanha: “Viu fogo? Ligue 193, Corpo de Bombeiros.” Você lembra do número. O risco diminui um pouco.", risco: -1 },
    vizinho: { titulo: "Folhas secas", texto: "Numa parada, você vê alguém juntando folhas secas para queimar perto de casa.",
      escolhas: [
        { t: "Aviso que queimar é proibido e explico o risco.", c: "bom", r: -1, res: "A pessoa desistiu. Não queime lixo, folhas secas ou restos de vegetação.", f: FONTE.prefeitura },
        { t: "Deixo para lá.", c: "medio", r: 1, res: "As folhas foram queimadas. Mais um risco perto do capim seco.", f: FONTE.prefeitura }
      ] }
  };

  var FINAIS = {
    bom: { titulo: "A Serra segue de pé", texto: "Suas escolhas mantiveram o cartão “Antes do fogo”. Nenhum foco começou por sua causa, o aviso foi rápido e ninguém se colocou em risco. Cuidar do que é nosso começa antes do fogo." },
    medio: { titulo: "Foco contido a tempo", texto: "O fogo apareceu, mas o aviso ajudou a evitar o pior. Algumas escolhas aumentaram o risco. Veja quais cartões viraram e tente de novo." },
    ruim: { titulo: "Depois do fogo", texto: "O fogo se espalhou. A fauna ficou sem ter para onde fugir e o solo ficou exposto à chuva. Quase tudo começou com atitudes que pareciam pequenas." },
    perigo: { titulo: "Você se colocou em risco", texto: "Tentar apagar sozinho ou entrar na fumaça põe a vida em perigo. A orientação é se afastar e avisar o 193 na hora." }
  };
  var ORDEM_FINAIS = ["bom", "medio", "ruim", "perigo"];

  var estado;
  function novoEstado(id) {
    var p = PERSONAGENS[id];
    var pool = p.eventos.slice(), ev = [];
    if (Array.isArray(window.__jogoEventos)) ev = window.__jogoEventos.slice(0, 2);
    else while (ev.length < 2 && pool.length) ev.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return { id: id, p: p, cena: 0, eventos: ev, eventoFeito: [false, false], risco: 0, mult: 0, foco: false, aviso: null, perigo: false, saude: "ok", trilha: [], resumo: [] };
  }

  function trilha() {
    var t = el("div", { "class": "trilha", "aria-label": "Seus cartões" });
    for (var i = 0; i < 4; i++) {
      var r = estado.trilha[i], cls = r === "bom" ? "ok" : r === "medio" ? "medio" : r ? "ruim" : (i === estado.cena ? "atual" : "");
      var txt = r === "bom" ? "Antes" : r === "medio" ? "Cuidado" : r ? "Depois" : (i + 1) + "ª situação";
      t.appendChild(el("span", { "class": cls, title: estado.p.cenas[i].titulo }, txt));
    }
    return t;
  }

  function focar(sel) { var h = $(sel, tela); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: false }); } }

  function inicio() {
    estado = null;
    tela.innerHTML = "";
    tela.appendChild(el("h3", { id: "jogo-h" }, "Quem você vai ser?"));
    var g = el("div", { "class": "personagens", style: "margin-top:12px" });
    Object.keys(PERSONAGENS).forEach(function (id) {
      var p = PERSONAGENS[id];
      var b = el("button", { type: "button", "class": "personagem", "data-personagem": id });
      b.innerHTML = '<svg aria-hidden="true"><use href="' + p.icone + '"/></svg><strong>' + p.nome + '</strong><span class="desc">' + p.desc + "</span>";
      b.addEventListener("click", function () { comecar(id); });
      g.appendChild(b);
    });
    tela.appendChild(g);
    tela.appendChild(finaisVistos());
  }

  function comecar(id) {
    estado = novoEstado(id);
    ajuda(false);
    anuncio.textContent = "Você é " + estado.p.nome + ". Começa o dia.";
    passo();
  }

  /* Evento antes das situações 2 e 3 */
  function passo() {
    var idxEv = estado.cena - 1;
    if ((estado.cena === 1 || estado.cena === 2) && !estado.eventoFeito[idxEv]) {
      estado.eventoFeito[idxEv] = true;
      return evento(EVENTOS[estado.eventos[idxEv]]);
    }
    if (estado.cena >= 4) return final();
    cena();
  }

  function evento(ev) {
    tela.innerHTML = "";
    tela.appendChild(trilha());
    var box = el("div", { "class": "cena" });
    box.appendChild(el("div", { "class": "evento" }, '<span class="asterisco" aria-hidden="true" style="width:34px;height:34px"><svg style="width:22px;height:22px"><use href="#ast"/></svg></span><div><strong id="jogo-h">Evento: ' + ev.titulo + "</strong><br>" + ev.texto + "</div>"));
    if (ev.escolhas) {
      var esc = el("div", { "class": "escolhas", role: "group", "aria-label": "Sua escolha" });
      ev.escolhas.forEach(function (op) {
        var b = el("button", { type: "button" }, op.t);
        b.addEventListener("click", function () {
          estado.risco = Math.max(0, estado.risco + op.r);
          estado.resumo.push({ cena: "Evento: " + ev.titulo, escolha: op.t, c: op.c });
          mostrarResultado(box, op, function () { passo(); });
          esc.remove();
        });
        esc.appendChild(b);
      });
      box.appendChild(esc);
    } else {
      if (ev.mult) estado.mult += ev.mult;
      if (ev.risco) estado.risco = Math.max(0, estado.risco + ev.risco);
      var seg = el("button", { type: "button", "class": "botao", style: "justify-self:start" }, "Continuar");
      seg.addEventListener("click", function () { passo(); });
      box.appendChild(seg);
    }
    tela.appendChild(box);
    focar("#jogo-h");
  }

  function cena() {
    var c = estado.p.cenas[estado.cena];
    tela.innerHTML = "";
    tela.appendChild(trilha());
    var box = el("div", { "class": "cena" });
    box.appendChild(el("h3", { id: "jogo-h" }, (estado.cena + 1) + ". " + c.titulo));
    var sit = el("div", { "class": "situacao" });
    sit.innerHTML = '<span class="etiqueta">Antes do fogo</span><p>' + (c.fogo && estado.foco && c.textoFoco ? c.textoFoco : c.texto) + "</p>";
    box.appendChild(sit);
    var esc = el("div", { "class": "escolhas", role: "group", "aria-label": "O que você faz?" });
    c.escolhas.forEach(function (op) {
      var b = el("button", { type: "button" }, op.t);
      b.addEventListener("click", function () { escolher(c, op, box, sit, esc); });
      esc.appendChild(b);
    });
    box.appendChild(esc);
    tela.appendChild(box);
    focar("#jogo-h");
  }

  function escolher(c, op, box, sit, esc) {
    var r = op.r || 0;
    if (op.c === "ruim" && r > 0) r += estado.mult;
    estado.risco = Math.max(0, estado.risco + r);
    if (op.foco) estado.foco = true;
    if (op.aviso) estado.aviso = op.aviso;
    if (op.perigo) estado.perigo = true;
    if (op.saude) estado.saude = op.saude;
    estado.trilha[estado.cena] = op.c;
    estado.resumo.push({ cena: c.titulo, escolha: op.t, c: op.c });
    if (op.c !== "bom") {
      sit.classList.add("depois");
      sit.querySelector(".etiqueta").className = "etiqueta depois";
      sit.querySelector(".etiqueta").textContent = op.c === "ruim" ? "Depois do fogo" : "Risco no ar";
    }
    esc.remove();
    estado.cena++;
    box.parentNode.replaceChild(trilha(), box.parentNode.firstChild);
    mostrarResultado(box, op, function () { passo(); });
  }

  function mostrarResultado(box, op, depois) {
    var titulo = op.c === "bom" ? "Antes do fogo mantido" : op.c === "medio" ? "Cuidado" : "O cartão virou";
    var res = el("div", { "class": "resultado " + op.c });
    res.innerHTML = '<strong id="jogo-res">' + titulo + "</strong><p>" + op.res + '</p><p class="por-que">Fonte: ' + op.f + "</p>";
    var seg = el("button", { type: "button", "class": "botao " + (op.c === "bom" ? "secundario" : ""), style: "justify-self:start;background:var(--superficie);color:var(--mata);box-shadow:none" }, estado.cena >= 4 ? "Ver o final" : "Continuar");
    seg.addEventListener("click", depois);
    res.appendChild(seg);
    box.appendChild(res);
    anuncio.textContent = titulo + ". " + op.res;
    seg.focus();
  }

  function calcularFinal() {
    if (estado.perigo) return "perigo";
    if (estado.aviso === "nao") return "ruim";
    if (estado.aviso === "tarde" && estado.risco >= 4) return "ruim";
    if (estado.risco >= 6) return "ruim";
    var medios = estado.trilha.filter(function (x) { return x === "medio"; }).length;
    if (!estado.foco && estado.risco <= 1 && estado.aviso === "rapido" && medios < 2) return "bom";
    return "medio";
  }

  function final() {
    var chave = calcularFinal(), fi = FINAIS[chave];
    var vistos = guarda.ler("fsf-finais-v1", []);
    if (vistos.indexOf(chave) < 0) { vistos.push(chave); guarda.gravar("fsf-finais-v1", vistos); }
    tela.innerHTML = "";
    tela.appendChild(trilha());
    var f = el("div", { "class": "final " + chave, "data-final": chave });
    f.appendChild(el("p", { "class": "selo-final", id: "jogo-h" }, fi.titulo));
    f.appendChild(el("p", null, fi.texto));
    if (estado.saude === "ruim") f.appendChild(el("p", null, "<strong>E a fumaça?</strong> Você se expôs à fumaça sem necessidade. Veja as orientações do bloco “Dia de fumaça”."));
    var ul = el("ul", { "class": "resumo-escolhas" });
    estado.resumo.forEach(function (r) {
      var marca = r.c === "bom" ? "Antes do fogo" : r.c === "medio" ? "Cuidado" : "Depois do fogo";
      ul.appendChild(el("li", null, "<strong>" + r.cena + ":</strong> " + r.escolha + " <em>(" + marca + ")</em>"));
    });
    f.appendChild(el("h3", { style: "font-size:1.15rem" }, "Suas escolhas"));
    f.appendChild(ul);
    var ac = el("div", { "class": "acoes" });
    var mesmo = el("button", { type: "button", "class": "botao" }, "Jogar de novo como " + estado.p.nome.toLowerCase());
    var idAtual = estado.id;
    mesmo.addEventListener("click", function () { comecar(idAtual); });
    var outro = el("button", { type: "button", "class": "botao secundario" }, "Escolher outro personagem");
    outro.addEventListener("click", function () { inicio(); focar("#jogo-h"); });
    ac.appendChild(mesmo); ac.appendChild(outro);
    f.appendChild(ac);
    f.appendChild(finaisVistos());
    tela.appendChild(f);
    anuncio.textContent = "Final: " + fi.titulo + ".";
    focar("#jogo-h");
  }

  function finaisVistos() {
    var vistos = guarda.ler("fsf-finais-v1", []);
    var d = el("div", { style: "display:grid;gap:6px;margin-top:14px" });
    d.appendChild(el("p", { style: "font-weight:700;font-size:.9rem" }, "Finais descobertos: " + vistos.length + " de 4"));
    var lista = el("div", { "class": "finais-vistos" });
    ORDEM_FINAIS.forEach(function (k) { lista.appendChild(el("span", { "class": vistos.indexOf(k) > -1 ? "visto" : "" }, vistos.indexOf(k) > -1 ? FINAIS[k].titulo : "?")); });
    d.appendChild(lista);
    return d;
  }

  var botaoAjuda = $("#jogo-ajuda"), caixaAjuda = $("#como-jogar");
  function ajuda(mostrar) { caixaAjuda.hidden = !mostrar; botaoAjuda.setAttribute("aria-expanded", mostrar ? "true" : "false"); }
  botaoAjuda.addEventListener("click", function () { ajuda(caixaAjuda.hidden); });
  $("#jogo-reiniciar").addEventListener("click", function () { inicio(); ajuda(true); anuncio.textContent = "Jogo reiniciado."; focar("#jogo-h"); });

  window.FSFJogo = { estado: function () { return estado; }, calcularFinal: function () { return calcularFinal(); } };
  inicio();
})();
