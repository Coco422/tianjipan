export interface ReviewResult {
  approved: boolean;
  confidence: number;
  reason: string;
  issues?: string[];
}

interface MarketForReview {
  title: string;
  description: string | null;
  type: string;
  options: string[];
}

const REVIEW_PROMPT = `你是一个盘口审核助手。你需要审核用户提交的盘口（预测市场）是否适合上架。

审核标准：
1. 合法性：不得涉及违法、色情、暴力、政治敏感、赌博平台引流内容
2. 可结算性：必须有一个明确、客观、可验证的结果判定标准
3. 歧义性：题目是否有歧义，可能导致争议
4. 恶意性：是否是垃圾信息、恶意刷盘、无意义内容

允许的内容：
- 科技趋势（产品发布、模型更新、价格预测等）
- 娱乐八卦（明星动态、作品发布等）
- 体育赛事（比分、胜负等）
- 生活日常（天气、节日、个人挑战等）
- 学术/行业预测

请严格以 JSON 格式回复，不要包含任何其他文字：
{
  "approved": true或false,
  "confidence": 0.0到1.0之间的数字,
  "reason": "审核理由（一句话）",
  "issues": ["问题1", "问题2"]
}`;

export async function reviewMarket(market: MarketForReview): Promise<ReviewResult> {
  const apiKey = process.env.LLM_API_KEY;
  const apiUrl = process.env.LLM_API_URL;
  const model = process.env.LLM_MODEL || "qwen3.6-27b";

  if (!apiKey || !apiUrl) {
    console.error("[review] LLM API not configured, skipping auto-review");
    return {
      approved: false,
      confidence: 0,
      reason: "LLM 审核未配置，需人工复核",
      issues: ["系统未配置 LLM API"],
    };
  }

  const userMessage = `请审核以下盘口：

标题: ${market.title}
描述: ${market.description || "无"}
类型: ${market.type === "BINARY" ? "二选一" : "多选"}
选项: ${market.options.join(" | ")}`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: REVIEW_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 500,
        // Qwen3 默认开启 thinking 模式，content 会为空
        // 关闭后 content 直接输出结果
        chat_template_kwargs: { enable_thinking: false },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[review] LLM API error:", response.status, text);
      return {
        approved: false,
        confidence: 0,
        reason: "LLM 审核请求失败，需人工复核",
        issues: [`API 返回 ${response.status}`],
      };
    }

    const data = await response.json();
    // Qwen3 关闭 thinking 后 content 直接输出；开启时可能为 null
    const content = (data.choices?.[0]?.message?.content || "").trim();

    if (!content) {
      console.error("[review] Empty LLM response:", JSON.stringify(data).slice(0, 200));
      return {
        approved: false,
        confidence: 0,
        reason: "LLM 返回为空，需人工复核",
      };
    }

    // 解析 JSON（可能被 markdown 代码块包裹）
    let jsonStr = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as ReviewResult;

    // 验证字段
    if (typeof parsed.approved !== "boolean" || typeof parsed.confidence !== "number") {
      throw new Error("Invalid review format");
    }

    // 确保 confidence 在范围内
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

    return parsed;
  } catch (err) {
    console.error("[review] Parse or network error:", err);
    return {
      approved: false,
      confidence: 0,
      reason: "LLM 审核解析失败，需人工复核",
      issues: [(err as Error).message],
    };
  }
}

// 阈值常量
export const AUTO_APPROVE_THRESHOLD = 0.8;
export const AUTO_REJECT_THRESHOLD = 0.8;
