/* =========================================================================
   Aios CRM — Formulário de aplicação (estilo Chronos)
   Variantes A/B, ramificações, desqualificação e calendário nativo.
   ========================================================================= */
(function () {
  'use strict';

  var VARIANT = (window.AIOS_VARIANT === 'B') ? 'B' : 'A';

  // >>> TROQUE pelo link real do grupo (WhatsApp) <<<
  var GROUP_URL = 'https://chat.whatsapp.com/SEU_LINK_DO_GRUPO';

  // ---------------------------------------------------------------- helpers
  function notEmpty(msg) { return function (v) { return v.trim().length >= 2 ? '' : msg; }; }
  function validPhone(v) { return v.replace(/\D/g, '').length >= 10 ? '' : 'Digite um WhatsApp válido com DDD.'; }
  function letter(i) { return String.fromCharCode(65 + i); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function firstInvest() { return VARIANT === 'B' ? 'experiencia' : 'investe'; }

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
      validate: validPhone, next: function () { return 'faturamento'; } },

    faturamento: { type: 'choice',
      q: 'Qual o faturamento da sua empresa?',
      options: ['Mais de R$100k por mês', 'De R$50k a R$100k por mês', 'De R$30k a R$50k por mês', 'Até R$30k por mês'],
      next: function (a) { return a.faturamento === 'Até R$30k por mês' ? 'DISQUALIFY:faturamento' : firstInvest(); } },

    /* ---- Variante A: investimento ---- */
    investe: { type: 'choice',
      q: 'Você já investe em WhatsApp API Cloud para prospecção?',
      options: ['Sim, já invisto', 'Não, ainda não'],
      next: function (a) { return a.investe.indexOf('Sim') === 0 ? 'investe_quanto' : 'base'; } },
    investe_quanto: { type: 'choice',
      q: 'Quanto você investe por mês hoje?',
      options: ['Menos de R$1.000', 'R$1.000 a R$5.000', 'R$5.000 a R$15.000', 'Mais de R$15.000'],
      next: function () { return 'base'; } },

    /* ---- Variante B: experiência ---- */
    experiencia: { type: 'choice',
      q: 'Você já teve experiência com automações e prospecção via WhatsApp API?',
      options: ['Sim, já trabalhei com isso', 'Não, nunca usei'],
      next: function () { return 'base'; } },

    /* ---- Base de clientes ---- */
    base: { type: 'choice',
      q: 'Você tem sua base de clientes organizada hoje?',
      options: ['Sim, está organizada', 'Não tenho organizada'],
      next: function (a) { return a.base.indexOf('Sim') === 0 ? 'base_qtd' : 'base_local'; } },
    base_local: { type: 'choice',
      q: 'Mas você tem algum lugar onde esses contatos ficam guardados?',
      help: 'Pode ser planilha, celular, agenda, caderno... qualquer lugar.',
      options: ['Sim, tenho', 'Não tenho'],
      next: function (a) { return a.base_local.indexOf('Sim') === 0 ? 'base_qtd' : 'DISQUALIFY:base'; } },
    base_qtd: { type: 'choice',
      q: 'Quantos clientes você tem hoje, mais ou menos?',
      options: ['Até 100', 'De 100 a 500', 'De 500 a 2 mil', 'Mais de 2 mil'],
      next: function () { return 'orcamento'; } },

    /* ---- Orçamento ---- */
    orcamento: { type: 'choice',
      q: 'Recomendamos um investimento de no mínimo R$1.000 para montar seu funil de WhatsApp via WhatsApp Business API. Esse valor se alinha ao seu orçamento atual?',
      help: 'Esse é o investimento em mídia/estrutura — não inclui a nossa mão de obra.',
      options: ['Sim, faz sentido pra mim', 'Não se alinha agora'],
      next: function (a) { return a.orcamento.indexOf('Sim') === 0 ? 'SCHEDULE' : 'DISQUALIFY:orcamento'; } }
  };

  var DISQ_REASON = {
    faturamento: 'Faturamento até R$30k/mês',
    base: 'Sem base e sem local de armazenamento',
    orcamento: 'Orçamento abaixo de R$1.000'
  };

  // ---------------------------------------------------------------- state
  var answers = {};
  var history = [];        // pilha de ids visitados (p/ voltar)
  var current = null;
  var ESTIMATED = 9;       // p/ estimar a barra de progresso

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
    root.innerHTML =
      '<div class="progress-track" id="progressTrack"><div class="progress-fill" id="progressFill"></div></div>' +
      '<div class="body">' +
        // Capa
        '<section class="screen active" id="screen-intro">' +
          '<div class="logo"><img src="/assets/logo.png" alt="Aios CRM"><span>Aios CRM</span></div>' +
          '<h1><span class="emoji">📲</span> Donos de PME: <b>venda 24h no WhatsApp</b> sem contratar</h1>' +
          '<ul class="bullets">' +
            '<li><span class="emoji">✅</span>+40% em vendas, zero esforço</li>' +
            '<li><span class="emoji">🤖</span>IA responde cada lead em 1s</li>' +
            '<li><span class="emoji">📊</span>Kanban move o lead sozinho</li>' +
            '<li><span class="emoji">🏆</span>+500 empresas · 2M+ leads</li>' +
          '</ul>' +
          '<p class="filter">→ Exclusivo para PMEs que faturam R$30k+/mês e querem parar de perder lead e começar a escalar.</p>' +
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
  }

  function show(el) {
    [elIntro, elFlow, elSchedule, elDisq, elSuccess].forEach(function (s) { s.classList.remove('active'); });
    void el.offsetWidth;
    el.classList.add('active');
    window.scrollTo(0, 0);
  }

  function setProgress(frac) { pTrack.classList.add('show'); pFill.style.width = Math.min(frac, 1) * 100 + '%'; }

  // ---------------------------------------------------------------- fluxo
  function start() { answers = {}; history = []; current = 'nome'; show(elFlow); renderStep(); }

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

    var target = step.next(answers);
    if (target.indexOf('DISQUALIFY') === 0) { disqualify(target.split(':')[1]); return; }
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

  // ---------------------------------------------------------------- desqualificação
  function disqualify(reason) {
    setProgress(1);
    var msgs = {
      faturamento: 'Nosso programa de implementação é desenhado para empresas que já faturam acima de R$30k/mês. Mas preparamos um grupo gratuito com conteúdos pra te ajudar a chegar lá.',
      base: 'Para montar o funil de WhatsApp a gente precisa de uma base de contatos pra trabalhar. Entra no nosso grupo gratuito — lá te ajudamos a organizar isso do zero.',
      orcamento: 'Para montar um funil que dá resultado, o investimento mínimo faz diferença. Quando esse for o seu momento, a gente te espera. Por enquanto, entra no grupo gratuito com nossos conteúdos.'
    };
    document.getElementById('disqMsg').textContent = msgs[reason] || msgs.faturamento;

    // captura o lead desqualificado (não bloqueia a UI)
    post('/api/lead', Object.assign({ status: 'desqualificado', motivo: DISQ_REASON[reason] || reason }, leadData()));

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

  function renderDates() {
    var days = upcomingDays(10);
    var wrap = document.getElementById('dates');
    wrap.innerHTML = '';
    days.forEach(function (d) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'date-chip'; b.setAttribute('data-iso', d.iso);
      b.innerHTML = '<span class="dow">' + d.dow + '</span><span class="day">' + d.day + '</span><span class="mon">' + d.mon + '</span>';
      b.addEventListener('click', function () { selectDate(d.iso, b); });
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

    var html = '<div class="times">';
    var available = 0;
    slots.forEach(function (t) {
      var isTaken = booked.indexOf(t) !== -1;
      var past = (iso === todayIso) && (toMin(t) <= nowMin + 30);
      if (past) return;
      html += '<button type="button" class="time-slot' + (isTaken ? ' taken' : '') + '" data-t="' + t + '"' + (isTaken ? ' disabled' : '') + '>' + t + '</button>';
      if (!isTaken) available++;
    });
    html += '</div>';
    if (available === 0) html = '<p class="cal-empty">Sem horários livres neste dia. Escolha outra data.</p>';
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

    post('/api/book', Object.assign({ date: selectedDate, time: selectedTime }, leadData()))
      .then(function (r) {
        if (r && r.ok) {
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
      base_organizada: answers.base || '',
      base_local: answers.base_local || '',
      base_quantidade: answers.base_qtd || '',
      orcamento: answers.orcamento || ''
    }, context());
  }

  function post(url, data) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); });
  }

  // ---------------------------------------------------------------- init
  function init() { root = document.getElementById('app'); build(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
