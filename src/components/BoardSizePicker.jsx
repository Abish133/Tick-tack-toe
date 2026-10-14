'use client';
import {Layers3} from 'lucide-react';

export default function BoardSizePicker({value=3,onChange,disabled=false}) {
  return <section className="board-size-picker" aria-label="Choose board size">
    <div><Layers3 size={18}/><span>CHOOSE YOUR BATTLEFIELD</span></div>
    <div className="board-size-options">{[3,4,5,6].map(size=><button type="button" key={size} aria-label={`${size} by ${size} board`} aria-pressed={value===size} disabled={disabled} onClick={()=>onChange(size)} className={value===size?'selected':''}><span>{size} × {size}</span><small>{size===3?'First line wins':'Highest score wins'}</small></button>)}</div>
    <p>{value===3?'The classic arena: complete a line of three to win.':'Every horizontal, vertical or diagonal run of three earns a point. Overlapping runs count. Highest score on the filled board wins; equal scores draw. Powers can change the lines on the board.'}</p>
  </section>;
}
