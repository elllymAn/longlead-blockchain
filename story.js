"use strict";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const progress = document.querySelector(".read-progress span");
const cover = document.querySelector(".hero-visual");
const hero = document.querySelector(".hero");
const sections = Array.from(document.querySelectorAll("[data-spy]"));
const railLinks = document.querySelectorAll(".rail a");
const headerLinks = document.querySelectorAll(".masthead nav a");
let scrollPending = false;
let previousSection = "";

function highlight(links, id) {
  for (const link of links) {
    if (link.hash === id) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

function updateScroll() {
  scrollPending = false;
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, window.scrollY / distance) : 0})`;
  if (!reducedMotion.matches && window.scrollY < hero.offsetHeight) {
    cover.style.setProperty("--cover-shift", `${Math.min(window.scrollY * 0.09, 35)}px`);
  }
  const threshold = Math.min(230, window.innerHeight * 0.34);
  let section;
  for (const candidate of sections) {
    if (candidate.getBoundingClientRect().top > threshold) break;
    section = candidate;
  }
  const id = section ? `#${section.id}` : "";
  if (id !== previousSection) {
    previousSection = id;
    highlight(railLinks, id);
    highlight(headerLinks, section ? `#${section.closest(".chapter").id}` : "");
  }
}

function queueScrollUpdate() {
  if (scrollPending) return;
  scrollPending = true;
  requestAnimationFrame(updateScroll);
}

window.addEventListener("scroll", queueScrollUpdate, { passive: true });
window.addEventListener("resize", queueScrollUpdate);
window.addEventListener("load", queueScrollUpdate);
document.addEventListener("toggle", queueScrollUpdate, true);
updateScroll();

for (const photo of document.querySelectorAll("[data-photo]")) {
  function showPhotoFallback() {
    photo.hidden = true;
    photo.nextElementSibling.hidden = false;
    queueScrollUpdate();
  }
  photo.addEventListener("error", showPhotoFallback, { once: true });
  if (photo.complete && photo.naturalWidth === 0) showPhotoFallback();
}

if ("IntersectionObserver" in window && typeof Element.prototype.animate === "function") {
  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal.unobserve(entry.target);
      if (reducedMotion.matches) continue;
      entry.target.animate(
        [{ opacity: 0.32, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 510, easing: "cubic-bezier(.16, 1, .3, 1)" }
      );
      for (const bar of entry.target.querySelectorAll(".chart-fill")) {
        bar.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
          duration: 670, easing: "cubic-bezier(.16, 1, .3, 1)"
        });
      }
    }
  }, { threshold: 0.09 });
  document.querySelectorAll("[data-reveal]").forEach((element) => reveal.observe(element));
}

const chainForm = document.querySelector("#chain-form");
const chainInput = document.querySelector("#payload");
const chainResult = document.querySelector("#chain-result");
const resetButton = document.querySelector("#chain-reset");
const verifyButton = chainForm.querySelector("button[type=submit]");
const originalRecord = chainInput.defaultValue;
const block2 = document.querySelector("#editable-block");
const block3 = document.querySelector("#referencing-block");
const brokenLink = document.querySelector("#broken-link");
const encoder = new TextEncoder();
let chainRequest = 0;

async function blockHash(number, previousHash, message) {
  const data = encoder.encode(JSON.stringify([number, previousHash, message]));
  const digest = new Uint8Array(await window.crypto.subtle.digest("SHA-256", data));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function showHash(name, hash) {
  const node = document.querySelector(`[data-hash="${name}"]`);
  node.textContent = `${hash.slice(0, 12)}…`;
  node.title = hash;
}

async function verifyChain() {
  const request = ++chainRequest;
  const record = chainInput.value;
  try {
    const firstHash = await blockHash(1, "0".repeat(64), "Выпуск пропуска № 24");
    const storedHash = await blockHash(2, firstHash, originalRecord);
    const editedHash = await blockHash(2, firstHash, record);
    if (request !== chainRequest) return;
    showHash("first", firstHash);
    showHash("edited", editedHash);
    showHash("stored", storedHash);
    const invalid = editedHash !== storedHash;
    for (const element of [block2, block3, brokenLink]) element.classList.toggle("is-broken", invalid);
    chainResult.classList.toggle("is-error", invalid);
    chainResult.textContent = invalid
      ? "Связь нарушена. Хеш блока 02 отличается от ссылки, сохранённой в блоке 03."
      : "Связь цела. Хеш блока 02 совпадает со ссылкой в блоке 03.";
  } catch {
    if (request !== chainRequest) return;
    chainResult.textContent = "В этом браузере хеширование недоступно. Откройте страницу в современном браузере по HTTPS или через localhost.";
    verifyButton.disabled = true;
    resetButton.disabled = true;
  }
}

chainForm.addEventListener("submit", (event) => {
  event.preventDefault();
  verifyChain();
});
resetButton.addEventListener("click", () => {
  chainInput.value = originalRecord;
  verifyChain();
});
chainInput.addEventListener("input", () => {
  ++chainRequest;
  chainResult.classList.remove("is-error");
  chainResult.textContent = "Нажмите «Проверить», чтобы пересчитать хеш записи.";
});
verifyChain();

for (const group of document.querySelectorAll("[data-tabs]")) {
  const tabs = Array.from(group.querySelectorAll("[role=tab]"));
  function selectTab(index, focus = false) {
    tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === index;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")).hidden = !active;
    });
    if (focus) tabs[index].focus();
    queueScrollUpdate();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(index));
    tab.addEventListener("keydown", (event) => {
      const next = {
        ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        Home: 0,
        End: tabs.length - 1
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectTab(next, true);
    });
  });
  selectTab(0);
}

