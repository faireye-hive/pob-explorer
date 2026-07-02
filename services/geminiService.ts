import { MarketMetrics, Token } from '../types';

// Verifica se a API key está disponível em tempo de execução
const GEMINI_API_KEY: string | undefined =
  (typeof process !== 'undefined' && process.env?.API_KEY) || undefined;

export const isGeminiAvailable = (): boolean => !!GEMINI_API_KEY;

export const analyzeTokenData = async (token: Token, metrics: MarketMetrics): Promise<string> => {
  if (!GEMINI_API_KEY) {
    return '';
  }

  try {
    // Import dinâmico para não bloquear o bundle quando a key não existe
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = `
      Você é um analista financeiro de criptomoedas experiente na blockchain Hive.
      Analise os seguintes dados do token ${token.symbol} (${token.name}):
      
      Preço Atual: ${metrics.lastPrice} HIVE
      Variação 24h: ${metrics.priceChangePercent}%
      Volume 24h: ${metrics.volume} HIVE
      Oferta em Circulação: ${token.circulatingSupply} ${token.symbol}
      Oferta Total: ${token.supply} ${token.symbol}
      Maior Lance de Compra (Bid): ${metrics.highestBid}
      Menor Oferta de Venda (Ask): ${metrics.lowestAsk}

      Forneça um resumo curto (máximo 3 parágrafos) em Português sobre a saúde do token, sentimento do mercado (baseado na variação e volume) e uma recomendação cautelosa de "Manter", "Comprar" ou "Vender" baseada apenas nos dados técnicos fornecidos. Seja profissional mas acessível. Use Markdown para formatação.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return response.text || 'Não foi possível gerar a análise no momento.';
  } catch (error) {
    console.error('Gemini Analysis Error:', error);
    return 'Erro ao conectar com o analista IA. Verifique sua chave API.';
  }
};