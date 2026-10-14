/* gemini.js - gọi Gemini qua Firebase AI Logic (#81), dùng chung cho tab AI của editor và trình tạo web.
   Hai project Firebase gói Spark (miễn phí, không gắn thẻ nên không tốn tiền):
   - công khai: cấu hình ghi trong PUBLIC, ai cũng thử được;
   - máy demo: cấu hình dán vào localStorage của máy thuyết trình (khoá DEMO_KEY), không bao giờ commit.
   Có cấu hình demo thì dùng demo, không thì dùng công khai. SDK chỉ tải khi gọi AI lần đầu.
   Gói miễn phí: Google dùng nội dung gửi lên để cải thiện sản phẩm, nên không gửi dữ liệu cá nhân hay đơn đặt chỗ. */

const SDK = 'https://www.gstatic.com/firebasejs/13.0.0';
const DEMO_KEY = 'clauki-ai-demo';
export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

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

async function modelFor(systemInstruction, json = false) {
  const demo = readDemo();
  sdk ??= Promise.all([import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-ai.js`)]);
  const [{ initializeApp }, { getAI, getGenerativeModel, GoogleAIBackend }] = await sdk;
  const name = demo ? 'clauki-demo' : 'clauki-public';
  if (!apps.has(name)) apps.set(name, initializeApp(demo ? demo.config : PUBLIC_CONFIG, name));
  const ai = getAI(apps.get(name), { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: demo?.model || DEFAULT_MODEL,
    ...(systemInstruction && { systemInstruction }),
    generationConfig: { temperature: 0.4, ...(json && { responseMimeType: 'application/json' }) },
    safetySettings: ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT']
      .map((category) => ({ category, threshold: 'BLOCK_LOW_AND_ABOVE' })),
  });
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

// Chạy once(signal) với giới hạn thời gian; quá tải mà canRetry() còn đúng (chưa nhận được gì) thì thử lại một lần.
async function withRetry(once, canRetry = () => true) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    try {
      return await once(abort.signal);
    } catch (err) {
      const why = explain(err, abort.signal.aborted);
      if (why.kind !== 'busy' || !canRetry()) throw why;
      await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
      return await once(abort.signal);
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
  return withRetry(async (signal) => {
    const model = await modelFor(systemInstruction);
    const result = await model.generateContentStream(prompt, { signal });
    let buffer = '';
    const emit = (line) => {
      if (!line) return;
      got += 1;
      onLine(line);
    };
    for await (const chunk of result.stream) {
      buffer += chunk.text();
      let i;
      while ((i = buffer.indexOf('\n')) >= 0) {
        emit(buffer.slice(0, i).trim());
        buffer = buffer.slice(i + 1);
      }
    }
    emit(buffer.trim());
  }, () => got === 0);
}

// Một request trả về một object JSON (ví dụ hồ sơ brand).
export function generateJson(prompt) {
  return withRetry(async (signal) => {
    const model = await modelFor('', true);
    const result = await model.generateContent(prompt, { signal });
    return JSON.parse(result.response.text());
  });
}
