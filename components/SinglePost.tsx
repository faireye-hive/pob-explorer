import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  getPostContent,
  getTribeInfo,
  getScotPost,
  getPostReplies,
} from "../services/hiveEngineService";
import { HivePost, TribeInfo } from "../types";
import { communityConfig } from "../config";
import {
  ArrowLeft,
  Calendar,
  Heart,
  MessageCircle,
  Share2,
  ThumbsDown,
  Loader2,
  Coins,
  Bug,
  X,
  User,
  Copy,
  Check,
  Settings,
  ChevronRight,
  Home,
} from "lucide-react";
import { marked } from "marked";
import { sanitizePostHtml } from "../utils/security";
import { useAuth } from "../contexts/AuthContext";
import { useCommunity } from "../contexts/CommunityContext";
import { useHiddenUsers } from "../utils/hiddenUsers";
import { useLanguage } from "../contexts/LanguageContext";
import { VotersModal } from "./VotersModal";

// Helper component for individual comments
const CommentItem: React.FC<{
  comment: HivePost;
  tribeInfo: TribeInfo | null;
  readerSettings: any;
}> = ({ comment, tribeInfo, readerSettings }) => {
  const [html, setHtml] = useState("");
  const { user, vote, comment: postComment } = useAuth();
  const { community } = useCommunity();
  const { hiddenUsers, hideUser } = useHiddenUsers();
  const [isVoting, setIsVoting] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [declinePayout, setDeclinePayout] = useState(false);
  // Local state for optimistic updates
  const [localComment, setLocalComment] = useState(comment);

  useEffect(() => {
    const parseBody = async () => {
      try {
        let bodyToParse = localComment.body || "";
        bodyToParse = bodyToParse.replace(
          /(?:^|\s)(https?:\/\/[^\s<"']+\.(?:png|jpe?g|gif|webp))/gi,
          " ![]($1)",
        );
        bodyToParse = bodyToParse.replace(
          /!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g,
          (match, alt, url) => {
            if (url.includes("images.hive.blog")) return match;
            return `![${alt}](https://images.hive.blog/0x0/${url})`;
          },
        );
        const rawHtml = await marked.parse(bodyToParse);
        const cleanHtml = sanitizePostHtml(rawHtml);
        setHtml(cleanHtml);
      } catch (e) {
        setHtml("<p>Erro ao carregar comentário.</p>");
      }
    };
    parseBody();
  }, [localComment.body]);

  const timeAgo = (dateString: string) => {
    if (!dateString) return "agora";
    const date = new Date(dateString + (dateString.endsWith("Z") ? "" : "Z"));
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return "agora";
    if (diff < 3600) return Math.floor(diff / 60) + "m";
    if (diff < 86400) return Math.floor(diff / 3600) + "h";
    return Math.floor(diff / 86400) + "d";
  };

  const getCalculatedCentReward = (p: HivePost) => {
    try {
      const precision = p.precision ?? tribeInfo?.precision ?? (communityConfig.tokenSymbol.toUpperCase() === 'POB' ? 8 : 2);

      // 1. Prioritize pending_token if present and valid
      if (p.pending_token != null && p.pending_token > 0) {
        return (p.pending_token / Math.pow(10, precision)).toFixed(precision);
      }

      // 2. Check if post is paid out
      const authorPayout = Number((p as any).author_payout_value) || 0;
      const curatorPayout = Number((p as any).curator_payout_value) || 0;
      const beneficiaryPayout = Number((p as any).beneficiary_payout_value) || 0;
      const totalPaid = authorPayout + curatorPayout + beneficiaryPayout;
      if (totalPaid > 0) {
        return (totalPaid / Math.pow(10, precision)).toFixed(precision);
      }

      // 3. Dynamic Calculation as fallback
      if (tribeInfo && p.vote_rshares != null) {
        const rshares = Number(p.vote_rshares);
        const exponent = Number(tribeInfo.author_curve_exponent || 1);
        const rewardPool = parseFloat(tribeInfo.reward_pool || "0");
        const pendingRshares = parseFloat(tribeInfo.pending_rshares || "0");

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
      return (0).toFixed(tribeInfo?.precision ?? 2);
    }
  };

  const handleVote = async () => {
    if (!user) {
      alert("Faça login para votar!");
      return;
    }
    const alreadyVoted = localComment.active_votes?.some(
      (v) => v.voter === user,
    );
    if (alreadyVoted) {
      alert("Você já votou neste comentário.");
      return;
    }

    setIsVoting(true);
    try {
      const result = await vote(
        localComment.author,
        localComment.permlink,
        10000,
      );
      if (result.success) {
        setLocalComment((prev) => ({
          ...prev,
          net_votes: (prev.net_votes || 0) + 1,
          active_votes: [
            ...(prev.active_votes || []),
            { voter: user, weight: 10000, percent: 10000, rshares: 0 },
          ],
        }));
      } else {
        alert("Erro ao votar: " + result.msg);
      }
    } catch (e) {
      console.error(e);
    }
    setIsVoting(false);
  };

  const handleReply = async () => {
    if (!user) return alert("Faça login para responder!");
    if (!replyText.trim()) return;

    setIsReplying(true);
    try {
      const result = await postComment(
        localComment.author,
        localComment.permlink,
        "",
        replyText,
        ["cent"],
        declinePayout,
      );
      if (result.success) {
        alert("Resposta publicada com sucesso!");
        setShowReplyBox(false);
        setReplyText("");
      } else {
        alert("Erro ao responder: " + result.msg);
      }
    } catch (e: any) {
      alert("Erro ao responder: " + e.message);
    }
    setIsReplying(false);
  };

  const rewardValue = getCalculatedCentReward(localComment);
  const userHasVoted =
    user && localComment.active_votes?.some((v) => v.voter === user);
  const netVotes = localComment.net_votes || 0;

  if (hiddenUsers.includes(localComment.author)) {
    return null;
  }

  return (
    <div className="border-b border-slate-800 py-6 last:border-0 relative group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <img
            src={`https://images.hive.blog/u/${localComment.author}/avatar`}
            alt={localComment.author}
            className="w-8 h-8 rounded-full border border-slate-600"
            onError={(e) =>
              ((e.target as HTMLImageElement).src = "https://placehold.co/32")
            }
          />
          <div className="flex items-center gap-2">
            <Link
              to={`/profile/${localComment.author}`}
              className="font-bold text-slate-300 text-sm hover:text-cent transition-colors"
            >
              @{localComment.author}
            </Link>
            <span className="text-xs text-slate-500">
              • {timeAgo(localComment.created)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => hideUser(localComment.author)}
            className="text-xs text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Ocultar comentários deste usuário"
          >
            Ocultar
          </button>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-cent/10 text-cent border border-cent/20 text-xs font-mono font-bold">
            <Coins size={12} /> {rewardValue} {community}
          </div>
        </div>
      </div>

      <div
        className={`prose ${readerSettings?.fontSize === "prose-xl" ? "prose-lg" : readerSettings?.fontSize === "prose-lg" ? "prose-base" : "prose-sm"} ${readerSettings?.fontFamily || "font-sans"} max-w-none text-slate-300 md:pl-11 prose-headings:text-slate-100 prose-p:text-slate-300 prose-a:text-cent hover:prose-a:text-cent/80 prose-blockquote:border-l-cent prose-blockquote:text-slate-400 prose-strong:text-slate-100 prose-ul:text-slate-300 prose-ol:text-slate-300 prose-li:text-slate-300 prose-code:text-slate-100 prose-code:bg-slate-800 prose-pre:bg-slate-800 prose-pre:text-slate-300 transition-all`}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="flex items-center gap-6 mt-4 md:pl-11">
        <button
          onClick={handleVote}
          disabled={userHasVoted || isVoting}
          className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${userHasVoted ? "text-green-400" : "text-slate-500 hover:text-green-400"}`}
        >
          {isVoting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Heart size={14} className={userHasVoted ? "fill-current" : ""} />
          )}
          {netVotes}
        </button>

        <button
          onClick={() => setShowReplyBox(!showReplyBox)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors"
        >
          <MessageCircle size={14} /> Responder
        </button>
      </div>

      {showReplyBox && (
        <div className="mt-4 md:pl-11 animate-fade-in">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Respondendo a @${localComment.author}...`}
            className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:outline-none focus:border-cent text-sm min-h-[80px]"
            disabled={isReplying}
          />
          <div className="flex justify-between items-center mt-2">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={declinePayout}
                onChange={(e) => setDeclinePayout(e.target.checked)}
                className="accent-cent bg-slate-800"
              />{" "}
              Decline Payout
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReplyBox(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleReply}
                disabled={isReplying || !replyText.trim()}
                className="bg-cent text-slate-900 px-4 py-1.5 text-xs rounded-lg font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
              >
                {isReplying ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}{" "}
                Responder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SinglePost: React.FC = () => {
  const { community } = useCommunity();
  const { author: rawAuthor, permlink } = useParams<{
    author: string;
    permlink: string;
  }>();
  const author = rawAuthor?.startsWith("@")
    ? rawAuthor.substring(1)
    : rawAuthor;
  const navigate = useNavigate();
  const location = useLocation();
  const { user, vote } = useAuth();
  const { t } = useLanguage();

  const isModal = Boolean(location.state?.backgroundLocation);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const [post, setPost] = useState<HivePost | null>(null);
  const [comments, setComments] = useState<HivePost[]>([]);
  const [tribeInfo, setTribeInfo] = useState<TribeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [isVoting, setIsVoting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Settings State
  const [readerSettings, setReaderSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("readerSettings");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { fontSize: "prose-lg", fontFamily: "font-sans" };
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showVotersModal, setShowVotersModal] = useState(false);

  useEffect(() => {
    localStorage.setItem("readerSettings", JSON.stringify(readerSettings));
  }, [readerSettings]);

  // Reply State
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [declinePayout, setDeclinePayout] = useState(false);
  const { comment: postComment } = useAuth();

  // Debug State
  const [debugData, setDebugData] = useState<any>({});
  const [copiedAuthorperm, setCopiedAuthorperm] = useState(false);

  const handleCopyAuthorperm = () => {
    if (author && permlink) {
      navigator.clipboard.writeText(`@${author}/${permlink}`);
      setCopiedAuthorperm(true);
      setTimeout(() => setCopiedAuthorperm(false), 2000);
    }
  };

  const handleBack = () => {
    if (isModal || window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/explorer");
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModal) handleBack();
    };
    window.addEventListener("keydown", handleEsc);

    if (isModal) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "auto"; // restore
    };
  }, [isModal, navigate]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      // Fetch Tribe Info for calculations
      const tInfo = await getTribeInfo(community);
      setTribeInfo(tInfo);

      if (author && permlink) {
        await loadPostData(author, permlink);
        loadComments(author, permlink);
      }
      setLoading(false);
    };
    init();
  }, [author, permlink, community]);

  const loadPostData = async (a: string, p: string) => {
    // Parallel fetch:
    // 1. Scot Content (Scotbot) normalized by service
    // 2. Hive Content (Condenser) for content body
    const [scotData, hiveData] = await Promise.all([
      getScotPost(a, p, community),
      getPostContent(a, p),
    ]);

    if (hiveData) {
      // Remove Hive-specific reward fields to avoid pollution
      const {
        vote_rshares,
        pending_payout_value,
        total_payout_value,
        active_votes: hiveVotes,
        ...safeHiveData
      } = hiveData;

      // Determine correct vote_rshares for token
      // Note: scotData is now normalized (unwrapped) by the service
      let tokenVoteRshares = scotData?.vote_rshares;
      let rsharesSource = "Scotbot API";

      // FALLBACK DE CÁLCULO: Se o vote_rshares ainda for 0, soma os active_votes manualmente
      if (
        (!tokenVoteRshares || Number(tokenVoteRshares) === 0) &&
        scotData?.active_votes
      ) {
        const calculatedRshares = scotData.active_votes.reduce(
          (acc: number, v: any) => acc + Number(v.rshares || 0),
          0,
        );
        if (calculatedRshares > 0) {
          tokenVoteRshares = calculatedRshares;
          rsharesSource = "Calculated from Votes (Client Fallback)";
        } else {
          rsharesSource = "Zero (No valid rshares found)";
        }
      }

      setDebugData({
        scot_vote_rshares_raw: scotData?.vote_rshares,
        final_used_rshares: tokenVoteRshares,
        rshares_source: rsharesSource,
        scot_pending_token: scotData?.pending_token,
        active_votes_count: scotData?.active_votes?.length || 0,
        sample_vote:
          scotData?.active_votes && scotData.active_votes.length > 0
            ? scotData.active_votes[0]
            : null,
      });

      // Merge data
      const mergedPost = {
        ...safeHiveData,
        // Keep body from Hive
        body: hiveData.body,

        // Use calculated or fetched token rshares
        vote_rshares: tokenVoteRshares,

        // Use SCOT active_votes if available, otherwise Hive
        active_votes: scotData?.active_votes || hiveVotes,

        pending_token: scotData?.pending_token,
        precision: scotData?.precision,
      };

      setPost(mergedPost);

      // Process Markdown
      try {
        let bodyToParse = hiveData.body || "";
        // Convert bare image links to markdown images
        bodyToParse = bodyToParse.replace(
          /(?:^|\s)(https?:\/\/[^\s<"']+\.(?:png|jpe?g|gif|webp))/gi,
          " ![]($1)",
        );

        // Proxy images through images.hive.blog to avoid tracking
        bodyToParse = bodyToParse.replace(
          /!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g,
          (match, alt, url) => {
            if (url.includes("images.hive.blog")) return match;
            return `![${alt}](https://images.hive.blog/0x0/${url})`;
          },
        );

        const rawHtml = await marked.parse(bodyToParse);
        // sanitizePostHtml enforces iframe src whitelist + blocks event handlers
        const cleanHtml = sanitizePostHtml(rawHtml);
        setHtmlContent(cleanHtml);
      } catch (e) {
        console.error("Markdown parse error", e);
        setHtmlContent("<p>Erro ao carregar conteúdo.</p>");
      }
    }
  };

  const loadComments = async (a: string, p: string) => {
    setLoadingComments(true);
    const replies = await getPostReplies(a, p);

    // Enrich with Scot tokens
    const enrichPromises = replies.map(async (reply) => {
      try {
        const scotInfo = await getScotPost(
          reply.author,
          reply.permlink,
          community,
        );
        if (scotInfo) {
          let active_votes = scotInfo.active_votes || reply.active_votes;
          let net_votes = scotInfo.net_votes || reply.net_votes;
          return {
            ...reply,
            active_votes,
            vote_rshares: scotInfo.vote_rshares,
            pending_token: scotInfo.pending_token,
            precision: scotInfo.precision,
            net_votes,
          };
        }
      } catch (e) {}
      return reply;
    });

    const enrichedReplies = await Promise.all(enrichPromises);
    setComments(enrichedReplies);
    setLoadingComments(false);
  };

  const getCalculatedCentReward = (post: HivePost) => {
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

      // 3. Dynamic Calculation as a fallback
      if (tribeInfo && post.vote_rshares != null) {
        const rshares = Number(post.vote_rshares);
        const exponent = Number(tribeInfo.author_curve_exponent || 1);
        const rewardPool = parseFloat(tribeInfo.reward_pool || "0");
        const pendingRshares = parseFloat(tribeInfo.pending_rshares || "0");

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

  const handleVote = async () => {
    if (!user) {
      alert("Faça login para votar!");
      return;
    }
    if (!post) return;

    const alreadyVoted = post.active_votes?.some((v) => v.voter === user);
    if (alreadyVoted) {
      alert("Você já votou neste post.");
      return;
    }

    setIsVoting(true);
    try {
      const result = await vote(post.author, post.permlink, 10000);
      if (result.success) {
        setPost((prev) =>
          prev
            ? {
                ...prev,
                net_votes: prev.net_votes + 1,
                active_votes: [
                  ...(prev.active_votes || []),
                  { voter: user, weight: 10000, percent: 10000, rshares: 0 },
                ],
              }
            : null,
        );
        alert(
          "Voto computado! Atualize a página em alguns instantes para ver o novo valor.",
        );
      } else {
        alert("Erro ao votar: " + result.msg);
      }
    } catch (e) {
      console.error(e);
    }
    setIsVoting(false);
  };

  const handleReply = async () => {
    if (!user) {
      alert("Faça login para comentar!");
      return;
    }
    if (!post || !replyText.trim()) return;

    setIsReplying(true);
    try {
      const result = await postComment(
        post.author,
        post.permlink,
        "",
        replyText,
        ["cent"],
        declinePayout,
      );
      if (result.success) {
        alert(
          "Comentário publicado! Atualize a página em alguns instantes para ver seu comentário.",
        );
        setReplyText("");
        // Reload comments after a brief delay
        setTimeout(() => {
          if (author && permlink) loadComments(author, permlink);
        }, 3000);
      } else {
        alert("Erro ao comentar: " + result.msg);
      }
    } catch (e: any) {
      alert("Erro ao comentar: " + e.message);
    }
    setIsReplying(false);
  };

  const timeAgo = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString + (dateString.endsWith("Z") ? "" : "Z"));
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " anos atrás";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses atrás";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " dias atrás";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " horas atrás";
    return "agora";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-cent w-12 h-12" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center mt-12">
        <h2 className="text-xl text-red-400">Post não encontrado.</h2>
        <button
          onClick={() => navigate("/explorer")}
          className="mt-4 text-cent underline"
        >
          Voltar para o Explorer
        </button>
      </div>
    );
  }

  const { up, down } = post.active_votes
    ? post.active_votes.reduce(
        (acc, v) => {
          const pct = v.percent !== undefined ? v.percent : 1;
          if (pct > 0) acc.up++;
          else if (pct < 0) acc.down++;
          return acc;
        },
        { up: 0, down: 0 },
      )
    : { up: post.net_votes, down: 0 };

  const userHasVoted = user && post.active_votes?.some((v) => v.voter === user);
  const rewardValue = getCalculatedCentReward(post);
  const isPaid =
    post.cashout_time &&
    new Date(
      post.cashout_time + (post.cashout_time.endsWith("Z") ? "" : "Z"),
    ).getTime() < Date.now();

  const content = (
    <div
      className={`max-w-4xl mx-auto pb-12 animate-fade-in relative ${isModal && !isMobile ? "pt-8 px-4" : "w-full"}`}
    >
      {!isModal && !isMobile && (
        <div className="mb-4 flex items-center justify-between relative pl-12">
          <button
            onClick={handleBack}
            className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700/50 shadow-sm"
            title="Voltar"
          >
            <ArrowLeft size={16} />
          </button>
          <nav className="flex text-sm text-slate-400 font-medium whitespace-nowrap overflow-x-auto scrollbar-none items-center gap-2">
            <Link
              to="/discovery"
              className="hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Home size={14} /> {t("nav.discover")}
            </Link>
            <ChevronRight size={14} className="opacity-50 shrink-0" />
            <Link to="/explorer" className="hover:text-white transition-colors">
              {t("nav.explorer")}
            </Link>
            <ChevronRight size={14} className="opacity-50 shrink-0" />
            <Link
              to={`/explorer?tag=${post.category}`}
              className="text-white hover:text-cent transition-colors"
            >
              #{post.category}
            </Link>
          </nav>
        </div>
      )}

      <div
        className={`bg-card md:rounded-2xl border-0 sm:border ${isMobile ? "mt-0" : "border-slate-700/50"} overflow-hidden sm:shadow-2xl relative`}
      >
        {isModal && !isMobile && (
          <button
            onClick={handleBack}
            className="absolute top-4 right-4 z-20 bg-slate-900/80 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors backdrop-blur-sm border border-slate-700/50"
            title="Fechar"
          >
            <X size={20} />
          </button>
        )}

        {isMobile && (
          <div className="flex items-center justify-center px-4 py-3 bg-slate-900/80 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
            <button
              onClick={handleBack}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-slate-800/80 p-2 rounded-full text-slate-300 hover:text-white transition-colors shadow-sm z-40 border border-slate-700/50"
            >
              <ArrowLeft size={18} />
            </button>
            <nav className="flex text-xs font-medium text-slate-400 overflow-hidden px-10 whitespace-nowrap items-center gap-1.5 scrollbar-none overflow-x-auto">
              <Link
                to="/discovery"
                className="hover:text-white flex items-center gap-1 transition-colors"
              >
                <Home size={12} />
              </Link>
              <ChevronRight size={12} className="opacity-50 shrink-0" />
              <Link
                to="/explorer"
                className="hover:text-white transition-colors"
              >
                {t("nav.explorer")}
              </Link>
              <ChevronRight size={12} className="opacity-50 shrink-0" />
              <Link
                to={`/explorer?tag=${post.category}`}
                className="text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 transition-colors"
              >
                #{post.category}
              </Link>
            </nav>
          </div>
        )}

        <div
          className={`px-4 sm:px-6 md:px-8 py-6 md:py-8 border-b border-slate-700/50 ${isModal && !isMobile ? "pt-12 md:pt-8" : ""}`}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight pr-8 break-words">
            {post.title}
          </h1>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Link to={`/profile/${post.author}`}>
                <img
                  src={`https://images.hive.blog/u/${post.author}/avatar`}
                  alt={post.author}
                  className="w-10 h-10 rounded-full border border-slate-500 hover:border-cent transition-colors"
                />
              </Link>
              <div>
                <Link
                  to={`/profile/${post.author}`}
                  className="font-bold text-slate-200 hover:text-cent transition-colors block"
                >
                  @{post.author}
                </Link>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar size={12} /> {timeAgo(post.created)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-sm shadow-lg ${isPaid ? "bg-slate-700 text-slate-300" : "bg-cent/10 text-cent border border-cent/20"}`}
              >
                <Coins size={16} />
                {rewardValue} {community}
              </div>
              <span className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-sm border border-slate-700">
                #{post.category}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-6 md:p-8 bg-slate-900/50">
          <article
            className={`prose ${readerSettings.fontSize} ${readerSettings.fontFamily} max-w-none text-slate-300 w-full break-words
             prose-headings:text-slate-100 prose-p:text-slate-300 prose-a:text-cent hover:prose-a:text-green-300 
             prose-blockquote:border-l-cent prose-blockquote:text-slate-400 prose-strong:text-slate-100
             prose-ul:text-slate-300 prose-ol:text-slate-300 prose-li:text-slate-300
             prose-code:text-slate-100 prose-code:bg-slate-800 prose-pre:bg-slate-800 prose-pre:text-slate-300 prose-pre:overflow-x-auto prose-pre:max-w-full
             prose-img:rounded-xl prose-img:shadow-lg prose-img:mx-auto prose-img:max-w-full transition-all`}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {(() => {
                let tags: string[] = [];
                try {
                  const meta = JSON.parse(post.json_metadata || "{}");
                  tags = meta.tags || [];
                } catch (e) {}
                const uniqueTags = Array.from(
                  new Set([post.category, ...tags, community]),
                ).slice(0, 8);

                return uniqueTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700"
                  >
                    #{tag}
                  </span>
                ));
              })()}
            </div>
            <button
              onClick={handleCopyAuthorperm}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 border border-slate-700 rounded-md transition-colors font-mono"
              title="Copiar @author/permlink"
            >
              {copiedAuthorperm ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <Copy size={14} />
              )}
              {copiedAuthorperm ? "Copiado!" : "authorperm"}
            </button>
          </div>
        </div>

        {/* Action Bar (Moved above comments) */}
        <div className="px-4 sm:px-6 py-4 md:p-6 bg-slate-800 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold ${
                  userHasVoted
                    ? "text-green-400 bg-green-400/10"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <button
                  onClick={handleVote}
                  disabled={userHasVoted || isVoting}
                  className="group flex items-center hover:text-green-400 transition-colors"
                  title="Votar (100%)"
                >
                  {isVoting ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Heart
                      size={24}
                      className={`transition-transform group-active:scale-90 ${userHasVoted ? "fill-current" : ""}`}
                    />
                  )}
                </button>
                <button
                  onClick={() => setShowVotersModal(true)}
                  className="text-lg hover:text-white transition-colors"
                  title="Ver quem votou"
                >
                  {up}
                </button>
              </div>

              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold text-slate-400 ${down > 0 ? "text-red-400 bg-red-400/10" : ""}`}
                title="Downvotes"
              >
                <ThumbsDown
                  size={24}
                  className={down > 0 ? "fill-current" : ""}
                />
                <span className="text-lg">{down}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400 px-2">
              <MessageCircle size={24} />
              <span className="font-bold">{post.children}</span>
              <span className="hidden sm:inline">Comentários</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`p-3 rounded-full transition-colors ${showDebug ? "bg-cent text-slate-900" : "text-slate-400 hover:text-white hover:bg-white/10"}`}
              title="Debug de Cálculo"
            >
              <Bug size={24} />
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-full transition-colors ${showSettings ? "bg-cent text-slate-900" : "text-slate-400 hover:text-white hover:bg-white/10"}`}
              title="Configurações de Leitura"
            >
              <Settings size={24} />
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copiado!");
              }}
              className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="Compartilhar"
            >
              <Share2 size={24} />
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="bg-slate-900 px-4 sm:px-6 py-6 border-t border-slate-700 font-sans">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings size={18} /> Configurações de Leitura
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Tamanho da Fonte
                </label>
                <div className="flex bg-slate-800 rounded-lg p-1">
                  {["prose-sm", "prose-base", "prose-lg", "prose-xl"].map(
                    (size) => (
                      <button
                        key={size}
                        onClick={() =>
                          setReaderSettings((s) => ({ ...s, fontSize: size }))
                        }
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${readerSettings.fontSize === size ? "bg-slate-700 text-slate-900 dark:text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                      >
                        {size === "prose-sm"
                          ? "P"
                          : size === "prose-base"
                            ? "M"
                            : size === "prose-lg"
                              ? "G"
                              : "GG"}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Estilo da Fonte
                </label>
                <div className="flex bg-slate-800 rounded-lg p-1">
                  {[
                    { id: "font-sans", label: "Sans" },
                    { id: "font-serif", label: "Serif" },
                    { id: "font-mono", label: "Mono" },
                  ].map((font) => (
                    <button
                      key={font.id}
                      onClick={() =>
                        setReaderSettings((s) => ({
                          ...s,
                          fontFamily: font.id,
                        }))
                      }
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${font.id} ${readerSettings.fontFamily === font.id ? "bg-slate-700 text-slate-900 dark:text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showDebug && (
          <div className="bg-black/50 px-4 sm:px-6 py-6 border-t border-slate-700 font-mono text-xs text-slate-400">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-cent flex items-center gap-2">
                <Bug size={14} /> Debug de Cálculo
              </h3>
              <button
                onClick={() => setShowDebug(false)}
                className="hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-white font-bold border-b border-slate-700 pb-1">
                  Variáveis do Post
                </p>
                <div className="flex justify-between">
                  <span>RShares Usado:</span>{" "}
                  <span className="text-yellow-400">
                    {debugData.final_used_rshares?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Origem RShares:</span>{" "}
                  <span>{debugData.rshares_source}</span>
                </div>
                <div className="flex justify-between">
                  <span>Scot Raw RShares:</span>{" "}
                  <span>{debugData.scot_vote_rshares_raw || "null"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Api Pending Token:</span>{" "}
                  <span className="text-red-400">
                    {debugData.scot_pending_token || 0} (Ignorado)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Active Votes (Scot):</span>{" "}
                  <span>{debugData.active_votes_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exemplo Voto:</span>{" "}
                  <span className="text-xs break-all">
                    {JSON.stringify(debugData.sample_vote || {})}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-white font-bold border-b border-slate-700 pb-1">
                  Variáveis da Tribe
                </p>
                <div className="flex justify-between">
                  <span>Reward Pool:</span>{" "}
                  <span className="text-green-400">
                    {tribeInfo?.reward_pool}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pending RShares:</span>{" "}
                  <span className="text-blue-400">
                    {tribeInfo?.pending_rshares}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Author Curve Exp:</span>{" "}
                  <span>{tribeInfo?.author_curve_exponent}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="px-4 sm:px-6 py-6 md:p-8 bg-slate-900 border-t border-slate-800">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <MessageCircle size={20} className="text-slate-400" />
            Comentários{" "}
            {post.children > 0 && (
              <span className="text-slate-500 text-sm">({post.children})</span>
            )}
          </h3>

          {/* Comment Box */}
          {user ? (
            <div className="mb-8 p-4 rounded-xl border border-slate-700 bg-slate-800/50">
              <div className="flex gap-3">
                <img
                  src={`https://images.hive.blog/u/${user}/avatar`}
                  alt={user}
                  className="w-10 h-10 rounded-full border border-slate-600"
                  onError={(e) =>
                    ((e.target as HTMLImageElement).src =
                      "https://placehold.co/40")
                  }
                />
                <div className="flex-1">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escreva um comentário (suporta Markdown)..."
                    className="w-full bg-slate-900 border border-slate-600 p-3 rounded-lg text-white focus:outline-none focus:border-cent min-h-[100px] resize-y"
                    disabled={isReplying}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={declinePayout}
                        onChange={(e) => setDeclinePayout(e.target.checked)}
                        className="accent-cent bg-slate-800"
                      />{" "}
                      Decline Payout
                    </label>
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleReply}
                        disabled={isReplying || !replyText.trim()}
                        className="bg-cent text-slate-900 px-6 py-2 rounded-lg font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                      >
                        {isReplying ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <MessageCircle size={18} />
                        )}
                        Comentar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-8 p-4 bg-yellow-400/10 border border-yellow-400/20 rounded-xl flex items-center justify-between text-yellow-500">
              <span className="text-sm font-medium">
                Faça login para comentar neste post.
              </span>
            </div>
          )}

          {loadingComments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-cent" size={32} />
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem
                  key={`${comment.author}-${comment.permlink}`}
                  comment={comment}
                  tribeInfo={tribeInfo}
                  readerSettings={readerSettings}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 bg-slate-800/50 rounded-lg border border-slate-700/30">
              <p>
                Nenhum comentário ainda. Seja o primeiro a comentar no Hive!
              </p>
            </div>
          )}
        </div>
      </div>
      <VotersModal
        post={post}
        isOpen={showVotersModal}
        onClose={() => setShowVotersModal(false)}
        tribeInfo={tribeInfo}
      />
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-40 flex justify-center items-start overflow-y-auto bg-dark md:bg-black/80 backdrop-blur-sm px-0 pt-16 pb-20 md:px-4 md:py-8"
        onMouseDown={(e) => {
          if (
            !isMobile &&
            e.target === e.currentTarget &&
            e.clientX < e.currentTarget.clientWidth
          ) {
            handleBack();
          }
        }}
      >
        <div className="w-full max-w-4xl animate-slide-in-up">{content}</div>
      </div>
    );
  }

  return content;
};

export default SinglePost;
