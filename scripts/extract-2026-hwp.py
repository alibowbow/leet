#!/usr/bin/env python3
"""Inspect the converted 2026 HWP while preserving inline underlines.

This is a source-audit helper, not part of the browser bundle.  It expects the
`hwp5html` output generated in tmp/pdfs/2026-hwp/problem.html.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from lxml import html


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tmp/pdfs/2026-hwp/problem.html"
UNDERLINE_CLASSES = {"charshape-14", "charshape-24", "charshape-42", "charshape-43"}


def normalize(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    value = value.replace("[[/u]][[u]]", "")
    return value


def paragraph_text(paragraph) -> str:
    parts: list[str] = []

    def visit(node) -> None:
        if node.text:
            parts.append(node.text)
        for child in node:
            # hwp5html serializes controls such as tables inside a surrounding
            # paragraph, which produces technically invalid nested <p> tags.
            # A nested paragraph is a separate source paragraph, so its text is
            # handled by the outer document iteration rather than duplicated.
            if child.tag == "p":
                if child.tail:
                    parts.append(child.tail)
                continue
            classes = set((child.get("class") or "").split())
            underlined = bool(classes & UNDERLINE_CLASSES)
            if underlined:
                parts.append("[[u]]")
            visit(child)
            if underlined:
                parts.append("[[/u]]")
            if child.tail:
                parts.append(child.tail)

    visit(paragraph)
    return normalize("".join(parts))


def questions() -> dict[int, list[str]]:
    document = html.parse(str(SOURCE))
    paragraphs = []
    for paragraph in document.xpath("//p"):
        text = paragraph_text(paragraph)
        if text:
            paragraphs.append(text)

    start = next(i for i, text in enumerate(paragraphs) if re.match(r"^1\.", text))
    result: dict[int, list[str]] = {}
    current = 0
    for text in paragraphs[start:]:
        match = re.match(r"^(\d{1,2})\.(?=\S)", text)
        if match and 1 <= int(match.group(1)) <= 40:
            current = int(match.group(1))
            result[current] = [text]
            continue
        if current:
            result[current].append(text)
        if current == 40 and text.startswith("⑤"):
            break
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("question", nargs="*", type=int)
    args = parser.parse_args()
    selected = args.question or list(range(1, 41))
    data = questions()
    for number in selected:
        print(f"\n===== {number:02d} =====")
        for index, text in enumerate(data[number]):
            print(f"{index:02d} {text}")


if __name__ == "__main__":
    main()
