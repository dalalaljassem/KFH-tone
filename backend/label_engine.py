from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import asdict, dataclass, field, replace
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
import requests
from sentence_transformers import SentenceTransformer


REQUIRED_COLUMNS = [
    "text_en",
    "text_ar",
    "category",
]


@dataclass(frozen=True)
class EngineConfig:
    csv_path: str
    embedding_model_name: str = "models--intfloat--multilingual-e5-large/snapshots/0dc5580a448e4284468b8909bae50fa925907bc5"
    ollama_host: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.1:8b"
    approved_threshold: float = 0.70
    closest_threshold: float = 0.50
    lexical_weight: float = 0.35
    semantic_weight: float = 0.65
    semantic_shortlist_size: int = 50
    fallback_example_count: int = 8
    ollama_seed: int = 42
    ollama_temperature: float = 0.0
    request_timeout_seconds: int = 120
    debug_mode: bool= True


@dataclass(frozen=True)
class TextForms:
    original: str
    normalized: str
    tokens: Tuple[str, ...]


@dataclass(frozen=True)
class LabelCandidate:
    general_category_en: str
    raw_text_en: str
    raw_text_ar: str
    forms_en: TextForms
    forms_ar: TextForms
    resource_keys: Tuple[str, ...]
    frequency: int

    def display_text(self, language: str) -> str:
        return self.raw_text_ar if language == "ar" else self.raw_text_en

    def forms(self, language: str) -> TextForms:
        return self.forms_ar if language == "ar" else self.forms_en


@dataclass(frozen=True)
class ScoredCandidate:
    candidate: LabelCandidate
    lexical_score: float
    semantic_score: float
    final_score: float
    rank: int


@dataclass(frozen=True)
class MatchResult:
    input_text: str
    language: str
    selected_category: str
    decision_type: str
    recommended_text_en: str
    recommended_text_ar: str
    confidence: float
    explanation: str
    top_candidates: Tuple[Dict[str, Any], ...] = field(default_factory=tuple)
    generated: Optional[Dict[str, Any]] = None


class TextNormalizer:
    _arabic_pattern = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]")
    _arabic_diacritics = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]")
    _punct_pattern = re.compile(r"[^\w\s]")
    _space_pattern = re.compile(r"\s+")

    _arabic_char_map = str.maketrans(
        {
            "أ": "ا",
            "إ": "ا",
            "آ": "ا",
            "ٱ": "ا",
            "ى": "ي",
            "ؤ": "و",
            "ئ": "ي",
            "ـ": "",
        }
    )

    @classmethod
    def detect_language(cls, text: str) -> str:
        if not isinstance(text, str) or not text.strip():
            return "en"
        arabic_count = len(cls._arabic_pattern.findall(text))
        latin_count = len(re.findall(r"[A-Za-z]", text))
        return "ar" if arabic_count > latin_count else "en"

    @classmethod
    def normalize(cls, text: str, language: Optional[str] = None) -> TextForms:
        source = "" if text is None else str(text)
        lang = language or cls.detect_language(source)
        value = unicodedata.normalize("NFKC", source).strip()
        if lang == "ar":
            value = cls._normalize_arabic(value)
        else:
            value = cls._normalize_english(value)
        tokens = tuple(token for token in value.split(" ") if token)
        return TextForms(original=source, normalized=value, tokens=tokens)

    @classmethod
    def _normalize_english(cls, text: str) -> str:
        value = text.casefold()
        value = value.replace("&", " and ")
        value = cls._punct_pattern.sub(" ", value)
        value = cls._space_pattern.sub(" ", value).strip()
        return value

    @classmethod
    def _normalize_arabic(cls, text: str) -> str:
        value = text.translate(cls._arabic_char_map)
        value = cls._arabic_diacritics.sub("", value)
        value = value.replace("ة", "ه")
        value = value.replace("،", " ").replace("؛", " ").replace("؟", " ")
        value = cls._punct_pattern.sub(" ", value)
        value = cls._space_pattern.sub(" ", value).strip()
        return value


