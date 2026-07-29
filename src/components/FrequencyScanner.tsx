import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { audioEngine } from '../services/audioEngine';
import { useAppContext } from '../context/AppContext';

interface FrequencyScannerProps {
  embedded?: boolean;
}

export default function FrequencyScanner({ embedded = false }: FrequencyScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { state } = useAppContext();
  const { radioState } = state;
  
  const [peakDb, setPeakDb] = useState<number>(-48);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svgRef.current || !containerRef.current) return;

    let width = containerRef.current.clientWidth || 320;
    const height = 54;
    const margin = { top: 4, right: 8, bottom: 10, left: 16 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height);

    // Clear previous elements
    svg.selectAll('*').remove();

    // Defs for phosphor green gradient & glow filter
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter')
      .attr('id', 'greenGlow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '1.8')
      .attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Linear gradient for wave fill
    const fillGradient = defs.append('linearGradient')
      .attr('id', 'waveGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');

    fillGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', '0.35');

    fillGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#064e3b')
      .attr('stop-opacity', '0.0');

    // Root Group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // D3 Scales
    const xScale = d3.scaleLinear()
      .domain([0, 64])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, 255])
      .range([innerHeight, 0]);

    // Subtle Grid lines (Horizontal)
    const yGridValues = [80, 160];
    g.selectAll('.grid-y')
      .data(yGridValues)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#064e3b')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '2 2');

    // Grid lines (Vertical Frequency Bins)
    const xGridValues = [16, 32, 48];
    g.selectAll('.grid-x')
      .data(xGridValues)
      .enter()
      .append('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#064e3b')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '2 2');

    // D3 Wave Path Generator
    const lineGenerator = d3.line<[number, number]>()
      .x(d => xScale(d[0]))
      .y(d => yScale(d[1]))
      .curve(d3.curveBasis);

    const areaGenerator = d3.area<[number, number]>()
      .x(d => xScale(d[0]))
      .y0(innerHeight)
      .y1(d => yScale(d[1]))
      .curve(d3.curveBasis);

    // Area Fill Path
    const areaPath = g.append('path')
      .attr('fill', 'url(#waveGradient)');

    // Wave Line Path
    const wavePath = g.append('path')
      .attr('fill', 'none')
      .attr('stroke', radioState === 'transmitting' ? '#f43f5e' : radioState === 'receiving' ? '#10b981' : '#34d399')
      .attr('stroke-width', 1.8)
      .attr('filter', 'url(#greenGlow)');

    // Vertical Scanline Sweep
    const scanline = g.append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#6ee7b7')
      .attr('stroke-width', 1.2)
      .attr('opacity', 0.7)
      .attr('filter', 'url(#greenGlow)');

    let animFrameId: number;
    let scanX = 0;

    const analyser = audioEngine.getAnalyserNode();
    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const renderWave = () => {
      let points: [number, number][] = [];
      const numPoints = 64;
      const t = Date.now() * 0.003;

      if (analyser && dataArray && (radioState === 'transmitting' || radioState === 'receiving')) {
        analyser.getByteFrequencyData(dataArray);
        let maxVal = 0;
        
        for (let i = 0; i < numPoints; i++) {
          const binIdx = Math.floor(i * (dataArray.length / 2 / numPoints));
          const val = dataArray[binIdx] || 15;
          if (val > maxVal) maxVal = val;
          points.push([i, val]);
        }

        const dbCalculated = Math.round(-60 + (maxVal / 255) * 50);
        setPeakDb(dbCalculated);

      } else {
        let maxVal = 10;
        for (let i = 0; i < numPoints; i++) {
          const noise = Math.sin(i * 0.3 + t * 2) * 10 + Math.cos(i * 0.8 - t) * 6 + 14;
          const carrierPeak = Math.exp(-Math.pow(i - 32, 2) / 20) * 35;
          const val = Math.max(6, noise + carrierPeak);
          if (val > maxVal) maxVal = val;
          points.push([i, val]);
        }
        setPeakDb(-52);
      }

      wavePath.attr('d', lineGenerator(points) || '');
      areaPath.attr('d', areaGenerator(points) || '');

      scanX = (scanX + 1.5) % innerWidth;
      scanline.attr('x1', scanX).attr('x2', scanX);

      animFrameId = requestAnimationFrame(renderWave);
    };

    renderWave();

    const handleResize = () => {
      if (!containerRef.current) return;
      width = containerRef.current.clientWidth || 320;
      svg.attr('width', width);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameId);
    };
  }, [radioState]);

  return (
    <div 
      ref={containerRef} 
      className="w-full select-none relative overflow-hidden my-1"
    >
      {/* SVG Canvas for D3 */}
      <div className="relative flex justify-center">
        <svg ref={svgRef} className="w-full h-[54px] block" />
      </div>

      {/* Clean Frequency Labels and Peak Signal readout */}
      <div className="flex justify-between items-center text-[8px] font-mono text-emerald-500/80 px-4 -mt-1">
        <span>144.5M</span>
        <span>145.5M</span>
        <span className="text-emerald-300 font-bold">146.52 MHz</span>
        <span>147.5M</span>
        <span className="text-emerald-400/90 font-bold">{peakDb} dBm</span>
      </div>

    </div>
  );
}
