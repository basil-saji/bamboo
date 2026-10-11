import React from 'react';
import { ArrowRight, Code2, Cpu, FileText, Plus, Sparkles, Terminal } from 'lucide-react';
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
  // Scenario 1: First launch / Zero models configured
  if (models.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <BambooLogo size={48} className="text-primary mb-4" />
        <h2 className="text-2xl font-serif font-semibold text-foreground tracking-tight mb-2">
          welcome to bamboo
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Bamboo is a private, local-first workspace. Before starting a conversation,
          connect your local or remote OpenAI-compatible inference model.
        </p>

        <button
          type="button"
          onClick={onOpenModelManager}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Connect your first model</span>
        </button>

        <div className="mt-10 pt-6 border-t border-border/60 w-full text-left">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
            Supported endpoints
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 p-2 rounded bg-card border border-border/50">
              <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Ollama (port 11434)</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded bg-card border border-border/50">
              <Cpu className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>LM Studio (port 1234)</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded bg-card border border-border/50">
              <Code2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>llama-server (port 8080)</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded bg-card border border-border/50">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>vLLM / Compatible APIs</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Scenario 2: Models exist, but current conversation is empty
  const suggestions = [
    {
      title: 'Review and optimize code',
      prompt: 'Can you review this code snippet for performance, edge cases, and architectural clarity?\n\n```ts\n\n```',
      icon: Code2,
    },
    {
      title: 'Architecture & System Design',
      prompt: 'Draft an architectural proposal for a high-reliability service, covering data flow, failure modes, and trade-offs.',
      icon: Cpu,
    },
    {
      title: 'Debug an error trace',
      prompt: 'I am seeing the following error stack trace in my application. What are the probable root causes and remediation steps?\n\n```\n\n```',
      icon: Terminal,
    },
    {
      title: 'Explain a technical concept',
      prompt: 'Explain the internal mechanics of Raft consensus or optimistic concurrency control with clear analogies and examples.',
      icon: FileText,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto">
      <BambooLogo size={40} className="text-primary mb-3" />
      <h2 className="text-xl font-serif font-semibold text-foreground tracking-tight mb-1">
        where should we begin?
      </h2>
      <p className="text-xs text-muted-foreground mb-8">
        Active model:{' '}
        <span className="font-mono font-medium text-foreground">
          {activeModel ? activeModel.name : 'None selected'}
        </span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-all text-left flex items-start justify-between group cursor-pointer"
            >
              <div className="flex items-start gap-2.5 pr-2">
                <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
