/**
 * P10 AIGC 探测器：算法白盒重构 (清华视角)
 * 核心逻辑：前端模拟 Perplexity (困惑度) 和 Burstiness (突发性) 的启发式计算
 */

const textInput = document.getElementById("textInput");
const detectBtn = document.getElementById("detectBtn");
const demoAIBtn = document.getElementById("demoAIBtn");
const demoHumanBtn = document.getElementById("demoHumanBtn");
const clearBtn = document.getElementById("clearBtn");

const resultsPanel = document.getElementById("resultsPanel");
const valPerplexity = document.getElementById("valPerplexity");
const barPerplexity = document.getElementById("barPerplexity");
const valBurstiness = document.getElementById("valBurstiness");
const barBurstiness = document.getElementById("barBurstiness");
const valAILikelihood = document.getElementById("valAILikelihood");
const textVisualization = document.getElementById("textVisualization");
const scatterPoint = document.getElementById("scatterPoint");

// 只收录低频套话。不把「随着 / 因此 / 认为」这类新闻稿常用词算进来。
const CLICHE_PHRASES = [
  "总而言之", "综上所述", "值得注意的是", "不可否认", "在当今社会", "众所周知",
  "一方面", "另一方面", "不可或缺", "日新月异", "深远的影响", "发挥着重要"
];
const CLICHE_PATTERN = new RegExp(CLICHE_PHRASES.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");

// 典型示例文本
const DEMO_AI = `在当今时代，人工智能技术的发展可谓是日新月异。众所周知，科技的进步不仅改变了我们的生活方式，而且对各行各业产生了深远的影响。首先，在医疗领域，AI提供了更精准的诊断。其次，在教育领域，它使得个性化学习成为可能。然而，值得注意的是，科技发展也带来了一些挑战。不可否认，数据隐私问题日益凸显。因此，我们需要制定合理的政策。综上所述，人工智能是一把双刃剑。总而言之，我们应该在发挥其潜力的同时，谨慎应对其带来的风险。`;

const DEMO_HUMAN = `昨夜落了很厚的一层雪。早上推开门，冷空气往肺里猛灌了一口，呛得我直咳嗽。街角的早餐档竟然还没开，那口大铁锅就冷冰冰地扣在炉子上，旁边还挂着半截发黄的塑料绳。我缩了缩脖子。如果没记错，老李卖包子已经有十年了，除了春节，他从不缺勤。难道是因为这场突如其来的大雪？或者是别的什么原因？我不得而知。踩在咯吱作响的雪地上，我只觉得今年的冬天，比以往都要难熬几十倍。世界白得晃眼。`;

// 工具函数
function splitSentences(text) {
  // 按中文标点分割，保留标点
  const regex = /([^。！？\.\!\?]+[。！？\.\!\?]?)/g;
  return (text.match(regex) || []).map(s => s.trim()).filter(Boolean);
}

function bandWidth(key) {
  if (key === "high") return 82;
  if (key === "mid") return 48;
  if (key === "low") return 18;
  return 0;
}

function calcBurstiness(sentences) {
  if (sentences.length < 3) {
    return { key: "short", label: "句数不足", cv: null, mean: sentences[0] ? sentences[0].length : 0, std: 0 };
  }
  const lengths = sentences.map(s => s.length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  const std = Math.sqrt(variance);
  const cv = mean ? std / mean : 0;
  let key = "mid";
  let label = "句长起伏中等";
  if (cv < 0.25) {
    key = "low";
    label = "句长很均匀";
  } else if (cv >= 0.45) {
    key = "high";
    label = "句长起伏明显";
  }
  return { key, label, cv, std, mean, lengths };
}

function calcCliche(sentences) {
  const hits = [];
  const details = sentences.map((sentence) => {
    CLICHE_PATTERN.lastIndex = 0;
    const found = sentence.match(CLICHE_PATTERN) || [];
    found.forEach((phrase) => hits.push(phrase));
    return found;
  });
  const chars = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  if (chars < 80) {
    return { key: "short", label: "文本过短", hits, details, chars };
  }
  const perThousand = hits.length / (chars / 1000);
  let key = "low";
  let label = "套话密度偏低";
  if (perThousand >= 6) {
    key = "high";
    label = "套话密度偏高";
  } else if (perThousand >= 2) {
    key = "mid";
    label = "套话密度中等";
  }
  return { key, label, hits, details, chars, perThousand };
}

// === 可视化更新 ===
function visualize(text) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return;

  const bRes = calcBurstiness(sentences);
  const pRes = calcCliche(sentences);

  resultsPanel.classList.remove("hidden");

  valPerplexity.textContent = pRes.label;
  barPerplexity.style.width = `${bandWidth(pRes.key)}%`;
  barPerplexity.style.background = pRes.key === "high" ? "var(--danger)" : (pRes.key === "low" ? "var(--human-color)" : "var(--neutral-color)");

  valBurstiness.textContent = bRes.cv == null ? bRes.label : `${bRes.label}，变异系数 ${bRes.cv.toFixed(2)}`;
  barBurstiness.style.width = `${bandWidth(bRes.key)}%`;
  barBurstiness.style.background = bRes.key === "low" ? "var(--danger)" : (bRes.key === "high" ? "var(--human-color)" : "var(--neutral-color)");

  valAILikelihood.textContent = pRes.key === "short" || bRes.key === "short"
    ? "样本不足，先不要下结论。"
    : `${pRes.label}，${bRes.label}。不是生成概率。`;
  valAILikelihood.style.color = "var(--text-main)";

  textVisualization.innerHTML = "";
  const hitLine = document.createElement("p");
  const uniqueHits = [...new Set(pRes.hits)];
  hitLine.textContent = uniqueHits.length ? `命中套话：${uniqueHits.join("、")}` : "没有命中内置套话表。";
  textVisualization.appendChild(hitLine);
  sentences.forEach((s, i) => {
    const span = document.createElement("span");
    span.className = "sent-span";
    span.textContent = s;
    const localHits = (pRes.details[i] || []).length > 0;
    const lenDeviation = bRes.mean ? Math.abs(s.length - bRes.mean) : null;
    const isLenUniform = lenDeviation != null && lenDeviation < (bRes.mean * 0.2);
    if (localHits && isLenUniform) span.classList.add("aihigh");
    else if (!localHits && lenDeviation != null && !isLenUniform) span.classList.add("humanhigh");
    else span.classList.add("aimid");
    textVisualization.appendChild(span);
  });

  scatterPoint.classList.remove("hidden");
  scatterPoint.style.left = `${bandWidth(pRes.key === "high" ? "low" : pRes.key === "low" ? "high" : pRes.key)}%`;
  scatterPoint.style.bottom = `${bandWidth(bRes.key)}%`;
}


// === 事件绑定 ===
detectBtn.addEventListener("click", () => {
  const text = textInput.value.trim();
  if (!text) {
    // 错误提示写入页面实际存在的结果容器（resultsPanel 内的 textVisualization），
    // 避免 innerHTML 覆盖 resultsPanel 本身导致其子节点被销毁
    resultsPanel.classList.remove("hidden");
    textVisualization.textContent = "";
    const error = document.createElement("div");
    error.className = "p error";
    error.style.cssText = "color:var(--danger);padding:1rem;background:var(--card-bg);border:1px solid var(--border)";
    error.textContent = "请输入需要分析的文本。";
    textVisualization.appendChild(error);
    return;
  }
  visualize(text);
});

demoAIBtn.addEventListener("click", () => {
  textInput.value = DEMO_AI;
  visualize(DEMO_AI);
});

demoHumanBtn.addEventListener("click", () => {
  textInput.value = DEMO_HUMAN;
  visualize(DEMO_HUMAN);
});

clearBtn.addEventListener("click", () => {
  textInput.value = "";
  resultsPanel.classList.add("hidden");
  scatterPoint.classList.add("hidden");
});

// === PM Metrics Integration ===
(function () {
  try {
    if (!window.pmMetrics) return;
    let taskStarted = false;
    document.addEventListener('click', function (e) {
      if (taskStarted) return;
      const btn = e.target.closest('button');
      if (btn) {
        taskStarted = true;
        window.pmMetrics.markTaskStart('aigc_whitebox_task');
      }
    }, { once: false });
  } catch (_e) { }
})();
