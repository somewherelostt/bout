import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, Easing, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import timeline from './timeline.json';

const C = {paper:'#f4f3ee', ink:'#15141a', purple:'#6246f5', mint:'#c9f59b', muted:'#87838f', line:'#dad7e1'};
const sans = '"Geist Variable", sans-serif';
const mono = '"Geist Mono Variable", monospace';
const clamp = (v:number) => Math.min(1,Math.max(0,v));
const ease = Easing.bezier(0.22,1,0.36,1);
const p = (f:number,a:number,b:number) => ease(clamp((f-a)/(b-a)));
const mix = (a:number,b:number,t:number) => a+(b-a)*t;
const enter = (f:number,at=0) => spring({frame:f-at,fps:60,config:{damping:22,stiffness:180,mass:0.85}});
const reveal = (f:number,at=0) => ({opacity:p(f,at,at+18), transform:`translateY(${(1-p(f,at,at+34))*55}px)`});

const Mark = ({size=70,color=C.ink,cut=C.paper,style={}}:{size?:number;color?:string;cut?:string;style?:React.CSSProperties}) => <svg width={size} height={size} viewBox="0 0 42 42" style={style}><path d="M21 2 38 11v20l-17 9L4 31V11L21 2Z" fill={color}/><path d="m21 8 10.5 5.6L21 19.2 10.5 13.6 21 8Zm0 14.6 10.5-5.5v10.8L21 33.5V22.6Z" fill={cut}/></svg>;

const Wordmark = ({dark=false,size=40}:{dark?:boolean;size?:number}) => <div style={{display:'flex',alignItems:'center',gap:size*.18,color:dark?C.paper:C.ink,fontSize:size,fontWeight:650,letterSpacing:-size*.045}}><Mark size={size*1.15} color={dark?C.paper:C.ink} cut={dark?C.ink:C.paper}/>Bout</div>;

const Frame = ({children,dark=false,chapter=''}:{children:React.ReactNode;dark?:boolean;chapter?:string}) => <AbsoluteFill style={{background:dark?C.ink:C.paper,color:dark?C.paper:C.ink,fontFamily:sans,overflow:'hidden'}}>
  {children}
  <div style={{position:'absolute',left:76,top:44}}><Wordmark dark={dark}/></div>
  <div style={{position:'absolute',right:80,top:57,fontFamily:mono,fontSize:18,letterSpacing:2,color:dark?'#a6a1b2':C.muted}}>{chapter}</div>
</AbsoluteFill>;

const Tag = ({children,dark=false,style={}}:{children:React.ReactNode;dark?:boolean;style?:React.CSSProperties}) => <div style={{display:'inline-flex',alignItems:'center',gap:12,fontFamily:mono,fontSize:20,letterSpacing:1.5,color:dark?C.mint:C.purple,...style}}><span style={{width:8,height:8,borderRadius:8,background:'currentColor'}}/>{children}</div>;

const CodeCard = ({label,f,at,right=false}:{label:string;f:number;at:number;right?:boolean}) => {
  const s=enter(f,at);
  const lines=right?['const root = path.resolve(workspace);','const resolved = path.resolve(root, requested);','const relative = path.relative(root, resolved);','return resolved;']:['if (requested.includes("..")) {','  throw new Error("Traversal is not allowed.");','}','return path.join(workspace, requested);'];
  return <div style={{position:'absolute',left:right?1030:240,top:245,width:650,height:440,borderRadius:24,background:right?C.purple:C.ink,color:C.paper,padding:'36px 38px',boxSizing:'border-box',transform:`translateX(${(1-s)*(right?900:-900)}px) translateY(${Math.sin(f/80)*8}px) rotate(${mix(right?16:-16,right?4:-4,s)}deg) scale(${mix(.8,1,s)})`,boxShadow:'0 32px 75px #16101c20'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:62,fontWeight:650}}>Patch {label}</span><span style={{fontFamily:mono,fontSize:18,opacity:.6}}>AUTHOR HIDDEN</span></div>
    <div style={{height:1,background:'#ffffff25',margin:'26px 0 36px'}}/>
    {lines.map((line,i)=><div key={i} style={{fontFamily:mono,fontSize:17,lineHeight:2.1,whiteSpace:'nowrap',color:i===3?C.mint:'#e3dfff',opacity:p(f,at+20+i*4,at+32+i*4)}}><span style={{color:C.mint,marginRight:15}}>+</span>{line}</div>)}
    <div style={{position:'absolute',bottom:30,fontFamily:mono,fontSize:16,color:'#ffffff70'}}>EXCERPT · REAL REVIEW BUNDLE</div>
  </div>;
};

