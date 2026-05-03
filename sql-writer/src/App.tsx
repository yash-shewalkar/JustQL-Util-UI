"use client";
import React, { useState, useRef, useCallback } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';

const API_URL = "http://localhost:5000/suggest";

const JustQLCopilot: React.FC = () => {
  const [schema, setSchema] = useState("-- Define schema here\nCREATE TABLE users (id INT, name TEXT);");
  const [query, setQuery] = useState("SELECT ");
  
  // Ref to store the latest suggestion for the provider to access
  const latestSuggestionRef = useRef("");

  // ---------- API FETCH LOGIC ----------
  const fetchSuggestion = useCallback(async (currentQuery: string) => {
    if (!currentQuery || currentQuery.trim().length < 3) {
      latestSuggestionRef.current = "";
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema, query: currentQuery }),
      });
      const data = await res.json();
      latestSuggestionRef.current = data.suggestion || "";
    } catch (err) {
      console.error("Fetch error:", err);
      latestSuggestionRef.current = "";
    }
  }, [schema]);

  // ---------- EDITOR MOUNT HANDLER ----------
  const handleEditorDidMount: OnMount = (_editor, monaco) => {
    monaco.languages.registerInlineCompletionsProvider('sql', {
    provideInlineCompletions: async (
      model: monacoEditor.editor.ITextModel,
      position: monacoEditor.Position,
    ) => {
      const textBeforeCursor = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      await fetchSuggestion(textBeforeCursor);

      // CHANGE: 'let' to 'const' to fix your linting error
      const rawSuggestion = latestSuggestionRef.current;
      if (!rawSuggestion) return { items: [] };

      // 1. Calculate the base insert text
      let insertText = rawSuggestion;
      if (rawSuggestion.toLowerCase().startsWith(textBeforeCursor.toLowerCase())) {
        insertText = rawSuggestion.substring(textBeforeCursor.length);
      }

      // 2. Space Logic: Add a space if the user is at the end of a word 
      // and the suggestion doesn't already have one.
      const lastChar = textBeforeCursor.slice(-1);
      const isCursorAtEndOfWord = lastChar !== "" && !/\s/.test(lastChar);
      const suggestionNeedsSpace = !insertText.startsWith(" ");

      if (isCursorAtEndOfWord && suggestionNeedsSpace && insertText.length > 0) {
        insertText = " " + insertText;
      }

      return {
        items: [
          {
            insertText: insertText,
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
          },
        ],
      };
    },
      // 4. Added as required by your reference's type definitions
      freeInlineCompletions: () => {},
    });
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{ color: "#fafafa" }}>JustQL AI Editor</h1>
      </header>

      <div style={styles.grid}>
        {/* Schema Editor */}
        <section>
          <label style={styles.label}>Database Schema</label>
          <div style={styles.editorWrapper}>
            <Editor
              height="150px"
              defaultLanguage="sql"
              theme="vs-dark"
              value={schema}
              onChange={(v) => setSchema(v || "")}
              options={{ minimap: { enabled: false }, fontSize: 13 }}
            />
          </div>
        </section>

        {/* Main SQL Copilot Editor */}
        <section>
          <label style={styles.label}>SQL Input (Ghost Text Enabled)</label>
          <div style={styles.editorWrapper}>
            <Editor
              height="400px"
              defaultLanguage="sql"
              theme="vs-dark"
              value={query}
              onMount={handleEditorDidMount}
              onChange={(v) => setQuery(v || "")}
              options={{
                inlineSuggest: { enabled: true },
                fontSize: 14,
                minimap: { enabled: false },
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                // Ensures the ghost text doesn't conflict with the standard suggestion widget
                suggest: {
                    showMethods: true,
                    showFunctions: true,
                }
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

// ---------- STYLES ----------
const styles: Record<string, React.CSSProperties> = {
  container: { padding: "20px", background: "#0e1117", minHeight: "100vh" },
  header: { marginBottom: "20px" },
  grid: { display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1200px", margin: "0 auto" },
  label: { color: "#e0e0e0", fontSize: "0.9rem", marginBottom: "8px", display: "block" },
  editorWrapper: { border: "1px solid #333", borderRadius: "8px", overflow: "hidden" }
};

export default JustQLCopilot;