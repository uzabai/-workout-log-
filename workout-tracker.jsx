import { useState, useEffect, useRef } from "react";

const DEFAULT_EXERCISES = {
  chest:     ["ベンチプレス", "インクラインベンチ", "デクラインベンチ", "チェストフライ", "ケーブルクロスオーバー", "ディップス"],
  arms:      ["バーベルカール", "ダンベルカール", "ハンマーカール", "トライセプスプレス", "スカルクラッシャー", "ケーブルプッシュダウン"],
  shoulders: ["ショルダープレス", "サイドレイズ", "フロントレイズ", "リアレイズ", "アーノルドプレス", "アップライトロウ"],
  back:      ["デッドリフト", "ラットプルダウン", "バーベルロウ", "ワンハンドロウ", "シーテッドロウ", "チンニング"],
  legs:      ["スクワット", "レッグプレス", "ランジ", "レッグカール", "レッグエクステンション", "カーフレイズ"],
};
const MUSCLE_GROUPS = [
  { id: "chest",     label: "胸",   color: "#ff4500" },
  { id: "arms",      label: "腕",   color: "#ff8c00" },
  { id: "shoulders", label: "肩",   color: "#ffd700" },
  { id: "back",      label: "背中", color: "#00bcd4" },
  { id: "legs",      label: "足",   color: "#7c3aed" },
];
const REST_PRESETS = [60, 90, 120, 180, 240, 300];

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return String(m).padStart(2,"0") + ":" + String(sec).padStart(2,"0");
}
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; }
  catch(e) { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}