class LabelRepository:
    def __init__(self, config: EngineConfig):
        self.config = config
        self.df = self._load_data(config.csv_path)
        self.categories = tuple(sorted(self.df["category"].dropna().astype(str).unique().tolist()))
        self.candidates_by_category: Dict[str, List[LabelCandidate]] = self._build_candidates()

    def _load_data(self, file_path: str) -> pd.DataFrame:
        path = Path(file_path)
        if path.suffix == '.jsonl':
            with open(path, 'r', encoding='utf-8') as f:
                df = pd.DataFrame([json.loads(line) for line in f])
        else:
            df = pd.read_csv(path).rename(columns={
                "general_category_en": "category",
                "raw_text_en": "text_en",
                "raw_text_ar": "text_ar",
            })

        missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        for column in REQUIRED_COLUMNS:
            df[column] = df[column].fillna("").astype(str)
        df = df[df["category"].str.strip() != ""].copy()
        df["category"] = df["category"].str.strip()
        return df

    def _build_candidates(self) -> Dict[str, List[LabelCandidate]]:
        grouped: Dict[str, Dict[Tuple[str, str], Dict[str, Any]]] = {}
        for row in self.df.to_dict(orient="records"):
            category = row["category"].strip()
            en = row["text_en"].strip()
            ar = row["text_ar"].strip()
            key = (en, ar)
            bucket = grouped.setdefault(category, {})
            if key not in bucket:
                bucket[key] = {
                    "category": category,
                    "text_en": en,
                    "text_ar": ar,
                    "forms_en": TextNormalizer.normalize(en, "en"),
                    "forms_ar": TextNormalizer.normalize(ar, "ar"),
                    "count": 0,
                }
            bucket[key]["count"] += 1
        output: Dict[str, List[LabelCandidate]] = {}
        for category, items in grouped.items():
            candidates: List[LabelCandidate] = []
            for item in items.values():
                candidates.append(
                    LabelCandidate(
                        general_category_en=item["category"],
                        raw_text_en=item["text_en"],
                        raw_text_ar=item["text_ar"],
                        forms_en=item["forms_en"],
                        forms_ar=item["forms_ar"],
                        resource_keys=(),
                        frequency=item["count"],
                    )
                )
            output[category] = sorted(
                candidates,
                key=lambda c: (
                    c.display_text("en").casefold(),
                    c.display_text("ar"),
                    -c.frequency,
                ),
            )
        return output

    def get_category_candidates(self, category: str) -> List[LabelCandidate]:
        if category not in self.candidates_by_category:
            raise ValueError(
                f"Unknown category '{category}'. Available categories: {list(self.categories)}"
            )
        return self.candidates_by_category[category]


class EmbeddingIndex:
    def __init__(self, repository: LabelRepository, config: EngineConfig):
        self.repository = repository
        self.config = config
        self.model = SentenceTransformer(config.embedding_model_name)
        self._matrices: Dict[Tuple[str, str], np.ndarray] = {}
        self._build()

    def _build(self) -> None:
        for category, candidates in self.repository.candidates_by_category.items():
            for language in ("en", "ar"):
                texts = [
                    f"{candidate.general_category_en} | {candidate.raw_text_en} | {candidate.raw_text_ar}"
                    for candidate in candidates
                ]
                if texts:
                    embeddings = self.model.encode(
                        texts,
                        normalize_embeddings=True,
                        convert_to_numpy=True,
                        show_progress_bar=False,
                    )
                    self._matrices[(category, language)] = embeddings.astype(np.float32)
                else:
                    self._matrices[(category, language)] = np.zeros((0, 0), dtype=np.float32)

    def query(self, category: str, language: str, text: str) -> np.ndarray:
        matrix = self._matrices[(category, language)]
        if matrix.size == 0:
            return np.array([], dtype=np.float32)
        query_text = f"{category} | {text} | {text}"
        query_vector = self.model.encode(
            [query_text],
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )[0].astype(np.float32)
        return matrix @ query_vector


