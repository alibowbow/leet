import { parts } from "./data/index.js?v=20260722-2026-reasoning";
import { circled } from "./data/helpers.js";

const STORAGE_KEY = "leet-reasoning-v1";
const COMPACT_VIEW = "(max-width: 920px), (max-width: 1180px) and (max-height: 620px)";
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const stored = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}; }
  catch { return {}; }
})();

const partHashMatch = location.hash.match(/^#(reasoning|essay)-(\d{4})-(\d{1,2})$/);
const legacyHashMatch = location.hash.match(/^#(\d{4})-(\d{1,2})$/);
const initialPart = partHashMatch?.[1] ?? (legacyHashMatch ? "reasoning" : (stored.lastPart ?? "reasoning"));
const initialCatalog = parts.find((part) => part.id === initialPart) ?? parts[0];
const savedPosition = stored.positions?.[initialCatalog.id] ?? {};
const state = {
  part: initialCatalog.id,
  year: Number(partHashMatch?.[2]) || Number(legacyHashMatch?.[1]) || Number(savedPosition.year) || Number(stored.lastYear) || initialCatalog.exams[0].year,
  index: Math.max(0, (Number(partHashMatch?.[3]) || Number(legacyHashMatch?.[2]) || Number(savedPosition.question) || Number(stored.lastQuestion) || 1) - 1),
  responses: stored.responses ?? {},
  positions: stored.positions ?? {},
  flipped: false,
  questionScroll: 0,
  modelAnswer: 0,
};

if (!initialCatalog.exams.some((exam) => exam.year === state.year)) state.year = initialCatalog.exams[0].year;

function currentPart() { return parts.find((part) => part.id === state.part) ?? parts[0]; }
function currentExam() { return currentPart().exams.find((exam) => exam.year === state.year) ?? currentPart().exams[0]; }
function currentQuestion() { return currentExam().questions[state.index]; }
function responseKey(question = currentQuestion(), part = state.part) {
  return part === "reasoning" ? `${state.year}-${question.id}` : `${part}-${state.year}-${question.id}`;
}
function currentResponse() { return state.responses[responseKey()] ?? {}; }
function isEssay() { return state.part === "essay"; }

if (state.index >= currentExam().questions.length) state.index = 0;

function isCompactView() { return matchMedia(COMPACT_VIEW).matches; }

function questionScroller() {
  return isCompactView() ? $(".study-stage") : $(".question-layout");
}

function solutionScroller() {
  return isCompactView() ? $(".study-stage") : $(".solution-layout");
}

function setViewportHeight() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${Math.round(viewportHeight)}px`);
}

function save() {
  state.positions[state.part] = { year: state.year, question: state.index + 1 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    lastPart: state.part,
    lastYear: state.year,
    lastQuestion: state.index + 1,
    responses: state.responses,
    positions: state.positions,
  }));
}

function setHash() {
  const next = state.part === "reasoning"
    ? `#${state.year}-${currentQuestion().id}`
    : `#essay-${state.year}-${currentQuestion().id}`;
  if (location.hash !== next) history.replaceState(null, "", next);
}

function sourceMarker(block, previousMarker = "") {
  const title = block.title ?? "";
  const role = /^(A|B|갑|을|병)$/u.exec(title)?.[1];
  if (role && new RegExp(`(?:^|\\n\\n)${role}:`, "u").test(block.text ?? "")) {
    return { value: "", key: previousMarker };
  }
  if (role) return { value: `${role}:`, key: role };
  const printedMarker = /^(<[^>]+>|\[[^\]]+\])/u.exec(title)?.[1] ?? "";
  if (printedMarker && (block.text ?? "").includes(printedMarker)) {
    return { value: "", key: printedMarker };
  }
  if (!printedMarker || printedMarker === previousMarker) {
    return { value: "", key: printedMarker || previousMarker };
  }
  return { value: printedMarker, key: printedMarker };
}

