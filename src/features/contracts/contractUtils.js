export const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const renderTemplate = (html, values = {}) =>
  String(html ?? "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? escapeHtml(values[key]) : ""
  );

export const extractPlaceholders = (html) => {
  const set = new Set();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(String(html || "")))) set.add(m[1]);
  return [...set];
};

export const insertVariableAtCursor = (quillRef, key) => {
  const editor = quillRef?.current?.getEditor?.();
  if (!editor) return;
  const token = `{{${key}}}`;
  const range = editor.getSelection(true);
  const index = range ? range.index : editor.getLength();
  editor.insertText(index, token, "user");
  editor.setSelection(index + token.length, 0);
};

export const isDateKey = (k) => /(^|_)date$/.test(String(k || ""));

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const formatPrettyDate = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${ordinal(date.getDate())} ${months[date.getMonth()]}, ${date.getFullYear()}`;
};

export const quillModules = {
  toolbar: [
    [{ font: [] }, { size: ["small", false, "large", "huge"] }],
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ script: "sub" }, { script: "super" }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    [{ align: [] }],
    ["blockquote", "code-block"],
    ["link", "image"],
    ["clean"],
  ],
  clipboard: { matchVisual: false },
};

export const quillFormats = [
  "font", "size", "header", "bold", "italic", "underline", "strike",
  "color", "background", "script", "list", "bullet", "indent", "align",
  "blockquote", "code-block", "link", "image",
];

export const CONTRACT_STATUSES = ["Sent", "Accepted", "Declined"];

export const statusTone = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "accepted": return "success";
    case "declined": return "danger";
    default: return "info";
  }
};
