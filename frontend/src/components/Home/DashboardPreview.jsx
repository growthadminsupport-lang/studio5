import "./DashboardPreview.css";

function DashboardPreview() {
  return (
    <div className="dp">
      <div className="dp__top">
        <span className="dp__brand">GrowTH</span>
        <div className="dp__dot" />
      </div>

      <div className="dp__profile">
        <div className="dp__avatar" />
        <div className="dp__profile-lines">
          <div className="dp__line dp__line--dark" style={{ width: "64px" }} />
          <div className="dp__line" style={{ width: "40px" }} />
        </div>
      </div>

      <div className="dp__stats">
        <div className="dp__stat">
          <div className="dp__line" style={{ width: "24px" }} />
          <div className="dp__line dp__line--dark" style={{ width: "32px", height: "8px" }} />
        </div>
        <div className="dp__stat">
          <div className="dp__line" style={{ width: "24px" }} />
          <div className="dp__line dp__line--dark" style={{ width: "32px", height: "8px" }} />
        </div>
        <div className="dp__stat">
          <div className="dp__line" style={{ width: "24px" }} />
          <div className="dp__line dp__line--dark" style={{ width: "32px", height: "8px" }} />
        </div>
      </div>

      <div className="dp__chart-card">
        <div className="dp__line dp__line--dark" style={{ width: "80px", height: "6px", marginBottom: "8px" }} />
        <div className="dp__chart">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none">
            <polyline
              points="0,28 20,22 40,18 60,14 80,10 100,4"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default DashboardPreview;