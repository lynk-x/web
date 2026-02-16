import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
    error?: boolean;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) {
        return null;
    }

    return (
        <div className={styles.menuBar}>
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`${styles.menuButton} ${editor.isActive('bold') ? styles.isActive : ''}`}
                type="button"
                title="Bold"
            >
                B
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`${styles.menuButton} ${editor.isActive('italic') ? styles.isActive : ''}`}
                type="button"
                title="Italic"
            >
                I
            </button>
            <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`${styles.menuButton} ${editor.isActive('strike') ? styles.isActive : ''}`}
                type="button"
                title="Strikethrough"
            >
                S
            </button>
            <div className={styles.divider} />
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`${styles.menuButton} ${editor.isActive('heading', { level: 2 }) ? styles.isActive : ''}`}
                type="button"
                title="Heading 2"
            >
                H2
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`${styles.menuButton} ${editor.isActive('heading', { level: 3 }) ? styles.isActive : ''}`}
                type="button"
                title="Heading 3"
            >
                H3
            </button>
            <div className={styles.divider} />
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`${styles.menuButton} ${editor.isActive('bulletList') ? styles.isActive : ''}`}
                type="button"
                title="Bullet List"
            >
                • List
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`${styles.menuButton} ${editor.isActive('orderedList') ? styles.isActive : ''}`}
                type="button"
                title="Ordered List"
            >
                1. List
            </button>
        </div>
    );
};

export default function RichTextEditor({ value, onChange, placeholder, error }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: placeholder || 'Write something...',
            }),
        ],
        content: value,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: styles.editorContent,
            },
        },
    });

    return (
        <div className={`${styles.editorCheck} ${error ? styles.error : ''}`}>
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className={styles.contentArea} />
        </div>
    );
}
