import { useState } from 'react';

export default function PersonForm({ onSubmit, initialData = {}, onCancel }) {
  const [name, setName] = useState(initialData.name || '');
  const [email, setEmail] = useState(initialData.email || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() && email.trim()) {
      onSubmit({ name: name.trim(), email: email.trim() });
      setName('');
      setEmail('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
        <label>Person Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name..."
          required
        />
      </div>
      {!initialData.email && (
        <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email..."
            required
          />
        </div>
      )}
      <button type="submit" className="btn btn-primary">
        {initialData.id ? 'Update' : 'Add'}
      </button>
      {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
    </form>
  );
}
