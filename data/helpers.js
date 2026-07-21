export const circled = ["①", "②", "③", "④", "⑤"];

export function comboChoices(groups) {
  return groups.map((members, index) => ({
    number: index + 1,
    label: members.join(", "),
    members,
  }));
}

export function directChoices(labels) {
  return labels.map((label, index) => ({ number: index + 1, label }));
}

export function argumentChoices(items) {
  return items.map((item, index) => ({
    number: index + 1,
    label: item.label,
    diagram: {
      type: "argument",
      roots: item.roots,
      levels: item.levels,
      ariaLabel: item.ariaLabel ?? item.label,
    },
  }));
}

export function section(title, text, options = {}) {
  return { title, text, ...options };
}

export function table(title, headers, rows, options = {}) {
  return { title, table: { headers, rows }, ...options };
}

export function flow(items) {
  return { type: "flow", items: items.map(([kicker, title]) => ({ kicker, title })) };
}

export function visualTable(headers, rows, highlight = []) {
  return { type: "table", headers, rows, highlight };
}

export function equations(items) {
  return { type: "equation", items: items.map(([label, value]) => ({ label, value })) };
}