const Choice = () => {
  const f=useCurrentFrame(); const out=p(f,216,240);
  return <Frame chapter="01 / THE QUESTION"><div style={{transform:`scale(${1+out*.2})`,opacity:1-out}}>
    <div style={{position:'absolute',left:0,right:0,top:130,textAlign:'center',fontSize:50,fontWeight:500,letterSpacing:-2,...reveal(f,3)}}>One problem. Two ways to fix it.</div>
    <CodeCard label="A" f={f} at={22}/><CodeCard label="B" f={f} at={59} right/>
    <div style={{position:'absolute',left:908,top:415,width:104,height:104,display:'grid',placeItems:'center',background:C.mint,color:C.ink,borderRadius:'50%',fontFamily:mono,fontSize:36,fontWeight:600,transform:`scale(${enter(f,113)})`}}>vs</div>
    <div style={{position:'absolute',left:0,right:0,top:755,textAlign:'center',fontSize:110,fontWeight:650,letterSpacing:-6,...reveal(f,114)}}>Which one holds up<span style={{color:C.purple}}>?</span></div>
    <div style={{position:'absolute',bottom:88,left:0,right:0,textAlign:'center',fontFamily:mono,fontSize:20,color:C.muted,...reveal(f,160)}}>Let the code make its case.</div>
  </div></Frame>;
};

const Brand = () => {
  const f=useCurrentFrame(); const pop=enter(f,5); const move=p(f,102,141);
  return <Frame dark chapter="02 / MEET BOUT">
    <div style={{position:'absolute',left:960,top:470,transform:`translate(-50%,-50%) scale(${mix(.72,1,pop)})`,display:'flex',alignItems:'center',gap:34}}>
      <Mark size={190} color={C.mint} cut={C.ink} style={{transform:`rotate(${mix(-110,0,pop)}deg)`}}/>
      <span style={{fontSize:230,fontWeight:630,letterSpacing:-15,clipPath:`inset(0 ${100*(1-p(f,19,59))}% 0 0)`}}>Bout</span>
    </div>
    <div style={{position:'absolute',top:652,left:0,right:0,textAlign:'center',fontSize:60,letterSpacing:-2.5,...reveal(f,42)}}>Paid blind code review.</div>
    <div style={{position:'absolute',top:787,left:0,right:0,textAlign:'center',fontSize:24,fontFamily:mono,color:'#aaa4b8',opacity:move}}>TWO PATCHES. ONE FAIR REVIEW.</div>
    <div style={{position:'absolute',left:0,bottom:0,height:7,background:C.mint,width:`${p(f,160,240)*100}%`}}/>
    {[0,1,2].map(i=><div key={i} style={{position:'absolute',width:650+i*310,height:650+i*310,border:'1px solid #dcd3ff10',borderRadius:'50%',left:960-(650+i*310)/2,top:485-(650+i*310)/2,pointerEvents:'none'}}/>)}
  </Frame>;
};

