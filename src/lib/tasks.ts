import type { Task } from "./types";

const r = String.raw;

/**
 * Every task is a plain JavaScript function verified by visible and hidden cases.
 * "coding": write it from a spec in one shot.
 * "agentic": fix a buggy file using read/write/run tools, then submit.
 * Functions must not mutate their inputs (the harness checks this).
 */
export const TASKS: Task[] = [
  {
    id: "roman-to-int",
    title: "Roman numerals to integer",
    category: "coding",
    fn: "romanToInt",
    spec: "romanToInt(s) converts a valid Roman numeral (I V X L C D M, with subtractive pairs like IV and CM) to an integer from 1 to 3999.",
    visible: [
      { args: ["III"], expected: 3 },
      { args: ["LVIII"], expected: 58 },
      { args: ["MCMXCIV"], expected: 1994 },
    ],
    hidden: [
      { args: ["IV"], expected: 4 },
      { args: ["IX"], expected: 9 },
      { args: ["XL"], expected: 40 },
      { args: ["CM"], expected: 900 },
      { args: ["CDXLIV"], expected: 444 },
      { args: ["MDCLXVI"], expected: 1666 },
      { args: ["MMMCMXCIX"], expected: 3999 },
    ],
    reference: r`function romanToInt(s){const v={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};let t=0;for(let i=0;i<s.length;i++){const c=v[s[i]],n=v[s[i+1]]||0;t+=c<n?-c:c;}return t;}
module.exports={romanToInt};`,
  },
  {
    id: "merge-intervals",
    title: "Merge overlapping intervals",
    category: "coding",
    fn: "mergeIntervals",
    spec: "mergeIntervals(intervals) takes an array of [start, end] pairs and returns a new array with overlapping or touching intervals merged (so [1,4] and [4,5] become [1,5]), sorted by start. It must not mutate its input.",
    visible: [
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { args: [[]], expected: [] },
    ],
    hidden: [
      { args: [[[5, 7], [1, 2], [2, 3]]], expected: [[1, 3], [5, 7]] },
      { args: [[[1, 10], [2, 3], [4, 5]]], expected: [[1, 10]] },
      { args: [[[3, 4]]], expected: [[3, 4]] },
      { args: [[[1, 2], [3, 4]]], expected: [[1, 2], [3, 4]] },
      { args: [[[6, 8], [1, 9], [2, 4], [4, 7]]], expected: [[1, 9]] },
    ],
    reference: r`function mergeIntervals(iv){const s=iv.map(x=>[x[0],x[1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const out=[];for(const [a,b] of s){const l=out[out.length-1];if(l&&a<=l[1])l[1]=Math.max(l[1],b);else out.push([a,b]);}return out;}
module.exports={mergeIntervals};`,
  },
  {
    id: "parse-duration",
    title: "Parse duration strings",
    category: "coding",
    fn: "parseDuration",
    spec: "parseDuration(str) converts strings like '1h30m15s' to seconds. Units are d (86400), h (3600), m (60), s (1). The string is one or more <integer><unit> groups with no spaces, in any order, each unit at most once. Return null for anything else (empty string, missing unit, unknown unit, repeated unit, spaces, signs).",
    visible: [
      { args: ["1h30m15s"], expected: 5415 },
      { args: ["90s"], expected: 90 },
      { args: [""], expected: null },
    ],
    hidden: [
      { args: ["2d"], expected: 172800 },
      { args: ["1d1h1m1s"], expected: 90061 },
      { args: ["10"], expected: null },
      { args: ["5x"], expected: null },
      { args: ["1h1h"], expected: null },
      { args: ["0s"], expected: 0 },
      { args: ["15m30s"], expected: 930 },
      { args: ["h"], expected: null },
      { args: ["1m 30s"], expected: null },
      { args: ["-5s"], expected: null },
      { args: ["1s1m"], expected: 61 },
    ],
    reference: r`function parseDuration(str){if(typeof str!=='string'||!str)return null;if(!/^(\d+[dhms])+$/.test(str))return null;const m={d:86400,h:3600,m:60,s:1};const seen=new Set();let t=0;for(const g of str.matchAll(/(\d+)([dhms])/g)){if(seen.has(g[2]))return null;seen.add(g[2]);t+=Number(g[1])*m[g[2]];}return t;}
module.exports={parseDuration};`,
  },
  {
    id: "top-k-frequent",
    title: "Top K frequent words",
    category: "coding",
    fn: "topKFrequent",
    spec: "topKFrequent(words, k) returns the k most frequent words, ordered by count descending, ties broken alphabetically ascending. If k exceeds the number of distinct words, return all of them.",
    visible: [
      { args: [["i", "love", "leetcode", "i", "love", "coding"], 2], expected: ["i", "love"] },
      { args: [["the", "day", "is", "sunny", "the", "the", "the", "sunny", "is", "is"], 4], expected: ["the", "is", "sunny", "day"] },
      { args: [["a"], 1], expected: ["a"] },
    ],
    hidden: [
      { args: [["b", "a", "b", "a", "c"], 3], expected: ["a", "b", "c"] },
      { args: [["x", "y", "z"], 2], expected: ["x", "y"] },
      { args: [[], 3], expected: [] },
      { args: [["a", "b"], 5], expected: ["a", "b"] },
      { args: [["z", "z", "y", "y", "x"], 1], expected: ["y"] },
    ],
    reference: r`function topKFrequent(words,k){const c=new Map();for(const w of words)c.set(w,(c.get(w)||0)+1);return [...c.entries()].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:a[0]>b[0]?1:0)).slice(0,k).map(e=>e[0]);}
module.exports={topKFrequent};`,
  },
  {
    id: "eval-rpn",
    title: "Reverse Polish notation",
    category: "coding",
    fn: "evalRPN",
    spec: "evalRPN(tokens) evaluates a Reverse Polish Notation expression given as an array of strings. Operators are + - * /. Division truncates toward zero (7 / -2 is -3). Operands are integers, possibly negative like '-11'. Input is always valid.",
    visible: [
      { args: [["2", "1", "+", "3", "*"]], expected: 9 },
      { args: [["4", "13", "5", "/", "+"]], expected: 6 },
      { args: [["3"]], expected: 3 },
    ],
    hidden: [
      { args: [["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"]], expected: 22 },
      { args: [["7", "-2", "/"]], expected: -3 },
      { args: [["-7", "2", "/"]], expected: -3 },
      { args: [["5", "1", "2", "+", "4", "*", "+", "3", "-"]], expected: 14 },
      { args: [["0", "3", "/"]], expected: 0 },
    ],
    reference: r`function evalRPN(tokens){const st=[];for(const t of tokens){if(['+','-','*','/'].includes(t)){const b=st.pop(),a=st.pop();st.push(t==='+'?a+b:t==='-'?a-b:t==='*'?a*b:Math.trunc(a/b));}else st.push(Number(t));}return st[0];}
module.exports={evalRPN};`,
  },
  {
    id: "fix-paginate",
    title: "Fix the paginator",
    category: "agentic",
    fn: "paginate",
    spec: "paginate(items, page, pageSize) returns { items, page, pageSize, totalPages, hasNext, hasPrev }. Pages are 1-indexed. totalPages = ceil(items.length / pageSize) (0 for an empty list). page is clamped into [1, max(1, totalPages)] and the clamped value is returned. hasNext = page < totalPages, hasPrev = page > 1.",
    starter: r`function paginate(items,page,pageSize){const totalPages=Math.floor(items.length/pageSize);const start=page*pageSize;return{items:items.slice(start,start+pageSize),page,pageSize,totalPages,hasNext:page<totalPages,hasPrev:page>0};}
module.exports={paginate};`,
    visible: [
      { args: [[1, 2, 3, 4, 5], 1, 2], expected: { items: [1, 2], page: 1, pageSize: 2, totalPages: 3, hasNext: true, hasPrev: false } },
      { args: [[1, 2, 3, 4, 5], 3, 2], expected: { items: [5], page: 3, pageSize: 2, totalPages: 3, hasNext: false, hasPrev: true } },
      { args: [[], 1, 10], expected: { items: [], page: 1, pageSize: 10, totalPages: 0, hasNext: false, hasPrev: false } },
    ],
    hidden: [
      { args: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 2, 5], expected: { items: [6, 7, 8, 9, 10], page: 2, pageSize: 5, totalPages: 2, hasNext: false, hasPrev: true } },
      { args: [[1, 2, 3], 0, 2], expected: { items: [1, 2], page: 1, pageSize: 2, totalPages: 2, hasNext: true, hasPrev: false } },
      { args: [[1, 2, 3], 9, 2], expected: { items: [3], page: 2, pageSize: 2, totalPages: 2, hasNext: false, hasPrev: true } },
      { args: [[1, 2, 3, 4], 2, 2], expected: { items: [3, 4], page: 2, pageSize: 2, totalPages: 2, hasNext: false, hasPrev: true } },
      { args: [["a"], 1, 1], expected: { items: ["a"], page: 1, pageSize: 1, totalPages: 1, hasNext: false, hasPrev: false } },
      { args: [[1, 2, 3, 4, 5, 6, 7], 4, 2], expected: { items: [7], page: 4, pageSize: 2, totalPages: 4, hasNext: false, hasPrev: true } },
    ],
    reference: r`function paginate(items,page,pageSize){const totalPages=Math.ceil(items.length/pageSize);const p=Math.min(Math.max(page,1),Math.max(totalPages,1));const start=(p-1)*pageSize;return{items:items.slice(start,start+pageSize),page:p,pageSize,totalPages,hasNext:p<totalPages,hasPrev:p>1};}
module.exports={paginate};`,
  },
  {
    id: "fix-deep-merge",
    title: "Fix the deep merge",
    category: "agentic",
    fn: "deepMerge",
    spec: "deepMerge(a, b) returns a new object where b overrides a. Plain objects are merged recursively. Arrays and all other values (including null) from b replace the value in a. It must not mutate a or b.",
    starter: r`function deepMerge(a,b){for(const k of Object.keys(b)){if(typeof b[k]==='object'&&typeof a[k]==='object'){deepMerge(a[k],b[k]);}else{a[k]=b[k];}}return a;}
module.exports={deepMerge};`,
    visible: [
      { args: [{ a: 1, b: { c: 2 } }, { b: { d: 3 } }], expected: { a: 1, b: { c: 2, d: 3 } } },
      { args: [{ a: [1, 2] }, { a: [3] }], expected: { a: [3] } },
      { args: [{ a: 1 }, { a: null }], expected: { a: null } },
    ],
    hidden: [
      { args: [{}, {}], expected: {} },
      { args: [{ a: { b: { c: 1 } } }, { a: { b: { d: 2 } } }], expected: { a: { b: { c: 1, d: 2 } } } },
      { args: [{ a: 1 }, { b: 2 }], expected: { a: 1, b: 2 } },
      { args: [{ a: { x: 1 } }, { a: 5 }], expected: { a: 5 } },
      { args: [{ a: 5 }, { a: { x: 1 } }], expected: { a: { x: 1 } } },
      { args: [{ a: [1, 2, 3] }, { a: [] }], expected: { a: [] } },
      { args: [{ a: { b: null } }, { a: { b: { c: 1 } } }], expected: { a: { b: { c: 1 } } } },
      { args: [{ x: { y: 1 }, z: 2 }, { x: { y: 2 }, w: 3 }], expected: { x: { y: 2 }, z: 2, w: 3 } },
    ],
    reference: r`function isObj(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
function deepMerge(a,b){const out={...a};for(const k of Object.keys(b)){out[k]=isObj(b[k])&&isObj(a[k])?deepMerge(a[k],b[k]):b[k];}return out;}
module.exports={deepMerge};`,
  },
  {
    id: "fix-format-money",
    title: "Fix the money formatter",
    category: "agentic",
    fn: "formatMoney",
    spec: "formatMoney(cents) formats an amount in cents as a US dollar string with thousands separators: 123456 -> '$1,234.56', 5 -> '$0.05'. Negative amounts put the minus sign first: -500 -> '-$5.00'. Non-integer cents are rounded half away from zero to the nearest cent (2.5 -> '$0.03', -2.5 -> '-$0.03'). If the rounded amount is zero, never show a minus sign (-0.4 -> '$0.00').",
    starter: r`function formatMoney(cents){const dollars=cents/100;return '$'+dollars.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
module.exports={formatMoney};`,
    visible: [
      { args: [123456], expected: "$1,234.56" },
      { args: [-500], expected: "-$5.00" },
      { args: [0], expected: "$0.00" },
    ],
    hidden: [
      { args: [5], expected: "$0.05" },
      { args: [99], expected: "$0.99" },
      { args: [100], expected: "$1.00" },
      { args: [100000000], expected: "$1,000,000.00" },
      { args: [-123456789], expected: "-$1,234,567.89" },
      { args: [2.5], expected: "$0.03" },
      { args: [-2.5], expected: "-$0.03" },
      { args: [-0.4], expected: "$0.00" },
      { args: [1999], expected: "$19.99" },
      { args: [99999], expected: "$999.99" },
      { args: [-100], expected: "-$1.00" },
    ],
    reference: r`function formatMoney(cents){const n=Math.round(Math.abs(cents));const neg=cents<0&&n>0;const d=Math.floor(n/100);const c=String(n%100).padStart(2,'0');return (neg?'-':'')+'$'+String(d).replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+c;}
module.exports={formatMoney};`,
  },
  {
    id: "fix-csv-line",
    title: "Fix the CSV line parser",
    category: "agentic",
    fn: "parseCSVLine",
    spec: "parseCSVLine(line) splits one CSV line into an array of fields. Fields may be wrapped in double quotes; inside quotes, commas are literal and a doubled quote (\"\") is one literal quote. Spaces are preserved. Empty fields become empty strings; an empty line gives [''].",
    starter: r`function parseCSVLine(line){return line.split(',').map(f=>f.replace(/^"|"$/g,''));}
module.exports={parseCSVLine};`,
    visible: [
      { args: ["a,b,c"], expected: ["a", "b", "c"] },
      { args: ['"a,b",c'], expected: ["a,b", "c"] },
      { args: ['a,"say ""hi""",b'], expected: ["a", 'say "hi"', "b"] },
    ],
    hidden: [
      { args: [""], expected: [""] },
      { args: [","], expected: ["", ""] },
      { args: ['""'], expected: [""] },
      { args: ["a,,c"], expected: ["a", "", "c"] },
      { args: ['"",x'], expected: ["", "x"] },
      { args: ['" spaced ",y'], expected: [" spaced ", "y"] },
      { args: ['"a""b"'], expected: ['a"b'] },
      { args: ['x,"1,2,3",z'], expected: ["x", "1,2,3", "z"] },
      { args: ['"""",a'], expected: ['"', "a"] },
      { args: ["a,b,"], expected: ["a", "b", ""] },
    ],
    reference: r`function parseCSVLine(line){const out=[];let cur='';let q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(q){if(ch==='"'){if(line[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=ch;}else if(ch==='"')q=true;else if(ch===','){out.push(cur);cur='';}else cur+=ch;}out.push(cur);return out;}
module.exports={parseCSVLine};`,
  },
  {
    id: "fix-rate-limit",
    title: "Fix the sliding-window rate limiter",
    category: "agentic",
    fn: "allowRequests",
    spec: "allowRequests(timestamps, limit, windowMs) takes request times in milliseconds (sorted ascending) and returns an array of booleans. A request at time t is allowed if fewer than `limit` previously ALLOWED requests happened in the window (t - windowMs, t], meaning a request exactly windowMs earlier no longer counts. Denied requests do not count toward the limit.",
    starter: r`function allowRequests(ts,limit,windowMs){const res=[];const seen=[];for(const t of ts){const recent=seen.filter(x=>t-x<=windowMs);res.push(recent.length<limit);seen.push(t);}return res;}
module.exports={allowRequests};`,
    visible: [
      { args: [[0, 100, 200, 300], 2, 1000], expected: [true, true, false, false] },
      { args: [[0, 1000], 1, 1000], expected: [true, true] },
      { args: [[0, 500, 1500], 1, 1000], expected: [true, false, true] },
    ],
    hidden: [
      { args: [[], 3, 1000], expected: [] },
      { args: [[0, 0, 0], 2, 10], expected: [true, true, false] },
      { args: [[0, 10, 20, 30, 40], 2, 20], expected: [true, true, true, true, true] },
      { args: [[0, 1, 2, 3, 4, 5], 2, 3], expected: [true, true, false, true, true, false] },
      { args: [[5], 1, 100], expected: [true] },
      { args: [[0, 50, 100, 150, 200], 1, 100], expected: [true, false, true, false, true] },
      { args: [[0, 1, 2], 0, 10], expected: [false, false, false] },
    ],
    reference: r`function allowRequests(ts,limit,windowMs){const res=[];const allowed=[];for(const t of ts){const n=allowed.filter(x=>t-x<windowMs).length;if(n<limit){allowed.push(t);res.push(true);}else res.push(false);}return res;}
module.exports={allowRequests};`,
  },
];

export const taskById = (id: string) => TASKS.find((t) => t.id === id);
