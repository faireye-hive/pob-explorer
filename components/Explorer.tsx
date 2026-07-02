import React, { useEffect, useState } from "react";
import {
  getHivePosts,
  getTribeInfo,
  getTrendingTags,
} from "../services/hiveEngineService";
import { HivePost, TribeInfo } from "../types";
import { communityConfig } from "../config";
import { sanitizeUrl } from "../utils/security";
import { extractImage } from "../utils/image";
import {
  MessageCircle,
  Heart,
  Calendar,
  ExternalLink,
  Filter,
  Loader2,
  Info,
  ThumbsDown,
  Edit3,
  LayoutGrid,
  List,
  ChevronRight,
  Home,
  Search,
  Star,
  StarOff,
  PanelLeftClose,
  PanelLeftOpen,
  Code2,
  Globe,
  Database,
  Cloud,
  Blocks,
  Smartphone,
  Wrench,
  Sparkles,
  Hash,
  Layers,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCommunity } from "../contexts/CommunityContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { TOPICS } from "../constants";
import { VotersModal } from "./VotersModal";

const getTopicIcon = (id: string, size = 16) => {
  switch (id) {
    case "javascript":
      return <Code2 size={size} />;
    case "webdev":
      return <Globe size={size} />;
    case "backend":
      return <Database size={size} />;
    case "devops":
      return <Cloud size={size} />;
    case "blockchain":
      return <Blocks size={size} />;
    case "mobile":
      return <Smartphone size={size} />;
    case "tools":
      return <Wrench size={size} />;
    case "ai":
      return <Sparkles size={size} />;
    default:
      return <Layers size={size} />;
  }
};

