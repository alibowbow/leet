#!/usr/bin/env python3
"""Build the browser-ready 2026 question transcript from the audited HWP HTML."""

from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("extract_2026", ROOT / "scripts/extract-2026-hwp.py")
extractor = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(extractor)

TYPES = [
    "통제 유형", "순직 법안", "정책 기준", "논거 평가", "형벌 제도",
    "견해 평가", "이득액", "견해 비교", "합의 구조", "계약당사자",
    "단위 환산", "권리 행사", "처벌 정의", "선호·기술", "후회 합리성",
    "경어법", "마음 이론", "거짓말", "관점 전환", "도덕 실재론",
    "믿음 수정", "증거의 무게", "논증 구조", "편익·비용", "게임 균형",
    "선호 역전", "소득 연관성", "이중차분", "결혼·수명", "이주민 태도",
    "튜링기계", "점수 배치", "조건 추론", "진술·혐의", "X염색체",
    "인공신경망", "개화 가설", "캡사이시노이드", "인공중력", "계면 전도성",
]

ANSWERS = [
    2, 3, 2, 5, 2, 3, 1, 4, 5, 2,
    3, 1, 1, 5, 1, 3, 5, 1, 3, 2,
    1, 1, 5, 2, 4, 4, 3, 3, 2, 2,
    1, 4, 4, 3, 2, 5, 5, 3, 5, 4,
]

CIRCLED = "①②③④⑤"


def split_choices(parts: list[str]) -> list[str]:
    text = " ".join(parts)
    matches = list(re.finditer(f"([{CIRCLED}])", text))
    choices = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        choices.append(text[match.end():end].strip())
    return choices


def parse_question(number: int, paragraphs: list[str]) -> dict:
    heading = paragraphs[0]
    stem = re.sub(r"^\d{1,2}\.", "", heading, count=1)
    content = paragraphs[1:]

    if number == 23:
        return {
            "id": number,
            "type": TYPES[number - 1],
            "stem": stem,
            "body": [content[0]],
            "statements": [],
            "choices": [f"논증 구조 {index}" for index in range(1, 6)],
            "answer": ANSWERS[number - 1],
        }

    marker = next((i for i, value in enumerate(content) if value == "<보 기>"), None)
    if marker is not None:
        body = content[:marker]
        tail = content[marker + 1:]
        statements = []
        while tail and re.match(r"^[ㄱ-ㅎ]\.\s*", tail[0]):
            match = re.match(r"^([ㄱ-ㅎ])\.\s*(.*)$", tail.pop(0))
            statements.append({"label": match.group(1), "text": match.group(2)})
        choices = split_choices(tail)
    else:
        first_choice = next((i for i, value in enumerate(content) if value and value[0] in CIRCLED), None)
        if first_choice is None:
            # q26 and q28 use a table/equation control; their browser content is
            # completed by explicit overrides in data/2026.js.
            body, statements, choices = content, [], []
        else:
            body = content[:first_choice]
            statements = []
            choices = split_choices(content[first_choice:])

    return {
        "id": number,
        "type": TYPES[number - 1],
        "stem": stem,
        "body": body,
        "statements": statements,
        "choices": choices,
        "answer": ANSWERS[number - 1],
    }


def main() -> None:
    source = extractor.questions()
    questions = [parse_question(number, source[number]) for number in range(1, 41)]
    output = (
        "// Generated from the supplied 2026 even-form HWP; edit source overrides in 2026.js.\n"
        "const content2026 = "
        + json.dumps(questions, ensure_ascii=False, indent=2)
        + ";\n\nexport default content2026;\n"
    )
    (ROOT / "data/2026-content.js").write_text(output, encoding="utf-8")


if __name__ == "__main__":
    main()
