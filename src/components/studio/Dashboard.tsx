"use client";
import { useState } from "react";
export function Dashboard() {
  const [view, setView] = useState("Overview");
  const [period, setPeriod] = useState("This quarter");
  const annual = period === "This year";
  return (
    <div className="studio-dashboard">
      <div className="studio-dashboard-top">
        <span className="studio-demo-logo">
          ◒ <b>northstar</b>
          <small>ANALYTICS</small>
        </span>
        <span className="studio-status">Synthetic data</span>
      </div>
      <div className="studio-dashboard-heading">
        <div>
          <small>YOUR BUSINESS, IN FOCUS</small>
          <h3>
            {view === "Overview"
              ? "Executive overview"
              : view === "Revenue"
                ? "Revenue performance"
                : "Pipeline health"}
          </h3>
        </div>
        <label className="studio-period">
          <span className="studio-sr">Reporting period</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option>This quarter</option>
            <option>This year</option>
          </select>
        </label>
      </div>
      <div className="studio-tabs" role="group" aria-label="Dashboard view">
        {["Overview", "Revenue", "Pipeline"].map((v) => (
          <button key={v} aria-pressed={v === view} onClick={() => setView(v)}>
            {v}
          </button>
        ))}
      </div>
      <div className="studio-metrics">
        <div>
          <small>{view === "Pipeline" ? "Open pipeline" : "Revenue"}</small>
          <strong>
            {view === "Pipeline"
              ? annual
                ? "£2.84m"
                : "£840k"
              : annual
                ? "£1.82m"
                : "£482k"}
          </strong>
          <span>Illustrative total</span>
        </div>
        <div>
          <small>
            {view === "Revenue" ? "Recurring share" : "Against plan"}
          </small>
          <strong>
            {view === "Revenue" ? "76%" : annual ? "102%" : "104%"}
          </strong>
          <span>Illustrative measure</span>
        </div>
        <div>
          <small>Active accounts</small>
          <strong>{annual ? "128" : "86"}</strong>
          <span>Synthetic accounts</span>
        </div>
      </div>
      <div className="studio-chart-heading">
        <b>
          {view === "Pipeline" ? "Pipeline by stage" : "Revenue against plan"}
        </b>
        <span>
          <i /> Actual <i /> Plan
        </span>
      </div>
      <svg
        viewBox="0 0 500 170"
        role="img"
        aria-label={
          view === "Pipeline"
            ? "Synthetic pipeline by stage, from qualification to proposal."
            : "Synthetic revenue rises over six periods, with actual performance close to plan."
        }
      >
        <g stroke="#dce2dc" strokeWidth="1">
          <path d="M35 20H490M35 60H490M35 100H490M35 140H490" />
        </g>
        {[50, 120, 190, 260, 330, 400].map((x, i) => (
          <g key={x}>
            <rect
              x={x}
              y={
                140 -
                [46, 65, 57, 90, 104, 119][view === "Pipeline" ? 5 - i : i]
              }
              width="20"
              height={
                [46, 65, 57, 90, 104, 119][view === "Pipeline" ? 5 - i : i]
              }
              rx="3"
              fill="#244d43"
            />
            <rect
              x={x + 24}
              y={140 - [52, 60, 68, 85, 100, 110][i]}
              width="20"
              height={[52, 60, 68, 85, 100, 110][i]}
              rx="3"
              fill="#bfd1c3"
            />
            <text
              x={x + 20}
              y="160"
              textAnchor="middle"
              fill="#52635d"
              fontSize="10"
            >
              {view === "Pipeline"
                ? [
                    "New",
                    "Qualified",
                    "Discovery",
                    "Scoped",
                    "Review",
                    "Proposal",
                  ][i]
                : ["01", "02", "03", "04", "05", "06"][i]}
            </text>
          </g>
        ))}
      </svg>
      <div className="studio-dashboard-foot">
        <span>CRM · Billing · Product usage</span>
        <span>Sample dataset · No client results</span>
      </div>
    </div>
  );
}
