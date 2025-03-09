import React, { useState, useRef, useEffect } from 'react';
import './App.css';

interface GridSize {
  width: number;
  height: number;
}

interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const CURSOR_STEP = 8;
const MAX_SIZE = 64;

function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [gridSize, setGridSize] = useState<GridSize>({ width: 8, height: 8 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [transparentColor, setTransparentColor] = useState<RGBAColor | null>(null);
  const [enableTransparency, setEnableTransparency] = useState<boolean>(false);
  const [previewTransparency, setPreviewTransparency] = useState<boolean>(false);
  const [showBlackBackground, setShowBlackBackground] = useState<boolean>(false);
  const [toleranceValue, setToleranceValue] = useState<number>(20);
  const [useInstantAlpha, setUseInstantAlpha] = useState<boolean>(false);

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

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 画像サイズを4倍に設定するナリ
    canvas.width = img.width * 4;
    canvas.height = img.height * 4;
    
    // 画像を4倍に拡大して描画するナリ
    ctx.imageSmoothingEnabled = false; // ピクセルをシャープに保つナリ
    ctx.drawImage(img, 0, 0, img.width * 4, img.height * 4);

    // プレビュー透過が有効な場合は透過処理を適用するナリ
    if (previewTransparency && transparentColor) {
      applyTransparency(ctx, canvas.width, canvas.height);
    }
  };

  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Clear and redraw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false; // ピクセルをシャープに保つナリ
    ctx.drawImage(image, 0, 0, image.width * 4, image.height * 4);

    // プレビュー透過が有効な場合は透過処理を適用するナリ
    if (previewTransparency && transparentColor) {
      applyTransparency(ctx, canvas.width, canvas.height);
    }

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.lineWidth = 1;

    // 1ピクセル単位のグリッドを描画するナリ（4倍サイズに対応）
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

    // コンテナのスクロール位置を取得するナリ
    const containerDiv = canvas.parentElement;
    if (!containerDiv) return;
    
    const scrollLeft = containerDiv.scrollLeft;
    const scrollTop = containerDiv.scrollTop;
    
    // マウス位置にスクロール位置を加算して、キャンバス上の実際の位置を計算するナリ
    const canvasX = mousePos.x + scrollLeft;
    const canvasY = mousePos.y + scrollTop;
    
    // 4ピクセル単位でスナップするナリ
    const snappedX = Math.floor(canvasX / 4) * 4;
    const snappedY = Math.floor(canvasY / 4) * 4;

    // 選択枠がキャンバスの範囲内に収まるように調整するナリ
    const adjustedX = Math.min(Math.max(0, snappedX), canvas.width - gridSize.width * 4);
    const adjustedY = Math.min(Math.max(0, snappedY), canvas.height - gridSize.height * 4);

    // 選択枠を描画するナリ（4倍サイズに対応）
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.strokeRect(adjustedX, adjustedY, gridSize.width * 4, gridSize.height * 4);

    // マウスカーソルを描画するナリ（スクロール位置を考慮）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.moveTo(canvasX - 10, canvasY);
    ctx.lineTo(canvasX + 10, canvasY);
    ctx.moveTo(canvasX, canvasY - 10);
    ctx.lineTo(canvasX, canvasY + 10);
    ctx.stroke();
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    // クライアント座標からキャンバス上の座標に変換するナリ
    // スクロールは考慮せず、表示されている部分の相対座標を取得するナリ
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
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

  // 色を取得する関数を追加するナリ
  const getPixelColor = (x: number, y: number): RGBAColor | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    try {
      // 座標を4で割って元のサイズに戻すナリ
      const pixelData = ctx.getImageData(x, y, 1, 1).data;
      return {
        r: pixelData[0],
        g: pixelData[1],
        b: pixelData[2],
        a: pixelData[3]
      };
    } catch (error) {
      console.error('ピクセルの色を取得できなかったナリ:', error);
      return null;
    }
  };

  // 色が同じかどうかを判定する関数を追加するナリ（許容誤差を含む）
  const isSameColor = (color1: RGBAColor, color2: RGBAColor, tolerance: number = 0): boolean => {
    return (
      Math.abs(color1.r - color2.r) <= tolerance &&
      Math.abs(color1.g - color2.g) <= tolerance &&
      Math.abs(color1.b - color2.b) <= tolerance
    );
  };

  // 色の距離を計算する関数（インスタントアルファ用）
  const colorDistance = (color1: RGBAColor, color2: RGBAColor): number => {
    const rDiff = color1.r - color2.r;
    const gDiff = color1.g - color2.g;
    const bDiff = color1.b - color2.b;
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
  };

  // 画像に透過処理を適用する関数を追加するナリ
  const applyTransparency = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!transparentColor) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // 各ピクセルをチェックして、透過色と同じ色を透明にするナリ
    for (let i = 0; i < data.length; i += 4) {
      const pixelColor = {
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
        a: data[i + 3]
      };
      
      let shouldMakeTransparent = false;
      
      if (useInstantAlpha) {
        // インスタントアルファモード: 色の距離に基づいて透明度を設定するナリ
        const distance = colorDistance(pixelColor, transparentColor);
        if (distance <= toleranceValue) {
          // 距離に応じて透明度を設定するナリ（距離が近いほど透明）
          const alpha = Math.floor((distance / toleranceValue) * 255);
          if (showBlackBackground) {
            // 黒色にするナリ（透明度に応じて）
            data[i] = 0;     // R
            data[i + 1] = 0; // G
            data[i + 2] = 0; // B
            data[i + 3] = 255 - alpha; // 不透明度を反転
          } else {
            // 透明にするナリ
            data[i + 3] = alpha;
          }
          continue;
        }
      } else {
        // 通常モード: 許容誤差内なら完全に透明にするナリ
        shouldMakeTransparent = isSameColor(pixelColor, transparentColor, toleranceValue);
      }
      
      if (shouldMakeTransparent) {
        if (showBlackBackground) {
          // 黒色にするナリ
          data[i] = 0;     // R
          data[i + 1] = 0; // G
          data[i + 2] = 0; // B
          data[i + 3] = 255; // 不透明
        } else {
          // 透明にするナリ
          data[i + 3] = 0; // アルファチャンネルを0に設定
        }
      }
    }
    
    // 処理した画像データをキャンバスに戻すナリ
    ctx.putImageData(imageData, 0, 0);
  };

  // 透過色を設定する関数を追加するナリ
  const handleSetTransparentColor = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const containerDiv = canvasRef.current.parentElement;
    if (!containerDiv) return;

    // スクロール位置を考慮してマウス座標を計算するナリ
    const x = event.clientX - rect.left + containerDiv.scrollLeft;
    const y = event.clientY - rect.top + containerDiv.scrollTop;

    const color = getPixelColor(x, y);
    if (color) {
      setTransparentColor(color);
      console.log(`透過色を設定したナリ: RGB(${color.r}, ${color.g}, ${color.b})`);
      
      // 透過色を設定したら自動的にプレビュー透過と透過を有効にするナリ
      setPreviewTransparency(true);
      setEnableTransparency(true);
      
      // 透過処理を適用して再描画するナリ
      if (image) {
        drawGrid();
      }
    }
  };

  const handleCanvasClick = () => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // コンテナのスクロール位置を取得するナリ
    const containerDiv = canvas.parentElement;
    if (!containerDiv) return;
    
    const scrollLeft = containerDiv.scrollLeft;
    const scrollTop = containerDiv.scrollTop;
    
    // マウス位置にスクロール位置を加算して、キャンバス上の実際の位置を計算するナリ
    const canvasX = mousePos.x + scrollLeft;
    const canvasY = mousePos.y + scrollTop;
    
    // 4ピクセル単位でスナップするナリ
    const snappedX = Math.floor(canvasX / 4) * 4;
    const snappedY = Math.floor(canvasY / 4) * 4;

    // 選択枠がキャンバスの範囲内に収まるように調整するナリ
    const adjustedX = Math.min(Math.max(0, snappedX), canvas.width - gridSize.width * 4);
    const adjustedY = Math.min(Math.max(0, snappedY), canvas.height - gridSize.height * 4);

    // 一時的なキャンバスを作成して、グリッドなしで元の画像を描画するナリ
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return;

    // グリッドなしで元の画像だけを描画するナリ
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.drawImage(image, 0, 0, image.width * 4, image.height * 4);

    // 最終的な切り取り用キャンバスを作成するナリ
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = gridSize.width;
    finalCanvas.height = gridSize.height;
    const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: true });
    if (!finalCtx) return;

    // 一時キャンバスから選択範囲を切り取って、最終キャンバスに描画するナリ
    finalCtx.drawImage(
      tempCanvas,
      adjustedX, adjustedY, gridSize.width * 4, gridSize.height * 4,
      0, 0, gridSize.width, gridSize.height
    );

    // 透過処理を行うナリ
    if (enableTransparency && transparentColor) {
      const imageData = finalCtx.getImageData(0, 0, gridSize.width, gridSize.height);
      const data = imageData.data;
      
      // 各ピクセルをチェックして、透過色と同じ色を透明にするナリ
      for (let i = 0; i < data.length; i += 4) {
        const pixelColor = {
          r: data[i],
          g: data[i + 1],
          b: data[i + 2],
          a: data[i + 3]
        };
        
        let shouldMakeTransparent = false;
        
        if (useInstantAlpha) {
          // インスタントアルファモード: 色の距離に基づいて透明度を設定するナリ
          const distance = colorDistance(pixelColor, transparentColor);
          if (distance <= toleranceValue) {
            // 距離に応じて透明度を設定するナリ（距離が近いほど透明）
            const alpha = Math.floor((distance / toleranceValue) * 255);
            data[i + 3] = alpha; // アルファチャンネルを設定
            continue;
          }
        } else {
          // 通常モード: 許容誤差内なら完全に透明にするナリ
          shouldMakeTransparent = isSameColor(pixelColor, transparentColor, toleranceValue);
        }
        
        if (shouldMakeTransparent) {
          data[i + 3] = 0; // アルファチャンネルを0に設定
        }
      }
      
      // 処理した画像データをキャンバスに戻すナリ
      finalCtx.putImageData(imageData, 0, 0);
    }

    // スプライトを保存するナリ
    finalCanvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sprite_${adjustedX / 4}_${adjustedY / 4}.png`;  // 座標を4で割って元のサイズに戻すナリ
      link.click();
    }, 'image/png');
  };

  // 許容値が変更されたときに再描画するナリ
  const handleToleranceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    setToleranceValue(value);
    if (image && previewTransparency && transparentColor) {
      drawGrid();
    }
  };

  // インスタントアルファモードが変更されたときに再描画するナリ
  const handleInstantAlphaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUseInstantAlpha(event.target.checked);
    if (image && previewTransparency && transparentColor) {
      drawGrid();
    }
  };

  useEffect(() => {
    if (image) {
      drawGrid();
    }
  }, [mousePos, gridSize, image, previewTransparency, showBlackBackground, toleranceValue, useInstantAlpha]);

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
        <div className="transparency-controls" style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => canvasRef.current && alert('右クリックで透過色を選択するナリ！')} 
              disabled={!image}
              style={{ 
                padding: '5px 10px',
                backgroundColor: transparentColor ? `rgb(${transparentColor.r}, ${transparentColor.g}, ${transparentColor.b})` : '#ccc',
                color: transparentColor && (transparentColor.r + transparentColor.g + transparentColor.b) / 3 > 128 ? 'black' : 'white',
                border: '1px solid #999',
                borderRadius: '4px',
                cursor: image ? 'pointer' : 'not-allowed'
              }}
            >
              透過色を選択
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="checkbox"
                id="preview-transparency"
                checked={previewTransparency}
                onChange={(e) => setPreviewTransparency(e.target.checked)}
                disabled={!transparentColor}
              />
              <label htmlFor="preview-transparency">透過をプレビュー</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="checkbox"
                id="enable-transparency"
                checked={enableTransparency}
                onChange={(e) => setEnableTransparency(e.target.checked)}
                disabled={!transparentColor}
              />
              <label htmlFor="enable-transparency">保存時に透過</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="checkbox"
                id="show-black-background"
                checked={showBlackBackground}
                onChange={(e) => setShowBlackBackground(e.target.checked)}
                disabled={!transparentColor}
              />
              <label htmlFor="show-black-background">透過部分を黒で表示</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="checkbox"
                id="use-instant-alpha"
                checked={useInstantAlpha}
                onChange={handleInstantAlphaChange}
                disabled={!transparentColor}
              />
              <label htmlFor="use-instant-alpha">インスタントアルファ</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <label htmlFor="tolerance-value">許容値:</label>
              <input
                type="range"
                id="tolerance-value"
                min="1"
                max="100"
                value={toleranceValue}
                onChange={handleToleranceChange}
                disabled={!transparentColor}
                style={{ width: '100px' }}
              />
              <span>{toleranceValue}</span>
            </div>
            {transparentColor && (
              <div>
                選択色: RGB({transparentColor.r}, {transparentColor.g}, {transparentColor.b})
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ 
        overflow: 'auto', 
        maxWidth: '100%', 
        maxHeight: 'calc(100vh - 200px)',
        border: '1px solid #ccc',
        padding: '10px',
        position: 'relative',
        background: showBlackBackground ? '#000' : 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4zjOaXUAAAAChJREFUOE9jZGBgEAFifOANxH+A+D8a/g3E/5HwH3QN2NXiNXjUAHIAAFwk6XFMBfQtAAAAAElFTkSuQmCC") repeat'
      }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onClick={handleCanvasClick}
          onContextMenu={(e) => {
            e.preventDefault();
            handleSetTransparentColor(e);
          }}
          style={{ 
            imageRendering: 'pixelated',
            display: 'block',
            margin: '0 auto',
            maxWidth: 'none'
          }}
        />
      </div>
      <div style={{ marginTop: '10px', textAlign: 'center' }}>
        <p>左クリック: スプライトを切り取る | 右クリック: 透過色を選択</p>
      </div>
    </div>
  );
}

export default App;
