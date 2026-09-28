/**
 * Tower messaging (demo / local) — lives under the profile picture on TOWER.
 *
 * Storage is behind a small MessageStore interface so a real API can replace
 * localStorage later without rewriting the UI. This is NOT a live multi-user
 * server — threads live in this browser only.
 *
 * localStorage key: cognation.commune.messages.v1 (demo)
 */
(function () {
  "use strict";

  var STORAGE_KEY = "cognation.commune.messages.v1";
  var CURRENT_USER_ID = "you";
  var CURRENT_USER_NAME = "You";

  /** Quick tapback set (iMessage-style). */
  var QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];
  /** Extra emojis behind the “+” picker. */
  var MORE_REACTIONS = ["🔥", "🎉", "💯", "🤗", "👀", "✨"];

  /* —— Seed data (first visit only) —— */
  var SEED = {
    version: 1,
    activeId: "c1",
    conversations: [
      {
        id: "c1",
        title: "Alex Rivera",
        participants: [
          { id: "you", name: "You" },
          { id: "alex", name: "Alex Rivera" }
        ],
        messages: [
          {
            id: "m1",
            senderId: "alex",
            senderName: "Alex Rivera",
            body: "Welcome to Tower messages — local demo thread.",
            createdAt: "2026-09-14T15:00:00.000Z"
          },
          {
            id: "m2",
            senderId: "you",
            senderName: "You",
            body: "Got it. Messages stay in this browser until a backend is connected.",
            createdAt: "2026-09-14T15:02:00.000Z"
          },
          {
            id: "m3",
            senderId: "alex",
            senderName: "Alex Rivera",
            body: "Try sending a reply below — it will appear here right away.",
            createdAt: "2026-09-14T15:03:30.000Z"
          }
        ]
      },
      {
        id: "c2",
        title: "Jordan Lee",
        participants: [
          { id: "you", name: "You" },
          { id: "jordan", name: "Jordan Lee" }
        ],
        messages: [
          {
            id: "m4",
            senderId: "jordan",
            senderName: "Jordan Lee",
            body: "Hey — checking in from the second demo conversation.",
            createdAt: "2026-09-13T18:20:00.000Z"
          },
          {
            id: "m5",
            senderId: "you",
            senderName: "You",
            body: "Looks good. We’ll swap localStorage for a real API later.",
            createdAt: "2026-09-13T18:25:00.000Z"
          }
        ]
      }
    ]
  };

  /* —— MessageStore: swap this object for API-backed methods later —— */
  var MessageStore = {
    load: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (!data || !Array.isArray(data.conversations)) return null;
        return data;
      } catch (err) {
        return null;
      }
    },

    save: function (data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
      } catch (err) {
        return false;
      }
    },

    /** Ensure seed exists; return working state. */
    getState: function () {
      var data = this.load();
      if (!data) {
        data = JSON.parse(JSON.stringify(SEED));
        this.save(data);
      }
      return data;
    },

    listConversations: function () {
      return this.getState().conversations.slice();
    },

    getConversation: function (id) {
      var state = this.getState();
      for (var i = 0; i < state.conversations.length; i++) {
        if (state.conversations[i].id === id) return state.conversations[i];
      }
      return null;
    },

    getActiveId: function () {
      return this.getState().activeId;
    },

    setActiveId: function (id) {
      var state = this.getState();
      state.activeId = id;
      this.save(state);
    },

    /**
     * Append a message. Replace with POST /api/messages later.
     * @returns {{ ok: boolean, message?: object, error?: string }}
     */
    sendMessage: function (conversationId, body) {
      var text = String(body || "").trim();
      if (!text) {
        return { ok: false, error: "Message cannot be empty." };
      }
      var state = this.getState();
      var conv = null;
      for (var i = 0; i < state.conversations.length; i++) {
        if (state.conversations[i].id === conversationId) {
          conv = state.conversations[i];
          break;
        }
      }
      if (!conv) {
        return { ok: false, error: "Conversation not found." };
      }
      var msg = {
        id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        senderId: CURRENT_USER_ID,
        senderName: CURRENT_USER_NAME,
        body: text,
        createdAt: new Date().toISOString(),
        reactions: {}
      };
      conv.messages.push(msg);
      state.activeId = conversationId;
      if (!this.save(state)) {
        return { ok: false, error: "Could not save to local storage." };
      }
      return { ok: true, message: msg };
    },

    /**
     * Toggle current user's reaction on a message.
     * reactions shape: { "❤️": ["you", "alex"], ... }
     * @returns {{ ok: boolean, message?: object, error?: string }}
     */
    toggleReaction: function (conversationId, messageId, emoji) {
      var face = String(emoji || "").trim();
      if (!face) {
        return { ok: false, error: "Emoji required." };
      }
      var state = this.getState();
      var conv = null;
      for (var i = 0; i < state.conversations.length; i++) {
        if (state.conversations[i].id === conversationId) {
          conv = state.conversations[i];
          break;
        }
      }
      if (!conv) {
        return { ok: false, error: "Conversation not found." };
      }
      var msg = null;
      for (var j = 0; j < conv.messages.length; j++) {
        if (conv.messages[j].id === messageId) {
          msg = conv.messages[j];
          break;
        }
      }
      if (!msg) {
        return { ok: false, error: "Message not found." };
      }
      if (!msg.reactions || typeof msg.reactions !== "object") {
        msg.reactions = {};
      }
      var list = Array.isArray(msg.reactions[face]) ? msg.reactions[face].slice() : [];
      var idx = list.indexOf(CURRENT_USER_ID);
      if (idx >= 0) {
        list.splice(idx, 1);
      } else {
        list.push(CURRENT_USER_ID);
      }
      if (list.length) {
        msg.reactions[face] = list;
      } else {
        delete msg.reactions[face];
      }
      if (!this.save(state)) {
        return { ok: false, error: "Could not save to local storage." };
      }
      return { ok: true, message: msg };
    }
  };

  window.CognationMessageStore = MessageStore;

  /* —— UI —— */
  function formatTime(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch (e) {
      return "";
    }
  }

  function previewText(conv) {
    if (!conv.messages || !conv.messages.length) return "No messages yet";
    var last = conv.messages[conv.messages.length - 1];
    var body = last.body || "";
    return body.length > 64 ? body.slice(0, 61) + "…" : body;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function initMessaging(root) {
    if (!root) return;

    var listEl = root.querySelector("[data-commune-list]");
    var threadTitle = root.querySelector("[data-commune-thread-title]");
    var messagesEl = root.querySelector("[data-commune-messages]");
    var form = root.querySelector("[data-commune-compose]");
    var input = root.querySelector("#commune-compose-input");
    var statusEl = root.querySelector("[data-commune-status]");
    var emptyEl = root.querySelector("[data-commune-empty]");

    if (!listEl || !messagesEl || !form || !input) return;

    var activeId = MessageStore.getActiveId();

    function setStatus(text, isError) {
      if (!statusEl) return;
      if (!text) {
        statusEl.hidden = true;
        statusEl.textContent = "";
        statusEl.classList.remove("is-error");
        return;
      }
      statusEl.hidden = false;
      statusEl.textContent = text;
      statusEl.classList.toggle("is-error", !!isError);
    }

    function renderList() {
      var conversations = MessageStore.listConversations();
      listEl.innerHTML = "";
      conversations.forEach(function (conv) {
        var li = document.createElement("li");
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "commune-conv-btn";
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", conv.id === activeId ? "true" : "false");
        btn.dataset.convId = conv.id;
        if (conv.id === activeId) {
          btn.classList.add("is-active");
        }
        btn.innerHTML =
          '<span class="commune-conv-name">' +
          escapeHtml(conv.title) +
          '</span>' +
          '<span class="commune-conv-preview">' +
          escapeHtml(previewText(conv)) +
          "</span>";
        btn.addEventListener("click", function () {
          selectConversation(conv.id);
        });
        li.appendChild(btn);
        listEl.appendChild(li);
      });
    }

    function closeOpenPickers(except) {
      var open = messagesEl.querySelectorAll(".commune-react-picker:not([hidden])");
      for (var i = 0; i < open.length; i++) {
        if (except && open[i] === except) continue;
        open[i].hidden = true;
        var trigger = open[i].previousElementSibling;
        if (trigger && trigger.classList.contains("commune-react-open")) {
          trigger.setAttribute("aria-expanded", "false");
        }
      }
    }

    function reactionEntries(reactions) {
      var entries = [];
      if (!reactions || typeof reactions !== "object") return entries;
      var keys = Object.keys(reactions);
      for (var i = 0; i < keys.length; i++) {
        var emoji = keys[i];
        var users = reactions[emoji];
        if (!Array.isArray(users) || !users.length) continue;
        entries.push({ emoji: emoji, users: users, count: users.length, mine: users.indexOf(CURRENT_USER_ID) >= 0 });
      }
      return entries;
    }

    function applyReaction(messageId, emoji) {
      var result = MessageStore.toggleReaction(activeId, messageId, emoji);
      if (!result.ok) {
        setStatus(result.error || "Could not save reaction.", true);
        return;
      }
      setStatus("");
      renderList();
      renderThread();
    }

    function buildPicker(msg) {
      var picker = document.createElement("div");
      picker.className = "commune-react-picker";
      picker.setAttribute("role", "toolbar");
      picker.setAttribute("aria-label", "React with emoji");
      picker.hidden = true;

      function addFaceBtn(face) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "commune-react-face";
        b.textContent = face;
        b.setAttribute("aria-label", "React with " + face);
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          applyReaction(msg.id, face);
        });
        picker.appendChild(b);
      }

      QUICK_REACTIONS.forEach(addFaceBtn);

      var moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "commune-react-face commune-react-more";
      moreBtn.textContent = "+";
      moreBtn.setAttribute("aria-label", "More reactions");
      moreBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        MORE_REACTIONS.forEach(addFaceBtn);
        moreBtn.remove();
      });
      picker.appendChild(moreBtn);

      return picker;
    }

    function buildReactionBar(msg, isIncoming) {
      var bar = document.createElement("div");
      bar.className = "commune-msg-reactbar";

      var pills = document.createElement("div");
      pills.className = "commune-msg-reactions";
      pills.setAttribute("aria-label", "Reactions");

      var entries = reactionEntries(msg.reactions);
      entries.forEach(function (entry) {
        var pill = document.createElement("button");
        pill.type = "button";
        pill.className = "commune-react-pill" + (entry.mine ? " is-mine" : "");
        pill.setAttribute(
          "aria-label",
          (entry.mine ? "Remove your " : "Add ") + entry.emoji + " reaction" + (entry.count > 1 ? ", " + entry.count + " total" : "")
        );
        pill.setAttribute("aria-pressed", entry.mine ? "true" : "false");
        pill.innerHTML =
          '<span class="commune-react-pill-emoji" aria-hidden="true">' +
          escapeHtml(entry.emoji) +
          "</span>" +
          (entry.count > 1
            ? '<span class="commune-react-pill-count">' + String(entry.count) + "</span>"
            : "");
        pill.addEventListener("click", function (e) {
          e.stopPropagation();
          applyReaction(msg.id, entry.emoji);
        });
        pills.appendChild(pill);
      });

      bar.appendChild(pills);

      /* Prefer react control on incoming; allow on own for demo simplicity. */
      var controls = document.createElement("div");
      controls.className = "commune-react-controls" + (isIncoming ? " is-incoming" : "");

      var openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "commune-react-open";
      openBtn.setAttribute("aria-label", "Add reaction");
      openBtn.setAttribute("aria-expanded", "false");
      openBtn.setAttribute("aria-haspopup", "true");
      openBtn.innerHTML = '<span aria-hidden="true">🙂</span>';

      var picker = buildPicker(msg);

      openBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var willOpen = picker.hidden;
        closeOpenPickers(picker);
        picker.hidden = !willOpen;
        openBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
      });

      controls.appendChild(openBtn);
      controls.appendChild(picker);
      bar.appendChild(controls);

      return bar;
    }

    function renderThread() {
      var conv = MessageStore.getConversation(activeId);
      messagesEl.innerHTML = "";

      if (!conv) {
        if (threadTitle) threadTitle.textContent = "Select a conversation";
        if (emptyEl) emptyEl.hidden = false;
        form.hidden = true;
        return;
      }

      if (threadTitle) threadTitle.textContent = conv.title;
      if (emptyEl) emptyEl.hidden = true;
      form.hidden = false;

      conv.messages.forEach(function (msg) {
        var isMine = msg.senderId === CURRENT_USER_ID;
        var article = document.createElement("article");
        article.className = "commune-msg" + (isMine ? " commune-msg--mine" : "");
        article.dataset.msgId = msg.id;
        article.setAttribute(
          "aria-label",
          (isMine ? "You" : msg.senderName) + " at " + formatTime(msg.createdAt)
        );
        article.innerHTML =
          '<header class="commune-msg-meta">' +
          '<span class="commune-msg-author">' +
          escapeHtml(isMine ? "You" : msg.senderName) +
          "</span>" +
          '<time datetime="' +
          escapeHtml(msg.createdAt) +
          '">' +
          escapeHtml(formatTime(msg.createdAt)) +
          "</time>" +
          "</header>" +
          '<p class="commune-msg-body">' +
          escapeHtml(msg.body) +
          "</p>";
        article.appendChild(buildReactionBar(msg, !isMine));
        messagesEl.appendChild(article);
      });

      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function selectConversation(id) {
      activeId = id;
      MessageStore.setActiveId(id);
      setStatus("");
      renderList();
      renderThread();
      input.focus();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var result = MessageStore.sendMessage(activeId, input.value);
      if (!result.ok) {
        setStatus(result.error || "Could not send.", true);
        return;
      }
      input.value = "";
      setStatus("Saved locally (demo). Messages sync when auth/backend is connected.");
      renderList();
      renderThread();
      input.focus();
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });

    document.addEventListener("click", function (e) {
      if (!root.contains(e.target)) {
        closeOpenPickers();
        return;
      }
      if (!e.target.closest(".commune-react-controls")) {
        closeOpenPickers();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeOpenPickers();
    });

    renderList();
    renderThread();
  }

  function boot() {
    var root = document.querySelector("[data-commune-messaging]");
    if (root) initMessaging(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
