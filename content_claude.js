(function () {
  const ROOT_ID = "exportchat-claude-root";
  const SLOT_ID = "exportchat-claude-slot";

  function getExistingRoot() {
    return document.getElementById(ROOT_ID);
  }

  function getExistingSlot() {
    return document.getElementById(SLOT_ID);
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function downloadText(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function getConversationTitle() {
    const title = (document.title || "").trim();
    if (!title || /^claude$/i.test(title)) {
      return "claude-conversation";
    }
    return title
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }

  function normalizeText(value) {
    return (value || "")
      .replace(/ /g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .trim();
  }

  function cloneAndClean(node) {
    const clone = node.cloneNode(true);
    const noiseSelectors = [
      "button",
      "[role='button']",
      "[role='menu']",
      "[role='toolbar']",
      "nav",
      "svg",
      "script",
      "style",
      "noscript",
      "textarea",
      "input",
      "select",
      ".ecc-overlay",
      ".ecc-modal",
      ".ecc-button",
      ".ecc-action-button",
      ".ecc-close-button",
      "[data-testid='wiggle-controls-actions']",
      "[data-testid='chat-input']"
    ];
    clone.querySelectorAll(noiseSelectors.join(",")).forEach(function (el) { el.remove(); });
    clone.querySelectorAll("[hidden], [aria-hidden='true']").forEach(function (el) { el.remove(); });
    return clone;
  }

  function extractMessages() {
    const messages = [];
    const allTurns = [];

    // User messages: confirmed selector from DevTools
    const userNodes = Array.from(document.querySelectorAll('[data-testid="user-message"]'));
    userNodes.forEach(function (node) {
      allTurns.push({ role: "user", node: node });
    });

    // Assistant messages: paragraphs have class "font-claude-response-body".
    // Group by their nearest "standard-markdown" ancestor so each turn is one entry.
    const seen = new Set();
    const responseParagraphs = Array.from(
      document.querySelectorAll('p[class*="font-claude-response-body"], p[class*="font-claude-response"]')
    );

    responseParagraphs.forEach(function (p) {
      const container =
        p.closest('div[class*="standard-markdown"]') ||
        p.closest('div[class*="grid-cols-1"]') ||
        p.parentElement;

      if (container && !seen.has(container)) {
        seen.add(container);
        allTurns.push({ role: "assistant", node: container });
      }
    });

    // Sort by document order
    allTurns.sort(function (a, b) {
      const pos = a.node.compareDocumentPosition(b.node);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    allTurns.forEach(function (turn, index) {
      const cleaned = cloneAndClean(turn.node);
      const text = normalizeText(cleaned.innerText || cleaned.textContent || "");
      if (!text) return;
      messages.push({ index: index + 1, role: turn.role, text: text });
    });

    return messages;
  }

  function buildMarkdown(messages, title, url) {
    const lines = [];
    lines.push("# " + title);
    lines.push("");
    lines.push("Source: Claude");
    lines.push("URL: " + url);
    lines.push("Exported: " + new Date().toISOString());
    lines.push("");
    messages.forEach(function (message) {
      lines.push(message.role === "user" ? "## User" : "## Assistant");
      lines.push("");
      lines.push(message.text || "");
      lines.push("");
    });
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function buildText(messages, title, url) {
    const lines = [];
    lines.push(title);
    lines.push("");
    lines.push("Source: Claude");
    lines.push("URL: " + url);
    lines.push("Exported: " + new Date().toISOString());
    lines.push("");
    messages.forEach(function (message) {
      lines.push(message.role === "user" ? "USER" : "ASSISTANT");
      lines.push(message.text || "");
      lines.push("");
    });
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function handleJsonExport() {
    const messages = extractMessages();
    if (!messages.length) { alert("No messages found on the page."); return; }
    const payload = {
      exportedAt: new Date().toISOString(),
      source: "claude",
      title: getConversationTitle(),
      url: window.location.href,
      messageCount: messages.length,
      messages: messages
    };
    downloadJson(getConversationTitle() + ".json", payload);
  }

  function handleMarkdownExport() {
    const messages = extractMessages();
    if (!messages.length) { alert("No messages found on the page."); return; }
    const title = getConversationTitle();
    downloadText(title + ".md", buildMarkdown(messages, title, window.location.href), "text/markdown;charset=utf-8");
  }

  function handleTextExport() {
    const messages = extractMessages();
    if (!messages.length) { alert("No messages found on the page."); return; }
    const title = getConversationTitle();
    downloadText(title + ".txt", buildText(messages, title, window.location.href), "text/plain;charset=utf-8");
  }

  function createRoot() {
    const root = document.createElement("div");
    root.id = ROOT_ID;

    const button = document.createElement("button");
    button.className = "ecc-button";
    button.type = "button";
    button.textContent = "Save Chat";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");

    const overlay = document.createElement("div");
    overlay.className = "ecc-overlay";
    overlay.hidden = true;

    const modal = document.createElement("div");
    modal.className = "ecc-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "ecc-modal-title");

    const header = document.createElement("div");
    header.className = "ecc-modal-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h2");
    title.id = "ecc-modal-title";
    title.className = "ecc-modal-title";
    title.textContent = "Export chat";
    const subtitle = document.createElement("p");
    subtitle.className = "ecc-modal-subtitle";
    subtitle.textContent = "Choose export format";
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "ecc-close-button";
    closeButton.textContent = "Close";
    closeButton.setAttribute("aria-label", "Close export dialog");

    header.appendChild(titleWrap);
    header.appendChild(closeButton);

    const actions = document.createElement("div");
    actions.className = "ecc-modal-actions";

    function openModal() {
      overlay.hidden = false;
      button.setAttribute("aria-expanded", "true");
      document.body.classList.add("ecc-modal-open");
    }

    function closeModal() {
      overlay.hidden = true;
      button.setAttribute("aria-expanded", "false");
      document.body.classList.remove("ecc-modal-open");
    }

    function createActionButton(label, onClick) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "ecc-action-button";
      action.textContent = label;
      action.addEventListener("click", function (event) {
        event.stopPropagation();
        closeModal();
        onClick();
      });
      return action;
    }

    actions.appendChild(createActionButton("Save as JSON", handleJsonExport));
    actions.appendChild(createActionButton("Save as Markdown", handleMarkdownExport));
    actions.appendChild(createActionButton("Save as TXT", handleTextExport));

    modal.appendChild(header);
    modal.appendChild(actions);
    overlay.appendChild(modal);

    button.addEventListener("click", function (event) {
      event.stopPropagation();
      overlay.hidden ? openModal() : closeModal();
    });

    closeButton.addEventListener("click", function (event) {
      event.stopPropagation();
      closeModal();
    });

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closeModal();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !overlay.hidden) closeModal();
    });

    root.appendChild(button);
    root.appendChild(overlay);
    return root;
  }

  // Find the Share button or the wiggle-controls-actions container in Claude's header
  function findShareButton() {
    return (
      document.querySelector('[data-testid="wiggle-controls-actions"]') ||
      document.querySelector('button[aria-label="Share"]') ||
      document.querySelector('header button:last-of-type')
    );
  }

  function findHeaderContainer() {
    const shareBtn = findShareButton();
    if (!shareBtn) return null;
    return (
      shareBtn.closest('[data-testid="wiggle-controls-actions"]') ||
      shareBtn.closest("div.flex.items-center") ||
      shareBtn.closest("header")
    );
  }

  function ensureSlot(container) {
    let slot = getExistingSlot();
    if (slot && slot.parentElement !== container) {
      slot.remove();
      slot = null;
    }
    if (!slot) {
      slot = document.createElement("div");
      slot.id = SLOT_ID;
      slot.className = "ecc-slot";
    }
    if (!slot.parentElement) {
      container.appendChild(slot);
    }
    return slot;
  }

  function mountNative() {
    const container = findHeaderContainer();
    if (!container) return false;

    const slot = ensureSlot(container);
    let root = getExistingRoot();
    if (!root) root = createRoot();
    root.classList.remove("ecc-fallback");
    if (root.parentElement !== slot) slot.appendChild(root);
    return true;
  }

  function mountFallback() {
    let root = getExistingRoot();
    if (!root) root = createRoot();
    root.classList.add("ecc-fallback");
    if (root.parentElement !== document.body) document.body.appendChild(root);
  }

  function reconcileMount() {
    // Only run on Claude chat pages
    if (!location.pathname.startsWith("/chat/")) return;
    if (!mountNative()) mountFallback();
  }

  function init() {
    reconcileMount();

    const observer = new MutationObserver(function () {
      reconcileMount();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener("popstate", reconcileMount);
    window.addEventListener("hashchange", reconcileMount);

    let lastUrl = location.href;
    window.setInterval(function () {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        reconcileMount();
      }
    }, 1000);
  }

  init();
})();
