export interface TokenMetadata {
  url: string;
  icon: string;
  desc: string;
}

export interface Token {
  _id: number;
  issuer: string;
  symbol: string;
  name: string;
  metadata: string; // JSON string
  precision: number;
  maxSupply: string;
  supply: string;
  circulatingSupply: string;
}

export interface MarketMetrics {
  _id: number;
  symbol: string;
  volume: string;
  volumeExpiration: number;
  lastPrice: string;
  lowestAsk: string;
  highestBid: string;
  priceChangePercent: string;
  priceChangeHive: string;
}

export interface Balance {
  account: string;
  symbol: string;
  balance: string;
  stake: string;
  delegationsIn?: string;
  delegationsOut?: string;
  pendingUnstake?: string;
}

export interface Order {
  account: string;
  price: string;
  quantity: string;
  timestamp: number;
}

export interface HiveEngineResponse<T> {
  jsonrpc: string;
  result: T[];
  id: number;
}

export interface TribeInfo {
  token: string;
  precision: number;
  author_curve_exponent: number;
  pending_rshares: string;
  reward_pool: string;
  last_reward_pool_update: string;
}

export interface ActiveVote {
  voter: string;
  weight: number;
  rshares: number | string;
  percent: number;
  reputation?: number | string;
  time?: string;
}

export interface HivePost {
  post_id: number; // Note: Scotbot might verify ID differenlty, but core fields remain
  author: string;
  permlink: string;
  category: string;
  title: string;
  body: string;
  desc?: string;
  json_metadata: string | object; // Scotbot sometimes parses this
  created: string;
  net_votes: number;
  children: number;
  // Standard Hive Fields (might be present)
  active_votes?: ActiveVote[];
  pending_payout_value?: string;
  total_payout_value?: string;
  curator_payout_value?: string;
  cashout_time?: string;
  // Scotbot/Token Specific Fields
  pending_token?: number;
  precision?: number;
  token?: string;
  vote_rshares?: number;
}

// Keychain Types
export interface KeychainResponse {
  success: boolean;
  msg: string;
  result?: string;
  data?: any;
  error?: string;
}

export interface HiveKeychain {
  requestSignBuffer(
    username: string,
    message: string,
    keyType: 'Posting' | 'Active' | 'Memo',
    callback: (response: KeychainResponse) => void
  ): void;
  requestVote(
    username: string,
    permlink: string,
    author: string,
    weight: number,
    callback: (response: KeychainResponse) => void
  ): void;
  requestBroadcast(
    username: string,
    operations: any[],
    keyType: 'Posting' | 'Active',
    callback: (response: KeychainResponse) => void
  ): void;
}

declare global {
  interface Window {
    hive_keychain?: HiveKeychain;
  }
}