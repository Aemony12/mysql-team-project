(() => {
  const main = document.querySelector(".container");
  const hasDashboardLink = Boolean(document.querySelector('.site-nav a[href="/dashboard"]'));
  const currentPath = window.location.pathname;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (main && hasDashboardLink && currentPath !== "/" && currentPath !== "/dashboard") {
    const existingBackLink = document.querySelector(".dashboard-back-link");
    if (!existingBackLink) {
      const backLink = document.createElement("a");
      backLink.href = "/dashboard";
      backLink.className = "dashboard-back-link";
      backLink.textContent = "Back to Overview";
      main.prepend(backLink);
    }
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

      tabBar.setAttribute("role", "tablist");
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
          const controlsId = `${group}-${button.getAttribute("data-tab-target")}`;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
          button.setAttribute("tabindex", isActive ? "0" : "-1");
          button.setAttribute("aria-controls", controlsId);
        });

        panels.forEach((panel) => {
          const panelId = `${group}-${panel.getAttribute("data-tab-panel")}`;
          const isActive = panel.getAttribute("data-tab-panel") === tabId;
          panel.id = panelId;
          panel.hidden = !isActive;
          panel.setAttribute("role", "tabpanel");
          panel.setAttribute("tabindex", "0");

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

      buttons.forEach((button, index) => {
        button.setAttribute("role", "tab");
        button.id = `${group}-tab-${index}`;
        button.addEventListener("click", () => setActiveTab(button.getAttribute("data-tab-target")));
        button.addEventListener("keydown", (event) => {
          const currentIndex = buttons.indexOf(button);
          if (event.key === "ArrowRight") {
            event.preventDefault();
            buttons[(currentIndex + 1) % buttons.length].focus();
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            buttons[(currentIndex - 1 + buttons.length) % buttons.length].focus();
          } else if (event.key === "Home") {
            event.preventDefault();
            buttons[0].focus();
          } else if (event.key === "End") {
            event.preventDefault();
            buttons[buttons.length - 1].focus();
          }
        });
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

  const initCarousel = () => {
    const carousels = document.querySelectorAll("[data-carousel]");

    carousels.forEach((carousel) => {
      const slides = Array.from(carousel.querySelectorAll("[data-carousel-slide]"));
      const status = carousel.querySelector("[data-carousel-status]");
      const prev = carousel.querySelector("[data-carousel-prev]");
      const next = carousel.querySelector("[data-carousel-next]");
      let activeIndex = slides.findIndex((slide) => !slide.hidden);

      if (!slides.length) {
        return;
      }

      if (activeIndex < 0) {
        activeIndex = 0;
      }

      const setActiveSlide = (nextIndex) => {
        activeIndex = (nextIndex + slides.length) % slides.length;

        slides.forEach((slide, index) => {
          const isActive = index === activeIndex;
          slide.hidden = !isActive;
          slide.classList.toggle("is-active", isActive);
        });

        if (status) {
          status.textContent = `${activeIndex + 1} of ${slides.length}`;
        }
      };

      prev?.addEventListener("click", () => setActiveSlide(activeIndex - 1));
      next?.addEventListener("click", () => setActiveSlide(activeIndex + 1));
      setActiveSlide(activeIndex);
    });
  };

  const initHeroVideoToggle = () => {
    const toggle = document.querySelector("[data-hero-video-toggle]");
    const video = document.querySelector(".video-hero video");

    if (!toggle || !video) {
      return;
    }

    const syncState = () => {
      const paused = video.paused;
      toggle.setAttribute("aria-pressed", paused ? "true" : "false");
      toggle.setAttribute("aria-label", paused ? "Play background video" : "Pause background video");
      toggle.textContent = paused ? "Play motion" : "Pause motion";
    };

    if (reduceMotion.matches) {
      video.pause();
    }

    toggle.addEventListener("click", () => {
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
      syncState();
    });

    syncState();
  };

  initTabs();
  initCarousel();
  initHeroVideoToggle();

  if (reduceMotion.matches) {
    document.documentElement.classList.add("reduce-motion");
    return;
  }

  const animated = document.querySelectorAll(
    ".media-hero, .feature-card, .dashboard-card, .dashboard-section, .notification-item, .auth-card, .card, .portal-banner, .product-card, .collection-card"
  );

  animated.forEach((element, index) => {
    element.classList.add("reveal");
    element.style.setProperty("--delay", `${Math.min(index * 35, 220)}ms`);
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
