import React, { useEffect, useRef, useCallback } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { sql, PostgreSQL, MySQL, SQLite, StandardSQL } from '@codemirror/lang-sql';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  placeholder?: string;
  theme?: 'dark' | 'light';
  dialect?: 'mysql' | 'postgresql' | 'sqlite' | 'standard';
  readOnly?: boolean;
  tables?: { name: string; columns: string[] }[];
  height?: string;
  minHeight?: string;
}

// Light theme
const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  '.cm-content': {
    caretColor: '#3b82f6',
  },
  '.cm-cursor': {
    borderLeftColor: '#3b82f6',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#dbeafe',
  },
  '.cm-gutters': {
    backgroundColor: '#f9fafb',
    color: '#9ca3af',
    borderRight: '1px solid #e5e7eb',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f3f4f6',
  },
  '.cm-activeLine': {
    backgroundColor: '#f9fafb',
  },
  '.cm-selectionMatch': {
    backgroundColor: '#fef3c7',
  },
  '.cm-matchingBracket': {
    backgroundColor: '#d1fae5',
    color: '#059669',
  },
});

// Custom dark theme (enhanced)
const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#1a1d23',
    color: '#e5e7eb',
  },
  '.cm-content': {
    caretColor: '#60a5fa',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '13px',
  },
  '.cm-cursor': {
    borderLeftColor: '#60a5fa',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#3b82f620',
  },
  '.cm-gutters': {
    backgroundColor: '#111318',
    color: '#6b7280',
    borderRight: '1px solid #374151',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#1f2937',
    color: '#9ca3af',
  },
  '.cm-activeLine': {
    backgroundColor: '#1f293720',
  },
  '.cm-selectionMatch': {
    backgroundColor: '#fbbf2420',
  },
  '.cm-matchingBracket': {
    backgroundColor: '#22c55e30',
    color: '#4ade80',
  },
  '.cm-foldGutter': {
    color: '#6b7280',
  },
  '.cm-tooltip': {
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '6px',
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li': {
      padding: '4px 8px',
    },
    '& > ul > li[aria-selected]': {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
    },
  },
});

const SQLEditor: React.FC<SQLEditorProps> = ({
  value,
  onChange,
  onExecute,
  placeholder = 'SELECT * FROM table_name',
  theme = 'dark',
  dialect = 'mysql',
  readOnly = false,
  tables = [],
  height = '200px',
  minHeight = '100px',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());

  // Get SQL dialect
  const getDialect = useCallback(() => {
    switch (dialect) {
      case 'mysql':
        return MySQL;
      case 'postgresql':
        return PostgreSQL;
      case 'sqlite':
        return SQLite;
      default:
        return StandardSQL;
    }
  }, [dialect]);

  // Build schema for autocompletion
  const getSchema = useCallback(() => {
    const schema: { [key: string]: string[] } = {};
    tables.forEach(table => {
      schema[table.name] = table.columns;
    });
    return schema;
  }, [tables]);

  useEffect(() => {
    if (!editorRef.current) return;

    const sqlDialect = getDialect();
    const schema = getSchema();

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion({
        override: [],
        defaultKeymap: true,
      }),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        indentWithTab,
        // Ctrl+Enter to execute
        {
          key: 'Ctrl-Enter',
          run: () => {
            onExecute?.();
            return true;
          },
        },
        {
          key: 'Cmd-Enter',
          run: () => {
            onExecute?.();
            return true;
          },
        },
      ]),
      sql({
        dialect: sqlDialect,
        schema: Object.keys(schema).length > 0 ? schema : undefined,
        upperCaseKeywords: true,
      }),
      themeCompartment.current.of(theme === 'dark' ? [oneDark, darkTheme] : lightTheme),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
      EditorView.theme({
        '&': {
          height,
          minHeight,
        },
        '.cm-scroller': {
          overflow: 'auto',
        },
      }),
    ];

    // Add placeholder
    if (placeholder) {
      extensions.push(
        EditorView.contentAttributes.of({
          'aria-placeholder': placeholder,
        })
      );
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  // Update value when prop changes
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  // Update theme when prop changes
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompartment.current.reconfigure(
          theme === 'dark' ? [oneDark, darkTheme] : lightTheme
        ),
      });
    }
  }, [theme]);

  return (
    <div
      ref={editorRef}
      className={`sql-editor-container rounded-lg border overflow-hidden ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
      }`}
    />
  );
};

export default SQLEditor;
