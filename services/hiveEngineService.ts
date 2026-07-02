import { Token, MarketMetrics, Balance, Order, HiveEngineResponse, HivePost, TribeInfo } from '../types';
import localforage from 'localforage';
import { communityConfig } from '../config';

const HIVE_ENGINE_RPC_NODES = [
  "https://api.hive-engine.com/rpc/contracts",
  "https://api2.hive-engine.com/rpc/contracts",
  "https://ha.herpc.dtools.dev/contracts",
  "https://herpc.dtools.dev/contracts",
  "https://enginerpc.com/contracts",
];
const SCOT_API_NODES = communityConfig.useLegacyScot ? [
  "https://scot-api.hive-engine.com",
  "https://smt-api.enginerpc.com"
] : [
  "https://smt-api.enginerpc.com",
  "https://scot-api.hive-engine.com"
];
const HIVE_RPC_NODES = [
  "https://api.hive.blog",
  "https://rpc.ecency.com",
  "https://api.deathwing.me",
  "https://anyx.io",
  "https://rpc.ausbit.dev"
];

const apiCache = new Map<string, { data: any, timestamp: number }>();
// In-flight request deduplication — prevents parallel identical calls
const inFlight = new Map<string, Promise<any>>();

const CACHE_TTL_DEFAULT  = 1000 * 60 * 3;  // 3 min  — posts, balances
const CACHE_TTL_TRIBE    = 1000 * 60 * 10; // 10 min — tribe info (rarely changes)
const CACHE_TTL_METRICS  = 1000 * 60 * 2;  // 2 min  — market prices
const CACHE_TTL_HISTORY  = 1000 * 60 * 5;  // 5 min  — account history

// --- Hive Engine Contract Calls ---

