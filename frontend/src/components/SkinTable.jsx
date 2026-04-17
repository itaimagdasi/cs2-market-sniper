import React from 'react';

const SkinTable = ({ skins, selectedSkin, onSelectSkin, onUpdateTarget, onDeleteSkin }) => {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr><th>Icon</th><th>Name</th><th>Price</th><th>Target</th><th>Action</th></tr>
        </thead>
        <tbody>
          {skins.map(skin => (
            <tr
              key={skin._id}
              onClick={() => onSelectSkin(skin)}
              className={selectedSkin?._id === skin._id ? 'active-row' : ''}
            >
              <td><div className="skin-icon-static">🔫</div></td>
              <td style={{ fontWeight: '600' }}>{skin.name}</td>
              <td style={{ color: '#4caf50', fontWeight: 'bold' }}>
                {skin.price > 0 ? `$${skin.price.toFixed(2)}` : '$---'}
              </td>
              <td>
                <input
                  type="number"
                  className="target-input"
                  defaultValue={skin.targetPrice}
                  onBlur={(e) => onUpdateTarget(skin._id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td>
                <button
                  className="delete-btn"
                  onClick={(e) => { e.stopPropagation(); onDeleteSkin(skin._id); }}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SkinTable;