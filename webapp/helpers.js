const ART_STYLES = [
  "Abstract", "Baroque", "Contemporary", "Cubism", "Expressionism",
  "Impressionism", "Mannerism", "Modern", "Neoclassicism", "Pop Art", "Post-Impressionism",
  "Realism", "Renaissance", "Romanticism", "Surrealism", "Symbolism"
];

const ART_TYPES = [
  "Painting", "Sculpture", "Photograph", "Drawing", "Print",
  "Installation", "Video Art", "Textile", "Ceramic", "Digital Art"
];

const ART_PERIODS = [
  "Early Renaissance (1300-1499)", "High Renaissance (1500-1527)", "Mannerism (1520-1600)",
  "Baroque (1600-1750)", "Rococo (1700-1775)", "Neoclassicism (1750-1850)", "Romanticism (1800-1850)",
  "Realism (1840-1880)", "Impressionism (1860-1890)", "Post-Impressionism (1886-1905)", "Modernism (1890-1970)",
  "Expressionism (1905-1920)", "Cubism (1907-1914)", "Surrealism (1920s-1950s)", "Abstract Expressionism (1940s-1950s)",
  "Pop Art (1950s-1960s)", "Contemporary (1970-present)"
];

const PLACEHOLDER_ASSETS = {
  artwork: "/images/artwork-placeholder.svg",
  exhibit: "/images/exhibit-placeholder.svg",
  giftshop: "/images/giftshop-placeholder.svg",
  cafe: "/images/cafe-placeholder.svg",
  visit: "/images/visit-placeholder.svg",
};

const ARTWORK_ASSETS = {
  allegory: "/images/allegory.jpg",
  "the rose garden": "/images/the-rose-garden.jpg",
  "the farnese hours": "/images/the-farnese-hours.jpg",
  "st peter martyr: reburial": "/images/st-peter-martyr.jpg",
  "female head type 7": "/images/female-type-7.jpg",
  deposition: "/images/deposition-empoli.jpg",
  "deposition|sculpture": "/images/deposition-egell.jpg.jpg",
  "leonore discovers dagger": "/images/leonore-discovers-dagger.jpg",
  "la roubine du roi": "/images/la-roubine-du-roi.jpg",
  "the birth of the last muse": "/images/the-birth-of-the-last-muse.jpg",
};

const EXHIBITION_ASSETS = {
  "spring collection 2026": "/images/spring-collection.jpg",
  "summer showcase 2026": "/images/summer-showcase.jpg",
  "spring exhibition opening gala": "/images/spring-exhibition-opening-gala.jpg",
  "art history: renaissance": "/images/art-history-renaissance.jpg",
};

const ROLE_ASSETS = {
  public: { imagePath: "/images/spring-collection.jpg", alt: "Museum gallery interior." },
  user: { imagePath: "/images/spring-collection.jpg", alt: "Visitors moving through a museum gallery." },
  admissions: { imagePath: "/images/summer-showcase.jpg", alt: "Museum entrance and admissions area." },
  giftshop: { imagePath: "/images/the-birth-of-the-last-muse.jpg", alt: "Museum retail display inspired by collection artwork." },
  cafe: { imagePath: "/images/the-rose-garden.jpg", alt: "Museum cafe atmosphere inspired by the collection." },
  curator: { imagePath: "/images/the-farnese-hours.jpg", alt: "Historic illuminated artwork from the museum collection." },
  supervisor: { imagePath: "/images/spring-exhibition-opening-gala.jpg", alt: "Museum event and operations overview." },
  employee: { imagePath: "/images/summer-showcase.jpg", alt: "Museum staff workspace." },
};

const GIFTSHOP_ASSETS = {
  apparel: "/images/giftshop-placeholder.svg",
  books: "/images/giftshop-placeholder.svg",
  souvenirs: "/images/giftshop-placeholder.svg",
  collectibles: "/images/giftshop-placeholder.svg",
  toys: "/images/giftshop-placeholder.svg",
  merchandise: "/images/giftshop-placeholder.svg",
};

const CAFE_ASSETS = {
  food: "/images/cafe-placeholder.svg",
  drink: "/images/cafe-placeholder.svg",
  dessert: "/images/cafe-placeholder.svg",
  snack: "/images/cafe-placeholder.svg",
  other: "/images/cafe-placeholder.svg",
};

