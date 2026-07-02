import React from 'react';
import { useHiddenUsers } from '../utils/hiddenUsers';
import { EyeOff, UserMinus, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

const HiddenUsers: React.FC = () => {
  const { hiddenUsers, unhideUser } = useHiddenUsers();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
          <EyeOff size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Usuários Ocultos</h1>
          <p className="text-slate-400">Gerencie os usuários cujos comentários você escolheu não ver.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
        {hiddenUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <UserMinus size={48} className="text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhum usuário oculto</h3>
            <p className="text-slate-400 max-w-md">
              Você ainda não ocultou os comentários de nenhum usuário.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {hiddenUsers.map(username => (
              <div key={username} className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-4">
                  <Link to={`/profile/${username}`}>
                    <img 
                      src={`https://images.hive.blog/u/${username}/avatar`} 
                      alt={username} 
                      className="w-12 h-12 rounded-full border border-slate-600 hover:border-cent transition-colors"
                      onError={(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/48'}
                    />
                  </Link>
                  <div>
                    <Link to={`/profile/${username}`} className="text-lg font-bold text-white hover:text-cent transition-colors">
                      @{username}
                    </Link>
                  </div>
                </div>
                <button
                  onClick={() => unhideUser(username)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-medium transition-colors border border-slate-600 hover:border-slate-500"
                >
                  <UserPlus size={16} />
                  <span className="hidden sm:inline">Desocultar</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HiddenUsers;
