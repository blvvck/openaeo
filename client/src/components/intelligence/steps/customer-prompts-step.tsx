/**
 * Customer Prompts Step (Step 4)
 *
 * Show 10 LLM-generated prompts grouped by customer journey stage.
 * User can edit, remove, add.
 */

import { useState, useEffect, useRef } from 'react';
import { Pencil, X, Check, Plus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/multiline-field';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/option-picker';
import { Skeleton } from '@/components/shared';
import type { CustomerPrompt, BrandProfile, JourneyStage } from '../types';
import { JOURNEY_STAGES } from '../types';

interface CustomerPromptsStepProps {
  brand: BrandProfile;
  prompts: CustomerPrompt[];
  isLoading: boolean;
  error?: string | null;
  onBack: () => void;
  onRunResearch: (prompts: CustomerPrompt[]) => void;
  onTrackPrompts: (prompts: CustomerPrompt[]) => Promise<boolean>;
  onAddPrompt: (prompt: CustomerPrompt) => void;
  onEditPrompt: (id: string, text: string) => void;
  onRemovePrompt: (id: string) => void;
  onRetry?: () => void;
}

// All journey stages in order
const ALL_STAGES: JourneyStage[] = [
  'problem_aware',
  'exploring',
  'comparing_tradeoffs',
  'deciding',
  'onboarding',
  'power_user',
];

// Individual prompt row
function PromptRow({
  prompt,
  isEditing,
  editText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
  onRemove,
}: {
  prompt: CustomerPrompt;
  isEditing: boolean;
  editText: string;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (text: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 py-2 px-4 border border-figma-blue rounded-lg bg-figma-card">
        <span className="text-figma-secondary">"</span>
        <Input
          ref={inputRef}
          value={editText}
          onChange={(e) => onEditChange(e.target.value)}
          className="flex-1 border-0 p-0 h-auto text-figma-sm focus-visible:ring-0 bg-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
        />
        <span className="text-figma-secondary">"</span>
        <button
          onClick={onSaveEdit}
          className="text-figma-blue p-1"
          aria-label="Save"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={onCancelEdit}
          className="text-figma-muted p-1"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-3 px-4 border border-figma-border-light rounded-lg bg-figma-card hover:border-figma-border transition-colors group">
      <span className="text-figma-sm text-figma-primary flex-1 truncate">
        "{prompt.text}"
      </span>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onStartEdit}
          className="text-figma-muted hover:text-figma-blue p-1"
          aria-label="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="text-figma-muted hover:text-figma-red p-1"
          aria-label="Remove"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Prompt skeleton for loading - matches PromptRow styling
function PromptSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-4 border border-figma-border-light rounded-lg bg-figma-card">
      <span className="text-figma-muted">"</span>
      <Skeleton className="h-4 flex-1 rounded" />
      <span className="text-figma-muted">"</span>
    </div>
  );
}

// Stage section component
function StageSection({
  stage,
  prompts,
  editingId,
  editText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
  onRemove,
  isLoading,
}: {
  stage: JourneyStage;
  prompts: CustomerPrompt[];
  editingId: string | null;
  editText: string;
  onStartEdit: (prompt: CustomerPrompt) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (text: string) => void;
  onRemove: (id: string) => void;
  isLoading: boolean;
}) {
  const stageInfo = JOURNEY_STAGES[stage];
  const stagePrompts = prompts.filter((p) => p.stage === stage);

  // Show skeletons during loading (2 per stage)
  const skeletonCount = isLoading ? 2 : 0;

  if (stagePrompts.length === 0 && !isLoading) return null;

  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-figma-2xs font-medium text-figma-secondary tracking-wide mb-3">
        {stageInfo.label}{' '}
        <span className="text-figma-muted font-normal normal-case">
          ({stageInfo.description})
        </span>
      </h3>
      <div className="space-y-2">
        {stagePrompts.map((prompt) => (
          <PromptRow
            key={prompt.id}
            prompt={prompt}
            isEditing={editingId === prompt.id}
            editText={editText}
            onStartEdit={() => onStartEdit(prompt)}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onEditChange={onEditChange}
            onRemove={() => onRemove(prompt.id)}
          />
        ))}
        {isLoading &&
          Array.from({ length: skeletonCount }).map((_, i) => (
            <PromptSkeleton key={`skeleton-${stage}-${i}`} />
          ))}
      </div>
    </div>
  );
}

