import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function DateSelector({ date, onChange }) {
  const shift = (days) => {
    const parts = date.split('-');
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onChange(`${yy}-${mm}-${dd}`);
  };

  const goToToday = () => {
    const now = new Date();
    const yy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    onChange(`${yy}-${mm}-${dd}`);
  };

  return (
    <div className="date-nav">
      <button className="btn btn-ghost" onClick={() => shift(-1)} aria-label="Previous day"><ChevronLeft size={16} /> Prev</button>
      <input
        type="date"
        value={date}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Select date"
      />
      <button className="btn btn-ghost" onClick={() => shift(1)} aria-label="Next day">Next <ChevronRight size={16} /></button>
      <button className="btn btn-ghost" onClick={goToToday}>Today</button>
    </div>
  );
}