function loadExercises() {
  const saved = load("custom_exercises", {});
  const result = {};
  for (const g of MUSCLE_GROUPS) result[g.id] = saved[g.id] || [...DEFAULT_EXERCISES[g.id]];
  return result;
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:#0a0a0a; color:#e8e8e8; font-family:'JetBrains Mono',monospace; min-height:100vh; }
  .app { max-width:480px; margin:0 auto; padding:16px; min-height:100vh; background:#0a0a0a; }
  .nav { display:flex; margin-bottom:20px; border-bottom:2px solid #1e1e1e; }
  .nav-btn { font-family:'Bebas Neue',sans-serif; font-size:16px; letter-spacing:2px; padding:10px 18px; background:transparent; border:none; color:#444; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all 0.15s; }
  .nav-btn.active { color:#ff4500; border-bottom-color:#ff4500; }
  .header { border-bottom:2px solid #ff4500; padding-bottom:10px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:flex-end; }
  .header h1 { font-family:'Bebas Neue',sans-serif; font-size:34px; letter-spacing:4px; color:#ff4500; line-height:1; }
  .header .date { font-size:10px; color:#666; letter-spacing:1px; }
  .session-meta { display:flex; gap:8px; margin-bottom:16px; }
  .meta-box { flex:1; background:#141414; border:1px solid #222; padding:8px; text-align:center; }
  .meta-box .label { font-size:9px; color:#555; letter-spacing:2px; margin-bottom:2px; }
  .meta-box .value { font-size:18px; font-family:'Bebas Neue',sans-serif; color:#ff4500; letter-spacing:2px; }
  .rest-timer { background:#141414; border:1px solid #222; padding:12px; margin-bottom:14px; }
  .rest-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
  .rest-label { font-size:10px; letter-spacing:3px; color:#555; }
  .rest-display { font-family:'Bebas Neue',sans-serif; font-size:32px; letter-spacing:4px; color:#e8e8e8; transition:color 0.3s; }
  .rest-display.urgent { color:#ff4500; }
  .rest-bar-bg { height:3px; background:#222; border-radius:2px; overflow:hidden; margin-bottom:8px; }
  .rest-bar-fill { height:100%; background:#ff4500; transition:width 0.5s linear; border-radius:2px; }
  .rest-presets { display:flex; gap:5px; flex-wrap:wrap; }
  .rest-preset { font-family:'Bebas Neue',sans-serif; font-size:13px; padding:4px 10px; background:#0a0a0a; border:1px solid #2a2a2a; color:#555; cursor:pointer; transition:all 0.15s; }
  .rest-preset:hover,.rest-preset.active { background:#ff4500; color:#000; border-color:#ff4500; }
  .rest-stop { font-family:'JetBrains Mono',monospace; font-size:10px; padding:4px 8px; background:transparent; border:1px solid #333; color:#666; cursor:pointer; }
  .section-title { font-size:10px; letter-spacing:3px; color:#555; margin-bottom:8px; }
  .muscle-tabs { display:flex; gap:5px; margin-bottom:12px; flex-wrap:wrap; }
  .muscle-tab { font-family:'Bebas Neue',sans-serif; font-size:14px; letter-spacing:2px; padding:4px 10px; border:1px solid #2a2a2a; background:#141414; color:#555; cursor:pointer; transition:all 0.15s; }
  .muscle-tab.active { color:#000; border-color:transparent; }
  .tab-dot { display:inline-block; width:5px; height:5px; border-radius:50%; margin-right:4px; vertical-align:middle; }
  .add-exercise { background:#141414; border:1px solid #222; padding:12px; margin-bottom:14px; }
  .group-bar { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
  .group-bar-left { display:flex; align-items:center; gap:6px; }
  .group-dot { width:8px; height:8px; border-radius:50%; }
  .group-label { font-size:10px; letter-spacing:2px; color:#888; }
  .btn-edit { font-family:'JetBrains Mono',monospace; font-size:10px; padding:3px 8px; background:transparent; border:1px solid #333; color:#555; cursor:pointer; }
  .btn-edit:hover { color:#e8e8e8; border-color:#666; }
  .ex-select { width:100%; background:#0a0a0a; border:1px solid #333; color:#e8e8e8; font-family:'JetBrains Mono',monospace; font-size:12px; padding:8px; outline:none; appearance:none; -webkit-appearance:none; margin-bottom:8px; }
  .btn-add { background:#ff4500; color:#000; border:none; width:100%; font-family:'Bebas Neue',sans-serif; font-size:15px; letter-spacing:2px; padding:9px; cursor:pointer; transition:background 0.15s; }
  .btn-add:hover { background:#ff6a33; }
  .btn-add:disabled { background:#2a2a2a; color:#444; cursor:default; }
  .ex-card { background:#141414; border:1px solid #222; margin-bottom:8px; }
  .ex-header { padding:6px 12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e1e1e; }
  .ex-header-left { display:flex; align-items:center; gap:6px; }
  .ex-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .ex-name { font-family:'Bebas Neue',sans-serif; font-size:16px; letter-spacing:2px; color:#e8e8e8; }
  .ex-badge { font-size:9px; letter-spacing:1px; padding:1px 5px; border-radius:2px; font-family:'JetBrains Mono',monospace; opacity:0.8; }
  .btn-x { background:transparent; color:#444; border:none; font-size:11px; cursor:pointer; padding:3px; transition:color 0.15s; }
  .btn-x:hover { color:#ff4500; }
  .sets-table { width:100%; border-collapse:collapse; }
  .sets-table thead tr { background:#0f0f0f; }
  .sets-table th { font-size:9px; color:#444; letter-spacing:2px; padding:4px 10px; text-align:center; font-weight:normal; }
  .sets-table td { padding:4px 10px; text-align:center; font-size:12px; border-bottom:1px solid #1a1a1a; }
  .sets-table tr:last-child td { border-bottom:none; }
  .set-num { color:#444; font-size:11px; }
  .w-val { font-family:'Bebas Neue',sans-serif; font-size:16px; letter-spacing:1px; }
  .set-form { display:grid; grid-template-columns:1fr 1fr; gap:6px; padding:8px 12px; background:#0f0f0f; border-top:1px solid #1e1e1e; }
  .field-label { font-size:9px; color:#555; letter-spacing:2px; margin-bottom:3px; text-align:center; }
  .field-input { width:100%; background:#141414; border:1px solid #2a2a2a; color:#e8e8e8; font-family:'JetBrains Mono',monospace; font-size:14px; padding:6px; text-align:center; outline:none; }
  .field-input:focus { border-color:#ff4500; }
  .record-btn { display:block; margin:0 12px 8px; background:#ff4500; color:#000; border:none; width:calc(100% - 24px); font-family:'Bebas Neue',sans-serif; font-size:14px; letter-spacing:2px; padding:7px; cursor:pointer; transition:background 0.15s; }
  .record-btn:hover { background:#ff6a33; }
  .edit-row { display:flex; gap:6px; padding:6px 12px; background:#1a1a1a; border-top:1px solid #1e1e1e; align-items:center; }
  .edit-input { flex:1; background:#0a0a0a; border:1px solid #333; color:#e8e8e8; font-family:'JetBrains Mono',monospace; font-size:13px; padding:5px 8px; text-align:center; outline:none; }
  .edit-input:focus { border-color:#ff4500; }
  .btn-save { font-family:'Bebas Neue',sans-serif; font-size:14px; letter-spacing:1px; padding:5px 12px; border:none; cursor:pointer; }
  .btn-cancel { font-family:'JetBrains Mono',monospace; font-size:10px; padding:5px 8px; background:transparent; border:1px solid #333; color:#555; cursor:pointer; }
  .empty-state { text-align:center; padding:28px 20px; color:#2a2a2a; }
  .empty-state .icon { font-size:36px; margin-bottom:8px; filter:grayscale(1); }
  .empty-state p { font-size:11px; letter-spacing:2px; }
  .note-input { width:100%; background:#141414; border:1px solid #222; border-top:none; color:#888; font-family:'JetBrains Mono',monospace; font-size:11px; padding:8px 12px; outline:none; resize:none; }
  .note-input:focus { color:#e8e8e8; }
  .footer { margin-top:16px; display:flex; gap:10px; }
  .btn-finish { flex:1; background:#ff4500; color:#000; border:none; font-family:'Bebas Neue',sans-serif; font-size:18px; letter-spacing:3px; padding:12px; cursor:pointer; transition:background 0.15s; }
  .btn-finish:hover { background:#ff6a33; }
  .btn-finish:disabled { background:#2a2a2a; color:#444; cursor:default; }
  .btn-reset { background:transparent; color:#333; border:1px solid #222; font-family:'JetBrains Mono',monospace; font-size:11px; padding:12px; cursor:pointer; transition:all 0.15s; }
  .btn-reset:hover { color:#666; border-color:#444; }
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.92); display:flex; align-items:center; justify-content:center; z-index:100; }
  .summary-card { background:#0f0f0f; border:2px solid #ff4500; padding:24px; width:90%; max-width:400px; max-height:85vh; overflow-y:auto; }
  .summary-card h2 { font-family:'Bebas Neue',sans-serif; font-size:30px; letter-spacing:4px; color:#ff4500; margin-bottom:14px; }
  .s-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #1e1e1e; font-size:12px; }
  .s-key { color:#555; } .s-val { color:#e8e8e8; }
  .s-group-title { font-family:'Bebas Neue',sans-serif; font-size:13px; letter-spacing:3px; margin-top:14px; margin-bottom:5px; display:flex; align-items:center; gap:8px; }
  .s-group-line { flex:1; height:1px; background:#1e1e1e; }
  .s-ex { padding:6px 0; border-bottom:1px solid #1a1a1a; }
  .s-ex-name { font-family:'Bebas Neue',sans-serif; font-size:15px; letter-spacing:2px; color:#e8e8e8; }
  .s-ex-sets { font-size:11px; color:#555; margin-top:1px; }
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.88); display:flex; align-items:flex-end; justify-content:center; z-index:200; }
  .modal-card { background:#111; border-top:2px solid #ff4500; padding:20px; width:100%; max-width:480px; max-height:75vh; overflow-y:auto; }
  .modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
  .modal-title { font-family:'Bebas Neue',sans-serif; font-size:22px; letter-spacing:3px; }
  .modal-close { background:transparent; border:none; color:#555; font-size:18px; cursor:pointer; padding:4px 8px; }
  .ex-item { display:flex; align-items:center; gap:8px; padding:7px 0; border-bottom:1px solid #1a1a1a; }
  .ex-item-name { flex:1; font-size:12px; color:#ccc; }
  .btn-icon { background:transparent; border:none; cursor:pointer; font-size:12px; padding:4px 6px; color:#444; transition:color 0.15s; }
  .btn-icon:hover,.btn-icon.ok { color:#ff4500; }
  .add-row { display:flex; gap:8px; margin-top:12px; }
  .add-row input { flex:1; background:#0a0a0a; border:1px solid #333; color:#e8e8e8; font-family:'JetBrains Mono',monospace; font-size:12px; padding:8px; outline:none; }
  .add-row button { font-family:'Bebas Neue',sans-serif; font-size:15px; padding:8px 14px; background:#ff4500; color:#000; border:none; cursor:pointer; }
  .hist-empty { text-align:center; padding:48px 20px; color:#2a2a2a; }
  .hist-empty .icon { font-size:36px; margin-bottom:8px; }
  .hist-empty p { font-size:11px; letter-spacing:2px; }
  .hist-card { background:#141414; border:1px solid #222; margin-bottom:10px; overflow:hidden; }
  .hist-header { padding:10px 14px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; }
  .hist-header:hover { background:#1a1a1a; }
  .hist-date { font-family:'Bebas Neue',sans-serif; font-size:16px; letter-spacing:2px; color:#e8e8e8; }
  .hist-meta { font-size:10px; color:#555; margin-top:2px; }
  .hist-chevron { color:#444; font-size:11px; transition:transform 0.2s; }
  .hist-chevron.open { transform:rotate(180deg); }
  .hist-body { border-top:1px solid #1e1e1e; padding:10px 14px; }
  .hist-group { margin-bottom:10px; }
  .hist-group-label { font-size:9px; letter-spacing:3px; margin-bottom:5px; }
  .hist-ex { margin-bottom:5px; }
  .hist-ex-name { font-family:'Bebas Neue',sans-serif; font-size:14px; letter-spacing:1px; color:#e8e8e8; }
  .hist-ex-sets { font-size:11px; color:#555; }
  .hist-note { margin-top:8px; padding-top:8px; border-top:1px solid #1a1a1a; font-size:11px; color:#555; }
  .hist-del { font-size:10px; color:#333; background:transparent; border:none; cursor:pointer; font-family:'JetBrains Mono',monospace; padding:4px 8px; transition:color 0.15s; }
  .hist-del:hover { color:#ff4500; }
  @keyframes flash { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .rest-display.done { animation:flash 0.5s ease 3; color:#ff4500; }
`;

export default function WorkoutTracker() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("ja-JP", { year:"numeric", month:"long", day:"numeric", weekday:"long" });

  const [tab, setTab] = useState("workout");
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState("chest");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [note, setNote] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [restTarget, setRestTarget] = useState(90);
  const [restRemaining, setRestRemaining] = useState(null);
  const restRef = useRef(null);
  const [history, setHistory] = useState(() => load("workout_history", []));
  const [openHistoryId, setOpenHistoryId] = useState(null);
  const [customExercises, setCustomExercises] = useState(() => loadExercises());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editingVal, setEditingVal] = useState("");
  const [newExName, setNewExName] = useState("");
  // { exId: { weight: "", reps: "" } }
  const [inputs, setInputs] = useState({});
  // { exId: { idx, weight: "", reps: "" } } — inline edit
  const [editingSet, setEditingSet] = useState(null);

  const activeGroup = MUSCLE_GROUPS.find(g => g.id === activeGroupId) || MUSCLE_GROUPS[0];
  const activeExList = customExercises[activeGroupId] || [];

  useEffect(() => {
    setSelectedExercise((customExercises[activeGroupId] || [])[0] || "");
  }, [activeGroupId]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startTime]);

  const startRest = (s) => {
    clearInterval(restRef.current);
    setRestTarget(s); setRestRemaining(s);
    restRef.current = setInterval(() => {
      setRestRemaining(r => { if (r <= 1) { clearInterval(restRef.current); return 0; } return r - 1; });
    }, 1000);
  };
  const stopRest = () => { clearInterval(restRef.current); setRestRemaining(null); };

  const saveCustomExercises = (updated) => { setCustomExercises(updated); save("custom_exercises", updated); };
  const addExToList = () => {
    if (!newExName.trim()) return;
    const updated = { ...customExercises, [activeGroupId]: [...activeExList, newExName.trim()] };
    saveCustomExercises(updated); setSelectedExercise(newExName.trim()); setNewExName("");
  };
  const deleteExFromList = (idx) => {
    const newList = activeExList.filter((_, i) => i !== idx);
    saveCustomExercises({ ...customExercises, [activeGroupId]: newList });
    if (selectedExercise === activeExList[idx]) setSelectedExercise(newList[0] || "");
  };
  const startEditEx = (idx) => { setEditingIdx(idx); setEditingVal(activeExList[idx]); };
  const confirmEditEx = (idx) => {
    if (!editingVal.trim()) return;
    const newList = activeExList.map((e, i) => i === idx ? editingVal.trim() : e);
    saveCustomExercises({ ...customExercises, [activeGroupId]: newList });
    if (selectedExercise === activeExList[idx]) setSelectedExercise(editingVal.trim());
    setEditingIdx(null); setEditingVal("");
  };

  const addExercise = () => {
    if (!selectedExercise) return;
    const id = Date.now();
    setExercises(prev => [...prev, { id, name: selectedExercise, groupId: activeGroupId, sets: [] }]);
    setInputs(prev => ({ ...prev, [id]: { weight: "", reps: "" } }));
  };

  const recordSet = (exId) => {
    const inp = inputs[exId] || {};
    const w = parseFloat(inp.weight);
    const r = parseInt(inp.reps);
    if (isNaN(w) || isNaN(r)) return;
    setExercises(prev => prev.map(e => e.id === exId ? { ...e, sets: [...e.sets, { weight: w, reps: r }] } : e));
    setInputs(prev => ({ ...prev, [exId]: { weight: inp.weight, reps: "" } }));
    startRest(restTarget);
  };

  const saveEditSet = (exId, idx) => {
    if (!editingSet) return;
    const w = parseFloat(editingSet.weight);
    const r = parseInt(editingSet.reps);
    if (isNaN(w) || isNaN(r)) return;
    setExercises(prev => prev.map(e =>
      e.id === exId ? { ...e, sets: e.sets.map((s, i) => i === idx ? { weight: w, reps: r } : s) } : e
    ));
    setEditingSet(null);
  };

  const removeExercise = (id) => setExercises(prev => prev.filter(e => e.id !== id));
  const removeSet = (exId, idx) => setExercises(prev => prev.map(e =>
    e.id === exId ? { ...e, sets: e.sets.filter((_, i) => i !== idx) } : e
  ));

  const totalSets = exercises.reduce((a, e) => a + (e.sets?.length || 0), 0);
  const totalVolume = exercises.reduce((a, e) => a + (e.sets || []).reduce((b, s) => b + s.weight * s.reps, 0), 0);

  const finishSession = () => {
    const session = { id: Date.now(), date: today.toLocaleDateString("ja-JP"), duration: elapsed, exercises, note, totalSets, totalVolume };
    const updated = [session, ...history];
    setHistory(updated); save("workout_history", updated); setShowSummary(true);
  };
  const deleteHistory = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated); save("workout_history", updated);
  };
  const resetWorkout = () => { setExercises([]); setNote(""); stopRest(); };

  const exercisesByGroup = MUSCLE_GROUPS.map(g => ({ ...g, items: exercises.filter(e => e.groupId === g.id) })).filter(g => g.items.length > 0);
  const restPct = restRemaining !== null && restTarget > 0 ? (restRemaining / restTarget) * 100 : 100;
  const isUrgent = restRemaining !== null && restRemaining <= 10 && restRemaining > 0;
  const isDone = restRemaining === 0;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="nav">
          <button className={"nav-btn" + (tab==="workout" ? " active" : "")} onClick={() => setTab("workout")}>トレーニング</button>
          <button className={"nav-btn" + (tab==="history" ? " active" : "")} onClick={() => setTab("history")}>{"履歴" + (history.length > 0 ? " ("+history.length+")" : "")}</button>
        </div>

        {tab === "workout" && (
          <div>
            <div className="header">
              <h1>WORKOUT LOG</h1>
              <div className="date">{dateStr}</div>
            </div>

            <div className="session-meta">
              <div className="meta-box"><div className="label">経過時間</div><div className="value">{formatTime(elapsed)}</div></div>
              <div className="meta-box"><div className="label">SETS</div><div className="value">{totalSets}</div></div>
              <div className="meta-box"><div className="label">VOLUME</div><div className="value">{totalVolume >= 1000 ? (totalVolume/1000).toFixed(1)+"t" : totalVolume+"kg"}</div></div>
            </div>

            <div className="rest-timer">
              <div className="rest-top">
                <span className="rest-label">▸ 休憩タイマー</span>
                {restRemaining !== null && <button className="rest-stop" onClick={stopRest}>リセット</button>}
              </div>
              <div className={"rest-display" + (isUrgent?" urgent":"") + (isDone?" done":"")}>
                {restRemaining !== null ? formatTime(restRemaining) : formatTime(restTarget)}
              </div>
              <div className="rest-bar-bg"><div className="rest-bar-fill" style={{ width: restPct+"%" }} /></div>
              <div className="rest-presets">
                {REST_PRESETS.map(s => (
                  <button key={s} className={"rest-preset" + (restTarget===s?" active":"")} onClick={() => startRest(s)}>{s}s</button>
                ))}
              </div>
            </div>

            <div className="section-title">▸ 部位を選択</div>
            <div className="muscle-tabs">
              {MUSCLE_GROUPS.map(g => (
                <button key={g.id} className={"muscle-tab" + (activeGroupId===g.id?" active":"")}
                  style={activeGroupId===g.id ? { backgroundColor: g.color } : {}}
                  onClick={() => setActiveGroupId(g.id)}>
                  <span className="tab-dot" style={{ backgroundColor: activeGroupId===g.id ? "#000" : g.color }} />
                  {g.label}
                </button>
              ))}
            </div>

            <div className="add-exercise">
              <div className="group-bar">
                <div className="group-bar-left">
                  <div className="group-dot" style={{ backgroundColor: activeGroup.color }} />
                  <span className="group-label">{activeGroup.label}</span>
                </div>
                <button className="btn-edit" onClick={() => { setShowEditModal(true); setEditingIdx(null); setNewExName(""); }}>種目を編集</button>
              </div>
              <select className="ex-select" value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}>
                {activeExList.map(ex => <option key={ex}>{ex}</option>)}
                {activeExList.length === 0 && <option value="">種目を追加してください</option>}
              </select>
              <button className="btn-add" onClick={addExercise} disabled={!selectedExercise}>+ 追加</button>
            </div>

            <div className="section-title">▸ セッション</div>
            {exercises.length === 0
              ? <div className="empty-state"><div className="icon">🏋️</div><p>エクササイズを追加してください</p></div>
              : exercises.map(ex => {
                const grp = MUSCLE_GROUPS.find(g => g.id === ex.groupId) || MUSCLE_GROUPS[0];
                const inp = inputs[ex.id] || { weight: "", reps: "" };
                return (
                  <div className="ex-card" key={ex.id}>
                    <div className="ex-header">
                      <div className="ex-header-left">
                        <div className="ex-dot" style={{ backgroundColor: grp.color }} />
                        <span className="ex-name">{ex.name}</span>
                        <span className="ex-badge" style={{ backgroundColor: grp.color+"22", color: grp.color }}>{grp.label}</span>
                      </div>
                      <button className="btn-x" onClick={() => removeExercise(ex.id)}>✕</button>
                    </div>

                    {ex.sets.length > 0 && (
                      <table className="sets-table">
                        <thead><tr><th>SET</th><th>WEIGHT</th><th>REPS</th><th></th></tr></thead>
                        <tbody>
                          {ex.sets.map((s, i) => {
                            const isEdit = editingSet && editingSet.exId === ex.id && editingSet.idx === i;
                            if (isEdit) {
                              return (
                                <tr key={i} style={{ background:"#1a1a1a" }}>
                                  <td className="set-num">#{i+1}</td>
                                  <td>
                                    <input className="edit-input" type="number" value={editingSet.weight}
                                      onChange={e => setEditingSet(p => ({ ...p, weight: e.target.value }))}
                                      onKeyDown={e => e.key==="Enter" && saveEditSet(ex.id, i)} />
                                  </td>
                                  <td>
                                    <input className="edit-input" type="number" value={editingSet.reps}
                                      onChange={e => setEditingSet(p => ({ ...p, reps: e.target.value }))}
                                      onKeyDown={e => e.key==="Enter" && saveEditSet(ex.id, i)} />
                                  </td>
                                  <td>
                                    <button className="btn-icon ok" onClick={() => saveEditSet(ex.id, i)}>✓</button>
                                    <button className="btn-icon" onClick={() => setEditingSet(null)}>✕</button>
                                  </td>
                                </tr>
                              );
                            }
                            return (
                              <tr key={i} style={{ cursor:"pointer" }}
                                onClick={() => setEditingSet({ exId: ex.id, idx: i, weight: String(s.weight), reps: String(s.reps) })}>
                                <td className="set-num">#{i+1}</td>
                                <td><span className="w-val" style={{ color: grp.color }}>{Number.isInteger(s.weight) ? s.weight : s.weight.toFixed(1)}</span><span style={{ fontSize:"10px", color:"#444" }}>kg</span></td>
                                <td style={{ color:"#e8e8e8" }}>{s.reps}<span style={{ fontSize:"10px", color:"#444" }}>rep</span></td>
                                <td><button className="btn-x" onClick={ev => { ev.stopPropagation(); removeSet(ex.id, i); }}>✕</button></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    <div className="set-form">
                      <div>
                        <div className="field-label">KG</div>
                        <input className="field-input" type="number" placeholder="60" value={inp.weight}
                          onChange={e => setInputs(p => ({ ...p, [ex.id]: { ...inp, weight: e.target.value } }))}
                          onKeyDown={e => e.key==="Enter" && recordSet(ex.id)} />
                      </div>
                      <div>
                        <div className="field-label">REPS</div>
                        <input className="field-input" type="number" placeholder="10" value={inp.reps}
                          onChange={e => setInputs(p => ({ ...p, [ex.id]: { ...inp, reps: e.target.value } }))}
                          onKeyDown={e => e.key==="Enter" && recordSet(ex.id)} />
                      </div>
                    </div>
                  </div>
                );
              })
            }

            <textarea className="note-input" rows={2} placeholder="メモ（体調、感想など）" value={note} onChange={e => setNote(e.target.value)} />
            <div className="footer">
              <button className="btn-finish" onClick={finishSession} disabled={exercises.length === 0}>FINISH SESSION</button>
              <button className="btn-reset" onClick={resetWorkout}>RESET</button>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div>
            <div className="header"><h1>HISTORY</h1></div>
            {history.length === 0
              ? <div className="hist-empty"><div className="icon">📋</div><p>まだ記録がありません</p></div>
              : history.map(session => {
                const isOpen = openHistoryId === session.id;
                const sGroups = MUSCLE_GROUPS.map(g => ({ ...g, items: (session.exercises||[]).filter(e => e.groupId===g.id) })).filter(g => g.items.length > 0);
                return (
                  <div className="hist-card" key={session.id}>
                    <div className="hist-header" onClick={() => setOpenHistoryId(isOpen ? null : session.id)}>
                      <div>
                        <div className="hist-date">{session.date}</div>
                        <div className="hist-meta">{formatTime(session.duration)} ／ {session.totalSets}セット ／ {session.totalVolume}kg</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                        <button className="hist-del" onClick={e => { e.stopPropagation(); deleteHistory(session.id); }}>削除</button>
                        <span className={"hist-chevron" + (isOpen?" open":"")}>▼</span>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="hist-body">
                        {sGroups.map(grp => (
                          <div className="hist-group" key={grp.id}>
                            <div className="hist-group-label" style={{ color: grp.color }}>{grp.label}</div>
                            {grp.items.map(ex => {
                              const maxW = ex.sets?.length > 0 ? Math.max(...ex.sets.map(s => s.weight)) : 0;
                              const totalR = ex.sets?.reduce((a, s) => a + s.reps, 0) || 0;
                              return (
                                <div className="hist-ex" key={ex.id}>
                                  <div className="hist-ex-name">{ex.name}</div>
                                  <div className="hist-ex-sets">{ex.sets?.length||0}セット ／ 最大{maxW}kg ／ 計{totalR}rep</div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                        {session.note && <div className="hist-note">📝 {session.note}</div>}
                      </div>
                    )}
                  </div>
                );
              })
            }
          </div>
        )}

        {showSummary && (
          <div className="overlay" onClick={() => setShowSummary(false)}>
            <div className="summary-card" onClick={e => e.stopPropagation()}>
              <h2>SESSION COMPLETE</h2>
              <div className="s-row"><span className="s-key">DATE</span><span className="s-val">{today.toLocaleDateString("ja-JP")}</span></div>
              <div className="s-row"><span className="s-key">DURATION</span><span className="s-val">{formatTime(elapsed)}</span></div>
              <div className="s-row"><span className="s-key">TOTAL SETS</span><span className="s-val">{totalSets}</span></div>
              <div className="s-row"><span className="s-key">TOTAL VOLUME</span><span className="s-val">{totalVolume}kg</span></div>
              {exercisesByGroup.map(grp => (
                <div key={grp.id}>
                  <div className="s-group-title" style={{ color: grp.color }}>{grp.label}<div className="s-group-line" /></div>
                  {grp.items.map(ex => {
                    const maxW = ex.sets?.length > 0 ? Math.max(...ex.sets.map(s => s.weight)) : 0;
                    const totalR = ex.sets?.reduce((a, s) => a + s.reps, 0) || 0;
                    return (
                      <div className="s-ex" key={ex.id}>
                        <div className="s-ex-name">{ex.name}</div>
                        <div className="s-ex-sets">{ex.sets?.length||0}セット ／ 最大{maxW}kg ／ 計{totalR}rep</div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {note && <div style={{ marginTop:"14px", fontSize:"11px", color:"#555", borderTop:"1px solid #1e1e1e", paddingTop:"10px" }}>{note}</div>}
              <button className="btn-finish" style={{ marginTop:"18px", width:"100%" }} onClick={() => { setShowSummary(false); setTab("history"); }}>履歴を見る</button>
            </div>
          </div>
        )}

        {showEditModal && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title" style={{ color: activeGroup.color }}>{activeGroup.label}の種目</div>
                <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
              </div>
              {activeExList.map((ex, idx) => (
                <div className="ex-item" key={idx}>
                  {editingIdx === idx ? (
                    <div style={{ display:"flex", flex:1, gap:8 }}>
                      <input value={editingVal} autoFocus
                        onChange={e => setEditingVal(e.target.value)}
                        onKeyDown={e => e.key==="Enter" && confirmEditEx(idx)}
                        style={{ flex:1, background:"#0a0a0a", border:"1px solid #333", color:"#e8e8e8", fontFamily:"'JetBrains Mono',monospace", fontSize:"12px", padding:"5px 8px", outline:"none" }} />
                      <button className="btn-icon ok" onClick={() => confirmEditEx(idx)}>✓</button>
                      <button className="btn-icon" onClick={() => setEditingIdx(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display:"flex", flex:1, alignItems:"center", gap:8 }}>
                      <span className="ex-item-name">{ex}</span>
                      <button className="btn-icon" onClick={() => startEditEx(idx)}>✎</button>
                      <button className="btn-icon" onClick={() => deleteExFromList(idx)}>🗑</button>
                    </div>
                  )}
                </div>
              ))}
              <div className="add-row">
                <input placeholder="新しい種目を追加" value={newExName}
                  onChange={e => setNewExName(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && addExToList()}
                  style={{ flex:1, background:"#0a0a0a", border:"1px solid #333", color:"#e8e8e8", fontFamily:"'JetBrains Mono',monospace", fontSize:"12px", padding:"8px", outline:"none" }} />
                <button onClick={addExToList} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"15px", padding:"8px 14px", background:"#ff4500", color:"#000", border:"none", cursor:"pointer" }}>追加</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
