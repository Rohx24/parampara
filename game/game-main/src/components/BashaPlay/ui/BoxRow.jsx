import { useEffect, useRef, useState } from 'react';

export default function BoxRow({
  boxes,
  placements,
  onAttemptPlace,
  activeTileId,
  sparkleBoxId,
  isInteractive,
}) {
  const boxRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    if (boxRefs.current[focusedIndex]) {
      boxRefs.current[focusedIndex].focus();
    }
  }, [focusedIndex, boxes.length]);

  useEffect(() => {
    const nextIndex = Math.min(focusedIndex, Math.max(boxes.length - 1, 0));
    setFocusedIndex(nextIndex);
  }, [boxes.length]);

  const handleKeyDown = (event, index) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, boxes.length - 1));
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    }
    if ((event.key === 'Enter' || event.key === ' ') && activeTileId !== null && isInteractive) {
      event.preventDefault();
      onAttemptPlace(activeTileId, boxes[index].id);
    }
  };

  return (
    <div className="bp-box-row" role="group" aria-label="Target boxes">
      {boxes.map((box, index) => {
        const filled = placements[box.id] !== undefined;
        const sparkle = sparkleBoxId === box.id;
        return (
          <button
            key={box.id}
            type="button"
            className={`bp-box ${filled ? 'is-filled' : ''} ${sparkle ? 'is-sparkle' : ''}`}
            style={{ '--box-color': box.color }}
            onClick={() => isInteractive && activeTileId !== null && onAttemptPlace(activeTileId, box.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!isInteractive) return;
              const data = event.dataTransfer.getData('text/plain');
              if (data) {
                onAttemptPlace(Number(data), box.id);
              }
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(el) => {
              boxRefs.current[index] = el;
            }}
            disabled={!isInteractive}
          >
            <span className="bp-box-glow" aria-hidden="true" />
            <span className="bp-box-text">{filled ? box.text : ''}</span>
          </button>
        );
      })}
    </div>
  );
}
