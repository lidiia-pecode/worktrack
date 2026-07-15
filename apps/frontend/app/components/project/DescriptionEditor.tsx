"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Code,
} from "lucide-react";

interface DescriptionEditorProps {
  value: string;
  onChange: (markdown: string) => void;
}

const ToolbarButton = ({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`p-1.5 rounded-md transition-colors ${
      active
        ? "bg-zinc-200 text-zinc-900"
        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
    }`}
  >
    {children}
  </button>
);

export const DescriptionEditor = ({
  value,
  onChange,
}: DescriptionEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Markdown.configure({
        html: false,
        transformCopiedText: true,
        transformPastedText: true,
      }),
      Placeholder.configure({
        placeholder:
          'Describe the project… Try "- " for bullet list or"# " for title',
      }),
    ],
    content: value,

    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none prose-zinc focus:outline-none min-h-[160px] px-3 py-2 " +
          "prose-headings:font-semibold prose-ul:my-1 prose-li:my-0 prose-ol:my-1",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.storage.markdown.getMarkdown()),
  });

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-zinc-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent overflow-hidden">
      <div className="flex items-center gap-0.5 border-b border-zinc-100 bg-zinc-50 px-2 py-1.5">
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon size={15} />
        </ToolbarButton>

        <span className="w-px h-4 bg-zinc-200 mx-1" />

        <ToolbarButton
          title="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 size={15} />
        </ToolbarButton>

        <span className="w-px h-4 bg-zinc-200 mx-1" />

        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>

        <span className="w-px h-4 bg-zinc-200 mx-1" />

        <ToolbarButton
          title="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="Code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={15} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};
