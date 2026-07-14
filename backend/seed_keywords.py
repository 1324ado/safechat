"""批量导入敏感词库"""
import asyncio
from app.core.database import async_session
from app.models.safety import Keyword
from sqlalchemy import select

KEYWORDS = {
    "辱骂人身攻击": [
        "傻逼", "脑残", "废物", "去死", "滚蛋", "垃圾", "杂种", "贱人", "智障", "疯子",
        "蠢货", "有病", "垃圾人", "全家死", "咒你", "狗东西", "白痴", "弱智", "二百五",
        "王八蛋", "混蛋", "浑蛋", "畜生", "不是人", "猪狗不如", "人渣", "败类",
    ],
    "色情低俗": [
        "约炮", "裸聊", "露体", "嫖娼", "援交", "包养", "一夜情", "骚", "淫",
        "色情", "裸照", "自慰", "性爱", "成人视频", "黄色", "AV", "调教",
        "SM", "丝袜", "诱惑", "勾引", "私密", "不雅",
    ],
    "诈骗赌博导流": [
        "刷单", "返利", "赚钱兼职", "博彩", "赌球", "彩票", "充值提现", "比特币",
        "虚拟币", "转账", "加微信", "加QQ", "外链", "贷款", "高利贷", "杀猪盘",
        "代刷", "充值返利", "境外赌博", "非法理财", "网赚", "日赚", "零投入",
        "稳赚", "内幕", "漏洞", "套现", "薅羊毛",
    ],
    "暴力自残违法": [
        "自杀", "自残", "割腕", "跳楼", "毒品", "大麻", "违禁药", "制毒",
        "武器制作", "杀人", "行凶", "报复", "家暴", "教唆伤害", "安乐死",
        "爆炸", "枪支", "炸弹", "恐袭", "投毒",
    ],
    "谣言煽动违规": [
        "虚假造谣", "煽动闹事", "极端邪教", "不实信息", "恶意造谣", "非法集会",
        "颠覆", "分裂", "暴动", "游行", "抗议", "上访",
    ],
    "广告骚扰引流": [
        "加我", "私聊引流", "微商", "引流社群", "拉群", "推广", "诱导付费",
        "外挂", "脚本", "破解版", "盗版", "免费领", "扫码", "关注公众号",
        "点击链接", "优惠券", "内部价", "代理",
    ],
}


async def seed_keywords():
    async with async_session() as db:
        # Check existing keywords
        existing = await db.scalar(select(Keyword).limit(1))
        if existing:
            print("关键词库已有数据，跳过导入")
            return

        count = 0
        for category, words in KEYWORDS.items():
            for word in words:
                keyword = Keyword(word=word, category=category)
                db.add(keyword)
                count += 1

        await db.commit()
        print(f"成功导入 {count} 个关键词")


if __name__ == "__main__":
    asyncio.run(seed_keywords())
