import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  const [workspaceName, setWorkspaceName] = useState("Work Downloads");
  const [fileInput, setFileInput] = useState("");
  const [mode, setMode] = useState("lazy");

  const [currentPlan, setCurrentPlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");

  const handleUpdateSuggestion = (fileId, field, value) => {
    setCurrentPlan((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        files: previous.files.map((file) =>
          file.id === fileId
            ? {
                ...file,
                [field]: value,
              }
            : file,
        ),
      };
    });
  };

  const files = useMemo(() => {
    return fileInput
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [fileInput]);

  useEffect(() => {
    loadSavedPlans();
  }, []);

  const loadSavedPlans = async () => {
    try {
      setHistoryLoading(true);

      const response = await fetch(`${API_URL}/api/cleanup-plans`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load saved plans.");
      }

      setSavedPlans(Array.isArray(data.plans) ? data.plans : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load saved cleanup plans.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleGenerate = async () => {
    setError("");

    if (!workspaceName.trim()) {
      setError("Please enter a workspace name.");
      return;
    }

    if (files.length === 0) {
      setError("Please add at least one filename.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/generate-cleanup-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceName: workspaceName.trim(),
          mode,
          files,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to generate cleanup plan.");
      }

      setCurrentPlan(data.plan);

      setSavedPlans((previous) => [
        data.plan,
        ...previous.filter((item) => item.id !== data.plan.id),
      ]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!currentPlan?.id) {
      setError("No cleanup plan is available to approve.");
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/api/cleanup-plans/${currentPlan.id}/approve`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            files: currentPlan.files,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to approve cleanup plan.");
      }

      setCurrentPlan(data.plan);

      setSavedPlans((previous) =>
        previous.map((item) => (item.id === data.plan.id ? data.plan : item)),
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to approve cleanup plan.");
    }
  };

  const handleDeletePlan = async (id) => {
    const confirmed = window.confirm("Delete this cleanup plan?");

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(`${API_URL}/api/cleanup-plans/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete cleanup plan.");
      }

      setSavedPlans((previous) => previous.filter((item) => item.id !== id));

      if (currentPlan?.id === id) {
        setCurrentPlan(null);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete cleanup plan.");
    }
  };

  const handleOpenSavedPlan = (plan) => {
    setCurrentPlan(plan);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleClear = () => {
    setFileInput("");
    setCurrentPlan(null);
    setError("");
  };

  const handleLoadSample = () => {
    setWorkspaceName("Work Downloads");

    setFileInput(
      [
        "invoice-IOC-oct.pdf",
        "IMG_1234.jpg",
        "Apex-agreement-final.docx",
        "meeting_notes.txt",
        "expense-receipt.pdf",
        "project-final-final-v2.docx",
      ].join("\n"),
    );

    setCurrentPlan(null);
    setError("");
  };

  const handleExportJSON = () => {
    if (!currentPlan) {
      return;
    }

    const content = JSON.stringify(currentPlan, null, 2);

    const blob = new Blob([content], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `lazydesk-${currentPlan.workspace_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}-cleanup-plan.json`;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">L</div>

          <div>
            <h1>LazyDesk AI</h1>
            <p>Let local AI clean up your digital mess.</p>
          </div>
        </div>

        <div className="local-badge">
          <span className="status-dot"></span>
          Gemma + Ollama
        </div>
      </header>

      <main className="page-content">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Local AI File Organizer</span>

            <h2>
              Drop the clutter.
              <br />
              Let AI make the plan.
            </h2>

            <p>
              Paste your messy filenames and LazyDesk will suggest cleaner names
              and sensible folders while keeping everything local.
            </p>
          </div>

          <div className="hero-card">
            <span className="hero-card-label">Slow & Steady Mode</span>

            <strong>Do less manually.</strong>

            <p>
              You provide the mess. Local AI figures out how it should be
              organized.
            </p>

            <div className="privacy-pill">
              <span>●</span>
              No cloud AI required
            </div>
          </div>
        </section>

        <section className="workspace-grid">
          <div className="input-column">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="section-number">01</span>

                  <div>
                    <h3>Workspace</h3>
                    <p>Name the pile of files you want to clean up.</p>
                  </div>
                </div>
              </div>

              <div className="field">
                <label>Workspace Name</label>

                <input
                  type="text"
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="Example: Work Downloads"
                />
              </div>

              <div className="mode-card">
                <div>
                  <div className="mode-title">
                    <span className="sloth-icon">☕</span>
                    Lazy Mode
                  </div>

                  <p>
                    Let AI choose the filenames and folders without making you
                    configure categories first.
                  </p>
                </div>

                <label className="switch">
                  <input
                    type="checkbox"
                    checked={mode === "lazy"}
                    onChange={(event) =>
                      setMode(event.target.checked ? "lazy" : "assisted")
                    }
                  />

                  <span className="slider"></span>
                </label>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="section-number">02</span>

                  <div>
                    <h3>Digital Mess</h3>
                    <p>Add one filename per line.</p>
                  </div>
                </div>

                <span className="file-count">
                  {files.length} {files.length === 1 ? "file" : "files"}
                </span>
              </div>

              <div className="field">
                <label>Filenames</label>

                <textarea
                  className="file-input"
                  value={fileInput}
                  onChange={(event) => setFileInput(event.target.value)}
                  placeholder={`invoice-final2.pdf
IMG_8744.jpg
meeting-notes-new.txt
proposal-final-final.docx`}
                  rows={12}
                />
              </div>

              <div className="input-help">
                LazyDesk only receives the filenames in this version. It does
                not open, move, rename, or delete your real files.
              </div>

              {error && <div className="error-box">{error}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleLoadSample}
                  disabled={loading}
                >
                  Load Sample
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleClear}
                  disabled={loading}
                >
                  Clear
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Organizing...
                    </>
                  ) : (
                    <>
                      <span>✦</span>
                      Organize with AI
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>

          <aside className="side-column">
            <section className="panel side-panel">
              <span className="section-number">03</span>

              <h3>What LazyDesk does</h3>

              <div className="feature-list">
                <div className="feature-item">
                  <span>01</span>

                  <div>
                    <strong>Cleans filenames</strong>
                    <p>Turns messy names into clearer suggestions.</p>
                  </div>
                </div>

                <div className="feature-item">
                  <span>02</span>

                  <div>
                    <strong>Suggests folders</strong>
                    <p>Groups files into practical locations.</p>
                  </div>
                </div>

                <div className="feature-item">
                  <span>03</span>

                  <div>
                    <strong>Explains decisions</strong>
                    <p>Shows why each suggestion was made.</p>
                  </div>
                </div>

                <div className="feature-item">
                  <span>04</span>

                  <div>
                    <strong>Stays safe</strong>
                    <p>Creates a plan instead of touching real files.</p>
                  </div>
                </div>
              </div>

              <div className="local-card">
                <span>Runs locally with</span>
                <strong>Gemma 3 1B</strong>
                <small>via Ollama</small>
              </div>
            </section>
          </aside>
        </section>

        {currentPlan && (
          <section className="plan-section">
            <div className="plan-heading">
              <div>
                <span className="eyebrow">AI Cleanup Plan</span>

                <h3>{currentPlan.workspace_name}</h3>

                <p>{currentPlan.summary}</p>
              </div>

              <div className="plan-status-area">
                <span
                  className={`status-badge ${
                    currentPlan.status === "APPROVED" ? "status-approved" : ""
                  }`}
                >
                  {currentPlan.status}
                </span>

                <span className="plan-mode">
                  {currentPlan.mode === "lazy" ? "Lazy Mode" : "Assisted Mode"}
                </span>
              </div>
            </div>

            <div className="cleanup-list">
              {currentPlan.files.map((file, index) => (
                <article className="cleanup-card" key={file.id || index}>
                  <div className="cleanup-index">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="cleanup-main">
                    <div className="file-change">
                      <div className="file-block original-file">
                        <span>Before</span>
                        <strong>{file.original_name}</strong>
                      </div>

                      <div className="change-arrow">→</div>

                      <div className="file-block suggested-file">
                        <span>Suggested</span>
                        <input
                          className="suggestion-edit-input"
                          type="text"
                          value={file.suggested_name}
                          onChange={(event) =>
                            handleUpdateSuggestion(
                              file.id,
                              "suggested_name",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="cleanup-meta">
                      <div className="folder-chip">
                        <span>Folder</span>
                        <input
                          className="folder-edit-input"
                          type="text"
                          value={file.folder}
                          onChange={(event) =>
                            handleUpdateSuggestion(
                              file.id,
                              "folder",
                              event.target.value,
                            )
                          }
                        />
                      </div>

                      <div
                        className={`confidence-chip confidence-${file.confidence}`}
                      >
                        {file.confidence} confidence
                      </div>
                    </div>

                    <p className="cleanup-reason">{file.reason}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="plan-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={handleExportJSON}
              >
                ↓ Export JSON
              </button>

              <button
                type="button"
                className="approve-button"
                onClick={handleApprove}
                disabled={currentPlan.status === "APPROVED"}
              >
                {currentPlan.status === "APPROVED"
                  ? "✓ Plan Approved"
                  : "✓ Approve Cleanup Plan"}
              </button>
            </div>

            <div className="safety-note">
              <strong>Safe by design:</strong> approving a plan does not rename,
              move, or delete files. LazyDesk currently creates recommendations
              only.
            </div>
          </section>
        )}

        <section className="history-section">
          <div className="history-heading">
            <div>
              <span className="eyebrow">Saved Locally</span>
              <h3>Cleanup History</h3>
              <p>
                Generated plans remain available after refreshing the browser.
              </p>
            </div>

            <div className="history-count">{savedPlans.length} saved</div>
          </div>

          {historyLoading ? (
            <div className="empty-state">Loading saved cleanup plans...</div>
          ) : savedPlans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">☁</div>
              <strong>No cleanup plans yet.</strong>
              <p>Your future lazy decisions will appear here.</p>
            </div>
          ) : (
            <div className="history-list">
              {savedPlans.map((plan) => (
                <article className="history-card" key={plan.id}>
                  <button
                    type="button"
                    className="history-open"
                    onClick={() => handleOpenSavedPlan(plan)}
                  >
                    <div className="history-main">
                      <div>
                        <strong>{plan.workspace_name}</strong>

                        <p>
                          {plan.files?.length || 0} files ·{" "}
                          {plan.mode === "lazy" ? "Lazy Mode" : "Assisted Mode"}
                        </p>
                      </div>

                      <span
                        className={`status-badge ${
                          plan.status === "APPROVED" ? "status-approved" : ""
                        }`}
                      >
                        {plan.status}
                      </span>
                    </div>

                    <div className="history-summary">{plan.summary}</div>

                    <div className="history-date">
                      {new Date(plan.created_at).toLocaleString()}
                    </div>
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => handleDeletePlan(plan.id)}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <strong>LazyDesk AI</strong>

        <span>Your files are messy. Your weekend doesn't have to be.</span>
      </footer>
    </div>
  );
}

export default App;
