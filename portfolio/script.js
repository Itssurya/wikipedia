// Smooth scrolling for sidebar links with slight offset consideration
document.querySelectorAll(".sidebar-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("#")) return;

    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();

    // If target is a collapsible section, close others (except biography) and open this one
    if (target.classList.contains("collapsible-section")) {
      const allSections = document.querySelectorAll(".collapsible-section");
      allSections.forEach((section) => {
        if (section._setExpanded) {
          const keepOpen =
            section.id === "biography" || section.id === target.id;
          section._setExpanded(keepOpen);
        }
      });
    }

    const rect = target.getBoundingClientRect();
    const absoluteElementTop = rect.top + window.scrollY;
    const offset = 70; // approximate header height

    window.scrollTo({
      top: absoluteElementTop - offset,
      behavior: "smooth",
    });
  });
});

// In-page search similar to browser find (highlight + count, without breaking layout)
const articleContent = document.getElementById("article-content");
const searchForm = document.getElementById("page-search-form");
const searchInput = document.getElementById("page-search-input");
const searchCount = document.getElementById("page-search-count");
const searchPrev = document.getElementById("page-search-prev");
const searchNext = document.getElementById("page-search-next");

let searchMatches = [];
let currentMatchIndex = -1;

const escapeRegExp = (string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Remove existing highlights but keep structure and event listeners intact
const clearSearchHighlights = () => {
  if (!articleContent) return;

  const marks = articleContent.querySelectorAll("mark.search-highlight");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(
      document.createTextNode(mark.textContent || ""),
      mark
    );
    parent.normalize(); // merge adjacent text nodes
  });

  if (searchCount) {
    searchCount.textContent = "";
  }

  searchMatches = [];
  currentMatchIndex = -1;
};

const highlightMatches = (root, regex) => {
  let count = 0;
  const foundMarks = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    },
    false
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((node) => {
    const text = node.nodeValue;
    const matches = text.match(regex);
    if (!matches) return;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;

    text.replace(regex, (match, offset) => {
      if (offset > lastIndex) {
        frag.appendChild(
          document.createTextNode(text.slice(lastIndex, offset))
        );
      }

      const mark = document.createElement("mark");
      mark.className = "search-highlight";
      mark.textContent = match;
      frag.appendChild(mark);

      foundMarks.push(mark);

      lastIndex = offset + match.length;
      count += 1;
      return match;
    });

    if (lastIndex < text.length) {
      frag.appendChild(
        document.createTextNode(text.slice(lastIndex))
      );
    }

    node.parentNode.replaceChild(frag, node);
  });

  searchMatches = foundMarks;
  return count;
};

const focusMatch = (index) => {
  if (!searchMatches.length) return;

  // wrap around
  if (index < 0) index = searchMatches.length - 1;
  if (index >= searchMatches.length) index = 0;

  // remove previous current style
  if (currentMatchIndex >= 0 && searchMatches[currentMatchIndex]) {
    searchMatches[currentMatchIndex].classList.remove("search-current");
  }

  currentMatchIndex = index;
  const el = searchMatches[currentMatchIndex];
  el.classList.add("search-current");

  const rect = el.getBoundingClientRect();
  const absoluteElementTop = rect.top + window.scrollY;
  const offset = 80;

  window.scrollTo({
    top: absoluteElementTop - offset,
    behavior: "smooth",
  });
};

if (searchForm && searchInput && articleContent) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const query = searchInput.value.trim();
    clearSearchHighlights();

    if (!query) {
      if (searchCount) {
        searchCount.textContent = "";
      }
      return;
    }

    const escaped = escapeRegExp(query);
    const regex = new RegExp(escaped, "gi");

    const matchCount = highlightMatches(articleContent, regex);

    if (searchCount) {
      searchCount.textContent =
        matchCount === 1
          ? "1 match"
          : `${matchCount} matches`;
      searchCount.classList.remove("hidden");
    }

    if (searchPrev && searchNext) {
      if (matchCount > 1) {
        searchPrev.classList.remove("hidden");
        searchNext.classList.remove("hidden");
        focusMatch(0);
      } else {
        searchPrev.classList.add("hidden");
        searchNext.classList.add("hidden");
      }
    }
  });
}

if (searchPrev && searchNext) {
  searchPrev.addEventListener("click", () => {
    if (!searchMatches.length) return;
    focusMatch(currentMatchIndex - 1);
  });

  searchNext.addEventListener("click", () => {
    if (!searchMatches.length) return;
    focusMatch(currentMatchIndex + 1);
  });
}

// Collapsible sections similar to "show/hide" on Wikipedia
document.querySelectorAll(".collapsible-section").forEach((section) => {
  const header = section.querySelector(".collapsible-header");
  const toggle = section.querySelector(".collapsible-toggle");
  const body = section.querySelector(".collapsible-body");
  const isBiography = section.id === "biography";

  if (!header || !toggle || !body) return;

  const setExpanded = (expanded) => {
    if (expanded) {
      section.classList.remove("is-collapsed");
      toggle.textContent = "▲";
      toggle.setAttribute("aria-expanded", "true");
    } else {
      section.classList.add("is-collapsed");
      toggle.textContent = "▼";
      toggle.setAttribute("aria-expanded", "false");
    }
  };

  // expose control so sidebar links and tabs can use it
  section._setExpanded = setExpanded;

  // Initial state:
  // - Biography open
  // - All other sections closed
  setExpanded(isBiography);

  header.addEventListener("click", (event) => {
    // Avoid double-toggle when clicking links inside the body
    if (event.target.closest("a")) return;
    const isCollapsed = section.classList.contains("is-collapsed");
    setExpanded(isCollapsed);
  });

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const isCollapsed = section.classList.contains("is-collapsed");
    setExpanded(isCollapsed);
  });
});

// Top tabs behavior: Article + Talk
const articleTab = document.getElementById("tab-article");
const talkTab = document.getElementById("tab-talk");

const setActiveTab = (activeButton) => {
  const allTabs = document.querySelectorAll(".top-tabs button");
  allTabs.forEach((btn) => btn.classList.remove("top-tab-active"));
  if (activeButton) {
    activeButton.classList.add("top-tab-active");
  }
};

if (articleTab) {
  articleTab.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveTab(articleTab);

    const overview = document.getElementById("overview");
    if (overview) {
      const rect = overview.getBoundingClientRect();
      const absoluteElementTop = rect.top + window.scrollY;
      const offset = 70;
      window.scrollTo({
        top: absoluteElementTop - offset,
        behavior: "smooth",
      });
    }

    // Restore default: biography open, others closed
    const sections = document.querySelectorAll(".collapsible-section");
    sections.forEach((section) => {
      const isBiographySection = section.id === "biography";
      if (section._setExpanded) {
        section._setExpanded(isBiographySection);
      }
    });
  });
}

if (talkTab) {
  talkTab.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveTab(talkTab);

    const contact = document.getElementById("contact");
    if (contact) {
      // Keep biography open, open contact, close others
      const sections = document.querySelectorAll(".collapsible-section");
      sections.forEach((section) => {
        if (section._setExpanded) {
          const keepOpen =
            section.id === "biography" || section.id === "contact";
          section._setExpanded(keepOpen);
        }
      });

      const rect = contact.getBoundingClientRect();
      const absoluteElementTop = rect.top + window.scrollY;
      const offset = 70;
      window.scrollTo({
        top: absoluteElementTop - offset,
        behavior: "smooth",
      });
    }
  });
}

