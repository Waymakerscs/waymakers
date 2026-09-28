/**
 * TOWER — private friends newsfeed + public scrapbook profile (demo / localStorage).
 * Local COMMUNE Front Page is generated from Tower posts.
 *
 * Storage: cognation.tower.posts.v3 · cognation.tower.profile.v1
 * Owner sides: sessionStorage cognation.tower.side = private|public
 * Public deep-link: #tower-profile-{handle}
 * Attachment kinds: photo | note | video | art | document
 */
(function () {
  "use strict";

  var TOWER_KEY = "cognation.tower.posts.v3";
  var TOWER_PROFILE_KEY = "cognation.tower.profile.v1";

  var AVATAR_FRAMES = {
    none: { label: "None", overlay: "" },
    "ornate-gold": { label: "Ornate gold oval", overlay: "assets/frames/ornate-gold-oval-cutout.png" },
    "baroque-magenta": { label: "Magenta baroque", overlay: "assets/frames/baroque-magenta-gold-cutout.png" },
    squiggly: { label: "Squiggly", overlay: "" },
    "gallery-gold": { label: "Gallery gold", overlay: "" },
    walnut: { label: "Walnut", overlay: "" },
    polaroid: { label: "Polaroid", overlay: "" },
    "matte-black": { label: "Matte black", overlay: "" },
    "cowboy-hat": { label: "Cowboy hat", overlay: "assets/frames/cowboy-hat-cutout.png" },
  };

  var FRAME_IDS = Object.keys(AVATAR_FRAMES);

  var COWBOY_HAT_COLORS = {
    tan: { label: "Tan" },
    black: { label: "Black" },
    white: { label: "White" },
    pink: { label: "Pink" },
    red: { label: "Red" },
    blue: { label: "Blue" },
    green: { label: "Green" },
    purple: { label: "Purple" },
    gold: { label: "Gold" },
  };
  var COWBOY_HAT_COLOR_IDS = Object.keys(COWBOY_HAT_COLORS);

  function normalizeCowboyHatColor(id) {
    id = String(id || "tan").toLowerCase();
    return COWBOY_HAT_COLOR_IDS.indexOf(id) >= 0 ? id : "tan";
  }


  var AVATAR_ORNAMENTS = {
    none: { label: "None", src: "" },
    "elegant-bow": { label: "Elegant bow", src: "assets/frames/ornament-elegant-bow-320.png" },
    bowtie: { label: "Bowtie", src: "assets/frames/ornament-bowtie-280.png" },
  };

  var ORNAMENT_IDS = Object.keys(AVATAR_ORNAMENTS);
  var ORNAMENT_POS_IDS = ["above", "below"];

  /* Default sticker positions (%) — approximate classic left-rail + feed */
  var DEFAULT_WIDGET_LAYOUT = {
    avatar: { x: 2, y: 3, z: 5, tilt: -2 },
    identity: { x: 2, y: 16, z: 4, tilt: 1 },
    slogan: { x: 22, y: 16, z: 4, tilt: -1 },
    social: { x: 2, y: 22, z: 4, tilt: 0 },
    music: { x: 2, y: 28, z: 6, tilt: -3 },
    badges: { x: 2, y: 38, z: 5, tilt: 2 },
    friends: { x: 2, y: 52, z: 4, tilt: -1 },
    html: { x: 22, y: 3, z: 3, tilt: 2 },
  };

  var PUBLIC_WIDGET_IDS = ["identity", "slogan", "social", "music", "badges", "friends", "html"];
  var DEFAULT_PUBLIC_WIDGETS = {
    identity: true,
    slogan: true,
    social: true,
    music: true,
    badges: true,
    friends: true,
    html: true,
  };

  var WIDGET_UNDO_MAX = 12;

  function normalizePublicWidgets(raw) {
    var out = {};
    PUBLIC_WIDGET_IDS.forEach(function (id) {
      if (raw && typeof raw === "object" && raw[id] === false) out[id] = false;
      else out[id] = true;
    });
    return out;
  }

  var TOWER_SIDE_KEY = "cognation.tower.side";
  var DEFAULT_PRIVATE_FEED_THEME = {
    backgroundColor: "#fff5f9",
    fontFamily: "georgia",
    fontSize: 16,
    textColor: "#4a2c3a",
    buttonColor: "#f4a4c4",
    authorSeeThrough: true,
    messagesSeeThrough: true,
  };

  var COLLAGE_LAYOUTS = {
    none: { cells: 0 },
    "grid-3x3": { cells: 9 },
    "grid-2x3": { cells: 6 },
    masonry: { cells: 9 },
    "hero-smalls": { cells: 5 },
    "polaroid-scatter": { cells: 9 },
  };

  var DEMO_COLLAGE_COLORS = [
    "#ffd6e8", "#f4a4c4", "#ffc1d9", "#ef8bb4", "#ffeaf3",
    "#f5b6d0", "#d489b0", "#ffd0e4", "#f7b8ce",
  ];


  var DEMO_FRIENDS = [{"id": "alex-rivera", "name": "Alex Rivera"}, {"id": "sam-okonkwo", "name": "Sam Okonkwo"}, {"id": "jordan-lee", "name": "Jordan Lee"}, {"id": "mira-chen", "name": "Mira Chen"}, {"id": "chris-patel", "name": "Chris Patel"}, {"id": "susan-park", "name": "Susan Park"}, {"id": "devon-brooks", "name": "Devon Brooks"}, {"id": "riley-nguyen", "name": "Riley Nguyen"}, {"id": "casey-morris", "name": "Casey Morris"}, {"id": "avery-kim", "name": "Avery Kim"}, {"id": "taylor-james", "name": "Taylor James"}, {"id": "morgan-diaz", "name": "Morgan Diaz"}, {"id": "quinn-foster", "name": "Quinn Foster"}, {"id": "harper-wong", "name": "Harper Wong"}, {"id": "alexa-thomas", "name": "Alexa Thomas"}];

  var BADGE_LABELS = {
    neighbor: "Neighbor",
    organizer: "Organizer",
    correspondent: "Correspondent",
    creator: "Creator",
    steward: "Steward",
    arts: "Arts",
    civic: "Civic",
    food: "Food",
    sports: "Sports",
    faith: "Faith",
    tech: "Tech",
    new: "New here",
    verified: "Verified neighbor",
    host: "Event host",
    helper: "Block helper",
  };

  /* Gifted / awarded pins — brands & people can pin onto a member Tower.
     Founder bottle-cap + patch are NOT here; they render only for isFounderOwner(). */
  var DEMO_AWARDED_BADGES = [
    {
      id: "award-red-peak-ski-1st",
      title: "1st Place · Skiing",
      subtitle: "Mountain Series",
      fromName: "Red Peak Athletics",
      fromHandle: "redpeak",
      fromBusinessId: "red-peak-athletics",
      kind: "brand",
      imageUrl: "assets/badges/award-redbull.svg",
      awardedAt: "2026-02-14T18:00:00.000Z",
      note: "Podium pin from Red Peak Athletics",
    },
    {
      id: "award-summit-bronze-track",
      title: "Bronze · Track",
      subtitle: "400m",
      fromName: "Summit Games",
      fromHandle: "summitgames",
      fromBusinessId: "summit-games",
      kind: "award",
      imageUrl: "assets/badges/award-olympic.svg",
      awardedAt: "2024-08-02T16:30:00.000Z",
      note: "Games-style medal from Summit Games",
    },
    {
      id: "award-peer-mira-neighbor",
      title: "Neighbor of the Block",
      subtitle: "Thanks for showing up",
      fromName: "Mira Chen",
      fromHandle: "mira-chen",
      kind: "peer",
      imageUrl: "assets/badges/award-peer.svg",
      awardedAt: "2026-09-01T12:00:00.000Z",
      note: "Peer pin from a demo friend",
    },
    {
      id: "yearbook-class-clown",
      title: "Class Clown",
      subtitle: "Yearbook superlative",
      fromName: "Yearbook Committee",
      fromHandle: "yearbook",
      kind: "yearbook",
      imageUrl: "assets/badges/yearbook-class-clown.png",
      awardedAt: "2026-05-20T15:00:00.000Z",
      note: "Yearbook superlative — Class Clown",
    },
    {
      id: "yearbook-most-likely-to-succeed",
      title: "Most Likely to Succeed",
      subtitle: "Yearbook superlative",
      fromName: "Yearbook Committee",
      fromHandle: "yearbook",
      kind: "yearbook",
      imageUrl: "assets/badges/yearbook-most-likely-to-succeed.svg",
      awardedAt: "2026-05-20T15:00:00.000Z",
      note: "Yearbook superlative — Most Likely to Succeed",
    },
    {
      id: "yearbook-best-smile",
      title: "Best Smile",
      subtitle: "Yearbook superlative",
      fromName: "Yearbook Committee",
      fromHandle: "yearbook",
      kind: "yearbook",
      imageUrl: "assets/badges/yearbook-best-smile.svg",
      awardedAt: "2026-05-20T15:00:00.000Z",
      note: "Yearbook superlative — Best Smile",
    },
    {
      id: "yearbook-biggest-heart",
      title: "Biggest Heart",
      subtitle: "Yearbook superlative",
      fromName: "Yearbook Committee",
      fromHandle: "yearbook",
      kind: "yearbook",
      imageUrl: "assets/badges/yearbook-biggest-heart.svg",
      awardedAt: "2026-05-20T15:00:00.000Z",
      note: "Yearbook superlative — Biggest Heart",
    },
    {
      id: "yearbook-class-president",
      title: "Class President",
      subtitle: "Yearbook superlative",
      fromName: "Yearbook Committee",
      fromHandle: "yearbook",
      kind: "yearbook",
      imageUrl: "assets/badges/yearbook-class-president.svg",
      awardedAt: "2026-05-20T15:00:00.000Z",
      note: "Yearbook superlative — Class President",
    },
  ];

  function seedAwardedBadgesIfMissing(profile) {
    if (!profile) return profile;
    if (!Array.isArray(profile.awardedBadges)) {
      /* First-time: seed non-yearbook demos only. Yearbook pins are opt-in via Generate. */
      profile.awardedBadges = DEMO_AWARDED_BADGES.filter(function (b) {
        return b && b.kind !== "yearbook";
      }).map(function (b) {
        return JSON.parse(JSON.stringify(b));
      });
      return profile;
    }
    /* Preserve saved awardedBadges — do NOT auto-merge missing yearbook demos */
    return profile;
  }

  function getYearbookDemoDefs() {
    return DEMO_AWARDED_BADGES.filter(function (b) {
      return b && b.kind === "yearbook";
    });
  }

  function isBadgeVisible(profile, badgeId) {
    var vis = profile && profile.badgeVisibility;
    if (!vis || typeof vis !== "object") return false;
    return vis[badgeId] === true;
  }

  function ownedBadgeVisibilityIds(profile) {
    var ids = [];
    if (isFounderOwner(profile)) {
      ids.push("founder-cap", "founder-patch");
    }
    var list = (profile && profile.awardedBadges) || [];
    list.forEach(function (b) {
      if (!b || !b.id || b.kind === "founder") return;
      if (ids.indexOf(b.id) < 0) ids.push(b.id);
    });
    return ids;
  }

  /** Opt-in display map. Missing key = false. First-time null/undefined migrates all owned → true. */
  function normalizeBadgeVisibility(profile) {
    if (!profile) return { migrated: false };
    var owned = ownedBadgeVisibilityIds(profile);
    if (profile.badgeVisibility == null || typeof profile.badgeVisibility !== "object") {
      var vis = {};
      owned.forEach(function (id) {
        vis[id] = true;
      });
      profile.badgeVisibility = vis;
      return { migrated: true };
    }
    return { migrated: false };
  }

  function normalizeAvatarFrameScale(v) {
    var n = parseFloat(v);
    if (isNaN(n)) n = 1;
    return Math.max(0.65, Math.min(1.75, n));
  }

  function sanitizeProfileHtml(html) {
    var tmp = document.createElement("div");
    tmp.innerHTML = String(html || "");
    tmp.querySelectorAll("script, iframe, object, embed, link, meta").forEach(function (el) {
      el.remove();
    });
    tmp.querySelectorAll("*").forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (attr) {
        var n = attr.name.toLowerCase();
        if (n.indexOf("on") === 0 || n === "srcdoc" || (n === "href" && /^\s*javascript:/i.test(attr.value))) {
          el.removeAttribute(attr.name);
        }
      });
    });
    return tmp.innerHTML;
  }

  var TowerProfileStore = {
    load: function () {
      try {
        var raw = localStorage.getItem(TOWER_PROFILE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },
    get: function () {
      var p = this.load();
      var created = false;
      if (!p) {
        created = true;
        p = {
          displayName: "You",
          handle: "",
          slogan: "",
          socialLinks: {},
          avatarDataUrl: "",
          avatarFrame: "none",
          avatarFrameScale: 1,
          displayNameSize: 28,
          cowboyHatColor: "tan",
          avatarOrnament: "none",
          avatarOrnamentPos: "above",
          musicYoutubeWidth: 320,
          videoUrl: "",
          videoTitle: "",
          videoEnabled: true,
          videoWidth: 360,
          badges: { role: "", interest: "", status: "" },
          customHtml: "",
          awardedBadges: null,
          badgeVisibility: null,
          widgetLayout: null,
          publicWidgets: JSON.parse(JSON.stringify(DEFAULT_PUBLIC_WIDGETS)),
          friendPinLayout: {},
          badgePinLayout: {},
          featuredFriendIds: [],
          friendsDisplayCount: 3,
          backgroundCollage: { layoutId: "none", cells: [] },
          towerFont: "georgia",
          feedBackgroundColor: "#fff5f9",
          publicTextColor: "#4a2c3a",
          publicButtonColor: "#f4a4c4",
          backgroundMode: "solid",
          backgroundHtml: "",
          privateFeedTheme: JSON.parse(JSON.stringify(DEFAULT_PRIVATE_FEED_THEME)),
        };
      }
      if (!p.avatarFrame) p.avatarFrame = "none";
      else p.avatarFrame = normalizeFrameId(p.avatarFrame);
      p.avatarFrameScale = normalizeAvatarFrameScale(p.avatarFrameScale);
      p.displayNameSize = normalizeDisplayNameSize(p.displayNameSize);
      p.cowboyHatColor = normalizeCowboyHatColor(p.cowboyHatColor);
      if (!p.avatarOrnament) p.avatarOrnament = "none";
      else p.avatarOrnament = normalizeOrnamentId(p.avatarOrnament);
      if (!p.avatarOrnamentPos) p.avatarOrnamentPos = "above";
      else p.avatarOrnamentPos = normalizeOrnamentPos(p.avatarOrnamentPos);
      if (p.musicYoutubeWidth == null || isNaN(parseInt(p.musicYoutubeWidth, 10))) p.musicYoutubeWidth = 320;
      else p.musicYoutubeWidth = Math.max(180, Math.min(720, parseInt(p.musicYoutubeWidth, 10)));
      /* One YouTube player only (music/radio). Fold legacy videoUrl into musicUrl. */
      if ((!p.musicUrl || !String(p.musicUrl).trim()) && p.videoUrl && String(p.videoUrl).trim()) {
        p.musicUrl = String(p.videoUrl).trim();
        if (p.videoTitle && !p.musicTitle) p.musicTitle = p.videoTitle;
        if (!p.musicSkin || p.musicSkin === "classic") p.musicSkin = "radio";
        p.musicEnabled = p.videoEnabled !== false;
      }
      if (p.publicWidgets && typeof p.publicWidgets === "object") {
        p.publicWidgets.video = false;
      }
      if (typeof p.videoUrl !== "string") p.videoUrl = p.videoUrl ? String(p.videoUrl) : "";
      if (typeof p.videoTitle !== "string") p.videoTitle = p.videoTitle ? String(p.videoTitle) : "";
      if (p.videoEnabled == null) p.videoEnabled = true;
      else p.videoEnabled = !!p.videoEnabled;
      if (p.videoWidth == null || isNaN(parseInt(p.videoWidth, 10))) p.videoWidth = 360;
      else p.videoWidth = Math.max(200, Math.min(900, parseInt(p.videoWidth, 10)));
      if (!p.friendPinLayout || typeof p.friendPinLayout !== "object") {
        p.friendPinLayout = {};
      }
      if (!p.badgePinLayout || typeof p.badgePinLayout !== "object") {
        p.badgePinLayout = {};
      }
      if (!Array.isArray(p.featuredFriendIds)) p.featuredFriendIds = [];
      else {
        p.featuredFriendIds = p.featuredFriendIds
          .map(function (id) { return String(id || ""); })
          .filter(Boolean);
      }
      var fdc = parseInt(p.friendsDisplayCount, 10);
      if ([3, 6, 8].indexOf(fdc) === -1) fdc = 3;
      p.friendsDisplayCount = fdc;
      p.featuredFriendIds = p.featuredFriendIds.slice(0, fdc);
      p.publicWidgets = normalizePublicWidgets(p.publicWidgets);
      if (!p.backgroundCollage || typeof p.backgroundCollage !== "object") {
        p.backgroundCollage = { layoutId: "none", cells: [] };
      }
      if (!p.towerFont) p.towerFont = "georgia";
      else p.towerFont = normalizeTowerFont(p.towerFont);
      if (!p.feedBackgroundColor) p.feedBackgroundColor = "#fff5f9";
      else p.feedBackgroundColor = normalizeFeedBgColor(p.feedBackgroundColor);
      p.publicTextColor = normalizePublicThemeColor(
        p.publicTextColor,
        "#4a2c3a"
      );
      p.publicButtonColor = normalizePublicThemeColor(
        p.publicButtonColor,
        "#f4a4c4"
      );
      p.backgroundMode = normalizeBackgroundMode(
        p.backgroundMode,
        p.backgroundCollage,
        p.backgroundHtml
      );
      if (typeof p.backgroundHtml !== "string") p.backgroundHtml = "";
      else p.backgroundHtml = sanitizeProfileHtml(String(p.backgroundHtml).slice(0, 8000));
      if (typeof p.slogan !== "string") p.slogan = p.slogan ? String(p.slogan) : "";
      else p.slogan = String(p.slogan).slice(0, 400);
      p.privateFeedTheme = normalizePrivateFeedTheme(p.privateFeedTheme);
      var before = p.awardedBadges;
      var beforeLen = Array.isArray(before) ? before.length : -1;
      var beforeVis = p.badgeVisibility;
      seedAwardedBadgesIfMissing(p);
      var visMig = normalizeBadgeVisibility(p);
      var afterLen = Array.isArray(p.awardedBadges) ? p.awardedBadges.length : -1;
      if (created || before == null || afterLen > beforeLen || beforeVis == null || visMig.migrated) {
        try {
          this.save(p);
        } catch (e) {}
      }
      return p;
    },
        save: function (data) {
      try {
        localStorage.setItem(TOWER_PROFILE_KEY, JSON.stringify(data));
        document.dispatchEvent(new CustomEvent("cognation:tower-profile-updated", { detail: data }));
        return true;
      } catch (e) {
        /* Quota / private mode — retry without bulky fields */
        try {
          var slim = JSON.parse(JSON.stringify(data || {}));
          if (slim.avatarDataUrl && String(slim.avatarDataUrl).length > 200000) {
            slim.avatarDataUrl = "";
          }
          if (slim.backgroundCollage && Array.isArray(slim.backgroundCollage.cells)) {
            slim.backgroundCollage.cells = slim.backgroundCollage.cells.map(function (c) {
              if (c && c.url && String(c.url).indexOf("data:") === 0) {
                return { color: (c && c.color) || "#fff5f9" };
              }
              return c;
            });
          }
          if (slim.backgroundHtml && String(slim.backgroundHtml).length > 12000) {
            slim.backgroundHtml = String(slim.backgroundHtml).slice(0, 8000);
          }
          localStorage.setItem(TOWER_PROFILE_KEY, JSON.stringify(slim));
          document.dispatchEvent(new CustomEvent("cognation:tower-profile-updated", { detail: slim }));
          return true;
        } catch (e2) {
          return false;
        }
      }
    },
  };

  window.CognationTowerProfileStore = TowerProfileStore;

  var SEED = [
    {
      id: "tower-1",
      authorName: "Alex Rivera",
      body: "East wing library late night — brought notes from the zoning packet.",
      createdAt: "2026-09-15T18:30:00.000Z",
      attachments: [{ kind: "note", label: "Zoning notes.pdf", name: "Zoning notes.pdf" }],
      likes: 42,
    },
    {
      id: "tower-2",
      authorName: "Sam Okonkwo",
      body: "@friendsoffriends Market square this morning. Peach stand line hit the fountain again.",
      createdAt: "2026-09-15T17:05:00.000Z",
      attachments: [{ kind: "photo", label: "Square photo", name: "market-square.jpg" }],
      likes: 128,
      audience: "friends_of_friends",
      shareBeyondFriends: true,
    },
    {
      id: "tower-3",
      authorName: "Jordan Lee",
      body: "Saturday block party invite — bring a dish if you can.",
      createdAt: "2026-09-15T15:40:00.000Z",
      attachments: [{ kind: "document", label: "Party invitation", name: "block-party-invite.pdf" }],
      likes: 96,
    },
    {
      id: "tower-4",
      authorName: "Mira Chen",
      body: "Short clip from the river walk mural going up.",
      createdAt: "2026-09-15T14:10:00.000Z",
      attachments: [{ kind: "video", label: "Mural clip", name: "mural-walk.mp4" }],
      likes: 77,
    },
    {
      id: "tower-5",
      authorName: "Chris Patel",
      body: "Creative study: cyan ink wash of the tower silhouette.",
      createdAt: "2026-09-15T12:55:00.000Z",
      attachments: [{ kind: "art", label: "Tower silhouette", name: "tower-ink.png" }],
      likes: 61,
    },
  ];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatTime(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (e) {
      return iso || "";
    }
  }

  function kindLabel(kind) {
    switch (kind) {
      case "photo":
        return "Photo";
      case "note":
        return "Notes";
      case "video":
        return "Video";
      case "art":
        return "Creative";
      case "document":
        return "Document";
      default:
        return "Upload";
    }
  }

  var TowerStore = {
    load: function () {
      try {
        var raw = localStorage.getItem(TOWER_KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (!data || !Array.isArray(data.posts)) return null;
        return data;
      } catch (e) {
        return null;
      }
    },
    save: function (data) {
      try {
        localStorage.setItem(TOWER_KEY, JSON.stringify(data));
        return true;
      } catch (e) {
        return false;
      }
    },
    list: function () {
      var data = this.load();
      if (!data) {
        data = { version: 1, posts: JSON.parse(JSON.stringify(SEED)) };
        this.save(data);
      }
      return data.posts.slice().sort(function (a, b) {
        return String(b.createdAt).localeCompare(String(a.createdAt));
      });
    },
    toggleReaction: function (postId, face) {
      face = String(face || "");
      if (!face) return { ok: false, error: "Missing reaction." };
      var data = this.load();
      if (!data) {
        data = { version: 1, posts: JSON.parse(JSON.stringify(SEED)) };
      }
      var me = "you";
      try {
        var sess = localStorage.getItem("cognation.session.v2");
        if (sess) {
          var parsed = JSON.parse(sess);
          if (parsed && parsed.username) me = String(parsed.username).toLowerCase();
        }
      } catch (e) {}
      var found = null;
      data.posts.forEach(function (p) {
        if (p && p.id === postId) found = p;
      });
      if (!found) return { ok: false, error: "Post not found." };
      if (!found.reactions || typeof found.reactions !== "object") found.reactions = {};
      var list = Array.isArray(found.reactions[face]) ? found.reactions[face].slice() : [];
      var ix = list.indexOf(me);
      if (ix >= 0) list.splice(ix, 1);
      else list.push(me);
      if (list.length) found.reactions[face] = list;
      else delete found.reactions[face];
      /* keep likes roughly in sync with heart count for legacy display */
      if (face === "❤️") found.likes = list.length || found.likes || 0;
      if (!this.save(data)) return { ok: false, error: "Could not save reaction." };
      return { ok: true, post: found };
    },
    add: function (fields) {
      var body = String((fields && fields.body) || "").trim();
      if (!body && !(fields && fields.attachments && fields.attachments.length)) {
        return { ok: false, error: "Add a note or an upload." };
      }
      var data = this.load() || { version: 1, posts: [] };
      var post = {
        id: "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        authorName: (fields && fields.authorName) || "You",
        body: body.slice(0, 2000),
        createdAt: new Date().toISOString(),
        attachments: (fields && fields.attachments) || [],
        likes: 0,
        handle: (window.CognationTowerProfileStore
          ? normalizeHandle(window.CognationTowerProfileStore.get().handle || "")
          : ""),
      };
      data.posts.unshift(post);
      if (!this.save(data)) return { ok: false, error: "Could not save post." };
      document.dispatchEvent(
        new CustomEvent("cognation:tower-updated", { detail: { post: post } })
      );
      return { ok: true, post: post };
    },
  };

  window.CognationTowerStore = TowerStore;

  function renderAttachments(list) {
    if (!list || !list.length) return "";
    return (
      '<ul class="tower-attachments">' +
      list
        .map(function (a) {
          return (
            '<li class="tower-attach tower-attach--' +
            escapeHtml(a.kind || "document") +
            '">' +
            '<span class="tower-attach-kind">' +
            escapeHtml(kindLabel(a.kind)) +
            "</span> " +
            '<span class="tower-attach-name">' +
            escapeHtml(a.label || a.name || "file") +
            "</span></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  var TOWER_POST_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

  function towerReactionViewerId() {
    try {
      var sess = localStorage.getItem("cognation.session.v2");
      if (sess) {
        var parsed = JSON.parse(sess);
        if (parsed && parsed.username) return String(parsed.username).toLowerCase();
      }
    } catch (e) {}
    return "you";
  }

  function buildTowerPostReactBar(post, root) {
    var wrap = document.createElement("div");
    wrap.className = "tower-post-reactbar";
    wrap.setAttribute("data-tower-post-id", post.id || "");

    var pills = document.createElement("div");
    pills.className = "tower-post-reactions";
    pills.setAttribute("aria-label", "Reactions");
    var me = towerReactionViewerId();
    var reactions = post.reactions && typeof post.reactions === "object" ? post.reactions : {};
    Object.keys(reactions).forEach(function (emoji) {
      var users = reactions[emoji];
      if (!Array.isArray(users) || !users.length) return;
      var mine = users.indexOf(me) >= 0;
      var pill = document.createElement("button");
      pill.type = "button";
      pill.className = "tower-react-pill" + (mine ? " is-mine" : "");
      pill.setAttribute("data-tower-react", emoji);
      pill.setAttribute(
        "aria-label",
        (mine ? "Remove your " : "Add ") + emoji + " reaction" + (users.length > 1 ? ", " + users.length + " total" : "")
      );
      pill.innerHTML =
        '<span class="tower-react-pill-emoji" aria-hidden="true">' +
        emoji +
        "</span>" +
        (users.length > 1
          ? '<span class="tower-react-pill-count">' + String(users.length) + "</span>"
          : "");
      pills.appendChild(pill);
    });
    wrap.appendChild(pills);

    var controls = document.createElement("div");
    controls.className = "tower-react-controls";
    TOWER_POST_REACTIONS.forEach(function (face) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tower-react-face";
      b.setAttribute("data-tower-react", face);
      b.setAttribute("aria-label", "React with " + face);
      b.textContent = face;
      controls.appendChild(b);
    });
    wrap.appendChild(controls);

    wrap.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-tower-react]");
      if (!btn || !wrap.contains(btn)) return;
      ev.preventDefault();
      var face = btn.getAttribute("data-tower-react");
      var id = wrap.getAttribute("data-tower-post-id");
      var result = TowerStore.toggleReaction(id, face);
      if (!result.ok) return;
      renderFeed(root);
    });
    return wrap;
  }


  function postAuthorFromProfile(profile) {
    profile = profile || TowerProfileStore.get();
    var name = String((profile && profile.displayName) || "").trim();
    if (name && name.toLowerCase() !== "you") return name.slice(0, 80);
    var handle = normalizeHandle((profile && profile.handle) || "");
    if (handle) return handle;
    try {
      var sess = localStorage.getItem("cognation.session.v2");
      if (sess) {
        var parsed = JSON.parse(sess);
        if (parsed && parsed.username) return String(parsed.username).trim().slice(0, 80);
      }
    } catch (e) {}
    return name || "You";
  }

  function renderFeed(root) {
    var list = root.querySelector("[data-tower-feed]");
    if (!list) return;
    var posts = TowerStore.list();
    list.innerHTML = "";
    if (!posts.length) {
      list.innerHTML = '<p class="commune-empty">No Tower posts yet — share the first update.</p>';
      return;
    }
    posts.forEach(function (post) {
      var article = document.createElement("article");
      article.className = "tower-post";
      article.setAttribute("data-tower-post", post.id || "");
      article.innerHTML =
        '<header class="tower-post-meta">' +
        '<span class="tower-author">' +
        escapeHtml(post.authorName || "Neighbor") +
        "</span>" +
        '<time datetime="' +
        escapeHtml(post.createdAt) +
        '">' +
        escapeHtml(formatTime(post.createdAt)) +
        "</time></header>" +
        (post.body
          ? '<p class="tower-post-body">' + escapeHtml(post.body) + "</p>"
          : "") +
        renderAttachments(post.attachments);
      article.appendChild(buildTowerPostReactBar(post, root));
      list.appendChild(article);
    });
  }

  function initials(name) {
    var parts = String(name || "?").trim().split(/\s+/);
    var a = (parts[0] && parts[0][0]) || "?";
    var b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase();
  }

  function renderBadges(root, badges) {
    var el = root.querySelector("[data-tower-badges]");
    if (!el) return;
    el.innerHTML = "";
    ["role", "interest", "status"].forEach(function (k) {
      var v = badges && badges[k];
      if (!v) return;
      var span = document.createElement("span");
      span.className = "tower-badge";
      span.textContent = BADGE_LABELS[v] || v;
      el.appendChild(span);
    });
  }

  var TOWER_FONT_MAP = {
    georgia: 'Georgia, "Times New Roman", Times, serif',
    chomsky: '"Chomsky", "Old English Text MT", Georgia, serif',
    system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    serif: 'Georgia, "Palatino Linotype", Palatino, "Times New Roman", serif',
    sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    scrapbook: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive',
  };

  var TOWER_FONT_IDS = Object.keys(TOWER_FONT_MAP);
  var DEFAULT_FEED_BG = "#fff5f9";

  function normalizeTowerFont(id) {
    id = String(id || "georgia").toLowerCase();
    return TOWER_FONT_IDS.indexOf(id) >= 0 ? id : "georgia";
  }

  function normalizeFeedBgColor(raw) {
    var s = String(raw || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      return ("#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toLowerCase();
    }
    return DEFAULT_FEED_BG;
  }

  function normalizePrivateFontSize(n) {
    var v = parseInt(n, 10);
    if ([14, 16, 18, 20].indexOf(v) === -1) return 16;
    return v;
  }

  function normalizePublicThemeColor(raw, fallback) {
    var fb = fallback || "#4a2c3a";
    var s = String(raw || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      return ("#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toLowerCase();
    }
    return fb;
  }

  function normalizeBackgroundMode(mode, collage, html) {
    var m = String(mode || "").toLowerCase().trim();
    if (m === "solid" || m === "collage" || m === "html") return m;
    /* Migration: infer from existing collage / html */
    if (html && String(html).trim()) return "html";
    if (collage && collage.layoutId && collage.layoutId !== "none" && COLLAGE_LAYOUTS[collage.layoutId]) {
      return "collage";
    }
    return "solid";
  }

  function normalizePrivateFeedTheme(raw) {
    var t = raw && typeof raw === "object" ? raw : {};
    return {
      backgroundColor: normalizeFeedBgColor(t.backgroundColor || DEFAULT_PRIVATE_FEED_THEME.backgroundColor),
      fontFamily: normalizeTowerFont(t.fontFamily || DEFAULT_PRIVATE_FEED_THEME.fontFamily),
      fontSize: normalizePrivateFontSize(t.fontSize != null ? t.fontSize : DEFAULT_PRIVATE_FEED_THEME.fontSize),
      textColor: (function () {
        var rawC = t.textColor || DEFAULT_PRIVATE_FEED_THEME.textColor;
        var c = normalizeFeedBgColor(rawC);
        /* normalizeFeedBgColor falls back to pink feed bg — keep private text dark */
        if (c === DEFAULT_FEED_BG && String(rawC || "").toLowerCase() !== DEFAULT_FEED_BG) {
          return DEFAULT_PRIVATE_FEED_THEME.textColor;
        }
        return c;
      })(),
      buttonColor: (function () {
        var rawB = t.buttonColor || DEFAULT_PRIVATE_FEED_THEME.buttonColor;
        var c = normalizeFeedBgColor(rawB);
        if (c === DEFAULT_FEED_BG && String(rawB || "").toLowerCase() !== DEFAULT_FEED_BG) {
          return DEFAULT_PRIVATE_FEED_THEME.buttonColor;
        }
        return c;
      })(),
      authorSeeThrough: t.authorSeeThrough !== false,
      messagesSeeThrough: t.messagesSeeThrough !== false,
    };
  }

  function getSessionUsername() {
    try {
      var session =
        (window.CognationAuth &&
          typeof window.CognationAuth.getSession === "function" &&
          window.CognationAuth.getSession()) ||
        null;
      if (!session) {
        try {
          var raw = localStorage.getItem("cognation.session.v2");
          if (raw) session = JSON.parse(raw);
        } catch (e) {}
      }
      return session && session.username ? String(session.username).trim().toLowerCase() : "";
    } catch (e2) {
      return "";
    }
  }

  /** Demo / single-profile: logged-in viewer owns this Tower. */
  function isTowerOwner(profile) {
    var user = getSessionUsername();
    if (!user) return false;
    profile = profile || TowerProfileStore.get();
    var handle = String((profile && profile.handle) || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
    /* Single alexa demo profile — owner when authenticated as alexa (or empty handle). */
    if (user === "alexa" && (!handle || handle === "alexa")) return true;
    if (handle && handle === user) return true;
    return false;
  }

  function profilePublicSlug(profile) {
    profile = profile || TowerProfileStore.get();
    var handleVal = normalizeHandle((profile && profile.handle) || "");
    if (handleVal) return handleVal;
    /* Demo founder without a saved handle still shares as /alexa */
    if (isFounderOwner(profile)) return "alexa";
    var fromName = String((profile && profile.displayName) || "you")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return fromName || "you";
  }

  function profilePublicHash(profile) {
    return "tower-profile-" + profilePublicSlug(profile);
  }

  function profilePublicUrl(profile) {
    var hash = profilePublicHash(profile);
    try {
      var u = new URL(window.location.href);
      u.hash = hash;
      return u.toString();
    } catch (e) {
      return (window.location.origin || "") + (window.location.pathname || "/") + "#" + hash;
    }
  }

  function readStoredTowerSide() {
    try {
      var v = sessionStorage.getItem(TOWER_SIDE_KEY);
      if (v === "private" || v === "public") return v;
    } catch (e) {}
    return null;
  }

  function writeStoredTowerSide(side) {
    try {
      sessionStorage.setItem(TOWER_SIDE_KEY, side === "public" ? "public" : "private");
    } catch (e) {}
  }

  function hashRequestsPublicSide() {
    var hash = (location.hash || "").replace(/^#/, "");
    return !!(hash && hash.indexOf("tower-profile-") === 0);
  }

  function applyPrivateFeedTheme(root, theme) {
    theme = normalizePrivateFeedTheme(theme);
    var privateSide = root.querySelector("[data-tower-private-side]");
    if (!privateSide) return;
    var fontStack = TOWER_FONT_MAP[theme.fontFamily] || TOWER_FONT_MAP.georgia;
    privateSide.style.setProperty("--tower-private-bg", theme.backgroundColor);
    privateSide.style.setProperty("--tower-private-font", fontStack);
    privateSide.style.setProperty("--tower-private-font-size", theme.fontSize + "px");
    privateSide.style.setProperty("--tower-private-text", theme.textColor);
    privateSide.style.setProperty("--tower-private-btn", theme.buttonColor);
    privateSide.setAttribute("data-tower-private-font", theme.fontFamily);
    privateSide.setAttribute("data-author-see-through", theme.authorSeeThrough ? "true" : "false");
    privateSide.setAttribute("data-messages-see-through", theme.messagesSeeThrough ? "true" : "false");
    var bgIn = root.querySelector("[data-tower-private-bg]");
    var fontIn = root.querySelector("[data-tower-private-font]");
    var sizeIn = root.querySelector("[data-tower-private-font-size]");
    var textIn = root.querySelector("[data-tower-private-text]");
    var btnIn = root.querySelector("[data-tower-private-btn]");
    var authorSee = root.querySelector("[data-tower-private-author-see-through]");
    var msgSee = root.querySelector("[data-tower-private-messages-see-through]");
    if (bgIn && document.activeElement !== bgIn) bgIn.value = theme.backgroundColor;
    if (fontIn && document.activeElement !== fontIn) fontIn.value = theme.fontFamily;
    if (sizeIn && document.activeElement !== sizeIn) sizeIn.value = String(theme.fontSize);
    if (textIn && document.activeElement !== textIn) textIn.value = theme.textColor;
    if (btnIn && document.activeElement !== btnIn) btnIn.value = theme.buttonColor;
    if (authorSee) authorSee.checked = !!theme.authorSeeThrough;
    if (msgSee) msgSee.checked = !!theme.messagesSeeThrough;
  }

  function readPrivateFeedThemeFromForm(root) {
    var bgIn = root.querySelector("[data-tower-private-bg]");
    var fontIn = root.querySelector("[data-tower-private-font]");
    var sizeIn = root.querySelector("[data-tower-private-font-size]");
    var textIn = root.querySelector("[data-tower-private-text]");
    var btnIn = root.querySelector("[data-tower-private-btn]");
    var authorSee = root.querySelector("[data-tower-private-author-see-through]");
    var msgSee = root.querySelector("[data-tower-private-messages-see-through]");
    return normalizePrivateFeedTheme({
      backgroundColor: bgIn ? bgIn.value : DEFAULT_PRIVATE_FEED_THEME.backgroundColor,
      fontFamily: fontIn ? fontIn.value : DEFAULT_PRIVATE_FEED_THEME.fontFamily,
      fontSize: sizeIn ? sizeIn.value : DEFAULT_PRIVATE_FEED_THEME.fontSize,
      textColor: textIn ? textIn.value : DEFAULT_PRIVATE_FEED_THEME.textColor,
      buttonColor: btnIn ? btnIn.value : DEFAULT_PRIVATE_FEED_THEME.buttonColor,
      authorSeeThrough: authorSee ? !!authorSee.checked : true,
      messagesSeeThrough: msgSee ? !!msgSee.checked : true,
    });
  }

  function syncPublicUrlFields(root, profile) {
    var url = profilePublicUrl(profile);
    root.querySelectorAll("[data-tower-public-url], [data-tower-public-url-preview]").forEach(function (el) {
      if (document.activeElement !== el) el.value = url;
    });
  }

  function applyTowerSide(root, side, opts) {
    opts = opts || {};
    var owner = isTowerOwner(TowerProfileStore.get());
    root.setAttribute("data-tower-is-owner", owner ? "true" : "false");
    if (!owner) side = "public";
    side = side === "public" ? "public" : "private";
    root.setAttribute("data-tower-side", side);
    var privateSide = root.querySelector("[data-tower-private-side]");
    var publicSide = root.querySelector("[data-tower-public-side]");
    if (privateSide) {
      privateSide.hidden = side !== "private";
      privateSide.setAttribute("aria-hidden", side === "private" ? "false" : "true");
    }
    if (publicSide) {
      publicSide.hidden = side !== "public";
      publicSide.setAttribute("aria-hidden", side === "public" ? "false" : "true");
    }
    root.querySelectorAll("[data-tower-side-btn]").forEach(function (btn) {
      var on = btn.getAttribute("data-tower-side-btn") === side;
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.classList.toggle("is-selected", on);
      btn.tabIndex = on ? 0 : -1;
    });
    var toggle = root.querySelector("[data-tower-side-toggle]");
    if (toggle) toggle.hidden = !owner;
    if (opts.persist !== false && owner) writeStoredTowerSide(side);
    /* Re-apply sticker layout when showing public so positions paint after unhide */
    if (side === "public") {
      try {
        var cur = TowerProfileStore.get();
        applyWidgetLayout(root, cur);
        applyPublicWidgets(root, cur);
        renderBadgePins(root, cur);
        syncOwnerStickerHandles(root);
        initTowerMusic(root, cur);
        initTowerVideo(root, cur);
      } catch (e) {}
    } else {
      try {
        syncOwnerStickerHandles(root);
        clearWidgetSelection(root.querySelector("[data-tower-scrapbook]"));
      } catch (e2) {}
    }
  }

  function initTowerSideToggle(root) {
    if (!root || root.__cognationSideBound) return;
    root.__cognationSideBound = true;
    var owner = isTowerOwner(TowerProfileStore.get());
    var initial = "public";
    if (owner) {
      if (hashRequestsPublicSide()) initial = "public";
      else initial = readStoredTowerSide() || "private";
    } else {
      initial = "public";
    }
    applyTowerSide(root, initial, { persist: false });
    if (owner) writeStoredTowerSide(initial);

    root.querySelectorAll("[data-tower-side-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!isTowerOwner(TowerProfileStore.get())) return;
        applyTowerSide(root, btn.getAttribute("data-tower-side-btn") || "private");
      });
    });

    window.addEventListener("hashchange", function () {
      if (hashRequestsPublicSide()) {
        applyTowerSide(root, "public");
      }
    });

    document.addEventListener("cognation:session-started", function () {
      var o = isTowerOwner(TowerProfileStore.get());
      var side = o ? readStoredTowerSide() || "private" : "public";
      if (hashRequestsPublicSide()) side = "public";
      applyTowerSide(root, side);
      syncPublicUrlFields(root, TowerProfileStore.get());
    });
  }

  function initPrivateFeedThemeControls(root) {
    if (!root || root.__cognationPrivateThemeBound) return;
    root.__cognationPrivateThemeBound = true;
    var saveBtn = root.querySelector("[data-tower-private-theme-save]");
    var status = root.querySelector("[data-tower-private-theme-status]");
    function setStatus(msg, isError) {
      if (!status) return;
      status.hidden = !msg;
      status.textContent = msg || "";
      status.classList.toggle("is-error", !!isError);
    }
    function livePreview() {
      applyPrivateFeedTheme(root, readPrivateFeedThemeFromForm(root));
    }
    ["data-tower-private-bg", "data-tower-private-font", "data-tower-private-font-size", "data-tower-private-text", "data-tower-private-btn", "data-tower-private-author-see-through", "data-tower-private-messages-see-through"].forEach(function (sel) {
      var el = root.querySelector("[" + sel + "]");
      if (!el) return;
      el.addEventListener("input", livePreview);
      el.addEventListener("change", livePreview);
    });
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var p = TowerProfileStore.get();
        p.privateFeedTheme = readPrivateFeedThemeFromForm(root);
        if (!TowerProfileStore.save(p)) {
          setStatus("Could not save feed look.", true);
          return;
        }
        applyPrivateFeedTheme(root, p.privateFeedTheme);
        setStatus("Feed look saved (private only).", false);
      });
    }
  }

  function initPublicUrlCopy(root) {
    if (!root || root.__cognationPublicUrlBound) return;
    root.__cognationPublicUrlBound = true;
    root.querySelectorAll("[data-tower-copy-public-url]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var url = profilePublicUrl(TowerProfileStore.get());
        syncPublicUrlFields(root, TowerProfileStore.get());
        function ok() {
          var prev = btn.textContent;
          btn.textContent = "Copied";
          window.setTimeout(function () {
            btn.textContent = prev;
          }, 1200);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(ok).catch(function () {
            var input = root.querySelector("[data-tower-public-url]") || root.querySelector("[data-tower-public-url-preview]");
            if (input) {
              input.focus();
              input.select();
            }
          });
        } else {
          var input2 = root.querySelector("[data-tower-public-url]") || root.querySelector("[data-tower-public-url-preview]");
          if (input2) {
            input2.focus();
            input2.select();
            try {
              document.execCommand("copy");
              ok();
            } catch (e) {}
          }
        }
      });
    });
  }

  /** Founder bottle-cap + patch: exclusive to Alexa (login user alexa / her profile).
   *  Non-alexa profile handles never show Founder. Gifted awards are unrelated. */
  function isFounderOwner(profile) {
    if (!profile) {
      try {
        profile = TowerProfileStore.load() || {};
      } catch (e0) {
        profile = {};
      }
    }
    var handle = String((profile && profile.handle) || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
    var name = String((profile && profile.displayName) || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    var nameIsAlexa =
      name === "alexa" ||
      name === "alexa thomas" ||
      name === "alexa j thomas" ||
      name === "alexa j. thomas";

    /* Explicit non-alexa profile identity → never Founder */
    if (handle && handle !== "alexa") return false;
    if (name && name !== "you" && !nameIsAlexa && handle !== "alexa") {
      /* named as someone else without alexa handle */
      if (!handle) return false;
    }

    if (handle === "alexa" || nameIsAlexa) return true;

    /* Default / empty profile owned by logged-in alexa */
    var user = "";
    try {
      var session =
        (window.CognationAuth &&
          typeof window.CognationAuth.getSession === "function" &&
          window.CognationAuth.getSession()) ||
        null;
      if (!session) {
        try {
          var raw = localStorage.getItem("cognation.session.v2");
          if (raw) session = JSON.parse(raw);
        } catch (e) {}
      }
      user = session && session.username ? String(session.username).trim().toLowerCase() : "";
    } catch (e2) {}
    if (user === "alexa" && (!handle || handle === "alexa")) {
      if (!name || name === "you" || nameIsAlexa) return true;
    }
    return false;
  }

  function renderFounderBadges(stage, opts) {
    if (!stage) return;
    opts = opts || {};
    var showCap = opts.showCap !== false;
    var showPatch = opts.showPatch !== false;
    if (showCap) {
      var pin = document.createElement("figure");
      pin.className = "tower-bottle-cap tower-bottle-cap--founder";
      pin.setAttribute("data-founder-badge", "cap");
      pin.title = "Founder";
      var pinImg = document.createElement("img");
      pinImg.src = "assets/badges/founder-bottle-cap.png";
      pinImg.width = 200;
      pinImg.height = 200;
      pinImg.alt = "Founder — 1950s soda bottle cap badge";
      pin.appendChild(pinImg);
      var pinCap = document.createElement("figcaption");
      pinCap.className = "tower-badge-caption";
      pinCap.textContent = "Founder";
      pin.appendChild(pinCap);
      stage.appendChild(pin);
    }
    if (showPatch) {
      var patch = document.createElement("figure");
      patch.className = "tower-bottle-cap tower-awarded-pin tower-awarded-pin--patch";
      patch.setAttribute("data-founder-badge", "patch");
      patch.title = "Founder patch";
      var patchImg = document.createElement("img");
      patchImg.src = "assets/badges/founder-patch.png";
      patchImg.width = 160;
      patchImg.height = 160;
      patchImg.alt = "Founder — embroidered vest patch";
      patch.appendChild(patchImg);
      var patchCap = document.createElement("figcaption");
      patchCap.className = "tower-badge-caption";
      patchCap.textContent = "Founder patch";
      patch.appendChild(patchCap);
      stage.appendChild(patch);
    }
  }

  function applyTowerTheme(root, profile) {
    if (!root) return;
    var fontId = normalizeTowerFont(profile && profile.towerFont);
    var bg = normalizeFeedBgColor(profile && profile.feedBackgroundColor);
    var textColor = normalizePublicThemeColor(
      profile && profile.publicTextColor,
      "#4a2c3a"
    );
    var btnColor = normalizePublicThemeColor(
      profile && profile.publicButtonColor,
      "#f4a4c4"
    );
    var bgMode = normalizeBackgroundMode(
      profile && profile.backgroundMode,
      profile && profile.backgroundCollage,
      profile && profile.backgroundHtml
    );
    var fontStack = TOWER_FONT_MAP[fontId] || TOWER_FONT_MAP.georgia;
    root.style.setProperty("--tower-font", fontStack);
    root.style.setProperty("--tower-feed-bg", bg);
    root.style.setProperty("--tower-public-text", textColor);
    root.style.setProperty("--tower-public-btn", btnColor);
    root.setAttribute("data-tower-font", fontId);
    root.setAttribute("data-tower-bg-mode", bgMode);
    var scrapbook = root.querySelector("[data-tower-scrapbook]");
    if (scrapbook) {
      scrapbook.style.setProperty("--tower-font", fontStack);
      scrapbook.style.setProperty("--tower-feed-bg", bg);
      scrapbook.style.setProperty("--tower-public-text", textColor);
      scrapbook.style.setProperty("--tower-public-btn", btnColor);
      scrapbook.setAttribute("data-tower-bg-mode", bgMode);
    }
    var publicSide = root.querySelector("[data-tower-public-side]");
    if (publicSide) {
      publicSide.style.setProperty("--tower-font", fontStack);
      publicSide.style.setProperty("--tower-feed-bg", bg);
      publicSide.style.setProperty("--tower-public-text", textColor);
      publicSide.style.setProperty("--tower-public-btn", btnColor);
    }
    var fontSel = root.querySelector("[data-tower-font]");
    if (fontSel && document.activeElement !== fontSel) fontSel.value = fontId;
    var bgIn = root.querySelector("[data-tower-feed-bg]");
    if (bgIn && document.activeElement !== bgIn) bgIn.value = bg;
    var textIn = root.querySelector("[data-tower-public-text]");
    if (textIn && document.activeElement !== textIn) textIn.value = textColor;
    var btnIn = root.querySelector("[data-tower-public-btn]");
    if (btnIn && document.activeElement !== btnIn) btnIn.value = btnColor;
    var modeSel = root.querySelector("[data-tower-bg-mode]");
    if (modeSel && document.activeElement !== modeSel) modeSel.value = bgMode;
    var htmlIn = root.querySelector("[data-tower-bg-html]");
    if (htmlIn && document.activeElement !== htmlIn) {
      htmlIn.value = (profile && typeof profile.backgroundHtml === "string")
        ? profile.backgroundHtml
        : "";
    }
    applyPublicBackground(root, profile);
  }

  function clearCollageStage(root) {
    var stage = root.querySelector("[data-tower-collage-stage]");
    if (!stage) return;
    stage.innerHTML = "";
    stage.setAttribute("data-layout", "none");
    stage.hidden = true;
  }

  function clearBgHtmlStage(root) {
    var stage = root.querySelector("[data-tower-bg-html-stage]");
    if (!stage) return;
    stage.innerHTML = "";
    stage.hidden = true;
  }

  function renderBgHtmlStage(root, html) {
    var stage = root.querySelector("[data-tower-bg-html-stage]");
    if (!stage) return;
    stage.innerHTML = sanitizeProfileHtml(html || "");
    stage.hidden = !stage.innerHTML;
  }

  /** Apply solid / collage / html background behind stickers. */
  function applyPublicBackground(root, profile) {
    if (!root) return;
    var mode = normalizeBackgroundMode(
      profile && profile.backgroundMode,
      profile && profile.backgroundCollage,
      profile && profile.backgroundHtml
    );
    var collageStage = root.querySelector("[data-tower-collage-stage]");
    if (mode === "solid") {
      clearCollageStage(root);
      clearBgHtmlStage(root);
      if (collageStage) collageStage.hidden = true;
    } else if (mode === "html") {
      clearCollageStage(root);
      if (collageStage) collageStage.hidden = true;
      renderBgHtmlStage(root, profile && profile.backgroundHtml);
    } else {
      /* collage */
      clearBgHtmlStage(root);
      if (collageStage) collageStage.hidden = false;
      renderCollageStage(root, profile);
    }
  }

  function getBadgePinLayout(p) {
    if (!p.badgePinLayout || typeof p.badgePinLayout !== "object") {
      p.badgePinLayout = {};
    }
    return p.badgePinLayout;
  }

  /** Default badge pin dock — offset from badges sticker so pins do not stack on friend pins. */
  function defaultBadgePinPos(p, index) {
    var layout = getWidgetLayout(p) || DEFAULT_WIDGET_LAYOUT;
    var badges = (layout && layout.badges) || DEFAULT_WIDGET_LAYOUT.badges;
    var baseX = typeof badges.x === "number" ? badges.x : DEFAULT_WIDGET_LAYOUT.badges.x;
    var baseY = typeof badges.y === "number" ? badges.y : DEFAULT_WIDGET_LAYOUT.badges.y;
    var col = index % 4;
    var row = Math.floor(index / 4);
    return {
      x: Math.max(0, Math.min(88, baseX + 22 + col * 10)),
      y: Math.max(0, Math.min(88, baseY + 10 + row * 14)),
      z: 14 + index,
      tilt: (index % 2 === 0 ? -4 : 3) + (index % 3) - 1,
    };
  }

  function ensureBadgePinPositions(p, badgeIds) {
    var pinLayout = getBadgePinLayout(p);
    var changed = false;
    badgeIds.forEach(function (id, index) {
      var pos = pinLayout[id];
      if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
        pinLayout[id] = defaultBadgePinPos(p, index);
        changed = true;
      }
    });
    p.badgePinLayout = pinLayout;
    return changed;
  }

  function applyBadgePinPosition(pin, pos) {
    applyFriendPinPosition(pin, pos);
  }

  function collectVisibleBadgePins(profile) {
    var items = [];
    if (isFounderOwner(profile)) {
      if (isBadgeVisible(profile, "founder-cap")) {
        items.push({
          id: "founder-cap",
          title: "Founder",
          caption: "Founder",
          imageUrl: "assets/badges/founder-bottle-cap.png",
          alt: "Founder — 1950s soda bottle cap badge",
        });
      }
      if (isBadgeVisible(profile, "founder-patch")) {
        items.push({
          id: "founder-patch",
          title: "Founder patch",
          caption: "Founder patch",
          imageUrl: "assets/badges/founder-patch.png",
          alt: "Founder — embroidered vest patch",
        });
      }
    }
    var list = (profile && profile.awardedBadges) || [];
    list.forEach(function (badge) {
      if (!badge || badge.kind === "founder") return;
      if (!badge.id || !isBadgeVisible(profile, badge.id)) return;
      var caption = badge.title || "Award";
      items.push({
        id: badge.id,
        title: badge.title || "Award",
        caption: caption,
        imageUrl: badge.imageUrl || "assets/badges/award-peer.svg",
        alt:
          (badge.title || "Award") +
          (badge.fromName ? " from " + badge.fromName : ""),
        tip:
          (badge.title || "Award") +
          (badge.subtitle ? " · " + badge.subtitle : "") +
          (badge.fromName ? " — from " + badge.fromName : ""),
      });
    });
    return items;
  }

  function setBadgeDisplayStatus(root, msg) {
    var st = root && root.querySelector("[data-tower-badges-status]");
    if (st) st.textContent = msg || "";
  }

  function renderBadgePins(root, profile) {
    var stage = root.querySelector("[data-tower-scrapbook]");
    if (!stage) return;
    stage.classList.add("is-sticker-stage");
    ensureStickersOnStage(stage);
    var p = profile || TowerProfileStore.get();
    var widgets = normalizePublicWidgets(p && p.publicWidgets);
    stage.querySelectorAll("[data-tower-badge-pin]").forEach(function (el) {
      el.remove();
    });
    if (!widgets.badges) return;

    var items = collectVisibleBadgePins(p);
    var ids = items.map(function (it) { return it.id; });
    if (ensureBadgePinPositions(p, ids)) {
      TowerProfileStore.save(p);
    }
    var pinLayout = getBadgePinLayout(p);
    var owner = isTowerOwner(p);
    var onPublic = root.getAttribute("data-tower-side") === "public";

    items.forEach(function (item) {
      var pos = pinLayout[item.id];
      if (!pos) return;
      var pin = document.createElement("figure");
      pin.className = "tower-badge-pin";
      pin.setAttribute("data-tower-badge-pin", item.id);
      pin.title = item.tip || item.title || item.caption;
      var img = document.createElement("img");
      img.className = "tower-badge-pin-img";
      img.src = item.imageUrl;
      img.width = 72;
      img.height = 72;
      img.alt = item.alt || item.title || "Badge";
      img.draggable = false;
      pin.appendChild(img);
      var cap = document.createElement("figcaption");
      cap.className = "tower-badge-pin-caption";
      cap.textContent = item.caption || item.title || "Badge";
      pin.appendChild(cap);
      applyBadgePinPosition(pin, pos);
      pin.classList.toggle("is-arrangeable", !!(owner && onPublic));
      stage.appendChild(pin);
    });
  }

  function renderAwardedBadgeShelf(root, profile) {
    /* Clustered shelf retired — visible badges render as scrapbook pin widgets. */
    var shelfStage = root.querySelector("[data-tower-badge-stage]");
    if (shelfStage) {
      shelfStage.querySelectorAll("[data-awarded-badge], [data-founder-badge]").forEach(function (n) {
        n.remove();
      });
      shelfStage.innerHTML = "";
    }
    renderBadgePins(root, profile || TowerProfileStore.get());
  }

  function setBadgeVisibility(root, badgeId, on) {
    if (!badgeId) return;
    var p = TowerProfileStore.get();
    if (!p.badgeVisibility || typeof p.badgeVisibility !== "object") {
      p.badgeVisibility = {};
    }
    p.badgeVisibility[badgeId] = !!on;
    if (!TowerProfileStore.save(p)) {
      setBadgeDisplayStatus(root, "Could not save badge display.");
      return;
    }
    renderAwardedBadgeShelf(root, p);
    syncBadgeVisibilityUi(root, p);
    setBadgeDisplayStatus(root, "Badge display saved");
  }

  function generateYearbookBadge(root, templateId) {
    var defs = getYearbookDemoDefs();
    var tmpl = null;
    defs.forEach(function (b) {
      if (b && b.id === templateId) tmpl = b;
    });
    if (!tmpl) return;
    var p = TowerProfileStore.get();
    if (!Array.isArray(p.awardedBadges)) p.awardedBadges = [];
    var exists = p.awardedBadges.some(function (b) {
      return b && b.id === tmpl.id;
    });
    if (exists) return;
    var copy = JSON.parse(JSON.stringify(tmpl));
    copy.awardedAt = new Date().toISOString();
    p.awardedBadges.push(copy);
    if (!p.badgeVisibility || typeof p.badgeVisibility !== "object") {
      p.badgeVisibility = {};
    }
    p.badgeVisibility[copy.id] = true;
    if (!TowerProfileStore.save(p)) {
      setBadgeDisplayStatus(root, "Could not save badge display.");
      return;
    }
    renderAwardedBadgeShelf(root, p);
    syncBadgeVisibilityUi(root, p);
    setBadgeDisplayStatus(root, "Badge display saved");
  }

  function syncBadgeVisibilityUi(root, profile) {
    var box = root.querySelector("[data-tower-badge-visibility]");
    if (!box) return;
    profile = profile || TowerProfileStore.get();
    if (!profile.badgeVisibility || typeof profile.badgeVisibility !== "object") {
      normalizeBadgeVisibility(profile);
    }
    box.innerHTML = "";

    function addCheck(id, label, checked) {
      var lab = document.createElement("label");
      lab.className = "tower-public-widget-check tower-badge-vis-check";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.setAttribute("data-tower-badge-vis", id);
      cb.checked = !!checked;
      var span = document.createElement("span");
      span.textContent = label;
      lab.appendChild(cb);
      lab.appendChild(span);
      box.appendChild(lab);
    }

    if (isFounderOwner(profile)) {
      addCheck("founder-cap", "Founder", isBadgeVisible(profile, "founder-cap"));
      addCheck("founder-patch", "Founder patch", isBadgeVisible(profile, "founder-patch"));
    }

    var list = profile.awardedBadges || [];
    list.forEach(function (badge) {
      if (!badge || !badge.id || badge.kind === "founder") return;
      var label = (badge.title || "Badge") + (badge.fromName ? " · from " + badge.fromName : "");
      addCheck(badge.id, label, isBadgeVisible(profile, badge.id));
    });

    var genWrap = document.createElement("div");
    genWrap.className = "tower-badge-generate";
    var genTitle = document.createElement("p");
    genTitle.className = "tower-badge-generate-label";
    genTitle.textContent = "Generate badge";
    var genHint = document.createElement("span");
    genHint.className = "form-hint";
    genHint.textContent = "Add a yearbook-style pin as a public pin widget (does not gift to others).";
    genWrap.appendChild(genTitle);
    genWrap.appendChild(genHint);
    var chips = document.createElement("div");
    chips.className = "tower-badge-generate-chips";
    var owned = {};
    list.forEach(function (b) {
      if (b && b.id) owned[b.id] = true;
    });
    var available = 0;
    getYearbookDemoDefs().forEach(function (def) {
      if (!def || !def.id || owned[def.id]) return;
      available++;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tower-badge-generate-chip";
      btn.setAttribute("data-tower-generate-badge", def.id);
      btn.textContent = def.title || def.id;
      btn.title = "Generate " + (def.title || "badge") + " as a public pin widget";
      chips.appendChild(btn);
    });
    if (!available) {
      var none = document.createElement("span");
      none.className = "form-hint";
      none.textContent = "You already own every yearbook template.";
      chips.appendChild(none);
    }
    genWrap.appendChild(chips);
    box.appendChild(genWrap);

    if (!box.__cognationBadgeVisBound) {
      box.__cognationBadgeVisBound = true;
      box.addEventListener("change", function (ev) {
        var cb = ev.target && ev.target.closest("[data-tower-badge-vis]");
        if (!cb || !box.contains(cb)) return;
        var id = cb.getAttribute("data-tower-badge-vis");
        setBadgeVisibility(root, id, !!cb.checked);
      });
      box.addEventListener("click", function (ev) {
        var btn = ev.target && ev.target.closest("[data-tower-generate-badge]");
        if (!btn || !box.contains(btn)) return;
        ev.preventDefault();
        generateYearbookBadge(root, btn.getAttribute("data-tower-generate-badge"));
      });
    }
  }


  function normalizeDisplayNameSize(v) {
    var n = parseInt(v, 10);
    if (isNaN(n)) n = 28;
    return Math.max(14, Math.min(200, n));
  }

  function applyDisplayNameSize(root, px) {
    px = normalizeDisplayNameSize(px);
    var wrap = root.querySelector("[data-tower-profile-name-wrap]") || root.querySelector("[data-tower-profile-name]");
    var nameEl = root.querySelector("[data-tower-profile-name]");
    var sticker = root.querySelector('[data-tower-widget="identity"]');
    if (nameEl) {
      nameEl.style.fontSize = px + "px";
      nameEl.setAttribute("data-name-size", String(px));
    }
    if (wrap && wrap !== nameEl) {
      wrap.style.setProperty("--tower-name-size", px + "px");
      wrap.setAttribute("data-name-size", String(px));
    }
    if (sticker) sticker.style.setProperty("--tower-name-size", px + "px");
    var range = root.querySelector("[data-tower-name-size]");
    if (range && document.activeElement !== range) range.value = String(px);
    return px;
  }

  function initDisplayNameResize(root) {
    var handle = root.querySelector("[data-tower-name-resize]");
    var nameEl = root.querySelector("[data-tower-profile-name]");
    if (!handle || !nameEl || handle.__cognationNameResizeBound) return;
    handle.__cognationNameResizeBound = true;
    handle.addEventListener("pointerdown", function (ev) {
      if (!isTowerOwner(TowerProfileStore.get())) return;
      ev.preventDefault();
      ev.stopPropagation();
      var startX = ev.clientX;
      var startY = ev.clientY;
      var startSize = normalizeDisplayNameSize(
        nameEl.getAttribute("data-name-size") ||
          parseFloat(getComputedStyle(nameEl).fontSize) ||
          28
      );
      function onMove(e) {
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        var delta = (dx + dy) / 2;
        applyDisplayNameSize(root, startSize + delta);
      }
      function onUp() {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        var p = TowerProfileStore.get();
        p.displayNameSize = normalizeDisplayNameSize(
          nameEl.getAttribute("data-name-size") || startSize
        );
        TowerProfileStore.save(p);
      }
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    });

    var range = root.querySelector("[data-tower-name-size]");
    if (range && !range.__cognationNameSizeBound) {
      range.__cognationNameSizeBound = true;
      range.addEventListener("input", function () {
        applyDisplayNameSize(root, range.value);
      });
      range.addEventListener("change", function () {
        var p = TowerProfileStore.get();
        p.displayNameSize = normalizeDisplayNameSize(range.value);
        TowerProfileStore.save(p);
        applyDisplayNameSize(root, p.displayNameSize);
      });
    }
  }

  function applyAvatarFrameScale(root, scale) {
    scale = normalizeAvatarFrameScale(scale);
    var wrap = root.querySelector("[data-tower-avatar-frame]");
    if (wrap) {
      wrap.style.setProperty("--tower-avatar-frame-scale", String(scale));
      wrap.setAttribute("data-avatar-frame-scale", String(scale));
    }
    return scale;
  }

  function initAvatarFrameResize(root) {
    var handle = root.querySelector("[data-tower-avatar-resize]");
    var wrap = root.querySelector("[data-tower-avatar-frame]");
    if (!handle || !wrap || handle.__cognationAvatarResizeBound) return;
    handle.__cognationAvatarResizeBound = true;
    handle.addEventListener("pointerdown", function (ev) {
      if (!isTowerOwner(TowerProfileStore.get())) return;
      ev.preventDefault();
      ev.stopPropagation();
      var startX = ev.clientX;
      var startY = ev.clientY;
      var startScale = normalizeAvatarFrameScale(
        wrap.getAttribute("data-avatar-frame-scale") ||
          getComputedStyle(wrap).getPropertyValue("--tower-avatar-frame-scale") ||
          1
      );
      function onMove(e) {
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        var delta = (dx + dy) / 180;
        var next = applyAvatarFrameScale(root, startScale + delta);
        wrap.setAttribute("data-avatar-frame-scale", String(next));
      }
      function onUp() {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        var p = TowerProfileStore.get();
        p.avatarFrameScale = normalizeAvatarFrameScale(
          wrap.getAttribute("data-avatar-frame-scale") || 1
        );
        TowerProfileStore.save(p);
      }
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    });
  }

  var VIEWER_MUSIC_OFF_KEY = "cognation.tower.viewerMusicOff.v1";

  function viewerWantsMusicOff() {
    try {
      return sessionStorage.getItem(VIEWER_MUSIC_OFF_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setViewerMusicOff(off) {
    try {
      sessionStorage.setItem(VIEWER_MUSIC_OFF_KEY, off ? "1" : "0");
    } catch (e) {}
  }

  var SOCIAL_NETWORKS = [
    { id: "x", label: "X", short: "X" },
    { id: "meta", label: "Meta", short: "Meta" },
    { id: "instagram", label: "Instagram", short: "IG" },
    { id: "youtube", label: "YouTube", short: "YT" },
    { id: "tiktok", label: "TikTok", short: "TT" },
    { id: "linkedin", label: "LinkedIn", short: "in" },
  ];

  function safeHttpUrl(raw) {
    var u = String(raw || "").trim();
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    try {
      var parsed = new URL(u);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
      return parsed.href;
    } catch (e) {
      return "";
    }
  }

  function normalizeHandle(raw) {
    return String(raw || "")
      .trim()
      .replace(/^@+/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 32);
  }

  function formatSongLine(p) {
    var title = (p.musicTitle || "").trim() || "Untitled";
    var artist = (p.musicArtist || "").trim();
    return artist ? title + " — " + artist : title;
  }

  function parseYoutubeVideoId(raw) {
    var href = safeHttpUrl(raw);
    if (!href) return "";
    try {
      var u = new URL(href);
      var host = (u.hostname || "").replace(/^www\./i, "").toLowerCase();
      if (host === "youtu.be") {
        var shortId = (u.pathname || "").split("/").filter(Boolean)[0] || "";
        shortId = shortId.split("?")[0];
        return /^[\w-]{11}$/.test(shortId) ? shortId : "";
      }
      if (
        host === "youtube.com" ||
        host === "m.youtube.com" ||
        host === "music.youtube.com" ||
        host === "youtube-nocookie.com"
      ) {
        var v = u.searchParams.get("v");
        if (v && /^[\w-]{11}$/.test(v)) return v;
        var parts = (u.pathname || "").split("/").filter(Boolean);
        if (
          parts.length >= 2 &&
          (parts[0] === "embed" ||
            parts[0] === "shorts" ||
            parts[0] === "live" ||
            parts[0] === "v")
        ) {
          var pathId = parts[1].split("?")[0];
          return /^[\w-]{11}$/.test(pathId) ? pathId : "";
        }
      }
    } catch (e) {}
    return "";
  }

  function youtubeEmbedSrc(videoId, muted) {
    var q =
      "enablejsapi=1&playsinline=1&rel=0&modestbranding=1&autoplay=1&mute=" +
      (muted ? "1" : "0");
    return "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId) + "?" + q;
  }

  function postYoutubeCommand(iframe, func) {
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: func, args: [] }),
        "*"
      );
    } catch (e) {}
  }

  function clearTowerAudio(audio) {
    if (!audio) return;
    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch (e) {}
  }

  function clearYoutubeEmbed(root) {
    var yt = root.querySelector("[data-tower-youtube]");
    var frame = root.querySelector("[data-tower-youtube-frame]");
    if (frame) frame.innerHTML = "";
    if (yt) yt.hidden = true;
  }

  function ensureYoutubeIframe(root, videoId, muted) {
    var yt = root.querySelector("[data-tower-youtube]");
    var frame = root.querySelector("[data-tower-youtube-frame]");
    if (!yt || !frame) return null;
    yt.hidden = false;
    var src = youtubeEmbedSrc(videoId, muted);
    var iframe = frame.querySelector("iframe");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.setAttribute("title", "YouTube favorite song");
      iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      iframe.loading = "lazy";
      frame.appendChild(iframe);
    }
    if (iframe.getAttribute("src") !== src) iframe.src = src;
    return iframe;
  }

  function applyMusicSkin(root, skin) {
    skin = skin || "classic";
    var wrap = root.querySelector("[data-tower-music]");
    if (wrap) wrap.setAttribute("data-music-skin", skin);
    root.querySelectorAll("[data-music-face]").forEach(function (el) {
      el.hidden = el.getAttribute("data-music-face") !== skin;
    });
    var side = root.querySelector("[data-tower-radio-side]");
    if (side) {
      side.hidden = skin !== "radio";
      side.setAttribute("aria-hidden", skin === "radio" ? "false" : "true");
    }
    document.body.classList.toggle("tower-radio-scroll", skin === "radio");
  }

  function hideMusicSkins(root) {
    root.querySelectorAll("[data-music-face]").forEach(function (el) {
      el.hidden = true;
    });
    var side = root.querySelector("[data-tower-radio-side]");
    if (side) {
      side.hidden = true;
      side.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("tower-radio-scroll");
  }

  function setAllMusicLabels(root, text) {
    root.querySelectorAll("[data-tower-music-label]").forEach(function (el) {
      el.textContent = text;
    });
    var sideText = root.querySelector("[data-tower-radio-side-text]");
    if (sideText) sideText.textContent = "♪ " + text + "   ·   ";
  }

  function syncMusicToggleUi(root, off) {
    root.querySelectorAll("[data-tower-music-toggle]").forEach(function (t) {
      t.setAttribute("aria-pressed", off ? "false" : "true");
      if (t.textContent === "♪" || t.getAttribute("data-music-face-btn")) {
        /* keep glyph */
      } else {
        t.textContent = off ? "Sound off" : "Sound on";
      }
    });
    var disc = root.querySelector("[data-tower-cd-disc]");
    if (disc) disc.classList.toggle("is-spinning", !off);
  }

  function bindMusicToggles(root, media) {
    media = media || {};
    root.querySelectorAll("[data-tower-music-toggle]").forEach(function (toggle) {
      toggle.onclick = function () {
        var currentlyOff = viewerWantsMusicOff();
        setViewerMusicOff(!currentlyOff);
        var off = !currentlyOff;
        syncMusicToggleUi(root, off);
        if (off) {
          if (media.audio) media.audio.pause();
          if (media.youtubeIframe) {
            postYoutubeCommand(media.youtubeIframe, "mute");
            postYoutubeCommand(media.youtubeIframe, "pauseVideo");
          }
        } else if (media.youtubeIframe) {
          postYoutubeCommand(media.youtubeIframe, "unMute");
          postYoutubeCommand(media.youtubeIframe, "playVideo");
        } else if (media.audio) {
          media.audio.muted = false;
          var playPromise = media.audio.play();
          if (playPromise && playPromise.catch) {
            playPromise.catch(function () {
              media.audio.muted = true;
              media.audio.play().catch(function () {});
            });
          }
        }
      };
    });
  }


  function applyYoutubeWidth(root, widthPx) {
    var w = Math.max(180, Math.min(720, parseInt(widthPx, 10) || 320));
    var wrap = root.querySelector("[data-tower-music]");
    if (wrap) wrap.style.setProperty("--tower-youtube-width", w + "px");
    return w;
  }

  function initYoutubeResize(root) {
    var handle = root.querySelector("[data-tower-youtube-resize]");
    var wrap = root.querySelector("[data-tower-music]");
    if (!handle || !wrap || handle.__cognationYtResizeBound) return;
    handle.__cognationYtResizeBound = true;
    handle.addEventListener("pointerdown", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var startX = ev.clientX;
      var startW = wrap.getBoundingClientRect().width;
      function onMove(e) {
        var dx = e.clientX - startX;
        var next = applyYoutubeWidth(root, startW + dx);
        wrap.setAttribute("data-yt-width", String(next));
      }
      function onUp() {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        var p = TowerProfileStore.get();
        p.musicYoutubeWidth = parseInt(wrap.getAttribute("data-yt-width") || "320", 10);
        TowerProfileStore.save(p);
      }
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    });
  }

  function initTowerMusic(root, p) {
    var wrap = root.querySelector("[data-tower-music]");
    var audio = root.querySelector("[data-tower-audio]");
    if (!wrap || !audio) return;

    var url = (p.musicUrl || "").trim();
    var enabled = p.musicEnabled !== false && !!url;
    var skin = p.musicSkin || "classic";
    var ytId = parseYoutubeVideoId(url);
    setAllMusicLabels(root, formatSongLine(p));

    if (!enabled) {
      wrap.hidden = true;
      wrap.removeAttribute("data-music-mode");
      hideMusicSkins(root);
      clearYoutubeEmbed(root);
      clearTowerAudio(audio);
      return;
    }

    wrap.hidden = false;
    var off = viewerWantsMusicOff();

    if (ytId) {
      wrap.setAttribute("data-music-mode", "youtube");
      hideMusicSkins(root);
      clearTowerAudio(audio);
      applyYoutubeWidth(root, p.musicYoutubeWidth || 320);
      initYoutubeResize(root);
      /* Autoplay policies usually need mute=1 first; unmute via postMessage if allowed. */
      var iframe = ensureYoutubeIframe(root, ytId, true);
      if (!off && iframe) {
        iframe.addEventListener(
          "load",
          function onYtLoad() {
            iframe.removeEventListener("load", onYtLoad);
            if (viewerWantsMusicOff()) return;
            postYoutubeCommand(iframe, "unMute");
            postYoutubeCommand(iframe, "playVideo");
          },
          { once: true }
        );
      } else if (off && iframe) {
        postYoutubeCommand(iframe, "mute");
        postYoutubeCommand(iframe, "pauseVideo");
      }
      bindMusicToggles(root, { youtubeIframe: iframe });
      syncMusicToggleUi(root, off);
      return;
    }

    wrap.setAttribute("data-music-mode", "audio");
    clearYoutubeEmbed(root);
    applyMusicSkin(root, skin);
    if (audio.getAttribute("src") !== url) audio.src = url;
    bindMusicToggles(root, { audio: audio });
    syncMusicToggleUi(root, off);

    if (off) {
      audio.pause();
      return;
    }

    audio.muted = false;
    var attempt = audio.play();
    if (attempt && attempt.catch) {
      attempt.catch(function () {
        audio.muted = true;
        audio.play().catch(function () {});
        root.querySelectorAll("[data-tower-music-toggle]").forEach(function (t) {
          if (t.textContent !== "♪") t.textContent = "Tap for sound";
        });
      });
    }
  }




  function youtubeVideoEmbedSrc(videoId) {
    /* Public video sticker: no autoplay / no auto-unmute (user clicks play in embed). */
    var q = "enablejsapi=1&playsinline=1&rel=0&modestbranding=1&autoplay=0";
    return "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId) + "?" + q;
  }

  function clearTowerVideoEmbed(root) {
    var frame = root.querySelector("[data-tower-video-frame]");
    if (frame) {
      Array.prototype.slice.call(frame.querySelectorAll("iframe")).forEach(function (el) {
        el.remove();
      });
    }
  }

  function ensureTowerVideoIframe(root, videoId, title) {
    var frame = root.querySelector("[data-tower-video-frame]");
    if (!frame) return null;
    var src = youtubeVideoEmbedSrc(videoId);
    var iframe = frame.querySelector("iframe");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      iframe.loading = "lazy";
      /* Keep resize handle after iframe */
      var handle = frame.querySelector("[data-tower-video-resize]");
      if (handle) frame.insertBefore(iframe, handle);
      else frame.appendChild(iframe);
    }
    iframe.setAttribute("title", title || "YouTube video");
    if (iframe.getAttribute("src") !== src) iframe.src = src;
    return iframe;
  }

  function applyVideoWidth(root, widthPx) {
    var w = Math.max(200, Math.min(900, parseInt(widthPx, 10) || 360));
    var wrap = root.querySelector("[data-tower-video]");
    if (wrap) wrap.style.setProperty("--tower-video-width", w + "px");
    return w;
  }

  function initVideoResize(root) {
    var handle = root.querySelector("[data-tower-video-resize]");
    var wrap = root.querySelector("[data-tower-video]");
    if (!handle || !wrap || handle.__cognationVideoResizeBound) return;
    handle.__cognationVideoResizeBound = true;
    handle.addEventListener("pointerdown", function (ev) {
      if (!isTowerOwner(TowerProfileStore.get())) return;
      ev.preventDefault();
      ev.stopPropagation();
      var startX = ev.clientX;
      var startW = wrap.getBoundingClientRect().width;
      function onMove(e) {
        var next = applyVideoWidth(root, startW + (e.clientX - startX));
        wrap.setAttribute("data-video-width", String(next));
      }
      function onUp() {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        var p = TowerProfileStore.get();
        p.videoWidth = parseInt(wrap.getAttribute("data-video-width") || "360", 10);
        p.videoWidth = Math.max(200, Math.min(900, p.videoWidth || 360));
        TowerProfileStore.save(p);
      }
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    });
  }

  function bindVideoInlineUrl(root) {
    var inline = root.querySelector("[data-tower-video-url-inline]");
    if (!inline || inline.__cognationVideoInlineBound) return;
    inline.__cognationVideoInlineBound = true;

    function commitInline() {
      if (!isTowerOwner(TowerProfileStore.get())) return;
      var p = TowerProfileStore.get();
      var next = (inline.value || "").trim().slice(0, 500);
      p.videoUrl = next;
      if (p.videoEnabled == null) p.videoEnabled = true;
      TowerProfileStore.save(p);
      var formUrl = root.querySelector("[data-tower-video-url]");
      if (formUrl && document.activeElement !== formUrl) formUrl.value = next;
      initTowerVideo(root, p);
    }

    inline.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        commitInline();
        inline.blur();
      }
    });
    inline.addEventListener("blur", function () {
      commitInline();
    });
  }

  function initTowerVideo(root, p) {
    /* ONE_YOUTUBE_PLAYER_ONLY — radio/music owns the single embed */
    var wrap = root.querySelector("[data-tower-video]");
    if (wrap) {
      wrap.hidden = true;
      clearTowerVideoEmbed(root);
    }
    var sticker = root.querySelector('[data-tower-widget="video"]');
    if (sticker) {
      sticker.hidden = true;
      sticker.classList.add("is-widget-off");
    }
    return;
    var wrapUnused = root.querySelector("[data-tower-video]");
    var sticker = root.querySelector('[data-tower-widget="video"]');
    if (!wrap) return;

    var widgets = normalizePublicWidgets(p && p.publicWidgets);
    var url = (p.videoUrl || "").trim();
    var enabled = p.videoEnabled !== false;
    var ytId = parseYoutubeVideoId(url);
    var title = (p.videoTitle || "").trim();
    var empty = wrap.querySelector("[data-tower-video-empty]");
    var caption = wrap.querySelector("[data-tower-video-caption]");
    var frame = wrap.querySelector("[data-tower-video-frame]");
    var inlineWrap = wrap.querySelector("[data-tower-video-inline-wrap]");
    var inline = wrap.querySelector("[data-tower-video-url-inline]");
    var owner = isTowerOwner(p);
    var onPublic = root.getAttribute("data-tower-side") === "public";

    if (inline && document.activeElement !== inline) {
      inline.value = url;
    }

    if (inlineWrap) {
      inlineWrap.hidden = !(owner && onPublic);
    }

    if (!widgets.video || !enabled) {
      wrap.hidden = true;
      clearTowerVideoEmbed(root);
      if (empty) empty.hidden = true;
      if (caption) {
        caption.hidden = true;
        caption.textContent = "";
      }
      if (frame) frame.hidden = true;
      return;
    }

    wrap.hidden = false;
    applyVideoWidth(root, p.videoWidth || 360);
    initVideoResize(root);
    bindVideoInlineUrl(root);

    if (!ytId) {
      clearTowerVideoEmbed(root);
      if (frame) frame.hidden = true;
      if (caption) {
        caption.hidden = true;
        caption.textContent = "";
      }
      /* Owners keep the radio URL box + empty hint; viewers see nothing until a URL exists. */
      if (!owner) {
        wrap.hidden = true;
        if (empty) empty.hidden = true;
        return;
      }
      if (empty) empty.hidden = false;
      return;
    }

    if (frame) frame.hidden = false;
    if (empty) empty.hidden = true;
    ensureTowerVideoIframe(root, ytId, title || "YouTube video");
    if (caption) {
      if (title) {
        caption.hidden = false;
        caption.textContent = title;
      } else {
        caption.hidden = true;
        caption.textContent = "";
      }
    }
  }

  function renderSocialLinks(root, p) {
    var box = root.querySelector("[data-tower-social-links]");
    if (!box) return;
    box.innerHTML = "";
    var links = (p && p.socialLinks) || {};
    var any = false;
    SOCIAL_NETWORKS.forEach(function (net) {
      var href = safeHttpUrl(links[net.id] || "");
      var input = root.querySelector('[data-tower-social="' + net.id + '"]');
      if (input && document.activeElement !== input) input.value = links[net.id] || "";
      if (!href) return;
      any = true;
      var a = document.createElement("a");
      a.className = "tower-social-btn tower-social-btn--" + net.id;
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = net.label;
      a.setAttribute("aria-label", net.label);
      a.textContent = net.short;
      box.appendChild(a);
    });
    box.hidden = !any;
  }

  function getFriendPinLayout(p) {
    if (!p.friendPinLayout || typeof p.friendPinLayout !== "object") {
      p.friendPinLayout = {};
    }
    return p.friendPinLayout;
  }

  function defaultFriendPinPos(p, index) {
    var layout = getWidgetLayout(p) || DEFAULT_WIDGET_LAYOUT;
    var friends = (layout && layout.friends) || DEFAULT_WIDGET_LAYOUT.friends;
    var baseX = typeof friends.x === "number" ? friends.x : DEFAULT_WIDGET_LAYOUT.friends.x;
    var baseY = typeof friends.y === "number" ? friends.y : DEFAULT_WIDGET_LAYOUT.friends.y;
    var col = index % 4;
    var row = Math.floor(index / 4);
    return {
      x: Math.max(0, Math.min(88, baseX + 18 + col * 9)),
      y: Math.max(0, Math.min(88, baseY + row * 12)),
      z: 12 + index,
      tilt: (index % 2 === 0 ? -3 : 2) + (index % 3),
    };
  }

  /** Assign dock positions only for newly featured friends missing a saved layout. Never overwrite. */
  function ensureFriendPinPositions(p, selectedIds) {
    var pinLayout = getFriendPinLayout(p);
    var changed = false;
    selectedIds.forEach(function (id, index) {
      var pos = pinLayout[id];
      if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
        pinLayout[id] = defaultFriendPinPos(p, index);
        changed = true;
      }
    });
    p.friendPinLayout = pinLayout;
    return changed;
  }

  function applyFriendPinPosition(pin, pos) {
    if (!pin || !pos) return;
    var x = typeof pos.x === "number" ? pos.x : 0;
    var y = typeof pos.y === "number" ? pos.y : 0;
    var z = typeof pos.z === "number" ? pos.z : 12;
    var tilt = typeof pos.tilt === "number" ? pos.tilt : 0;
    pin.style.setProperty("--sticker-x", x + "%");
    pin.style.setProperty("--sticker-y", y + "%");
    pin.style.setProperty("--sticker-z", String(z));
    pin.style.setProperty("--sticker-tilt", tilt + "deg");
    pin.setAttribute("data-sticker-x", String(x));
    pin.setAttribute("data-sticker-y", String(y));
    pin.setAttribute("data-sticker-z", String(z));
  }

  function renderFriendPins(root, p) {
    var stage = root.querySelector("[data-tower-scrapbook]");
    if (!stage) return;
    stage.classList.add("is-sticker-stage");
    ensureStickersOnStage(stage);
    var widgets = normalizePublicWidgets(p && p.publicWidgets);
    if (!widgets.friends) {
      stage.querySelectorAll("[data-tower-friend-pin]").forEach(function (el) {
        el.remove();
      });
      return;
    }
    var max = parseInt(p.friendsDisplayCount || 3, 10);
    if ([3, 6, 8].indexOf(max) === -1) max = 3;
    var selected = (p.featuredFriendIds || []).slice(0, max);
    if (ensureFriendPinPositions(p, selected)) {
      TowerProfileStore.save(p);
    }
    var pinLayout = getFriendPinLayout(p);

    stage.querySelectorAll("[data-tower-friend-pin]").forEach(function (el) {
      var id = el.getAttribute("data-tower-friend-pin");
      if (selected.indexOf(id) < 0) el.remove();
    });

    selected.forEach(function (id) {
      var friend = DEMO_FRIENDS.filter(function (x) { return x.id === id; })[0];
      if (!friend) return;
      var pos = pinLayout[id];
      if (!pos) return;
      var pin = stage.querySelector('[data-tower-friend-pin="' + id + '"]');
      if (!pin) {
        pin = document.createElement("a");
        pin.className = "tower-friend-pin";
        pin.setAttribute("data-tower-friend-pin", id);
        pin.href = "#tower-profile-" + id;
        pin.setAttribute("aria-label", friend.name);
        var av = document.createElement("span");
        av.className = "tower-friend-pin-avatar";
        av.setAttribute("aria-hidden", "true");
        av.textContent = initials(friend.name);
        var nm = document.createElement("span");
        nm.className = "tower-friend-pin-name";
        nm.textContent = friend.name;
        pin.appendChild(av);
        pin.appendChild(nm);
        pin.addEventListener("click", function (ev) {
          if (pin.__cognationDidDrag) {
            ev.preventDefault();
            pin.__cognationDidDrag = false;
          }
        });
        stage.appendChild(pin);
      } else {
        pin.href = "#tower-profile-" + id;
        pin.setAttribute("aria-label", friend.name);
        var avEl = pin.querySelector(".tower-friend-pin-avatar");
        var nmEl = pin.querySelector(".tower-friend-pin-name");
        if (avEl) avEl.textContent = initials(friend.name);
        if (nmEl) nmEl.textContent = friend.name;
      }
      /* Apply saved layout only — never invent here */
      applyFriendPinPosition(pin, pos);
      var owner = isTowerOwner(p);
      var onPublic = root.getAttribute("data-tower-side") === "public";
      pin.classList.toggle("is-arrangeable", !!(owner && onPublic));
      pin.hidden = false;
      pin.classList.remove("is-widget-off");
    });
  }

  function renderFriendsPicker(root, p) {
    var chips = root.querySelector("[data-tower-friends-chips]");
    var countSel = root.querySelector("[data-tower-friends-count]");
    var publicEl = root.querySelector("[data-tower-friends-public]");
    if (!chips) return;
    var max = parseInt((countSel && countSel.value) || p.friendsDisplayCount || 3, 10);
    if ([3, 6, 8].indexOf(max) === -1) max = 3;
    var selected = (p.featuredFriendIds || []).slice(0, max);
    chips.innerHTML = "";

    var selectedFriends = [];
    selected.forEach(function (id) {
      var f = DEMO_FRIENDS.filter(function (x) { return x.id === id; })[0];
      if (f) selectedFriends.push(f);
    });
    var unselectedFriends = DEMO_FRIENDS.filter(function (f) {
      return selected.indexOf(f.id) < 0;
    });
    var ordered = selectedFriends.concat(unselectedFriends);
    var chipDragFrom = null;
    var chipDidDrag = false;

    ordered.forEach(function (f) {
      var rank = selected.indexOf(f.id);
      var isOn = rank >= 0;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tower-friend-chip" + (isOn ? " is-selected" : "");
      btn.setAttribute("data-friend-id", f.id);
      btn.setAttribute("aria-pressed", isOn ? "true" : "false");
      if (isOn) {
        btn.draggable = true;
        btn.setAttribute("data-friend-rank", String(rank + 1));
        var badge = document.createElement("span");
        badge.className = "tower-friend-chip-rank";
        badge.setAttribute("aria-hidden", "true");
        badge.textContent = String(rank + 1);
        btn.appendChild(badge);
      }
      var label = document.createElement("span");
      label.className = "tower-friend-chip-label";
      label.textContent = f.name;
      btn.appendChild(label);

      btn.addEventListener("click", function () {
        if (chipDidDrag) {
          chipDidDrag = false;
          return;
        }
        var cur = TowerProfileStore.get();
        var ids = (cur.featuredFriendIds || []).slice();
        var ix = ids.indexOf(f.id);
        if (ix >= 0) ids.splice(ix, 1);
        else {
          var lim = parseInt(
            (root.querySelector("[data-tower-friends-count]") || {}).value || cur.friendsDisplayCount || 3,
            10
          );
          if ([3, 6, 8].indexOf(lim) === -1) lim = 3;
          if (ids.length >= lim) {
            ids.shift();
          }
          ids.push(f.id);
        }
        cur.featuredFriendIds = ids;
        TowerProfileStore.save(cur);
        renderFriendsPicker(root, cur);
        var stPick = root.querySelector("[data-tower-friends-status]");
        if (stPick) {
          stPick.textContent = ids.length
            ? "Selected " + ids.length + " — click Save top friends to keep on your page."
            : "None selected — click Save top friends to clear pins.";
        }
      });

      if (isOn) {
        btn.addEventListener("dragstart", function (e) {
          chipDragFrom = f.id;
          chipDidDrag = false;
          btn.classList.add("is-chip-dragging");
          try {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", f.id);
          } catch (err) {}
        });
        btn.addEventListener("dragend", function () {
          btn.classList.remove("is-chip-dragging");
          chips.querySelectorAll(".tower-friend-chip.is-drop-target").forEach(function (el) {
            el.classList.remove("is-drop-target");
          });
          chipDragFrom = null;
        });
        btn.addEventListener("dragover", function (e) {
          if (!chipDragFrom || chipDragFrom === f.id) return;
          e.preventDefault();
          btn.classList.add("is-drop-target");
          try {
            e.dataTransfer.dropEffect = "move";
          } catch (err) {}
        });
        btn.addEventListener("dragleave", function () {
          btn.classList.remove("is-drop-target");
        });
        btn.addEventListener("drop", function (e) {
          e.preventDefault();
          btn.classList.remove("is-drop-target");
          var fromId = chipDragFrom;
          try {
            fromId = e.dataTransfer.getData("text/plain") || chipDragFrom;
          } catch (err) {}
          if (!fromId || fromId === f.id) return;
          chipDidDrag = true;
          var cur = TowerProfileStore.get();
          var ids = (cur.featuredFriendIds || []).slice();
          var fromIx = ids.indexOf(fromId);
          var toIx = ids.indexOf(f.id);
          if (fromIx < 0 || toIx < 0) return;
          ids.splice(fromIx, 1);
          ids.splice(toIx, 0, fromId);
          cur.featuredFriendIds = ids;
          TowerProfileStore.save(cur);
          renderFriendsPicker(root, cur);
        });
      }

      chips.appendChild(btn);
    });

    if (publicEl) {
      publicEl.innerHTML = "";
      var heading = document.createElement("p");
      heading.className = "tower-friends-public-label";
      heading.textContent = selected.length
        ? "Top friends"
        : "Top friends · set on My feed";
      publicEl.appendChild(heading);
    }

    renderFriendPins(root, p);
  }


  function normalizeFrameId(id) {
    id = String(id || "none");
    if (id === "plain") id = "none";
    if (id === "baroque") id = "baroque-magenta";
    return FRAME_IDS.indexOf(id) >= 0 ? id : "none";
  }

  function applyCowboyHatColor(root, colorId) {
    colorId = normalizeCowboyHatColor(colorId);
    var wrap = root.querySelector("[data-tower-avatar-frame]");
    var hidden = root.querySelector("[data-tower-cowboy-color-input]");
    var fields = root.querySelector("[data-tower-cowboy-color-fields]");
    if (wrap) wrap.setAttribute("data-cowboy-hat-color", colorId);
    if (hidden) hidden.value = colorId;
    var chips = root.querySelectorAll("[data-tower-cowboy-color-chips] [data-cowboy-color]");
    chips.forEach(function (btn) {
      var on = btn.getAttribute("data-cowboy-color") === colorId;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    return colorId;
  }

  function syncCowboyColorFieldsVisibility(root, frameId) {
    var fields = root.querySelector("[data-tower-cowboy-color-fields]");
    if (!fields) return;
    var show = normalizeFrameId(frameId) === "cowboy-hat";
    fields.hidden = !show;
  }

  function applyAvatarFrame(root, frameId, cowboyColor) {
    frameId = normalizeFrameId(frameId);
    var wrap = root.querySelector("[data-tower-avatar-frame]");
    var overlay = root.querySelector("[data-tower-frame-overlay]");
    var hiddenInput = root.querySelector("[data-tower-avatar-frame-input]");
    if (wrap) wrap.setAttribute("data-tower-avatar-frame", frameId);
    if (hiddenInput) hiddenInput.value = frameId;
    var meta = AVATAR_FRAMES[frameId] || AVATAR_FRAMES.none;
    if (overlay) {
      if (meta.overlay) {
        overlay.hidden = false;
        overlay.src = meta.overlay;
      } else {
        overlay.hidden = true;
        overlay.removeAttribute("src");
      }
    }
    var chips = root.querySelectorAll("[data-tower-frame-chips] [data-frame-id]");
    chips.forEach(function (btn) {
      var on = btn.getAttribute("data-frame-id") === frameId;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    syncCowboyColorFieldsVisibility(root, frameId);
    if (cowboyColor == null) {
      var colorIn = root.querySelector("[data-tower-cowboy-color-input]");
      cowboyColor = colorIn ? colorIn.value : "tan";
    }
    applyCowboyHatColor(root, cowboyColor);
    var scaleIn = TowerProfileStore.get();
    applyAvatarFrameScale(root, scaleIn && scaleIn.avatarFrameScale);
  }

  function normalizeOrnamentId(id) {
    id = String(id || "none");
    return ORNAMENT_IDS.indexOf(id) >= 0 ? id : "none";
  }

  function normalizeOrnamentPos(pos) {
    pos = String(pos || "above").toLowerCase();
    return ORNAMENT_POS_IDS.indexOf(pos) >= 0 ? pos : "above";
  }

  function applyAvatarOrnament(root, ornamentId, pos) {
    ornamentId = normalizeOrnamentId(ornamentId);
    pos = normalizeOrnamentPos(pos);
    var stack = root.querySelector("[data-tower-avatar-ornament]");
    var img = root.querySelector("[data-tower-ornament-img]");
    var hiddenOrn = root.querySelector("[data-tower-avatar-ornament-input]");
    var hiddenPos = root.querySelector("[data-tower-avatar-ornament-pos-input]");
    if (stack) {
      stack.setAttribute("data-tower-avatar-ornament", ornamentId);
      stack.setAttribute("data-tower-avatar-ornament-pos", pos);
    }
    if (hiddenOrn) hiddenOrn.value = ornamentId;
    if (hiddenPos) hiddenPos.value = pos;
    var meta = AVATAR_ORNAMENTS[ornamentId] || AVATAR_ORNAMENTS.none;
    if (img) {
      if (meta.src) {
        img.hidden = false;
        img.src = meta.src;
        img.alt = meta.label || "";
        img.setAttribute("aria-hidden", "false");
      } else {
        img.hidden = true;
        img.removeAttribute("src");
        img.alt = "";
        img.setAttribute("aria-hidden", "true");
      }
    }
    var chips = root.querySelectorAll("[data-tower-ornament-chips] [data-ornament-id]");
    chips.forEach(function (btn) {
      var on = btn.getAttribute("data-ornament-id") === ornamentId;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var posChips = root.querySelectorAll("[data-tower-ornament-pos-chips] [data-ornament-pos]");
    var posEnabled = ornamentId !== "none";
    posChips.forEach(function (btn) {
      btn.disabled = !posEnabled;
      var on = btn.getAttribute("data-ornament-pos") === pos;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function getWidgetLayout(p) {
    var layout = (p && p.widgetLayout) || null;
    if (!layout || typeof layout !== "object") return null;
    return layout;
  }

  function applyPublicWidgets(root, p) {
    var widgets = normalizePublicWidgets(p && p.publicWidgets);
    var sloganText = p && typeof p.slogan === "string" ? p.slogan.trim() : "";
    PUBLIC_WIDGET_IDS.forEach(function (id) {
      var on = widgets[id] !== false;
      if (id === "slogan" && !sloganText) on = false;
      var el = root.querySelector('[data-tower-widget="' + id + '"]');
      if (!el) return;
      el.hidden = !on;
      el.classList.toggle("is-widget-off", !on);
      if (!on) el.classList.remove("is-widget-selected");
    });
    var avatar = root.querySelector('[data-tower-widget="avatar"]');
    if (avatar) {
      avatar.hidden = false;
      avatar.classList.remove("is-widget-off");
    }
    var stage = root.querySelector("[data-tower-scrapbook]");
    if (stage) {
      stage.querySelectorAll("[data-tower-friend-pin]").forEach(function (pin) {
        if (!widgets.friends) {
          pin.hidden = true;
          pin.classList.add("is-widget-off");
        } else {
          pin.hidden = false;
          pin.classList.remove("is-widget-off");
        }
      });
      stage.querySelectorAll("[data-tower-badge-pin]").forEach(function (pin) {
        if (!widgets.badges) {
          pin.hidden = true;
          pin.classList.add("is-widget-off");
        } else {
          pin.hidden = false;
          pin.classList.remove("is-widget-off");
        }
      });
    }
  }

  function syncPublicWidgetsForm(root, p) {
    var widgets = normalizePublicWidgets(p && p.publicWidgets);
    root.querySelectorAll("[data-tower-public-widget]").forEach(function (cb) {
      var id = cb.getAttribute("data-tower-public-widget");
      if (!id || id === "avatar") return;
      cb.checked = widgets[id] !== false;
    });
  }

  function readPublicWidgetsFromForm(root) {
    var out = normalizePublicWidgets(null);
    root.querySelectorAll("[data-tower-public-widget]").forEach(function (cb) {
      var id = cb.getAttribute("data-tower-public-widget");
      if (!id || id === "avatar") return;
      out[id] = !!cb.checked;
    });
    return out;
  }

  function setPublicWidgetVisible(root, id, on) {
    if (!id || id === "avatar" || id === "feed" || id === "messages") return;
    if (PUBLIC_WIDGET_IDS.indexOf(id) < 0) return;
    var p = TowerProfileStore.get();
    p.publicWidgets = normalizePublicWidgets(p.publicWidgets);
    p.publicWidgets[id] = !!on;
    TowerProfileStore.save(p);
    applyPublicWidgets(root, p);
    syncPublicWidgetsForm(root, p);
    if (id === "friends") {
      if (on) renderFriendPins(root, p);
      else {
        var stage = root.querySelector("[data-tower-scrapbook]");
        if (stage) {
          stage.querySelectorAll("[data-tower-friend-pin]").forEach(function (el) {
            el.remove();
          });
        }
      }
    }
    if (id === "badges") {
      if (on) renderBadgePins(root, p);
      else {
        var badgeStage = root.querySelector("[data-tower-scrapbook]");
        if (badgeStage) {
          badgeStage.querySelectorAll("[data-tower-badge-pin]").forEach(function (el) {
            el.remove();
          });
        }
      }
    }
  }

  function syncOwnerStickerHandles(root) {
    var stage = root.querySelector("[data-tower-scrapbook]");
    if (!stage) return;
    var owner = isTowerOwner(TowerProfileStore.get());
    var onPublic = root.getAttribute("data-tower-side") === "public";
    var show = owner && onPublic;
    stage.querySelectorAll("[data-tower-sticker-handle]").forEach(function (h) {
      h.hidden = !show;
    });
    stage.querySelectorAll("[data-tower-friend-pin]").forEach(function (pin) {
      pin.classList.toggle("is-arrangeable", show);
    });
    stage.querySelectorAll("[data-tower-badge-pin]").forEach(function (pin) {
      pin.classList.toggle("is-arrangeable", show);
    });
  }

    function clearWidgetSelection(stage) {
    if (!stage) return;
    stage.querySelectorAll(".is-widget-selected").forEach(function (el) {
      el.classList.remove("is-widget-selected");
    });
  }

  function ensureStickersOnStage(stage) {
    if (!stage || stage.__cognationStickersReparented) return;
    /* Lift every public sticker to be a direct child of the scrapbook canvas.
       Feed lives on the private side — never promote it onto the public stage. */
    var widgets = Array.prototype.slice.call(stage.querySelectorAll("[data-tower-widget]"));
    widgets.forEach(function (el) {
      var id = el.getAttribute("data-tower-widget");
      if (id === "feed" || id === "messages") return;
      if (el.parentNode === stage) return;
      stage.appendChild(el);
    });
    stage.__cognationStickersReparented = true;
  }

  function applyWidgetLayout(root, p) {
    var stage = root.querySelector("[data-tower-scrapbook]");
    if (!stage) return;
    stage.classList.add("is-sticker-stage");
    ensureStickersOnStage(stage);
    var layout = getWidgetLayout(p) || DEFAULT_WIDGET_LAYOUT;
    var zBase = 2;
    Object.keys(DEFAULT_WIDGET_LAYOUT).forEach(function (id) {
      if (id === "feed" || id === "messages") return;
      var el = stage.querySelector('[data-tower-widget="' + id + '"]');
      if (!el) return;
      var pos = layout[id] || DEFAULT_WIDGET_LAYOUT[id];
      var x = typeof pos.x === "number" ? pos.x : DEFAULT_WIDGET_LAYOUT[id].x;
      var y = typeof pos.y === "number" ? pos.y : DEFAULT_WIDGET_LAYOUT[id].y;
      var z = typeof pos.z === "number" ? pos.z : DEFAULT_WIDGET_LAYOUT[id].z || zBase;
      var tilt = typeof pos.tilt === "number" ? pos.tilt : DEFAULT_WIDGET_LAYOUT[id].tilt || 0;
      el.style.setProperty("--sticker-x", x + "%");
      el.style.setProperty("--sticker-y", y + "%");
      el.style.setProperty("--sticker-z", String(z));
      el.style.setProperty("--sticker-tilt", tilt + "deg");
      el.setAttribute("data-sticker-x", String(x));
      el.setAttribute("data-sticker-y", String(y));
      el.setAttribute("data-sticker-z", String(z));
    });
  }

  function collageCellCount(layoutId) {
    var meta = COLLAGE_LAYOUTS[layoutId] || COLLAGE_LAYOUTS.none;
    return meta.cells || 0;
  }

  function demoCollageCells(n) {
    var cells = [];
    for (var i = 0; i < n; i++) {
      cells.push({ color: DEMO_COLLAGE_COLORS[i % DEMO_COLLAGE_COLORS.length], url: "" });
    }
    return cells;
  }

  function renderCollageStage(root, p) {
    var stage = root.querySelector("[data-tower-collage-stage]");
    if (!stage) return;
    var bg = (p && p.backgroundCollage) || { layoutId: "none", cells: [] };
    var layoutId = bg.layoutId && COLLAGE_LAYOUTS[bg.layoutId] ? bg.layoutId : "none";
    var n = collageCellCount(layoutId);
    stage.setAttribute("data-layout", layoutId);
    stage.innerHTML = "";
    stage.hidden = !n;
    if (!n) return;
    var grid = document.createElement("div");
    grid.className = "tower-collage-grid";
    var cells = Array.isArray(bg.cells) ? bg.cells : [];
    for (var i = 0; i < n; i++) {
      var cell = cells[i] || { color: DEMO_COLLAGE_COLORS[i % DEMO_COLLAGE_COLORS.length], url: "" };
      var tile = document.createElement("div");
      tile.className = "tower-collage-tile";
      var color = cell.color || DEMO_COLLAGE_COLORS[i % DEMO_COLLAGE_COLORS.length];
      tile.style.setProperty("--tile-color", color);
      var url = cell.url ? String(cell.url).replace(/"/g, "") : "";
      if (layoutId === "polaroid-scatter") {
        var photo = document.createElement("div");
        photo.className = "tower-collage-tile-photo";
        if (url) photo.style.backgroundImage = 'url("' + url + '")';
        else photo.style.backgroundColor = color;
        tile.appendChild(photo);
      } else {
        if (url) tile.style.backgroundImage = 'url("' + url + '")';
        else tile.style.backgroundColor = color;
      }
      grid.appendChild(tile);
    }
    stage.appendChild(grid);
  }

  function syncCollageForm(root, p) {
    var bg = (p && p.backgroundCollage) || { layoutId: "none", cells: [] };
    var layoutSel = root.querySelector("[data-tower-collage-layout]");
    var cellsHost = root.querySelector("[data-tower-collage-cells]");
    if (layoutSel && document.activeElement !== layoutSel) {
      layoutSel.value = bg.layoutId || "none";
    }
    if (!cellsHost) return;
    var layoutId = layoutSel ? layoutSel.value : bg.layoutId || "none";
    var n = collageCellCount(layoutId);
    cellsHost.innerHTML = "";
    var cells = Array.isArray(bg.cells) ? bg.cells : [];
    for (var i = 0; i < n; i++) {
      var cell = cells[i] || {};
      var wrap = document.createElement("div");
      wrap.className = "tower-collage-cell-field";
      var lab = document.createElement("label");
      lab.setAttribute("for", "tower-collage-cell-" + i);
      lab.textContent = "Cell " + (i + 1) + " image URL";
      var input = document.createElement("input");
      input.id = "tower-collage-cell-" + i;
      input.type = "url";
      input.inputMode = "url";
      input.maxLength = 500;
      input.placeholder = "https://… or leave blank for pink tile";
      input.value = cell.url || "";
      input.setAttribute("data-tower-collage-cell", String(i));
      wrap.appendChild(lab);
      wrap.appendChild(input);
      cellsHost.appendChild(wrap);
    }
  }

  function readCollageFromForm(root) {
    var layoutSel = root.querySelector("[data-tower-collage-layout]");
    var layoutId = layoutSel && layoutSel.value ? layoutSel.value : "none";
    if (!COLLAGE_LAYOUTS[layoutId]) layoutId = "none";
    var n = collageCellCount(layoutId);
    var cells = [];
    for (var i = 0; i < n; i++) {
      var input = root.querySelector('[data-tower-collage-cell="' + i + '"]');
      var url = input ? String(input.value || "").trim().slice(0, 500) : "";
      if (url && !/^https?:\/\//i.test(url) && url.indexOf("data:image/") !== 0) url = "";
      cells.push({
        url: url,
        color: DEMO_COLLAGE_COLORS[i % DEMO_COLLAGE_COLORS.length],
      });
    }
    return { layoutId: layoutId, cells: cells };
  }

  var stickerZCounter = 20;

  function initScrapbookStickers(root) {
    var stage = root.querySelector("[data-tower-scrapbook]");
    if (!stage || stage.__cognationStickersBound) return;
    stage.__cognationStickersBound = true;
    stage.classList.add("is-sticker-stage");
    stage.classList.remove("is-editing");
    ensureStickersOnStage(stage);

    var resetBtn = root.querySelector("[data-tower-reset-layout]");
    var undoBtn = root.querySelector("[data-tower-undo-widget]");
    var hint = root.querySelector("[data-tower-scrapbook-bar] .tower-scrapbook-hint");
    if (hint) {
      hint.textContent =
        "Drag the ⋮⋮ handle to move · click any widget/pin then Backspace to remove · Undo restores · Reset brings widgets back";
    }
    if (!root.__cognationWidgetUndo) root.__cognationWidgetUndo = [];

    function setProfileStatusSafe(msg, isError) {
      var el = root.querySelector("[data-tower-profile-status]");
      if (!el) return;
      el.hidden = !msg;
      el.textContent = msg || "";
      el.classList.toggle("is-error", !!isError);
    }

    function syncUndoButton() {
      if (!undoBtn) return;
      var n = (root.__cognationWidgetUndo || []).length;
      undoBtn.disabled = n === 0;
      undoBtn.setAttribute("aria-disabled", n === 0 ? "true" : "false");
      undoBtn.title = n ? ("Restore last removed (" + n + " in undo stack)") : "Nothing to undo";
    }

    function pushWidgetUndo(entry) {
      if (!entry) return;
      if (!root.__cognationWidgetUndo) root.__cognationWidgetUndo = [];
      root.__cognationWidgetUndo.push(entry);
      while (root.__cognationWidgetUndo.length > WIDGET_UNDO_MAX) {
        root.__cognationWidgetUndo.shift();
      }
      syncUndoButton();
    }

    function undoLastWidgetRemoval() {
      var stack = root.__cognationWidgetUndo || [];
      if (!stack.length) {
        setProfileStatusSafe("Nothing to undo.", false);
        syncUndoButton();
        return;
      }
      var entry = stack.pop();
      syncUndoButton();
      if (!entry) return;
      if (entry.type === "widget") {
        setPublicWidgetVisible(root, entry.id, true);
        setProfileStatusSafe("Restored " + (entry.label || entry.id) + ".", false);
        return;
      }
      if (entry.type === "friend") {
        var fp = TowerProfileStore.get();
        var ids = (fp.featuredFriendIds || []).slice();
        if (ids.indexOf(entry.id) < 0) {
          var max = fp.friendsDisplayCount || 3;
          if (ids.length >= max) {
            /* bump count if needed so restore can fit */
            if (max < 8) {
              fp.friendsDisplayCount = ids.length + 1 <= 6 ? 6 : 8;
              max = fp.friendsDisplayCount;
            }
          }
          if (ids.length < max) ids.push(entry.id);
        }
        fp.featuredFriendIds = ids.slice(0, fp.friendsDisplayCount || 8);
        if (entry.layout) {
          if (!fp.friendPinLayout || typeof fp.friendPinLayout !== "object") fp.friendPinLayout = {};
          fp.friendPinLayout[entry.id] = entry.layout;
        }
        ensureFriendPinPositions(fp, fp.featuredFriendIds);
        TowerProfileStore.save(fp);
        renderFriendsPicker(root, fp);
        renderFriendPins(root, fp);
        syncOwnerStickerHandles(root);
        setProfileStatusSafe("Restored friend pin.", false);
        return;
      }
      if (entry.type === "badge") {
        setBadgeVisibility(root, entry.id, true);
        setProfileStatusSafe("Restored badge pin.", false);
        return;
      }
    }

    syncUndoButton();
    if (undoBtn && !undoBtn.__cognationUndoBound) {
      undoBtn.__cognationUndoBound = true;
      undoBtn.addEventListener("click", function () {
        undoLastWidgetRemoval();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        var p = TowerProfileStore.get();
        p.widgetLayout = JSON.parse(JSON.stringify(DEFAULT_WIDGET_LAYOUT));
        if (p.widgetLayout && p.widgetLayout.feed) delete p.widgetLayout.feed;
        if (p.widgetLayout && p.widgetLayout.messages) delete p.widgetLayout.messages;
        p.publicWidgets = JSON.parse(JSON.stringify(DEFAULT_PUBLIC_WIDGETS));
        TowerProfileStore.save(p);
        applyWidgetLayout(root, p);
        applyPublicWidgets(root, p);
        syncPublicWidgetsForm(root, p);
        renderFriendPins(root, p);
        renderBadgePins(root, p);
        syncOwnerStickerHandles(root);
        root.__cognationWidgetUndo = [];
        syncUndoButton();
        setProfileStatusSafe("Layout reset — public widgets restored.", false);
      });
    }

    function pointerPos(ev) {
      if (ev.touches && ev.touches[0]) return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
      return { x: ev.clientX, y: ev.clientY };
    }

    function ownerOnPublic() {
      return isTowerOwner(TowerProfileStore.get()) && root.getAttribute("data-tower-side") === "public";
    }

    function onPointerDown(ev) {
      if (!ownerOnPublic()) return;

      var friendPin = ev.target.closest("[data-tower-friend-pin]");
      if (friendPin && stage.contains(friendPin)) {
        ev.preventDefault();
        stickerZCounter += 1;
        friendPin.style.setProperty("--sticker-z", String(stickerZCounter));
        friendPin.classList.add("is-dragging");
        friendPin.__cognationDidDrag = false;
        var rectPin = stage.getBoundingClientRect();
        var startPin = pointerPos(ev);
        var startPinX = parseFloat(friendPin.getAttribute("data-sticker-x") || "0");
        var startPinY = parseFloat(friendPin.getAttribute("data-sticker-y") || "0");

        function onMovePin(e) {
          var cur = pointerPos(e);
          if (e.cancelable) e.preventDefault();
          var dxPct = ((cur.x - startPin.x) / rectPin.width) * 100;
          var dyPct = ((cur.y - startPin.y) / rectPin.height) * 100;
          if (Math.abs(dxPct) > 0.3 || Math.abs(dyPct) > 0.3) friendPin.__cognationDidDrag = true;
          var nx = Math.max(0, Math.min(88, startPinX + dxPct));
          var ny = Math.max(0, Math.min(88, startPinY + dyPct));
          friendPin.style.setProperty("--sticker-x", nx + "%");
          friendPin.style.setProperty("--sticker-y", ny + "%");
          friendPin.setAttribute("data-sticker-x", String(Math.round(nx * 10) / 10));
          friendPin.setAttribute("data-sticker-y", String(Math.round(ny * 10) / 10));
          friendPin.setAttribute("data-sticker-z", String(stickerZCounter));
        }

        function onUpPin() {
          friendPin.classList.remove("is-dragging");
          document.removeEventListener("pointermove", onMovePin);
          document.removeEventListener("pointerup", onUpPin);
          document.removeEventListener("pointercancel", onUpPin);
          document.removeEventListener("touchmove", onMovePin);
          document.removeEventListener("touchend", onUpPin);
          if (!friendPin.__cognationDidDrag) return;
          var p = TowerProfileStore.get();
          var pinLayout = getFriendPinLayout(p);
          var fid = friendPin.getAttribute("data-tower-friend-pin");
          if (!fid) return;
          var prevPin = pinLayout[fid] || { tilt: 0 };
          pinLayout[fid] = {
            x: parseFloat(friendPin.getAttribute("data-sticker-x") || "0"),
            y: parseFloat(friendPin.getAttribute("data-sticker-y") || "0"),
            z: parseInt(friendPin.getAttribute("data-sticker-z") || "12", 10),
            tilt: typeof prevPin.tilt === "number" ? prevPin.tilt : 0,
          };
          p.friendPinLayout = pinLayout;
          TowerProfileStore.save(p);
        }

        document.addEventListener("pointermove", onMovePin);
        document.addEventListener("pointerup", onUpPin);
        document.addEventListener("pointercancel", onUpPin);
        document.addEventListener("touchmove", onMovePin, { passive: false });
        document.addEventListener("touchend", onUpPin);
        return;
      }

      var badgePin = ev.target.closest("[data-tower-badge-pin]");
      if (badgePin && stage.contains(badgePin)) {
        ev.preventDefault();
        stickerZCounter += 1;
        badgePin.style.setProperty("--sticker-z", String(stickerZCounter));
        badgePin.classList.add("is-dragging");
        badgePin.__cognationDidDrag = false;
        var rectBadge = stage.getBoundingClientRect();
        var startBadge = pointerPos(ev);
        var startBadgeX = parseFloat(badgePin.getAttribute("data-sticker-x") || "0");
        var startBadgeY = parseFloat(badgePin.getAttribute("data-sticker-y") || "0");

        function onMoveBadge(e) {
          var cur = pointerPos(e);
          if (e.cancelable) e.preventDefault();
          var dxPct = ((cur.x - startBadge.x) / rectBadge.width) * 100;
          var dyPct = ((cur.y - startBadge.y) / rectBadge.height) * 100;
          if (Math.abs(dxPct) > 0.3 || Math.abs(dyPct) > 0.3) badgePin.__cognationDidDrag = true;
          var nx = Math.max(0, Math.min(88, startBadgeX + dxPct));
          var ny = Math.max(0, Math.min(88, startBadgeY + dyPct));
          badgePin.style.setProperty("--sticker-x", nx + "%");
          badgePin.style.setProperty("--sticker-y", ny + "%");
          badgePin.setAttribute("data-sticker-x", String(Math.round(nx * 10) / 10));
          badgePin.setAttribute("data-sticker-y", String(Math.round(ny * 10) / 10));
          badgePin.setAttribute("data-sticker-z", String(stickerZCounter));
        }

        function onUpBadge() {
          badgePin.classList.remove("is-dragging");
          document.removeEventListener("pointermove", onMoveBadge);
          document.removeEventListener("pointerup", onUpBadge);
          document.removeEventListener("pointercancel", onUpBadge);
          document.removeEventListener("touchmove", onMoveBadge);
          document.removeEventListener("touchend", onUpBadge);
          if (!badgePin.__cognationDidDrag) return;
          var bp = TowerProfileStore.get();
          var badgeLayout = getBadgePinLayout(bp);
          var bid = badgePin.getAttribute("data-tower-badge-pin");
          if (!bid) return;
          var prevBadge = badgeLayout[bid] || { tilt: 0 };
          badgeLayout[bid] = {
            x: parseFloat(badgePin.getAttribute("data-sticker-x") || "0"),
            y: parseFloat(badgePin.getAttribute("data-sticker-y") || "0"),
            z: parseInt(badgePin.getAttribute("data-sticker-z") || "14", 10),
            tilt: typeof prevBadge.tilt === "number" ? prevBadge.tilt : 0,
          };
          bp.badgePinLayout = badgeLayout;
          TowerProfileStore.save(bp);
        }

        document.addEventListener("pointermove", onMoveBadge);
        document.addEventListener("pointerup", onUpBadge);
        document.addEventListener("pointercancel", onUpBadge);
        document.addEventListener("touchmove", onMoveBadge, { passive: false });
        document.addEventListener("touchend", onUpBadge);
        return;
      }

      /* Stickers: drag only from ⋮⋮ handle so links/buttons still work */
      var handle = ev.target.closest("[data-tower-sticker-handle]");
      if (!handle || !stage.contains(handle)) return;
      var sticker = handle.closest("[data-tower-widget]");
      if (!sticker || !stage.contains(sticker)) return;
      var wid = sticker.getAttribute("data-tower-widget");
      if (wid === "feed" || wid === "messages") return;
      ev.preventDefault();
      if (ev.pointerId != null && handle.setPointerCapture) {
        try { handle.setPointerCapture(ev.pointerId); } catch (err) {}
      }
      stickerZCounter += 1;
      sticker.style.setProperty("--sticker-z", String(stickerZCounter));
      sticker.classList.add("is-dragging");

      var rect = stage.getBoundingClientRect();
      var start = pointerPos(ev);
      var startX = parseFloat(sticker.getAttribute("data-sticker-x") || "0");
      var startY = parseFloat(sticker.getAttribute("data-sticker-y") || "0");

      function onMove(e) {
        var cur = pointerPos(e);
        if (e.cancelable) e.preventDefault();
        var dxPct = ((cur.x - start.x) / rect.width) * 100;
        var dyPct = ((cur.y - start.y) / rect.height) * 100;
        var nx = Math.max(0, Math.min(88, startX + dxPct));
        var ny = Math.max(0, Math.min(88, startY + dyPct));
        sticker.style.setProperty("--sticker-x", nx + "%");
        sticker.style.setProperty("--sticker-y", ny + "%");
        sticker.setAttribute("data-sticker-x", String(Math.round(nx * 10) / 10));
        sticker.setAttribute("data-sticker-y", String(Math.round(ny * 10) / 10));
        sticker.setAttribute("data-sticker-z", String(stickerZCounter));
      }

      function onUp() {
        sticker.classList.remove("is-dragging");
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onUp);
        var p = TowerProfileStore.get();
        var layout = getWidgetLayout(p) || JSON.parse(JSON.stringify(DEFAULT_WIDGET_LAYOUT));
        var id = sticker.getAttribute("data-tower-widget");
        if (!id) return;
        var prev = layout[id] || DEFAULT_WIDGET_LAYOUT[id] || { tilt: 0 };
        layout[id] = {
          x: parseFloat(sticker.getAttribute("data-sticker-x") || "0"),
          y: parseFloat(sticker.getAttribute("data-sticker-y") || "0"),
          z: parseInt(sticker.getAttribute("data-sticker-z") || "1", 10),
          tilt: typeof prev.tilt === "number" ? prev.tilt : 0,
        };
        p.widgetLayout = layout;
        TowerProfileStore.save(p);
      }

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onUp);
    }

    stage.addEventListener("pointerdown", onPointerDown);

    /* Click to select a public widget (owner only) */
    stage.addEventListener("click", function (ev) {
      if (!ownerOnPublic()) return;
      if (ev.target.closest("[data-tower-profile-edit]")) return;
      if (ev.target.closest("[data-tower-sticker-handle]")) return;
      if (ev.target.closest(".tower-avatar-upload, [data-tower-avatar-file], [data-tower-avatar-file-panel]")) return;
      if (ev.target.closest("a, button, input, textarea, select, label")) {
        /* Still allow selecting if click is on non-interactive sticker chrome */
        var maybe = ev.target.closest("[data-tower-widget]");
        if (!maybe || ev.target.closest("a, button, input, textarea, select, label")) {
          /* Don't steal clicks from controls; clear selection only on bare stage */
          if (ev.target === stage || ev.target.hasAttribute("data-tower-collage-stage")) {
            clearWidgetSelection(stage);
          }
          return;
        }
      }
      var sticker = ev.target.closest("[data-tower-widget]");
      if (sticker && stage.contains(sticker) && !sticker.hidden && !sticker.classList.contains("is-widget-off")) {
        var wid = sticker.getAttribute("data-tower-widget");
        if (wid === "feed" || wid === "messages") return;
        clearWidgetSelection(stage);
        sticker.classList.add("is-widget-selected");
        return;
      }
      if (ev.target === stage || ev.target.closest("[data-tower-collage-stage]")) {
        clearWidgetSelection(stage);
      }
    });

    /* Backspace / Delete removes any selected public widget, friend pin, or badge pin */
    if (!root.__cognationWidgetKeyBound) {
      root.__cognationWidgetKeyBound = true;
      document.addEventListener("keydown", function (ev) {
        if (ev.key !== "Backspace" && ev.key !== "Delete") return;
        if (!ownerOnPublic()) return;
        var t = ev.target;
        if (t) {
          var tag = (t.tagName || "").toUpperCase();
          if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
          if (t.isContentEditable) return;
        }
        var selected = stage.querySelector(".is-widget-selected");
        if (!selected || !stage.contains(selected)) return;
        ev.preventDefault();

        /* Individual friend pin */
        var friendId = selected.getAttribute("data-tower-friend-pin");
        if (friendId) {
          clearWidgetSelection(stage);
          var fp = TowerProfileStore.get();
          var savedFriendLayout =
            fp.friendPinLayout && fp.friendPinLayout[friendId]
              ? JSON.parse(JSON.stringify(fp.friendPinLayout[friendId]))
              : null;
          pushWidgetUndo({ type: "friend", id: friendId, layout: savedFriendLayout });
          fp.featuredFriendIds = (fp.featuredFriendIds || []).filter(function (id) {
            return id !== friendId;
          });
          if (fp.friendPinLayout && fp.friendPinLayout[friendId]) {
            delete fp.friendPinLayout[friendId];
          }
          TowerProfileStore.save(fp);
          renderFriendsPicker(root, fp);
          renderFriendPins(root, fp);
          setProfileStatusSafe("Friend pin removed — Undo to restore.", false);
          return;
        }

        /* Individual badge pin */
        var badgeId = selected.getAttribute("data-tower-badge-pin");
        if (badgeId) {
          clearWidgetSelection(stage);
          pushWidgetUndo({ type: "badge", id: badgeId });
          setBadgeVisibility(root, badgeId, false);
          setProfileStatusSafe("Badge pin removed — Undo to restore.", false);
          return;
        }

        /* Scrapbook sticker widgets */
        var id = selected.getAttribute("data-tower-widget");
        if (!id || id === "avatar" || id === "feed" || id === "messages") return;
        if (PUBLIC_WIDGET_IDS.indexOf(id) < 0) return;
        clearWidgetSelection(stage);
        var label = selected.getAttribute("data-sticker-label") || id;
        pushWidgetUndo({ type: "widget", id: id, label: label });
        setPublicWidgetVisible(root, id, false);
        setProfileStatusSafe(label + " removed — Undo to restore.", false);
      });
    }

    /* Live Public widgets checkboxes */
    if (!root.__cognationPublicWidgetsBound) {
      root.__cognationPublicWidgetsBound = true;
      root.addEventListener("change", function (ev) {
        var cb = ev.target && ev.target.closest("[data-tower-public-widget]");
        if (!cb || !root.contains(cb)) return;
        var id = cb.getAttribute("data-tower-public-widget");
        if (!id) return;
        setPublicWidgetVisible(root, id, !!cb.checked);
      });
    }

    syncOwnerStickerHandles(root);
  }


  function initProfileEditDropdown(root) {
    var wrap = root.querySelector("[data-tower-profile-edit]");
    var btn = root.querySelector("[data-tower-edit-profile]");
    var panel = root.querySelector("[data-tower-profile-edit-panel]");
    if (!wrap || !btn || !panel || wrap.__cognationEditBound) return;
    wrap.__cognationEditBound = true;

    /* Native file dialogs can fire outside pointerdown/blur; closing the panel
       (display:none) cancels the picker before change. Track picking and hold open. */
    var pickingAvatarFile = false;
    var pickClearTimer = null;

    function setAvatarPicking(on) {
      pickingAvatarFile = !!on;
      root.__cognationAvatarPicking = pickingAvatarFile;
      if (pickClearTimer) {
        clearTimeout(pickClearTimer);
        pickClearTimer = null;
      }
    }

    function clearAvatarPickingSoon() {
      if (pickClearTimer) clearTimeout(pickClearTimer);
      pickClearTimer = setTimeout(function () {
        pickingAvatarFile = false;
        root.__cognationAvatarPicking = false;
        pickClearTimer = null;
      }, 400);
    }

    function bindAvatarPickGuard(input) {
      if (!input || input.__cognationPickGuardBound) return;
      input.__cognationPickGuardBound = true;
      input.addEventListener("click", function () {
        setAvatarPicking(true);
      });
      input.addEventListener("change", function () {
        setAvatarPicking(false);
      });
      input.addEventListener("cancel", function () {
        setAvatarPicking(false);
      });
    }

    root.querySelectorAll("[data-tower-avatar-file-panel], [data-tower-avatar-file]").forEach(bindAvatarPickGuard);

    var chooseBtn = root.querySelector("[data-tower-choose-avatar]");
    var panelFile = root.querySelector("[data-tower-avatar-file-panel]");
    if (chooseBtn && panelFile && !chooseBtn.__cognationChooseBound) {
      chooseBtn.__cognationChooseBound = true;
      chooseBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        setAvatarPicking(true);
        try {
          panelFile.click();
        } catch (errClick) {
          setAvatarPicking(false);
        }
      });
    }

    if (!root.__cognationAvatarPickFocusBound) {
      root.__cognationAvatarPickFocusBound = true;
      window.addEventListener("focus", function () {
        if (pickingAvatarFile || root.__cognationAvatarPicking) clearAvatarPickingSoon();
      });
    }

    function setOpen(open) {
      if (!open && pickingAvatarFile) return;
      if (open) {
        panel.hidden = false;
        wrap.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
        var avatarSticker = wrap.closest('[data-tower-widget="avatar"]');
        if (avatarSticker) avatarSticker.classList.add("is-edit-open");
      } else {
        panel.hidden = true;
        wrap.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
        var avatarStickerClose = wrap.closest('[data-tower-widget="avatar"]');
        if (avatarStickerClose) avatarStickerClose.classList.remove("is-edit-open");
      }
    }

    function isOpen() {
      return !panel.hidden;
    }

    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      setOpen(!isOpen());
    });

    /* Keep pointer events inside the editor from starting sticker drags or closing the menu */
    panel.addEventListener("pointerdown", function (ev) {
      ev.stopPropagation();
    });
    panel.addEventListener("click", function (ev) {
      ev.stopPropagation();
    });

    document.addEventListener("pointerdown", function (ev) {
      if (!isOpen()) return;
      if (pickingAvatarFile || root.__cognationAvatarPicking) return;
      if (wrap.contains(ev.target)) return;
      /* Avatar overlay upload sits outside the edit wrap but should not dismiss while picking */
      if (ev.target.closest && ev.target.closest(".tower-avatar-upload, [data-tower-avatar-file]")) {
        setAvatarPicking(true);
        return;
      }
      setOpen(false);
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && isOpen() && !pickingAvatarFile) {
        setOpen(false);
        btn.focus();
      }
    });
  }

  function initFramePicker(root) {
    var chips = root.querySelector("[data-tower-frame-chips]");
    var saveBtn = root.querySelector("[data-tower-save-frame]");
    var colorChips = root.querySelector("[data-tower-cowboy-color-chips]");
    if (!chips || chips.__cognationFramesBound) return;
    chips.__cognationFramesBound = true;
    chips.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-frame-id]");
      if (!btn || !chips.contains(btn)) return;
      var id = normalizeFrameId(btn.getAttribute("data-frame-id"));
      var colorIn = root.querySelector("[data-tower-cowboy-color-input]");
      var color = colorIn ? colorIn.value : "tan";
      /* preview only — persist when Save frame is clicked */
      applyAvatarFrame(root, id, color);
      var input = root.querySelector("[data-tower-avatar-frame-input]");
      if (input) input.value = id;
      var status = root.querySelector("[data-tower-profile-status]");
      if (status) {
        status.hidden = false;
        status.textContent = "Frame preview — click Save frame to keep it.";
        status.classList.remove("is-error");
      }
    });
    if (colorChips && !colorChips.__cognationCowboyColorBound) {
      colorChips.__cognationCowboyColorBound = true;
      colorChips.addEventListener("click", function (ev) {
        var btn = ev.target.closest("[data-cowboy-color]");
        if (!btn || !colorChips.contains(btn)) return;
        var color = normalizeCowboyHatColor(btn.getAttribute("data-cowboy-color"));
        applyCowboyHatColor(root, color);
        var frameIn = root.querySelector("[data-tower-avatar-frame-input]");
        var frameId = normalizeFrameId(frameIn ? frameIn.value : "none");
        if (frameId !== "cowboy-hat") {
          applyAvatarFrame(root, "cowboy-hat", color);
        }
        var status = root.querySelector("[data-tower-profile-status]");
        if (status) {
          status.hidden = false;
          status.textContent = "Hat color preview — click Save frame to keep it.";
          status.classList.remove("is-error");
        }
      });
    }
    if (saveBtn && !saveBtn.__cognationFrameSaveBound) {
      saveBtn.__cognationFrameSaveBound = true;
      saveBtn.addEventListener("click", function () {
        var input = root.querySelector("[data-tower-avatar-frame-input]");
        var id = normalizeFrameId(input ? input.value : "none");
        var colorIn = root.querySelector("[data-tower-cowboy-color-input]");
        var color = normalizeCowboyHatColor(colorIn ? colorIn.value : "tan");
        applyAvatarFrame(root, id, color);
        var p = TowerProfileStore.get();
        p.avatarFrame = id;
        p.cowboyHatColor = color;
        TowerProfileStore.save(p);
        var status = root.querySelector("[data-tower-profile-status]");
        if (status) {
          status.hidden = false;
          status.textContent = id === "cowboy-hat" ? "Cowboy hat + color saved." : "Frame saved.";
          status.classList.remove("is-error");
        }
      });
    }
  }

  function initOrnamentPicker(root) {
    var chips = root.querySelector("[data-tower-ornament-chips]");
    var posChips = root.querySelector("[data-tower-ornament-pos-chips]");
    if (chips && !chips.__cognationOrnamentsBound) {
      chips.__cognationOrnamentsBound = true;
      chips.addEventListener("click", function (ev) {
        var btn = ev.target.closest("[data-ornament-id]");
        if (!btn || !chips.contains(btn)) return;
        var id = normalizeOrnamentId(btn.getAttribute("data-ornament-id"));
        var p = TowerProfileStore.get();
        var pos = normalizeOrnamentPos(p.avatarOrnamentPos || "above");
        applyAvatarOrnament(root, id, pos);
        p.avatarOrnament = id;
        p.avatarOrnamentPos = pos;
        TowerProfileStore.save(p);
      });
    }
    if (posChips && !posChips.__cognationOrnamentPosBound) {
      posChips.__cognationOrnamentPosBound = true;
      posChips.addEventListener("click", function (ev) {
        var btn = ev.target.closest("[data-ornament-pos]");
        if (!btn || !posChips.contains(btn) || btn.disabled) return;
        var pos = normalizeOrnamentPos(btn.getAttribute("data-ornament-pos"));
        var p = TowerProfileStore.get();
        var id = normalizeOrnamentId(p.avatarOrnament || "none");
        if (id === "none") return;
        applyAvatarOrnament(root, id, pos);
        p.avatarOrnament = id;
        p.avatarOrnamentPos = pos;
        TowerProfileStore.save(p);
      });
    }
  }

  function syncPublicLookForm(root, p) {
    if (!root || !p) return;
    var mode = normalizeBackgroundMode(p.backgroundMode, p.backgroundCollage, p.backgroundHtml);
    var modeSel = root.querySelector("[data-tower-bg-mode]");
    if (modeSel && document.activeElement !== modeSel) modeSel.value = mode;
    var textIn = root.querySelector("[data-tower-public-text]");
    if (textIn && document.activeElement !== textIn) {
      textIn.value = normalizePublicThemeColor(p.publicTextColor, "#4a2c3a");
    }
    var btnIn = root.querySelector("[data-tower-public-btn]");
    if (btnIn && document.activeElement !== btnIn) {
      btnIn.value = normalizePublicThemeColor(p.publicButtonColor, "#f4a4c4");
    }
    var htmlIn = root.querySelector("[data-tower-bg-html]");
    if (htmlIn && document.activeElement !== htmlIn) {
      htmlIn.value = typeof p.backgroundHtml === "string" ? p.backgroundHtml : "";
    }
    populateBgModeOptions(root, mode, { reveal: false });
  }

  /** Show only the selected mode's controls inside data-tower-bg-options. */
  function populateBgModeOptions(root, mode, opts) {
    opts = opts || {};
    var options = root.querySelector("[data-tower-bg-options]");
    if (!options) return;
    mode = normalizeBackgroundMode(mode, null, null);
    if (opts.reveal) {
      options.hidden = false;
    }
    options.querySelectorAll("[data-tower-bg-mode-panel]").forEach(function (panel) {
      var id = panel.getAttribute("data-tower-bg-mode-panel");
      panel.hidden = id !== mode;
    });
    var editBtn = root.querySelector("[data-tower-public-look-edit-bg]");
    if (editBtn) {
      editBtn.hidden = !options.hidden;
    }
  }

  function hideBgOptionsAfterSave(root) {
    var options = root.querySelector("[data-tower-bg-options]");
    if (options) options.hidden = true;
    var panel = root.querySelector("[data-tower-public-look]");
    if (panel) panel.open = false;
    var editBtn = root.querySelector("[data-tower-public-look-edit-bg]");
    if (editBtn) editBtn.hidden = false;
  }

  function showBgOptions(root) {
    var options = root.querySelector("[data-tower-bg-options]");
    if (options) options.hidden = false;
    var modeSel = root.querySelector("[data-tower-bg-mode]");
    var mode = modeSel ? modeSel.value : "solid";
    populateBgModeOptions(root, mode, { reveal: true });
    var panel = root.querySelector("[data-tower-public-look]");
    if (panel) panel.open = true;
    var editBtn = root.querySelector("[data-tower-public-look-edit-bg]");
    if (editBtn) editBtn.hidden = true;
  }

  function readPublicLookFromForm(root) {
    var fontIn = root.querySelector("[data-tower-font]");
    var feedBgIn = root.querySelector("[data-tower-feed-bg]");
    var textIn = root.querySelector("[data-tower-public-text]");
    var btnIn = root.querySelector("[data-tower-public-btn]");
    var modeSel = root.querySelector("[data-tower-bg-mode]");
    var htmlIn = root.querySelector("[data-tower-bg-html]");
    var mode = normalizeBackgroundMode(modeSel ? modeSel.value : "solid", null, null);
    var out = {
      towerFont: normalizeTowerFont(fontIn ? fontIn.value : "georgia"),
      feedBackgroundColor: normalizeFeedBgColor(
        feedBgIn ? feedBgIn.value : "#fff5f9"
      ),
      publicTextColor: normalizePublicThemeColor(
        textIn ? textIn.value : "#4a2c3a",
        "#4a2c3a"
      ),
      publicButtonColor: normalizePublicThemeColor(
        btnIn ? btnIn.value : "#f4a4c4",
        "#f4a4c4"
      ),
      backgroundMode: mode,
    };
    if (mode === "collage") {
      out.backgroundCollage = readCollageFromForm(root);
    }
    if (mode === "html") {
      out.backgroundHtml = sanitizeProfileHtml(
        htmlIn ? String(htmlIn.value || "").slice(0, 8000) : ""
      );
    }
    return out;
  }

  function initPublicLookControls(root) {
    if (!root || root.__cognationPublicLookBound) return;
    root.__cognationPublicLookBound = true;
    var modeSel = root.querySelector("[data-tower-bg-mode]");
    var saveBtn = root.querySelector("[data-tower-public-look-save]");
    var status = root.querySelector("[data-tower-public-look-status]");
    var editBgBtn = root.querySelector("[data-tower-public-look-edit-bg]");
    var htmlFile = root.querySelector("[data-tower-bg-html-file]");
    var swatches = root.querySelector("[data-tower-bg-swatches]");

    function setStatus(msg, isError) {
      if (!status) return;
      status.hidden = !msg;
      status.textContent = msg || "";
      status.classList.toggle("is-error", !!isError);
    }

    function livePreview() {
      var cur = TowerProfileStore.get();
      var look = readPublicLookFromForm(root);
      var preview = Object.assign({}, cur, look);
      /* Keep stored collage/html when previewing other modes so form fields stay. */
      if (look.backgroundMode !== "collage") {
        preview.backgroundCollage = cur.backgroundCollage;
      }
      if (look.backgroundMode !== "html") {
        preview.backgroundHtml = cur.backgroundHtml;
      } else if (look.backgroundHtml != null) {
        preview.backgroundHtml = look.backgroundHtml;
      }
      applyTowerTheme(root, preview);
    }

    if (modeSel) {
      modeSel.addEventListener("change", function () {
        populateBgModeOptions(root, modeSel.value, { reveal: true });
        if (modeSel.value === "collage") {
          syncCollageForm(root, TowerProfileStore.get());
        }
        livePreview();
      });
    }

    ["data-tower-font", "data-tower-feed-bg", "data-tower-public-text", "data-tower-public-btn", "data-tower-bg-html"].forEach(function (sel) {
      var el = root.querySelector("[" + sel + "]");
      if (!el) return;
      el.addEventListener("input", livePreview);
      el.addEventListener("change", livePreview);
    });

    if (swatches && !swatches.__cognationSwatchBound) {
      swatches.__cognationSwatchBound = true;
      swatches.addEventListener("click", function (ev) {
        var btn = ev.target.closest("[data-tower-bg-swatch]");
        if (!btn || !swatches.contains(btn)) return;
        var color = normalizeFeedBgColor(btn.getAttribute("data-tower-bg-swatch"));
        var bgIn = root.querySelector("[data-tower-feed-bg]");
        if (bgIn) bgIn.value = color;
        livePreview();
      });
    }

    if (htmlFile && !htmlFile.__cognationBgHtmlFileBound) {
      htmlFile.__cognationBgHtmlFileBound = true;
      htmlFile.addEventListener("change", function () {
        var file = htmlFile.files && htmlFile.files[0];
        if (!file) return;
        var name = String(file.name || "").toLowerCase();
        var okType =
          /text\/(html|plain)/.test(file.type) ||
          /\.(html?|txt)$/.test(name);
        if (!okType) {
          setStatus("Choose a .html or .txt file.", true);
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          var htmlIn = root.querySelector("[data-tower-bg-html]");
          if (htmlIn) {
            htmlIn.value = String(reader.result || "").slice(0, 8000);
            livePreview();
          }
          setStatus("Background HTML loaded from file.", false);
        };
        reader.onerror = function () {
          setStatus("Could not read that file.", true);
        };
        reader.readAsText(file);
        try { htmlFile.value = ""; } catch (eClr) {}
      });
    }

    if (editBgBtn) {
      editBgBtn.addEventListener("click", function () {
        showBgOptions(root);
      });
    }

    var previewBtn = root.querySelector("[data-tower-public-look-preview]");
    if (previewBtn) {
      previewBtn.addEventListener("click", function () {
        livePreview();
        setStatus("Previewing — Save public look to keep.", false);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var p = TowerProfileStore.get();
        var look = readPublicLookFromForm(root);
        p.towerFont = look.towerFont;
        p.feedBackgroundColor = look.feedBackgroundColor;
        p.publicTextColor = look.publicTextColor;
        p.publicButtonColor = look.publicButtonColor;
        p.backgroundMode = look.backgroundMode;
        if (look.backgroundMode === "collage") {
          p.backgroundCollage = look.backgroundCollage || readCollageFromForm(root);
        }
        if (look.backgroundMode === "html") {
          p.backgroundHtml = look.backgroundHtml || "";
        }
        if (!TowerProfileStore.save(p)) {
          setStatus("Could not save public look (storage full or blocked).", true);
          return;
        }
        applyTowerTheme(root, p);
        syncCollageForm(root, p);
        hideBgOptionsAfterSave(root);
        setStatus("Public profile look saved.", false);
      });
    }

    /* Initial: show mode panels; options visible until first save this session */
    var cur = TowerProfileStore.get();
    populateBgModeOptions(root, cur.backgroundMode, { reveal: true });
    var editBtnInit = root.querySelector("[data-tower-public-look-edit-bg]");
    if (editBtnInit) editBtnInit.hidden = true;
  }

  function initCollageControls(root) {
    var layoutSel = root.querySelector("[data-tower-collage-layout]");
    var applyBtn = root.querySelector("[data-tower-collage-apply]");
    var demoBtn = root.querySelector("[data-tower-collage-demo]");
    if (layoutSel && !layoutSel.__bound) {
      layoutSel.__bound = true;
      layoutSel.addEventListener("change", function () {
        var p = TowerProfileStore.get();
        syncCollageForm(root, {
          backgroundCollage: {
            layoutId: layoutSel.value,
            cells: (p.backgroundCollage && p.backgroundCollage.cells) || [],
          },
        });
      });
    }
    if (demoBtn && !demoBtn.__bound) {
      demoBtn.__bound = true;
      demoBtn.addEventListener("click", function () {
        var layoutSel2 = root.querySelector("[data-tower-collage-layout]");
        var layoutId = layoutSel2 ? layoutSel2.value : "grid-3x3";
        if (layoutId === "none") layoutId = "grid-3x3";
        if (layoutSel2) layoutSel2.value = layoutId;
        var p = TowerProfileStore.get();
        p.backgroundMode = "collage";
        p.backgroundCollage = {
          layoutId: layoutId,
          cells: demoCollageCells(collageCellCount(layoutId)),
        };
        TowerProfileStore.save(p);
        var modeSel3 = root.querySelector("[data-tower-bg-mode]");
        if (modeSel3) modeSel3.value = "collage";
        syncCollageForm(root, p);
        applyTowerTheme(root, p);
      });
    }
    if (applyBtn && !applyBtn.__bound) {
      applyBtn.__bound = true;
      applyBtn.addEventListener("click", function () {
        var p = TowerProfileStore.get();
        p.backgroundMode = "collage";
        p.backgroundCollage = readCollageFromForm(root);
        TowerProfileStore.save(p);
        var modeSel = root.querySelector("[data-tower-bg-mode]");
        if (modeSel) modeSel.value = "collage";
        applyTowerTheme(root, p);
        var lookStatus = root.querySelector("[data-tower-public-look-status]");
        if (lookStatus) {
          lookStatus.hidden = false;
          lookStatus.textContent = "Collage background applied (Save public look to keep + collapse).";
          lookStatus.classList.remove("is-error");
        }
      });
    }
  }


  function renderProfileChrome(root) {
    var p = TowerProfileStore.get();
    var nameEl = root.querySelector("[data-tower-profile-name]");
    var avatar = root.querySelector("[data-tower-avatar]");
    var nameInput = root.querySelector("#tower-display-name");
    var htmlInput = root.querySelector("[data-tower-profile-html]");
    var preview = root.querySelector("[data-tower-html-preview]");
    if (nameEl) nameEl.textContent = p.displayName || "You";
    applyDisplayNameSize(root, p.displayNameSize || 28);
    initDisplayNameResize(root);
    var handleBadge = root.querySelector("[data-tower-handle-badge]");
    var handleVal = normalizeHandle(p.handle || "");
    if (handleBadge) {
      if (handleVal) {
        handleBadge.hidden = false;
        handleBadge.textContent = "@" + handleVal;
      } else {
        handleBadge.hidden = true;
        handleBadge.textContent = "";
      }
    }
    var handleInput = root.querySelector("[data-tower-handle]");
    if (handleInput && document.activeElement !== handleInput) {
      handleInput.value = handleVal;
    }
    var profileRoot = root.querySelector("[data-tower-profile]");
    if (profileRoot) {
      var slug = profilePublicSlug(p);
      profileRoot.id = "tower-profile-" + slug;
      profileRoot.setAttribute("data-tower-handle", handleVal || "");
      profileRoot.setAttribute("data-author-slug", slug);
    }
    if (nameInput && document.activeElement !== nameInput) nameInput.value = p.displayName || "";
    if (htmlInput && document.activeElement !== htmlInput) htmlInput.value = p.customHtml || "";
    var sloganInput = root.querySelector("[data-tower-slogan]");
    if (sloganInput && document.activeElement !== sloganInput) sloganInput.value = p.slogan || "";
    var sloganDisplay = root.querySelector("[data-tower-slogan-display]");
    if (sloganDisplay) sloganDisplay.textContent = (p.slogan || "").trim();

    if (avatar) {
      if (p.avatarDataUrl) {
        avatar.style.backgroundImage = 'url("' + p.avatarDataUrl.replace(/"/g, "") + '")';
        avatar.textContent = "";
      } else {
        avatar.style.backgroundImage = "";
        avatar.textContent = initials(p.displayName);
      }
    }
    applyAvatarFrame(root, p.avatarFrame || "none", p.cowboyHatColor || "tan");
    applyAvatarOrnament(root, p.avatarOrnament || "none", p.avatarOrnamentPos || "above");
    if (preview) {
      preview.innerHTML = sanitizeProfileHtml(p.customHtml || "");
    }
    var publicHtml = root.querySelector("[data-tower-html-public]");
    if (publicHtml) {
      publicHtml.innerHTML = sanitizeProfileHtml(p.customHtml || "");
    }
    applyWidgetLayout(root, p);
    applyPublicWidgets(root, p);
    syncPublicWidgetsForm(root, p);
    syncOwnerStickerHandles(root);
    syncCollageForm(root, p);
    syncPublicLookForm(root, p);
    var countSel = root.querySelector("[data-tower-friends-count]");
    if (countSel) countSel.value = String(p.friendsDisplayCount || 3);
    renderFriendsPicker(root, p);
    applyPublicWidgets(root, p);
    syncOwnerStickerHandles(root);
    renderSocialLinks(root, p);

    var titleIn = root.querySelector("[data-tower-music-title]");
    var artistIn = root.querySelector("[data-tower-music-artist]");
    var urlIn = root.querySelector("[data-tower-music-url]");
    var enIn = root.querySelector("[data-tower-music-enable]");
    var skinIn = root.querySelector("[data-tower-music-skin]");
    if (titleIn && document.activeElement !== titleIn) titleIn.value = p.musicTitle || "";
    if (artistIn && document.activeElement !== artistIn) artistIn.value = p.musicArtist || "";
    if (urlIn && document.activeElement !== urlIn) urlIn.value = p.musicUrl || "";
    if (enIn) enIn.checked = p.musicEnabled !== false;
    if (skinIn) skinIn.value = p.musicSkin || "classic";
    initTowerMusic(root, p);

    var videoUrlIn = root.querySelector("[data-tower-video-url]");
    var videoTitleIn = root.querySelector("[data-tower-video-title]");
    var videoEnIn = root.querySelector("[data-tower-video-enable]");
    if (videoUrlIn && document.activeElement !== videoUrlIn) videoUrlIn.value = p.videoUrl || "";
    if (videoTitleIn && document.activeElement !== videoTitleIn) videoTitleIn.value = p.videoTitle || "";
    if (videoEnIn) videoEnIn.checked = p.videoEnabled !== false;
    initTowerVideo(root, p);

    renderAwardedBadgeShelf(root, p);
    syncBadgeVisibilityUi(root, p);
    applyAvatarFrameScale(root, p.avatarFrameScale || 1);
    initAvatarFrameResize(root);
    initDisplayNameResize(root);
    applyTowerTheme(root, p);
    applyPrivateFeedTheme(root, p.privateFeedTheme);
    syncPublicUrlFields(root, p);
  }

  function initTower(root) {
    if (!root) return;
    var form = root.querySelector("[data-tower-compose]");
    var bodyInput = root.querySelector("#tower-body");
    var fileInput = root.querySelector("#tower-files");
    var kindSelect = root.querySelector("#tower-attach-kind");
    var status = root.querySelector("[data-tower-status]");

    function setStatus(msg, isError) {
      if (!status) return;
      if (!msg) {
        status.hidden = true;
        status.textContent = "";
        return;
      }
      status.hidden = false;
      status.textContent = msg;
      status.classList.toggle("is-error", !!isError);
    }

    renderFeed(root);
    renderProfileChrome(root);
    initFramePicker(root);
    initAvatarFrameResize(root);
    initDisplayNameResize(root);
    initOrnamentPicker(root);
    initScrapbookStickers(root);
    initCollageControls(root);
    initPublicLookControls(root);
    initProfileEditDropdown(root);
    initTowerSideToggle(root);
    initPrivateFeedThemeControls(root);
    initPublicUrlCopy(root);

    var profileForm = root.querySelector("[data-tower-profile-form]");
    var avatarFile = root.querySelector("[data-tower-avatar-file]");
    var profileStatus = root.querySelector("[data-tower-profile-status]");

    function setProfileStatus(msg, isError) {
      if (!profileStatus) return;
      if (!msg) {
        profileStatus.hidden = true;
        profileStatus.textContent = "";
        return;
      }
      profileStatus.hidden = false;
      profileStatus.textContent = msg;
      profileStatus.classList.toggle("is-error", !!isError);
    }

    if (profileForm) {
      profileForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var p = TowerProfileStore.get();
        var nameInput = root.querySelector("#tower-display-name");
        var htmlInput = root.querySelector("[data-tower-profile-html]");
        p.displayName = nameInput ? nameInput.value.trim().slice(0, 80) || "You" : p.displayName;
        var nameSizeIn = root.querySelector("[data-tower-name-size]");
        p.displayNameSize = normalizeDisplayNameSize(
          nameSizeIn ? nameSizeIn.value : p.displayNameSize
        );
        var handleInputSave = root.querySelector("[data-tower-handle]");
        p.handle = normalizeHandle(handleInputSave ? handleInputSave.value : p.handle);
        p.socialLinks = p.socialLinks || {};
        SOCIAL_NETWORKS.forEach(function (net) {
          var input = root.querySelector('[data-tower-social="' + net.id + '"]');
          p.socialLinks[net.id] = input ? safeHttpUrl(input.value) : "";
        });
        p.customHtml = sanitizeProfileHtml(htmlInput ? htmlInput.value : "");
        var sloganIn = root.querySelector("[data-tower-slogan]");
        p.slogan = sloganIn ? String(sloganIn.value || "").trim().slice(0, 400) : (p.slogan || "");
        p.badges = { role: "", interest: "", status: "" };
        if (!Array.isArray(p.awardedBadges)) {
          seedAwardedBadgesIfMissing(p);
        }
        var countSel = root.querySelector("[data-tower-friends-count]");
        var n = parseInt(countSel && countSel.value ? countSel.value : "3", 10);
        if ([3, 6, 8].indexOf(n) === -1) n = 3;
        p.friendsDisplayCount = n;
        p.featuredFriendIds = (p.featuredFriendIds || []).slice(0, n);
        var titleIn = root.querySelector("[data-tower-music-title]");
        var urlIn = root.querySelector("[data-tower-music-url]");
        var enIn = root.querySelector("[data-tower-music-enable]");
        var artistIn = root.querySelector("[data-tower-music-artist]");
        var skinIn = root.querySelector("[data-tower-music-skin]");
        p.musicTitle = titleIn ? titleIn.value.trim().slice(0, 120) : "";
        p.musicArtist = artistIn ? artistIn.value.trim().slice(0, 120) : "";
        p.musicUrl = urlIn ? urlIn.value.trim().slice(0, 500) : "";
        p.musicEnabled = enIn ? !!enIn.checked : true;
        p.musicSkin = skinIn && skinIn.value ? skinIn.value : "classic";
        /* Prefer radio look for the single YouTube/radio widget when unset */
        if (p.musicUrl && parseYoutubeVideoId(p.musicUrl) && (!skinIn || !skinIn.value)) {
          p.musicSkin = "radio";
        }
        p.videoEnabled = false;
        p.videoUrl = "";
        if (p.musicYoutubeWidth == null) p.musicYoutubeWidth = 320;
        else p.musicYoutubeWidth = Math.max(180, Math.min(720, parseInt(p.musicYoutubeWidth, 10) || 320));
        var videoUrlIn = root.querySelector("[data-tower-video-url]");
        var videoTitleIn = root.querySelector("[data-tower-video-title]");
        var videoEnIn = root.querySelector("[data-tower-video-enable]");
        p.videoUrl = videoUrlIn ? videoUrlIn.value.trim().slice(0, 500) : (p.videoUrl || "");
        p.videoTitle = videoTitleIn ? videoTitleIn.value.trim().slice(0, 120) : (p.videoTitle || "");
        p.videoEnabled = videoEnIn ? !!videoEnIn.checked : (p.videoEnabled !== false);
        if (p.videoWidth == null) p.videoWidth = 360;
        else p.videoWidth = Math.max(200, Math.min(900, parseInt(p.videoWidth, 10) || 360));
        var frameInput = root.querySelector("[data-tower-avatar-frame-input]");
        p.avatarFrame = normalizeFrameId(frameInput ? frameInput.value : p.avatarFrame);
        var cowboyColorIn = root.querySelector("[data-tower-cowboy-color-input]");
        p.cowboyHatColor = normalizeCowboyHatColor(cowboyColorIn ? cowboyColorIn.value : p.cowboyHatColor);
        var ornamentInput = root.querySelector("[data-tower-avatar-ornament-input]");
        var ornamentPosInput = root.querySelector("[data-tower-avatar-ornament-pos-input]");
        p.avatarOrnament = normalizeOrnamentId(ornamentInput ? ornamentInput.value : p.avatarOrnament);
        p.avatarOrnamentPos = normalizeOrnamentPos(ornamentPosInput ? ornamentPosInput.value : p.avatarOrnamentPos);
        /* Public look fields live on the public-look panel (not Edit profile).
           Keep reading if present so Save profile does not wipe them. */
        var fontIn = root.querySelector("[data-tower-font]");
        var feedBgIn = root.querySelector("[data-tower-feed-bg]");
        var pubTextIn = root.querySelector("[data-tower-public-text]");
        var pubBtnIn = root.querySelector("[data-tower-public-btn]");
        var bgModeIn = root.querySelector("[data-tower-bg-mode]");
        var bgHtmlIn = root.querySelector("[data-tower-bg-html]");
        if (fontIn) p.towerFont = normalizeTowerFont(fontIn.value);
        if (feedBgIn) p.feedBackgroundColor = normalizeFeedBgColor(feedBgIn.value);
        if (pubTextIn) p.publicTextColor = normalizePublicThemeColor(pubTextIn.value, "#4a2c3a");
        if (pubBtnIn) p.publicButtonColor = normalizePublicThemeColor(pubBtnIn.value, "#f4a4c4");
        if (bgModeIn) {
          p.backgroundMode = normalizeBackgroundMode(bgModeIn.value, null, null);
          if (p.backgroundMode === "collage" && root.querySelector("[data-tower-collage-layout]")) {
            p.backgroundCollage = readCollageFromForm(root);
          }
          if (p.backgroundMode === "html" && bgHtmlIn) {
            p.backgroundHtml = sanitizeProfileHtml(String(bgHtmlIn.value || "").slice(0, 8000));
          }
        } else if (root.querySelector("[data-tower-collage-layout]")) {
          p.backgroundCollage = readCollageFromForm(root);
        }
        /* keep widgetLayout as last dragged */
        if (!p.widgetLayout) p.widgetLayout = JSON.parse(JSON.stringify(DEFAULT_WIDGET_LAYOUT));
        p.publicWidgets = readPublicWidgetsFromForm(root);
        if (!TowerProfileStore.save(p)) {
          setProfileStatus("Could not save profile (storage full or blocked). Try a smaller photo.", true);
          return;
        }
        setProfileStatus("Profile saved — refreshing…", false);
        try {
          sessionStorage.setItem("cognation.tower.stay", "1");
        } catch (err) {}
        /* Auto-refresh so scrapbook, frames, font, and feed color paint cleanly */
        window.setTimeout(function () {
          window.location.reload();
        }, 250);
      });
    }

    function applyAvatarFile(file, statusFn) {
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        (statusFn || setProfileStatus)("Choose an image file.", true);
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var p = TowerProfileStore.get();
        p.avatarDataUrl = String(reader.result || "");
        if (!TowerProfileStore.save(p)) {
          (statusFn || setProfileStatus)("Could not save photo (storage full). Try a smaller image.", true);
          return;
        }
        renderProfileChrome(root);
        (statusFn || setProfileStatus)("Profile picture updated.", false);
      };
      reader.onerror = function () {
        (statusFn || setProfileStatus)("Could not read that image.", true);
      };
      reader.readAsDataURL(file);
    }

    if (avatarFile) {
      avatarFile.addEventListener("change", function () {
        var file = avatarFile.files && avatarFile.files[0];
        applyAvatarFile(file, setProfileStatus);
        try { avatarFile.value = ""; } catch (eClr) {}
      });
    }
    var avatarFilePanel = root.querySelector("[data-tower-avatar-file-panel]");
    if (avatarFilePanel && !avatarFilePanel.__cognationAvatarPanelBound) {
      avatarFilePanel.__cognationAvatarPanelBound = true;
      avatarFilePanel.addEventListener("change", function () {
        var file = avatarFilePanel.files && avatarFilePanel.files[0];
        applyAvatarFile(file, setProfileStatus);
        try { avatarFilePanel.value = ""; } catch (eClr2) {}
      });
    }
    var clearAvatarBtn = root.querySelector("[data-tower-clear-avatar]");
    if (clearAvatarBtn && !clearAvatarBtn.__cognationClearAvatarBound) {
      clearAvatarBtn.__cognationClearAvatarBound = true;
      clearAvatarBtn.addEventListener("click", function () {
        var p = TowerProfileStore.get();
        p.avatarDataUrl = "";
        TowerProfileStore.save(p);
        renderProfileChrome(root);
        setProfileStatus("Profile photo removed.", false);
      });
    }

    var htmlLive = root.querySelector("[data-tower-profile-html]");
    if (htmlLive) {
      htmlLive.addEventListener("input", function () {
        var preview = root.querySelector("[data-tower-html-preview]");
        if (preview) preview.innerHTML = sanitizeProfileHtml(htmlLive.value);
      });
    }

    var sloganLive = root.querySelector("[data-tower-slogan]");
    if (sloganLive && !sloganLive.__cognationSloganLiveBound) {
      sloganLive.__cognationSloganLiveBound = true;
      sloganLive.addEventListener("input", function () {
        var display = root.querySelector("[data-tower-slogan-display]");
        var text = String(sloganLive.value || "").trim().slice(0, 400);
        if (display) display.textContent = text;
        var sticker = root.querySelector('[data-tower-widget="slogan"]');
        var widgets = normalizePublicWidgets(TowerProfileStore.get().publicWidgets);
        var show = !!text && widgets.slogan !== false;
        if (sticker) {
          sticker.hidden = !show;
          sticker.classList.toggle("is-widget-off", !show);
        }
      });
    }

    var skinInLive = root.querySelector("[data-tower-music-skin]");
    if (skinInLive) {
      skinInLive.addEventListener("change", function () {
        var cur = TowerProfileStore.get();
        cur.musicSkin = skinInLive.value || "classic";
        TowerProfileStore.save(cur);
        initTowerMusic(root, cur);
      });
    }
    /* Public look live preview is handled by initPublicLookControls. */

    document.addEventListener("cognation:session-started", function () {
      renderAwardedBadgeShelf(root, TowerProfileStore.get());
    });


    var friendsCount = root.querySelector("[data-tower-friends-count]");
    if (friendsCount) {
      friendsCount.addEventListener("change", function () {
        var cur = TowerProfileStore.get();
        var n = parseInt(friendsCount.value, 10);
        if ([3, 6, 8].indexOf(n) === -1) n = 3;
        cur.friendsDisplayCount = n;
        cur.featuredFriendIds = (cur.featuredFriendIds || []).slice(0, n);
        TowerProfileStore.save(cur);
        renderFriendsPicker(root, cur);
      });
    }

    var saveFriendsBtn = root.querySelector("[data-tower-save-friends]");
    if (saveFriendsBtn && !saveFriendsBtn.__cognationFriendsSaveBound) {
      saveFriendsBtn.__cognationFriendsSaveBound = true;
      saveFriendsBtn.addEventListener("click", function () {
        var cur = TowerProfileStore.get();
        var countSel = root.querySelector("[data-tower-friends-count]");
        var n = parseInt(countSel && countSel.value ? countSel.value : cur.friendsDisplayCount || 3, 10);
        if ([3, 6, 8].indexOf(n) === -1) n = 3;
        var ids = (cur.featuredFriendIds || []).slice();
        /* Prefer live selected chips if present */
        var chips = root.querySelectorAll("[data-tower-friends-chips] .tower-friend-chip.is-selected[data-friend-id]");
        if (chips && chips.length) {
          ids = [];
          chips.forEach(function (btn) {
            var id = btn.getAttribute("data-friend-id");
            if (id && ids.indexOf(id) < 0) ids.push(id);
          });
        }
        cur.friendsDisplayCount = n;
        cur.featuredFriendIds = ids.slice(0, n);
        ensureFriendPinPositions(cur, cur.featuredFriendIds);
        if (!TowerProfileStore.save(cur)) {
          var stFail = root.querySelector("[data-tower-friends-status]");
          if (stFail) stFail.textContent = "Could not save top friends.";
          return;
        }
        renderFriendsPicker(root, cur);
        renderFriendPins(root, cur);
        var st = root.querySelector("[data-tower-friends-status]");
        if (st) {
          var count = cur.featuredFriendIds.length;
          st.textContent = "Top friends saved";
        }
      });
    }

    var saveBadgesBtn = root.querySelector("[data-tower-save-badges]");
    if (saveBadgesBtn && !saveBadgesBtn.__cognationBadgesSaveBound) {
      saveBadgesBtn.__cognationBadgesSaveBound = true;
      saveBadgesBtn.addEventListener("click", function () {
        var cur = TowerProfileStore.get();
        if (!cur.badgeVisibility || typeof cur.badgeVisibility !== "object") {
          cur.badgeVisibility = {};
        }
        var box = root.querySelector("[data-tower-badge-visibility]");
        if (box) {
          box.querySelectorAll("[data-tower-badge-vis]").forEach(function (cb) {
            var id = cb.getAttribute("data-tower-badge-vis");
            if (!id) return;
            cur.badgeVisibility[id] = !!cb.checked;
          });
        }
        var visibleIds = collectVisibleBadgePins(cur).map(function (it) { return it.id; });
        ensureBadgePinPositions(cur, visibleIds);
        if (!TowerProfileStore.save(cur)) {
          setBadgeDisplayStatus(root, "Could not save badge display.");
          return;
        }
        renderAwardedBadgeShelf(root, cur);
        syncBadgeVisibilityUi(root, cur);
        setBadgeDisplayStatus(root, "Badge display saved");
      });
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var attachments = [];
        var files = fileInput && fileInput.files ? Array.prototype.slice.call(fileInput.files) : [];
        var kind = (kindSelect && kindSelect.value) || "document";
        files.forEach(function (f) {
          attachments.push({
            kind: kind,
            label: f.name,
            name: f.name,
            /* Demo only — we store metadata, not binary blobs */
            demoMeta: true,
            size: f.size,
            type: f.type || "",
          });
        });
        var result = TowerStore.add({
          authorName: postAuthorFromProfile(TowerProfileStore.get()),
          body: bodyInput ? bodyInput.value : "",
          attachments: attachments,
        });
        if (!result.ok) {
          setStatus(result.error || "Could not post.", true);
          return;
        }
        if (bodyInput) bodyInput.value = "";
        if (fileInput) fileInput.value = "";
        setStatus("Posted to Tower. Local COMMUNE will pick this up.", false);
        renderFeed(root);
      });
    }

    document.addEventListener("cognation:tower-updated", function () {
      renderFeed(root);
    });
  }

  window.CognationTowerIsFounderOwner = isFounderOwner;
  window.CognationTowerApplySide = function (side) {
    document.querySelectorAll("[data-tower-app]").forEach(function (root) {
      applyTowerSide(root, side);
    });
  };
  window.CognationTowerProfilePublicUrl = function (profile) {
    return profilePublicUrl(profile);
  };

  function boot() {
    document.querySelectorAll("[data-tower-app]").forEach(initTower);
    /* Hash deep-link to a profile → public scrapbook side */
    if (hashRequestsPublicSide()) {
      document.querySelectorAll("[data-tower-app]").forEach(function (root) {
        applyTowerSide(root, "public");
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