function renderSection(block, index, marker = "") {
  const title = marker ? `<div class="source-marker">${escapeHtml(marker)}</div>` : "";
  const paragraphs = block.text
    ? block.text.split(/\n\n+/).map((part) => `<p>${formatInline(part)}</p>`).join("")
    : "";
  const tableClass = block.tableClass ? ` ${escapeHtml(block.tableClass)}` : "";
  const dataTable = block.table ? `
    <div class="data-table-wrap"><table class="data-table${tableClass}">
      <thead><tr>${block.table.headers.map((header) => renderTableCell(header, "th")).join("")}</tr></thead>
      <tbody>${block.table.rows.map((row) => `<tr>${row.map((cell) => renderTableCell(cell, "td")).join("")}</tr>`).join("")}</tbody>
    </table></div>` : "";
  const formula = block.formula ? `<span class="formula">${formatInline(block.formula)}</span>` : "";
  const kind = block.kind ? ` source-${escapeHtml(block.kind)}` : "";
  return `<section class="source-segment${kind}" data-section-index="${index}">${title}${paragraphs}${dataTable}${formula}</section>`;
}

function renderTableCell(cell, tag) {
  if (!cell || typeof cell !== "object") return `<${tag}>${formatInline(String(cell ?? ""))}</${tag}>`;
  const className = cell.className ? ` class="${escapeHtml(cell.className)}"` : "";
  const image = cell.image
    ? `<img class="source-table-image" src="${escapeHtml(cell.image)}" alt="${escapeHtml(cell.alt ?? "")}">`
    : "";
  const copy = cell.text ? formatInline(cell.text) : "";
  return `<${tag}${className}>${image}${copy}</${tag}>`;
}

function renderSourceSections(sections) {
  let previousMarker = "";
  const content = sections.map((block, index) => {
    const marker = sourceMarker(block, previousMarker);
    previousMarker = marker.key;
    return renderSection(block, index, marker.value);
  }).join("");
  return `<div class="original-source">${content}</div>`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function formatInline(value = "") {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[\[u\]\]([\s\S]+?)\[\[\/u\]\]/g, '<span class="source-underline">$1</span>')
    .replace(/\[\[blank\]\]([\s\S]+?)\[\[\/blank\]\]/g, '<span class="source-blank">$1</span>')
    .replace(/\[\[math\]\]([\s\S]+?)\[\[\/math\]\]/g, '<span class="source-math">$1</span>')
    .replace(/\n/g, "<br>");
}

