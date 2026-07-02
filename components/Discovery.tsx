import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Hash, Layers, Code2, Globe, Database, Cloud, Cpu, Smartphone, Wrench, Sparkles, ChevronRight } from 'lucide-react';
import { TOPICS } from '../constants';

const getTopicIcon = (id: string) => {
  switch (id) {
    case 'languages': return <Code2 size={24} />;
    case 'webdev': return <Globe size={24} />;
    case 'backend': return <Database size={24} />;
    case 'devops': return <Cloud size={24} />;
    case 'blockchain': return <Cpu size={24} />;
    case 'mobile': return <Smartphone size={24} />;
    case 'tools': return <Wrench size={24} />;
    case 'ai': return <Sparkles size={24} />;
    default: return <Layers size={24} />;
  }
};

const getTopicColor = (id: string) => {
  switch (id) {
    case 'languages': return 'text-blue-400 group-hover:text-blue-300';
    case 'webdev': return 'text-orange-400 group-hover:text-orange-300';
    case 'backend': return 'text-emerald-400 group-hover:text-emerald-300';
    case 'devops': return 'text-cyan-400 group-hover:text-cyan-300';
    case 'blockchain': return 'text-purple-400 group-hover:text-purple-300';
    case 'mobile': return 'text-pink-400 group-hover:text-pink-300';
    case 'tools': return 'text-yellow-400 group-hover:text-yellow-300';
    case 'ai': return 'text-indigo-400 group-hover:text-indigo-300';
    default: return 'text-cent group-hover:text-green-300';
  }
};

const getBgColor = (id: string) => {
  switch (id) {
    case 'languages': return 'bg-blue-400/10 group-hover:bg-blue-400/20';
    case 'webdev': return 'bg-orange-400/10 group-hover:bg-orange-400/20';
    case 'backend': return 'bg-emerald-400/10 group-hover:bg-emerald-400/20';
    case 'devops': return 'bg-cyan-400/10 group-hover:bg-cyan-400/20';
    case 'blockchain': return 'bg-purple-400/10 group-hover:bg-purple-400/20';
    case 'mobile': return 'bg-pink-400/10 group-hover:bg-pink-400/20';
    case 'tools': return 'bg-yellow-400/10 group-hover:bg-yellow-400/20';
    case 'ai': return 'bg-indigo-400/10 group-hover:bg-indigo-400/20';
    default: return 'bg-cent/10 group-hover:bg-cent/20';
  }
};

const Discovery: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-12 px-4 md:px-6">
      <div className="flex flex-col items-center justify-center text-center space-y-6 py-12 relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-cent/10 to-transparent"></div>
        <div className="relative z-10">
          <div className="w-20 h-20 bg-card rounded-2xl flex items-center justify-center mx-auto shadow-xl border border-slate-700/50 mb-6 group hover:scale-105 transition-transform">
            <Compass size={40} className="text-cent group-hover:rotate-45 transition-transform duration-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">Descubra Assuntos</h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg md:text-xl font-medium leading-relaxed px-4">
            Explore as principais categorias, encontre novos frameworks e aprofunde-se no universo da tecnologia.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {TOPICS.map(topic => (
          <div key={topic.id} className="group flex flex-col bg-card rounded-3xl border border-slate-700/50 shadow-lg hover:shadow-2xl hover:border-slate-500/50 transition-all duration-300 overflow-hidden">
            <div className="p-6 md:p-8 flex-1">
              <div className="flex items-start justify-between mb-6">
                <div className={`p-4 rounded-2xl transition-colors duration-300 ${getBgColor(topic.id)}`}>
                  <div className={`${getTopicColor(topic.id)} transition-colors duration-300`}>
                    {getTopicIcon(topic.id)}
                  </div>
                </div>
                <Link 
                  to={`/explorer?tag=${topic.id}`}
                  className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-slate-700 transition-colors"
                >
                  <ChevronRight size={20} />
                </Link>
              </div>
              
              <Link to={`/explorer?tag=${topic.id}`} className="block mb-6">
                <h2 className="text-2xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all">
                  {topic.label}
                </h2>
              </Link>

              <div className="flex flex-wrap gap-2.5">
                  {topic.sub.map(sub => (
                    <Link 
                      key={sub}
                      to={`/explorer?tag=${sub}`}
                      className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-medium text-slate-300 hover:text-slate-900 hover:bg-cent hover:border-cent hover:shadow-lg hover:shadow-cent/20 active:scale-95 transition-all duration-200 flex items-center gap-1.5"
                    >
                      <Hash size={14} className="opacity-40" />
                      {sub}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Discovery;
