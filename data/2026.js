import { directChoices, section, table } from "./helpers.js";
import content2026 from "./2026-content.js";
import details2026 from "./2026-details.js";

const HEADING = /^(<[^>]+>|\[[^\]]+\])$/u;

function sectionsFromBody(body) {
  const groups = [];
  let current = { title: "본문", paragraphs: [] };
  for (const paragraph of body) {
    if (HEADING.test(paragraph)) {
      if (current.paragraphs.length) groups.push(current);
      current = { title: paragraph, paragraphs: [] };
    } else {
      current.paragraphs.push(paragraph);
    }
  }
  if (current.paragraphs.length) groups.push(current);
  return groups.map((group, index) => section(
    group.title,
    group.paragraphs.join("\n\n"),
    { box: true, tone: index ? "case" : "rule" },
  ));
}

function richChoices(content) {
  return directChoices(content.choices).map((choice) => ({
    ...choice,
    ...(content.statements.length ? { members: choice.label.match(/[ㄱ-ㅎ]/gu) ?? [] } : {}),
  }));
}

function q26(content) {
  const introduction = content.body[0].replace(
    "시장가격이 일 때",
    "시장가격이 [[blank]]㉠[[/blank]]일 때",
  );
  const conclusion = content.body[3].replace(
    "‘간접선호 역전’의 조건",
    "‘간접선호 역전’의 [[blank]]㉡[[/blank]]조건",
  );
  return {
    sections: [
      section("선호 역전", introduction, { box: true, tone: "rule" }),
      section("간접선호 역전", `${content.body[2]}\n\n${conclusion}`, { box: true, tone: "case" }),
    ],
    choices: directChoices(content.choices.map((label) => {
      const [price, condition] = label.split(/\s+(?=필요|충분)/u);
      return `㉠ ${price}　㉡ ${condition}`;
    })),
  };
}

function q27(content) {
  const body = [...content.body];
  body[0] = body[0].replace(
    "직선으로 나타낸 것이다. 축과 축은",
    "직선으로 나타낸 것이다. [[math]]x[[/math]]축과 [[math]]y[[/math]]축은",
  );
  const statements = content.statements.map((statement) => ({
    ...statement,
    text: statement.label === "ㄴ"
      ? statement.text.replace("두 직선이 축 중간에서", "두 직선이 [[math]]x[[/math]]축 중간에서")
      : statement.text,
  }));
  return { sections: sectionsFromBody(body), statements };
}

function q28(content) {
  const explanation = `[[math]]x-z[[/math]]는 중학교 1학년 학생들 사이에서 미취학 시기 인터넷 게임 노출 여부와 학업 성적 사이의 관계를 반영하는 값으로 이해할 수 있다. 그러나 이 값은 학업 성적에 대한 인터넷 게임 노출의 영향만을 반영하고 있다고 말할 수 없다. 도시 간 교육 환경 차이가 성적의 차이에 영향을 주었을 수 있기 때문이다. 즉 [[math]]x-z[[/math]]는 미취학 시기 인터넷 게임 노출과 더불어 도시 간 차이의 영향도 반영하고 있다. 그럼 [[math]]w-z[[/math]]는 어떤가? 이 값은 미취학 시기 인터넷 게임 노출과 더불어 학년 간 차이의 영향도 반영하고 있다. 따라서 미취학 시기 인터넷 게임 노출이 중학교 1학년 학생들의 학업 성적에 미친 영향만을 측정하기 위해서는 [[blank]]㉠[[/blank]]을 계산해야 한다. 물론, 이런 계산에는 도시 간 차이가 성적에 미치는 영향이 학령에 따라서 바뀌지 않는다는 것과 인터넷 게임 노출이 성적에 미치는 영향은 모든 도시에서 동일하다는 것 등이 가정되어 있다.`;
  return {
    sections: [
      section("연구 설계", content.body[0], { box: true, tone: "rule" }),
      table("평균 성적", ["", "중학교 1학년", "초등학교 3학년"], [["A시", "[[math]]x[[/math]]", "[[math]]y[[/math]]"], ["B시", "[[math]]z[[/math]]", "[[math]]w[[/math]]"]], { box: true, tone: "case" }),
      section("차이의 해석", explanation, { box: true, tone: "case" }),
    ],
    choices: directChoices([
      "[[math]](x-y)-(y-w)[[/math]]",
      "[[math]](x-y)-(x-w)[[/math]]",
      "[[math]](x-z)-(y-w)[[/math]]",
      "[[math]](x-z)-(w-z)[[/math]]",
      "[[math]](x-w)-(y-z)[[/math]]",
    ]),
  };
}

