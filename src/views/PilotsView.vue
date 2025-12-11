<style scoped>
/* OVERRIDE LANCER NARROW WRAPPER */
.section-container {
  padding: 2rem 3rem;
  color: #dce6f1;
  font-family: "Consolas", "Courier New", monospace;
  width: 100% !important;
  max-width: 1800px;          /* increased overall width */
  margin: 0 auto;
  box-sizing: border-box;
}

/* Expand content to full width */
.section-content-container {
  width: 100% !important;
}

/* --- SQUAD GRID (BIGGER) --- */
.squad-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(350px, 1fr)); /* was 280px */
  gap: 2rem;                                            /* bigger spacing */
  margin-top: 2rem;
}

/* Medium screens: 2 columns */
@media (max-width: 1100px) {
  .squad-grid {
    grid-template-columns: repeat(2, minmax(320px, 1fr));
  }
}

/* Small screens: 1 column */
@media (max-width: 700px) {
  .squad-grid {
    grid-template-columns: 1fr;
  }
}

/* --- SQUAD TILE (BIGGER) --- */
.squad-card {
  background: radial-gradient(
      circle at top left,
      rgba(30, 144, 255, 0.25),
      transparent 55%
    ),
    rgba(0, 10, 30, 0.9);
  border: 2px solid rgba(30, 144, 255, 0.8); /* thicker border */
  border-radius: 0.75rem;                    /* rounder edges */
  box-shadow: 0 0 22px rgba(0, 0, 0, 0.8);
  cursor: pointer;
}

/* --- SQUAD HEADER FACE --- */
.squad-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  padding: 1.4rem 1.6rem;       /* more padding */
}

/* BIGGER INSIGNIA */
.squad-insignia {
  width: 80px;                 /* was 54px */
  height: 80px;
  border-radius: 0.6rem;
  border: 3px solid #1e90ff;   /* thicker */
  font-size: 1.3rem;           /* larger text */
  margin-right: 1.5rem;
}

/* Squad text bigger */
.squad-meta h2 {
  margin: 0;
  font-size: 1.6rem;           /* was ~1rem */
  color: #e0f0ff;
}

.squad-subtitle {
  font-size: 1rem;
  margin-top: 0.25rem;
}

.squad-count {
  font-size: 0.95rem;
  margin-top: 0.4rem;
}

/* Bigger arrow */
.squad-chevron {
  font-size: 1.6rem;
  margin-left: 1rem;
}

/* --- EXPANDED SECTION --- */
.squad-members {
  padding: 1.2rem 1.6rem 1.6rem 1.6rem; /* bigger padding */
}

/* Larger member tiles */
.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); /* bigger */
  gap: 1.2rem;
}

/* MEMBER TILE */
.member-card {
  background: rgba(0, 10, 30, 0.85);
  padding: 1rem;
  border-left: 4px solid #1e90ff; /* thicker */
  border-radius: 0.35rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.member-header h3 {
  font-size: 1.3rem;       /* bigger */
}

.subtitle {
  font-size: 1rem;
}

.member-info {
  font-size: 1rem;
  margin: 0.6rem 0;
}

.member-skills {
  font-size: 1rem;
}

.skill-tag {
  font-size: 0.85rem;       /* slightly bigger */
  padding: 0.3rem 0.5rem;
}

.member-footer {
  font-size: 0.8rem;
  margin-top: 0.6rem;
}
</style>
