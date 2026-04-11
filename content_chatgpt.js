(function () {
  const ROOT_ID = "exportchat-chatgpt-root";
  const BUTTON_ID = "exportchat-chatgpt-button";
  const SLOT_ID = "exportchat-chatgpt-slot";

  function getExistingRoot() {
    return document.getElementById(ROOT_ID);
  }

  function getExistingSlot() {
    return document.getElementById(SLOT_ID);
  }

  function downloadJson(filename, data) {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function downloadText(filename, content, mimeType) {
    const blob = new Blob(
      [content],
      { type: mimeType || "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function getConversationTitle() {
    const title = (document.title || "").trim();

    if (!title || /^chatgpt$/i.test(title)) {
      return "chatgpt-conversation";
    }

    return title
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }

  function extractMessages() {
  const messageNodes = Array.from(
    document.querySelectorAll("[data-message-author-role]")
  );

  function normalizeText(value) {
    return (value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .trim();
  }

  function cloneAndClean(node) {
    const clone = node.cloneNode(true);

    const noiseSelectors = [
      "button",
      "[role=\"button\"]",
      "[role=\"menu\"]",
      "[role=\"toolbar\"]",
      "nav",
      "svg",
      "script",
      "style",
      "noscript",
      "textarea",
      "input",
      "select",
      ".ecg-overlay",
      ".ecg-modal",
      ".ecg-button",
      ".ecg-action-button",
      ".ecg-close-button",
      "[aria-label*=\"Copy\"]",
      "[aria-label*=\"Like\"]",
      "[aria-label*=\"Dislike\"]",
      "[aria-label*=\"Good response\"]",
      "[aria-label*=\"Bad response\"]",
      "[aria-label*=\"Share\"]",
      "[aria-label*=\"Rewrite\"]",
      "[aria-label*=\"Edit message\"]",
      "[data-testid*=\"toolbar\"]",
      "[data-testid*=\"actions\"]",
      "[data-testid*=\"composer\"]"
    ];

    clone.querySelectorAll(noiseSelectors.join(",")).forEach(function (element) {
      element.remove();
    });

    clone.querySelectorAll("[hidden], [aria-hidden=\"true\"]").forEach(function (element) {
      element.remove();
    });

    return clone;
  }

  function getBestContentNode(node, role) {
    if (role === "assistant") {
      return (
        node.querySelector(".markdown") ||
        node.querySelector("[class*=\"markdown\"]") ||
        node.querySelector("[data-message-content]") ||
        node
      );
    }

    return (
      node.querySelector("[class*=\"whitespace-pre-wrap\"]") ||
      node.querySelector("[class*=\"break-words\"]") ||
      node.querySelector("[data-message-content]") ||
      node
    );
  }

  const messages = messageNodes
    .map(function (node) {
      const role = node.getAttribute("data-message-author-role") || "unknown";
      const contentNode = getBestContentNode(node, role);
      const cleanedNode = cloneAndClean(contentNode);
      const text = normalizeText(cleanedNode.innerText || cleanedNode.textContent || "");

      if (!text) {
        return null;
      }

      return {
        role: role,
        text: text
      };
    })
    .filter(Boolean)
    .map(function (message, index) {
      return {
        index: index + 1,
        role: message.role,
        text: message.text
      };
    });

  return messages;
}

  function buildMarkdown(messages, title, url) {
    const lines = [];

    lines.push("# " + title);
    lines.push("");
    lines.push("Source: ChatGPT");
    lines.push("URL: " + url);
    lines.push("Exported: " + new Date().toISOString());
    lines.push("");

    messages.forEach(function (message) {
      const heading = message.role === "user" ? "## User" : "## Assistant";
      lines.push(heading);
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
    lines.push("Source: ChatGPT");
    lines.push("URL: " + url);
    lines.push("Exported: " + new Date().toISOString());
    lines.push("");

    messages.forEach(function (message) {
      const heading = message.role === "user" ? "USER" : "ASSISTANT";
      lines.push(heading);
      lines.push(message.text || "");
      lines.push("");
    });

    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function handleJsonExport() {
    const messages = extractMessages();

    if (!messages.length) {
      alert("Ingen beskeder fundet på siden.");
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      source: "chatgpt",
      title: getConversationTitle(),
      url: window.location.href,
      messageCount: messages.length,
      messages: messages
    };

    downloadJson(getConversationTitle() + ".json", payload);
  }

  function handleMarkdownExport() {
    const messages = extractMessages();

    if (!messages.length) {
      alert("Ingen beskeder fundet på siden.");
      return;
    }

    const title = getConversationTitle();
    const markdown = buildMarkdown(messages, title, window.location.href);

    downloadText(title + ".md", markdown, "text/markdown;charset=utf-8");
  }

  function handleTextExport() {
    const messages = extractMessages();

    if (!messages.length) {
      alert("Ingen beskeder fundet på siden.");
      return;
    }

    const title = getConversationTitle();
    const text = buildText(messages, title, window.location.href);

    downloadText(title + ".txt", text, "text/plain;charset=utf-8");
  }

  function createMenuItem(label, onClick, closeMenu) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ecg-menu-item";
    item.textContent = label;
    item.setAttribute("role", "menuitem");

    item.addEventListener("click", function (event) {
      event.stopPropagation();
      closeMenu();
      onClick();
    });

    return item;
  }

function createRoot() {
  const root = document.createElement("div");
  root.id = ROOT_ID;

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.className = "ecg-button";
  button.type = "button";
  button.textContent = "Save Chat";
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-expanded", "false");

  const overlay = document.createElement("div");
  overlay.className = "ecg-overlay";
  overlay.hidden = true;

  const modal = document.createElement("div");
  modal.className = "ecg-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "ecg-modal-title");

  const header = document.createElement("div");
  header.className = "ecg-modal-header";

  const titleWrap = document.createElement("div");

  const title = document.createElement("h2");
  title.id = "ecg-modal-title";
  title.className = "ecg-modal-title";
  title.textContent = "Export chat";

  const subtitle = document.createElement("p");
  subtitle.className = "ecg-modal-subtitle";
  subtitle.textContent = "Choose export format";

  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "ecg-close-button";
  closeButton.textContent = "Close";
  closeButton.setAttribute("aria-label", "Close export dialog");

  header.appendChild(titleWrap);
  header.appendChild(closeButton);

  const actions = document.createElement("div");
  actions.className = "ecg-modal-actions";

  function createActionButton(label, onClick) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "ecg-action-button";
    action.textContent = label;

    action.addEventListener("click", function (event) {
      event.stopPropagation();
      closeModal();
      onClick();
    });

    return action;
  }

  actions.appendChild(
    createActionButton("Save as JSON", handleJsonExport)
  );

  actions.appendChild(
    createActionButton("Save as Markdown", handleMarkdownExport)
  );

  actions.appendChild(
    createActionButton("Save as TXT", handleTextExport)
  );

  modal.appendChild(header);
  modal.appendChild(actions);
  overlay.appendChild(modal);

  function openModal() {
    overlay.hidden = false;
    button.setAttribute("aria-expanded", "true");
    document.body.classList.add("ecg-modal-open");
  }

  function closeModal() {
    overlay.hidden = true;
    button.setAttribute("aria-expanded", "false");
    document.body.classList.remove("ecg-modal-open");
  }

  button.addEventListener("click", function (event) {
    event.stopPropagation();

    if (overlay.hidden) {
      openModal();
      return;
    }

    closeModal();
  });

  closeButton.addEventListener("click", function (event) {
    event.stopPropagation();
    closeModal();
  });

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !overlay.hidden) {
      closeModal();
    }
  });

  root.appendChild(button);
  root.appendChild(overlay);

  return root;
}

function findHeaderAnchor() {
  return (
    document.querySelector('button[data-testid="model-switcher-dropdown-button"]') ||
    document.querySelector('header button[aria-haspopup="menu"]') ||
    document.querySelector('header [id^="radix-"][aria-expanded]') ||
    document.querySelector('header .group.touch\\:min-h-10') ||
    document.querySelector('header .group.min-h-10') ||
    document.querySelector('header .group.cursor-pointer') ||
    document.querySelector('header .font-semibold') ||
    document.querySelector('header .font-normal.text-lg')
  );
}

function findHeaderContainer() {
  const anchor = findHeaderAnchor();

  if (!anchor) {
    return null;
  }

  return (
    anchor.closest("div.flex.items-center.gap-2") ||
    anchor.closest("div.flex.items-center") ||
    anchor.closest("header")
  );
}

  function ensureSlot(container, anchor) {
    let slot = getExistingSlot();

    if (slot && slot.parentElement !== container) {
      slot.remove();
      slot = null;
    }

    if (!slot) {
      slot = document.createElement("div");
      slot.id = SLOT_ID;
      slot.className = "ecg-slot";
    }

    if (!slot.parentElement) {
      if (anchor && anchor.nextSibling) {
        container.insertBefore(slot, anchor.nextSibling);
      } else {
        container.appendChild(slot);
      }
    }

    return slot;
  }

  function mountNative() {
    const anchor = findHeaderAnchor();
    const container = findHeaderContainer();

    if (!anchor || !container) {
      return false;
    }

    const slot = ensureSlot(container, anchor);
    let root = getExistingRoot();

    if (!root) {
      root = createRoot();
    }

    root.classList.remove("ecg-fallback");

    if (root.parentElement !== slot) {
      slot.appendChild(root);
    }

    return true;
  }

  function mountFallback() {
    let root = getExistingRoot();

    if (!root) {
      root = createRoot();
    }

    root.classList.add("ecg-fallback");

    if (root.parentElement !== document.body) {
      document.body.appendChild(root);
    }
  }

  function reconcileMount() {
    const mountedNatively = mountNative();

    if (mountedNatively) {
      return;
    }

    mountFallback();
  }

  function init() {
    reconcileMount();

    const observer = new MutationObserver(function () {
      reconcileMount();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

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