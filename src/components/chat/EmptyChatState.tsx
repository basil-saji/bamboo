import React from 'react';
import { ArrowUpRight, Code2, Compass, FileText, Plus, Terminal } from 'lucide-react';
import type { ModelProfile } from '../../types';
import { BambooLogo } from '../ui/BambooLogo';

interface EmptyChatStateProps {
  models: ModelProfile[];
  activeModel: ModelProfile | null;
  onOpenModelManager: () => void;
  onSelectPrompt: (promptText: string) => void;
}

const SUGGESTIONS = [
  {
    title: 'Review my code',
    hint: 'Readability, edge cases, performance',
    prompt: 'Review this code for readability, edge cases, and performance:\n\n```ts\n\n```',
    icon: Code2,
  },
  {
    title: 'Design a system',
    hint: 'Trade-offs and data flow',
    prompt:
      'Draft an architectural proposal for a resilient, offline-first application, detailing trade-offs and data flow.',
    icon: Compass,
  },
  {
    title: 'Debug an error',
    hint: 'Paste a stack trace',
    prompt: 'Diagnose this stack trace and provide clear remediation steps:\n\n```\n\n```',
    icon: Terminal,
  },
  {
    title: 'Explain a concept',
    hint: 'With practical examples',
    prompt: 'Explain how optimistic concurrency control works with clear practical examples.',
    icon: FileText,
  },
];

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({
  models,
  activeModel,
  onOpenModelManager,
  onSelectPrompt,
}) => {
  // No models connected yet
  if (models.length === 0) {
    return (
      <div className="m-auto flex w-full max-w-md select-none flex-col items-center px-6 py-10 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/15 bg-card text-primary">
          <BambooLogo size={30} />
        </div>

        <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">Get started with bamboo</h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          A private, local-first workspace. Connect an OpenAI-compatible model to begin chatting.
        </p>

        <button
          type="button"
          onClick={onOpenModelManager}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-5 text-sm font-medium text-secondary-foreground transition-opacity hover:opacity-80 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Connect a model</span>
        </button>
      </div>
    );
  }

  return (
    <div className="m-auto flex w-full max-w-2xl select-none flex-col items-center px-4 py-8 text-center sm:px-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/15 bg-card text-primary">
        <BambooLogo size={26} />
      </div>

      <h2 className="mb-1.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        What can I help with?
      </h2>
      <p className="mb-8 text-sm text-muted-foreground">
        Chatting with <span className="font-medium text-foreground">{activeModel?.name || 'your model'}</span>
      </p>

      <div className="grid w-full grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
        {SUGGESTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group flex items-start gap-3 rounded-2xl border border-border/15 bg-card p-3.5 text-left transition-colors hover:bg-muted cursor-pointer"
            >
              <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{item.title}</span>
                <span className="block text-xs text-muted-foreground">{item.hint}</span>
              </span>
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
