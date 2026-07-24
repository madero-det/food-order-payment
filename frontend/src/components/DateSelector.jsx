export default function DateSelector({ date, onChange }) {
  const shift = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    onChange(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    onChange(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="date-nav">
      <button className="btn btn-ghost" onClick={() => shift(-1)}>← Prev</button>
      <input
        type="date"
        value={date}
        onChange={(e) => onChange(e.target.value)}
      />
      <button className="btn btn-ghost" onClick={() => shift(1)}>Next →</button>
      <button className="btn btn-ghost" onClick={goToToday}>Today</button>
    </div>
  );
}