function q31(content) {
  const headCell = { image: "assets/2026/q31-head.jpg", alt: "현재 헤드 위치", className: "turing-head-cell" };
  return {
    sections: [
      section("튜링기계", content.body[0], { box: true, tone: "rule" }),
      section("테이프와 헤드", content.body[1], { box: true, tone: "case" }),
      table("테이프", ["…", "－", "－", "－", "×", "×", "－", "×", "×", "×", "－", "…"], [["왼쪽", "", headCell, "", "", "", "", "", "", "", "", "오른쪽"]], { box: true, tone: "case", tableClass: "turing-tape-table" }),
      section("기호와 작업", content.body[17], { box: true, tone: "case" }),
      section("기계표", content.body[18], { box: true, tone: "case" }),
      table("상태별 명령", ["", "입력값: ×", "입력값: －"], [
        ["상태1", "변경없음/오른쪽/2", "변경없음/오른쪽/1"],
        ["상태2", "변경없음/오른쪽/2", "×/왼쪽/3"],
        ["상태3", "변경없음/왼쪽/3", "[[blank]]㉠[[/blank]]"],
        ["상태4", "－/정지", ""],
      ], { box: true, tone: "rule", tableClass: "turing-machine-table" }),
      section("명령 읽기", content.body[32], { box: true, tone: "case" }),
    ],
  };
}

function q39() {
  return {
    sections: [section("본문", `속이 빈 원통형 구조체를 생각해 보자.(단, 원통의 두께는 무시한다.) 그 구조체가 원통 윗면의 중심과 밑면의 중심을 관통하는 직선을 축으로 일정하게 회전하면, 그 옆면의 안쪽 벽에 인공중력이 만들어진다. 다른 외력이 없을 때 이 안쪽 벽에 붙어 원통과 함께 회전하는 물체는 원운동을 하게 되며, 이때 작용하는 원심력을 중력으로 생각할 수 있다. 원통의 안쪽 벽이 물체를 지지하는 힘은 구심력 역할을 하며, 안쪽 벽의 표면은 지표면과 같은 역할을 한다.

이렇게 인공적으로 만들어진 중력가속도의 크기 [[math]]a[[/math]]는 [[math]]Rω²[[/math]]이 되는데, 이때 [[math]]R[[/math]]은 원통의 반지름이고, [[math]]ω[[/math]]는 원통의 회전 각속력, 즉 단위 시간당 회전하는 각도이다. 이 중력가속도의 크기는 [[math]]v²/R[[/math]]로도 표현할 수 있으며, 이때 [[math]]v[[/math]]는 물체가 원의 접선 방향으로 움직이는 선속력이다. 예를 들어, 지름 20,000m인 원통형 구조체에서 지구와 같은 크기의 중력, 즉 중력가속도 10m/s²을 구현한다고 해 보자. [[math]]10＝10,000×ω²[[/math]]으로부터 [[math]]ω[[/math]]는 약 0.03rad/s임을 알 수 있다. 이는 구조체가 1초에 약 2°를 회전해야 한다는 것이다.`, { box: true, tone: "rule" })],
  };
}