class DeterministicMatcher:
    def __init__(self, repository: LabelRepository, embedding_index: EmbeddingIndex, config: EngineConfig):
        self.repository = repository
        self.embedding_index = embedding_index
        self.config = config

    def match(self, input_text: str, category: str, language: Optional[str] = None) -> MatchResult:
        chosen_language = language or TextNormalizer.detect_language(input_text)
        input_forms = TextNormalizer.normalize(input_text, chosen_language)
        candidates = self.repository.get_category_candidates(category)
        exact = self._exact_match(input_forms, candidates, chosen_language)
        if exact is not None:
            return self._build_exact_result(input_text, input_forms, category, chosen_language, exact)
        scored = self._score_candidates(input_forms, candidates, category, chosen_language)
        best = scored[0]
        top_candidates = tuple(self._serialize_candidate(item, chosen_language, self.config.debug_mode) for item in scored[:5])
        if best.final_score >= self.config.approved_threshold:
            return self._build_scored_result(
                input_text,
                input_forms,
                category,
                chosen_language,
                best,
                "approved_match",
                top_candidates,
            )
        if best.final_score >= self.config.closest_threshold:
            return self._build_scored_result(
                input_text,
                input_forms,
                category,
                chosen_language,
                best,
                "closest_match",
                top_candidates,
            )
        return self._build_scored_result(
            input_text,
            input_forms,
            category,
            chosen_language,
            best,
            "needs_generation",
            top_candidates,
        )

    def _exact_match(
        self,
        input_forms: TextForms,
        candidates: Sequence[LabelCandidate],
        language: str,
    ) -> Optional[LabelCandidate]:
        for candidate in candidates:
            if candidate.forms(language).normalized == input_forms.normalized:
                return candidate
        return None

    def _score_candidates(
        self,
        input_forms: TextForms,
        candidates: Sequence[LabelCandidate],
        category: str,
        language: str,
    ) -> List[ScoredCandidate]:
        lexical_scores = [self._lexical_similarity(input_forms, c.forms(language)) for c in candidates]
        semantic_scores_all = self.embedding_index.query(category, language, input_forms.original)
        semantic_lookup = {idx: float(max(-1.0, min(1.0, semantic_scores_all[idx]))) for idx in range(len(candidates))}
        shortlist_indices = sorted(
            range(len(candidates)),
            key=lambda i: (
                -lexical_scores[i],
                -semantic_lookup[i],
                self._length_key(category, candidates[i].display_text(language), input_forms.original),
                -candidates[i].frequency,
                candidates[i].resource_keys[0] if candidates[i].resource_keys else "",
            ),
        )[: self.config.semantic_shortlist_size]

        scored: List[ScoredCandidate] = []
        for idx in shortlist_indices:
            lexical_score = lexical_scores[idx]
            semantic_score = semantic_lookup[idx]
            final_score = (
                self.config.lexical_weight * lexical_score
                + self.config.semantic_weight * self._bounded_semantic(semantic_score)
            )
            scored.append(
                ScoredCandidate(
                    candidate=candidates[idx],
                    lexical_score=round(lexical_score, 6),
                    semantic_score=round(semantic_score, 6),
                    final_score=round(final_score, 6),
                    rank=0,
                )
            )

        scored = sorted(
            scored,
            key=lambda item: (
                -item.final_score,
                -item.lexical_score,
                -item.semantic_score,
                self._length_key(category, item.candidate.display_text(language), input_forms.original),
                -item.candidate.frequency,
                item.candidate.resource_keys[0] if item.candidate.resource_keys else "",
            ),
        )
        return [replace(item, rank=rank) for rank, item in enumerate(scored, start=1)]

    def _lexical_similarity(self, query: TextForms, candidate: TextForms) -> float:
        if not query.normalized or not candidate.normalized:
            return 0.0
        seq = SequenceMatcher(None, query.normalized, candidate.normalized).ratio()
        query_tokens = set(query.tokens)
        candidate_tokens = set(candidate.tokens)
        if not query_tokens or not candidate_tokens:
            return seq
        intersection = query_tokens & candidate_tokens
        union = query_tokens | candidate_tokens
        jaccard = len(intersection) / len(union)
        containment = len(intersection) / min(len(query_tokens), len(candidate_tokens))
        substring_bonus = 1.0 if (
            query.normalized in candidate.normalized or candidate.normalized in query.normalized
        ) else 0.0
        score = 0.30 * seq + 0.10 * jaccard + 0.35 * containment + 0.25 * substring_bonus
        return round(min(score, 1.0), 6)

    @staticmethod
    def _bounded_semantic(value: float) -> float:
        return round((value + 1.0) / 2.0, 6)

    def _length_key(self, category: str, text: str, input_text: str) -> int:
        concise_categories = {"button_or_action", "label_or_navigation", "title", "tab", "menu"}
        if category in concise_categories:
            return len(text)
        return abs(len(text) - len(input_text))

    def _serialize_candidate(self, item: ScoredCandidate, language: str, debug_mode: bool = False) -> Dict[str, Any]:
        result = {
            "rank": item.rank,
            "text_en": item.candidate.raw_text_en,
            "text_ar": item.candidate.raw_text_ar,
            "lexical_score": item.lexical_score,
            "semantic_score": item.semantic_score,
            "final_score": item.final_score,
        }
        if debug_mode:
            result["text"] = item.candidate.display_text(language)
            result["resource_keys"] = list(item.candidate.resource_keys)
            result["frequency"] = item.candidate.frequency
        return result

    def _build_exact_result(
        self,
        input_text: str,
        input_forms: TextForms,
        category: str,
        language: str,
        candidate: LabelCandidate,
    ) -> MatchResult:
        candidate_dict = {
            "rank": 1,
            "text_en": candidate.raw_text_en,
            "text_ar": candidate.raw_text_ar,
            "lexical_score": 1.0,
            "semantic_score": 1.0,
            "final_score": 1.0,
        }
        if self.config.debug_mode:
            candidate_dict["text"] = candidate.display_text(language)
            candidate_dict["resource_keys"] = list(candidate.resource_keys)
            candidate_dict["frequency"] = candidate.frequency

        return MatchResult(
            input_text=input_text,
            language=language,
            selected_category=category,
            decision_type="Closest match",
            recommended_text_en=candidate.raw_text_en,
            recommended_text_ar=candidate.raw_text_ar,
            confidence=1.0,
            explanation=f"Exact normalized match in category '{category}'.",
            top_candidates=(candidate_dict,),
        )

    def _build_scored_result(
        self,
        input_text: str,
        input_forms: TextForms,
        category: str,
        language: str,
        best: ScoredCandidate,
        decision_type: str,
        top_candidates: Tuple[Dict[str, Any], ...],
    ) -> MatchResult:
        return MatchResult(
            input_text=input_text,
            language=language,
            selected_category=category,
            decision_type=decision_type,
            recommended_text_en=best.candidate.raw_text_en,
            recommended_text_ar=best.candidate.raw_text_ar,
            confidence=best.final_score,
            explanation=f"Match in '{category}' with scores: lex={best.lexical_score:.3f}, sem={best.semantic_score:.3f}, final={best.final_score:.3f}.",
            top_candidates=top_candidates,
        )


