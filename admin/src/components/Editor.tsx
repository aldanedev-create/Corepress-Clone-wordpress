// admin/src/components/Editor.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor as TipTapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import CodeBlock from '@tiptap/extension-code-block';
import Blockquote from '@tiptap/extension-blockquote';
import HardBreak from '@tiptap/extension-hard-break';
import History from '@tiptap/extension-history';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Palette,
  Highlighter,
  Undo,
  Redo,
  Trash2,
  Eye,
  Save,
  X
} from 'lucide-react';

interface EditorProps {
  value: any;
  onChange: (content: any) => void;
  placeholder?: string;
  readOnly?: boolean;
}

interface ToolbarButton {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  isActive?: () => boolean;
  disabled?: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your content here...',
  readOnly = false
}) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  // Initialize editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4]
        }
      }),
      Placeholder.configure({
        placeholder
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      Image,
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Underline,
      Strike,
      CodeBlock,
      Blockquote,
      HardBreak,
      History
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[200px] px-4 py-3'
      }
    }
  });

  // Set editor content when value changes externally
  useEffect(() => {
    if (editor && value && editor.getJSON() !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  // Check if text is selected
  const isTextSelected = useCallback(() => {
    return editor?.state.selection.empty !== true;
  }, [editor]);

  // Get selected text
  const getSelectedText = useCallback(() => {
    if (!editor) return '';
    const { state } = editor;
    const { from, to } = state.selection;
    return state.doc.textBetween(from, to, ' ');
  }, [editor]);

  // Link handlers
  const handleLinkClick = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    
    if (from !== to) {
      setLinkText(text);
      setLinkUrl('');
      setShowLinkModal(true);
    } else {
      // Check if current selection has a link
      const attrs = editor.getAttributes('link');
      if (attrs.href) {
        setLinkUrl(attrs.href);
        setLinkText(attrs.href);
        setShowLinkModal(true);
      }
    }
  }, [editor]);

  const handleLinkSave = useCallback(() => {
    if (!editor) return;
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkUrl })
        .run();
    }
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  }, [editor, linkUrl]);

  const handleLinkRemove = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  }, [editor]);

  // Image handlers
  const handleImageClick = useCallback(() => {
    setShowImageModal(true);
  }, []);

  const handleImageSave = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor
      .chain()
      .focus()
      .setImage({ src: imageUrl, alt: imageAlt })
      .run();
    setShowImageModal(false);
    setImageUrl('');
    setImageAlt('');
  }, [editor, imageUrl, imageAlt]);

  // Table handlers
  const insertTable = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  // Toolbar buttons
  const getToolbarButtons = (): ToolbarButton[] => {
    if (!editor) return [];

    return [
      {
        icon: <Undo className="w-4 h-4" />,
        label: 'Undo',
        action: () => editor.chain().focus().undo().run(),
        disabled: !editor.can().undo()
      },
      {
        icon: <Redo className="w-4 h-4" />,
        label: 'Redo',
        action: () => editor.chain().focus().redo().run(),
        disabled: !editor.can().redo()
      },
      {
        icon: <Bold className="w-4 h-4" />,
        label: 'Bold',
        action: () => editor.chain().focus().toggleBold().run(),
        isActive: () => editor.isActive('bold')
      },
      {
        icon: <Italic className="w-4 h-4" />,
        label: 'Italic',
        action: () => editor.chain().focus().toggleItalic().run(),
        isActive: () => editor.isActive('italic')
      },
      {
        icon: <UnderlineIcon className="w-4 h-4" />,
        label: 'Underline',
        action: () => editor.chain().focus().toggleUnderline().run(),
        isActive: () => editor.isActive('underline')
      },
      {
        icon: <Strikethrough className="w-4 h-4" />,
        label: 'Strikethrough',
        action: () => editor.chain().focus().toggleStrike().run(),
        isActive: () => editor.isActive('strike')
      },
      {
        icon: <Heading1 className="w-4 h-4" />,
        label: 'Heading 1',
        action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: () => editor.isActive('heading', { level: 1 })
      },
      {
        icon: <Heading2 className="w-4 h-4" />,
        label: 'Heading 2',
        action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: () => editor.isActive('heading', { level: 2 })
      },
      {
        icon: <Heading3 className="w-4 h-4" />,
        label: 'Heading 3',
        action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: () => editor.isActive('heading', { level: 3 })
      },
      {
        icon: <Heading4 className="w-4 h-4" />,
        label: 'Heading 4',
        action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
        isActive: () => editor.isActive('heading', { level: 4 })
      },
      {
        icon: <List className="w-4 h-4" />,
        label: 'Bullet List',
        action: () => editor.chain().focus().toggleBulletList().run(),
        isActive: () => editor.isActive('bulletList')
      },
      {
        icon: <ListOrdered className="w-4 h-4" />,
        label: 'Ordered List',
        action: () => editor.chain().focus().toggleOrderedList().run(),
        isActive: () => editor.isActive('orderedList')
      },
      {
        icon: <Quote className="w-4 h-4" />,
        label: 'Quote',
        action: () => editor.chain().focus().toggleBlockquote().run(),
        isActive: () => editor.isActive('blockquote')
      },
      {
        icon: <Code className="w-4 h-4" />,
        label: 'Code Block',
        action: () => editor.chain().focus().toggleCodeBlock().run(),
        isActive: () => editor.isActive('codeBlock')
      },
      {
        icon: <AlignLeft className="w-4 h-4" />,
        label: 'Align Left',
        action: () => editor.chain().focus().setTextAlign('left').run(),
        isActive: () => editor.isActive({ textAlign: 'left' })
      },
      {
        icon: <AlignCenter className="w-4 h-4" />,
        label: 'Align Center',
        action: () => editor.chain().focus().setTextAlign('center').run(),
        isActive: () => editor.isActive({ textAlign: 'center' })
      },
      {
        icon: <AlignRight className="w-4 h-4" />,
        label: 'Align Right',
        action: () => editor.chain().focus().setTextAlign('right').run(),
        isActive: () => editor.isActive({ textAlign: 'right' })
      },
      {
        icon: <AlignJustify className="w-4 h-4" />,
        label: 'Justify',
        action: () => editor.chain().focus().setTextAlign('justify').run(),
        isActive: () => editor.isActive({ textAlign: 'justify' })
      },
      {
        icon: <LinkIcon className="w-4 h-4" />,
        label: 'Link',
        action: handleLinkClick,
        isActive: () => editor.isActive('link')
      },
      {
        icon: <ImageIcon className="w-4 h-4" />,
        label: 'Image',
        action: handleImageClick
      },
      {
        icon: <TableIcon className="w-4 h-4" />,
        label: 'Table',
        action: insertTable
      },
      {
        icon: <Palette className="w-4 h-4" />,
        label: 'Text Color',
        action: () => {
          const color = prompt('Enter hex color code (e.g., #ff0000):');
          if (color) {
            editor.chain().focus().setColor(color).run();
          }
        }
      },
      {
        icon: <Highlighter className="w-4 h-4" />,
        label: 'Highlight',
        action: () => {
          const color = prompt('Enter highlight color (e.g., #ffff00):');
          if (color) {
            editor.chain().focus().toggleHighlight({ color }).run();
          }
        },
        isActive: () => editor.isActive('highlight')
      }
    ];
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      {/* Toolbar */}
      {!readOnly && (
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-1 flex flex-wrap gap-1">
          {getToolbarButtons().map((button, index) => (
            <button
              key={index}
              onClick={button.action}
              disabled={button.disabled}
              className={`p-1.5 rounded transition-colors ${
                button.isActive?.()
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              } ${
                button.disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={button.label}
            >
              {button.icon}
            </button>
          ))}
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900"
              />
              {!getSelectedText() && (
                <input
                  type="text"
                  placeholder="Link Text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900"
                />
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkRemove}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Remove
                </button>
                <button
                  onClick={handleLinkSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Insert Image</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900"
              />
              <input
                type="text"
                placeholder="Alt Text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowImageModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImageSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;