const Explorer: React.FC = () => {
  const { user, vote } = useAuth();
  const { community } = useCommunity();
  const { t } = useLanguage();
  const [, setSearchParams] = useSearchParams();
  const globalLocation = useLocation();
  const actualLocation = globalLocation.state?.backgroundLocation || globalLocation;
  const currentSearchParams = new URLSearchParams(actualLocation.search);
  
  const initialTag = currentSearchParams.get("tag") || "";
  const initialParentTag =
    TOPICS.find((t) => t.id === initialTag || t.sub.includes(initialTag))?.id ||
    null;

  const [posts, setPosts] = useState<HivePost[]>([]);
  const [tribeInfo, setTribeInfo] = useState<TribeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"created" | "trending" | "hot">("created");
  const [tag, setTag] = useState<string>(initialTag);
  const [selectedParentTag, setSelectedParentTag] = useState<string | null>(
    initialParentTag,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [votingPost, setVotingPost] = useState<string | null>(null); // permlink of post being voted on
  const [votersModalPost, setVotersModalPost] = useState<HivePost | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    return (
      (localStorage.getItem("explorer_view_mode") as "grid" | "list") || "grid"
    );
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<
    "collapsed" | "expanded"
  >(() => {
    return (
      (localStorage.getItem("explorer_sidebar_mode") as
        "collapsed" | "expanded") || "expanded"
    );
  });

  const [categorySearch, setCategorySearch] = useState("");
  const [favoriteTags, setFavoriteTags] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("favoriteTags") || "[]");
    } catch {
      return [];
    }
  });
  const [trendingTags, setTrendingTags] = useState<string[]>([]);

  const toggleFavorite = (e: React.MouseEvent, tagStr: string) => {
    e.stopPropagation();
    setFavoriteTags((prev) => {
      const newFavs = prev.includes(tagStr)
        ? prev.filter((t) => t !== tagStr)
        : [...prev, tagStr];
      localStorage.setItem("favoriteTags", JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const filteredTopics = TOPICS.map((t) => {
    const lowerSearch = categorySearch.toLowerCase().trim();
    if (!lowerSearch) return { ...t, expandAlways: false };

    const matchesParent =
      t.label.toLowerCase().includes(lowerSearch) ||
      t.id.toLowerCase().includes(lowerSearch);
    const matchingSub = t.sub.filter((s) =>
      s.toLowerCase().includes(lowerSearch),
    );

    if (matchesParent || matchingSub.length > 0) {
      return {
        ...t,
        sub: matchesParent ? t.sub : matchingSub,
        expandAlways: true,
      };
    }
    return null;
  }).filter(Boolean) as any[];

  // If URL changes, update the states
  useEffect(() => {
    const params = new URLSearchParams(actualLocation.search);
    const freshTag = params.get("tag") || "";
    setTag(freshTag);
    setSelectedParentTag(
      TOPICS.find((t) => t.id === freshTag || t.sub.includes(freshTag))?.id ||
        null,
    );
  }, [actualLocation.search]);

  useEffect(() => {
    localStorage.setItem("explorer_view_mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem("explorer_sidebar_mode", sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    const init = async () => {
      const [info, tags] = await Promise.all([
        getTribeInfo(community),
        getTrendingTags(community, 20),
      ]);
      setTribeInfo(info);
      setTrendingTags(tags);
      fetchPosts(true);
    };
    init();
  }, [sort, community, tag]);

  const fetchPosts = async (reset: boolean, silent: boolean = false) => {
    if (reset && !silent) {
      setLoading(true);
      setPosts([]);
    } else if (!reset) {
      setLoadingMore(true);
    }

    let startAuthor, startPermlink;
    if (!reset && posts.length > 0) {
      const lastPost = posts[posts.length - 1];
      startAuthor = lastPost.author;
      startPermlink = lastPost.permlink;
    }

    const data = await getHivePosts(
      community,
      sort,
      20,
      startAuthor,
      startPermlink,
      tag,
    );

    if (reset) {
      setPosts(data);
    } else {
      const newPosts = data.filter(
        (p) => !posts.find((existing) => existing.permlink === p.permlink),
      );
      setPosts((prev) => [...prev, ...newPosts]);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    const handleByteUpdate = (e: any) => {
      if (e.detail?.sort === sort) {
        fetchPosts(true, true);
      }
    };
    window.addEventListener("byte-data-updated", handleByteUpdate);
    return () =>
      window.removeEventListener("byte-data-updated", handleByteUpdate);
  }, [sort, community, tag]);

  const handleVote = async (post: HivePost) => {
    if (!user) {
      alert("Faça login para votar!");
      return;
    }

    if (votingPost) return;

    // Check if already voted
    const alreadyVoted = post.active_votes?.some((v) => v.voter === user);
    if (alreadyVoted) {
      alert("Você já votou neste post.");
      return;
    }

    setVotingPost(post.permlink);

    // Default 100% vote
    const weight = 10000;

    try {
      const result = await vote(post.author, post.permlink, weight);
      if (result.success) {
        // Optimistic UI Update
        setPosts((currentPosts) =>
          currentPosts.map((p) => {
            if (p.permlink === post.permlink) {
              return {
                ...p,
                net_votes: p.net_votes + 1,
                active_votes: [
                  ...(p.active_votes || []),
                  { voter: user, weight, rshares: 0, percent: weight },
                ],
              };
            }
            return p;
          }),
        );
      } else {
        alert(`Erro ao votar: ${result.msg}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVotingPost(null);
    }
  };

  const getCalculatedReward = (post: HivePost) => {
    try {
      const precision = post.precision ?? tribeInfo?.precision ?? (communityConfig.tokenSymbol.toUpperCase() === 'POB' ? 8 : 2);

      // 1. Prioritize pending_token if present and valid
      if (post.pending_token != null && post.pending_token > 0) {
        return (post.pending_token / Math.pow(10, precision)).toFixed(precision);
      }

      // 2. Check if post is paid out (author_payout_value, curator_payout_value, beneficiary_payout_value)
      const authorPayout = Number((post as any).author_payout_value) || 0;
      const curatorPayout = Number((post as any).curator_payout_value) || 0;
      const beneficiaryPayout = Number((post as any).beneficiary_payout_value) || 0;
      const totalPaid = authorPayout + curatorPayout + beneficiaryPayout;
      if (totalPaid > 0) {
        return (totalPaid / Math.pow(10, precision)).toFixed(precision);
      }

      // 3. Dynamic Calculation using rshares as a fallback
      if (tribeInfo && post.vote_rshares != null) {
        const rshares = Number(post.vote_rshares);
        const exponent =
          tribeInfo.author_curve_exponent != null
            ? Number(tribeInfo.author_curve_exponent)
            : 1;
        const rewardPool =
          tribeInfo.reward_pool != null ? parseFloat(tribeInfo.reward_pool) : 0;
        const pendingRshares =
          tribeInfo.pending_rshares != null
            ? parseFloat(tribeInfo.pending_rshares)
            : 0;

        if (pendingRshares > 0 && rewardPool > 0 && !isNaN(rshares)) {
          const estimate =
            ((Math.pow(rshares, exponent) * rewardPool) / pendingRshares) / Math.pow(10, precision);
          if (!isNaN(estimate)) {
            return estimate.toFixed(precision);
          }
        }
      }

      return (0).toFixed(precision);
    } catch (e) {
      console.error("Error calculating reward", e);
      return (0).toFixed(tribeInfo?.precision ?? 2);
    }
  };

  const getVoteCounts = (post: HivePost) => {
    if (!post.active_votes || !Array.isArray(post.active_votes)) {
      // Fallback if active_votes is missing, assuming net_votes are mostly upvotes
      return { up: post.net_votes, down: 0 };
    }

    let up = 0;
    let down = 0;

    post.active_votes.forEach((vote) => {
      if (vote.percent > 0) up++;
      else if (vote.percent < 0) down++;
    });

    return { up, down };
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString + "Z");
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
  };

  const getExcerpt = (text: string, length: number = 180) => {
    if (!text) return "";
    let cleanText = text
      .replace(/!\[.*?\]\((.*?)\)/g, "") // remove markdown images
      .replace(/\[(.*?)\]\((.*?)\)/g, "$1") // replace markdown links with text
      .replace(/(https?:\/\/[^\s]+)/g, "") // remove bare URLs
      .replace(/<[^>]*>?/gm, "") // remove HTML tags
      .replace(/[#*`_~>\|-]/g, "") // remove markdown symbols
      .replace(/\n+/g, " ") // replace newlines with space
      .replace(/\s+/g, " ") // replace multiple spaces with single space
      .trim();
    return cleanText.length > length
      ? cleanText.substring(0, length) + "..."
      : cleanText;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      {/* Breadcrumb */}
      <nav className="flex text-sm text-slate-400 font-medium whitespace-nowrap overflow-x-auto pb-2 scrollbar-none items-center gap-2">
        <Link
          to="/discovery"
          className="hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <Home size={14} /> {t("nav.discover")}
        </Link>
        <ChevronRight size={14} className="opacity-50 shrink-0" />
        <Link
          to="/explorer"
          onClick={(e) => {
            if (!tag) e.preventDefault();
            setSearchParams({});
          }}
          className={`transition-colors ${!tag ? "text-white" : "hover:text-white"}`}
        >
          {t("nav.explorer")}
        </Link>
        {tag && (
          <>
            <ChevronRight size={14} className="opacity-50 shrink-0" />
            <span className="text-white capitalize truncate max-w-[150px] sm:max-w-none px-2 py-0.5 bg-slate-800 rounded-md shadow-sm border border-slate-700/50">
              #{tag}
            </span>
          </>
        )}
      </nav>

      <div className="flex flex-col sm:flex-row justify-between items-center bg-card p-6 rounded-2xl border border-slate-700/50 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 py-12 px-16 bg-cent/5 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="w-full sm:w-auto mb-4 sm:mb-0 relative z-10">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-white flex items-center gap-2">
            <span className="text-cent">#{community}</span>{" "}
            {t("explorer.title")}
          </h2>
          <p className="text-slate-400 text-sm mt-2 flex items-center gap-2 font-medium">
            {t("explorer.subtitle")}
            {tribeInfo && tribeInfo.reward_pool && (
              <span className="bg-slate-800 text-xs px-2 py-0.5 rounded text-cent border border-cent/20 font-mono">
                Pool: {(parseFloat(tribeInfo.reward_pool) / Math.pow(10, tribeInfo.precision ?? 2)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: tribeInfo.precision ?? 2 })} {community}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto relative z-10">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <Link
              to="/create-post"
              className="flex items-center gap-2 bg-cent text-slate-900 px-4 py-2.5 text-sm rounded-lg font-bold hover:shadow-[0_0_15px_rgba(255,200,0,0.3)] transition-all whitespace-nowrap"
            >
              <Edit3 size={16} />
              {t("nav.post")}
            </Link>

            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700 shadow-inner">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-slate-800 text-cent shadow border border-slate-700/50" : "text-slate-500 hover:text-white"}`}
                title="Modo Grid"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-slate-800 text-cent shadow border border-slate-700/50" : "text-slate-500 hover:text-white"}`}
                title="Modo Lista"
              >
                <List size={18} />
              </button>
            </div>
          </div>
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700 w-full sm:w-auto overflow-x-auto shadow-inner">
            {(["created", "trending", "hot"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all capitalize whitespace-nowrap ${
                  sort === s
                    ? "bg-cent text-slate-900 shadow-lg"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                {s === "created"
                  ? t("explorer.new")
                  : s === "hot"
                    ? t("explorer.trending")
                    : t("explorer.hot")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Trending Tags */}
      <div className="lg:hidden w-full overflow-x-auto py-2 flex items-center gap-2 scrollbar-hide mb-2 mt-4">
        <button
          onClick={() => setSearchParams({})}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!tag ? "bg-cent text-slate-900 font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
        >
          {t("explorer.all")}
        </button>
        {trendingTags.map((tStr) => (
          <button
            key={`mob-${tStr}`}
            onClick={() => setSearchParams({ tag: tStr })}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tag === tStr ? "bg-cent text-slate-900 font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
          >
            #{tStr}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 relative">
        {/* Sidebar */}
        <div
          className={`shrink-0 transition-all duration-300 hidden lg:block ${sidebarCollapsed === "expanded" ? "lg:w-64" : "lg:w-12"}`}
        >
          <div className="bg-card p-5 rounded-2xl border border-slate-700/50 shadow-lg sticky top-24">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700/50">
              {sidebarCollapsed === "expanded" && (
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Filter size={18} className="text-cent" />
                  {t("explorer.categories")}
                </div>
              )}
              <button
                onClick={() =>
                  setSidebarCollapsed((prev) =>
                    prev === "expanded" ? "collapsed" : "expanded",
                  )
                }
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                {sidebarCollapsed === "expanded" ? (
                  <PanelLeftClose size={18} />
                ) : (
                  <PanelLeftOpen size={18} />
                )}
              </button>
            </div>

            {sidebarCollapsed === "expanded" ? (
              <>
                {/* Search Input */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder={t("explorer.search")}
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cent/50 transition-colors"
                  />
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <button
                      onClick={() => setSearchParams({})}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${!selectedParentTag && !tag ? "bg-cent/10 text-cent border border-cent/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                    >
                      {t("explorer.all")}
                    </button>
                  </div>

                  {favoriteTags.length > 0 && !categorySearch && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2 px-1">
                        {t("explorer.favorites")}
                      </div>
                      <div className="space-y-1">
                        {favoriteTags.map((favTag) => {
                          const parentTopic = TOPICS.find(
                            (t) => t.id === favTag || t.sub.includes(favTag),
                          );
                          return (
                            <div
                              key={`fav-${favTag}`}
                              className="relative group"
                            >
                              <button
                                onClick={() => setSearchParams({ tag: favTag })}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium transition-all pr-8 flex items-center gap-2 ${tag === favTag ? "bg-cent/10 text-cent font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                              >
                                <span className="opacity-50">
                                  {parentTopic ? (
                                    getTopicIcon(parentTopic.id, 14)
                                  ) : (
                                    <Hash size={14} />
                                  )}
                                </span>
                                <span>{favTag}</span>
                              </button>
                              <button
                                onClick={(e) => toggleFavorite(e, favTag)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-cent transition-opacity"
                                title="Remover dos favoritos"
                              >
                                <StarOff
                                  size={14}
                                  className="text-slate-400 hover:text-red-400"
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2 px-1">
                      Todas Categorias
                    </div>
                    <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                      {filteredTopics.map((t) => (
                        <div key={t.id} className="space-y-1">
                          <div className="relative group">
                            <button
                              onClick={() => {
                                if (
                                  selectedParentTag === t.id &&
                                  !t.expandAlways
                                ) {
                                  setSearchParams({});
                                } else {
                                  setSearchParams({ tag: t.id });
                                }
                              }}
                              className={`w-full text-left px-3 py-2 pr-8 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${selectedParentTag === t.id ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span
                                  className={
                                    selectedParentTag === t.id
                                      ? "text-cent"
                                      : "text-slate-500"
                                  }
                                >
                                  {getTopicIcon(t.id, 16)}
                                </span>
                                <span className="truncate">{t.label}</span>
                              </div>
                            </button>
                            <button
                              onClick={(e) => toggleFavorite(e, t.id)}
                              title={
                                favoriteTags.includes(t.id)
                                  ? "Remover favorito"
                                  : "Favoritar categoria"
                              }
                              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-opacity ${favoriteTags.includes(t.id) ? "opacity-100 text-cent" : "opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300"}`}
                            >
                              <Star
                                size={14}
                                className={
                                  favoriteTags.includes(t.id) ? "fill-cent" : ""
                                }
                              />
                            </button>
                          </div>

                          {(selectedParentTag === t.id || t.expandAlways) && (
                            <div className="pl-3 py-1 space-y-1 border-l-2 border-slate-800 ml-3">
                              {t.sub.map((sub) => (
                                <div key={sub} className="relative group">
                                  <button
                                    onClick={() =>
                                      setSearchParams({ tag: sub })
                                    }
                                    className={`w-full text-left px-3 py-1.5 pr-8 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${tag === sub ? "text-cent bg-cent/10 font-bold" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}
                                  >
                                    <Hash size={12} className="opacity-50" />
                                    <span className="truncate block">
                                      {sub}
                                    </span>
                                  </button>
                                  <button
                                    onClick={(e) => toggleFavorite(e, sub)}
                                    title={
                                      favoriteTags.includes(sub)
                                        ? "Remover favorito"
                                        : "Favoritar tag"
                                    }
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-opacity ${favoriteTags.includes(sub) ? "opacity-100 text-cent" : "opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300"}`}
                                  >
                                    <Star
                                      size={12}
                                      className={
                                        favoriteTags.includes(sub)
                                          ? "fill-cent"
                                          : ""
                                      }
                                    />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {filteredTopics.length === 0 && (
                        <div className="text-center text-slate-500 text-sm py-4">
                          Nenhuma categoria encontrada
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 mt-4">
                {/* Collapsed icons */}
                <button
                  onClick={() => setSearchParams({})}
                  className={`p-2 rounded-lg transition-all ${!selectedParentTag && !tag ? "bg-cent/10 text-cent border border-cent/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                  title="Tudo"
                >
                  <Layers size={18} />
                </button>

                <div className="w-full h-px bg-slate-800 my-2"></div>

                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSearchParams({ tag: t.id });
                      setSidebarCollapsed("expanded");
                    }}
                    className={`p-2 rounded-lg transition-all ${selectedParentTag === t.id ? "bg-cent/10 text-cent border border-cent/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                    title={t.label}
                  >
                    {getTopicIcon(t.id, 18)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 transition-all duration-300">
          {loading ? (
            <div
              className={
                viewMode === "grid"
                  ? `grid grid-cols-1 md:grid-cols-2 ${sidebarCollapsed === "collapsed" ? "lg:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-2 xl:grid-cols-3"} gap-6`
                  : "flex flex-col gap-4"
              }
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className={`bg-card animate-pulse border border-slate-700/50 ${viewMode === "grid" ? "rounded-xl h-80" : "rounded-xl h-36 flex flex-col justify-center"}`}
                >
                  {viewMode === "grid" && (
                    <div className="h-40 bg-slate-700/50 rounded-t-xl"></div>
                  )}
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-700/50 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-700/50 rounded w-1/4 mt-4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded-2xl border border-slate-700/50">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Edit3 size={32} className="text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {t("explorer.emptyState")}
              </h3>
              <p className="text-slate-400 max-w-md mb-6">
                {t("explorer.emptyStateText")}
                {tag ? (
                  <span>
                    {" "}
                    com a tag{" "}
                    <span className="font-mono text-cent bg-cent/10 px-1.5 py-0.5 rounded">
                      #{tag}
                    </span>
                  </span>
                ) : (
                  ""
                )}
                !
              </p>
              <Link
                to="/create-post"
                className="flex items-center gap-2 bg-cent text-slate-900 px-6 py-2.5 rounded-xl font-bold hover:bg-cent/90 transition-all shadow-lg shadow-cent/20"
              >
                <Edit3 size={18} />
                {t("explorer.createPost")}
              </Link>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? `grid grid-cols-1 md:grid-cols-2 ${sidebarCollapsed === "collapsed" ? "lg:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-2 xl:grid-cols-3"} gap-6`
                  : "flex flex-col gap-5"
              }
            >
              {posts.map((post) => {
                const thumbnail = extractImage(post);
                const reward = getCalculatedReward(post);
                const isPaid =
                  post.cashout_time &&
                  new Date(post.cashout_time + "Z").getTime() < Date.now();
                const { up, down } = getVoteCounts(post);
                const userHasVoted =
                  user && post.active_votes?.some((v) => v.voter === user);
                const isVotingThis = votingPost === post.permlink;
                const excerpt = getExcerpt(post.desc || post.body, 180);

                let postTags: string[] = [];
                try {
                  const meta = JSON.parse(post.json_metadata || "{}");
                  postTags = Array.isArray(meta.tags)
                    ? meta.tags.filter((t: any) => typeof t === "string")
                    : [];
                } catch (e) {}

                const allOurTags = new Set(TOPICS.flatMap((t) => t.sub));
                const mainTag =
                  postTags.find((tag) => allOurTags.has(tag)) ||
                  postTags.find(
                    (tag) => tag !== community && tag !== "hive-192096",
                  ) ||
                  postTags[0];

                return (
                  <div
                    key={`${post.author}-${post.permlink}`}
                    className={`group bg-card rounded-2xl overflow-hidden border border-slate-700/50 hover:border-slate-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cent/5 flex ${viewMode === "list" ? "flex-col sm:flex-row items-stretch" : "flex-col h-full"}`}
                  >
                    {viewMode === "grid" && (
                      <div className="relative h-48 bg-slate-800 overflow-hidden shrink-0">
                        {thumbnail ? (
                          <img
                            src={`https://images.hive.blog/768x0/${thumbnail}`}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://placehold.co/600x400/1e293b/475569?text=No+Image";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">
                            <span className="font-mono text-xs">
                              Sem Imagem
                            </span>
                          </div>
                        )}
                        <div
                          className={`absolute top-3 right-3 ${isPaid ? "bg-slate-700/90 text-slate-300" : "bg-cent/90 text-slate-900"} backdrop-blur-sm font-bold px-2.5 py-1 rounded-md text-xs flex items-center gap-1 font-mono shadow-lg`}
                        >
                          {reward} {community}
                        </div>
                        {mainTag && (
                          <div className="absolute top-3 left-3 bg-slate-900/80 text-white backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium shadow-lg border border-slate-700/50 capitalize truncate max-w-[120px]">
                            #{mainTag}
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`p-5 flex flex-col flex-1 ${viewMode === "list" ? "justify-between" : ""}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Link
                          to={`/profile/${post.author}`}
                          className="shrink-0"
                        >
                          <img
                            src={`https://images.hive.blog/u/${post.author}/avatar`}
                            alt={post.author}
                            className="w-7 h-7 rounded-full border border-slate-600 object-cover hover:border-cent transition-colors"
                          />
                        </Link>
                        <Link
                          to={`/profile/${post.author}`}
                          className="text-xs font-bold text-slate-300 hover:text-cent cursor-pointer truncate"
                        >
                          @{post.author}
                        </Link>
                        {viewMode === "list" && mainTag && (
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs font-medium border border-slate-700/50 capitalize truncate max-w-[100px] ml-2">
                            #{mainTag}
                          </span>
                        )}
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1 ml-auto shrink-0">
                          <Calendar size={12} />
                          {timeAgo(post.created)}
                        </span>
                      </div>

                      <Link
                        to={`/@${post.author}/${post.permlink}`}
                        state={{ backgroundLocation: actualLocation }}
                        className="block flex-1 group-hover:text-cent transition-colors"
                      >
                        <h3
                          className={`font-bold text-white leading-tight mb-2 ${viewMode === "list" ? "text-xl" : "text-lg line-clamp-2"}`}
                        >
                          {post.title}
                        </h3>
                        {excerpt && (
                          <p
                            className={`text-slate-400 text-sm leading-relaxed font-medium ${viewMode === "grid" ? "line-clamp-3" : "line-clamp-2"} mb-2`}
                          >
                            {excerpt}
                          </p>
                        )}
                      </Link>

                      <div
                        className={`flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-700/50 text-slate-400 text-xs`}
                      >
                        <div className="flex gap-4 items-center">
                          <div className="flex items-center gap-1.5 transition-colors">
                            <button
                              onClick={() => handleVote(post)}
                              disabled={userHasVoted || isVotingThis}
                              className={`${
                                userHasVoted
                                  ? "text-green-400"
                                  : "hover:text-green-300 text-slate-400"
                              }`}
                              title={
                                userHasVoted ? "Você já votou" : "Votar 100%"
                              }
                            >
                              {isVotingThis ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Heart
                                  size={16}
                                  className={
                                    userHasVoted ? "fill-green-400" : ""
                                  }
                                />
                              )}
                            </button>
                            <button
                              onClick={() => setVotersModalPost(post)}
                              className="font-medium text-sm hover:text-white transition-colors"
                              title="Ver quem votou"
                            >
                              {up}
                            </button>
                          </div>

                          {down > 0 && (
                            <span
                              className="flex items-center gap-1.5 text-red-400/90 hover:text-red-300 transition-colors"
                              title="Downvotes"
                            >
                              <ThumbsDown
                                size={14}
                                className="fill-red-400/20"
                              />{" "}
                              <span className="font-medium text-sm">
                                {down}
                              </span>
                            </span>
                          )}

                          <Link
                            to={`/@${post.author}/${post.permlink}#comments`}
                            state={{ backgroundLocation: actualLocation }}
                            className="flex items-center gap-1.5 hover:text-blue-400 transition-colors ml-1"
                          >
                            <MessageCircle size={16} />{" "}
                            <span className="font-medium text-sm">
                              {post.children}
                            </span>
                          </Link>
                        </div>

                        <div className="flex items-center gap-3">
                          {viewMode === "list" && (
                            <div
                              className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 font-mono text-xs ${isPaid ? "text-slate-400 bg-slate-800" : "text-cent bg-cent/10"}`}
                            >
                              {reward} {community}
                            </div>
                          )}
                          <a
                            href={`https://peakd.com/@${post.author}/${post.permlink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-white transition-colors"
                            title="Abrir no PeakD"
                          >
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {posts.length > 0 && !loading && (
            <div className="text-center mt-10">
              <button
                onClick={() => fetchPosts(false)}
                disabled={loadingMore}
                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full text-sm font-bold text-slate-300 transition-all flex items-center gap-2 mx-auto disabled:opacity-50 hover:shadow-lg"
              >
                {loadingMore && <Loader2 size={16} className="animate-spin" />}
                {loadingMore ? t("explorer.loading") : t("explorer.loadMore")}
              </button>
            </div>
          )}
        </div>
      </div>

      <VotersModal
        post={votersModalPost}
        isOpen={votersModalPost !== null}
        onClose={() => setVotersModalPost(null)}
        tribeInfo={tribeInfo}
      />
    </div>
  );
};

export default Explorer;
