from __future__ import annotations

import json
import urllib.request
from dataclasses import dataclass
from typing import Any, Protocol


class TranslationProvider(Protocol):
    def translate_page(self, bubbles: list[dict[str, Any]]) -> list[dict[str, str]]:
        ...


@dataclass
class ManualTranslationProvider:
    def translate_page(self, bubbles: list[dict[str, Any]]) -> list[dict[str, str]]:
        return [
            {"id": bubble["id"], "english": bubble.get("english", "")}
            for bubble in bubbles
        ]


@dataclass
class OpenAICompatibleLocalProvider:
    endpoint: str = "http://127.0.0.1:11434/v1/chat/completions"
    model: str = "qwen2.5:7b"
    timeout_seconds: int = 120

    def translate_page(self, bubbles: list[dict[str, Any]]) -> list[dict[str, str]]:
        source = [
            {"id": bubble["id"], "chinese": bubble["chinese"]}
            for bubble in bubbles
            if not bubble.get("ignored") and bubble.get("chinese", "").strip()
        ]
        prompt = (
            "Translate every Chinese comic line naturally into English. "
            "Preserve every ID, do not omit lines, and do not add commentary. "
            "Use surrounding lines for context and keep names consistent. "
            "If uncertain, provide the best literal translation and append [REVIEW]. "
            "Return only a JSON array of objects with id and english.\n\n"
            + json.dumps(source, ensure_ascii=False)
        )
        payload = {
            "model": self.model,
            "temperature": 0.1,
            "messages": [
                {"role": "system", "content": "You translate Chinese comics into concise natural English."},
                {"role": "user", "content": prompt},
            ],
        }
        request = urllib.request.Request(
            self.endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
            result = json.loads(response.read().decode("utf-8"))
        content = result["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        translations = json.loads(content)
        if not isinstance(translations, list):
            raise ValueError("Translation provider did not return a JSON array.")
        allowed_ids = {item["id"] for item in source}
        normalized = []
        for item in translations:
            if item.get("id") in allowed_ids and isinstance(item.get("english"), str):
                normalized.append({"id": item["id"], "english": item["english"].strip()})
        return normalized