const estimates = {
  forecast: "Сентябрьский прогноз вышел до окончания 2025 года. Его использовали для планирования, пока годовые данные ещё уточнялись.",
  revised: "Уточнённая оценка выше прогноза на 12,8 млрд долл. Обе цифры относятся к 2025 году, поэтому разница показывает пересмотр оценки."
};
const estimateButtons = document.querySelectorAll("[data-view]");
for (const button of estimateButtons) {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    for (const control of estimateButtons) control.setAttribute("aria-pressed", String(control === button));
    for (const row of document.querySelectorAll("[data-estimate]")) row.classList.toggle("is-selected", row.dataset.estimate === view);
    document.querySelector("#market-note").textContent = estimates[view];
  });
}

const range = document.querySelector("#rtt");
const rttOutput = document.querySelector("#rtt-value");
const packet = document.querySelector(".packet");
const sendPacket = document.querySelector("#send-packet");
const matchResult = document.querySelector("#match-result");
let packetAnimation;
let packetRun = 0;

range.addEventListener("input", () => {
  rttOutput.value = `${range.value} мс`;
  ++packetRun;
  packetAnimation?.cancel();
  matchResult.textContent = "Отправьте команду с новой задержкой.";
});
sendPacket.addEventListener("click", async () => {
  const run = ++packetRun;
  packetAnimation?.cancel();
  const rtt = Number(range.value);
  if (!reducedMotion.matches && typeof packet.animate === "function") {
    matchResult.textContent = "Команда отправлена. Клиент уже может показать прогноз.";
    packetAnimation = packet.animate([
      { left: "0%", opacity: 1 },
      { left: "calc(100% - 10px)", opacity: 1, offset: 0.5 },
      { left: "0%", opacity: 1 }
    ], { duration: rtt * 8, easing: "linear" });
    try {
      await packetAnimation.finished;
    } catch {
      return;
    }
  }
  if (run === packetRun) matchResult.textContent = `Сервер получил команду через ${rtt / 2} мс. Ответ вернулся через ${rtt} мс после отправки.`;
});

const scenarios = {
  jump: {
    question: "Два игрока видят один матч. Нужно быстро проверить положение персонажа после прыжка.",
    correct: "server",
    explanation: "Игровой сервер рассчитывает общее состояние матча. Клиент может показать прогноз до подтверждения."
  },
  trade: {
    question: "Две независимые площадки должны проверить, кто теперь владеет коллекционным пропуском после сделки.",
    correct: "ledger",
    explanation: "Общий реестр позволяет площадкам независимо проверить переход владельца при согласованных правилах."
  },
  save: {
    question: "Один оператор хранит закрытые настройки и прогресс пользователя для входа с другого устройства.",
    correct: "database",
    explanation: "База данных сервиса даёт оператору доступ, резервирование и возможность исправить или удалить сохранение."
  }
};
const scenarioButtons = document.querySelectorAll("[data-scenario]");
const answerButtons = document.querySelectorAll("[data-answer]");
const scenarioQuestion = document.querySelector("#scenario-question");
const scenarioResult = document.querySelector("#scenario-result");
let activeScenario = scenarios.jump;

for (const button of scenarioButtons) {
  button.addEventListener("click", () => {
    activeScenario = scenarios[button.dataset.scenario];
    for (const item of scenarioButtons) item.setAttribute("aria-pressed", String(item === button));
    for (const answer of answerButtons) {
      answer.classList.remove("is-chosen", "is-wrong");
      answer.setAttribute("aria-pressed", "false");
    }
    scenarioQuestion.textContent = activeScenario.question;
    scenarioResult.textContent = "Выберите вариант, чтобы увидеть объяснение.";
    scenarioResult.classList.remove("is-error");
  });
}
for (const button of answerButtons) {
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    const correct = button.dataset.answer === activeScenario.correct;
    for (const item of answerButtons) {
      item.classList.toggle("is-chosen", item === button && correct);
      item.classList.toggle("is-wrong", item === button && !correct);
      item.setAttribute("aria-pressed", String(item === button));
    }
    scenarioResult.classList.toggle("is-error", !correct);
    scenarioResult.textContent = `${correct ? "Подходит." : "В этом сценарии лучше другой контур."} ${activeScenario.explanation}`;
  });
}
