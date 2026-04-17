import React, { useState } from 'react';

const InputGroup = ({ onAddSkin }) => {
  const [newSkinName, setNewSkinName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddSkin = async () => {
    if (!newSkinName) return;
    setLoading(true);
    try {
      await onAddSkin(newSkinName);
      setNewSkinName('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="input-group">
      <input
        value={newSkinName}
        onChange={(e) => setNewSkinName(e.target.value)}
        placeholder="e.g. M4A1-S | Printstream (Field-Tested)"
      />
      <button onClick={handleAddSkin} disabled={loading}>
        {loading ? '...' : 'Add Skin'}
      </button>
    </div>
  );
};

export default InputGroup;