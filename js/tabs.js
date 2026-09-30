/**
 * Accessible tabs (WAI-ARIA APG pattern).
 * Labels/ids live in HTML — WELL · PLAN · DESK · PAGES · CAREER · TRANSIT · HOME (jobs panel ids/hash unchanged).
 */
(function () {
  "use strict";

  function initTabs(root) {
    var tablist = root.querySelector('[role="tablist"]');
    if (!tablist) return;

    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    var panels = tabs
      .map(function (tab) {
        var id = tab.getAttribute("aria-controls");
        return id ? document.getElementById(id) : null;
      })
      .filter(Boolean);

    if (!tabs.length || tabs.length !== panels.length) return;

    function activate(index, focusTab) {
      tabs.forEach(function (tab, i) {
        var selected = i === index;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.tabIndex = selected ? 0 : -1;
        panels[i].hidden = !selected;
      });
      if (focusTab) tabs[index].focus();
      var activeTab = tabs[index];
      if (
        activeTab &&
        activeTab.id === "tab-well" &&
        window.CognationWellAuth &&
        typeof window.CognationWellAuth.onWellPanelShown === "function"
      ) {
        window.CognationWellAuth.onWellPanelShown();
      }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        activate(i, false);
      });

      tab.addEventListener("keydown", function (e) {
        var next = null;
        switch (e.key) {
          case "ArrowRight":
            next = (i + 1) % tabs.length;
            break;
          case "ArrowLeft":
            next = (i - 1 + tabs.length) % tabs.length;
            break;
          case "Home":
            next = 0;
            break;
          case "End":
            next = tabs.length - 1;
            break;
          case "Enter":
          case " ":
            e.preventDefault();
            activate(i, false);
            return;
          default:
            return;
        }
        e.preventDefault();
        activate(next, true);
      });
    });

    var initial = tabs.findIndex(function (t) {
      return t.getAttribute("aria-selected") === "true";
    });
    activate(initial >= 0 ? initial : 0, false);
  }

  document.querySelectorAll("[data-tabs]").forEach(initTabs);
})();