export function CustomerPromptsStep({
  brand,
  prompts,
  isLoading,
  error,
  onBack,
  onRunResearch,
  onTrackPrompts,
  onAddPrompt,
  onEditPrompt,
  onRemovePrompt,
  onRetry,
}: CustomerPromptsStepProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPromptText, setNewPromptText] = useState('');
  const [newPromptStage, setNewPromptStage] = useState<JourneyStage>('exploring');
  const [isRunning, setIsRunning] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackedPromptSignature, setTrackedPromptSignature] = useState<string | null>(null);
  const promptSignature = prompts
    .map(prompt => `${prompt.stage}:${prompt.text.trim()}`)
    .sort()
    .join('\n');
  const promptsAlreadyTracked = prompts.length > 0 && trackedPromptSignature === promptSignature;

  const handleStartEdit = (prompt: CustomerPrompt) => {
    setEditingId(prompt.id);
    setEditText(prompt.text);
  };

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      onEditPrompt(editingId, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleAddPrompt = () => {
    if (newPromptText.trim()) {
      onAddPrompt({
        id: `new-${Date.now()}`,
        text: newPromptText.trim(),
        stage: newPromptStage,
      });
      setNewPromptText('');
      setNewPromptStage('exploring');
      setShowAddModal(false);
    }
  };

  const handleRunResearch = () => {
    setIsRunning(true);
    onRunResearch(prompts);
  };

  const handleTrackPrompts = async () => {
    setIsTracking(true);
    try {
      if (await onTrackPrompts(prompts)) setTrackedPromptSignature(promptSignature);
    } finally {
      setIsTracking(false);
    }
  };

  const canRun = prompts.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-h2 font-semibold text-figma-primary">
            Prompts to track
          </h2>
          <p className="text-figma-sm text-figma-secondary mt-1">
            We'll check how {brand.name} appears when users ask these questions
          </p>
        </div>
        {!isLoading && prompts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="text-figma-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add question
          </Button>
        )}
      </div>

      {/* Prompts by stage */}
      <div>
        {ALL_STAGES.map((stage) => (
          <StageSection
            key={stage}
            stage={stage}
            prompts={prompts}
            editingId={editingId}
            editText={editText}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onEditChange={setEditText}
            onRemove={onRemovePrompt}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Error state */}
      {!isLoading && error && (
        <div className="border border-figma-border rounded-xl p-8 bg-figma-card text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-figma-hover mb-4">
            <AlertCircle className="w-5 h-5 text-figma-muted" />
          </div>
          <p className="text-figma-sm text-figma-secondary mb-1">
            Couldn't generate prompts
          </p>
          <p className="text-figma-xs text-figma-muted mb-6">
            AI services are temporarily unavailable. You can retry or add prompts manually.
          </p>
          <div className="flex items-center justify-center gap-3">
            {onRetry && (
              <Button
                variant="outline"
                onClick={onRetry}
                className="text-figma-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Try again
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowAddModal(true)}
              className="text-figma-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add manually
            </Button>
          </div>
        </div>
      )}

      {/* Empty state (no error) */}
      {!isLoading && !error && prompts.length === 0 && (
        <div className="border border-figma-border rounded-xl p-8 bg-figma-card text-center">
          <p className="text-figma-sm text-figma-secondary mb-1">
            No prompts yet
          </p>
          <p className="text-figma-xs text-figma-muted mb-6">
            Add prompts to see how {brand.name} appears in AI responses
          </p>
          <Button
            variant="outline"
            onClick={() => setShowAddModal(true)}
            className="text-figma-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add question
          </Button>
        </div>
      )}

      {/* Button row */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-figma-border-light">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-figma-secondary"
          disabled={isRunning}
        >
          Back
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!isLoading && prompts.length > 0 && (
            <Button
              variant="outline"
              onClick={handleTrackPrompts}
              disabled={isTracking || promptsAlreadyTracked || isRunning}
              className="text-figma-sm"
            >
              {isTracking
                ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                : promptsAlreadyTracked
                  ? <Check className="w-4 h-4 mr-1.5" />
                  : <Plus className="w-4 h-4 mr-1.5" />}
              {isTracking ? 'Adding…' : promptsAlreadyTracked ? 'Added to my prompts' : 'Add to my prompts'}
            </Button>
          )}
          <Button
            onClick={handleRunResearch}
            className="bg-figma-blue text-white hover:bg-blue-600"
            disabled={!canRun || isLoading || isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Start analysis'
            )}
          </Button>
        </div>
      </div>

      {/* Add Prompt Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-figma-md font-semibold text-figma-primary">
              Add a prompt
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-figma-xs font-medium text-figma-secondary block mb-2">
                What would a customer ask?
              </label>
              <Textarea
                placeholder="What is the best..."
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                autoFocus
                rows={3}
                className="resize-none"
              />
            </div>
            <div>
              <label className="text-figma-xs font-medium text-figma-secondary block mb-2">
                Journey stage
              </label>
              <Select
                value={newPromptStage}
                onValueChange={(v) => setNewPromptStage(v as JourneyStage)}
              >
                <SelectTrigger className="text-figma-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage} className="text-figma-sm py-3 cursor-pointer">
                      <span className="text-figma-primary font-medium">{JOURNEY_STAGES[stage].label}</span>
                      <span className="text-figma-muted ml-1">({JOURNEY_STAGES[stage].description})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddPrompt}
              disabled={!newPromptText.trim()}
              className="bg-figma-blue text-white hover:bg-blue-600"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