function q40(content) {
  return {
    sections: [
      section("전자구조와 전도성", `[[math]]SrTiO₃[[/math]]와 [[math]]LaAlO₃[[/math]]의 두 고체 물질은 아보가드로수만큼 많은 원자로 구성되며, 각 물질에서 개별 원소 비율은 위 화학식처럼 표현된다. 두 물질은 모두 부도체이지만, 놀랍게도 이 둘을 접합시키면 그 계면에서 높은 전기전도도가 나타난다. 두 물질 사이 계면의 전도성을 이해하기 위해서는 [[math]]SrTiO₃[[/math]]에서 [[math]]Ti[[/math]]의 전자구조를 살펴볼 필요가 있다. [[math]]Ti[[/math]] 원자는 [[math]]SrTiO₃[[/math]]에서 이온화되어 [[math]]Ti⁴⁺[[/math]] 전자가 상태가 되지만, [[math]]SrTiO₃[[/math]]의 구성 원소 비율이 변하거나 구성 원소의 일부가 다른 원소로 치환됨에 따라 이보다 낮은 전자가 상태인 [[math]]Ti³⁺[[/math]]가 될 수 있다. [[math]]Ti⁴⁺[[/math]] 전자가 상태에서 [[math]]Ti[[/math]] 이온의 모든 전자는 강하게 구속되어 자유전자를 내놓기가 어렵다. 하지만 [[math]]Ti[[/math]] 이온들 중 일부라도 [[math]]Ti³⁺[[/math]] 전자가 상태가 되면, [[math]]Ti[[/math]] 이온당 전자 하나의 구속이 약해지고 자유전자가 유도되어 물질의 전도성이 발현한다.`, { box: true, tone: "rule" }),
      section("전하중성", `한편 [[math]]SrTiO₃[[/math]]와 [[math]]LaAlO₃[[/math]] 등의 물질들은 거시적인 상태에서 전하중성 조건을 만족한다. 즉, 물질에서 모든 이온의 전자가를 더하면 0이다. 또 위의 물질을 구성하는 원소 중에서 [[math]]Ti[[/math]]만 전자가 상태가 변할 수 있고, [[math]]Sr[[/math]]은 [[math]]Sr²⁺[[/math]], [[math]]O[[/math]]는 [[math]]O²⁻[[/math]], [[math]]La[[/math]]는 [[math]]La³⁺[[/math]], [[math]]Al[[/math]]은 [[math]]Al³⁺[[/math]]의 전자가 상태만을 갖는다고 하자. 그러면 [[math]]H₂O[[/math]]가 [[math]](H⁺)₂O²⁻[[/math]]로 [[math]]2×(＋1)＋(－2)＝0[[/math]]이듯이, [[math]]SrTiO₃[[/math]]는 [[math]]Sr²⁺Ti⁴⁺(O²⁻)₃[[/math]]로 [[math]]2＋4＋3×(－2)＝0[[/math]]이 되어 전하중성 조건을 만족한다.`, { box: true, tone: "rule" }),
      section("<실험>", `[[math]]SrTiO₃[[/math]]와 [[math]]LaAlO₃[[/math]]의 계면에서 전도성이 발현하는 이유를 확인하기 위해 계면 근처의 [[math]]SrTiO₃[[/math]] 부분을 투과전자현미경으로 조사하였다. 이를 바탕으로 계면 근처에서 [[math]]Ti³⁺[[/math]] 전자가 상태가 유도되었다는 ㉠[[u]]가설[[/u]]을 수립하였다.`, { box: true, tone: "case" }),
    ],
    statements: [
      { label: "ㄱ", text: `일부 [[math]]Sr[[/math]]이 [[math]]La[[/math]]으로 치환된 [[math]]Sr₁₋ₓLaₓTiO₃[[/math]]가 관찰된다면 ㉠이 강화된다.` },
      { label: "ㄴ", text: `일부 [[math]]Ti[[/math]]이 [[math]]Al[[/math]]으로 치환된 [[math]]SrTi₁₋ₓAlₓO₃[[/math]]가 관찰된다면 ㉠이 강화된다.` },
      { label: "ㄷ", text: `일부 [[math]]O[[/math]]가 결핍된 [[math]]SrTiO₃₋ₓ[[/math]]가 관찰된다면 ㉠이 강화된다.` },
      { label: "※", text: `단, [[math]]0＜x＜0.1[[/math]]이다.` },
    ],
    choices: richChoices({ ...content, statements: content.statements }),
  };
}

const special = { 26: q26, 27: q27, 28: q28, 31: q31, 39: q39, 40: q40 };

const questions = content2026.map((content) => {
  const detail = details2026[content.id];
  const base = {
    id: content.id,
    type: content.type,
    stem: content.stem,
    sections: sectionsFromBody(content.body),
    statements: content.statements,
    choices: richChoices(content),
    answer: content.answer,
  };
  const override = special[content.id]?.(content) ?? {};
  const question = { ...base, ...override };

  if (content.id === 23) {
    question.choices = question.choices.map((choice, index) => ({
      ...choice,
      image: {
        src: `assets/2026/q23-choice-${index + 1}.jpg`,
        alt: `${index + 1}번 논증 구조 도식`,
      },
    }));
  }

  const correctMembers = question.statements.length
    ? (question.choices[question.answer - 1]?.members ?? [])
    : [];
  const verdicts = question.statements.length
    ? question.statements
      .filter((statement) => statement.label !== "※")
      .map((statement, index) => ({
        label: statement.label,
        correct: correctMembers.includes(statement.label),
        reason: detail.reasons[index],
      }))
    : question.choices.map((choice, index) => ({
      label: `${index + 1}번 선택지`,
      correct: index + 1 === question.answer,
      reason: detail.reasons[index],
    }));

  question.explanation = {
    summary: detail.summary,
    visual: detail.visual,
    verdicts,
    detail: {
      principle: detail.principle,
      steps: detail.steps,
      trap: detail.trap,
    },
  };
  return question;
});

export default {
  year: 2026,
  title: "2026학년도 추리논증",
  subject: "추리논증",
  form: "짝수형",
  questions,
};
