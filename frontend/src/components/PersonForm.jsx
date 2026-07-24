import { useState } from 'react';

export default function PersonForm({ onSubmit, initialData = {}, onCancel }) {
  const [name, setName] = useState(initialData.name || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({ name: name.trim() });
      setName('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
        <label>Person Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name..."
          required
        />
      </div>
      <button type="submit" className="btn btn-primary">
        {initialData.id ? 'Update' : 'Add'}
      </button>
      {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
    </form>
  );
}
