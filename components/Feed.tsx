import React, { useEffect, useState } from 'react';
import { getHivePosts, getTribeInfo } from '../services/hiveEngineService';
import { HivePost, TribeInfo } from '../types';
import { sanitizeUrl } from '../utils/security';
import { MessageCircle, Heart, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCommunity } from '../contexts/CommunityContext';
import { Link, Navigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { extractImage } from '../utils/image';
import { VotersModal } from './VotersModal';

const Feed: React.FC = () => {
  const { user, vote } = useAuth();
  const { community } = useCommunity();
  const location = useLocation();
  const [posts, setPosts] = useState<HivePost[]>([]);
  const [tribeInfo, setTribeInfo] = useState<TribeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [votingPost, setVotingPost] = useState<string | null>(null);
  const [votersModalPost, setVotersModalPost] = useState<HivePost | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadHomeFeed = async () => {
      setLoading(true);
      const [data, tInfo] = await Promise.all([
         getHivePosts(community, 'feed', 20, undefined, undefined, user),
         getTribeInfo(community)
      ]);
      setPosts(data);
      setTribeInfo(tInfo);
      setLoading(false);
    };
    loadHomeFeed();
  }, [user, community]);

  const handleVote = async (post: HivePost) => {
    if (!user) {
      alert("Faça login com Hive Keychain para votar.");
      return;
    }
    
    setVotingPost(post.permlink);
    try {
      const result = await vote(post.author, post.permlink, 10000);
      if (result.success) {
        setPosts(posts.map(p => {
          if (p.author === post.author && p.permlink === post.permlink) {
            let active_votes = Array.isArray(p.active_votes) ? [...p.active_votes] : [];
            if (!active_votes.some((v: any) => v.voter === user)) {
               active_votes.push({ voter: user, percent: 10000, rshares: 0 });
            }
            return { ...p, active_votes };
          }
          return p;
        }));
      } else {
        alert("Erro ao votar: " + result.msg);
      }
    } catch (e: any) {
       alert("Erro: " + e.message);
    }
    setVotingPost(null);
  };

  if (!user) {
    return <Navigate to="/explorer" />;
  }

  const renderPostPreview = (text?: string) => {
    if (!text) return '';
    let parsedText = text.replace(/!\[.*?\]\(.*?\)/g, '');
    parsedText = parsedText.replace(/<[^>]*>?/gm, '');
    return parsedText.substring(0, 150) + '...';
  };

  const getThumbnail = (post: HivePost) => {
    const extracted = extractImage(post);
    if (extracted) return extracted;
    return `https://images.hive.blog/u/${post.author}/avatar`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-card p-6 rounded-2xl border border-slate-700/50 shadow-lg mb-8">
        <div className="w-full sm:w-auto mb-4 sm:mb-0">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            Feed Principal
          </h2>
          <p className="text-slate-400 text-sm mt-1">
             Publicações das pessoas que você segue.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-cent" size={48} />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-card border border-slate-700/50 rounded-2xl p-12 text-center shadow-sm">
          <div className="bg-slate-800/50 p-4 rounded-full inline-block mb-4">
            <MessageCircle size={32} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Seu feed está vazio</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">Explore a comunidade e siga novos autores para ver publicações aqui.</p>
          <Link to="/explorer" className="bg-cent text-slate-900 px-6 py-2 rounded-lg font-bold hover:opacity-90 inline-block transition-colors">
            Ir para Explorer
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => {
            const upvoted = Array.isArray(post.active_votes) && post.active_votes.some((v: any) => v.voter === user && Number(v.percent) > 0);
            return (
              <div key={`${post.author}-${post.permlink}`} className="bg-card rounded-2xl border border-slate-700/50 p-6 shadow-sm hover:border-cent/30 transition-all flex flex-col md:flex-row gap-6 group">
                <Link to={`/@${post.author}/${post.permlink}`} state={{ backgroundLocation: location }} className="block w-full md:w-48 shrink-0 overflow-hidden rounded-xl bg-slate-800">
                   <img 
                      src={getThumbnail(post)}
                      alt="Thumbnail"
                      className="w-full h-48 md:h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => (e.target as HTMLImageElement).src = `https://images.hive.blog/u/${post.author}/avatar`}
                   />
                </Link>
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center gap-2 mb-3 h-8">
                     <Link to={`/profile/${post.author}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
                        <img 
                           src={`https://images.hive.blog/u/${post.author}/avatar`} 
                           alt={post.author}
                           className="w-6 h-6 rounded-full bg-slate-800 shrink-0"
                        />
                        <span className="font-bold text-slate-200 truncate">{post.author}</span>
                     </Link>
                     <span className="text-slate-500 text-xs shrink-0">&bull;</span>
                     <span className="text-slate-500 text-xs shrink-0">{new Date(post.created + 'Z').toLocaleDateString()}</span>
                  </div>
                  
                  <Link to={`/@${post.author}/${post.permlink}`} state={{ backgroundLocation: location }} className="group-hover:text-cent transition-colors block mb-2 min-w-0">
                    <h3 className="text-xl font-bold text-white truncate">{post.title}</h3>
                  </Link>

                  <div className="text-slate-400 text-sm mb-4 line-clamp-3 leading-relaxed flex-1">
                    {renderPostPreview(post.body || (post as any).desc || '')}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-700/30">
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-slate-800">
                           <button 
                              onClick={() => handleVote(post)}
                              disabled={votingPost === post.permlink}
                              className={`${upvoted ? 'text-cent' : 'text-slate-400 hover:text-white'} disabled:opacity-50`}
                           >
                              {votingPost === post.permlink ? (
                                 <Loader2 size={16} className="animate-spin" />
                              ) : (
                                 <Heart size={16} className={upvoted ? "fill-cent" : ""} />
                              )}
                           </button>
                           <button
                              onClick={() => setVotersModalPost(post)}
                              className="text-slate-400 hover:text-white font-medium"
                           >
                              {(post.active_votes?.length || 0)}
                           </button>
                        </div>
                        
                        <Link to={`/@${post.author}/${post.permlink}#comments`} state={{ backgroundLocation: location }} className="flex items-center gap-1.5 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-slate-800">
                           <MessageCircle size={16} />
                           <span>{post.children}</span>
                        </Link>
                     </div>
                     <Link to={`/@${post.author}/${post.permlink}`} state={{ backgroundLocation: location }} className="text-cent hidden md:flex items-center gap-1 text-sm font-medium hover:underline px-2">
                        Ler mais <ExternalLink size={14} />
                     </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <VotersModal 
         post={votersModalPost} 
         isOpen={votersModalPost !== null} 
         onClose={() => setVotersModalPost(null)}
         tribeInfo={tribeInfo}
      />
    </div>
  );
};

export default Feed;
