(() => {
  const main = document.querySelector(".container");
  const hasDashboardLink = Boolean(document.querySelector('.site-nav a[href="/dashboard"]'));
  const currentPath = window.location.pathname;

  if (main && hasDashboardLink && currentPath !== "/" && currentPath !== "/dashboard") {
    const backLink = document.createElement("a");
    backLink.href = "/dashboard";
    backLink.className = "dashboard-back-link";
    backLink.textContent = "← Back to Dashboard";
    main.prepend(backLink);
  }

  const initTabs = () => {
    const tabBars = document.querySelectorAll(".tab-bar[data-tab-group]");

    tabBars.forEach((tabBar) => {
      const group = tabBar.getAttribute("data-tab-group");
      const buttons = Array.from(tabBar.querySelectorAll("[data-tab-target]"));
      const panels = Array.from(document.querySelectorAll(`.tab-panel[data-tab-group="${group}"]`));

      if (!buttons.length || !panels.length) {
        return;
      }

      const storageKey = `tabs:${window.location.pathname}:${group}`;
      const params = new URLSearchParams(window.location.search);
      const requestedTab = params.get("view");
      const defaultTab = buttons[0].getAttribute("data-tab-target");
      const initialTab = buttons.some((button) => button.getAttribute("data-tab-target") === requestedTab)
        ? requestedTab
        : window.localStorage.getItem(storageKey) || defaultTab;

      const setActiveTab = (tabId, updateUrl = true, animate = true) => {
        buttons.forEach((button) => {
          const isActive = button.getAttribute("data-tab-target") === tabId;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
        });

        panels.forEach((panel) => {
          const isActive = panel.getAttribute("data-tab-panel") === tabId;
          panel.hidden = !isActive;

          if (!isActive) {
            panel.classList.remove("is-visible");
            return;
          }

          if (!animate || reduceMotion.matches) {
            panel.classList.add("is-visible");
            return;
          }

          panel.classList.remove("is-visible");
          void panel.offsetWidth;
          requestAnimationFrame(() => panel.classList.add("is-visible"));
        });

        window.localStorage.setItem(storageKey, tabId);

        if (updateUrl) {
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.set("view", tabId);
          window.history.replaceState({}, "", nextUrl);
        }
      };

      buttons.forEach((button) => {
        button.setAttribute("role", "tab");
        button.addEventListener("click", () => setActiveTab(button.getAttribute("data-tab-target")));
      });

      panels.forEach((panel) => {
        panel.querySelectorAll('form[method="get"], form:not([method])').forEach((form) => {
          form.addEventListener("submit", () => {
            let hiddenInput = form.querySelector('input[name="view"]');
            if (!hiddenInput) {
              hiddenInput = document.createElement("input");
              hiddenInput.type = "hidden";
              hiddenInput.name = "view";
              form.append(hiddenInput);
            }

            const activeButton = tabBar.querySelector(".tab-button.is-active");
            hiddenInput.value = activeButton?.getAttribute("data-tab-target") || defaultTab;
          });
        });
      });

      setActiveTab(initialTab, false, false);
    });
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  initTabs();

  if (reduceMotion.matches) {
    document.documentElement.classList.add("reduce-motion");
    return;
  }

  const animated = document.querySelectorAll(
    ".hero-copy, .hero-visual, .overview-card, .dashboard-card, .dashboard-section, .notification-item, .auth-card"
  );

  animated.forEach((element, index) => {
    if (element.classList.contains("hero-copy") || element.classList.contains("hero-visual")) {
      element.classList.add("is-visible");
      return;
    }

    element.classList.add("reveal");
    element.style.setProperty("--delay", `${Math.min(index * 35, 180)}ms`);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: "0px 0px -8% 0px",
  });

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
})();
