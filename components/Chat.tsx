import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCommunity } from '../contexts/CommunityContext';
import { Send, Loader2, MessageSquare, AlertCircle, RefreshCw, LayoutList, MessageCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  timestamp: string;
  author: string;
  message: string;
  block_num: number;
}

const Chat: React.FC = () => {
  const { user, customJson } = useAuth();
  const { community } = useCommunity();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'microblog'>('chat');

  const customId = `${community.toLowerCase()}_public_chat`;

  const fetchMessages = async (startBlock?: number) => {
    try {
      const url = `https://hafsql-api.mahdiyari.info/operations/custom_json/${customId}?limit=50${startBlock ? `&start=${startBlock}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const data = await response.json();
      
      const parsedMessages: ChatMessage[] = data.map((item: any) => {
        let msgText = '';
        try {
          const parsedJson = JSON.parse(item.json);
          msgText = parsedJson.message || parsedJson.text || '';
        } catch (e) {
          msgText = item.json;
        }

        return {
          id: item.id,
          timestamp: item.timestamp,
          author: item.required_posting_auths[0] || item.required_auths[0] || 'Unknown',
          message: msgText,
          block_num: item.block_num
        };
      }).filter((m: ChatMessage) => m.message.trim() !== '');

      if (parsedMessages.length < 50) {
        setHasMore(false);
      }

      if (startBlock) {
        setMessages(prev => {
           const newMsgs = parsedMessages.filter(nm => !prev.some(pm => pm.id === nm.id));
           return [...prev, ...newMsgs];
        });
      } else {
        setMessages(prev => {
           if (prev.length === 0) return parsedMessages;
           // If polling, prepend new messages that aren't in state
           const newMsgs = parsedMessages.filter(nm => !prev.some(pm => pm.id === nm.id));
           
           // Remove temp optimistic messages that match the new ones
           const newPrev = prev.filter(pm => {
              if (pm.id.startsWith('temp-')) {
                 return !newMsgs.some(nm => nm.author === pm.author && nm.message === pm.message);
              }
              return true;
           });

           return [...newMsgs, ...newPrev];
        });
        if (!startBlock) {
          setHasMore(parsedMessages.length >= 50);
        }
      }
    } catch (error) {
      console.error("Error fetching chat:", error);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
    
    const interval = setInterval(() => {
      fetchMessages();
    }, 10000); // refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [customId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inputText.trim() || sending) return;

    setSending(true);
    
    const payload = {
      message: inputText.trim(),
      app: `${community}Explorer/1.0`
    };

    try {
      const res = await customJson(
        customId, 
        payload, 
        'Chat Message', 
        'Posting'
      );

      if (res.success) {
        // Optimistically add the message to the list
        const optimisticMsg: ChatMessage = {
          id: `temp-${Date.now()}`,
          timestamp: new Date().toISOString(),
          author: user,
          message: inputText.trim(),
          block_num: 999999999 // placeholder
        };
        setMessages(prev => [optimisticMsg, ...prev]);
        setInputText('');
      } else {
        alert("Erro ao enviar mensagem: " + res.msg);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldestBlock = Math.min(...messages.map(m => m.block_num));
    await fetchMessages(oldestBlock);
    setLoadingMore(false);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-8rem)] animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
             <MessageSquare className="text-cent" /> 
             {community} Public Chat
          </h1>
          <p className="text-xs text-slate-400 mt-1">Todas as mensagens são públicas e registradas na blockchain Hive.</p>
        </div>
        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
           <div className="flex items-center gap-2 text-xs font-mono">
             <span className="bg-slate-800 px-3 py-1.5 rounded-lg text-cent border border-cent/20 shadow-[0_0_15px_rgba(255,200,0,0.1)] font-bold">
               ID: {customId}
             </span>
           </div>
           <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800 w-full sm:w-auto justify-end">
             <button
               onClick={() => setViewMode('chat')}
               className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${viewMode === 'chat' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
             >
               <MessageCircle size={14} /> <span>Chat</span>
             </button>
             <button
               onClick={() => setViewMode('microblog')}
               className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${viewMode === 'microblog' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
             >
               <LayoutList size={14} /> <span>Feed</span>
             </button>
           </div>
        </div>
      </div>

      <div className="flex-1 bg-card border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col">
        {/* Messages List */}
        <div className={`flex-1 p-4 overflow-y-auto ${viewMode === 'chat' ? 'flex flex-col-reverse gap-4' : 'flex flex-col gap-4 bg-slate-950/50'}`}>
          {loading && messages.length === 0 ? (
            <div className="flex-1 flex justify-center items-center">
              <Loader2 className="animate-spin text-cent" size={32} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
               <MessageSquare size={48} className="mb-4 opacity-20" />
               <p>Nenhuma mensagem ainda.</p>
               <p className="text-sm">Seja o primeiro a enviar algo!</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                 const isMe = msg.author === user;
                 const isOptimistic = msg.id.startsWith('temp-');

                 if (viewMode === 'microblog') {
                   return (
                     <div key={msg.id} className={`bg-slate-900 border ${isOptimistic ? 'border-dashed border-slate-700 opacity-70' : 'border-slate-800'} rounded-xl p-4 flex gap-3 transition-all`}>
                        <img 
                          src={`https://images.hive.blog/u/${msg.author}/avatar/small`} 
                          alt={msg.author} 
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                           <div className="flex items-center justify-between mb-1">
                             <span className="font-bold text-cent">{msg.author}</span>
                             <div className="flex items-center gap-2">
                               {isOptimistic && <Loader2 size={12} className="animate-spin text-cent" />}
                               <span className="text-xs text-slate-500">{new Date(msg.timestamp).toLocaleString()}</span>
                             </div>
                           </div>
                           <div className="text-sm text-slate-300 break-words whitespace-pre-wrap">{msg.message}</div>
                        </div>
                     </div>
                   );
                 }

                 return (
                   <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isOptimistic ? 'opacity-70' : ''}`}>
                     <div className="flex items-center gap-2 mb-1 px-1">
                        {!isMe && (
                          <img 
                            src={`https://images.hive.blog/u/${msg.author}/avatar/small`} 
                            alt={msg.author} 
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <span className={`text-xs font-medium ${isMe ? 'text-cent' : 'text-slate-400'}`}>
                           {isMe ? 'Você' : msg.author}
                        </span>
                        <div className="flex items-center gap-1">
                          {isOptimistic && <Loader2 size={10} className="animate-spin text-cent" />}
                          <span className="text-[10px] text-slate-500">
                             {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                     </div>
                     <div className={`max-w-[85%] sm:max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-cent text-slate-900 rounded-tr-sm' : 'bg-slate-800 text-white rounded-tl-sm'}`}>
                        <div className="break-words whitespace-pre-wrap">{msg.message}</div>
                     </div>
                   </div>
                 );
              })}
              
              {hasMore && (
                <div className="flex justify-center pt-4 pb-2">
                  <button 
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors bg-slate-800/50 px-4 py-2 rounded-full"
                  >
                    {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Carregar Mais Antigas
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-900 border-t border-slate-700/50">
          {user ? (
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cent transition-colors"
                maxLength={2000}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="bg-cent text-slate-900 px-4 sm:px-6 py-3 rounded-xl font-bold hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 text-slate-400 py-3 bg-slate-950 rounded-xl border border-slate-800">
              <AlertCircle size={18} />
              <span>Conecte-se para enviar mensagens no chat</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
