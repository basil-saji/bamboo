import React from 'react';
import { ArrowRight, Code2, Compass, Cpu, FileText, Plus, Sparkles, Terminal } from 'lucide-react';
import type { ModelProfile } from '../../types';
import { BambooLogo } from '../ui/BambooLogo';

interface EmptyChatStateProps {
  models: ModelProfile[];
  activeModel: ModelProfile | null;
  onOpenModelManager: () => void;
  onSelectPrompt: (promptText: string) => void;
}

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({
  models,
  activeModel,
  onOpenModelManager,
  onSelectPrompt,
}) => {
  // Scenario 1: Fresh installation / Zero models configured
  if (models.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto my-auto select-none">
        <div className="w-12 h-12 rounded-2xl bg-card border border-border/70 flex items-center justify-center text-primary mb-5 shadow-xs">
          <BambooLogo size={28} />
        </div>

        <h2 className="text-2xl font-serif font-medium text-foreground tracking-tight mb-2">
          welcome to bamboo
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed mb-6 font-sans">
          A private, local-first workspace. Connect your compatible AI model to begin chatting.
        </p>

        <button
          type="button"
          onClick={onOpenModelManager}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Connect your model</span>
        </button>
      </div>
    );
  }

  // Scenario 2: Models exist, but conversation has no messages
  const suggestions = [
    {
      title: 'Review and optimize code',
      prompt: 'Review this code for readability, edge cases, and performance:\n\n```ts\n\n```',
      icon: Code2,
    },
    {
      title: 'System architecture design',
      prompt: 'Draft an architectural proposal for a resilient, offline-first application, detailing trade-offs and data flow.',
      icon: Compass,
    },
    {
      title: 'Debug an error trace',
      prompt: 'Diagnose this stack trace and provide clear remediation steps:\n\n```\n\n```',
      icon: Terminal,
    },
    {
      title: 'Explain a technical concept',
      prompt: 'Explain how optimistic concurrency control works with clear practical examples.',
      icon: FileText,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto my-auto select-none">
      <div className="w-10 h-10 rounded-2xl bg-card border border-border/70 flex items-center justify-center text-primary mb-4 shadow-xs">
        <BambooLogo size={24} />
      </div>

      <h2 className="text-xl font-serif font-medium text-foreground tracking-tight mb-1">
        how can i help today?
      </h2>
      <p className="text-xs text-muted-foreground mb-8 font-sans">
        Connected to <span className="font-mono font-medium text-foreground">{activeModel?.name || 'Selected Model'}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition text-left flex items-start justify-between group cursor-pointer"
            >
              <div className="flex items-start gap-2.5 pr-2">
                <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-xs font-medium text-foreground/90 group-hover:text-primary transition-colors font-sans">
                  {item.title}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition shrink-0 mt-0.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
