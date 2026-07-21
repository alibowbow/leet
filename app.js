import { exams } from "./data/index.js";
import { circled } from "./data/helpers.js";

const STORAGE_KEY = "leet-reasoning-v1";
const COMPACT_VIEW = "(max-width: 920px), (max-width: 1180px) and (max-height: 620px)";
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const stored = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}; }
  catch { return {}; }
})();

const hashMatch = location.hash.match(/^#(\d{4})-(\d{1,2})$/);
const state = {
  year: Number(hashMatch?.[1]) || Number(stored.lastYear) || exams[0].year,
  index: Math.max(0, (Number(hashMatch?.[2]) || Number(stored.lastQuestion) || 1) - 1),
  responses: stored.responses ?? {},
  flipped: false,
  questionScroll: 0,
};

if (!exams.some((exam) => exam.year === state.year)) state.year = exams[0].year;

function currentExam() { return exams.find((exam) => exam.year === state.year) ?? exams[0]; }
function currentQuestion() { return currentExam().questions[state.index]; }
function responseKey(question = currentQuestion()) { return `${state.year}-${question.id}`; }
function currentResponse() { return state.responses[responseKey()] ?? {}; }

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    lastYear: state.year,
    lastQuestion: state.index + 1,
    responses: state.responses,
  }));
}

function setHash() {
  const next = `#${state.year}-${currentQuestion().id}`;
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
  const dataTable = block.table ? `
    <div class="data-table-wrap"><table class="data-table">
      <thead><tr>${block.table.headers.map((header) => `<th>${formatInline(header)}</th>`).join("")}</tr></thead>
      <tbody>${block.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${formatInline(String(cell))}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>` : "";
  const formula = block.formula ? `<span class="formula">${formatInline(block.formula)}</span>` : "";
  return `<section class="source-segment" data-section-index="${index}">${title}${paragraphs}${dataTable}${formula}</section>`;
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
  $("[data-question-card]").classList.remove("is-flipped");

  $("[data-year-label]").textContent = `${exam.year}학년도`;
  $("[data-question-label]").textContent = `${String(question.id).padStart(2, "0")} / ${exam.questions.length}`;
  $("[data-question-number]").textContent = String(question.id).padStart(2, "0");
  $("[data-question-type]").textContent = question.type;
  $("[data-question-stem]").textContent = question.stem;
  $("[data-solution-number]").textContent = String(question.id).padStart(2, "0");

  const source = $("[data-source-content]");
  source.innerHTML = renderSourceSections(question.sections);

  const statements = question.statements ?? [];
  $("[data-statements]").innerHTML = statements.length ? `
    <div class="statements-marker">&lt;보&nbsp;&nbsp;기&gt;</div>
    <div class="statements-box">${statements.map((statement) => `
      <div class="statement">
        <span class="statement-label">${escapeHtml(statement.label)}</span>
        <p>${formatInline(statement.text)}</p>
      </div>`).join("")}</div>` : "";

  $("[data-choices]").innerHTML = question.choices.map((choice) => `
    <button class="choice ${choice.diagram ? "has-diagram" : ""} ${response.selected === choice.number ? "is-selected" : ""}" type="button" data-choice="${choice.number}" aria-pressed="${response.selected === choice.number}"${choice.diagram ? ` aria-label="${escapeHtml(choice.diagram.ariaLabel)}"` : ""}>
      <span class="choice-number">${choice.number}</span>
      <span class="choice-text">${choice.diagram ? renderArgumentDiagram(choice.diagram) : formatInline(choice.label)}</span>
      <span class="choice-mark">✓</span>
    </button>`).join("");

  renderSolution(question, response);
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

function renderSolution(question, response) {
  const answerChoice = question.choices[question.answer - 1];
  const answerLabel = answerChoice.diagram ? "논증 구조 도식" : answerChoice.label;
  const checked = Boolean(response.checked);
  const correct = checked && response.selected === question.answer;
  $("[data-answer-reveal]").innerHTML = `
    <span class="answer-badge">${question.answer}</span>
    <span class="answer-copy"><small>공식 정답</small><strong>${circled[question.answer - 1]} ${formatInline(answerLabel)}</strong></span>
    ${checked ? `<span class="result-chip ${correct ? "correct" : "wrong"}">${correct ? "정답입니다" : `선택 ${circled[response.selected - 1]}`}</span>` : ""}`;
  $("[data-solution-summary]").innerHTML = `<p>${formatInline(question.explanation.summary)}</p>`;
  $("[data-solution-detail]").innerHTML = renderSolutionDetail(question.explanation.detail);
  $("[data-solution-visual]").innerHTML = renderVisual(question.explanation.visual);
  $("[data-verdicts]").innerHTML = question.explanation.verdicts.map((verdict) => `
    <article class="verdict ${verdict.correct ? "is-true" : "is-false"}">
      <span class="verdict-status">${verdict.correct ? "O" : "X"}</span>
      <div><strong>${formatInline(verdict.label)}</strong><p>${formatInline(verdict.reason)}</p></div>
    </article>`).join("");
}

function renderArgumentDiagram(diagram) {
  const renderGroup = (group) => `<span class="argument-group">${group.map((item, index) => `${index ? '<i class="argument-plus">+</i>' : ""}<span class="argument-term">${escapeHtml(item)}</span>`).join("")}</span>`;
  const roots = diagram.roots.map(renderGroup).join("");
  const levels = diagram.levels.map((level, index) => `${index ? '<span class="argument-down">↓</span>' : ""}<span class="argument-level">${renderGroup(level)}</span>`).join("");
  return `<span class="argument-diagram" aria-hidden="true"><span class="argument-roots">${roots}</span><span class="argument-root-arrows" aria-hidden="true"><i>↓</i><i>↓</i></span>${levels}</span>`;
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
  const responses = exam.questions.map((question) => state.responses[`${state.year}-${question.id}`] ?? {});
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
  const key = responseKey();
  const response = state.responses[key] ?? {};
  if (response.selected === number) delete state.responses[key];
  else state.responses[key] = { selected: number, checked: false };
  save();
  renderQuestion({ preserveScroll: true });
}

function checkAnswer() {
  const response = currentResponse();
  if (response.selected) state.responses[responseKey()] = { ...response, checked: true };
  if (isCompactView()) state.questionScroll = questionScroller()?.scrollTop ?? 0;
  state.flipped = true;
  save();
  renderSolution(currentQuestion(), currentResponse());
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
  $("[data-index-year]").textContent = `${exam.year}학년도`;
  $("[data-question-index]").innerHTML = exam.questions.map((question, index) => {
    const response = state.responses[`${state.year}-${question.id}`] ?? {};
    const status = response.checked ? (response.selected === question.answer ? "is-correct" : "is-wrong") : (response.selected ? "is-done" : "");
    return `<button class="index-button ${index === state.index ? "is-current" : ""} ${status}" type="button" data-jump="${index}">${String(question.id).padStart(2, "0")}</button>`;
  }).join("");
  $("[data-index-dialog]").showModal();
}

function openYears() {
  $("[data-year-list]").innerHTML = exams.map((exam) => `<button class="year-option ${exam.year === state.year ? "is-active" : ""}" type="button" data-year="${exam.year}"><strong>${exam.year}학년도</strong><span>${exam.questions.length}문항</span></button>`).join("");
  $("[data-year-dialog]").showModal();
}

document.addEventListener("click", (event) => {
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
  if (/^[1-5]$/.test(event.key) && !state.flipped) selectChoice(Number(event.key));
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
