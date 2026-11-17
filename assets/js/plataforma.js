/* Trilha Antes do Fogo: jogo de plataforma 2D em pixel.
   3 fases: cidade, estrada de terra e Serra do Figueirão, até a Pedra Bonita.
   O herói não apaga fogo: recolhe bitucas, lixo (sacos, garrafas, papelão) e varre
   folhas secas para a sacola, que tem limite; esvazia no ecoponto do meio da fase
   ou na lixeira do fim; conversa com quem vai queimar, soltar balão ou acender
   fogueira; e, se houver foco, corre até o orelhão e liga para o 193.
   v6: novos coletáveis, varrição, balão, produtor rural, campistas, ecoponto e conquistas. */
(function () {
  "use strict";
  var canvas = document.getElementById("plat-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var W = 320, H = 176, T = 16, LINHAS = 11;
  canvas.width = W; canvas.height = H;
  ctx.imageSmoothingEnabled = false;

  var $ = function (id) { return document.getElementById(id); };
  var hudVidas = $("plat-vidas"), hudBitucas = $("plat-bitucas"), hudFase = $("plat-fase"), hudStatus = $("plat-status");
  var aviso = $("plat-aviso"), painel = $("plat-painel"), sobreEl = $("plat-sobre"), modalEl = $("plat-modal"), modalCaixa = $("plat-modal-caixa");

  var guarda = {
    ler: function (k, p) { try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : p; } catch (e) { return p; } },
    gravar: function (k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- Som (opcional, criado só depois de um toque) ---------- */
  var som = { ligado: guarda.ler("fsf-plat-som", true), ac: null };
  function tom(freqs, dur, tipo, vol) {
    if (!som.ligado) return;
    try {
      if (!som.ac) som.ac = new (window.AudioContext || window.webkitAudioContext)();
      var ac = som.ac, t0 = ac.currentTime;
      freqs.forEach(function (f, i) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = tipo || "square"; o.frequency.setValueAtTime(f, t0 + i * dur);
        g.gain.setValueAtTime(vol || 0.05, t0 + i * dur); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * dur);
        o.connect(g); g.connect(ac.destination); o.start(t0 + i * dur); o.stop(t0 + (i + 1) * dur + 0.02);
      });
    } catch (e) {}
  }
  var SOM = {
    pulo: function () { tom([392, 523], 0.05); }, pega: function () { tom([784, 1175], 0.06); }, lixeira: function () { tom([523, 659, 784, 1046], 0.07); },
    dano: function () { tom([220, 147], 0.12, "sawtooth"); }, tel: function () { tom([880, 660, 880, 660], 0.09, "triangle", 0.07); },
    fase: function () { tom([523, 659, 784, 1046, 1318], 0.09, "triangle", 0.07); }, fala: function () { tom([440, 554], 0.07, "triangle"); },
    varre: function () { tom([260, 200], 0.04, "triangle", 0.04); }, cheia: function () { tom([330, 262], 0.08, "square", 0.04); }
  };
  var CAP = 8; /* espaços na sacola; um monte de folhas ocupa 2 */
  var LIXOS = ["lixo", "garrafa", "papelao"], SIMPLES = ["bituca", "lixo", "garrafa", "papelao"], CONVERSAS = ["vizinho", "festeiro", "produtor", "campista", "visitante"];
  function eh(lista, t) { return lista.indexOf(t) > -1; }

  /* ---------- Fases ---------- */
  function grade(larg) { var g = []; for (var r = 0; r < LINHAS; r++) { g.push([]); for (var c = 0; c < larg; c++) g[r].push("."); } return g; }
  function chao(g, c0, c1) { for (var c = c0; c <= c1; c++) { g[9][c] = "#"; g[10][c] = "#"; } }
  function bloco(g, ch, cel) { cel.forEach(function (p) { g[p[1]][p[0]] = ch; }); }
  function linha(c0, c1, r) { var o = []; for (var c = c0; c <= c1; c++) o.push([c, r]); return o; }

  function criarFases() {
    /* Fase 1: cidade */
    var f1 = { nome: "Cidade", larg: 130, tema: "cidade", g: grade(130), ent: [], fumaca: [] };
    chao(f1.g, 0, 35); chao(f1.g, 38, 74); chao(f1.g, 77, 129);
    bloco(f1.g, "C", [[14, 8], [22, 8], [23, 8], [23, 7], [41, 8], [42, 8], [42, 7], [50, 8], [86, 8], [87, 8], [87, 7]]);
    bloco(f1.g, "B", linha(30, 33, 6).concat(linha(44, 46, 5)));
    f1.ent = [
      { t: "folhas", c: 6 }, { t: "bituca", c: 9 }, { t: "lixo", c: 18 }, { t: "bituca", c: 26 }, { t: "garrafa", c: 29 }, { t: "bituca", c: 32, r: 5 }, { t: "lixeira", c: 39, meio: true }, { t: "lixo", c: 45, r: 4 },
      { t: "vizinho", c: 54 }, { t: "bituca", c: 58 }, { t: "marco", c: 62 }, { t: "lixo", c: 66 }, { t: "agua", c: 70, r: 7 },
      { t: "festeiro", c: 80 }, { t: "bituca", c: 84 }, { t: "folhas", c: 89 }, { t: "orelhao", c: 100 }, { t: "papelao", c: 116 }, { t: "lixeira", c: 120 }
    ];
    f1.foco = { c: 108, gatilho: 92 }; f1.fim = 126;
    f1.deco = [{ t: "casa", c: 3 }, { t: "arvore", c: 11 }, { t: "casa", c: 16 }, { t: "casa", c: 27 }, { t: "arvore", c: 36 }, { t: "casa", c: 48 }, { t: "casa", c: 57 },
      { t: "arvore", c: 68 }, { t: "casa", c: 80 }, { t: "arvore", c: 94 }, { t: "casa", c: 104 }, { t: "arvore", c: 116 }, { t: "placa", c: 126 }];

    /* Fase 2: estrada de terra */
    var f2 = { nome: "Estrada de terra", larg: 140, tema: "estrada", g: grade(140), ent: [], fumaca: [[66, 78]] };
    chao(f2.g, 0, 30); chao(f2.g, 33, 60); chao(f2.g, 63, 99); chao(f2.g, 102, 139);
    bloco(f2.g, "C", [[12, 8], [40, 8], [41, 8], [41, 7], [78, 8], [90, 8], [91, 8], [91, 7], [91, 6]]);
    bloco(f2.g, "B", linha(46, 49, 6).concat(linha(88, 89, 7)));
    f2.ent = [
      { t: "bituca", c: 8 }, { t: "lixo", c: 16 }, { t: "bituca", c: 22 }, { t: "carro", c: 24, solta: 37 }, { t: "folhas", c: 27 }, { t: "garrafa", c: 44 }, { t: "mascara", c: 48, r: 5 },
      { t: "produtor", c: 52 }, { t: "bituca", c: 55 }, { t: "evento", c: 58, ev: "clima" }, { t: "marco", c: 64 }, { t: "lixeira", c: 70, meio: true }, { t: "lixo", c: 72 }, { t: "folhas", c: 75 }, { t: "agua", c: 82, r: 8 },
      { t: "bituca", c: 85 }, { t: "bituca", c: 95 }, { t: "papelao", c: 97 }, { t: "orelhao", c: 108 }, { t: "lixeira", c: 130 }
    ];
    f2.foco = { c: 116, gatilho: 104 }; f2.fim = 136;
    f2.deco = [{ t: "arvore", c: 4 }, { t: "capim", c: 10 }, { t: "arvore", c: 18 }, { t: "capim", c: 27 }, { t: "arvore", c: 36 }, { t: "capim", c: 52 },
      { t: "arvore", c: 59 }, { t: "capim", c: 70 }, { t: "arvore", c: 84 }, { t: "capim", c: 97 }, { t: "arvore", c: 112 }, { t: "capim", c: 124 }, { t: "placa", c: 136 }];

    /* Fase 3: Serra do Figueirão */
    var f3 = { nome: "Serra do Figueirão", larg: 150, tema: "serra", g: grade(150), ent: [], fumaca: [] };
    chao(f3.g, 0, 40); chao(f3.g, 47, 80); chao(f3.g, 89, 149);
    var cel = [[18, 8], [19, 8], [19, 7]];
    for (var c = 20; c <= 28; c++) cel.push([c, 8], [c, 7], [c, 6]);
    cel = cel.concat([[60, 8], [61, 8], [61, 7], [62, 8], [62, 7], [62, 6]], linha(64, 66, 5));
    bloco(f3.g, "B", cel);
    bloco(f3.g, "X", linha(81, 88, 9));
    bloco(f3.g, "C", [[100, 8], [101, 8], [101, 7]]);
    f3.ent = [
      { t: "bituca", c: 12 }, { t: "bituca", c: 22, r: 5 }, { t: "mirante", c: 26, r: 5 }, { t: "campista", c: 32 }, { t: "lixo", c: 37 }, { t: "mov", c: 41, ate: 45, r: 9 },
      { t: "garrafa", c: 49 }, { t: "bituca", c: 52 }, { t: "visitante", c: 56 }, { t: "bituca", c: 65, r: 4 }, { t: "lixo", c: 72 }, { t: "agua", c: 76, r: 8 }, { t: "lixeira", c: 78, meio: true },
      { t: "marco", c: 90 }, { t: "bituca", c: 94 }, { t: "evento", c: 98, ev: "radio" }, { t: "folhas", c: 104 }, { t: "orelhao", c: 112 }, { t: "papelao", c: 130 }, { t: "lixeira", c: 136 }
    ];
    f3.foco = { c: 120, gatilho: 106 }; f3.fim = 142;
    f3.deco = [{ t: "arvore", c: 4 }, { t: "arvore", c: 14 }, { t: "arvore", c: 38 }, { t: "seriema", c: 50 }, { t: "arvore", c: 69 },
      { t: "tamandua", c: 74 }, { t: "arvore", c: 93 }, { t: "tatu", c: 104 }, { t: "tatu", c: 124 }, { t: "arvore", c: 128 }, { t: "seriema", c: 132 }, { t: "pedra", c: 142 }];
    return [f1, f2, f3];
  }

  /* ---------- Estado ---------- */
  var S = null, fases = null;
  var entrada = { esq: false, dir: false, pulo: false, agir: false }, antes = { pulo: false, agir: false }, pedido = { pulo: false, agir: false };
  var modo = "inicio", quadro = 0, raf = null, visivel = true;
  var CAMPOS = ["vidas", "mascara", "focos", "rapidos", "tardes", "semAviso", "danoFogo", "bitucas", "bitucasTotal", "lixo", "lixoTotal", "folhas", "folhasTotal", "conversas", "conversasTotal", "fumaca", "pontos", "descartados", "sacolaB", "sacolaL", "sacolaF", "denuncias", "denunciaErros", "obsCerto", "baloes"];

  function novoJogo() {
    fases = criarFases();
    S = { fase: 0, vidas: 3, mascara: false, focos: 0, rapidos: 0, tardes: 0, semAviso: 0, danoFogo: 0, bitucas: 0, bitucasTotal: 0, lixo: 0, lixoTotal: 0,
      crise: 0, fasesCrise: 0, conversas: 0, conversasTotal: 0, folhas: 0, folhasTotal: 0, fumaca: 0, pontos: 0, descartados: 0, sacolaB: 0, sacolaL: 0, sacolaF: 0, denuncias: 0, denunciaErros: 0, obsCerto: 0, baloes: 0, eventos: [], morteFogo: false };
    iniciarFase(0);
  }

  function iniciarFase(i) {
    var f = criarFases()[i];
    fases[i] = f; S.fase = i;
    var snap = {}; CAMPOS.forEach(function (k) { snap[k] = S[k]; }); S.snap = snap;
    f.entidades = f.ent.map(function (e) {
      var o = { t: e.t, x: e.c * T, y: (e.r || 8) * T, ativo: true, c: e.c, solta: e.solta, ev: e.ev, meio: e.meio, v: 0 };
      if (e.t === "bituca") S.bitucasTotal++;
      if (eh(LIXOS, e.t)) S.lixoTotal++;
      if (e.t === "folhas") S.folhasTotal++;
      if (eh(CONVERSAS, e.t)) S.conversasTotal++;
      if (e.t === "mov") { o.x0 = e.c * T; o.x1 = e.ate * T; o.v = 0.6; o.w = 32; }
      return o;
    });
    f.fogo = { ativo: false, aparecido: false, tiles: [], t0: 0, avisado: false, caminhao: null, cresce: 150 };
    f.faiscas = []; f.parts = []; f.terra = {}; f.viatura = null; f.vento = 0; f.fumacaVista = false; f.marcoX = 2 * T; f.avisoLixeira = 0;
    prepararCrise(f, S.crise || 0);
    S.p = { x: 2 * T, y: 8 * T, w: 10, h: 15, vx: 0, vy: 0, chao: false, face: 1, inv: 0, passo: 0, plat: null, varre: 0 };
    S.cam = 0; S.t = 0;
    hud();
  }

  /* ---------- Consequência: o que ficou para trás deixa a fase seguinte em chamas ----------
     nível 1: fumaça, 2 focos, árvores queimando, animais fugindo, bombeiros e polícia na estrada
     nível 2: mais fumaça, 4 focos, árvores queimadas que caem, cinzas e vegetação queimada */
  function prepararCrise(f, nivel) {
    f.crise = nivel; f.focosExtras = []; f.brigadas = []; f.fugitivos = []; f.cinzas = []; f.proxFuga = 90; f.proxViatura = 240; f.avisouCrise = false;
    if (!nivel) return;
    var cand = [];
    for (var c = 12; c < f.foco.gatilho - 4; c++) {
      if (f.g[9][c] !== "#" || f.g[9][c - 1] !== "#" || f.g[9][c + 1] !== "#" || f.g[8][c] !== "." || f.g[8][c - 1] !== "." || f.g[8][c + 1] !== "." || f.g[7][c] !== ".") continue;
      if (f.ent.some(function (e) { return Math.abs(e.c - c) <= 3 && e.t !== "evento"; })) continue;
      cand.push(c);
    }
    var n = nivel === 1 ? 2 : 4, esc = [];
    for (var k = 0; k < n && cand.length; k++) { var ci = cand[Math.floor((k + 0.5) * cand.length / n)]; if (esc.indexOf(ci) < 0) esc.push(ci); }
    esc.forEach(function (c2) { f.focosExtras.push({ c: c2, ativo: true, brigada: false }); f.fumaca.push([c2 - 3, c2 + 4]); });
    if (nivel === 1 && !S.mascara) f.entidades.push({ t: "mascara", x: 5 * T, y: 7 * T, ativo: true, c: 5 });
    var arv = 0;
    f.deco.forEach(function (d) {
      if (d.t === "capim") d.queimado = true;
      if (d.t !== "arvore") return;
      arv++;
      if (nivel === 2 && arv % 3 === 2 && d.c > 8 && d.c < f.fim - 6) { d.cai = true; f.entidades.push({ t: "arvoreCai", x: d.c * T, y: 8 * T, c: d.c, ativo: true, estado: 0, k: 0 }); }
      else if (arv % 2 === 1) d.queimando = true;
      else if (nivel === 2) d.queimado = true;
    });
  }
  function atualizarCrise(f, p) {
    if (!f.crise) return;
    if (!f.avisouCrise && S.t > 30) {
      f.avisouCrise = true;
      avisar(f.crise === 2 ? "O que ficou para trás virou fogo. Esta fase começa com o Cerrado em chamas: fumaça, focos, árvores caindo e animais fugindo. Fique longe do fogo." : "O que ficou para trás virou fogo. Há fumaça e focos nesta fase, e os animais fogem. Fique longe e deixe os bombeiros trabalharem.", 320);
    }
    /* focos extras: queimam, soltam faíscas e são combatidos pelos bombeiros quando você se aproxima */
    f.focosExtras.forEach(function (fe) {
      if (!fe.ativo) return;
      var fx = fe.c * T, fy = 8 * T + 6;
      if (p.inv === 0 && p.x + p.w > fx + 3 && p.x < fx + T - 3 && p.y + p.h > fy) { S.danoFogo++; dano("fogo"); p.vx = p.x < fx + 8 ? -3 : 3; p.vy = -3; }
      if (S.t % (f.crise === 2 ? 80 : 110) === fe.c % 20 && Math.abs(fx - p.x) < W) f.faiscas.push({ x: fx + 8, y: 8 * T + 4, vx: (Math.random() - 0.6) * 1.4, vy: -2.4 - Math.random() });
      if (!fe.brigada && fx - p.x < 9 * T && fx - p.x > -2 * T) {
        fe.brigada = true;
        f.brigadas.push({ alvo: fe, x: S.cam + W + 20, fase: 0, t: 0 });
        if (!f.avisouBrigada) { f.avisouBrigada = true; avisar("Bombeiros chegando para combater o foco. Espere longe: quem não é bombeiro ajuda não chegando perto."); }
      }
    });
    f.brigadas.forEach(function (b) {
      if (b.fase === 0) { b.x -= 3; if (b.x <= b.alvo.c * T + 30) { b.fase = 1; b.t = 0; } }
      else if (b.fase === 1) { b.t++; if (b.t > 110) { b.alvo.ativo = false; b.fase = 2; pontos(0, b.alvo.c * T, 7 * T, "apagado"); } }
      else b.x += 3;
    });
    f.brigadas = f.brigadas.filter(function (b) { return !(b.fase === 2 && b.x - S.cam > W + 60); });
    /* viatura da Polícia Militar Ambiental passando */
    if (--f.proxViatura <= 0) { f.proxViatura = f.crise === 2 ? 360 : 520; f.brigadas.push({ ronda: true, x: S.cam + W + 30, fase: 3 }); }
    f.brigadas.forEach(function (b) { if (b.ronda) b.x -= 2.2; });
    f.brigadas = f.brigadas.filter(function (b) { return !(b.ronda && b.x - S.cam < -80); });
    /* animais fugindo do fogo (nenhum é atingido) */
    if (--f.proxFuga <= 0) {
      f.proxFuga = (f.crise === 2 ? 110 : 190) + Math.floor(Math.random() * 60);
      var tipos = ["tatu", "seriema", "tamandua", "aves", "veado"], tp = tipos[Math.floor(Math.random() * tipos.length)];
      f.fugitivos.push({ t: tp, x: S.cam + W + 10, y: tp === "aves" ? 30 + Math.random() * 40 : 9 * T, v: tp === "aves" ? 1.6 : tp === "veado" ? 2.6 : tp === "seriema" ? 2.2 : 1.6 });
      if (!f.avisouFuga) { f.avisouFuga = true; avisar("Os animais fogem do fogo. Sem a vegetação, ficam sem abrigo e sem comida."); }
    }
    f.fugitivos.forEach(function (a) { a.x -= a.v; });
    f.fugitivos = f.fugitivos.filter(function (a) { return a.x - S.cam > -40; });
    /* cinzas caindo */
    if (f.crise === 2 && S.t % 4 === 0) f.cinzas.push({ x: S.cam + Math.random() * W, y: -4, vx: -0.3 - Math.random() * 0.3, vy: 0.4 + Math.random() * 0.4 });
    f.cinzas.forEach(function (z) { z.x += z.vx; z.y += z.vy; });
    f.cinzas = f.cinzas.filter(function (z) { return z.y < H; });
  }
  function avaliarDeixados(f) {
    var n = 0;
    f.entidades.forEach(function (e) {
      if (e.ativo && (eh(SIMPLES, e.t) || e.t === "folhas")) n++;
      if ((e.t === "vizinho" || e.t === "produtor" || e.t === "campista") && !e.conv) n++;
      if (e.t === "festeiro" && e.solto) n++;
    });
    if (f.fogo.aparecido && f.fogo.tiles.length && !f.fogo.avisado) n += 4;
    return n;
  }

  /* ---------- Utilidades ---------- */
  function fase() { return fases[S.fase]; }
  function tile(c, r) { var f = fase(); if (c < 0) return "#"; if (c >= f.larg || r < 0 || r >= LINHAS) return "."; return f.g[r][c]; }
  function solido(c, r) {
    var t = tile(c, r);
    if (t === "X") { var st = fase().terra[c + "," + r]; return !(st && st.caiu); }
    return t === "#" || t === "B" || t === "C";
  }
  function perto(e, d) { var p = S.p; return Math.abs((p.x + p.w / 2) - (e.x + 8)) < (d || 18) && Math.abs((p.y + p.h) - (e.y + 16)) < 20; }
  var filaAvisos = [], avisoAte = 0;
  function avisar(txt, dur) { filaAvisos.push({ txt: txt, dur: dur || 200 }); }
  function pontos(n, x, y, txt) {
    S.pontos = Math.max(0, S.pontos + n);
    fase().parts.push({ tipo: "txt", x: x, y: y, vy: -0.6, vida: 50, txt: txt || ((n > 0 ? "+" : "") + n), cor: n >= 0 ? "#f3f436" : "#ff6a5a" });
  }
  function brilho(x, y) { for (var i = 0; i < 8; i++) fase().parts.push({ tipo: "p", x: x, y: y, vx: Math.cos(i) * 1.2, vy: -Math.abs(Math.sin(i)) * 1.6 - 0.5, vida: 30, cor: i % 2 ? "#f3f436" : "#ffffff" }); }
  function carregando() { return S.sacolaB + S.sacolaL + S.sacolaF * 2; }
  function itens() { return S.sacolaB + S.sacolaL + S.sacolaF; }
  function avisoCheia(f) { if (S.t > (f.avisoCheia || 0)) { f.avisoCheia = S.t + 160; SOM.cheia(); avisar("Sacola cheia (" + carregando() + " de " + CAP + "). Esvazie no ecoponto, a lixeira verde do meio da fase, ou na lixeira do fim."); } }
  function hud() {
    if (!S) return;
    var v = ""; for (var i = 0; i < 3; i++) v += i < S.vidas ? "♥" : "♡";
    hudVidas.textContent = v; hudVidas.setAttribute("aria-label", S.vidas + " vidas");
    hudBitucas.textContent = "Sacola " + carregando() + "/" + CAP + ": " + S.sacolaB + " bituca" + (S.sacolaB === 1 ? "" : "s") + ", " + S.sacolaL + " lixo, " + S.sacolaF + " folhas · Pontos: " + S.pontos + (S.mascara ? " · Máscara" : "");
    hudFase.textContent = "Fase " + (S.fase + 1) + " de 3: " + fase().nome + (fase().crise ? " · Cerrado em chamas" : "");
    var fg = fase().fogo;
    hudStatus.textContent = modo !== "jogando" ? "" : fg.ativo && !fg.avisado ? "Foco! Corra ao orelhão e ligue 193" : fg.avisado && fg.ativo ? "Bombeiros a caminho" : carregando() && S.p.x > (fase().fim - 22) * T ? "Descarte a sacola na lixeira" : carregando() >= CAP ? "Sacola cheia: esvazie no ecoponto" : "";
  }

  /* ---------- Atualização ---------- */
  function atualizar() {
    var f = fase(), p = S.p;
    S.t++;
    var pulou = (entrada.pulo && !antes.pulo) || pedido.pulo, agiu = (entrada.agir && !antes.agir) || pedido.agir;
    antes.pulo = entrada.pulo; antes.agir = entrada.agir; pedido.pulo = false; pedido.agir = false;

    var alvo = ((entrada.dir ? 1 : 0) - (entrada.esq ? 1 : 0)) * 1.5;
    p.vx += (alvo - p.vx) * 0.25;
    if (f.vento) p.vx += f.vento * (0.5 + 0.5 * Math.sin(S.t / 40));
    if (alvo) p.face = alvo > 0 ? 1 : -1;
    if (pulou && (p.chao || p.coyote > 0)) { p.vy = -5.6; p.chao = false; p.coyote = 0; p.plat = null; SOM.pulo(); }
    if (!entrada.pulo && p.vy < -3) p.vy = -3;
    p.vy = Math.min(p.vy + 0.3, 5);

    /* plataformas móveis */
    f.entidades.forEach(function (e) {
      if (e.t !== "mov") return;
      var antesX = e.x; e.x += e.v; if (e.x > e.x1 || e.x < e.x0) { e.v = -e.v; e.x = Math.max(e.x0, Math.min(e.x1, e.x)); }
      e.dx = e.x - antesX;
    });
    if (p.plat) p.x += p.plat.dx;

    var baseAntes = p.y + p.h;
    p.x += p.vx; colisaoX(p);
    p.y += p.vy; colisaoY(p);
    p.plat = null;
    if (p.vy >= 0) f.entidades.forEach(function (e) {
      if (e.t !== "mov") return;
      if (p.x + p.w > e.x + 1 && p.x < e.x + e.w - 1 && baseAntes <= e.y + 1 && p.y + p.h >= e.y) { p.y = e.y - p.h; p.vy = 0; p.chao = true; p.plat = e; }
    });
    if (p.x < 0) p.x = 0;
    p.coyote = p.chao ? 6 : Math.max(0, (p.coyote || 0) - 1);
    if (Math.abs(p.vx) > 0.2 && p.chao) p.passo++;
    if (p.inv > 0) p.inv--;
    if (p.varre > 0) p.varre--;

    /* terra solta: cai depois de pisar e volta depois */
    if (p.chao) {
      var rr = Math.floor((p.y + p.h + 1) / T);
      [Math.floor(p.x / T), Math.floor((p.x + p.w - 1) / T)].forEach(function (c) {
        if (tile(c, rr) === "X") { var k = c + "," + rr; if (!f.terra[k]) { f.terra[k] = { t: 0, caiu: false }; if (!f.terraAvisou) { f.terraAvisou = true; avisar("Terra solta! Sem a vegetação, o solo fica exposto e desmorona. Passe rápido."); } } }
      });
    }
    Object.keys(f.terra).forEach(function (k) { var st = f.terra[k]; st.t++; if (!st.caiu && st.t > 26) st.caiu = true; if (st.caiu && st.t > 230) delete f.terra[k]; });

    if (p.y > H + 24) { dano("queda"); if (modo === "jogando") { p.x = f.marcoX; p.y = 6 * T; p.vx = 0; p.vy = 0; } }

    /* entidades */
    f.entidades.forEach(function (e) {
      if (!e.ativo) return;
      if (eh(SIMPLES, e.t)) {
        if (agiu && perto(e)) {
          agiu = false;
          if (carregando() + 1 > CAP) { avisoCheia(f); return; }
          e.ativo = false; SOM.pega(); brilho(e.x + 8, e.y + 10);
          if (e.t === "bituca") { S.bitucas++; S.sacolaB++; pontos(10, e.x + 4, e.y); avisar("Bituca na sacola. No chão ela parece pequena, sem perigo. Em minutos, vira um foco de incêndio."); }
          else {
            S.lixo++; S.sacolaL++; pontos(20, e.x + 4, e.y);
            avisar(e.t === "garrafa" ? "Garrafa na sacola. Lixo largado no mato acaba juntado e queimado, e queimar resíduos a céu aberto é proibido (Lei nº 12.305/2010)."
              : e.t === "papelao" ? "Papelão na sacola. Papel e papelão secos pegam fogo fácil. Lugar de resíduo é na lixeira, não no fogo."
              : "Lixo na sacola. Não queime lixo: a queima a céu aberto é proibida (Lei nº 12.305/2010).");
          }
        }
      } else if (e.t === "folhas") {
        if (!e.falou && perto(e, 60)) { e.falou = true; avisar("Folhas e galhos secos acumulados. Não queime: chegue perto e aperte Agir várias vezes para varrer e ensacar."); }
        if (agiu && perto(e, 22)) {
          agiu = false;
          if (carregando() + 2 > CAP) { avisoCheia(f); return; }
          e.v++; p.varre = 14; p.face = (e.x + 8) > (p.x + p.w / 2) ? 1 : -1; SOM.varre();
          for (var fo = 0; fo < 5; fo++) f.parts.push({ tipo: "p", x: e.x + 6 + Math.random() * 6, y: e.y + 12, vx: (Math.random() - 0.3) * 1.6 * p.face, vy: -1 - Math.random() * 1.4, vida: 26, cor: fo % 2 ? "#c98a2e" : "#e0b04a" });
          if (e.v >= 4) {
            e.ativo = false; S.folhas++; S.sacolaF++; SOM.pega(); brilho(e.x + 8, e.y + 10); pontos(25, e.x + 4, e.y);
            avisar("Folhas varridas e ensacadas. Não queime folhas secas nem restos de vegetação: varra, ensaque e descarte.");
          }
        }
      } else if (e.t === "festeiro") {
        if (!e.falou && perto(e, 80)) { e.falou = true; avisar("Tem festa na casa e alguém vai soltar um balão. Chegue perto e aperte Agir para conversar."); }
        if (!e.conv && !e.solto && agiu && perto(e, 26)) {
          e.conv = true; agiu = false; S.conversas++; SOM.fala(); pontos(40, e.x, e.y - 8);
          avisar("Você explicou que soltar balão é crime (Lei nº 9.605/1998, art. 42): ele pode cair aceso no mato ou num telhado. O balão ficou no chão.");
        }
        if (!e.conv && !e.solto && p.x > e.x + 40) {
          e.solto = true; e.bx = e.x + 2; e.by = e.y - 18; S.baloes++;
          avisar("O balão foi solto. Ninguém sabe onde ele vai cair, e a tocha pode cair acesa no capim seco. Soltar balão é crime (Lei nº 9.605/1998, art. 42).");
        }
        if (e.solto && e.by > -40) { e.by -= 0.35; e.bx += 0.45; }
      } else if (e.t === "produtor") {
        if (!e.falou && perto(e, 80)) { e.falou = true; avisar("Um produtor rural quer limpar o pasto com fogo hoje. Chegue perto e aperte Agir para conversar."); }
        if (!e.conv && !e.passou && agiu && perto(e, 26)) { agiu = false; conversaProdutor(e); }
        if (!e.conv && !e.passou && p.x > e.x + 40) { e.passou = true; avisar("Ninguém conversou com o produtor, e ele pôs fogo no pasto com o tempo seco. Queimada mal controlada é uma das causas de incêndio em Figueirão."); }
      } else if (e.t === "campista") {
        if (!e.falou && perto(e, 80)) { e.falou = true; avisar("Campistas vão acender uma fogueira bem no meio do capim seco. Chegue perto e aperte Agir para conversar."); }
        if (!e.conv && !e.acendeu && agiu && perto(e, 30)) {
          e.conv = true; agiu = false; S.conversas++; SOM.fala(); pontos(30, e.x, e.y - 8);
          avisar("Você pediu aos campistas para não acender fogueira no capim seco. A campanha orienta evitar atividades que provoquem faíscas ou iniciem focos de incêndio.");
        }
        if (!e.conv && !e.acendeu && p.x > e.x + 44) { e.acendeu = true; avisar("Os campistas acenderam a fogueira no capim seco, atrás de você. Uma faísca basta para começar um foco."); }
      } else if (e.t === "arvoreCai") {
        if (e.estado === 0 && p.x > (e.c - 6) * T && p.x < e.x) { e.estado = 1; e.k = 0; if (!f.avisouArvore) { f.avisouArvore = true; avisar("Cuidado: a árvore queimada está estalando e vai cair. Espere ou passe longe."); } }
        else if (e.estado === 1) { if (++e.k > 55) { e.estado = 2; e.k = 0; } }
        else if (e.estado === 2) {
          e.k++;
          if (e.k > 14 && e.k < 30 && p.inv === 0 && p.x + p.w > e.x - 34 && p.x < e.x + 4 && p.y + p.h > 8 * T - 10) dano("arvore");
          if (e.k >= 30) { e.estado = 3; for (var bz = 0; bz < 10; bz++) f.parts.push({ tipo: "p", x: e.x - 20 + bz * 3, y: 9 * T - 4, vx: (Math.random() - 0.5) * 1.5, vy: -1 - Math.random() * 1.5, vida: 30, cor: bz % 2 ? "#ff6a1f" : "#5a4a3a" }); }
        }
      } else if (e.t === "mascara") {
        if (perto(e, 14)) { e.ativo = false; S.mascara = true; SOM.pega(); pontos(10, e.x, e.y); avisar("Máscara PFF2. Com fumaça, o Ministério da Saúde orienta ficar em casa. Se precisar sair, use máscara bem ajustada."); }
      } else if (e.t === "agua") {
        if (perto(e, 14)) { e.ativo = false; SOM.pega(); if (S.vidas < 3) { S.vidas++; pontos(0, e.x, e.y, "+♥"); } else pontos(5, e.x, e.y); avisar("Água. Em dia seco e de fumaça, o Ministério da Saúde orienta beber mais água."); }
      } else if (e.t === "marco") {
        if (p.x > e.x && !e.passou) { e.passou = true; f.marcoX = e.x; SOM.fala(); avisar("Marco da trilha. Se cair num buraco, você volta para cá."); }
      } else if (e.t === "vizinho") {
        if (!e.conv && agiu && perto(e, 26)) { e.conv = true; agiu = false; S.conversas++; SOM.fala(); pontos(30, e.x, e.y - 8); avisar("Você conversou com o vizinho. Ele não vai queimar o lixo. Queimar resíduos a céu aberto é proibido."); }
        if (!e.falou && perto(e, 70)) { e.falou = true; avisar("O vizinho juntou lixo e folhas secas para queimar. Chegue perto e aperte Agir para conversar."); }
      } else if (e.t === "visitante") {
        if (!e.conv && agiu && perto(e, 26)) { e.conv = true; agiu = false; S.conversas++; SOM.fala(); pontos(30, e.x, e.y - 8); avisar("Você pediu ao visitante para não jogar a bituca no capim. Ele guardou a bituca."); }
        if (!e.falou && perto(e, 70)) { e.falou = true; avisar("Um visitante fuma na trilha. Chegue perto e aperte Agir para conversar."); }
        if (!e.conv && p.x > e.x + 40) {
          e.conv = true;
          f.entidades.push({ t: "bituca", x: e.x - T, y: 8 * T, ativo: true }); S.bitucasTotal++;
          avisar("O visitante jogou a bituca acesa no capim, atrás de você. Denuncie e depois volte para recolher.");
          celularPMA({ x: e.x, ref: e, quem: "o visitante" });
        }
      } else if (e.t === "carro") {
        if (!e.passou && p.x > e.x) { e.passou = true; e.anim = 0; S.eventos.push("carro"); avisar("Evento: um carro passou e jogaram uma bituca pela janela. Recolha antes que vire foco."); }
        if (e.passou) {
          e.anim++;
          if (e.anim === 46) { f.entidades.push({ t: "bituca", x: e.solta * T, y: 8 * T, ativo: true }); S.bitucasTotal++; }
          if (e.anim === 70) celularPMA({ x: e.solta * T, quem: "alguém no carro" });
          if (e.anim > 150) e.ativo = false;
        }
      } else if (e.t === "evento") {
        if (p.x > e.x) {
          e.ativo = false;
          if (e.ev === "clima") {
            var ev = S.forcaClima || (Math.random() < 0.5 ? "vento" : "seca");
            S.eventos.push(ev);
            if (ev === "vento") { f.vento = -0.05; f.fogo.cresce = 100; avisar("Evento: vento forte! Ele empurra você e, com vento, faísca e fogo vão mais longe."); }
            else { f.fogo.cresce = 110; f.secas = true; avisar("Evento: tarde de estiagem. Sol forte, tempo seco e baixa umidade. O fogo vai crescer mais rápido."); }
          } else if (e.ev === "radio") { S.eventos.push("radio"); avisar("No rádio, toca o spot da campanha: “Viu fogo? Ligue 193, Corpo de Bombeiros.”"); }
        }
      } else if (e.t === "mirante") {
        if (!e.visto && p.x > e.x - 4 && p.y < 7 * T) { e.visto = true; observacao(); }
      } else if (e.t === "orelhao") {
        if (agiu && perto(e, 22)) {
          agiu = false;
          var fg = f.fogo;
          if (fg.ativo && !fg.avisado) {
            fg.avisado = true; SOM.tel();
            var seg = (S.t - fg.t0) / 60;
            if (seg <= 8) { S.rapidos++; pontos(50, e.x, e.y - 16); avisar("Você ligou 193 e avisou o Corpo de Bombeiros na hora. Agora espere longe do fogo."); }
            else { S.tardes++; pontos(10, e.x, e.y - 16); avisar("Você ligou 193, mas o fogo já tinha crescido. O aviso tem que ser imediato."); }
            fg.caminhao = { x: S.cam + W + 10, alvo: fg.tiles[0] * T - 10, fase: 0 };
          } else if (!fg.aparecido) avisar("Orelhão. Viu fogo? Ligue 193, Corpo de Bombeiros.");
        }
      } else if (e.t === "lixeira") {
        if (agiu && perto(e, 24) && carregando()) {
          agiu = false; SOM.lixeira(); brilho(e.x + 8, e.y);
          var n = itens(); S.descartados += n; pontos(5 * n, e.x, e.y - 10, "+" + (5 * n) + " descarte");
          avisar((e.meio ? "Ecoponto: " : "Sacola vazia: ") + n + " ite" + (n === 1 ? "m" : "ns") + " no lugar certo. Resíduo na lixeira não vira fogo nem fumaça." + (e.meio ? " Sacola livre para seguir recolhendo." : ""));
          S.sacolaB = 0; S.sacolaL = 0; S.sacolaF = 0;
        }
        if (e.meio && !e.falou && perto(e, 70)) { e.falou = true; avisar("Ecoponto no caminho. Se a sacola estiver pesada, pare e aperte Agir para esvaziar."); }
        if (!e.meio && carregando() && p.x + p.w > e.x + 18) {
          p.x = e.x + 18 - p.w; p.vx = 0;
          if (S.t > f.avisoLixeira) { f.avisoLixeira = S.t + 150; avisar("Pare na lixeira: aperte Agir para descartar o que está na sacola antes de seguir."); }
        }
      }
    });

    /* foco de incêndio */
    var fg = f.fogo;
    if (!fg.aparecido && p.x > f.foco.gatilho * T) {
      fg.aparecido = true;
      var risco = 0;
      f.entidades.forEach(function (e) {
        var antesDoFoco = e.x < f.foco.gatilho * T;
        if (e.ativo && antesDoFoco && eh(SIMPLES, e.t)) risco++;
        if (e.ativo && antesDoFoco && e.t === "folhas") risco += 2;
        if ((e.t === "vizinho" || e.t === "produtor" || e.t === "campista") && !e.conv) risco += 2;
        if (e.t === "festeiro" && e.solto) risco += 2;
      });
      if (risco > 0) {
        fg.ativo = true; fg.t0 = S.t; S.focos++;
        var n = Math.min(2 + (risco > 4 ? 1 : 0), risco);
        for (var i = 0; i < n; i++) fg.tiles.push(f.foco.c + i);
        avisar("Fumaça à frente! O que ficou para trás virou um foco de incêndio. Não chegue perto: corra ao orelhão e ligue 193.", 300);
      } else {
        avisar("Nenhum foco nesta fase. Suas atitudes mantiveram o cartão “Antes do fogo”.");
        pontos(40, p.x, p.y - 10, "+40 sem fogo");
      }
    }
    if (fg.ativo) {
      if (!fg.avisado && S.t > fg.t0 && (S.t - fg.t0) % fg.cresce === 0 && fg.tiles.length < 6) {
        var ult = fg.tiles[fg.tiles.length - 1], pri = fg.tiles[0];
        if (fg.tiles.length % 2 === 0 && pri - 1 > f.foco.c - 3) fg.tiles.unshift(pri - 1); else fg.tiles.push(ult + 1);
      }
      /* faíscas saltam do fogo */
      var intervalo = f.vento ? 45 : f.secas ? 55 : 70;
      if (!fg.avisado && S.t % intervalo === 0) {
        var ct = fg.tiles[Math.floor(Math.random() * fg.tiles.length)];
        f.faiscas.push({ x: ct * T + 8, y: 8 * T + 4, vx: -(0.5 + Math.random() * 0.8) + (f.vento ? -0.3 : 0), vy: -2.6 - Math.random() * 1.2 });
      }
      fg.tiles.forEach(function (c) {
        var fx = c * T, fy = 8 * T + 6;
        if (p.inv === 0 && p.x + p.w > fx + 3 && p.x < fx + T - 3 && p.y + p.h > fy) { S.danoFogo++; dano("fogo"); p.vx = p.x < fx + 8 ? -3 : 3; p.vy = -3; }
      });
      if (fg.caminhao) {
        var cm = fg.caminhao;
        if (cm.fase === 0) { cm.x -= 3; if (cm.x <= cm.alvo + 40) { cm.fase = 1; cm.t = 0; } }
        else if (cm.fase === 1) { cm.t++; if (cm.t > 90) { fg.ativo = false; cm.fase = 2; f.faiscas = []; SOM.fase(); avisar("Os bombeiros controlaram o foco. Você fez a sua parte: avisou sem se colocar em risco."); } }
      }
    } else if (fg.caminhao && fg.caminhao.fase === 2) fg.caminhao.x += 3;
    if (f.viatura) {
      var vt = f.viatura;
      if (vt.fase === 0) { vt.x -= 2.5; if (vt.x <= vt.alvo + 24) { vt.fase = 1; vt.t = 0; avisar(vt.ref ? "A Polícia Militar Ambiental chegou ao local da denúncia e orientou " + vt.quem + ". Agora é recolher a bituca do chão." : "A Polícia Militar Ambiental veio ao local da denúncia para verificar. Agora é recolher a bituca do chão."); } }
      else if (vt.fase === 1) { vt.t++; if (vt.t > 160) { vt.fase = 2; if (vt.ref) vt.ref.saiu = true; } }
      else { vt.x += 3; if (vt.x - S.cam > W + 80) f.viatura = null; }
    }
    f.faiscas = f.faiscas.filter(function (s) {
      s.x += s.vx; s.y += s.vy; s.vy += 0.12;
      if (p.inv === 0 && Math.abs(s.x - (p.x + p.w / 2)) < 6 && Math.abs(s.y - (p.y + 7)) < 9) { S.danoFogo++; dano("faisca"); return false; }
      return s.y < 9 * T && !solido(Math.floor(s.x / T), Math.floor(s.y / T));
    });

    atualizarCrise(f, p);

    /* fumaça: sem máscara, a primeira nuvem da fase tira uma vida e todas deixam você mais lento */
    f.fumaca.forEach(function (z) {
      var dentro = p.x > z[0] * T && p.x < z[1] * T;
      if (dentro && !S.mascara) p.vx *= 0.9;
      if (dentro && !z.vista) {
        z.vista = true;
        if (!S.mascara && !f.fumacaVista) { S.fumaca++; dano("fumaca"); avisar("Fumaça de queimada faz mal à saúde. Sem máscara, você perdeu fôlego. Com fumaça, o melhor é ficar em ambiente fechado."); }
        else if (!S.mascara && !f.avisouLento) { f.avisouLento = true; avisar("Mais fumaça. Sem máscara, você perde fôlego e anda mais devagar."); }
        else if (S.mascara && !f.fumacaVista) avisar("A máscara ajudou a atravessar a fumaça.");
        f.fumacaVista = true;
      }
    });

    /* partículas */
    f.parts = f.parts.filter(function (q) { q.vida--; q.x += q.vx || 0; q.y += q.vy || 0; if (q.tipo === "p") q.vy += 0.08; return q.vida > 0; });

    /* câmera e fim de fase */
    var alvoCam = Math.max(0, Math.min(p.x - 130 + p.face * 20, f.larg * T - W));
    S.cam += (alvoCam - S.cam) * 0.12;
    if (p.x >= f.fim * T) concluirFase();

    if (filaAvisos.length && quadro >= avisoAte) { var a = filaAvisos.shift(); aviso.textContent = a.txt; avisoAte = quadro + a.dur; }
    if (S.t % 10 === 0) hud();
  }

  function colisaoX(p) {
    var r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + p.h - 1) / T);
    if (p.vx > 0) { var c = Math.floor((p.x + p.w) / T); for (var r = r0; r <= r1; r++) if (solido(c, r)) { p.x = c * T - p.w - 0.01; p.vx = 0; } }
    else if (p.vx < 0) { var c2 = Math.floor(p.x / T); for (var r2 = r0; r2 <= r1; r2++) if (solido(c2, r2)) { p.x = (c2 + 1) * T + 0.01; p.vx = 0; } }
  }
  function colisaoY(p) {
    var c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 1) / T);
    p.chao = false;
    if (p.vy > 0) { var r = Math.floor((p.y + p.h) / T); for (var c = c0; c <= c1; c++) if (solido(c, r)) { p.y = r * T - p.h; p.vy = 0; p.chao = true; } }
    else if (p.vy < 0) { var r2 = Math.floor(p.y / T); for (var c2 = c0; c2 <= c1; c2++) if (solido(c2, r2)) { p.y = (r2 + 1) * T; p.vy = 0; } }
  }

  function dano(causa) {
    var p = S.p;
    if (causa !== "queda" && p.inv > 0) return;
    S.vidas--; p.inv = 90; SOM.dano();
    pontos(-20, p.x, p.y - 6);
    if (causa === "fogo") avisar("Você encostou no fogo e se feriu. Não chegue perto: afaste-se e avise o 193.");
    if (causa === "faisca") avisar("Uma faísca do fogo atingiu você. Fique longe do foco e avise o 193.");
    if (causa === "queda") avisar("Você caiu num buraco e voltou ao último marco da trilha.");
    if (causa === "arvore") avisar("Uma árvore queimada caiu sobre você. Depois do fogo, árvores enfraquecidas podem cair: passe longe.");
    hud();
    if (S.vidas <= 0) { if (causa === "fogo" || causa === "faisca") { S.morteFogo = true; finalizar(); } else perdeuFase(); }
  }

  function perdeuFase() {
    modo = "painel";
    Object.keys(S.snap).forEach(function (k) { S[k] = S.snap[k]; });
    S.vidas = 3;
    aviso.textContent = "Você perdeu as vidas nesta fase. Tente de novo do começo da fase.";
    sobre("Fim das vidas", "Tente a fase de novo", [["▶ Tentar de novo", function () { iniciarFase(S.fase); jogar(); }]]);
  }

  function concluirFase() {
    var f = fase(), fg = f.fogo;
    if (fg.ativo && !fg.avisado) S.semAviso++;
    SOM.fase();
    if (S.fase >= 2) { finalizar(); return; }
    modo = "painel"; filaAvisos = []; hudStatus.textContent = "";
    S.vidas = Math.min(3, S.vidas + 1);
    var deixados = avaliarDeixados(f);
    S.crise = deixados === 0 ? 0 : deixados < 5 ? 1 : 2;
    if (S.crise) S.fasesCrise++;
    var msg = fg.aparecido && fg.tiles.length ? (fg.avisado ? "Houve um foco e você avisou o 193." : "Houve um foco e ninguém avisou. O fogo ficou para trás, crescendo.") : "Nenhum foco nesta fase.";
    var aviCrise = S.crise === 2 ? " Ficou muita coisa para trás: a próxima fase começa com o Cerrado em chamas." : S.crise === 1 ? " Ficou coisa para trás: a próxima fase começa com fumaça e focos." : " Você não deixou nada para trás: a próxima fase começa protegida.";
    aviso.textContent = "Fase " + (S.fase + 1) + " concluída. " + msg + aviCrise + " Pontos: " + S.pontos + ". Próxima fase: " + fases[S.fase + 1].nome + ".";
    sobre("Fase " + (S.fase + 1) + " concluída!", "Pontos: " + S.pontos + " · Próxima: " + fases[S.fase + 1].nome + (S.crise === 2 ? "<br><strong style='color:#ff9a8a'>Ficou muita coisa para trás: o Cerrado está em chamas</strong>" : S.crise === 1 ? "<br><strong style='color:#ffd28a'>Ficou coisa para trás: há fumaça e focos à frente</strong>" : "<br><strong style='color:#b8f5a8'>Nada ficou para trás: caminho protegido</strong>"), [["▶ Próxima fase", function () { iniciarFase(S.fase + 1); jogar(); }]]);
  }

  var FINAIS = {
    bom: { titulo: "A Serra segue de pé", texto: "Nenhum foco começou no seu caminho. Você recolheu bitucas e lixo, varreu as folhas secas, descartou tudo no lugar certo e conversou com quem ia queimar, soltar balão ou acender fogueira. Cuidar do que é nosso começa antes do fogo." },
    medio: { titulo: "Foco contido a tempo", texto: "O fogo apareceu, mas você avisou o 193 na hora e ficou longe dele. Da próxima vez, recolha mais, varra as folhas e converse com quem vai usar fogo, para ele nem começar." },
    ruim: { titulo: "Depois do fogo", texto: "Algum foco ficou sem aviso ou o aviso demorou. O fogo cresceu. A fauna ficou sem ter para onde fugir e o solo ficou exposto à chuva." },
    perigo: { titulo: "Você se colocou em risco", texto: "Chegar perto do fogo põe a vida em perigo. A orientação é se afastar e avisar o 193, sem se colocar em risco." }
  };
  function calcularFinal() {
    if (S.morteFogo || S.danoFogo >= 3) return "perigo";
    if (S.focos === 0) return "bom";
    if (S.semAviso === 0 && S.tardes === 0) return "medio";
    return "ruim";
  }
  function finalizar() {
    modo = "final";
    var k = calcularFinal(); S.final = k;
    filaAvisos = []; aviso.textContent = "Fim de jogo: " + FINAIS[k].titulo + ". Pontos: " + S.pontos + ". Veja o resumo abaixo do jogo.";
    var vistos = guarda.ler("fsf-plat-finais", []);
    if (vistos.indexOf(k) < 0) { vistos.push(k); guarda.gravar("fsf-plat-finais", vistos); }
    var rec = guarda.ler("fsf-plat-recorde", 0), novo = S.pontos > rec;
    if (novo) guarda.gravar("fsf-plat-recorde", S.pontos);
    desenharFinal(k);
    var fi = FINAIS[k];
    var lista = "<ul class='resumo-escolhas'><li>Pontos: <strong>" + S.pontos + "</strong>" + (novo ? " (novo recorde neste aparelho!)" : " · recorde neste aparelho: " + rec) + "</li>" +
      "<li>Bitucas recolhidas: " + S.bitucas + " de " + S.bitucasTotal + "</li><li>Lixo recolhido (sacos, garrafas e papelão): " + S.lixo + " de " + S.lixoTotal + "</li>" +
      "<li>Montes de folhas secas varridos: " + S.folhas + " de " + S.folhasTotal + "</li>" +
      "<li>Itens descartados na lixeira ou no ecoponto: " + S.descartados + "</li><li>Conversas com quem ia queimar, soltar balão, acender fogueira ou jogar bituca: " + S.conversas + " de " + S.conversasTotal + "</li>" +
      "<li>Balões soltos: " + S.baloes + "</li><li>Focos de incêndio: " + S.focos + "</li>" +
      "<li>Avisos rápidos ao 193: " + S.rapidos + (S.tardes ? " · avisos atrasados: " + S.tardes : "") + (S.semAviso ? " · focos sem aviso: " + S.semAviso : "") + "</li>" +
      "<li>Denúncias feitas à Polícia Militar Ambiental: " + S.denuncias + "</li><li>No mirante, ficou longe e deixou os bombeiros trabalharem: " + (S.obsCerto ? "sim" : "não") + "</li>" +
      "<li>Vezes que o fogo ou uma faísca atingiu você: " + S.danoFogo + "</li><li>Fases que começaram com fumaça e focos por causa do que ficou para trás: " + S.fasesCrise + " de 2</li></ul>";
    var CONQ = [
      ["olho", "Olho vivo", "recolheu todas as bitucas", S.bitucas >= S.bitucasTotal],
      ["vassoura", "Vassoura de ouro", "varreu todos os montes de folhas", S.folhas >= S.folhasTotal],
      ["papo", "Boa de papo", "convenceu todo mundo que ia usar fogo", S.conversas >= S.conversasTotal],
      ["lugar", "Resíduo no lugar", "recolheu todo o lixo e descartou tudo", S.lixo >= S.lixoTotal && S.descartados >= S.bitucas + S.lixo + S.folhas],
      ["semfogo", "Nenhum foco", "nenhum foco começou no caminho", S.focos === 0],
      ["ligacao", "Ligação certa", "denunciou sem errar o número nem a fala", S.denuncias > 0 && S.denunciaErros === 0]
    ];
    var guardadas = guarda.ler("fsf-plat-conquistas", []);
    CONQ.forEach(function (q) { if (q[3] && guardadas.indexOf(q[0]) < 0) guardadas.push(q[0]); });
    guarda.gravar("fsf-plat-conquistas", guardadas);
    var cq = "<p style='font-weight:700;margin-top:10px'>Conquistas desta partida: " + CONQ.filter(function (q) { return q[3]; }).length + " de " + CONQ.length + " · neste aparelho: " + guardadas.length + " de " + CONQ.length + "</p><div class='finais-vistos'>" +
      CONQ.map(function (q) { return "<span class='" + (q[3] ? "visto" : "") + "' title='" + q[2] + "'>" + (q[3] ? "★ " : "☆ ") + q[1] + "</span>"; }).join("") + "</div>" +
      "<p class='foto-legenda'>" + CONQ.map(function (q) { return q[1] + ": " + q[2]; }).join(" · ") + ".</p>";
    var fv = cq + "<p style='font-weight:700;margin-top:6px'>Finais descobertos: " + vistos.length + " de 4</p><div class='finais-vistos'>" +
      ["bom", "medio", "ruim", "perigo"].map(function (x) { return "<span class='" + (vistos.indexOf(x) > -1 ? "visto" : "") + "'>" + (vistos.indexOf(x) > -1 ? FINAIS[x].titulo : "?") + "</span>"; }).join("") + "</div>";
    mostrarPainel("<div class='final " + k + "' data-final='" + k + "'><p class='selo-final' id='plat-final-titulo' tabindex='-1'>" + fi.titulo + "</p><p>" + fi.texto + "</p>" + lista + fv + "</div>",
      [["Jogar de novo", function () { novoJogo(); jogar(); }]]);
    S.resumoHtml = "<div class='final " + k + "'><p class='selo-final'>" + fi.titulo + "</p><p>" + fi.texto + "</p>" + lista + fv + "</div>";
    sobre(fi.titulo, "Pontos: " + S.pontos + (novo ? " · novo recorde!" : ""), [["▶ Jogar de novo", function () { novoJogo(); jogar(); }], ["Ver resumo", abrirResumo]]);
  }

  /* Resumo do fim de jogo numa janela por cima do jogo */
  function abrirResumo() {
    if (!S || !S.resumoHtml) return;
    S.resumoAberto = true;
    modalEl.hidden = false; modalCaixa.className = "plat-modal-caixa obs resumo";
    modalCaixa.innerHTML = "<p class='obs-etiqueta'>Resumo da partida</p>" + S.resumoHtml;
    var ac = el("div", "acoes");
    var de = el("button", "botao", "▶ Jogar de novo"); de.type = "button"; de.addEventListener("click", function () { fecharResumo(); novoJogo(); jogar(); });
    var fe = el("button", "botao secundario", "Fechar"); fe.type = "button"; fe.addEventListener("click", function () { fecharResumo(); var b = sobreEl.querySelector("button"); if (b) b.focus({ preventScroll: true }); });
    ac.appendChild(de); ac.appendChild(fe); modalCaixa.appendChild(ac);
    modalCaixa.scrollTop = 0; fe.focus({ preventScroll: true });
  }
  function fecharResumo() { S.resumoAberto = false; modalEl.hidden = true; modalCaixa.innerHTML = ""; }
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && S && S.resumoAberto) { ev.preventDefault(); fecharResumo(); } });
  modalEl.addEventListener("click", function (ev) { if (ev.target === modalEl && S && S.resumoAberto) fecharResumo(); });

  /* ---------- Janela por cima da página: celular e mirante ---------- */
  var CONTATOS = [["Corpo de Bombeiros", "193"], ["Polícia Militar Ambiental", "(67) 3247-5871"], ["Defesa Civil Estadual", "(67) 99607-1525"], ["Disque Denúncia Estadual", "181"]];
  var PMA = "6732475871", PMA_LOCAL = "32475871";
  function abrirModal(classe) {
    modo = "modal"; entrada.esq = entrada.dir = entrada.pulo = entrada.agir = false;
    modalEl.hidden = false; modalCaixa.className = "plat-modal-caixa " + classe; modalCaixa.innerHTML = "";
  }
  function fecharModal() { modalEl.hidden = true; modalCaixa.innerHTML = ""; S.celular = null; S.obs = null; S.prod = null; jogar(); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function celularPMA(origem) {
    if (modo !== "jogando") return;
    S.celular = { origem: origem, etapa: "discar", numero: "", erros: 0 };
    SOM.tel();
    abrirModal("celular");
    desenharCelular("Você viu " + origem.quem + " jogar uma bituca acesa no capim seco. Ligue para a Polícia Militar Ambiental e conte o que aconteceu.");
  }
  function desenharCelular(msg) {
    var c = S.celular; modalCaixa.innerHTML = "";
    var topo = el("div", "cel-topo"); topo.appendChild(el("span", null, "Celular")); topo.appendChild(el("span", null, "Denúncia")); modalCaixa.appendChild(topo);
    var tela = el("div", "cel-tela");
    var m = el("p", "cel-msg", msg); m.id = "cel-msg"; m.setAttribute("aria-live", "polite"); tela.appendChild(m);
    var visor = el("output", "cel-visor vazio", "Digite o número"); visor.id = "cel-visor"; visor.setAttribute("aria-live", "polite"); tela.appendChild(visor);
    modalCaixa.appendChild(tela);
    var tec = el("div", "cel-teclado");
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Apagar", "0", "Agenda"].forEach(function (k) {
      var b = el("button", "cel-tecla" + (k.length > 1 ? " txt" : ""), k); b.type = "button"; b.setAttribute("data-k", k);
      b.addEventListener("click", function () { if (k === "Apagar") apagar(); else if (k === "Agenda") agenda(); else digitar(k); });
      tec.appendChild(b);
    });
    modalCaixa.appendChild(tec);
    var ac = el("div", "cel-acoes");
    var des = el("button", "cel-desligar", "Desligar"); des.type = "button"; des.addEventListener("click", desligarSemDenunciar);
    var lig = el("button", "cel-ligar", "Ligar"); lig.type = "button"; lig.addEventListener("click", ligar);
    ac.appendChild(des); ac.appendChild(lig); modalCaixa.appendChild(ac);
    modalCaixa.appendChild(el("p", "cel-dica", "Siga a tecla que acende: ela mostra, um por um, o número da Polícia Militar Ambiental. No computador: digite os números, Backspace apaga e Enter liga."));
    tec.querySelector("button").focus();
    guiaTeclas();
  }
  /* Guia: acende a próxima tecla do número da PMA; se errar, acende Apagar; completo, acende Ligar */
  function guiaTeclas() {
    var c = S.celular; if (!c) return;
    Array.prototype.forEach.call(modalCaixa.querySelectorAll(".guia"), function (x) { x.classList.remove("guia"); x.removeAttribute("aria-description"); });
    if (c.etapa !== "discar") return;
    var n = c.numero, alvo = null;
    if (n === PMA || n === PMA_LOCAL) alvo = modalCaixa.querySelector(".cel-ligar");
    else if (PMA.indexOf(n) === 0) alvo = modalCaixa.querySelector('[data-k="' + PMA.charAt(n.length) + '"]');
    else alvo = modalCaixa.querySelector('[data-k="Apagar"]');
    if (alvo) { alvo.classList.add("guia"); alvo.setAttribute("aria-description", "próxima tecla"); }
  }
  function formatar(n) { if (n.length >= 10) return "(" + n.slice(0, 2) + ") " + n.slice(2, 6) + "-" + n.slice(6); if (n.length > 4) return n.slice(0, n.length - 4) + "-" + n.slice(-4); return n; }
  function atualizaVisor() { var v = $("cel-visor"); if (!v) return; var n = S.celular.numero; v.textContent = n ? formatar(n) : "Digite o número"; v.classList.toggle("vazio", !n); guiaTeclas(); }
  function digitar(d) { var c = S.celular; if (!c || c.etapa !== "discar" || c.numero.length >= 11) return; c.numero += d; atualizaVisor(); tom([700 + Number(d) * 40], 0.05); }
  function apagar() { var c = S.celular; if (!c || c.etapa !== "discar") return; c.numero = c.numero.slice(0, -1); atualizaVisor(); }
  function agenda() {
    var c = S.celular, m = $("cel-msg");
    var velha = modalCaixa.querySelector(".cel-agenda"); if (velha) { velha.remove(); return; }
    var lista = el("div", "cel-agenda"); lista.setAttribute("role", "group"); lista.setAttribute("aria-label", "Agenda com os canais da campanha");
    CONTATOS.forEach(function (ct) {
      var b = el("button", "cel-contato"); b.type = "button";
      b.appendChild(el("strong", null, ct[0])); b.appendChild(el("span", null, ct[1]));
      b.addEventListener("click", function () { c.numero = ct[1].replace(/\D/g, ""); lista.remove(); atualizaVisor(); m.textContent = "Número de " + ct[0] + " no visor. Confira e aperte Ligar."; var lg = modalCaixa.querySelector(".cel-ligar"); if (lg) lg.focus(); });
      lista.appendChild(b);
    });
    modalCaixa.querySelector(".cel-tela").appendChild(lista);
    m.textContent = "Agenda: os canais de denúncia da campanha. Escolha o certo.";
    lista.querySelector("button").focus();
  }
  function ligar() {
    var c = S.celular, m = $("cel-msg"), n = c.numero;
    if (c.etapa !== "discar") return;
    if (!n) { m.textContent = "Digite o número ou abra a Agenda."; return; }
    if (n === PMA || n === PMA_LOCAL) {
      c.etapa = "chamando"; SOM.tel(); m.textContent = "Chamando a Polícia Militar Ambiental...";
      setTimeout(function () { if (S.celular === c) conversa(); }, 900);
      return;
    }
    c.erros++;
    if (n === "193") m.textContent = "193 é o Corpo de Bombeiros, para quando há fogo. Aqui ainda não há fogo: alguém jogou uma bituca. Ligue para a Polícia Militar Ambiental.";
    else if (n === "181") m.textContent = "O Disque Denúncia também é um canal de denúncia da campanha. Neste evento, ligue para a Polícia Militar Ambiental.";
    else m.textContent = "Número errado. Abra a Agenda e veja o número da Polícia Militar Ambiental.";
    c.numero = ""; atualizaVisor(); SOM.dano();
  }
  var FALAS = [
    { t: "Vi uma pessoa jogar uma bituca acesa no capim seco, aqui na trilha. Estou longe e em segurança.", certo: true },
    { t: "Alô? Ah, foi engano, desculpa.", r: "A denúncia não foi feita. Conte o que aconteceu." },
    { t: "Tem alguém jogando bituca, mas não sei dizer onde.", r: "Sem o lugar, a equipe não sabe aonde ir. Diga onde você viu." },
    { t: "Vou correr atrás da pessoa para tirar satisfação!", r: "Não. Não se coloque em risco. Conte o que viu e deixe a polícia agir." }
  ];
  function conversa() {
    var c = S.celular; c.etapa = "falar";
    var m = $("cel-msg"); m.textContent = "Polícia Militar Ambiental, pode falar. O que você quer informar?";
    ["cel-teclado", "cel-agenda", "cel-dica", "cel-ligar"].forEach(function (k) { var x = modalCaixa.querySelector("." + k); if (x) x.remove(); });
    var ops = el("div", "cel-falas"); ops.setAttribute("role", "group"); ops.setAttribute("aria-label", "O que você diz");
    FALAS.slice().sort(function () { return Math.random() - 0.5; }).forEach(function (fl) {
      var b = el("button", "cel-fala", fl.t); b.type = "button"; if (fl.certo) b.setAttribute("data-certa", "");
      b.addEventListener("click", function () {
        if (fl.certo) { concluirDenuncia(); return; }
        c.erros++; m.textContent = fl.r; b.disabled = true; SOM.dano();
      });
      ops.appendChild(b);
    });
    modalCaixa.insertBefore(ops, modalCaixa.querySelector(".cel-acoes"));
    ops.querySelector("button").focus();
  }
  function concluirDenuncia() {
    var c = S.celular, f = fase();
    S.denuncias++; S.denunciaErros += c.erros; SOM.fase();
    var ganho = c.erros ? 30 : 60;
    pontos(ganho, S.p.x, S.p.y - 14, "+" + ganho + " denúncia");
    f.viatura = { x: S.cam + W + 20, alvo: c.origem.x, fase: 0, t: 0, ref: c.origem.ref || null, quem: c.origem.quem };
    c.etapa = "fim";
    modalCaixa.innerHTML = "";
    var tela = el("div", "cel-tela"); tela.appendChild(el("p", "cel-msg", "Obrigado pela denúncia. Uma equipe da Polícia Militar Ambiental vai até o local.")); modalCaixa.appendChild(tela);
    var ac = el("div", "cel-acoes"); var ok = el("button", "cel-ligar", "Voltar ao jogo"); ok.type = "button"; ok.addEventListener("click", fecharModal); ac.appendChild(ok); modalCaixa.appendChild(ac);
    ok.focus();
  }
  function desligarSemDenunciar() {
    avisar("Você desligou sem denunciar. Ainda dá para recolher a bituca antes que vire foco.");
    fecharModal();
  }

  var OBS = [
    { t: "Fico aqui, longe do fogo, e deixo os bombeiros trabalharem.", certo: true, r: "Isso. Quem não é bombeiro ajuda ficando longe, sem se colocar em risco. Depois do fogo, o solo fica exposto e a vegetação do Cerrado leva décadas para se recuperar." },
    { t: "Desço até lá para ajudar a apagar.", r: "Não. Chegar perto do fogo põe a sua vida em risco e atrapalha o combate. A orientação é se afastar." },
    { t: "Vou mais perto para filmar e postar.", r: "Não. A fumaça faz mal à saúde e você se coloca em risco. Fique longe." }
  ];
  function observacao() {
    S.obs = { erros: 0 };
    abrirModal("obs");
    modalCaixa.appendChild(el("p", "obs-etiqueta", "Ponto de observação"));
    var h = el("h3", "obs-titulo", "Lá longe, o morro está queimando"); h.id = "plat-modal-titulo"; modalCaixa.appendChild(h);
    modalCaixa.appendChild(el("p", null, "Este incêndio começou antes de você chegar, e os bombeiros estão no combate. Só em 2026, até 15 de julho, o Corpo de Bombeiros de Mato Grosso do Sul atendeu 1.170 ocorrências de incêndio em vegetação."));
    modalCaixa.appendChild(el("p", "obs-fonte", "Fonte: Informativo nº 01/CICOE-PEMIF/2026, Cemtec e Asbom."));
    modalCaixa.appendChild(el("p", "obs-pergunta", "O que você faz?"));
    var r = el("p", "obs-retorno"); r.setAttribute("aria-live", "polite");
    var ops = el("div", "obs-opcoes");
    OBS.forEach(function (o) {
      var b = el("button", "obs-opcao", o.t); b.type = "button"; if (o.certo) b.setAttribute("data-certa", "");
      b.addEventListener("click", function () {
        r.textContent = o.r; r.className = "obs-retorno " + (o.certo ? "certo" : "errado");
        if (!o.certo) { S.obs.erros++; b.disabled = true; SOM.dano(); return; }
        S.obsCerto = 1; SOM.pega(); pontos(S.obs.erros ? 10 : 20, S.p.x, S.p.y - 14);
        Array.prototype.forEach.call(ops.querySelectorAll("button"), function (x) { x.disabled = true; });
        var seg = el("button", "botao", "Continuar a trilha"); seg.type = "button"; seg.addEventListener("click", fecharModal);
        modalCaixa.appendChild(seg); seg.focus();
      });
      ops.appendChild(b);
    });
    modalCaixa.appendChild(ops); modalCaixa.appendChild(r);
    ops.querySelector("button").focus();
  }
  var PROD = [
    { t: "Hoje não: está seco e ventando. Fogo só com autorização do órgão ambiental e com os cuidados necessários.", certo: true, r: "Isso. A campanha orienta usar o fogo apenas quando autorizado e com os cuidados necessários. Com tempo seco e vento, o fogo foge do controle." },
    { t: "Pode queimar, eu fico olhando daqui.", r: "Não. Ficar olhando não controla o fogo. Sem autorização e sem cuidados, a queimada pode escapar para o Cerrado." },
    { t: "Queima à noite, que ninguém vê.", r: "Não. Esconder não diminui o risco, e fogo sem autorização é irregular. A orientação é usar o fogo só quando autorizado." },
    { t: "Faz um aceiro e queima tudo agora mesmo.", r: "Ainda não. Cuidado sozinho não basta: sem autorização do órgão ambiental, a queima não pode ser feita." }
  ];
  function conversaProdutor(e) {
    S.prod = { erros: 0, ok: false, e: e };
    abrirModal("obs");
    modalCaixa.appendChild(el("p", "obs-etiqueta", "Conversa no sítio"));
    var h = el("h3", "obs-titulo", "“Vou limpar o pasto com fogo hoje”"); h.id = "plat-modal-titulo"; modalCaixa.appendChild(h);
    modalCaixa.appendChild(el("p", null, "O produtor juntou o capim seco e quer pôr fogo agora. O dia está seco e o vento não para. Queimada mal controlada é uma das três causas recorrentes de incêndio que o projeto da campanha aponta em Figueirão."));
    modalCaixa.appendChild(el("p", "obs-fonte", "Fontes: projeto da Ação 04; folder da campanha."));
    modalCaixa.appendChild(el("p", "obs-pergunta", "O que você diz?"));
    var r = el("p", "obs-retorno"); r.setAttribute("aria-live", "polite");
    var ops = el("div", "obs-opcoes");
    PROD.slice().sort(function () { return Math.random() - 0.5; }).forEach(function (o) {
      var b = el("button", "obs-opcao", o.t); b.type = "button"; if (o.certo) b.setAttribute("data-certa", "");
      b.addEventListener("click", function () {
        r.textContent = o.r; r.className = "obs-retorno " + (o.certo ? "certo" : "errado");
        if (!o.certo) { S.prod.erros++; b.disabled = true; SOM.dano(); return; }
        S.prod.ok = true; e.conv = true; S.conversas++; SOM.pega(); pontos(S.prod.erros ? 20 : 40, e.x, e.y - 8);
        avisar("O produtor desistiu de queimar hoje. Conversar antes evita o foco.");
        Array.prototype.forEach.call(ops.querySelectorAll("button"), function (x) { x.disabled = true; });
        var seg = el("button", "botao", "Continuar"); seg.type = "button"; seg.addEventListener("click", fecharModal);
        modalCaixa.appendChild(seg); seg.focus();
      });
      ops.appendChild(b);
    });
    var sair = el("button", "botao secundario", "Sair da conversa"); sair.type = "button"; sair.style.justifySelf = "start";
    sair.addEventListener("click", function () { if (!S.prod.ok) avisar("Você saiu sem convencer o produtor. Volte e aperte Agir para conversar de novo."); fecharModal(); });
    modalCaixa.appendChild(ops); modalCaixa.appendChild(r); modalCaixa.appendChild(sair);
    ops.querySelector("button").focus();
  }

  document.addEventListener("keydown", function (ev) {
    if (modo !== "modal" || modalEl.hidden) return;
    if (ev.key === "Escape") { ev.preventDefault(); if (S.celular) desligarSemDenunciar(); else if (S.prod) fecharModal(); else if (S.obs && S.obsCerto) fecharModal(); return; }
    var c = S.celular; if (!c || c.etapa !== "discar") return;
    if (/^[0-9]$/.test(ev.key)) { ev.preventDefault(); digitar(ev.key); }
    else if (ev.key === "Backspace") { ev.preventDefault(); apagar(); }
    else if (ev.key === "Enter" && !(ev.target && ev.target.tagName === "BUTTON" && !ev.target.classList.contains("cel-tecla"))) { ev.preventDefault(); ligar(); }
  });

  function sobre(titulo, texto, botoes) {
    sobreEl.hidden = false;
    sobreEl.innerHTML = '<p class="sobre-titulo">' + titulo + '</p><p class="sobre-texto">' + texto + "</p>";
    var ac = document.createElement("div"); ac.className = "sobre-acoes";
    botoes.forEach(function (b, i) {
      var bt = document.createElement("button"); bt.type = "button"; bt.className = "sobre-botao" + (i ? " sec" : ""); bt.textContent = b[0];
      bt.addEventListener("click", b[1]); ac.appendChild(bt);
    });
    sobreEl.appendChild(ac);
    var r = canvas.getBoundingClientRect();
    if (r.top < 60 || r.bottom > window.innerHeight) { try { $("plat").scrollIntoView({ block: "start", behavior: "instant" }); } catch (e) { $("plat").scrollIntoView(); } }
    var pri = sobreEl.querySelector("button"); if (pri) pri.focus({ preventScroll: true });
  }
  function mostrarPainel(html, botoes) {
    painel.hidden = false;
    painel.innerHTML = html;
    var ac = document.createElement("div"); ac.className = "acoes";
    botoes.forEach(function (b, i) {
      var bt = document.createElement("button"); bt.type = "button"; bt.className = "botao" + (i ? " secundario" : ""); bt.textContent = b[0];
      bt.addEventListener("click", b[1]); ac.appendChild(bt);
    });
    painel.appendChild(ac);
    hud();
  }

  /* ---------- Desenho ---------- */
  var COR = {
    ceu: "#8fd0f2", ceu2: "#dff4ff", serra: "#2f7d4a", serra2: "#3f9a5a", grama: "#48b46e", grama2: "#2f8a3e", grama3: "#7ccf8f", terra: "#a0522d", terra2: "#7a3e1f",
    estrada: "#d39a5f", estrada2: "#b97c44", pedra: "#c66a3a", pedra2: "#e08a50", pedra3: "#8a4424", cupim: "#a8672f", cupim2: "#7d4a1f",
    tronco: "#6b4423", copa: "#2e8b3e", copa2: "#48b46e", casa: "#f2e6c9", telhado: "#b5462e", capim: "#d9c06a", solta: "#c27a45", solta2: "#8f5530"
  };
  function ret(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

  function nuvem(x, y) { ret(x + 4, y, 16, 4, "#ffffff"); ret(x, y + 4, 28, 5, "#ffffff"); ret(x + 2, y + 9, 22, 2, "#e6f3fb"); }
  function fundo(f, queimado) {
    var cam = S.cam;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    var cr = f.crise || 0;
    g.addColorStop(0, queimado ? "#8f7f70" : cr === 2 ? "#9a7a62" : cr === 1 ? "#c9a27a" : (f.secas ? "#e8c58a" : COR.ceu)); g.addColorStop(1, queimado ? "#cdb59a" : cr === 2 ? "#d9a070" : cr === 1 ? "#ecc89a" : (f.secas ? "#f6e3b8" : COR.ceu2));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (!queimado) { ret(268, 14, 14, 14, f.crise ? "#ff7a3a" : f.secas ? "#ffb347" : "#ffe680"); ret(270, 12, 10, 18, f.crise ? "#ff7a3a" : f.secas ? "#ffb347" : "#ffe680"); }
    if (!queimado) for (var n = 0; n < 4; n++) { var nx = ((n * 110 - cam * 0.1 - quadro * 0.05) % 440 + 440) % 440 - 40; nuvem(nx, 18 + (n % 2) * 16); }
    var off = -(cam * 0.2) % 160;
    ctx.fillStyle = queimado ? "#4a4038" : f.crise === 2 ? "#4f5a3a" : f.crise === 1 ? "#3f6f45" : COR.serra;
    for (var k = -1; k < 4; k++) {
      var bx = off + k * 160;
      ctx.beginPath(); ctx.moveTo(bx, 145); ctx.lineTo(bx, 110); ctx.lineTo(bx + 50, 62); ctx.lineTo(bx + 80, 70); ctx.lineTo(bx + 120, 50); ctx.lineTo(bx + 160, 110); ctx.lineTo(bx + 160, 145); ctx.closePath(); ctx.fill();
    }
    if (f.tema === "serra" || queimado) {
      var px = queimado ? 230 : 300 - cam * 0.25 + 260;
      ret(px, 50, 12, 46, queimado ? "#6b5446" : "#b8643a"); ret(px - 2, 48, 16, 6, queimado ? "#5a463a" : "#c97a48"); ret(px + 2, 44, 6, 4, queimado ? "#333" : "#3f9a5a");
    }
    ctx.fillStyle = queimado ? "#5c4f44" : f.crise === 2 ? "#5e6440" : f.crise === 1 ? "#4f8a52" : COR.serra2;
    var off2 = -(cam * 0.35) % 120;
    for (var j = -1; j < 5; j++) { var cx = off2 + j * 120; ctx.beginPath(); ctx.moveTo(cx, 145); ctx.lineTo(cx, 120); ctx.lineTo(cx + 40, 88); ctx.lineTo(cx + 90, 96); ctx.lineTo(cx + 120, 120); ctx.lineTo(cx + 120, 145); ctx.closePath(); ctx.fill(); }
  }

  function arvore(x, queimado) {
    var y = 9 * T, tr = queimado ? "#2a2522" : COR.tronco;
    ret(x + 7, y - 26, 3, 26, tr); ret(x + 4, y - 22, 4, 2, tr); ret(x + 10, y - 18, 4, 2, tr); ret(x + 3, y - 24, 2, 3, tr); ret(x + 13, y - 20, 2, 3, tr);
    if (queimado) { ret(x + 2, y - 30, 3, 2, tr); ret(x + 12, y - 32, 3, 2, tr); return; }
    ret(x - 3, y - 34, 24, 9, COR.copa); ret(x, y - 38, 18, 5, COR.copa2); ret(x + 2, y - 33, 6, 2, COR.grama3); ret(x + 12, y - 36, 4, 2, COR.grama3); ret(x - 3, y - 26, 24, 1, COR.grama2);
  }
  function chamaCopa(x) {
    var y = 9 * T, k = quadro % 12;
    ret(x - 1, y - 36 + (k > 6 ? 1 : 0), 5, 6, "#ff6a1f"); ret(x + 6, y - 40 + (k > 3 ? 2 : 0), 5, 8, "#ff3b1f"); ret(x + 13, y - 35 + (k > 8 ? 1 : 0), 5, 6, "#ff6a1f");
    ret(x + 1, y - 33, 2, 3, "#ffe14a"); ret(x + 8, y - 36 + (k % 3), 2, 4, "#ffe14a"); ret(x + 14, y - 32, 2, 2, "#ffe14a");
    ctx.fillStyle = "rgba(90,85,80,.4)"; for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + 8 + Math.sin((quadro + i * 25 + x) / 20) * 4, y - 46 - i * 9 - (quadro % 30) / 6, 5 + i * 2, 0, 7); ctx.fill(); }
  }
  function capimQueimado(x) { var y = 9 * T; for (var i = 0; i < 6; i++) ret(x + i * 3, y - 3 - (i % 2), 1, 3 + (i % 2), i % 3 ? "#2a2420" : "#4a3a2e"); }
  function casa(x, cor) { var y = 9 * T; ret(x, y - 26, 34, 26, cor || COR.casa); ctx.fillStyle = COR.telhado; ctx.beginPath(); ctx.moveTo(x - 4, y - 26); ctx.lineTo(x + 17, y - 40); ctx.lineTo(x + 38, y - 26); ctx.closePath(); ctx.fill(); ret(x + 6, y - 18, 8, 8, "#7fb3d5"); ret(x + 9, y - 18, 1, 8, "#5d8fb0"); ret(x + 21, y - 16, 8, 16, "#8a5a32"); ret(x + 27, y - 9, 1, 1, "#f3f436"); }
  function capim(x) { var y = 9 * T; for (var i = 0; i < 6; i++) ret(x + i * 3, y - 5 - (i % 2) * 3, 1, 5 + (i % 2) * 3, i % 3 ? COR.capim : "#bfa24d"); }
  function tatu(x) { var y = 9 * T; ret(x, y - 7, 14, 6, "#8c7b6a"); ret(x + 2, y - 8, 10, 2, "#a89584"); for (var i = 0; i < 4; i++) ret(x + 3 + i * 3, y - 7, 1, 6, "#6e5f50"); ret(x + 14, y - 5, 4, 3, "#8c7b6a"); ret(x + 2, y - 1, 2, 1, "#5b4c3e"); ret(x + 10, y - 1, 2, 1, "#5b4c3e"); }
  function seriema(x) { var y = 9 * T, b = Math.floor(quadro / 30) % 2; ret(x + 4, y - 9, 1, 9, "#d16a2a"); ret(x + 8, y - 9, 1, 9, "#d16a2a"); ret(x + 1, y - 16, 12, 7, "#b8a99a"); ret(x + 10, y - 23 + b, 3, 8, "#b8a99a"); ret(x + 10, y - 26 + b, 5, 4, "#c9bdb0"); ret(x + 15, y - 25 + b, 3, 1, "#d12a2a"); ret(x + 11, y - 28 + b, 1, 3, "#8c7b6a"); ret(x + 13, y - 25 + b, 1, 1, "#000"); }
  function tamandua(x) { var y = 9 * T; ret(x + 4, y - 10, 16, 8, "#5b5048"); ret(x + 4, y - 7, 14, 2, "#e9e2d6"); ret(x + 20, y - 7, 8, 3, "#5b5048"); ret(x - 2, y - 13, 8, 6, "#3e3630"); ret(x + 6, y - 2, 2, 2, "#2b2520"); ret(x + 16, y - 2, 2, 2, "#2b2520"); }
  function placa(x) { var y = 9 * T; ret(x + 6, y - 22, 3, 22, "#6b4423"); ret(x - 2, y - 26, 20, 10, "#8a5a32"); ctx.fillStyle = "#f3f436"; ctx.beginPath(); ctx.moveTo(x + 3, y - 23); ctx.lineTo(x + 11, y - 23); ctx.lineTo(x + 11, y - 25); ctx.lineTo(x + 15, y - 21); ctx.lineTo(x + 11, y - 17); ctx.lineTo(x + 11, y - 19); ctx.lineTo(x + 3, y - 19); ctx.closePath(); ctx.fill(); }
  function pedraBonita(x, queimado) {
    var y = 9 * T;
    ret(x - 10, y - 14, 60, 14, queimado ? "#3e3630" : "#2f8a3e");
    ret(x + 8, y - 70, 24, 58, queimado ? "#6b5446" : "#b8643a"); ret(x + 26, y - 70, 6, 58, queimado ? "#5a463a" : "#9a5230");
    ret(x + 5, y - 74, 30, 8, queimado ? "#5a463a" : "#c97a48");
    for (var i = 0; i < 5; i++) ret(x + 8, y - 64 + i * 10, 24, 2, queimado ? "#4a3a30" : "#8a4424");
    if (!queimado) { ret(x + 12, y - 78, 10, 4, "#3f9a5a"); ret(x + 16, y - 81, 4, 3, "#48b46e"); }
  }

  var DIG = { "1": ["010", "110", "010", "010", "111"], "9": ["111", "101", "111", "001", "111"], "3": ["111", "001", "111", "001", "111"] };
  function texto193(x, y, cor) { "193".split("").forEach(function (d, i) { DIG[d].forEach(function (l, r) { for (var k = 0; k < 3; k++) if (l[k] === "1") ret(x + i * 4 + k, y + r, 1, 1, cor); }); }); }

  function tiles(f) {
    var c0 = Math.floor(S.cam / T), c1 = c0 + Math.ceil(W / T) + 1, cam = Math.round(S.cam);
    for (var r = 0; r < LINHAS; r++) for (var c = c0; c <= c1; c++) {
      var t = tile(c, r); if (t === ".") continue;
      var x = c * T - cam, y = r * T;
      if (t === "#") {
        var topo = tile(c, r - 1) === "." || tile(c, r - 1) === "X";
        if (f.tema === "estrada") { ret(x, y, T, T, topo ? COR.estrada : COR.terra); if (topo) { ret(x, y + 12, T, 4, COR.terra); ret(x + (c * 7) % 12, y + 4, 2, 1, COR.estrada2); ret(x + (c * 5) % 10 + 3, y + 8, 3, 1, COR.estrada2); } }
        else {
          ret(x, y, T, T, COR.terra);
          var qm = f.crise && ((c * 7 + 3) % 5) < f.crise * 2;
          if (topo && qm) { ret(x, y, T, 4, "#3a302a"); ret(x, y + 4, T, 1, "#2a2420"); ret(x + (c * 5) % 13, y - 1, 1, 1, "#1e1a17"); if ((c + Math.floor(quadro / 12)) % 7 === 0) ret(x + (c * 3) % 12, y + 1, 2, 1, "#ff6a1f"); }
          else if (topo) { ret(x, y, T, 4, f.crise ? "#7a9a4a" : COR.grama); ret(x, y + 4, T, 1, COR.grama2); ret(x + (c * 5) % 13, y - 2, 1, 2, COR.grama); ret(x + (c * 11) % 13, y - 1, 1, 1, COR.grama3); }
        }
        ret(x + (c * 3 + r * 5) % 13, y + 8 + (c % 3), 2, 2, COR.terra2);
      } else if (t === "B") {
        ret(x, y, T, T, COR.pedra); ret(x, y, T, 2, COR.pedra2); ret(x, y + 14, T, 2, COR.pedra3); ret(x + 4 + (c % 3) * 3, y + 6, 5, 1, COR.pedra3); ret(x + 15, y, 1, T, COR.pedra3);
      } else if (t === "X") {
        var st = f.terra[c + "," + r];
        if (st && st.caiu) continue;
        var tr = st ? (st.t % 4 < 2 ? 1 : -1) : 0;
        ret(x + tr, y, T, 8, COR.solta); ret(x + tr, y + 6, T, 2, COR.solta2); ret(x + 3 + tr, y + 2, 2, 1, COR.solta2); ret(x + 10 + tr, y + 4, 3, 1, COR.solta2);
        if (st) { ret(x + 5, y + 8 + (st.t % 6), 2, 2, COR.solta2); ret(x + 11, y + 9 + (st.t % 5), 1, 1, COR.solta2); }
      } else if (t === "C") {
        var base = tile(c, r + 1) !== "C";
        ctx.fillStyle = COR.cupim; ctx.beginPath();
        if (tile(c, r - 1) === "C") ctx.rect(x + 1, y, 14, 16); else { ctx.moveTo(x + 1, y + 16); ctx.lineTo(x + 3, y + 4); ctx.lineTo(x + 8, y); ctx.lineTo(x + 13, y + 4); ctx.lineTo(x + 15, y + 16); }
        ctx.closePath(); ctx.fill();
        ret(x + 5, y + 7, 2, 2, COR.cupim2); ret(x + 9, y + 11, 2, 2, COR.cupim2); ret(x + 11, y + 4, 1, 10, COR.cupim2);
        if (base) ret(x, y + 14, T, 2, COR.cupim2);
      }
    }
  }

  /* Personagem principal em pixel art (12 x 16) */
  var HEROI = {
    pal: { G: "#1f6616", g: "#3a9a2c", s: "#8d5524", d: "#023118", y: "#f3f436", Y: "#c9c92a", p: "#1f3d2b", b: "#3b2a1a", w: "#ffffff" },
    corpo: ["...GGGGG....", "..GgggggG...", "..GGGGGGGGGG", "..dsssssd...", "..ssssdss...", "..sssssss...", "...dsssd....", "..yyyyyyy...", ".syyyyyyys..", ".syyYyyyys..", "..yyyyyyy...", "..ppppppp..."],
    pernas: [["..ppp.ppp...", "..pp...pp...", "..bb...bb...", "............"], ["...pp.pp....", "...pp.pp....", "...bb.bb....", "............"], ["..pp....pp..", ".pp......pp.", ".bb......bb.", "............"]]
  };
  function desenharHeroi(x, y, face, quadroPernas) {
    var linhas = HEROI.corpo.concat(HEROI.pernas[quadroPernas]);
    for (var r = 0; r < linhas.length; r++) for (var c = 0; c < 12; c++) {
      var ch = linhas[r][c]; if (ch === ".") continue;
      var cx = face > 0 ? c : 11 - c;
      ret(x + cx, y + r, 1, 1, HEROI.pal[ch]);
    }
  }
  function sacola(x, y, face, n) {
    if (!n) return;
    var tam = Math.min(4, 1 + Math.floor(n / 2)), sx = face > 0 ? x - 2 - tam : x + 12, sy = y + 6 - tam;
    ret(sx, sy, 4 + tam, 6 + tam, "#e8e0c8"); ret(sx, sy, 4 + tam, 1, "#b8ad8c"); ret(sx + 1, sy + 2, 2 + tam, 1, "#c9bf9e");
    ret(face > 0 ? sx + 3 + tam : sx - 1, sy + 1, 2, 1, "#8a7a5a");
  }

  function vassoura(x, y, face, t) {
    var lado = Math.floor(t / 4) % 2, bx = face > 0 ? x + 11 + lado * 2 : x - 2 - lado * 2;
    for (var i = 0; i < 7; i++) ret(bx + (face > 0 ? i : -i) * 0.5 + (face > 0 ? 0 : 0), y + 7 + i, 1, 1, "#8a5a32");
    ret(face > 0 ? bx + 2 : bx - 5, y + 14, 5, 2, "#e0b04a"); ret(face > 0 ? bx + 2 : bx - 5, y + 13, 5, 1, "#c98a2e");
  }
  function pessoa(x, y, face, camisa, pele, bone, passo) {
    var d = face > 0 ? 0 : 1, fx = function (a, w) { return d ? x + 12 - a - w : x + a; };
    if (bone) { ret(fx(2, 8), y, 8, 3, bone); ret(fx(8, 3), y + 2, 3, 1, bone); } else ret(fx(3, 6), y + 1, 6, 2, "#3b2a1a");
    ret(fx(3, 6), y + 3, 6, 5, pele); ret(fx(7, 1), y + 5, 1, 1, "#111");
    ret(fx(2, 8), y + 8, 8, 4, camisa); ret(fx(1, 1), y + 8, 1, 3, pele); ret(fx(10, 1), y + 8, 1, 3, pele);
    ret(fx(3, 6), y + 12, 6, 2, "#023118");
    var a = Math.floor(passo / 6) % 2;
    ret(fx(3, 2), y + 14 - (a ? 1 : 0), 2, 2 + (a ? 1 : 0), "#023118"); ret(fx(7, 2), y + 14 - (a ? 0 : 1), 2, 2 + (a ? 0 : 1), "#023118");
  }

  function seta(x, y) { var b = Math.floor(quadro / 15) % 2; ret(x + 4, y - 12 + b, 8, 7, "#f3f436"); ret(x + 4, y - 12 + b, 8, 1, "#c9c92a"); ret(x + 7, y - 11 + b, 2, 3, "#023118"); ret(x + 7, y - 7 + b, 2, 1, "#023118"); }

  function entidades(f) {
    var cam = Math.round(S.cam);
    f.entidades.forEach(function (e) {
      if (!e.ativo && ["vizinho", "visitante", "orelhao", "lixeira", "marco", "mirante", "festeiro", "produtor", "campista", "arvoreCai"].indexOf(e.t) < 0) return;
      if (e.saiu) return;
      var x = e.x - cam, y = e.y;
      if (x < -40 || x > W + 40) return;
      if (e.t === "bituca") { ret(x + 4, y + 13, 7, 2, "#f2efe6"); ret(x + 4, y + 13, 2, 2, "#d98c3a"); if (Math.floor((quadro + e.x) / 20) % 3 === 0) ret(x + 6, y + 10, 1, 1, "#ffffff"); if (perto(e)) seta(x, y); }
      else if (e.t === "lixo") { ret(x + 3, y + 7, 10, 9, "#2b2b2b"); ret(x + 6, y + 5, 4, 3, "#2b2b2b"); ret(x + 7, y + 4, 2, 1, "#555"); ret(x + 5, y + 9, 2, 2, "#555"); if (perto(e)) seta(x, y); }
      else if (e.t === "garrafa") { ret(x + 2, y + 12, 10, 4, "#a9dcf5"); ret(x + 2, y + 12, 10, 1, "#e6f6ff"); ret(x + 12, y + 13, 2, 2, "#cfeefc"); ret(x + 14, y + 13, 1, 2, "#1f6fd4"); ret(x + 5, y + 12, 3, 4, "#e84a3a"); if (perto(e)) seta(x, y); }
      else if (e.t === "papelao") { ret(x + 2, y + 9, 12, 7, "#c49a5a"); ret(x + 2, y + 9, 12, 1, "#a07a40"); ret(x + 3, y + 7, 5, 2, "#d4aa6a"); ret(x + 9, y + 7, 4, 2, "#b88c4e"); ret(x + 7, y + 9, 1, 7, "#a07a40"); if (perto(e)) seta(x, y); }
      else if (e.t === "folhas") {
        var hf = Math.max(2, 8 - e.v * 1.5), cores = ["#c98a2e", "#a8672f", "#e0b04a", "#8a5a22"];
        for (var fl = 0; fl < 7; fl++) ret(x + 1 + fl * 2, y + 16 - hf + ((fl * 3) % 3), 3, hf - ((fl * 3) % 3), cores[fl % 4]);
        ret(x + 2, y + 16 - hf - 1, 2, 1, "#6b4423"); ret(x + 11, y + 16 - hf, 3, 1, "#6b4423");
        if (perto(e, 22)) { seta(x, y - 4); for (var pv = 0; pv < 4; pv++) ret(x + pv * 4, y - 1, 3, 2, pv < e.v ? "#f3f436" : "rgba(2,49,24,.6)"); }
      }
      else if (e.t === "festeiro") {
        pessoa(x, y + 1, -1, "#e8762b", "#c58a5a", null, 0);
        if (e.conv) { ret(x + 13, y + 12, 10, 4, "#d12a2a"); ret(x + 15, y + 11, 6, 1, "#f3f436"); ret(x + 2, y - 8, 9, 6, "#ffffff"); ret(x + 4, y - 6, 1, 1, "#1f6616"); ret(x + 6, y - 5, 1, 1, "#1f6616"); ret(x + 8, y - 7, 1, 2, "#1f6616"); }
        else if (!e.solto) { balao(x + 2, y - 18); if (perto(e, 26)) seta(x - 10, y - 4); }
      }
      else if (e.t === "produtor") {
        for (var cp = 0; cp < 8; cp++) ret(x + 14 + cp * 2, y + 9 - (cp % 2) * 3, 1, 7 + (cp % 2) * 3, cp % 3 ? "#d9c06a" : "#bfa24d");
        pessoa(x, y + 1, -1, "#7a5a2a", "#a0673a", "#d9c06a", 0);
        if (!e.conv && !e.passou) { ret(x - 2, y + 9, 2, 3, "#c95f1c"); ret(x - 2, y + 7, 2, 2, Math.floor(quadro / 8) % 2 ? "#ff6a1f" : "#ffe14a"); if (perto(e, 26)) seta(x, y - 4); else { ret(x + 4, y - 9, 5, 7, "#f3f436"); ret(x + 6, y - 8, 1, 3, "#ad0e0e"); ret(x + 6, y - 4, 1, 1, "#ad0e0e"); } }
        else if (e.conv) { ret(x + 2, y - 8, 9, 6, "#ffffff"); ret(x + 4, y - 6, 1, 1, "#1f6616"); ret(x + 6, y - 5, 1, 1, "#1f6616"); ret(x + 8, y - 7, 1, 2, "#1f6616"); }
        else { ctx.fillStyle = "rgba(110,110,110,.45)"; for (var fu = 0; fu < 4; fu++) { ctx.beginPath(); ctx.arc(x + 22 + Math.sin((quadro + fu * 15) / 20) * 3, y - 4 - fu * 9 - (quadro % 20) / 4, 5 + fu, 0, 7); ctx.fill(); } }
      }
      else if (e.t === "campista") {
        ctx.fillStyle = "#2f7d9a"; ctx.beginPath(); ctx.moveTo(x - 22, y + 16); ctx.lineTo(x - 11, y - 2); ctx.lineTo(x, y + 16); ctx.closePath(); ctx.fill(); ret(x - 12, y + 6, 2, 10, "#1f4f63");
        pessoa(x + 2, y + 1, 1, "#3b8fd4", "#e0b48a", "#023118", 0);
        ret(x + 18, y + 13, 12, 3, "#6b4423"); ret(x + 20, y + 11, 8, 2, "#8a5a32"); for (var cg = 0; cg < 5; cg++) ret(x + 15 + cg * 4, y + 11 - (cg % 2) * 2, 1, 5, "#d9c06a");
        if (e.acendeu) { var kf = quadro % 12; ret(x + 21, y + 6 + (kf > 6 ? 1 : 0), 3, 6, "#ff6a1f"); ret(x + 24, y + 4 + (kf > 3 ? 2 : 0), 3, 8, "#ff3b1f"); ret(x + 22, y + 9, 2, 3, "#ffe14a"); }
        else if (e.conv) { ret(x + 4, y - 8, 9, 6, "#ffffff"); ret(x + 6, y - 6, 1, 1, "#1f6616"); ret(x + 8, y - 5, 1, 1, "#1f6616"); ret(x + 10, y - 7, 1, 2, "#1f6616"); }
        else { ret(x + 13, y + 8, 2, 1, "#c95f1c"); if (Math.floor(quadro / 10) % 2) ret(x + 14, y + 7, 1, 1, "#ffe14a"); if (perto(e, 30)) seta(x + 2, y - 4); }
      }
      else if (e.t === "arvoreCai") {
        var ang = e.estado < 2 ? (e.estado === 1 ? Math.sin(quadro / 2) * 0.05 : 0) : e.estado === 2 ? Math.min(1, e.k / 28) * Math.PI / 2 : Math.PI / 2;
        ctx.save(); ctx.translate(x + 8, 9 * T); ctx.rotate(-ang);
        ret(-2, -30, 4, 30, "#2a2522"); ret(-6, -24, 4, 2, "#2a2522"); ret(2, -19, 4, 2, "#2a2522"); ret(-9, -36, 18, 7, "#3a2f28");
        if (e.estado < 3) { var kk = quadro % 12; ret(-8, -42 + (kk > 6 ? 1 : 0), 5, 7, "#ff6a1f"); ret(-1, -45 + (kk > 3 ? 2 : 0), 5, 9, "#ff3b1f"); ret(5, -41, 4, 6, "#ff6a1f"); ret(-6, -38, 2, 3, "#ffe14a"); ret(1, -40, 2, 4, "#ffe14a"); }
        else if (Math.floor(quadro / 10) % 2) { ret(-30, -3, 2, 1, "#ff6a1f"); ret(-14, -2, 2, 1, "#ff6a1f"); }
        ctx.restore();
        if (e.estado === 1 && Math.floor(quadro / 6) % 2) { ret(x + 12, y - 30, 3, 1, "#ffffff"); ret(x + 14, y - 34, 1, 3, "#ffffff"); }
      }
      else if (e.t === "mascara") { var b = Math.floor(quadro / 20) % 2; ret(x + 3, y + 6 - b, 10, 6, "#ffffff"); ret(x + 3, y + 6 - b, 10, 1, "#9fb3c8"); ret(x + 1, y + 8 - b, 2, 1, "#9fb3c8"); ret(x + 13, y + 8 - b, 2, 1, "#9fb3c8"); }
      else if (e.t === "agua") { var b2 = Math.floor(quadro / 20) % 2; ret(x + 6, y + 3 - b2, 4, 2, "#1f4fa0"); ret(x + 5, y + 5 - b2, 6, 10, "#7fc8f5"); ret(x + 6, y + 7 - b2, 1, 6, "#ffffff"); ret(x + 5, y + 9 - b2, 6, 2, "#3b8fd4"); }
      else if (e.t === "marco") { ret(x + 6, y + 2, 3, 14, "#6b4423"); ret(x + 2, y + 2, 11, 6, e.passou ? "#48b46e" : "#e9e2d6"); ret(x + 4, y + 4, 7, 2, e.passou ? "#1f6616" : "#8a7a5a"); }
      else if (e.t === "vizinho") {
        pessoa(x, y + 1, -1, "#3b6fd4", "#a0673a", null, 0);
        if (!e.conv) { ret(x + 14, y + 9, 14, 7, "#5a4a2a"); ret(x + 16, y + 6, 10, 4, "#7a6a3a"); ret(x + 18, y + 10, 3, 3, "#2b2b2b"); ret(x + 22, y + 4, 2, 2, "#d9c06a"); if (perto(e, 26)) seta(x, y - 4); else { ret(x + 4, y - 9, 5, 7, "#f3f436"); ret(x + 6, y - 8, 1, 3, "#ad0e0e"); ret(x + 6, y - 4, 1, 1, "#ad0e0e"); } }
        else { ret(x + 2, y - 8, 9, 6, "#ffffff"); ret(x + 4, y - 6, 1, 1, "#1f6616"); ret(x + 6, y - 5, 1, 1, "#1f6616"); ret(x + 8, y - 7, 1, 2, "#1f6616"); }
      } else if (e.t === "visitante") {
        pessoa(x, y + 1, -1, "#d16a2a", "#e0b48a", "#6b4423", 0); ret(x + 9, y + 9, 3, 6, "#3b6b3b");
        if (!e.conv) { ret(x - 2, y + 9, 3, 1, "#f2efe6"); ret(x - 3, y + 9, 1, 1, Math.floor(quadro / 8) % 2 ? "#ff3b1f" : "#ffb347"); ctx.fillStyle = "rgba(200,200,200,.6)"; ctx.fillRect(x - 4, y + 4 - (quadro % 20) / 4, 2, 2); if (perto(e, 26)) seta(x, y - 4); }
      } else if (e.t === "orelhao") {
        ret(x + 7, y - 6, 2, 22, "#7a7a7a"); ctx.fillStyle = "#e8762b"; ctx.beginPath(); ctx.arc(x + 8, y - 2, 9, Math.PI, 0); ctx.fill(); ret(x - 1, y - 2, 18, 3, "#c95f1c");
        ret(x + 1, y + 2, 14, 7, "#1f4fa0"); texto193(x + 2, y + 3, "#ffffff");
        if (f.fogo.ativo && !f.fogo.avisado) { seta(x, y - 14); if (Math.floor(quadro / 10) % 2) ret(x - 3, y - 12, 2, 2, "#f3f436"); }
      } else if (e.t === "lixeira") {
        var cheio = carregando() > 0;
        ret(x + 1, y + 1, 14, 15, "#1f6616"); ret(x, y, 16, 3, "#2f8a24"); ret(x + 6, y - 2, 4, 2, "#2f8a24");
        if (e.meio) { ret(x - 4, y - 12, 2, 28, "#6b4423"); ret(x - 8, y - 16, 12, 6, "#f3f436"); ret(x - 6, y - 14, 8, 2, "#1f6616"); }
        ret(x + 4, y + 6, 8, 1, "#d8fdcf"); ret(x + 4, y + 9, 8, 1, "#d8fdcf"); ret(x + 4, y + 12, 8, 1, "#d8fdcf");
        if (cheio && perto(e, 40)) seta(x, y - 6);
      } else if (e.t === "carro" && e.anim !== undefined) {
        var cx = W + 20 - e.anim * 3, cy = 8 * T + 5;
        ret(cx, cy, 26, 7, "#e9eef3"); ret(cx + 5, cy - 5, 14, 5, "#e9eef3"); ret(cx + 7, cy - 4, 4, 3, "#7fb3d5"); ret(cx + 13, cy - 4, 4, 3, "#7fb3d5"); ret(cx + 3, cy + 6, 5, 3, "#222"); ret(cx + 18, cy + 6, 5, 3, "#222");
        if (e.anim > 30 && e.anim < 46) ret(cx + 6, cy - 2 + (e.anim - 30), 2, 1, "#f2efe6");
      } else if (e.t === "mirante") {
        ret(x - 6, y + 9, 2, 7, "#6b4423"); ret(x + 20, y + 9, 2, 7, "#6b4423"); ret(x - 6, y + 9, 28, 2, "#8a5a32"); ret(x - 6, y + 13, 28, 1, "#8a5a32");
        ret(x + 7, y - 4, 2, 13, "#6b4423"); ret(x + 1, y - 9, 14, 6, "#f3f436"); ret(x + 3, y - 7, 4, 2, "#023118"); ret(x + 9, y - 7, 4, 2, "#023118"); ret(x + 7, y - 7, 2, 1, "#023118");
      } else if (e.t === "mov") {
        ret(x, y, e.w, 6, "#8a5a32"); ret(x, y, e.w, 2, "#b07a48"); ret(x + 2, y + 6, 2, 3, "#6b4423"); ret(x + e.w - 4, y + 6, 2, 3, "#6b4423");
      }
    });
  }

  function balao(x, y) {
    ret(x + 2, y, 8, 2, "#d12a2a"); ret(x, y + 2, 12, 3, "#f3f436"); ret(x, y + 5, 12, 3, "#d12a2a"); ret(x + 1, y + 8, 10, 2, "#f3f436"); ret(x + 3, y + 10, 6, 2, "#d12a2a");
    ret(x + 4, y + 12, 1, 2, "#6b4423"); ret(x + 7, y + 12, 1, 2, "#6b4423"); ret(x + 5, y + 14, 2, 2, Math.floor(quadro / 6) % 2 ? "#ff6a1f" : "#ffe14a");
  }
  function baloesVoando(f) {
    var cam = Math.round(S.cam);
    f.entidades.forEach(function (e) { if (e.t === "festeiro" && e.solto && e.by > -40) balao(Math.round(e.bx - cam), Math.round(e.by)); });
  }
  function viaturaDesenho(f) {
    if (!f.viatura) return;
    var v = f.viatura, x = Math.round(v.x - S.cam), y = 8 * T + 3, pisca = Math.floor(quadro / 8) % 2;
    ret(x, y, 34, 10, "#f4f4f4"); ret(x + 4, y - 6, 18, 6, "#f4f4f4"); ret(x + 6, y - 5, 6, 4, "#7fb3d5"); ret(x + 14, y - 5, 6, 4, "#7fb3d5");
    ret(x, y + 4, 34, 2, "#1f6616"); ret(x + 8, y - 8, 10, 2, "#333"); ret(x + 8, y - 8, 5, 2, pisca ? "#3b8fd4" : "#1f3d8a"); ret(x + 13, y - 8, 5, 2, pisca ? "#8a1f1f" : "#ff3b1f");
    ret(x + 4, y + 9, 6, 5, "#222"); ret(x + 24, y + 9, 6, 5, "#222");
    if (v.fase === 1) pessoa(x - 14, y - 3, 1, "#1f6616", "#8d5524", "#023118", 0);
  }
  function incendioDistante(f) {
    /* visto do mirante: um morro queimando ao longe e os bombeiros no combate */
    if (f.tema !== "serra" || S.cam > 60 * T) return;
    var bx = Math.round(250 + (300 - S.cam) * 0.4), by = 118;
    ctx.fillStyle = "#3d6b45"; ctx.beginPath(); ctx.moveTo(bx - 50, 145); ctx.lineTo(bx - 20, by - 18); ctx.lineTo(bx + 20, by - 26); ctx.lineTo(bx + 60, 145); ctx.closePath(); ctx.fill();
    ret(bx - 18, by - 14, 34, 3, "#2a2522");
    for (var i = 0; i < 5; i++) { var k = (quadro + i * 5) % 10; ret(bx - 16 + i * 7, by - 18 - (k > 5 ? 2 : 0), 4, 5, i % 2 ? "#ff6a1f" : "#ff3b1f"); ret(bx - 15 + i * 7, by - 16, 2, 2, "#ffe14a"); }
    ctx.fillStyle = "rgba(110,110,110,.45)";
    for (var j = 0; j < 6; j++) { ctx.beginPath(); ctx.arc(bx - 8 + j * 3 + Math.sin((quadro + j * 20) / 25) * 3, by - 28 - j * 9, 6 + j, 0, 7); ctx.fill(); }
    ret(bx + 30, by + 4, 16, 6, "#c81e1e"); ret(bx + 30, by + 1, 6, 3, "#c81e1e"); ret(bx + 32, by + 9, 3, 2, "#222"); ret(bx + 41, by + 9, 3, 2, "#222");
    for (var a = 0; a < 6; a++) ret(bx + 28 - a * 4, by + 1 - Math.round(Math.sin(a / 2) * 6) + (quadro % 3), 2, 2, "#7fc8f5");
  }
  function fogoDesenho(f) {
    var fg = f.fogo, cam = Math.round(S.cam);
    if (fg.ativo) fg.tiles.forEach(function (c, i) {
      var x = c * T - cam, y = 8 * T, k = (quadro + i * 7) % 12;
      ret(x + 1, y + 10, 14, 6, "#ff3b1f");
      ret(x + 2, y + 4 + (k > 6 ? 1 : 0), 4, 8, "#ff6a1f"); ret(x + 7, y + 1 + (k > 3 ? 2 : 0), 4, 11, "#ff3b1f"); ret(x + 11, y + 5 + (k > 8 ? 1 : 0), 3, 7, "#ff6a1f");
      ret(x + 4, y + 8, 3, 5, "#ffe14a"); ret(x + 8, y + 6 + (k % 3), 2, 6, "#ffe14a");
      ctx.fillStyle = "rgba(90,90,90,.35)"; ctx.beginPath(); ctx.arc(x + 8 + Math.sin((quadro + i * 9) / 15) * 4, y - 8 - (quadro + i * 13) % 30, 6, 0, 7); ctx.fill();
    });
    else if (fg.tiles.length) fg.tiles.forEach(function (c) { var x = c * T - cam; ret(x, 8 * T + 14, T, 2, "#2a2522"); ret(x + 4, 8 * T + 12, 3, 2, "#3a3330"); });
    f.faiscas.forEach(function (s) { ret(s.x - cam - 1, s.y - 1, 3, 3, "#ff6a1f"); ret(s.x - cam, s.y, 1, 1, "#ffe14a"); });
    if (fg.caminhao) {
      var cm = fg.caminhao, x = cm.x - cam, y = 8 * T + 2;
      ret(x, y, 36, 11, "#c81e1e"); ret(x, y - 6, 12, 7, "#c81e1e"); ret(x + 2, y - 4, 7, 4, "#bfe3f5"); ret(x + 12, y - 3, 22, 2, "#e0e0e0"); ret(x, y + 5, 36, 2, "#ffffff");
      ret(x + 4, y + 10, 6, 5, "#222"); ret(x + 26, y + 10, 6, 5, "#222");
      ret(x + 4, y - 8, 4, 2, Math.floor(quadro / 10) % 2 ? "#3b8fd4" : "#ff3b1f");
      if (cm.fase === 1) for (var i = 0; i < 6; i++) ret(x - 6 - i * 6, y - 2 + (i * i) % 7 + (quadro % 4), 2, 2, "#7fc8f5");
    }
  }

  function criseDesenho(f) {
    if (!f.crise) return;
    var cam = Math.round(S.cam);
    (f.focosExtras || []).forEach(function (fe, i) {
      var x = fe.c * T - cam, y = 8 * T; if (x < -30 || x > W + 30) return;
      if (!fe.ativo) { ret(x, y + 14, T, 2, "#2a2522"); ret(x + 5, y + 12, 3, 2, "#3a3330"); return; }
      var k = (quadro + i * 5) % 12;
      ret(x + 1, y + 10, 14, 6, "#ff3b1f"); ret(x + 2, y + 5 + (k > 6 ? 1 : 0), 4, 7, "#ff6a1f"); ret(x + 7, y + 2 + (k > 3 ? 2 : 0), 4, 10, "#ff3b1f"); ret(x + 11, y + 6, 3, 6, "#ff6a1f"); ret(x + 5, y + 8, 3, 4, "#ffe14a");
      ctx.fillStyle = "rgba(80,80,80,.35)"; ctx.beginPath(); ctx.arc(x + 8 + Math.sin((quadro + i * 9) / 15) * 4, y - 8 - (quadro + i * 13) % 30, 6, 0, 7); ctx.fill();
    });
    (f.brigadas || []).forEach(function (b) {
      var x = Math.round(b.x - cam), y = 8 * T + 2;
      if (b.ronda) { var yv = 8 * T + 3, ps = Math.floor(quadro / 8) % 2; ret(x, yv, 30, 9, "#f4f4f4"); ret(x + 5, yv - 5, 16, 5, "#f4f4f4"); ret(x + 7, yv - 4, 5, 3, "#7fb3d5"); ret(x, yv + 4, 30, 2, "#1f6616"); ret(x + 9, yv - 7, 4, 2, ps ? "#3b8fd4" : "#1f3d8a"); ret(x + 13, yv - 7, 4, 2, ps ? "#8a1f1f" : "#ff3b1f"); ret(x + 3, yv + 8, 5, 4, "#222"); ret(x + 21, yv + 8, 5, 4, "#222"); return; }
      ret(x, y, 36, 11, "#c81e1e"); ret(x, y - 6, 12, 7, "#c81e1e"); ret(x + 2, y - 4, 7, 4, "#bfe3f5"); ret(x + 12, y - 3, 22, 2, "#e0e0e0"); ret(x, y + 5, 36, 2, "#ffffff");
      ret(x + 4, y + 10, 6, 5, "#222"); ret(x + 26, y + 10, 6, 5, "#222"); ret(x + 4, y - 8, 4, 2, Math.floor(quadro / 10) % 2 ? "#3b8fd4" : "#ff3b1f");
      if (b.fase === 1) { pessoa(x - 12, y - 1, -1, "#c81e1e", "#8d5524", "#f3f436", 0); for (var i = 0; i < 6; i++) ret(x - 16 - i * 5, y + 2 + (i * i) % 6 + (quadro % 4), 2, 2, "#7fc8f5"); }
    });
    (f.fugitivos || []).forEach(function (a) {
      var x = Math.round(a.x - cam), pulo = Math.abs(Math.sin(a.x / 6)) * 3;
      if (a.t === "aves") { for (var j = 0; j < 4; j++) { var bx = x + j * 9, by = Math.round(a.y + (j % 2) * 5 + Math.sin((quadro + j * 7) / 5) * 2), asa = Math.floor(quadro / 6 + j) % 2; ret(bx, by, 2, 1, "#2a2420"); ret(bx - 2, by - asa, 2, 1, "#2a2420"); ret(bx + 2, by - asa, 2, 1, "#2a2420"); } return; }
      if (a.t === "tamandua") { ctx.save(); ctx.translate(0, -pulo); tamandua(x); ctx.restore(); return; }
      if (a.t === "veado") { var yv = 9 * T - Math.round(pulo * 2); ret(x + 4, yv - 14, 14, 6, "#b5743a"); ret(x, yv - 20, 6, 6, "#b5743a"); ret(x - 2, yv - 18, 3, 2, "#8a5a2a"); ret(x + 1, yv - 23, 1, 3, "#5a3a1a"); ret(x + 4, yv - 23, 1, 3, "#5a3a1a"); ret(x + 5, yv - 8, 2, 8, "#8a5a2a"); ret(x + 15, yv - 8, 2, 8, "#8a5a2a"); ret(x + 17, yv - 14, 2, 2, "#f2efe6"); return; }
      ctx.save(); ctx.translate(x * 2 + 16, -pulo); ctx.scale(-1, 1); if (a.t === "tatu") tatu(x); else seriema(x); ctx.restore();
    });
  }
  function nevoaCrise(f) {
    if (!f.crise) return;
    var cam = Math.round(S.cam);
    (f.cinzas || []).forEach(function (z) { ret(z.x - cam, z.y, 1, 1, "#cfc6bc"); });
    ctx.fillStyle = f.crise === 2 ? "rgba(110,80,60,.18)" : "rgba(150,110,80,.1)"; ctx.fillRect(0, 0, W, H);
  }
  function fumacaDesenho(f) {
    var cam = Math.round(S.cam);
    f.fumaca.forEach(function (z) {
      for (var i = 0; i < 22; i++) {
        var x = z[0] * T + ((i * 37) % ((z[1] - z[0]) * T)) - cam, y = 40 + (i * 23) % 90 + Math.sin((quadro + i * 20) / 30) * 4;
        if (x < -30 || x > W + 30) continue;
        ctx.fillStyle = "rgba(120,120,120,.26)"; ctx.beginPath(); ctx.arc(x, y, 12 + (i % 3) * 4, 0, 7); ctx.fill();
      }
    });
  }

  function hudCanvas() {
    /* sacola visível no canto: o que você está carregando */
    var cheia = carregando() >= CAP;
    ret(4, 4, 112, 22, "rgba(2,49,24,.9)");
    ret(8, 8, 9, 10, cheia ? "#ffb3a8" : "#e8e0c8"); ret(8, 8, 9, 1, "#b8ad8c"); ret(11, 6, 3, 2, "#8a7a5a");
    ret(22, 12, 7, 2, "#f2efe6"); ret(22, 12, 2, 2, "#d98c3a");
    ret(48, 8, 6, 8, "#2b2b2b"); ret(49, 7, 4, 2, "#2b2b2b");
    ret(78, 11, 3, 5, "#c98a2e"); ret(81, 9, 3, 7, "#e0b04a"); ret(84, 12, 3, 4, "#a8672f");
    for (var sl = 0; sl < CAP; sl++) ret(8 + sl * 13, 22, 11, 2, sl < carregando() ? (cheia ? "#ff6a5a" : "#f3f436") : "rgba(255,255,255,.25)");
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 8px monospace"; ctx.textAlign = "left";
    ctx.fillText("x" + S.sacolaB, 31, 17); ctx.fillText("x" + S.sacolaL, 56, 17); ctx.fillText("x" + S.sacolaF, 89, 17);
    ctx.textAlign = "right"; ctx.fillStyle = "#f3f436"; ctx.fillText(String(S.pontos), W - 6, 15);
  }

  function particulas(f) {
    var cam = Math.round(S.cam);
    f.parts.forEach(function (q) {
      if (q.tipo === "p") ret(q.x - cam, q.y, 2, 2, q.cor);
      else { ctx.font = "bold 8px monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#023118"; ctx.fillText(q.txt, q.x - cam + 9, q.y + 1); ctx.fillStyle = q.cor; ctx.fillText(q.txt, q.x - cam + 8, q.y); }
    });
  }

  function desenhar() {
    var f = fase(), cam = Math.round(S.cam);
    fundo(f, false);
    f.deco.forEach(function (d) {
      var x = d.c * T - cam; if (x < -60 || x > W + 60) return;
      if (d.t === "arvore") { if (d.cai) return; arvore(x, d.queimado); if (d.queimando) chamaCopa(x); } else if (d.t === "capim" && d.queimado) capimQueimado(x); else if (d.t === "casa") casa(x, d.c % 3 === 0 ? "#f5d9a8" : d.c % 3 === 1 ? COR.casa : "#e3efd8"); else if (d.t === "capim") capim(x); else if (d.t === "tatu") tatu(x);
      else if (d.t === "seriema") seriema(x); else if (d.t === "tamandua") tamandua(x); else if (d.t === "placa") placa(x); else if (d.t === "pedra") pedraBonita(x);
    });
    incendioDistante(f);
    tiles(f);
    entidades(f);
    viaturaDesenho(f);
    fogoDesenho(f);
    criseDesenho(f);
    baloesVoando(f);
    var p = S.p;
    if (!(p.inv > 0 && Math.floor(p.inv / 4) % 2)) {
      var px = Math.round(p.x - 1 - cam), py = Math.round(p.y - 1);
      var pernas = !p.chao ? 2 : Math.abs(p.vx) > 0.2 ? Math.floor(p.passo / 7) % 2 : 0;
      sacola(px, py, p.face, carregando());
      desenharHeroi(px, py, p.face, pernas);
      if (S.mascara) ret(px + (p.face > 0 ? 4 : 3), py + 6, 5, 2, "#ffffff");
      if (p.varre > 0) vassoura(px, py, p.face, p.varre);
    }
    fumacaDesenho(f);
    nevoaCrise(f);
    particulas(f);
    hudCanvas();
  }

  function desenharFinal(k) {
    var queimado = k === "ruim" || k === "perigo";
    S.cam = 0;
    var f = fases[2];
    fundo(f, queimado);
    for (var c = 0; c < 21; c++) { ret(c * T, 9 * T, T, 2 * T, queimado ? "#3e3630" : COR.terra); ret(c * T, 9 * T, T, 4, queimado ? "#2a2522" : COR.grama); }
    [10, 40, 250, 290].forEach(function (x) { arvore(x, queimado); });
    pedraBonita(140, queimado);
    if (!queimado) { tatu(70); seriema(100); tamandua(200); desenharHeroi(118, 9 * T - 17, 1, 0); }
    else { ctx.fillStyle = "rgba(80,70,60,.35)"; for (var i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc((i * 47) % W, 40 + (i * 29) % 70, 18, 0, 7); ctx.fill(); } }
    ctx.fillStyle = queimado ? "#ad0e0e" : "#1f6616"; ctx.fillRect(0, 0, W, 16);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center"; ctx.fillText(queimado ? "DEPOIS DO FOGO" : "ANTES DO FOGO", W / 2, 11);
  }

  function telaInicial() {
    fases = criarFases(); S = { fase: 0, vidas: 3, cam: 0, t: 0, sacolaB: 0, sacolaL: 0, pontos: 0, mascara: false };
    var f = fases[0];
    f.entidades = f.ent.map(function (e) { return { t: e.t, x: e.c * T, y: (e.r || 8) * T, ativo: true }; });
    f.fogo = { ativo: false, tiles: [] }; f.faiscas = []; f.parts = []; f.terra = {};
    S.p = { x: 40, y: 8 * T + 1, w: 10, h: 15, face: 1, passo: 0, inv: 0, chao: true, vx: 0 };
    desenhar();
  }

  /* ---------- Laço ---------- */
  var acumulado = 0, ultimo = 0;
  function laco(ts) {
    raf = null;
    if (modo !== "jogando") return;
    if (!ultimo) ultimo = ts;
    acumulado += Math.min(100, ts - ultimo); ultimo = ts;
    while (acumulado >= 1000 / 60 && modo === "jogando") { quadro++; atualizar(); acumulado -= 1000 / 60; }
    if (modo === "jogando") desenhar();
    if (modo === "jogando" && visivel && !document.hidden) raf = requestAnimationFrame(laco);
  }
  var jogoVisivel = false;
  function jogar() {
    modo = "jogando"; painel.hidden = true; painel.innerHTML = ""; sobreEl.hidden = true; ultimo = 0; acumulado = 0;
    entrada.esq = entrada.dir = entrada.pulo = entrada.agir = false;
    $("plat-pausar").textContent = "Pausar";
    hud();
    var r = canvas.getBoundingClientRect();
    if (r.top < 60 || r.bottom > window.innerHeight) {
      try { $("plat").scrollIntoView({ block: "start", behavior: "instant" }); } catch (e) { $("plat").scrollIntoView(); }
    }
    visivel = true; jogoVisivel = true;
    canvas.focus({ preventScroll: true });
    if (!raf) raf = requestAnimationFrame(laco);
  }
  function pausar() {
    if (modo === "jogando") { modo = "pausa"; $("plat-pausar").textContent = "Continuar"; aviso.textContent = "Jogo pausado."; sobre("Pausado", "O jogo está parado", [["▶ Continuar", function () { jogar(); }]]); }
    else if (modo === "pausa") jogar();
  }

  /* ---------- Controles ---------- */
  var TECLAS = { ArrowLeft: "esq", KeyA: "esq", ArrowRight: "dir", KeyD: "dir", ArrowUp: "pulo", KeyW: "pulo", Space: "pulo", KeyE: "agir", KeyX: "agir", KeyS: "agir", ArrowDown: "agir", Enter: "agir" };
  document.addEventListener("keydown", function (ev) {
    if (ev.code === "KeyP" && (modo === "jogando" || modo === "pausa") && jogoVisivel) { pausar(); ev.preventDefault(); return; }
    var k = TECLAS[ev.code]; if (!k || modo !== "jogando" || !jogoVisivel) return;
    if (ev.target && (ev.target.tagName === "INPUT" || ev.target.tagName === "TEXTAREA")) return;
    if (ev.code === "Enter" && ev.target && ev.target.tagName === "BUTTON") return;
    if (!ev.repeat && (k === "pulo" || k === "agir")) pedido[k] = true;
    entrada[k] = true; ev.preventDefault();
  });
  document.addEventListener("keyup", function (ev) { var k = TECLAS[ev.code]; if (k) entrada[k] = false; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-plat]"), function (b) {
    var k = b.getAttribute("data-plat");
    var on = function (ev) { ev.preventDefault(); entrada[k] = true; if (k === "pulo" || k === "agir") pedido[k] = true; b.classList.add("ativo"); if (b.setPointerCapture && ev.pointerId !== undefined) try { b.setPointerCapture(ev.pointerId); } catch (e) {} };
    var off = function () { entrada[k] = false; b.classList.remove("ativo"); };
    b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
    b.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
  });
  $("plat-pausar").addEventListener("click", pausar);
  $("plat-reiniciar").addEventListener("click", function () { novoJogo(); jogar(); aviso.textContent = "Jogo reiniciado na fase 1."; });
  var bSom = $("plat-som");
  function atualizaSom() { if (bSom) { bSom.textContent = som.ligado ? "Som: ligado" : "Som: desligado"; bSom.setAttribute("aria-pressed", som.ligado ? "true" : "false"); } }
  if (bSom) bSom.addEventListener("click", function () { som.ligado = !som.ligado; guarda.gravar("fsf-plat-som", som.ligado); atualizaSom(); if (som.ligado) SOM.pega(); });
  atualizaSom();
  var bAjuda = $("plat-ajuda"), cAjuda = $("plat-como");
  bAjuda.addEventListener("click", function () { var m = cAjuda.hidden; cAjuda.hidden = !m; bAjuda.setAttribute("aria-expanded", m ? "true" : "false"); });
  function comecar() { cAjuda.hidden = true; bAjuda.setAttribute("aria-expanded", "false"); novoJogo(); jogar(); }
  $("plat-comecar").addEventListener("click", comecar);
  $("plat-comecar-sobre").addEventListener("click", comecar);
  document.addEventListener("keydown", function (ev) {
    if (sobreEl.hidden || ev.code !== "KeyE") return;
    var a = document.activeElement; if (!a || !$("plat").contains(a)) return;
    var b = sobreEl.querySelector("button"); if (b) { ev.preventDefault(); b.click(); }
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function () {
      var r = canvas.getBoundingClientRect(), ok = r.bottom > 80 && r.top < window.innerHeight - 40;
      jogoVisivel = ok; visivel = ok;
      if (!ok && modo === "jogando") pausar();
      if (ok && modo === "jogando" && !raf) { ultimo = 0; raf = requestAnimationFrame(laco); }
    }, { threshold: [0, 0.25, 0.5] }).observe(canvas);
  } else { jogoVisivel = true; }
  document.addEventListener("visibilitychange", function () { if (document.hidden && modo === "jogando") pausar(); });

  telaInicial();

  /* Gancho de teste: avança a simulação sem desenhar */
  window.__plat = {
    novo: function (clima) { som.ligado = false; novoJogo(); S.forcaClima = clima || null; modo = "jogando"; painel.hidden = true; sobreEl.hidden = true; },
    passo: function (inp) { if (modo !== "jogando") return modo; entrada.esq = !!inp.esq; entrada.dir = !!inp.dir; entrada.pulo = !!inp.pulo; entrada.agir = !!inp.agir; quadro++; atualizar(); return modo; },
    proxima: function () { var b = (!sobreEl.hidden && sobreEl.querySelector("button")) || painel.querySelector("button"); if (b) { b.click(); if (raf) { cancelAnimationFrame(raf); raf = null; } } },
    desenhar: function () { desenhar(); },
    resolverModal: function (ok) {
      if (S.celular) { if (ok) { S.celular.numero = PMA; concluirDenuncia(); fecharModal(); } else desligarSemDenunciar(); }
      else if (S.obs) { if (ok) S.obsCerto = 1; else S.obs.erros++; fecharModal(); }
      else if (S.prod) { if (ok) { S.prod.e.conv = true; S.conversas++; } fecharModal(); }
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    },
    estado: function () { return S; }, fase: function () { return fase(); }, modo: function () { return modo; }, solido: solido, T: T
  };
})();
