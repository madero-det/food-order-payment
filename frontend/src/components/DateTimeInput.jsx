export default function DateTimeInput({ value, onChange }) {
  const parseParts = (val) => {
    if (!val) return { date: '', hour: '12', minute: '00', ampm: 'AM' };
    const s = String(val).replace(' ', 'T');
    const m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
    if (!m) return { date: '', hour: '12', minute: '00', ampm: 'AM' };
    const h = Number(m[2]);
    return {
      date: m[1],
      hour: String(h === 0 ? 12 : h > 12 ? h - 12 : h),
      minute: m[3],
      ampm: h >= 12 ? 'PM' : 'AM',
    };
  };

  const update = (field, value) => {
    const p = { ...parseParts(value === undefined ? '' : value), [field]: value };
    if (p.date) {
      let h24 = Number(p.hour);
      if (p.ampm === 'AM' && h24 === 12) h24 = 0;
      if (p.ampm === 'PM' && h24 !== 12) h24 += 12;
      onChange(`${p.date}T${String(h24).padStart(2, '0')}:${p.minute}`);
    } else {
      onChange('');
    }
  };

  const parts = parseParts(value);

  return (
    <div className="datetime-input">
      <input
        type="date"
        value={parts.date}
        onChange={(e) => update('date', e.target.value)}
      />
      <select value={parts.hour} onChange={(e) => update('hour', e.target.value)}>
        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="datetime-sep">:</span>
      <select value={parts.minute} onChange={(e) => update('minute', e.target.value)}>
        {['00','05','10','15','20','25','30','35','40','45','50','55'].map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select value={parts.ampm} onChange={(e) => update('ampm', e.target.value)}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
