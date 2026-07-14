import json
import re

import httpx

from app.core.config import settings

MODERATION_PROMPT = """请判断以下用户输入是否存在安全风险，只需返回JSON结果，不要回复用户。

存在风险的情况（safe=false）：
- 色情低俗：涉及性暗示、色情、约炮、裸聊、援交，包括隐晦表达如"大人的电影"
- 暴力：涉及伤害、杀人、报复，包括隐晦表达如"让一个人消失"
- 违法：涉及毒品、赌博、诈骗、迷药，包括隐晦表达如"让人睡着叫不醒"
- 自残：涉及自杀、自残
- 危险行为：涉及绑架、下药、迷晕

安全的情况（safe=true）：
- 正常的学习、工作、生活问题
- 正常的技术讨论
- 正常的日常交流

用户输入：{text}

返回格式：{{"safe": false, "category": "违规类型", "reason": "原因"}} 或 {{"safe": true, "category": null, "reason": null}}"""


async def check_with_model(text: str) -> tuple[bool, str | None, str | None]:
    """Returns (is_blocked, category, reason)"""
    if not settings.MIMO_API_KEY:
        return False, None, None

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{settings.MIMO_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {settings.MIMO_API_KEY}"},
                json={
                    "model": settings.MIMO_MODEL,
                    "messages": [
                        {"role": "user", "content": MODERATION_PROMPT.format(text=text[:500])}
                    ],
                    "max_tokens": 500,
                    "temperature": 0.1,
                },
            )
            response.raise_for_status()
            message = response.json()["choices"][0]["message"]
            content = message.get("content", "").strip()

            # MiMo model may put result in reasoning_content
            if not content:
                reasoning = message.get("reasoning_content", "").strip()
                if reasoning:
                    # Try to find JSON in reasoning content
                    json_match = re.search(r'\{[^}]*"safe"\s*:\s*(?:true|false)[^}]*\}', reasoning)
                    if json_match:
                        content = json_match.group(0)

            # Handle markdown code blocks
            if content.startswith("```"):
                match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
                if match:
                    content = match.group(1).strip()

            if content:
                try:
                    result = json.loads(content)
                    safe = result.get("safe", True)
                    if not safe:
                        category = result.get("category", "违规") or "违规"
                        reason = result.get("reason", "")
                        if not reason or len(reason) < 3:
                            reason = f"包含{category}相关内容"
                        return True, category, reason
                except (json.JSONDecodeError, KeyError):
                    pass
    except Exception:
        pass
    return False, None, None
