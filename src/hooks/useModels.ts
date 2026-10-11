import { useCallback, useEffect, useState } from 'react';
import type { ModelProfile } from '../types';
import {
  deleteModel,
  getAllModels,
  getModelById,
  saveModel,
} from '../lib/storage/db';

const ACTIVE_MODEL_KEY = 'bamboo_active_model_id';

export function useModels() {
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [activeModelId, setActiveModelIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_MODEL_KEY);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await getAllModels();
      setModels(loaded);

      // Verify active model exists
      if (loaded.length === 0) {
        setActiveModelIdState(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ACTIVE_MODEL_KEY);
        }
      } else {
        const storedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_MODEL_KEY) : null;
        const exists = loaded.some((m) => m.id === storedId);
        if (!exists || !storedId) {
          const defaultModel = loaded.find((m) => m.isDefault) || loaded[0];
          setActiveModelIdState(defaultModel.id);
          if (typeof window !== 'undefined') {
            localStorage.setItem(ACTIVE_MODEL_KEY, defaultModel.id);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const setActiveModelId = useCallback((id: string | null) => {
    setActiveModelIdState(id);
    if (id) {
      localStorage.setItem(ACTIVE_MODEL_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_MODEL_KEY);
    }
  }, []);

  const activeModel = models.find((m) => m.id === activeModelId) || null;

  const createModel = useCallback(
    async (profileData: Omit<ModelProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelProfile> => {
      const now = Date.now();
      const newModel: ModelProfile = {
        ...profileData,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        isDefault: profileData.isDefault ?? models.length === 0, // First model is default if none exist
      };

      await saveModel(newModel);
      await loadModels();

      if (!activeModelId || newModel.isDefault) {
        setActiveModelId(newModel.id);
      }

      return newModel;
    },
    [activeModelId, loadModels, models.length, setActiveModelId]
  );

  const updateModel = useCallback(
    async (id: string, updates: Partial<ModelProfile>): Promise<void> => {
      const existing = await getModelById(id);
      if (!existing) throw new Error('Model profile not found.');

      const updated: ModelProfile = {
        ...existing,
        ...updates,
        id,
        updatedAt: Date.now(),
      };

      await saveModel(updated);
      await loadModels();
    },
    [loadModels]
  );

  const duplicateModel = useCallback(
    async (id: string): Promise<ModelProfile> => {
      const existing = await getModelById(id);
      if (!existing) throw new Error('Model profile not found.');

      const now = Date.now();
      const copy: ModelProfile = {
        ...existing,
        id: crypto.randomUUID(),
        name: `${existing.name} (Copy)`,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      };

      await saveModel(copy);
      await loadModels();
      return copy;
    },
    [loadModels]
  );

  const removeModel = useCallback(
    async (id: string): Promise<void> => {
      await deleteModel(id);
      await loadModels();

      if (activeModelId === id) {
        const remaining = models.filter((m) => m.id !== id);
        if (remaining.length > 0) {
          const next = remaining.find((m) => m.isDefault) || remaining[0];
          setActiveModelId(next.id);
        } else {
          setActiveModelId(null);
        }
      }
    },
    [activeModelId, loadModels, models, setActiveModelId]
  );

  const setDefaultModel = useCallback(
    async (id: string): Promise<void> => {
      const model = await getModelById(id);
      if (!model) return;
      await saveModel({ ...model, isDefault: true });
      await loadModels();
    },
    [loadModels]
  );

  return {
    models,
    activeModel,
    activeModelId,
    isLoading,
    setActiveModelId,
    createModel,
    updateModel,
    duplicateModel,
    removeModel,
    setDefaultModel,
    reloadModels: loadModels,
  };
}
