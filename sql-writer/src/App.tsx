import React, { useEffect, useRef, useState, useCallback } from "react";

const API_URL = "http://localhost:5000/suggest";

const App: React.FC = () => {
  const [schema, setSchema] = useState("");
  const [query, setQuery] = useState("");
  const [suggestion, setSuggestion] = useState("");

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const ghostRef = useRef<HTMLTextAreaElement | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ---------- API ----------
  const fetchSuggestion = useCallback(async () => {
    if (!query || query.trim().length < 3) {
      setSuggestion("");
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema, query }),
      });

      const data = await res.json();
      setSuggestion(data.suggestion || "");
    } catch (err) {
      console.error("Fetch error:", err);
      setSuggestion("");
    }
  }, [schema, query]);

  // ---------- DEBOUNCE ----------
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchSuggestion, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestion]);

  // ---------- SCROLL SYNC ----------
  const handleScroll = () => {
    if (ghostRef.current && inputRef.current) {
      ghostRef.current.scrollTop = inputRef.current.scrollTop;
      ghostRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  // ---------- TAB HANDLER ----------
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      const queryLower = query.toLowerCase();
      const suggestionLower = suggestion.toLowerCase();

      if (suggestion && suggestionLower.startsWith(queryLower)) {
        e.preventDefault();

        const newQuery = suggestion;
        setQuery(newQuery);
        setSuggestion("");

        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = newQuery.length;
            inputRef.current.selectionEnd = newQuery.length;
          }
        }, 0);
      }
    }
  };

  // ---------- GHOST TEXT ----------
  const getGhostText = () => {
    const queryLower = query.toLowerCase();
    const suggestionLower = suggestion.toLowerCase();

    if (suggestion && suggestionLower.startsWith(queryLower)) {
      return query + suggestion.slice(query.length);
    }
    return query;
  };

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <h1>✍️ Real-Time SQL Writer</h1>

        <div style={styles.grid}>
          {/* LEFT */}
          <div>
            <label style={styles.label}>1. Define Schema</label>
            <textarea
              style={styles.textarea}
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              placeholder="e.g., CREATE TABLE users..."
            />

            <label style={styles.label}>
              2. SQL Input (Press TAB to complete)
            </label>

            <div style={styles.ghostWrapper}>
              {/* Ghost */}
              <textarea
                ref={ghostRef}
                value={getGhostText()}
                readOnly
                style={{ ...styles.textarea, ...styles.ghost }}
              />

              {/* Real */}
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                style={{ ...styles.textarea, ...styles.real }}
                placeholder="SELECT * FROM..."
              />
            </div>
          </div>

          {/* RIGHT */}
          <div>
            <h3>AI Suggestion</h3>
            <div style={styles.suggestionBox}>
              {suggestion ? (
                <pre>
                  <code>{suggestion}</code>
                </pre>
              ) : (
                "No suggestion..."
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

// ---------- STYLES ----------
const styles: Record<string, React.CSSProperties> = {
  body: {
    margin: 0,
    fontFamily: "system-ui, -apple-system, sans-serif",
    background: "#0e1117",
    color: "#fafafa",
    padding: 20,
    minHeight: "100vh",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 30,
  },
  label: {
    display: "block",
    fontWeight: 600,
    margin: "15px 0 8px",
    color: "#e0e0e0",
  },
  textarea: {
    width: "100%",
    height: 200,
    background: "#262730",
    color: "#fafafa",
    border: "1px solid #444",
    borderRadius: 6,
    padding: 12,
    fontFamily: "monospace",
    fontSize: 14,
    lineHeight: 1.5,
    resize: "none",
    boxSizing: "border-box",
    overflow: "hidden",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
  },
  ghostWrapper: {
    position: "relative",
  },
  ghost: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1,
    color: "#555",
    pointerEvents: "none",
  },
  real: {
    position: "relative",
    zIndex: 2,
    background: "transparent",
    borderColor: "transparent",
    caretColor: "#4a90e2",
  },
  suggestionBox: {
    background: "#262730",
    padding: 15,
    borderRadius: 6,
    border: "1px solid #444",
    overflowX: "auto",
    fontFamily: "monospace",
    minHeight: 200,
  },
};