const Terminal = () => {
  const f=useCurrentFrame(); const chars=Math.floor(clamp((f-39)/129)*timeline.typing.text.length);
  return <Frame dark chapter="03 / CLI FIRST">
    <div style={{position:'absolute',left:130,top:195,...reveal(f,0)}}><Tag dark>MADE FOR DEVELOPER WORKFLOWS</Tag><div style={{fontSize:100,fontWeight:580,letterSpacing:-5,marginTop:28}}>Starts in your terminal.</div></div>
    <div style={{position:'absolute',left:128,top:425,width:1664,height:445,borderRadius:22,background:'#211f28',border:'1px solid #3b3748',boxShadow:'0 35px 80px #00000050',transform:`translateY(${mix(90,0,enter(f,10))}px)`}}>
      <div style={{height:64,borderBottom:'1px solid #ffffff12',display:'flex',alignItems:'center',gap:10,padding:'0 30px'}}>{['#746c81','#746c81','#746c81'].map((c,i)=><div key={i} style={{width:12,height:12,borderRadius:12,background:c}}/>)}<div style={{fontFamily:mono,fontSize:18,color:'#a19aaa',marginLeft:24}}>bout / command line</div></div>
      <div style={{margin:'45px 44px',fontFamily:mono,fontSize:42,letterSpacing:-1,color:C.paper}}><span style={{color:C.mint,marginRight:20}}>$</span>{timeline.typing.text.slice(0,chars)}<span style={{background:C.mint,width:20,height:45,display:'inline-block',verticalAlign:'middle',marginLeft:4,opacity:f<168||Math.floor(f/24)%2===0?1:0}}/></div>
      <div style={{marginLeft:44,fontFamily:mono,fontSize:24,lineHeight:1.8,color:'#b4adbf',opacity:p(f,177,195)}}>Create an anonymized reviewer bundle<br/><span style={{color:C.mint}}>--task</span> task.md <span style={{color:C.mint,marginLeft:20}}>--candidate-one</span> first.patch <span style={{color:C.mint,marginLeft:20}}>--candidate-two</span> second.patch</div>
    </div>
    <div style={{position:'absolute',bottom:105,left:130,fontFamily:mono,fontSize:19,color:'#9b94a7',...reveal(f,185)}}>CLI entry point · actual command and supported options</div>
  </Frame>;
};

type Crop={x:number;y:number;w:number;h:number};
const Recorded = ({from,crop,width,height,zoom=1,origin='50% 50%',style={}}:{from:number;crop:Crop;width:number;height:number;zoom?:number;origin?:string;style?:React.CSSProperties}) => {
  const s=Math.max(width/crop.w,height/crop.h);
  return <div style={{position:'relative',width,height,overflow:'hidden',background:'#f4f5f3',...style}}><div style={{position:'absolute',inset:0,transform:`scale(${zoom})`,transformOrigin:origin}}><OffthreadVideo muted src={staticFile('recording-cfr.mp4')} startFrom={Math.round(from*60)} style={{position:'absolute',width:1920*s,height:1080*s,maxWidth:'none',left:-crop.x*s,top:-crop.y*s}}/></div></div>;
};

