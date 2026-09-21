let category = "all",
  archived = false,
  selected = null;
const $ = (s) => document.querySelector(s),
  list = $("#list"),
  dialog = $("#detail");
function days(date) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return Math.round(
    (Date.parse(date + "T00:00:00+09:00") -
      Date.parse(today + "T00:00:00+09:00")) /
      86400000,
  );
}
function ended(r) {
  return r.deadlineAt
    ? Date.now() > Date.parse(r.deadlineAt)
    : !!r.deadline && days(r.deadline) < 0;
}
function status(r) {
  if (!r.deadline) return { text: r.always ? "상시" : "", urgent: false };
  const d = days(r.deadline);
  return {
    text: ended(r) ? "마감" : d === 0 ? "D-Day" : "D-" + d,
    urgent: d >= 0 && d <= 14,
  };
}
function badge(r) {
  const s = status(r);
  return `<span class="badge ${s.urgent ? "urgent" : ""}">${s.text}</span>`;
}
function render() {
  const q = $("#search").value.toLowerCase().trim(),
    reg = $("#region").value,
    open = $("#openOnly").checked;
  const shown = records
    .filter(
      (r) =>
        r.verified &&
        (r.deadline || r.always === true) &&
        (category === "all" || r.cat === category) &&
        [r.name, r.org, r.desc, r.type, r.note]
          .join(" ")
          .toLowerCase()
          .includes(q) &&
        (reg === "all" || r.region === reg) &&
        (!archived ? !ended(r) : ended(r)) &&
        (!open || r.always || (r.deadline && !ended(r))),
    )
    .sort((a, b) => {
      if (!a.deadline) return b.deadline ? 1 : 0;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  $("#count").textContent = shown.length;
  $("#empty").hidden = shown.length > 0;
  $("#empty h2").textContent =
    category === "work" && !archived
      ? "이번 조사에서 게시 기준을 충족한 공고가 없습니다."
      : archived
        ? "지난 공고가 없습니다."
        : "조건에 맞는 항목이 없어요.";
  $("#empty p").textContent =
    category === "work"
      ? "신청·활동 일정과 참여 조건이 확인된 공고를 반영합니다."
      : "검색어나 필터를 바꿔보세요.";
  list.innerHTML = shown
    .map(
      (r) =>
        `<article class="resource ${selected === r.id ? "selected" : ""}" data-category="${r.cat}"><div><span class="category">${r.type}</span><div class="title-line"><h2>${r.name}</h2>${badge(r)}</div><p>${r.org}</p><p>${r.note}</p></div><div class="cell">${r.deadline ? r.deadline.replaceAll("-", ".") : r.always ? "상시" : "미기재"}<small>${r.deadline ? r.deadlineLabel || "신청 마감" : "이용·신청 일정"}</small></div><div class="cell">${r.duration}<small>${r.cat === "cert" ? "학습 기간" : "활동·이용 기간"}</small></div><div class="cell">${r.cost}<small>${r.region}</small></div><button class="details" data-id="${r.id}" aria-label="${r.name} 상세 보기">상세 보기 ↗</button></article>`,
    )
    .join("");
}
function group(title, rows) {
  return `<h3>${title}</h3><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
}
function link(label, url) {
  return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗<small>${url}</small></a>`;
}
function show(id) {
  const r = records.find((x) => x.id === id);
  if (!r || !r.verified || (!r.deadline && !r.always)) return;
  selected = id;
  render();
  let html = `<span class="category">${r.type} · ${r.imported ? "이전 조사에서 추가" : "신규 소개"}</span>${badge(r)}<h2 id="detail-title">${r.name}</h2><p class="lead">${r.desc}</p>`;
  html += r.sections.map(([title, rows]) => group(title, rows)).join("");
  html += `<h3>${r.cat === "data" ? "Link" : "공식 링크·근거"}</h3><div class="source-links">${link(r.cta, r.url)}${r.links.map(([label, url]) => link(label, url)).join("")}</div><p class="meta">최초 소개 ${r.firstFeatured} · 마지막 확인 ${r.lastVerified} KST</p>`;
  $("#detail-content").innerHTML = html;
  $("#official").href = r.url;
  $("#official").textContent = r.cta + " ↗";
  dialog.showModal();
  $("#detail-content").scrollTop = 0;
}
list.addEventListener("click", (e) => {
  const b = e.target.closest("[data-id]");
  if (b) show(Number(b.dataset.id));
});
$("#close").onclick = () => dialog.close();
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const b = dialog.getBoundingClientRect();
    if (e.clientX < b.left || e.clientX > b.right) dialog.close();
  }
});
dialog.addEventListener("close", () => {
  const previous = selected;
  selected = null;
  render();
  document.querySelector(`[data-id="${previous}"]`)?.focus();
});
document.querySelectorAll("[data-cat]").forEach(
  (b) =>
    (b.onclick = () => {
      category = b.dataset.cat;
      document
        .querySelectorAll("[data-cat]")
        .forEach((x) => x.setAttribute("aria-pressed", x === b));
      render();
    }),
);
$("#search").addEventListener("input", render);
$("#region").onchange = render;
$("#openOnly").onchange = render;
$("#archive").onclick = () => {
  archived = !archived;
  $("#archive").setAttribute("aria-pressed", archived);
  $("#archive").textContent = archived
    ? "현재 목록으로 돌아가기"
    : "지난 공고 보기";
  render();
};
$("#reset").onclick = () => {
  category = "all";
  archived = false;
  $("#search").value = "";
  $("#region").value = "all";
  $("#openOnly").checked = false;
  $("#archive").textContent = "지난 공고 보기";
  $("#archive").setAttribute("aria-pressed", "false");
  document
    .querySelectorAll("[data-cat]")
    .forEach((x) => x.setAttribute("aria-pressed", x.dataset.cat === "all"));
  render();
};
render();

document.querySelectorAll("[data-cat]").forEach((b) => {
  b.querySelector("span").textContent = records.filter(
    (r) => r.verified && (b.dataset.cat === "all" || r.cat === b.dataset.cat),
  ).length;
});
