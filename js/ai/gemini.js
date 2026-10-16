/* gemini.js - gọi Gemini qua Firebase AI Logic (#81), dùng chung cho tab AI của editor và trình tạo web.
   Hai project Firebase gói Spark (miễn phí, không gắn thẻ nên không tốn tiền):
   - công khai: cấu hình ghi trong PUBLIC, ai cũng thử được;
   - máy demo: cấu hình dán vào localStorage của máy thuyết trình (khoá DEMO_KEY), không bao giờ commit.
   Có cấu hình demo thì dùng demo, không thì dùng công khai. SDK chỉ tải khi gọi AI lần đầu.
   Thêm hai khoá Gemini dự phòng của thành viên (BACKUP_KEYS, gọi thẳng REST API của Gemini, không qua Firebase). Thứ tự thử:
   model chính trên Firebase, rồi trên từng khoá dự phòng; cả ba hết lượt (429) mới hạ xuống model dự phòng, cũng lần lượt
   Firebase rồi các khoá. Đường nào hết lượt thì nghỉ COOL_MS rồi mới dùng lại.
   Gói miễn phí: Google dùng nội dung gửi lên để cải thiện sản phẩm, nên không gửi dữ liệu cá nhân hay đơn đặt chỗ. */

const SDK = 'https://www.gstatic.com/firebasejs/13.0.0';
const DEMO_KEY = 'clauki-ai-demo';
export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
// Model dự phòng, có hạn mức riêng: chỉ dùng khi model chính hết lượt trên mọi đường (Firebase và các khoá dự phòng).
export const FALLBACK_MODEL = 'gemini-3.1-flash-lite';
// Khoá Gemini API dự phòng (Như Quỳnh, Mị Nương). Khoá nằm trong mã trang nên ai xem mã cũng thấy; giới hạn tên miền và gói miễn phí
// của từng khoá đặt trên Google Cloud.
const BACKUP_KEYS = [
  'AQ.Ab8RN6Le_vl9mwtxFItxfVQYgwg8jKG8T9go8jViJcYT5_RMWw',
  'AQ.Ab8RN6L64kInIlz2dy-3nn9yEIm6njxqeZaCypwyubb5YbpKRw',
];
const REST = 'https://generativelanguage.googleapis.com/v1beta/models';
const COOL_MS = 60000;
// Đường gọi (nguồn và model) đang nghỉ vì hết lượt: khoá "nguồn|model" -> thời điểm được dùng lại.
const cooling = new Map();
let lastRoute = null;
export const usingFallback = () => lastRoute?.model === FALLBACK_MODEL;
// Đang dùng khoá dự phòng thứ mấy (1, 2), 0 là Firebase.
export const backupInUse = () => (lastRoute?.key ? BACKUP_KEYS.indexOf(lastRoute.key) + 1 : 0);

function routes() {
  const main = readDemo()?.model || DEFAULT_MODEL;
  const sources = [null, ...BACKUP_KEYS];
  return [main, FALLBACK_MODEL].flatMap((model) => sources.map((key) => ({ key, model, id: `${key ? key.slice(-6) : 'firebase'}|${model}` })));
}

// Đường đầu tiên không đang nghỉ; mọi đường đều nghỉ thì null (báo hết lượt).
function nextRoute() {
  const now = Date.now();
  return routes().find((r) => !((cooling.get(r.id) ?? 0) > now)) ?? null;
}

// Cấu hình web của project công khai (clauki-public). Cấu hình web của Firebase không phải bí mật: quyền gọi AI
// giới hạn bởi gói Spark (hết lượt thì dừng, không tốn tiền) và giới hạn tên miền của key trên Google Cloud.
const PUBLIC_CONFIG = {
  apiKey: 'AIzaSyB2Tl_NPbhhwsEyBXUTVByenJp8MevF6QQ',
  authDomain: 'clauki-public.firebaseapp.com',
  projectId: 'clauki-public',
  storageBucket: 'clauki-public.firebasestorage.app',
  messagingSenderId: '393477947583',
  appId: '1:393477947583:web:5aaac7222987b95ed3060a',
};

const TIMEOUT_MS = 60000;
// Máy chủ báo quá tải thường chỉ vài giây: đợi chừng này rồi thử lại một lần.
const RETRY_MS = 1500;
let sdk = null;
const apps = new Map();