const Screen = ({from,crop,width,height,zoom=1,origin,style={}}:{from:number;crop:Crop;width:number;height:number;zoom?:number;origin?:string;style?:React.CSSProperties}) => <div style={{width,borderRadius:18,overflow:'hidden',border:'1px solid #30273628',boxShadow:'0 32px 80px #1b152020',...style}}>
  <div style={{height:43,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',background:'#ffffff',boxSizing:'border-box',fontFamily:mono,fontSize:14,color:'#625b71'}}><span style={{display:'flex',alignItems:'center',gap:9}}><span style={{width:7,height:7,borderRadius:7,background:C.purple}}/> ACTUAL LOCAL RECORDING</span><span>BOUT / REVIEW WORKSPACE</span></div>
  <Recorded from={from} crop={crop} width={width} height={height} zoom={zoom} origin={origin}/>
</div>;

const Task = () => {
  const f=useCurrentFrame();
  return <Frame chapter="04 / THE REAL TASK">
    <div style={{position:'absolute',left:115,top:170,width:500,...reveal(f,0)}}><Tag>START WITH A REAL PROBLEM</Tag><div style={{fontSize:89,lineHeight:1.04,fontWeight:600,letterSpacing:-4.6,marginTop:33}}>Same task.<br/>Same rules.</div><div style={{fontSize:29,lineHeight:1.5,color:'#746e7d',marginTop:32,maxWidth:400}}>Two proposed fixes for a workspace path traversal bug.</div>
      <div style={{marginTop:66,paddingTop:28,borderTop:'1px solid #cbc7d2',fontFamily:mono,fontSize:18,color:C.purple}}>01 TASK / 02 PATCHES</div>
    </div>
    <Screen from={24} crop={{x:244,y:160,w:1400,h:780}} width={1130} height={630} style={{position:'absolute',left:694,top:200,transform:`perspective(1800px) translateY(${mix(130,0,enter(f,6))}px) rotateY(${mix(-8,0,p(f,0,330))}deg) scale(${mix(.96,1.015,p(f,0,360))})`}}/>
    <div style={{position:'absolute',left:698,top:920,fontSize:23,color:'#76707f',...reveal(f,66)}}>One shared brief. Every comparison starts here.</div>
  </Frame>;
};

const Blind = () => {
  const f=useCurrentFrame();
  return <Frame dark chapter="05 / REVIEW THE CODE">
    <div style={{position:'absolute',left:90,top:136,fontSize:87,fontWeight:580,letterSpacing:-4,...reveal(f,0)}}>Hide the author. <span style={{color:C.mint}}>Show the work.</span></div>
    <Screen from={39} crop={{x:263,y:128,w:1520,h:817}} width={1550} height={738} zoom={mix(1,1.025,p(f,20,450))} style={{position:'absolute',left:185,top:265,transform:`translateY(${mix(150,0,enter(f,4))}px) scale(${mix(.92,1,p(f,0,100))})`}}/>
    <div style={{position:'absolute',right:74,top:955,padding:'17px 25px',borderRadius:16,background:C.mint,color:C.ink,fontSize:24,fontWeight:550,boxShadow:'0 12px 35px #00000025',...reveal(f,105)}}>Anonymous A / B patches</div>
  </Frame>;
};

const Hash = () => {
  const f=useCurrentFrame();
  return <Frame chapter="06 / KEEP THE EVIDENCE">
    <div style={{position:'absolute',left:110,top:162,...reveal(f,0)}}><Tag>INTEGRITY, BUILT IN</Tag><div style={{fontSize:105,fontWeight:590,letterSpacing:-5.8,marginTop:22}}>Every patch. Fingerprinted.</div></div>
    <Screen from={44} crop={{x:280,y:132,w:1490,h:755}} width={1220} height={590} zoom={mix(1,1.085,p(f,0,340))} origin="50% 0%" style={{position:'absolute',left:90,top:369,transform:`translateX(${mix(-80,0,enter(f,6))}px)`}}/>
    <div style={{position:'absolute',left:1370,top:431,width:450}}>{[['A','7cd2dc243c'],['B','e2a23f6112']].map(([a,hash],i)=><div key={a} style={{borderTop:'1px solid #ccc7d5',padding:'28px 0',...reveal(f,28+i*17)}}><div style={{fontFamily:mono,fontSize:19,color:C.muted}}>PATCH {a} / SHA-256</div><div style={{fontFamily:mono,fontSize:37,marginTop:15,letterSpacing:-1}}>{hash}<span style={{color:C.muted}}>…</span></div></div>)}<div style={{fontSize:28,lineHeight:1.45,color:'#746e7d',marginTop:35,...reveal(f,77)}}>Recorded hashes connect the review to the exact code.</div></div>
  </Frame>;
};

const Paid = () => {
  const f=useCurrentFrame();
  return <Frame dark chapter="07 / REAL PUBLICATION">
    <div style={{position:'absolute',left:105,top:158,...reveal(f,0)}}><Tag dark>POWERED BY THE GIBWORK SDK</Tag><div style={{fontSize:103,fontWeight:580,letterSpacing:-5,marginTop:24}}>A real bounty. <span style={{color:C.mint}}>Published.</span></div></div>
    <Screen from={30} crop={{x:242,y:215,w:1430,h:655}} width={1210} height={554} style={{position:'absolute',left:95,top:386,transform:`translateY(${mix(100,0,enter(f,8))}px)`}}/>
    <div style={{position:'absolute',left:1404,top:430,...reveal(f,30)}}><div style={{fontSize:155,lineHeight:1,fontWeight:600,letterSpacing:-10,color:C.mint}}>2<span style={{fontSize:45,letterSpacing:-2,marginLeft:12}}>USDC</span></div><div style={{fontSize:27,color:'#ada5bb',marginTop:24}}>Funded once on stage.</div><div style={{height:1,background:'#4a4258',margin:'38px 0',width:370}}/><div style={{fontFamily:mono,fontSize:19,color:C.mint}}>PAYMENT FINALIZED</div><div style={{fontSize:24,color:'#ada5bb',marginTop:16,lineHeight:1.5,maxWidth:350}}>Confirmed task ID.<br/>On-chain transaction.</div></div>
    <div style={{position:'absolute',left:100,top:994,fontFamily:mono,fontSize:19,color:'#aaa2b5'}}>TASK 76bc62aa-5dca-4758-9f10-f77205cd0d01</div>
  </Frame>;
};

const Evidence = () => {
  const f=useCurrentFrame();
  return <Frame chapter="08 / HONEST STATUS">
    <div style={{position:'absolute',left:108,top:150,...reveal(f,0)}}><Tag>THE CURRENT LIVE RUN</Tag><div style={{fontSize:93,fontWeight:590,letterSpacing:-4.8,marginTop:26}}>Published. Awaiting reviewers.</div></div>
    <Screen from={57} crop={{x:255,y:228,w:1400,h:785}} width={1150} height={645} style={{position:'absolute',left:96,top:365,transform:`translateY(${mix(100,0,enter(f,6))}px)`}}/>
    <div style={{position:'absolute',left:1330,top:399,width:470,...reveal(f,34)}}><div style={{fontSize:140,fontWeight:600,letterSpacing:-8,color:C.purple}}>0</div><div style={{fontSize:32,marginTop:-6}}>live reviews at recording</div><div style={{height:1,background:'#cdc8d6',margin:'36px 0'}}/><div style={{fontSize:28,lineHeight:1.55,color:'#746e7d'}}>Review synchronization and the final consensus report are pending.</div><div style={{fontFamily:mono,fontSize:20,color:C.purple,marginTop:35}}>REAL STATE. REAL EVIDENCE.</div></div>
  </Frame>;
};

const End = () => {
  const f=useCurrentFrame();
  return <AbsoluteFill style={{fontFamily:sans,background:C.purple,color:C.paper,overflow:'hidden'}}>
    <div style={{position:'absolute',width:1300,height:1300,border:'1px solid #ffffff25',borderRadius:'50%',left:310,top:-200,transform:`scale(${mix(.6,1.25,p(f,0,240))})`}}/>
    <div style={{position:'absolute',left:0,right:0,top:145,display:'flex',justifyContent:'center',alignItems:'center',gap:32,transform:`translateY(${mix(65,0,enter(f,0))}px)`}}><Mark size={154} color={C.mint} cut={C.purple}/><span style={{fontSize:180,fontWeight:600,letterSpacing:-11}}>Bout</span></div>
    <div style={{position:'absolute',left:0,right:0,top:465,textAlign:'center',fontSize:95,fontWeight:550,lineHeight:1.08,letterSpacing:-4.8,...reveal(f,15)}}>Two code changes.<br/><span style={{color:C.mint}}>One fair review.</span></div>
    <div style={{position:'absolute',left:0,right:0,top:776,textAlign:'center',fontFamily:mono,fontSize:31,...reveal(f,48)}}>github.com/somewherelostt/bout</div>
    <div style={{position:'absolute',left:0,right:0,bottom:101,textAlign:'center',fontSize:23,color:'#dfd7ff',...reveal(f,74)}}>Terminal-first code review · Powered by Gibwork</div>
  </AbsoluteFill>;
};

const scenes:Record<string,React.FC>={choice:Choice,brand:Brand,terminal:Terminal,task:Task,blind:Blind,hash:Hash,paid:Paid,evidence:Evidence,end:End};

export const BoutLaunch = () => {
  const f=useCurrentFrame();
  const [handle]=useState(()=>delayRender('Load local typefaces'));
  useEffect(()=>{Promise.all([document.fonts.load('600 80px "Geist Variable"'),document.fonts.load('400 24px "Geist Mono Variable"')]).then(()=>continueRender(handle));},[handle]);
  return <AbsoluteFill style={{background:C.ink}}>
    {timeline.scenes.map(s=>{const Scene=scenes[s.id];return <Sequence key={s.id} name={s.id} from={s.from*60} durationInFrames={s.duration*60}><Scene/></Sequence>;})}
    <Audio src={staticFile('audio/score.wav')}/>
    <div style={{position:'absolute',bottom:0,left:0,height:4,width:`${100*f/(timeline.duration*60)}%`,background:C.mint,opacity:.85}}/>
  </AbsoluteFill>;
};
