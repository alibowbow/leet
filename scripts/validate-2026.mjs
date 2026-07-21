import { existsSync, statSync } from "node:fs";
import exam2026 from "../data/2026.js";

const officialAnswers = [
  2, 3, 2, 5, 2, 3, 1, 4, 5, 2,
  3, 1, 1, 5, 1, 3, 5, 1, 3, 2,
  1, 1, 5, 2, 4, 4, 3, 3, 2, 2,
  1, 4, 4, 3, 2, 5, 5, 3, 5, 4,
];

const underlineGroups = new Map([
  [3, 2], [4, 1], [9, 1], [14, 1], [17, 2],
  [32, 1], [33, 1], [35, 1], [37, 3], [38, 2], [40, 1],
]);

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(exam2026.year === 2026, "시험 연도가 2026이 아닙니다.");
assert(exam2026.form === "짝수형", "첨부된 문제지 유형은 짝수형이어야 합니다.");
assert(exam2026.questions.length === 40, "2026학년도 문항 수는 40이어야 합니다.");

for (const [index, question] of exam2026.questions.entries()) {
  const tag = `${question.id}번`;
  assert(question.id === index + 1, `${tag}: 문항 번호가 연속적이지 않습니다.`);
  assert(question.answer === officialAnswers[index], `${tag}: 짝수형 공식 정답과 다릅니다.`);
  assert(typeof question.type === "string" && question.type.length >= 2, `${tag}: 바로가기 핵심어가 없습니다.`);
  assert(typeof question.stem === "string" && question.stem.length > 0, `${tag}: 발문이 없습니다.`);
  assert(Array.isArray(question.sections) && question.sections.length > 0, `${tag}: 본문이 없습니다.`);
  assert(Array.isArray(question.choices) && question.choices.length === 5, `${tag}: 선택지는 5개여야 합니다.`);
  assert(question.choices.every((choice, choiceIndex) => choice.number === choiceIndex + 1), `${tag}: 선택지 번호가 잘못되었습니다.`);
  assert(question.choices.every((choice) => choice.image || (typeof choice.label === "string" && choice.label.length > 0)), `${tag}: 내용이 없는 선택지가 있습니다.`);

  const explanation = question.explanation;
  assert(Boolean(explanation?.summary), `${tag}: 해설 요약이 없습니다.`);
  assert(Boolean(explanation?.detail?.principle), `${tag}: 핵심 원리가 없습니다.`);
  assert(explanation?.detail?.steps?.length >= 3, `${tag}: 단계별 해설이 3단계 미만입니다.`);
  assert(Boolean(explanation?.detail?.trap), `${tag}: 함정 설명이 없습니다.`);
  assert(explanation?.verdicts?.length === (question.statements?.filter((item) => item.label !== "※").length || 5), `${tag}: 선지 판정 개수가 맞지 않습니다.`);
  assert(explanation.verdicts.every((item) => item.reason?.length >= 15), `${tag}: 선지별 근거가 지나치게 짧습니다.`);

  const serialized = JSON.stringify(question);
  const underlineStarts = serialized.match(/\[\[u\]\]/g)?.length ?? 0;
  const underlineEnds = serialized.match(/\[\[\/u\]\]/g)?.length ?? 0;
  assert(underlineStarts === underlineEnds, `${tag}: 밑줄 표식이 닫히지 않았습니다.`);
  assert(underlineStarts === (underlineGroups.get(question.id) ?? 0), `${tag}: HWP 원문의 밑줄 구간 수와 다릅니다.`);

  const blankStarts = serialized.match(/\[\[blank\]\]/g)?.length ?? 0;
  const blankEnds = serialized.match(/\[\[\/blank\]\]/g)?.length ?? 0;
  assert(blankStarts === blankEnds, `${tag}: 빈칸 표식이 닫히지 않았습니다.`);

  const mathStarts = serialized.match(/\[\[math\]\]/g)?.length ?? 0;
  const mathEnds = serialized.match(/\[\[\/math\]\]/g)?.length ?? 0;
  assert(mathStarts === mathEnds, `${tag}: 수식 표식이 닫히지 않았습니다.`);

  if (question.statements?.length && question.choices[question.answer - 1]?.members) {
    const expected = question.choices[question.answer - 1].members;
    const actual = question.explanation.verdicts.filter((item) => item.correct).map((item) => item.label);
    assert(JSON.stringify([...expected].sort()) === JSON.stringify([...actual].sort()), `${tag}: 정답 조합과 선지 O/X가 다릅니다.`);
  } else {
    const correct = question.explanation.verdicts.flatMap((item, verdictIndex) => item.correct ? [verdictIndex + 1] : []);
    assert(JSON.stringify(correct) === JSON.stringify([question.answer]), `${tag}: 직접 선택형 정답 판정이 다릅니다.`);
  }
}

for (let number = 1; number <= 5; number += 1) {
  const path = `assets/2026/q23-choice-${number}.jpg`;
  assert(existsSync(path) && statSync(path).size > 70_000, `23번 ${number}번 원본 논증도 이미지가 없습니다.`);
}
assert(existsSync("assets/2026/q31-head.jpg"), "31번 원본 헤드 도형 이미지가 없습니다.");

const q23 = exam2026.questions[22];
assert(q23.choices.every((choice) => choice.image?.src), "23번 선택지에 원본 논증도 이미지가 연결되지 않았습니다.");
const q27 = JSON.stringify(exam2026.questions[26]);
assert(q27.includes("[[math]]x[[/math]]축") && q27.includes("[[math]]y[[/math]]축"), "27번 x·y축 수식이 누락되었습니다.");
const q28 = JSON.stringify(exam2026.questions[27]);
assert(q28.includes("(x-z)-(y-w)") && q28.includes("중학교 1학년"), "28번 표 또는 이중차분 선택지가 누락되었습니다.");
const q31 = JSON.stringify(exam2026.questions[30]);
assert(q31.includes("q31-head.jpg") && q31.includes("변경없음/오른쪽/2"), "31번 테이프·기계표가 누락되었습니다.");
const q39 = JSON.stringify(exam2026.questions[38]);
assert(q39.includes("Rω²") && q39.includes("v²/R") && q39.includes("10＝10,000×ω²"), "39번 인공중력 수식이 누락되었습니다.");
const q40 = JSON.stringify(exam2026.questions[39]);
assert(q40.includes("SrTiO₃") && q40.includes("LaAlO₃") && q40.includes("Sr₁₋ₓLaₓTiO₃") && q40.includes("SrTiO₃₋ₓ"), "40번 화학식이 누락되었습니다.");

if (failures.length) {
  console.error(`2026 데이터 검증 실패 (${failures.length}건)`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`검증 완료: ${exam2026.title} ${exam2026.questions.length}문항 · 짝수형 공식 정답 · 상세 해설 · 원본 도식`);
