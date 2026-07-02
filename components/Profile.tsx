import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCommunity } from '../contexts/CommunityContext';
import { getUserBalance, scotFetch, getUserDiscussions, getPendingCuration, getTribeInfo, getAccountHistory } from '../services/hiveEngineService';
import { Balance, HivePost, TribeInfo } from '../types';
import { communityConfig } from '../config';
import { User, Coins, TrendingUp, HandCoins, ArrowDownToLine, ArrowUpFromLine, Loader2, MessageCircle, Heart, ExternalLink, Wallet, UserPlus, UserMinus, ThumbsDown, AlertCircle, ArrowRightLeft, ArrowUpCircle, ArrowDownCircle, Users, UserMinus2, History } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { sanitizeUrl } from '../utils/security';
import { extractImage } from '../utils/image';
import { VotersModal } from './VotersModal';

const Profile: React.FC = () => {
  const { user, customJson } = useAuth();
  const { community } = useCommunity();
  const location = useLocation();
  const { username } = useParams<{ username: string }>();
  
  const currentProfile = username?.toLowerCase() || user;
  
  const [balance, setBalance] = useState<Balance | null>(null);
  const [scotData, setScotData] = useState<any>(null);
  const [pendingCuration, setPendingCuration] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'blog' | 'comments' | 'replies' | 'wallet'>('blog');
  const [discussions, setDiscussions] = useState<HivePost[]>([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);

  const [followLoading, setFollowLoading] = useState(false);
  const [muteLoading, setMuteLoading] = useState(false);

  const [votingPost, setVotingPost] = useState<string | null>(null);
  const [votersModalPost, setVotersModalPost] = useState<HivePost | null>(null);
  const { vote } = useAuth();
  const [tribeInfo, setTribeInfo] = useState<TribeInfo | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Wallet Actions State
  const [walletActionType, setWalletActionType] = useState<'transfer' | 'stake' | 'unstake' | 'delegate' | 'undelegate' | null>(null);
  const [walletActionAmount, setWalletActionAmount] = useState('');
  const [walletActionTo, setWalletActionTo] = useState('');
  const [walletActionLoading, setWalletActionLoading] = useState(false);

  // Account History State
  const [accountHistory, setAccountHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  useEffect(() => {
    if (!currentProfile) return;

    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // Only calculate pending curation for own profile — it fetches 400 posts which is expensive
        const isOwnProfile = user && currentProfile === user;

        const [balData, userScotData, curationData, tInfo] = await Promise.all([
          getUserBalance(currentProfile, community),
          scotFetch(`/@${currentProfile}?token=${community}&hive=1`),
          isOwnProfile ? getPendingCuration(currentProfile, community) : Promise.resolve(0),
          getTribeInfo(community)
        ]);
        
        if (balData) setBalance(balData);
        if (userScotData && userScotData[community]) {
          setScotData(userScotData[community]);
        }
        setPendingCuration(curationData);
        if (tInfo) setTribeInfo(tInfo);
      } catch (error) {
        console.error("Profile fetching error", error);
      }
      setLoading(false);
    };

    fetchProfileData();
  }, [currentProfile, community]);

  useEffect(() => {
    if (user && currentProfile && user !== currentProfile) {
       const checkFollow = async () => {
         try {
           const followingRes = await fetch(`https://hafsql-api.mahdiyari.info/accounts/${user}/following?limit=100`);
           const followingData = await followingRes.json();
           if (followingData && Array.isArray(followingData)) {
              if (followingData.some((f: any) => f.following === currentProfile)) {
                 setIsFollowing(true);
              } else {
                 setIsFollowing(false);
              }
           }
           
           const mutedRes = await fetch(`https://hafsql-api.mahdiyari.info/accounts/${user}/muted?limit=100`);
           const mutedData = await mutedRes.json();
           if (mutedData && Array.isArray(mutedData)) {
              if (mutedData.some((m: any) => m.following === currentProfile)) {
                 setIsMuted(true);
              } else {
                 setIsMuted(false);
              }
           }
         } catch (e) {
           console.error("Error checking follow status", e);
         }
       };
       checkFollow();
    }
  }, [user, currentProfile]);

  useEffect(() => {
    if (!currentProfile) return;
    if (activeTab === 'wallet') return;
    const fetchDiscussions = async () => {
       setLoadingDiscussions(true);
       const data = await getUserDiscussions(currentProfile, activeTab, community, 20);
       setDiscussions(data);
       setLoadingDiscussions(false);
    };
    fetchDiscussions();
  }, [currentProfile, activeTab, community]);

  const handleFollow = async () => {
    if (!user) return alert('Faça login para seguir');
    setFollowLoading(true);
    const what = isFollowing ? [] : ["blog"];
    const json = ["follow", { follower: user, following: currentProfile, what }];
    const res = await customJson('follow', json, isFollowing ? 'Deixar de Seguir' : 'Seguir Usuário');
    if (res.success) {
       setIsFollowing(!isFollowing);
    } else {
       alert("Erro: " + res.msg);
    }
    setFollowLoading(false);
  };

  const handleMute = async () => {
    if (!user) return alert('Faça login para mutar');
    setMuteLoading(true);
    const what = isMuted ? [] : ["ignore"];
    const json = ["follow", { follower: user, following: currentProfile, what }];
    const res = await customJson('follow', json, isMuted ? 'Desmutar Usuário' : 'Mutar Usuário');
    if (res.success) {
       setIsMuted(!isMuted);
    } else {
       alert("Erro: " + res.msg);
    }
    setMuteLoading(false);
  };

  const handleVote = async (post: HivePost) => {
    if (!user) {
      alert("Faça login para votar!");
      return;
    }

    if (votingPost) return;

    const alreadyVoted = post.active_votes?.some(v => v.voter === user);
    if (alreadyVoted) {
      alert("Você já votou neste post.");
      return;
    }

    setVotingPost(post.permlink);
    const weight = 10000; 
    
    try {
      const result = await vote(post.author, post.permlink, weight);
      if (result.success) {
         setDiscussions(prev => prev.map(p => {
           if (p.author === post.author && p.permlink === post.permlink) {
              return {
                 ...p,
                 active_votes: [...(p.active_votes || []), { voter: user, weight, percent: weight, rshares: 0 }]
              };
           }
           return p;
         }));
      } else {
        alert("Erro ao votar: " + result.msg);
      }
    } catch(e) {
      console.error(e);
    }
    setVotingPost(null);
  };

  useEffect(() => {
    if (activeTab === 'wallet' && currentProfile && community) {
      fetchHistory(0);
    }
  }, [activeTab, currentProfile, community]);

  const fetchHistory = async (offset: number) => {
    if (offset === 0) {
       setAccountHistory([]);
       setHasMoreHistory(true);
    }
    setHistoryLoading(true);
    try {
      const data = await getAccountHistory(currentProfile, community, 30, offset);
      if (data && data.length > 0) {
         setAccountHistory(prev => offset === 0 ? data : [...prev, ...data]);
         setHistoryOffset(offset + 30);
         if (data.length < 30) setHasMoreHistory(false);
      } else {
         setHasMoreHistory(false);
      }
    } catch (e) {
       console.error(e);
    } finally {
       setHistoryLoading(false);
    }
  };

  const handleWalletAction = async () => {
     if (!walletActionType || !walletActionAmount || parseFloat(walletActionAmount) <= 0) return;
     if ((walletActionType === 'transfer' || walletActionType === 'delegate' || walletActionType === 'undelegate') && !walletActionTo) return;

     setWalletActionLoading(true);
     const payload: any = {
        symbol: community,
        quantity: parseFloat(walletActionAmount).toFixed(tribeInfo?.precision ?? 8)
     };

     if (walletActionType === 'transfer' || walletActionType === 'delegate') {
        payload.to = walletActionTo;
     } else if (walletActionType === 'undelegate') {
        payload.from = walletActionTo;
     }

     let actionName = 'Transferência';
     if (walletActionType === 'stake') actionName = 'Power Up (Stake)';
     if (walletActionType === 'unstake') actionName = 'Power Down (Unstake)';
     if (walletActionType === 'delegate') actionName = 'Delegação';
     if (walletActionType === 'undelegate') actionName = 'Remover Delegação';

     try {
       const res = await customJson('ssc-mainnet-hive', {
          contractName: 'tokens',
          contractAction: walletActionType,
          contractPayload: payload
       }, actionName, 'Active');

       if (res.success) {
          alert("Transação enviada com sucesso! Os saldos serão atualizados em alguns segundos.");
          setWalletActionAmount('');
          setWalletActionTo('');
          setWalletActionType(null);
          setTimeout(() => {
             fetchHistory(0);
          }, 4000);
       } else {
          alert("Erro na transação: " + res.msg);
       }
     } catch (e) {
        console.error(e);
     } finally {
        setWalletActionLoading(false);
     }
  };

  if (!currentProfile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <User size={64} className="mb-4 text-slate-600" />
        <h2 className="text-2xl font-bold text-white mb-2">Login Necessário</h2>
        <p>Faça login para visualizar seu perfil nas comunidades da Hive.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-10 h-10 text-cent animate-spin" />
      </div>
    );
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
              const estimate = (((Math.pow(rshares, exponent)) * rewardPool) / pendingRshares) / Math.pow(10, precision);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Perfil Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 border border-slate-700/50 shadow-xl overflow-hidden relative flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
           <User size={250} />
        </div>
        
        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
          <img 
            src={`https://images.hive.blog/u/${currentProfile}/avatar/large`} 
            alt={currentProfile} 
            className="w-24 h-24 rounded-full border-4 border-cent shadow-lg"
          />
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">@{currentProfile}</h1>
            <p className="text-slate-400 mb-2">Perfil na comunidade <span className="font-bold text-cent">{community}</span></p>
            {scotData && scotData.voting_power !== undefined && (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                 <Coins size={12} className="text-cent" /> 
                 <span className="text-xs font-medium text-slate-300">{(scotData.voting_power / 100).toFixed(2)}% Power em {community}</span>
              </div>
            )}
          </div>
        </div>

        {user && user !== currentProfile && (
           <div className="relative z-10 flex gap-3 w-full md:w-auto mt-4 md:mt-0">
             <button 
               onClick={handleFollow}
               disabled={followLoading}
               className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 font-bold rounded-lg disabled:opacity-50 transition-all text-sm ${
                 isFollowing 
                 ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                 : 'bg-cent text-slate-900 border border-transparent hover:bg-green-400'
               }`}
             >
               {followLoading ? <Loader2 size={16} className="animate-spin" /> : (isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />)}
               {isFollowing ? 'Deixar de Seguir' : 'Seguir'}
             </button>
             <button 
               onClick={handleMute}
               disabled={muteLoading}
               className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 font-bold rounded-lg disabled:opacity-50 transition-all text-sm ${
                 isMuted
                 ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                 : 'bg-slate-800 text-red-400 border border-red-500/20 hover:bg-red-500/10'
               }`}
             >
               {muteLoading ? <Loader2 size={16} className="animate-spin" /> : (isMuted ? <AlertCircle size={16} /> : <ThumbsDown size={16} />)}
               {isMuted ? 'Desmutar' : 'Mutar'}
             </button>
           </div>
        )}
      </div>

      {/* Tabs para Postagens */}
      <div className="mt-12">
        <div className="flex border-b border-slate-700/50 mb-6 w-full overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('blog')}
            className={`px-4 sm:px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'blog' ? 'text-white border-b-2 border-cent' : 'text-slate-400 hover:text-slate-300'}`}
          >
            Postagens
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 sm:px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'comments' ? 'text-white border-b-2 border-cent' : 'text-slate-400 hover:text-slate-300'}`}
          >
            Comentários
          </button>
          <button
            onClick={() => setActiveTab('replies')}
            className={`px-4 sm:px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'replies' ? 'text-white border-b-2 border-cent' : 'text-slate-400 hover:text-slate-300'}`}
          >
            Respostas
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-4 sm:px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'wallet' ? 'text-white border-b-2 border-cent' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <Wallet size={16} /> Wallet
          </button>
        </div>

        {activeTab === 'wallet' ? (
          <div className="space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Token Líquido */}
                <div className="bg-card p-6 rounded-2xl border border-slate-700/50 flex items-start gap-4">
                  <div className="p-3 bg-yellow-400/10 rounded-xl text-yellow-400">
                     <Coins size={24} />
                  </div>
                  <div className="flex-1">
                    <span className="text-slate-400 text-xs text-transform uppercase tracking-wider block mb-1">Saldo Líquido</span>
                    <div className="text-2xl font-mono text-white mb-2">
                      {balance ? parseFloat(balance.balance).toLocaleString() : '0'} <span className="text-sm text-cent">{community}</span>
                    </div>
                    {user === currentProfile && (
                       <div className="flex gap-2">
                          <button onClick={() => setWalletActionType('transfer')} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded">Enviar</button>
                          <button onClick={() => setWalletActionType('stake')} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded">Power Up</button>
                       </div>
                    )}
                  </div>
                </div>

                {/* Stake */}
                <div className="bg-card p-6 rounded-2xl border border-slate-700/50 flex items-start gap-4">
                  <div className="p-3 bg-purple-400/10 rounded-xl text-purple-400">
                     <TrendingUp size={24} />
                  </div>
                  <div className="flex-1">
                    <span className="text-slate-400 text-xs text-transform uppercase tracking-wider block mb-1">Staking</span>
                    <div className="text-2xl font-mono text-white mb-2">
                      {balance ? parseFloat(balance.stake).toLocaleString() : '0'} <span className="text-sm text-cent">{community}</span>
                    </div>
                    {user === currentProfile && (
                       <div className="flex gap-2">
                          <button onClick={() => setWalletActionType('unstake')} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded">Power Down</button>
                          <button onClick={() => setWalletActionType('delegate')} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded">Delegar</button>
                       </div>
                    )}
                  </div>
                </div>

                {/* Curation e Reward */}
                <div className="bg-card p-6 rounded-2xl border border-slate-700/50 flex items-start gap-4">
                  <div className="p-3 bg-green-400/10 rounded-xl text-green-400">
                     <HandCoins size={24} />
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs text-transform uppercase tracking-wider block mb-1">Pending Curation</span>
                    <div className="text-2xl font-mono text-white">
                      {pendingCuration.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-cent">{community}</span>
                    </div>
                    {scotData && scotData.voting_power !== undefined && (
                       <div className="text-xs text-slate-500 mt-1">
                         Voting Power: {(scotData.voting_power / 100).toFixed(2)}%
                       </div>
                    )}
                  </div>
                </div>

                {/* Delegações Feitas */}
                <div className="bg-card p-6 rounded-2xl border border-slate-700/50 flex items-start gap-4">
                   <div className="p-3 bg-blue-400/10 rounded-xl text-blue-400">
                     <ArrowUpFromLine size={24} />
                  </div>
                  <div className="flex-1">
                    <span className="text-slate-400 text-xs text-transform uppercase tracking-wider block mb-1">Delegações Feitas</span>
                    <div className="text-2xl font-mono text-white mb-2">
                      {balance && balance.delegationsOut ? parseFloat(balance.delegationsOut).toLocaleString() : '0'} <span className="text-sm text-cent">{community}</span>
                    </div>
                    {user === currentProfile && parseFloat(balance?.delegationsOut || '0') > 0 && (
                       <div className="flex gap-2">
                          <button onClick={() => setWalletActionType('undelegate')} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded">Remover Delegação</button>
                       </div>
                    )}
                  </div>
                </div>

                {/* Delegações Recebidas */}
                <div className="bg-card p-6 rounded-2xl border border-slate-700/50 flex items-start gap-4">
                   <div className="p-3 bg-orange-400/10 rounded-xl text-orange-400">
                     <ArrowDownToLine size={24} />
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs text-transform uppercase tracking-wider block mb-1">Delegações Recebidas</span>
                    <div className="text-2xl font-mono text-white">
                      {balance && balance.delegationsIn ? parseFloat(balance.delegationsIn).toLocaleString() : '0'} <span className="text-sm text-cent">{community}</span>
                    </div>
                  </div>
                </div>
             </div>

             {/* Formulário de Ação da Wallet */}
             {walletActionType && (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 relative">
                   <button onClick={() => setWalletActionType(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                   <h3 className="text-xl font-bold text-white mb-4">
                      {walletActionType === 'transfer' && 'Enviar Tokens'}
                      {walletActionType === 'stake' && 'Power Up (Staking)'}
                      {walletActionType === 'unstake' && 'Power Down (Unstaking)'}
                      {walletActionType === 'delegate' && 'Delegar Tokens'}
                      {walletActionType === 'undelegate' && 'Remover Delegação'}
                   </h3>
                   
                   <div className="space-y-4 max-w-md">
                      {(walletActionType === 'transfer' || walletActionType === 'delegate' || walletActionType === 'undelegate') && (
                         <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                               {walletActionType === 'undelegate' ? 'De (Usuário que recebeu a delegação)' : 'Para (Usuário)'}
                            </label>
                            <input 
                               type="text" 
                               value={walletActionTo} 
                               onChange={(e) => setWalletActionTo(e.target.value.toLowerCase())}
                               placeholder="username"
                               className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cent"
                            />
                         </div>
                      )}
                      
                      <div>
                         <label className="block text-xs font-medium text-slate-400 mb-1">
                            Quantidade ({community})
                         </label>
                         <div className="relative">
                           <input 
                              type="number" 
                              value={walletActionAmount} 
                              onChange={(e) => setWalletActionAmount(e.target.value)}
                              placeholder="0.00"
                              min="0"
                              step="any"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-cent"
                           />
                           <button 
                              onClick={() => {
                                 let maxBal = '0';
                                 if (walletActionType === 'transfer' || walletActionType === 'stake') maxBal = balance?.balance || '0';
                                 else if (walletActionType === 'unstake') maxBal = balance?.stake || '0';
                                 else if (walletActionType === 'delegate') maxBal = balance?.stake || '0';
                                 
                                 setWalletActionAmount(maxBal);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-700 uppercase"
                           >
                              Max
                           </button>
                         </div>
                      </div>

                      <button 
                         onClick={handleWalletAction}
                         disabled={walletActionLoading || !walletActionAmount}
                         className="w-full bg-cent text-slate-900 font-bold py-2.5 rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                         {walletActionLoading && <Loader2 size={16} className="animate-spin" />}
                         Confirmar Transação
                      </button>
                   </div>
                </div>
             )}

             {/* Histórico da Conta */}
             <div className="mt-8">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                   <History size={20} className="text-cent" /> Histórico da Conta
                </h3>
                <div className="bg-card border border-slate-700/50 rounded-xl overflow-hidden">
                   {accountHistory.length === 0 && !historyLoading ? (
                      <div className="p-8 text-center text-slate-500">Nenhum histórico encontrado.</div>
                   ) : (
                      <div className="divide-y divide-slate-800/80">
                         {accountHistory.map((item, idx) => (
                            <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                               <div className="flex items-center gap-4">
                                  <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                                     {item.operation === 'tokens_transfer' ? <ArrowRightLeft size={16} /> :
                                      item.operation === 'tokens_stake' ? <ArrowUpCircle size={16} className="text-purple-400" /> :
                                      item.operation === 'tokens_unstake' ? <ArrowDownCircle size={16} className="text-orange-400" /> :
                                      item.operation === 'tokens_delegate' ? <Users size={16} className="text-blue-400" /> :
                                      item.operation === 'tokens_undelegate' ? <UserMinus2 size={16} className="text-red-400" /> :
                                      item.operation === 'mining_lottery' ? <Coins size={16} className="text-yellow-400" /> :
                                      item.operation === 'tokens_issue' ? <Coins size={16} className="text-cent" /> :
                                      item.operation.includes('Reward') ? <HandCoins size={16} className="text-green-400" /> :
                                      <History size={16} />}
                                  </div>
                                  <div>
                                     <div className="text-white font-medium text-sm">
                                        {item.operation === 'tokens_transfer' ? (item.to === currentProfile ? 'Recebido' : 'Enviado') : 
                                         item.operation === 'comments_curationReward' ? 'Curation Reward' :
                                         item.operation === 'comments_curationReward_stake' ? 'Curation Reward (Staked)' :
                                         item.operation === 'comments_authorReward' ? 'Author Reward' :
                                         item.operation === 'comments_authorReward_stake' ? 'Author Reward (Staked)' :
                                         item.operation === 'comments_beneficiaryReward' ? 'Beneficiary Reward' :
                                         item.operation === 'comments_beneficiaryReward_stake' ? 'Beneficiary Reward (Staked)' :
                                         item.operation.replace('tokens_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                     </div>
                                     <div className="text-xs text-slate-400">
                                        {new Date(item.timestamp * 1000).toLocaleString()}
                                        {item.from && item.from !== currentProfile && !item.from.includes('contract_') && ` • De: ${item.from}`}
                                        {item.to && item.to !== currentProfile && !item.to.includes('contract_') && ` • Para: ${item.to}`}
                                        {item.authorperm && ` • Post: ${item.authorperm.split('/')[1] || item.authorperm}`}
                                        {item.memo && ` • Memo: ${item.memo}`}
                                     </div>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <div className={`font-mono font-bold ${item.to === currentProfile || item.operation === 'mining_lottery' || item.operation === 'tokens_issue' || item.operation.includes('Reward') ? 'text-green-400' : 'text-white'}`}>
                                     {item.to === currentProfile || item.operation === 'mining_lottery' || item.operation === 'tokens_issue' || item.operation.includes('Reward') ? '+' : ''}
                                     {item.quantity} <span className="text-[10px] text-slate-500">{item.symbol}</span>
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   )}
                   {historyLoading && (
                      <div className="p-8 flex justify-center">
                         <Loader2 size={24} className="animate-spin text-cent" />
                      </div>
                   )}
                   {hasMoreHistory && !historyLoading && accountHistory.length > 0 && (
                      <div className="p-4 border-t border-slate-800/80 text-center bg-slate-900/30">
                         <button 
                            onClick={() => fetchHistory(historyOffset)}
                            className="text-cent text-sm font-medium hover:text-green-400 transition-colors"
                         >
                            Carregar Mais
                         </button>
                      </div>
                   )}
                </div>
             </div>
          </div>
        ) : loadingDiscussions ? (
          <div className="py-20 flex justify-center">
             <Loader2 className="animate-spin text-cent" size={32} />
          </div>
        ) : discussions.length === 0 ? (
          <div className="py-20 text-center text-slate-500 bg-card rounded-2xl border border-slate-700/50">
             <MessageCircle size={32} className="mx-auto mb-4 opacity-50" />
             <p>Nenhuma publicação encontrada.</p>
          </div>
        ) : (
          <div className="space-y-4">
             {discussions.map(post => {
                const isComment = post.parent_author !== '';
                return (
                  <div key={`${post.author}-${post.permlink}`} className="bg-card rounded-2xl border border-slate-700/50 p-4 sm:p-6 shadow-sm hover:border-slate-500/50 transition-all flex flex-col sm:flex-row gap-4 sm:gap-6 group">
                    {!isComment && (
                      <Link to={`/@${post.author}/${post.permlink}`} state={{ backgroundLocation: location }} className="block w-full sm:w-40 shrink-0 overflow-hidden rounded-xl bg-slate-800 h-32 sm:h-auto">
                        <img 
                            src={getThumbnail(post)}
                            alt="Thumbnail"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => (e.target as HTMLImageElement).src = `https://images.hive.blog/u/${post.author}/avatar`}
                        />
                      </Link>
                    )}
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Link to={`/profile/${post.author}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
                            <img 
                              src={`https://images.hive.blog/u/${post.author}/avatar`} 
                              alt={post.author}
                              className="w-5 h-5 rounded-full bg-slate-800 shrink-0"
                            />
                            <span className="font-bold text-slate-200 text-sm truncate">{post.author}</span>
                        </Link>
                        <span className="text-slate-500 text-xs shrink-0">&bull;</span>
                        <span className="text-slate-500 text-xs shrink-0">{new Date(post.created + 'Z').toLocaleDateString()}</span>
                        {isComment && (
                           <>
                             <span className="text-slate-500 text-xs shrink-0">&bull;</span>
                             <span className="text-slate-500 text-xs truncate">em resposta a @{post.parent_author}</span>
                           </>
                        )}
                      </div>
                      
                      {post.title && (
                        <Link to={`/@${post.root_author || post.author}/${post.root_permlink || post.permlink}`} state={{ backgroundLocation: location }} className="group-hover:text-cent transition-colors block mb-1 min-w-0">
                          <h3 className="text-lg font-bold text-white truncate">{post.title}</h3>
                        </Link>
                      )}

                      <div className="text-slate-400 text-sm mb-3 line-clamp-2 leading-relaxed flex-1">
                        {renderPostPreview(post.body || (post as any).desc || '')}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-700/30 w-full">
                          <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                            <div className="flex items-center gap-1.5 transition-colors">
                              <button 
                                onClick={() => handleVote(post)}
                                disabled={post.active_votes?.some(v => v.voter === user) || votingPost === post.permlink}
                                className={`${
                                  post.active_votes?.some(v => v.voter === user) ? 'text-green-400' : 'hover:text-green-300'
                                }`}
                              >
                                {votingPost === post.permlink ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Heart size={14} className={post.active_votes?.some(v => v.voter === user) ? "fill-green-400" : ""} />
                                )}
                              </button>
                              <button
                                onClick={() => setVotersModalPost(post)}
                                className="hover:text-white transition-colors font-medium"
                              >
                                {(post.active_votes?.length || 0)}
                              </button>
                            </div>
                            <span className="flex items-center gap-1.5">
                                <MessageCircle size={14} /> <span>{post.children}</span>
                            </span>
                            <span className="text-cent font-mono bg-cent/10 border border-cent/20 px-2 py-0.5 rounded flex items-center gap-1.5">
                                <Coins size={12} />
                                {getCalculatedCentReward(post)} {community}
                            </span>
                          </div>
                      </div>
                    </div>
                  </div>
                );
             })}
          </div>
        )}
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

export default Profile;
