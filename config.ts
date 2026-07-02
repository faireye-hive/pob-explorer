export interface CommunityConfig {
  tokenSymbol: string;
  useLegacyScot: boolean;
}

// Arquivo de configuração simples para mudar a comunidade.
// Altere 'tokenSymbol' para o símbolo da moeda (ex: 'POB', 'BYTE').
// Altere 'useLegacyScot' para true se a comunidade usar a API antiga (scot-api).
export const communityConfig: CommunityConfig = {
  tokenSymbol: 'POB',
  useLegacyScot: true,
};