export function readDemo() {
  try {
    const demo = JSON.parse(localStorage.getItem(DEMO_KEY) ?? 'null');
    return demo?.config?.apiKey && demo?.config?.projectId ? demo : null;
  } catch {
    return null;
  }
}

export function saveDemo(demo) {
  try {
    if (demo) localStorage.setItem(DEMO_KEY, JSON.stringify(demo));
    else localStorage.removeItem(DEMO_KEY);
    return true;
  } catch {
    return false;
  }
}

// Đang dùng project nào: 'demo' hay 'public'.
export const aiSource = () => (readDemo() ? 'demo' : 'public');

// Chữ AI viết: bỏ HTML, dấu chấm giữa và gạch dài (quy định chữ hiện ra trang), gộp khoảng trắng, cắt độ dài.
export function cleanText(value, max = 400) {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s*[·—]\s*/g, ', ').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function firebaseModel(systemInstruction, json = false, modelName = '') {
  const demo = readDemo();
  sdk ??= Promise.all([import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-ai.js`)]);
  const [{ initializeApp }, { getAI, getGenerativeModel, GoogleAIBackend }] = await sdk;
  const name = demo ? 'clauki-demo' : 'clauki-public';
  if (!apps.has(name)) apps.set(name, initializeApp(demo ? demo.config : PUBLIC_CONFIG, name));
  const ai = getAI(apps.get(name), { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: modelName || demo?.model || DEFAULT_MODEL,
    ...(systemInstruction && { systemInstruction }),
    // Mức chặn để mặc định của Gemini: mức chặt nhất từng chặn nhầm chữ mẫu như tour địa đạo Củ Chi của khung SighGone.
    generationConfig: { temperature: 0.4, ...(json && { responseMimeType: 'application/json' }) },
  });
}

/* ---------- Gọi thẳng REST API của Gemini (khoá dự phòng) ---------- */

function restBody(systemInstruction, prompt, json) {
  return JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } }),
    generationConfig: { temperature: 0.4, ...(json && { responseMimeType: 'application/json' }) },
  });
}

// Chữ trong một phản hồi (hay một mẩu khi stream); bị chặn thì ném lỗi có chữ SAFETY để explain() nhận ra.
function restText(data) {
  if (data.promptFeedback?.blockReason) throw new Error(`SAFETY blocked: ${data.promptFeedback.blockReason}`);
  const cand = data.candidates?.[0];
  if (cand?.finishReason === 'SAFETY' || cand?.finishReason === 'PROHIBITED_CONTENT') throw new Error(`SAFETY blocked: ${cand.finishReason}`);
  return (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('');
}

async function restFetch(route, method, body, signal) {
  const res = await fetch(`${REST}/${route.model}:${method}${method.startsWith('stream') ? '?alt=sse&' : '?'}key=${encodeURIComponent(route.key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    // Viết lỗi giống SDK ("[429 ] ...") để explain() phân loại chung một cách.
    throw new Error(`[${res.status} ] ${data.error?.status ?? ''} ${data.error?.message ?? ''}`);
  }
  return res;
}

async function restGenerate(route, systemInstruction, prompt, json, signal) {
  const res = await restFetch(route, 'generateContent', restBody(systemInstruction, prompt, json), signal);
  return restText(await res.json());
}

// Stream kiểu SSE: mỗi dòng "data: {...}" là một mẩu phản hồi.
async function restStream(route, systemInstruction, prompt, signal, onText) {
  const res = await restFetch(route, 'streamGenerateContent', restBody(systemInstruction, prompt, false), signal);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (line.startsWith('data:')) onText(restText(JSON.parse(line.slice(5))));
    }
  }
}

class AiError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

// Lỗi của SDK đổi thành câu dễ hiểu. Xét theo mã lỗi trong thông báo ("[429 ]", "[500 ]"), không dò chữ chung chung:
// địa chỉ API ".../generateContent" chứa chữ "rate", dò "rate" thì lỗi nào cũng thành "hết lượt".
function explain(err, aborted) {
  if (err instanceof AiError) return err;
  if (err instanceof SyntaxError) return new AiError('format', 'AI trả về sai định dạng, hãy thử lại.');
  const text = String(err?.message ?? err);
  if (aborted) return new AiError('timeout', 'AI trả lời quá lâu, đã dừng. Hãy thử lại.');
  if (/\[429\b|RESOURCE_EXHAUSTED|quota/i.test(text)) return new AiError('quota', 'AI đang nghỉ (hết lượt miễn phí), hãy thử lại sau hoặc sửa tay.');
  if (/\[50[03]\b|high demand|overloaded|UNAVAILABLE/i.test(text)) return new AiError('busy', 'Máy chủ AI đang quá tải, hãy thử lại sau vài giây.');
  if (/\[40[13]\b|PERMISSION_DENIED|API key|referr?er/i.test(text)) return new AiError('denied', 'Trang này chưa được phép gọi AI (kiểm cấu hình và giới hạn tên miền của key).');
  if (/SAFETY|blocked/i.test(text)) return new AiError('blocked', 'Yêu cầu bị bộ lọc an toàn chặn. Hãy viết lại yêu cầu.');
  if (/Failed to fetch|NetworkError|network|offline/i.test(text)) return new AiError('network', 'Không kết nối được AI. Kiểm tra mạng rồi thử lại.');
  return new AiError('other', `AI gặp lỗi: ${text.slice(0, 160)}`);
}

// Chạy once(signal, route) với giới hạn thời gian. Hết lượt (429) thì đường đó nghỉ COOL_MS và thử đường kế tiếp (khoá dự phòng,
// rồi model dự phòng) khi canRetry() còn đúng (chưa nhận được gì); quá tải thì đợi chút rồi thử lại một lần trên cùng đường.
async function withRetry(once, canRetry = () => true) {
  const abort = new AbortController();
  // Hạn chờ tính từ lần cuối nhận được dữ liệu (alive), không tính cả lượt: nhóm chữ dài stream đều đặn hơn 60 giây khi AI chậm
  // vẫn chạy tiếp, chỉ dừng khi AI im lặng quá TIMEOUT_MS.
  let timer = 0;
  const alive = () => {
    clearTimeout(timer);
    timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  };
  alive();
  let busyRetried = false;
  try {
    for (;;) {
      const route = nextRoute();
      if (!route) throw new AiError('quota', 'AI đang nghỉ (mọi khoá đều hết lượt miễn phí), hãy thử lại sau một phút hoặc sửa tay.');
      lastRoute = route;
      try {
        return await once(abort.signal, route, alive);
      } catch (err) {
        const why = explain(err, abort.signal.aborted);
        if (why.kind === 'quota') {
          cooling.set(route.id, Date.now() + COOL_MS);
          if (canRetry() && nextRoute()) continue;
        }
        if (why.kind !== 'busy' || busyRetried || !canRetry()) throw why;
        busyRetried = true;
        await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
      }
    }
  } catch (err) {
    throw explain(err, abort.signal.aborted);
  } finally {
    clearTimeout(timer);
  }
}

// Gửi prompt, nhận từng dòng (JSON Lines) ngay khi về; onLine được gọi với mỗi dòng không rỗng.
export function streamLines(systemInstruction, prompt, onLine) {
  let got = 0;
  return withRetry(async (signal, route, alive) => {
    let buffer = '';
    const emit = (line) => {
      if (!line) return;
      got += 1;
      onLine(line);
    };
    const take = (text) => {
      alive();
      buffer += text;
      let i;
      while ((i = buffer.indexOf('\n')) >= 0) {
        emit(buffer.slice(0, i).trim());
        buffer = buffer.slice(i + 1);
      }
    };
    if (route.key) await restStream(route, systemInstruction, prompt, signal, take);
    else {
      const model = await firebaseModel(systemInstruction, false, route.model);
      const result = await model.generateContentStream(prompt, { signal });
      for await (const chunk of result.stream) take(chunk.text());
    }
    emit(buffer.trim());
  }, () => got === 0);
}

// Một request trả về một object JSON (ví dụ hồ sơ brand).
export function generateJson(prompt) {
  return withRetry(async (signal, route) => {
    if (route.key) return JSON.parse(await restGenerate(route, '', prompt, true, signal));
    const model = await firebaseModel('', true, route.model);
    const result = await model.generateContent(prompt, { signal });
    return JSON.parse(result.response.text());
  });
}