const rpcCall = async <T,>(contract: string, table: string, query: Record<string, any>, limit: number = 1000, offset: number = 0, sort: Record<string, number> = {}, ttl = CACHE_TTL_DEFAULT): Promise<T[]> => {
  const cacheKey = `rpc_${contract}_${table}_${JSON.stringify(query)}_${limit}_${offset}_${JSON.stringify(sort)}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T[];
  }
  // Deduplicate in-flight requests
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey)!;

  const body = {
    jsonrpc: "2.0",
    method: "find",
    params: {
      contract,
      table,
      query,
      limit,
      offset,
      indexes: sort ? [] : [], 
    },
    id: 1,
  };

  if (Object.keys(sort).length > 0) {
    // @ts-ignore
    body.params.sort = sort; 
  }

  const fetchPromise = (async () => {
    for (const node of HIVE_ENGINE_RPC_NODES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(node, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const text = await response.text();
        try {
          const data = JSON.parse(text);
          if (data.error) throw new Error(`RPC Error: ${JSON.stringify(data.error)}`);
          const result = data.result || [];
          apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        } catch {
          throw new Error(`Invalid JSON response`);
        }
      } catch (error) {
        console.warn(`Hive Engine API Error on ${node}:`, error);
      }
    }
    console.error('All Hive Engine RPC nodes failed.');
    return [];
  })();

  inFlight.set(cacheKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlight.delete(cacheKey);
  }
};

export const getCentTokenInfo = async (symbol: string = 'BYTE'): Promise<Token | null> => {
  const tokens = await rpcCall<Token>('tokens', 'tokens', { symbol }, 1);
  return tokens.length > 0 ? tokens[0] : null;
};

export const getCentMetrics = async (symbol: string = 'BYTE'): Promise<MarketMetrics | null> => {
  // Market metrics change frequently — use shorter TTL
  const metrics = await rpcCall<MarketMetrics>('market', 'metrics', { symbol }, 1, 0, {}, CACHE_TTL_METRICS);
  return metrics.length > 0 ? metrics[0] : null;
};

export const getCentRichList = async (symbol: string = 'BYTE'): Promise<Balance[]> => {
  return await rpcCall<Balance>('tokens', 'balances', { symbol }, 50, 0, { balance: -1 }, CACHE_TTL_DEFAULT);
};

export const getOrderBook = async (symbol: string = 'BYTE'): Promise<{ buy: Order[], sell: Order[] }> => {
  const buy = await rpcCall<Order>('market', 'buyBook', { symbol }, 50, 0, { price: -1 });
  const sell = await rpcCall<Order>('market', 'sellBook', { symbol }, 50, 0, { price: 1 });
  return { buy, sell };
};

export const getUserBalances = async (username: string, symbols?: string[]): Promise<Balance[]> => {
  const query: any = { account: username };
  if (symbols && symbols.length > 0) {
    query.symbol = { "$in": symbols };
  }
  return await rpcCall<Balance>('tokens', 'balances', query, 1000);
};

export const getUserBalance = async (username: string, symbol: string = 'BYTE'): Promise<Balance | null> => {
  const balances = await rpcCall<Balance>('tokens', 'balances', { symbol, account: username });
  return balances.length > 0 ? balances[0] : null;
};

export const getAccountHistory = async (username: string, symbol: string = 'BYTE', limit: number = 30, offset: number = 0): Promise<any[]> => {
  const cacheKey = `history_${username}_${symbol}_${limit}_${offset}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_HISTORY) {
    return cached.data;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(
      `https://history.hive-engine.com/accountHistory?account=${username}&symbol=${symbol}&limit=${limit}&offset=${offset}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      apiCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching account history:', error);
    return [];
  }
};

// --- Hive Blockchain / Scotbot Calls ---

export const scotFetch = async (endpoint: string, ttl = CACHE_TTL_DEFAULT): Promise<any> => {
  const cacheKey = `scot_${endpoint}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  // Deduplicate in-flight requests
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey)!;

  const fetchPromise = (async () => {
    for (const node of SCOT_API_NODES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${node}${endpoint}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Scot HTTP error: ${response.status}`);

        const text = await response.text();
        try {
          const data = JSON.parse(text);
          apiCache.set(cacheKey, { data, timestamp: Date.now() });
          return data;
        } catch {
          throw new Error(`Invalid JSON response: ${text.substring(0, 50)}`);
        }
      } catch (err) {
        console.warn(`ScotAPI Error on ${node}:`, err);
      }
    }
    console.warn('All SCOT API nodes failed');
    return null;
  })();

  inFlight.set(cacheKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlight.delete(cacheKey);
  }
};

export const getTrendingTags = async (token: string = 'BYTE', limit: number = 40): Promise<any[]> => {
  try {
    const data = await scotFetch(`/get_trending_tags?limit=${limit}&token=${token}`, CACHE_TTL_TRIBE);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching trending tags:', error);
    return [];
  }
};

export const getTribeInfo = async (token: string = 'BYTE'): Promise<TribeInfo | null> => {
  try {
    // Tribe info changes slowly — use longer TTL (10 min)
    const [infoData, configData] = await Promise.all([
      scotFetch(`/info?token=${token}`, CACHE_TTL_TRIBE).catch(() => null),
      scotFetch(`/config?token=${token}`, CACHE_TTL_TRIBE).catch(() => null)
    ]);

    const info = Array.isArray(infoData) && infoData.length > 0 ? infoData[0] : (infoData || {});
    const config = Array.isArray(configData) && configData.length > 0 ? configData[0] : (configData || {});

    // Ensure we at least have some valid data to return
    if (Object.keys(info).length === 0 && Object.keys(config).length === 0) {
      return null; // Return null if both failed completely
    }

    return { ...info, ...config };
  } catch (error) {
    console.error("Tribe Info Error:", error);
    return null;
  }
};

export const getHivePosts = async (
  token: string = 'BYTE', 
  sort: 'created' | 'trending' | 'hot' | 'feed' = 'created', 
  limit: number = 20,
  start_author?: string,
  start_permlink?: string,
  tag?: string
): Promise<HivePost[]> => {
  
  if (sort === 'feed') {
    let account = tag;
    if (account && account.startsWith('@')) account = account.substring(1);
    
    try {
      const result = await scotFetch(`/get_feed?limit=${limit}&tag=${account}&token=${token.toUpperCase()}&include_reblogs=true`);
      if (Array.isArray(result)) {
        return result;
      }
    } catch (error) {
      console.error("Feed error:", error);
    }
    
    return [];
  }

  const query = new URLSearchParams({
    limit: token.toUpperCase() === 'BYTE' && !start_author ? '200' : limit.toString(),
    token: token.toUpperCase(),
  });

  if (start_author) query.append('start_author', start_author);
  if (start_permlink) query.append('start_permlink', start_permlink);
  if (tag) {
    if (sort === 'feed' && !tag.startsWith('@')) {
      query.append('tag', '@' + tag);
    } else {
      query.append('tag', tag);
    }
  }

  const isByteInitialLoad = token.toUpperCase() === 'BYTE' && !start_author;
  const cacheKey = `byte_posts_${sort}_${tag || 'all'}`;

  // Se for BYTE, tenta retornar os 200 iniciais do cache persistente
  if (isByteInitialLoad) {
    try {
      const cached = await localforage.getItem<HivePost[]>(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        
        // Dispara uma atualização em background sem bloquear
        scotFetch(`/get_discussions_by_${sort}?${query.toString()}`).then(async (freshData) => {
          if (Array.isArray(freshData)) {
            // Verifica se houve mudança analisando a quantidade de votos/tempo (simplificado pelo objeto JSON modificado)
            const isDifferent = JSON.stringify(cached.map(p => ({ votes: p.active_votes?.length, comments: p.children, id: p.id }))) !== 
                                JSON.stringify(freshData.map(p => ({ votes: p.active_votes?.length, comments: p.children, id: p.id })));
            
            if (isDifferent) {
              await localforage.setItem(cacheKey, freshData);
              // Dispara evento para interface atualizar se desejar
              window.dispatchEvent(new CustomEvent('byte-data-updated', { detail: { sort } }));
            }
          }
        }).catch(err => console.error("Background refresh error:", err));

        return cached.slice(0, limit);
      }
    } catch (e) {
      console.error("Localforage cache error", e);
    }
  }

  try {
    const data = await scotFetch(`/get_discussions_by_${sort}?${query.toString()}`);
    
    if (Array.isArray(data)) {
      if (isByteInitialLoad) {
         await localforage.setItem(cacheKey, data);
         return data.slice(0, limit);
      }
      return data;
    }
    return [];
  } catch (error) {
    console.error("Scot API Error:", error);
    return [];
  }
};

export const getScotPost = async (author: string, permlink: string, token: string = 'BYTE'): Promise<HivePost | null> => {
  try {
    const rawData = await scotFetch(`/@${author}/${permlink}?token=${token}`);
    
    let data = rawData;
    if (rawData && rawData[token]) {
        data = rawData[token];
    }
    
    if (data && data.author) {
       if (!data.vote_rshares || Number(data.vote_rshares) === 0) {
          try {
             const feedData = await scotFetch(`/get_discussions_by_author?token=${token}&author=${author}&limit=50`);
             if (Array.isArray(feedData)) {
                const found = feedData.find((p: any) => p.permlink === permlink);
                if (found) {
                    console.log("Scotbot fallback: Found updated post data in author feed", found);
                    return found;
                }
             }
          } catch(e) {
            console.warn("Scotbot fallback fetch failed", e);
          }
       }
       return data;
    }
    return null;
  } catch (error) {
    console.error("Scot Single Post Error:", error);
    return null;
  }
};

const hiveFetch = async (method: string, params: any, ttl = CACHE_TTL_DEFAULT): Promise<any> => {
  const cacheKey = `hive_${method}_${JSON.stringify(params)}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey)!;

  const body = {
    jsonrpc: "2.0",
    method,
    params,
    id: 1,
  };

  const fetchPromise = (async () => {
    for (const node of HIVE_RPC_NODES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(node, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Hive HTTP error: ${response.status}`);

        const data = await response.json();
        if (data.error) throw new Error(`RPC Error: ${JSON.stringify(data.error)}`);
        apiCache.set(cacheKey, { data: data.result, timestamp: Date.now() });
        return data.result;
      } catch (err) {
        console.warn(`Hive RPC Error on ${node}:`, err);
      }
    }
    throw new Error('All Hive RPC nodes failed');
  })();

  inFlight.set(cacheKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlight.delete(cacheKey);
  }
};

export const getPendingCuration = async (username: string, token: string = 'BYTE'): Promise<number> => {
  try {
    const [posts, comments, tribeInfo] = await Promise.all([
      scotFetch(`/get_discussions_by_created?limit=200&token=${token.toUpperCase()}`),
      scotFetch(`/get_discussions_by_comments?limit=200&token=${token.toUpperCase()}`),
      getTribeInfo(token)
    ]);
    
    let myPendingCuration = 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const allPosts = [
        ...(Array.isArray(posts) ? posts : []),
        ...(Array.isArray(comments) ? comments : [])
    ];
    
    allPosts.forEach(post => {
        const created = new Date(post.created + 'Z').getTime();
        if (created < sevenDaysAgo) return;
        
        const totalRshares = Number(post.vote_rshares) || 0;
        let pendingToken = Number(post.pending_token) || 0;
        
        if (pendingToken === 0 && tribeInfo && totalRshares > 0) {
            const exponent = tribeInfo.author_curve_exponent != null ? Number(tribeInfo.author_curve_exponent) : 1;
            const rewardPool = tribeInfo.reward_pool != null ? parseFloat(tribeInfo.reward_pool) : 0;
            const pendingRshares = tribeInfo.pending_rshares != null ? parseFloat(tribeInfo.pending_rshares) : 0;

            if (pendingRshares > 0 && rewardPool > 0) {
                pendingToken = ((Math.pow(totalRshares, exponent)) * rewardPool) / pendingRshares;
            }
        }
        
        if (totalRshares > 0 && pendingToken > 0 && Array.isArray(post.active_votes)) {
            const myVote = post.active_votes.find((v: any) => v.voter === username);
            if (myVote) {
                const myRshares = Number(myVote.rshares) || 0;
                if (myRshares > 0) {
                    const voteValue = (myRshares / totalRshares) * pendingToken;
                    const curationReward = voteValue / 2; // half goes to curation
                    myPendingCuration += curationReward;
                }
            }
        }
    });

    const precision = tribeInfo?.precision ?? (token.toUpperCase() === 'POB' ? 8 : 2);
    return myPendingCuration / Math.pow(10, precision);
  } catch (error) {
     console.error("Error calculating pending curation:", error);
     return 0;
  }
};
export const getUserDiscussions = async (
  username: string,
  type: 'blog' | 'comments' | 'replies',
  token: string = 'BYTE',
  limit: number = 20
): Promise<HivePost[]> => {
  let tag = username;
  if (tag.startsWith('@')) tag = tag.substring(1);
  
  const query = new URLSearchParams({
    limit: limit.toString(),
    tag,
    token: token.toUpperCase(),
  });
  
  if (type === 'blog') {
    query.append('include_reblogs', 'true');
  }

  try {
    const data = await scotFetch(`/get_discussions_by_${type}?${query.toString()}`);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.error(`User discussions error (${type}):`, error);
    return [];
  }
};

export const getPostContent = async (author: string, permlink: string): Promise<HivePost | null> => {
  try {
    return await hiveFetch("condenser_api.get_content", [author, permlink]);
  } catch (error) {
    console.error("Hive Content Error:", error);
    return null;
  }
};

export const getPostReplies = async (author: string, permlink: string): Promise<HivePost[]> => {
  try {
    const result = await hiveFetch("condenser_api.get_content_replies", [author, permlink]);
    return result || [];
  } catch (error) {
    console.error("Hive Replies Error:", error);
    return [];
  }
};

export const getMarketPools = async (symbol: string = 'BYTE'): Promise<any[]> => {
  try {
    const pools = await rpcCall<any>('marketpools', 'pools', {
      tokenPair: { "$regex": symbol }
    });
    return pools;
  } catch (e) {
    console.error("Error fetching market pools:", e);
    return [];
  }
};

export const getPoolHolders = async (tokenPair: string): Promise<any[]> => {
  try {
    const positions = await rpcCall<any>('marketpools', 'liquidityPositions', {
      tokenPair: tokenPair
    }, 1000, 0);
    return positions.sort((a, b) => parseFloat(b.shares || '0') - parseFloat(a.shares || '0'));
  } catch (e) {
    console.error("Error fetching pool holders:", e);
    return [];
  }
};

export const getUserPoolShares = async (username: string, symbol: string = 'BYTE'): Promise<any[]> => {
  try {
    const shares = await rpcCall<any>('marketpools', 'liquidityPositions', {
      account: username,
      tokenPair: { "$regex": symbol }
    });
    return shares;
  } catch (e) {
    console.error("Error fetching user pool shares:", e);
    return [];
  }
};