function requireLogin(req, res, next) {
  if (!req.session.user) {
    setFlash(req, "Please log in first.");
    return res.redirect("/login");
  }

  next();
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function setFlash(req, message) {
  req.session.flash = message;
}

function getFlashType(message) {
  const value = String(message || "").toLowerCase();
  if (value.includes("error") || value.includes("invalid") || value.includes("cannot") || value.includes("inactive")) {
    return "error";
  }
  if (value.includes("warning") || value.includes("expires") || value.includes("full")) {
    return "warning";
  }
  if (value.includes("completed") || value.includes("success") || value.includes("added") || value.includes("updated")) {
    return "success";
  }
  return "info";
}

function renderFlash(req) {
  if (!req.session.flash) {
    return "";
  }

  const message = req.session.flash;
  const type = getFlashType(message);
  const html = `<div class="flash flash--${type}" role="status" aria-live="polite">${escapeHtml(message)}</div>`;
  delete req.session.flash;
  return html;
}

function getRoleLabel(user) {
  if (!user?.role) {
    return "";
  }

  const roleLabels = {
    user: "Member",
    admissions: "Admissions Desk",
    giftshop: "Gift Shop",
    cafe: "Cafe",
    curator: "Curator",
    supervisor: "Supervisor",
    employee: "Museum Staff",
  };

  return roleLabels[user.role] || user.role.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function getRoleTheme(user) {
  const themeByRole = {
    user: "member",
    admissions: "admissions",
    giftshop: "giftshop",
    cafe: "cafe",
    curator: "curator",
    supervisor: "supervisor",
    employee: "staff",
  };

  return themeByRole[user?.role] || "public";
}

function getRoleSummary(user) {
  const summaryByRole = {
    user: "Tickets, tours, events, and member visit planning.",
    admissions: "Front desk sales, memberships, and visitor support.",
    giftshop: "Retail orders, merchandise inventory, and point-of-sale work.",
    cafe: "Cafe orders, menu inventory, and food service operations.",
    curator: "Collections, exhibitions, conservation, and artwork records.",
    supervisor: "Alerts, reports, staffing, inventory, and operational oversight.",
    employee: "Daily museum operations across admissions, retail, and cafe service.",
  };

  return summaryByRole[user?.role] || "";
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeLookup(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getArtworkAsset(title, type = "") {
  const key = normalizeLookup(title);
  const typeKey = normalizeLookup(type);
  const typeMatch = ARTWORK_ASSETS[`${key}|${typeKey}`];

  return {
    imagePath: typeMatch || ARTWORK_ASSETS[key] || PLACEHOLDER_ASSETS.artwork,
    alt: title ? `${title} artwork image.` : "Artwork image pending.",
    isPlaceholder: !(typeMatch || ARTWORK_ASSETS[key]),
  };
}

function getExhibitionAsset(name) {
  const key = normalizeLookup(name);
  return {
    imagePath: EXHIBITION_ASSETS[key] || PLACEHOLDER_ASSETS.exhibit,
    alt: name ? `${name} exhibition image.` : "Exhibition image pending.",
    isPlaceholder: !EXHIBITION_ASSETS[key],
  };
}

function getRoleAsset(role) {
  return ROLE_ASSETS[role] || ROLE_ASSETS.public;
}

function getGiftShopAsset(name, category) {
  const categoryKey = normalizeLookup(category);
  return {
    imagePath: GIFTSHOP_ASSETS[categoryKey] || PLACEHOLDER_ASSETS.giftshop,
    alt: name ? `${name} gift shop item image.` : "Gift shop item placeholder image.",
  };
}

function getCafeAsset(name, type) {
  const typeKey = normalizeLookup(type);
  return {
    imagePath: CAFE_ASSETS[typeKey] || PLACEHOLDER_ASSETS.cafe,
    alt: name ? `${name} cafe item image.` : "Cafe item placeholder image.",
  };
}

function buildNavTabs(user) {
  if (!user) {
    return [
      { href: "/", label: "Home" },
      { href: "/member-login", label: "Visit" },
      { href: "/member-login", label: "Art" },
      { href: "/member-login", label: "Events" },
      { href: "/member-signup", label: "Membership" },
      { href: "/staff-login", label: "Staff" },
    ];
  }

  switch (user.role) {
    case "user":
      return [
        { href: "/dashboard", label: "Overview" },
        { href: "/purchase-ticket", label: "Visit" },
        { href: "/tour-register", label: "Tours" },
        { href: "/event-register", label: "Events" },
        { href: "/queries", label: "Art" },
      ];
    case "admissions":
      return [
        { href: "/dashboard", label: "Overview" },
        { href: "/sell-ticket", label: "Tickets" },
        { href: "/add-membership", label: "Memberships" },
        { href: "/ticket-sales", label: "Sales" },
      ];
    case "giftshop":
      return [
        { href: "/dashboard", label: "Overview" },
        { href: "/gift-order", label: "Shop Floor" },
        { href: "/add-sale", label: "Sales" },
        { href: "/add-item", label: "Inventory" },
      ];
    case "cafe":
      return [
        { href: "/dashboard", label: "Overview" },
        { href: "/order", label: "Menu" },
        { href: "/add-food-sale", label: "Orders" },
        { href: "/add-food", label: "Inventory" },
      ];
    case "curator":
      return [
        { href: "/dashboard", label: "Overview" },
        { href: "/queries", label: "Collection" },
        { href: "/add-artwork", label: "Artwork" },
        { href: "/add-exhibition", label: "Exhibitions" },
      ];
    case "supervisor":
      return [
        { href: "/dashboard", label: "Overview" },
        { href: "/reports", label: "Reports" },
        { href: "/tours", label: "Tours" },
        { href: "/add-event", label: "Events" },
        { href: "/queries", label: "Collection" },
      ];
    default:
      return [
        { href: "/dashboard", label: "Overview" },
        { href: "/sell-ticket", label: "Tickets" },
        { href: "/gift-order", label: "Shop" },
        { href: "/order", label: "Cafe" },
      ];
  }
}

function renderNavTabs(tabs, currentPath) {
  if (!tabs?.length) {
    return "";
  }

  return `
    <nav class="site-nav" aria-label="Primary">
      ${tabs.map((tab) => {
        const isActive = currentPath && (currentPath === tab.href || (tab.match && tab.match.some((path) => currentPath.startsWith(path))));
        return `<a class="${isActive ? "is-active" : ""}" href="${escapeHtml(tab.href)}" ${isActive ? 'aria-current="page"' : ""}>${escapeHtml(tab.label)}</a>`;
      }).join("")}
    </nav>
  `;
}

function renderBreadcrumbs(breadcrumbs) {
  if (!breadcrumbs?.length) {
    return "";
  }

  return `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      ${breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        if (isLast || !crumb.href) {
          return `<span aria-current="page">${escapeHtml(crumb.label)}</span>`;
        }
        return `<a href="${escapeHtml(crumb.href)}">${escapeHtml(crumb.label)}</a>`;
      }).join('<span class="breadcrumbs__divider">/</span>')}
    </nav>
  `;
}

function renderHero(hero) {
  if (!hero) {
    return "";
  }

  const asset = hero.imagePath || hero.videoPath ? hero : getRoleAsset("public");
  const media = hero.videoPath
    ? `
      <div class="media-hero__media video-hero">
        <video autoplay muted loop playsinline poster="${escapeHtml(hero.posterPath || hero.imagePath || PLACEHOLDER_ASSETS.visit)}">
          <source src="${escapeHtml(hero.videoPath)}" type="video/mp4">
        </video>
        <button class="hero-media-toggle" type="button" data-hero-video-toggle aria-pressed="false" aria-label="Pause background video">Pause motion</button>
      </div>
    `
    : `
      <div class="media-hero__media">
        <img src="${escapeHtml(asset.imagePath || PLACEHOLDER_ASSETS.visit)}" alt="${escapeHtml(asset.alt || hero.title || "Museum image.")}">
      </div>
    `;

  const details = hero.details?.length
    ? `
      <div class="media-hero__details">
        ${hero.details.map((item) => `
          <div class="hero-panel-item">
            <p class="eyebrow">${escapeHtml(item.label)}</p>
            <h2>${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.description)}</p>
          </div>
        `).join("")}
      </div>
    `
    : "";

  const actions = hero.actions?.length
    ? `<div class="button-row">${hero.actions.map((action) => `<a class="button ${action.secondary ? "button-secondary" : ""}" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`).join("")}</div>`
    : "";

  return `
    <section class="media-hero reveal ${hero.compact ? "media-hero--compact" : ""}">
      ${media}
      <div class="media-hero__overlay"></div>
      <div class="media-hero__content">
        ${hero.eyebrow ? `<p class="eyebrow">${escapeHtml(hero.eyebrow)}</p>` : ""}
        <h1>${escapeHtml(hero.title)}</h1>
        ${hero.description ? `<p class="hero-lead">${escapeHtml(hero.description)}</p>` : ""}
        ${actions}
      </div>
      ${details}
    </section>
  `;
}

function renderFeatureCards(cards) {
  if (!cards?.length) {
    return "";
  }

  return `
    <section class="feature-grid reveal">
      ${cards.map((card) => `
        <article class="feature-card">
          <div class="feature-card__media">
            <img src="${escapeHtml(card.imagePath || PLACEHOLDER_ASSETS.exhibit)}" alt="${escapeHtml(card.alt || card.title)}">
          </div>
          <div class="feature-card__body">
            ${card.eyebrow ? `<p class="eyebrow">${escapeHtml(card.eyebrow)}</p>` : ""}
            <h2>${escapeHtml(card.title)}</h2>
            <p>${escapeHtml(card.description)}</p>
            ${card.href ? `<a class="feature-card__link" href="${escapeHtml(card.href)}">${escapeHtml(card.linkLabel || "Learn More")}</a>` : ""}
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

function renderCarousel({ title, description = "", slides = [] }) {
  if (!slides.length) {
    return "";
  }

  return `
    <section class="card carousel-shell reveal" aria-label="${escapeHtml(title)}">
      <div class="section-header">
        <div>
          <p class="eyebrow">Featured Pathways</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        ${description ? `<p class="carousel-shell__lead">${escapeHtml(description)}</p>` : ""}
      </div>
      <div class="carousel" data-carousel>
        <div class="carousel__viewport">
          ${slides.map((slide, index) => `
            <article class="carousel__slide ${index === 0 ? "is-active" : ""}" data-carousel-slide ${index === 0 ? "" : "hidden"}>
              <div class="carousel__media">
                <img src="${escapeHtml(slide.imagePath || PLACEHOLDER_ASSETS.visit)}" alt="${escapeHtml(slide.alt || slide.title)}">
              </div>
              <div class="carousel__body">
                ${slide.eyebrow ? `<p class="eyebrow">${escapeHtml(slide.eyebrow)}</p>` : ""}
                <h3>${escapeHtml(slide.title)}</h3>
                <p>${escapeHtml(slide.description || "")}</p>
                ${slide.href ? `<a class="button" href="${escapeHtml(slide.href)}">${escapeHtml(slide.linkLabel || "Open")}</a>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
        <div class="carousel__controls">
          <button class="button button-secondary button-small" type="button" data-carousel-prev aria-label="Show previous slide">Previous</button>
          <div class="carousel__status" data-carousel-status aria-live="polite">1 of ${slides.length}</div>
          <button class="button button-secondary button-small" type="button" data-carousel-next aria-label="Show next slide">Next</button>
        </div>
      </div>
    </section>
  `;
}

function renderAlertContent(alertContent) {
  if (!alertContent) {
    return "";
  }

  const items = Array.isArray(alertContent) ? alertContent : [alertContent];
  return items.map((alert) => `
    <section class="alert-panel alert-panel--${escapeHtml(alert.type || "info")}" role="${alert.type === "error" ? "alert" : "status"}">
      ${alert.title ? `<h2>${escapeHtml(alert.title)}</h2>` : ""}
      ${alert.message ? `<p>${escapeHtml(alert.message)}</p>` : ""}
    </section>
  `).join("");
}

function renderPage({
  title,
  user,
  content,
  currentPath = "",
  navTabs,
  hero,
  featureCards,
  pageTheme = "",
  alertContent,
  breadcrumbs,
  mainClass = "",
}) {
  const roleLabel = user?.role ? escapeHtml(getRoleLabel(user)) : "";
  const roleTheme = escapeHtml(getRoleTheme(user));
  const roleSummary = user?.role ? escapeHtml(getRoleSummary(user)) : "";
  const activeTabs = navTabs || buildNavTabs(user);
  const roleAsset = getRoleAsset(user?.role || "public");
  const bodyClasses = [`theme-${roleTheme}`];

  if (pageTheme) {
    bodyClasses.push(`page-${escapeHtml(pageTheme)}`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="${bodyClasses.join(" ")}">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header">
    <div class="utility-bar">
      <p>Today's Museum Experience</p>
      <div class="utility-bar__links">
        <a href="/">Home</a>
        ${user ? `<a href="/dashboard">${roleLabel || "Dashboard"}</a>` : '<a href="/member-login">Tickets</a>'}
        ${!user ? '<a href="/member-signup">Membership</a>' : ""}
      </div>
    </div>
    <div class="site-header__inner">
      <a class="brand" href="/">
        <span class="brand-mark">MFAH</span>
        <span class="brand-copy">
          <span class="brand-eyebrow">The Museum of Fine Arts, Houston</span>
          <span class="brand-title">Museum Operations Portal</span>
        </span>
      </a>
      <div class="site-header__actions">
        ${renderNavTabs(activeTabs, currentPath)}
        <div class="session-meta">
          ${user ? `<span class="session-chip">${roleLabel}</span>` : '<a class="session-chip" href="/staff-login">Staff Login</a>'}
          ${user ? '<form method="post" action="/logout" class="inline-form"><button class="link-button" type="submit">Log Out</button></form>' : '<a class="link-button" href="/member-login">Member Login</a>'}
        </div>
      </div>
    </div>
  </header>
  <main id="main-content" class="container ${escapeHtml(mainClass)}">
    ${renderBreadcrumbs(breadcrumbs)}
    ${hero ? renderHero(hero) : user ? `
      <section class="portal-banner portal-banner--${roleTheme} reveal">
        <div class="portal-banner__media">
          <img src="${escapeHtml(roleAsset.imagePath)}" alt="${escapeHtml(roleAsset.alt)}">
        </div>
        <div class="portal-banner__content">
          <div>
            <p class="eyebrow">Current Workspace</p>
            <h1>${roleLabel}</h1>
            <p>${roleSummary}</p>
          </div>
          <a class="button button-secondary button-small" href="/dashboard">Return to Overview</a>
        </div>
      </section>
    ` : ""}
    ${renderAlertContent(alertContent)}
    ${renderFeatureCards(featureCards)}
    ${content}
  </main>
  <script src="/app.js"></script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateInput(value) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
}

function formatDisplayDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString();
}

function getPageNumber(rawValue) {
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function paginateRows(rows, page, pageSize = 10) {
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  return {
    items: rows.slice(startIndex, startIndex + pageSize),
    currentPage,
    totalPages,
    totalRows,
    pageSize,
  };
}

function renderPager(req, pageParam, pagination, anchorId, basePath = req.path) {
  if (pagination.totalRows <= pagination.pageSize) {
    return "";
  }

  const buildHref = (page) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query || {})) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      params.set(key, String(value));
    }

    params.set(pageParam, String(page));
    return `${basePath}?${params.toString()}#${anchorId}`;
  };

  return `
    <div class="pagination">
      <span class="pagination__summary">Page ${pagination.currentPage} of ${pagination.totalPages} | ${pagination.totalRows} results</span>
      <div class="button-row pagination__actions">
        ${pagination.currentPage > 1 ? `<a class="button button-secondary button-small" href="${escapeHtml(buildHref(pagination.currentPage - 1))}">Previous</a>` : ""}
        ${pagination.currentPage < pagination.totalPages ? `<a class="button button-secondary button-small" href="${escapeHtml(buildHref(pagination.currentPage + 1))}">Next</a>` : ""}
      </div>
    </div>
  `;
}

function isStaff(user) {
  return isEmployee(user) || isSupervisor(user) || isCurator(user);
}

function isSupervisor(user) {
  return user && user.role === "supervisor";
}

function isEmployee(user) {
  return user && ["employee", "admissions", "giftshop", "cafe", "janitor",
    "security", "maintenance"].includes(user.role);
}

function isMember(user) {
  return user && user.role === "user";
}

function isCurator(user) {
  return user && user.role === "curator";
}

function isAdmissions(user) {
  return user && user.role === "admissions";
}

function isGiftShop(user) {
  return user && user.role === "giftshop";
}

function isCafe(user) {
  return user && user.role === "cafe";
}

function allowRoles(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.session.user.role)) {
      setFlash(req, "Access denied.");
      return res.redirect("/dashboard");
    }
    next();
  };
}

async function logTriggerViolation(pool, req, message) {
  try {
    await pool.query(
      `INSERT INTO trigger_violation_log (route_path, user_email, message) VALUES (?, ?, ?)`,
      [req.path, req.session?.user?.email || null, message]
    );
  } catch (_) {}
}

module.exports = {
  ART_STYLES,
  ART_TYPES,
  ART_PERIODS,
  asyncHandler,
  escapeHtml,
  formatDateInput,
  formatDisplayDate,
  getPageNumber,
  isEmployee,
  isMember,
  isStaff,
  isSupervisor,
  paginateRows,
  renderFlash,
  renderPager,
  renderPage,
  getRoleLabel,
  getRoleTheme,
  getRoleSummary,
  getArtworkAsset,
  getExhibitionAsset,
  getRoleAsset,
  getGiftShopAsset,
  getCafeAsset,
  renderCarousel,
  requireLogin,
  setFlash,
  allowRoles,
  isAdmissions,
  isGiftShop,
  isCafe,
  isCurator,
  logTriggerViolation,
  slugify,
  PLACEHOLDER_ASSETS,
};