function renderQuestion({ preserveScroll = false } = {}) {
  const exam = currentExam();
  const question = currentQuestion();
  const response = currentResponse();
  const scrollContainer = questionScroller();
  const previousScroll = preserveScroll ? scrollContainer?.scrollTop ?? 0 : 0;
  if (!preserveScroll) state.questionScroll = 0;
  state.flipped = false;
  state.modelAnswer = 0;
  $("[data-question-card]").classList.remove("is-flipped");

  document.documentElement.dataset.activePart = state.part;
  $("[data-question-card]").classList.toggle("is-essay", isEssay());
  $("[data-brand-part]").textContent = currentPart().label;
  $$('.part-tab[data-part]').forEach((tab) => {
    const active = tab.dataset.part === state.part;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  $("[data-year-label]").textContent = `${exam.year}학년도`;
  $("[data-question-label]").textContent = `${String(question.id).padStart(2, "0")} / ${exam.questions.length}`;
  $("[data-question-number]").textContent = String(question.id).padStart(2, "0");
  $("[data-question-type]").textContent = question.type;
  $("[data-question-stem]").textContent = question.stem;
  $("[data-solution-number]").textContent = String(question.id).padStart(2, "0");
  $("[data-reset-current]").hidden = isEssay();
  $("[data-reveal-label]").textContent = isEssay() ? "공략법 · 모범답안 보기" : "정답 · 해설 보기";
  $("[data-solution-eyebrow]").textContent = isEssay() ? "ESSAY GUIDE & MODEL ANSWERS" : "ANSWER & REASONING";

  if (isEssay()) renderEssayQuestion(question);
  else renderObjectiveQuestion(question, response);

  if (isEssay()) renderEssaySolution(question);
  else renderSolution(question, response);
  renderProgress();
  updateNavigation();
  setHash();
  save();
  if (!preserveScroll) {
    if (scrollContainer) scrollContainer.scrollTop = 0;
    $(".source-pane").scrollTop = 0;
    $(".answer-content").scrollTop = 0;
  }
  const solutionLayout = !isCompactView() ? $(".solution-layout") : null;
  if (solutionLayout) solutionLayout.scrollTop = 0;
  requestAnimationFrame(() => {
    fitVisibleContent();
    if (preserveScroll && scrollContainer) scrollContainer.scrollTop = previousScroll;
  });
}

function renderObjectiveQuestion(question, response) {
  $("[data-source-content]").innerHTML = renderSourceSections(question.sections);
  const statements = question.statements ?? [];
  $("[data-statements]").innerHTML = statements.length ? `
    <div class="statements-marker">&lt;보&nbsp;&nbsp;기&gt;</div>
    <div class="statements-box">${statements.map((statement) => `
      <div class="statement">
        <span class="statement-label">${escapeHtml(statement.label)}</span>
        <p>${formatInline(statement.text)}</p>
      </div>`).join("")}</div>` : "";
  $("[data-choices]").innerHTML = question.choices.map((choice) => `
    <button class="choice ${choice.diagram ? "has-diagram" : ""} ${choice.image ? "has-source-image" : ""} ${response.selected === choice.number ? "is-selected" : ""}" type="button" data-choice="${choice.number}" aria-pressed="${response.selected === choice.number}"${choice.diagram || choice.image ? ` aria-label="${escapeHtml(choice.diagram?.ariaLabel ?? choice.image?.alt ?? choice.label)}"` : ""}>
      <span class="choice-number">${choice.number}</span>
      <span class="choice-text">${choice.diagram ? renderArgumentDiagram(choice.diagram) : choice.image ? `<img class="choice-source-image" src="${escapeHtml(choice.image.src)}" alt="${escapeHtml(choice.image.alt)}">` : formatInline(choice.label)}</span>
      <span class="choice-mark">✓</span>
    </button>`).join("");
}

function renderEssayQuestion(question) {
  const mainSections = question.sections.filter((section) => section.placement !== "reference");
  const referenceSections = question.sections.filter((section) => section.placement === "reference");
  $("[data-source-content]").innerHTML = renderSourceSections(mainSections);
  $("[data-statements]").innerHTML = `<div class="essay-reference-source">${renderSourceSections(referenceSections)}</div>`;
  $("[data-choices]").innerHTML = `
    <div class="essay-requirement-strip" aria-label="작성 조건 요약">
      <span>${escapeHtml(question.meta.wordLimit)}</span>
      <span>${escapeHtml(String(question.meta.points))}점</span>
      <span>의견 ${escapeHtml(String(question.meta.minimumOpinions))}개 이상</span>
    </div>`;
}

function renderSolution(question, response) {
  const answerChoice = question.choices[question.answer - 1];
  const answerLabel = answerChoice.label;
  const checked = Boolean(response.checked);
  const correct = checked && response.selected === question.answer;
  $("[data-answer-reveal]").innerHTML = `
    <span class="answer-badge">${question.answer}</span>
    <span class="answer-copy"><small>공식 정답</small><strong>${circled[question.answer - 1]} ${formatInline(answerLabel)}</strong></span>
    ${checked ? `<span class="result-chip ${correct ? "correct" : "wrong"}">${correct ? "정답입니다" : `선택 ${circled[response.selected - 1]}`}</span>` : ""}`;
  $("[data-solution-summary]").innerHTML = `<p>${formatInline(question.explanation.summary)}</p>`;
  $("[data-solution-detail]").innerHTML = renderSolutionDetail(question.explanation.detail);
  $("[data-solution-visual]").innerHTML = renderVisual(question.explanation.visual);
  $("[data-model-answers]").innerHTML = "";
  $("[data-verdict-heading]").textContent = "선지 판정";
  $("[data-verdict-subtitle]").textContent = "근거를 짧게 확인하세요";
  $("[data-verdicts]").innerHTML = question.explanation.verdicts.map((verdict) => `
    <article class="verdict ${verdict.correct ? "is-true" : "is-false"}">
      <span class="verdict-status">${verdict.correct ? "O" : "X"}</span>
      <div><strong>${formatInline(verdict.label)}</strong><p>${formatInline(verdict.reason)}</p></div>
    </article>`).join("");
}

function renderEssaySolution(question) {
  const explanation = question.explanation;
  $("[data-answer-reveal]").innerHTML = `
    <span class="answer-badge essay-answer-badge">${question.id}</span>
    <span class="answer-copy"><small>논술 문항</small><strong>${escapeHtml(explanation.topic)}</strong></span>
    <span class="essay-meta-chip">${escapeHtml(question.meta.wordLimit)} · ${escapeHtml(String(question.meta.points))}점</span>`;
  $("[data-solution-summary]").innerHTML = `<p><strong>출제 의도</strong><br>${formatInline(explanation.intent)}</p>`;
  $("[data-solution-detail]").innerHTML = renderEssayGuide(explanation.strategy);
  $("[data-solution-visual]").innerHTML = renderEssayOutline(explanation.outline);
  $("[data-verdict-heading]").textContent = "채점 포인트";
  $("[data-verdict-subtitle]").textContent = "답안에 빠짐없이 반영하세요";
  $("[data-verdicts]").innerHTML = explanation.scorePoints.map((point, index) => `
    <article class="verdict essay-score-point">
      <span class="verdict-status">${index + 1}</span>
      <div><strong>${formatInline(point.title)}</strong><p>${formatInline(point.text)}</p></div>
    </article>`).join("");
  renderEssayModels(question);
}

function renderEssayGuide(strategy) {
  return `
    <section class="detail-principle essay-principle">
      <span>공략 핵심</span>
      <p>${formatInline(strategy.principle)}</p>
    </section>
    <section class="essay-time-plan" aria-label="권장 시간 배분">
      ${strategy.timePlan.map((item) => `<div><strong>${escapeHtml(item.time)}</strong><span>${formatInline(item.task)}</span></div>`).join("")}
    </section>
    <section class="reasoning-detail">
      <h3>단계별 작성법</h3>
      <ol>${strategy.steps.map((step, index) => `
        <li class="reasoning-step">
          <span class="reasoning-number">${index + 1}</span>
          <div><strong>${formatInline(step.title)}</strong><p>${formatInline(step.text)}</p></div>
        </li>`).join("")}</ol>
    </section>
    <aside class="detail-trap"><strong>감점 방지</strong><p>${formatInline(strategy.trap)}</p></aside>`;
}

function renderEssayOutline(outline) {
  return `<section class="essay-outline" aria-label="권장 답안 구조">
    <div class="essay-section-heading"><span>답안 뼈대</span><small>문단별 역할</small></div>
    <div class="essay-outline-grid">${outline.map((item, index) => `
      <article><span>${index + 1}</span><div><strong>${formatInline(item.title)}</strong><p>${formatInline(item.text)}</p></div></article>`).join("")}</div>
  </section>`;
}

function essayCharacterCount(text) {
  return [...text].length;
}

function renderEssayModels(question) {
  const answers = question.explanation.modelAnswers;
  const activeIndex = Math.min(state.modelAnswer, answers.length - 1);
  $("[data-model-answers]").innerHTML = `
    <section class="essay-model-section">
      <div class="essay-section-heading"><span>모범답안 3가지</span><small>입장과 논거 구성이 서로 다릅니다</small></div>
      <div class="model-answer-tabs" role="tablist" aria-label="모범답안 선택">
        ${answers.map((answer, index) => `<button id="model-answer-tab-${question.id}-${index}" type="button" role="tab" aria-selected="${index === activeIndex}" aria-controls="model-answer-panel-${question.id}-${index}" class="${index === activeIndex ? "is-active" : ""}" data-model-answer="${index}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(answer.title)}</button>`).join("")}
      </div>
      ${answers.map((answer, index) => `<article id="model-answer-panel-${question.id}-${index}" class="model-answer-panel" role="tabpanel" aria-labelledby="model-answer-tab-${question.id}-${index}" ${index === activeIndex ? "" : "hidden"}>
        <header><div><span>${escapeHtml(answer.badge)}</span><strong>${escapeHtml(answer.stance)}</strong></div><small>${essayCharacterCount(answer.text)}자</small></header>
        <div class="model-answer-body">${answer.text.split(/\n\n+/).map((paragraph) => `<p>${formatInline(paragraph)}</p>`).join("")}</div>
      </article>`).join("")}
    </section>`;
}

function renderArgumentDiagram(diagram) {
  const width = 360;
  const center = width / 2;
  const termStep = 34;
  const termHalfWidth = 9;
  const firstBaseline = 16;
  const layerGap = 33;
  const layers = diagram.layers.map((layer) => layer.map((group) => ({ ...group, center })));
  const termX = (group, index) => group.center + (index - ((group.items.length - 1) / 2)) * termStep;
  const targetX = (layer, target) => {
    for (const group of layer) {
      const index = group.items.indexOf(target);
      if (index >= 0) return termX(group, index);
    }
    return center;
  };

  const lastLayer = layers.at(-1);
  lastLayer.forEach((group, index) => {
    group.center = width * ((index + 1) / (lastLayer.length + 1));
  });
  for (let layerIndex = layers.length - 2; layerIndex >= 0; layerIndex -= 1) {
    layers[layerIndex].forEach((group) => {
      group.center = targetX(layers[layerIndex + 1], group.to);
    });
  }

  const extents = layers.flatMap((layer) => layer.flatMap((group) => [
    termX(group, 0) - termHalfWidth,
    termX(group, group.items.length - 1) + termHalfWidth,
  ]));
  const shift = center - ((Math.min(...extents) + Math.max(...extents)) / 2);
  layers.flat().forEach((group) => { group.center += shift; });

  const rows = layers.map((layer, layerIndex) => {
    const y = firstBaseline + (layerIndex * layerGap);
    return layer.map((group, groupIndex) => {
      const terms = group.items.map((item, itemIndex) => {
        const x = termX(group, itemIndex);
        const plus = itemIndex ? `<text class="argument-svg-plus" x="${x - (termStep / 2)}" y="${y}" text-anchor="middle">+</text>` : "";
        return `${plus}<text class="argument-svg-term" data-layer="${layerIndex}" data-term="${escapeHtml(item)}" x="${x}" y="${y}" text-anchor="middle">${escapeHtml(item)}</text>`;
      }).join("");
      const underline = group.to ? `<line class="argument-svg-underline" data-layer="${layerIndex}" data-group="${groupIndex}" x1="${termX(group, 0) - termHalfWidth - 1}" y1="${y + 5}" x2="${termX(group, group.items.length - 1) + termHalfWidth + 1}" y2="${y + 5}" />` : "";
      const arrow = group.to ? (() => {
        const nextY = firstBaseline + ((layerIndex + 1) * layerGap);
        const x = group.center;
        return `<g class="argument-svg-connector" data-from-layer="${layerIndex}" data-group="${groupIndex}" data-target="${escapeHtml(group.to)}" data-axis-x="${x}"><line x1="${x}" y1="${y + 8}" x2="${x}" y2="${nextY - 15}" /><path d="M ${x - 3} ${nextY - 19} L ${x} ${nextY - 15} L ${x + 3} ${nextY - 19}" /></g>`;
      })() : "";
      return `${terms}${underline}${arrow}`;
    }).join("");
  }).join("");
  const height = firstBaseline + ((layers.length - 1) * layerGap) + 17;
  return `<svg class="argument-diagram" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(diagram.ariaLabel)}" focusable="false">${rows}</svg>`;
}

function renderSolutionDetail(detail) {
  if (!detail) return "";
  const steps = detail.steps.map((step, index) => `
    <li class="reasoning-step">
      <span class="reasoning-number">${index + 1}</span>
      <div><strong>${formatInline(step.title)}</strong><p>${formatInline(step.text)}</p></div>
    </li>`).join("");
  return `
    <section class="detail-principle">
      <span>핵심 원리</span>
      <p>${formatInline(detail.principle)}</p>
    </section>
    <section class="reasoning-detail">
      <h3>단계별 풀이</h3>
      <ol>${steps}</ol>
    </section>
    <aside class="detail-trap"><strong>주의할 함정</strong><p>${formatInline(detail.trap)}</p></aside>`;
}

function renderVisual(visual) {
  if (!visual) return "";
  if (visual.type === "table") {
    return `<table class="visual-table"><thead><tr>${visual.headers.map((item) => `<th>${formatInline(item)}</th>`).join("")}</tr></thead><tbody>${visual.rows.map((row, index) => `<tr class="${visual.highlight?.includes(index) ? "is-highlight" : ""}">${row.map((item) => `<td>${formatInline(String(item))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  if (visual.type === "equation") {
    return `<div class="visual-equation">${visual.items.map((item) => `<div class="equation-card"><span>${formatInline(item.label)}</span><code>${escapeHtml(item.value)}</code></div>`).join("")}</div>`;
  }
  return `<div class="visual-flow" style="--count:${visual.items.length}">${visual.items.map((item, index) => `<div class="flow-step"><small>${formatInline(item.kicker || `STEP ${index + 1}`)}</small><strong>${formatInline(item.title)}</strong></div>`).join("")}</div>`;
}

function fitVisibleContent() {
  $("[data-source-content]")?.style.removeProperty("--fit-size");
  $(".answer-content")?.style.removeProperty("--fit-size");
}

function renderProgress() {
  const exam = currentExam();
  const responses = exam.questions.map((question) => state.responses[responseKey(question)] ?? {});
  const completed = responses.filter((item) => item.checked).length;
  const percent = Math.round((completed / exam.questions.length) * 100);
  $("[data-progress-value]").textContent = percent;
  $("[data-progress-ring]").style.setProperty("--progress", `${percent * 3.6}deg`);
  $("[data-solved-label]").textContent = `${completed}문항 완료`;
  $("[data-progress-bar]").style.width = `${((state.index + 1) / exam.questions.length) * 100}%`;
}

function updateNavigation() {
  const exam = currentExam();
  $("[data-action='previous']").disabled = state.index === 0;
  $("[data-action='next']").disabled = state.index === exam.questions.length - 1;
}

function selectChoice(number) {
  if (isEssay()) return;
  const key = responseKey();
  const response = state.responses[key] ?? {};
  if (response.selected === number) delete state.responses[key];
  else state.responses[key] = { selected: number, checked: false };
  save();
  renderQuestion({ preserveScroll: true });
}

function checkAnswer() {
  const response = currentResponse();
  if (isEssay()) state.responses[responseKey()] = { checked: true };
  else if (response.selected) state.responses[responseKey()] = { ...response, checked: true };
  if (isCompactView()) state.questionScroll = questionScroller()?.scrollTop ?? 0;
  state.flipped = true;
  save();
  if (isEssay()) renderEssaySolution(currentQuestion());
  else renderSolution(currentQuestion(), currentResponse());
  renderProgress();
  $("[data-question-card]").classList.add("is-flipped");
  requestAnimationFrame(() => {
    const scroller = solutionScroller();
    if (scroller) scroller.scrollTop = 0;
  });
}

function showQuestionFace() {
  state.flipped = false;
  $("[data-question-card]").classList.remove("is-flipped");
  requestAnimationFrame(() => {
    fitVisibleContent();
    const scroller = questionScroller();
    if (scroller) scroller.scrollTop = isCompactView() ? state.questionScroll : scroller.scrollTop;
  });
}

function move(delta) {
  const next = state.index + delta;
  if (next < 0 || next >= currentExam().questions.length) return;
  state.index = next;
  renderQuestion();
}

function openIndex() {
  const exam = currentExam();
  $("[data-index-year]").textContent = `${exam.year}학년도 · ${currentPart().label}`;
  $("[data-index-legend]").hidden = isEssay();
  $("[data-question-index]").innerHTML = exam.questions.map((question, index) => {
    const response = state.responses[responseKey(question)] ?? {};
    const status = isEssay()
      ? (response.checked ? "is-done" : "")
      : (response.checked ? (response.selected === question.answer ? "is-correct" : "is-wrong") : (response.selected ? "is-done" : ""));
    const number = String(question.id).padStart(2, "0");
    return `<button class="index-button ${index === state.index ? "is-current" : ""} ${status}" type="button" data-jump="${index}" aria-label="${question.id}번 · ${escapeHtml(question.type)}">
      <span class="index-number" aria-hidden="true">${number}</span>
      <span class="index-keyword">${escapeHtml(question.type)}</span>
    </button>`;
  }).join("");
  $("[data-index-dialog]").showModal();
  requestAnimationFrame(() => {
    $("[data-question-index] .is-current")?.scrollIntoView?.({ block: "center", inline: "nearest" });
  });
}

function openYears() {
  $("[data-year-list]").innerHTML = currentPart().exams.map((exam) => `<button class="year-option ${exam.year === state.year ? "is-active" : ""}" type="button" data-year="${exam.year}"><strong>${exam.year}학년도 · ${escapeHtml(currentPart().label)}</strong><span>${exam.questions.length}문항</span></button>`).join("");
  $("[data-year-dialog]").showModal();
}

function switchPart(partId) {
  if (partId === state.part || !parts.some((part) => part.id === partId)) return;
  state.positions[state.part] = { year: state.year, question: state.index + 1 };
  state.part = partId;
  const catalog = currentPart();
  const saved = state.positions[partId] ?? {};
  state.year = catalog.exams.some((exam) => exam.year === Number(saved.year)) ? Number(saved.year) : catalog.exams[0].year;
  const exam = currentExam();
  state.index = Math.min(Math.max(0, Number(saved.question || 1) - 1), exam.questions.length - 1);
  state.flipped = false;
  state.questionScroll = 0;
  renderQuestion();
}

document.addEventListener("click", (event) => {
  const part = event.target.closest(".part-tab[data-part]");
  if (part) return switchPart(part.dataset.part);
  const modelAnswer = event.target.closest("[data-model-answer]");
  if (modelAnswer) { state.modelAnswer = Number(modelAnswer.dataset.modelAnswer); return renderEssayModels(currentQuestion()); }
  const choice = event.target.closest("[data-choice]");
  if (choice) return selectChoice(Number(choice.dataset.choice));
  const jump = event.target.closest("[data-jump]");
  if (jump) { state.index = Number(jump.dataset.jump); $("[data-index-dialog]").close(); return renderQuestion(); }
  const year = event.target.closest("[data-year]");
  if (year) { state.year = Number(year.dataset.year); state.index = 0; $("[data-year-dialog]").close(); return renderQuestion(); }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "previous") move(-1);
  if (action === "next") move(1);
  if (action === "check-answer") checkAnswer();
  if (action === "flip-front") showQuestionFace();
  if (action === "open-index") openIndex();
  if (action === "open-years") openYears();
  if (action === "close-dialog") event.target.closest("dialog")?.close();
  if (action === "home") { state.index = 0; renderQuestion(); }
  if (action === "reset-current") { delete state.responses[responseKey()]; renderQuestion(); }
});

document.addEventListener("keydown", (event) => {
  if ($$("dialog[open]").length) return;
  const modelTab = event.target.closest?.("[data-model-answer]");
  if (modelTab && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    const count = currentQuestion().explanation.modelAnswers.length;
    const delta = event.key === "ArrowRight" ? 1 : -1;
    state.modelAnswer = (Number(modelTab.dataset.modelAnswer) + delta + count) % count;
    renderEssayModels(currentQuestion());
    requestAnimationFrame(() => $(`[data-model-answer="${state.modelAnswer}"]`)?.focus());
    return;
  }
  if (event.target.closest?.("button, input, textarea, select, [contenteditable='true']")) return;
  if (!isEssay() && /^[1-5]$/.test(event.key) && !state.flipped) selectChoice(Number(event.key));
  if (event.key === "Enter" && !state.flipped) checkAnswer();
  if (event.key === "ArrowLeft") move(-1);
  if (event.key === "ArrowRight") move(1);
  if (event.key === "Escape" && state.flipped) {
    showQuestionFace();
  }
});

setViewportHeight();
window.addEventListener("resize", () => {
  setViewportHeight();
  requestAnimationFrame(fitVisibleContent);
});
window.visualViewport?.addEventListener("resize", setViewportHeight);
window.addEventListener("orientationchange", setViewportHeight);
renderQuestion();
