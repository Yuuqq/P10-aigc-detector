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

// --- 简单的高频平庸词典 (模拟 Language Model 测算 Perplexity) ---
// AI 倾向于大量复用这些过渡词和套话
const CLICHE_WORDS = new Set([
  "总而言之", "综上所述", "值得注意的是", "不可否认", "在这个问题上", "在当今社会", "众所周知",
  "随着", "发展", "认为", "表示", "提供", "强调", "不仅", "而且", "然而", "但是", "因此", "所以",
  "一方面", "另一方面", "首先", "其次", "最后", "重要的是", "关键在于", "不可或缺", "发挥着"
]);

// 典型示例文本
const DEMO_AI = `在当今时代，人工智能技术的发展可谓是日新月异。众所周知，科技的进步不仅改变了我们的生活方式，而且对各行各业产生了深远的影响。首先，在医疗领域，AI提供了更精准的诊断。其次，在教育领域，它使得个性化学习成为可能。然而，值得注意的是，科技发展也带来了一些挑战。不可否认，数据隐私问题日益凸显。因此，我们需要制定合理的政策。综上所述，人工智能是一把双刃剑。总而言之，我们应该在发挥其潜力的同时，谨慎应对其带来的风险。`;

const DEMO_HUMAN = `昨夜落了很厚的一层雪。早上推开门，冷空气往肺里猛灌了一口，呛得我直咳嗽。街角的早餐档竟然还没开，那口大铁锅就冷冰冰地扣在炉子上，旁边还挂着半截发黄的塑料绳。我缩了缩脖子。如果没记错，老李卖包子已经有十年了，除了春节，他从不缺勤。难道是因为这场突如其来的大雪？或者是别的什么原因？我不得而知。踩在咯吱作响的雪地上，我只觉得今年的冬天，比以往都要难熬几十倍。世界白得晃眼。`;

// 工具函数
function splitSentences(text) {
  // 按中文标点分割，保留标点
  const regex = /([^。！？\.\!\?]+[。！？\.\!\?]?)/g;
  return (text.match(regex) || []).map(s => s.trim()).filter(Boolean);
}

// === 核心算法：近似突发性 (Pseudo-Burstiness) ===
// 突发性主要衡量句子长度的波动程度（方差）
function calcBurstiness(sentences) {
  if (sentences.length < 2) return { score: 0, std: 0 };
  const lengths = sentences.map(s => s.length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  const std = Math.sqrt(variance);

  // 归一化 Burstiness (变异系数 CV = std / mean)
  let cv = std / mean;
  // 将 CV 映射到 0-100 分。AI 文本通常 cv < 0.3，人类文本往往 cv > 0.5
  let score = cv * 150;
  score = Math.max(0, Math.min(100, score));

  return { score, std, mean, lengths };
}

// === 核心算法：近似困惑度 (Pseudo-Perplexity) ===
// 困惑度此处简化为：含有多少“非套话”的个性表达。套话密度越高，困惑度越低。
function calcPerplexity(sentences) {
  let totalWords = 0;
  let clicheHits = 0;

  const sentencePerplexities = sentences.map(s => {
    // 粗略分词（按连续的2个以上汉字算作一个词，结合套话表验证）
    let sHits = 0;
    CLICHE_WORDS.forEach(cw => {
      let regex = new RegExp(cw, "g");
      let matches = s.match(regex);
      if (matches) sHits += matches.length;
    });
    clicheHits += sHits;

    // 句子字数作为基数
    totalWords += s.length;

    // 句子级困惑度惩罚 (命中套话越多，局部分数越低)
    return Math.max(0, 100 - (sHits * 30));
  });

  // 全局评分：套话密度
  const density = clicheHits / (totalWords / 10); // 假定平均10个字一个词组
  // 困惑度：100 表示极其不按常理出牌 (全是非套话)，0 表示全是AI口吻
  let globalScore = 100 - (density * 200);
  globalScore = Math.max(0, Math.min(100, globalScore));

  return { score: globalScore, details: sentencePerplexities };
}

// === 可视化更新 ===
function visualize(text) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return;

  const bRes = calcBurstiness(sentences);
  const pRes = calcPerplexity(sentences);

  // 显示面板
  resultsPanel.classList.remove("hidden");

  // 更新数值与进度条
  // P分和B分越高，说明越像人类（自然、灵动）。越低越像平庸AI。
  valPerplexity.textContent = pRes.score.toFixed(1);
  barPerplexity.style.width = `${pRes.score}%`;
  barPerplexity.style.background = pRes.score < 40 ? "var(--danger)" : (pRes.score > 70 ? "var(--human-color)" : "var(--neutral-color)");

  valBurstiness.textContent = bRes.score.toFixed(1);
  barBurstiness.style.width = `${bRes.score}%`;
  barBurstiness.style.background = bRes.score < 40 ? "var(--danger)" : (bRes.score > 70 ? "var(--human-color)" : "var(--neutral-color)");

  // 综合判定
  // AI_Likelihood = 100 - average(P, B)
  const avgHumanity = (pRes.score + bRes.score) / 2;
  const aiProb = Math.max(0, Math.min(100, 100 - avgHumanity));
  valAILikelihood.textContent = aiProb.toFixed(1) + "%";
  valAILikelihood.style.color = aiProb > 70 ? "var(--danger)" : (aiProb < 30 ? "var(--human-color)" : "var(--text-main)");

  // Sentence Level Highlight
  textVisualization.innerHTML = "";
  sentences.forEach((s, i) => {
    const span = document.createElement("span");
    span.className = "sent-span";
    span.textContent = s;

    // 根据局部困惑度和长度变异性染色
    // 如果句子长度非常接近平均值，且含有套话，标记为 AI红区
    const lenDeviation = Math.abs(s.length - bRes.mean);
    const isLenUniform = lenDeviation < (bRes.mean * 0.2); // 长度很中庸
    const localPSuspect = pRes.details[i] < 60; // 局部包含套话

    if (isLenUniform && localPSuspect) {
      span.classList.add("aihigh");
    } else if (!isLenUniform && !localPSuspect) {
      span.classList.add("humanhigh");
    } else {
      span.classList.add("aimid");
    }

    textVisualization.appendChild(span);
  });

  // 更新散点图坐标
  // P在X轴，B在Y轴
  scatterPoint.classList.remove("hidden");
  // position percentage from left and bottom
  scatterPoint.style.left = `${pRes.score}%`;
  scatterPoint.style.bottom = `${bRes.score}%`;
}


// === 事件绑定 ===
detectBtn.addEventListener("click", () => {
  const text = textInput.value.trim();
  if (!text) {
    resultsPanel.classList.remove("hidden");
    resultsPanel.innerHTML = `<div class="p error" style="color:var(--error);padding:1rem;background:var(--card-bg);border:1px solid var(--border)">错误：请输入需要分析的文本才能进行探测。</div>`;
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


// === auto-analyze on demo text load ===
(function() {
  setTimeout(function() {
    var ta = document.getElementById('inputText') || document.querySelector('textarea');
    if (ta && ta.value.trim()) {
      var btn = document.getElementById('detectBtn') || document.querySelector('button[id*="detect"]') || document.querySelector('button[id*="analyze"]');
      if (btn) btn.click();
    }
  }, 1200);
})();
