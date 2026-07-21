import essay2027 from "../data/2027-essay.js";

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const opinionPattern = /의견([①②③④⑤⑥⑦⑧⑨⑩])/g;

assert(essay2027.year === 2027, "논술 학년은 2027이어야 합니다.");
assert(essay2027.subject === "논술", "논술 파트명이 잘못되었습니다.");
assert(essay2027.questions.length === 2, "2027학년도 논술은 2문항이어야 합니다.");

for (const [index, question] of essay2027.questions.entries()) {
  const tag = `${question.id}번`;
  assert(question.id === index + 1, `${tag}: 문항 번호가 연속적이지 않습니다.`);
  assert(question.meta.wordLimit === "900~1200자", `${tag}: 원문 분량 조건이 다릅니다.`);
  assert(question.meta.points === 50, `${tag}: 배점은 50점이어야 합니다.`);
  assert(question.meta.minimumOpinions === 4, `${tag}: 의견 활용 최소 개수는 4개입니다.`);
  assert(question.sections.filter((section) => section.kind === "conditions").length === 1, `${tag}: 조건 구역이 없습니다.`);
  assert(question.sections.filter((section) => section.kind === "case").length === 1, `${tag}: 사례 구역이 없습니다.`);
  assert(question.sections.filter((section) => section.kind === "opinions" && section.placement === "reference").length === 1, `${tag}: 의견 구역이 없습니다.`);

  const opinionText = question.sections.find((section) => section.kind === "opinions")?.text ?? "";
  const printedOpinions = opinionText.match(/(?:^|\n\n)([①②③④⑤⑥⑦⑧⑨⑩])/g) ?? [];
  assert(printedOpinions.length === 10, `${tag}: 원문 의견은 10개여야 합니다.`);

  const answers = question.explanation?.modelAnswers ?? [];
  assert(answers.length === 3, `${tag}: 모범답안은 정확히 3개여야 합니다.`);
  answers.forEach((answer, answerIndex) => {
    const answerTag = `${tag} 모범답안 ${String.fromCharCode(65 + answerIndex)}`;
    const count = [...answer.text].length;
    const citedOpinions = new Set([...answer.text.matchAll(opinionPattern)].map((match) => match[1]));
    assert(count >= 900 && count <= 1200, `${answerTag}: ${count}자로 900~1200자 조건을 벗어납니다.`);
    assert(citedOpinions.size >= 4, `${answerTag}: 서로 다른 의견을 4개 이상 활용해야 합니다.`);
    assert(Boolean(answer.title && answer.badge && answer.stance), `${answerTag}: 탭 메타데이터가 없습니다.`);
  });
}

for (const answer of essay2027.questions[0].explanation.modelAnswers) {
  assert(answer.text.includes("매출추산법") && answer.text.includes("경기전망법"), `1번 ${answer.title}: 두 과세 방식을 모두 비교해야 합니다.`);
}

const essay2Answers = essay2027.questions[1].explanation.modelAnswers;
assert(new Set(essay2Answers.map((answer) => answer.stance)).size === 3, "2번 모범답안은 견해A·B·C를 각각 지지해야 합니다.");
for (const answer of essay2Answers) {
  assert(["견해A", "견해B", "견해C"].every((view) => answer.text.includes(view)), `2번 ${answer.title}: 세 견해를 모두 명시해야 합니다.`);
  assert(answer.text.includes("한계"), `2번 ${answer.title}: 지지 견해의 한계를 명시해야 합니다.`);
}

if (failures.length) {
  console.error(`논술 데이터 검증 실패 (${failures.length}건)`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const counts = essay2027.questions.flatMap((question) => question.explanation.modelAnswers.map((answer) => [...answer.text].length));
console.log(`검증 완료: ${essay2027.title} ${essay2027.questions.length}문항 · 모범답안 글자수 ${counts.join(", ")}`);
