import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  TextQuote,
  Code,
  Heading2,
  Heading3,
  Link as LinkIcon, // Alias needed: Link already imported from @tiptap/extension-link
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  Bold,
  Italic,
  Strikethrough,
  Underline,
  Undo2
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

function ToolbarButton({
  isActive,
  onClick,
  disabled,
  label,
  children
}: {
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={isActive}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        buttonVariants({
          variant: isActive ? "secondary" : "ghost",
          size: "icon-sm"
        }),
        "size-7"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />;
}

function LinkPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (open) {
      setUrl(editor.getAttributes("link").href ?? "");
    }
  }, [open, editor]);

  if (!open) {
    return (
      <ToolbarButton
        label="Link"
        isActive={editor.isActive("link")}
        onClick={() => setOpen(true)}
        disabled={!editor.isEditable}
      >
        <LinkIcon size={14} strokeWidth={2} />
      </ToolbarButton>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1 shadow-sm">
      <input
        autoFocus
        type="url"
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (url) {
              editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            } else {
              editor.chain().focus().unsetLink().run();
            }
            setOpen(false);
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
        }}
        className="h-7 w-40 rounded-sm bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => {
          if (url) {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          } else {
            editor.chain().focus().unsetLink().run();
          }
          setOpen(false);
        }}
      >
        Apply
      </Button>
      <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  disabled
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank"
        }
      }),
      Placeholder.configure({ placeholder: placeholder ?? "Start writing..." }),
      Typography
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          "prose-sm prose min-h-30 max-w-none px-3 py-2.5 outline-none dark:prose-invert",
          "focus-visible:outline-none"
        )
      }
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    onBlur: () => {
      onBlur?.();
    }
  });

  // Keep editor in sync with external value changes (e.g. when form resets)
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML() && !(value === "" && editor.getHTML() === "<p></p>")) {
      editor.commands.setContent(value || "");
    }
  }, [editor, value]);

  // Keep editable in sync with prop
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div
        data-slot="rich-text-editor"
        className={cn("overflow-hidden rounded-md border border-input bg-transparent", className)}
      >
        <div className="h-9 border-b border-border bg-muted/30" />
        <div className="min-h-30 px-3 py-2.5 text-sm text-muted-foreground">
          {placeholder ?? "Start writing..."}
        </div>
      </div>
    );
  }

  return (
    <div
      data-slot="rich-text-editor"
      data-disabled={disabled ? "true" : undefined}
      className={cn(
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 relative overflow-hidden rounded-md border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className
      )}
    >
      <div
        className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-md border-b border-border bg-background/95 px-1.5 py-1 backdrop-blur"
        role="toolbar"
        aria-label="Formatting toolbar"
      >
        <ToolbarButton
          label="Bold"
          isActive={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.isEditable}
        >
          <Bold size={14} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          isActive={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.isEditable}
        >
          <Italic size={14} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          isActive={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.isEditable}
        >
          <Strikethrough size={14} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          isActive={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleMark("underline").run()}
          disabled={!editor.isEditable}
        >
          <Underline size={14} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label="Heading 2"
          isActive={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={!editor.isEditable}
        >
          <Heading2 size={14} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          isActive={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={!editor.isEditable}
        >
          <Heading3 size={14} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          label="Paragraph"
          isActive={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
          disabled={!editor.isEditable}
        >
          <Pilcrow size={14} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label="Bulleted list"
          isActive={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={!editor.isEditable}
        >
          <List size={14} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          isActive={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={!editor.isEditable}
        >
          <ListOrdered size={14} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          label="Block quote"
          isActive={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={!editor.isEditable}
        >
          <TextQuote size={14} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          label="Inline code"
          isActive={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.isEditable}
        >
          <Code size={14} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarDivider />
        <LinkPopover editor={editor} />
        <ToolbarDivider />
        <ToolbarButton
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.isEditable || !editor.can().undo()}
        >
          <Undo2 size={14} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.isEditable || !editor.can().redo()}
        >
          <Redo2 size={14} strokeWidth={2} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export { RichTextEditor };
export type { RichTextEditorProps };
