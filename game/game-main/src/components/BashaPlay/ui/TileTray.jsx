import { useEffect, useRef, useState } from 'react';

export default function TileTray({ tiles, activeTileId, onSelectTile, shakeTileId, isInteractive }) {
  const tileRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    if (tileRefs.current[focusedIndex]) {
      tileRefs.current[focusedIndex].focus();
    }
  }, [focusedIndex, tiles.length]);

  useEffect(() => {
    const nextIndex = Math.min(focusedIndex, Math.max(tiles.length - 1, 0));
    setFocusedIndex(nextIndex);
  }, [tiles.length]);

  const handleKeyDown = (event, index) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, tiles.length - 1));
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isInteractive) {
        onSelectTile(tiles[index]?.id ?? null);
      }
    }
  };

  return (
    <div className="bp-tray" role="listbox" aria-label="Tiles">
      {tiles.map((tile, index) => {
        const isActive = tile.id === activeTileId;
        const isShaking = tile.id === shakeTileId;
        return (
          <button
            key={tile.id}
            type="button"
            className={`bp-tile ${tile.locked ? 'is-locked' : ''} ${isActive ? 'is-active' : ''} ${isShaking ? 'is-shaking' : ''}`}
            style={{ background: tile.color }}
            onClick={() => !tile.locked && isInteractive && onSelectTile(tile.id)}
            draggable={!tile.locked && isInteractive}
            onDragStart={(event) => {
              if (!isInteractive) return;
              event.dataTransfer.setData('text/plain', String(tile.id));
              event.dataTransfer.effectAllowed = 'move';
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            disabled={tile.locked || !isInteractive}
            ref={(el) => {
              tileRefs.current[index] = el;
            }}
            role="option"
            aria-selected={isActive}
            aria-disabled={tile.locked}
          >
            {tile.text}
          </button>
        );
      })}
    </div>
  );
}
