import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Edit3, Loader2, ImagePlus, Hash, Settings, DollarSign } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';

const SUGGESTED_TAGS = ['byte', 'leofinance', 'hive-engine', 'development', 'crypto', 'blog', 'pt', 'br'];

const CreatePost: React.FC = () => {
  const { user, comment } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('byte');
  const [declinePayout, setDeclinePayout] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <Edit3 size={64} className="text-slate-600 mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">Login Necessário</h2>
        <p className="text-slate-400 mb-6">Faça login com Hive Keychain para poder criar publicações na comunidade.</p>
      </div>
    );
  }

  const handlePublish = async () => {
    if (!title.trim() || !body.trim()) {
      alert("Título e conteúdo são obrigatórios.");
      return;
    }

    const tagsArray = tags.split(',')
      .map(t => t.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter(t => t !== '');

    if (tagsArray.length === 0) {
       tagsArray.push('byte');
    }

    setIsPublishing(true);
    try {
      // Para criar um post novo no Hive, o comment parentAuthor e parentPermlink são geralmente os da categoria. O parentPermlink costuma ser a tag principal. Mas no comment operation `parent_author` vazio e `parent_permlink` = tag transforma o "comment" em um post original.
      const result = await comment('', tagsArray[0], title, body, tagsArray, declinePayout);
      
      if (result.success) {
        alert("Publicação enviada com sucesso!");
        navigate('/explorer');
      } else {
        alert("Erro ao publicar: " + result.msg);
      }
    } catch (e: any) {
      alert("Erro ao publicar: " + e.message);
    }
    setIsPublishing(false);
  };

  const getCleanPreview = () => {
    return DOMPurify.sanitize(body);
  };

  const toggleTag = (tag: string) => {
    let currentTags = tags.split(',').map(t => t.trim()).filter(t => t !== '');
    if (currentTags.includes(tag)) {
        currentTags = currentTags.filter(t => t !== tag);
    } else {
        currentTags.push(tag);
    }
    setTags(currentTags.join(', '));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="bg-card p-6 md:p-8 rounded-2xl border border-slate-700/50 shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
             <Edit3 className="text-cent" /> Criar Publicação
          </h2>
          <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">
             <button 
                onClick={() => setIsPreview(false)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${!isPreview ? 'bg-cent text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
             >
               Editar
             </button>
             <button 
                onClick={() => setIsPreview(true)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${isPreview ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
             >
               Visualizar
             </button>
          </div>
        </div>

        {!isPreview ? (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-1">Título</label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Um título chamativo para seu post..."
                className="w-full bg-slate-900 border border-slate-600 p-3 rounded-lg text-white font-bold text-lg focus:outline-none focus:border-cent transition-colors"
                disabled={isPublishing}
              />
            </div>

            <div>
              <label className="block text-slate-400 text-sm font-medium mb-1 flex justify-between">
                Sua História (em Markdown)
                <span className="text-xs text-slate-500">Imagens podem ser adicionadas com ![Nome](URL)</span>
              </label>
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escreva sua publicação usando Markdown..."
                className="w-full bg-slate-900 border border-slate-600 p-3 rounded-lg text-slate-300 font-mono focus:outline-none focus:border-cent transition-colors min-h-[350px] resize-y"
                disabled={isPublishing}
              />
            </div>

            <div className="bg-slate-800/50 p-4 border border-slate-700/50 rounded-xl space-y-4">
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2 flex items-center gap-2">
                  <Hash size={16} /> Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {SUGGESTED_TAGS.map(tag => {
                    const isActive = tags.split(',').map(t => t.trim()).includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                          isActive 
                            ? 'bg-cent/20 text-cent border-cent/50' 
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
                <input 
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Personalize suas tags (separadas por vírgula)..."
                  className="w-full bg-slate-900 border border-slate-600 p-3 rounded-lg text-white focus:outline-none focus:border-cent transition-colors"
                  disabled={isPublishing}
                />
                <p className="text-xs text-slate-500 mt-2">A primeira tag define a categoria principal do seu post. Limite de 10 tags.</p>
              </div>

              <div className="border-t border-slate-700 pt-4 mt-2">
                <label className="text-slate-400 text-sm font-medium mb-3 flex items-center gap-2">
                   <Settings size={16} /> Opções Avançadas
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${declinePayout ? 'bg-cent border-cent' : 'bg-slate-900 border-slate-600 group-hover:border-cent'}`}>
                    {declinePayout && <DollarSign size={14} className="text-slate-900" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={declinePayout}
                    onChange={(e) => setDeclinePayout(e.target.checked)}
                    className="hidden"
                  />
                  <div>
                    <div className="text-slate-300 font-medium text-sm group-hover:text-white transition-colors">Declinar Pagamento (Decline Payout)</div>
                    <div className="text-xs text-slate-500">O post não receberá recompensas HBD/HP, mas pode continuar recebendo tokens da Hive Engine.</div>
                  </div>
                </label>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 min-h-[500px]">
             {title && <h1 className="text-3xl font-bold text-white mb-6 border-b border-slate-800 pb-4">{title}</h1>}
             {body ? (
                <div className="prose max-w-none text-slate-300 prose-headings:text-white prose-p:text-slate-300 prose-a:text-cent hover:prose-a:text-white prose-strong:text-white prose-ul:text-slate-300 prose-ol:text-slate-300 prose-li:text-slate-300 prose-img:rounded-xl transition-all">
                  <ReactMarkdown>{getCleanPreview()}</ReactMarkdown>
                </div>
             ) : (
                <div className="text-center text-slate-500 py-20">Nada para visualizar.</div>
             )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
           <button 
              onClick={handlePublish}
              disabled={isPublishing || !title || !body}
              className="bg-cent text-slate-900 font-bold px-8 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(255,200,0,0.3)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
           >
              {isPublishing ? <Loader2 size={20} className="animate-spin" /> : <Edit3 size={20} />}
              Publicar Post
           </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
