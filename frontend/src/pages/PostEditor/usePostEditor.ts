import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { EditorPost } from '../../types';
import { postEditorService, uploadErrorMessage } from '../../services/postEditor.service';
import { useToast } from '../../hooks/useToast';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { canPublish } from './validation';
import { resolveExitScenario } from './exitScenario';
import { toCreateRequest, toEditorPost, toPatchRequest } from './postMapper';
import {
  insertAtLineStart,
  insertImage,
  insertText,
  wrapSelection,
  type TextState,
} from './markdownInsert';
import type { ToolbarAction } from './components/MarkdownToolbar';

const EMPTY: EditorPost = {
  id: null,
  title: '',
  content: '',
  coverImageUrl: null,
  sources: [''],
  topics: [],
  status: 'DRAFT',
};

export function usePostEditor() {
  const { id } = useParams<{ id: string }>();
  const mode: 'new' | 'edit' = id ? 'edit' : 'new';
  const navigate = useNavigate();

  const [post, setPost] = useState<EditorPost>(EMPTY);
  const [loading, setLoading] = useState(mode === 'edit');
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pasteFile, setPasteFile] = useState<File | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    let active = true;
    setLoading(true);
    postEditorService
      .getPost(id)
      .then((res) => {
        if (active) setPost(toEditorPost(res));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, mode]);

  const update = useCallback((patch: Partial<EditorPost>) => {
    setPost((p) => ({ ...p, ...patch }));
    setDirty(true);
  }, []);

  // ── Sources ──────────────────────────────────────────────
  const updateSource = (idx: number, value: string) =>
    update({ sources: post.sources.map((s, i) => (i === idx ? value : s)) });
  const addSource = () => update({ sources: [...post.sources, ''] });
  const removeSource = (idx: number) =>
    update({ sources: post.sources.filter((_, i) => i !== idx) });

  // ── Toolbar / markdown inserts ───────────────────────────
  const applyEdit = useCallback(
    (transform: (s: TextState) => TextState) => {
      const ta = textareaRef.current;
      const state: TextState = ta
        ? { value: ta.value, selectionStart: ta.selectionStart, selectionEnd: ta.selectionEnd }
        : { value: post.content, selectionStart: post.content.length, selectionEnd: post.content.length };
      const next = transform(state);
      update({ content: next.value });
      requestAnimationFrame(() => {
        ta?.focus();
        ta?.setSelectionRange(next.selectionStart, next.selectionEnd);
      });
    },
    [post.content, update],
  );

  const inlineImageInputRef = useRef<HTMLInputElement>(null);

  const onToolbarAction = useCallback(
    (a: ToolbarAction) => {
      switch (a) {
        case 'bold': return applyEdit((s) => wrapSelection(s, '**', '**', 'bold text'));
        case 'italic': return applyEdit((s) => wrapSelection(s, '_', '_', 'italic text'));
        case 'code': return applyEdit((s) => wrapSelection(s, '`', '`', 'code'));
        case 'codeblock': return applyEdit((s) => insertText(s, '\n```\n\n```\n'));
        case 'h1': return applyEdit((s) => insertAtLineStart(s, '# '));
        case 'h2': return applyEdit((s) => insertAtLineStart(s, '## '));
        case 'h3': return applyEdit((s) => insertAtLineStart(s, '### '));
        case 'quote': return applyEdit((s) => insertAtLineStart(s, '> '));
        case 'hr': return applyEdit((s) => insertText(s, '\n\n---\n\n'));
        case 'link':
          return applyEdit((s) => {
            const sel = s.value.slice(s.selectionStart, s.selectionEnd) || 'link';
            return insertText(s, `[${sel}](url)`);
          });
        case 'image':
          inlineImageInputRef.current?.click();
          return;
      }
    },
    [applyEdit],
  );

  // ── Image upload (cover + inline, ADR-0010) ──────────────
  // Immediate-upload strategy: the file goes to the backend on selection, with
  // explicit uploading/success/error feedback (toast) so the user is never left
  // guessing. A discarded draft may leave an orphaned object — accepted trade-off.
  const onCoverSelected = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const url = await postEditorService.uploadFile(file);
        update({ coverImageUrl: url });
        showToast({ variant: 'success', message: 'Cover image uploaded' });
      } catch (err) {
        showToast({
          variant: 'error',
          message: uploadErrorMessage(err, 'Cover upload failed — please try again'),
        });
      } finally {
        setUploading(false);
      }
    },
    [update, showToast],
  );

  const onInlineImageSelected = (file: File | null) => {
    if (file) setPasteFile(file);
  };

  const confirmInlineImage = useCallback(
    async (alt: string) => {
      const file = pasteFile;
      setPasteFile(null);
      if (!file) return;
      setUploading(true);
      try {
        const url = await postEditorService.uploadFile(file);
        applyEdit((s) => insertImage(s, alt, url));
        showToast({ variant: 'success', message: 'Image uploaded' });
      } catch (err) {
        showToast({
          variant: 'error',
          message: uploadErrorMessage(err, 'Image upload failed — please try again'),
        });
      } finally {
        setUploading(false);
      }
    },
    [pasteFile, applyEdit, showToast],
  );

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) {
      e.preventDefault();
      setPasteFile(file);
    }
  }, []);

  // ── Save / publish ───────────────────────────────────────
  const persist = useCallback(
    async (status: 'PUBLISHED' | 'DRAFT' | undefined) => {
      if (post.id) return postEditorService.updatePost(post.id, toPatchRequest(post, status));
      return postEditorService.createPost(toCreateRequest(post, status ?? 'DRAFT'));
    },
    [post],
  );

  const confirmPublish = useCallback(async () => {
    setPublishOpen(false);
    setSaving(true);
    try {
      const res = await persist('PUBLISHED');
      setDirty(false);
      navigate(`/post/${res.id}`);
    } finally {
      setSaving(false);
    }
  }, [persist, navigate]);

  const exitScenario = resolveExitScenario(post.status);

  const saveAndExit = useCallback(async () => {
    setSaving(true);
    try {
      await persist(exitScenario.saveStatus);
      setDirty(false);
      setExitOpen(false);
      navigate('/');
    } finally {
      setSaving(false);
    }
  }, [persist, exitScenario.saveStatus, navigate]);

  const requestExit = useCallback(() => {
    if (dirty) setExitOpen(true);
    else navigate('/');
  }, [dirty, navigate]);

  const discardAndExit = useCallback(() => {
    setDirty(false);
    setExitOpen(false);
    navigate('/');
  }, [navigate]);

  const wordCount = useMemo(() => {
    const text = `${post.title} ${post.content}`.trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [post.title, post.content]);

  return {
    mode,
    post,
    loading,
    saving,
    view,
    dirty,
    wordCount,
    publishable: canPublish(post),
    pasteFile,
    publishOpen,
    exitOpen,
    exitScenario,
    uploading,
    textareaRef,
    inlineImageInputRef,
    coverInputRef,
    // setters
    setView,
    setTitle: (title: string) => update({ title }),
    setContent: (content: string) => update({ content }),
    setTopics: (topics: string[]) => update({ topics }),
    setCoverImageUrl: (coverImageUrl: string | null) => update({ coverImageUrl }),
    updateSource,
    addSource,
    removeSource,
    onToolbarAction,
    onCoverSelected,
    onInlineImageSelected,
    confirmInlineImage,
    cancelInlineImage: () => setPasteFile(null),
    onPaste,
    // publish / exit
    openPublish: () => setPublishOpen(true),
    closePublish: () => setPublishOpen(false),
    confirmPublish,
    requestExit,
    saveAndExit,
    discardAndExit,
    cancelExit: () => setExitOpen(false),
    searchTopics: postEditorService.searchTopics,
  };
}
