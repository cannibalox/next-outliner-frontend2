// + # are removed
const SPACE_OR_PUNCTUATION =
  /[|\n\r\s!"'&()*,\-./:;<=>?@[\\\]^_`{}~\u00A0\u00A1\u00A7\u00AB\u00B6\u00B7\u00BB\u00BF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u1680\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2000-\u200A\u2010-\u2029\u202F-\u2043\u2045-\u2051\u2053-\u205F\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u3000-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]+/u;
const CAMEL_CASE_SPLIT_REG = /(?<!(?:^|[A-Z]))(?=[A-Z])|(?<!^)(?=[A-Z][a-z])/;
const CJK = /[\u4E00-\u9FA5]/;

export const ngramSplit = (str: string, n: number) => {
  const result = [];
  for (let i = 0; i < str.length - n + 1; i++) {
    result.push(str.slice(i < 0 ? 0 : i, i + n));
  }
  return result;
};

export function tokenize(str: string, ngrams: number[] = [1, 2, 3]) {
  const nonCjkTokens: string[] = [];
  const cjkTokens: string[] = [];

  let currentToken = "";
  let isCjk = false;

  const addToken = () => {
    if (currentToken) {
      if (isCjk) cjkTokens.push(currentToken);
      else nonCjkTokens.push(currentToken);
      currentToken = "";
    }
  };

  for (const char of str) {
    if (SPACE_OR_PUNCTUATION.test(char)) {
      addToken();
    } else {
      const charIsCjk = CJK.test(char);
      if (currentToken && charIsCjk !== isCjk) addToken();
      currentToken += char;
      isCjk = charIsCjk;
    }
  }
  addToken();

  return { nonCjkTokens, cjkTokens };
}

// 简单的分词方法
// 如果 cjkNGram == 2，则 tokenize("大家好，我是信息！Hello, world! 这是中国大陆, This is china 大陆很美 mainland")
// 结果为 ["大家", "家好", "我是", "是信", "信息", "hello", "world", "这是", "是中", "中国", "国大", "大陆", "this", "is", "china", "大陆", "陆很", "很美", "mainland"]
export const cjkNgramTokenize = (
  str: string,
  caseSensitive: boolean = false,
  cjkNGram: number = 2,
) => {
  let prevCjk = false;
  const temp = [];
  const tokens: string[] = [];
  for (const c of str) {
    if (SPACE_OR_PUNCTUATION.test(c)) {
      if (temp.length > 0) {
        let token = temp.join("");
        if (!caseSensitive) {
          token = token.toLowerCase();
        }
        if (prevCjk) {
          tokens.push(...ngramSplit(token, cjkNGram));
        } else {
          tokens.push(token);
        }
        temp.length = 0;
      }
    } else if (temp.length == 0) {
      temp.push(c);
      prevCjk = CJK.test(c);
    } else {
      const cjk = CJK.test(c);
      if (cjk != prevCjk) {
        let token = temp.join("");
        if (!caseSensitive) {
          token = token.toLowerCase();
        }
        if (prevCjk) {
          tokens.push(...ngramSplit(token, cjkNGram));
        } else {
          tokens.push(token);
        }
        temp.length = 0;
        temp.push(c);
        prevCjk = cjk;
      } else {
        temp.push(c);
      }
    }
  }
  if (temp.length > 0) {
    let token = temp.join("");
    if (!caseSensitive) {
      token = token.toLowerCase();
    }
    if (prevCjk) {
      tokens.push(...ngramSplit(token, cjkNGram));
    } else {
      tokens.push(token);
    }
  }
  return tokens;
};