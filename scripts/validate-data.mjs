import exam2027 from "../data/2027.js";

const official2027 = [
  5, 3, 3, 4, 5, 1, 1, 3, 3, 1,
  2, 4, 5, 5, 1, 2, 1, 2, 5, 4,
  2, 1, 5, 1, 1, 1, 2, 3, 1, 4,
  3, 3, 2, 4, 3, 3, 3, 1, 4, 1,
];

const officialUnderlineCounts2027 = new Map([
  [1, 1], [2, 2], [8, 5], [11, 3], [13, 2], [14, 3],
  [18, 1], [22, 2], [29, 1], [37, 3], [38, 1], [39, 1],
]);

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(exam2027.year === 2027, "시험 연도가 2027이 아닙니다.");
assert(exam2027.questions.length === 40, "2027학년도 문항 수는 40이어야 합니다.");

const ids = new Set();
let totalUnderlines = 0;
for (const [index, question] of exam2027.questions.entries()) {
  const tag = `${question.id}번`;
  assert(question.id === index + 1, `${tag}: 문항 순서가 연속적이지 않습니다.`);
  assert(!ids.has(question.id), `${tag}: 중복 문항 번호입니다.`);
  ids.add(question.id);

  assert(typeof question.stem === "string" && question.stem.length > 0, `${tag}: 발문이 없습니다.`);
  assert(Array.isArray(question.sections) && question.sections.length > 0, `${tag}: 지문 구역이 없습니다.`);
  assert(Array.isArray(question.choices) && question.choices.length === 5, `${tag}: 선택지는 5개여야 합니다.`);
  assert(Number.isInteger(question.answer) && question.answer >= 1 && question.answer <= 5, `${tag}: 정답 번호가 잘못되었습니다.`);
  assert(question.answer === official2027[index], `${tag}: 공식 정답표와 일치하지 않습니다.`);
  assert(question.choices.every((choice, choiceIndex) => choice.number === choiceIndex + 1), `${tag}: 선택지 번호가 잘못되었습니다.`);
  assert(Boolean(question.explanation?.summary), `${tag}: 해설 요약이 없습니다.`);
  assert(Array.isArray(question.explanation?.verdicts) && question.explanation.verdicts.length > 0, `${tag}: 선지 판정이 없습니다.`);
  assert(Boolean(question.explanation?.detail?.principle), `${tag}: 상세 해설의 핵심 원리가 없습니다.`);
  assert(Array.isArray(question.explanation?.detail?.steps) && question.explanation.detail.steps.length >= 3, `${tag}: 상세 해설은 3단계 이상이어야 합니다.`);
  assert(Boolean(question.explanation?.detail?.trap), `${tag}: 상세 해설의 함정 설명이 없습니다.`);

  const serialized = JSON.stringify(question);
  const underlineStarts = serialized.match(/\[\[u\]\]/g)?.length ?? 0;
  const underlineEnds = serialized.match(/\[\[\/u\]\]/g)?.length ?? 0;
  totalUnderlines += underlineStarts;
  assert(underlineStarts === underlineEnds, `${tag}: 원문 밑줄 표식의 시작과 끝이 맞지 않습니다.`);
  assert(!serialized.includes("[[u]][[/u]]"), `${tag}: 내용이 없는 원문 밑줄 표식이 있습니다.`);
  assert(
    underlineStarts === (officialUnderlineCounts2027.get(question.id) ?? 0),
    `${tag}: PDF 원문의 밑줄 개수와 일치하지 않습니다.`,
  );

  if (question.statements?.length && question.choices[question.answer - 1]?.members) {
    const answerMembers = question.choices[question.answer - 1].members;
    const trueMembers = question.statements
      .filter((statement) => question.explanation.verdicts.find((verdict) => verdict.label.startsWith(statement.label))?.correct)
      .map((statement) => statement.label);
    assert(
      JSON.stringify([...answerMembers].sort()) === JSON.stringify([...trueMembers].sort()),
      `${tag}: 해설의 O/X와 조합형 정답이 일치하지 않습니다.`,
    );
  }
}

assert(totalUnderlines === 25, "PDF 원문의 전체 밑줄 개수는 25개여야 합니다.");

if (failures.length) {
  console.error(`데이터 검증 실패 (${failures.length}건)`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`검증 완료: ${exam2027.title} ${exam2027.questions.length}문항`);
