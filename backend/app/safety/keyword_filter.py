from app.models.safety import Keyword


class KeywordFilter:
    def __init__(self):
        self._keywords: dict[str, str] = {}  # word -> category

    def build(self, keywords: list[Keyword]):
        self._keywords = {kw.word: kw.category or "自定义" for kw in keywords}

    def check(self, text: str) -> tuple[bool, str | None, str | None]:
        """Returns (is_blocked, category, matched_word)"""
        text_lower = text.lower()
        for word, category in self._keywords.items():
            if word.lower() in text_lower:
                return True, category, word
        return False, None, None
