import React, { useMemo } from 'react';
import { HivePost, TribeInfo, ActiveVote } from '../types';
import { X, Heart, HandCoins } from 'lucide-react';
import { useCommunity } from '../contexts/CommunityContext';
import { communityConfig } from '../config';

interface VotersModalProps {
  post: HivePost | null;
  isOpen: boolean;
  onClose: () => void;
  tribeInfo: TribeInfo | null;
}

export const VotersModal: React.FC<VotersModalProps> = ({ post, isOpen, onClose, tribeInfo }) => {
  const { community } = useCommunity();

  const precision = useMemo(() => {
    if (!post) return 2;
    return post.precision ?? tribeInfo?.precision ?? (communityConfig.tokenSymbol.toUpperCase() === 'POB' ? 8 : 2);
  }, [post, tribeInfo]);

  const votersList = useMemo(() => {
    if (!post || !post.active_votes) return [];

    const totalRsharesStr = typeof post.vote_rshares === 'string' ? post.vote_rshares : (post.vote_rshares?.toString() || '0');
    const totalRshares = parseInt(totalRsharesStr, 10) || 1;

    let postCalculatedReward = 0;
    
    // 1. Prioritize pending_token if present and valid
    if (post.pending_token != null && post.pending_token > 0) {
      postCalculatedReward = post.pending_token / Math.pow(10, precision);
    } else {
      // 2. Check if post is paid out (author_payout_value, curator_payout_value, beneficiary_payout_value)
      const authorPayout = Number((post as any).author_payout_value) || 0;
      const curatorPayout = Number((post as any).curator_payout_value) || 0;
      const beneficiaryPayout = Number((post as any).beneficiary_payout_value) || 0;
      const totalPaid = authorPayout + curatorPayout + beneficiaryPayout;
      if (totalPaid > 0) {
        postCalculatedReward = totalPaid / Math.pow(10, precision);
      } else if (tribeInfo && post.vote_rshares != null) {
        // 3. Dynamic Calculation using rshares as a fallback
        const postRshares = Number(post.vote_rshares);
        const exponent = Number(tribeInfo.author_curve_exponent || 1);
        
        let rsharesUsed = postRshares;
        
        if (exponent !== 1) {
             const r = postRshares / 1e12;
             rsharesUsed = Math.pow(r, exponent) * 1e12;
        }

        const pool = Number(tribeInfo.reward_pool) || 0;
        const pending = Number(tribeInfo.pending_rshares) || 1;
        
        const reward = (rsharesUsed * pool) / pending;
        if (reward > 0) {
           postCalculatedReward = reward / Math.pow(10, precision);
        }
      }
    }

    const voters = post.active_votes
      .map(vote => {
        let voteReward = 0;
        
        const rsharesStr = typeof vote.rshares === 'string' ? vote.rshares : (vote.rshares?.toString() || '0');
        const vRshares = parseInt(rsharesStr, 10);
        
        if (vRshares > 0 && totalRshares > 0 && postCalculatedReward > 0) {
            voteReward = (vRshares / totalRshares) * postCalculatedReward;
        }
        
        return {
          voter: vote.voter,
          percent: vote.percent,
          rshares: vRshares,
          reward: voteReward
        };
      })
      .filter(v => v.reward > 0) // Show all positive reward votes
      .sort((a, b) => b.reward - a.reward);

    return voters;
  }, [post, tribeInfo, precision]);

  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
             <Heart size={18} className="text-cent" />
             Votos ({votersList.length})
          </h3>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {votersList.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
               Nenhum voto positivo {community}.
            </div>
          ) : (
            <ul className="space-y-1">
              {votersList.map(v => (
                <li key={v.voter} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <img 
                      src={`https://images.hive.blog/u/${v.voter}/avatar/small`} 
                      alt={v.voter}
                      className="w-8 h-8 rounded-full border border-slate-700"
                      onError={(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/32'}
                    />
                    <a href={`/profile/${v.voter}`} className="font-medium text-slate-200 hover:text-cent transition-colors" onClick={(e) => e.stopPropagation()}>
                       {v.voter}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-sm">
                     <span className="text-slate-400">{(v.percent / 100).toFixed(0)}%</span>
                     <span className="text-green-400 font-bold flex items-center gap-1">
                        {v.reward.toFixed(precision)}
                     </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
