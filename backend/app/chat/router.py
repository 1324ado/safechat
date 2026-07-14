import json
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.auth.dependencies import get_current_user
from app.chat.schemas import ConversationResponse, MessageResponse, SendMessageRequest, SwitchStyleRequest
from app.core.config import settings
from app.core.database import async_session, get_db
from app.models.conversation import Conversation, Message, StyleSwitch
from app.models.style import Style
from app.models.user import User
from app.safety.filter import filter_text

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def generate_title(user_message: str) -> str:
    """Generate a conversation title based on the first message."""
    # Simple approach: use first 20 chars of user message as title
    title = user_message.strip()[:20]
    return title if title else "新对话"


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # 检查是否已有空对话（没有消息的对话）
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id, Conversation.is_deleted == False)
        .order_by(Conversation.created_at.desc())
        .limit(10)
    )
    for conv in result.scalars():
        msg_count = await db.scalar(
            select(func.count(Message.id)).where(Message.conversation_id == conv.id)
        )
        if msg_count == 0:
            return conv

    # 没有空对话，创建新的
    new_conv = Conversation(user_id=user.id)
    db.add(new_conv)
    await db.commit()
    await db.refresh(new_conv)
    return new_conv


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id, Conversation.is_deleted == False)
        .order_by(Conversation.created_at.desc())
    )
    return result.scalars().all()


@router.get("/conversations/{conv_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    conv_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conv = await db.get(Conversation, conv_id)
    if not conv or conv.user_id != user.id or conv.is_deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    result = await db.execute(
        select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at)
    )
    return result.scalars().all()


@router.delete("/conversations/{conv_id}")
async def delete_conversation(
    conv_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        conv = await db.get(Conversation, conv_id)
        if not conv or conv.user_id != user.id:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Soft delete - just mark as deleted
        conv.is_deleted = True
        await db.commit()
        return {"message": "Conversation deleted"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{conv_id}/messages")
async def send_message(
    conv_id: uuid.UUID,
    req: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conv = await db.get(Conversation, conv_id)
    if not conv or conv.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Safety filter on user input
    result = await filter_text(req.content, user.id, "request", db, conv_id)
    if result.blocked:
        raise HTTPException(status_code=400, detail="内容违规，请重新输入")

    # Resolve style
    style = None
    if req.style_identifier:
        style_result = await db.execute(select(Style).where(Style.identifier == req.style_identifier))
        style = style_result.scalar_one_or_none()

    # Save user message
    user_msg = Message(conversation_id=conv_id, role="user", content=req.content, style_id=style.id if style else None)
    db.add(user_msg)
    await db.commit()

    # Build messages for LLM
    messages = []
    if style:
        messages.append({"role": "system", "content": style.system_prompt})
        if style.few_shot:
            for example in style.few_shot:
                messages.append({"role": "user", "content": example["user"]})
                messages.append({"role": "assistant", "content": example["assistant"]})

    # Load conversation history
    history = await db.execute(
        select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at).limit(20)
    )
    for msg in history.scalars():
        messages.append({"role": msg.role, "content": msg.content})

    # Check if this is the first message (title is default)
    is_first_message = conv.title == "新对话"

    # Stream from MiMo API
    async def generate():
        full_response = ""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{settings.MIMO_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.MIMO_API_KEY}"},
                    json={
                        "model": settings.MIMO_MODEL,
                        "messages": messages,
                        "max_tokens": style.max_tokens if style else 2048,
                        "temperature": style.temperature if style else 0.7,
                        "top_p": style.top_p if style else 0.9,
                        "stream": True,
                    },
                ) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                delta = chunk["choices"][0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    full_response += content
                                    yield {"event": "message", "data": json.dumps({"content": content})}
                            except (json.JSONDecodeError, KeyError, IndexError):
                                continue
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"error": str(e)})}

        # Safety filter on response
        filter_result = await filter_text(full_response, user.id, "response", db, conv_id)
        if filter_result.blocked:
            yield {"event": "blocked", "data": json.dumps({"reason": filter_result.reason})}
            return

        # Save assistant message
        async with async_session() as save_db:
            assistant_msg = Message(
                conversation_id=conv_id,
                role="assistant",
                content=full_response,
                style_id=style.id if style else None,
            )
            save_db.add(assistant_msg)
            await save_db.commit()

        # Generate title for first message
        new_title = None
        if is_first_message:
            new_title = await generate_title(req.content)
            async with async_session() as title_db:
                title_conv = await title_db.get(Conversation, conv_id)
                if title_conv:
                    title_conv.title = new_title
                    await title_db.commit()

        done_data = {}
        if new_title:
            done_data["title"] = new_title
        yield {"event": "done", "data": json.dumps(done_data)}

    return EventSourceResponse(generate())


@router.post("/conversations/{conv_id}/switch-style")
async def switch_style(
    conv_id: uuid.UUID,
    req: SwitchStyleRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conv = await db.get(Conversation, conv_id)
    if not conv or conv.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    style_result = await db.execute(select(Style).where(Style.identifier == req.style_identifier))
    new_style = style_result.scalar_one_or_none()
    if not new_style:
        raise HTTPException(status_code=404, detail="Style not found")

    # Get current style from last message
    last_msg = await db.execute(
        select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at.desc()).limit(1)
    )
    last = last_msg.scalar_one_or_none()
    from_style_id = last.style_id if last else None

    switch = StyleSwitch(
        conversation_id=conv_id,
        user_id=user.id,
        from_style_id=from_style_id,
        to_style_id=new_style.id,
    )
    db.add(switch)
    await db.commit()

    return {"message": f"已切换到 {new_style.name}", "style": new_style.identifier}


@router.post("/switch-style")
async def switch_style_global(
    req: SwitchStyleRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """记录风格切换（不需要对话ID）"""
    style_result = await db.execute(select(Style).where(Style.identifier == req.style_identifier))
    new_style = style_result.scalar_one_or_none()
    if not new_style:
        raise HTTPException(status_code=404, detail="Style not found")

    from_style_id = None
    if req.from_style_identifier:
        from_result = await db.execute(select(Style).where(Style.identifier == req.from_style_identifier))
        from_style = from_result.scalar_one_or_none()
        if from_style:
            from_style_id = from_style.id

    switch = StyleSwitch(
        user_id=user.id,
        from_style_id=from_style_id,
        to_style_id=new_style.id,
    )
    db.add(switch)
    await db.commit()

    return {"message": f"已切换到 {new_style.name}", "style": new_style.identifier}