class OllamaFallbackGenerator:
    def __init__(self, config: EngineConfig):
        self.config = config
        self.endpoint = f"{config.ollama_host.rstrip('/')}/api/chat"
        self.schema = {
            "type": "object",
            "properties": {
                "suggested_text": {"type": "string"},
                "reason": {"type": "string"},
                "style_rules_used": {
                    "type": "array",
                    "items": {"type": "string"},
                },
            },
            "required": ["suggested_text", "reason", "style_rules_used"],
            "additionalProperties": False,
        }

    def generate(
        self,
        input_text: str,
        category: str,
        language: str,
        top_candidates: Sequence[Dict[str, Any]],
    ) -> Dict[str, Any]:
        examples = [candidate["text"] for candidate in top_candidates[: self.config.fallback_example_count] if candidate["text"]]
        prompt = self._build_prompt(input_text, category, language, examples)
        payload = {
            "model": self.config.ollama_model,
            "stream": False,
            "format": self.schema,
            "options": {
                "temperature": self.config.ollama_temperature,
                "seed": self.config.ollama_seed,
            },
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a controlled KFH UI microcopy assistant. "
                        "Produce one concise suggestion in the same language as the input. "
                        "Stay inside the given category. Prefer concise product wording over marketing language. "
                        "Return only schema-valid JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        }
        response = requests.post(
            self.endpoint,
            json=payload,
            timeout=self.config.request_timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()
        content = data["message"]["content"]
        parsed = json.loads(content)
        parsed["source"] = "ollama_generation"
        return parsed

    @staticmethod
    def _build_prompt(input_text: str, category: str, language: str, examples: Sequence[str]) -> str:
        example_block = "\n".join(f"- {ex}" for ex in examples) if examples else "- None"
        return (
            f"Input language: {language}\n"
            f"UI category: {category}\n"
            f"User proposed text: {input_text}\n"
            f"Closest approved examples:\n{example_block}\n\n"
            f"Return one suggestion that fits the same tone and structure."
        )


class LabelRecommendationEngine:
    def __init__(self, config: EngineConfig):
        self.config = config
        self.repository = LabelRepository(config)
        self.embedding_index = EmbeddingIndex(self.repository, config)
        self.matcher = DeterministicMatcher(self.repository, self.embedding_index, config)
        self.generator = OllamaFallbackGenerator(config)

    def recommend(
        self,
        input_text: str,
        category: str,
        language: Optional[str] = None,
        allow_generation: bool = True,
    ) -> Dict[str, Any]:
        match = self.matcher.match(input_text=input_text, category=category, language=language)
        result = self._result_to_dict(match)
        if match.decision_type != "needs_generation" or not allow_generation:
            return self._filter_output(result)
        generated = self.generator.generate(
            input_text=input_text,
            category=category,
            language=match.language,
            top_candidates=match.top_candidates,
        )
        result["decision_type"] = "AI Suggestion"
        result["generated"] = generated
        result["explanation"] = f"Generated using Ollama (top candidate: {match.confidence:.3f})."
        return self._filter_output(result)

    def available_categories(self) -> List[str]:
        return list(self.repository.categories)

    def _result_to_dict(self, result: MatchResult) -> Dict[str, Any]:
        output = asdict(result)
        output["top_candidates"] = list(result.top_candidates)
        return output

    def _filter_output(self, result: Dict[str, Any]) -> Dict[str, Any]:
        if self.config.debug_mode:
            return result
        filtered = result.copy()
        return filtered


if __name__ == "__main__":
    config = EngineConfig(csv_path="taxonomy_enriched.jsonl", debug_mode=True)
    engine = LabelRecommendationEngine(config)

    input_text = input('Input text: ')
    category = input('Category: ')
    response = engine.recommend(input_text=input_text, category=category, language="en", allow_generation=True)
    print(json.dumps(response, ensure_ascii=False, indent=2))
