/* =========================================================================
   Aios CRM — Formulário de aplicação (estilo Chronos)
   Variantes A/B (clínicas de estética) e C (lojas de carros),
   ramificações, desqualificação silenciosa e calendário nativo.
   ========================================================================= */
(function () {
  'use strict';

  var VARIANT = (window.AIOS_VARIANT === 'B' || window.AIOS_VARIANT === 'C') ? window.AIOS_VARIANT : 'A';

  // >>> TROQUE pelo link real do grupo (WhatsApp) <<<
  var GROUP_URL = 'https://chat.whatsapp.com/LmIxlpVEKia2LTLseJeF95';

  // Número direto p/ "Tentar encaixe via WhatsApp" quando a agenda está cheia.
  var FIT_WHATSAPP_URL = 'https://wa.me/5515991286797';

  // Escassez da agenda: libera só estes nºs de dias/horários; o resto fica "Ocupado".
  // Dias liberados = hoje + o próximo dia útil. 2 dias × 2 horários = 4 vagas no total.
  var FREE_DAYS = 2;
  var FREE_TIMES = 2;

  // Capa por variante. A/B = clínicas de estética (A: recuperar pacientes parados,
  // B: foco em IA). C = lojas de carros.
  var FILTER = '→ Exclusivo para clínicas que faturam R$30k+/mês e querem parar de perder paciente e começar a escalar.';
  var FILTER_CARROS = '→ Exclusivo para lojas com estoque próprio e time de vendas que cansaram de perder cliente no WhatsApp.';
  var COVERS = {
    A: {
      h1: '<span class="emoji">📲</span> Dono de clínica de estética: <b>recupere os pacientes parados</b> no seu WhatsApp',
      bullets: [
        ['✅', 'Reative quem já te procurou e sumiu'],
        ['🤖', 'IA responde cada paciente em 1s'],
        ['📅', 'Agenda cheia, sem trabalho manual'],
        ['🏆', '+500 negócios · 2M+ leads atendidos']
      ],
      filter: FILTER
    },
    B: {
      h1: '<span class="emoji">🤖</span> Dono de clínica de estética: <b>uma IA vendendo no seu WhatsApp 24h</b>',
      bullets: [
        ['🤖', 'IA atende e agenda 24h por dia'],
        ['⚡', 'Responde cada paciente em 1 segundo'],
        ['📅', 'Agenda cheia, sem trabalho manual'],
        ['🏆', '+500 negócios · 2M+ leads atendidos']
      ],
      filter: FILTER
    },
    C: {
      h1: '<span class="emoji">🚗</span> Dono de loja de carros: <b>test drives agendados</b> pela IA',
      bullets: [
        ['✅', 'Reative quem pediu preço e sumiu'],
        ['🤖', 'IA responde cada lead em 1s'],
        ['📅', 'Agenda cheia de test drive'],
        ['🏆', '+50 negócios · +200k leads gerenciados']
      ],
      filter: FILTER_CARROS
    }
  };

  // ---------------------------------------------------------------- Meta Pixel + CAPI (cliente)
  var META_PIXEL_ID = '2039202806998855';
  var sent = {}; // evita disparar o mesmo evento 2x na sessão

  function loadPixel() {
    if (window.fbq) return;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function getCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? m.pop() : '';
  }
  function getFbp() { return getCookie('_fbp'); }
  function getFbc() {
    var c = getCookie('_fbc'); if (c) return c;
    var id = new URLSearchParams(window.location.search).get('fbclid');
    return id ? ('fb.1.' + (window.AIOS_NOW || nowMs()) + '.' + id) : '';
  }
  function nowMs() { return new Date().getTime(); }
  function genId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'e' + nowMs() + Math.random().toString(16).slice(2);
  }
  function metaBase() {
    return { fbp: getFbp(), fbc: getFbc(), event_source_url: window.location.href, client_user_agent: navigator.userAgent };
  }
  // dispara no Pixel (browser). custom=true -> trackCustom
  function pixel(name, params, eventId, custom) {
    if (!window.fbq) return;
    var opts = eventId ? { eventID: eventId } : undefined;
    window.fbq(custom ? 'trackCustom' : 'track', name, params || {}, opts);
  }

  // ---------------------------------------------------------------- helpers
  function notEmpty(msg) { return function (v) { return v.trim().length >= 2 ? '' : msg; }; }
  function validPhone(v) { return v.replace(/\D/g, '').length >= 10 ? '' : 'Digite um WhatsApp válido com DDD.'; }
  function letter(i) { return String.fromCharCode(65 + i); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // A pergunta de ramificação: investimento (A) ou experiência (B e C).
  function firstInvest() { return VARIANT === 'A' ? 'investe' : 'experiencia'; }

  // hash determinístico (FNV-1a 32 bits) p/ escolher as vagas "livres" de forma estável
  function hashStr(s) {
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; // h *= 16777619
    }
    return h >>> 0;
  }
  // libera exatamente n itens (os de menor hash) -> mapa { chave: true } dos livres
  function pickFree(items, n, keyFn, salt) {
    var scored = items.map(function (it) { var k = keyFn(it); return { k: k, s: hashStr(salt + '|' + k) }; });
    scored.sort(function (a, b) { return a.s - b.s; });
    var free = {};
    scored.slice(0, n).forEach(function (x) { free[x.k] = true; });
    return free;
  }

  // ---------------------------------------------------------------- steps
  var STEPS = {
    nome: { type: 'text', inputType: 'text', autocomplete: 'name',
      q: 'Qual o seu nome?', ph: 'Digite sua resposta...',
      validate: notEmpty('Digite seu nome completo.'), next: function () { return 'instagram'; } },

    instagram: { type: 'text', inputType: 'text', autocomplete: 'off',
      q: 'Qual o @ da sua empresa no Instagram?', ph: '@suaempresa',
      validate: notEmpty('Informe o @ da sua empresa.'), next: function () { return 'whatsapp'; } },

    whatsapp: { type: 'tel', inputType: 'tel', autocomplete: 'tel',
      q: 'Qual é o seu WhatsApp?', ph: 'Digite seu telefone...',
      // /carros não pergunta faturamento: pula direto pra ramificação.
      validate: validPhone, next: function () { return VARIANT === 'C' ? firstInvest() : 'faturamento'; } },

    faturamento: { type: 'choice',
      q: 'Qual o faturamento da sua empresa?',
      options: ['Mais de R$100k por mês', 'De R$50k a R$100k por mês', 'De R$30k a R$50k por mês', 'Até R$30k por mês'],
      next: function () { return firstInvest(); } },

    /* ---- Variante A: investimento ---- */
    investe: { type: 'choice',
      q: 'Você já investe em WhatsApp API Cloud para prospecção?',
      options: ['Sim, já invisto', 'Não, ainda não'],
      next: function (a) { return a.investe.indexOf('Sim') === 0 ? 'investe_quanto' : 'base_local'; } },
    investe_quanto: { type: 'choice',
      q: 'Quanto você investe por mês hoje?',
      options: ['Menos de R$1.000', 'R$1.000 a R$5.000', 'R$5.000 a R$15.000', 'Mais de R$15.000'],
      next: function () { return 'base_local'; } },

    /* ---- Variante B: experiência ---- */
    experiencia: { type: 'choice',
      q: 'Você já teve experiência com automações e prospecção via WhatsApp API?',
      options: ['Sim, já trabalhei com isso', 'Não, nunca usei'],
      next: function () { return 'base_local'; } },

    /* ---- Base de clientes ---- */
    base_local: { type: 'choice',
      q: 'Você tem algum lugar onde os contatos dos seus clientes ficam guardados?',
      help: 'Pode ser planilha, celular, agenda, caderno... qualquer lugar.',
      options: ['Sim, tenho', 'Não tenho'],
      next: function () { return 'orcamento'; } },

    /* ---- Orçamento ---- */
    orcamento: { type: 'choice',
      q: 'Recomendamos um investimento de no mínimo R$1.000 para montar seu funil de WhatsApp via WhatsApp Business API. Esse valor se alinha ao seu orçamento atual?',
      help: 'Esse é o investimento em mídia/estrutura — não inclui a nossa mão de obra.',
      options: ['Sim, faz sentido pra mim', 'Não se alinha agora'],
      next: function () { return 'SCHEDULE'; } }
  };

  var DISQ_REASON = {
    faturamento: 'Faturamento até R$30k/mês',
    base: 'Sem local onde guarda os contatos',
    orcamento: 'Orçamento abaixo de R$1.000'
  };

  // Ninguém é barrado no formulário: todo mundo chega no agendamento.
  // Estas regras só marcam o lead pro n8n (qualificado / motivo_desqualificacao).
  var DISQ_RULES = [
    { reason: 'faturamento', hit: function (a) { return a.faturamento === 'Até R$30k por mês'; } },
    { reason: 'base',        hit: function (a) { return (a.base_local || '').indexOf('Não') === 0; } },
    { reason: 'orcamento',   hit: function (a) { return (a.orcamento || '').indexOf('Não') === 0; } }
  ];
  function disqReasons() {
    return DISQ_RULES.filter(function (r) { return r.hit(answers); })
                     .map(function (r) { return DISQ_REASON[r.reason]; });
  }

  // ---------------------------------------------------------------- state
  var answers = {};
  var history = [];        // pilha de ids visitados (p/ voltar)
  var current = null;
  var ESTIMATED = (VARIANT === 'C') ? 6 : 7;  // p/ estimar a barra de progresso (C não pergunta faturamento)

  // calendário
  var selectedDate = null;
  var selectedTime = null;

  var root, pTrack, pFill;
  var elFlow, elIntro, elSchedule, elDisq, elSuccess;

  // ---------------------------------------------------------------- UTM / contexto
  function context() {
    var p = new URLSearchParams(window.location.search);
    return {
      variante: VARIANT,
      url: window.location.href,
      utm_source: p.get('utm_source') || '',
      utm_medium: p.get('utm_medium') || '',
      utm_campaign: p.get('utm_campaign') || '',
      utm_content: p.get('utm_content') || '',
      utm_term: p.get('utm_term') || ''
    };
  }

  // ---------------------------------------------------------------- skeleton
  function build() {
    var cover = COVERS[VARIANT];
    var coverBullets = cover.bullets.map(function (b) {
      return '<li><span class="emoji">' + b[0] + '</span>' + b[1] + '</li>';
    }).join('');
    root.innerHTML =
      '<div class="progress-track" id="progressTrack"><div class="progress-fill" id="progressFill"></div></div>' +
      '<div class="body">' +
        // Capa
        '<section class="screen active" id="screen-intro">' +
          '<div class="logo"><img src="/assets/logo.png" alt="Aios CRM"><span>Aios CRM</span></div>' +
          '<h1>' + cover.h1 + '</h1>' +
          '<ul class="bullets">' + coverBullets + '</ul>' +
          '<p class="filter">' + cover.filter + '</p>' +
          '<div class="spacer"></div>' +
          '<button class="cta cta-cover" id="startBtn">Quero agendar minha demo <span class="chk">→</span></button>' +
          '<p class="micro">Resposta em até 24h · Sem compromisso</p>' +
        '</section>' +
        // Fluxo de perguntas
        '<section class="screen" id="screen-flow">' +
          '<div id="stepContent"></div>' +
          '<div class="spacer"></div>' +
          '<button class="cta" id="nextBtn" type="button">Continuar <span class="chk">✓</span></button>' +
          '<button class="back" id="backBtn" type="button">← Voltar</button>' +
        '</section>' +
        // Agendamento
        '<section class="screen" id="screen-schedule">' +
          '<div class="step-badge"><span class="num" id="schedNum">6</span><span class="dot"></span></div>' +
          '<p class="question">Escolha a melhor data e horário</p>' +
          '<p class="help">Reuniões de 30 min · seg a sex · horário de Brasília.</p>' +
          '<div class="cal-section"><div class="cal-label">Escolha o dia</div><div class="dates" id="dates"></div></div>' +
          '<div class="cal-section"><div class="cal-label">Escolha o horário</div><div id="timesWrap"><p class="cal-empty">Selecione um dia acima.</p></div></div>' +
          '<p class="wa-hint">Agenda lotada? Garanta um encaixe direto com a gente:</p>' +
          '<a class="cta cta-wa" id="fitWa" href="' + FIT_WHATSAPP_URL + '" target="_blank" rel="noopener">' +
            '<svg class="wa-ic" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
            'Tentar encaixe via WhatsApp</a>' +
          '<div class="spacer"></div>' +
          '<button class="cta" id="confirmBtn" type="button" disabled>Confirmar agendamento <span class="chk">✓</span></button>' +
          '<button class="back" id="schedBack" type="button">← Voltar</button>' +
        '</section>' +
        // Desqualificado
        '<section class="screen final" id="screen-disq">' +
          '<div class="badge-circle">🙌</div>' +
          '<h2>Obrigado pelo interesse!</h2>' +
          '<p id="disqMsg">No momento o seu perfil ainda não encaixa no nosso programa de implementação — mas preparamos um grupo gratuito com conteúdos pra te ajudar a crescer até lá.</p>' +
          '<button class="cta" id="groupBtn">Entrar no grupo gratuito <span class="chk">→</span></button>' +
          '<p class="micro" id="disqRedirect">Você será redirecionado em instantes…</p>' +
        '</section>' +
        // Sucesso
        '<section class="screen final" id="screen-success">' +
          '<div class="badge-circle">✓</div>' +
          '<h2>Agendamento confirmado!</h2>' +
          '<p id="successMsg">Sua reunião está reservada. Você vai receber a confirmação no seu WhatsApp. Prepare-se para vender 24h. 🚀</p>' +
        '</section>' +
      '</div>';

    pTrack = document.getElementById('progressTrack');
    pFill = document.getElementById('progressFill');
    elIntro = document.getElementById('screen-intro');
    elFlow = document.getElementById('screen-flow');
    elSchedule = document.getElementById('screen-schedule');
    elDisq = document.getElementById('screen-disq');
    elSuccess = document.getElementById('screen-success');

    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('nextBtn').addEventListener('click', goNext);
    document.getElementById('backBtn').addEventListener('click', goBack);
    document.getElementById('schedBack').addEventListener('click', function () { show(elFlow); renderStep(); });
    document.getElementById('confirmBtn').addEventListener('click', confirmBooking);
    document.getElementById('groupBtn').addEventListener('click', function () { window.location.href = GROUP_URL; });
    document.getElementById('fitWa').addEventListener('click', function () {
      this.href = fitWhatsAppHref(); // atualiza msg pré-pronta antes de abrir o WhatsApp
      pixel('EncaixeWhatsApp', { variante: VARIANT }, null, true);
    });
  }

  function show(el) {
    [elIntro, elFlow, elSchedule, elDisq, elSuccess].forEach(function (s) { s.classList.remove('active'); });
    void el.offsetWidth;
    el.classList.add('active');
    window.scrollTo(0, 0);
  }

  function setProgress(frac) { pTrack.classList.add('show'); pFill.style.width = Math.min(frac, 1) * 100 + '%'; }

  // ---------------------------------------------------------------- fluxo
  function start() {
    answers = {}; history = []; current = 'nome';
    if (!sent.start) { sent.start = true; pixel('IniciouFormulario', { variante: VARIANT }, null, true); }
    show(elFlow); renderStep();
  }

  function maskPhone(el) {
    el.addEventListener('input', function (e) {
      var x = e.target.value.replace(/\D/g, '').slice(0, 11).match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
      e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });
  }

  function renderStep() {
    var step = STEPS[current];
    var depth = history.length + 1;
    setProgress(Math.min(depth / ESTIMATED, 0.9));

    var html = '<div class="step-badge"><span class="num">' + depth + '</span><span class="dot"></span></div>';
    html += '<p class="question">' + step.q + '</p>';
    if (step.help) html += '<p class="help">' + step.help + '</p>';

    var sc = document.getElementById('stepContent');
    var nextBtn = document.getElementById('nextBtn');

    if (step.type === 'choice') {
      html += '<div class="choices">';
      step.options.forEach(function (opt, i) {
        var sel = answers[current] === opt ? ' selected' : '';
        html += '<button type="button" class="choice' + sel + '" data-val="' + esc(opt) + '">' +
          '<span class="letter">' + letter(i) + '</span><span class="opt-text">' + esc(opt) + '</span></button>';
      });
      html += '</div>';
      sc.innerHTML = html;
      Array.prototype.forEach.call(sc.querySelectorAll('.choice'), function (btn) {
        btn.addEventListener('click', function () {
          answers[current] = btn.getAttribute('data-val');
          Array.prototype.forEach.call(sc.querySelectorAll('.choice'), function (b) { b.classList.remove('selected'); });
          btn.classList.add('selected');
        });
      });
    } else {
      var val = answers[current] || '';
      html += '<div class="field"><input class="answer" id="answer" type="' + step.inputType + '" autocomplete="' +
        step.autocomplete + '" placeholder="' + esc(step.ph) + '" value="' + esc(val) + '"></div><p class="error" id="err"></p>';
      sc.innerHTML = html;
      var input = document.getElementById('answer');
      if (step.type === 'tel') maskPhone(input);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); goNext(); } });
      input.addEventListener('input', function () { input.classList.remove('invalid'); document.getElementById('err').textContent = ''; });
      setTimeout(function () { input.focus(); }, 60);
    }

    nextBtn.innerHTML = 'Continuar <span class="chk">✓</span>';
    document.getElementById('backBtn').hidden = false;
  }

  function goNext() {
    var step = STEPS[current];
    if (step.type !== 'choice') {
      var input = document.getElementById('answer');
      var msg = step.validate ? step.validate(input.value) : '';
      if (msg) { input.classList.add('invalid'); document.getElementById('err').textContent = msg; input.focus(); return; }
      answers[current] = input.value.trim();
    } else if (!answers[current]) {
      var first = document.querySelector('#stepContent .choice');
      if (first) first.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 200 });
      return;
    }

    captureDisqualified(); // marca o lead pro n8n; o fluxo segue normalmente

    var target = step.next(answers);
    if (target === 'SCHEDULE') { goSchedule(); return; }

    history.push(current);
    current = target;
    renderStep();
  }

  function goBack() {
    if (history.length === 0) { pFill.style.width = '0%'; pTrack.classList.remove('show'); show(elIntro); return; }
    current = history.pop();
    renderStep();
  }

  // ---------------------------------------------------------------- desqualificação (silenciosa)
  // Na primeira resposta que desqualifica, captura o lead no n8n (status parcial)
  // para não perder quem abandonar o formulário no meio. Uma vez por sessão —
  // o payload completo, com todos os motivos, vai no /api/book ao agendar.
  function captureDisqualified() {
    if (sent.parcial) return;
    var reasons = disqReasons();
    if (!reasons.length) return;
    sent.parcial = true;
    var motivo = reasons.join(' | ');
    var id = genId();
    pixel('Desqualificado', { motivo: motivo, variante: VARIANT }, id, true);
    post('/api/lead', Object.assign({ status: 'parcial_desqualificado', motivo: motivo, event_id: id }, leadData()));
  }

  // ---------------------------------------------------------------- tela de corte (DESATIVADA)
  // Mantida no código caso você queira voltar a barrar lead no formulário:
  // basta um step retornar 'DISQUALIFY:<motivo>' e chamar disqualify() no goNext().
  function disqualify(reason) {
    setProgress(1);
    var msgs = {
      faturamento: 'Nosso programa de implementação é desenhado para empresas que já faturam acima de R$30k/mês. Mas preparamos um grupo gratuito com conteúdos pra te ajudar a chegar lá.',
      base: 'Para montar o funil de WhatsApp a gente precisa de uma base de contatos pra trabalhar. Entra no nosso grupo gratuito — lá te ajudamos a organizar isso do zero.',
      orcamento: 'Para montar um funil que dá resultado, o investimento mínimo faz diferença. Quando esse for o seu momento, a gente te espera. Por enquanto, entra no grupo gratuito com nossos conteúdos.'
    };
    document.getElementById('disqMsg').textContent = msgs[reason] || msgs.faturamento;

    // captura o lead desqualificado (não bloqueia a UI) + evento custom na Meta (dedup)
    var disqId = genId();
    pixel('Desqualificado', { motivo: DISQ_REASON[reason] || reason, variante: VARIANT }, disqId, true);
    post('/api/lead', Object.assign({ status: 'desqualificado', motivo: DISQ_REASON[reason] || reason, event_id: disqId }, leadData()));

    show(elDisq);
    // redireciona pro grupo após alguns segundos
    setTimeout(function () { window.location.href = GROUP_URL; }, 6000);
  }

  // ---------------------------------------------------------------- agendamento
  function goSchedule() {
    history.push(current);
    setProgress(0.95);
    document.getElementById('schedNum').textContent = history.length + 1;
    show(elSchedule);
    renderDates();
    // Meta: Lead qualificado (chegou no agendamento) — Pixel + CAPI, dedup pelo event_id
    if (!sent.lead) {
      sent.lead = true;
      var id = genId();
      pixel('Lead', { content_name: 'lead_qualificado', variante: VARIANT }, id);
      post('/api/event', Object.assign({ event_name: 'Lead', event_id: id, custom_data: { variante: VARIANT } }, leadData()));

      // /carros dispara também um evento próprio, pra separar o dado do nicho
      // sem tirar o lead da visão global (o padrão acima continua valendo).
      if (VARIANT === 'C') {
        var idc = 'lc_' + id;
        pixel('LeadCarros', { content_name: 'lead_qualificado_carros', variante: VARIANT }, idc, true);
        post('/api/event', Object.assign({ event_name: 'LeadCarros', event_id: idc, custom_data: { variante: VARIANT } }, leadData()));
      }
    }
  }

  // gera os próximos N dias úteis (seg-sex) no fuso de São Paulo
  function spParts(d) {
    var f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', hour12: false });
    var o = {}; f.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    return o; // {year, month, day, weekday, hour}
  }
  var DOW = { Sun: 'DOM', Mon: 'SEG', Tue: 'TER', Wed: 'QUA', Thu: 'QUI', Fri: 'SEX', Sat: 'SÁB' };
  var MON = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  function upcomingDays(count) {
    var out = [], probe = new Date(), guard = 0;
    while (out.length < count && guard < 40) {
      var p = spParts(probe);
      if (p.weekday !== 'Sat' && p.weekday !== 'Sun') {
        out.push({ iso: p.year + '-' + p.month + '-' + p.day, dow: DOW[p.weekday], day: p.day, mon: MON[parseInt(p.month, 10) - 1] });
      }
      probe = new Date(probe.getTime() + 86400000);
      guard++;
    }
    return out;
  }

  // dias liberados: hoje + o próximo dia útil. Se hoje já não cabe mais nenhum
  // horário (passou do último slot), começa a contar a partir de amanhã.
  function freeDays(days) {
    var nowSP = spParts(new Date());
    var todayIso = nowSP.year + '-' + nowSP.month + '-' + nowSP.day;
    var nowMin = parseInt(nowSP.hour, 10) * 60;
    var slots = allSlots();
    var lastSlot = slots[slots.length - 1];
    return days.filter(function (d) {
      return !(d.iso === todayIso && toMin(lastSlot) <= nowMin + 30);
    }).slice(0, FREE_DAYS);
  }

  function renderDates() {
    var days = upcomingDays(10);
    // libera só hoje e o dia seguinte; o resto aparece "Ocupado" (escassez)
    var freeSet = {};
    freeDays(days).forEach(function (d) { freeSet[d.iso] = true; });
    var wrap = document.getElementById('dates');
    wrap.innerHTML = '';
    days.forEach(function (d) {
      var free = !!freeSet[d.iso];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'date-chip' + (free ? '' : ' taken');
      b.setAttribute('data-iso', d.iso);
      b.innerHTML = '<span class="dow">' + d.dow + '</span><span class="day">' + d.day + '</span>' +
        (free ? '<span class="mon">' + d.mon + '</span>' : '<span class="tag">Ocupado</span>');
      if (free) {
        b.addEventListener('click', function () { selectDate(d.iso, b); });
      } else {
        b.disabled = true;
      }
      wrap.appendChild(b);
    });
  }

  function allSlots() {
    var out = [];
    for (var h = 9; h < 18; h++) { out.push(pad(h) + ':00'); out.push(pad(h) + ':30'); }
    return out; // 09:00 ... 17:30
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function selectDate(iso, btn) {
    selectedDate = iso; selectedTime = null;
    Array.prototype.forEach.call(document.querySelectorAll('.date-chip'), function (c) { c.classList.remove('selected'); });
    btn.classList.add('selected');
    document.getElementById('confirmBtn').disabled = true;
    var wrap = document.getElementById('timesWrap');
    wrap.innerHTML = '<p class="cal-loading"><span class="spin"></span> Carregando horários…</p>';

    fetch('/api/availability?date=' + encodeURIComponent(iso))
      .then(function (r) { return r.json(); })
      .then(function (j) { renderTimes(iso, (j && j.booked) || []); })
      .catch(function () { renderTimes(iso, []); });
  }

  function renderTimes(iso, booked) {
    var wrap = document.getElementById('timesWrap');
    var slots = allSlots();

    // esconde horários que já passaram, se for hoje (fuso SP)
    var nowSP = spParts(new Date());
    var todayIso = nowSP.year + '-' + nowSP.month + '-' + nowSP.day;
    var nowMin = parseInt(nowSP.hour, 10) * 60 + 0;

    // horários que de fato dá pra reservar (não passou e não está booked no KV)
    var bookable = slots.filter(function (t) {
      if (iso === todayIso && toMin(t) <= nowMin + 30) return false;
      return booked.indexOf(t) === -1;
    });
    // libera só FREE_TIMES horários; o resto fica "Ocupado" (escassez), estável por dia
    var freeSet = pickFree(bookable, FREE_TIMES, function (t) { return t; }, iso);

    var html = '<div class="times">';
    var available = 0;
    slots.forEach(function (t) {
      var past = (iso === todayIso) && (toMin(t) <= nowMin + 30);
      if (past) return;
      var free = !!freeSet[t];
      html += '<button type="button" class="time-slot' + (free ? '' : ' taken') + '" data-t="' + t + '"' + (free ? '' : ' disabled') + '>' + t + '</button>';
      if (free) available++;
    });
    html += '</div>';
    if (available === 0) html = '<p class="cal-empty">Sem horários livres neste dia. Tente o encaixe pelo WhatsApp abaixo.</p>';
    wrap.innerHTML = html;

    Array.prototype.forEach.call(wrap.querySelectorAll('.time-slot:not(.taken)'), function (b) {
      b.addEventListener('click', function () {
        selectedTime = b.getAttribute('data-t');
        Array.prototype.forEach.call(wrap.querySelectorAll('.time-slot'), function (x) { x.classList.remove('selected'); });
        b.classList.add('selected');
        document.getElementById('confirmBtn').disabled = false;
      });
    });
  }
  function toMin(t) { var p = t.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }

  function confirmBooking() {
    if (!selectedDate || !selectedTime) return;
    var btn = document.getElementById('confirmBtn');
    btn.disabled = true;
    btn.innerHTML = 'Reservando… <span class="chk"></span>';

    var schedId = genId(); // mesmo id no Pixel e na CAPI -> dedup
    post('/api/book', Object.assign({ date: selectedDate, time: selectedTime, event_id: schedId }, leadData()))
      .then(function (r) {
        if (r && r.ok) {
          // Meta: Schedule (agendamento realizado) — Pixel; CAPI já disparou no /api/book
          pixel('Schedule', { content_name: 'agendamento_demo', variante: VARIANT }, schedId);
          // Meta: Purchase (espelho p/ campanhas de Vendas) — dedup com o servidor via 'pur_' + schedId
          pixel('Purchase', { value: 1, currency: 'BRL', content_name: 'agendamento_demo', variante: VARIANT }, 'pur_' + schedId);
          // Eventos exclusivos do funil de carros — a CAPI dispara os pares no /api/book
          if (VARIANT === 'C') {
            pixel('AgendamentoCarros', { content_name: 'agendamento_demo_carros', variante: VARIANT }, 'agc_' + schedId, true);
            pixel('PurchaseCarros', { value: 1, currency: 'BRL', content_name: 'agendamento_demo_carros', variante: VARIANT }, 'purc_' + schedId, true);
          }
          setProgress(1);
          var msg = document.getElementById('successMsg');
          msg.textContent = 'Sua reunião está reservada para ' + prettyDate(selectedDate) + ' às ' + selectedTime +
            ' (horário de Brasília). Você vai receber a confirmação no seu WhatsApp. 🚀';
          show(elSuccess);
        } else if (r && r.error === 'slot_taken') {
          btn.innerHTML = 'Confirmar agendamento <span class="chk">✓</span>';
          btn.disabled = false;
          alert('Ops! Esse horário acabou de ser reservado por outra pessoa. Escolha outro, por favor.');
          selectDate(selectedDate, document.querySelector('.date-chip[data-iso="' + selectedDate + '"]'));
        } else {
          throw new Error('fail');
        }
      })
      .catch(function () {
        btn.innerHTML = 'Confirmar agendamento <span class="chk">✓</span>';
        btn.disabled = false;
        alert('Não consegui concluir agora. Tente novamente em instantes.');
      });
  }

  function prettyDate(iso) {
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  // monta o link do WhatsApp de encaixe com mensagem pronta (nome + dia/horário desejado)
  function fitWhatsAppHref() {
    var nome = (answers.nome || '').trim();
    var msg = 'Olá! Tentei agendar a demo do Aios CRM' + (nome ? (' — aqui é ' + nome) : '') +
      ', mas os horários estão ocupados. Consegue um encaixe pra mim?';
    if (selectedDate) msg += ' (de preferência ' + prettyDate(selectedDate) + (selectedTime ? ' às ' + selectedTime : '') + ')';
    return FIT_WHATSAPP_URL + '?text=' + encodeURIComponent(msg);
  }

  // ---------------------------------------------------------------- payload
  function leadData() {
    return Object.assign({
      nome: answers.nome || '',
      instagram: answers.instagram || '',
      whatsapp: answers.whatsapp || '',
      faturamento: answers.faturamento || '',
      investe: answers.investe || '',
      investe_quanto: answers.investe_quanto || '',
      experiencia: answers.experiencia || '',
      base_local: answers.base_local || '',
      orcamento: answers.orcamento || '',
      qualificado: disqReasons().length ? 'nao' : 'sim',
      motivo_desqualificacao: disqReasons().join(' | ')
    }, context(), metaBase());
  }

  function post(url, data) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); });
  }

  // ---------------------------------------------------------------- init
  function init() {
    root = document.getElementById('app');
    build();
    loadPixel();                                   // PageView automático
    pixel('ViewContent', { content_name: 'capa_' + VARIANT, variante: VARIANT });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
