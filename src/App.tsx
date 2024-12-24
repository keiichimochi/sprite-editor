import React, { useState, useRef, useEffect } from 'react';
import './App.css';

interface GridSize {
  width: number;
  height: number;
}

const CURSOR_STEP = 8;
const MAX_SIZE = 64;

function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [gridSize, setGridSize] = useState<GridSize>({ width: 8, height: 8 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          drawImage(img);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const drawImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 画像サイズを4倍に設定するがナリ
    canvas.width = img.width * 4;
    canvas.height = img.height * 4;
    
    // 画像を4倍に拡大して描画するがナリ
    ctx.imageSmoothingEnabled = false; // ピクセルをシャープに保つがナリ
    ctx.drawImage(img, 0, 0, img.width * 4, img.height * 4);
  };

  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and redraw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false; // ピクセルをシャープに保つがナリ
    ctx.drawImage(image, 0, 0, image.width * 4, image.height * 4);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.lineWidth = 1;

    // 1ピクセル単位のグリッドを描画するがナリ（4倍サイズに対応）
    for (let x = 0; x < canvas.width; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // マウスの位置に合わせて選択枠を描画するがナリ（4倍サイズに対応）
    const x = Math.min(Math.max(0, mousePos.x - gridSize.width * 2), canvas.width - gridSize.width * 4);
    const y = Math.min(Math.max(0, mousePos.y - gridSize.height * 2), canvas.height - gridSize.height * 4);

    // 1ピクセル単位でスナップするがナリ（4倍サイズに対応）
    const snappedX = Math.floor(x / 4) * 4;
    const snappedY = Math.floor(y / 4) * 4;

    // 選択枠を描画するがナリ（4倍サイズに対応）
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.strokeRect(snappedX, snappedY, gridSize.width * 4, gridSize.height * 4);

    // マウスカーソルを描画するがナリ
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.moveTo(mousePos.x - 10, mousePos.y);
    ctx.lineTo(mousePos.x + 10, mousePos.y);
    ctx.moveTo(mousePos.x, mousePos.y - 10);
    ctx.lineTo(mousePos.x, mousePos.y + 10);
    ctx.stroke();
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const containerDiv = canvas.parentElement;
    if (!containerDiv) return;

    // スクロール位置を考慮してマウス座標を計算するがナリ
    const x = event.clientX - rect.left + containerDiv.scrollLeft;
    const y = event.clientY - rect.top + containerDiv.scrollTop;

    setMousePos({ x, y });
  };

  const handleGridSizeChange = (width: number, height: number) => {
    setGridSize({ 
      width: Math.min(width, MAX_SIZE), 
      height: Math.min(height, MAX_SIZE) 
    });
  };

  const handleCustomSizeChange = (event: React.ChangeEvent<HTMLInputElement>, dimension: 'width' | 'height') => {
    const value = Math.floor(Number(event.target.value) / CURSOR_STEP) * CURSOR_STEP;
    const size = Math.min(Math.max(CURSOR_STEP, value), MAX_SIZE);
    
    setGridSize(prev => ({
      ...prev,
      [dimension]: size
    }));
  };

  const handleCanvasClick = () => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // マウスの位置に合わせて選択枠の位置を計算するがナリ（4倍サイズに対応）
    const x = Math.min(Math.max(0, mousePos.x - gridSize.width * 2), canvas.width - gridSize.width * 4);
    const y = Math.min(Math.max(0, mousePos.y - gridSize.height * 2), canvas.height - gridSize.height * 4);

    // 1ピクセル単位でスナップするがナリ（4倍サイズに対応）
    const snappedX = Math.floor(x / 4) * 4;
    const snappedY = Math.floor(y / 4) * 4;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = gridSize.width;
    tempCanvas.height = gridSize.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      snappedX / 4, snappedY / 4, gridSize.width / 4, gridSize.height / 4,  // 元の画像の座標を4で割って元のサイズに戻すがナリ
      0, 0, gridSize.width, gridSize.height
    );

    // Save the sprite
    tempCanvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sprite_${snappedX / 4}_${snappedY / 4}.png`;  // 座標を4で割って元のサイズに戻すがナリ
      link.click();
    });
  };

  useEffect(() => {
    if (image) {
      drawGrid();
    }
  }, [mousePos, gridSize, image]);

  return (
    <div className="App" style={{ padding: '20px' }}>
      <div className="controls" style={{ marginBottom: '20px' }}>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        <div className="grid-controls">
          <button onClick={() => handleGridSizeChange(8, 8)}>8x8</button>
          <button onClick={() => handleGridSizeChange(16, 16)}>16x16</button>
          <button onClick={() => handleGridSizeChange(24, 24)}>24x24</button>
          <button onClick={() => handleGridSizeChange(32, 32)}>32x32</button>
        </div>
        <div className="custom-size-controls">
          <div className="size-input">
            <label>幅（8の倍数）:</label>
            <input
              type="number"
              min={CURSOR_STEP}
              max={MAX_SIZE}
              step={CURSOR_STEP}
              value={gridSize.width}
              onChange={(e) => handleCustomSizeChange(e, 'width')}
            />
          </div>
          <div className="size-input">
            <label>高さ（8の倍数）:</label>
            <input
              type="number"
              min={CURSOR_STEP}
              max={MAX_SIZE}
              step={CURSOR_STEP}
              value={gridSize.height}
              onChange={(e) => handleCustomSizeChange(e, 'height')}
            />
          </div>
          <div className="current-size">
            現在のサイズ: {gridSize.width}x{gridSize.height}
          </div>
        </div>
      </div>
      <div style={{ 
        overflow: 'auto', 
        maxWidth: '100%', 
        maxHeight: 'calc(100vh - 200px)',
        border: '1px solid #ccc',
        padding: '10px',
        position: 'relative'
      }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onClick={handleCanvasClick}
          style={{ 
            imageRendering: 'pixelated',
            display: 'block',
            margin: '0 auto',
            maxWidth: 'none'
          }}
        />
      </div>
    </div>
  );
}

export default App;
