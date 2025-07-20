import { useEffect, useRef } from 'react'
import './App.css'
import './graphics.ts'
import { startGraphics } from './graphics.ts'

function App() {
  const inputRef = useRef<HTMLCanvasElement | null>(null); // Initialize with null
  const noticeRef = useRef<HTMLElement | null>(null); // Initialize with null

  useEffect(() => {
    if (inputRef.current && noticeRef.current)
    {
      startGraphics(inputRef.current, noticeRef.current);
    }
  }, []);

  return (
    <main>
        <div className="infobox">
            <section>
                <h1>Steven Dao</h1>
                <p>Austin, Texas</p>
                <p>832.582.0950</p>
                <p>steven@stevendao.org</p>
            </section>
            <section>
                <p><strong>The University of Texas at Austin</strong> '15</p>
                <p><strong>Google</strong> 2015-2016</p>
                <p><strong>Pixar</strong> 2016-2021</p>
                <p><strong>Retro Studios</strong> 2021-Present</p>
            </section>
            <section ref={noticeRef} className="webgpu-notice">
                <p>Your browser doesn't support WebGPU.</p>
                <p>The animations on this page won't display.</p>
            </section>
        </div>
        <canvas ref={inputRef} className="background"></canvas>
    </main>
  )
}

export default App
